'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BsCheckCircle, BsXCircle, BsEnvelope } from 'react-icons/bs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/admin';

function ConfirmarEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [estado, setEstado] = useState('loading'); // loading | ok | erro
  const [msg, setMsg] = useState('');
  const [authNumber, setAuthNumber] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado('erro');
      setMsg('Link inválido: falta o token de confirmação.');
      return;
    }

    let cancelado = false;

    async function confirmar() {
      try {
        const res = await fetch(`${API}/confirm-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (cancelado) return;

        if (!data.success) {
          setEstado('erro');
          setMsg(data.comment || 'Não foi possível confirmar o email.');
          return;
        }

        setEstado('ok');
        setMsg(data.comment || 'Email confirmado com sucesso.');
        setAuthNumber(data.auth_number || '');
      } catch {
        if (cancelado) return;
        setEstado('erro');
        setMsg('Erro de rede. Verifique a ligação e tente de novo.');
      }
    }

    confirmar();

    return () => {
      cancelado = true;
    };
  }, [token]);

  return (
    <div className="aa-page">
      <div className="aa-card">
        <div className="aa-brand">
          <div className="aa-logo">MB</div>
          <h1>Confirmar email</h1>
          <p>Ativação da conta de administrador</p>
        </div>

        {estado === 'loading' && (
          <div className="aa-alert aa-alert-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="aa-spinner" />
            <span>A confirmar o seu email…</span>
          </div>
        )}

        {estado === 'ok' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="aa-alert aa-alert-ok" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <BsCheckCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{msg}</span>
            </div>

            {authNumber ? (
              <>
                <p className="aa-hint">
                  Use este <strong>auth number</strong> no login (não é o Gmail):
                </p>
                <div className="aa-code-box">{authNumber}</div>
              </>
            ) : null}

            <p className="aa-hint">
              A conta está ativa. Entre com o auth number e a password que definiu no registo.
            </p>

            <Link
              href="/admin"
              className="aa-btn aa-btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Ir para o login
            </Link>
          </div>
        )}

        {estado === 'erro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="aa-alert aa-alert-error" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <BsXCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{msg}</span>
            </div>

            <p className="aa-hint">
              O link pode ter expirado (24h) ou já ter sido usado. Peça um novo registo ou contacte outro admin.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                href="/admin/login"
                className="aa-btn aa-btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Voltar ao login
              </Link>
              <Link
                href="/admin/registar"
                className="aa-btn aa-btn-ghost"
                style={{ textDecoration: 'none' }}
              >
                Criar conta de novo
              </Link>
            </div>
          </div>
        )}

        <div className="aa-links" style={{ marginTop: 18 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <BsEnvelope size={14} />
            Feira Bandim · Admin
          </span>
        </div>

        <p className="aa-foot">Confirmação automática via link do email</p>
      </div>
    </div>
  );
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="aa-page">
          <div className="aa-card">
            <div className="aa-brand">
              <div className="aa-logo">MB</div>
              <h1>Confirmar email</h1>
            </div>
            <div className="aa-alert aa-alert-info" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="aa-spinner" />
              A carregar…
            </div>
          </div>
        </div>
      }
    >
      <ConfirmarEmailInner />
    </Suspense>
  );
}