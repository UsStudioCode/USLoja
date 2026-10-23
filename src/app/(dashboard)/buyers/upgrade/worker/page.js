'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthProvider } from '@/components/authcontext'
import { FiBriefcase, FiMapPin, FiPhone, FiCamera, FiCheck, FiArrowLeft, FiFileText, FiPlusCircle, FiDollarSign } from 'react-icons/fi'
import WorkerCard from '@/components/servicecard'
import '../../../../../styles/upgrade-worker.css'

const BAIRROS_BISSAU_E_ZONAS = [
  "Bandim", "Bairro Militar", "Plack", "Antula", "Cuntum", "Minas", "Pantom", "Beli", "Chapa", "Pefine", "Praca", "Aeronave", "Laliquene", "Belém", "Ajuda", "Safar", "Quissalá", "Bra", "Santa Luzia", "Madina", "Bôr", "Quelelé", "Santa Maria", "Bissau Velho", "Gabu", "Bafatá"
]

const PROFISSION_COMUNS = [
  { nome: "Construção & Obras", list: [{title: "Pedreiro"}, {title: "Construtor"}, {title: "Carpinteiro"}] },
  { nome: "Elétrica & Energia", list: [{title: "Eletricista"}, {title: "Técnico de Refrigeração"}] },
  { nome: "Canalização", list: [{title: "Canalizador / Encanador"}] },
  { nome: "Pintura & Acabamentos", list: [{title: "Pintor"}] },
  { nome: "Tecnologia", list: [{title: "Técnico de Informática"}, {title: "Repuração de Telemóveis"}] },
  { nome: "Outros Serviços", list: [{title: "Jardineiro"}, {title: "Mecânico"}, {title: "Costureiro / Alfaiate"}, {title: "Cabeleireiro / Barbeiro"}, {title: "Empregada Doméstica"}] }
]

