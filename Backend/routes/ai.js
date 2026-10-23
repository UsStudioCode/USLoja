const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const genAI2 = new GoogleGenAI({ apiKey: process.env.MBISSAU_API_KEY });
const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// 1. Agente de IA
router.post('/chat/agente', async (req, res) => {
  const { id, mensagem, chatId } = req.body;
  if (!mensagem) { 
    return res.status(400).json({ success: false, error: "Mensagem vazia." });
  }

  try {
    let conversaAtual = null;
    const supabase = getSupabaseAdmin();

    // Se houver um chatId, tenta carregar a conversa existente
    if (chatId) {
      const { data } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('id', chatId)
        .maybeSingle();
      conversaAtual = data;
    }

    const historicoExistente = conversaAtual?.history || [];

    let contextoProdutos = '';
    let contextoChat = '';
    let contextoLoja = '';
    let contextoServicos = '';
    
    const promessas = [
      supabase.from('products').select('id, title, price_min, price_max, category, sub_category, description').limit(30)
        .then(({ data }) => {
          if (data && data.length > 0) {
            contextoProdutos = data.map(p => `- [ID: ${p.id}] [Produto]: ${p.title} [Lojá]: (${p.seller || 'mBissau'}) [Condition]: (${p.condition || 'Sem verifico'}) (${p.sub_category || 'Geral'}): ${p.price_min ? p.price_min + ' CFA' : 'Preço sob consulta'} ${p.price_max ? p.price_max + ' CFA' : 'Preço sob consulta'} | Link: http://localhost:3000/public/${p.category || 'others'}/${p.id}`).join('\n');
          }
        }),
      supabase.from('ai_chats').select('title')
        .then(({data})=> {
          if (data && data.length > 0){
            contextoChat = data.map(p => `Exigiu ${p.title}`).join('\n');
          }
        }),
      supabase.from('services').select('id, title, category, description').limit(30)
        .then(({ data }) => {
          if (data && data.length > 0) {
            contextoServicos = data.map(s => `- [ID: ${s.id}] [Serviço] ${s.title} (${s.category || 'Geral'})`).join('\n');
          }
        }),
      supabase.from('stores').select('name, category, bairro, description')
        .then(({data})=>{
          if (data && data.length > 0){
            contextoLoja = data.map(s=> `${s.name} é uma lojá que tem a ver com ${s.category} no ${s.bairro} com ${s.description}`).join('\n');
          }
        })
    ];

    await Promise.all(promessas);

    const baseDadosContexto = `
      ${contextoProdutos ? 'PRODUTOS DISPONÍVEIS:\n' + contextoProdutos : ''}
      ${contextoChat ? 'DEMANDAS DOS GUINEENSES:\n' + contextoChat : ''}
      ${contextoLoja ? 'LOJÁS EM MAMA GUINÉ: \n' + contextoLoja : ''}
      ${contextoServicos ? 'SERVIÇOS DISPONÍVEIS:\n' + contextoServicos : ''}
    `.trim() || 'Nenhum registo específico encontrado.';

    // Formatação limpa do histórico
    const historicoFormatado = historicoExistente.slice(-4).flatMap((h) => [
      { role: 'user', parts: [{ text: h.prompt }] },
      { role: 'model', parts: [{ text: h.resposta }] },
    ]);

    // Chamada ao Gemini
    const response = await genAI2.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [...historicoFormatado, { role: 'user', parts: [{ text: mensagem }] }],
      config: {
        temperature: 0.3,
        systemInstruction: `Você é a Clara, uma demonstradora de produtos e serviços em Guiné-Bissau. Não te introduza, porque ele já te conhencer e também eu devo te dizer que muitas negocios cadastraram seus servicos e venderam seu produtos no nosso plataforma (Mercado Bissau) 
        IDIOMA: Detete o idioma do utilizador (Português, Francês, Inglês ou Crioulo da Guiné-Bissau - Kriol) e responda obrigatoriamente no mesmo idioma. 

        ESTILO E REGRAS:
        - Fala specifica e curto a dizer quanto custa, sepcificações e pequeno detalhes dos produtos ou services disponivel com linkos (dê linkos) para produto ou servicos. Responde no lista mas nunca inventa produtos ou preços
        - Para alguem que quer comparar, mostre tabelas explicando os pros e cons dos produtos. Nunca invente produtos ou preços
        - Para alguem que não sabe qual produto ou servico escolher, dê ele aconselho e mostre eles amostras que temos e links baseado no seu orcamento. Nunca inventa produtos ou preços
        - Analise os dados do sistema abaixo para responder com precisão.
        - Para os produtos, use informaçoes disponivel online para aumentar seu explicações como, ano criado, processor, GB, batteria e tudo mais.
        - Se NÃO existir, explique de forma simpática e sugira alternativas reais presentes na lista. Nunca invente produtos ou preços.
        - Se for serviços, mostre precos e dê precos abrange para cada serviços depende do que temos no nosso banco de dados e mostre cada link.
        - Se queria saber sobre demandes e fornicimento de bens e serviçoes em Guiné-Bissau, ou unidade de consumo em Bissau, use informações ai https://guinebissau.opendataforafrica.org/opnbboe/consumer-price-index?accesskey=Icquvpb e inclua do nosso banco de dados.
        - Se for perguntas sobre investimento, dar respostas considerando taxa de inflação, emprego e desemprego, quais são os produtos bem para importar, qual serviços são bom para investir ou outros de investimento, use informações embaixo com informações online partence de Bissau e CDEAO.
        DADOS DO SISTEMA: ${baseDadosContexto}`,
      },
    });

    const respostaClara = response.text || "Desculpa, não consegui processar agora.";
    const novaMensagem = {
      timestamp: new Date().toISOString(),
      prompt: mensagem,
      resposta: respostaClara
    };

    let chatIdFinal = chatId;

    // Se o ID for 'guest', vazio ou indefinido, tratamos como NULL para guardar anonimamente na BD
    const userIdValido = (id && id !== 'guest') ? id : null;

    if (conversaAtual) {
      await supabase
        .from('ai_chats')
        .update({ 
          history: [...historicoExistente, novaMensagem],
          updated_at: new Date().toISOString()
        })
        .eq('id', conversaAtual.id);
    } else {
      const tituloGerado = mensagem.length > 25 ? mensagem.substring(0, 25) + '...' : mensagem;
      const { data: novaConversa, error: errInsert } = await supabase
        .from('ai_chats')
        .insert({ 
          user_id: userIdValido, // Fica NULL se for visitante ou o UUID se estiver logado
          title: tituloGerado, 
          history: [novaMensagem] 
        })
        .select()
        .single();
      
      if (!errInsert && novaConversa) {
        chatIdFinal = novaConversa.id;
      } else if (errInsert) {
        console.error('Erro ao inserir novo chat:', errInsert);
      }
    }

    return res.status(200).json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      resposta: respostaClara, 
      chatId: chatIdFinal 
    });

  } catch (error) {
    console.error('Erro na Clara com Gemini:', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao processar chat.' });
  }
});

