'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BsPerson, BsWhatsapp, BsGeoAlt, BsShieldCheck, BsListUl } from 'react-icons/bs';
import { MdGridView } from 'react-icons/md';
import { CiSearch } from 'react-icons/ci';
import { useRouter } from 'next/navigation';
import '../../styles/services.css';
import { useAuthProvider } from '@/components/authcontext';

const API = 'http://localhost:5000';
const STORAGE_KEY = '@mercadobissau_workers_cache';

const CATEGORIAS = [
  { value: 'todos', label: 'Todas' },
  { value: 'construcao', label: 'Construção' },
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'canalizacao', label: 'Canalização' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'informatica', label: 'Informática' },
  { value: 'outros', label: 'Outros' },
];

export default function ServicosPage() {
  const router = useRouter();
  const { userFoto, userAuth } = useAuthProvider();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [filCategoria, setFilCategoria] = useState('todos');
  const [modoGrid, setModoGrid] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0 && isMounted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setWorkers(parsed);
          setLoading(false);
        }
      }
    } catch (_) {}

    async function carregar() {
      try {
        const res = await fetch(`${API}/workers`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Erro ao carregar');
        if (isMounted) {
          const novosWorkers = data.workers || [];
          setWorkers(novosWorkers);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(novosWorkers));
          setErro(null);
        }
      } catch (err) {
        if (isMounted && workers.length === 0) {
          setErro(err.message || 'Não foi possível carregar os profissionais.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    carregar();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtrados = workers.filter((w) => {
    const q = pesquisa.toLowerCase();
    const matchTexto = !q || w.nome?.toLowerCase().includes(q) || w.profissao?.toLowerCase().includes(q) || w.zona?.toLowerCase().includes(q);
    const matchCat = filCategoria === 'todos' || w.categoria === filCategoria;
    return matchTexto && matchCat;
  });

  return (
    <div className="sv-page">
      <header className="sv-header">
        <div className="sv-container sv-header-inner">
          <div className="sv-header-top">
            <div className="sv-header-titles">
              <h1>Serviços em Bissau</h1>
              <p>Profissionais verificados · Bandim, Praça e Regiões</p>
            </div>
            <div className="sv-header-actions">
              <button
                type="button"
                className="sv-icon-btn"
                onClick={() => setModoGrid((v) => !v)}
                aria-label="Alternar vista"
              >
                {modoGrid ? <BsListUl size={18} /> : <MdGridView size={18} />}
              </button>
              <Link href={userAuth ? "/buyers" : "/auth/login"} className="sv-icon-btn sv-profile-link" aria-label="Conta">
                {userFoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userFoto} alt="Perfil" className="sv-user-avatar-img" />
                ) : (
                  <BsPerson size={18} />
                )}
              </Link>
            </div>
          </div>
          <div className="sv-search-row">
            <div className="sv-search">
              <CiSearch size={18} />
              <input
                type="search"
                placeholder="Nome, profissão ou zona..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
              />
            </div>
            <select className="sv-select" value={filCategoria} onChange={(e) => setFilCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="sv-main">
        <div className="sv-container">
          {loading && workers.length === 0 && (
            <div className="sv-empty">
              <p>A carregar profissionais...</p>
            </div>
          )}
          {erro && workers.length === 0 && (
            <div className="sv-empty">
              <p>{erro}</p>
              <button type="button" onClick={() => window.location.reload()}>
                Tentar de novo
              </button>
            </div>
          )}
          {!loading && filtrados.length === 0 && workers.length > 0 && (
            <div className="sv-empty">
              <p>Nenhum profissional encontrado com esses filtros.</p>
            </div>
          )}
          {filtrados.length > 0 && (
            <div className={`sv-grid ${modoGrid ? '' : 'is-list'}`}>
              {filtrados.map((w) => {
                const workerId = w.id || w._id;
                return (
                  <div key={workerId} onClick={() => router.push(`/servicos/${workerId}`)} className="sv-card">
                    <div className="sv-card-media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={w.foto || '/card/art (0).jpg'} alt={w.nome} />
                      {w.verificado && (
                        <span className="sv-badge">
                          <BsShieldCheck size={10} /> Verificado
                        </span>
                      )}
                    </div>
                    <div className="sv-card-body">
                      <h3 className="sv-card-name">{w.nome}</h3>
                      <p className="sv-card-job">{w.profissao}</p>
                      <p className="sv-card-zone">
                        <BsGeoAlt size={11} /> {w.zona}
                      </p>
                    </div>
                    <div className="sv-card-foot">
                      <span className="sv-chip">{w.categoria}</span>
                      <a
                        href={`https://wa.me/${String(w.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${w.nome}, vi o seu perfil na Feira Bandim e quero pedir um orçamento.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sv-wa-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BsWhatsapp size={12} /> WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="sv-footer">
        <p>Feira Bandim &copy; 2026 — Serviços na Guiné-Bissau</p>
      </footer>
    </div>
  );
}