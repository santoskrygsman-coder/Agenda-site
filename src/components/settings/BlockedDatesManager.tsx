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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="bg-red-100 p-3 rounded-xl text-red-600"><CalendarOff size={24} /></div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Datas Bloqueadas</h2>
          <p className="text-sm text-gray-500">Feriados, folgas e ausências. Clientes não poderão agendar nesses dias.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase">Data</label>
          <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-pink-500" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase">Motivo (Opcional)</label>
          <input type="text" placeholder="Ex: Feriado" value={newReason} onChange={e => setNewReason(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-pink-500" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2">
            <Plus size={20} /> Bloquear
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {dates.length === 0 ? (
          <p className="text-center text-gray-500 py-4">Nenhuma data bloqueada.</p>
        ) : (
          dates.map((d) => {
            const [year, month, day] = d.date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            return (
              <div key={d.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 shadow-sm rounded-xl gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">{formattedDate}</span>
                  {d.reason && <span className="text-gray-500 italic">{d.reason}</span>}
                </div>
                <button onClick={() => handleDelete(d.id)} className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
