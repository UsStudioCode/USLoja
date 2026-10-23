'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ForgotVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    // Tenta obter o email primeiro da URL (?email=...) enviada pelo link do email
    const urlEmail = searchParams.get('email');
    const savedEmail = localStorage.getItem('reset_email');

    if (urlEmail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(urlEmail);
      localStorage.setItem('reset_email', urlEmail); // Mantém sincronizado
    } else if (savedEmail) {
      setEmail(savedEmail);
    } else {
      // Se não houver e-mail em nenhum lugar, redireciona para o passo anterior
      router.push('/forgot');
    }
  }, [searchParams, router]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('As palavras-passe não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      alert('A nova palavra-passe precisa de ter pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true);
    try {
      const response = await fetch('http://localhost:5000/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, newPassword: newPassword }),
      });

      const data = await response.json();
      if (!data.success) {
        alert('Erro: ' + data.comment);
        setCarregando(false);
        return;
      }

      alert('Palavra-passe alterada com sucesso!');
      localStorage.removeItem('reset_email');
      router.push('/login');
    } catch (err) {
      console.log('Erro na requisição:', err);
      alert('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="the-container">
      <p className="come1">Nova Palavra-Passe</p>
      <p className="come2">Insira a sua nova palavra-passe para a conta <strong>{email || '...'}</strong></p>

      <form onSubmit={handleResetPassword} style={{ display: 'contents' }}>
        <label htmlFor="newPassword" className="log-label">Nova Palavra-Passe</label>
        <input
          type="password"
          id="newPassword"
          placeholder="••••••••••••••"
          className="log-input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <label htmlFor="confirmPassword" className="log-label">Confirmar Palavra-Passe</label>
        <input
          type="password"
          id="confirmPassword"
          placeholder="••••••••••••••"
          className="log-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="auth direct"
          style={{ border: 'none', cursor: 'pointer', width: '100%', marginTop: '10px' }}
          disabled={carregando}
        >
          <p>{carregando ? 'A alterar...' : 'Atualizar Palavra-Passe'}</p>
        </button>
      </form>

      <Link href="/login" className="under-s" style={{ marginTop: '24px' }}>
        <p>Voltar para o <span>Login</span></p>
        <svg viewBox="0 0 100 20" className="svg-s">
          <path d="M 0 10, Q 50 0, 100 10" className="path" />
          <path d="M 20 15, Q 50 0, 100 10" className="path" />
        </svg>
      </Link>
    </div>
  );
}

export default function ForgotVerify() {
  return (
    <Suspense fallback={<div className="the-container" aria-busy="true" />}>
      <ForgotVerifyContent />
    </Suspense>
  );
}