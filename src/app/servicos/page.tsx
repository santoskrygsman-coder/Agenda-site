"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import ServiceCard from "@/components/ui/ServiceCard";
import { BotanicalSprigRight } from "@/components/ui/BotanicalDecor";
import { useBooking } from "@/context/BookingContext";

export default function ChooseServicePage() {
  const router = useRouter();
  const { services, servicesLoading, setSelectedServiceById, todayOpenStatus } =
    useBooking();
  const [categoryFilter, setCategoryFilter] = useState<
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

  return (
    <MobileContainer>
      <PageHeader
        title="Escolha do serviço"
        leftType="back"
        backHref="/"
        rightType="botanical"
      />

      <div className="px-3.5 min-[375px]:px-4 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-2.5 flex-1 relative">
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 pb-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5850]">
            Extensão e Design de Cílios
          </span>
          {todayOpenStatus && (
            <span className="inline-flex items-center gap-1 bg-[#FAF5F1] border border-[#E5D4C9] rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-[#4E3B35]">
              <Clock size={11} className="text-[#B87472] shrink-0" />
              <span>{todayOpenStatus}</span>
            </span>
          )}
        </div>

        {/* Abas de filtro rápido por categoria com área de toque confortável */}
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
                className={`min-h-[40px] px-3.5 py-2 rounded-full text-[12px] shrink-0 transition-colors touch-manipulation ${
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

        <div className="space-y-2.5">
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
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                mode="client"
                onSelect={(svc) => {
                  setSelectedServiceById(svc.id);
                  router.push("/agendar/data");
                }}
              />
            ))
          )}
        </div>
        <BotanicalSprigRight className="w-[80px] h-[55px] absolute right-1 bottom-1 opacity-60 pointer-events-none" />
      </div>
    </MobileContainer>
  );
}
