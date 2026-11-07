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
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<
    AppointmentItem[]
  >([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal de novo agendamento rápido pela profissional
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [apptDate, setApptDate] = useState(() => getDefaultBookingDate().iso);
  const [apptTime, setApptTime] = useState("14:00");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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
      const monthPrefix = activeDate.slice(0, 7);
      const startOfWeek = weekDays[0]?.date || activeDate;
      const endOfWeek = weekDays[weekDays.length - 1]?.date || activeDate;

      const query =
        viewMode === "dia"
          ? `date=${activeDate}`
          : viewMode === "semana"
          ? `startDate=${startOfWeek}&endDate=${endOfWeek}`
          : `month=${monthPrefix}`;

      const [res, allRes] = await Promise.all([
        fetch(`/api/appointments?${query}`),
        fetch("/api/appointments"),
      ]);

      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
      if (allRes.ok) {
        const allData: AppointmentItem[] = await allRes.json();
        setPendingNotifications(
          allData.filter(
            (a) =>
              a.status === "aguardando" ||
              (a.receiptReportedAt && a.status !== "confirmado")
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [activeDate, viewMode, weekDays]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

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
          <span className="pointer-events-none absolute top-4 right-5 w-4 h-4 rounded-full bg-[#B87472] text-white text-[9.5px] font-bold flex items-center justify-center z-20">
            {pendingNotifications.length}
          </span>
        )}

        <div className="px-4 pt-0.5 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3]"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="flex-1 grid grid-cols-6 gap-1 text-center">
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
                  className="flex flex-col items-center justify-center py-0.5 group"
                >
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-t-full transition-colors ${
                      isSelected
                        ? "bg-[#C78583] text-white font-semibold"
                        : "text-[#6E5B53] font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`-mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-[13.5px] transition-colors ${
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
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3]"
            aria-label="Próxima semana"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 pt-3.5 pb-20 flex-1 relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[14px] font-bold text-[#2D1C18] truncate">
            {periodTitle}
          </h2>

          {/* Seletor compacto Dia / Semana / Mês */}
          <div className="inline-flex bg-[#EADCD3] rounded-full p-0.5 text-[11px] shrink-0">
            {(["dia", "semana", "mes"] as AgendaViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-2 py-0.5 rounded-full capitalize transition-colors ${
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
            className="w-full max-w-[390px] max-h-[80vh] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-5 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <div className="flex items-center gap-2">
                <Bell size={17} className="text-[#B87472]" />
                <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                  Sinais e Comprovantes ({pendingNotifications.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="w-7 h-7 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18]"
              >
                <X size={16} />
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
                    className="w-full text-left bg-[#FAF5F1] hover:bg-[#F3E6DE] border border-[#E7DAD1] rounded-[14px] p-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-[13.5px] font-bold text-[#2D1C18]">
                        {item.clientName} • {item.time}
                      </p>
                      <p className="text-[12px] text-[#6E5B53]">
                        {item.serviceName} ({item.dateFormatted})
                      </p>
                      {item.receiptReportedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#2E8540] font-bold mt-1">
                          <FileCheck2 size={12} />
                          Cliente abriu o WhatsApp • Aguardando confirmação
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#B57F24] font-semibold mt-1 block">
                          Aguardando confirmação do sinal
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-[#B87472]" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento pela Profissional */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-3">
          <div className="w-full max-w-[390px] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                Novo agendamento
              </h3>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18]"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateAppointment}
              className="mt-3 space-y-2.5"
            >
              {formError && (
                <div className="bg-[#F3D8D8] text-[#B84A48] text-[12px] px-3 py-2 rounded-[10px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Nome da cliente
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) =>
                    setClientPhone(maskBrazilianPhone(e.target.value))
                  }
                  placeholder="(73) 99999-9999"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Procedimento *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13px]"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} • {s.priceFormatted})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    min={getTodayLocalIso()}
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-2.5 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                    Horário *
                  </label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-2.5 py-2 text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#4E3B35] mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: prefere resultado natural"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13px]"
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
