const express = require('express')
const router = express.Router()
const multer = require('multer')
const sharp = require('sharp')
const { PDFDocument } = require('pdf-lib')
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
const comprimirPdf = async (pdfBuffer) => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
    pdfDoc.setTitle('')
    pdfDoc.setAuthor('')
    pdfDoc.setSubject('')
    pdfDoc.setKeywords([])
    pdfDoc.setProducer('Sistema Interno')
    pdfDoc.setCreator('')
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true, compress: true })
    return Buffer.from(pdfBytes)
  } catch (erro) {
    console.error('Erro ao comprimir PDF, a retornar original:', erro)
    return pdfBuffer
  }
}

const uploadParaSupabaseStorage = async (fileBuffer, pasta = 'portfolio_trabalhadores', isImage = true) => {
  if (!isImage) {
    let pdfProcessado = await comprimirPdf(fileBuffer)
    const nomeFicheiro = `${pasta}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.pdf`
    const { error } = await supabase.storage
      .from('uploads')
      .upload(nomeFicheiro, pdfProcessado, { contentType: 'application/pdf', upsert: true })

    if (error) throw new Error('Erro ao enviar documento para o Storage: ' + error.message)

    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(nomeFicheiro)
    return publicUrlData.publicUrl
  }

  let qualidade = 70
  let bufferComprimido = await sharp(fileBuffer)
    .resize({ width: 800, height: 800, fit: 'inside' })
    .jpeg({ quality: qualidade })
    .toBuffer()

  while (bufferComprimido.length > 100 * 1024 && qualidade > 10) {
    qualidade -= 10
    bufferComprimido = await sharp(fileBuffer)
      .resize({ width: 800, height: 800, fit: 'inside' })
      .jpeg({ quality: qualidade })
      .toBuffer()
  }

  const nomeFicheiro = `${pasta}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`
  const { error } = await supabase.storage
    .from('uploads')
    .upload(nomeFicheiro, bufferComprimido, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new Error('Erro ao enviar imagem para o Storage: ' + error.message)

  const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(nomeFicheiro)
  return publicUrlData.publicUrl
}

const apagarFicheiroAntigo = async (urlPublica) => {
  try {
    if (!urlPublica || !urlPublica.includes('/uploads/')) return
    const partes = urlPublica.split('/uploads/')
    const caminhoFicheiro = partes[1]
    if (caminhoFicheiro) {
      await supabase.storage.from('uploads').remove([caminhoFicheiro])
    }
  } catch (err) {
    console.error('Erro ao apagar ficheiro antigo do storage:', err)
  }
}

// ==========================================
// 1. CRIAR CONTA DE SERVIÇO / REGISTO COMPLETO
// ==========================================
router.post('/create', upload.fields([{ name: 'cvFile', maxCount: 1 }, { name: 'sampleImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { userId, title, category, bairro, addressReference, phone, description, sampleTitle, samplePrice, sampleDetails, sampleCategory, sampleSubCategory } = req.body

    if (!userId || !title || !category) {
      return res.status(400).json({ success: false, message: 'Campos principais obrigatórios em falta (userId, title, category).' })
    }

    let cvUrl = null
    if (req.files && req.files['cvFile'] && req.files['cvFile'][0]) {
      cvUrl = await uploadParaSupabaseStorage(req.files['cvFile'][0].buffer, 'cvs', false)
    }

    // 1. Atualizar profiles (is_worker = true, worker_active = true)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_worker: true, worker_active: true })
      .eq('id', userId)

    if (profileError) throw profileError

    // 2. Inserir ou atualizar na tabela 'services'
    const { error: serviceError } = await supabase
      .from('services')
      .upsert({
        user_id: userId,
        title,
        category,
        bairro,
        address_reference: addressReference,
        phone,
        description,
        cv_url: cvUrl
      }, { onConflict: 'user_id' })

    if (serviceError) throw serviceError

    // 3. Inserir amostra de trabalho inicial (se enviada)
    if (req.files && req.files['sampleImage'] && req.files['sampleImage'][0] && sampleTitle) {
      const sampleImageUrl = await uploadParaSupabaseStorage(req.files['sampleImage'][0].buffer, 'portefolio_trabalhadores', true)
      await supabase.from('work_samples').insert([{
        user_id: userId,
        title: sampleTitle,
        price: samplePrice ? Number(samplePrice) : 0,
        details: sampleDetails || '',
        category: sampleCategory || category,
        sub_category: sampleSubCategory || null,
        image_url: sampleImageUrl
      }])
    }

    return res.status(200).json({ success: true, message: 'Conta de prestador de serviços criada com sucesso!' })
  } catch (error) {
    console.error('Erro ao criar conta de serviço:', error)
    return res.status(500).json({ success: false, message: error.message || 'Erro interno ao criar serviço.' })
  }
})

// ==========================================
// 2. LISTA DE SERVIDORES (Trabalhadores ativos)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*, services(*)')
      .eq('is_worker', true)
      .eq('worker_active', true)

    if (error) throw error

    const workers = (profiles || []).map((p) => {
      const serv = p.services && p.services.length > 0 ? p.services[0] : {}
      return {
        id: p.id,
        nome: p.name || 'Profissional',
        profissao: serv.title || 'Prestador de Serviços',
        zona: serv.bairro || p.bairro || 'Bissau',
        categoria: serv.category || 'construcao',
        telefone: serv.phone || '+245 95 000 0000',
        whatsapp: serv.phone || '245950000000',
        foto: p.foto || '/card/art (0).jpg',
        verificado: true,
      }
    })

    return res.json({ success: true, workers })
  } catch (err) {
    console.error('Erro ao listar servidores:', err)
    return res.status(500).json({ success: false, message: 'Erro ao carregar lista de serviços.' })
  }
})

