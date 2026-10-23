'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { FiShoppingBag, FiCpu, FiUser } from 'react-icons/fi';
import Link from 'next/link';
import { useAuthProvider } from '@/components/authcontext';
import '../../../styles/dashbuyer.css';

export default function BuyerLayout({ children }) {
  const pathname = usePathname();
  const { darktheme, loading } = useAuthProvider() || {};
  if (loading) return <div className="painel-loading-screen"> <p>A carregar painel...</p> </div>

  return (
    <div className={`painel-comprador-container ${darktheme ? 'dark-theme' : 'light-theme'}`}>
      <main className="painel-conteudo"> 
        {children}
      </main>
      
      <nav className="painel-abas-baixo">
        <Link href={'/buyers'} className={pathname === '/buyers' ? 'aba-btn ativo' : 'aba-btn'}>
          <FiShoppingBag size={18} /> <span>Painel</span>
        </Link>

        <Link href={'/buyers/ia'} className={pathname === '/buyers/ia' ? 'aba-btn ativo' : 'aba-btn'}>
          <FiCpu size={18} /> <span>Peça Clara</span>
        </Link>
        
        <Link href={'/buyers/account'} className={pathname === '/buyers/account' ? 'aba-btn ativo' : 'aba-btn'}>
          <FiUser size={18} /> <span>Conta</span>
        </Link>
      </nav>
    </div>
  );
}