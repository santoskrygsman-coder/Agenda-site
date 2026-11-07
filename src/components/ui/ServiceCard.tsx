"use client";

import React, { useState } from "react";
import {
  Clock,
  ChevronRight,
  Search,
  X,
  Plus,
  ZoomIn,
  ZoomOut,
  Camera,
  Sparkles,
} from "lucide-react";
import { ServiceItem } from "@/lib/mockData";

interface ServiceCardProps {
  service: ServiceItem;
  mode?: "client" | "summary" | "admin";
  onSelect?: (service: ServiceItem) => void;
  onToggleActive?: (id: string) => void;
  onEdit?: (service: ServiceItem) => void;
}

/**
 * Retorna a versão em Alta Definição (HD) da fotografia do serviço.
 * Se a profissional enviou uma foto própria (/uploads/services/... ou data:image/...),
 * usa a foto real enviada por ela em resolução original.
 * Caso seja uma das miniaturas padrão (/images/service-*.png), mapeia para a versão HD.
 */
export function resolveHdServiceImage(imageUrl: string): string {
  if (!imageUrl) return "/images/service-classica-hd.png";
  const hdMap: Record<string, string> = {
    "/images/service-classica.png": "/images/service-classica-hd.png",
    "/images/service-brasileiro.png": "/images/service-brasileiro-hd.png",
    "/images/service-hibrido.png": "/images/service-hibrido-hd.png",
    "/images/service-russo.png": "/images/service-russo-hd.png",
    "/images/service-manutencao.png": "/images/service-manutencao-hd.png",
    "/images/service-remocao.png": "/images/service-remocao-hd.png",
  };
  return hdMap[imageUrl] || imageUrl;
}

