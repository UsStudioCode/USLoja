'use client'; 

import { useEffect, useMemo, useState } from "react"; 
import { BsSearch, BsPencil, BsTrash, BsX, BsArrowRepeat, BsPerson, BsShop, BsPersonWorkspace } from "react-icons/bs"; 
import { useAdminDashboard } from "../../../../components/admincontext"; 

function nomeDe(p) { 
  return p.name || p.email || "Sem nome"; 
} 

function tipoDe(p) { 
  if (p.account === "inactive") return "Conta Bloqueada";
  if (p.worker_active) return "Trabalhador"; 
  if (p.seller_active || p.account === "vendedor") return "Vendedor"; 
  if (p.account === "cliente") return "Cliente"; 
  return p.account || "Utilizador"; 
} 

export default function ContasPage() { 
  const { profiles, loadingProfiles, loadProfiles, setProfiles, error: ctxError } = useAdminDashboard(); 
  const [q, setQ] = useState(""); 
  const [filtro, setFiltro] = useState("todos"); // todos | cliente | seller | worker 
  const [localError, setLocalError] = useState(""); 
  const [edit, setEdit] = useState(null); 
  const [form, setForm] = useState({}); 
  const [saving, setSaving] = useState(false); 
  
  const BUYERS = "http://localhost:5000/buyers"; 

  useEffect(() => { 
    loadProfiles(false); 
  }, [loadProfiles]); 

  const lista = useMemo(() => { 
    let list = profiles || []; 
    if (filtro === "worker") { 
      list = list.filter((p) => p.worker_active === true); 
    } else if (filtro === "seller") { 
      list = list.filter((p) => p.seller_active === true || p.account === "vendedor"); 
    } else if (filtro === "cliente") { 
      list = list.filter((p) => !p.worker_active && !p.seller_active && (p.account === "cliente" || !p.account)); 
    } 

    const query = q.trim().toLowerCase(); 
    if (query) { 
      list = list.filter((p) => { 
        const blob = [p.name, p.email, p.phone, p.telefone, p.account, p.bairro, p.zona] 
          .filter(Boolean) 
          .join(" ") 
          .toLowerCase(); 
        return blob.includes(query); 
      }); 
    } 
    return list; 
  }, [profiles, q, filtro]); 

  function authHeaders() { 
    const token = localStorage.getItem("admin_token"); 
    return { 
      "Content-Type": "application/json", 
      ...(token ? { Authorization: `Bearer ${token}` } : {}), 
    }; 
  } 

  function openEdit(p) { 
    setLocalError(""); 
    setEdit(p); 
    setForm({ 
      name: p.name || "", 
      email: p.email || "", 
      phone: p.phone || "", 
      account: p.account || "", 
      bairro: p.bairro || p.zona || "", 
      address: p.address || "", 
      professional_title: p.professional_title || "", 
      foto: p.foto || p.avatar_url || "", 
      worker_active: !!p.worker_active, 
      seller_active: !!p.seller_active, 
    }); 
  } 

  function setField(key, value) { 
    setForm((f) => ({ ...f, [key]: value })); 
  } 

  async function saveEdit(e) { 
    e.preventDefault(); 
    if (!edit) return; 
    setSaving(true); 
    setLocalError(""); 
    try { 
      const payload = { 
        id: edit.id, 
        name: form.name, 
        phone: form.phone, 
        bairro: form.bairro, 
        address: form.address, 
        foto: form.foto, 
        account: form.account, // Se for "inactive", bloqueia a conta
        worker_active: form.worker_active, 
        seller_active: form.seller_active, 
      }; 

      const res = await fetch(`${BUYERS}/profile/update`, { 
        method: "PUT", 
        headers: authHeaders(), 
        body: JSON.stringify(payload), 
      }); 

      const data = await res.json(); 
      if (!data.success) throw new Error(data.comment || "Erro ao guardar"); 

      const updated = data.profile || { ...edit, ...payload }; 
      setProfiles((prev) => (prev || []).map((p) => (p.id === edit.id ? { ...p, ...updated } : p))); 
      setEdit(null); 
    } catch (err) { 
      setLocalError(err.message || "Falha ao guardar"); 
    } finally { 
      setSaving(false); 
    } 
  } 

  async function removeProfile(p) { 
    const ok = window.confirm(`Apagar totalmente a conta de "${nomeDe(p)}" e todos os dados relacionados?`); 
    if (!ok) return; 
    setLocalError(""); 
    try { 
      const res = await fetch(`${BUYERS}/account/buyer/${p.id}`, { 
        method: "DELETE", 
        headers: authHeaders(), 
      }); 
      const data = await res.json(); 
      if (!data.success) throw new Error(data.comment || "Erro ao apagar"); 
      setProfiles((prev) => (prev || []).filter((x) => x.id !== p.id)); 
    } catch (err) { 
      setLocalError(err.message || "Falha ao apagar"); 
    } 
  } 

  async function removeStore(userId) { 
    const ok = window.confirm("Tens a certeza que queres apagar a loja e todos os produtos deste utilizador?"); 
    if (!ok) return; 
    try { 
      const res = await fetch(`${BUYERS}/store/${userId}`, { 
        method: "DELETE", 
        headers: authHeaders(), 
      }); 
      const data = await res.json(); 
      if (!data.success) throw new Error(data.comment || "Erro ao apagar loja"); 
      
      setProfiles((prev) => (prev || []).map((p) => p.id === userId ? { ...p, seller_active: false } : p)); 
      setForm((f) => ({ ...f, seller_active: false }));
      alert("Loja apagada com sucesso!"); 
    } catch (err) { 
      setLocalError(err.message || "Falha ao apagar loja"); 
    } 
  } 

  async function removeService(userId) { 
    const ok = window.confirm("Tens a certeza que queres apagar o perfil de trabalhador e serviços deste utilizador?"); 
    if (!ok) return; 
    try { 
      const res = await fetch(`${BUYERS}/worker/${userId}`, { 
        method: "DELETE", 
        headers: authHeaders(), 
      }); 
      const data = await res.json(); 
      if (!data.success) throw new Error(data.comment || "Erro ao apagar serviço"); 
      
      setProfiles((prev) => (prev || []).map((p) => p.id === userId ? { ...p, worker_active: false } : p)); 
      setForm((f) => ({ ...f, worker_active: false }));
      alert("Perfil de serviço apagado com sucesso!"); 
    } catch (err) { 
      setLocalError(err.message || "Falha ao apagar serviço"); 
    } 
  } 

  const erro = localError || ctxError; 
  const total = profiles?.length ?? 0; 

  return ( 
    <div className="ap-contas"> 
      <div className="ap-overview-head"> 
        <div> 
          <h2>Contas</h2> 
          <p> {lista.length} de {total} perfis {profiles ? " · em memória (Context)" : ""} {loadingProfiles ? " · a carregar…" : ""} </p> 
        </div> 
        <div className="ap-overview-actions"> 
          <button type="button" className="ap-btn-refresh" onClick={() => loadProfiles(true)} disabled={loadingProfiles} > 
            <BsArrowRepeat size={16} className={loadingProfiles ? "ap-spin" : ""} /> Atualizar lista 
          </button> 
        </div> 
      </div> 

      {erro && <div className="ap-alert-error">{erro}</div>} 

      <div className="ap-contas-toolbar"> 
        <div className="ap-contas-search"> 
          <BsSearch size={16} /> 
          <input type="search" placeholder="Nome, email, telefone, zona…" value={q} onChange={(e) => setQ(e.target.value)} /> 
        </div> 
        <select className="ap-select" value={filtro} onChange={(e) => setFiltro(e.target.value)} > 
          <option value="todos">Todos</option> 
          <option value="cliente">Clientes</option> 
          <option value="seller">Vendedores</option> 
          <option value="worker">Trabalhadores</option> 
        </select> 
      </div> 

      {loadingProfiles && !profiles ? ( 
        <div className="ap-loading-block"> 
          <div className="ap-boot-spinner" /> 
          <p>A carregar contas…</p> 
        </div> 
      ) : lista.length === 0 ? ( 
        <div className="ap-loading-block"> 
          <p>Nenhuma conta encontrada.</p> 
        </div> 
      ) : ( 
        <div className="ap-contas-table-wrap"> 
          <table className="ap-contas-table"> 
            <thead> 
              <tr> 
                <th>Utilizador</th> 
                <th>Tipo</th> 
                <th>Contacto</th> 
                <th>Zona</th> 
                <th></th> 
              </tr> 
            </thead> 
            <tbody> 
              {lista.map((p) => ( 
                <tr key={p.id}> 
                  <td> 
                    <div className="ap-contas-user"> 
                      {/* eslint-disable-next-line @next/next/no-img-element */} 
                      <img src={p.avatar_url || p.foto || "/card/art (0).jpg"} alt="" className="ap-contas-avatar" /> 
                      <div> 
                        <strong>{nomeDe(p)}</strong> 
                        <span>{p.email || "—"}</span> 
                      </div> 
                    </div> 
                  </td> 
                  <td> 
                    <span className="ap-contas-chip"> 
                      {p.worker_active ? ( <BsPersonWorkspace size={12} /> ) : p.seller_active || p.account === "vendedor" ? ( <BsShop size={12} /> ) : ( <BsPerson size={12} /> )} 
                      {tipoDe(p)} 
                    </span> 
                  </td> 
                  <td>{p.phone || p.telefone || "—"}</td> 
                  <td>{p.bairro || p.zona || "—"}</td> 
                  <td> 
                    <div className="ap-contas-actions"> 
                      <button type="button" className="ap-icon-btn" title="Editar" onClick={() => openEdit(p)} > 
                        <BsPencil size={14} /> 
                      </button> 
                      <button type="button" className="ap-icon-btn ap-icon-danger" title="Apagar Conta Completa" onClick={() => removeProfile(p)} > 
                        <BsTrash size={14} /> 
                      </button> 
                    </div> 
                  </td>
                  
                </tr> 
              ))} 
            </tbody> 
          </table> 
        </div> 
      )} 

      {edit && ( 
        <div className="ap-modal-backdrop" onClick={() => setEdit(null)}> 
          <div className="ap-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" > 
            <div className="ap-modal-head"> 
              <h3>Editar conta</h3> 
              <button type="button" className="ap-icon-btn" onClick={() => setEdit(null)} > 
                <BsX size={18} /> 
              </button> 
            </div> 

            <form className="ap-modal-form" onSubmit={saveEdit}> 
              <label> Nome Completo 
                <input value={form.name} onChange={(e) => setField("name", e.target.value)} required /> 
              </label> 
              <label> Email 
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} /> 
              </label> 
              <label> Telefone 
                <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /> 
              </label> 
              <label> Estado / Tipo de Conta 
                <select value={form.account} onChange={(e) => setField("account", e.target.value)} > 
                  <option value="">—</option> 
                  <option value="cliente">Cliente</option> 
                  <option value="seller">Vendedor</option> 
                  <option value="worker">Servidor</option> 
                  <option value="inactive">Bloqueada (Inativa)</option> 
                </select> 
              </label> 
              <label> Bairro 
                <input value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} /> 
              </label> 
              <label> Morada / endereço 
                <input value={form.address} onChange={(e) => setField("address", e.target.value)} /> 
              </label> 
              <label> URL da foto 
                <input value={form.foto} onChange={(e) => setField("foto", e.target.value)} /> 
              </label> 
              <label> Título profissional 
                <input value={form.professional_title} onChange={(e) => setField("professional_title", e.target.value)} /> 
              </label> 

              <div className="ap-modal-checks"> 
                <label className="ap-check"> 
                  <input type="checkbox" checked={form.worker_active} onChange={(e) => setField("worker_active", e.target.checked)} /> 
                  Trabalhador ({form.worker_active ? 'Ativo' : 'Inativo'}) 
                </label> 
                <label className="ap-check"> 
                  <input type="checkbox" checked={form.seller_active} onChange={(e) => setField("seller_active", e.target.checked)} /> 
                  Vendedor ({form.seller_active ? 'Ativo' : 'Inativo'}) 
                </label> 
              </div> 

              <div className="ap-danger-actions-container"> 
                {edit.seller_active && ( 
                  <div className="ap-danger-row"> 
                    <button type="button" onClick={() => removeStore(edit.id)} className="ap-btn-danger-action"> 
                      Apagar Apenas Loja / Produtos 
                    </button> 
                  </div> 
                )} 

                {edit.worker_active && ( 
                  <div className="ap-danger-row"> 
                    <button type="button" onClick={() => removeService(edit.id)} className="ap-btn-danger-action"> 
                      Apagar Apenas Perfil / Serviços 
                    </button> 
                  </div> 
                )} 
              </div> 

              <div className="ap-modal-actions"> 
                <button type="button" className="ap-btn-ghost" onClick={() => setEdit(null)} > 
                  Cancelar 
                </button> 
                <button type="submit" className="ap-btn-primary" disabled={saving} > 
                  {saving ? "A guardar…" : "Guardar"} 
                </button> 
              </div> 
            </form> 
          </div> 
        </div> 
      )} 
    </div> 
  ); 
}