'use client'

import { useState, useEffect, useRef } from 'react';
import { BsSearch, BsBoxSeam, BsGear, BsShop } from 'react-icons/bs';
import { useAuthProvider } from './authcontext';

const API = 'http://localhost:5000';
const STORAGE_KEY = 'mercado_bissau_last_suggestions';

export function GlobalSearch() {
  const { searchQuery, setSearchQuery, handleSearchSubmit, setis } = useAuthProvider();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [suggestions, setSuggestions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { try { return JSON.parse(saved); } catch (e) {_}}
    }
    return { produtos: [], servicos: [], lojas: [] };
  });

  useEffect(() => {
    function handleClickOutside(event) { 
      if (containerRef.current && !containerRef.current.contains(event.target)) {setIsOpen(false);} 
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) { setSuggestions({ produtos: [], servicos: [], lojas: [] } );
        return setIsOpen(false);
      }
      try {
        const res = await fetch(`${API}/ai/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) { 
          const newSuggestions = { produtos: data.produtos || [], servicos: data.servicos || [], lojas: data.lojas || []};
          setSuggestions(newSuggestions);
          setIsOpen(true);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSuggestions));
        }
      } catch (err) {
        console.error('Erro ao buscar sugestões:', err);
      }
    };
    const timer = setTimeout(fetchSuggestions, 60);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleSelectSuggestion(title){
    setSearchQuery(title);
    setIsOpen(false);
    handleSearchSubmit(e);
  };

  function onSubmitForm(e) {
    e.preventDefault();
    setIsOpen(false);
    handleSearchSubmit(e);
  };

  const totalResults = suggestions.produtos.length + suggestions.servicos.length + suggestions.lojas.length;

  return (
    <form key={'global-form'} onSubmit={onSubmitForm} className="global-search-wrapper" ref={containerRef}>
      <div className="global-search-form">
        <BsSearch className="search-icon" size={16} />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Kanto custa Samsung..."
          onFocus={() => { if (totalResults > 0) setIsOpen(true); }}
        />
      </div>

      {isOpen && totalResults > 0 && (
        <div className="global-suggestions-dropdown">
          {suggestions.produtos.length > 0 && (
            <div className="suggestion-section">
              <span className="suggestion-category-title"><BsBoxSeam size={9} /> Produtos</span>
              {suggestions.produtos.map((item, idx) => (
                <div key={`prod-${idx}`} className="suggestion-item" onClick={() => handleSelectSuggestion(item.title)}>
                  <span className="item-title">{item.title}</span>
                  <span className="item-sub">Produto</span>
                </div>
              ))}
            </div>
          )}
          {suggestions.servicos.length > 0 && (
            <div className="suggestion-section">
              <span className="suggestion-category-title"><BsGear size={9} /> Serviços</span>
              {suggestions.servicos.map((item, idx) => (
                <div key={`serv-${idx}`} className="suggestion-item" onClick={() => handleSelectSuggestion(item.title)}>
                  <span className="item-title">{item.title}</span>
                  <span className="item-sub">Serviço</span>
                </div>
              ))}
            </div>
          )}
          {suggestions.lojas.length > 0 && (
            <div className="suggestion-section">
              <span className="suggestion-category-title"><BsShop size={9} /> Lojas</span>
              {suggestions.lojas.map((item, idx) => (
                <div key={`loja-${idx}`} className="suggestion-item" onClick={() => handleSelectSuggestion(item.title)}>
                  <span className="item-title">{item.title}</span>
                  <span className="item-sub">Loja</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}