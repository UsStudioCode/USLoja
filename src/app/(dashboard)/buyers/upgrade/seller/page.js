'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiShoppingBag, FiMapPin, FiPhone, FiCamera, FiCheck, FiArrowLeft, FiFileText } from 'react-icons/fi'
import ProductForm from '@/components/productform'
import { useAuthProvider } from '@/components/authcontext'

const BAIRROS_BISSAU_E_ZONAS = [
  "Bandim", "Bairro Militar", "Plack", "Antula", "Cuntum", "Minas", "Pantom", "Beli", "Chapa", "Pefine", "Praca", "Aeronave", "Laliquene", "Belém", "Ajuda", "Safar", "Quissalá", "Bra", "Santa Luzia", "Madina", "Bôr", "Quelelé", "Santa Maria", "Bissau Velho", "Gabu", "Bafatá",
]
const infoList = [
  { nome: 'Telemóveis e IT', list: [{title: 'Telemóveis'}, {title: 'Computadores'}, {title: 'Acessórios'}, {title: 'Solares'}] },
  { nome: 'Peixes e Mariscos', list: [{title: 'Djafal'}, {title: 'Goraz'}, {title: 'Cassava'}, {title: 'Pargo'}, {title: 'Garoupa'}, {title: 'Camarão'}, {title: 'Lagosta'}, {title: 'Choco'}, {title: 'Peixe Seco'}, {title: 'Peixe Fumado'}] },
  { nome: 'Cereais e Tubérculos', list: [{title: 'Farinha de milho'}, {title: 'Farinha de mandioca'}, {title: 'Farinha de trigo'}, {title: 'Farinha de arroz'}] },
  { nome: 'Frutas e Hortaliças', list: [{title: 'Castanha de caju'}, {title: 'Amêndoa'}, {title: 'Vinho de caju'}, {title: 'Sumor'}] },
  { nome: 'Bebidas Locais', list: [] },
  { nome: 'Carnes e Aves', list: [] },
  { nome: 'Vestuário e Calçado', list: [] },
  { nome: 'Outros Produtos', list: [] },
]

