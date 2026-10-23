'use client';

import { useState, useEffect } from "react";
import { BsPersonBadge, BsSearch, BsArrowRight, BsTrash, BsFileEarmarkPdf, BsGeoAlt, BsTelephone, BsBriefcase, BsImages, BsArrowLeft } from "react-icons/bs";

export default function TrabalhadoresDashboardPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Controlos de camadas e expansão
  const [expandedWorkerId, setExpandedWorkerId] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' ou 'samples'
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // URL base da tua API (ajusta se necessário)
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/workers`); // Endereço correspondente à Rota GET / do teu backend
      const data = await res.json();
      if (data.success) {
        setWorkers(data.workers || []);
      } else {
        setError("Erro ao carregar lista de trabalhadores.");
      }
    } catch (err) {
      setError("Falha de ligação ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  // Quando clica no trabalhador, ajusta para baixo e busca detalhes completos (incluindo CV e work samples)
  async function handleToggleExpand(workerId) {
    if (expandedWorkerId === workerId) {
      setExpandedWorkerId(null);
      setSelectedWorkerDetails(null);
      setActiveTab('details');
      return;
    }

    setExpandedWorkerId(workerId);
    setActiveTab('details');
    setLoadingDetails(true);

    try {
      const res = await fetch(`${API}/workers/${workerId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedWorkerDetails(data.worker);
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
    } finally {
      setLoadingDetails(false);
    }
  }

  const filteredWorkers = workers.filter((w) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.nome?.toLowerCase().includes(q) ||
      w.profissao?.toLowerCase().includes(q) ||
      w.zona?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1f2937' }}>
      
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#111827' }}>Gestão de Trabalhadores</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Consulte prestadores, visualize perfis detalhados, CVs e amostras de trabalho.</p>
        </div>
        <button 
          onClick={fetchWorkers}
          style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
        >
          Atualizar Lista
        </button>
      </div>

      {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {/* Barra de Pesquisa */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <BsSearch size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder="Filtrar por nome, profissão ou bairro..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 12px 12px 42px', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
        />
      </div>

      {/* Lista de Trabalhadores */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>A carregar trabalhadores...</div>
      ) : filteredWorkers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, color: '#6b7280' }}>Nenhum trabalhador registado encontrado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredWorkers.map((w) => {
            const isExpanded = expandedWorkerId === w.id;

            return (
              <div 
                key={w.id} 
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  transition: 'all 0.3s ease',
                  boxShadow: isExpanded ? '0 10px 25px -5px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* 1. DADO DE CRIAÇÃO DA CONTA: Nome, Phone, Title, Category e Bairro (Design Moderno) */}
                <div 
                  onClick={() => handleToggleExpand(w.id)}
                  style={{ 
                    padding: '18px 24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    cursor: 'pointer',
                    background: isExpanded ? '#f8fafc' : '#ffffff',
                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img 
                      src={w.foto} 
                      alt={w.nome} 
                      style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} 
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{w.nome}</h4>
                        <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', textTransform: 'uppercase' }}>
                          {w.categoria}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>{w.profissao}</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BsGeoAlt size={12} /> {w.zona}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BsTelephone size={12} /> {w.telefone}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#3b82f6' }}>
                      {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </span>
                    <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                      ▼
                    </div>
                  </div>
                </div>

                {/* 2. CAMADA EXPANDIDA: Title, Category, Bairro, Address References, Description, CV -> e botão para Work Samples */}
                {isExpanded && (
                  <div style={{ padding: '24px', background: '#ffffff', animation: 'fadeIn 0.3s ease-in-out' }}>
                    {loadingDetails ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>A carregar dados avançados...</div>
                    ) : selectedWorkerDetails ? (
                      <div>
                        {/* Seletor de Camadas Internas (Detalhes vs Work Samples) */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                          <button 
                            onClick={() => setActiveTab('details')}
                            style={{ 
                              padding: '8px 16px', 
                              background: activeTab === 'details' ? '#0f172a' : '#f1f5f9', 
                              color: activeTab === 'details' ? '#fff' : '#475569', 
                              borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' 
                            }}
                          >
                            Informações & CV
                          </button>
                          <button 
                            onClick={() => setActiveTab('samples')}
                            style={{ 
                              padding: '8px 16px', 
                              background: activeTab === 'samples' ? '#0f172a' : '#f1f5f9', 
                              color: activeTab === 'samples' ? '#fff' : '#475569', 
                              borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <BsImages size={14} /> Amostras de Trabalho ({selectedWorkerDetails.projetosFeitos?.length || 0})
                          </button>
                        </div>

                        {/* CAMADA 1: Detalhes, Morada, Descrição e CV */}
                        {activeTab === 'details' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Título Profissional</span>
                                <p style={{ margin: '2px 0 0 0', fontWeight: '600', color: '#1e293b' }}>{selectedWorkerDetails.profissao}</p>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Categoria & Bairro</span>
                                <p style={{ margin: '2px 0 0 0', fontWeight: '600', color: '#1e293b' }}>{selectedWorkerDetails.categoria} • {selectedWorkerDetails.zona}</p>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Referências de Morada</span>
                                <p style={{ margin: '2px 0 0 0', fontWeight: '600', color: '#1e293b' }}>{selectedWorkerDetails.enderecoCompleto}</p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Descrição / Experiência</span>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>
                                  {selectedWorkerDetails.experiencia || selectedWorkerDetails.iaOpinion}
                                </p>
                              </div>

                              {/* Secção do CV */}
                              <div style={{ marginTop: '8px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <BsFileEarmarkPdf size={24} style={{ color: '#ef4444' }} />
                                  <div>
                                    <strong style={{ fontSize: '0.85rem', display: 'block', color: '#0f172a' }}>Curriculum Vitae (CV)</strong>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Documento oficial do trabalhador</span>
                                  </div>
                                </div>
                                {selectedWorkerDetails.cvUrl ? (
                                  <a 
                                    href={selectedWorkerDetails.cvUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', textDecoration: 'none' }}
                                  >
                                    Ver CV
                                  </a>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>Não enviado</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* CAMADA 2: Work Samples com Design Bonito em Grelha */
                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 16px 0', color: '#0f172a' }}>Portefólio de Trabalhos Realizados</h4>
                            {selectedWorkerDetails.projetosFeitos?.length === 0 ? (
                              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Este trabalhador ainda não registou amostras de trabalho.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                                {selectedWorkerDetails.projetosFeitos.map((sample) => (
                                  <div key={sample.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                    <img 
                                      src={sample.imagem || '/card/art (0).jpg'} 
                                      alt={sample.titulo} 
                                      style={{ width: '100%', height: '140px', objectFit: 'cover' }} 
                                    />
                                    <div style={{ padding: '12px' }}>
                                      <h5 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b' }}>{sample.titulo}</h5>
                                      <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>{sample.detalhes}</p>
                                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#059669' }}>{sample.preco}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ textAlign: 'center', color: '#ef4444' }}>Não foi possível carregar os detalhes do profissional.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}