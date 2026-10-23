const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const getSupabaseAdmin = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const supabase = getSupabaseAdmin();

async function apagarUrlsDoStorage(supabaseInstance, urls = []) {
    const paths = [];
    for (const url of urls || []) {
        if (!url || typeof url !== 'string') continue;
        const marker = '/object/public/uploads/';
        const idx = url.indexOf(marker);
        if (idx === -1) continue;
        paths.push(url.substring(idx + marker.length));
    }
    if (paths.length === 0) return;
    try {
        await supabaseInstance.storage.from('uploads').remove(paths);
    } catch (e) {
        console.error('Erro ao apagar ficheiros storage:', e.message);
    }
}

async function apagarLojaEProdutos(supabaseInstance, userId) {
    const { data: store } = await supabaseInstance
        .from('stores')
        .select('id, image_url')
        .eq('user_id', userId)
        .maybeSingle();

    if (!store) {
        await supabaseInstance
            .from('profiles')
            .update({ is_seller: false, seller_active: false })
            .eq('id', userId);
        return { apagouLoja: false };
    }

    const { data: products } = await supabaseInstance
        .from('products')
        .select('id, image_urls')
        .eq('store_id', store.id);

    const productIds = (products || []).map((p) => p.id);
    const allUrls = [];
    if (store.image_url) allUrls.push(store.image_url);
    for (const p of products || []) {
        if (Array.isArray(p.image_urls)) allUrls.push(...p.image_urls);
    }

    await apagarUrlsDoStorage(supabaseInstance, allUrls);

    if (productIds.length > 0) {
        await supabaseInstance.from('sellers_notifications').delete().in('product_id', productIds);
        await supabaseInstance.from('user_reviews').delete().in('product_id', productIds);
        await supabaseInstance.from('products').delete().eq('store_id', store.id);
    }

    await supabaseInstance.from('stores').delete().eq('id', store.id);
    await supabaseInstance
        .from('profiles')
        .update({ is_seller: false, seller_active: false })
        .eq('id', userId);

    return { apagouLoja: true, produtosApagados: productIds.length };
}

// 1. Perfil
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = getSupabaseAdmin();
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    if (!profile) {
      return res.status(404).json({ success: false, comment: "Perfil não encontrado." });
    }

    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// Adiciona esta rota no teu router do Express existente
router.post('/complete-google-profile', async (req, res) => {
  try {
    const { userId, email, userPhone } = req.body

    if (!userId || !email || !userPhone) { return res.status(400).json({ success: false, comment: 'Dados em falta.' }); }

    const cleanPhone = userPhone.replace(/\D/g, '')
    const newPassword = cleanPhone.slice(-7)

    // 1. Atualiza a password e dados no Auth de forma administrativa
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
      user_metadata: { phone: userPhone, phone_verified: true }
    })

    if (updateAuthError) {
      return res.status(400).json({ success: false, comment: updateAuthError.message });
    }

    // 2. Faz o insert direto na tabela profiles (ignora RLS com a service_role key)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email: email,
      phone: userPhone,
      name: name || '',
      foto: foto || ''
    })

    if (profileError) {
      // Se já existir por algum motivo, tentamos um update de segurança ou ignoramos se for duplicado
      if (profileError.code === '23505') {
        return res.status(200).json({ success: true, comment: 'Perfil já existe.' });
      }
      return res.status(400).json({ success: false, comment: profileError.message });
    }

    return res.status(200).json({ success: true, comment: 'Perfil criado com sucesso!' });
  } catch (err) {
    console.error('Erro no servidor:', err);
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// 2. Atualizar Perfil
router.put('/profile/update', async (req, res) => {
    try {
        const { id, name, phone, bairro, address, foto, worker_active, seller_active } = req.body;
        if (!id) { return res.status(400).json({ success: false, comment: 'ID é obrigatório.' }); }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (bairro !== undefined) updateData.bairro = bairro;
        if (address !== undefined) updateData.address = address;
        if (foto !== undefined) updateData.foto = foto;
        if (worker_active !== undefined) updateData.worker_active = worker_active;
        if (seller_active !== undefined) updateData.seller_active = seller_active;

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            return res.status(400).json({ success: false, comment: error.message });
        }

        return res.status(200).json({ success: true, profile: data[0], comment: 'Perfil atualizado com sucesso!' });
    } catch (error) {
        return res.status(500).json({ success: false, comment: error.message });
    }
});

// 3. Mudança de Tema
router.post("/theme", async (req, res) => {
  try {
    const { userId, new_theme } = req.body;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ dark_theme: new_theme })
      .eq("id", userId);

    if (error) return res.status(400).json({ success: false, comment: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// 4. Mudança de Língua
router.post("/lang", async (req, res) => {
  try {
    const { userId, lang } = req.body;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ lang: lang })
      .eq("id", userId);

    if (error) return res.status(400).json({ success: false, comment: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, comment: err.message });
  }
});

// 5. Loja do utilizador
router.get('/store/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (storeError) return res.status(400).json({ success: false, comment: storeError.message });
        if (!store) return res.status(200).json({ success: true, store: null, products: [] });

        const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', store.id);

        return res.status(200).json({ success: true, store, products: products || [] });
    } catch (error) {
        return res.status(500).json({ success: false, comment: error.message });
    }
});

// 6. Apagar Loja
router.delete('/store/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ success: false, comment: 'userId obrigatório.' });

        const result = await apagarLojaEProdutos(supabase, userId);
        return res.json({ success: true, comment: 'Loja apagada e estado de vendedor definido para false.', ...result });
    } catch (error) {
        return res.status(500).json({ success: false, comment: error.message });
    }
});

// 7. Apagar Perfil de Trabalhador/Serviço
router.delete('/worker/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ success: false, comment: 'userId obrigatório.' });

        // Apagar os services e work_samples associados ao worker
        await supabase.from('work_samples').delete().eq('user_id', userId);
        await supabase.from('services').delete().eq('user_id', userId);

        const { error } = await supabase
            .from('profiles')
            .update({ is_worker: false, worker_active: false })
            .eq('id', userId);

        if (error) return res.status(400).json({ success: false, comment: error.message });

        return res.json({ success: true, comment: 'Perfil de trabalhador removido e estado definido para false.' });
    } catch (error) {
        return res.status(500).json({ success: false, comment: error.message });
    }
});

// 8. Obter produtos por categoria
router.get('/products', async (req, res) => {
    const { category } = req.query;
    try {
        let query = supabase.from('products').select('*');
        if (category) {
            query = query.eq('category', category);
        }
        const { data: products, error } = await query;
        if (error) throw error;
        res.json({ success: true, products: products || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 9. Sugestões de Pesquisa
router.get('/search/suggestions', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, suggestions: [] });
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('title, seller, condition')
            .ilike('title', `%${q}%`)
            .limit(5);

        if (error) throw error;
        res.json({ success: true, suggestions: products || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 10. Pesquisa Direta Completa
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, products: [] });
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .ilike('title', `%${q}%`);

        if (error) throw error;
        res.json({ success: true, products: products || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;