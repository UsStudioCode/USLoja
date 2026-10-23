'use client'; 
import { useState } from 'react';
import { FiTag, FiShoppingBag, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function ProductCard({ produto }) {
  const { titulo, precoMin, precoMax, condicao, descricao, foto, fotos } = produto;
  
  // Normalizar lista de fotos (suporta array 'fotos' ou string única 'foto')
  const listaFotos = fotos && fotos.length > 0 ? fotos : (foto ? [foto] : []);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  const proximaFoto = (e) => {
    e.stopPropagation();
    setFotoAtiva((prev) => (prev + 1) % listaFotos.length);
  };

  const fotoAnterior = (e) => {
    e.stopPropagation();
    setFotoAtiva((prev) => (prev - 1 + listaFotos.length) % listaFotos.length);
  };

  const renderPreco = () => {
    if (precoMin && precoMax && precoMin !== precoMax) {
      return `${Number(precoMin).toLocaleString()} - ${Number(precoMax).toLocaleString()} CFA`;
    }
    return `${Number(precoMin || precoMax || 0).toLocaleString()} CFA`;
  };

  const getCondicaoBadge = (c) => {
    switch(c) {
      case 'novo': return { text: 'Novo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'usado_2maos': return { text: '2ª Mão', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'usado_uk': return { text: 'Usado UK', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      default: return { text: 'Novo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  const badge = getCondicaoBadge(condicao);

  return (
    <div className="produto-card-investor">
      <div className="img-container" style={{ position: 'relative' }}>
        {listaFotos.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listaFotos[fotoAtiva]} alt={titulo || 'Produto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* Setas de navegação se houver mais do que 1 foto */}
            {listaFotos.length > 1 && (
              <>
                <button type="button" onClick={fotoAnterior} style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiChevronLeft size={14} />
                </button>
                <button type="button" onClick={proximaFoto} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiChevronRight size={14} />
                </button>
                <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                  {fotoAtiva + 1}/{listaFotos.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <FiShoppingBag size={32} />
          </div>
        )}

        <span className="badge-sugestao" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}` }}>
          {badge.text}
        </span>
      </div>

      <div className="produto-info">
        <h3>{titulo || 'Nome do Produto'}</h3>
        <span className="preco">{renderPreco()}</span>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
          {descricao ? (descricao.length > 50 ? `${descricao.substring(0, 50)}...` : descricao) : 'Sem descrição'}
        </p>
      </div>
    </div>
  );
}