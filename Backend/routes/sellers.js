const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadParaSupabaseStorage = async (fileBuffer, pasta = 'produtos') => {
    let qualidade = 70;
    let bufferComprimido = await sharp(fileBuffer)
        .resize({ width: 600, height: 600, fit: 'inside' })
        .jpeg({ quality: qualidade })
        .toBuffer();

    while (bufferComprimido.length > 100 * 1024 && qualidade > 10) {
        qualidade -= 10;
        bufferComprimido = await sharp(fileBuffer)
            .resize({ width: 600, height: 600, fit: 'inside' })
            .jpeg({ quality: qualidade })
            .toBuffer();
    }

    const nomeFicheiro = `${pasta}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
    const { error } = await supabase.storage
        .from('uploads')
        .upload(nomeFicheiro, bufferComprimido, { contentType: 'image/jpeg', upsert: true });

    if (error) {
        throw new Error('Erro ao enviar imagem para o Storage: ' + error.message);
    }

    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(nomeFicheiro);
    return publicUrlData.publicUrl;
};

const apagarImagemAntiga = async (urlPublica) => {
    try {
        if (!urlPublica || !urlPublica.includes('/uploads/')) return;
        const partes = urlPublica.split('/uploads/');
        const caminhoFicheiro = partes[1];
        if (caminhoFicheiro) {
            await supabase.storage.from('uploads').remove([caminhoFicheiro]);
        }
    } catch (err) {
        console.error('Erro ao apagar imagem antiga do storage:', err);
    }
};

// 1. Upgrade Vendedor
router.post('/upgrade/seller', upload.fields([
    { name: 'fotoLoja', maxCount: 1 },
    { name: 'fotosProduto', maxCount: 5 }
]), async (req, res) => {
    try {
        const { userId, nomeLoja, categoria, bairro, pontoReferencia, telefone, descricaoLoja, produto } = req.body;
        if (!userId || !nomeLoja) {
            return res.status(400).json({ success: false, comment: 'Utilizador ou nome da loja em falta.' });
        }

        const produtoObj = typeof produto === 'string' ? JSON.parse(produto) : produto;
        let fotoLojaUrl = null;

        if (req.files && req.files['fotoLoja'] && req.files['fotoLoja'][0]) {
            fotoLojaUrl = await uploadParaSupabaseStorage(req.files['fotoLoja'][0].buffer, 'lojas');
        }

        let fotosProdutoUrls = [];
        if (req.files && req.files['fotosProduto'] && req.files['fotosProduto'].length > 0) {
            for (const file of req.files['fotosProduto']) {
                const url = await uploadParaSupabaseStorage(file.buffer, 'produtos');
                if (url) fotosProdutoUrls.push(url);
            }
        }

        // A) Inserir Loja
        const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .insert([{
                user_id: userId,
                name: nomeLoja,
                category: categoria,
                bairro: bairro,
                address_reference: pontoReferencia,
                phone: telefone,
                description: descricaoLoja,
                image_url: fotoLojaUrl,
            }])
            .select()
            .single();

        if (storeError) {
            return res.status(500).json({ success: false, comment: 'Erro ao guardar a loja: ' + storeError.message });
        }

        // B) Atualizar o perfil (campos redundantes removidos da tabela profile)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ is_seller: true, seller_active: true })
            .eq('id', userId);

        if (profileError) {
            console.error('Erro ao atualizar perfil:', profileError);
        }

        // C) Inserir Produto Inicial
        if (produtoObj && produtoObj.titulo) {
            await supabase.from('products').insert([{
                store_id: storeData.id,
                title: produtoObj.titulo,
                seller: nomeLoja,
                whatsapp: telefone,
                location: `${bairro} - ${pontoReferencia}`,
                category: produtoObj.categoria || produtoObj.productCat || null,
                sub_category: produtoObj.subcategoria || produtoObj.productSubCat || null,
                price_min: produtoObj.precoMin ? Number(produtoObj.precoMin) : null,
                price_max: produtoObj.precoMax ? Number(produtoObj.precoMax) : null,
                condition: produtoObj.condicao,
                description: produtoObj.descricao,
                image_urls: fotosProdutoUrls,
            }]);
        }

        return res.json({ success: true, message: 'Conta atualizada para Vendedor e Loja criada com sucesso!' });
    } catch (error) {
        return res.status(500).json({ success: false, comment: 'Erro interno no servidor: ' + error.message });
    }
});

// 2. Criar Novo Produto
router.post('/products/new', upload.array('fotosProduto', 5), async (req, res) => {
    try {
        const { storeId, titulo, precoMin, precoMax, condicao, descricao, categoria, subCategoria } = req.body;
        if (!storeId || !titulo) {
            return res.status(400).json({ success: false, message: 'ID da loja e título são obrigatórios.' });
        }

        const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('name, phone, bairro')
            .eq('id', storeId)
            .single();

        if (storeError || !storeData) {
            return res.status(404).json({ success: false, message: 'Loja não encontrada.' });
        }

        const fotosUrls = [];
        const files = req.files || [];
        for (const file of files) {
            const url = await uploadParaSupabaseStorage(file.buffer, 'produtos');
            if (url) fotosUrls.push(url);
        }

        const { error: insertError } = await supabase.from('products').insert([{
            store_id: storeId,
            title: titulo,
            seller: storeData.name,
            whatsapp: storeData.phone,
            location: storeData.bairro,
            price_min: precoMin ? Number(precoMin) : null,
            price_max: precoMax ? Number(precoMax) : null,
            condition: condicao,
            description: descricao,
            category: categoria || null,
            sub_category: subCategoria || null,
            image_urls: fotosUrls,
        }]);

        if (insertError) {
            return res.status(500).json({ success: false, message: 'Erro ao adicionar produto: ' + insertError.message });
        }

        return res.json({ success: true, message: 'Produto adicionado com sucesso!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erro interno ao adicionar produto.' });
    }
});

// 3. Rota Unificada do Dashboard
router.get('/dashboard-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        const { data: store } = await supabase.from('stores').select('*').eq('user_id', userId).maybeSingle();

        let products = [];
        let totalVisualizacoesProdutos = 0;

        if (store) {
            const { data: storeProducts } = await supabase.from('products').select('*').eq('store_id', store.id);
            products = storeProducts || [];
            totalVisualizacoesProdutos = products.reduce((acc, p) => acc + (p.views_count || 0), 0);
        }

        return res.json({
            success: true,
            profile: profile || { name: 'Cliente', bairro: 'Não definido', foto: '', is_seller: false, is_worker: false },
            store: store || null,
            products: products,
            stats: { totalVisualizacoesProdutos, totalFavoritosRecebidos: 0 },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erro interno ao carregar dados.' });
    }
});

// 4. Rota de Atualizar Produto
router.put('/products/update', upload.array('fotosProduto', 5), async (req, res) => {
    try {
        const { productId, title, priceMin, priceMax, condition, description, categoria, subCategoria } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, message: 'ID do produto é obrigatório.' });
        }

        const { data: produtoAtual } = await supabase
            .from('products')
            .select('image_urls')
            .eq('id', productId)
            .single();

        let imageUrls = Array.isArray(produtoAtual?.image_urls) ? [...produtoAtual.image_urls] : [];
        const files = req.files || [];
        for (const file of files) {
            const url = await uploadParaSupabaseStorage(file.buffer, 'produtos');
            if (url) imageUrls.push(url);
        }

        imageUrls = imageUrls.slice(0, 5);

        const { error } = await supabase
            .from('products')
            .update({
                title,
                price_min: priceMin ? Number(priceMin) : null,
                price_max: priceMax ? Number(priceMax) : null,
                condition,
                description,
                category: categoria || null,
                sub_category: subCategoria || null,
                image_urls: imageUrls,
            })
            .eq('id', productId);

        if (error) throw error;
        return res.json({ success: true, message: 'Produto atualizado com sucesso!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Erro ao atualizar.' });
    }
});

// 5. Rota de Apagar Produto
router.delete('/products/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { data: produto } = await supabase
            .from('products')
            .select('image_urls')
            .eq('id', productId)
            .single();

        if (produto?.image_urls) {
            for (const url of produto.image_urls) {
                await apagarImagemAntiga(url);
            }
        }

        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;

        return res.json({ success: true, message: 'Produto apagado com sucesso!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Erro ao apagar o produto.' });
    }
});

module.exports = router;