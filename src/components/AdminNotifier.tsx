"use client";

import { useEffect, useState } from "react";

export default function AdminNotifier() {
  const [, setLastCount] = useState<number | null>(null);

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {

    if ("Notification" in window && Notification.permission === "default") {
      setShowPrompt(true);
    }

    const checkPending = async () => {
      try {
        const res = await fetch("/api/appointments/pending-count");
        if (res.ok) {
          const data = await res.json();
          setLastCount(prev => {
            if (prev !== null && data.count > prev) {
              if ("Notification" in window && Notification.permission === "granted") {
                const options: any = {
                  body: "Você tem um novo pedido de horário aguardando confirmação no painel.",
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  vibrate: [200, 100, 200, 100, 200]
                };
                new Notification("✨ Nova Solicitação de Agendamento!", options);
              }
            }
            return data.count;
          });
        }
      } catch (e) {
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    try {
      if (!("Notification" in window)) {
        alert("O seu navegador atual não suporta notificações.");
        setShowPrompt(false);
        return;
      }
      
      const perm = await Notification.requestPermission();
      
      if (perm === "granted") {
        alert("✨ Avisos ativados com sucesso! Deixe o painel aberto (mesmo em segundo plano) para receber alertas de novos agendamentos.");
        setShowPrompt(false);
      } else if (perm === "denied") {
        alert("Você bloqueou as notificações. Caso queira ativar depois, será necessário mudar nas configurações do seu navegador.");
        setShowPrompt(false);
      } else {
        setShowPrompt(false);
      }
    } catch(e) {
      alert("Erro ao pedir permissão. Se você usa iPhone, você precisa 'Adicionar à Tela de Início' primeiro para poder receber notificações!");
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-[#FFF9F2] border-b border-[#F3E8E8] p-3 px-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
      <div className="text-sm font-semibold text-[#8B7E7F] flex items-center gap-2">
        <span className="text-[#D4A373]">🔔</span> Receba alertas de novos agendamentos na tela
      </div>
      <button 
        onClick={requestPermission} 
        className="bg-[#D4A373] hover:bg-[#c39160] text-white px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors w-full sm:w-auto"
      >
        Ativar Avisos
      </button>
    </div>
  );
}
