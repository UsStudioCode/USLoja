import Link from "next/link";
import { BsWhatsapp } from "react-icons/bs";

export function EachProductCard({ categoria, p }) {
    function getFotos(p) {
      if (!p) return [];
      if (Array.isArray(p.image_urls) && p.image_urls.length > 0) {
        return p.image_urls.filter(Boolean);
      }
      if (p.image_url) return [p.image_url];
      return [];
    }
    
    const fotos = getFotos(p);
    const fotoPrincipal = fotos[0] || "/card/art (0).jpg";
    const nomeVendedor = p.seller || "Loja do Mercado";
    const bairroLoja = p.location || "Bissau";
    const whatsappLoja = String(p.whatsapp || "").replace(/\D/g, "");
    const precoExibido = p.price_min ? `${Number(p.price_min).toLocaleString()} CFA`: "Preço sob consulta"; 
    const conditionList = p.condition === "uk_usado" || p.condition === "usado_uk" ? "🇬🇧 UK" : p.condition === "2nd_mao" || p.condition === "usado" || p.condition === "usado_2maos" ? "🔄 2ª Mão" : "✨ Novo";

    const lidarComWhatsApp = async (e, p, whatsappLoja, nomeVendedor, precoExibido) => {
        e.preventDefault();
        e.stopPropagation();
        const u = await garantirLogin();
        if (!u) return;
        
        try {
          await fetch(`${API}/products/purchases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: u.id, productId: p.id }),
          });
        } catch (_) {}
        window.open(`https://wa.me/${whatsappLoja}?text=${encodeURIComponent(`Olá ${nomeVendedor}, vi o seu produto ${p.title} (${precoExibido}) na Feira Bandim e quero negociar.`)}`,'_blank');
    };

      const guardarProdutoEAbrir = (p) => {
        try {
          sessionStorage.setItem(`produto_cache_${p.id}`, JSON.stringify(p));
          sessionStorage.setItem('ultima_categoria', categoria);
        } catch (_) {}
        };

      const garantirLogin = async () => {
        const { data: { user: u },} = await supabase.auth.getUser();
        if (!u) {
          const next = encodeURIComponent( typeof window !== 'undefined' ? window.location.pathname : '/login');
          router.push(`/login?next=${next}`);
          return null;
        }
        return u;
      };


  return (
    <Link className="it-product-card" href={`/public/${categoria}/${p.id}`} onClick={() => guardarProdutoEAbrir(p)}>
      <div className="it-card-image-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotoPrincipal} alt={p.title} className="it-card-img" />
        <span className="it-badge-condicao"> {conditionList} </span>
        {fotos.length > 1 && <span className="for-fotos"> {fotos.length}</span>}
      </div>
      <div className="it-card-body">
        <div className="it-card-title-price">
          <h3>{p.title}</h3>
          <span className="it-price">{precoExibido}</span>
        </div>
        <p className="it-details">{p.description}</p>
        <div className="it-meta-info">
          {" "}
          <span>📍 {bairroLoja}</span>{" "}
        </div>
      </div>
      <div className="it-card-footer"> {" "} <span className="it-seller">{nomeVendedor}</span>
        {whatsappLoja && (
          <button
            type="button"
            className="it-whatsapp-btn"
            onClick={(ev) => lidarComWhatsApp(ev, p, whatsappLoja, nomeVendedor, precoExibido) }> {" "} <BsWhatsapp size={14} /> WhatsApp{" "} </button> )}
      </div>
    </Link>
  );
}
