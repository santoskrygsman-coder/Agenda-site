"use client";

import { useState } from "react";
import { X } from "lucide-react";

import Carousel from "@/components/Carousel";

export default function PublicGallery({ images }: { images: any[] }) {
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in duration-700">
      <div className="text-center mb-5">
        <h2 className="text-sm font-bold text-[#3A3335] uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="text-[#D4A373] text-[10px]">✦</span> 
          Meu Trabalho
          <span className="text-[#D4A373] text-[10px]">✦</span>
        </h2>
      </div>

      <Carousel images={images} autoPlayInterval={4500} />

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
