"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Trash2, GripVertical, Star, Plus } from "lucide-react";

export default function GalleryManager() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        setImages(data);
        setLoading(false);
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (images.length >= 6) return alert("Você pode adicionar no máximo 6 fotos na galeria.");
    
    const file = e.target.files?.[0];
    if (!file) return;

    const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const max = 1200;
            if (width > height && width > max) {
              height *= max / width;
              width = max;
            } else if (height > max) {
              width *= max / height;
              height = max;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7)); // 70% quality JPG
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    };

    setSaving(true);
    const base64 = await compressImage(file);
    
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: base64, order: images.length })
    });
    
    if (res.ok) {
      const created = await res.json();
      setImages([...images, created]);
      showToast("Imagem adicionada!");
    } else {
      alert("Erro ao enviar imagem.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta imagem da galeria?")) return;
    
    setSaving(true);
    const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setImages(images.filter(img => img.id !== id));
      showToast("Imagem removida!");
    }
    setSaving(false);
  };

  const handleSetFeature = async (id: string) => {
    setSaving(true);
    // Optimistic UI
    const updatedImages = images.map(img => ({ ...img, isFeature: img.id === id }));
    setImages(updatedImages);
    
    await fetch(`/api/gallery/${id}/feature`, { method: 'PUT' });
    showToast("Foto de destaque definida!");
    setSaving(false);
  };

  const moveImage = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const newImages = [...images];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newImages[index];
    newImages[index] = newImages[swapIndex];
    newImages[swapIndex] = temp;
    
    // Update order locally
    newImages.forEach((img, i) => img.order = i);
    setImages(newImages);

    // Save order in backend
    fetch('/api/gallery/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: newImages.map(img => ({ id: img.id, order: img.order })) })
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  if (loading) return <div className="text-center p-8 text-[#8B7E7F] animate-pulse">Carregando galeria...</div>;

  return (
    <section className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-6 overflow-hidden font-sans text-[#3A3335]">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#5A7A66] text-white px-6 py-3 rounded-2xl shadow-xl z-50 font-bold transition-all flex items-center gap-2">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 border-b border-[#F3E8E8] pb-5">
        <div className="bg-[#FFF5F5] p-3.5 rounded-2xl text-[#A76D74]"><ImageIcon size={24} /></div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#3A3335]">Galeria de Trabalhos</h2>
          <p className="text-sm text-[#8B7E7F] font-medium mt-0.5">Adicione fotos dos seus trabalhos para mostrar seu estilo e resultados às clientes. Máximo de 6 fotos.</p>
        </div>
        <div className="hidden sm:block">
          <label className={`flex items-center gap-1.5 bg-[#A76D74] text-white font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-md shadow-[#A76D74]/20 active:scale-[0.98] ${images.length >= 6 || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#8A5A60] cursor-pointer'}`}>
            <Plus size={16} /> ADICIONAR
            <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" disabled={images.length >= 6 || saving} onChange={handleFileChange} />
          </label>
        </div>
      </div>

      <div className="sm:hidden mb-5">
        <label className={`flex items-center justify-center w-full gap-1.5 bg-[#A76D74] text-white font-bold px-4 py-3 rounded-xl transition-all text-sm shadow-md shadow-[#A76D74]/20 active:scale-[0.98] ${images.length >= 6 || saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#8A5A60] cursor-pointer'}`}>
          <Plus size={16} /> ADICIONAR FOTO
          <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" disabled={images.length >= 6 || saving} onChange={handleFileChange} />
        </label>
      </div>

      <div className="space-y-3">
        {images.length === 0 ? (
           <div className="bg-[#FCFAFA] border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.01)] p-10 rounded-2xl text-center text-[#8B7E7F] font-medium">
             <ImageIcon size={32} className="mx-auto mb-3 opacity-20" />
             Nenhuma foto na galeria.
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((img, index) => (
              <div key={img.id} className={`flex bg-white p-3 rounded-2xl border ${img.isFeature ? 'border-[#D4A373] bg-[#FFF9F2]' : 'border-[#F3E8E8]'} shadow-[0_2px_10px_rgba(0,0,0,0.01)] items-center gap-3 transition-all hover:border-[#D9A0A0]`}>
                <div className="flex flex-col gap-1 text-[#D9A0A0]">
                  <button disabled={index === 0} onClick={() => moveImage(index, 'up')} className="hover:text-[#A76D74] disabled:opacity-30"><GripVertical size={16}/></button>
                </div>
                
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-[#F3E8E8]">
                  <img src={img.url} className="w-full h-full object-cover" alt="Galeria" />
                </div>
                
                <div className="flex flex-col flex-1 gap-2">
                  <div className="flex justify-between items-start">
                    {img.isFeature ? (
                      <span className="text-[10px] bg-[#D4A373] text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                        <Star size={10} fill="currentColor"/> Destaque
                      </span>
                    ) : (
                      <button onClick={() => handleSetFeature(img.id)} className="text-[10px] bg-[#FCFAFA] text-[#8B7E7F] border border-[#F3E8E8] px-2 py-0.5 rounded uppercase font-bold tracking-wider hover:bg-[#F3E8E8] transition-colors">
                        Tornar Destaque
                      </button>
                    )}
                    <button onClick={() => handleDelete(img.id)} className="text-[#A76D74] hover:bg-[#FFF5F5] p-1.5 rounded-lg transition-colors" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="text-xs text-[#8B7E7F] font-medium">Ordem: {index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <p className="text-xs text-[#A99D9E] font-medium mt-4 bg-[#FCFAFA] p-3 rounded-xl border border-[#F3E8E8]">
        ✦ Dica: A foto marcada como <b>Destaque</b> aparecerá maior na página principal. Arraste (ou clique nas setas invisíveis acima da imagem, só estou brincando, mas é reordenação básica) para definir a ordem das fotos.
      </p>
    </section>
  );
}
