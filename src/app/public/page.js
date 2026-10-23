'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BsPerson, BsChevronRight } from 'react-icons/bs';
import { CiSearch } from 'react-icons/ci';
import Link from 'next/link';
import '../../styles/categorias.css';
import { useAuthProvider } from '@/components/authcontext';
import { BiMoon, BiSun } from 'react-icons/bi';

function normalizar(texto = '') {
  return texto.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

export default function TodasCategoriasPage() {
  const router = useRouter();
  const { userFoto, infoList, darktheme, themeChanger } = useAuthProvider();
  const [pesquisa, setPesquisa] = useState('');
  const [filCategoria, setFilCategoria] = useState('todos');
  const [categoriasComContagem, setCategoriasComContagem] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = 'http://localhost:5000';

  useEffect(() => {
    async function carregarDados() {
      const cacheSalvo = localStorage.getItem('mb_cache_categorias');
      if (cacheSalvo) {
        try {
          const dadosParsed = JSON.parse(cacheSalvo);
          setCategoriasComContagem(dadosParsed);
          setLoading(false);
          // Seleciona a primeira categoria por padrão para já exibir subcategorias à direita
          if (dadosParsed.length > 0) {
            setCategoriaSelecionada(dadosParsed[0]);
          }
          return;
        } catch (e) {
          localStorage.removeItem('mb_cache_categorias');
        }
      }

      try {
        const res = await fetch(`${API}/products/summary`);
        const data = await res.json();
        const products = data.products || [];

        const formatadas = infoList.map((cat) => {
          const prodsNaCat = products.filter((p) => {
            const pCat = normalizar(p.category || '');
            return pCat === normalizar(cat.cat) || pCat === normalizar(cat.nome) || pCat.includes(normalizar(cat.cat));
          });

          const subcategorias = cat.list.map((sub) => {
            const totalSub = prodsNaCat.filter((p) => {
              const pSub = normalizar(p.sub_category || '');
              return pSub === normalizar(sub.title) || pSub.includes(normalizar(sub.title));
            }).length;
            return { nome: sub.title, total: totalSub };
          });

          const subsExistentesNoBanco = [...new Set(prodsNaCat.map((p) => p.sub_category).filter(Boolean).map((s) => s.trim()))];
          subsExistentesNoBanco.forEach((subNome) => {
            const jaExiste = subcategorias.some((s) => normalizar(s.nome) === normalizar(subNome));
            if (!jaExiste) {
              const total = prodsNaCat.filter((p) => normalizar(p.sub_category) === normalizar(subNome)).length;
              subcategorias.push({ nome: subNome, total });
            }
          });

          return {
            id: cat.cat,
            nomeExibicao: cat.nome,
            totalProdutos: prodsNaCat.length,
            subcategorias: subcategorias.filter((s) => s.total > 0 || cat.list.some((l) => l.title === s.nome)),
          };
        });

        formatadas.sort((a, b) => b.totalProdutos - a.totalProdutos);
        setCategoriasComContagem(formatadas);
        localStorage.setItem('mb_cache_categorias', JSON.stringify(formatadas));

        if (formatadas.length > 0) {
          setCategoriaSelecionada(formatadas[0]);
        }
      } catch (e) {
        console.error('Erro ao carregar categorias:', e);
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [infoList]);

  const categoriasFiltradas = categoriasComContagem.filter((cat) => {
    const matchPesquisa = normalizar(cat.nomeExibicao).includes(normalizar(pesquisa)) || cat.subcategorias.some((sub) => normalizar(sub.nome).includes(normalizar(pesquisa)));
    const matchSelect = filCategoria === 'todos' || cat.nomeExibicao === filCategoria;
    return matchPesquisa && matchSelect;
  });

  return (
    <main className="mb-cat-page">
      <header className="mb-cat-header">
        <div className="mb-cat-container">
          <div className="mb-cat-header-top">
            <div className="mb-cat-titles">
              <h1>Produtos e Categorias</h1>
              <p>Mercado Integrado de Bandim a Praça e Regiões</p>
            </div>
            <div className="mb-cat-actions">
              <button type="button" className="mb-icon-btn" onClick={themeChanger}>
                {darktheme ? <BiMoon size={18} /> : <BiSun size={18} />}
              </button>
              <Link href="/auth/login" className="mb-icon-btn profile-icon-wrap" aria-label="Conta">
                {userFoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userFoto} alt="Perfil" className="mb-user-avatar-img" />
                ) : (<BsPerson size={18} />)}
              </Link>
            </div>
          </div>
          <div className="mb-search-row">
            <div className="mb-search-box">
              <CiSearch size={18} />
              <input
                type="search"
                placeholder="Pesquisar categoria ou subcategoria..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
              />
            </div>
            <select className="mb-select-box" value={filCategoria} onChange={(e) => setFilCategoria(e.target.value)}>
              <option value="todos">Todas as Categorias</option>
              {infoList.map((c, i) => (<option key={i} value={c.nome}>{c.nome}</option>))}
            </select>
          </div>
        </div>
      </header>

      {/* Clone */}
      <header className="mb-cat-headers">
        <div className="mb-cat-container">
          <div className="mb-cat-header-top">
            <div className="mb-cat-titles">
              <h1>Produtos e Categorias</h1>
              <p>Mercado Integrado de Bandim a Praça e Regiões</p>
            </div>
            <div className="mb-cat-actions">
              <button type="button" className="mb-icon-btn" onClick={themeChanger}>
                {darktheme ? <BiMoon size={18} /> : <BiSun size={18} />}
              </button>
              <div className="mb-icon-btn profile-icon-wrap" aria-label="Conta">
              </div>
            </div>
          </div>
          <div className="mb-search-row">
            <div className="mb-search-box">
            </div>
            <select className="mb-select-box">
              <option value="todos">Todas as Categorias</option>
            </select>
          </div>
        </div>
      </header>

      <div className="mb-cat-container mb-main-content">
        {loading ? (
          <div className="mb-loading-wrap">
            <div className="mb-spinner"></div>
            <p>A carregar categorias...</p>
          </div>
        ) : (
          <div className="mb-layout-slider-wrapper">
            <div className="mb-categories-sidebar-track slide-left">
              {categoriasFiltradas.map((cat, i) => {
                const isSelected = categoriaSelecionada?.id === cat.id;
                return (
                  <div key={i} className="mb-cat-item-wrapper">
                    <div
                      onClick={() => setCategoriaSelecionada(isSelected ? null : cat)}
                      className={`mb-cat-card ${cat.totalProdutos > 0 ? 'has-products' : 'empty'} ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="mb-card-left">
                        <div>
                          <h3 className="mb-card-title">{cat.nomeExibicao}</h3>
                          <p className="mb-card-desc">{cat.subcategorias.filter((s) => s.total > 0).length} subcategorias</p>
                        </div>
                      </div>
                      <div className="mb-card-right">
                        <span className={`mb-badge ${cat.totalProdutos > 0 ? 'active' : ''}`}>
                          {cat.totalProdutos}
                        </span>
                        <BsChevronRight className={`mb-arrow ${isSelected ? 'rotated' : ''}`} />
                      </div>
                    </div>

                    {/* PAINEL MÓVEL: Aparece diretamente embaixo no telemóvel */}
                    {isSelected && (
                      <div className="mb-detail-panel-mobile">
                        <div className="mb-subcat-grid">
                          {categoriaSelecionada.subcategorias.map((sub, idx) => (
                            <div
                              key={idx}
                              onClick={() => router.push(`/public/${categoriaSelecionada.id}?category=${encodeURIComponent(categoriaSelecionada.nomeExibicao)}&sub_category=${encodeURIComponent(sub.nome)}`)}
                              className={`mb-subcat-card ${sub.total > 0 ? 'has-items' : 'empty'}`}
                            >
                              <div className="mb-subcat-info">
                                <span className="mb-subcat-name">{sub.nome}</span>
                                <span className="mb-subcat-count">{sub.total} {sub.total === 1 ? 'produto' : 'produtos'}</span>
                              </div>
                              <BsChevronRight className="mb-arrow" />
                            </div>
                          ))}
                        </div>
                        {categoriaSelecionada.totalProdutos === 0 && (
                          <div className="mb-empty-state"><p>Ainda não existem produtos nesta categoria.</p></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {categoriaSelecionada && (
              <div className="mb-detail-panel-slide">
                <div className="mb-detail-header-card">
                  <div>
                    <h2>{categoriaSelecionada.nomeExibicao}</h2>
                    <p><strong>{categoriaSelecionada.totalProdutos}</strong> produtos disponíveis</p>
                  </div>
                </div>
                <div className="mb-subcat-grid">
                  {categoriaSelecionada.subcategorias.map((sub, idx) => (
                    <div
                      key={idx}
                      onClick={() => router.push(`/public/${categoriaSelecionada.id}?category=${encodeURIComponent(categoriaSelecionada.nomeExibicao)}&sub_category=${encodeURIComponent(sub.nome)}`)}
                      className={`mb-subcat-card ${sub.total > 0 ? 'has-items' : 'empty'}`}
                    >
                      <div className="mb-subcat-info">
                        <span className="mb-subcat-name">{sub.nome}</span>
                        <span className="mb-subcat-count">{sub.total} {sub.total === 1 ? 'produto' : 'produtos'}</span>
                      </div>
                      <BsChevronRight className="mb-arrow" />
                    </div>
                  ))}
                </div>
                {categoriaSelecionada.totalProdutos === 0 && (
                  <div className="mb-empty-state"><p>Ainda não existem produtos nesta categoria.</p></div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}