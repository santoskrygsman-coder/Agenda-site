"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Check,
  QrCode,
  Copy,
  Hourglass,
  Sparkles,
  Info,
  X,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import ServiceCard from "@/components/ui/ServiceCard";
import {
  BotanicalSprigRight,
  WhatsAppCircleIcon,
} from "@/components/ui/BotanicalDecor";
import { FICTITIOUS_PIX_KEY, FICTITIOUS_PHONE } from "@/lib/mockData";
import { useBooking } from "@/context/BookingContext";
import {
  calculateSignalInCents,
  formatDateLongPtBr,
} from "@/lib/formatters";
import { buildClientReceiptWhatsAppUrl } from "@/lib/whatsapp";
import { buildQrMatrixFromPayload, generatePixCopyPaste } from "@/lib/pix";

export default function BookingSummaryPage() {
  const {
    selectedService,
    selectedDate,
    selectedTime,
    clientData,
    studioSettings,
    lastCreatedAppointmentId,
    lastCreatedExpiresAt,
    reportReceiptSent,
  } = useBooking();

  const [copiedEmv, setCopiedEmv] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);

  // Estado do cronômetro de reserva
  const holdMins = studioSettings.holdMinutes || 15;
  const [targetTimestamp, setTargetTimestamp] = useState<number>(() => {
    if (lastCreatedExpiresAt) {
      const parsed = new Date(lastCreatedExpiresAt).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) return parsed;
    }
    return Date.now() + holdMins * 60 * 1000;
  });
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    holdMins * 60
  );

  useEffect(() => {
    if (lastCreatedExpiresAt) {
      const parsed = new Date(lastCreatedExpiresAt).getTime();
      if (!isNaN(parsed)) {
        setTargetTimestamp(parsed);
      }
    }
  }, [lastCreatedExpiresAt]);

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.floor((targetTimestamp - Date.now()) / 1000)
      );
      setRemainingSeconds(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  const countdownMinutes = String(Math.floor(remainingSeconds / 60)).padStart(
    2,
    "0"
  );
  const countdownSecs = String(remainingSeconds % 60).padStart(2, "0");

  const requiresSignal = selectedService.requiresDeposit !== false;
  const rawPct =
    selectedService.depositPercentage ?? studioSettings.signalPercentage ?? 50;
  const signalCalc = calculateSignalInCents(
    selectedService.price,
    requiresSignal,
    rawPct
  );
  const signalPct = signalCalc.signalPercentage;
  const signalAmount = signalCalc.signalAmount;
  const remainingAmount = signalCalc.remainingAmount;
  const totalFormatted = signalCalc.totalAmount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const signalFormatted = signalAmount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const remainingFormatted = remainingAmount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayPixKey = studioSettings.pixKey || FICTITIOUS_PIX_KEY;
  const displayPixType = studioSettings.pixKeyType || "CPF";

  const pixEmvPayload = generatePixCopyPaste({
    pixKey: displayPixKey,
    merchantName: studioSettings.professionalName || "ESTUDIO CILIOS",
    amount: signalAmount,
    txid: lastCreatedAppointmentId
      ? lastCreatedAppointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)
      : "SINALCILIOS",
  });

  const qrMatrix = buildQrMatrixFromPayload(pixEmvPayload, 25);

  const handleCopyPixEmv = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pixEmvPayload).catch(() => {});
    }
    setCopiedEmv(true);
    setTimeout(() => setCopiedEmv(false), 2500);
  };

  const handleCopyPixKey = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(displayPixKey).catch(() => {});
    }
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendReceiptWhatsApp = async () => {
    if (lastCreatedAppointmentId) {
      await reportReceiptSent(lastCreatedAppointmentId);
    }
    setWhatsappOpened(true);

    const waUrl = buildClientReceiptWhatsAppUrl({
      studioPhone: studioSettings.whatsapp,
      clientName: clientData.name.trim() || "Cliente",
      clientPhone: clientData.phone.trim() || FICTITIOUS_PHONE,
      serviceName: selectedService.name,
      dateStr: selectedDate,
      timeStr: selectedTime,
      signalAmount,
      totalAmount: selectedService.price,
    });

    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <MobileContainer>
      <PageHeader
        title="Resumo do agendamento"
        leftType="back"
        backHref="/agendar/dados"
        rightType="botanical"
      />

      <div className="px-4 min-[375px]:px-5 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex-1 flex flex-col justify-between relative">
        <div className="space-y-3">
          {/* Status oficial do agendamento */}
          {requiresSignal ? (
            <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#F7E3BE] border border-[#E6CC9C] text-[#9A681C] rounded-[14px] px-3 py-2 text-[11.5px] min-[375px]:text-[12px] font-bold">
              <span className="flex items-center gap-1.5">
                <Hourglass size={13.5} className="shrink-0" />
                <span>Status: Aguardando confirmação</span>
              </span>
              {remainingSeconds > 0 && (
                <span className="bg-[#FFFDFB]/85 px-2 py-0.5 rounded-full text-[11px] text-[#6E493A]">
                  Reserva: {countdownMinutes}:{countdownSecs}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#D8EFDC] border border-[#BDE2C4] text-[#2E8540] rounded-[14px] px-3 py-2 text-[12px] font-bold">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="shrink-0" />
                <span>Status: Horário confirmado (Sem sinal obrigatório)</span>
              </span>
            </div>
          )}

          {/* Selected Service Summary Card */}
          <ServiceCard service={selectedService} mode="summary" />

          {/* Date, Time & Client Rows */}
          <div className="bg-[#FAF5F1]/90 border border-[#E7DAD1] rounded-[16px] px-3.5 py-2.5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#2D1C18]">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar size={15} className="text-[#B87472] shrink-0" />
                <span>{formatDateLongPtBr(selectedDate)}</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-[#2D1C18]">
                <Clock size={14} className="text-[#B87472] shrink-0" />
                <span>{selectedTime}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-[#4E3B35] pt-1 border-t border-[#ECE0D7]">
              <User size={14} className="text-[#B87472] shrink-0" />
              <span className="font-semibold text-[#2D1C18] truncate max-w-[170px] min-[375px]:max-w-[210px]">
                {clientData.name.trim() || "Seu nome"}
              </span>
              <span>•</span>
              <span>{clientData.phone.trim() || FICTITIOUS_PHONE}</span>
            </div>
          </div>

          {/* Valores do Sinal e Saldo */}
          <div className="bg-[#F4E3DC] border border-[#E5CEC4] rounded-[18px] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[12.5px] text-[#5C4740]">
              <span>Valor total do procedimento</span>
              <span className="font-semibold text-[#2D1C18]">
                R$ {totalFormatted}
              </span>
            </div>
            {requiresSignal ? (
              <>
                <div className="flex items-center justify-between text-[13px] font-bold text-[#2D1C18] pt-1 border-t border-[#E5CEC4]/70">
                  <span>Valor do sinal ({signalPct}%)</span>
                  <span className="text-[#9E5856]">R$ {signalFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-[12.5px] text-[#5C4740]">
                  <span className="flex items-center gap-1">
                    <Info size={12.5} className="text-[#8C756C] shrink-0" />
                    <span>Restante no dia do atendimento</span>
                  </span>
                  <span className="font-semibold text-[#2D1C18]">
                    R$ {remainingFormatted}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[13px] font-bold text-[#2E8540] pt-1 border-t border-[#E5CEC4]/70">
                  <span>Sinal antecipado (0%)</span>
                  <span>Isento (R$ 0,00)</span>
                </div>
                <div className="flex items-center justify-between text-[13px] text-[#2D1C18]">
                  <span className="flex items-center gap-1 font-medium">
                    <Info size={12.5} className="text-[#8C756C] shrink-0" />
                    <span>Restante no dia do atendimento</span>
                  </span>
                  <span className="font-bold text-[#2D1C18]">
                    R$ {remainingFormatted}
                  </span>
                </div>
              </>
            )}
          </div>

          {requiresSignal ? (
            /* Pagamento via Pix */
            <div className="space-y-2.5">
              <div>
                <h2 className="font-serif text-[19px] font-bold text-[#2D1C18]">
                  Pagamento via Pix
                </h2>
                <p className="text-[12.5px] text-[#5C4740] leading-snug">
                  Faça o pagamento do sinal de{" "}
                  <strong className="text-[#2D1C18]">R$ {signalFormatted}</strong>{" "}
                  para confirmar seu horário.
                </p>
              </div>

              {/* Chave Pix Card */}
              <div className="bg-[#FAF5F1] border border-[#E6D8CF] rounded-[16px] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-[#6E5850]">
                      Chave Pix ({displayPixType})
                    </p>
                    <p className="text-[14px] font-bold text-[#2D1C18] truncate">
                      {displayPixKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPixKey}
                    className="min-h-[44px] bg-[#FFFDFB] hover:bg-[#F5ECE6] active:scale-95 transition border border-[#E2D4CB] text-[#2D1C18] font-bold text-[12.5px] px-3.5 py-2 rounded-[11px] flex items-center gap-1.5 shrink-0 shadow-2xs touch-manipulation"
                  >
                    {copiedKey ? (
                      <>
                        <Check size={14} className="text-[#2E8540]" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-[#6E5850]" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-[#EFE4DC]">
                  <button
                    type="button"
                    onClick={handleCopyPixEmv}
                    className="min-h-[44px] flex-1 bg-[#F4E3DC] hover:bg-[#ECD5CC] active:scale-[0.99] text-[#2D1C18] font-semibold text-[12px] py-2 px-3 rounded-[11px] flex items-center justify-center gap-1.5 transition touch-manipulation"
                  >
                    {copiedEmv ? (
                      <>
                        <Check size={14} className="text-[#2E8540] shrink-0" />
                        <span>PIX Copia e Cola copiado!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13.5} className="text-[#B87472] shrink-0" />
                        <span>Copiar PIX Copia e Cola</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="min-h-[44px] bg-[#FFFDFB] hover:bg-[#F5ECE6] active:scale-95 border border-[#E2D4CB] text-[#2D1C18] font-semibold text-[12px] py-2 px-3 rounded-[11px] flex items-center justify-center gap-1.5 transition shrink-0 touch-manipulation"
                  >
                    <QrCode size={14} className="text-[#B87472]" />
                    <span>QR Code</span>
                  </button>
                </div>
              </div>

              {/* Botão destacado obrigatório: Enviar comprovante pelo WhatsApp */}
              <button
                type="button"
                onClick={handleSendReceiptWhatsApp}
                className="w-full min-h-[52px] bg-[#B87472] hover:bg-[#A66361] active:scale-[0.99] transition text-[#FFFDFB] rounded-full py-3.5 px-4 flex items-center justify-center gap-2.5 text-[14.5px] font-bold shadow-[0_6px_18px_rgba(184,116,114,0.28)] touch-manipulation"
              >
                <WhatsAppCircleIcon size={21} variant="light" />
                <span>Enviar comprovante pelo WhatsApp</span>
              </button>

              {/* Aviso obrigatório: anexar imagem manualmente no WhatsApp e status Aguardando confirmação */}
              <div className="bg-[#FAF5F1] border border-[#E5D2C7] rounded-[14px] p-3 space-y-1.5">
                <div className="flex items-start gap-2 text-[12px] text-[#3D2A24] leading-snug">
                  <AlertTriangle
                    size={15}
                    className="text-[#B87472] shrink-0 mt-0.5"
                  />
                  <p>
                    <strong className="text-[#2D1C18]">Importante:</strong> Ao
                    abrir a conversa no WhatsApp com seus dados pré-preenchidos,{" "}
                    <strong className="text-[#2D1C18] underline">
                      anexe manualmente a imagem do comprovante do Pix
                    </strong>
                    .
                  </p>
                </div>

                <div className="flex items-start gap-2 text-[11.5px] text-[#6E5850] leading-snug pt-1 border-t border-[#EFE4DC]">
                  <ShieldAlert
                    size={14}
                    className="text-[#9A681C] shrink-0 mt-0.5"
                  />
                  <p>
                    {whatsappOpened
                      ? 'WhatsApp aberto! Seu pagamento permanece como "Aguardando confirmação" até que a profissional confira o comprovante e altere para "Sinal confirmado".'
                      : 'O pagamento permanece como "Aguardando confirmação" e só será alterado para "Sinal confirmado" manualmente pela profissional após receber seu comprovante no WhatsApp.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Fluxo para serviço sem cobrança obrigatória de sinal */
            <div className="space-y-2.5">
              <div className="bg-[#FAF5F1] border border-[#E6D8CF] rounded-[16px] p-4 space-y-2">
                <h2 className="font-serif text-[18px] font-bold text-[#2D1C18]">
                  Agendamento concluído!
                </h2>
                <p className="text-[12.5px] text-[#5C4740] leading-relaxed">
                  Este procedimento não exige pagamento antecipado de sinal. Seu
                  horário já está reservado na agenda e o valor de{" "}
                  <strong className="text-[#2D1C18]">
                    R$ {remainingFormatted}
                  </strong>{" "}
                  será acertado no dia do atendimento.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendReceiptWhatsApp}
                className="w-full min-h-[52px] bg-[#B87472] hover:bg-[#A66361] active:scale-[0.99] transition text-[#FFFDFB] rounded-full py-3.5 px-4 flex items-center justify-center gap-2.5 text-[14.5px] font-bold shadow-[0_6px_18px_rgba(184,116,114,0.28)] touch-manipulation"
              >
                <WhatsAppCircleIcon size={21} variant="light" />
                <span>Enviar confirmação pelo WhatsApp</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer note & subtle botanical accent */}
        <div className="mt-3 pt-1 relative">
          <p className="text-[11px] text-[#5C4740] leading-[1.35] pr-6 relative z-10">
            Após o pagamento, envie o comprovante pelo WhatsApp para que
            possamos confirmar seu horário.
          </p>
          <BotanicalSprigRight className="w-[75px] h-[50px] absolute -right-4 -bottom-4 opacity-70 pointer-events-none" />
        </div>
      </div>

      {/* Modal de QR Code PIX */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#2D1C18]/65 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="w-full max-w-[350px] max-h-[90dvh] overflow-y-auto bg-[#FAF5F1] border border-[#E5D4C9] rounded-[24px] p-5 text-center space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-[19px] font-bold text-[#2D1C18]">
                QR Code PIX
              </h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="w-11 h-11 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition"
                aria-label="Fechar QR Code"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12.5px] text-[#5C4740]">
              Escaneie no aplicativo do seu banco para pagar o sinal de{" "}
              <strong className="text-[#2D1C18]">R$ {signalFormatted}</strong>
            </p>

            <div className="bg-white p-3.5 rounded-[18px] border border-[#E5D4C9] inline-block mx-auto shadow-xs">
              <svg
                viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                className="w-[180px] h-[180px]"
                shapeRendering="crispEdges"
              >
                {qrMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) =>
                    cell ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width={1}
                        height={1}
                        fill="#2D1C18"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <button
              type="button"
              onClick={handleCopyPixEmv}
              className="w-full min-h-[48px] bg-[#B87472] hover:bg-[#A66361] active:scale-[0.99] text-white font-semibold text-[14px] py-3 rounded-full flex items-center justify-center gap-2 transition"
            >
              {copiedEmv ? <Check size={16} /> : <Copy size={15} />}
              <span>
                {copiedEmv ? "Código PIX copiado!" : "Copiar código PIX"}
              </span>
            </button>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
