'use client' 
import React, { useEffect, useState } from 'react' 
import Link from 'next/link' 
import { useRouter } from 'next/navigation' 
import { FcGoogle } from 'react-icons/fc' 
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai' 
import { createClient } from '@/utils/supabase/client' 

export default function Login() { 
  const router = useRouter() 
  const supabase = createClient() 
  const [email, setEmail] = useState('') 
  const [password, setPassword] = useState('') 
  const [rememberMe, setRememberMe] = useState(false) 
  const [showPassword, setShowPassword] = useState(false) 
  const [carregando, setCarregando] = useState(false) 

  useEffect(() => { 
    async function verificarSessao() { 
      const { data: { session } } = await supabase.auth.getSession() 
      if (session) {
        // Se já existe sessão, valida também se tem perfil completo antes de deixar passar
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, phone')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile && profile.phone) {
          router.replace('/buyers')
        } else {
          // Se tem sessão mas não tem perfil/telefone completo, vai para verify
          localStorage.setItem('signup_email', session.user.email)
          router.replace('/signup/verify')
        }
      } 
    } 
    verificarSessao() 
  }, [router, supabase]) 

  async function handleLoginEmail (e){ 
    if (e) e.preventDefault() 
    if (!email || !password || carregando) return 
    setCarregando(true) 

    try { 
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password, 
      }) 

      if (error) { 
        if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('not confirmed')) { 
          localStorage.setItem('signup_email', email) 
          alert('A sua conta ainda não foi verificada. Redirecionando para a confirmação...') 
          router.push('/signup/verify') 
          return 
        } 
        alert('Erro ao entrar: ' + error.message) 
        setCarregando(false) 
        return 
      } 

      if (data.user) {
        // VERIFICAÇÃO CHAVE: Validar se o utilizador tem registo na tabela profiles e número de telefone
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, phone')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profileError || !profile || !profile.phone) {
          // Se não tem perfil ou falta o telefone, guarda o email e envia para o verify/completar perfil
          localStorage.setItem('signup_email', email)
          
          // Se for utilizador do Google que saltou o passo, indicamos o provider no query params se necessário
          const isGoogleUser = data.user.app_metadata?.provider === 'google'
          if (isGoogleUser) {
            router.push(`/signup/verify?provider=google&email=${encodeURIComponent(email)}`)
          } else {
            router.push('/signup/verify')
          }
          return
        }

        // Se está tudo ok, entra na aplicação
        router.push('/buyers') 
      } else { 
        alert('Erro ao criar sessão. Tente novamente.') 
        setCarregando(false) 
      } 
    } catch (err) { 
      console.error('Erro inesperado:', err) 
      alert('Erro inesperado ao processar o login.') 
      setCarregando(false) 
    } 
  } 

  const handleGoogleLogin = async () => { 
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { 
        redirectTo: `${window.location.origin}/callback` 
      }, 
    }) 
    if (error) alert(error.message) 
  } 

  return ( 
    <> 
      <p className="come1">Bem-vindo de volta</p> 
      <p className="come2">Por favor, insira os seus dados de acesso</p> 
      <form className='log-form' onSubmit={handleLoginEmail}> 
        <label htmlFor="email" className="log-label">Endereço de E-mail</label> 
        <input type="email" id="email" placeholder="exemplo@gmail.com" className="log-input" value={email} onChange={(e) => setEmail(e.target.value)} required /> 
        <label htmlFor="password" className="log-label">Palavra-passe</label> 
        <div className="password-container"> 
          <input type={showPassword ? 'text' : 'password'} id="password" placeholder="••••••••••••••" className="log-input" value={password} onChange={(e) => setPassword(e.target.value)} required /> 
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn" > 
            {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />} 
          </button> 
        </div> 
        <div className="srow"> 
          <label htmlFor="remember" className="rem-s"> 
            <input type="checkbox" id="remember" className="input-s" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Lembrar por 30 dias 
          </label> 
          <Link href="/forgot" className="forgot-s">Esqueceu Codigo?</Link> 
        </div> 
        <button type="submit" className="auth direct" disabled={carregando} > 
          <p>{carregando ? 'A entrar...' : 'Entrar na Conta'}</p> 
        </button> 
      </form> 
      <button type="button" className="auth google" onClick={handleGoogleLogin} > 
        <FcGoogle size={20} /> 
        <p>Continuar com o Google</p> 
      </button> 
      <Link href="/signup" className="under-s"> 
        <p>Não tem uma conta? <span>Criar uma conta</span></p> 
        <svg viewBox="0 0 100 20" className="svg-s"> 
          <path d="M 0 10, Q 50 0, 100 10" className="path" /> 
          <path d="M 20 15, Q 50 0, 100 10" className="path" /> 
        </svg> 
      </Link> 
    </> 
  ) 
}