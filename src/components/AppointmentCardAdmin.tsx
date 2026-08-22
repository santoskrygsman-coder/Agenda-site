"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Check, X, Clock, Trash2 } from "lucide-react";
import { WhatsAppService } from "@/lib/whatsapp";

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

  const getWhatsAppLink = () => {
    const { client, service, startTime } = appointment;
    
    if (status === "PENDING") {
      return WhatsAppService.getPendingAdminLink(client.name, client.phone, dateFormatted, startTime, service.name, service.price, settings?.msgNewRequest || "");
    } else if (status === "CONFIRMED") {
      return WhatsAppService.getConfirmedLink(client.name, client.phone, dateFormatted, startTime, service.name, service.price, settings?.msgConfirmed || "");
    } else if (status === "REJECTED") {
      return WhatsAppService.getRejectedLink(client.name, client.phone, dateFormatted, startTime, settings?.msgRejected || "");
    } else if (status === "CANCELLED") {
      return WhatsAppService.getRejectedLink(client.name, client.phone, dateFormatted, startTime, settings?.msgRejected || "");
    }
    return "#";
  };

  return (
    <div className={`bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border flex flex-col gap-5 transition-all ${status === 'CANCELLED' || status === 'REJECTED' ? 'opacity-60 border-[#F3E8E8]' : 'border-[#F3E8E8]'}`}>
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
          "bg-[#FFF5F5] text-[#A76D74]"
        }`}>
          {status === "PENDING" ? "PENDENTE" : status === "CONFIRMED" ? "CONFIRMADO" : status === "CANCELLED" ? "CANCELADO" : "RECUSADO"}
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
              className="flex-1 min-w-[120px] bg-[#5A7A66] hover:bg-[#4A6454] text-white font-bold text-sm tracking-wide py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-[#5A7A66]/20"
            >
              <Check size={18} /> CONFIRMAR
            </button>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("REJECTED")}
              className="flex-1 min-w-[120px] bg-[#FFF5F5] hover:bg-[#F3E8E8] text-[#A76D74] border border-[#F3E8E8] font-bold text-sm tracking-wide py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <X size={18} /> RECUSAR
            </button>
          </>
        )}

        {status === "CONFIRMED" && (
          <button 
            disabled={loading}
            onClick={() => handleUpdate("CANCELLED")}
            className="flex-1 min-w-[120px] bg-[#F3E8E8] hover:bg-[#E8DCDC] text-[#5A5052] font-bold text-sm tracking-wide py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Trash2 size={18} /> CANCELAR
          </button>
        )}
        
        <a 
          href={getWhatsAppLink()} 
          target="_blank" 
          rel="noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold text-sm tracking-wide py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-[#25D366]/20"
        >
          <MessageCircle size={18} /> 
          {status === "PENDING" ? "FALAR NO WHATSAPP" : 
           status === "CONFIRMED" ? "ENVIAR CONFIRMAÇÃO" : "AVISAR CLIENTE"}
        </a>
      </div>
    </div>
  );
}
