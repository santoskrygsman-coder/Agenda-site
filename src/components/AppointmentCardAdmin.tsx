"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Check, X, Clock, Trash2, CheckCheck } from "lucide-react";
import { WhatsAppService } from "@/lib/whatsappService";

import { useRouter } from "next/navigation";

export default function AppointmentCardAdmin({ appointment, settings }: { appointment: any, settings: any }) {
  const [status, setStatus] = useState(appointment.status);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [year, month, day] = appointment.date.split("-");
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const dateFormatted = format(dateObj, "dd/MM/yyyy");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null); // "CANCELLED", "REJECTED", "COMPLETED"

  const handleUpdate = async (newStatus: string) => {
    if (newStatus !== "CONFIRMED" && newStatus !== "PAID_MANUALLY" && confirmAction !== newStatus) {
      setConfirmAction(newStatus);
      return;
    }

    setLoading(true);
    try {
      const isPayment = newStatus === "PAID_MANUALLY";
      const payload = isPayment ? { paymentStatus: "PAID_MANUALLY" } : { status: newStatus };
      
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        if (!isPayment) setStatus(newStatus);
        setConfirmAction(null);
        setIsModalOpen(false);
        // Simple visual feedback instead of alert
        const msg = newStatus === "CONFIRMED" ? "✓ Agendamento confirmado!" :
                    newStatus === "REJECTED" ? "✓ Solicitação recusada." :
                    newStatus === "CANCELLED" ? "✓ Cancelamento concluído." :
                    newStatus === "COMPLETED" ? "✓ Atendimento concluído." :
                    "✓ Sinal marcado como recebido.";
        showToast(msg);
        router.refresh();
      }
    } catch (e) {
      showToast("Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    // We'll dispatch a custom event or just use a simple dom element since we don't have a global toast context handy here
    const toast = document.createElement("div");
    toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#3A3335] text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("fade-out", "slide-out-to-bottom-5");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleWhatsAppClick = async () => {
    if (appointment.whatsappStatus !== "OPENED" && appointment.whatsappStatus !== "SENT_MANUALLY") {
      try {
        await fetch(`/api/appointments/${appointment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsappStatus: "OPENED" })
        });
        router.refresh();
      } catch (e) {}
    }
  };

  const getWhatsAppLink = () => {
    const { client, service, startTime } = appointment;
    if (status === "PENDING") {
      return WhatsAppService.generateWhatsAppLink(client.phone, "");
    } else if (status === "CONFIRMED") {
      const msg = WhatsAppService.getConfirmedMessage(client.name, service.name, dateFormatted, startTime, service.price);
      return WhatsAppService.generateWhatsAppLink(client.phone, msg);
    } else if (status === "REJECTED") {
      const msg = WhatsAppService.getRejectedMessage(client.name, service.name, dateFormatted, startTime);
      return WhatsAppService.generateWhatsAppLink(client.phone, msg);
    } else if (status === "CANCELLED") {
      const msg = WhatsAppService.getCancelledMessage(client.name, service.name, dateFormatted, startTime);
      return WhatsAppService.generateWhatsAppLink(client.phone, msg);
    }
    return "#";
  };

  const getReminderWhatsAppLink = () => {
    const { client, service, startTime } = appointment;
    // Assuming msgReminder1 is the default for now, could be dynamic based on hours
    const template = settings?.msgReminder1 || "Olá, {cliente}! 💕\n\nPassando para lembrar do seu atendimento:\n\n✨ Procedimento: {procedimento}\n📅 Data: {data}\n⏰ Horário: {horario}\n\nEstamos te esperando! 💗";
    const professionalName = settings?.professionalName || "a profissional";
    
    const msg = WhatsAppService.getReminderMessage(template, client.name, service.name, dateFormatted, startTime, service.price, professionalName);
    return WhatsAppService.generateWhatsAppLink(client.phone, msg);
  };

  const handleReminderClick = async () => {
    // Marcar como lembrete enviado
    try {
      await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder1SentAt: new Date().toISOString() })
      });
      router.refresh();
    } catch (e) {}
  };

  const statusLabel = status === "PENDING" ? "Aguardando confirmação" : 
                      status === "CONFIRMED" ? "Confirmado" : 
                      status === "CANCELLED" ? "Cancelado" : 
                      status === "COMPLETED" ? "Concluído" : "Recusado";
                      
  const statusColor = status === "PENDING" ? "bg-[#FFF9F2] text-[#D4A373]" :
                      status === "CONFIRMED" ? "bg-[#F0F7F4] text-[#5A7A66]" :
                      "bg-[#F3E8E8] text-[#8B7E7F]";

  const hasPendingDeposit = appointment.service.requiresDeposit && appointment.paymentStatus === "PENDING";

  return (
    <>
      {/* CARD MINIMALISTA NA LISTAGEM */}
      <div 
        onClick={() => setIsModalOpen(true)}
        className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#F3E8E8] flex justify-between items-center transition-all hover:border-[#D9A0A0] cursor-pointer active:scale-[0.98]"
      >
        <div>
          <p className="font-bold text-[#3A3335] text-base">{appointment.client.name}</p>
          <div className="text-xs text-[#8B7E7F] font-medium mt-1 space-y-0.5">
            <p className="flex items-center gap-1.5"><Clock size={12} className="text-[#B98389]" /> {dateFormatted} às {appointment.startTime}</p>
            <p className="text-[#A76D74] font-semibold">{appointment.service.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
            {statusLabel}
          </div>
          {(status === "CONFIRMED" || status === "PENDING") && (
            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${appointment.reminder1SentAt ? 'bg-[#F0F7F4] text-[#5A7A66]' : 'bg-[#FFF5F5] text-[#A76D74]'}`}>
              {appointment.reminder1SentAt ? '✓ LEMBRETE PREPARADO' : '🔔 LEMBRETE PENDENTE'}
            </span>
          )}
          {hasPendingDeposit && status === "PENDING" && (
            <span className="text-[10px] font-bold text-[#D4A373] bg-[#FFF9F2] px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] animate-pulse"></span> Sinal
            </span>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES E AÇÕES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#F3E8E8] flex justify-between items-center bg-[#FCFAFA]">
              <h3 className="font-bold text-[#3A3335] text-lg">Detalhes do Agendamento</h3>
              <button onClick={() => { setIsModalOpen(false); setConfirmAction(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3E8E8] text-[#8B7E7F] hover:bg-[#E8DCDC] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-1">Cliente</p>
                  <p className="font-bold text-[#3A3335] text-lg">{appointment.client.name}</p>
                  <a href={getWhatsAppLink()} target="_blank" rel="noreferrer" className="text-[#5A7A66] font-semibold text-sm flex items-center gap-1 mt-0.5"><MessageCircle size={14}/> {appointment.client.phone}</a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-1">Data e Hora</p>
                    <p className="font-semibold text-[#3A3335] text-sm">{dateFormatted}</p>
                    <p className="font-semibold text-[#B98389] text-sm">{appointment.startTime}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-1">Procedimento</p>
                    <p className="font-semibold text-[#3A3335] text-sm">{appointment.service.name}</p>
                    <p className="font-semibold text-[#8B7E7F] text-sm">R$ {appointment.service.price.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#F3E8E8]">
                  <div>
                    <p className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-1">Status</p>
                    <span className={`px-2 py-1 inline-block rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-1">Sinal</p>
                    {appointment.service.requiresDeposit ? (
                      <span className={`px-2 py-1 inline-block rounded-lg text-[10px] font-bold uppercase tracking-wider ${appointment.paymentStatus === "PENDING" ? 'bg-[#FFF9F2] text-[#D4A373]' : 'bg-[#F0F7F4] text-[#5A7A66]'}`}>
                        {appointment.paymentStatus === "PENDING" ? 'Pendente' : 'Recebido'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-block rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#FCFAFA] text-[#8B7E7F]">Não se aplica</span>
                    )}
                  </div>
                </div>

                {appointment.notes && (
                  <div className="bg-[#FFF5F5] p-3 rounded-xl border border-[#F3E8E8]">
                    <p className="text-[11px] font-bold text-[#A76D74] uppercase tracking-wider mb-1">Observação</p>
                    <p className="text-sm text-[#5A5052] italic">{appointment.notes}</p>
                  </div>
                )}
              </div>

              {/* Ações / Confirmações In-line */}
              <div className="pt-2">
                {confirmAction ? (
                  <div className="bg-[#FCFAFA] p-4 rounded-2xl border border-[#F3E8E8] text-center space-y-3">
                    <p className="font-bold text-[#3A3335]">
                      {confirmAction === "REJECTED" ? "Recusar este agendamento?" : 
                       confirmAction === "CANCELLED" ? "Cancelar este atendimento?" : 
                       "Concluir este atendimento?"}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmAction(null)} disabled={loading} className="flex-1 py-3 bg-white border border-[#F3E8E8] text-[#8B7E7F] font-bold text-sm rounded-xl">Voltar</button>
                      <button onClick={() => handleUpdate(confirmAction)} disabled={loading} className="flex-1 py-3 bg-[#A76D74] text-white font-bold text-sm rounded-xl">Confirmar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {hasPendingDeposit && status === "PENDING" && (
                      <button onClick={() => handleUpdate("PAID_MANUALLY")} disabled={loading} className="w-full py-3.5 bg-[#FFF9F2] text-[#D4A373] border border-[#F3E8E8] font-bold text-sm rounded-xl flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                        <Check size={16} /> Marcar Sinal como Recebido
                      </button>
                    )}

                    {status === "PENDING" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate("CONFIRMED")} disabled={loading} className="flex-1 py-3.5 bg-[#5A7A66] text-white font-bold text-sm rounded-xl flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                          <Check size={16} /> Confirmar
                        </button>
                        <button onClick={() => handleUpdate("REJECTED")} disabled={loading} className="flex-1 py-3.5 bg-[#FFF5F5] text-[#A76D74] border border-[#F3E8E8] font-bold text-sm rounded-xl flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                          <X size={16} /> Recusar
                        </button>
                      </div>
                    )}

                    {status === "CONFIRMED" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate("COMPLETED")} disabled={loading} className="flex-1 py-3.5 bg-[#B98389] text-white font-bold text-sm rounded-xl flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                          <CheckCheck size={16} /> Concluir
                        </button>
                        <button onClick={() => handleUpdate("CANCELLED")} disabled={loading} className="flex-1 py-3.5 bg-[#F3E8E8] text-[#8B7E7F] font-bold text-sm rounded-xl flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                          Cancelar
                        </button>
                      </div>
                    )}

                    {/* BOTÕES WHATSAPP */}
                    <div className="flex gap-2 mt-2">
                      <a 
                        href={getWhatsAppLink()} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={handleWhatsAppClick}
                        className="flex-1 py-3.5 bg-white border border-[#25D366] text-[#25D366] font-bold text-sm rounded-xl flex justify-center items-center gap-1.5 active:scale-[0.98] transition-transform"
                      >
                        <MessageCircle size={16} /> Contato
                      </a>
                      
                      {(status === "CONFIRMED" || status === "PENDING") && (
                        <a 
                          href={getReminderWhatsAppLink()} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={handleReminderClick}
                          className="flex-[2] py-3.5 bg-[#25D366] text-white font-bold text-sm rounded-xl flex justify-center items-center gap-1.5 active:scale-[0.98] transition-transform shadow-md shadow-[#25D366]/20"
                        >
                          <MessageCircle size={16} /> AVISAR CLIENTE
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
