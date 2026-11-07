"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  FileCheck2,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useBooking } from "@/context/BookingContext";
import { AppointmentItem } from "@/lib/mockData";
import { formatDateLongPtBr, formatDateShortDdMm } from "@/lib/formatters";
import {
  getDefaultBookingDate,
  getTodayLocalIso,
  isPastDate,
  maskBrazilianPhone,
  validateFullName,
  validateWhatsAppPhone,
} from "@/lib/validation";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type AgendaViewMode = "dia" | "semana" | "mes";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDaysMonToSat(isoDateStr: string) {
  const [y, m, d] = isoDateStr.split("-").map(Number);
  const current = new Date(y, m - 1, d);
  const dayOfWeek = current.getDay(); // 0=Dom .. 6=Sab
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(y, m - 1, d + diffToMonday);

  return Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i
    );
    return {
      label: WEEKDAY_SHORT[dt.getDay()],
      day: dt.getDate(),
      date: toIsoDate(dt),
    };
  });
}

export default function AdminDailyAgendaPage() {
  const router = useRouter();
  const { services, setSelectedAppointment } = useBooking();

  const [viewMode, setViewMode] = useState<AgendaViewMode>("dia");
  const [activeDate, setActiveDate] = useState<string>(
    () => getDefaultBookingDate().iso
  );
  const [allAppointments, setAllAppointments] = useState<AppointmentItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal de novo agendamento rápido pela profissional
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [apptDate, setApptDate] = useState(() => getDefaultBookingDate().iso);
  const [apptTime, setApptTime] = useState("14:00");
  const [modalSlots, setModalSlots] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (services.length > 0 && (!serviceId || !services.some((s) => s.id === serviceId))) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  useEffect(() => {
    if (!newModalOpen) return;
    const chosenId = serviceId || services[0]?.id || "";
    const chosenSvc = services.find((s) => s.id === chosenId) || services[0];
    const query = new URLSearchParams({
      date: apptDate,
      duration: String(chosenSvc?.durationMinutes || 90),
    });
    if (
      chosenId &&
      !chosenId.startsWith("extensao-") &&
      !chosenId.startsWith("volume-")
    ) {
      query.set("serviceId", chosenId);
    }
    fetch(`/api/availability?${query.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.times)) {
          setModalSlots(data.times);
          if (data.times.length > 0 && !data.times.includes(apptTime)) {
            setApptTime(
              data.times.includes("14:00") ? "14:00" : data.times[0]
            );
          }
        }
      })
      .catch(() => {});
  }, [newModalOpen, apptDate, serviceId, services]);

  const isModalFormValid =
    !validateFullName(clientName) &&
    !validateWhatsAppPhone(clientPhone) &&
    Boolean(serviceId || services[0]?.id) &&
    /^\d{4}-\d{2}-\d{2}$/.test(apptDate) &&
    !isPastDate(apptDate) &&
    /^\d{2}:\d{2}$/.test(apptTime);

  const weekDays = useMemo(
    () => getWeekDaysMonToSat(activeDate),
    [activeDate]
  );

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const allRes = await fetch("/api/appointments", { cache: "no-store" });
      if (allRes.ok) {
        const allData: AppointmentItem[] = await allRes.json();
        setAllAppointments(Array.isArray(allData) ? allData : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const appointments = useMemo(() => {
    const monthPrefix = activeDate.slice(0, 7);
    const startOfWeek = weekDays[0]?.date || activeDate;
    const endOfWeek = weekDays[weekDays.length - 1]?.date || activeDate;
    return allAppointments.filter((a) => {
      if (!a.date) return false;
      if (viewMode === "dia") return a.date === activeDate;
      if (viewMode === "semana") {
        return a.date >= startOfWeek && a.date <= endOfWeek;
      }
      return a.date.startsWith(monthPrefix);
    });
  }, [allAppointments, activeDate, viewMode, weekDays]);

  const pendingNotifications = useMemo(
    () =>
      allAppointments.filter(
        (a) =>
          a.status === "aguardando" ||
          (a.receiptReportedAt && a.status !== "confirmado")
      ),
    [allAppointments]
  );

  const shiftWeek = (deltaDays: number) => {
    const [y, m, d] = activeDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + deltaDays);
    setActiveDate(toIsoDate(next));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const chosenServiceId = serviceId || services[0]?.id;
    if (!chosenServiceId) {
      setFormError("Selecione um serviço.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: chosenServiceId,
        date: apptDate,
        time: apptTime,
        name: clientName,
        phone: clientPhone,
        notes,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error || "Erro ao criar agendamento.");
      return;
    }

    setNewModalOpen(false);
    setClientName("");
    setClientPhone("");
    setNotes("");
    setActiveDate(apptDate);
    setFeedbackMsg("Novo agendamento registrado com sucesso!");
    setTimeout(() => setFeedbackMsg(""), 3000);
    loadAppointments();
  };

  const [yearNum, monthNum] = activeDate.split("-").map(Number);
  const periodTitle =
    viewMode === "dia"
      ? formatDateLongPtBr(activeDate)
      : viewMode === "semana"
      ? `Semana ${formatDateShortDdMm(weekDays[0].date)} a ${formatDateShortDdMm(
          weekDays[weekDays.length - 1].date
        )}`
      : `${MONTH_NAMES[(monthNum || 1) - 1]} de ${yearNum}`;

  return (
    <MobileContainer showAdminNav activeAdminTab="agenda">
      {/* Top Nude-Blush Header & Dynamic Week Strip */}
      <div className="bg-gradient-to-b from-[#EEDBD2] to-[#F4EAE3] pb-3 border-b border-[#E5D6CC] relative">
        <PageHeader
          title="Agenda do dia"
          leftType="menu"
          rightType="bell"
          onRightClick={() => setNotificationsOpen(true)}
        />

        {pendingNotifications.length > 0 && (
          <span className="pointer-events-none absolute top-3.5 right-4 w-4 h-4 rounded-full bg-[#B87472] text-white text-[9.5px] font-bold flex items-center justify-center z-20">
            {pendingNotifications.length}
          </span>
        )}

        <div className="px-2.5 min-[375px]:px-4 pt-0.5 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="w-8 h-8 min-[375px]:w-9 min-[375px]:h-9 shrink-0 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3] active:scale-95 transition touch-manipulation"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={17} />
          </button>

          <div className="flex-1 grid grid-cols-6 gap-0.5 min-[375px]:gap-1 text-center">
            {weekDays.map((item) => {
              const isSelected = activeDate === item.date;
              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => {
                    setActiveDate(item.date);
                    setViewMode("dia");
                  }}
                  className="min-h-[54px] flex flex-col items-center justify-center py-1 group touch-manipulation"
                >
                  <span
                    className={`text-[10.5px] min-[375px]:text-[11px] px-1.5 min-[375px]:px-2 py-0.5 rounded-t-full transition-colors ${
                      isSelected
                        ? "bg-[#C78583] text-white font-semibold"
                        : "text-[#6E5B53] font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`-mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-[13px] min-[375px]:text-[13.5px] transition-colors ${
                      isSelected
                        ? "bg-[#B87472] text-white font-bold shadow-xs"
                        : "text-[#2D1C18] font-semibold group-hover:bg-[#E8D7CD]"
                    }`}
                  >
                    {item.day}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => shiftWeek(7)}
            className="w-8 h-8 min-[375px]:w-9 min-[375px]:h-9 shrink-0 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3] active:scale-95 transition touch-manipulation"
            aria-label="Próxima semana"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 min-[375px]:px-5 pt-3.5 pb-20 flex-1 relative">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-[13.5px] min-[375px]:text-[14px] font-bold text-[#2D1C18] truncate max-w-full">
            {periodTitle}
          </h2>

          {/* Seletor compacto Dia / Semana / Mês */}
          <div className="inline-flex bg-[#EADCD3] rounded-full p-0.5 text-[11.5px] shrink-0">
            {(["dia", "semana", "mes"] as AgendaViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`min-h-[34px] px-2.5 py-1 rounded-full capitalize transition-colors touch-manipulation ${
                  viewMode === m
                    ? "bg-[#B87472] text-white font-semibold"
                    : "text-[#5C4841]"
                }`}
              >
                {m === "mes" ? "Mês" : m}
              </button>
            ))}
          </div>
        </div>

        {feedbackMsg && (
          <div className="mb-3 bg-[#D8EFDC] border border-[#BDE2C4] text-[#2E8540] text-[12px] font-semibold px-3 py-2 rounded-[12px] text-center">
            {feedbackMsg}
          </div>
        )}

        {loading ? (
          <p className="text-[13px] text-[#7A655D] py-6 text-center">
            Carregando agenda...
          </p>
        ) : appointments.length === 0 ? (
          <div className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] p-5 text-center">
            <p className="text-[13.5px] font-semibold text-[#2D1C18]">
              Nenhum atendimento agendado para este período.
            </p>
            <p className="text-[12px] text-[#6E5B53] mt-1">
              Toque no botão + abaixo para registrar um novo agendamento.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {appointments.map((apt) => (
              <button
                key={apt.id}
                type="button"
                onClick={() => {
                  setSelectedAppointment(apt);
                  router.push(`/admin/agendamento?id=${apt.id}`);
                }}
                className="w-full text-left bg-[#FAF5F1] hover:bg-[#F5ECE5] active:scale-[0.99] transition border border-[#E7DAD1] rounded-[16px] px-3.5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="shrink-0 w-[46px]">
                    <span className="text-[14px] font-bold text-[#2D1C18] block">
                      {apt.time}
                    </span>
                    {viewMode !== "dia" && apt.date && (
                      <span className="text-[10.5px] text-[#7A655D] font-medium">
                        {formatDateShortDdMm(apt.date)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#2D1C18] leading-snug truncate">
                      {apt.clientName}
                    </p>
                    <p className="text-[12.5px] text-[#6E5B53] mt-0.5 truncate">
                      {apt.serviceName}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={apt.status} label={apt.statusLabel} />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Floating Action Button (+) */}
        <button
          type="button"
          onClick={() => {
            setApptDate(activeDate);
            setServiceId(services[0]?.id || "");
            setNewModalOpen(true);
          }}
          className="absolute bottom-4 right-5 w-12 h-12 rounded-full bg-[#B87472] hover:bg-[#A66361] active:scale-95 transition text-white shadow-[0_4px_14px_rgba(184,116,114,0.4)] flex items-center justify-center z-20"
          aria-label="Novo agendamento"
        >
          <Plus size={22} strokeWidth={2.2} />
        </button>
      </div>

      {/* Modal de Notificações e Sinais Pendentes */}
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-3"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="w-full max-w-[410px] max-h-[85dvh] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-4 min-[375px]:p-5 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF] gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bell size={17} className="text-[#B87472] shrink-0" />
                <h3 className="font-serif text-[17px] min-[375px]:text-[18px] font-semibold text-[#2D1C18] truncate">
                  Sinais e Comprovantes ({pendingNotifications.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Fechar notificações"
                className="w-10 h-10 shrink-0 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-3 overflow-y-auto space-y-2.5 flex-1">
              {pendingNotifications.length === 0 ? (
                <p className="text-[13px] text-[#6E5B53] text-center py-6">
                  Nenhum agendamento aguardando confirmação de sinal no momento.
                </p>
              ) : (
                pendingNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedAppointment(item);
                      setNotificationsOpen(false);
                      router.push(`/admin/agendamento?id=${item.id}`);
                    }}
                    className="w-full text-left bg-[#FAF5F1] hover:bg-[#F3E6DE] border border-[#E7DAD1] rounded-[14px] p-3.5 flex items-center justify-between gap-2 touch-manipulation"
                  >
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-[#2D1C18] truncate">
                        {item.clientName} • {item.time}
                      </p>
                      <p className="text-[12px] text-[#6E5B53] truncate">
                        {item.serviceName} ({item.dateFormatted})
                      </p>
                      {item.receiptReportedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#2E8540] font-bold mt-1">
                          <FileCheck2 size={12} className="shrink-0" />
                          <span>Cliente abriu o WhatsApp • Aguardando confirmação</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#B57F24] font-semibold mt-1 block">
                          Aguardando confirmação do sinal
                        </span>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-[#B87472] shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento pela Profissional */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-2.5 min-[375px]:p-3">
          <div className="w-full max-w-[410px] max-h-[88dvh] overflow-y-auto bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-4 min-[375px]:p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                Novo agendamento
              </h3>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                aria-label="Fechar modal"
                className="w-10 h-10 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleCreateAppointment}
              className="mt-3 space-y-3"
            >
              {formError && (
                <div className="bg-[#F3D8D8] text-[#B84A48] text-[12px] px-3 py-2 rounded-[10px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Nome da cliente *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome e sobrenome"
                  autoComplete="name"
                  enterKeyHint="next"
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18]"
                />
                {clientName.trim().length > 0 && validateFullName(clientName) && (
                  <p className="mt-1 text-[11px] font-medium text-[#B84A48]">
                    {validateFullName(clientName)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  value={clientPhone}
                  onChange={(e) =>
                    setClientPhone(maskBrazilianPhone(e.target.value))
                  }
                  placeholder="(73) 99999-9999"
                  autoComplete="tel"
                  enterKeyHint="next"
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18]"
                />
                {clientPhone.trim().length > 0 && validateWhatsAppPhone(clientPhone) && (
                  <p className="mt-1 text-[11px] font-medium text-[#B84A48]">
                    {validateWhatsAppPhone(clientPhone)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Procedimento *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} • {s.priceFormatted})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    min={getTodayLocalIso()}
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-2.5 py-2 text-[13.5px] text-[#2D1C18]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-2.5 py-2 text-[13.5px] text-[#2D1C18]"
                  />
                </div>
              </div>

              {modalSlots.length > 0 && (
                <div>
                  <span className="block text-[11.5px] font-medium text-[#6E5B53] mb-1.5">
                    Horários livres na data (toque rápido):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto">
                    {modalSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setApptTime(slot)}
                        className={`min-h-[34px] px-2.5 py-1 rounded-full text-[12px] border transition touch-manipulation ${
                          apptTime === slot
                            ? "bg-[#B87472] text-white border-[#B87472] font-bold"
                            : "bg-[#FAF5F1] text-[#2D1C18] border-[#E4D5CB] font-medium"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: prefere resultado natural"
                  enterKeyHint="done"
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18]"
                />
              </div>

              <div className="pt-2">
                <PrimaryButton
                  type="submit"
                  variant="rose"
                  disabled={!isModalFormValid || saving}
                >
                  {saving ? "Salvando..." : "Confirmar agendamento"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