// ==========================================
// 3. DETALHES DE CADA SERVIDOR
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('is_worker', true)
      .maybeSingle()

    if (profileError || !profile) {
      return res.status(404).json({ success: false, message: 'Serviço / Profissional desativado.' })
    }

    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', id)
      .maybeSingle()

    const { data: samples } = await supabase
      .from('work_samples')
      .select('*')
      .eq('user_id', id)

    const worker = {
      id: profile.id,
      nome: profile.name || 'Profissional',
      profissao: service?.title || 'Prestador de Serviços',
      zona: service?.bairro || profile.bairro || 'Bissau',
      categoria: service?.category || 'construcao',
      telefone: service?.phone || profile.phone || '+245 95 000 0000',
      whatsapp: service?.phone || profile.phone || '245950000000',
      foto: profile.foto || '/card/art (0).jpg',
      verificado: true,
      cvUrl: service?.cv_url || null,
      enderecoCompleto: service?.address_reference || profile.address || 'Bissau, Guiné-Bissau',
      descricao: service?.description || '',
      projetosFeitos: (samples || []).map((s) => ({
        id: s.id,
        titulo: s.title,
        preco: s.price ? `${Number(s.price).toLocaleString()} XOF` : 'Sob consulta',
        imagem: s.image_url,
        detalhes: s.details,
        categoria: s.category,
        subCategory: s.sub_category
      })),
    }

    return res.json({ success: true, worker })
  } catch (err) {
    console.error('Erro ao buscar detalhes do servidor:', err)
    return res.status(500).json({ success: false, message: 'Erro interno ao carregar detalhes.' })
  }
})

// ==========================================
// 4. UPDATE SERVICES INFO
// ==========================================
router.put('/update', upload.single('cvFile'), async (req, res) => {
  try {
    const { userId, title, category, bairro, addressReference, phone, description } = req.body

    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID do utilizador é obrigatório.' })
    }

    const { data: serviceAtual } = await supabase
      .from('services')
      .select('cv_url')
      .eq('user_id', userId)
      .maybeSingle()

    let cvUrl = serviceAtual?.cv_url
    if (req.file) {
      cvUrl = await uploadParaSupabaseStorage(req.file.buffer, 'cvs', false)
      if (serviceAtual?.cv_url) {
        await apagarFicheiroAntigo(serviceAtual.cv_url)
      }
    }

    const { error: serviceError } = await supabase
      .from('services')
      .upsert({
        user_id: userId,
        title,
        category,
        bairro,
        address_reference: addressReference,
        phone,
        description,
        cv_url: cvUrl,
      }, { onConflict: 'user_id' })

    if (serviceError) throw serviceError

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_worker: true, worker_active: true })
      .eq('id', userId)

    if (profileError) throw profileError

    return res.json({ success: true, message: 'Informações do serviço atualizadas com sucesso!' })
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return res.status(500).json({ success: false, message: error.message || 'Erro ao atualizar dados.' })
  }
})