// 2. Chatbot (Geral)
router.post('/chat/chatbot', async (req, res) => {
  try {
    const { id, mensagem, historico } = req.body;
    if (!mensagem) { return res.status(400).json({ success: false, comment: 'Mensagem é obrigatória.' });}

    const supabase = getSupabaseAdmin();

    const [productsRes, storesRes] = await Promise.all([
      supabase.from('products').select('id, title, location, price_min, price_max, category, condition, description').limit(50),
      supabase.from('stores').select('name, bairro, phone').limit(20),
    ]);

    const produtosEncontrados = productsRes.data || [];
    const lojasEncontradas = storesRes.data || [];

    const contextoProdutos = produtosEncontrados.length > 0
      ? produtosEncontrados.map((p) => `- ${p.title} (${p.category}, ${p.condition}): ${p.price_min || '?'}${ p.price_max ? '-' + p.price_max : ''} CFA. ${p.description || ''}`).join('\n')
      : 'Nenhum produto registado na base de dados.';

    const contextoLojas = lojasEncontradas.length > 0
      ? lojasEncontradas.map((s) => `- Loja: ${s.name} | Local: ${s.bairro || 'Bissau'}`).join('\n') 
      : 'Nenhuma loja registada.';

    const historicoFormatado = (historico || [])
      .slice(-6)
      .map((m) => ({
        role: m.remetente === 'utilizador' ? 'user' : 'model',
        parts: [{ text: m.texto }],
      }));

    const promptComContexto = `[DADOS REAIS DA BASE DE DADOS DO MERCADO BISSAU E CURTO E ESPECIFICO] PRODUTOS: ${contextoProdutos} LOJAS:${contextoLojas}[FIM DOS DADOS] Pergunta do utilizador: ${mensagem}`.trim();

    const response = await genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        ...historicoFormatado,
        { role: 'user', parts: [{ text: promptComContexto }] },
      ],
      config: {
        systemInstruction: 'Você é a "Clara", assistente de compras e investimento inteligente do Mercado Bissau. Responda em qualquer lingua que alguem pergunta de forma natural, fluida, curta e direta. É PROIBIDO usar símbolos de formatação como asteriscos, travessões, listas ou quaisquer caracteres especiais de markdown no texto. Escreve apenas em formato de parágrafos corridos normais. Baseia-te estritamente nos PRODUTOS e LOJAS fornecidos nos dados reais acima para dar preços exatos em XOF e nomes de itens disponíveis.',
      },
    });

    const textoResposta = response.text || 'Desculpa, não consegui gerar uma resposta agora.';

    if (id) {
      await Promise.all([
        supabase.from('ai_chat_history').insert({ user_id: id, message: mensagem, sender: 'utilizador' }),
        supabase.from('ai_chat_history').insert({ user_id: id, message: textoResposta, sender: 'ia' })
      ]);
    }

    return res.status(200).json({ success: true, resposta: textoResposta });
  } catch (error) {
    console.error('Erro no AI chat:', error.message);
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// 3. Chatbot (Específico ao Produto)
router.post('/chat/chatbot/product', async (req, res) => { 
  try { const { id, mensagem, model, historico } = req.body; 
    if (!mensagem) { return res.status(400).json({ success: false, comment: 'Mensagem é obrigatória.' });} 
    const supabase = getSupabaseAdmin(); 
    // 1. Buscar produtos que correspondem ao modelo/título
    const productsRes = await supabase
      .from('products')
      .select('id, title, location, price_min, price_max, category, condition, description, store_id')
      .ilike('title', `%${model || ''}%`)
      .limit(10);

    const produtosEncontrados = productsRes.data || [];
    const produtoIds = produtosEncontrados.map(p => p.id);
    const storeIds = [...new Set(produtosEncontrados.map(p => p.store_id).filter(Boolean))];

    // 2. Buscar lojas e reviews associadas aos produtos encontrados de forma segura
    const [storesRes, metricRes] = await Promise.all([
      storeIds.length > 0 ? supabase.from('stores').select('id, name, bairro, phone').in('id', storeIds) : supabase.from('stores').select('id, name, bairro, phone').limit(5),
    
      produtoIds.length > 0 ? supabase.from('user_reviews').select('product_id, rating, comment').in('product_id', produtoIds) 
        : Promise.resolve({ data: [] })
    ]);

    const lojasEncontradas = storesRes.data || []; 
    const reviewsEncontrados = metricRes.data || []; 

    const contextoProdutos = produtosEncontrados.length > 0 
      ? produtosEncontrados.map((p) => `- ${p.title} (${p.category}, ${p.condition}): Preço entre ${p.price_min || '?'} e ${p.price_max || '?'} CFA. Descrição: ${p.description || 'Sem descrição'}`).join('\n') 
      : 'Nenhum produto registado com este modelo.'; 

    const contextoLojas = lojasEncontradas.length > 0 
      ? lojasEncontradas.map((s) => `- Loja: ${s.name} | Local: ${s.bairro || 'Bissau'} | Contacto: ${s.phone || 'N/D'}`).join('\n') 
      : 'Nenhuma loja associada encontrada.'; 

    const contextoReviews = reviewsEncontrados.length > 0
      ? reviewsEncontrados.map(e => `- Experiência de comprador: Avaliação de ${e.rating} estrelas. Comentário: "${e.comment || 'Sem comentário'}"`).join('\n')
      : 'Ainda não existem avaliações reais de compradores para este modelo específico.';

    const historicoFormatado = (historico || []) 
      .slice(-6) 
      .map((m) => ({ 
        role: m.remetente === 'utilizador' ? 'user' : 'model', 
        parts: [{ text: m.texto }], 
      })); 

    const promptComContexto = `DADOS REAIS DA BASE DE DADOS DO MERCADO BISSAU E CURTO E ESPECIFICO] PRODUTOS: ${contextoProdutos} LOJAS E VENDEDORES: ${contextoLojas} EXPERIÊNCIAS REAIS DOS COMPRADORES: ${contextoReviews} [FIM DOS DADOS]. Pergunta do utilizador: ${mensagem}`.trim(); 
    const response = await genAI.models.generateContent({ 
      model: 'gemini-3.1-flash-lite', 
      contents: [ ...historicoFormatado, { role: 'user', parts: [{ text: promptComContexto }] }, ], 
      config: { systemInstruction: 'Você é a "Clara", esperta comprador no Mercado Bissau. Baseando no pergunta, seja curto e specifico, claro. Pode ser com listas, bullets ou tabelas mas nunca ** astericos ou simbolos. Depende de resposta, falar com certeza cobrindo specificaçoes, vantagens, desafios, ano de criação, orçamento, avisos sobre uso e feedback dos utilizadores. Responda em qualquer idioma de forma natural e fluida. É PROIBIDO usar fora da nossa bancos de dados. Em vez de usa ** ou simboles estranhos, pode usar tabela ou percentagem no jeito curto. No caso de perdida, existe a IA dentro de dashboard, tem mais informações', 
      }, 
    }); 

    const textoResposta = response.text || 'Desculpa, não consegui gerar uma resposta agora.'; 

    if (id) { 
      await Promise.all([ 
        supabase.from('ai_chat_history').insert({ user_id: id, message: mensagem, sender: 'utilizador' }), 
        supabase.from('ai_chat_history').insert({ user_id: id, message: textoResposta, sender: 'ia' }) 
      ]); 
    } 

    return res.status(200).json({ success: true, resposta: textoResposta }); 
  } catch (error) { 
    console.error('Erro no AI chat de produto:', error.message); 
    return res.status(500).json({ success: false, comment: error.message }); 
  } 
});

// 4. Chatbot (Específico ao Serviço / Profissional)
router.post('/chat/chatbot/service', async (req, res) => {
  try {
    const { id, mensagem, historico } = req.body;

    if (!mensagem) {return res.status(400).json({ success: false, comment: 'Mensagem é obrigatória.' });}

    const supabase = getSupabaseAdmin();
    const [workerRes, samplesRes, productsRes] = await Promise.all([
      supabase.from('services').select('*').eq('id', id).maybeSingle(),
      supabase.from('worker_samples').select('title, preco, detalhes').eq('worker_id', id).limit(10),
      supabase.from('products').select('title, price_min, price_max, category').eq('worker_id', id).limit(5)
    ]);

    const worker = workerRes.data;
    if (!worker) {return res.status(404).json({ success: false, comment: 'Profissional ou serviço não encontrado.' });}

    const amostras = samplesRes.data || [];
    const produtosServidor = productsRes.data || [];

    const contextoPerfil = `
      NOME: ${worker.nome || 'Profissional'}
      PROFISSÃO/SERVIÇO: ${worker.profissao || worker.categoria || 'Geral'}
      CATEGORIA: ${worker.categoria || 'Outros'}
      ZONA/BAIRRO: ${worker.zona || 'Bissau'}
      ENDEREÇO COMPLETO: ${worker.enderecoCompleto || 'Bissau, Guiné-Bissau'}
      HORÁRIO: ${worker.horario || 'Seg–Sáb 08:00–18:00'}
      EXPERIÊNCIA: ${worker.experiencia || 'Profissional qualificado na área.'}
      CONTACTO WHATSAPP: ${worker.whatsapp || 'N/D'}
      CUSTOS DOS SERVIÇOS: ${JSON.stringify(worker.custosServicos || [])}
      OPINIÃO DA IA DO PERFIL: ${worker.iaOpinion || 'Disponível para orçamentos e serviços.'}
    `.trim();

    const contextoAmostras = amostras.length > 0 
      ? amostras.map(s => `- Projeto/Amostra: ${s.title} | Preço: ${s.preco || 'Sob consulta'} | Detalhes: ${s.detalhes || ''}`).join('\n')
      : 'Nenhuma amostra de trabalho publicada ainda.';

    const contextoProdutos = produtosServidor.length > 0
      ? produtosServidor.map(p => `- Produto à venda: ${p.title} | Preço: ${p.price_min || 'Sob consulta'} CFA`).join('\n')
      : 'Nenhum produto à venda na loja deste profissional.';

    const historicoFormatado = (historico || [])
      .slice(-6)
      .map((m) => ({
        role: m.remetente === 'utilizador' ? 'user' : 'model',
        parts: [{ text: m.texto }],
      }));

    const promptComContexto = `[DADOS REAIS DO PROFISSIONAL NO BISSAU] PERFIL DO PRESTADOR:${contextoPerfil} AMOSTRAS DE TRABALHO:${contextoAmostras} PRODUTOS NA LOJA DO PRESTADOR:${contextoProdutos} [FIM DOS DADOS] Pergunta do utilizador: ${mensagem}`.trim();
    const response = await genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        ...historicoFormatado,
        { role: 'user', parts: [{ text: promptComContexto }] },
      ],
      config: {
        systemInstruction: 'Você é a "Clara", assistente inteligente especializada no Mercado Bissau para o perfil deste prestador de serviços específico. Responda de forma natural, fluida, curta e direta, detetando o idioma do utilizador (Português, Francês, Inglês ou Kriol). É PROIBIDO usar símbolos de formatação como asteriscos, travessões, listas ou quaisquer caracteres especiais de markdown no texto. Escreve apenas em formato de parágrafos corridos normais. Baseia-te estritamente nos dados reais do perfil, custos, horários, zona e amostras fornecidos acima para dar preços exatos em XOF, prazos e detalhes de atendimento. Nunca invente informações ou preços que não estejam nos dados.',
      },
    });

    const textoResposta = response.text || 'Desculpa, não consegui processar a resposta neste momento.';

    if (id) {
      await Promise.all([
        supabase.from('ai_chat_history').insert({ user_id: id, message: mensagem, sender: 'utilizador' }),
        supabase.from('ai_chat_history').insert({ user_id: id, message: textoResposta, sender: 'ia' })
      ]);
    }

    return res.status(200).json({ 
      success: true, 
      resposta: textoResposta,
      whatsapp: worker.whatsapp || null
    });

  } catch (error) {
    console.error('Erro no chat de serviço específico:', error.message);
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// 5. Apagar o Conversa
router.delete('/chat/agente/:chatId', async (req, res) => {
  const { chatId } = req.params;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('ai_chats')
      .delete()
      .eq('id', chatId);

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Chat eliminado com sucesso." });
  } catch (err) {
    console.error("Erro ao apagar chat:", err);
    return res.status(500).json({ success: false, error: "Erro ao eliminar chat." });
  }
});


