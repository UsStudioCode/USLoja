'use client'
import { useState } from 'react'
import { FiSend } from 'react-icons/fi'
import { useBuyer } from '../layout'
import { useAuthProvider } from '@/components/authcontext'

export default function BuyerAIPage() {
  const { userProfile } = useAuthProvider()

  const [mensagens, setMensagens] = useState([
    {
      remetente: 'ia',
      texto: 'Olá! Sou a tua assistente de IA na Guiné-Bissau. Como posso ajudar-te hoje a encontrar produtos, comparar preços ou tirar dúvidas?',
    },
  ])
  const [entrada, setEntrada] = useState('')
  const [carregando, setCarregando] = useState(false)

  const enviarMensagem = async (e) => {
    e.preventDefault()
    if (!entrada.trim() || carregando) return

    const textoAtual = entrada
    const novaMensagemUtilizador = { remetente: 'utilizador', texto: textoAtual }
    const historicoAtualizado = [...mensagens, novaMensagemUtilizador]

    setMensagens(historicoAtualizado)
    setEntrada('')
    setCarregando(true)

    try {
      const res = await fetch('http://localhost:5000/buyers/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userProfile?.id,
          mensagem: textoAtual,
          historico: historicoAtualizado,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMensagens((prev) => [...prev, { remetente: 'ia', texto: data.resposta }])
      } else {
        setMensagens((prev) => [
          ...prev,
          { remetente: 'ia', texto: 'Desculpa, tive um problema para responder. Tenta de novo.' },
        ])
      }
    } catch (err) {
      console.error(err)
      setMensagens((prev) => [
        ...prev,
        { remetente: 'ia', texto: 'Erro de conexão. Verifica a tua internet e tenta novamente.' },
      ])
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="painel-comprador-containered">
      <div className="peca-header-banner-purple">
        <div className="purple-orb-breathing"></div>
        <div>
          <h2>Assistente IA Guiné-Bissau</h2>
          <p>Tira dúvidas sobre produtos, preços e entregas locais.</p>
        </div>
      </div>

      <div className="chat-container-curved">
        <div className="chat-mensagens">
          {mensagens.map((msg, index) => (
            <div key={index} className={`mensagem ${msg.remetente === 'utilizador' ? 'utilizador' : 'ia'}`}>
              <div className="balaio-msg">{msg.texto}</div>
            </div>
          ))}
          {carregando && (
            <div className="mensagem ia">
              <div className="balaio-msg" style={{ opacity: 0.7 }}>A pensar...</div>
            </div>
          )}
        </div>

        <form onSubmit={enviarMensagem} className="chat-input-area">
          <input
            type="text"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Escreve a tua dúvida para a IA..."
            disabled={carregando}
          />
          <button type="submit" disabled={carregando}>
            <FiSend size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}