'use client'
// ==========================================
// FRONTEND: SettingsAndRestrictionsPage.jsx
// ==========================================
import React, { useState, useEffect } from 'react';

export default function SettingsAndRestrictionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    strict_security: true,
    allow_registrations: true,
    max_upload_size_mb: 15,
    theme_accent: '#2563eb',
          system_name: 'Feira Bandim',
    auto_backup: true,
    email_notifications: true
  });
  
  const [admins, setAdmins] = useState([]);
  const [invites, setInvites] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/all-settings`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data.settings);
        setAdmins(json.data.admins || []);
        setInvites(json.data.invites || []);
        setAuditLogs(json.data.auditLogs || []);
      } else {
        setError(json.comment || 'Erro ao carregar dados do painel.');
      }
    } catch (err) {
      setError('Erro crítico de ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAllData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/update-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(settings)
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.comment);
      } else {
        setError(json.comment || 'Erro ao atualizar configurações.');
      }
    } catch (err) {
      setError('Falha ao submeter alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/generate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedCode(json.inviteCode);
        fetchAllData(); // Atualiza a lista de convites
      } else {
        alert(json.comment || 'Erro ao gerar código.');
      }
    } catch (err) {
      alert('Erro de rede ao gerar código.');
    }
  };

  const handleAdminAction = async (adminId, action) => {
    if (!window.confirm(`Tem certeza que deseja executar esta ação (${action})?`)) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/manage-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ adminId, action })
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.comment);
      }
    } catch (err) {
      alert('Erro ao processar ação do administrador.');
    }
  };

  return (
    <div className="ap-content">
      {/* Cabeçalho */}
      <div className="ap-overview-head">
        <div>
          <h2>⚙️ Central de Configurações & Restrições Globais</h2>
          <p>Controle total da Feira Bandim: restrições de base de dados, segurança, gestão de administradores e logs de atividade.</p>
        </div>
        <div className="ap-overview-actions">
          <button onClick={fetchAllData} disabled={loading} className="ap-btn-refresh">
            {loading ? <span className="ap-spin">⏳</span> : '🔄'} Sincronizar Tudo
          </button>
        </div>
      </div>

      {error && <div className="ap-alert-error">{error}</div>}
      {successMsg && <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', fontSize: '0.9rem' }}>{successMsg}</div>}

      {loading && !settings.system_name ? (
        <div className="ap-loading-block">
          <div className="ap-boot-spinner"></div>
          <p>A carregar parâmetros do sistema...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Grelha Superior: Restrições de BD e Gerador de Convites */}
          <div className="ap-charts-grid">
            
            {/* Bloco 1: Restrições Globais da Base de Dados */}
            <div className="ap-card">
              <h3 style={{ marginBottom: '14px' }}>🔒 Restrições e Parâmetros de Banco de Dados</h3>
              <form onSubmit={handleSaveSettings} className="ap-modal-form" style={{ padding: 0 }}>
                
                <div className="ap-modal-checks">
                  <label className="ap-check">
                    <input 
                      type="checkbox" 
                      checked={settings.maintenance_mode} 
                      onChange={e => setSettings({...settings, maintenance_mode: e.target.checked})}
                    />
                    Modo de Manutenção (Bloqueio total de rotas públicas)
                  </label>
                  
                  <label className="ap-check">
                    <input 
                      type="checkbox" 
                      checked={settings.strict_security} 
                      onChange={e => setSettings({...settings, strict_security: e.target.checked})}
                    />
                    Segurança Estrita de BD (Restrição de queries anónimas)
                  </label>

                  <label className="ap-check">
                    <input 
                      type="checkbox" 
                      checked={settings.allow_registrations} 
                      onChange={e => setSettings({...settings, allow_registrations: e.target.checked})}
                    />
                    Permitir Novos Registos de Contas no Mercado
                  </label>

                  <label className="ap-check">
                    <input 
                      type="checkbox" 
                      checked={settings.auto_backup} 
                      onChange={e => setSettings({...settings, auto_backup: e.target.checked})}
                    />
                    Executar Backups Automáticos Diários na Base de Dados
                  </label>
                </div>

                <label>
                  Nome Oficial do Projeto / Plataforma
                  <input 
                    type="text" 
                    value={settings.system_name} 
                    onChange={e => setSettings({...settings, system_name: e.target.value})}
                  />
                </label>

                <label>
                  Limite Máximo de Upload por Ficheiro (MB)
                  <input 
                    type="number" 
                    value={settings.max_upload_size_mb} 
                    onChange={e => setSettings({...settings, max_upload_size_mb: Number(e.target.value)})}
                  />
                </label>

                <label>
                  Cor Principal do Tema (Layout Accent)
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={settings.theme_accent} 
                      onChange={e => setSettings({...settings, theme_accent: e.target.value})}
                      style={{ width: '60px', height: '42px', padding: '4px', cursor: 'pointer' }}
                    />
                    <input 
                      type="text" 
                      value={settings.theme_accent} 
                      onChange={e => setSettings({...settings, theme_accent: e.target.value})}
                    />
                  </div>
                </label>

                <div style={{ marginTop: '10px' }}>
                  <button type="submit" className="ap-btn-primary" disabled={saving}>
                    {saving ? 'A aplicar...' : '💾 Aplicar Restrições e Guardar'}
                  </button>
                </div>
              </form>
            </div>

            {/* Bloco 2: Gestão de Convites para Admins */}
            <div className="ap-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3>🔑 Gerar Código para Novo Administrador</h3>
                <p style={{ color: 'var(--ap-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
                  Gere tokens de registo restrito para novos administradores entrarem na plataforma de forma segura.
                </p>

                {generatedCode ? (
                  <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #3b82f6', textAlign: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ap-muted)', display: 'block', marginBottom: '2px' }}>NOVO CÓDIGO GERADO:</span>
                    <strong style={{ fontSize: '1.15rem', color: '#93c5fd', letterSpacing: '0.04em' }}>{generatedCode}</strong>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--ap-border)', textAlign: 'center', marginBottom: '14px', color: 'var(--ap-muted)', fontSize: '0.85rem' }}>
                    Nenhum código gerado recentemente nesta sessão.
                  </div>
                )}

                <button onClick={handleGenerateInvite} className="ap-btn-refresh" style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}>
                  ✨ Gerar Código de Convite Admin
                </button>

                <h4 style={{ fontSize: '0.85rem', color: 'var(--ap-text)', margin: '0 0 8px 0' }}>📋 Histórico de Convites</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {invites.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--ap-muted)' }}>Sem códigos anteriores.</span>
                  ) : (
                    invites.map((inv, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#0f172a', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--ap-border)' }}>
                        <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{inv.code}</span>
                        <span style={{ color: inv.used ? '#ef4444' : '#34d399' }}>{inv.used ? 'Utilizado' : 'Disponível'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Lista Completa: Administradores Ativos e Números */}
          <div className="ap-card">
            <h3 style={{ marginBottom: '14px' }}>👥 Administradores Ativos (Contactos e Números)</h3>
            <div className="ap-contas-table-wrap">
              <table className="ap-contas-table">
                <thead>
                  <tr>
                    <th>Administrador</th>
                    <th>Email</th>
                    <th>Número / Telefone</th>
                    <th>Data de Registo</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ap-muted)' }}>Nenhum administrador encontrado.</td>
                    </tr>
                  ) : (
                    admins.map(adm => (
                      <tr key={adm.id}>
                        <td>
                          <div className="ap-contas-user">
                            <div className="ap-brand-mark" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                              {(adm.full_name || 'AD').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong>{adm.full_name || 'Sem Nome'}</strong>
                              <span>ID: {adm.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td>{adm.email}</td>
                        <td style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 'bold' }}>
                          {adm.phone || 'Não definido'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--ap-muted)' }}>
                          {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <div className="ap-contas-actions">
                            <button 
                              onClick={() => handleAdminAction(adm.id, 'revoke')} 
                              className="ap-icon-btn ap-icon-danger" 
                              title="Remover privilégios de Admin"
                            >
                              🔒
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista Completa: Logs de Auditoria / Atividade do Sistema */}
          <div className="ap-card">
            <h3 style={{ marginBottom: '14px' }}>📜 Registo de Atividades e Logs de Segurança</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {auditLogs.length === 0 ? (
                <p style={{ color: 'var(--ap-muted)', fontSize: '0.85rem', margin: 0 }}>Nenhum registo de log encontrado na base de dados.</p>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', background: '#0f172a', borderRadius: '8px', border: '1px solid var(--ap-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#93c5fd', fontWeight: 600 }}>{log.action || 'Ação do Sistema'}</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--ap-muted)' }}>{log.details || log.description || 'Sem detalhes adicionais.'}</p>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}