"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CalendarHeart,
  MapPin,
} from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import BottomNavAdmin, { AdminTab } from "./BottomNavAdmin";

interface MobileContainerProps {
  children: React.ReactNode;
  showAdminNav?: boolean;
  activeAdminTab?: AdminTab;
  className?: string;
}

const CLIENT_MENU_LINKS = [
  { label: "Início", href: "/" },
  { label: "Escolher procedimento", href: "/servicos" },
];

const ADMIN_MENU_LINKS = [
  { label: "Agenda da profissional", href: "/admin/agenda" },
  { label: "Detalhes do agendamento", href: "/admin/agendamento" },
  { label: "Lista de clientes", href: "/admin/clientes" },
  { label: "Gestão de serviços", href: "/admin/servicos" },
  { label: "Controle financeiro", href: "/admin/financeiro" },
  { label: "Horários, intervalos e bloqueios", href: "/admin/horarios" },
  { label: "Configurações (Pix e Reserva)", href: "/admin/mais" },
];

export default function MobileContainer({
  children,
  showAdminNav = false,
  activeAdminTab,
  className = "",
}: MobileContainerProps) {
  const pathname = usePathname();
  const { isMenuOpen, setIsMenuOpen, studioSettings } = useBooking();

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const cleanExternalOverlays = () => {
      const selectors = [
        "iframe[srcdoc]",
        'script[data-nf-variant]',
        '[data-netlify-site-id]',
        'body > *:not([data-app-root="true"]):not(script):not(style):not(link):not(nextjs-portal)',
        "html > *:not(head):not(body)",
      ];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          el.remove();
        });
      }
    };

    cleanExternalOverlays();
    const observer = new MutationObserver(() => cleanExternalOverlays());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: false,
    });
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: false,
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      data-app-root="true"
      className="min-h-dvh w-full bg-[#E6DAD0] flex justify-center items-start overflow-x-hidden"
    >
      <div
        className={`w-full max-w-[430px] min-h-dvh bg-[#F4EAE3] text-[#2D1C18] flex flex-col relative overflow-x-hidden shadow-[0_10px_40px_rgba(45,28,24,0.12)] ${className}`}
      >
        <div className="flex-1 flex flex-col relative z-10 w-full max-w-full">
          {children}
        </div>

        {showAdminNav && <BottomNavAdmin activeTab={activeAdminTab} />}

        {/* Menu lateral estritamente separado entre Cliente e Profissional */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-center">
            <div className="w-full max-w-[430px] h-full relative flex">
              <div
                className="fixed inset-0 bg-[#2D1C18]/45 backdrop-blur-[1px]"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="relative z-10 w-[86%] max-w-[340px] h-full max-h-dvh bg-[#F8F2ED] border-r border-[#E6D9D0] flex flex-col shadow-2xl">
                <div className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3.5 border-b border-[#E6D9D0] flex items-center justify-between gap-2 bg-[#F3E6DE]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={15} className="text-[#B87472] shrink-0" />
                      <span className="font-serif text-[17px] font-bold text-[#2D1C18] truncate">
                        {showAdminNav
                          ? "Painel da Profissional"
                          : studioSettings.professionalName}
                      </span>
                    </div>
                    {!showAdminNav && (
                      <p className="text-[11px] text-[#6E5850] flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10.5} className="text-[#B87472] shrink-0" />
                        <span className="truncate">
                          {studioSettings.description}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-11 h-11 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition shrink-0"
                    aria-label="Fechar menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!showAdminNav ? (
                    <>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C756C] px-2 mb-2">
                          Agendamento Online
                        </p>
                        <div className="space-y-1.5">
                          {CLIENT_MENU_LINKS.map((item) => {
                            const active = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                                  active
                                    ? "bg-[#B87472] text-white font-semibold"
                                    : "text-[#2D1C18] hover:bg-[#EFE3DC]"
                                }`}
                              >
                                <span className="flex items-center gap-2.5">
                                  <CalendarHeart size={16} />
                                  {item.label}
                                </span>
                                <ChevronRight
                                  size={16}
                                  className={
                                    active ? "text-white" : "text-[#9C847B]"
                                  }
                                />
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] p-3.5 space-y-2">
                        <div className="flex items-center gap-1.5 text-[#B87472] font-semibold text-[12.5px]">
                          <ShieldCheck size={15} />
                          <span>Como funciona sua reserva</span>
                        </div>
                        <p className="text-[11.5px] text-[#5C4942] leading-relaxed">
                          1. Escolha o procedimento e selecione a data e o
                          horário disponíveis.
                        </p>
                        <p className="text-[11.5px] text-[#5C4942] leading-relaxed">
                          2. Preencha seus dados obrigatórios e aceite as
                          políticas de agendamento.
                        </p>
                        <p className="text-[11.5px] text-[#5C4942] leading-relaxed">
                          3. Pague o sinal via Pix e clique em &ldquo;Enviar
                          comprovante pelo WhatsApp&rdquo;, anexando a imagem do
                          comprovante manualmente na conversa para confirmação da
                          profissional.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C756C] px-2 mb-2">
                        Gestão do Estúdio
                      </p>
                      <div className="space-y-1.5">
                        {ADMIN_MENU_LINKS.map((sc) => {
                          const active = pathname === sc.href;
                          return (
                            <Link
                              key={sc.href}
                              href={sc.href}
                              onClick={() => setIsMenuOpen(false)}
                              className={`min-h-[46px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                                active
                                  ? "bg-[#38231E] text-[#FAF3EE] font-semibold"
                                  : "text-[#2D1C18] hover:bg-[#EFE3DC]"
                              }`}
                            >
                              <span>{sc.label}</span>
                              <ChevronRight
                                size={16}
                                className={
                                  active ? "text-[#FAF3EE]" : "text-[#9C847B]"
                                }
                              />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-[#E6D9D0] bg-[#F3E6DE]/60 text-[11px] text-[#7A645C] text-center">
                  {showAdminNav
                    ? "Área exclusiva da profissional"
                    : `${studioSettings.professionalName} • ${studioSettings.description}`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
