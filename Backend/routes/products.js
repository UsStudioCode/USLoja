const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const mapaCategorias = {
  it: 'Telemóveis e IT',
  peixe: 'Peixes e Mariscos',
  cereais: 'Cereais e Tubérculos',
  frutas: 'Frutas e Hortaliças',
  bebidas: 'Bebidas Locais',
  carnes: 'Carnes e Aves',
  vestuario: 'Vestuário e Calçado',
  outros: 'Outros Produtos',
};

async function getProdutoComVendedor(productId) {
  const { data: produto } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (!produto) return null;

  let sellerUserId = null;
  if (produto.store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('id, user_id')
      .eq('id', produto.store_id)
      .maybeSingle();

    if (store) {
      sellerUserId = store.user_id;
    }
  }

  return { produto, sellerUserId };
}

// Função auxiliar para criar a notificação interna no dashboard ("sellers_notifications")
async function criarNotificacao({ sellerId, productId, type, message }) {
  if (!sellerId) return;
  try {
    await supabase.from('sellers_notifications').insert([{
      seller_id: sellerId,
      product_id: productId || null,
      type,
      message,
      read: false,
    }]);
  } catch (e) {
    console.error('Erro ao criar notificação:', e.message);
  }
}

// 1. Mostrar produtos disponíveis por categoria
router.get('/categorization/:categoria', async (req, res) => {
  try {
    const { categoria } = req.params;
    const categoriaReal = mapaCategorias[categoria] || categoria;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`category.ilike.%${categoriaReal}%,category.ilike.%${categoria}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    return res.json({ success: true, produtos: data || [] });
  } catch (e) {
    return res.status(500).json({ success: false, comment: e.message });
  }
});

// 2. Products summary
router.get('/summary', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('category, sub_category');

    if (error) throw error;
    return res.status(200).json({ success: true, products: products || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Notificações do vendedor
router.get('/notifications/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { data, error } = await supabase
      .from('sellers_notifications')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, notificacoes: data || [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Marcar notificações como lidas
router.post('/notifications/:sellerId/read', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { error } = await supabase
      .from('sellers_notifications')
      .update({ read: true })
      .eq('seller_id', sellerId);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: 'Notificações marcadas como lidas' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// 5. Full details de um produto
router.get('/:id/full-details', async (req, res) => {
  try {
    const productId = req.params.id;

    const [productRes, reviewsRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).maybeSingle(),
      supabase.from('user_reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false })
    ]);

    if (!productRes.data) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    const prod = productRes.data;
    const likesCount = prod.likes_user_ids ? prod.likes_user_ids.length : 0;

    return res.json({
      success: true,
      product: prod,
      metrics: {
        views_count: prod.views_count || 0,
        likes_count: likesCount,
        whatsapp_clicks: prod.whatsapp_clicks || 0
      },
      reviews: reviewsRes.data || []
    });
  } catch (err) {
    console.error('Erro em full-details:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Get só reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('user_reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ success: false, comment: error.message });
    return res.json({ success: true, reviews: data || [] });
  } catch (e) {
    return res.status(500).json({ success: false, comment: e.message });
  }
});

// 7. Registar visualizações (Views)
router.post('/interaction/view', async (req, res) => {
  try {
    const { productId } = req.body;
    const id = productId || req.body.id;

    if (!id) {
      return res.status(400).json({ success: false, comment: 'ID do produto não fornecido' });
    }

    const { data: produto } = await supabase
      .from('products')
      .select('views_count')
      .eq('id', id)
      .maybeSingle();

    if (!produto) {
      return res.status(404).json({ success: false, comment: 'Produto não encontrado' });
    }

    const newViews = (produto.views_count || 0) + 1;

    await supabase
      .from('products')
      .update({ views_count: newViews, updated_at: new Date() })
      .eq('id', id);

    return res.json({ success: true, views_count: newViews });
  } catch (e) {
    return res.status(500).json({ success: false, comment: e.message });
  }
});

// 8. Registar favoritos (Gostos) utilizando o array likes_user_ids
router.post('/interaction/favorite', async (req, res) => {
  try {
    const { productId, userId, action } = req.body;
    const id = productId || req.body.id;

    if (!userId) {
      return res.status(401).json({ success: false, comment: 'Precisa de iniciar sessão.', code: 'LOGIN_REQUIRED' });
    }
    if (!id) {
      return res.status(400).json({ success: false, comment: 'ID não fornecido' });
    }

    const ctx = await getProdutoComVendedor(id);
    if (!ctx) return res.status(404).json({ success: false, comment: 'Produto não encontrado' });

    const { produto, sellerUserId } = ctx;
    let currentLikes = produto.likes_user_ids || [];

    if (action === 'unlike') {
      currentLikes = currentLikes.filter(uid => uid !== userId);
    } else {
      if (!currentLikes.includes(userId)) {
        currentLikes.push(userId);
        await criarNotificacao({
          sellerId: sellerUserId,
          productId: id,
          type: 'like',
          message: `Alguém adicionou "${produto.title}" aos favoritos.`,
        });
      }
    }

    await supabase
      .from('products')
      .update({ likes_user_ids: currentLikes, updated_at: new Date() })
      .eq('id', id);

    return res.json({
      success: true,
      likes_count: currentLikes.length,
      liked: action !== 'unlike'
    });
  } catch (e) {
    return res.status(500).json({ success: false, comment: e.message });
  }
});

// 9. Registar cliques WhatsApp e atualizar purchased_products no perfil do utilizador
router.post('/purchases', async (req, res) => {
  const { productId, userId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, comment: 'Precisa de iniciar sessão.', code: 'LOGIN_REQUIRED' });
  }

  try {
    const ctx = await getProdutoComVendedor(productId);
    if (!ctx) return res.status(404).json({ success: false, comment: 'Produto não encontrado' });

    const { produto, sellerUserId } = ctx;
    const newWaClicks = (produto.whatsapp_clicks || 0) + 1;

    // Atualiza cliques no WhatsApp no produto
    await supabase
      .from('products')
      .update({ whatsapp_clicks: newWaClicks, updated_at: new Date() })
      .eq('id', productId);

    // Atualiza o array purchased_products do profile do utilizador, se já não existir
    const { data: profile } = await supabase
      .from('profiles')
      .select('purchased_products')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      let purchased = profile.purchased_products || [];
      if (!purchased.includes(productId)) {
        purchased.push(productId);
        await supabase
          .from('profiles')
          .update({ purchased_products: purchased })
          .eq('id', userId);
      }
    }

    if (sellerUserId) {
      await criarNotificacao({
        sellerId: sellerUserId,
        productId,
        type: 'whatsapp',
        message: `Alguém clicou no WhatsApp para o seu produto "${produto.title}".`,
      });
    }

    return res.json({ success: true, message: 'Interação de compra/WhatsApp registada com sucesso.' });
  } catch (e) {
    return res.status(500).json({ success: false, comment: e.message });
  }
});

module.exports = router;