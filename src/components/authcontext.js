'use client'
import { createClient } from '@/utils/supabase/client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext()
const API = 'http://localhost:5000'

export function AuthProvider({ children }) {
  const supabase = createClient()
  const [userAuth, changeUserAuth] = useState(null)
  const [userProfile, changeProfile] = useState(null)
  const [userFoto, changeUserFoto] = useState(null)
  const [userLang, changeUserLang] = useState('PT')
  const [loading, changeLoad] = useState(false)
  const [darktheme, changeTheme] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiHistory, setAiHistory] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [aiConversation, setAiConversation] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const infoList = [
    { cat: 'it', nome: 'Telemóveis e IT', link: '/public/it', list: [{ title: 'Todos', link: '/public/it' }, { title: 'Telemóveis', link: '/public/it/tel' }, { title: 'Computadores', link: '/public/it/computador' }, { title: 'Acessórios', link: '/public/it/accessories' }, { title: 'Solares', link: '/public/it/solares' }] },
    { cat: 'peixe', nome: 'Peixes e Mariscos', link: '/public/peixe', list: [{ title: 'Todos', link: '/public/peixe' }, { title: 'Djafal', link: '/public/peixe' }, { title: 'Goraz', link: '/public/peixe' }, { title: 'Cassava', link: '/public/peixe' }, { title: 'Pargo', link: '/public/peixe' }, { title: 'Garoupa', link: '/public/peixe' }, { title: 'Camarão', link: '/public/peixe' }, { title: 'Lagosta', link: '/public/peixe' }, { title: 'Choco', link: '/public/peixe' }, { title: 'Peixe Seco', link: '/public/peixe' }, { title: 'Peixe Fumado', link: '/public/peixe' }] },
    { cat: 'cereais', nome: 'Cereais e Tubérculos', link: '/public/cereais', list: [{ title: 'Todos', link: '/public/cereais' }, { title: 'Farinha de milho', link: '/public/cereais' }, { title: 'Farinha de mandioca', link: '/public/cereais' }, { title: 'Farinha de trigo', link: '/public/cereais' }, { title: 'Farinha de arroz', link: '/public/cereais' }] },
    { cat: 'frutas', nome: 'Frutas e Hortaliças', link: '/public/frutas', list: [{ title: 'Todos', link: '/public/frutas' }, { title: 'Castanha de caju', link: '/public/frutas' }, { title: 'Amêndoa', link: '/public/frutas' }, { title: 'Vinho de caju', link: '/public/frutas' }, { title: 'Sumor', link: '/public/frutas' }] },
    { cat: 'bebidas', nome: 'Bebidas Locais', link: '/public/bebidas', list: [{ title: 'Todos', link: '/public/bebidas' }] },
    { cat: 'carnes', nome: 'Carnes e Aves', link: '/public/carnes', list: [{ title: 'Todos', link: '/public/carnes' }] },
    { cat: 'vestuario', nome: 'Vestuário e Calçado', link: '/public/vestuario', list: [{ title: 'Todos', link: '/public/vestuario' }] },
    { cat: 'outros', nome: 'Outros Produtos', link: '/public/outros', list: [] },
  ]

  async function themeChanger() {
    const newTheme = !darktheme
    changeTheme(newTheme)
    if (!userAuth) return
    try {
      await fetch(`${API}/buyers/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userAuth, new_theme: newTheme }),
      })
    } catch (err) {
      console.error(`Erro ao atualizar tema: ${err.message}`)
      changeTheme(!newTheme) // Reverte se falhar
    }
  }

  async function langChanger(newLang) {
    changeUserLang(newLang)
    if (!userAuth) return;

    try {
      await fetch(`${API}/buyers/lang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userAuth, lang: newLang }),
      })
    } catch (err) {
      console.error(`Erro ao atualizar idioma: ${err.message}`)
    }
  }

  const fetchAiHistory = useCallback(async (userIdToUse) => {
    if (!userIdToUse) return
    try {
      const res = await fetch(`${API}/ai/chat/sessions/${userIdToUse}`)
      const data = await res.json()
      if (data.success) {
        setAiHistory(data.sessoes || [])
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err)
    }
  }, [])

  async function abrirConversa(chatId) {
    setCurrentChatId(chatId)
    setAiConversation([])
    setIsAiModalOpen(true)
    try {
      const res = await fetch(`${API}/ai/chat/messages/${chatId}`)
      const data = await res.json()
      if (data.success) {
        setAiConversation(data.mensagens || [])
      } else {
        setCurrentChatId(null)
        setAiConversation([])
      }
    } catch (err) {
      console.error('Erro ao abrir conversa:', err)
      setCurrentChatId(null)
      setAiConversation([])
    }
  }

  function novaConsulta() {
    setCurrentChatId(null)
    setAiConversation([])
    setSearchQuery('')
    setAiAnswer('')
  }

  async function handleAskAi(queryText) {
    const textToSend = queryText || searchQuery
    if (!textToSend.trim() || aiLoading) return

    setAiLoading(true)
    setAiConversation((prev) => [...prev, { prompt: textToSend, resposta: '' }])

    try {
      const res = await fetch(`${API}/ai/chat/agente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userAuth || 'guest',
          mensagem: textToSend,
          chatId: currentChatId,
        }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.chatId) setCurrentChatId(data.chatId)
        setAiConversation((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = { prompt: textToSend, resposta: data.resposta }
          }
          return updated
        })
        setAiAnswer(data.resposta)
        if (userAuth) fetchAiHistory(userAuth)
      } else {
        throw new Error(data.comment || 'Erro ao processar')
      }
    } catch (err) {
      console.error('Erro ao consultar IA:', err)
      setAiConversation((prev) => {
        const updated = [...prev]
        if (updated.length > 0) {
          updated[updated.length - 1] = { prompt: textToSend, resposta: 'Desculpa, ocorreu um erro de conexão com o Agente de IA.' }
        }
        return updated
      })
    } finally {
      setAiLoading(false)
    }
  }

  function handleSearchSubmit(e) {
    if (e) e.preventDefault()
    setIsAiModalOpen(true)
    const textToQuery = searchQuery
    setSearchQuery('')
    handleAskAi(textToQuery)
  }

  useEffect(() => {
    async function verificarSessao() {
      changeLoad(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {changeLoad(false); return; }
        changeUserAuth(session.user.id)
        
        const res = await fetch(`${API}/buyers/profile/${session.user.id}`)
        const data = await res.json()
        
        if (data.success && data.profile) {
          changeProfile(data.profile)
          changeUserFoto(data.profile.foto)
          changeUserLang(data.profile.lang || 'PT')
          changeTheme(data.profile.dark_theme || false)
          fetchAiHistory(session.user.id)
        }
      } catch (err) {
        console.error('Erro sessão:', err)
      } finally {
        changeLoad(false)
      }
    }

    verificarSessao()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null
      changeUserAuth(newUserId)
      if (!session) {
        changeProfile(null)
        changeUserFoto(null)
        setAiHistory([])
        setAiConversation([])
        setCurrentChatId(null)
      } else {
        fetchAiHistory(newUserId)
      }
      changeLoad(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchAiHistory])

  return (
    <AuthContext.Provider
      value={{
        userAuth,
        changeUserAuth,
        userProfile,
        userFoto,
        userLang,
        darktheme,
        themeChanger,
        langChanger,
        infoList,
        loading,
        isAiModalOpen,
        setIsAiModalOpen,
        searchQuery,
        setSearchQuery,
        aiLoading,
        setAiLoading,
        aiAnswer,
        setAiAnswer,
        aiHistory,
        setAiHistory,
        currentChatId,
        aiConversation,
        setAiConversation,
        abrirConversa,
        novaConsulta,
        sidebarOpen,
        setSidebarOpen,
        handleSearchSubmit,
        handleAskAi,
      }}>
      <main className={darktheme ? 'dark-theme' : 'light-theme'}>{children}</main>
    </AuthContext.Provider>
  )
}

export const useAuthProvider = () => useContext(AuthContext)