export default function UpgradeToSellerPage() {
  const router = useRouter()
  const {userProfiles } = useAuthProvider()

  const [carregando, setCarregando] = useState(false)

  const [loja, setLoja] = useState({nome: '', categoria: infoList[0].nome, bairro: BAIRROS_BISSAU_E_ZONAS[0], pontoReferencia: '', telefone: '', descricao: '', })
  const [fotoLojaFile, setFotoLojaFile] = useState(null)
  const [fotoLojaPreview, setFotoLojaPreview] = useState(null)
  const [produto, setProduto] = useState({
    titulo: '',
    categoria: infoList[0].nome, 
    subcategoria: '',
    precoMax: '',
    condicao: 'novo',
    descricao: '',
  })

  const [fotosProdutoFiles, setFotosProdutoFiles] = useState([])
  const [fotosProdutoPreviews, setFotosProdutoPreviews] = useState([])

  const handleImageChange = (e, setFile, setPreview) => {
    const file = e.target.files[0]
    if (file) {
      setFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!loja.nome || !loja.telefone || !produto.titulo || (!produto.precoMin && !produto.precoMax)) {alert('Por favor, preencha o nome da loja, telefone, e as informações principais do produto inicial.'); return }
    if (!userProfiles) {router.replace('/login'); return}
    setCarregando(true)
    try {
      const formData = new FormData()
      formData.append('userId', userProfiles.id)
      formData.append('nomeLoja', loja.nome)
      formData.append('categoria', loja.categoria)
      formData.append('bairro', loja.bairro)
      formData.append('pontoReferencia', loja.pontoReferencia)
      formData.append('telefone', `+245 ${loja.telefone.trim()}`)
      formData.append('descricaoLoja', loja.descricao)

      formData.append('produto', JSON.stringify({
      titulo: produto.titulo,
      categoria: produto.categoria,      
      subcategoria: produto.subcategoria,  
      precoMin: produto.precoMin ? Number(produto.precoMin) : null,
      precoMax: produto.precoMax ? Number(produto.precoMax) : null,
      condicao: produto.condicao,
      descricao: produto.descricao,
    }))
      if (fotoLojaFile) { formData.append('fotoLoja', fotoLojaFile) }
      if (fotosProdutoFiles && fotosProdutoFiles.length > 0) {
        fotosProdutoFiles.forEach((file) => {
          formData.append('fotosProduto', file)
        })
      }

      const res = await fetch('http://localhost:5000/sellers/upgrade/seller', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        alert('Parabéns! A tua loja e o teu primeiro produto foram criados e salvos com sucesso.')
        router.replace('/buyers');
      } else {
        alert('Erro: ' + (data.comment || data.message || 'Falha ao processar pedido'))
      }
    } catch (err) {
      console.error(err)
      alert('Erro de conexão com o servidor. Verifica se o backend na porta 5000 está ativo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="painel-comprador-container">
      <div className="secao-conta">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button type="button" className="btn-voltar-select" onClick={() => router.back()}>
            <FiArrowLeft size={14} /> Voltar
          </button>
          <span className="badge-investidor">Configuração da Loja</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SECÇÃO 1: Identidade da Loja */}
          <div className="conta-card-investor">
            <h3 style={{ fontSize: '0.9rem', color: '#38bdf8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiShoppingBag /> 1. Identidade & Visual da Loja
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div className="avatar-wrapper" style={{ width: '70px', height: '70px', position: 'relative' }}>
                {fotoLojaPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoLojaPreview} alt="Foto da Loja" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                ) : (
                  <div className="avatar-desenhado" style={{ width: '100%', height: '100%', borderRadius: '12px', background: '#334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiShoppingBag size={28} />
                  </div>
                )}
                <label className="btn-camera" style={{ cursor: 'pointer', position: 'absolute', bottom: '-4px', right: '-4px', background: '#38bdf8', padding: '4px', borderRadius: '50%', color: '#0f172a', display: 'flex' }}>
                  <FiCamera size={12} />
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageChange(e, setFotoLojaFile, setFotoLojaPreview)} />
                </label>
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem' }}>Foto da Loja / Fachada</h4>
                <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Será otimizada automaticamente (&lt;100KB)</p>
              </div>
            </div>

            <div className="perfil-formulario">
              <div className="input-grupo">
                <label>Nome da Loja *</label>
                <input type="text" required value={loja.nome} onChange={(e) => setLoja({ ...loja, nome: e.target.value })} placeholder="Ex: Boutique Elegância Bissau" />
              </div>

              <div className="input-grupo">
                <label>Categoria da Loja</label>
                <select className="select-customizado" value={loja.categoria} onChange={(e) => setLoja({ ...loja, categoria: e.target.value })}>
                  {infoList.map((c, i) => (
                    <option key={i} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="input-grupo">
                <label><FiFileText size={12} /> Descrição da Loja</label>
                <textarea value={loja.descricao} onChange={(e) => setLoja({ ...loja, descricao: e.target.value })} placeholder="Breve resumo sobre o seu negócio..." rows={2} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#fff', resize: 'vertical' }} />
              </div>
            </div>
          </div>

          {/* SECÇÃO 2: Componente do Produto com Múltiplas Fotos */}
          <ProductForm 
            infoList={infoList}
            produto={produto} 
            setProduto={setProduto} 
            fotosProdutoFiles={fotosProdutoFiles}
            setFotosProdutoFiles={setFotosProdutoFiles}
            fotosProdutoPreviews={fotosProdutoPreviews}
            setFotosProdutoPreviews={setFotosProdutoPreviews}
          />

          {/* SECÇÃO 3: Localização e Submissão */}
          <div className="conta-card-investor">
            <h3 style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiMapPin /> 3. Localização & Contacto da Loja
            </h3>

            <div className="perfil-formulario">
              <div className="input-grupo">
                <label><FiPhone size={12} /> Telemóvel / WhatsApp *</label>
                <div className="phone-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="phone-prefix" style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#94a3b8' }}>+245</span>
                  <input type="text" required value={loja.telefone} onChange={(e) => setLoja({ ...loja, telefone: e.target.value })} placeholder="95... ou 96..." style={{ borderRadius: '0 8px 8px 0' }} />
                </div>
              </div>

              <div className="input-grupo">
                <label><FiMapPin size={12} /> Bairro / Zona</label>
                <select className="select-customizado" value={loja.bairro} onChange={(e) => setLoja({ ...loja, bairro: e.target.value })}>
                  {BAIRROS_BISSAU_E_ZONAS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="input-grupo">
                <label>Ponto de Referência</label>
                <input type="text" value={loja.pontoReferencia} onChange={(e) => setLoja({ ...loja, pontoReferencia: e.target.value })} placeholder="Ex: Em frente à Paragem de Taxi" />
              </div>
            </div>

            <div className="botoes-conta" style={{ marginTop: '20px' }}>
              <button type="submit" className="btn-salvar" disabled={carregando} style={{ width: '100%', justifyContent: 'center' }}>
                <FiCheck size={16} /> {carregando ? 'A processar e guardar no Supabase...' : 'Concluir e Abrir Loja'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}