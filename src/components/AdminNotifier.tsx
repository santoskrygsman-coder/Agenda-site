"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Share, Smartphone, Volume2, X } from "lucide-react";

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  appointmentId: string | null;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  targetUrl: string;
  dedupeKey: string;
  readAt: string | null;
  createdAt: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function playGentleNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.14); // A5
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);
  } catch {
    // Nunca forçar áudio quando bloqueado pelo navegador
  }
}

export async function subscribeDeviceToWebPush(): Promise<{
  ok: boolean;
  status: "subscribed" | "denied" | "ios-pwa-required" | "unsupported" | "error";
  message: string;
}> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      status: "unsupported",
      message: "Ambiente fora do navegador.",
    };
  }

  const ua = navigator.userAgent || "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isIos && !isStandalone) {
    return {
      ok: false,
      status: "ios-pwa-required",
      message:
        "No iPhone, toque em Compartilhar → 'Adicionar à Tela de Início' e abra o app instalado para receber notificações.",
    };
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return {
      ok: false,
      status: "unsupported",
      message: "Este navegador não suporta notificações Web Push.",
    };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return {
      ok: false,
      status: "denied",
      message:
        "Permissão de notificações negada no navegador. Ative nas configurações do site no celular.",
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;

    let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    if (!publicKey) {
      const keyRes = await fetch("/api/notifications/subscribe");
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        publicKey = keyData.publicKey || "";
      }
    }

    if (publicKey && "pushManager" in registration) {
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        const appServerKey = urlBase64ToUint8Array(publicKey);
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      const subJson = sub.toJSON();
      const saveRes = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveRes.ok) {
        return {
          ok: false,
          status: "error",
          message: "Não foi possível salvar a inscrição deste celular.",
        };
      }
    }

    playGentleNotificationSound();
    return {
      ok: true,
      status: "subscribed",
      message: "Alertas Web Push ativados neste celular!",
    };
  } catch (err) {
    console.warn("Erro ao registrar Web Push:", err);
    return {
      ok: false,
      status: "error",
      message: "Não foi possível ativar o Push neste navegador.",
    };
  }
}

