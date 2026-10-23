'use client';
import { useState, useEffect, useRef } from 'react';
import { FiBriefcase, FiChevronDown, FiChevronUp, FiPlus, FiFileText, FiDollarSign, FiX, FiEdit3, FiTrash2, FiPhone, FiMapPin } from 'react-icons/fi';
// import '../../../styles/workerdashboard.css';

const CATEGORIAS_DISPONIVEIS = [
  { valor: 'construcao', label: 'Construção e Obras', subcategorias: ['Pedreiro', 'Pintor', 'Eletricista', 'Canalizador'] },
  { valor: 'tecnologia', label: 'Tecnologia e IT', subcategorias: ['Desenvolvedor Web', 'Suporte Técnico', 'Reparação de Computadores'] },
  { valor: 'limpeza', label: 'Limpeza e Doméstica', subcategorias: ['Limpeza Residencial', 'Limpeza de Escritórios', 'Jardinagem'] },
  { valor: 'beleza', label: 'Beleza e Bem-Estar', subcategorias: ['Cabeleireiro', 'Manicura', 'Maquilhagem'] }
];

export default function FullServicesComponent({ userId, initialProfileData }) {
  const [isMounted, setIsMounted] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [dadosCompletos, setDadosCompletos] = useState(null);
  const [erro, setErro] = useState(null);
  const [modoEdicaoPerfil, setModoEdicaoPerfil] = useState(false);

  const [professionalTitle, setProfessionalTitle] = useState(initialProfileData?.professional_title || '');
  const [category, setCategory] = useState(initialProfileData?.worker_category || '');
  const [bairro, setBairro] = useState(initialProfileData?.bairro || '');
  const [addressReference, setAddressReference] = useState(initialProfileData?.address_reference || '');
  const [phone, setPhone] = useState(initialProfileData?.phone || '');
  const [description, setDescription] = useState(initialProfileData?.description || '');
  const [cvFile, setCvFile] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novosDetalhes, setNovosDetalhes] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaSubCategoria, setNovaSubCategoria] = useState('');
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [salvandoSample, setSalvandoSample] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const subcategoriasDisponiveis = CATEGORIAS_DISPONIVEIS.find(c => c.valor === novaCategoria)?.subcategorias || [];

  const carregarDetalhesRef = async () => {
    try {
      const res = await fetch(`http://localhost:5000/workers/profile-details/${userId}`);
      const data = await res.json();
      if (data.success) setDadosCompletos(data.worker);
    } catch (err) {
      console.error(err);
    }
  };

  const carregarDetalhes = async () => {
    if (dadosCompletos) {
      setExpandido(!expandido);
      return;
    }
    if (!userId) {
      setErro('ID do utilizador não encontrado.');
      return;
    }
    try {
      setCarregando(true);
      setErro(null);
      const res = await fetch(`http://localhost:5000/workers/profile-details/${userId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDadosCompletos(data.worker);
        setProfessionalTitle(data.worker.professional_title || '');
        setCategory(data.worker.worker_category || data.worker.category || '');
        setBairro(data.worker.bairro || '');
        setAddressReference(data.worker.address_reference || '');
        setPhone(data.worker.phone || '');
        setDescription(data.worker.description || '');
        setExpandido(true);
      } else {
        setErro(data.message || 'Não foi possível carregar os detalhes.');
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes:', err);
      setErro('Erro de conexão ao carregar os dados.');
    } finally {
      setCarregando(false);
    }
  };

  const handleAtualizarPerfil = async (e) => {
    e.preventDefault();
    try {
      setSalvandoPerfil(true);
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('professionalTitle', professionalTitle);
      formData.append('category', category);
      formData.append('bairro', bairro);
      formData.append('addressReference', addressReference);
      formData.append('phone', phone);
      formData.append('description', description);
      if (cvFile) formData.append('cvFile', cvFile);

      const res = await fetch('http://localhost:5000/workers/profile/update', {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('Perfil e dados atualizados com sucesso!');
        setModoEdicaoPerfil(false);
        setCvFile(null);
        carregarDetalhesRef();
      } else {
        alert(data.message || 'Erro ao atualizar perfil.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao atualizar perfil.');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleSalvarSample = async (e) => {
    e.preventDefault();
    if (!arquivoFoto || !novoTitulo || !novoPreco || !novosDetalhes || !novaCategoria) {
      alert('Por favor, preencha todos os campos obrigatórios, incluindo a categoria e a foto.');
      return;
    }
    try {
      setSalvandoSample(true);
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('title', novoTitulo);
      formData.append('price', novoPreco);
      formData.append('details', novosDetalhes);
      formData.append('category', novaCategoria);
      formData.append('subCategory', novaSubCategoria);
      formData.append('foto', arquivoFoto);

      const res = await fetch('http://localhost:5000/workers/samples/new', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('Amostra adicionada com sucesso!');
        setModalAberto(false);
        setNovoTitulo('');
        setNovoPreco('');
        setNovosDetalhes('');
        setNovaCategoria('');
        setNovaSubCategoria('');
        setArquivoFoto(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        carregarDetalhesRef();
      } else {
        alert(data.message || 'Erro ao guardar amostra.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar amostra.');
    } finally {
      setSalvandoSample(false);
    }
  };

  const handleApagarSample = async (sampleId) => {
    if (!confirm('Tem certeza que deseja apagar esta amostra do portefólio?')) return;
    try {
      const res = await fetch(`http://localhost:5000/workers/samples/${sampleId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Amostra apagada com sucesso!');
        carregarDetalhesRef();
      } else {
        alert(data.message || 'Erro ao apagar amostra.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao apagar amostra.');
    }
  };

  if (!isMounted) {
    return null; // Evita renderização desencontrada no servidor vs cliente (Hydration)
  }

  const servicoAtual = dadosCompletos?.services?.[0] || null;

  return (
    <div className="secao-conta worker-dashboard-root">
      <div className="perfil-formulario">
        <button onClick={carregarDetalhes} disabled={carregando} className="btn-editar">
          <FiBriefcase size={16} />
          {carregando ? 'A carregar portefólio...' : expandido ? 'Ocultar Detalhes e Portefólio' : 'Ver Mais / Gerir Portefólio & Serviços'}
          {expandido ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
      </div>

      {erro && <p className="worker-error-msg">{erro}</p>}

      {expandido && dadosCompletos && (
        <div className="conta-card-investor worker-card-container">
          {/* SECÇÃO 1: PERFIL & CV */}
          <div className="worker-section-block">
            <div className="worker-section-header">
              <h3>
                <FiFileText size={14} /> Informações Profissionais & CV
              </h3>
              <button onClick={() => setModoEdicaoPerfil(!modoEdicaoPerfil)} className="btn-mudar-tema-inline">
                <FiEdit3 size={12} /> {modoEdicaoPerfil ? 'Cancelar' : 'Editar Dados'}
              </button>
            </div>

            {!modoEdicaoPerfil ? (
              <div className="worker-info-display">
                <p><strong>Título Profissional:</strong> {dadosCompletos.professional_title || servicoAtual?.title || 'Não definido'}</p>
                <p><strong>Categoria:</strong> {dadosCompletos.worker_category || servicoAtual?.category || 'Não definida'}</p>
                <p className="worker-meta-row"><FiMapPin size={13} /> <strong>Bairro:</strong> {dadosCompletos.bairro || servicoAtual?.bairro || 'Não informado'}</p>
                <p className="worker-meta-row"><FiPhone size={13} /> <strong>Telefone:</strong> {dadosCompletos.phone || servicoAtual?.phone || 'Não informado'}</p>
                <p><strong>Descrição:</strong> {dadosCompletos.description || servicoAtual?.description || 'Sem descrição.'}</p>
                {servicoAtual?.cv_url ? (
                  <div className="worker-cv-link-wrap">
                    <a href={servicoAtual.cv_url} target="_blank" rel="noopener noreferrer" className="link-detalhe">
                      📄 Ver Currículo (CV) em PDF Anexado
                    </a>
                  </div>
                ) : (
                  <p className="worker-text-muted">Nenhum CV em PDF anexado.</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleAtualizarPerfil} className="perfil-formulario">
                <div className="input-grupo">
                  <label>Título Profissional</label>
                  <input type="text" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} />
                </div>
                <div className="input-grupo">
                  <label>Categoria Principal</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-customizado">
                    <option value="">Selecione uma categoria...</option>
                    {CATEGORIAS_DISPONIVEIS.map((cat) => (
                      <option key={cat.valor} value={cat.valor}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="upgrade-grid">
                  <div className="input-grupo">
                    <label>Bairro</label>
                    <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                  </div>
                  <div className="input-grupo">
                    <label>Telefone</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="input-grupo">
                  <label>Referência de Morada</label>
                  <input type="text" value={addressReference} onChange={(e) => setAddressReference(e.target.value)} />
                </div>
                <div className="input-grupo">
                  <label>Descrição / Bio</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="input-grupo">
                  <label>Atualizar Currículo (PDF)</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setCvFile(e.target.files[0])} className="worker-file-input" />
                </div>
                <button type="submit" disabled={salvandoPerfil} className="btn-salvar">
                  {salvandoPerfil ? 'A guardar alterações...' : 'Guardar Alterações do Perfil'}
                </button>
              </form>
            )}
          </div>

          {/* SECÇÃO 2: PORTEFÓLIO */}
          <div className="worker-portfolio-section">
            <div className="worker-section-header">
              <h3> Amostras de Projetos ({dadosCompletos.samples?.length || 0}) </h3>
              <button onClick={() => setModalAberto(true)} className="btn-mudar-tema-inline">
                <FiPlus size={12} /> Adicionar Novo Projeto
              </button>
            </div>

            {(!dadosCompletos.samples || dadosCompletos.samples.length === 0) ? (
              <p className="worker-text-muted">Ainda não foram adicionadas amostras. Clica em &quot;Adicionar Novo Projeto&quot; para começar.</p>
            ) : (
              <div className="grid-produtos">
                {dadosCompletos.samples.map((sample) => (
                  <div key={sample.id} className="produto-card-investor">
                    <div className="img-container">
                      <button onClick={() => handleApagarSample(sample.id)} title="Apagar amostra" className="btn-delete-sample">
                        <FiTrash2 size={12} />
                      </button>
                      {sample.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sample.image_url} alt={sample.title} />
                      ) : (
                        <div className="worker-empty-photo-box">Sem Foto</div>
                      )}
                    </div>
                    <div className="produto-info">
                      <h3>{sample.title}</h3>
                      <p className="worker-sample-details">{sample.details}</p>
                      {sample.price && (
                        <span className="preco">
                          <FiDollarSign size={12} className="inline-icon" /> {Number(sample.price).toLocaleString()} XAF
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PARA ADICIONAR NOVO PROJETO */}
      {modalAberto && (
        <div className="worker-modal-overlay">
          <div className="conta-card-investor worker-modal-card">
            <button onClick={() => setModalAberto(false)} className="worker-modal-close-btn">
              <FiX size={20} />
            </button>
            <h3 className="worker-modal-title">Adicionar Amostra ao Portefólio</h3>
            <form onSubmit={handleSalvarSample} className="perfil-formulario">
              <div className="input-grupo">
                <label>Título do Projeto</label>
                <input type="text" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} required />
              </div>
              <div className="input-grupo">
                <label>Categoria do Trabalho</label>
                <select value={novaCategoria} onChange={(e) => { setNovaCategoria(e.target.value); setNovaSubCategoria(''); }} className="select-customizado" required>
                  <option value="">Selecione a categoria...</option>
                  {CATEGORIAS_DISPONIVEIS.map((cat) => (
                    <option key={cat.valor} value={cat.valor}>{cat.label}</option>
                  ))}
                </select>
              </div>
              {subcategoriasDisponiveis.length > 0 && (
                <div className="input-grupo">
                  <label>Subcategoria</label>
                  <select value={novaSubCategoria} onChange={(e) => setNovaSubCategoria(e.target.value)} className="select-customizado">
                    <option value="">Selecione a subcategoria...</option>
                    {subcategoriasDisponiveis.map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="input-grupo">
                <label>Preço (XAF)</label>
                <input type="number" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} required />
              </div>
              <div className="input-grupo">
                <label>Detalhes / Descrição</label>
                <input type="text" value={novosDetalhes} onChange={(e) => setNovosDetalhes(e.target.value)} required />
              </div>
              <div className="input-grupo">
                <label>Foto do Trabalho</label>
                <input type="file" ref={fileInputRef} onChange={(e) => setArquivoFoto(e.target.files[0])} accept="image/*" className="worker-file-input" required />
              </div>
              <button type="submit" disabled={salvandoSample} className="btn-salvar">
                {salvandoSample ? 'A guardar...' : 'Guardar Amostra'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}