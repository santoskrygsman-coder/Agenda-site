"use client";

import { useState } from "react";
import { Clock, Check, X, Edit2 } from "lucide-react";

export default function WorkingHoursManager({ initialWorkingHours }: { initialWorkingHours: any[] }) {
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const [editForm, setEditForm] = useState({
    active: true,
    startTime: "",
    endTime: ""
  });

  const handleEdit = (wh: any) => {
    setEditingId(wh.id);
    setEditForm({
      active: wh.active,
      startTime: wh.startTime,
      endTime: wh.endTime
    });
  };

  const handleSave = async (id: string) => {
    const res = await fetch(`/api/working-hours/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    
    if (res.ok) {
      const updated = await res.json();
      setWorkingHours(prev => prev.map(w => w.id === id ? updated : w));
      setEditingId(null);
    } else {
      alert("Erro ao salvar horário");
    }
  };

  return (
    <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="text-pink-500" /> Horário de Expediente
      </h2>
      <div className="space-y-3">
        {workingHours.map(wh => (
          <div key={wh.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm gap-2">
            <span className="font-bold text-gray-700 w-24">{diasSemana[wh.weekday]}</span>
            
            {editingId === wh.id ? (
              <div className="flex flex-1 items-center gap-2 flex-wrap sm:flex-nowrap w-full">
                <label className="flex items-center gap-1 text-gray-600 font-medium">
                  <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({...editForm, active: e.target.checked})} className="accent-pink-500" />
                  Aberto
                </label>
                {editForm.active && (
                  <>
                    <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="p-2 border border-gray-300 rounded outline-none" />
                    <span>às</span>
                    <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({...editForm, endTime: e.target.value})} className="p-2 border border-gray-300 rounded outline-none" />
                  </>
                )}
                <div className="flex-1 flex gap-2 w-full mt-3">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 flex justify-center items-center gap-2"><X size={20} /> Cancelar</button>
                  <button onClick={() => handleSave(wh.id)} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 flex justify-center items-center gap-2"><Check size={20} /> Salvar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center justify-between w-full gap-3">
                {wh.active ? (
                  <span className="text-gray-700 font-medium bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">{wh.startTime} às {wh.endTime}</span>
                ) : (
                  <span className="text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-100 shadow-sm">Fechado</span>
                )}
                <button onClick={() => handleEdit(wh)} className="w-full sm:w-auto px-4 py-3 text-pink-600 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors flex justify-center items-center gap-2 font-bold">
                  <Edit2 size={18} /> Editar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
