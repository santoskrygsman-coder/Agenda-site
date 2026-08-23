"use client";

import { useState } from "react";
import { Scissors, Edit2, Trash2, Check, X, Plus, MoreVertical } from "lucide-react";

export default function ServicesManager({ initialServices }: { initialServices: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: ""
  });

  const handleEdit = (svc: any) => {
    setEditingId(svc.id);
    setEditForm({
      name: svc.name,
      description: svc.description || "",
      price: svc.price.toString(),
      duration: svc.duration.toString()
    });
    setIsAdding(false);
  };

  const handleSaveEdit = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    
    if (res.ok) {
      const updated = await res.json();
      setServices(prev => prev.map(s => s.id === id ? updated : s));
      setEditingId(null);
    } else {
      alert("Erro ao atualizar procedimento");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este procedimento?")) return;
    
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) {
      setServices(prev => prev.filter(s => s.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "Erro ao excluir");
    }
  };

  const handleSaveNew = async () => {
    const res = await fetch(`/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    
    if (res.ok) {
      const created = await res.json();
      setServices(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)));
      setIsAdding(false);
    } else {
      alert("Erro ao criar procedimento");
    }
  };

  return (
    <section className="mb-6 font-sans text-[#3A3335]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-[#3A3335] flex items-center gap-2">
          <Scissors className="text-[#B98389]" size={20} /> Procedimentos
        </h2>
        {!isAdding && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setEditForm({ name: "", description: "", price: "", duration: "" });
            }}
            className="flex items-center gap-1.5 bg-[#A76D74] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#8A5A60] transition-all text-sm shadow-md shadow-[#A76D74]/20 active:scale-[0.98]"
          >
            <Plus size={16} /> NOVO
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-[#FCFAFA] border border-[#F3E8E8] p-5 rounded-2xl mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <h3 className="font-bold text-[#3A3335] mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
            <span className="text-[#D4A373]">✦</span> Adicionar Novo Procedimento
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Nome</label>
              <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Ex: Volume Russo" className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-white text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)]" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Valor (R$)</label>
                <input required type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="0.00" className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-white text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)]" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Duração (Min)</label>
                <input required type="number" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value})} placeholder="60" className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-white text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Descrição (Opcional)</label>
              <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Descrição curta do procedimento" className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-white text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.01)]" />
            </div>
            <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-[#F3E8E8]">
              <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 bg-[#FFF5F5] text-[#A76D74] font-bold text-sm tracking-wide rounded-xl hover:bg-[#F3E8E8] transition-colors">CANCELAR</button>
              <button onClick={handleSaveNew} className="px-5 py-2.5 bg-[#5A7A66] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#4A6454] transition-colors shadow-md shadow-[#5A7A66]/20">SALVAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {services.length === 0 && !isAdding && (
          <div className="bg-white border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-10 rounded-3xl text-center text-[#8B7E7F] font-medium">
            <Scissors size={32} className="mx-auto mb-3 opacity-20" />
            Nenhum procedimento cadastrado.
          </div>
        )}
        
        {services.map(service => (
          <div key={service.id} className={`p-5 border ${service.active ? 'border-[#F3E8E8]' : 'border-[#F3E8E8] opacity-60'} rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:border-[#D9A0A0]`}>
            {editingId === service.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Nome</label>
                  <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-[#FCFAFA] text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389]" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Valor (R$)</label>
                    <input required type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-[#FCFAFA] text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Duração (Min)</label>
                    <input required type="number" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value})} className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-[#FCFAFA] text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Descrição (Opcional)</label>
                  <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-3 rounded-xl border border-[#F3E8E8] bg-[#FCFAFA] text-[#3A3335] outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389]" />
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-[#F3E8E8] mt-2">
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-[#FFF5F5] text-[#A76D74] font-bold rounded-xl hover:bg-[#F3E8E8]"><X size={18} /></button>
                  <button onClick={() => handleSaveEdit(service.id)} className="px-4 py-2 bg-[#5A7A66] text-white font-bold rounded-xl hover:bg-[#4A6454] shadow-md shadow-[#5A7A66]/20"><Check size={18} /></button>
                </div>
              </div>
            ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-[#3A3335] text-lg tracking-tight">{service.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      <span className="text-xs font-bold tracking-wider text-[#A76D74] bg-[#FFF5F5] px-2.5 py-1 rounded-full">R$ {service.price.toFixed(2)}</span>
                      <span className="text-xs font-bold tracking-wider text-[#8B7E7F] bg-[#FCFAFA] border border-[#F3E8E8] px-2.5 py-1 rounded-full">{service.duration} MIN</span>
                      {!service.active && (
                        <span className="text-xs font-bold text-[#8B7E7F] bg-[#F3E8E8] px-2.5 py-1 rounded-full uppercase tracking-wider">INATIVO</span>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-sm text-[#8B7E7F] mt-3 font-medium">{service.description}</p>
                    )}
                  </div>
                  
                  {/* Desktop Buttons */}
                  <div className="hidden sm:flex gap-2">
                    <button 
                      onClick={async () => {
                        const res = await fetch(`/api/services/${service.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...service, active: !service.active })
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          setServices(prev => prev.map(s => s.id === service.id ? updated : s));
                        }
                      }} 
                      className={`w-14 h-14 rounded-2xl transition-all flex flex-col justify-center items-center gap-1 active:scale-95 ${service.active ? 'text-[#D4A373] bg-[#FFF9F2] hover:bg-[#FFEADA]' : 'text-[#5A7A66] bg-[#F0F7F4] hover:bg-[#D5E2D9]'}`}
                      title={service.active ? "Desativar" : "Ativar"}
                    >
                      <Check size={18} className={!service.active ? "opacity-100" : "opacity-30"} />
                    </button>
                    <button onClick={() => handleEdit(service)} className="w-14 h-14 text-[#5A5052] bg-[#FCFAFA] border border-[#F3E8E8] rounded-2xl hover:bg-[#F3E8E8] transition-all flex justify-center items-center active:scale-95">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="w-14 h-14 text-[#A76D74] bg-[#FFF5F5] rounded-2xl hover:bg-[#F3E8E8] transition-all flex justify-center items-center active:scale-95">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Mobile Dropdown */}
                  <div className="sm:hidden relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === service.id ? null : service.id)}
                      className="w-12 h-12 flex justify-center items-center rounded-xl text-[#8B7E7F] hover:bg-[#FCFAFA] active:bg-[#F3E8E8] transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {openMenuId === service.id && (
                      <div className="absolute right-0 top-12 mt-1 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#F3E8E8] overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => { handleEdit(service); setOpenMenuId(null); }}
                          className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#5A5052] hover:bg-[#FCFAFA] transition-colors text-left border-b border-[#F3E8E8]"
                        >
                          <Edit2 size={16} /> Editar
                        </button>
                        <button 
                          onClick={async () => {
                            const res = await fetch(`/api/services/${service.id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ ...service, active: !service.active })
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setServices(prev => prev.map(s => s.id === service.id ? updated : s));
                            }
                            setOpenMenuId(null);
                          }}
                          className={`flex items-center gap-3 px-4 py-3.5 text-sm font-bold transition-colors text-left border-b border-[#F3E8E8] ${service.active ? 'text-[#D4A373] hover:bg-[#FFF9F2]' : 'text-[#5A7A66] hover:bg-[#F0F7F4]'}`}
                        >
                          <Check size={16} className={!service.active ? "opacity-100" : "opacity-30"} /> 
                          {service.active ? "Desativar" : "Ativar"}
                        </button>
                        <button 
                          onClick={() => { handleDelete(service.id); setOpenMenuId(null); }}
                          className="flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#A76D74] hover:bg-[#FFF5F5] transition-colors text-left"
                        >
                          <Trash2 size={16} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
