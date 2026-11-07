"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ChevronRight,
  Clock,
  KeyRound,
  LogOut,
  Timer,
  Sparkles,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { maskBrazilianPhone } from "@/lib/validation";
import { useBooking } from "@/context/BookingContext";

export default function AdminMaisPage() {
  const { refreshSettings } = useBooking();
  const [professionalName, setProfessionalName] = useState(
    "Emile Lash Designer"
  );
  const [specialty, setSpecialty] = useState(
    "Cílios • Sobrancelha • Brow Lamination • Lash Lifting"
  );
  const [description, setDescription] = useState(
    "Centro - Posto da Mata • @emiledesiigner"
  );
  const [whatsapp, setWhatsapp] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");
  const [signalPercentage, setSignalPercentage] = useState("50");
  const [holdMinutes, setHoldMinutes] = useState("15");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfessionalName(
            data.professionalName || "Emile Lash Designer"
          );
          setSpecialty(
            data.specialty ||
              "Cílios • Sobrancelha • Brow Lamination • Lash Lifting"
          );
          setDescription(
            data.description || "Centro - Posto da Mata • @emiledesiigner"
          );
          setWhatsapp(data.whatsapp || "");
          setPixKey(data.pixKey || "");
          setPixKeyType(data.pixKeyType || "CPF");
          setSignalPercentage(String(data.signalPercentage ?? 50));
          setHoldMinutes(String(data.holdMinutes ?? 15));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalName,
          specialty,
          description,
          whatsapp,
          pixKey,
          pixKeyType,
          signalPercentage: Number(signalPercentage) || 50,
          holdMinutes: Number(holdMinutes) || 15,
        }),
      });
      if (res.ok) {
        await refreshSettings();
        setSavedMsg("Configurações salvas com sucesso!");
        setTimeout(() => setSavedMsg(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Não foi possível salvar as configurações.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileContainer showAdminNav activeAdminTab="mais">
      <PageHeader
        title="Configurações do Estúdio"
        leftType="menu"
        rightType="botanical"
      />

      <div className="px-4 min-[375px]:px-5 pt-1 pb-6 space-y-4 flex-1">
        {/* Atalho para Horários, Intervalos, Folgas e Bloqueios */}
        <Link
          href="/admin/horarios"
          className="w-full min-h-[64px] bg-[#FAF5F1] hover:bg-[#F3E8E0] active:scale-[0.99] border border-[#E7DAD1] rounded-[16px] p-3.5 flex items-center justify-between gap-2 transition touch-manipulation"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#F4E3DC] flex items-center justify-center text-[#B87472]">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13.5px] min-[375px]:text-[14px] font-bold text-[#2D1C18] leading-snug">
                Horários, intervalos, folgas e bloqueios
              </h2>
              <p className="text-[12px] text-[#6E5B53] mt-0.5">
                Configure seu expediente semanal e datas bloqueadas
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#B87472] shrink-0" />
        </Link>

        {/* Configuração do Perfil do Estúdio, Chave Pix, Sinal e Tempo de Reserva */}
        <form
          onSubmit={handleSaveSettings}
          className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[18px] p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#B87472] shrink-0" />
            <h2 className="text-[14.5px] font-bold text-[#2D1C18]">
              Identidade do Estúdio e Instagram
            </h2>
          </div>

          {savedMsg && (
            <p className="text-[12px] text-[#2E8540] font-semibold bg-[#D8EFDC] px-3 py-2 rounded-[10px]">
              {savedMsg}
            </p>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
              Nome do Estúdio / Profissional
            </label>
            <input
              type="text"
              value={professionalName}
              onChange={(e) => setProfessionalName(e.target.value)}
              placeholder="Emile Lash Designer"
              enterKeyHint="next"
              className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
              Especialidades (Bio)
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Cílios • Sobrancelha • Brow Lamination • Lash Lifting"
              enterKeyHint="next"
              className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
              Localização e Instagram
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Centro - Posto da Mata • @emiledesiigner"
              enterKeyHint="next"
              className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
            />
          </div>

          <div className="border-t border-[#E6D8CF] pt-2.5 flex items-center gap-2">
            <KeyRound size={15} className="text-[#B87472] shrink-0" />
            <h3 className="text-[13.5px] font-bold text-[#2D1C18]">
              WhatsApp, Chave Pix e Reserva
            </h3>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
              WhatsApp de atendimento (com DDD)
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskBrazilianPhone(e.target.value))}
              placeholder="(73) 99999-9999"
              autoComplete="tel"
              enterKeyHint="next"
              className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
            />
          </div>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2">
            <div>
              <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                Tipo Pix
              </label>
              <select
                value={pixKeyType}
                onChange={(e) => setPixKeyType(e.target.value)}
                className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-2.5 py-2.5 text-[13.5px] text-[#2D1C18]"
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="TELEFONE">Telefone</option>
                <option value="EMAIL">E-mail</option>
                <option value="ALEATORIA">Aleatória</option>
              </select>
            </div>
            <div className="min-[360px]:col-span-2">
              <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                Chave Pix
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="000.000.000-00"
                enterKeyHint="next"
                className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                Sinal antecipado (%)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={100}
                value={signalPercentage}
                onChange={(e) => setSignalPercentage(e.target.value)}
                enterKeyHint="next"
                className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1 flex items-center gap-1">
                <Timer size={12} className="text-[#B87472] shrink-0" />
                <span>Prazo do sinal (min)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={5}
                max={120}
                value={holdMinutes}
                onChange={(e) => setHoldMinutes(e.target.value)}
                enterKeyHint="done"
                className="w-full min-h-[46px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[11px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
              />
            </div>
          </div>
          <p className="text-[11.5px] text-[#7A665E] leading-snug">
            Se a cliente não anexar o comprovante dentro de {holdMinutes || 15}{" "}
            minutos, o horário volta a ficar disponível automaticamente.
          </p>

          {savedMsg && (
            <p className="text-[12px] text-[#2E8540] font-semibold bg-[#D8EFDC] px-3 py-2 rounded-[10px] text-center">
              {savedMsg}
            </p>
          )}

          {errorMsg && (
            <p className="text-[12px] text-[#B84A48] font-semibold bg-[#F3D8D8] px-3 py-2 rounded-[10px] text-center">
              {errorMsg}
            </p>
          )}

          <PrimaryButton type="submit" variant="rose" disabled={saving}>
            {saving ? "Salvando..." : "Salvar configurações"}
          </PrimaryButton>
        </form>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full min-h-[48px] bg-[#F3D8D8] hover:bg-[#ECCACA] active:scale-[0.99] text-[#B84A48] rounded-[14px] py-3 font-semibold text-[13.5px] flex items-center justify-center gap-2 transition touch-manipulation"
        >
          <LogOut size={16} />
          <span>Sair do painel administrativo</span>
        </button>
      </div>
    </MobileContainer>
  );
}
