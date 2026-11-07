"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ShoppingBag, Heart, Smile, ChevronRight, Clock, Share2, Check } from "lucide-react";
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
    setSelectedServiceById,
    setIsMenuOpen,
    studioSettings,
    todayOpenStatus,
  } = useBooking();
  const [sharedCopied, setSharedCopied] = React.useState(false);
  const featuredService = services[0];

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
        <div className="relative w-full h-[270px] bg-[#EDDCD2]">
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

        {/* Top Floating Bar (Hamburger & WhatsApp) */}
        <div className="absolute top-4 inset-x-0 px-5 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#2D1C18] hover:bg-white/30 active:scale-95 transition"
            aria-label="Abrir menu de navegação"
          >
            <Menu size={23} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-[#FAF5F1]/80 border border-[#E5D4C9] flex items-center justify-center text-[#2D1C18] hover:bg-[#FAF5F1] transition"
              aria-label="Compartilhar link de agendamento"
              title="Compartilhar link"
            >
              {sharedCopied ? <Check size={14} className="text-[#2E8540]" /> : <Share2 size={14} />}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 transition"
              aria-label="Contato via WhatsApp"
            >
              <WhatsAppCircleIcon size={27} variant="light" />
            </a>
          </div>
        </div>

        {/* Hero Typography + CTA overlapping the lower fade */}
        <div className="relative z-10 px-5 -mt-12 pb-5">
          {/* Subtle golden botanical leaves on the right */}
          <BotanicalSprigRight className="w-[120px] h-[85px] absolute right-0 top-3 opacity-85" />

          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <div className="inline-flex items-center gap-1.5 bg-[#FAF5F1]/90 border border-[#E4D2C7] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#4E3B35] shadow-2xs">
              <Clock size={11.5} className="text-[#B87472]" />
              <span>{todayOpenStatus}</span>
            </div>
            <span className="inline-flex items-center bg-[#F4E3DC]/90 border border-[#E5CEC4] rounded-full px-2.5 py-1 text-[10.5px] font-bold text-[#3D2923]">
              {studioSettings.professionalName}
            </span>
          </div>

          <h1 className="font-serif text-[32px] leading-[1.1] font-bold text-[#2D1C18] tracking-[-0.01em]">
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
      <div className="flex-1 bg-[#EFE2D9]/75 rounded-t-[32px] border-t border-[#E6D5CA] px-5 pt-5 pb-6 flex flex-col">
        {/* 3 Feature Icons Row */}
        <div className="grid grid-cols-3 gap-2 pb-5 border-b border-[#E5D4C9]/80">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F9F2ED] border border-[#E5D4C9] flex items-center justify-center text-[#3D2923] mb-2">
              <Smile size={19} strokeWidth={1.7} />
            </div>
            <span className="text-[11.5px] leading-[1.25] text-[#3D2A24] font-medium">
              Atendimento
              <br />
              personalizado
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F9F2ED] border border-[#E5D4C9] flex items-center justify-center text-[#3D2923] mb-2">
              <ShoppingBag size={18} strokeWidth={1.7} />
            </div>
            <span className="text-[11.5px] leading-[1.25] text-[#3D2A24] font-medium">
              Produtos
              <br />
              de qualidade
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F9F2ED] border border-[#E5D4C9] flex items-center justify-center text-[#3D2923] mb-2">
              <Heart size={18} strokeWidth={1.7} />
            </div>
            <span className="text-[11.5px] leading-[1.25] text-[#3D2A24] font-medium">
              Ambiente
              <br />
              acolhedor
            </span>
          </div>
        </div>

        {/* Nossos serviços section */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-[#2D1C18]">
              Nossos serviços
            </h2>
            <Link
              href="/servicos"
              className="text-[13px] font-medium text-[#B87472] hover:text-[#9E5D5B] flex items-center gap-0.5"
            >
              <span>Ver todos</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {featuredService && (
            <ServiceCard
              service={featuredService}
              mode="client"
              onSelect={(svc) => {
                setSelectedServiceById(svc.id);
                router.push("/servicos");
              }}
            />
          )}
        </div>
      </div>
    </MobileContainer>
  );
}
