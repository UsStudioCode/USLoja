'use client'

import { FiPlusCircle, FiTag, FiFolder, FiTrash2, FiCamera } from 'react-icons/fi'
import ProductCard from '@/components/productcard'

export default function ProductForm({ infoList, produto, setProduto, fotosProdutoFiles, setFotosProdutoFiles, fotosProdutoPreviews, setFotosProdutoPreviews }) {
  
  const categoriaSelecionada = infoList.find(c => c.nome === produto.categoria)
  const subcategoriasDisponiveis = categoriaSelecionada ? categoriaSelecionada.list : []

  const handleCategoriaChange = (e) => {
    const novaCat = e.target.value
    setProduto({ ...produto, categoria: novaCat, subcategoria: '' })
  }

  const handleMultipleImagesChange = (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  const atuais = fotosProdutoFiles || [];
  const previewsAtuais = fotosProdutoPreviews || [];
  const espaco = Math.max(0, 5 - atuais.length);

  if (espaco === 0) {
    alert('Máximo de 5 fotos.');
    e.target.value = '';
    return;
  }

  const aceites = files.slice(0, espaco);
  setFotosProdutoFiles([...atuais, ...aceites]);
  setFotosProdutoPreviews([
    ...previewsAtuais,
    ...aceites.map((f) => URL.createObjectURL(f)),
  ]);
  e.target.value = '';
};

  const removerFoto = (index) => {
    const newFiles = fotosProdutoFiles.filter((_, i) => i !== index)
    const newPreviews = fotosProdutoPreviews.filter((_, i) => i !== index)
    setFotosProdutoFiles(newFiles)
    setFotosProdutoPreviews(newPreviews)
  }

  return (
    <div className="conta-card-investor">
      <h3 style={{ fontSize: '0.9rem', color: '#ff7900', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiPlusCircle /> Adicionar Informações do Produto
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '16px' }}>
        <div className="perfil-formulario" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div className="input-grupo">
            <label>Título do Produto *</label>
            <input type="text" required value={produto.titulo || ''} onChange={(e) => setProduto({ ...produto, titulo: e.target.value })} placeholder="Ex: IPhone 13 Pro Max 256GB" />
          </div>

          <div className="input-grupo">
            <label><FiFolder size={12} style={{ marginRight: '4px' }} /> Categoria Principal *</label>
            <select className="select-customizado" value={produto.categoria || ''} onChange={handleCategoriaChange} required>
              <option value="">Selecione a Categoria...</option>
              {infoList.map((cat, index) => (
                <option key={index} value={cat.nome}>{cat.nome}</option>
              ))}
            </select>
          </div>

          {subcategoriasDisponiveis.length > 0 && (
            <div className="input-grupo">
              <label><FiFolder size={12} style={{ marginRight: '4px' }} /> Categoria Específica (Subcategoria) *</label>
              <select className="select-customizado" value={produto.subcategoria || ''} onChange={(e) => setProduto({ ...produto, subcategoria: e.target.value })} required>
                <option value="">Selecione o tipo específico...</option>
                {subcategoriasDisponiveis.map((sub, index) => (
                  <option key={index} value={sub.title}>{sub.title}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="input-grupo">
              <label>Preço Mínimo (CFA)</label>
              <input type="number" value={produto.precoMin || ''} onChange={(e) => setProduto({ ...produto, precoMin: e.target.value })} placeholder="Ex: 250000" />
            </div>
            <div className="input-grupo">
              <label>Preço Máximo (Opcional)</label>
              <input type="number" value={produto.precoMax || ''} onChange={(e) => setProduto({ ...produto, precoMax: e.target.value })} placeholder="Ex: 300000" />
            </div>
          </div>

          <div className="input-grupo">
            <label><FiTag size={12} style={{ marginRight: '4px' }} /> Condição do Produto</label>
            <select className="select-customizado" value={produto.condicao || 'novo'} onChange={(e) => setProduto({ ...produto, condicao: e.target.value })}>
              <option value="novo">Novo (Na caixa)</option>
              <option value="usado_2maos">Usado (2ª Mão local)</option>
              <option value="usado_uk">Uk Usado (Importado da Europa)</option>
            </select>
          </div>

          {/* Múltiplas Fotos Input */}
          <div className="input-grupo">
            <label>Fotos do Produto (Podes escolher várias)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#1e293b', border: '1px dashed #475569', borderRadius: '8px', cursor: 'pointer', color: '#38bdf8', fontSize: '0.85rem' }}>
              <FiCamera size={16} /> Adicionar Fotos ({(fotosProdutoPreviews || []).length} selecionadas)
              <input type="file" accept="image/*" multiple onChange={handleMultipleImagesChange} hidden />
            </label>
            
            {/* Miniaturas de Pre-visualização no form */}
            {fotosProdutoPreviews && fotosProdutoPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {fotosProdutoPreviews.map((preview, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '50px', height: '50px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="prev" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                    <button type="button" onClick={() => removerFoto(idx)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiTrash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-grupo">
            <label>Descrição do Produto</label>
            <input type="text" value={produto.descricao || ''} onChange={(e) => setProduto({ ...produto, descricao: e.target.value })} placeholder="Ex: Bateria a 90%, com acessórios..." />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Pré-visualização:</label>
          <ProductCard produto={{ ...produto, fotos: fotosProdutoPreviews }} />
        </div>
      </div>
    </div>
  )
}