export default function AdminNotifier() {
  const router = useRouter();
  const [bannerState, setBannerState] = useState<
    "hidden" | "prompt" | "ios-guide" | "subscribed"
  >("hidden");
  const [bannerMessage, setBannerMessage] = useState("");
  const [activeToast, setActiveToast] = useState<AdminNotificationItem | null>(
    null
  );
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const pollNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: AdminNotificationItem[] = Array.isArray(data.notifications)
        ? data.notifications
        : [];

      window.dispatchEvent(
        new CustomEvent("emile-notifications-updated", {
          detail: {
            unreadCount: Number(data.unreadCount) || 0,
            notifications: list,
          },
        })
      );

      if (!initializedRef.current) {
        for (const item of list) {
          seenIdsRef.current.add(item.id);
        }
        initializedRef.current = true;
        return;
      }

      const newestUnread = list.find(
        (item) => !item.readAt && !seenIdsRef.current.has(item.id)
      );
      for (const item of list) {
        seenIdsRef.current.add(item.id);
      }

      if (newestUnread) {
        setActiveToast(newestUnread);
        playGentleNotificationSound();
      }
    } catch {
      // Silencioso em falha de rede
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || "";
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    const dismissed = sessionStorage.getItem("emile_push_banner_dismissed");

    if (isIos && !isStandalone && !dismissed) {
      setBannerState("ios-guide");
    } else if ("Notification" in window) {
      if (Notification.permission === "default" && !dismissed) {
        setBannerState("prompt");
      } else if (Notification.permission === "granted") {
        // Garante que o Service Worker e assinatura VAPID estejam sincronizados
        void subscribeDeviceToWebPush();
      }
    }

    void pollNotifications();
    const interval = setInterval(pollNotifications, 12000);

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "ADMIN_PUSH_EVENT") {
        void pollNotifications();
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    return () => {
      clearInterval(interval);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
    };
  }, [pollNotifications]);

  const handleEnablePush = async () => {
    const res = await subscribeDeviceToWebPush();
    setBannerMessage(res.message);
    if (res.ok) {
      setBannerState("subscribed");
      setTimeout(() => {
        setBannerState("hidden");
        setBannerMessage("");
      }, 3500);
    } else if (res.status === "ios-pwa-required") {
      setBannerState("ios-guide");
    } else {
      setTimeout(() => {
        setBannerState("hidden");
        setBannerMessage("");
      }, 4500);
    }
  };

  const handleDismissBanner = () => {
    sessionStorage.setItem("emile_push_banner_dismissed", "1");
    setBannerState("hidden");
  };

  const handleOpenToastTarget = async (item: AdminNotificationItem) => {
    setActiveToast(null);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    }).catch(() => {});
    void pollNotifications();
    router.push(item.targetUrl || "/admin/agenda");
  };

  return (
    <>
      {/* Banner superior discreto para ativar Web Push no celular */}
      {bannerState === "prompt" && (
        <div className="w-full max-w-[430px] mx-auto bg-[#FAF5F1] border-b border-[#E5D4C9] px-3.5 py-2.5 flex items-center justify-between gap-2 text-[12px] text-[#2D1C18]">
          <div className="flex items-center gap-2 min-w-0">
            <Bell size={15} className="text-[#B87472] shrink-0" />
            <span className="font-medium leading-tight">
              Ative os alertas no celular para novos agendamentos e sinais Pix.
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleEnablePush}
              className="min-h-[34px] bg-[#B87472] hover:bg-[#A66361] text-white font-bold text-[11.5px] px-3 py-1.5 rounded-full transition touch-manipulation"
            >
              Ativar
            </button>
            <button
              type="button"
              onClick={handleDismissBanner}
              aria-label="Fechar aviso"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5850]"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {bannerState === "ios-guide" && (
        <div className="w-full max-w-[430px] mx-auto bg-[#FAF5F1] border-b border-[#E5D4C9] px-3.5 py-2.5 flex items-start justify-between gap-2 text-[11.5px] text-[#2D1C18]">
          <div className="flex items-start gap-2 min-w-0">
            <Smartphone size={15} className="text-[#B87472] shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>iPhone:</strong> para receber notificações na tela, toque
              em <Share size={12} className="inline mx-0.5 text-[#B87472]" />{" "}
              <strong>Compartilhar → Adicionar à Tela de Início</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            aria-label="Fechar guia iPhone"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5850] shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {bannerState === "subscribed" && bannerMessage && (
        <div className="w-full max-w-[430px] mx-auto bg-[#D8EFDC] border-b border-[#BDE2C4] px-3.5 py-2 text-[12px] font-semibold text-[#2E8540] flex items-center justify-center gap-1.5">
          <Check size={14} />
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Pop-up flutuante em tempo real quando chega novo agendamento, comprovante ou cancelamento */}
      {activeToast && (
        <div className="fixed top-3 inset-x-0 z-[80] flex justify-center px-3 pointer-events-none">
          <div className="w-full max-w-[400px] bg-[#2D1C18] text-[#FAF5F1] border border-[#B87472]/50 rounded-[18px] p-3.5 shadow-2xl pointer-events-auto flex items-start justify-between gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenToastTarget(activeToast)}
              className="flex-1 text-left flex items-start gap-2.5 min-w-0 touch-manipulation"
            >
              <span className="w-8 h-8 rounded-full bg-[#B87472] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#FAF5F1] leading-snug">
                  {activeToast.title}
                </p>
                <p className="text-[12px] text-[#E8D7CD] mt-0.5 leading-snug">
                  {activeToast.body}
                </p>
                <span className="inline-block mt-1 text-[11px] font-bold text-[#E2B897] underline">
                  Toque para abrir o agendamento →
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              aria-label="Fechar alerta"
              className="w-7 h-7 rounded-full bg-[#3D2923] text-[#E8D7CD] flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
