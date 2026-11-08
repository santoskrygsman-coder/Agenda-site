"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Calendar,
  Clock,
  Wallet,
  X,
  FileCheck2,
  AlertCircle,
  Ban,
  RotateCcw,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import StatusBadge from "@/components/ui/StatusBadge";
import { WhatsAppCircleIcon } from "@/components/ui/BotanicalDecor";
import { useBooking } from "@/context/BookingContext";
import {
  buildExpiredAppointmentWhatsAppUrl,
  buildProfessionalToClientWhatsAppUrl,
} from "@/lib/whatsapp";
import { getDefaultBookingDate, getTodayLocalIso } from "@/lib/validation";

function AppointmentDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const { selectedAppointment, setSelectedAppointment, studioSettings } =
    useBooking();

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Modal de remarcação / reativação
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reactivatingCancelled, setReactivatingCancelled] = useState(false);
  const [newDate, setNewDate] = useState(() => getDefaultBookingDate().iso);
  const [newTime, setNewTime] = useState("14:00");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const reloadAppointmentById = async (targetId: string) => {
    const res = await fetch(
      `/api/appointments?id=${encodeURIComponent(targetId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const list = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      setSelectedAppointment(list[0]);
    }
  };

  useEffect(() => {
    const fetchLatest = async () => {
      const targetId = queryId || selectedAppointment?.id;
      if (targetId) {
        await reloadAppointmentById(targetId);
        return;
      }

      const res = await fetch("/api/appointments", { cache: "no-store" });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        setSelectedAppointment(list[0]);
      }
    };
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryId]);

  const appt = selectedAppointment;

  useEffect(() => {
    if (!rescheduleOpen || !appt) return;
    const todayIso = getTodayLocalIso();
    const rawDate =
      appt.date && appt.date >= todayIso ? appt.date : getDefaultBookingDate().iso;
    setNewDate(rawDate);
    setNewTime(appt.time);
  }, [rescheduleOpen, appt]);

  useEffect(() => {
    if (!rescheduleOpen || !appt) return;
    fetch(
      `/api/availability?date=${newDate}&serviceId=${appt.serviceId}&excludeAppointmentId=${appt.id}`,
      { cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.times)) {
          setAvailableSlots(data.times);
          if (data.times.length > 0 && !data.times.includes(newTime)) {
            setNewTime(data.times[0]);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleOpen, newDate, appt]);

  const handleConfirmManual = async () => {
    if (!appt) return;
    setLoading(true);
    setErrorMsg("");
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CONFIRMED",
        paymentStatus: "SIGNAL_PAID",
      }),
    });
    setLoading(false);

    if (res.ok) {
      await reloadAppointmentById(appt.id);
      setFeedback(
        "Status alterado para 'Sinal confirmado' manualmente pela profissional!"
      );
      setTimeout(() => setFeedback(""), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || "Erro ao confirmar agendamento.");
    }
  };

  const handleCancel = async () => {
    if (!appt) return;
    setLoading(true);
    setErrorMsg("");
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CANCELLED",
      }),
    });
    setLoading(false);

    if (res.ok) {
      setSelectedAppointment({
        ...appt,
        dbStatus: "CANCELLED",
        status: "cancelado",
        statusLabel: "Cancelado",
        expiresAt: null,
      });
      await reloadAppointmentById(appt.id);
      setFeedback("Agendamento cancelado e horário liberado imediatamente na agenda.");
      setTimeout(() => setFeedback(""), 3500);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || "Erro ao cancelar agendamento.");
    }
  };

  const handleCompleteFullPayment = async () => {
    if (!appt) return;
    setLoading(true);
    setErrorMsg("");
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETED",
        paymentStatus: "FULL_PAID",
      }),
    });
    setLoading(false);

    if (res.ok) {
      await reloadAppointmentById(appt.id);
      setMoreMenuOpen(false);
      setFeedback(
        "Atendimento concluído e pagamento integral (100%) registrado no financeiro!"
      );
      setTimeout(() => setFeedback(""), 3500);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || "Erro ao concluir atendimento.");
    }
  };

  const handleDeletePermanent = async () => {
    if (!appt) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/agenda");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Erro ao excluir agendamento.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao excluir agendamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appt) return;
    setLoading(true);
    setErrorMsg("");

    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: newDate,
        startTime: newTime,
        ...(reactivatingCancelled ? { reactivateCancelled: true } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(data.error || "Horário indisponível para remarcação.");
      return;
    }

    setRescheduleOpen(false);
    setReactivatingCancelled(false);
    await reloadAppointmentById(appt.id);
    setFeedback(
      reactivatingCancelled
        ? "Atendimento reagendado e reativado com sucesso!"
        : "Horário do agendamento atualizado com sucesso!"
    );
    setTimeout(() => setFeedback(""), 3000);
  };

  if (!appt) {
    return (
      <MobileContainer showAdminNav activeAdminTab="agenda">
        <PageHeader
          title="Detalhes do agendamento"
          leftType="back"
          backHref="/admin/agenda"
          rightType="more"
        />
        <div className="px-5 py-10 text-center">
          <p className="text-[14px] text-[#5C4841]">
            Selecione um agendamento na Agenda do dia para visualizar seus
            detalhes.
          </p>
          <div className="mt-4">
            <PrimaryButton href="/admin/agenda" variant="rose">
              Voltar para a Agenda
            </PrimaryButton>
          </div>
        </div>
      </MobileContainer>
    );
  }

  const isCancelled =
    appt.dbStatus === "CANCELLED" ||
    appt.status === "cancelado" ||
    appt.statusLabel === "Cancelado";
  const isCompleted =
    appt.dbStatus === "COMPLETED" || appt.status === "concluido";

  const rawDate = appt.date || "2025-03-14";
  const dbStatus = isCancelled
    ? "CANCELLED"
    : appt.status === "confirmado" || isCompleted
    ? "CONFIRMED"
    : "PENDING";

  const waUrl = buildProfessionalToClientWhatsAppUrl({
    clientPhone: appt.clientPhone,
    clientName: appt.clientName,
    serviceName: appt.serviceName,
    dateStr: rawDate,
    timeStr: appt.time,
    status: dbStatus,
  });

  const bookingOrigin =
    typeof window !== "undefined"
      ? `${window.location.origin}/servicos`
      : "https://emile-lash-designer.netlify.app/servicos";

  const expiredWaUrl = buildExpiredAppointmentWhatsAppUrl({
    clientPhone: appt.clientPhone,
    clientName: appt.clientName,
    dateStr: rawDate,
    timeStr: appt.time,
    studioName: studioSettings.professionalName,
    bookingUrl: bookingOrigin,
  });

  return (
    <MobileContainer showAdminNav activeAdminTab="agenda">
      <PageHeader
        title="Detalhes do agendamento"
        leftType="back"
        backHref="/admin/agenda"
        rightType="more"
        onRightClick={() => setMoreMenuOpen((prev) => !prev)}
      />

      {moreMenuOpen && (
        <div className="mx-4 min-[375px]:mx-5 mb-2 bg-[#FAF5F1] border border-[#E5D4C9] rounded-[14px] p-2 shadow-lg space-y-1">
          {!isCancelled && !isCompleted && (
            <button
              type="button"
              onClick={handleCompleteFullPayment}
              className="w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-[#2E8540] hover:bg-[#D8EFDC]/60 active:scale-[0.99] transition touch-manipulation"
            >
              ✓ Concluir atendimento (Receber 100%)
            </button>
          )}
          <button
            type="button"
            onClick={handleDeletePermanent}
            className="w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-[#B84A48] hover:bg-[#F3D8D8]/60 active:scale-[0.99] transition touch-manipulation"
          >
            Excluir agendamento permanentemente
          </button>
        </div>
      )}

      <div className="px-4 min-[375px]:px-5 pt-1 pb-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Top Centered Status Pill */}
          <div className="flex justify-center my-2">
            <StatusBadge
              status={isCancelled ? "cancelado" : appt.status}
              label={isCancelled ? "Cancelado" : appt.statusLabel}
              size="md"
            />
          </div>

          {feedback && (
            <div className="my-2 bg-[#D8EFDC] text-[#2E8540] text-[12px] font-semibold px-3 py-2.5 rounded-[12px] text-center">
              {feedback}
            </div>
          )}

          {errorMsg && (
            <div className="my-2 bg-[#F3D8D8] text-[#B84A48] text-[12px] font-semibold px-3 py-2.5 rounded-[12px] text-center">
              {errorMsg}
            </div>
          )}

          {/* Client Row */}
          <div className="mt-2 py-3.5 border-b border-[#E6D9D0] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <User size={19} className="text-[#3D2923] shrink-0" />
              <div className="min-w-0">
                <h2 className="text-[15.5px] font-bold text-[#2D1C18] leading-tight truncate">
                  {appt.clientName}
                </h2>
                <p className="text-[13px] text-[#5C4841] mt-0.5 truncate">
                  {appt.clientPhone}
                </p>
              </div>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-[#EADCD3]/60 active:scale-95 transition shrink-0 touch-manipulation"
              aria-label="Conversar no WhatsApp com mensagem pré-preenchida"
            >
              <WhatsAppCircleIcon size={28} variant="green" />
            </a>
          </div>

          {/* Date, Time & Service Rows */}
          <div className="divide-y divide-[#ECE0D8] border-b border-[#E6D9D0]">
            <div className="py-3 flex items-center gap-3.5 text-[13.5px] text-[#2D1C18]">
              <Calendar size={18} className="text-[#4E3B35] shrink-0" />
              <span className="font-semibold">{appt.dateFormatted}</span>
            </div>

            <div className="py-3 flex items-center gap-3.5 text-[13.5px] text-[#2D1C18]">
              <Clock size={18} className="text-[#4E3B35] shrink-0" />
              <span className="font-bold">
                {appt.time} - {appt.endTime}
              </span>
            </div>

            <div className="py-3 flex items-start gap-3.5 text-[13.5px] text-[#2D1C18]">
              <Wallet size={18} className="text-[#4E3B35] shrink-0 mt-1" />
              <div className="flex-1">
                <p className="font-semibold text-[14px]">{appt.serviceName}</p>
                <p className="font-bold text-[15px] mt-0.5">
                  Valor total: {appt.priceFormatted}
                </p>
                {typeof appt.signalAmount === "number" &&
                  appt.signalAmount > 0 && (
                    <div className="mt-1 text-[12px] text-[#5C4841] flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>
                        Sinal ({appt.signalPercentage ?? 50}%):{" "}
                        <strong className="text-[#2D1C18]">
                          {appt.signalFormatted}
                        </strong>
                      </span>
                      {appt.remainingFormatted && (
                        <span>
                          Restante:{" "}
                          <strong className="text-[#2D1C18]">
                            {appt.remainingFormatted}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Card de Status do Sinal / Cancelamento */}
          <div
            className={`mt-3.5 rounded-[16px] p-3.5 border ${
              isCancelled
                ? "bg-[#F9EBEB] border-[#E5C2C2]"
                : "bg-[#FAF5F1] border-[#E7DAD1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                {isCancelled ? (
                  <Ban size={17} className="text-[#B84A48] shrink-0 mt-0.5" />
                ) : appt.status === "confirmado" || isCompleted ? (
                  <FileCheck2
                    size={17}
                    className="text-[#2E8540] shrink-0 mt-0.5"
                  />
                ) : (
                  <AlertCircle
                    size={17}
                    className="text-[#B87472] shrink-0 mt-0.5"
                  />
                )}
                <div>
                  <h3 className="text-[13px] font-bold text-[#2D1C18]">
                    {isCancelled
                      ? "Atendimento Cancelado"
                      : "Comprovante do Sinal (via WhatsApp)"}
                  </h3>
                  <p className="text-[11.5px] text-[#5C4841] mt-0.5 leading-snug">
                    {isCancelled
                      ? "Atendimento cancelado — confirmação de sinal encerrada e horário liberado na agenda para novas clientes."
                      : appt.status === "confirmado" || isCompleted
                      ? "Sinal confirmado manualmente pela profissional"
                      : appt.receiptReportedAt
                      ? "Aguardando confirmação • Cliente abriu o WhatsApp para enviar o comprovante"
                      : "Aguardando confirmação • Comprovante deve ser conferido no WhatsApp"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3.5 space-y-2.5">
            {isCancelled ? (
              <>
                <PrimaryButton
                  variant="neutral"
                  disabled={loading}
                  leftIcon={<RotateCcw size={16} />}
                  onClick={() => {
                    setErrorMsg("");
                    setReactivatingCancelled(true);
                    setRescheduleOpen(true);
                  }}
                >
                  Reagendar atendimento cancelado
                </PrimaryButton>

                <a
                  href={expiredWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[46px] bg-[#F5E6DF] hover:bg-[#EDD8CE] active:scale-[0.99] border border-[#E2C8BE] text-[#4A3630] rounded-[14px] py-3 px-3.5 flex items-center justify-center gap-2 text-[12.5px] font-semibold transition touch-manipulation text-center"
                >
                  <WhatsAppCircleIcon size={17} variant="green" />
                  <span>
                    Avisar cliente que o horário foi liberado (falta de sinal)
                  </span>
                </a>
              </>
            ) : (
              <>
                {!isCompleted &&
                  (appt.status === "confirmado" ? (
                    <PrimaryButton
                      variant="confirm"
                      disabled={loading}
                      onClick={handleCompleteFullPayment}
                    >
                      {loading
                        ? "Processando..."
                        : "Concluir atendimento (Receber restante)"}
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton
                      variant="confirm"
                      disabled={loading}
                      onClick={handleConfirmManual}
                    >
                      {loading
                        ? "Processando..."
                        : "Confirmar sinal (Sinal confirmado)"}
                    </PrimaryButton>
                  ))}

                {!isCompleted && (
                  <PrimaryButton
                    variant="neutral"
                    disabled={loading}
                    onClick={() => {
                      setErrorMsg("");
                      setReactivatingCancelled(false);
                      setRescheduleOpen(true);
                    }}
                  >
                    Remarcar
                  </PrimaryButton>
                )}

                {!isCompleted && (
                  <PrimaryButton
                    variant="danger-soft"
                    disabled={loading}
                    onClick={handleCancel}
                  >
                    Cancelar
                  </PrimaryButton>
                )}

                {appt.status === "aguardando" && (
                  <a
                    href={expiredWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[46px] bg-[#F5E6DF] hover:bg-[#EDD8CE] active:scale-[0.99] border border-[#E2C8BE] text-[#4A3630] rounded-[14px] py-3 px-3.5 flex items-center justify-center gap-2 text-[12.5px] font-semibold transition touch-manipulation text-center"
                  >
                    <WhatsAppCircleIcon size={17} variant="green" />
                    <span>
                      Avisar cliente que o horário foi liberado (falta de sinal)
                    </span>
                  </a>
                )}
              </>
            )}
          </div>

          {/* Client Notes Card */}
          <div className="mt-3.5 bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] px-4 py-3">
            <h3 className="text-[13.5px] font-bold text-[#2D1C18]">
              Observações da cliente
            </h3>
            <p className="text-[13px] text-[#5C4841] mt-1">
              {appt.notes || "Nenhuma observação informada."}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Remarcação / Reativação com verificação real de disponibilidade */}
      {rescheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-2.5 min-[375px]:p-3">
          <div className="w-full max-w-[410px] max-h-[88dvh] overflow-y-auto bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-4 min-[375px]:p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                {reactivatingCancelled
                  ? "Reagendar atendimento cancelado"
                  : "Remarcar agendamento"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRescheduleOpen(false);
                  setReactivatingCancelled(false);
                }}
                aria-label="Fechar modal"
                className="w-10 h-10 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-3 space-y-3">
              {errorMsg && (
                <div className="bg-[#F3D8D8] text-[#B84A48] text-[12px] font-semibold px-3 py-2 rounded-[10px] text-center">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Nova data
                </label>
                <input
                  type="date"
                  required
                  min={getTodayLocalIso()}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Horários disponíveis na data
                </label>
                {availableSlots.length === 0 ? (
                  <p className="text-[12.5px] text-[#B84A48] py-2">
                    Nenhum horário disponível nesta data.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className={`min-h-[44px] py-2.5 rounded-[11px] text-[13px] border transition active:scale-[0.98] touch-manipulation ${
                          newTime === slot
                            ? "bg-[#B87472] text-white border-[#B87472] font-bold"
                            : "bg-[#FAF5F1] text-[#2D1C18] border-[#E4D5CB] font-medium"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <PrimaryButton
                  type="submit"
                  variant="rose"
                  disabled={
                    loading ||
                    availableSlots.length === 0 ||
                    !newTime ||
                    !availableSlots.includes(newTime)
                  }
                >
                  {reactivatingCancelled
                    ? "Confirmar novo horário e reativar"
                    : "Salvar novo horário"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}

export default function AppointmentDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#F4EAE3]" />}>
      <AppointmentDetailsContent />
    </Suspense>
  );
}
