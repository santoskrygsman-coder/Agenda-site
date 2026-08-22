"use client";

import { useState } from "react";
import { Scissors, Edit2, Trash2, Check, X, Plus } from "lucide-react";

export default function ServicesManager({ initialServices }: { initialServices: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
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
      alert("Erro ao excluir");
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
    <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Scissors className="text-pink-500" /> Procedimentos
        </h2>
        {!isAdding && (
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setEditForm({ name: "", description: "", price: "", duration: "" });
            }}
            className="flex items-center gap-1 bg-pink-100 text-pink-700 font-bold px-3 py-2 rounded-lg hover:bg-pink-200 transition-colors text-sm"
          >
            <Plus size={16} /> Novo
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border-2 border-pink-200 p-4 rounded-xl mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">Adicionar Novo Procedimento</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
              <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nome do Procedimento" className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Valor (R$)</label>
                <input required type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="0.00" className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Duração (Min)</label>
                <input required type="number" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value})} placeholder="60" className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Descrição (Opcional)</label>
              <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Descrição curta" className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-100">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handleSaveNew} className="px-4 py-2 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {services.length === 0 && !isAdding && (
          <p className="text-center text-gray-500 py-4 bg-gray-50 rounded-xl">Nenhum procedimento cadastrado.</p>
        )}
        
        {services.map(service => (
          <div key={service.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow transition-shadow">
            {editingId === service.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                  <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor (R$)</label>
                    <input required type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Duração (Min)</label>
                    <input required type="number" value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value})} className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Descrição (Opcional)</label>
                  <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 outline-none focus:border-pink-500 focus:bg-white transition-colors" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200"><X size={18} /></button>
                  <button onClick={() => handleSaveEdit(service.id)} className="px-3 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600"><Check size={18} /></button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{service.name}</h4>
                  <div className="flex gap-3 mt-1">
                    <span className="text-sm font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded">R$ {service.price.toFixed(2)}</span>
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{service.duration} mins</span>
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-500 mt-2">{service.description}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-2 sm:ml-auto">
                  <button onClick={() => handleEdit(service)} className="p-3 text-blue-500 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex-1 flex justify-center">
                    <Edit2 size={20} />
                  </button>
                  <button onClick={() => handleDelete(service.id)} className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex-1 flex justify-center">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
