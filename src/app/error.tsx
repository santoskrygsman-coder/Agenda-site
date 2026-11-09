"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro capturado na rota:", error);
  }, [error]);

  return (
    <div className="min-h-dvh w-full bg-[#E6DAD0] flex justify-center items-center p-4">
      <div className="w-full max-w-[400px] bg-[#FAF5F1] border border-[#E5D4C9] rounded-[24px] p-6 text-center shadow-lg space-y-4">
        <h2 className="font-serif text-[22px] font-bold text-[#2D1C18]">
          Ops! Vamos atualizar a página
        </h2>
        <p className="text-[13px] text-[#5C4841] leading-relaxed">
          Ocorreu uma oscilação momentânea ao carregar esta etapa. Seus dados e
          horários continuam seguros.
        </p>
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full min-h-[48px] rounded-full bg-[#B87472] hover:bg-[#A66361] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition"
          >
            <RotateCcw size={16} />
            <span>Tentar novamente</span>
          </button>
          <Link
            href="/"
            className="w-full min-h-[44px] rounded-full bg-[#EADCD3] text-[#2D1C18] font-semibold text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Home size={15} />
            <span>Voltar ao início</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
