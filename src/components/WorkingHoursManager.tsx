"use client";

import { useState } from "react";
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
    <section className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-6 overflow-hidden font-sans text-[#3A3335]">
      <div className="flex items-center gap-4 mb-6 border-b border-[#F3E8E8] pb-5">
        <div className="bg-[#F0F7F4] p-3.5 rounded-2xl text-[#5A7A66]">
          <Clock size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#3A3335]">Horários de Atendimento</h2>
          <p className="text-sm text-[#8B7E7F] font-medium mt-0.5">Configure os horários e intervalos de cada dia.</p>
        </div>
      </div>

      <div className="space-y-4">
        {workingHours.map((wh) => (
          <div key={wh.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-[#FCFAFA] rounded-2xl border border-[#F3E8E8] text-sm gap-4 transition-all hover:border-[#D9A0A0]">
            <span className="font-bold text-[#3A3335] w-32 tracking-wide uppercase text-xs">{diasSemana[wh.weekday]}</span>
            
            {editingId === wh.id ? (
              <div className="flex flex-col w-full gap-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({...editForm, active: e.target.checked})} className="w-5 h-5 text-[#B98389] rounded border-[#F3E8E8] focus:ring-[#B98389]" />
                  <span className="font-bold text-[#3A3335]">Aberto neste dia</span>
                </label>
                {editForm.active && (
                  <div className="grid grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
                    <div>
                      <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Abre às</label>
                      <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({...editForm, startTime: e.target.value})} className="w-full p-3 border border-[#F3E8E8] rounded-xl outline-none font-bold text-[#3A3335] focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all bg-[#FCFAFA]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Fecha às</label>
                      <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({...editForm, endTime: e.target.value})} className="w-full p-3 border border-[#F3E8E8] rounded-xl outline-none font-bold text-[#3A3335] focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all bg-[#FCFAFA]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Início Almoço</label>
                      <input type="time" value={editForm.breakStart || ''} onChange={(e) => setEditForm({...editForm, breakStart: e.target.value})} className="w-full p-3 border border-[#F3E8E8] rounded-xl outline-none font-bold text-[#5A5052] focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all bg-[#FCFAFA]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Fim Almoço</label>
                      <input type="time" value={editForm.breakEnd || ''} onChange={(e) => setEditForm({...editForm, breakEnd: e.target.value})} className="w-full p-3 border border-[#F3E8E8] rounded-xl outline-none font-bold text-[#5A5052] focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all bg-[#FCFAFA]" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-2">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-3.5 bg-[#FFF5F5] text-[#A76D74] font-bold text-sm tracking-wide rounded-xl hover:bg-[#F3E8E8] flex justify-center items-center gap-2 transition-colors active:scale-[0.98]"><X size={18} /> CANCELAR</button>
                  <button onClick={() => handleSave(wh.id)} className="flex-1 py-3.5 bg-[#5A7A66] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#4A6454] flex justify-center items-center gap-2 transition-colors active:scale-[0.98] shadow-md shadow-[#5A7A66]/20"><Check size={18} /> SALVAR</button>
                  <button onClick={() => copyToAll(editForm)} className="flex-1 py-3.5 bg-[#FCFAFA] border border-[#F3E8E8] text-[#3A3335] font-bold text-sm tracking-wide rounded-xl hover:bg-[#F3E8E8] flex justify-center items-center gap-2 transition-colors active:scale-[0.98]"><Copy size={18} /> COPIAR SEG-SEX</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center justify-between w-full gap-4">
                {wh.active ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[#3A3335] font-bold text-sm bg-white px-4 py-2 rounded-xl border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.01)] inline-block">Expediente: {wh.startTime} às {wh.endTime}</span>
                    {wh.breakStart && wh.breakEnd && (
                      <span className="text-[#8B7E7F] text-xs font-medium px-2">Intervalo: {wh.breakStart} às {wh.breakEnd}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[#A76D74] font-bold bg-[#FFF5F5] px-4 py-2 rounded-xl border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-xs uppercase tracking-wide">Fechado</span>
                )}
                <button onClick={() => handleEdit(wh)} className="w-full sm:w-auto px-5 py-3.5 text-[#B98389] bg-[#FFF5F5] rounded-xl hover:bg-[#F3E8E8] transition-all flex justify-center items-center gap-2 font-bold whitespace-nowrap active:scale-[0.98] text-sm tracking-wide">
                  <Edit2 size={16} /> EDITAR
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
