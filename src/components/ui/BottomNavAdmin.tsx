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

export type AdminTab = "agenda" | "clientes" | "servicos" | "financeiro" | "mais";

export default function BottomNavAdmin({ activeTab }: { activeTab?: AdminTab }) {
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
      : pathname.includes("/mais")
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
    <nav className="sticky bottom-0 left-0 right-0 w-full bg-[#38231E] text-[#C8B5AD] px-2 pt-2 pb-3 flex items-center justify-around z-30 border-t border-[#4B312B]">
      {items.map((item) => {
        const isActive = resolvedTab === item.key;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className="flex flex-col items-center justify-center min-w-[62px] py-0.5 relative group transition-colors"
          >
            {isActive && (
              <span className="absolute -top-2 w-7 h-[3px] rounded-b-full bg-[#E5B8B4]" />
            )}
            <IconComponent
              size={20}
              strokeWidth={isActive ? 2.2 : 1.6}
              className={isActive ? "text-[#FAF3EE]" : "text-[#B69F96]"}
            />
            <span
              className={`text-[11px] mt-1 leading-tight ${
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

      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="flex flex-col items-center justify-center min-w-[62px] py-0.5 relative transition-colors"
      >
        <MoreHorizontal
          size={20}
          strokeWidth={1.8}
          className="text-[#B69F96]"
        />
        <span className="text-[11px] mt-1 leading-tight text-[#B69F96] font-normal">
          Mais
        </span>
      </button>
    </nav>
  );
}
