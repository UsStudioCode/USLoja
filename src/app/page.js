/* eslint-disable @next/next/no-img-element */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BsPerson} from 'react-icons/bs'
import '../styles/landing.css';
import { useAuthProvider } from '@/components/authcontext';
import { GlobalSearch } from '@/components/global';

export default function LandingPage() {
  const router = useRouter();
  const {userProfile, userFoto, userLang, langChanger, infoList, handleSearchSubmit} = useAuthProvider()

  return (
    <main className='land-full'>
      <section className="lhead-cover">
        <div className='lhead' >
          <p className="lbadge">Bandim a um clique com <span onClick={()=> router.push('/admin')} className='ia-texto'>IA</span></p>
          <h1 className="ltitle">O <span className='para-large'>Maior</span> Mercado Digital <br/> da Guiné-Bissau </h1>
          <p className="lsubtitle"> Encontre produtos por grosso, conecte-se com revendedores locais e descubra os melhores preços do dia <span className='full-screen'>, sem sair de casa.</span> </p>
          
          <div className='l-acoes-topo'>
            <Link href={userProfile? '/buyers' : 'login'} className="profile1">
              {userFoto ? <div className='img-cover'><img src={userFoto} alt="MB"/></div> : <BsPerson size={21} />}
            </Link>
            <div className="lsearch-container-box">
              <div className="lsearch">
                <GlobalSearch/>
                <button type='button' className="search-btn" onClick={handleSearchSubmit}> <div className='search-pulse-ring'></div> <p>{userLang === 'EN' ? 'Ask AI' : 'Peça IA'}</p></button>
              </div>
            </div>
          </div>

          <div className="top-line">
            <div className="confianca-tags">
              <span>Preços Reais</span>
              <span>Contacto Direto</span>
              <span className='olast'>Zero Taxas</span>
            </div>
            <div onClick={()=> langChanger(userLang=='PT'?'FR':userLang=='FR'&&userLang!='EN'&&userLang!='EN'?'EN' : 'PT')} className="lang-toggle-btn">{userLang}</div>
          </div>
        </div>
      </section>

      <section className="categorias-container">
        <div className="categorias-header">
          <h2>Explore por Categorias</h2>
          <p>Selecione o que procura</p>
        </div>
        <div className="cat-grid">
          {infoList.map((e, i) => (
            <Link key={i} href={`/public/${e.cat}`} className="cat-cube">
              <div className='cube-cover'>
                <img className="cube-icon" alt={e.nome} src={`/card/art (${i}).jpg`}/>
              </div>
              <p className="cube-text"> {e.nome}</p>
            </Link>
          ))}
        </div>
        <div className='ver-cover'>
          <Link href="/public" className='ver-btn' style={{ textDecoration: 'none' }}>Ver Mais</Link>
        </div>
      </section>

      <section>
        <Link href="/servicos" className="card-trabalho">
          <div className="trabalho-info">
            <h3><span className='de-trabalho'>Mercado de </span> Trabalho & Serviços</h3>
            <p className='texto'>Precisa de ajudantes no Bandim, pedreiros ou quer publicar uma vaga? Encontre aqui.</p>
          </div>
          <span className="trabalho-btn">Confira &rarr;</span>
        </Link>
      </section>

      <footer className="footer-orange">
        <div className="footer-content">
          <div className="footer-linha-unica">
            <span className="footer-logo">Mercado <span>Bissau</span></span>
            <span className="footer-divider">|</span>
            <span className="footer-badge-mini">Orange Digital Center</span>
          </div>
          <p className="footer-text">...Transformando o comércio local na Guiné-Bissau...</p>
        </div>
      </footer>
    </main>
  );
}

