/* eslint-disable @next/next/no-img-element */ 
'use client' 
import Link from "next/link"; 
import { useEffect, useState, useRef } from "react"; 
import { useRouter } from "next/navigation"; 
import { BsMoon, BsPerson, BsPlusLg, BsRobot, BsShieldCheck, BsSun, BsX } from "react-icons/bs"; 
import { IoSend } from "react-icons/io5"; 
import Hamburger from "hamburger-react"; 
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm'; 
import { useAuthProvider } from "./authcontext"; 
import { AiTwotoneDelete } from "react-icons/ai"; 
import { BiMessageSquareDots } from "react-icons/bi"; 

export function AiModal() { 
  const router = useRouter(); 
  const { 
    userProfile, 
    userFoto, 
    darktheme, 
    themeChanger, 
    isAiModalOpen, 
    setIsAiModalOpen, 
    sidebarOpen, 
    setSidebarOpen, 
    currentChatId, 
    abrirConversa, 
    novaConsulta, 
    aiHistory, 
    aiConversation, 
    aiLoading, 
    handleAskAi, 
    setAiHistory, 
    setCurrentChatId, 
    setAiConversation 
  } = useAuthProvider(); 

  const [inputMessage, setInputMessage] = useState(''); 
  const [loadingStep, setLoadingStep] = useState(0); 
  const viewportRef = useRef(null); 
  const sidebarRef = useRef(null); 

  const handleOutsideClick = (e) => { 
    if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) { 
      setSidebarOpen(false); 
    } 
  }; 

  // Função para eliminar chat 
  const apagarChat = async (e, chatIdParaApagar) => { 
    e.stopPropagation(); 
    if (!confirm("Tem certeza que deseja eliminar esta conversa?")) return; 
    try { 
      const res = await fetch(`http://localhost:5000/ai/chat/agente/${chatIdParaApagar}`, { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: userProfile?.id }) 
      }); 
      const data = await res.json(); 
      if (data.success) { 
        setAiHistory(prev => prev.filter(item => item.chatId !== chatIdParaApagar)); 
        if (currentChatId === chatIdParaApagar) { 
          novaConsulta(); 
        } 
      } 
    } catch (err) { 
      console.error("Erro ao apagar chat:", err); 
    } 
  }; 

  useEffect(() => { 
    let t1, t2; 
    if (aiLoading) { 
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingStep(0); 
      t1 = setTimeout(() => setLoadingStep(1), 1500); 
      t2 = setTimeout(() => setLoadingStep(2), 3200); 
    } else { 
      setLoadingStep(0); 
    } 
    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
    }; 
  }, [aiLoading]); 

  useEffect(() => { 
    if (viewportRef.current) { 
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight; 
    } 
  }, [aiConversation, aiLoading]); 

  // Contar quantas respostas a Clara já deu nesta sessão para visitantes
  const respostasAssistenteCount = aiConversation.filter(msg => msg.resposta).length;
  const limiteAtingidoVisitante = !userProfile && respostasAssistenteCount >= 2;

  const handleFormSubmit = async (e, textOverride = null) => { 
    if (e) e.preventDefault(); 
    if (limiteAtingidoVisitante) return;
    const finalMsg = textOverride || inputMessage; 
    if (!finalMsg.trim() || aiLoading) return; 
    setInputMessage(''); 
    await handleAskAi(finalMsg); 
  }; 

  if (!isAiModalOpen) return null; 

  return ( 
    <div className={`ai-modal-wrapper ${darktheme ? 'dark-theme' : 'light-theme'}`} onClick={handleOutsideClick}> 
      {sidebarOpen && <div className="ai-sidebar-overlay" />} 
      <aside ref={sidebarRef} className={`ai-sidebar ${sidebarOpen ? 'open' : ''}`}> 
        <div className="ai-sidebar-header"> 
          <div className="ai-hamburger-wrapper"> 
            <Hamburger toggled={sidebarOpen} toggle={setSidebarOpen} size={20} /> 
          </div> 
          <div className="ai-brand-container" onClick={novaConsulta}> 
            <div className="ai-brand-logo">MB</div> 
            <div className="ai-brand-info"> 
              <span className="ai-brand-name">Clara</span> 
              <small className="ai-brand-desc">IA de Economia Bissau</small> 
            </div> 
          </div> 
        </div> 
        <div className="ai-sidebar-body"> 
          <button className="ai-new-consult-btn" onClick={novaConsulta}> 
            <BsPlusLg size={15} /> 
            <span className="ai-hide-collapsed">Nova Consulta</span> 
          </button> 
          <div className="ai-history-section"> 
            <span className="ai-hist-title ai-hide-collapsed">Histórico de Conversas</span> 
            <div className="ai-history-list-box"> 
              {userProfile ? ( 
                aiHistory.length > 0 ? ( 
                  aiHistory.map((s) => ( 
                    <div key={s.chatId} className={`ai-history-item ${currentChatId === s.chatId ? 'active' : ''}`} onClick={() => abrirConversa(s.chatId)} title={s.titulo} > 
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}> 
                        <BiMessageSquareDots size={18} className="ai-hist-ico" /> 
                        <p className="ai-hide-collapsed" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.titulo}</p> 
                      </div> 
                      <div className="ai-delete-chat-btn ai-hide-collapsed" onClick={(e) => apagarChat(e, s.chatId)} title="Eliminar Conversa"> 
                        <AiTwotoneDelete size={13} /> 
                      </div> 
                    </div> 
                  )) 
                ) : ( 
                  <p className="ai-empty-msg ai-hide-collapsed">Nenhum registo encontrado.</p> 
                ) 
              ) : ( 
                <div className="ai-guest-box ai-hide-collapsed"> 
                  <BsShieldCheck size={16} /> 
                  <p>Modo Visitante (Limite de 2 interações)</p> 
                  <Link href="/login" className="ai-guest-link">Fazer Login</Link> 
                </div> 
              )} 
            </div> 
          </div> 
        </div> 
        <div className="ai-sidebar-footer"> 
          {userProfile ? ( 
            <div className="ai-user-comms-profile" onClick={() => router.push('/login')}> 
              {userFoto ? <img src={userFoto} alt="Perfil" /> : <BsPerson size={18} />} 
              <div className="ai-user-meta ai-hide-collapsed"> 
                <span className="ai-u-name">{userProfile.name || 'Minha Conta'}</span> 
                <span className="ai-u-status">Ativo</span> 
              </div> 
            </div> 
          ) : ( 
            <Link href="/login" className="ai-sidebar-login-trigger"> 
              <BsPerson size={18} /> 
              <span className="ai-hide-collapsed">Entrar / Conta</span> 
            </Link> 
          )} 
        </div> 
      </aside> 
      <main className="ai-main-container"> 
        <header className="ai-topbar"> 
          <div className="ai-topbar-title"> 
            <div className="ai-robot-icon-wrap"><BsRobot size={15} /></div> 
            <span>Assistente Clara GB</span> 
          </div> 
          <div className="ai-topbar-actions"> 
            <button className="ai-theme-btn" onClick={() => themeChanger(!darktheme)}> 
              {darktheme ? <BsSun size={16} /> : <BsMoon size={16} />} 
            </button> 
            <button className="ai-close-modal-btn" onClick={() => setIsAiModalOpen(false)}> 
              <span>Sair</span><BsX size={20} /> 
            </button> 
          </div> 
        </header> 
        <div className="ai-viewport" ref={viewportRef}> 
          {aiConversation.length === 0 && !aiLoading ? ( 
            <div className="ai-hero-box"> 
              <div className="ai-hero-badge"><BsRobot size={28} /></div> 
              <h2>Como a Clara pode ajudar nos seus negócios hoje?</h2> 
              <p>Pergunte sobre produtos, preços em XOF ou serviços em Bissau.</p> 
              <div className="ai-chips-container"> 
                <span onClick={() => handleFormSubmit(null, 'Preço do arroz no mercado')}>🌾 Preço do Arroz</span> 
                <span onClick={() => handleFormSubmit(null, 'Peixe fresco disponível')}>🐟 Peixe e Marisco</span> 
                <span onClick={() => handleFormSubmit(null, 'Serviços de transporte')}>🚛 Serviços de Transporte</span> 
              </div> 
            </div> 
          ) : ( 
            <div className="ai-conversation-box"> 
              {aiConversation.map((msg, index) => ( 
                <div key={index} className="ai-message-group"> 
                  <div className="ai-user-bubble"> 
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}> 
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> 
                        <div className="ai-avatar">{userFoto ? <img src={userFoto} alt="U" /> : <BsPerson size={13} />}</div> 
                        <h3 style={{ margin: 0 }}>{msg.prompt}</h3> 
                      </div> 
                      {msg.timestamp && ( 
                        <span style={{ fontSize: '0.68rem', opacity: 0.7, fontWeight: 500, whiteSpace: 'nowrap' }}> 
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                        </span> 
                      )} 
                    </div> 
                  </div> 
                  {msg.resposta ? ( 
                    <div className="ai-ai-response-card"> 
                      <div className="ai-response-tag"> 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}> 
                          <BsRobot size={14} /> 
                          <span>Clara (Relatório Verificado)</span> 
                        </div> 
                        {msg.timestamp && ( 
                          <span style={{ fontSize: '0.68rem', opacity: 0.7, fontWeight: 500 }}> 
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                          </span> 
                        )} 
                      </div> 
                      <div className="ai-markdown-content"> 
                        <ReactMarkdown remarkPlugins={[remarkGfm]}> 
                          {msg.resposta} 
                        </ReactMarkdown> 
                      </div> 
                    </div> 
                  ) : ( 
                    <div className="ai-loader-container"> 
                      <div className="ai-typing-status-text"> 
                        {loadingStep === 0 && <span>Clara pensando</span>} 
                        {loadingStep === 1 && <span>A processar informação</span>} 
                        {loadingStep === 2 && <span>A organizar resposta</span>} 
                        <div className="ai-bouncing-dots"><span></span><span></span><span></span></div> 
                      </div> 
                    </div> 
                  )} 
                </div> 
              ))} 
            </div> 
          )} 
        </div> 

        <div className="ai-bottom-dock"> 
          {limiteAtingidoVisitante ? (
            <div style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-secondary, #f3f4f6)', borderRadius: '8px', width: '100%' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: '500' }}>Atingiu o limite de conversas gratuitas como visitante.</p>
              <Link href="/login" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}>
                Faça login ou crie uma conta para continuar a falar com a Clara
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => handleFormSubmit(e)} className="ai-input-wrapper"> 
              <input 
                type="text" 
                value={inputMessage} 
                onChange={(e) => setInputMessage(e.target.value)} 
                placeholder="Digite o que procura na Feira Bandim..." 
              /> 
              <button type="submit" className="ai-send-btn" disabled={!inputMessage.trim() || aiLoading}> 
                <IoSend size={16} /> 
              </button> 
            </form> 
          )}
          <span className="ai-footer-note">Comércio local inteligente — Guiné-Bissau.</span> 
        </div> 
      </main> 
    </div> 
  ); 
}