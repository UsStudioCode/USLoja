import React, { useState, useEffect } from 'react';

export default function SupabaseStudioPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableRows, setTableRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // SQL Runner state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM profiles LIMIT 10;');
  const [sqlResult, setSqlResult] = useState(null);

  // Edição rápida de registo
  const [editingRow, setEditingRow] = useState(null);
  const [editJsonText, setEditJsonText] = useState('');

  // ID do projeto e link direto do Supabase fornecido
  const supabaseProjectId = 'mczrgctmvjimnhogxfkv';
  const directSupabaseDashboardUrl = `https://supabase.com/dashboard/project/${supabaseProjectId}/editor`;

  const fetchTablesList = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/db/tables`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const json = await res.json();
      if (json.success) {
        setTables(json.tables || []);
        if (json.tables.length > 0 && !selectedTable) {
          setSelectedTable(json.tables[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar tabelas:', err);
    }
  };

  const fetchTableData = async (tableName) => {
    if (!tableName) return;
    setLoading(true);
    setError('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/db/fetch-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tableName, limit: 50 })
      });
      const json = await res.json();
      if (json.success) {
        setTableRows(json.rows || []);
        setTotalCount(json.totalCount || 0);
      } else {
        setError(json.comment || 'Erro ao carregar dados da tabela.');
      }
    } catch (err) {
      setError('Erro de ligação ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTablesList();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const handleExecuteSql = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setSqlResult(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/db/execute-sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sqlQuery })
      });
      const json = await res.json();
      if (json.success) {
        setSqlResult(json.result);
        setSuccessMsg(json.comment);
      } else {
        setError(json.comment || 'Erro ao executar SQL.');
      }
    } catch (err) {
      setError('Erro de execução da query.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (rowId) => {
    if (!window.confirm('Tem certeza absoluta que deseja apagar este registo na base de dados?')) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/db/mutate-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tableName: selectedTable, action: 'delete', recordId: { id: rowId } })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.comment);
        fetchTableData(selectedTable);
      } else {
        alert(json.comment);
      }
    } catch (err) {
      alert('Erro ao apagar registo.');
    }
  };

  const handleStartEdit = (row) => {
    setEditingRow(row);
    setEditJsonText(JSON.stringify(row, null, 2));
  };

  const handleSaveEdit = async () => {
    try {
      const parsedData = JSON.parse(editJsonText);
      const rowId = parsedData.id;
      if (!rowId) {
        alert('O registo precisa de conter um campo "id" válido para atualização.');
        return;
      }

      delete parsedData.id;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cleanAPI = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';

      const res = await fetch(`${cleanAPI}/admins/painel/db/mutate-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tableName: selectedTable, action: 'update', recordId: { id: rowId }, updatedData: parsedData })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.comment);
        setEditingRow(null);
        fetchTableData(selectedTable);
      } else {
        alert(json.comment);
      }
    } catch (err) {
      alert('JSON inválido ou erro ao atualizar registo.');
    }
  };

  return (
    <div className="ap-content">
      {/* Cabeçalho */}
      <div className="ap-overview-head">
        <div>
          <h2>🗄️ Supabase Database Studio & SQL Manager</h2>
          <p>Escreva queries SQL, visualize tabelas e controle a base de dados da Feira Bandim.</p>
        </div>
        <div className="ap-overview-actions">
          {/* Botão de Acesso Direto ao Supabase Dashboard */}
          <a 
            href={directSupabaseDashboardUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ap-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            🔗 Abrir Supabase Dashboard
          </a>
        </div>
      </div>

      {error && <div className="ap-alert-error">{error}</div>}
      {successMsg && <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', fontSize: '0.9rem' }}>{successMsg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Bloco 1: Editor SQL Direto */}
        <div className="ap-card">
          <h3 style={{ marginBottom: '10px' }}>⚡ Escrever e Executar SQL no Supabase</h3>
          <p style={{ color: 'var(--ap-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
            Comando SQL customizado executado diretamente contra o motor Postgres do projeto.
          </p>
          <form onSubmit={handleExecuteSql} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea 
              rows="4" 
              value={sqlQuery} 
              onChange={e => setSqlQuery(e.target.value)}
              style={{ width: '100%', background: '#0f172a', color: '#60a5fa', fontFamily: 'monospace', padding: '12px', borderRadius: '10px', border: '1px solid var(--ap-border)', fontSize: '0.9rem', outline: 'none' }}
              placeholder="SELECT * FROM ... "
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="ap-btn-primary" disabled={loading}>
                {loading ? 'A executar...' : '🚀 Executar Query SQL'}
              </button>
            </div>
          </form>

          {sqlResult && (
            <div style={{ marginTop: '14px' }}>
              <h4 style={{ fontSize: '0.85rem', color: '#93c5fd', margin: '0 0 6px 0' }}>Resultados da Query:</h4>
              <pre style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', color: 'var(--ap-text)', fontSize: '0.78rem', overflowX: 'auto', maxHeight: '200px', border: '1px solid var(--ap-border)' }}>
                {JSON.stringify(sqlResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Bloco 2: Explorador de Tabelas Local */}
        <div className="ap-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>📊 Explorador de Tabelas e Registos</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--ap-muted)' }}>Tabela:</span>
              <select 
                value={selectedTable} 
                onChange={e => setSelectedTable(e.target.value)}
                className="ap-select"
              >
                {tables.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button onClick={() => fetchTableData(selectedTable)} className="ap-btn-refresh" style={{ height: '40px' }}>
                🔄
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--ap-muted)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>A mostrar tabela: <strong style={{ color: '#93c5fd' }}>{selectedTable}</strong> ({totalCount} registos)</span>
            {/* Link direto para a tabela específica no Supabase Dashboard */}
            <a 
              href={`${directSupabaseDashboardUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: '0.78rem', color: '#60a5fa', textDecoration: 'none' }}
            >
              Abrir esta tabela no Supabase ↗
            </a>
          </div>

          <div className="ap-contas-table-wrap">
            <table className="ap-contas-table">
              <thead>
                <tr>
                  {tableRows.length > 0 ? Object.keys(tableRows[0]).slice(0, 6).map(col => (
                    <th key={col}>{col}</th>
                  )) : <th>Sem colunas disponíveis</th>}
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--ap-muted)', padding: '24px' }}>
                      {loading ? 'A carregar dados...' : 'Nenhum registo encontrado.'}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => (
                    <tr key={row.id || idx}>
                      {Object.entries(row).slice(0, 6).map(([key, val], i) => (
                        <td key={i} style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                        </td>
                      ))}
                      <td>
                        <div className="ap-contas-actions">
                          <button onClick={() => handleStartEdit(row)} className="ap-icon-btn" title="Editar registo">
                            ✏️
                          </button>
                          {row.id && (
                            <button onClick={() => handleDeleteRecord(row.id)} className="ap-icon-btn ap-icon-danger" title="Apagar registo">
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal de Edição JSON */}
      {editingRow && (
        <div className="ap-modal-backdrop" onClick={() => setEditingRow(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-head">
              <h3>✏️ Editar Registo ({selectedTable})</h3>
              <button onClick={() => setEditingRow(null)} className="ap-close-mobile">✕</button>
            </div>
            <div className="ap-modal-form">
              <p style={{ fontSize: '0.8rem', color: 'var(--ap-muted)', margin: 0 }}>
                Modifique os campos abaixo em formato JSON para efetuar o update imediato.
              </p>
              <textarea 
                rows="10"
                value={editJsonText}
                onChange={e => setEditJsonText(e.target.value)}
                style={{ width: '100%', background: '#0f172a', color: '#34d399', fontFamily: 'monospace', padding: '12px', borderRadius: '10px', border: '1px solid var(--ap-border)', fontSize: '0.85rem' }}
              />
              <div className="ap-modal-actions">
                <button type="button" onClick={() => setEditingRow(null)} className="ap-btn-ghost">Cancelar</button>
                <button type="button" onClick={handleSaveEdit} className="ap-btn-primary">💾 Guardar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}