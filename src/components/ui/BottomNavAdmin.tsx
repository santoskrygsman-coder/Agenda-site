"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck2,
  Users,
  ShieldCheck,
  WalletCards,
  MoreHorizontal,
} from "lucide-react";
import { useBooking } from "@/context/BookingContext";

export type AdminTab =
  | "agenda"
  | "clientes"
  | "servicos"
  | "financeiro"
  | "mais";

export default function BottomNavAdmin({
  activeTab,
}: {
  activeTab?: AdminTab;
}) {
  const pathname = usePathname();
  const { setIsMenuOpen } = useBooking();

  const resolvedTab: AdminTab =
    activeTab ||
    (pathname.includes("/clientes")
      ? "clientes"
      : pathname.includes("/servicos") || pathname.includes("/procedimentos")
      ? "servicos"
      : pathname.includes("/financeiro")
      ? "financeiro"
      : pathname.includes("/mais") || pathname.includes("/horarios")
      ? "mais"
      : "agenda");

  const items = [
    {
      key: "agenda" as AdminTab,
      label: "Agenda",
      href: "/admin/agenda",
      icon: CalendarCheck2,
    },
    {
      key: "clientes" as AdminTab,
      label: "Clientes",
      href: "/admin/clientes",
      icon: Users,
    },
    {
      key: "servicos" as AdminTab,
      label: "Serviços",
      href: "/admin/servicos",
      icon: ShieldCheck,
    },
    {
      key: "financeiro" as AdminTab,
      label: "Financeiro",
      href: "/admin/financeiro",
      icon: WalletCards,
    },
  ];

  return (
    <nav className="sticky bottom-0 left-0 right-0 w-full bg-[#38231E] text-[#C8B5AD] px-1 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-center z-30 border-t border-[#4B312B] select-none">
      {items.map((item) => {
        const isActive = resolvedTab === item.key;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-col items-center justify-center min-h-[48px] py-1 relative group transition-colors"
          >
            {isActive && (
              <span className="absolute -top-1.5 w-7 h-[3px] rounded-b-full bg-[#E5B8B4]" />
            )}
            <IconComponent
              size={20}
              strokeWidth={isActive ? 2.2 : 1.6}
              className={isActive ? "text-[#FAF3EE]" : "text-[#B69F96]"}
            />
            <span
              className={`text-[10.5px] min-[360px]:text-[11px] mt-1 leading-tight truncate max-w-full px-0.5 ${
                isActive
                  ? "text-[#FAF3EE] font-semibold"
                  : "text-[#B69F96] font-normal"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      <Link
        href="/admin/mais"
        onClick={() => setIsMenuOpen(false)}
        className="flex flex-col items-center justify-center min-h-[48px] py-1 relative transition-colors"
        aria-label="Configurações e mais opções"
      >
        {resolvedTab === "mais" && (
          <span className="absolute -top-1.5 w-7 h-[3px] rounded-b-full bg-[#E5B8B4]" />
        )}
        <MoreHorizontal
          size={20}
          strokeWidth={resolvedTab === "mais" ? 2.2 : 1.8}
          className={
            resolvedTab === "mais" ? "text-[#FAF3EE]" : "text-[#B69F96]"
          }
        />
        <span
          className={`text-[10.5px] min-[360px]:text-[11px] mt-1 leading-tight ${
            resolvedTab === "mais"
              ? "text-[#FAF3EE] font-semibold"
              : "text-[#B69F96] font-normal"
          }`}
        >
          Mais
        </span>
      </Link>
    </nav>
  );
}
