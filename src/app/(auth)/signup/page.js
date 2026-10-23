'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FcGoogle } from 'react-icons/fc'
import { AuthProvider } from '@/components/authcontext'
import { createClient } from '@/utils/supabase/client'

export default function SignUpEmail() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);
  const {changeUserAuth} = AuthProvider();
  const API = 'http://localhost:5000';

  async function handleNext() {
    if (!email || carregando) return
    setCarregando(true)
    localStorage.setItem('signup_email', email)

    try {
      const response = await fetch(`${API}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json();

      if (!response.ok) {
        if (data.emailExists) {
          alert(data.comment || 'Este e-mail já existe.')
          router.push('/login')
          return
        }
        alert(data.comment || 'Erro ao processar e-mail.')
        setCarregando(false)
        return
      }

      if (data.success) {
        router.push('/signup/verify')
      } else {
        alert('Erro: ' + data.comment)
        setCarregando(false)
      }
    } catch (err) {
      console.error(err)
      alert('Erro de conexão: ' + err.message)
      setCarregando(false)
    }
  }

  // ===== GOOGLE → Supabase (Next) =====
  async function handleGoogleSignup () {
    if (carregandoGoogle) return
    setCarregandoGoogle(true)
    try {
      const { data: { session }, error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}/callback?next=/signup/verify`,},
      })
      if (error) { alert('Erro ao entrar com Google: ' + error.message); setCarregandoGoogle(false); }
      changeUserAuth(session.user.id);
    } catch (err) {
      console.error(err)
      alert('Erro inesperado com Google.')
      setCarregandoGoogle(false)
    }
  }

  return (
    <div className="the-container">
      <h1 className="come1">Criar Conta</h1>
      <p className="come2">
        Insira o seu e-mail para receber as instruções oficiais
      </p>

      <label htmlFor="email" className="log-label create">
        Endereço de E-mail
      </label>
      <input
        type="email"
        id="email"
        placeholder="exemplo@gmail.com"
        className="log-input create"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleNext()}
      />

      <button
        type="button"
        onClick={handleNext}
        className="auth direct create"
        disabled={carregando}
        style={{
          opacity: carregando ? 0.7 : 1,
          cursor: carregando ? 'not-allowed' : 'pointer',
          border: 'none',
          width: '100%',
        }}
      >
        {carregando ? 'A processar...' : 'Continuar'}
      </button>

      <div className="signup-divider">
        <span>Ou Continuar Com</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        className="auth google create"
        disabled={carregandoGoogle}
        style={{
          opacity: carregandoGoogle ? 0.7 : 1,
          cursor: carregandoGoogle ? 'not-allowed' : 'pointer',
          border: 'none',
          width: '100%',
        }}
      >
        <FcGoogle size={20} />
        <p>{carregandoGoogle ? 'A redirecionar...' : 'Google'}</p>
      </button>

      <div onClick={() => router.push('/login')} className="under-s" style={{ cursor: 'pointer' }}>
        <p>
          Já tem uma conta? <span>Entrar na conta</span>
        </p>
        <svg viewBox="0 0 100 20" className="svg-s">
          <path d="M 0 10, Q 50 0, 100 10" className="path" />
          <path d="M 20 15, Q 50 0, 100 10" className="path" />
        </svg>
      </div>
    </div>
  )
}