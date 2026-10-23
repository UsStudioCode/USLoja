'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BsGrid1X2, BsPeople, BsShop, BsPersonWorkspace, BsBell, BsRobot, BsDatabase, BsGear, BsBoxArrowRight, BsList, BsX, BsShieldLock, } from 'react-icons/bs';
import { AdminDashboardProvider, useAdminDashboard,} from '../../../components/admincontext';
import '../../../styles/admin-painel.css'

const NAV = [
  { href: '/admin/painel', label: 'Overview', icon: BsGrid1X2, exact: true },
  { href: '/admin/painel/contas', label: 'Contas', icon: BsPeople },
  { href: '/admin/painel/lojas', label: 'Lojas', icon: BsShop },
  { href: '/admin/painel/servidores', label: 'Servidores', icon: BsPersonWorkspace },
  { href: '/admin/painel/notificacoes', label: 'Notificações', icon: BsBell },
  { href: '/admin/painel/ia', label: 'IA', icon: BsRobot },
  { href: '/admin/painel/configuracoes', label: 'Configurações', icon: BsGear },
];

function PainelShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loadDashboard, bootstrapped, loadingDash } = useAdminDashboard();

  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const raw = localStorage.getItem('admin_user');
    if (!token) { router.replace('/admin'); return; }
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdmin(raw ? JSON.parse(raw) : null);
    } catch {
      setAdmin(null);
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadDashboard(30, false);
  }, [ready, loadDashboard]);

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_dashboard_cache');
    router.replace('/');
  }


  function isActive(item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  if (!ready) {
    return (
      <div className="ap-boot">
        <div className="ap-boot-spinner" />
        <p>A carregar painel...</p>
      </div>
    );
  }

  const nome = admin?.first_name || admin?.email || admin?.auth_number || 'Admin';

  return (
    <div className="ap-shell">
      {menuOpen && ( <button type="button" className="ap-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> )}

      <aside className={`ap-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="ap-brand">
          <div className="ap-brand-mark">MB</div>
          <div>
            <strong>Admin</strong>
            <span>Feira Bandim</span>
          </div>
          <button type="button" className="ap-close-mobile" onClick={() => setMenuOpen(false)} aria-label="Fechar">
            <BsX size={22} />
          </button>
        </div>

        <nav className="ap-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ap-nav-link ${isActive(item) ? 'is-active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button type="button" className="ap-nav-link ap-nav-btn">
            <BsDatabase size={18} />
            <span>Supabase</span>
          </button>
        </nav>

        <div className="ap-sidebar-foot">
          <div className="ap-user-mini">
            <BsShieldLock size={16} />
            <div>
              <strong>{nome}</strong>
              <span>{admin?.auth_number}</span>
            </div>
          </div>
          <button type="button" className="ap-logout" onClick={logout}>
            <BsBoxArrowRight size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="ap-main">
        <header className="ap-topbar">
          <button type="button" className="ap-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <BsList size={22} />
          </button>
          <div className="ap-topbar-title">
            <h1>{NAV.find((n) => isActive(n))?.label || 'Painel'}</h1>
            {loadingDash && !bootstrapped ? (
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>A sincronizar…</span>
            ) : null}
          </div>
          <div className="ap-topbar-actions">
            <Link href="/admin/painel/notificacoes" className="ap-icon-btn" title="Notificações">
              <BsBell size={18} />
            </Link>
            <button type="button" className="ap-icon-btn" title="Supabase">
              <BsDatabase size={18} />
            </button>
          </div>
        </header>
        <div className="ap-content">{children}</div>
      </div>
    </div>
  );
}

export default function AdminPainelLayout({ children }) {
  return (
    <AdminDashboardProvider>
      <PainelShell>{children}</PainelShell>
    </AdminDashboardProvider>
  );
}