export default function UpgradeWorkerPage() {
  const router = useRouter()
  const { userProfile } = useAuthProvider()
  const [loading, setLoading] = useState(false)

  const [worker, setWorker] = useState({
    title: '',
    categoria: PROFISSION_COMUNS[0].nome,
    subcategoria: PROFISSION_COMUNS[0].list[0]?.title || '',
    bairro: BAIRROS_BISSAU_E_ZONAS[0],
    addressReference: '',
    phone: '',
    description: '',
  })

  const [cvFile, setCvFile] = useState(null)

  const [sample, setSample] = useState({
    sampleTitle: '',
    samplePrice: '',
    sampleDetails: '',
  })
  const [sampleImagesFiles, setSampleImagesFiles] = useState([])
  const [sampleImagesPreviews, setSampleImagesPreviews] = useState([])

  useEffect(() => {
    if (userProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorker((prev) => ({
        ...prev,
        phone: userProfile.phone || userProfile.telefone || '',
        bairro: userProfile.bairro || BAIRROS_BISSAU_E_ZONAS[0],
        addressReference: userProfile.address_reference || userProfile.endereco || ''
      }))
    }
  }, [userProfile])

  const handleMultipleImagesChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const atuais = sampleImagesFiles || []
    const previewsAtuais = sampleImagesPreviews || []
    const espaco = Math.max(0, 5 - atuais.length)
    if (espaco === 0) {
      alert('Pode adicionar no máximo 5 fotos.')
      e.target.value = ''
      return
    }
    const aceites = files.slice(0, espaco)
    setSampleImagesFiles([...atuais, ...aceites])
    setSampleImagesPreviews([
      ...previewsAtuais,
      ...aceites.map((f) => URL.createObjectURL(f)),
    ])
    e.target.value = ''
  }

  const removerFoto = (index) => {
    const newFiles = sampleImagesFiles.filter((_, i) => i !== index)
    const newPreviews = sampleImagesPreviews.filter((_, i) => i !== index)
    setSampleImagesFiles(newFiles)
    setSampleImagesPreviews(newPreviews)
  }

  const categoriaSelecionada = PROFISSION_COMUNS.find(c => c.nome === worker.categoria)
  const subcategoriasDisponiveis = categoriaSelecionada ? categoriaSelecionada.list : []

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!worker.title || !worker.phone || !sample.sampleTitle) {
      alert('Por favor, preencha o título do serviço, telefone e o título da primeira amostra.')
      return
    }

    if (!userProfile?.id) {
      alert('Utilizador não autenticado.')
      router.replace('/login')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('userId', userProfile.id)
      formData.append('title', worker.title)
      formData.append('category', worker.categoria)
      formData.append('subCategory', worker.subcategoria)
      formData.append('bairro', worker.bairro)
      formData.append('addressReference', worker.addressReference)
      formData.append('phone', `+245 ${worker.phone.trim()}`)
      formData.append('description', worker.description)

      if (cvFile) {
        formData.append('cvFile', cvFile)
      }

      formData.append('sampleTitle', sample.sampleTitle)
      formData.append('samplePrice', sample.samplePrice ? Number(sample.samplePrice) : 0)
      formData.append('sampleDetails', sample.sampleDetails)

      if (sampleImagesFiles && sampleImagesFiles.length > 0) {
        sampleImagesFiles.forEach((file) => {
          formData.append('sampleImages', file)
        })
      }

      const res = await fetch('http://localhost:5000/workers/create', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        alert('Parabéns! Perfil de trabalhador e portefólio criados com sucesso.')
        router.replace('/buyers/account')
      } else {
        alert('Erro: ' + (data.message || data.comment || 'Erro ao processar'))
      }
    } catch (err) {
      console.error(err)
      alert('Erro de conexão com o servidor na porta 5000.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="uw-page-container">
      <div className="uw-section-box">
        <button type="button" className="uw-back-btn" onClick={() => router.back()}>
          <FiArrowLeft size={14} /> Voltar
        </button>
        <span className="uw-badge">
          Registo de Prestador de Serviços
        </span>
      </div>

      <form onSubmit={handleSubmit} className="uw-form-layout">
        
        {/* SECÇÃO 1 */}
        <div className="uw-card">
          <h3 className="uw-card-title-blue">
            <FiBriefcase /> 1. Identidade & Especialidade Profissional
          </h3>
          
          <div className="uw-form-group-col">
            <div className="uw-input-group">
              <label>Título do Seu Serviço / Profissão *</label>
              <input
                type="text"
                required
                value={worker.title}
                onChange={(e) => setWorker({ ...worker, title: e.target.value })}
                placeholder="Ex: Cuba Carpinteiro Profissional / Eletricista Geral"
                className="uw-input"
              />
            </div>

            <div className="uw-input-group">
              <label>Área de Atuação (Categoria)</label>
              <select
                className="uw-select"
                value={worker.categoria}
                onChange={(e) => {
                  const novaCat = e.target.value
                  const catObj = PROFISSION_COMUNS.find(c => c.nome === novaCat)
                  setWorker({
                    ...worker,
                    categoria: novaCat,
                    subcategoria: catObj?.list[0]?.title || ''
                  })
                }}
              >
                {PROFISSION_COMUNS.map((c, i) => (
                  <option key={i} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>

            {subcategoriasDisponiveis.length > 0 && (
              <div className="uw-input-group">
                <label>Especialidade Específica *</label>
                <select
                  className="uw-select"
                  value={worker.subcategoria}
                  onChange={(e) => setWorker({ ...worker, subcategoria: e.target.value })}
                  required
                >
                  {subcategoriasDisponiveis.map((sub, index) => (
                    <option key={index} value={sub.title}>{sub.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="uw-input-group">
              <label><FiFileText size={12} /> Descrição / Sobre Mim</label>
              <textarea
                value={worker.description}
                onChange={(e) => setWorker({ ...worker, description: e.target.value })}
                placeholder="Conte um pouco sobre a sua experiência e ferramentas que utiliza..."
                rows={2}
                className="uw-textarea"
              />
            </div>

            <div className="uw-input-group">
              <label><FiFileText size={12} /> Anexar Currículo / CV (PDF - Opcional)</label>
              <label className="uw-file-label">
                <FiFileText size={16} /> {cvFile ? cvFile.name : 'Selecionar documento PDF do CV'}
                <input type="file" accept="application/pdf" onChange={(e) => setCvFile(e.target.files[0])} hidden />
              </label>
            </div>
          </div>
        </div>

        {/* SECÇÃO 2 */}
        <div className="uw-card">
          <h3 className="uw-card-title-amber">
            <FiPlusCircle /> 2. Primeira Amostra de Trabalho (Portefólio)
          </h3>

          <div className="uw-grid-preview">
            <div className="uw-form-group-col">
              
              <div className="uw-input-group">
                <label>Título da Amostra / Projeto *</label>
                <input
                  type="text"
                  required
                  value={sample.sampleTitle}
                  onChange={(e) => setSample({ ...sample, sampleTitle: e.target.value })}
                  placeholder="Ex: Instalação de porta em madeira maciça"
                  className="uw-input"
                />
              </div>

              <div className="uw-input-group">
                <label><FiDollarSign size={12} /> Preço Estimado ou Base (CFA)</label>
                <input
                  type="number"
                  value={sample.samplePrice}
                  onChange={(e) => setSample({ ...sample, samplePrice: e.target.value })}
                  placeholder="Ex: 25000"
                  className="uw-input"
                />
              </div>

              <div className="uw-input-group">
                <label>Detalhes do Projeto</label>
                <input
                  type="text"
                  value={sample.sampleDetails}
                  onChange={(e) => setSample({ ...sample, sampleDetails: e.target.value })}
                  placeholder="Ex: Materiais usados, tempo de execução..."
                  className="uw-input"
                />
              </div>

              <div className="uw-input-group">
                <label>Fotografias do Trabalho Feito (Até 5 fotos)</label>
                <label className="uw-file-label">
                  <FiCamera size={16} /> Adicionar Fotos ({(sampleImagesPreviews || []).length} selecionadas)
                  <input type="file" accept="image/*" multiple onChange={handleMultipleImagesChange} hidden />
                </label>

                {sampleImagesPreviews && sampleImagesPreviews.length > 0 && (
                  <div className="uw-previews-row">
                    {sampleImagesPreviews.map((preview, idx) => (
                      <div key={idx} className="uw-thumb-box">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="prev" className="uw-thumb-img" />
                        <button type="button" onClick={() => removerFoto(idx)} className="uw-thumb-remove">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div>
              <span className="uw-preview-label">Pré-visualização:</span>
              <WorkerCard worker={{ ...worker, ...sample, sampleImages: sampleImagesPreviews }} />
            </div>
          </div>
        </div>

        {/* SECÇÃO 3 */}
        <div className="uw-card">
          <h3 className="uw-card-title-green">
            <FiMapPin /> 3. Localização & Contacto
          </h3>

          <div className="uw-form-group-col">
            <div className="uw-input-group">
              <label><FiPhone size={12} /> Telemóvel / WhatsApp *</label>
              <div className="uw-phone-wrapper">
                <span className="uw-phone-prefix">+245</span>
                <input
                  type="text"
                  required
                  value={worker.phone}
                  onChange={(e) => setWorker({ ...worker, phone: e.target.value })}
                  placeholder="95... ou 96..."
                  className="uw-input uw-phone-input"
                />
              </div>
            </div>

            <div className="uw-input-group">
              <label><FiMapPin size={12} /> Bairro / Zona</label>
              <select
                className="uw-select"
                value={worker.bairro}
                onChange={(e) => setWorker({ ...worker, bairro: e.target.value })}
              >
                {BAIRROS_BISSAU_E_ZONAS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="uw-input-group">
              <label>Ponto de Referência</label>
              <input
                type="text"
                value={worker.addressReference}
                onChange={(e) => setWorker({ ...worker, addressReference: e.target.value })}
                placeholder="Ex: Próximo à rotunda de Bandim"
                className="uw-input"
              />
            </div>
          </div>

          <button type="submit" className="uw-submit-btn" disabled={loading}>
            <FiCheck size={16} /> {loading ? 'A registar conta de trabalhador...' : 'Concluir e Registar como Prestador'}
          </button>
        </div>

      </form>
    </div>
  )
}