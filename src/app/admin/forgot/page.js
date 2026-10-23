'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BsPersonBadge, BsKey, BsLock, BsEye, BsEyeSlash } from 'react-icons/bs';

const API = 'http://localhost:5000/admins';

export default function AdminRecuperarPage() {
  const router = useRouter();
  const [auth_number, setAuthNumber] = useState('');
  const [recovery_code, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [shake, setShake] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/recovery/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_number: auth_number.trim(),
          recovery_code: recovery_code.trim().toUpperCase(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErro(data.comment || 'Não foi possível redefinir.');
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
      }

      setOk(data.comment || 'Password redefinida.');
      setTimeout(() => router.push('/admin/painel'), 1200);
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
          <h1>Recuperar acesso</h1>
          <p>Peça um código a outro admin e defina nova password</p>
        </div>

        <form className="aa-form" onSubmit={onSubmit}>
          {erro && <div className="aa-alert aa-alert-error">{erro}</div>}
          {ok && <div className="aa-alert aa-alert-ok">{ok}</div>}

          <div className="aa-alert aa-alert-info">
            Outro admin gera o código em <strong>POST /recovery/generate</strong> e entrega-lhe.
            O código vale 30 minutos.
          </div>

          <div className="aa-field">
            <label>O seu auth number</label>
            <div className="aa-input-wrap">
              <BsPersonBadge size={16} />
              <input
                className="aa-input"
                value={auth_number}
                onChange={(e) => setAuthNumber(e.target.value)}
                placeholder="ADM-123456"
                required
              />
            </div>
          </div>

          <div className="aa-field">
            <label>Código de acesso (do outro admin)</label>
            <div className="aa-input-wrap">
              <BsKey size={16} />
              <input
                className="aa-input"
                value={recovery_code}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="AB12CD34"
                required
              />
            </div>
          </div>

          <div className="aa-field">
            <label>Nova password</label>
            <div className="aa-input-wrap has-toggle">
              <BsLock size={16} />
              <input
                className="aa-input"
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mín. 6 caracteres"
                minLength={6}
                required
              />
              <button type="button" className="aa-toggle-pw" onClick={() => setShowPw((v) => !v)}>
                {showPw ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="aa-btn aa-btn-primary" disabled={loading}>
            {loading ? <span className="aa-spinner" /> : null}
            {loading ? 'A gravar...' : 'Redefinir e entrar'}
          </button>
        </form>

        <div className="aa-links">
          <div onClick={()=> router.back()}>Voltar ao login</div>
        </div>
        <p className="aa-foot">Feira Bandim · Admin</p>
      </div>
    </div>
  );
}