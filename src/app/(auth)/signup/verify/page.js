'use client' 
import React, { Suspense, useState, useEffect } from 'react' 
import { useRouter, useSearchParams } from 'next/navigation' 
import { createClient } from '@/utils/supabase/client' 
import { useAuthProvider } from '@/components/authcontext' 
import '../../../../styles/login.css' 

function VerifyOtpContent() { 
  const router = useRouter() 
  const searchParams = useSearchParams() 
  const { setUserAuth } = useAuthProvider() 
  const supabase = createClient();
  const API = 'http://localhost:5000';
  
  const urlProvider = searchParams.get('provider');
  const urlEmail = searchParams.get('email');
  const isGoogleInitial = urlProvider === 'google' && Boolean(urlEmail);
  
  const [email, setEmail] = useState('') 
  const [isGoogle] = useState(isGoogleInitial) 
  const [otpInput, setOtpInput] = useState('') 
  const [userPhone, setUserPhone] = useState('+245 ') 
  const [carregando, setCarregando] = useState(false) 
  const [recarregandoOtp, setRecarregandoOtp] = useState(false) 
  const [segundosRestantes, setSegundosRestantes] = useState(600) 

  useEffect(() => { 
    async function verificarPerfilExistente() {
      if (isGoogleInitial && urlEmail) { 
        setEmail(urlEmail) 
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          if (!authError && user) {
            const { data: existingProfile, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', user.id)
              .maybeSingle()

            if (!profileError && existingProfile && existingProfile.id) {
              if (setUserAuth) setUserAuth(user)
              router.push('/buyers')
              return
            }
          }
        } catch (err) {
          console.error('Erro ao verificar perfil:', err)
        }
      } else if (typeof window !== 'undefined') { 
        const storedEmail = localStorage.getItem('signup_email') || '' 
        setEmail(storedEmail) 
      } 
    }
    verificarPerfilExistente()
  }, [isGoogleInitial, urlEmail]) 

  useEffect(() => { 
    if (isGoogle || !email) return 
    const sincronizarTempoBackend = async () => { 
      try { 
        const res = await fetch(`${API}/otp-countdown`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userEmail: email }), 
        }) 
        const data = await res.json() 
        if (res.ok && data.success) { 
          setSegundosRestantes(data.remainingSeconds) 
          localStorage.setItem('otp_expire_time', Date.now() + data.remainingSeconds * 1000) 
        } else if (data.expired) { 
          setSegundosRestantes(0) 
          localStorage.removeItem('otp_expire_time') 
        } 
      } catch (err) { 
        const expireTime = localStorage.getItem('otp_expire_time') 
        if (expireTime && Number(expireTime) > Date.now()) { 
          setSegundosRestantes(Math.floor((Number(expireTime) - Date.now()) / 1000)) 
        } else { 
          setSegundosRestantes(0) 
        } 
      } 
    } 
    sincronizarTempoBackend() 
    const timer = setInterval(() => { 
      setSegundosRestantes((prev) => { 
        if (prev <= 1) { clearInterval(timer); return 0; } 
        return prev - 1 
      }) 
    }, 1000) 
    return () => clearInterval(timer) 
  }, [email, isGoogle]) 

  const formatarTempo = (segundos) => { 
    const minutos = Math.floor(segundos / 60) 
    const segsRestantes = segundos % 60 
    return `${minutos.toString().padStart(2, '0')}:${segsRestantes.toString().padStart(2, '0')}` 
  } 

  const handleGerarNovoOtp = async () => { 
    if (!email) { alert('E-mail em falta.'); return; } 
    setRecarregandoOtp(true) 
    try { 
      const response = await fetch(`${API}/send-otp`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email }), 
      }) 
      const data = await response.json() 
      if (response.ok && data.success) { 
        localStorage.setItem('otp_expire_time', Date.now() + 10 * 60 * 1000) 
        setSegundosRestantes(600) 
        alert('Novo código OTP enviado para o e-mail!') 
      } else { 
        alert('Erro ao gerar novo OTP: ' + (data.comment || data.message)) 
      } 
    } catch (err) { 
      alert('Erro de conexão.') 
    } finally { 
      setRecarregandoOtp(false) 
    } 
  } 

  async function handleVerifyAndRegister(e) { 
    e.preventDefault() 
    if (carregando || recarregandoOtp) return 
    if (!isGoogle && segundosRestantes === 0) { alert('O código OTP expirou.'); return; } 
    if (!email) { alert('E-mail em falta.'); return; } 
    if (!userPhone || userPhone.replace(/\D/g, '').length < 6) { alert('Indique um número válido.'); return; } 
    if (!isGoogle && (!otpInput || otpInput.length < 5)) { alert('Indique o código OTP de 5 dígitos.'); return; } 

    setCarregando(true) 
    try { 
      if (isGoogle) { 
        const { data: { user }, error: authError } = await supabase.auth.getUser() 
        if (authError || !user) { alert('Sessão do Google não encontrada.') 
          router.push('/login') 
          return 
        } 

        const response = await fetch(`${API}/complete-google-profile`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            userId: user.id, 
            email: email, 
            userPhone: userPhone, 
          }), 
        }) 

        const data = await response.json() 
        if (!response.ok || !data.success) { 
          alert('Erro ao completar perfil: ' + (data.comment || 'Erro desconhecido')) 
          setCarregando(false) 
          return 
        } 

        if (setUserAuth) setUserAuth(user) 
        localStorage.removeItem('signup_email') 
        router.push('/buyers') 
        return 
      } 

      // FLUXO NORMAL COM OTP (Via Backend / Nodemailer)
      const response = await fetch(`${API}/verify-otp`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ userEmail: email, userPhone: userPhone, otpInput: otpInput }), 
      }) 
      const data = await response.json() 
      if (!response.ok || !data.success) { 
        alert('Erro: ' + (data.comment || data.message)) 
        setCarregando(false) 
        return 
      } 

      localStorage.removeItem('signup_email') 
      localStorage.removeItem('otp_expire_time') 

      const cleanPhone = userPhone.replace(/\D/g, '') 
      const password = cleanPhone.slice(-7) 
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (loginError || !loginData.user) {
        alert('Conta criada com sucesso! Faça login.') 
        router.push('/login') 
        return
      }

      if (setUserAuth) {
        setUserAuth(loginData.user)
      }

      router.push('/buyers') 

    } catch (err) { 
      console.error(err) 
      alert('Erro de conexão.') 
    } finally { 
      setCarregando(false) 
    } 
  } 

  const estaBloqueado = carregando || recarregandoOtp 

  return ( 
    <div className="mgt-login"> 
      <div className="text-sect verify-sect-wrapper"> 
        <div className="the-container"> 
          <div className="text-inside verify-inside-padding"> 
            <h1 className="come1">{isGoogle ? 'Completar Perfil' : 'Verificar Conta'}</h1> 
            <p className="come2 verify-email-margin"> 
              {isGoogle ? 'Adicione o seu número à conta ' : 'Enviámos um código para '} 
              <strong className="verify-email-highlight">{email}</strong> 
            </p> 
          </div> 
          <form onSubmit={handleVerifyAndRegister} className="verify-form-layout"> 
            {!isGoogle && ( 
              <div className={`otp-countdown-box ${segundosRestantes > 0 ? 'valid' : 'expired'}`}> 
                {segundosRestantes > 0 ? ( 
                  <span>Tempo restante: <strong className="otp-timer-text">{formatarTempo(segundosRestantes)}</strong></span> 
                ) : ( 
                  <span>O código OTP expirou!</span> 
                )} 
              </div> 
            )} 
            <label className="log-label create">Número de Telefone (Orange)</label> 
            <input type="text" className="log-input create" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="+245 9..." disabled={estaBloqueado} required /> 
            {!isGoogle && ( 
              <> 
                <label className="log-label create">Código de Verificação (OTP)</label> 
                <input type="text" className="log-input create" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="12345" maxLength={5} disabled={segundosRestantes === 0 || estaBloqueado} required /> 
                <div className="resend-otp-wrapper"> 
                  <button type="button" onClick={handleGerarNovoOtp} disabled={estaBloqueado} className="btn-resend-otp" > 
                    {recarregandoOtp ? 'A gerar...' : 'Reenviar OTP'} 
                  </button> 
                </div> 
              </> 
            )} 
            <button type="submit" disabled={estaBloqueado || (!isGoogle && segundosRestantes === 0)} className="auth direct create btn-submit-verify" > 
              {carregando ? 'A processar...' : 'Finalizar Registo'} 
            </button> 
          </form> 
        </div> 
      </div> 
    </div> 
  ) 
} 

export default function VerifyOtp() { 
  return ( 
    <Suspense fallback={<div aria-busy="true" />}> 
      <VerifyOtpContent /> 
    </Suspense> 
  ) 
}