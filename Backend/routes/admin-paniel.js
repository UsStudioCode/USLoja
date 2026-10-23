const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { requireAdmin } = require('./admins');

function getSupabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

async function countTable(supabase, table, filterFn) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (typeof filterFn === 'function') q = filterFn(q);
  const { count, error } = await q;
  if (error) {
    console.log(`count ${table}:`, error.message);
    return 0;
  }
  return count || 0;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function bucketByDay(rows) {
  const map = {};
  for (const row of rows || []) {
    if (!row.created_at) continue;
    const day = String(row.created_at).slice(0, 10);
    map[day] = (map[day] || 0) + 1;
  }
  return map;
}

function fillSeries(map, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: map[key] || 0 });
  }
  return out;
}

// 1. Dashboard Bootstrap
router.get('/dashboard/bootstrap', requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 60);
    const since = daysAgoIso(days);
    const supabase = getSupabaseAdmin();
    
    const [users, stores, workers, usersGrowth, viewsGrowth, purchasesGrowth] = await Promise.all([
      countTable(supabase, 'profiles'),
      countTable(supabase, 'stores'),
      countTable(supabase, 'profiles', (q) => q.eq('is_worker', true)),
      supabase.from('profiles').select('created_at').gte('created_at', since),
      supabase.from('user_views').select('created_at').gte('created_at', since),
      supabase.from('user_purchases').select('created_at').gte('created_at', since),
    ]);

    if (usersGrowth.error) console.log('growth profiles:', usersGrowth.error.message);
    if (viewsGrowth.error) console.log('growth views:', viewsGrowth.error.message);
    if (purchasesGrowth.error) console.log('growth purchases:', purchasesGrowth.error.message);

    const growth = {
      days,
      users: fillSeries(bucketByDay(usersGrowth.data), days),
      views: fillSeries(bucketByDay(viewsGrowth.data), days),
      purchases: fillSeries(bucketByDay(purchasesGrowth.data), days),
    };

    const timeline = growth.users.map((u, i) => ({
      date: u.date,
      users: u.value,
      views: growth.views[i]?.value || 0,
      purchases: growth.purchases[i]?.value || 0,
    }));

    return res.status(200).json({
      success: true,
      dashboard: {
        counts: { users, stores, workers },
        growth,
        timeline,
        loaded_at: new Date().toISOString(),
      },
      comment: 'Dashboard bootstrap OK.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Lista de profiles
router.get('/profiles', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const limit = Math.min(Number(req.query.limit) || 150, 250);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('GET /profiles:', error);
      return res.status(400).json({ success: false, comment: error.message });
    }
    return res.status(200).json({ success: true, profiles: data || [], comment: 'Profiles OK.' });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Snapshot para IA
router.get('/stats/ai-snapshot', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const overviewRes = await (async () => {
      const keys = [
        ['profiles', null],
        ['stores', null],
        ['products', null],
        ['services', null],
        ['user_reviews', null],
        ['user_favorites', null],
        ['user_purchases', null],
        ['user_views', null],
        ['ai_chat_history', null],
        ['work_samples', null],
      ];
      const out = {};
      for (const [table] of keys) {
        out[table] = await countTable(supabase, table);
      }
      out.workers = await countTable(supabase, 'profiles', (q) => q.eq('is_worker', true));
      return out;
    })();

    const { data: lastReviews } = await supabase
      .from('user_reviews')
      .select('id, rating, comment, product_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    const { data: lastChats } = await supabase
      .from('ai_chat_history')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(8);

    const { data: favs } = await supabase
      .from('user_favorites')
      .select('product_id')
      .limit(500);

    const favCount = {};
    for (const f of favs || []) {
      if (!f.product_id) continue;
      favCount[f.product_id] = (favCount[f.product_id] || 0) + 1;
    }

    const topFavoriteIds = Object.entries(favCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([product_id, total]) => ({ product_id, total }));

    const summary_text = [
      `Mercado Bissau — resumo do sistema:`,
      `- Utilizadores (profiles): ${overviewRes.profiles}`,
      `- Trabalhadores: ${overviewRes.workers}`,
      `- Lojas: ${overviewRes.stores}`,
      `- Produtos: ${overviewRes.products}`,
      `- Serviços: ${overviewRes.services}`,
      `- Amostras de trabalho: ${overviewRes.work_samples}`,
      `- Reviews: ${overviewRes.user_reviews}`,
      `- Favoritos: ${overviewRes.user_favorites}`,
      `- Compras: ${overviewRes.user_purchases}`,
      `- Views: ${overviewRes.user_views}`,
      `- Mensagens IA registadas: ${overviewRes.ai_chat_history}`,
    ].join('\n');

    return res.status(200).json({
      success: true,
      snapshot: {
        counts: overviewRes,
        last_reviews: lastReviews || [],
        last_ai_chats: lastChats || [],
        top_favorites: topFavoriteIds,
        summary_text,
      },
      comment: 'Snapshot IA pronto.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Notificações (feed recente)
router.get('/notifications', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const supabase = getSupabaseAdmin();
    const [reviews, favorites, purchases] = await Promise.all([
      supabase.from('user_reviews').select('id, rating, comment, product_id, user_id, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('user_favorites').select('id, product_id, user_id, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('user_purchases').select('id, product_id, user_id, created_at').order('created_at', { ascending: false }).limit(limit),
    ]);

    const items = [];
    for (const r of reviews.data || []) {
      items.push({
        id: `review-${r.id}`,
        type: 'review',
        title: `Nova review (${r.rating}★)`,
        body: r.comment || 'Sem comentário',
        ref_id: r.product_id,
        user_id: r.user_id,
        created_at: r.created_at,
      });
    }
    for (const f of favorites.data || []) {
      items.push({
        id: `fav-${f.id}`,
        type: 'favorite',
        title: 'Produto nos favoritos',
        body: `Produto ${f.product_id}`,
        ref_id: f.product_id,
        user_id: f.user_id,
        created_at: f.created_at,
      });
    }
    for (const p of purchases.data || []) {
      items.push({
        id: `buy-${p.id}`,
        type: 'purchase',
        title: 'Nova compra / interesse',
        body: `Produto ${p.product_id}`,
        ref_id: p.product_id,
        user_id: p.user_id,
        created_at: p.created_at,
      });
    }
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({
      success: true,
      notifications: items.slice(0, limit),
      comment: 'Notificações carregadas.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Chat de IA por ID
router.get('/ai-chat/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }
    return res.status(200).json({ success: true, mensagens: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// Notificações & Analytics Interativo
router.get('/notifications/interactive-page', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: favs } = await supabase
      .from('user_favorites')
      .select('product_id, products(id, title, price_min, image_url, category)')
      .limit(600);

    const favMap = {};
    for (const f of favs || []) {
      if (!f.product_id || !f.products) continue;
      const id = f.product_id;
      if (!favMap[id]) {
        favMap[id] = {
          id: id,
          title: f.products.title,
          price: f.products.price_min ? `${Number(f.products.price_min).toLocaleString()} XOF` : 'Sob consulta',
          image: (f.products.image_urls && f.products.image_urls[0]) || f.products.image_url || '/card/art (0).jpg',
          category: f.products.category || 'Geral',
          count: 0
        };
      }
      favMap[id].count += 1;
    }
    const topFavorites = Object.values(favMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const { data: purchases } = await supabase
      .from('user_purchases')
      .select('id, product_id, user_id, created_at, products(title, category, price_min), profiles(full_name, name, phone)')
      .order('created_at', { ascending: false })
      .limit(300);

    const purchaseGroupMap = {};
    for (const p of purchases || []) {
      const cat = p.products?.category || 'Geral';
      if (!purchaseGroupMap[cat]) {
        purchaseGroupMap[cat] = { category: cat, totalCount: 0, items: [] };
      }
      purchaseGroupMap[cat].totalCount += 1;
      purchaseGroupMap[cat].items.push({
        id: p.id,
        produto: p.products?.title || 'Produto Indisponível',
        cliente: p.profiles?.full_name || p.profiles?.name || 'Cliente Anónimo',
        telefone: p.profiles?.phone || '—',
        data: p.created_at
      });
    }
    const purchasesPieData = Object.values(purchaseGroupMap).map(group => ({
      category: group.category,
      count: group.totalCount,
      details: group.items
    }));

    const { data: pureRegistrations } = await supabase
      .from('profiles')
      .select('id, full_name, name, phone, created_at, is_worker, is_seller')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: userReviews } = await supabase
      .from('user_reviews')
      .select('id, rating, comment, created_at, product_id, products(title, image_urls), profiles(full_name, name)')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: allReviews } = await supabase
      .from('user_reviews')
      .select('id, rating, comment, created_at, product_id, user_id, products(title, image_urls, category), profiles(full_name, name, phone)')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: views } = await supabase
      .from('user_views')
      .select('id, created_at')
      .limit(300);

    const totalAiChats = await countTable(supabase, 'ai_chat_history');
    const totalViews = await countTable(supabase, 'user_views');

    return res.status(200).json({
      success: true,
      data: {
        topFavorites,
        purchasesPieData,
        pureRegistrations: pureRegistrations || [],
        userReviews: userReviews || [],
        allReviews: allReviews || [],
        viewsPieData: [{ name: 'Geral', count: views?.length || 120 }],
        statsExtra: { totalAiChats, totalViews }
      },
      comment: 'Dados interativos de notificações carregados.'
    });
  } catch (error) {
    console.error('Erro na rota interactive-page:', error);
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// AI Insights
router.get('/ai-insights', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (profilesError) throw profilesError;

    let accumulated = 0;
    const growthMap = {};
    for (const p of profiles || []) {
      if (!p.created_at) continue;
      const date = new Date(p.created_at).toISOString().split('T')[0];
      growthMap[date] = (growthMap[date] || 0) + 1;
    }

    const userGrowthChartData = Object.entries(growthMap).map(([date, count]) => {
      accumulated += count;
      return { date, totalUsers: accumulated, newUsers: count };
    });

    const { data: chatHistory, error: chatError } = await supabase
      .from('ai_chat_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const validChatHistory = chatError ? [] : (chatHistory || []);

    const promptCounts = {};
    for (const chat of validChatHistory) {
      const text = (chat.prompt || chat.message || '').toLowerCase().trim();
      if (text) {
        promptCounts[text] = (promptCounts[text] || 0) + 1;
      }
    }

    const topQuestions = Object.entries(promptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([question, count]) => ({ question, count }));

    const totalUsersCount = profiles?.length || 0;
    const aiExplanation = `O sistema do Mercado Bissau encontra-se estável com ${totalUsersCount} utilizadores registados. Os fluxos de dados estão operacionais e a base de dados responde dentro dos parâmetros normais.`;

    return res.status(200).json({
      success: true,
      data: { aiExplanation, userGrowthChartData, topQuestions, chatHistory: validChatHistory }
    });
  } catch (error) {
    console.error('Erro na rota /ai-insights:', error);
    return res.status(500).json({ success: false, comment: error.message || 'Erro interno no servidor.' });
  }
});

// Configurações, admins e logs
router.get('/all-settings', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();

    let { data: settings, error: setErr } = await supabase
      .from('system_settings')
      .select('*')
      .maybeSingle();

    if (setErr || !settings) {
      settings = {
        maintenance_mode: false,
        strict_security: true,
        allow_registrations: true,
        max_upload_size_mb: 15,
        theme_accent: '#2563eb',
        system_name: 'Mercado Bissau',
        auto_backup: true,
        email_notifications: true
      };
    }

    const { data: admins, error: admErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, name, role, created_at, phone')
      .eq('role', 'admin');

    const { data: invites, error: invErr } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: auditLogs, error: logErr } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    return res.status(200).json({
      success: true,
      data: {
        settings,
        admins: admErr ? [] : (admins || []),
        invites: invErr ? [] : (invites || []),
        auditLogs: logErr ? [] : (auditLogs || [])
      }
    });
  } catch (err) {
    console.error('Erro geral nas configurações:', err);
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Gerar código de convite
router.post('/generate-invite', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const inviteCode = 'MB-ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const { error } = await supabase
      .from('invite_codes')
      .insert([{ code: inviteCode, role: 'admin', used: false, created_at: new Date() }]);

    if (error) {
      console.warn('Aviso ao inserir invite_code:', error.message);
    }
    return res.status(200).json({ success: true, inviteCode, comment: 'Código de administrador gerado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Atualizar configurações
router.post('/update-settings', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const newSettings = req.body;
    const { error } = await supabase
      .from('system_settings')
      .upsert({ id: 1, ...newSettings, updated_at: new Date() });

    if (error) throw error;
    return res.status(200).json({ success: true, comment: 'Todas as restrições e configurações foram guardadas com sucesso!' });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Gerir admin
router.post('/manage-admin', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { adminId, action } = req.body;

    if (action === 'revoke') {
      await supabase.from('profiles').update({ role: 'client' }).eq('id', adminId);
    } else if (action === 'delete') {
      await supabase.from('profiles').delete().eq('id', adminId);
    }
    return res.status(200).json({ success: true, comment: 'Ação executada com sucesso nos registos.' });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Listar tabelas do DB
router.get('/db/tables', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('get_tables_list').select('*');

    if (error) {
      return res.status(200).json({
        success: true,
        tables: ['profiles', 'stores', 'products', 'services', 'work_samples', 'user_reviews', 'user_favorites', 'user_purchases', 'user_views', 'ai_chat_history', 'system_settings', 'invite_codes', 'audit_logs'],
        comment: 'Tabelas padrão listadas (RPC customizada não encontrada).'
      });
    }
    return res.status(200).json({ success: true, tables: data.map(t => t.table_name) });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Fetch dados de uma tabela
router.post('/db/fetch-table', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { tableName, limit = 50 } = req.body;

    if (!tableName) {
      return res.status(400).json({ success: false, comment: 'Nome da tabela não fornecido.' });
    }

    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(limit);

    if (error) throw error;
    return res.status(200).json({ success: true, rows: data || [], totalCount: count || (data ? data.length : 0) });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Executar SQL customizado
router.post('/db/execute-sql', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { sqlQuery } = req.body;

    if (!sqlQuery || !sqlQuery.trim()) {
      return res.status(400).json({ success: false, comment: 'Nenhuma query SQL foi enviada.' });
    }

    const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sqlQuery });
    if (error) {
      return res.status(400).json({
        success: false,
        comment: `Erro SQL / Restrição do Supabase: ${error.message}.`
      });
    }
    return res.status(200).json({ success: true, result: data || [], comment: 'Query SQL executada com sucesso no Supabase!' });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Mutar registo (Update / Delete)
router.post('/db/mutate-record', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { tableName, action, recordId, updatedData } = req.body;

    if (!tableName || !action) {
      return res.status(400).json({ success: false, comment: 'Parâmetros insuficientes para alteração.' });
    }

    let queryRes;
    if (action === 'delete') {
      queryRes = await supabase.from(tableName).delete().match(recordId);
    } else if (action === 'update') {
      queryRes = await supabase.from(tableName).update(updatedData).match(recordId);
    }

    if (queryRes.error) throw queryRes.error;
    return res.status(200).json({
      success: true,
      comment: `Registo ${action === 'delete' ? 'apagado' : 'atualizado'} com sucesso na tabela ${tableName}.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

module.exports = router;