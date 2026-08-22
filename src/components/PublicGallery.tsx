"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function PublicGallery({ images }: { images: any[] }) {
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  if (images.length === 0) return null;

  const featured = images.find(img => img.isFeature) || images[0];
  const others = images.filter(img => img.id !== featured.id);

  return (
    <div className="mb-10 animate-in fade-in duration-700">
      <div className="text-center mb-5">
        <h2 className="text-sm font-bold text-[#3A3335] uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="text-[#D4A373] text-[10px]">✦</span> 
          Meu Trabalho
          <span className="text-[#D4A373] text-[10px]">✦</span>
        </h2>
      </div>

      <div className="space-y-2">
        {/* Foto Destaque */}
        <div 
          className="w-full aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#F3E8E8] transition-transform active:scale-[0.98]"
          onClick={() => setSelectedImg(featured.url)}
        >
          <img src={featured.url} alt="Destaque" className="w-full h-full object-cover" loading="lazy" />
        </div>
        
        {/* Demais Fotos */}
        {others.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {others.map(img => (
              <div 
                key={img.id} 
                className="aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#F3E8E8] transition-transform active:scale-95"
                onClick={() => setSelectedImg(img.url)}
              >
                <img src={img.url} alt="Galeria" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal / Lightbox */}
      {selectedImg && (
        <div 
          className="fixed inset-0 z-50 bg-[#3A3335]/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedImg(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            onClick={() => setSelectedImg(null)}
          >
            <X size={24} />
          </button>
          
          <img 
            src={selectedImg} 
            alt="Ampliada" 
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