export default function ServiceCard({
  service,
  mode = "client",
  onSelect,
  onToggleActive,
  onEdit,
}: ServiceCardProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [isMagnified, setIsMagnified] = useState(false);
  const [hdFallback, setHdFallback] = useState(false);

  const hdSrc = hdFallback
    ? service.image
    : resolveHdServiceImage(service.image);

  if (mode === "summary") {
    return (
      <div className="w-full bg-[#F5E6DF] border border-[#E5D1C7] rounded-[18px] p-3 flex items-center gap-3.5">
        <div className="w-[62px] h-[62px] rounded-full overflow-hidden shrink-0 border border-[#DEC7BC]">
          <img
            src={hdSrc}
            alt={service.name}
            onError={() => setHdFallback(true)}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-bold text-[#2D1C18] leading-snug truncate">
            {service.name}
          </h3>
          <div className="flex items-center gap-4 mt-1.5 text-[13.5px] text-[#2D1C18]">
            <span className="flex items-center gap-1.5 font-medium text-[#4A3731]">
              <Clock size={14} className="text-[#6E5850]" />
              {service.duration}
            </span>
            <span className="font-bold text-[#2D1C18]">
              {service.priceFormatted}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "admin") {
    return (
      <div className="w-full bg-[#FAF5F1] border border-[#E7DAD1] rounded-[18px] p-2.5 pr-3.5 flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onEdit?.(service)}
          className="flex items-center gap-3.5 flex-1 min-w-0 text-left group"
        >
          <div className="relative w-[56px] h-[56px] shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden border border-[#E1CFC5]">
              <img
                src={hdSrc}
                alt={service.name}
                onError={() => setHdFallback(true)}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#2D1C18]/85 text-[#FAF5F1] text-[9px] font-semibold px-1.5 py-[1px] rounded-full flex items-center gap-0.5 shadow-2xs">
              <Camera size={8.5} />
              <span>Foto</span>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14.5px] font-bold text-[#2D1C18] leading-tight truncate group-hover:text-[#B87472] transition-colors">
              {service.name}
            </h3>
            <p className="text-[12.5px] text-[#6E5B53] mt-1 font-medium">
              {service.duration} • {service.priceFormatted}
            </p>
          </div>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={service.active}
          onClick={() => onToggleActive?.(service.id)}
          className={`w-[44px] h-[25px] rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
            service.active ? "bg-[#B87472]" : "bg-[#D5C5BC]"
          }`}
          aria-label={`Ativar ou desativar ${service.name}`}
        >
          <span
            className={`w-[21px] h-[21px] rounded-full bg-[#FFFDFB] shadow-sm transform transition-transform duration-200 ${
              service.active ? "translate-x-[19px]" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(service)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(service);
          }
        }}
        className="w-full text-left bg-[#FAF5F1] hover:bg-[#F7EFE9] active:scale-[0.99] transition-all border border-[#E8DBD2] rounded-[18px] p-2.5 pr-3 flex items-center gap-3.5 cursor-pointer"
      >
        <div className="relative w-[62px] h-[62px] shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden border border-[#E2D0C6]">
            <img
              src={hdSrc}
              alt={service.name}
              onError={() => setHdFallback(true)}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMagnified(false);
              setZoomOpen(true);
            }}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#2D1C18]/85 hover:bg-[#2D1C18] text-[#FAF5F1] text-[9.5px] font-semibold px-2 py-[2px] rounded-full flex items-center gap-0.5 shadow-sm border border-[#E2D0C6]/40"
            aria-label={`Ampliar foto em alta definição de ${service.name}`}
          >
            <Search size={9} strokeWidth={2.5} />
            <span>Ver</span>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-bold text-[#2D1C18] leading-tight truncate">
            {service.name}
          </h3>
          <p className="text-[12px] text-[#7A655D] mt-0.5 truncate">
            {service.description}
          </p>
          <div className="flex items-center gap-4 mt-1.5 text-[12.5px]">
            <span className="flex items-center gap-1 font-semibold text-[#3D2A24]">
              <Clock size={12.5} className="text-[#7A655D]" />
              {service.duration}
            </span>
            <span className="font-bold text-[#2D1C18]">
              {service.priceFormatted}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[#8E7970] shrink-0" />
      </div>

      {/* Modal de Fotografia em Alta Definição (HD) com Lupa de Zoom 2x */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#2D1C18]/75 backdrop-blur-[3px] flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="w-full max-w-[380px] bg-[#FAF5F1] border border-[#E5D4C9] rounded-[24px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[320px] bg-[#EAD8CE] overflow-auto">
              <img
                src={hdSrc}
                alt={`Fotografia em alta definição: ${service.name}`}
                onError={() => setHdFallback(true)}
                onClick={() => setIsMagnified((prev) => !prev)}
                className={`w-full h-full object-cover transition-transform duration-300 cursor-zoom-in ${
                  isMagnified ? "scale-175 cursor-zoom-out" : "scale-100"
                }`}
              />

              {/* Selo HD + Lupa interativa */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="bg-[#2D1C18]/75 backdrop-blur-xs text-[#FAF5F1] text-[10.5px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={11} className="text-[#E2B897]" />
                  <span>Foto Real HD</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMagnified((prev) => !prev)}
                  className="bg-[#FAF5F1]/90 hover:bg-[#FAF5F1] text-[#2D1C18] text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs"
                >
                  {isMagnified ? (
                    <>
                      <ZoomOut size={12} className="text-[#B87472]" />
                      <span>1x</span>
                    </>
                  ) : (
                    <>
                      <ZoomIn size={12} className="text-[#B87472]" />
                      <span>Zoom 2x</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#2D1C18]/75 text-[#FAF5F1] flex items-center justify-center"
                aria-label="Fechar visualização"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-serif text-[20px] font-bold text-[#2D1C18]">
                  {service.name}
                </h3>
                <p className="text-[13px] text-[#5E4B44] mt-1 leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="flex items-center justify-between bg-[#F3E5DC] rounded-[14px] px-3.5 py-2.5 text-[13.5px]">
                <span className="flex items-center gap-1.5 font-semibold text-[#3D2A24]">
                  <Clock size={14} className="text-[#B87472]" />
                  Duração: {service.duration}
                </span>
                <span className="font-bold text-[15px] text-[#2D1C18]">
                  {service.priceFormatted}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setZoomOpen(false);
                  onSelect?.(service);
                }}
                className="w-full bg-[#B87472] hover:bg-[#A66361] text-[#FFFDFB] font-semibold text-[14px] py-3 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Plus size={16} />
                <span>Agendar este procedimento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
