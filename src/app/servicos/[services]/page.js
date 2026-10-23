'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BsWhatsapp, BsGeoAlt, BsShieldCheck, BsClock, BsBriefcase, BsFileEarmarkPdf, BsRobot, BsSend, BsChevronLeft, BsShop, BsPerson, BsChatSquareText, BsStarFill } from 'react-icons/bs';
import { useAuthProvider } from '@/components/authcontext';
import '../../../styles/services.css';

const API = 'http://localhost:5000/workers';
const STORAGE_KEY_PREFIX = '@mercadobissau_worker_cache_';
const LIST_CACHE_KEY = '@mercadobissau_workers_cache';

export default function ServicoDetalhePage() {
  const params = useParams();
  const id = params?.services || params?.produto;
  const router = useRouter();
  const { userFoto, userAuth, user: authUser } = useAuthProvider();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [aba, setAba] = useState('perfil');
  const [inputTexto, setInputTexto] = useState('');
  const [mensagens, setMensagens] = useState([]);

  // Estados para comentários em work_samples (amostras)
  const [comentariosAmostras, setComentariosAmostras] = useState({}); // { [sampleId]: [comentarios] }
  const [inputsComentario, setInputsComentario] = useState({}); // { [sampleId]: { autor: '', texto: '', nota: 5 } }
  const [enviandoComentario, setEnviandoComentario] = useState(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    const cachedSingle = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (cachedSingle) {
      try {
        const parsed = JSON.parse(cachedSingle);
        if (isMounted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setWorker(parsed);
          // eslint-disable-next-line react-hooks/immutability
          inicializarComentariosAmostras(parsed.projetosFeitos || []);
          setMensagens([{ from: 'bot', text: parsed.iaOpinion || `Olá! Posso ajudar com preços, horário ou zona de ${parsed.nome}.`, }]);
          setLoading(false);
        }
      } catch (e) {
        console.error("Erro ao ler cache individual:", e);
      }
    } else {
      const cachedList = localStorage.getItem(LIST_CACHE_KEY);
      if (cachedList) {
        try {
          const workersList = JSON.parse(cachedList);
          const found = workersList.find((w) => (w.id || w._id) === id);
          if (found && isMounted) {
            setWorker(found);
            inicializarComentariosAmostras(found.projetosFeitos || []);
            setMensagens([{ from: 'bot', text: found.iaOpinion || `Olá! Posso ajudar com preços, horário ou zona de ${found.nome}.`, }]);
            setLoading(false);
          }
        } catch (e) {
          console.error("Erro ao ler cache geral:", e);
        }
      }
    }

    async function carregarDetalhes() {
      try {
        const res = await fetch(`${API}/${id}`);
        const data = await res.json();
        if (!data.success || !data.worker) {
          throw new Error(data.message || 'Profissional não encontrado');
        }
        if (isMounted) {
          const wData = data.worker;
          setWorker(wData);
          inicializarComentariosAmostras(wData.projetosFeitos || []);
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(wData));
          setMensagens((prev) => prev.length ? prev : [{ from: 'bot', text: wData.iaOpinion || `Olá! Posso ajudar com preços, horário ou zona de ${wData.nome}.`, }]);
        }
      } catch (err) {
        console.error("Erro ao sincronizar da API:", err);
        if (isMounted && !worker) {
          setErro(err.message || 'Erro ao carregar dados do servidor');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    carregarDetalhes();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const inicializarComentariosAmostras = (amostras) => {
    const mapa = {};
    amostras.forEach((s) => {
      mapa[s.id || s._id] = s.comments || s.comentarios || [];
    });
    setComentariosAmostras(mapa);
  };

  const enviarIA = async (e) => {
    e.preventDefault();
    if (!inputTexto.trim() || !worker) return;
    const pergunta = inputTexto.trim();
    setMensagens((m) => [...m, { from: 'user', text: pergunta }]);
    setInputTexto('');
    try {
      const res = await fetch(`http://localhost:5000/ai/chat/chatbot/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          mensagem: pergunta,
          historico: mensagens
        })
      });
      const data = await res.json();
      if (data.success) {
        setMensagens((m) => [...m, { from: 'bot', text: data.resposta }]);
      } else {
        setMensagens((m) => [...m, { from: 'bot', text: 'Desculpa, tive um pequeno problema técnico. Podes tentar de novo ou usar o WhatsApp.' }]);
      }
    } catch (err) {
      console.error("Erro na comunicação com a IA:", err);
      setMensagens((m) => [...m, { from: 'bot', text: 'Não foi possível contactar o assistente neste momento. Tenta o WhatsApp.' }]);
    }
  };

  const handleEnviarComentarioAmostra = async (e, sampleId) => {
    e.preventDefault();
    const dadosForm = inputsComentario[sampleId];
    if (!dadosForm || !dadosForm.texto?.trim()) return;

    setEnviandoComentario(sampleId);
    try {
      const res = await fetch(`http://localhost:5000/workers/${id}/samples/${sampleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUser?.id || null,
          autor: dadosForm.autor?.trim() || authUser?.user_metadata?.name || 'Cliente Verificado',
          comentario: dadosForm.texto.trim(),
          nota: Number(dadosForm.nota) || 5,
        })
      });
      const data = await res.json();
      if (data.success) {
        const novoComentario = data.comment || {
          // eslint-disable-next-line react-hooks/purity
          id: Date.now(),
          autor: dadosForm.autor || 'Cliente',
          comentario: dadosForm.texto,
          nota: dadosForm.nota || 5,
          created_at: new Date().toISOString()
        };
        setComentariosAmostras((prev) => ({
          ...prev,
          [sampleId]: [novoComentario, ...(prev[sampleId] || [])]
        }));
        setInputsComentario((prev) => ({
          ...prev,
          [sampleId]: { autor: '', texto: '', nota: 5 }
        }));
      } else {
        alert(data.message || 'Erro ao publicar comentário.');
      }
    } catch (err) {
      console.error('Erro ao enviar comentário:', err);
      alert('Erro de conexão ao enviar comentário.');
    } finally {
      setEnviandoComentario(null);
    }
  };

  if (loading && !worker) {
    return (
      <div className="sv-page">
        <div className="sv-container sv-main">
          <div className="sv-empty">A carregar perfil...</div>
        </div>
      </div>
    );
  }

  if (erro && !worker) {
    return (
      <div className="sv-page">
        <div className="sv-container sv-main">
          <div className="sv-empty">
            <p>{erro}</p>
            <Link href="/servicos">← Voltar à lista</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!worker) return null;

  const amostras = worker.projetosFeitos || [];
  const temProdutos = Array.isArray(worker.produtosVenda) && worker.produtosVenda.length > 0;
  const abas = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'amostras', label: `Amostras (${amostras.length})` },
    { id: 'ia', label: 'IA / Preços' },
    ...(temProdutos ? [{ id: 'produtos', label: `Loja (${worker.produtosVenda.length})` }] : []),
  ];

  const waLink = `https://wa.me/${String(worker.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá ${worker.nome}, vi o seu perfil na Feira Bandim e gostaria de um orçamento.`
  )}`;

  return (
    <div className="sv-page">
      <header className="sv-detail-header">
        <div className="sv-container sv-detail-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" className="sv-icon-btn" onClick={() => router.back()} aria-label="Voltar">
              <BsChevronLeft size={18} />
            </button>
            <div>
              <h1>{worker.nome}</h1>
              <p>{worker.profissao}</p>
            </div>
          </div>
          <Link href={userAuth ? "/buyers" : "/auth/login"} className="sv-icon-btn sv-profile-link" aria-label="Conta">
            {userFoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userFoto} alt="Perfil" className="sv-user-avatar-img" />
            ) : (
              <BsPerson size={18} />
            )}
          </Link>
        </div>
      </header>

      <section className="sv-hero">
        <div className="sv-container sv-hero-inner">
          <div className="sv-avatar-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sv-avatar" src={worker.foto || '/card/art (0).jpg'} alt={worker.nome} />
            {worker.verificado && (
              <span className="sv-avatar-ok">
                <BsShieldCheck size={12} />
              </span>
            )}
          </div>
          <div className="sv-hero-info">
            <h2>{worker.nome}</h2>
            <p className="job">{worker.profissao}</p>
            <div className="sv-hero-meta">
              <span>
                <BsGeoAlt size={12} /> {worker.zona}
              </span>
              {worker.verificado && <span className="ok">· Verificado</span>}
              <span>
                <BsClock size={12} /> {worker.horario || 'Seg–Sáb 08:00–18:00'}
              </span>
            </div>
            <div className="sv-hero-cta">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="sv-wa-btn-lg">
                <BsWhatsapp size={16} /> Contactar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <nav className="sv-tabs">
        <div className="sv-container" style={{ display: 'flex', gap: 2 }}>
          {abas.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`sv-tab ${aba === t.id ? 'is-active' : ''}`}
              onClick={() => setAba(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="sv-panel">
        <div className="sv-container">
          {aba === 'perfil' && (
            <>
              <div className="sv-block">
                <h3>
                  <BsBriefcase size={16} /> Sobre
                </h3>
                <p>{worker.experiencia || 'Profissional qualificado na área.'}</p>
                <p>
                  <strong>Categoria:</strong> {worker.categoria}
                </p>
                <p>
                  <strong>Endereço / ref.:</strong>{' '}
                  {worker.enderecoCompleto || 'Bissau, Guiné-Bissau'}
                </p>
                <p>
                  <strong>Telefone:</strong> {worker.telefone}
                </p>
              </div>

              {worker.cvUrl && (
                <div className="sv-block">
                  <h3>
                    <BsFileEarmarkPdf size={16} /> Curriculum (CV)
                  </h3>
                  <a href={worker.cvUrl} target="_blank" rel="noopener noreferrer" className="sv-link-btn">
                    <BsFileEarmarkPdf size={16} /> Ver / Descarregar CV
                  </a>
                </div>
              )}

              {worker.custosServicos?.length > 0 && (
                <div className="sv-block">
                  <h3>Referência de preços</h3>
                  {worker.custosServicos.map((c, i) => (
                    <div key={i} className="sv-price-row">
                      <span>{c.servico}</span>
                      <strong>{c.preco}</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {aba === 'amostras' && (
            amostras.length === 0 ? (
              <div className="sv-empty">Ainda não há amostras publicadas.</div>
            ) : (
              <div className="sv-samples">
                {amostras.map((s) => {
                  const sampleId = s.id || s._id;
                  const comentariosList = comentariosAmostras[sampleId] || [];
                  const formState = inputsComentario[sampleId] || { autor: '', texto: '', nota: 5 };

                  return (
                    <article key={sampleId} className="sv-sample-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.imagem} alt={s.titulo} style={{ width: '100%', maxWidth: '300px', objectFit: 'cover', borderRadius: '8px' }} />
                        <div className="sv-sample-body" style={{ flex: 1 }}>
                          <h4>{s.titulo}</h4>
                          <p className="price" style={{ fontWeight: 'bold', color: '#10b981' }}>{s.preco}</p>
                          <p className="desc">{s.detalhes}</p>
                        </div>
                      </div>

                      {/* Seção de Comentários / Avaliações na Amostra */}
                      <div className="sv-sample-comments-section" style={{ marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                        <h5 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '8px', color: '#374151' }}>
                          <BsChatSquareText size={14} /> Comentários e Avaliações ({comentariosList.length})
                        </h5>

                        <div className="sv-comments-list" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {comentariosList.length === 0 ? (
                            <p style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>Nenhum comentário nesta amostra ainda.</p>
                          ) : (
                            comentariosList.map((c, idx) => (
                              <div key={c.id || idx} style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: '#1f2937' }}>
                                  <span>{c.autor || 'Anónimo'}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#d97706' }}>
                                    <BsStarFill size={10} /> {c.nota || 5}
                                  </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>{c.comentario || c.texto}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Formulário para adicionar comentário na amostra */}
                        <form onSubmit={(e) => handleEnviarComentarioAmostra(e, sampleId)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="O seu nome"
                              value={formState.autor}
                              onChange={(e) => setInputsComentario({
                                ...inputsComentario,
                                [sampleId]: { ...formState, autor: e.target.value }
                              })}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                              required
                            />
                            <select
                              value={formState.nota}
                              onChange={(e) => setInputsComentario({
                                ...inputsComentario,
                                [sampleId]: { ...formState, nota: Number(e.target.value) }
                              })}
                              style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            >
                              <option value={5}>⭐⭐⭐⭐⭐</option>
                              <option value={4}>⭐⭐⭐⭐</option>
                              <option value={3}>⭐⭐⭐</option>
                              <option value={2}>⭐⭐</option>
                              <option value={1}>⭐</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Escreva um comentário sobre esta amostra..."
                              value={formState.texto}
                              onChange={(e) => setInputsComentario({
                                ...inputsComentario,
                                [sampleId]: { ...formState, texto: e.target.value }
                              })}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                              required
                            />
                            <button
                              type="submit"
                              disabled={enviandoComentario === sampleId}
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              {enviandoComentario === sampleId ? 'A enviar...' : 'Comentar'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          )}

          {aba === 'ia' && (
            <>
              <div className="sv-ia-banner">
                <strong>
                  <BsRobot size={18} /> Assistente do perfil
                </strong>
                <p>Pergunte sobre preços, horário, zona ou experiência de {worker.nome}.</p>
              </div>
              <div className="sv-ia-box">
                <div className="sv-ia-msgs">
                  {mensagens.map((m, i) => (
                    <div key={i} className={`sv-msg ${m.from === 'user' ? 'is-user' : 'is-bot'}`}>
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>
                <form className="sv-ia-form" onSubmit={enviarIA}>
                  <input
                    type="text"
                    value={inputTexto}
                    onChange={(e) => setInputTexto(e.target.value)}
                    placeholder="Ex: Quanto custa uma visita?"
                  />
                  <button type="submit" aria-label="Enviar">
                    <BsSend size={16} />
                  </button>
                </form>
              </div>
            </>
          )}

          {aba === 'produtos' && temProdutos && (
            <>
              <div className="sv-block" style={{ marginBottom: 12 }}>
                <h3>
                  <BsShop size={16} /> Produtos à venda
                </h3>
              </div>
              <div className="sv-samples">
                {worker.produtosVenda.map((p) => (
                  <Link key={p.id} href={`/${p.categoria || 'outros'}/${p.id}`} className="sv-sample-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imagem || '/card/art (0).jpg'} alt={p.nome} />
                    <div className="sv-sample-body">
                      <h4>{p.nome}</h4>
                      <p className="price">{p.preco}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="sv-footer">
        <p>Feira Bandim © 2026</p>
      </footer>
    </div>
  );
}