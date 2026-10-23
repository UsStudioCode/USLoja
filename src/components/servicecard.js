'use client'
import { useState } from 'react'
import { FiBriefcase, FiMapPin, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function WorkerCard({ worker }) {
  const { title, bairro, phone, sampleTitle, samplePrice, sampleDetails, sampleImages, sampleImage } = worker
  
  const listaFotos = sampleImages && sampleImages.length > 0 ? sampleImages : (sampleImage ? [sampleImage] : [])
  const [fotoAtiva, setFotoAtiva] = useState(0)

  const proximaFoto = (e) => {
    e.stopPropagation()
    setFotoAtiva((prev) => (prev + 1) % listaFotos.length)
  }

  const fotoAnterior = (e) => {
    e.stopPropagation()
    setFotoAtiva((prev) => (prev - 1 + listaFotos.length) % listaFotos.length)
  }

  return (
    <div className="uw-worker-card">
      <div className="uw-worker-img-container">
        {listaFotos.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listaFotos[fotoAtiva]} alt={sampleTitle || 'Amostra'} className="uw-worker-img" />
            {listaFotos.length > 1 && (
              <>
                <button type="button" onClick={fotoAnterior} className="uw-worker-nav-btn-left">
                  <FiChevronLeft size={14} />
                </button>
                <button type="button" onClick={proximaFoto} className="uw-worker-nav-btn-right">
                  <FiChevronRight size={14} />
                </button>
                <span className="uw-worker-counter">
                  {fotoAtiva + 1}/{listaFotos.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="uw-worker-empty-img">
            <FiBriefcase size={32} />
          </div>
        )}
        <span className="uw-worker-badge">
          {title || 'Título do Serviço'}
        </span>
      </div>

      <div className="uw-worker-info">
        <h3 className="uw-worker-title">{sampleTitle || 'Ex: Instalação Elétrica'}</h3>
        <span className="uw-worker-price">
          {samplePrice ? `${Number(samplePrice).toLocaleString()} CFA` : 'Preço sob consulta'}
        </span>
        <p className="uw-worker-details">
          {sampleDetails ? (sampleDetails.length > 60 ? `${sampleDetails.substring(0, 60)}...` : sampleDetails) : 'Descrição do trabalho executado...'}
        </p>
        <div className="uw-worker-location">
          <FiMapPin size={10} /> {bairro || 'Bairro'} | {phone ? `+245 ${phone}` : 'Telemóvel'}
        </div>
      </div>
    </div>
  )
}