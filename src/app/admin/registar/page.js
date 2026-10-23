'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BsPerson, BsEnvelope, BsLock, BsKey, BsBuilding,
  BsPhone, BsEye, BsEyeSlash, BsPersonBadge,
} from 'react-icons/bs';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:5000/admins';

export default function AdminRegistarPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    organization_name: '',
    phone: '',
    referral_code: '',
    referrer_auth_number: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(null); // { auth_number, comment }
  const [shake, setShake] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    setOk(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          referral_code: form.referral_code.trim() || undefined,
          referrer_auth_number: form.referrer_auth_number.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErro(data.comment || 'Não foi possível criar a conta.');
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }

      setOk({
        auth_number: data.admin?.auth_number,
        comment: data.comment,
      });
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
      <div className={`aa-card ${shake ? 'is-error' : ''}`} style={{ maxWidth: 460 }}>
        <div className="aa-brand">
          <div className="aa-logo">MB</div>
          <h1>Criar conta admin</h1>
          <p>Convite de outro admin + confirmação de email</p>
        </div>

        {ok ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="aa-alert aa-alert-ok">{ok.comment}</div>
            <p className="aa-hint">Guarde o seu auth number — é o que usa no login (não é o Gmail):</p>
            <div className="aa-code-box">{ok.auth_number}</div>
            <p className="aa-hint">
              Abra o email e confirme a conta. Depois volte ao login.
            </p>
            <div onClick={()=> router.push('/admin')} className="aa-btn aa-btn-primary" style={{ textDecoration: 'none' }}>
              Ir para o login
            </div>
          </div>
        ) : (
          <form className="aa-form" onSubmit={onSubmit}>
            {erro && <div className="aa-alert aa-alert-error">{erro}</div>}

            <div className="aa-alert aa-alert-info">
              Se já existem admins, precisa do <strong>referral code</strong> e do{' '}
              <strong>auth number</strong> de quem o convidou.
            </div>

            <div className="aa-row two">
              <div className="aa-field">
                <label>Primeiro nome</label>
                <div className="aa-input-wrap">
                  <BsPerson size={16} />
                  <input
                    className="aa-input"
                    value={form.first_name}
                    onChange={(e) => set('first_name', e.target.value)}
                    required
                    placeholder="João"
                  />
                </div>
              </div>
              <div className="aa-field">
                <label>Segundo nome</label>
                <div className="aa-input-wrap">
                  <BsPerson size={16} />
                  <input
                    className="aa-input"
                    value={form.middle_name}
                    onChange={(e) => set('middle_name', e.target.value)}
                    placeholder="Carlos"
                  />
                </div>
              </div>
            </div>

            <div className="aa-field">
              <label>Último nome</label>
              <div className="aa-input-wrap">
                <BsPerson size={16} />
                <input
                  className="aa-input"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  required
                  placeholder="Silva"
                />
              </div>
            </div>

            <div className="aa-field">
              <label>Email (Gmail)</label>
              <div className="aa-input-wrap">
                <BsEnvelope size={16} />
                <input
                  className="aa-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                  placeholder="seu@gmail.com"
                />
              </div>
            </div>

            <div className="aa-field">
              <label>Password</label>
              <div className="aa-input-wrap has-toggle">
                <BsLock size={16} />
                <input
                  className="aa-input"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mín. 6 caracteres"
                />
                <button type="button" className="aa-toggle-pw" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <BsEyeSlash size={16} /> : <BsEye size={16} />}
                </button>
              </div>
            </div>

            <div className="aa-field">
              <label>Organização (opcional)</label>
              <div className="aa-input-wrap">
                <BsBuilding size={16} />
                <input
                  className="aa-input"
                  value={form.organization_name}
                  onChange={(e) => set('organization_name', e.target.value)}
                  placeholder="Feira Bandim"
                />
              </div>
            </div>

            <div className="aa-field">
              <label>Telefone (opcional)</label>
              <div className="aa-input-wrap">
                <BsPhone size={16} />
                <input
                  className="aa-input"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+245 ..."
                />
              </div>
            </div>

            <div className="aa-divider">Convite</div>

            <div className="aa-field">
              <label>Referral code</label>
              <div className="aa-input-wrap">
                <BsKey size={16} />
                <input
                  className="aa-input"
                  value={form.referral_code}
                  onChange={(e) => set('referral_code', e.target.value.toUpperCase())}
                  placeholder="REF-A1B2C3"
                />
              </div>
            </div>

            <div className="aa-field">
              <label>Auth number do admin convidante</label>
              <div className="aa-input-wrap">
                <BsPersonBadge size={16} />
                <input
                  className="aa-input"
                  value={form.referrer_auth_number}
                  onChange={(e) => set('referrer_auth_number', e.target.value)}
                  placeholder="ADM-123456"
                />
              </div>
            </div>

            <button type="submit" className="aa-btn aa-btn-primary" disabled={loading}>
              {loading ? <span className="aa-spinner" /> : null}
              {loading ? 'A criar...' : 'Criar conta'}
            </button>
          </form>
        )}

        <div className="aa-links">
          <span>
            Já tem conta? <div onClick={()=> router.back()}>Entrar</div>
          </span>
        </div>
        <p className="aa-foot">Feira Bandim · Admin</p>
      </div>
    </div>
  );
}