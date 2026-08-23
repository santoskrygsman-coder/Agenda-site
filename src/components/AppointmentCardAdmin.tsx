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

  const handleUpdate = async (newStatus: string) => {
    if (newStatus === "CANCELLED") {
      if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    }
    if (newStatus === "REJECTED") {
      if (!confirm("Tem certeza que deseja recusar este agendamento?")) return;
    }
    if (newStatus === "COMPLETED") {
      if (!confirm("Marcar este agendamento como concluído?")) return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      }
    } catch (e) {
      alert("Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
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
      } catch (e) {
        // Silencioso, não interfere na abertura do WhatsApp
      }
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

  return (
    <div className={`bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border flex flex-col gap-5 transition-all ${status === 'CANCELLED' || status === 'REJECTED' || status === 'COMPLETED' ? 'opacity-60 border-[#F3E8E8]' : 'border-[#F3E8E8]'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-[#3A3335] text-lg tracking-tight">{appointment.client.name}</h3>
          <p className="text-[#8B7E7F] text-sm flex items-center gap-1.5 mt-1 font-medium">
            <MessageCircle size={14} className="text-[#D4A373]" /> {appointment.client.phone}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
          status === "PENDING" ? "bg-[#FFF9F2] text-[#D4A373]" :
          status === "CONFIRMED" ? "bg-[#F0F7F4] text-[#5A7A66]" :
          status === "CANCELLED" ? "bg-[#F3E8E8] text-[#8B7E7F]" :
          status === "COMPLETED" ? "bg-[#F0F7F4] text-[#5A7A66]" :
          "bg-[#FFF5F5] text-[#A76D74]"
        }`}>
          {status === "PENDING" ? "PENDENTE" : status === "CONFIRMED" ? "CONFIRMADO" : status === "CANCELLED" ? "CANCELADO" : status === "COMPLETED" ? "CONCLUÍDO" : "RECUSADO"}
        </div>
      </div>

      <div className="bg-[#FCFAFA] rounded-2xl p-4 text-sm text-[#5A5052] flex flex-col gap-2 border border-[#F3E8E8]">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#B98389]" />
          <span className="font-semibold">{dateFormatted} - {appointment.startTime} às {appointment.endTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 flex justify-center text-[#B98389]">✦</span>
          <span className="font-medium text-[#3A3335]">{appointment.service.name}</span> 
          <span className="text-[#8B7E7F] font-semibold text-xs ml-auto">R$ {appointment.service.price.toFixed(2)}</span>
        </div>
        {appointment.notes && (
          <div className="mt-2 text-xs italic text-[#8B7E7F] border-t border-[#F3E8E8] pt-2">
            " {appointment.notes} "
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {status === "PENDING" && (
          <>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("CONFIRMED")}
              className="flex-1 min-w-[120px] bg-[#5A7A66] hover:bg-[#4A6454] text-white font-bold text-sm tracking-wide py-4 sm:py-3 rounded-2xl sm:rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-[#5A7A66]/20"
            >
              <Check size={18} /> CONFIRMAR
            </button>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("REJECTED")}
              className="flex-1 min-w-[120px] bg-[#FFF5F5] hover:bg-[#F3E8E8] text-[#A76D74] border border-[#F3E8E8] font-bold text-sm tracking-wide py-4 sm:py-3 rounded-2xl sm:rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <X size={18} /> RECUSAR
            </button>
          </>
        )}

        {status === "CONFIRMED" && (
          <>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("COMPLETED")}
              className="flex-1 min-w-[120px] bg-[#B98389] hover:bg-[#A76D74] text-white font-bold text-sm tracking-wide py-4 sm:py-3 rounded-2xl sm:rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-[#B98389]/20"
            >
              <CheckCheck size={18} /> CONCLUIR
            </button>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("CANCELLED")}
              className="flex-1 min-w-[120px] bg-[#F3E8E8] hover:bg-[#E8DCDC] text-[#5A5052] font-bold text-sm tracking-wide py-4 sm:py-3 rounded-2xl sm:rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2 size={18} /> CANCELAR
            </button>
          </>
        )}
        
        <a 
          href={getWhatsAppLink()} 
          target="_blank" 
          rel="noreferrer"
          onClick={handleWhatsAppClick}
          className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold text-sm tracking-wide py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-[#25D366]/20"
        >
          <MessageCircle size={18} /> 
          {status === "PENDING" ? "WHATSAPP" : 
           status === "CONFIRMED" ? "AVISAR CLIENTE" : "AVISAR CLIENTE"}
        </a>
        
        {appointment.whatsappStatus !== "NOT_SENT" && status !== "PENDING" && (
          <div className="w-full text-center mt-1">
            <span className="text-[10px] text-[#5A7A66] font-bold uppercase tracking-widest flex items-center justify-center gap-1">
              <Check size={10} /> WhatsApp Aberto
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
