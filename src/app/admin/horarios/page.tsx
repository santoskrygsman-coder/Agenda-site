"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, CalendarOff, Clock } from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface WorkingHourItem {
  weekday: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
}

interface BlockedDateItem {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default function AdminHorariosPage() {
  const [hours, setHours] = useState<WorkingHourItem[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Form para novo bloqueio
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, bdRes] = await Promise.all([
        fetch("/api/working-hours"),
        fetch("/api/blocked-dates"),
      ]);
      if (whRes.ok) {
        const whData = await whRes.json();
        setHours(whData);
      }
      if (bdRes.ok) {
        const bdData = await bdRes.json();
        setBlockedDates(bdData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateDayField = (
    weekday: number,
    field: keyof WorkingHourItem,
    value: string | boolean | null
  ) => {
    setHours((prev) =>
      prev.map((item) =>
        item.weekday === weekday ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveHours = async () => {
    setSaving(true);
    setFeedback("");
    try {
      const res = await fetch("/api/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hours),
      });
      if (res.ok) {
        setFeedback("Horários e folgas atualizados com sucesso!");
        setTimeout(() => setFeedback(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;
    const res = await fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: blockDate,
        startTime: blockStart || null,
        endTime: blockEnd || null,
        reason: blockReason || null,
      }),
    });
    if (res.ok) {
      setBlockDate("");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      loadData();
    }
  };

  const handleRemoveBlock = async (id: string) => {
    const res = await fetch(`/api/blocked-dates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
    }
  };

  return (
    <MobileContainer showAdminNav activeAdminTab="mais">
      <PageHeader
        title="Horários e Bloqueios"
        leftType="back"
        backHref="/admin/mais"
        rightType="botanical"
      />

      <div className="px-4 pt-1 pb-6 space-y-5 flex-1">
        {feedback && (
          <div className="bg-[#D8EFDC] text-[#2E8540] text-[12.5px] font-semibold px-3.5 py-2.5 rounded-[12px] text-center">
            {feedback}
          </div>
        )}

        {/* Expediente Semanal, Intervalos e Folgas */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <Clock size={16} className="text-[#B87472]" />
            <h2 className="text-[15px] font-bold text-[#2D1C18]">
              Expediente, intervalos e folgas
            </h2>
          </div>

          {loading ? (
            <p className="text-[13px] text-[#7A655D] px-1">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {hours.map((day) => (
                <div
                  key={day.weekday}
                  className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-bold text-[#2D1C18]">
                      {WEEKDAY_LABELS[day.weekday]}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={day.active}
                      onClick={() =>
                        updateDayField(day.weekday, "active", !day.active)
                      }
                      className={`w-[42px] h-[24px] rounded-full p-0.5 transition-colors flex items-center ${
                        day.active ? "bg-[#B87472]" : "bg-[#D5C5BC]"
                      }`}
                    >
                      <span
                        className={`w-[20px] h-[20px] rounded-full bg-white shadow-xs transform transition-transform ${
                          day.active ? "translate-x-[18px]" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {day.active ? (
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div>
                        <span className="text-[#6E5B53] block mb-0.5">
                          Expediente
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) =>
                              updateDayField(
                                day.weekday,
                                "startTime",
                                e.target.value
                              )
                            }
                            className="bg-[#F4EAE3] border border-[#E2D3C9] rounded-[8px] px-1.5 py-1 text-[12px] w-full"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) =>
                              updateDayField(
                                day.weekday,
                                "endTime",
                                e.target.value
                              )
                            }
                            className="bg-[#F4EAE3] border border-[#E2D3C9] rounded-[8px] px-1.5 py-1 text-[12px] w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[#6E5B53] block mb-0.5">
                          Intervalo / Pausa
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={day.breakStart || ""}
                            onChange={(e) =>
                              updateDayField(
                                day.weekday,
                                "breakStart",
                                e.target.value || null
                              )
                            }
                            className="bg-[#F4EAE3] border border-[#E2D3C9] rounded-[8px] px-1.5 py-1 text-[12px] w-full"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={day.breakEnd || ""}
                            onChange={(e) =>
                              updateDayField(
                                day.weekday,
                                "breakEnd",
                                e.target.value || null
                              )
                            }
                            className="bg-[#F4EAE3] border border-[#E2D3C9] rounded-[8px] px-1.5 py-1 text-[12px] w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#8E7970] italic">
                      Folga (sem atendimento)
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <PrimaryButton
            variant="rose"
            onClick={handleSaveHours}
            className="mt-2"
          >
            {saving ? "Salvando..." : "Salvar horários de funcionamento"}
          </PrimaryButton>
        </section>

        {/* Bloqueios de Datas e Horários */}
        <section className="pt-2 border-t border-[#E5D6CC] space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CalendarOff size={16} className="text-[#B87472]" />
            <h2 className="text-[15px] font-bold text-[#2D1C18]">
              Bloqueios de datas e horários
            </h2>
          </div>

          <form
            onSubmit={handleAddBlock}
            className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] p-3.5 space-y-2.5"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-1.5 text-[12.5px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Feriado, Consulta"
                  className="w-full bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-1.5 text-[12.5px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11.5px] text-[#6E5B53] mb-1">
                  Início (vazio = dia todo)
                </label>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-1.5 text-[12.5px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] text-[#6E5B53] mb-1">
                  Fim (vazio = dia todo)
                </label>
                <input
                  type="time"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-1.5 text-[12.5px]"
                />
              </div>
            </div>

            <PrimaryButton
              type="submit"
              variant="neutral"
              leftIcon={<Plus size={15} />}
            >
              Adicionar bloqueio
            </PrimaryButton>
          </form>

          {blockedDates.length > 0 && (
            <div className="space-y-2">
              {blockedDates.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[14px] px-3.5 py-2.5 flex items-center justify-between text-[12.5px]"
                >
                  <div>
                    <p className="font-bold text-[#2D1C18]">
                      {b.date}{" "}
                      {b.startTime && b.endTime
                        ? `(${b.startTime} às ${b.endTime})`
                        : "(Dia inteiro)"}
                    </p>
                    {b.reason && (
                      <p className="text-[#6E5B53] text-[11.5px]">{b.reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(b.id)}
                    className="p-1.5 text-[#B84A48] hover:bg-[#F3D8D8] rounded-lg"
                    aria-label="Remover bloqueio"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MobileContainer>
  );
}
