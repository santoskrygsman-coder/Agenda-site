"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Menu, Bell, Plus, MoreVertical } from "lucide-react";
import { useBooking } from "@/context/BookingContext";

interface PageHeaderProps {
  title: string;
  leftType?: "back" | "menu";
  backHref?: string;
  rightType?: "botanical" | "date-eye" | "bell" | "plus" | "more" | "none";
  onRightClick?: () => void;
}

export default function PageHeader({
  title,
  leftType = "back",
  backHref = "/",
  rightType = "botanical",
  onRightClick,
}: PageHeaderProps) {
  const { setIsMenuOpen } = useBooking();

  return (
    <header className="relative w-full pt-5 pb-3.5 px-5 flex items-center justify-between overflow-hidden select-none shrink-0">
      {/* Subtle warm nude top curve background */}
      <div
        className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-[#EEDBD1]/70 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Right decorative image when botanical or date-eye */}
      {rightType === "botanical" && (
        <img
          src="/images/header-botanical.png"
          alt=""
          className="absolute right-0 top-0 h-[64px] w-auto object-contain opacity-90 pointer-events-none select-none"
           style={{
            maskImage:
              "linear-gradient(to left, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0) 100%), linear-gradient(to bottom, rgba(0,0,0,0.95) 65%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to left, rgba(0,0,0,0.95) 55%, rgba(0,0,0,0) 100%)",
          }}
        />
      )}

      {rightType === "date-eye" && (
        <img
          src="/images/header-date-eye.png"
          alt=""
          className="absolute right-0 top-0 h-[62px] w-auto object-cover opacity-95 pointer-events-none select-none rounded-bl-3xl"
          style={{
            maskImage:
              "linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage:
              "linear-gradient(to left, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
          }}
        />
      )}

      {/* Left Action */}
      <div className="relative z-10 w-9 flex items-center justify-start">
        {leftType === "back" ? (
          <Link
            href={backHref}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2D1C18] hover:bg-[#EAD9CF]/60 active:scale-95 transition"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2D1C18] hover:bg-[#EAD9CF]/60 active:scale-95 transition"
            aria-label="Abrir menu"
          >
            <Menu size={21} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Centered Serif Title */}
      <h1 className="relative z-10 font-serif text-[19px] font-semibold tracking-[-0.01em] text-[#2D1C18] text-center truncate px-2">
        {title}
      </h1>

      {/* Right Action */}
      <div className="relative z-10 w-9 flex items-center justify-end">
        {rightType === "bell" && (
          <button
            type="button"
            onClick={onRightClick}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2D1C18] hover:bg-[#EAD9CF]/60 transition"
            aria-label="Notificações"
          >
            <Bell size={19} strokeWidth={1.9} />
          </button>
        )}
        {rightType === "plus" && (
          <button
            type="button"
            onClick={onRightClick}
            className="w-7 h-7 rounded-full bg-[#B87472] text-white flex items-center justify-center shadow-sm hover:bg-[#A66361] active:scale-95 transition"
            aria-label="Adicionar"
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
        )}
        {rightType === "more" && (
          <button
            type="button"
            onClick={onRightClick}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2D1C18] hover:bg-[#EAD9CF]/60 transition"
            aria-label="Mais opções"
          >
            <MoreVertical size={19} strokeWidth={2} />
          </button>
        )}
      </div>
    </header>
  );
}
