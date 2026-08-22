"use client";

import { useState, useEffect } from "react";
import { CalendarOff, Trash2, Plus } from "lucide-react";

export default function BlockedDatesManager() {
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    fetch('/api/blocked-dates')
      .then(res => res.json())
      .then(data => {
        setDates(data);
        setLoading(false);
      });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    const res = await fetch('/api/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newDate, reason: newReason })
    });

    if (res.ok) {
      const added = await res.json();
      setDates([...dates, added].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDate("");
      setNewReason("");
    } else {
      alert("Erro ao bloquear data ou data já bloqueada.");
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Deseja desbloquear esta data?")) return;
    await fetch(`/api/blocked-dates/${id}`, { method: 'DELETE' });
    setDates(dates.filter(d => d.id !== id));
  };

  if (loading) return <div className="text-center p-4">Carregando...</div>;

  return (
    <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-6 overflow-hidden font-sans text-[#3A3335]">
      <div className="flex items-center gap-4 mb-6 border-b border-[#F3E8E8] pb-5">
        <div className="bg-[#FFF5F5] p-3.5 rounded-2xl text-[#A76D74]"><CalendarOff size={24} /></div>
        <div>
          <h2 className="text-xl font-bold text-[#3A3335]">Datas Bloqueadas</h2>
          <p className="text-sm text-[#8B7E7F] font-medium mt-0.5">Feriados, folgas e ausências. Clientes não poderão agendar nesses dias.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 mb-6 bg-[#FCFAFA] p-5 rounded-2xl border border-[#F3E8E8]">
        <div className="flex-1">
          <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Data</label>
          <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-3.5 border border-[#F3E8E8] rounded-xl outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all bg-white text-[#3A3335]" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1.5 block">Motivo (Opcional)</label>
          <input type="text" placeholder="Ex: Feriado" value={newReason} onChange={e => setNewReason(e.target.value)} className="w-full p-3.5 border border-[#F3E8E8] rounded-xl outline-none focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] transition-all bg-white text-[#3A3335]" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full sm:w-auto px-6 py-3.5 bg-[#5A7A66] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#4A6454] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-[#5A7A66]/20">
            <Plus size={18} /> BLOQUEAR
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {dates.length === 0 ? (
          <div className="bg-white border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-10 rounded-3xl text-center text-[#8B7E7F] font-medium">
            <CalendarOff size={32} className="mx-auto mb-3 opacity-20" />
            Nenhuma data bloqueada.
          </div>
        ) : (
          dates.map((d) => {
            const [year, month, day] = d.date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            return (
              <div key={d.id} className="flex justify-between items-center p-4 bg-white border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.01)] rounded-2xl gap-4 transition-all hover:border-[#D9A0A0]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <span className="font-bold text-[#3A3335] bg-[#FCFAFA] border border-[#F3E8E8] px-3.5 py-1.5 rounded-xl text-sm">{formattedDate}</span>
                  {d.reason && <span className="text-[#8B7E7F] font-medium italic text-sm">{d.reason}</span>}
                </div>
                <button onClick={() => handleDelete(d.id)} className="p-3.5 text-[#A76D74] bg-[#FFF5F5] rounded-xl hover:bg-[#F3E8E8] transition-colors active:scale-95">
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
