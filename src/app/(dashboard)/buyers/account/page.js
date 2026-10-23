'use client'; 
import { useState } from 'react'; 
import { useRouter } from 'next/navigation'; 
import { createClient } from '@/utils/supabase/client'; 
import { FiEdit3, FiSun, FiMoon, FiLogOut, FiBriefcase, FiShoppingBag, FiUser, FiPhone, FiMapPin, FiCheck, FiCamera, FiTrash2, FiBell } from 'react-icons/fi'; 
import { useAuthProvider } from '@/components/authcontext'; 

const BAIRROS_BISSAU_E_ZONAS = [ 
  'Bandim', 'Bairro Militar', 'Plack', 'Antula', 'Cuntum', 'Minas', 'Pantom', 'Beli', 'Chapa', 'Pefine', 'Praca', 'Aeronave', 'Laliquene', 'Belém', 'Ajuda', 'Bairro Lixeiro', 'Safar', 'Quissalá', 'Bra', 'Bor', 'Santa Luzia', 'Madina', 'Pluba', 'Nhaaga', 'Darsalam', 'Quelelé', 'Cuntum Madina', 'Cuntum Cissoco', 'Cuntum Panto', 'Santa Maria', 'Bissau Velho', 'Gabu', 'Bafatá', 'Cacheu', 'Farim', 'Mansôa', 'Bissorã', 'Bolama', 'Catió', 
]; 

const PONTOS_REFERENCIA_BISSAU = [ 
  'Próximo ao Mercado Central', 'Perto da Rotunda de Bairro Militar', 'Junto à Estação de Serviço', 'Perto do Estádio 24 de Setembro', 'Em frente à Mesquita Central', 'Perto da Igreja Católica', 'Junto à Escola / Liceu', 'Próximo ao Hospital Nacional', 'Perto da Praça Principal', 'Junto ao Porto', 
]; 

