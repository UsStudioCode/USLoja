'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthProvider } from '@/components/authcontext';
import FullServicesComponent from '@/components/full-services';
import { FiHeart, FiCheckCircle, FiShoppingBag, FiPackage, FiPlus, FiPhone, FiMapPin, FiX, FiEdit3, FiTrash2, FiCheck, FiCamera, FiBriefcase, FiChevronLeft, FiChevronRight, FiBell, FiMessageCircle, FiStar, FiAlertTriangle } from 'react-icons/fi';
import { BsCheckCircleFill, BsPerson, BsWhatsapp } from 'react-icons/bs';

const API = 'http://localhost:5000';
const SLUG_CATEGORIA = {
  'Telemóveis e IT': 'it',
  'Peixes e Mariscos': 'peixe',
  'Cereais e Tubérculos': 'cereais',
  'Frutas e Hortaliças': 'frutas',
  'Bebidas Locais': 'bebidas',
  'Carnes e Aves': 'carnes',
  'Vestuário e Calçado': 'vestuario',
};

function getFotosProduto(prod) {
  if (!prod) return [];
  if (Array.isArray(prod.image_urls) && prod.image_urls.length > 0) {
    return prod.image_urls.filter(Boolean);
  }
  if (prod.image_url) return [prod.image_url];
  return [];
}

