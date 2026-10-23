'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import '../../../styles/telemovel.css';
import { BsPerson, BsRobot, BsMoon, BsSun, BsListUl, BsChevronRight } from 'react-icons/bs';
import Hamburger from 'hamburger-react';
import { useParams, useSearchParams } from 'next/navigation';
import { MdGridView } from 'react-icons/md';
import { useAuthProvider } from '@/components/authcontext';
import { EachProductCard } from '@/components/eachproductcard';
import { CiSearch } from 'react-icons/ci';

export default function PaginaCategoria() {
  const path = useParams();
  const searchParams = useSearchParams();
  const categoria = path?.categoria || 'outros';
  const { userProfile, userFoto, userLang, darktheme, themeChanger, langChanger, infoList } = useAuthProvider();
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const searchContainerRef = useRef(null);
  
  const fullValor = infoList.find(e => e.cat === categoria);
  const valor = fullValor ? fullValor.nome : 'Produtos';
  const API = 'http://localhost:5000';

  const [menuAberto, changeMenu] = useState(false);
  const [modoGrid, setModoGrid] = useState(true);
  const subParam = searchParams.get('sub_category');
  const [filProd, setFilProd] = useState(subParam || 'todos');
  const [filCond, setFilCond] = useState('todos');
  const [filPrec, setFilPrec] = useState('todos');
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [iaAberta, setIaAberta] = useState(false);
  const [showList, changeList] = useState(null);
  const [showerList, changeShowerList] = useState(false);
  const [searchShow, changeSearch] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setMostrarSugestoes(false);
        if (window.innerWidth < 800) {
          changeSearch(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sugestoesDinamicas = Array.from(
    new Set(produtos.map(p => p.title).filter(Boolean))
  ).filter(titulo => titulo.toLowerCase().includes(termoBusca.toLowerCase())
  ).slice(0, 2);

  useEffect(() => {
    if (!categoria) return;
    const cacheKey = `mb_prod_${categoria}`;
    const produtosEmCache = sessionStorage.getItem(cacheKey);
    if (produtosEmCache) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProdutos(JSON.parse(produtosEmCache));
        setCarregando(false);
        return;
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    async function buscarProdutosBackend() {
      setCarregando(true);
      try {
        const res = await fetch(`${API}/buyers/products?category=${encodeURIComponent(categoria)}`);
        const data = await res.json();
        if (data.success && data.products) {
          setProdutos(data.products);
          sessionStorage.setItem(cacheKey, JSON.stringify(data.products));
        } else {
          setProdutos([]);
        }
      } catch (err) {
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    }

    buscarProdutosBackend();
  }, [categoria, API]);

  useEffect(() => {
    if (subParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilProd(subParam);
    }
  }, [subParam]);

  const produtosFiltrados = produtos.filter(p => {
    if (termoBusca && !p.title?.toLowerCase().includes(termoBusca.toLowerCase())) {
      return false;
    }
    if (filProd !== 'todos' && p.sub_category !== filProd) return false;
    if (filCond !== 'todos' && p.condition !== filCond) return false;
    if (filPrec !== 'todos') {
      const price = Number(p.price_min);
      if (filPrec === 'ate10k' && price >= 10000) return false;
      if (filPrec === '10k_100k' && (price < 10000 || price >= 100000)) return false;
      if (filPrec === '100k_350k' && (price < 100000 || price >= 350000)) return false;
      if (filPrec === 'mais350k' && price < 350000) return false;
    }
    return true;
  });

  return (
    <main className="page-full">
      <header className="it-header">
        <div className="it-header-content">
          <div className={`it-titles ${searchShow ? 'show-search' : ''}`}>
            <h1>{valor}</h1>
            <p>...Mercado direto (Bandim, Praça e Regiões)...</p>
          </div>
          <div className="it-controls-top">
            <button type="button" className="it-control-pill no-menu" onClick={() => setModoGrid(!modoGrid)}>
              {!modoGrid ? <MdGridView size={20} /> : <BsListUl size={20} />}
            </button>
            <button type="button" className="it-control-pill no-menu" onClick={themeChanger}>
              {darktheme ? <BsMoon size={20} /> : <BsSun size={20} />}
            </button>
            <div
              className={`search search-container-wrapper ${searchShow ? 'show-search' : ''}`}
              ref={searchContainerRef}
              onClick={() => {
                changeSearch(true);
                const inputEl = document.getElementById('search');
                if (inputEl) inputEl.focus();
              }}
            >
              <label htmlFor='search'><CiSearch className="search-icon" /></label>
              <form onSubmit={(e) => e.preventDefault()} className='search-form'>
                <input
                  id='search'
                  placeholder="Samsung..."
                  className={`no-menu ${searchShow ? 'show-search' : ''}`}
                  value={termoBusca}
                  onChange={(e) => {
                    setTermoBusca(e.target.value);
                    setMostrarSugestoes(true);
                  }}
                  onFocus={() => setMostrarSugestoes(true)}
                />
              </form>
            </div>
            <div onClick={() => langChanger(userLang === 'PT' ? 'FR' : userLang === 'FR' ? 'EN' : 'PT')} className="lang no-menu">
              <p>{userLang}</p>
            </div>
            <Link href={userProfile ? '/buyers' : '/login'} className="profile2 no-menu">
              {userFoto ? <img src={userFoto} alt="MB" className='image' /> : <BsPerson size={21} color='#f0f0f0' />}
            </Link>
            <div className={`hamburger ${menuAberto ? 'dark-ham' : ''}`}>
              <Hamburger toggled={menuAberto} toggle={changeMenu} size={22} />
            </div>
          </div>
        </div>

        {/* MENU MOBILE */}
        <div className={`full-menu ${menuAberto ? 'menuab' : ''}`}>
          <div className="first-part" onClick={() => changeMenu(false)} />
          <div className="second-part">
            <div className="twerk">
              <div className="menu-header">
                <h1>MB</h1>
                <p>...Feira Bandim...</p>
              </div>
              <div className="menu-section-group">
                <span className="menu-title">Configurações</span>
                <div className="primeiro">
                  <div className="menu-link-item config" onClick={themeChanger}>
                    {darktheme ? <BsMoon size={17} /> : <BsSun size={17} />}
                  </div>
                  <div className="menu-link-item config" onClick={() => setModoGrid(!modoGrid)}>
                    {!modoGrid ? <MdGridView size={17} /> : <BsListUl size={17} />}
                  </div>
                  <div className="menu-link-item config" onClick={() => langChanger(userLang === 'PT' ? 'FR' : 'PT')}>
                    <p>{userLang}</p>
                  </div>
                  <Link href={userProfile ? '/buyers' : '/login'} className="profile3">
                    {userFoto ? <div className='img-cover'><img src={userFoto} alt="MB" /></div> : <BsPerson size={21} color='#ee9660' />}
                  </Link>
                </div>
              </div>
              <div className="menu-section-group">
                <span className="menu-title">Categorias</span>
                {infoList?.map((e, i) => (
                  <div key={i} className="menu-cat-item-wrapper">
                    <div
                      className="menu-cat-btn"
                      onClick={() => {
                        if (showList === i) changeShowerList(!showerList);
                        else {
                          changeList(i);
                          changeShowerList(true);
                        }
                      }}
                    >
                      <span>{e.nome}</span>
                      <BsChevronRight size={12} className={`chevron-icon ${showerList && showList === i ? 'rotated' : ''}`} />
                    </div>
                    {showerList && showList === i && e.list?.length > 0 && (
                      <div className="menu-sublist">
                        {e.list.map((sub, idx) => (
                          <Link href={sub.link} key={idx} className="menu-sub-item" onClick={() => changeMenu(false)}>
                            {sub.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="blinkers" onClick={() => { setIaAberta(true); changeMenu(false); }}>
              <div className="ai-highlight-box">
                <div className="ai-box-header">
                  <BsRobot size={18} />
                  <label>IA de Mercado</label>
                </div>
                <p>Falar com a Clara (Preços e Economia)</p>
              </div>
              <div className="dancer first" />
              <div className="dancer second" />
              <div className="dancer third" />
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="it-select-filters-grid">
          <div className="select-group">
            <label>Tipos: </label>
            <select value={filProd} onChange={(e) => setFilProd(e.target.value)}>
              <option value="todos">Todos</option>
              {infoList.map(e => e.cat === categoria && (
                e.list?.map((l, i) => <option key={i} value={l.title}>{l.title}</option>)
              ))}
            </select>
          </div>
          <div className="select-group">
            <label>Condição: </label>
            <select value={filCond} onChange={(e) => setFilCond(e.target.value)}>
              <option value="todos">Todas</option>
              <option value="novo">Novo na Caixa</option>
              <option value="uk_usado">🇬🇧 UK Usado</option>
              <option value="2nd_mao">🔄 2ª Mão</option>
            </select>
          </div>
          <div className="select-group">
            <label>Preços: </label>
            <select value={filPrec} onChange={(e) => setFilPrec(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="ate10k">Menos de 10.000 CFA</option>
              <option value="10k_100k">10.000 - 100.000 CFA</option>
              <option value="100k_350k">100.000 - 350.000 CFA</option>
              <option value="mais350k">350.000 CFA ou Mais</option>
            </select>
          </div>
        </div>
      </header>

      {/* CLONE HEADER */}
      <header className="it-header clone">
        <div className="it-header-content">
          <div className="it-titles">
            <h1>{valor}</h1>
            <p>...Mercado direto (Bandim, Praça e Regiões)...</p>
          </div>
        </div>
        <div className="it-select-filters-grid">
          <div className="select-group"><label>Tipos: </label><select /></div>
          <div className="select-group"><label>Condição: </label><select /></div>
          <div className="select-group"><label>Preços: </label><select /></div>
        </div>
      </header>

      <main className="it-main-content">
        {carregando && produtos.length === 0 ? (
          <div className="no-results">
            <p>A carregar mercadorias do mercado...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="no-results">
            <p>Nenhuma mercadoria encontrada com estes filtros.</p>
          </div>
        ) : (
          <div className={`it-products-container ${modoGrid ? 'grid-view' : 'list-view'}`}>
            {produtosFiltrados.map((p, i) => (
              <EachProductCard key={i} categoria={categoria} p={p} />
            ))}
          </div>
        )}
      </main>

      <footer className="it-footer">
        <p>Feira Bandim &copy; 2026 - O centro digital de comércio na Guiné-Bissau.</p>
      </footer>
    </main>
  );
}