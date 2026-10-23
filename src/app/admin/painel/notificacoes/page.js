'use client';

import { useState, useEffect } from "react";
import { BsStarFill, BsEyeFill, BsChatSquareTextFill, BsInfoCircle } from "react-icons/bs";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function NotificacoesDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    userReviews: [],
    viewsPieData: [],
    allReviews: []
  });

  const [selectedReviewDetail, setSelectedReviewDetail] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchPageData();
  }, []);

  async function fetchPageData() {
    setLoading(true);
    setError("");
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`${API}/admins/painel/notifications/interactive-page`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      
      const json = await res.json();
      
      if (json.success && json.data) {
        const payload = {
          userReviews: json.data.userReviews || [],
          viewsPieData: json.data.viewsPieData || [],
          allReviews: json.data.allReviews || []
        };
        
        setData(payload);
        
        if (payload.allReviews.length > 0) {
          setSelectedReviewDetail(payload.allReviews[0]);
        }
      } else {
        setError(json.comment || "Erro ao carregar dados do servidor.");
      }
    } catch (err) {
      setError("Falha de ligação ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  const userReviewsList = data.userReviews || [];
  const viewsPieList = data.viewsPieData || [];
  const allReviewsList = data.allReviews || [];

  return (
    <div className='container'>
      
      {/* Cabeçalho */}
      <div className='header'>
        <div>
          <h2 className='title'>Notificações & Métricas de Atividade</h2>
          <p className='subtitle'>Análise de comentários (reviews) e visualizações (views) com painel interativo.</p>
        </div>
        <button onClick={fetchPageData} className='btnUpdate'>
          Atualizar Dados
        </button>
      </div>

      {error && <div className='errorBanner'>{error}</div>}

      {loading ? (
        <div className='loadingState'>A carregar dados do painel...</div>
      ) : (
        <div className='layoutGroup'>
          
          {/* SECÇÃO DE CIMA: Lado Esquerdo (Comentários Recentes) | Lado Direito (Recharts PieChart) */}
          <div className='gridTwo'>
            
            {/* Lado esquerdo: Comentários Recentes */}
            <div className='card'>
              <div className='cardHeader'>
                <BsChatSquareTextFill size={18} color="#f59e0b" />
                <h3 className='cardTitle'>Comentários Recentes (Reviews)</h3>
              </div>

              {userReviewsList.length === 0 ? (
                <p className='emptyText'>Sem comentários registados.</p>
              ) : (
                <div className='recentReviewsList'>
                  {userReviewsList.slice(0, 5).map((rev) => (
                    <div key={rev.id} className='recentReviewCard'>
                      <div className='recentReviewHeader'>
                        <span className='ratingTag'>
                          <BsStarFill size={12} /> {rev.rating}★ — {rev.products?.title || 'Produto'}
                        </span>
                        <span className='dateTag'>{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className='recentCommentText'>&quot;{rev.comment || 'Sem comentário'}&quot;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lado direito: Gráfico Recharts de Views */}
            <div className={`$'card' $'cardFlexColumn'`}>
              <div>
                <div className='cardHeader'>
                  <BsEyeFill size={18} color="#3b82f6" />
                  <h3 className='cardTitle'>Distribuição de Visualizações (Views)</h3>
                </div>

                {viewsPieList.length === 0 ? (
                  <p className='emptyText'>Sem dados de visualizações (views) registadas.</p>
                ) : (
                  <div className='chartContainer'>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={viewsPieList}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={30}
                          paddingAngle={4}
                          label
                        >
                          {viewsPieList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* SECÇÃO DE BAIXO: Todos os comentários + Painel Detalhado ao Clicar */}
          <div className='card'>
            <div className='cardHeader'>
              <BsInfoCircle size={18} color="#6366f1" />
              <h3 className='cardTitle'>Lista Completa de Comentários (Clica num para ver os detalhes)</h3>
            </div>

            {allReviewsList.length === 0 ? (
              <p className='emptyText'>Nenhum comentário encontrado na base de dados.</p>
            ) : (
              <div className='reviewsGrid'>
                
                {/* Lista rolável de comentários */}
                <div className='allReviewsScrollList'>
                  {allReviewsList.map((rev) => {
                    const isSelected = selectedReviewDetail?.id === rev.id;
                    return (
                      <div 
                        key={rev.id} 
                        onClick={() => setSelectedReviewDetail(rev)}
                        className={`$'interactiveReviewCard' ${isSelected ?'selectedReviewCard': ''}`}
                      >
                        <div className='reviewItemHeader'>
                          <span className='productTitle'>
                            <span className='starHighlight'>{rev.rating}★</span> {rev.products?.title || 'Produto Indisponível'}
                          </span>
                          <span className='dateTag'>{new Date(rev.created_at).toLocaleString()}</span>
                        </div>
                        <p className='commentPreview'>&quot;{rev.comment || 'Sem texto'}&quot;</p>
                      </div>
                    );
                  })}
                </div>

                {/* Painel lateral de detalhes */}
                <div className='detailPanel'>
                  <div>
                    <span className='panelTag'>Informação Detalhada do Comentário</span>

                    {selectedReviewDetail ? (
                      <div className='panelDetailsGroup'>
                        <div>
                          <span className='fieldLabel'>Produto Avaliado:</span>
                          <span className='fieldValueLarge'>{selectedReviewDetail.products?.title || '—'}</span>
                        </div>
                        <div>
                          <span className='fieldLabel'>Cliente / Utilizador:</span>
                          <span className='fieldValue'>{selectedReviewDetail.profiles?.full_name || selectedReviewDetail.profiles?.nome || 'Utilizador Anónimo'}</span>
                        </div>
                        <div>
                          <span className='fieldLabel'>Classificação:</span>
                          <span className='ratingValue'>{selectedReviewDetail.rating} Estrelas</span>
                        </div>
                        <div>
                          <span className='fieldLabel'>Comentário Completo:</span>
                          <p className='commentBox'>
                            &quot;{selectedReviewDetail.comment || 'Sem comentário escrito'}&quot;
                          </p>
                        </div>
                        <div>
                          <span className='fieldLabel'>Data de Registo:</span>
                          <span className='fieldValue'>{new Date(selectedReviewDetail.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className='emptyText'>Clica num comentário para ver os detalhes aqui.</p>
                    )}
                  </div>
                  
                  <div className='panelFooter'>
                    Painel de Auditoria e Gestão de Atividade
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}