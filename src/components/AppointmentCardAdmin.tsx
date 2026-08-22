"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MessageCircle, Check, X, Clock, Trash2 } from "lucide-react";
import { WhatsAppService } from "@/lib/whatsapp";

import { useRouter } from "next/navigation";

export default function AppointmentCardAdmin({ appointment }: { appointment: any }) {
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
      return WhatsAppService.getPendingAdminLink(client.name, client.phone, dateFormatted, startTime, service.name, service.price);
    } else if (status === "CONFIRMED") {
      return WhatsAppService.getConfirmedLink(client.name, client.phone, dateFormatted, startTime, service.name, service.price);
    } else if (status === "REJECTED") {
      return WhatsAppService.getRejectedLink(client.name, client.phone, dateFormatted, startTime);
    } else if (status === "CANCELLED") {
      return WhatsAppService.getCancelledLink(client.name, client.phone, dateFormatted, startTime);
    }
    return "#";
  };

  return (
    <div className={`bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-4 ${status === 'CANCELLED' || status === 'REJECTED' ? 'opacity-70 border-gray-200' : 'border-gray-100'}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{appointment.client.name}</h3>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            <MessageCircle size={14} /> {appointment.client.phone}
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-bold ${
          status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
          status === "CONFIRMED" ? "bg-green-100 text-green-700" :
          status === "CANCELLED" ? "bg-gray-100 text-gray-700" :
          "bg-red-100 text-red-700"
        }`}>
          {status === "PENDING" ? "PENDENTE" : status === "CONFIRMED" ? "CONFIRMADO" : status === "CANCELLED" ? "CANCELADO" : "RECUSADO"}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-pink-500" />
          <span className="font-semibold">{dateFormatted} - {appointment.startTime} às {appointment.endTime}</span>
        </div>
        <div>
          <span className="font-medium text-gray-900">{appointment.service.name}</span> 
          <span className="text-gray-500"> (R$ {appointment.service.price.toFixed(2)})</span>
        </div>
        {appointment.notes && (
          <div className="mt-2 text-xs italic text-gray-500">
            " {appointment.notes} "
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("CONFIRMED")}
              className="flex-1 min-w-[120px] bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Check size={18} /> Confirmar
            </button>
            <button 
              disabled={loading}
              onClick={() => handleUpdate("REJECTED")}
              className="flex-1 min-w-[120px] bg-red-100 hover:bg-red-200 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <X size={18} /> Recusar
            </button>
          </>
        )}

        {status === "CONFIRMED" && (
          <button 
            disabled={loading}
            onClick={() => handleUpdate("CANCELLED")}
            className="flex-1 min-w-[120px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 size={18} /> Cancelar
          </button>
        )}
        
        <a 
          href={getWhatsAppLink()} 
          target="_blank" 
          rel="noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle size={20} /> 
          {status === "PENDING" ? "Falar no WhatsApp" : 
           status === "CONFIRMED" ? "Enviar Confirmação" : "Avisar Cliente"}
        </a>
      </div>
    </div>
  );
}
