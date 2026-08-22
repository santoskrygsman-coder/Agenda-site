"use client";

import { useState, useEffect } from "react";
import { Clock, Check, X, Edit2, Copy } from "lucide-react";

export default function WorkingHoursManager({ initialWorkingHours }: { initialWorkingHours: any[] }) {
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const [editForm, setEditForm] = useState({
    active: true,
    startTime: "",
    endTime: "",
    breakStart: "",
    breakEnd: ""
  });

  const handleEdit = (wh: any) => {
    setEditingId(wh.id);
    setEditForm({
      active: wh.active,
      startTime: wh.startTime,
      endTime: wh.endTime,
      breakStart: wh.breakStart || "",
      breakEnd: wh.breakEnd || ""
    });
  };

  const handleSave = async (id: string) => {
    await fetch(`/api/working-hours/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setWorkingHours(workingHours.map(h => h.id === id ? { ...h, ...editForm } : h));
    setEditingId(null);
  };

  const copyToAll = async (sourceHour: any) => {
    if(!confirm(`Deseja copiar o horário de ${diasSemana[sourceHour.weekday]} para todos os dias de Segunda a Sexta?`)) return;
    
    const newHours = [...workingHours];
    for (const h of newHours) {
      if (h.weekday >= 1 && h.weekday <= 5 && h.id !== sourceHour.id) { // Seg a Sex
        h.startTime = sourceHour.startTime;
        h.endTime = sourceHour.endTime;
        h.breakStart = sourceHour.breakStart;
        h.breakEnd = sourceHour.breakEnd;
        h.active = sourceHour.active;
        await fetch(`/api/working-hours/${h.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(h),
        });
      }
    }
    setWorkingHours(newHours);
  };

  if (loading) return <div className="text-center p-4">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
          <Clock size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Horários de Atendimento</h2>
          <p className="text-sm text-gray-500">Configure os horários e intervalos de cada dia.</p>
        </div>
      </div>

      <div className="space-y-3">
        {workingHours.map((wh) => (
          <div key={wh.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm gap-4">
            <span className="font-bold text-gray-700 w-32">{diasSemana[wh.weekday]}</span>
            
            {editingId === wh.id ? (
              <div className="flex flex-col w-full gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({...editForm, active: e.target.checked})} className="w-5 h-5 text-pink-600 rounded" />
                  <span className="font-bold">Aberto neste dia</span>
                </div>
                {editForm.active && (
                  <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Abre às</label>
                      <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Fecha às</label>
                      <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({...editForm, endTime: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Início Almoço</label>
                      <input type="time" value={editForm.breakStart || ''} onChange={(e) => setEditForm({...editForm, breakStart: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none text-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Fim Almoço</label>
                      <input type="time" value={editForm.breakEnd || ''} onChange={(e) => setEditForm({...editForm, breakEnd: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg outline-none text-gray-600" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300 flex justify-center items-center gap-2"><X size={20} /> Cancelar</button>
                  <button onClick={() => handleSave(wh.id)} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 flex justify-center items-center gap-2"><Check size={20} /> Salvar</button>
                  <button onClick={() => copyToAll(editForm)} className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 flex justify-center items-center gap-2"><Copy size={20} /> Copiar para Seg-Sex</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center justify-between w-full gap-3">
                {wh.active ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-700 font-medium bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">Expediente: {wh.startTime} às {wh.endTime}</span>
                    {wh.breakStart && wh.breakEnd && (
                      <span className="text-gray-500 text-xs px-2">Intervalo: {wh.breakStart} às {wh.breakEnd}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-100 shadow-sm">Fechado</span>
                )}
                <button onClick={() => handleEdit(wh)} className="w-full sm:w-auto px-4 py-3 text-pink-600 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors flex justify-center items-center gap-2 font-bold whitespace-nowrap">
                  <Edit2 size={18} /> Editar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
