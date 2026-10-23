'use client'

import { usePathname, useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { BsRobot, BsSend, BsX } from "react-icons/bs";

export function AI() {
  const path = usePathname();
  const params = useParams();
  const categoria = params?.categoria || 'geral';
  const [iaAberta, setIaAberta] = useState(false);
  const [menuAberto, changeMenu] = useState(false);
  const [inputTexto, setInputTexto] = useState('');
  
  const obterHoraAtual = () => {
    const agora = new Date();
    return agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [mensagens, setMensagens] = useState([
    { remetente: 'ia', 
      texto: 'Olá! Sou a Clara, pode me perguntar qualquer informação sobre o mercado e economia da Guiné-Bissau',
      hora: obterHoraAtual()
    }
  ]);
  
  const [iaACarregar, setIaACarregar] = useState(false);
  const chatBodyRef = useRef(null);

  const API = 'http://localhost:5000';

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (iaAberta) {
      scrollToBottom();
    }
  }, [iaAberta, mensagens, iaACarregar]);

  if (
    path.includes('/admin') || 
    path.includes('/buyers') || 
    path.includes('/login') || 
    path.includes('/signup') || 
    path.includes('/forgot') || 
    path === '/'
  ) return null;

  const enviarMensagemIA = async (e) => {
    e.preventDefault();
    if (!inputTexto.trim() || iaACarregar) return;
    
    const pergunta = inputTexto.trim();
    const horaEnvio = obterHoraAtual();
    const novoHist = [...mensagens, { remetente: 'utilizador', texto: pergunta, hora: horaEnvio }];
    
    setMensagens(novoHist);
    setInputTexto('');
    setIaACarregar(true);

    try {
      const res = await fetch(`${API}/ai/chat/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: `Categoria ${categoria}: ${pergunta}`, historico: novoHist }),
      });
      const data = await res.json();
      
      const respostaTexto = data.success ? data.resposta : (data.comment || 'Não consegui responder agora.');
      const horaResposta = obterHoraAtual();

      setMensagens([
        ...novoHist,
        { remetente: 'ia', texto: respostaTexto, hora: horaResposta }
      ]);
    } catch (err) {
      setMensagens([...novoHist, { remetente: 'ia', texto: 'Erro de conexão. Tenta mais tarde.', hora: obterHoraAtual() }]);
    } finally {
      setIaACarregar(false);
    }
  };

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIaAberta(!iaAberta)} 
        className={`ia-btn ${menuAberto ? 'menuAber' : ''}`} 
        aria-label="Abrir Chat com Clara IA"
      >
        <div className="ia-btn-pulse-ring"></div>
        <div className="ia-btn-content">
          <BsRobot size={22} className="ia-btn-icon" />
          <span className="ia-btn-text">Clara</span>
        </div>
      </button>

      {iaAberta && (
        <div className="ia-modal-overlay">
          <div className="ia-modal-container">
            <div className="ia-modal-header">
              <div className="ia-modal-title-group">
                <BsRobot size={20} color="#7915d7" />
                <div>
                  <h3>Clara - IA de Economia Bissau</h3>
                  <span>Especialista em Compras e Suprimentos em Bissau</span>
                </div>
              </div>
              <button type="button" className="ia-close-btn" onClick={() => setIaAberta(false)}>
                <BsX size={22} />
              </button>
            </div>

            <div className="ia-chat-body" ref={chatBodyRef}>
              {mensagens.map((msg, idx) => (
                <div key={idx} className={`ia-chat-msg ${msg.remetente}`}>
                  <p>{msg.texto}</p>
                  <span className="ia-msg-time">{msg.hora}</span>
                </div>
              ))}
              {iaACarregar && (
                <div className="ia-chat-msg ia ia-thinking-bubble">
                  <div className="ia-thinking-content">
                    <span>A pensar</span>
                    <div className="ia-typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={enviarMensagemIA} className="ia-chat-footer">
              <input 
                type="text" 
                placeholder="Ex: Quanto custa um telemóvel?" 
                value={inputTexto} 
                onChange={(e) => setInputTexto(e.target.value)} 
              />
              <button type="submit" disabled={iaACarregar}>
                <BsSend size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}