export default function BuyerHomePage() {
  const router = useRouter();
  const { userAuth, userProfile, loading: authLoading } = useAuthProvider();

  const [subAbaCompras, setSubAbaCompras] = useState('favoritos');
  const [produtosLoja, setProdutosLoja] = useState([]);
  const [dadosLoja, setDadosLoja] = useState(null);
  const [dadosTrabalhador, setDadosTrabalhador] = useState(null);
  const [carregandoTrabalhador, setCarregandoTrabalhador] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [comprados, setComprados] = useState([]);
  const [listaNotificacoesLoja, setListaNotificacoesLoja] = useState([]);
  const [carregandoLoja, setCarregandoLoja] = useState(false);
  const [carregandoNotifLoja, setCarregandoNotifLoja] = useState(false);
  const [notifLojaCarregadas, setNotifLojaCarregadas] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [produtoEditado, setProdutoEditado] = useState({});
  const [novasFotosFiles, setNovasFotosFiles] = useState([]);
  const [novasFotosPreviews, setNovasFotosPreviews] = useState([]);
  const [fotoAtivaIndex, setFotoAtivaIndex] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [ultimaCat, setUltimaCat] = useState('it');
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [reviewsProduto, setReviewsProduto] = useState([]);
  const [carregandoReviews, setCarregandoReviews] = useState(false);
  const [reviewsCarregados, setReviewsCarregados] = useState(false);

  useEffect(() => {
    try {
      const cachedAbas = localStorage.getItem('buyer_sub_aba');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cachedAbas) setSubAbaCompras(JSON.parse(cachedAbas));
      const cachedLoja = localStorage.getItem('buyer_dados_loja');
      if (cachedLoja) setDadosLoja(JSON.parse(cachedLoja));
      const cachedProdutosLoja = localStorage.getItem('buyer_produtos_loja');
      if (cachedProdutosLoja) setProdutosLoja(JSON.parse(cachedProdutosLoja));
      const cachedTrabalhador = localStorage.getItem('buyer_dados_trabalhador');
      if (cachedTrabalhador) setDadosTrabalhador(JSON.parse(cachedTrabalhador));
      const cachedNotificacoes = localStorage.getItem('buyer_notif_loja');
      if (cachedNotificacoes) setListaNotificacoesLoja(JSON.parse(cachedNotificacoes));
      const cachedNotListas = localStorage.getItem('buyer_notif_carregadas');
      if (cachedNotListas) setNotifLojaCarregadas(JSON.parse(cachedNotListas));
    } catch (e) {
      console.error('Erro ao ler cache do localStorage:', e);
    }
  }, []);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userProfile) {
      if (Array.isArray(userProfile.favorite_products)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFavoritos(userProfile.favorite_products);
      }
      if (Array.isArray(userProfile.purchased_products)) {
        setComprados(userProfile.purchased_products);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      const cat = sessionStorage.getItem('ultima_categoria') || 'it';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUltimaCat(cat);
      fetch(`${API}/products/categorization/${cat}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setSugestoes((d.produtos || []).slice(0, 8));
          }
        })
        .catch(() => {});
    } catch (_) {}
  }, []);

  const carregarDadosLojaSobDemanda = useCallback(async (userId) => {
    if (!userId) return;
    setCarregandoLoja(true);
    setCarregandoNotifLoja(true);
    try {
      const [resStore, resNotif] = await Promise.all([
        fetch(`${API}/buyers/store/${userId}`),
        fetch(`${API}/products/notifications/${userId}`),
      ]);
      if (resStore.ok) {
        const dataStore = await resStore.json();
        if (dataStore.success) {
          const loja = dataStore.store || null;
          const prods = dataStore.products || [];
          setDadosLoja(loja);
          setProdutosLoja(prods);
          localStorage.setItem('buyer_dados_loja', JSON.stringify(loja));
          localStorage.setItem('buyer_produtos_loja', JSON.stringify(prods));
        } else {
          setDadosLoja(null);
          setProdutosLoja([]);
        }
      }
      if (resNotif.ok) {
        const dataNotif = await resNotif.json();
        if (dataNotif.success) {
          const lista = dataNotif.notificacoes || dataNotif.notificaçoes || [];
          setListaNotificacoesLoja(lista);
          setNotifLojaCarregadas(true);
          localStorage.setItem('buyer_notif_loja', JSON.stringify(lista));
          localStorage.setItem('buyer_notif_carregadas', 'true');
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados da loja sob demanda:', err);
    } finally {
      setCarregandoLoja(false);
      setCarregandoNotifLoja(false);
    }
  }, []);

  const carregarDadosTrabalhadorSobDemanda = useCallback(async (userId) => {
    if (!userId) return;
    setCarregandoTrabalhador(true);
    try {
      const res = await fetch(`${API}/workers/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.worker) {
          setDadosTrabalhador(data.worker);
          localStorage.setItem('buyer_dados_trabalhador', JSON.stringify(data.worker));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar perfil profissional:', err);
    } finally {
      setCarregandoTrabalhador(false);
    }
  }, []);

  const mudarSubAbaCompras = (aba) => {
    setSubAbaCompras(aba);
    if (typeof window !== 'undefined') {
      localStorage.setItem('buyer_sub_aba', JSON.stringify(aba));
    }
    const currentUserId = userProfile?.id || userAuth;
    if (aba === 'minhaLoja' && !notifLojaCarregadas && currentUserId) {
      carregarDadosLojaSobDemanda(currentUserId);
    }
    if (aba === 'meuPerfilTrabalhador' && currentUserId && userProfile?.worker_active) {
      carregarDadosTrabalhadorSobDemanda(currentUserId);
    }
  };

  const marcarNotificacoesLidas = async () => {
    const sellerId = dadosLoja?.id || userAuth;
    if (!sellerId) return;
    try {
      const res = await fetch(`${API}/products/notifications/${sellerId}/read`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        const atualizadas = listaNotificacoesLoja.map((n) => ({ ...n, read: true }));
        setListaNotificacoesLoja(atualizadas);
        localStorage.setItem('buyer_notif_loja', JSON.stringify(atualizadas));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const abrirDetalhes = (prod) => {
    setProdutoSelecionado(prod);
    setProdutoEditado({ ...prod });
    setModoEdicao(false);
    setFotoAtivaIndex(0);
    setNovasFotosFiles([]);
    setNovasFotosPreviews([]);
    setMostrarComentarios(false);
    setReviewsProduto([]);
    setReviewsCarregados(false);
    setCarregandoReviews(false);
  };

  const fecharModal = () => {
    setProdutoSelecionado(null);
    setModoEdicao(false);
    setNovasFotosFiles([]);
    setNovasFotosPreviews([]);
    setFotoAtivaIndex(0);
    setMostrarComentarios(false);
    setReviewsProduto([]);
    setReviewsCarregados(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const carregarComentarios = async () => {
    if (!produtoSelecionado?.id) return;
    if (mostrarComentarios) {
      setMostrarComentarios(false);
      return;
    }
    setMostrarComentarios(true);
    if (reviewsCarregados) return;
    setCarregandoReviews(true);
    try {
      const res = await fetch(`${API}/products/${produtoSelecionado.id}/reviews`);
      const data = await res.json();
      if (data.success) {
        setReviewsProduto(data.reviews || []);
      } else {
        setReviewsProduto([]);
      }
      setReviewsCarregados(true);
    } catch (e) {
      console.error(e);
      setReviewsProduto([]);
    } finally {
      setCarregandoReviews(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setProdutoEditado((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultipleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const jaTem = getFotosProduto(produtoSelecionado).length;
    const espaco = Math.max(0, 5 - jaTem - novasFotosFiles.length);
    const aceites = files.slice(0, espaco);
    if (aceites.length === 0) {
      alert('Máximo de 5 fotos por produto.');
      return;
    }
    setNovasFotosFiles((prev) => [...prev, ...aceites]);
    setNovasFotosPreviews((prev) => [...prev, ...aceites.map((f) => URL.createObjectURL(f))]);
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('productId', produtoSelecionado.id);
      formData.append('title', produtoEditado.title || '');
      formData.append('priceMin', produtoEditado.price_min || '');
      formData.append('priceMax', produtoEditado.price_max || '');
      formData.append('condition', produtoEditado.condition || 'novo');
      formData.append('description', produtoEditado.description || '');
      formData.append('categoria', produtoEditado.category || '');
      formData.append('subCategoria', produtoEditado.sub_category || '');
      novasFotosFiles.forEach((file) => {
        formData.append('fotosProduto', file);
      });
      const res = await fetch(`${API}/sellers/products/update`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('Produto atualizado com sucesso!');
        setModoEdicao(false);
        fecharModal();
        const currentUserId = userProfile?.id || userAuth;
        if (currentUserId) carregarDadosLojaSobDemanda(currentUserId);
      } else {
        alert('Erro ao atualizar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao atualizar o produto.');
    } finally {
      setCarregando(false);
    }
  };

  const handleApagarProduto = async (productId) => {
    if (!confirm('Tem certeza de que deseja apagar este produto da loja?')) return;
    try {
      const res = await fetch(`${API}/sellers/products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Produto apagado com sucesso!');
        fecharModal();
        const currentUserId = userProfile?.id || userAuth;
        if (currentUserId) carregarDadosLojaSobDemanda(currentUserId);
      } else {
        alert('Erro ao apagar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao apagar o produto.');
    }
  };

  if (authLoading) {
    return <div className="p-10 text-center">A carregar perfil...</div>;
  }

  const clienteInfo = userProfile || {};
  const totalNotificacoes = listaNotificacoesLoja.length;
  const totalNotificacoesNaoLidas = listaNotificacoesLoja.filter((n) => !n.read).length;
  const isWorker = clienteInfo?.is_worker === true;
  const workerActive = clienteInfo?.worker_active === true;

  return (
    <div className="buyer-home-container">
      <header className="cust-top-bar">
        <div className="cust-user-identity">
          <div className="cust-avatar-box">
            {clienteInfo.foto || clienteInfo.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clienteInfo.foto || clienteInfo.avatar_url} alt={clienteInfo.name} className="cust-avatar-img" />
            ) : (
              <BsPerson size={22} />
            )}
          </div>
          <div className="cust-identity-info">
            <h2>{clienteInfo.name || clienteInfo.full_name || 'Cliente'}</h2>
            <span className="cust-badge-loc">
              <BsCheckCircleFill size={11} color="#38bdf8" /> {clienteInfo.bairro || 'Sem bairro definido'}
            </span>
          </div>
        </div>
        <div className="cust-top-actions buyer-top-actions-wrapper">
          <span className="cust-status-pill">Conta Ativa</span>
          {dadosLoja && <span className="cust-status-pill buyer-pill-vendedor">Vendedor Ativo</span>}
          {isWorker && workerActive && <span className="cust-status-pill buyer-pill-trabalhador">Trabalhador Ativo</span>}
          {isWorker && !workerActive && (
            <span className="cust-status-pill" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              Conta Bloqueada
            </span>
          )}
        </div>
      </header>

      {sugestoes.length > 0 && (
        <div className="buyer-suggestions-section">
          <div className="buyer-suggestions-header">
            <h3 className="buyer-suggestions-title">Continuar a explorar</h3>
            <button type="button" onClick={() => router.push(`/public/${ultimaCat}`)} className="buyer-category-btn">
              Ver categoria
            </button>
          </div>
          <div className="buyer-suggestions-scroll">
            {sugestoes.map((p) => {
              const fotos = getFotosProduto(p);
              const slug = SLUG_CATEGORIA[p.category] || ultimaCat || 'it';
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    try {
                      sessionStorage.setItem(`produto_cache_${p.id}`, JSON.stringify(p));
                    } catch (_) {}
                    router.push(`/public/${slug}/${p.id}`);
                  }}
                  className="buyer-suggestion-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotos[0] || 'https://via.placeholder.com/140'} alt={p.title} className="buyer-suggestion-img" />
                  <div className="buyer-suggestion-info">
                    <p className="buyer-suggestion-name">{p.title}</p>
                    <p className="buyer-suggestion-price">
                      {p.price_min ? `${Number(p.price_min).toLocaleString()} XAF` : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="secao-compras">
        <div className="sub-abas-compras buyer-sub-abas">
          <button
            type="button"
            className={subAbaCompras === 'favoritos' ? 'sub-btn ativo' : 'sub-btn'}
            onClick={() => mudarSubAbaCompras('favoritos')}
          >
            <FiHeart size={14} /> Favoritos ({favoritos.length})
          </button>
          <button
            type="button"
            className={subAbaCompras === 'historico' ? 'sub-btn ativo' : 'sub-btn'}
            onClick={() => mudarSubAbaCompras('historico')}
          >
            <FiCheckCircle size={14} /> Comprados ({comprados.length})
          </button>
          {clienteInfo.is_seller && (
            <button
              type="button"
              className={`${subAbaCompras === 'minhaLoja' ? 'sub-btn ativo' : 'sub-btn'} ${
                subAbaCompras === 'minhaLoja' ? 'buyer-btn-loja-active' : ''
              }`}
              onClick={() => mudarSubAbaCompras('minhaLoja')}
            >
              <FiShoppingBag size={14} /> Minha Loja {dadosLoja?.name ? `(${dadosLoja.name})` : ''}
              {notifLojaCarregadas && totalNotificacoesNaoLidas > 0 && (
                <span className="buyer-badge-notif">{totalNotificacoesNaoLidas}</span>
              )}
            </button>
          )}
          {isWorker && (
            <button
              type="button"
              className={subAbaCompras === 'meuPerfilTrabalhador' ? 'sub-btn ativo' : 'sub-btn'}
              onClick={() => mudarSubAbaCompras('meuPerfilTrabalhador')}
            >
              <FiBriefcase size={14} /> Meu Perfil Profissional
            </button>
          )}
        </div>

        {subAbaCompras === 'favoritos' && (
          <div className="grid-produtos">
            {favoritos.length === 0 ? (
              <p className="vazio-texto">Não tem produtos favoritos.</p>
            ) : (
              favoritos.map((prod) => {
                const item = prod.products || prod;
                const fotos = getFotosProduto(item);
                const slug = SLUG_CATEGORIA[item.category] || ultimaCat || 'it';
                return (
                  <div
                    key={prod.id || item.id}
                    className="produto-card-investor"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(`produto_cache_${item.id}`, JSON.stringify(item));
                      } catch (_) {}
                      router.push(`/public/${slug}/${item.id}`);
                    }}
                  >
                    <div className="img-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fotos[0] || 'https://via.placeholder.com/150'} alt={item.title || item.nome} />
                    </div>
                    <div className="produto-info">
                      <h3>{item.title || item.nome}</h3>
                      <span className="preco">{item.price_min || item.preco} XAF</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {subAbaCompras === 'historico' && (
          <div className="grid-produtos">
            {comprados.length === 0 ? (
              <p className="vazio-texto">Ainda não tem compras registadas.</p>
            ) : (
              comprados.map((prod) => {
                const item = prod.products || prod;
                const fotos = getFotosProduto(item);
                return (
                  <div key={prod.id || item.id} className="produto-card-investor comprado-card" onClick={() => abrirDetalhes(item)}>
                    <div className="img-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fotos[0] || 'https://via.placeholder.com/150'} alt={item.title || item.nome} />
                      <span className="badge-comprado">Validado ✓</span>
                    </div>
                    <div className="produto-info">
                      <h3>{item.title || item.nome}</h3>
                      <span className="preco">{item.price_min || item.preco} XAF</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {subAbaCompras === 'minhaLoja' && (
          <div className="buyer-store-wrapper">
            {carregandoLoja ? (
              <div className="conta-card-investor text-center py-8">
                <p className="buyer-notif-text-gray">A carregar dados da sua loja...</p>
              </div>
            ) : !dadosLoja ? (
              <div className="conta-card-investor text-center py-8">
                <p className="buyer-notif-text-gray">Ainda não tem uma loja configurada.</p>
                <button type="button" onClick={() => router.push('/buyers/whatsell/produtos')} className="btn-salvar mt-4">
                  <FiPlus size={16} /> Criar Loja / Adicionar Produto
                </button>
              </div>
            ) : (
              <>
                <div className="conta-card-investor">
                  <div className="buyer-store-card-header">
                    <div className="buyer-store-header-left">
                      <FiBell size={16} color="#ff7900" />
                      <h3>Notificações e Interações</h3>
                      {notifLojaCarregadas && <span className="buyer-notif-badge-count">{totalNotificacoes}</span>}
                    </div>
                    {notifLojaCarregadas && totalNotificacoesNaoLidas > 0 && (
                      <button type="button" onClick={marcarNotificacoesLidas} className="buyer-btn-marcar-lidas">
                        Marcar como lidas
                      </button>
                    )}
                  </div>
                  <div className="buyer-notif-divider">
                    {carregandoNotifLoja ? (
                      <p className="buyer-notif-text-gray">A carregar notificações...</p>
                    ) : !notifLojaCarregadas ? (
                      <p className="buyer-notif-text-gray">A preparar notificações...</p>
                    ) : listaNotificacoesLoja.length === 0 ? (
                      <p className="buyer-notif-text-gray">Ainda sem gostos, comentários ou cliques WhatsApp.</p>
                    ) : (
                      <ul className="buyer-notif-list">
                        {listaNotificacoesLoja.map((n) => (
                          <li key={n.id} className={`buyer-notif-item ${n.read ? 'read' : 'unread'}`}>
                            {n.type === 'whatsapp' ? (
                              <BsWhatsapp size={14} color="#25d366" />
                            ) : n.type === 'review' ? (
                              <FiStar size={14} color="#f59e0b" />
                            ) : (
                              <FiHeart size={14} color="#ef4444" />
                            )}
                            <span className="buyer-notif-content-span">
                              {n.message} <br />
                              <small className="buyer-notif-small-date">
                                {n.created_at ? new Date(n.created_at).toLocaleString('pt-PT') : ''}
                              </small>
                            </span>
                            {!n.read && <span title="Não lida" className="buyer-notif-dot-unread" />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="conta-card-investor">
                  <div className="buyer-store-info-box">
                    <div className="buyer-store-avatar">
                      {dadosLoja.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dadosLoja.image_url} alt={dadosLoja.name} className="buyer-store-avatar-img" />
                      ) : (
                        <FiShoppingBag size={28} color="#ff7900" />
                      )}
                    </div>
                    <div className="buyer-store-details">
                      <span className="badge-investidor">{dadosLoja.category || 'Loja Oficial'}</span>
                      <h2 className="buyer-store-title-h2">{dadosLoja.name}</h2>
                      <p className="buyer-store-meta-p">
                        <span><FiMapPin size={12} /> {dadosLoja.bairro}</span>
                        <span><FiPhone size={12} /> {dadosLoja.phone}</span>
                      </p>
                    </div>
                    <button type="button" onClick={() => router.push('/buyers/whatsell/produtos')} className="btn-salvar buyer-btn-novo-produto">
                      <FiPlus size={16} /> Novo Produto
                    </button>
                  </div>
                </div>

                <h3 className="buyer-products-header">
                  <FiPackage size={16} color="#ff7900" /> Produtos ({produtosLoja?.length || 0})
                </h3>

                {!produtosLoja || produtosLoja.length === 0 ? (
                  <div className="conta-card-investor text-center">
                    <p className="buyer-notif-text-gray">Sem produtos na loja.</p>
                    <button type="button" onClick={() => router.push('/buyers/whatsell/produtos')} className="btn-salvar">
                      <FiPlus size={16} /> Adicionar produto
                    </button>
                  </div>
                ) : (
                  <div className="buyer-products-grid">
                    {produtosLoja.map((prod) => {
                      const fotos = getFotosProduto(prod);
                      return (
                        <div key={prod.id} onClick={() => abrirDetalhes(prod)} className="conta-card-investor buyer-product-card-box">
                          <div className="buyer-product-img-wrap">
                            {fotos[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={fotos[0]} alt={prod.title} className="buyer-product-img-el" />
                            ) : (
                              <div className="buyer-product-empty-photo">Sem Foto</div>
                            )}
                          </div>
                          <h4 className="buyer-product-title-h4">{prod.title}</h4>
                          <div className="buyer-product-footer-row">
                            <span className="buyer-product-price-span">
                              {prod.price_min ? Number(prod.price_min).toLocaleString() : 0} XAF
                            </span>
                            <span className="buyer-product-cond-span">{prod.condition || 'Novo'}</span>
                          </div>
                          <div className="buyer-product-metrics-row">
                            <span><FiHeart size={12} /> {prod.likes_count || 0}</span>
                            <span><BsWhatsapp size={12} /> {prod.whatsapp_clicks || 0}</span>
                            <span><FiMessageCircle size={12} /> {prod.views_count || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {subAbaCompras === 'meuPerfilTrabalhador' && isWorker && (
          <div className="buyer-store-wrapper">
            {!workerActive ? (
              <div className="conta-card-investor text-center py-10" style={{ border: '1px solid #fed7aa', backgroundColor: '#fffbeb' }}>
                <div className="flex justify-center mb-3">
                  <FiAlertTriangle size={42} color="#d97706" />
                </div>
                <h3 className="text-xl font-bold text-amber-800 mb-2">Conta de Trabalhador Bloqueada</h3>
                <p className="text-gray-700 max-w-md mx-auto mb-6">
                  A sua conta de prestador de serviços/trabalhador encontra-se atualmente inativa ou bloqueada. Para resolver esta situação, contacte o{' '}
                  <strong>Feira Bandim Atendimento</strong> no número <strong>+245 99000000</strong> ou fale com o assistente IA para lhe ajudar.
                </p>
                <button
                  type="button"
                  onClick={() => window.open('https://wa.me/245990000000?text=Olá,%20gostaria%20de%20verificar%20o%20estado%20da%20minha%20conta%20de%20trabalhador%20no%20Mercado%20Bissau', '_blank')}
                  className="btn-salvar inline-flex items-center gap-2"
                >
                  <BsWhatsapp size={16} /> Contactar Suporte via WhatsApp
                </button>
              </div>
            ) : (
              <div className="conta-card-investor">
                {carregandoTrabalhador ? (
                  <p className="text-center py-6 text-gray-500">A carregar detalhes do perfil profissional...</p>
                ) : (
                  <>
                    <span className="badge-investidor">
                      {dadosTrabalhador?.profissao || clienteInfo.profession || 'Profissional'}
                    </span>
                    <h2 className="buyer-store-title-h2">
                      {dadosTrabalhador?.nome || clienteInfo.name || clienteInfo.full_name}
                    </h2>
                    <p className="buyer-modal-desc-p">
                      <strong>Zona:</strong> {dadosTrabalhador?.zona || clienteInfo.bairro || 'Bissau'}
                    </p>
                    <p className="buyer-modal-desc-p">
                      <strong>Categoria:</strong> {dadosTrabalhador?.categoria || 'Prestação de Serviços'}
                    </p>
                    <FullServicesComponent userId={clienteInfo.id || clienteInfo.user_id} initialProfileData={dadosTrabalhador} />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {produtoSelecionado && (
        <div className="buyer-modal-overlay">
          <div className="buyer-modal-content">
            <button type="button" onClick={fecharModal} className="buyer-modal-close-btn">
              <FiX size={20} />
            </button>
            {(() => {
              const fotosAtuais = modoEdicao ? [...getFotosProduto(produtoSelecionado), ...novasFotosPreviews] : getFotosProduto(produtoSelecionado);
              return (
                <div>
                  <div className="buyer-modal-img-container">
                    {fotosAtuais[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotosAtuais[fotoAtivaIndex] || fotosAtuais[0]} alt="" className="buyer-modal-img-el" />
                    ) : (
                      <div className="buyer-product-empty-photo">Sem Foto</div>
                    )}
                    {fotosAtuais.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setFotoAtivaIndex((p) => (p - 1 + fotosAtuais.length) % fotosAtuais.length)}
                          className="buyer-modal-arrow-left"
                        >
                          <FiChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFotoAtivaIndex((p) => (p + 1) % fotosAtuais.length)}
                          className="buyer-modal-arrow-right"
                        >
                          <FiChevronRight size={16} />
                        </button>
                      </>
                    )}
                  </div>
                  {modoEdicao && (
                    <div className="mt-2">
                      <input type="file" ref={fileInputRef} multiple accept="image/*" hidden onChange={handleMultipleImagesChange} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="buyer-modal-file-btn">
                        <FiCamera /> Adicionar fotos ({novasFotosPreviews.length})
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {!modoEdicao ? (
              <>
                <h2 className="buyer-modal-title-h2">{produtoSelecionado.title}</h2>
                <p className="buyer-modal-price-p">
                  {produtoSelecionado.price_min ? Number(produtoSelecionado.price_min).toLocaleString() : 0} XAF{' '}
                  {produtoSelecionado.price_max ? ` – ${Number(produtoSelecionado.price_max).toLocaleString()} XAF` : ''}
                </p>
                <p className="buyer-modal-desc-p">{produtoSelecionado.description || 'Sem descrição.'}</p>
                <button type="button" onClick={carregarComentarios} className="buyer-modal-reviews-btn">
                  <FiStar size={16} /> {mostrarComentarios ? 'Ocultar comentários' : 'Ver comentários / avaliações'}
                </button>
                {mostrarComentarios && (
                  <div className="buyer-modal-reviews-box">
                    {carregandoReviews ? (
                      <p className="buyer-notif-text-gray">A carregar comentários...</p>
                    ) : reviewsProduto.length === 0 ? (
                      <p className="buyer-notif-text-gray">Ainda não há comentários neste produto.</p>
                    ) : (
                      <div className="buyer-notif-list flex flex-col gap-2">
                        {reviewsProduto.map((r) => (
                          <div key={r.id} className="buyer-review-card-item">
                            <div className="buyer-review-header-row">
                              <strong className="buyer-review-author">{r.author_name || r.autor || 'Cliente'}</strong>
                              <span className="buyer-review-stars">{'★'.repeat(Number(r.rating || r.nota || 5))}</span>
                            </div>
                            <p className="buyer-review-comment-p">{r.comment || r.comentario}</p>
                            {(r.created_at || r.data) && (
                              <small className="buyer-review-date-small">
                                {r.created_at ? new Date(r.created_at).toLocaleDateString('pt-PT') : r.data}
                              </small>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="buyer-modal-actions-grid">
                  <button type="button" onClick={() => setModoEdicao(true)} className="buyer-btn-editar-modal">
                    <FiEdit3 /> Editar
                  </button>
                  <button type="button" onClick={() => handleApagarProduto(produtoSelecionado.id)} className="buyer-btn-apagar-modal">
                    <FiTrash2 /> Apagar
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSalvarEdicao} className="buyer-edit-form">
                <input name="title" value={produtoEditado.title || ''} onChange={handleEditChange} required className="buyer-form-input" />
                <div className="buyer-modal-actions-grid">
                  <input type="number" name="price_min" value={produtoEditado.price_min || ''} onChange={handleEditChange} className="buyer-form-input" />
                  <input type="number" name="price_max" value={produtoEditado.price_max || ''} onChange={handleEditChange} className="buyer-form-input" />
                </div>
                <textarea name="description" value={produtoEditado.description || ''} onChange={handleEditChange} rows={3} className="buyer-form-textarea" />
                <div className="buyer-modal-actions-grid">
                  <button type="button" onClick={() => setModoEdicao(false)} className="buyer-btn-editar-modal">
                    Cancelar
                  </button>
                  <button type="submit" disabled={carregando} className="btn-salvar">
                    <FiCheck /> {carregando ? 'A guardar...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}