// ==========================================
// 5. DELETE SERVICES CONTA
// ==========================================
router.delete('/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const { data: service } = await supabase
      .from('services')
      .select('cv_url')
      .eq('user_id', userId)
      .maybeSingle()

    if (service?.cv_url) {
      await apagarFicheiroAntigo(service.cv_url)
    }

    const { data: samples } = await supabase
      .from('work_samples')
      .select('image_url')
      .eq('user_id', userId)

    if (samples && samples.length > 0) {
      for (const sample of samples) {
        if (sample.image_url) await apagarFicheiroAntigo(sample.image_url)
      }
    }

    await supabase.from('work_samples').delete().eq('user_id', userId)
    await supabase.from('services').delete().eq('user_id', userId)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_worker: false, worker_active: false })
      .eq('id', userId)

    if (profileError) throw profileError

    return res.json({ success: true, message: 'Conta de serviço eliminada com sucesso!' })
  } catch (error) {
    console.error('Erro ao apagar conta de serviço:', error)
    return res.status(500).json({ success: false, message: 'Erro interno ao apagar conta.' })
  }
})

// ==========================================
// 6. UPLOAD AMOSTRAS (Portefólio)
// ==========================================
router.post('/samples/new', upload.single('foto'), async (req, res) => {
  try {
    const { userId, title, price, details, category, subCategory } = req.body

    if (!userId || !title || !price || !req.file) {
      return res.status(400).json({ success: false, message: 'Campos obrigatórios em falta: userId, title, price e foto.' })
    }

    const fotoUrl = await uploadParaSupabaseStorage(req.file.buffer, 'portefolio_trabalhadores', true)

    const { error } = await supabase.from('work_samples').insert([{
      user_id: userId,
      title,
      price: Number(price),
      details: details || '',
      category: category || null,
      sub_category: subCategory || null,
      image_url: fotoUrl,
    }])

    if (error) throw error

    return res.json({ success: true, message: 'Amostra de projeto adicionada com sucesso!' })
  } catch (err) {
    console.error('Erro ao adicionar amostra:', err)
    return res.status(500).json({ success: false, message: err.message || 'Erro ao adicionar amostra.' })
  }
})

// ==========================================
// 7. UPDATE AMOSTRAS
// ==========================================
router.put('/samples/:sampleId', upload.single('foto'), async (req, res) => {
  try {
    const { sampleId } = req.params
    const { title, price, details, category, subCategory } = req.body

    const { data: amostraAtual } = await supabase
      .from('work_samples')
      .select('image_url')
      .eq('id', sampleId)
      .single()

    let fotoUrl = amostraAtual?.image_url
    if (req.file) {
      fotoUrl = await uploadParaSupabaseStorage(req.file.buffer, 'portefolio_trabalhadores', true)
      if (amostraAtual?.image_url) {
        await apagarFicheiroAntigo(amostraAtual.image_url)
      }
    }

    const { error } = await supabase
      .from('work_samples')
      .update({
        title,
        price: price ? Number(price) : undefined,
        details,
        category,
        sub_category: subCategory,
        image_url: fotoUrl
      })
      .eq('id', sampleId)

    if (error) throw error

    return res.json({ success: true, message: 'Amostra atualizada com sucesso!' })
  } catch (err) {
    console.error('Erro ao atualizar amostra:', err)
    return res.status(500).json({ success: false, message: 'Erro ao atualizar amostra.' })
  }
})

// ==========================================
// 8. DELETE AMOSTRAS
// ==========================================
router.delete('/samples/:sampleId', async (req, res) => {
  try {
    const { sampleId } = req.params

    const { data: sample } = await supabase
      .from('work_samples')
      .select('image_url')
      .eq('id', sampleId)
      .single()

    if (sample?.image_url) {
      await apagarFicheiroAntigo(sample.image_url)
    }

    const { error } = await supabase
      .from('work_samples')
      .delete()
      .eq('id', sampleId)

    if (error) throw error

    return res.json({ success: true, message: 'Amostra apagada com sucesso!' })
  } catch (err) {
    console.error('Erro ao apagar amostra:', err)
    return res.status(500).json({ success: false, message: 'Erro ao apagar a amostra.' })
  }
})

// ==========================================
// 9. TOGGLE WORKER_ACTIVE STATUS
// ==========================================
router.patch('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { workerActive } = req.body

    const { error } = await supabase
      .from('profiles')
      .update({ worker_active: workerActive })
      .eq('id', userId)

    if (error) throw error

    return res.json({
      success: true,
      message: `Estado do trabalhador alterado para ${workerActive ? 'Ativo' : 'Inativo'}.`
    })
  } catch (err) {
    console.error('Erro ao alternar status do trabalhador:', err)
    return res.status(500).json({ success: false, message: 'Erro ao atualizar estado.' })
  }
})

module.exports = router