"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User, AlertCircle } from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { BotanicalSprigBottomLeft } from "@/components/ui/BotanicalDecor";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/agenda";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Usuário ou senha inválidos. Verifique suas credenciais.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <MobileContainer>
      <PageHeader
        title="Acesso da Profissional"
        leftType="back"
        backHref="/"
        rightType="botanical"
      />

      <div className="px-5 pt-4 pb-8 flex-1 flex flex-col justify-between relative">
        <div>
          <p className="text-[13.5px] leading-[1.45] text-[#3D2A24] mb-5">
            Entre com suas credenciais administrativas para gerenciar sua agenda,
            clientes, serviços e financeiro.
          </p>

          {error && (
            <div className="mb-4 bg-[#F3D8D8] border border-[#E2B8B8] text-[#9E3836] rounded-[14px] px-3.5 py-2.5 text-[12.5px] flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="w-full bg-[#FAF5F1] border border-[#E6D8CF] rounded-[14px] px-3.5 py-3 min-h-[48px] flex items-center gap-3 focus-within:border-[#B87472]">
              <User size={18} className="text-[#4B3630] shrink-0" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuário ou e-mail"
                autoComplete="username"
                autoCapitalize="none"
                enterKeyHint="next"
                className="flex-1 bg-transparent text-[14px] text-[#2D1C18] placeholder-[#7D6A63] focus:outline-none min-w-0"
              />
            </div>

            <div className="w-full bg-[#FAF5F1] border border-[#E6D8CF] rounded-[14px] px-3.5 py-3 min-h-[48px] flex items-center gap-3 focus-within:border-[#B87472]">
              <Lock size={18} className="text-[#4B3630] shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                enterKeyHint="done"
                className="flex-1 bg-transparent text-[14px] text-[#2D1C18] placeholder-[#7D6A63] focus:outline-none min-w-0"
              />
            </div>

            <div className="pt-2">
              <PrimaryButton type="submit" variant="rose" showArrow disabled={loading}>
                {loading ? "Entrando..." : "Entrar no painel"}
              </PrimaryButton>
            </div>
          </form>
        </div>

        <BotanicalSprigBottomLeft className="w-[125px] h-[85px] opacity-75 -ml-4" />
      </div>
    </MobileContainer>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#F4EAE3]" />}>
      <LoginFormContent />
    </Suspense>
  );
}
