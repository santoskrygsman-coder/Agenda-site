"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AdminNotifier() {
  const { status } = useSession();
  const [, setLastCount] = useState<number | null>(null);

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

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
                new Notification("✨ Nova Solicitação de Agendamento!", {
                  body: "Você tem um novo pedido de horário aguardando confirmação no painel.",
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  vibrate: [200, 100, 200, 100, 200]
                });
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
  }, [status]);

  const requestPermission = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") setShowPrompt(false);
    } catch(e){}
  };

  if (!showPrompt || status !== "authenticated") return null;

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
