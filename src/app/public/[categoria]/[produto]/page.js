'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BsArrowLeft, BsWhatsapp, BsGeoAlt, BsShare, BsCheckCircleFill, BsSend, BsBoxSeam, BsRobot, BsChevronLeft, BsChevronRight, BsStarFill, BsHeart, BsHeartFill, BsEye, BsClock } from 'react-icons/bs';
import { createClient } from '@/utils/supabase/client';
import { useAuthProvider } from '@/components/authcontext';
import '../../../../styles/product.css';

const API = 'http://localhost:5000';

function getFotos(p) {
  if (!p) return [];
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0) {
    return p.image_urls.filter(Boolean);
  }
  if (p.image_url) return [p.image_url];
  return [];
}

function slugCategoria(nome) {
  if (!nome) return 'outros';
  const n = String(nome).toLowerCase();
  if (n.includes('telem') || n.includes('it')) return 'it';
  if (n.includes('peixe')) return 'peixe';
  if (n.includes('cereal')) return 'cereais';
  if (n.includes('fruta')) return 'frutas';
  if (n.includes('bebida')) return 'bebidas';
  if (n.includes('carne')) return 'carnes';
  if (n.includes('vestu')) return 'vestuario';
  return 'outros';
}

// Simplificado para apenas {uk flag}UK
function labelCondicao(c) {
  if (c === 'uk_usado' || c === 'usado_uk' || String(c).toLowerCase().includes('uk')) return '🇬🇧 UK';
  if (c === '2nd_mao' || c === 'usado' || c === 'usado_2maos') return '🔄 2ª Mão';
  return '✨ Novo';
}

function mapProduto(p, metrics = {}, reviews = []) {
  const fotos = getFotos(p);
  const lista = fotos.length > 0 ? fotos : ['/card/art (0).jpg'];
  const primeira = lista[0];
  const fotoLojaFinal = p.store_logo || p.store?.logo_url || p.store?.image_url || p.store_image || primeira;
  return {
    id: p.id,
    nome: p.title || p.nome || 'Artigo',
    preco: p.price_min ? `${Number(p.price_min).toLocaleString()} XOF` : 'Preço sob consulta',
    price_min: p.price_min,
    price_max: p.price_max,
    condicao: p.condition || 'novo',
    local: p.location || p.store?.bairro || p.store?.location || 'Bissau',
    detalhes: p.description || 'Sem descrição.',
    imagens: lista,
    views_count: metrics.views_count ?? p.views_count ?? 0,
    likes_count: metrics.likes_count ?? p.likes_count ?? 0,
    whatsapp_clicks: metrics.whatsapp_clicks ?? p.whatsapp_clicks ?? 0,
    vendedor: {
      nome: p.seller || p.store?.name || 'Loja do Mercado',
      tipo: 'Loja Física Verificada & Certificada',
      whatsapp: String(p.whatsapp || p.store?.whatsapp || '').replace(/\D/g, ''),
      fotoLoja: fotoLojaFinal,
      enderecoLoja: p.location || p.store?.bairro || p.store?.address || 'Bissau, Guiné-Bissau',
      outrosNegocios: p.outrosNegocios || p.seller_products || [],
    },
    reviews: reviews.map((r) => ({
      id: r.id,
      autor: r.autor || r.author_name || r.user_name || 'Anónimo',
      comentario: r.comentario || r.comment || '',
      nota: r.nota || r.rating || 5,
      data: r.created_at ? new Date(r.created_at).toLocaleDateString('pt-PT') : (r.data || 'Hoje'),
    })),
  };
}

