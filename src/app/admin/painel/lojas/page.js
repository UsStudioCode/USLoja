'use client';

import { useState, useEffect } from "react";
import { BsShop, BsSearch, BsArrowRight, BsTrash, BsStarFill, BsHeartFill, BsWhatsapp, BsEye, BsArrowLeft, BsTelephone } from "react-icons/bs";
import { useAdminDashboard } from "../../../../components/admincontext";

export default function LojasDashboardPage() {
  const { error: ctxError, loadProfiles, profiles, API } = useAdminDashboard();
  const [localError, setLocalError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fullStore, changeStore]=useState('/');
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  function authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  const stores = (profiles || []).filter((p) => p.is_seller || p.seller_active || p.store_name);

  async function handleViewProducts(store) {
    setSelectedStore(store);
    setSelectedProduct(null);
    setProductDetails(null);
    setLoadingProducts(true);
    setLocalError("");
    try {
      const targetUserId = store.user_id || store.id;
      const res = await fetch(`${API}/buyers/store/${targetUserId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.comment || "Erro ao buscar produtos da loja");
      setStoreProducts(data.products || []);
    } catch (err) {
      setLocalError(err.message || "Falha ao carregar produtos");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleViewProductDetails(product) {
    setSelectedProduct(product);
    setLoadingDetails(true);
    setLocalError("");
    try {
      const res = await fetch(`${API}/buyers/product/${product.id}/metrics`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.comment || "Erro ao buscar métricas do produto");
      setProductDetails(data);
      changeStore(data.store);
    } catch (err) {
      setLocalError(err.message || "Falha ao carregar detalhes do produto");
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleDeleteStore(storeId, userId) {
    const ok = window.confirm("Tens a certeza que queres apagar esta loja e todos os seus produtos?");
    if (!ok) return;
    try {
      const targetUserId = userId || storeId;
      const res = await fetch(`${API}/buyers/store/${targetUserId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.comment || "Erro ao apagar loja");
      loadProfiles(true);
      if (selectedStore?.id === storeId || selectedStore?.user_id === userId) {
        setSelectedStore(null);
        setSelectedProduct(null);
      }
    } catch (err) {
      setLocalError(err.message || "Erro ao apagar loja");
    }
  }

  const filteredStores = stores.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = s.store_name || s.name || "";
    const bairro = s.bairro || "";
    return name.toLowerCase().includes(q) || bairro.toLowerCase().includes(q);
  });

  const erro = localError || ctxError;

  return (
    <div className="ld-container">
      <div className="ld-header">
        <div>
          <h2>Gestão de Lojas</h2>
          <p>Explore lojas existentes, analise produtos, interações e comentários dos utilizadores.</p>
        </div>
        <button type="button" className="ld-btn ld-btn-ghost" onClick={() => loadProfiles(true)}>
          Atualizar Lojas
        </button>
      </div>

      {erro && <div className="ld-alert-error">{erro}</div>}

      <div className="ld-toolbar">
        <div className="ld-search-wrap">
          <BsSearch size={15} />
          <input
            type="search"
            className="ld-search-input"
            placeholder="Filtrar lojas por nome ou bairro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {profiles === null ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--aa-muted)' }}>A carregar lojas do sistema...</div>
      ) : stores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--aa-border)', borderRadius: '16px' }}>
          <BsShop size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p style={{ margin: 0, color: 'var(--aa-muted)', fontSize: '0.9rem' }}>Nenhuma loja encontrada nas contas registadas.</p>
        </div>
      ) : !selectedStore ? (
        <div className="ld-stores-grid">
          {filteredStores.map((s) => {
            const storeId = s.id || s.user_id;
            const storeName = s.store_name || s.name || "Loja sem nome";
            
            // CORREÇÃO AQUI: Verificamos várias propriedades possíveis para a imagem da loja
            const storeImage = s.store_image || s.image_url || s.logo_url || s.avatar_url || "/card/art (0).jpg";
            
            const storeBairro = s.bairro || "Bissau";
            const storePhone = s.phone || "—";
            const userId = s.user_id || s.id;

            return (
              <div key={storeId} className="ld-store-card">
                <div className="ld-store-banner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={storeImage} alt={storeName} />
                  <span className="ld-store-badge">{storeBairro}</span>
                </div>
                <div className="ld-store-body">
                  <div>
                    <h3 className="ld-store-title">{storeName}</h3>
                    <p className="ld-store-id">ID: {storeId.substring(0, 10)}...</p>
                    <p className="ld-store-phone">
                      <BsTelephone size={13} style={{ color: '#10b981' }} /> {storePhone}
                    </p>
                  </div>
                  <div className="ld-store-actions">
                    <button type="button" className="ld-btn ld-btn-primary" onClick={() => handleViewProducts(s)}>
                      Ver Produtos <BsArrowRight size={13} />
                    </button>
                    <button type="button" className="ld-btn ld-btn-danger" onClick={() => handleDeleteStore(storeId, userId)} title="Apagar Loja">
                      <BsTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ld-detail-panel">
          <div className="ld-detail-head">
            <div>
              <button
                type="button"
                className="ld-btn ld-btn-ghost"
                style={{ height: '32px', fontSize: '0.78rem', marginBottom: '8px', padding: '0 10px' }}
                onClick={() => { setSelectedStore(null); setSelectedProduct(null); }}
              >
                <BsArrowLeft size={12} /> Voltar para Lojas
              </button>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--aa-text)' }}>
                Produtos de: {selectedStore.store_name || selectedStore.name}
              </h3>
            </div>
          </div>

          <div className="ld-grid-split">
            <div>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--aa-muted)' }}>A carregar produtos...</div>
              ) : storeProducts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--aa-muted)', padding: '30px' }}>Esta loja não tem produtos registados.</p>
              ) : (
                <div className="ld-products-list">
                  {storeProducts.map((p) => (
                    <div
                      key={p.id}
                      className={`ld-product-item ${selectedProduct?.id === p.id ? 'active' : ''}`}
                      onClick={() => handleViewProductDetails(p)}
                    >
                      <div className="ld-product-info">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image_url || p.image_urls?.[0] || "/card/art (0).jpg"} alt="" />
                        <div>
                          <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--aa-text)' }}>{p.title}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--aa-primary-2)', fontWeight: '600' }}>{p.price_min || 0} XOF</span>
                        </div>
                      </div>
                      <BsArrowRight size={14} style={{ opacity: 0.5 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="ld-metrics-card">
                <h4 style={{ fontSize: '0.95rem', margin: '0 0 14px 0', color: 'var(--aa-text)', borderBottom: '1px solid var(--aa-border)', paddingBottom: '8px' }}>
                  Métricas: {selectedProduct.title}
                </h4>

                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--aa-muted)' }}>A carregar métricas...</div>
                ) : (
                  <div>
                    <div className="ld-metrics-grid">
                      <div className="ld-metric-box">
                        <BsHeartFill size={15} style={{ color: '#ef4444', marginBottom: '4px' }} />
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--aa-text)' }}>{productDetails?.likesCount || 0}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--aa-muted)' }}>Gostos</div>
                      </div>
                      <div className="ld-metric-box">
                        <BsWhatsapp size={15} style={{ color: '#10b981', marginBottom: '4px' }} />
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--aa-text)' }}>{productDetails?.whatsappClicksCount || 0}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--aa-muted)' }}>WhatsApp</div>
                      </div>
                      <div className="ld-metric-box">
                        <BsEye size={15} style={{ color: '#3b82f6', marginBottom: '4px' }} />
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--aa-text)' }}>{productDetails?.viewsCount || 0}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--aa-muted)' }}>Vistas</div>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '0.82rem', margin: '0 0 8px 0', color: 'var(--aa-muted)', fontWeight: '700' }}>Comentários & Reviews</h5>
                    <div className="ld-reviews-list">
                      {productDetails?.reviews?.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--aa-muted)', textAlign: 'center', padding: '16px', margin: 0 }}>Sem comentários ou reviews.</p>
                      ) : (
                        productDetails?.reviews?.map((rev) => (
                          <div key={rev.id} className="ld-review-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                                <BsStarFill size={11} /> {rev.rating}★
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--aa-muted)' }}>{new Date(rev.created_at).toLocaleDateString()}</span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--aa-text)', lineHeight: '1.4' }}>{rev.comment || "Sem texto"}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}