export default function BuyerAccountPage() { 
  const router = useRouter(); 
  const supabase = createClient(); 
  const { userAuth, userProfile, darktheme, themeChanger } = useAuthProvider(); 
  
  const [editando, setEditando] = useState(false); 
  const [guardando, setGuardando] = useState(false); 
  const [loadingAcao, setLoadingAcao] = useState(false); 
  const [carregandoFoto, setCarregandoFoto] = useState(false); 
  const [mostrarZonaPerigo, setMostrarZonaPerigo] = useState(false); 
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true); 

  const dadosAtuais = userProfile || {}; 
  const fotoPerfil = dadosAtuais.foto || dadosAtuais.avatar_url; 
  const telefoneLimpo = dadosAtuais.phone ? dadosAtuais.phone.replace(/^\+245\s?/, '') : ''; 

  const [nome, setNome] = useState(dadosAtuais.name || ''); 
  const [telefone, setTelefone] = useState(telefoneLimpo); 
  const [bairro, setBairro] = useState(dadosAtuais.bairro || ''); 
  const [address, setAddress] = useState(dadosAtuais.address || ''); 

  // Validação se o perfil está completo para permitir criar loja ou trabalho
  const perfilCompleto = Boolean(
    dadosAtuais.name && 
    dadosAtuais.phone && 
    dadosAtuais.bairro && 
    dadosAtuais.address
  );

  async function handleUpdate (novosDados = {}) { 
    if (!userAuth) return; 
    setGuardando(true); 
    try { 
      const telefoneFormatado = telefone ? `+245 ${telefone.trim()}` : ''; 
      const res = await fetch('http://localhost:5000/buyers/profile/update', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          id: userAuth, 
          name: nome, 
          phone: telefoneFormatado, 
          bairro: bairro, 
          address: address, 
          ...novosDados, 
        }), 
      }); 
      const data = await res.json(); 
      if (data.success) { 
        if (!novosDados.foto) alert('Perfil atualizado com sucesso!'); 
        setEditando(false); 
        window.location.reload(); 
      } else { 
        alert('Erro: ' + (data.comment || 'Não foi possível atualizar.')); 
      } 
    } catch (err) { 
      alert('Erro de conexão ao atualizar.'); 
    } finally { 
      setGuardando(false); 
    } 
  }; 

  const handleUploadFoto = async (e) => { 
    const file = e.target.files[0]; 
    if (!file || !userAuth) return; 
    setCarregandoFoto(true); 
    const reader = new FileReader(); 
    reader.readAsDataURL(file); 
    reader.onload = async () => { 
      const base64Image = reader.result; 
      try { 
        const res = await fetch('http://localhost:5000/buyers/profile/update', { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id: userAuth, foto: base64Image }), 
        }); 
        const data = await res.json(); 
        if (data.success) { 
          alert('Foto de perfil atualizada com sucesso!'); 
          window.location.reload(); 
        } else { 
          alert('Erro ao guardar foto: ' + (data.comment || 'Erro desconhecido.')); 
        } 
      } catch (err) { 
        console.error(err); 
        alert('Erro de conexão ao enviar a foto.'); 
      } finally { 
        setCarregandoFoto(false); 
      } 
    }; 
    reader.onerror = (error) => { 
      console.error(error); 
      setCarregandoFoto(false); 
      alert('Erro ao ler o ficheiro da imagem.'); 
    }; 
  }; 

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/'); 
  }; 

  const iniciaisNome = dadosAtuais.name ? dadosAtuais.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'MB'; 

  return ( 
    <div className="secao-conta buyer-account-page-wrapper"> 
      <div className="conta-card-investor"> 
        <div className="perfil-topo"> 
          <div className="avatar-wrapper"> 
            {fotoPerfil ? ( 
              // eslint-disable-next-line @next/next/no-img-element 
              <img src={fotoPerfil} alt={dadosAtuais.name} /> 
            ) : ( 
              <div className="avatar-desenhado">{iniciaisNome}</div> 
            )} 
            <input type="file" id="file-avatar" className="buyer-hidden-input" accept="image/*" onChange={handleUploadFoto} /> 
            <label htmlFor="file-avatar" className="btn-camera buyer-camera-label" title="Alterar foto"> 
              <FiCamera size={11} /> 
            </label> 
          </div> 
          <div className="perfil-titulos buyer-perfil-titulos-flex"> 
            <h2>{dadosAtuais.name || 'Meu Perfil'}</h2> 
            <p>{dadosAtuais.email || 'Utilizador autenticado'}</p> 
            {carregandoFoto && <p className="buyer-txt-atualizando-foto">A atualizar foto...</p>} 
            <div className="buyer-badges-row"> 
              <span className="badge-investidor">Comprador • Guiné-Bissau</span> 
              {dadosAtuais.is_seller && <span className="badge-investidor buyer-badge-vendedor">Vendedor</span>} 
              {dadosAtuais.is_worker && <span className="badge-investidor buyer-badge-trabalhador">Trabalhador</span>} 
            </div> 
          </div> 
        </div>  

        <div className="perfil-formulario"> 
          <div className="input-grupo"> 
            <label><FiUser size={12} /> Nome Completo</label> 
            <input type="text" value={editando ? nome : dadosAtuais.name || ''} disabled={!editando} onChange={(e) => setNome(e.target.value)} placeholder="O seu nome" /> 
          </div> 
          <div className="input-grupo"> 
            <label><FiPhone size={12} /> Telemóvel</label> 
            <div className="phone-input-wrapper"> 
              <span className="phone-prefix">+245</span> 
              <input type="text" value={editando ? telefone : telefoneLimpo} disabled={!editando} onChange={(e) => setTelefone(e.target.value)} placeholder={telefoneLimpo?? "95... ou 96..."} /> 
            </div> 
          </div> 
          <div className="input-grupo"> 
            <label><FiMapPin size={12} /> Bairro / Zona</label> 
            {editando ? ( 
              <select className="select-customizado" value={bairro} onChange={(e) => setBairro(e.target.value)}> 
                <option value="">Selecione o bairro...</option> 
                {BAIRROS_BISSAU_E_ZONAS.sort().map((b) => (<option key={b} value={b}>{b}</option>))} 
              </select> 
            ) : ( 
              <input type="text" value={dadosAtuais.bairro || 'Não definido'} disabled /> 
            )} 
          </div> 
          <div className="input-grupo"> 
            <label><FiMapPin size={12} /> Ponto de Referência</label> 
            {editando ? ( 
              <select className="select-customizado" value={address} onChange={(e) => setAddress(e.target.value)}> 
                <option value="">Selecione ponto de referência...</option> 
                {PONTOS_REFERENCIA_BISSAU.map((p) => (<option key={p} value={p}>{p}</option>))} 
              </select> 
            ) : ( 
              <input type="text" value={dadosAtuais.address || 'Não definido'} disabled /> 
            )} 
          </div> 
          <div className="botoes-conta"> 
            {editando ? ( 
              <button className="btn-salvar" onClick={() => handleUpdate()} disabled={guardando}> 
                <FiCheck size={14} /> {guardando ? 'A guardar...' : 'Guardar Alterações'} 
              </button> 
            ) : ( 
              <button className="btn-editar" onClick={() => setEditando(true)}> 
                <FiEdit3 size={14} /> Editar Informações 
              </button> 
            )} 
          </div> 
        </div> 

        {(!dadosAtuais.is_seller || !dadosAtuais.is_worker) && ( 
          <div className="upgrade-box"> 
            <h3>Expandir Experiência</h3> 
            {!perfilCompleto && (
              <p className="aviso-perfil-incompleto" style={{ fontSize: '12px', color: '#f5610b', marginBottom: '10px' }}>
                ⚠️ Deve preencher e guardar todas as informações do perfil (Nome, Telemóvel, Bairro e Ponto de Referência) antes de criar uma Loja ou Conta de Trabalhador.
              </p>
            )}
            <div className="upgrade-grid"> 
              {!dadosAtuais.is_seller && ( 
                <button 
                  onClick={() => {
                    if (!perfilCompleto) {
                      alert('Por favor, complete e guarde as suas informações pessoais abaixo antes de criar uma loja.');
                      return;
                    }
                    router.push('/buyers/upgrade/seller');
                  }} 
                  className="upgrade-card-btn"
                > 
                  <div className="upgrade-icon orange"> <FiShoppingBag size={18} /> </div> 
                  <div> 
                    <div className="upgrade-title">Criar Loja</div> 
                    <div className="upgrade-desc">Venda produtos online</div> 
                  </div> 
                </button> 
              )} 
              {!dadosAtuais.is_worker && ( 
                <button 
                  onClick={() => {
                    if (!perfilCompleto) {
                      alert('Por favor, complete e guarde as suas informações pessoais abaixo antes de criar um perfil de trabalhador.');
                      return;
                    }
                    router.push('/buyers/upgrade/worker');
                  }} 
                  className="upgrade-card-btn"
                > 
                  <div className="upgrade-icon blue"> <FiBriefcase size={18} /> </div> 
                  <div> 
                    <div className="upgrade-title">Ser Trabalhador</div> 
                    <div className="upgrade-desc">Ofereça serviços</div> 
                  </div> 
                </button> 
              )} 
            </div> 
          </div> 
        )}

        <div className="configuracoes-extras"> 
          <h3>Preferências</h3> 
          <div className="config-item"> 
            <span>Tema do Ecrã</span> 
            <button className="btn-mudar-tema-inline" onClick={themeChanger}> 
              {darktheme ? (<><FiSun size={13} /> Claro</>) : (<><FiMoon size={13} /> Escuro</>)} 
            </button> 
          </div> 
          <div className="config-item buyer-config-item-border"> 
            <span>Notificações e Alertas</span> 
            <button className="btn-mudar-tema-inline buyer-btn-notif-toggle" onClick={() => setNotificacoesAtivas(!notificacoesAtivas)}> 
              <FiBell size={13} /> {notificacoesAtivas ? 'Ativadas' : 'Desativadas'} 
            </button> 
          </div> 
        </div> 

        <div className="configuracoes-extras buyer-zone-margin-top"> 
          <div className="buyer-danger-header-row"> 
            <div> 
              <h3>Gerir ou Fechar Contas</h3> 
              <p className="buyer-danger-subtitle">Opções avançadas para fechar lojas, serviços ou a conta.</p> 
            </div> 
            <button onClick={() => setMostrarZonaPerigo(!mostrarZonaPerigo)} className="buyer-btn-toggle-danger"> 
              {mostrarZonaPerigo ? 'Ocultar Opções' : 'Mostrar Opções'} 
            </button> 
          </div> 
          {mostrarZonaPerigo && ( 
            <div className="buyer-danger-body-box"> 
              {dadosAtuais.is_seller && ( 
                <div className="buyer-danger-action-row"> 
                  <div> 
                    <span className="buyer-danger-item-title">Loja de Vendedor</span> 
                    <p className="buyer-danger-item-desc">Apaga a sua loja e produtos associados.</p> 
                  </div> 
                  <button onClick={async () => { 
                    if (!window.confirm('Tem a certeza que quer apagar a sua loja?')) return; 
                    setLoadingAcao(true); 
                    try { 
                      const res = await fetch(`http://localhost:5000/buyers/account/seller/${userAuth}`, { method: 'DELETE' }); 
                      const data = await res.json(); 
                      if (data.success) { alert('Loja eliminada!'); window.location.reload(); } 
                      else { alert(data.comment || 'Erro ao apagar loja.'); } 
                    } catch (err) { alert('Erro de conexão.'); } finally { setLoadingAcao(false); } 
                  }} disabled={loadingAcao} className="buyer-btn-danger-outline"> 
                    {loadingAcao ? 'A processar...' : 'Fechar Loja'} 
                  </button> 
                </div> 
              )} 
              {dadosAtuais.is_worker && ( 
                <div className="buyer-danger-action-row"> 
                  <div> 
                    <span className="buyer-danger-item-title">Perfil de Trabalhador</span> 
                    <p className="buyer-danger-item-desc">Remove os serviços e portefólio profissional.</p> 
                  </div> 
                  <button onClick={async () => { 
                    if (!window.confirm('Tem a certeza que quer remover o seu perfil de trabalhador?')) return; 
                    setLoadingAcao(true); 
                    try { 
                      const res = await fetch(`http://localhost:5000/workers/account/worker/${userAuth}`, { method: 'DELETE' }); 
                      const data = await res.json(); 
                      if (data.success) { alert('Perfil de trabalhador removido!'); window.location.reload(); } 
                      else { alert(data.comment || 'Erro ao apagar trabalhador.'); } 
                    } catch (err) { alert('Erro de conexão.'); } finally { setLoadingAcao(false); } 
                  }} disabled={loadingAcao} className="buyer-btn-danger-outline"> 
                    Remover Trabalhador 
                  </button> 
                </div> 
              )} 
              <div className={`buyer-danger-action-row ${dadosAtuais.is_seller || dadosAtuais.is_worker ? 'buyer-danger-border-top' : ''}`}> 
                <div> 
                  <span className="buyer-danger-complete-title">Conta Completa de Comprador</span> 
                  <p className="buyer-danger-item-desc">Encerra permanentemente a sua conta e todos os acessos.</p> 
                </div> 
                <button onClick={async () => { 
                  if (!window.confirm('ATENÇÃO: Isto vai apagar a sua conta por completo. Deseja continuar?')) return; 
                  setLoadingAcao(true); 
                  try { 
                    const res = await fetch(`http://localhost:5000/buyers/account/buyer/${userAuth}`, { method: 'DELETE' }); 
                    const data = await res.json(); 
                    if (data.success) { await supabase.auth.signOut(); alert('Conta eliminada com sucesso.'); router.push('/'); } 
                    else { alert(data.comment || 'Erro ao apagar conta.'); } 
                  } catch (err) { alert('Erro de conexão.'); } finally { setLoadingAcao(false); } 
                }} disabled={loadingAcao} className="buyer-btn-danger-solid"> 
                  <FiTrash2 size={12} /> {loadingAcao ? 'A processar...' : 'Eliminar Conta Definitiva'} 
                </button> 
              </div> 
            </div> 
          )} 
        </div> 

        <div className="logout-area"> 
          <button className="btn-logout" onClick={handleLogout}> 
            <FiLogOut size={14} /> Terminar Sessão 
          </button> 
        </div> 
      </div> 
    </div> 
  ); 
}