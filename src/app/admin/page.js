'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BsPersonBadge, BsLock, BsEye, BsEyeSlash } from 'react-icons/bs';

const API = 'http://localhost:5000/admins';

export default function AdminLoginPage() {
  const router = useRouter();
  const [auth_number, setAuthNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [shake, setShake] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_number: auth_number.trim(), password }),
      });
      const data = await res.json();

      if (!data.success) {
        setErro(data.comment || 'Falha no login.');
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
      }

      router.push('/admin/painel'); // ajusta a rota do painel
    } catch {
      setErro('Erro de rede. Tente novamente.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="aa-page">
      <div className={`aa-card ${shake ? 'is-error' : ''}`}>
        <div className="aa-brand">
          <div className="aa-logo">MB</div>
          <h1>Entrar no Admin</h1>
          <p>Use o seu auth number e a password</p>
        </div>

        <form className="aa-form" onSubmit={onSubmit}>
          {erro && <div className="aa-alert aa-alert-error">{erro}</div>}

          <div className="aa-field">
            <label htmlFor="auth_number">Auth number</label>
            <div className="aa-input-wrap">
              <BsPersonBadge size={16} />
              <input
                id="auth_number"
                className="aa-input"
                value={auth_number}
                onChange={(e) => setAuthNumber(e.target.value)}
                placeholder="ADM-123456"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="aa-field">
            <label htmlFor="password">Password</label>
            <div className="aa-input-wrap has-toggle">
              <BsLock size={16} />
              <input
                id="password"
                className="aa-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="aa-toggle-pw"
                onClick={() => setShowPw((v) => !v)}
                aria-label="Mostrar password"
              >
                {showPw ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="aa-btn aa-btn-primary" disabled={loading}>
            {loading ? <span className="aa-spinner" /> : null}
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>

        <div className="aa-links">
          <Link href="/admin/forgot">Esqueci a password</Link>
          <span>
            Novo admin? <Link href="/admin/registar">Criar conta</Link>
          </span>
        </div>

        <p className="aa-foot">Feira Bandim · Painel Admin</p>
      </div>
    </div>
  );
}