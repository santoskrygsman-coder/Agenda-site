"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  CalendarOff,
  Clock,
  Copy,
  Check,
  AlertCircle,
  SplitSquareVertical,
  X,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useBooking } from "@/context/BookingContext";
import {
  normalizeAndValidateWorkingHourItem,
  WEEKDAY_NAMES_PT,
  WorkingHourPeriod,
} from "@/lib/validation";

interface WorkingHourItem {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
  periods?: WorkingHourPeriod[];
}

interface BlockedDateItem {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const DEFAULT_HOURS: WorkingHourItem[] = [
  {
    weekday: 0,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: false,
  },
  {
    weekday: 1,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 2,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 3,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 4,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 5,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 6,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
];

function mergeWithSevenDays(incoming: WorkingHourItem[]): WorkingHourItem[] {
  const byDay = new Map<number, WorkingHourItem>();
  for (const item of incoming) {
    byDay.set(Number(item.weekday), {
      ...item,
      weekday: Number(item.weekday),
      breakStart: item.breakStart || null,
      breakEnd: item.breakEnd || null,
    });
  }
  return DEFAULT_HOURS.map((def) => byDay.get(def.weekday) || { ...def });
}

export default function AdminHorariosPage() {
  const { refreshWorkingHours } = useBooking();

  const [hours, setHours] = useState<WorkingHourItem[]>(DEFAULT_HOURS);
  const [savedSnapshot, setSavedSnapshot] =
    useState<WorkingHourItem[]>(DEFAULT_HOURS);
  const [twoPeriodsMode, setTwoPeriodsMode] = useState<Record<number, boolean>>(
    {}
  );
  const [blockedDates, setBlockedDates] = useState<BlockedDateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form para novo bloqueio
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null);
  const [blockFeedback, setBlockFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadWorkingHours = async () => {
    const whRes = await fetch("/api/working-hours", { cache: "no-store" });
    if (!whRes.ok) {
      const errBody = await whRes.json().catch(() => ({}));
      throw new Error(
        errBody.error || "Não foi possível carregar os horários de atendimento."
      );
    }
    const whData = await whRes.json();
    const merged = mergeWithSevenDays(Array.isArray(whData) ? whData : []);
    setHours(merged);
    setSavedSnapshot(merged);
  };

  const loadBlockedDates = async () => {
    const bdRes = await fetch("/api/blocked-dates", { cache: "no-store" });
    if (bdRes.ok) {
      const bdData = await bdRes.json();
      setBlockedDates(Array.isArray(bdData) ? bdData : []);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadWorkingHours(), loadBlockedDates()]);
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erro ao carregar horários de funcionamento.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleTwoPeriodsForDay = (day: WorkingHourItem) => {
    const currentlyTwo = Boolean(twoPeriodsMode[day.weekday]);
    if (currentlyTwo) {
      setTwoPeriodsMode((prev) => ({ ...prev, [day.weekday]: false }));
      setHours((prev) =>
        prev.map((item) =>
          item.weekday === day.weekday
            ? { ...item, breakStart: null, breakEnd: null }
            : item
        )
      );
    } else {
      const defaultP1End = day.breakStart || "12:00";
      const defaultP2Start = day.breakEnd || "13:00";
      setTwoPeriodsMode((prev) => ({ ...prev, [day.weekday]: true }));
      setHours((prev) =>
        prev.map((item) =>
          item.weekday === day.weekday
            ? {
                ...item,
                breakStart: defaultP1End,
                breakEnd: defaultP2Start,
              }
            : item
        )
      );
    }
  };

  const copyMondayToWeekdays = () => {
    const monday = hours.find((h) => h.weekday === 1);
    if (!monday) return;

    const isMonTwoPeriods = Boolean(twoPeriodsMode[1]);
    setTwoPeriodsMode((prev) => ({
      ...prev,
      2: isMonTwoPeriods,
      3: isMonTwoPeriods,
      4: isMonTwoPeriods,
      5: isMonTwoPeriods,
    }));

    setHours((prev) =>
      prev.map((item) =>
        item.weekday >= 2 && item.weekday <= 5
          ? {
              ...item,
              active: monday.active,
              startTime: monday.startTime,
              endTime: monday.endTime,
              breakStart: monday.breakStart,
              breakEnd: monday.breakEnd,
            }
          : item
      )
    );

    setFeedback({
      type: "success",
      message:
        "Horário de Segunda-feira copiado para Terça a Sexta! Clique em Salvar para gravar.",
    });
  };

  const isDayDirty = (day: WorkingHourItem): boolean => {
    const orig = savedSnapshot.find((s) => s.weekday === day.weekday);
    if (!orig) return true;
    return (
      orig.active !== day.active ||
      orig.startTime !== day.startTime ||
      orig.endTime !== day.endTime ||
      (orig.breakStart || null) !== (day.breakStart || null) ||
      (orig.breakEnd || null) !== (day.breakEnd || null)
    );
  };

  const dayValidationErrors: Record<number, string | null> = {};
  for (const day of hours) {
    const check = normalizeAndValidateWorkingHourItem(day);
    dayValidationErrors[day.weekday] = check.valid
      ? null
      : check.error || "Horário inválido.";
  }

  const firstValidationError =
    Object.values(dayValidationErrors).find((msg) => Boolean(msg)) || null;

  const persistWorkingHours = async (
    itemsToSave: WorkingHourItem[],
    singleWeekday?: number
  ) => {
    if (saving || savingDay !== null) return;

    // Validar todos os itens que estão sendo enviados antes de chamar a API
    for (const item of itemsToSave) {
      const check = normalizeAndValidateWorkingHourItem(item);
      if (!check.valid) {
        setFeedback({
          type: "error",
          message:
            check.error || "Corrija os horários inválidos antes de salvar.",
        });
        return;
      }
    }

    if (singleWeekday !== undefined) {
      setSavingDay(singleWeekday);
    } else {
      setSaving(true);
    }
    setFeedback(null);

    try {
      const payload = itemsToSave.map((item) => {
        const isTwoPeriods =
          Boolean(twoPeriodsMode[item.weekday]) &&
          Boolean(item.breakStart && item.breakEnd);
        return {
          weekday: item.weekday,
          active: item.active,
          startTime: item.startTime,
          endTime: item.endTime,
          breakStart: item.breakStart || null,
          breakEnd: item.breakEnd || null,
          ...(isTwoPeriods
            ? {
                periods: [
                  {
                    startTime: item.startTime,
                    endTime: item.breakStart!,
                  },
                  {
                    startTime: item.breakEnd!,
                    endTime: item.endTime,
                  },
                ],
              }
            : {}),
        };
      });

      const res = await fetch("/api/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          singleWeekday !== undefined ? payload[0] : payload
        ),
      });

      const responseData = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          (responseData &&
            typeof responseData === "object" &&
            "error" in responseData &&
            typeof responseData.error === "string" &&
            responseData.error) ||
          `Falha ao salvar horários (HTTP ${res.status}).`;
        setFeedback({
          type: "error",
          message: errorMsg,
        });
        return;
      }

      if (!Array.isArray(responseData) || responseData.length === 0) {
        setFeedback({
          type: "error",
          message:
            "A resposta do servidor foi inválida. Os horários não puderam ser confirmados.",
        });
        return;
      }

      const persisted = mergeWithSevenDays(responseData);

      // Se salvou apenas 1 dia, preserva na tela eventuais edições ainda não salvas de outros dias,
      // atualizando o snapshot salvo com o que veio do banco.
      if (singleWeekday !== undefined) {
        const persistedTarget = persisted.find(
          (p) => p.weekday === singleWeekday
        );
        if (persistedTarget) {
          setHours((prev) =>
            prev.map((item) =>
              item.weekday === singleWeekday ? persistedTarget : item
            )
          );
        }
        setSavedSnapshot(persisted);
        setFeedback({
          type: "success",
          message: `Horário de ${WEEKDAY_NAMES_PT[singleWeekday]} salvo com sucesso!`,
        });
      } else {
        setHours(persisted);
        setSavedSnapshot(persisted);
        setFeedback({
          type: "success",
          message: "Horários e folgas atualizados e salvos com sucesso!",
        });
      }

      await refreshWorkingHours(persisted);
    } catch {
      setFeedback({
        type: "error",
        message:
          "Erro de comunicação com o servidor ao salvar os horários. Verifique sua conexão e tente novamente.",
      });
    } finally {
      setSaving(false);
      setSavingDay(null);
    }
  };

  const handleSaveAllHours = async () => {
    const dirtyDays = hours.filter(isDayDirty);
    await persistWorkingHours(dirtyDays.length > 0 ? dirtyDays : [hours[0]]);
  };

  const handleSaveSingleDay = async (day: WorkingHourItem) => {
    await persistWorkingHours([day], day.weekday);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || addingBlock) return;
    setBlockFeedback(null);

    if (
      (blockStart && !blockEnd) ||
      (!blockStart && blockEnd) ||
      (blockStart && blockEnd && blockEnd <= blockStart)
    ) {
      setBlockFeedback({
        type: "error",
        message:
          "Para bloqueio parcial, informe início e fim válidos (com fim posterior ao início).",
      });
      return;
    }

    setAddingBlock(true);
    try {
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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBlockFeedback({
          type: "error",
          message: data?.error || "Não foi possível adicionar o bloqueio.",
        });
        return;
      }

      setBlockDate("");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      setBlockFeedback({
        type: "success",
        message: "Bloqueio de data adicionado com sucesso!",
      });
      if (data && data.id) {
        setBlockedDates((prev) =>
          [...prev, data].sort((a, b) => a.date.localeCompare(b.date))
        );
      } else {
        await loadBlockedDates();
      }
      await refreshWorkingHours(hours);
    } catch {
      setBlockFeedback({
        type: "error",
        message: "Erro de conexão ao adicionar bloqueio.",
      });
    } finally {
      setAddingBlock(false);
    }
  };

  const handleRemoveBlock = async (id: string) => {
    if (removingBlockId) return;
    setRemovingBlockId(id);
    try {
      const res = await fetch(`/api/blocked-dates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBlockedDates((prev) => prev.filter((b) => b.id !== id));
        await refreshWorkingHours(hours);
      }
    } finally {
      setRemovingBlockId(null);
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
          <div
            role="alert"
            className={`text-[12.5px] font-semibold px-3.5 py-2.5 rounded-[12px] flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-[#D8EFDC] text-[#2E8540] border border-[#B7E1BF]"
                : "bg-[#F3D8D8] text-[#B84A48] border border-[#E5B8B8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {feedback.type === "success" ? (
                <Check size={15} className="shrink-0" />
              ) : (
                <AlertCircle size={15} className="shrink-0" />
              )}
              <span>{feedback.message}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="opacity-70 hover:opacity-100 p-0.5"
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Expediente Semanal, Intervalos e Folgas */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#B87472]" />
              <h2 className="text-[15px] font-bold text-[#2D1C18]">
                Expediente, intervalos e folgas
              </h2>
            </div>
          </div>

          {loading ? (
            <p className="text-[13px] text-[#7A655D] px-1">Carregando...</p>
          ) : (
            <div className="space-y-2.5">
              {hours.map((day) => {
                const dayError = dayValidationErrors[day.weekday];
                const dirty = isDayDirty(day);
                const isTwoPeriods = Boolean(twoPeriodsMode[day.weekday]);

                return (
                  <div
                    key={day.weekday}
                    data-testid={`weekday-card-${day.weekday}`}
                    className={`bg-[#FAF5F1] border rounded-[16px] p-3.5 space-y-2.5 transition-colors ${
                      dayError
                        ? "border-[#C94A4A] bg-[#FDF6F6]"
                        : dirty
                        ? "border-[#B87472]"
                        : "border-[#E7DAD1]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13.5px] font-bold text-[#2D1C18]">
                          {WEEKDAY_NAMES_PT[day.weekday]}
                        </span>
                        {day.weekday === 1 && day.active && (
                          <button
                            type="button"
                            onClick={copyMondayToWeekdays}
                            className="min-h-[30px] inline-flex items-center gap-1 text-[11px] font-semibold text-[#B87472] bg-[#F4E3DC] hover:bg-[#EAD3C9] active:scale-95 px-2.5 py-1 rounded-full transition touch-manipulation"
                            title="Copiar horário de Segunda para Terça a Sexta"
                          >
                            <Copy size={11} />
                            <span>Copiar p/ Ter-Sex</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-[#6E5B53]">
                          {day.active ? "Ativo" : "Sem atendimento"}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-label={`Alternar atendimento de ${WEEKDAY_NAMES_PT[day.weekday]}`}
                          aria-checked={day.active}
                          onClick={() =>
                            updateDayField(day.weekday, "active", !day.active)
                          }
                          className={`w-[44px] h-[26px] rounded-full p-0.5 transition-colors flex items-center touch-manipulation ${
                            day.active ? "bg-[#B87472]" : "bg-[#D5C5BC]"
                          }`}
                        >
                          <span
                            className={`w-[22px] h-[22px] rounded-full bg-white shadow-xs transform transition-transform ${
                              day.active
                                ? "translate-x-[18px]"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {day.active ? (
                      <div className="space-y-2.5 text-[12px]">
                        {!isTwoPeriods ? (
                          <>
                            {/* Modo padrão: Expediente + Intervalo opcional */}
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                <span className="text-[#4E3B35] font-semibold">
                                  Expediente (Início e Término)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleTwoPeriodsForDay(day)}
                                  className="min-h-[30px] inline-flex items-center gap-1 text-[11px] font-semibold text-[#B87472] hover:underline px-1 touch-manipulation"
                                >
                                  <SplitSquareVertical size={12} />
                                  <span>2 períodos no dia</span>
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Início
                                  </label>
                                  <input
                                    type="time"
                                    aria-label={`Início ${WEEKDAY_NAMES_PT[day.weekday]}`}
                                    value={day.startTime}
                                    onChange={(e) =>
                                      updateDayField(
                                        day.weekday,
                                        "startTime",
                                        e.target.value
                                      )
                                    }
                                    className="min-h-[42px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Término
                                  </label>
                                  <input
                                    type="time"
                                    aria-label={`Término ${WEEKDAY_NAMES_PT[day.weekday]}`}
                                    value={day.endTime}
                                    onChange={(e) =>
                                      updateDayField(
                                        day.weekday,
                                        "endTime",
                                        e.target.value
                                      )
                                    }
                                    className="min-h-[42px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                                <span className="text-[#4E3B35] font-semibold">
                                  Intervalo / Pausa (opcional)
                                </span>
                                {(day.breakStart || day.breakEnd) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateDayField(
                                        day.weekday,
                                        "breakStart",
                                        null
                                      );
                                      updateDayField(
                                        day.weekday,
                                        "breakEnd",
                                        null
                                      );
                                    }}
                                    className="min-h-[30px] text-[11px] text-[#B84A48] font-semibold hover:underline px-1 touch-manipulation"
                                  >
                                    Sem intervalo
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Início da pausa
                                  </label>
                                  <input
                                    type="time"
                                    aria-label={`Início do intervalo ${WEEKDAY_NAMES_PT[day.weekday]}`}
                                    value={day.breakStart || ""}
                                    onChange={(e) =>
                                      updateDayField(
                                        day.weekday,
                                        "breakStart",
                                        e.target.value || null
                                      )
                                    }
                                    className="min-h-[42px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Fim da pausa
                                  </label>
                                  <input
                                    type="time"
                                    aria-label={`Fim do intervalo ${WEEKDAY_NAMES_PT[day.weekday]}`}
                                    value={day.breakEnd || ""}
                                    onChange={(e) =>
                                      updateDayField(
                                        day.weekday,
                                        "breakEnd",
                                        e.target.value || null
                                      )
                                    }
                                    className="min-h-[42px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Modo 2 Períodos explícitos no mesmo dia */}
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="text-[#4E3B35] font-semibold">
                                Configuração em 2 períodos no dia
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleTwoPeriodsForDay(day)}
                                className="min-h-[30px] text-[11px] text-[#B87472] font-semibold hover:underline px-1 touch-manipulation"
                              >
                                Usar período único
                              </button>
                            </div>

                            <div className="bg-[#F4EAE3]/70 border border-[#E5D6CC] rounded-[12px] p-2.5 space-y-1.5">
                              <span className="text-[11.5px] font-bold text-[#2D1C18] block">
                                1º Período (Manhã)
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Início 1º período
                                  </label>
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
                                    className="min-h-[42px] bg-[#FAF5F1] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Término 1º período
                                  </label>
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
                                    className="min-h-[42px] bg-[#FAF5F1] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#F4EAE3]/70 border border-[#E5D6CC] rounded-[12px] p-2.5 space-y-1.5">
                              <span className="text-[11.5px] font-bold text-[#2D1C18] block">
                                2º Período (Tarde / Noite)
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Início 2º período
                                  </label>
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
                                    className="min-h-[42px] bg-[#FAF5F1] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-[#6E5B53] block mb-0.5">
                                    Término 2º período
                                  </label>
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
                                    className="min-h-[42px] bg-[#FAF5F1] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] font-medium w-full text-[#2D1C18]"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#8E7970] italic">
                        Folga (sem atendimento neste dia)
                      </p>
                    )}

                    {dayError && (
                      <div className="bg-[#F3D8D8] text-[#B84A48] text-[11.5px] font-semibold px-2.5 py-1.5 rounded-[10px] flex items-center gap-1.5">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{dayError}</span>
                      </div>
                    )}

                    {dirty && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={
                            Boolean(dayError) ||
                            saving ||
                            savingDay === day.weekday
                          }
                          onClick={() => handleSaveSingleDay(day)}
                          className={`min-h-[40px] px-3.5 py-2 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5 transition touch-manipulation ${
                            dayError || saving || savingDay === day.weekday
                              ? "bg-[#DFD3CC] text-[#8E7970] cursor-not-allowed"
                              : "bg-[#B87472] hover:bg-[#A66361] active:scale-[0.98] text-white shadow-xs"
                          }`}
                        >
                          <Check size={14} />
                          <span>
                            {savingDay === day.weekday
                              ? "Salvando dia..."
                              : `Salvar somente ${WEEKDAY_NAMES_PT[day.weekday]}`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {feedback && (
            <div
              className={`text-[12.5px] font-semibold px-3.5 py-2.5 rounded-[12px] flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-[#D8EFDC] text-[#2E8540] border border-[#B7E1BF]"
                  : "bg-[#F3D8D8] text-[#B84A48] border border-[#E5B8B8]"
              }`}
            >
              {feedback.type === "success" ? (
                <Check size={15} className="shrink-0" />
              ) : (
                <AlertCircle size={15} className="shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <PrimaryButton
            variant="rose"
            disabled={
              loading ||
              saving ||
              savingDay !== null ||
              Boolean(firstValidationError)
            }
            onClick={handleSaveAllHours}
            className="mt-2"
          >
            {saving
              ? "Salvando..."
              : "Salvar horários de funcionamento"}
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

          {blockFeedback && (
            <div
              className={`text-[12px] font-semibold px-3 py-2 rounded-[10px] ${
                blockFeedback.type === "success"
                  ? "bg-[#D8EFDC] text-[#2E8540]"
                  : "bg-[#F3D8D8] text-[#B84A48]"
              }`}
            >
              {blockFeedback.message}
            </div>
          )}

          <form
            onSubmit={handleAddBlock}
            className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] p-3.5 space-y-2.5"
          >
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full min-h-[44px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] text-[#2D1C18]"
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
                  enterKeyHint="done"
                  className="w-full min-h-[44px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] text-[#2D1C18]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11.5px] text-[#6E5B53] mb-1">
                  Início (vazio = dia todo)
                </label>
                <input
                  type="time"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full min-h-[44px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] text-[#2D1C18]"
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
                  className="w-full min-h-[44px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[13px] text-[#2D1C18]"
                />
              </div>
            </div>

            <PrimaryButton
              type="submit"
              variant="neutral"
              disabled={addingBlock}
              leftIcon={<Plus size={15} />}
            >
              {addingBlock ? "Adicionando..." : "Adicionar bloqueio"}
            </PrimaryButton>
          </form>

          {blockedDates.length > 0 && (
            <div className="space-y-2">
              {blockedDates.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[14px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-[12.5px]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#2D1C18] truncate">
                      {b.date}{" "}
                      {b.startTime && b.endTime
                        ? `(${b.startTime} às ${b.endTime})`
                        : "(Dia inteiro)"}
                    </p>
                    {b.reason && (
                      <p className="text-[#6E5B53] text-[11.5px] truncate">{b.reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={removingBlockId === b.id}
                    onClick={() => handleRemoveBlock(b.id)}
                    className="w-10 h-10 shrink-0 flex items-center justify-center text-[#B84A48] hover:bg-[#F3D8D8] active:scale-95 rounded-lg transition touch-manipulation disabled:opacity-45"
                    aria-label="Remover bloqueio"
                  >
                    <Trash2 size={16} />
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
