'use client';
import React, { useState } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { CgPhone } from 'react-icons/cg';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleRecuperar = async (e) => {
    e.preventDefault();
    if (!email || carregando) return;
    setCarregando(true);

    try {
      const response = await fetch('http://localhost:5000/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Enviamos ambas as chaves para garantir compatibilidade total com o backend
        body: JSON.stringify({ userEmail: email, email: email }),
      });

      const data = await response.json();
      if (!data.success) {
        alert('Erro: ' + data.comment);
        setCarregando(false);
        return;
      }

      // Guarda o e-mail no localStorage para backup
      localStorage.setItem('reset_email', email);
      setCarregando(false);
      setEnviado(true);
    } catch (err) {
      console.log('Erro na requisição:', err);
      alert('Erro de conexão com o servidor.');
      setCarregando(false);
    }
  };

  return (
    <div className="the-container">
      <p className="come1">Recuperar Acesso</p>
      <p className="come2">Por favor, insira o seu e-mail para receber as instruções</p>

      {!enviado ? (
        <form onSubmit={handleRecuperar} style={{ display: 'contents' }}>
          <label htmlFor="email" className="log-label">
            Endereço de E-mail
          </label>
          <input
            type="email"
            id="email"
            placeholder="exemplo@gmail.com"
            className="log-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="auth direct"
            style={{ border: 'none', cursor: 'pointer', width: '100%', marginTop: '10px' }}
            disabled={carregando}
          >
            <p>{carregando ? 'A verificar e enviar...' : 'Enviar Instruções'}</p>
          </button>
        </form>
      ) : (
        <div className="success-anim-container">
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
          <p className="success-title">Mensagem Enviada!</p>
          <p className="success-desc">Verifique a sua caixa de entrada no Gmail para continuar.</p>
        </div>
      )}

      <div className='help-text'>
        <p>
          Se esquecer o seu código ou tiver dificuldades, verifique o e-mail associado ou ligue para o nosso atendimento: <br/>
          <span>
            <CgPhone className='cgphone'/> +245-99-000-00
          </span> (Atendimento M.B)
        </p>
      </div>

      <div onClick={() => router.back()} className="under-s" style={{ cursor: 'pointer' }}>
        <p>Lembrou-se da palavra-passe? <span>Entrar na conta</span></p>
        <svg viewBox="0 0 100 20" className="svg-s">
          <path d="M 0 10, Q 50 0, 100 10" className="path" />
          <path d="M 20 15, Q 50 0, 100 10" className="path" />
        </svg>
      </div>
    </div>
  );
}