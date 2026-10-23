'use client';

import { useMemo } from 'react';
import { useAdminDashboard } from '../../../components/admincontext';
import { BsPeople, BsShop, BsPersonWorkspace, BsArrowRepeat } from 'react-icons/bs';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, } from 'recharts';

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`ap-stat ap-stat-${tone}`}>
      <div className="ap-stat-icon">
        <Icon size={18} />
      </div>
      <div className="ap-stat-body">
        <span className="ap-stat-label">{label}</span>
        <strong className="ap-stat-value">
          {value == null ? '—' : Number(value).toLocaleString('pt-PT')}
        </strong>
      </div>
    </div>
  );
}

function formatDay(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

const PIE_COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#a78bfa', '#f59e0b', '#f43f5e'];

const tooltipStyle = {
  background: '#151c2c',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 10,
  fontSize: 12,
  color: '#f1f5f9',
};

export default function AdminOverviewPage() {
  const { dashboard, loadingDash, error, loadDashboard, bootstrapped } = useAdminDashboard();

  const counts = dashboard?.counts || {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timeline = dashboard?.timeline || [];

  // Totais do período para o Pie (views por “fatia” agregada vs resto conceptual)
  // Pie: distribuição do total de views ao longo das semanas do período
  const viewsPieData = useMemo(() => {
    if (!timeline.length) return [];

    // Agrupa views em até 6 blocos (semanas aproximadas)
    const chunk = Math.max(1, Math.ceil(timeline.length / 6));
    const chunks = [];
    for (let i = 0; i < timeline.length; i += chunk) {
      const slice = timeline.slice(i, i + chunk);
      const total = slice.reduce((a, r) => a + (Number(r.views) || 0), 0);
      const from = formatDay(slice[0]?.date);
      const to = formatDay(slice[slice.length - 1]?.date);
      chunks.push({
        name: from === to ? from : `${from}–${to}`,
        value: total,
      });
    }
    return chunks.filter((c) => c.value > 0);
  }, [timeline]);

  const totalViews = useMemo(
    () => timeline.reduce((a, r) => a + (Number(r.views) || 0), 0),
    [timeline]
  );
  const totalPurchases = useMemo(
    () => timeline.reduce((a, r) => a + (Number(r.purchases) || 0), 0),
    [timeline]
  );

  return (
    <div className="ap-overview">
      <div className="ap-overview-head">
        <div>
          <h2>Overview geral</h2>
          <p>
            {bootstrapped
              ? `Dados em memória · ${dashboard?.growth?.days || 30} dias`
              : 'A carregar dados do servidor…'}
          </p>
        </div>
        <div className="ap-overview-actions">
          <button
            type="button"
            className="ap-btn-refresh"
            onClick={() => loadDashboard(30, true)}
            disabled={loadingDash}
          >
            <BsArrowRepeat size={16} className={loadingDash ? 'ap-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {error && <div className="ap-alert-error">{error}</div>}

      {!dashboard && loadingDash ? (
        <div className="ap-loading-block">
          <div className="ap-boot-spinner" />
          <p>A carregar overview…</p>
        </div>
      ) : (
        <>
          <section
            className="ap-stats-grid"
            style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
          >
            <StatCard icon={BsPeople} label="Utilizadores" value={counts.users} tone="blue" />
            <StatCard icon={BsShop} label="Lojas" value={counts.stores} tone="cyan" />
            <StatCard
              icon={BsPersonWorkspace}
              label="Servidores"
              value={counts.workers}
              tone="violet"
            />
          </section>

          {/* 1) BarChart — compras + views (como pediste) */}
          <section className="ap-chart-card" style={{ marginBottom: 12 }}>
            <h3>Views e compras por dia</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={timeline} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    stroke="#64748b"
                    fontSize={11}
                    minTickGap={24}
                  />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Dia ${l}`} />
                  <Legend />
                  <Bar dataKey="views" name="Views" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="Compras" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="ap-charts-grid">
            {/* 2) PieChart — distribuição de views no período */}
            <section className="ap-chart-card">
              <h3>Distribuição de views</h3>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>
                Total no período: <strong style={{ color: '#e2e8f0' }}>{totalViews}</strong>
              </p>
              <div style={{ width: '100%', height: 260 }}>
                {viewsPieData.length === 0 ? (
                  <div className="ap-chart-empty">
                    <p>Sem views neste período</p>
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={viewsPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={3}
                        stroke="rgba(15,23,42,0.8)"
                        strokeWidth={2}
                      >
                        {viewsPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* 3) Compras sozinhas — AreaChart com visual diferente */}
            <section className="ap-chart-card ap-chart-purchases">
              <h3>Compras (só)</h3>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8' }}>
                Total no período: <strong style={{ color: '#6ee7b7' }}>{totalPurchases}</strong>
              </p>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={timeline} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="buyOnly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(16,185,129,0.12)" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDay}
                      stroke="#64748b"
                      fontSize={11}
                      minTickGap={24}
                    />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `Dia ${l}`} />
                    <Area
                      type="monotone"
                      dataKey="purchases"
                      name="Compras"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      fill="url(#buyOnly)"
                      activeDot={{ r: 5, fill: '#6ee7b7' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}