function RenderizadorRespostaClara({ texto }) {
  if (!texto) return null;
  if (texto.includes('|')) {
    const linhas = texto.split('\n').filter(l => l.trim().length > 0);
    const cabecalho = [];
    const corpo = [];
    let ehCabecalho = true;
    let temTabelaValida = false;
    linhas.forEach(linha => {
      if (linha.includes('---')) {
        ehCabecalho = false;
        return;
      }
      if (linha.trim().startsWith('|')) {
        temTabelaValida = true;
        const colunas = linha.split('|').filter(c => c.trim().length > 0).map(c => c.trim());
        if (ehCabecalho) cabecalho.push(colunas);
        else corpo.push(colunas);
      }
    });
    if (temTabelaValida) {
      return (
        <div className="table-responsive">
          <table className="clara-table">
            {cabecalho.length > 0 && (
              <thead>
                {cabecalho.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <th key={j}>{cell.replace(/\*\*/g, '')}</th>
                    ))}
                  </tr>
                ))}
              </thead>
            )}
            <tbody>
              {corpo.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell.replace(/\*\*/g, '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
  return (
    <div className="clara-text-content">
      {texto.replace(/\*\*/g, '')}
    </div>
  );
}

export default function DetalheProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const categoria = params?.categoria;
  const produtoId = params?.produto;
  const supabase = createClient();
  const { user: authUser } = useAuthProvider() || {};
  const [produtoAtual, setProdutoAtual] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [imagemAtiva, setImagemAtiva] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [waClicks, setWaClicks] = useState(0);
  const [listaAvaliacoes, setListaAvaliacoes] = useState([]);
  const [carregandoReviews, setCarregandoReviews] = useState(false);
  const [novaReview, setNovaReview] = useState({ autor: '', comentario: '', nota: 5 });
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [aEnviarReview, setAEnviarReview] = useState(false);
  const [claraAberta, setClaraAberta] = useState(true);
  const [mensagensClara, setMensagensClara] = useState([]);
  const [inputClara, setInputClara] = useState('');
  const [claraACarregar, setClaraACarregar] = useState(false);
  const likeEmAndamento = useRef(false);
  const viewRegistrada = useRef(false);

  const horaAtual = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const pathLogin = () => {
    const next = encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/login');
    return `/login?next=${next}`;
  };

  const garantirLogin = async () => {
    if (authUser) return authUser;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(pathLogin());
      return null;
    }
    return user;
  };

  useEffect(() => {
    if (!produtoId) return;
    let cancelado = false;
    try {
      const cache = sessionStorage.getItem(`produto_cache_${produtoId}`);
      if (cache) {
        const parsed = JSON.parse(cache);
        const mapped = mapProduto(parsed, parsed.metrics || {}, parsed.reviews || []);
        if (!cancelado) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setProdutoAtual(mapped);
          setViewsCount(mapped.views_count);
          setLikesCount(mapped.likes_count);
          setWaClicks(mapped.whatsapp_clicks);
          if (mapped.reviews?.length) setListaAvaliacoes(mapped.reviews);
          setMensagensClara([
            { remetente: 'ia', texto: 'Olá! Sou a Clara, assistente inteligente. Como posso ajudar com mais detalhes sobre este artigo ou comparação de orçamento?', hora: horaAtual() },
          ]);
          setCarregando(false);
        }
      }
    } catch (_) {}

    async function carregarEAtualizarTudo() {
      try {
        const res = await fetch(`${API}/buyers/products/${produtoId}`);
        const data = await res.json();
        if (cancelado) return;
        if (data.success && data.product) {
          const mapped = mapProduto(data.product, data.metrics || {}, data.reviews || []);
          setProdutoAtual(mapped);
          setViewsCount(mapped.views_count);
          setLikesCount(mapped.likes_count);
          setWaClicks(mapped.whatsapp_clicks);
          if (mapped.reviews?.length) setListaAvaliacoes(mapped.reviews);
          setMensagensClara((prev) => prev.length ? prev : [
            { remetente: 'ia', texto: 'Olá! Sou a Clara, assistente inteligente. Como posso ajudar com mais detalhes sobre este artigo ou comparação de orçamento?', hora: horaAtual() },
          ]);
          try {
            sessionStorage.setItem(`produto_cache_${produtoId}`, JSON.stringify({ ...data.product, metrics: data.metrics, reviews: data.reviews }));
          } catch (_) {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelado) setCarregando(false);
      }

      const sessionKey = `viewed_${produtoId}`;
      if (!viewRegistrada.current && !sessionStorage.getItem(sessionKey)) {
        viewRegistrada.current = true;
        sessionStorage.setItem(sessionKey, '1');
        try {
          const r = await fetch(`${API}/products/interaction/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authUser?.id || null, productId: produtoId }),
          });
          const d = await r.json();
          if (d.success && typeof d.views_count === 'number' && !cancelado) setViewsCount(d.views_count);
        } catch (_) {}
      }
    }

    carregarEAtualizarTudo();
    return () => {
      cancelado = true;
    };
  }, [produtoId, supabase, authUser]);

  const toggleLike = async () => {
    if (likeEmAndamento.current) return;
    const user = await garantirLogin();
    if (!user) return;
    likeEmAndamento.current = true;
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!liked);
    setLikesCount(!liked ? prevCount + 1 : Math.max(0, prevCount - 1));

    try {
      const res = await fetch(`${API}/products/interaction/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId: produtoId, action: !liked ? 'like' : 'unlike' }),
      });
      const data = await res.json();
      if (!data.success) {
        setLiked(prevLiked);
        setLikesCount(prevCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      likeEmAndamento.current = false;
    }
  };

  const handleWhatsApp = async () => {
    if (!produtoAtual?.vendedor?.whatsapp) return;
    const user = await garantirLogin();
    if (!user) return;
    window.open(`https://wa.me/${produtoAtual.vendedor.whatsapp}`, '_blank');
    setWaClicks((c) => c + 1);
    try {
      await fetch(`${API}/products/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, productId: produtoId }),
      });
    } catch (_) {}
  };

  const enviarAvaliacao = async (e) => {
    e.preventDefault();
    if (!novaReview.autor.trim() || !novaReview.comentario.trim()) return;
    const user = await garantirLogin();
    if (!user) return;
    setAEnviarReview(true);
    try {
      const res = await fetch(`${API}/products/${produtoId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: produtoId,
          userId: user.id,
          autor: novaReview.autor.trim(),
          comentario: novaReview.comentario.trim(),
          nota: Number(novaReview.nota),
          produto: produtoAtual.nome,
        }),
      });
      const data = await res.json();
      if (data.success && data.review) {
        const novaReg = {
          id: data.review.id,
          autor: data.review.author_name || data.review.autor,
          comentario: data.review.comment || data.review.comentario,
          nota: data.review.rating || data.review.nota,
          data: 'Hoje'
        };
        setListaAvaliacoes([novaReg, ...listaAvaliacoes]);
        setNovaReview({ autor: '', comentario: '', nota: 5 });
        setFormularioAberto(false);
      } else {
        alert(data.comment || 'Erro ao guardar avaliação');
      }
    } catch {
      alert('Erro de conexão');
    } finally {
      setAEnviarReview(false);
    }
  };

  const enviarClara = async (e) => {
    e.preventDefault();
    if (!inputClara.trim() || claraACarregar) return;
    const pergunta = inputClara.trim();
    const novoHist = [...mensagensClara, { remetente: 'utilizador', texto: pergunta, hora: horaAtual() }];
    setMensagensClara(novoHist);
    setInputClara('');
    setClaraACarregar(true);
    try {
      const res = await fetch(`${API}/ai/chat/chatbot/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authUser?.id || null,
          mensagem: pergunta,
          model: produtoAtual?.nome,
          historico: novoHist,
        }),
      });
      const data = await res.json();
      setMensagensClara([
        ...novoHist,
        {
          remetente: 'ia',
          texto: data.success ? (data.resposta || data.message) : (data.comment || 'Sem resposta.'),
          hora: horaAtual()
        },
      ]);
    } catch {
      setMensagensClara([...novoHist, { remetente: 'ia', texto: 'Erro de conexão com a Clara.', hora: horaAtual() }]);
    } finally {
      setClaraACarregar(false);
    }
  };

  if (carregando && !produtoAtual) {
    return (
      <main className="pro-main-screen">
        <div className="pro-spinner"></div>
        <p>A carregar detalhes do artigo...</p>
      </main>
    );
  }

  if (!produtoAtual) {
    return (
      <main className="pro-main-screen">
        <p>Artigo indisponível ou removido.</p>
        <button type="button" onClick={() => router.back()} className="pro-btn-primary">Voltar</button>
      </main>
    );
  }

  const mapaUrl = `https://maps.google.com/maps?q=${encodeURIComponent(produtoAtual.vendedor.enderecoLoja + ', Bissau, Guiné-Bissau')}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <main className="pro-container">
      {/* HEADER */}
      <header className="pro-header">
        <button type="button" onClick={() => router.back()} className="pro-back-btn">
          <BsArrowLeft size={18} />
          <span>Voltar</span>
        </button>
        <button
          type="button"
          className="pro-share-btn"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: produtoAtual.nome, url: window.location.href });
            } else {
              navigator.clipboard?.writeText(window.location.href);
              alert('Link copiado!');
            }
          }}
        >
          <BsShare size={16} />
        </button>
      </header>

      {/* GALERIA & UK SIMPLIFICADO */}
      <div className="pro-gallery">
        <div className="pro-main-img-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={produtoAtual.imagens[imagemAtiva]} alt={produtoAtual.nome} className="pro-main-img" />
          <div className="pro-badge-uk">
            {labelCondicao(produtoAtual.condicao)}
          </div>
          {produtoAtual.imagens.length > 1 && (
            <>
              <button
                type="button"
                className="pro-arrow prev"
                onClick={() => setImagemAtiva((i) => (i === 0 ? produtoAtual.imagens.length - 1 : i - 1))}
              >
                <BsChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="pro-arrow next"
                onClick={() => setImagemAtiva((i) => (i === produtoAtual.imagens.length - 1 ? 0 : i + 1))}
              >
                <BsChevronRight size={16} />
              </button>
              <span className="pro-img-counter">{imagemAtiva + 1}/{produtoAtual.imagens.length}</span>
            </>
          )}
        </div>
        {produtoAtual.imagens.length > 1 && (
          <div className="pro-thumbs">
            {produtoAtual.imagens.map((img, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setImagemAtiva(idx)}
                className={`pro-thumb-btn ${imagemAtiva === idx ? 'active' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Miniatura ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CORPO DO PRODUTO */}
      <section>
        <div className="pro-card">
          <span className="pro-price">{produtoAtual.preco}</span>
          <h1 className="pro-title">{produtoAtual.nome}</h1>
          <div className="pro-location">
            <BsGeoAlt size={15} />
            <span>{produtoAtual.local}</span>
          </div>
          <div className="pro-metrics">
            <span className="pro-metric-item"><BsEye size={16} /> {viewsCount} vistas</span>
            <button type="button" onClick={toggleLike} className={`pro-like-btn ${liked ? 'liked' : ''}`}>
              {liked ? <BsHeartFill size={16} /> : <BsHeart size={16} />} {likesCount}
            </button>
            <span className="pro-metric-item"><BsWhatsapp size={16} /> {waClicks} WhatsApp</span>
          </div>
        </div>

        {/* CLARA INTELIGENTE */}
        <div className="pro-card clara-card">
          <div className="clara-header">
            <div className="clara-avatar">
              <BsRobot size={20} />
            </div>
            <div className="clara-info">
              <h3>Assistente Clara (IA)</h3>
              <span>Saber mais sobre este produto ou comparação com orçamento</span>
            </div>
          </div>
          <div className="clara-chat-box">
            {mensagensClara.map((m, i) => (
              <div key={i} className={`clara-msg ${m.remetente}`}>
                {m.remetente === 'ia' ? (
                  <RenderizadorRespostaClara texto={m.texto} />
                ) : (
                  <p className="clara-user-text">{m.texto}</p>
                )}
                <span className="clara-time"><BsClock size={10} className="clara-clock-icon" />{m.hora}</span>
              </div>
            ))}
            {claraACarregar && (
              <div className="clara-msg ia">
                <div className="clara-typing">
                  <div className="clara-dot"></div>
                  <div className="clara-dot"></div>
                  <div className="clara-dot"></div>
                </div>
                <span className="clara-typing-text">A Clara está a calcular e a responder...</span>
              </div>
            )}
          </div>
          <form onSubmit={enviarClara} className="clara-form">
            <input
              type="text"
              className="clara-input"
              value={inputClara}
              onChange={(e) => setInputClara(e.target.value)}
              placeholder="Ex: Qualidade UK garantida? Como fica o orçamento?"
            />
            <button type="submit" className="clara-send-btn" disabled={claraACarregar}>
              <BsSend size={16} />
            </button>
          </form>
        </div>

        {/* DETALHES DO ARTIGO */}
        <div className="pro-card">
          <h3 className="pro-section-title">Detalhes do Artigo</h3>
          <p className="pro-description">{produtoAtual.detalhes}</p>
        </div>

        {/* VENDEDOR & MAPA */}
        <div className="pro-card">
          <div className="pro-seller-header">
            <div className="pro-avatar">
              {produtoAtual.vendedor.fotoLoja && !produtoAtual.vendedor.fotoLoja.includes('/card/art') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={produtoAtual.vendedor.fotoLoja} alt="Loja" />
              ) : (
                <span>{(produtoAtual.vendedor.nome || 'L').charAt(0)}</span>
              )}
            </div>
            <div className="pro-seller-details">
              <h4>{produtoAtual.vendedor.nome} <BsCheckCircleFill size={14} color="#10b981" /></h4>
              <span>{produtoAtual.vendedor.tipo}</span>
            </div>
          </div>
          <p className="pro-seller-address"><BsGeoAlt size={14} /> {produtoAtual.vendedor.enderecoLoja}</p>
          <iframe title="Mapa" src={mapaUrl} width="100%" height="160" className="pro-map" allowFullScreen="" loading="lazy"></iframe>
        </div>

        {/* OUTROS PRODUTOS */}
        {produtoAtual.vendedor.outrosNegocios?.length > 0 && (
          <div className="pro-card">
            <div className="pro-other-title-wrapper">
              <BsBoxSeam size={16} />
              <h3 className="pro-section-title-sm">Outros artigos desta loja</h3>
            </div>
            <div className="pro-grid-other">
              {produtoAtual.vendedor.outrosNegocios.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    try {
                      sessionStorage.setItem(`produto_cache_${item.id}`, JSON.stringify(item));
                    } catch (_) {}
                    router.push(`/public/${slugCategoria(item.category)}/${item.id}`);
                  }}
                  className="pro-other-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getFotos(item)[0] || '/card/art (0).jpg'} alt={item.title} className="pro-other-img" />
                  <div className="pro-other-info">
                    <span className="pro-other-name">{item.title}</span>
                    <span className="pro-other-price">{item.price_min ? `${Number(item.price_min).toLocaleString()} XOF` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AVALIAÇÕES */}
        <div className="pro-card">
          <div className="pro-reviews-header">
            <div className="pro-reviews-title">
              <BsStarFill size={16} color="#fbbf24" />
              <span>Avaliações de Clientes ({listaAvaliacoes.length})</span>
            </div>
            <button type="button" onClick={() => setFormularioAberto(!formularioAberto)} className="pro-review-btn">
              {formularioAberto ? 'Fechar' : 'Escrever Avaliação'}
            </button>
          </div>
          {formularioAberto && (
            <form onSubmit={enviarAvaliacao} className="pro-review-form">
              <input
                type="text"
                className="pro-input"
                placeholder="Seu Nome Completo"
                value={novaReview.autor}
                onChange={(e) => setNovaReview({ ...novaReview, autor: e.target.value })}
                required
              />
              <select
                className="pro-select"
                value={novaReview.nota}
                onChange={(e) => setNovaReview({ ...novaReview, nota: Number(e.target.value) })}
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5/5 Excelente)</option>
                <option value={4}>⭐⭐⭐⭐ (4/5 Bom)</option>
                <option value={3}>⭐⭐⭐ (3/5 Regular)</option>
                <option value={2}>⭐⭐ (2/5 Fraco)</option>
                <option value={1}>⭐ (1/5 Mau)</option>
              </select>
              <textarea
                className="pro-textarea"
                rows="3"
                placeholder="Escreva a sua experiência com o produto..."
                value={novaReview.comentario}
                onChange={(e) => setNovaReview({ ...novaReview, comentario: e.target.value })}
                required
              />
              <button type="submit" className="pro-submit-review" disabled={aEnviarReview}>
                {aEnviarReview ? 'A enviar...' : 'Publicar Avaliação'}
              </button>
            </form>
          )}
          {carregandoReviews ? (
            <p className="pro-text-muted">A carregar avaliações...</p>
          ) : listaAvaliacoes.length === 0 ? (
            <p className="pro-empty-reviews">Ainda não há avaliações. Seja o primeiro a avaliar!</p>
          ) : (
            listaAvaliacoes.map((rev, index) => (
              <div key={rev.id || index} className="pro-review-item">
                <div className="pro-review-top">
                  <span>{rev.autor}</span>
                  <span className="pro-review-date">{rev.data}</span>
                </div>
                <div className="pro-review-stars">
                  {Array.from({ length: Number(rev.nota) || 5 }).map((_, i) => (
                    <BsStarFill key={i} size={11} color="#fbbf24" />
                  ))}
                </div>
                <p className="pro-review-comment">{rev.comentario}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FOOTER FIXO WHATSAPP */}
      <div className="pro-footer">
        <div>
          <span className="pro-footer-label">Preço do Artigo</span>
          <span className="pro-footer-price">{produtoAtual.preco}</span>
        </div>
        <button type="button" onClick={handleWhatsApp} className="pro-wa-btn">
          <BsWhatsapp size={18} /> Negociar no WhatsApp
        </button>
      </div>
    </main>
  );
}