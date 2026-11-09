"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  ShoppingBag,
  Heart,
  Smile,
  ChevronRight,
  Clock,
  Share2,
  Check,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ServiceCard from "@/components/ui/ServiceCard";
import {
  BotanicalSprigRight,
  WhatsAppCircleIcon,
} from "@/components/ui/BotanicalDecor";
import { useBooking } from "@/context/BookingContext";
import { buildGeneralContactWhatsAppUrl } from "@/lib/whatsapp";

export default function ClientHomePage() {
  const router = useRouter();
  const {
    services,
    servicesLoading,
    setSelectedServiceById,
    setIsMenuOpen,
    studioSettings,
    todayOpenStatus,
  } = useBooking();
  const [sharedCopied, setSharedCopied] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState<
    "todos" | "cilios" | "lifting_sobrancelha" | "manutencao"
  >("todos");

  const filteredServices = services.filter((svc) => {
    if (categoryFilter === "todos") return true;
    const n = svc.name.toLowerCase();
    const isMaint =
      n.includes("manuten") || n.includes("remo") || n.includes("retoque");
    const isLiftBrow =
      n.includes("lifting") ||
      n.includes("lifithing") ||
      n.includes("brow") ||
      n.includes("sobrancelha") ||
      n.includes("lamination");
    if (categoryFilter === "manutencao") return isMaint;
    if (categoryFilter === "lifting_sobrancelha") return isLiftBrow;
    return !isMaint && !isLiftBrow;
  });

  const whatsappHref = buildGeneralContactWhatsAppUrl(studioSettings.whatsapp);

  const handleShare = async () => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: studioSettings.professionalName,
          text: "Agende seu horário de extensão de cílios online:",
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback para copiar link
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setSharedCopied(true);
      setTimeout(() => setSharedCopied(false), 2000);
    }
  };

  return (
    <MobileContainer>
      {/* HERO SECTION */}
      <div className="relative w-full overflow-hidden">
        {/* Hero Eye Image */}
        <div className="relative w-full h-[255px] min-[375px]:h-[270px] bg-[#EDDCD2]">
          <img
            src="/images/hero-eye.png"
            alt="Extensão de cílios realista"
            className="w-full h-full object-cover object-center"
          />
          {/* Smooth bottom gradient fade into warm nude-cream background */}
          <div
            className="absolute inset-x-0 bottom-0 h-[110px] pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(244,234,227,0) 0%, rgba(244,234,227,0.85) 62%, #F4EAE3 100%)",
            }}
          />
        </div>

        {/* Top Floating Bar (Hamburger & WhatsApp) - 44x44px touch targets */}
        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-0 px-3.5 min-[375px]:px-5 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="w-11 h-11 rounded-full bg-[#FAF5F1]/65 backdrop-blur-[2px] flex items-center justify-center text-[#2D1C18] hover:bg-white/75 active:scale-95 transition"
            aria-label="Abrir menu de navegação"
          >
            <Menu size={22} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="w-11 h-11 rounded-full bg-[#FAF5F1]/85 border border-[#E5D4C9] flex items-center justify-center text-[#2D1C18] hover:bg-[#FAF5F1] active:scale-95 transition"
              aria-label="Compartilhar link de agendamento"
              title="Compartilhar link"
            >
              {sharedCopied ? (
                <Check size={16} className="text-[#2E8540]" />
              ) : (
                <Share2 size={16} />
              )}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition"
              aria-label="Contato via WhatsApp"
            >
              <WhatsAppCircleIcon size={30} variant="light" />
            </a>
          </div>
        </div>

        {/* Hero Typography + CTA overlapping the lower fade */}
        <div className="relative z-10 px-4 min-[375px]:px-5 -mt-12 pb-5">
          {/* Subtle golden botanical leaves on the right */}
          <BotanicalSprigRight className="w-[110px] min-[375px]:w-[120px] h-[80px] absolute right-0 top-3 opacity-85 pointer-events-none" />

          <div className="flex flex-wrap items-center gap-1.5 mb-2 min-h-[26px]">
            {todayOpenStatus && (
              <div className="inline-flex items-center gap-1.5 bg-[#FAF5F1]/95 border border-[#E4D2C7] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#4E3B35] shadow-2xs">
                <Clock size={11.5} className="text-[#B87472] shrink-0" />
                <span>{todayOpenStatus}</span>
              </div>
            )}
            <span className="inline-flex items-center bg-[#F4E3DC]/95 border border-[#E5CEC4] rounded-full px-2.5 py-1 text-[10.5px] font-bold text-[#3D2923]">
              {studioSettings.professionalName}
            </span>
          </div>

          <h1 className="font-serif text-[29px] min-[375px]:text-[32px] leading-[1.1] font-bold text-[#2D1C18] tracking-[-0.01em]">
            Seu olhar
            <br />
            mais confiante
          </h1>

          <p className="text-[13.5px] leading-[1.45] text-[#4E3B35] mt-2.5 max-w-[285px]">
            Extensão de cílios com técnica, segurança e um resultado natural.
          </p>

          <div className="mt-4">
            <PrimaryButton href="/servicos" variant="rose" showArrow>
              Agendar meu horário
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* CURVED NUDE SURFACE WITH 3 FEATURE ICONS & NOSSOS SERVIÇOS */}
      <div className="flex-1 bg-[#EFE2D9]/75 rounded-t-[30px] border-t border-[#E6D5CA] px-4 min-[375px]:px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col">
        {/* 3 Feature Icons Row */}
        <div className="grid grid-cols-3 gap-1.5 min-[375px]:gap-2 pb-5 border-b border-[#E5D4C9]/80">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F9F2ED] border border-[#E5D4C9] flex items-center justify-center text-[#3D2923] mb-2">
              <Smile size={19} strokeWidth={1.7} />
            </div>
            <span className="text-[11px] min-[360px]:text-[11.5px] leading-[1.25] text-[#3D2A24] font-medium">
              Atendimento
              <br />
              personalizado
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F9F2ED] border border-[#E5D4C9] flex items-center justify-center text-[#3D2923] mb-2">
              <ShoppingBag size={18} strokeWidth={1.7} />
            </div>
            <span className="text-[11px] min-[360px]:text-[11.5px] leading-[1.25] text-[#3D2A24] font-medium">
              Produtos
              <br />
              de qualidade
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F9F2ED] border border-[#E5D4C9] flex items-center justify-center text-[#3D2923] mb-2">
              <Heart size={18} strokeWidth={1.7} />
            </div>
            <span className="text-[11px] min-[360px]:text-[11.5px] leading-[1.25] text-[#3D2A24] font-medium">
              Ambiente
              <br />
              acolhedor
            </span>
          </div>
        </div>

        {/* Nossos serviços section - Lista completa direto na tela inicial */}
        <div id="nossos-servicos" className="pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16.5px] font-bold text-[#2D1C18]">
                Nossos serviços
              </h2>
              <p className="text-[11.5px] text-[#6E5850]">
                Toque no procedimento para agendar ou em 🔍 Ver para ampliar
              </p>
            </div>
            <Link
              href="/servicos"
              className="min-h-[36px] px-2 -mr-2 text-[12.5px] font-semibold text-[#B87472] hover:text-[#9E5D5B] flex items-center gap-0.5 shrink-0"
            >
              <span>Ver todos</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Abas de filtro rápido por categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: "todos", label: "Todos" },
              { key: "cilios", label: "Extensão de Cílios" },
              { key: "lifting_sobrancelha", label: "Lash Lifting & Brow" },
              { key: "manutencao", label: "Manutenção & Remoção" },
            ].map((tab) => {
              const active = categoryFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setCategoryFilter(
                      tab.key as
                        | "todos"
                        | "cilios"
                        | "lifting_sobrancelha"
                        | "manutencao"
                    )
                  }
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-[12px] shrink-0 transition-colors touch-manipulation ${
                    active
                      ? "bg-[#B87472] text-white font-semibold shadow-2xs"
                      : "bg-[#FAF5F1] border border-[#E5D4C9] text-[#4E3B35] font-medium"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5 pt-0.5">
            {servicesLoading && services.length === 0 ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="w-full h-[92px] bg-[#FAF5F1] border border-[#EDE0D7] rounded-[18px] p-3 flex items-center gap-3 animate-pulse"
                  >
                    <div className="w-[62px] h-[62px] rounded-full bg-[#EADCD3] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 bg-[#EADCD3] rounded-full" />
                      <div className="h-2.5 w-4/5 bg-[#F2E6DF] rounded-full" />
                      <div className="h-3 w-1/3 bg-[#EADCD3] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredServices.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  mode="client"
                  onSelect={(selected) => {
                    setSelectedServiceById(selected.id);
                    router.push("/agendar/data");
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}
