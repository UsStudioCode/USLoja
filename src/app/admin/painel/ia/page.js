'use client';
import React, { useState, useEffect } from 'react';

export default function AiInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiData, setAiData] = useState({
    aiExplanation: '',
    userGrowthChartData: [],
    topQuestions: [],
    chatHistory: []
  });

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      // Limpa barras duplicadas caso a variável venha com barra no final
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/ai-insights`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAiData(json.data);
      } else {
        setError(json.comment || 'Não foi possível carregar os insights da IA.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de ligação ao servidor ao buscar dados de IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInsights();
  }, []);

  return (
    <div className="ap-content">
      {/* Cabeçalho da Página */}
      <div className="ap-overview-head">
        <div>
          <h2>🤖 AI Insights — Feira Bandim</h2>
          <p>Análise inteligente de dados, crescimento de utilizadores e interações do sistema.</p>
        </div>
        <div className="ap-overview-actions">
          <button 
            onClick={fetchInsights} 
            disabled={loading}
            className="ap-btn-refresh"
          >
            {loading ? <span className="ap-spin">⏳</span> : '🔄'} Atualizar Análise
          </button>
        </div>
      </div>

      {/* Erro caso ocorra */}
      {error && (
        <div className="ap-alert-error">
          {error}
        </div>
      )}

      {/* Estado de Carregamento */}
      {loading && !aiData.aiExplanation ? (
        <div className="ap-loading-block">
          <div className="ap-boot-spinner"></div>
          <p>A processar inteligência analítica...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Caixa de Explicação da IA */}
          <div className="ap-card" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), #151c2c)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd', marginBottom: '8px' }}>
              ✨ Resumo Executivo da IA
            </h3>
            <p style={{ margin: 0, color: 'var(--ap-text)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {aiData.aiExplanation || 'Nenhum resumo disponível no momento.'}
            </p>
          </div>

          {/* Grelha de Gráficos e Estatísticas */}
          <div className="ap-charts-grid">
            
            {/* Gráfico de Crescimento de Utilizadores */}
            <div className="ap-chart-card">
              <h3>Crescimento de Utilizadores</h3>
              {aiData.userGrowthChartData.length === 0 ? (
                <div className="ap-chart-empty">
                  <p>Sem dados de registos suficientes.</p>
                </div>
              ) : (
                <div className="ap-bars">
                  {aiData.userGrowthChartData.slice(-15).map((item, index) => {
                    // Altura proporcional simples baseada no total
                    const maxVal = Math.max(...aiData.userGrowthChartData.map(i => i.totalUsers), 1);
                    const heightPercent = Math.max(Math.round((item.totalUsers / maxVal) * 100), 8);
                    return (
                      <div className="ap-bar-col" key={index} title={`${item.date}: ${item.totalUsers} total (${item.newUsers} novos)`}>
                        <div 
                          className="ap-bar" 
                          style={{ height: `${heightPercent}%`, background: '#3b82f6' }}
                        ></div>
                        <span className="ap-bar-day">{item.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Perguntas / Tópicos mais Frequentes */}
            <div className="ap-chart-card">
              <h3>Tópicos Mais Pesquisados / Frequentes</h3>
              {aiData.topQuestions.length === 0 ? (
                <div className="ap-chart-empty">
                  <p>Sem registos de interações recentes.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {aiData.topQuestions.map((q, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--ap-border)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--ap-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                        {idx + 1}. {q.question}
                      </span>
                      <span className="ap-contas-chip">{q.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Histórico Recente de Interações de IA */}
          <div className="ap-card">
            <h3 style={{ marginBottom: '14px' }}>📜 Histórico Recente de Conversas com a IA</h3>
            {aiData.chatHistory.length === 0 ? (
              <p style={{ color: 'var(--ap-muted)', fontSize: '0.85rem', margin: 0 }}>Nenhum histórico encontrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                {aiData.chatHistory.map((chat) => (
                  <div key={chat.id} style={{ padding: '10px 12px', background: '#0f172a', borderRadius: '10px', border: '1px solid var(--ap-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ap-muted)', marginBottom: '4px' }}>
                      <span><strong>Prompt:</strong></span>
                      <span>{new Date(chat.created_at).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>
                      &quot;{chat.prompt}&quot;
                    </p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ap-text)', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px' }}>
                      {chat.response}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}