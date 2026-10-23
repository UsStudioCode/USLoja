'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { useAuthProvider } from '@/components/authcontext';
import ProductForm from '@/components/productform';

const API = 'http://localhost:5000';

export default function NovoProdutoPage() {
  const router = useRouter();
  const { userAuth, userProfile, infoList, loading: authLoading } = useAuthProvider();

  const [carregando, setCarregando] = useState(false);
  const [dadosLoja, setDadosLoja] = useState(null);
  const [carregandoLoja, setCarregandoLoja] = useState(true);

  const [produto, setProduto] = useState({
    titulo: '',
    precoMin: '',
    precoMax: '',
    condicao: 'novo',
    descricao: '',
    categoria: '',
    subcategoria: '',
  });

  // Estado das fotos — o ProductForm atualiza isto
  const [fotosProdutoFiles, setFotosProdutoFiles] = useState([]);
  const [fotosProdutoPreviews, setFotosProdutoPreviews] = useState([]);

  // Carregar dados da loja do utilizador na montagem
  useEffect(() => {
    const fetchLoja = async () => {
      const userId = userProfile?.id || userAuth;
      if (!userId) {
        setCarregandoLoja(false);
        return;
      }

      try {
        // Tentar ler primeiro do cache se disponível
        const cachedLoja = localStorage.getItem('buyer_dados_loja');
        if (cachedLoja) {
          const parsed = JSON.parse(cachedLoja);
          if (parsed && parsed.id) {
            setDadosLoja(parsed);
            setCarregandoLoja(false);
            return;
          }
        }

        const res = await fetch(`${API}/buyers/store/${userId}`);
        const data = await res.json();
        if (data.success && data.store) {
          setDadosLoja(data.store);
          localStorage.setItem('buyer_dados_loja', JSON.stringify(data.store));
        }
      } catch (err) {
        console.error('Erro ao carregar loja:', err);
      } finally {
        setCarregandoLoja(false);
      }
    };

    if (!authLoading) {
      fetchLoja();
    }
  }, [userAuth, userProfile, authLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!produto.titulo || (!produto.precoMin && !produto.precoMax)) {
      alert('Preencha o título e pelo menos um preço.');
      return;
    }
    if (!produto.categoria) {
      alert('Selecione a categoria.');
      return;
    }
    if (!dadosLoja || !dadosLoja.id) {
      alert('Precisa de ter uma loja criada.');
      router.push('/buyers/upgrade/seller');
      return;
    }

    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append('storeId', dadosLoja.id);
      formData.append('titulo', produto.titulo);
      formData.append('precoMin', produto.precoMin || '');
      formData.append('precoMax', produto.precoMax || '');
      formData.append('condicao', produto.condicao || 'novo');
      formData.append('descricao', produto.descricao || '');
      formData.append('categoria', produto.categoria || '');
      formData.append('subCategoria', produto.subcategoria || '');

      fotosProdutoFiles.forEach((file) => {
        formData.append('fotosProduto', file);
      });

      const res = await fetch(`${API}/sellers/products/new`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        alert('Produto criado com sucesso!');
        // Atualiza o cache local dos produtos da loja se necessário
        try {
          localStorage.removeItem('buyer_produtos_loja');
        } catch (_) {}
        router.replace('/buyers');
      } else {
        alert('Erro: ' + (data.comment || data.message || 'Falha'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    } finally {
      setCarregando(false);
    }
  };

  if (authLoading || carregandoLoja) {
    return <div className="p-10 text-center">A carregar dados...</div>;
  }

  return (
    <div className="painel-comprador-container" style={{ paddingBottom: 80 }}>
      <div className="secao-conta">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <button type="button" className="btn-voltar-select" onClick={() => router.back()}>
            <FiArrowLeft size={14} /> Voltar
          </button>
          <span className="badge-investidor">Adicionar Novo Produto</span>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ProductForm
            produto={produto}
            setProduto={setProduto}
            fotosProdutoFiles={fotosProdutoFiles}
            setFotosProdutoFiles={setFotosProdutoFiles}
            fotosProdutoPreviews={fotosProdutoPreviews}
            setFotosProdutoPreviews={setFotosProdutoPreviews}
            infoList={infoList}
            key={infoList.cat}
          />
          <button
            type="submit"
            className="btn-salvar"
            disabled={carregando}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <FiCheck size={16} /> {carregando ? 'A publicar...' : 'Publicar Produto na Loja'}
          </button>
        </form>
      </div>
    </div>
  );
}