// Pegar todos dos listos
router.get('/chat/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_chats')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) return res.status(400).json({ success: false, comment: error.message });

    const sessoes = (data || []).map((c) => ({
      chatId: c.id,
      titulo: c.title || 'Nova Conversa',
      atualizadoEm: c.updated_at,
    }));

    return res.status(200).json({ success: true, sessoes });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Buscar Chats numa Sessao
router.get('/chat/messages/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('ai_chats')
      .select('history')
      .eq('id', chatId)
      .maybeSingle();

    if (error) return res.status(400).json({ success: false, comment: error.message });
    if (!data) return res.status(404).json({ success: false, comment: 'Sessão não encontrada.' });

    return res.status(200).json({ success: true, mensagens: data.history || [] });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Sugestões Dinâmicas
router.get('/search/suggestions', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) {return res.json({ success: true, produtos: [], servicos: [], lojas: [] });}
  try {
    const supabase = getSupabaseAdmin();
    const termo = `%${q.trim()}%`;

    // Promise.all executado no BACKEND para buscar nas 3 tabelas simultaneamente
    const [prodRes, servRes, lojasRes] = await Promise.all([
      supabase.from('products')
        .select('title, category, description')
        // .or(`title.ilike.${termo},description.ilike.${termo}`)
        .limit(4),

      supabase.from('services')
        .select('title, category, description')
        // .or(`title.ilike.${termo},description.ilike.${termo}`)
        .limit(4),

      supabase.from('stores')
        .select('name, description')
        // .or(`name.ilike.${termo},description.ilike.${termo}`)
        .limit(4)
    ]);

    // Normaliza o campo 'name' das lojas para 'title' para o frontend usar sem problemas
    const lojasFormatadas = (lojasRes.data || []).map(loja => ({
      title: loja.name,
      description: loja.description
    }));

    return res.status(200).json({
      success: true,
      produtos: prodRes.data,
      servicos: servRes.data,
      lojas: lojasFormatadas
    });

  } catch (err) {
    console.error('Erro nas sugestões globais:', err.message);
    return res.status(500).json({ success: false, produtos: [], servicos: [], lojas: [] });
  }
});


module.exports = router;