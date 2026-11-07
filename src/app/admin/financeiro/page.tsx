"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  Trash2,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { BotanicalSprigRight } from "@/components/ui/BotanicalDecor";
import { getDefaultBookingDate } from "@/lib/validation";

interface FinanceEntry {
  id: string;
  appointmentId?: string;
  expenseId?: string;
  date: string;
  title: string;
  subtitle?: string;
  subtitleType?: "pending" | "confirmed";
  amountFormatted: string;
  type: "income" | "expense";
  paymentStatus?: string;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return "Março de 2025";
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

export default function AdminFinancialPage() {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    getDefaultBookingDate().iso.slice(0, 7)
  );
  const [receivedFormatted, setReceivedFormatted] = useState("R$ 0,00");
  const [pendingSignalsFormatted, setPendingSignalsFormatted] =
    useState("R$ 0,00");
  const [expensesFormatted, setExpensesFormatted] = useState("R$ 0,00");
  const [netBalanceFormatted, setNetBalanceFormatted] = useState("R$ 0,00");
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de nova despesa
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(() => getDefaultBookingDate().iso);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isExpenseValid =
    expDesc.trim().length >= 2 &&
    !isNaN(Number(String(expAmount).replace(",", "."))) &&
    Number(String(expAmount).replace(",", ".")) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(expDate);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?month=${selectedMonth}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedFormatted(data.receivedFormatted || "R$ 0,00");
        setPendingSignalsFormatted(data.pendingSignalsFormatted || "R$ 0,00");
        setExpensesFormatted(data.expensesFormatted || "R$ 0,00");
        setNetBalanceFormatted(
          data.netBalanceFormatted || data.receivedFormatted || "R$ 0,00"
        );
        setEntries(data.entries || []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const shiftMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    const nextYm = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    setSelectedMonth(nextYm);
  };

  const handleConfirmSignalManual = async (appointmentId: string) => {
    setActionLoadingId(appointmentId);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "SIGNAL_PAID",
          status: "CONFIRMED",
        }),
      });
      if (res.ok) {
        setFeedbackMsg("Sinal Pix confirmado com sucesso!");
        setTimeout(() => setFeedbackMsg(""), 3000);
        await loadFinance();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Não foi possível confirmar o sinal.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao confirmar sinal.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCompleteFullPayment = async (appointmentId: string) => {
    setActionLoadingId(appointmentId);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "FULL_PAID",
          status: "COMPLETED",
        }),
      });
      if (res.ok) {
        setFeedbackMsg("Pagamento integral (100%) registrado com sucesso!");
        setTimeout(() => setFeedbackMsg(""), 3000);
        await loadFinance();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Não foi possível registrar o recebimento.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao registrar recebimento.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setActionLoadingId(expenseId);
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/finance?expenseId=${encodeURIComponent(expenseId)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setFeedbackMsg("Despesa excluída com sucesso.");
        setTimeout(() => setFeedbackMsg(""), 2500);
        await loadFinance();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Erro ao excluir despesa.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao excluir despesa.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(String(expAmount).replace(",", "."));
    if (!expDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expDesc.trim(),
          amount: parsedAmount,
          date: expDate,
        }),
      });
      if (res.ok) {
        setExpenseModalOpen(false);
        setExpDesc("");
        setExpAmount("");
        setFeedbackMsg("Despesa registrada com sucesso!");
        setTimeout(() => setFeedbackMsg(""), 3000);
        await loadFinance();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Erro ao registrar despesa.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao salvar despesa.");
    } finally {
      setSaving(false);
    }
  };

  const currentMonthLabel = formatMonthLabel(selectedMonth);

  return (
    <MobileContainer showAdminNav activeAdminTab="financeiro">
      <PageHeader title="Financeiro" leftType="menu" rightType="botanical" />

      <div className="px-4 min-[375px]:px-5 pt-1 pb-6 flex-1 flex flex-col justify-between relative">
        <div>
          {/* Dynamic Month Selector with Prev/Next */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-1 bg-[#FAF5F1] border border-[#E6D8CF] rounded-full p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3] active:scale-95 transition touch-manipulation"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-1.5 text-[12.5px] min-[375px]:text-[13px] font-bold text-[#2D1C18]">
                {currentMonthLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3] active:scale-95 transition touch-manipulation"
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const todayIso = getDefaultBookingDate().iso;
                setExpDate(
                  todayIso.startsWith(selectedMonth)
                    ? todayIso
                    : `${selectedMonth}-01`
                );
                setErrorMsg("");
                setExpenseModalOpen(true);
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-[#FAF5F1] border border-[#E6D8CF] flex items-center gap-1 text-[12.5px] font-semibold text-[#5C4841] hover:bg-[#EADCD3] active:scale-95 transition touch-manipulation"
              aria-label="Registrar nova despesa"
            >
              <Plus size={14} />
              <span>Despesa</span>
            </button>
          </div>

          {feedbackMsg && (
            <div className="mb-3 bg-[#D8EFDC] border border-[#BDE2C4] text-[#2E8540] text-[12px] font-semibold px-3 py-2 rounded-[12px] text-center">
              {feedbackMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-3 bg-[#F3D8D8] border border-[#E2B8B8] text-[#B84A48] text-[12px] font-semibold px-3 py-2 rounded-[12px] text-center">
              {errorMsg}
            </div>
          )}

          {/* Financial Summary Card (Blush Pink + Warm Cream) */}
          <div className="rounded-[20px] overflow-hidden border border-[#E8CFD0] shadow-[0_2px_10px_rgba(45,28,24,0.03)]">
            <div className="bg-[#F5DADC] px-4 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] min-[375px]:text-[12.5px] text-[#4E3835] font-medium">
                  Recebimentos ({currentMonthLabel})
                </p>
                <p className="text-[22px] min-[375px]:text-[24px] font-bold text-[#2D1C18] mt-0.5 tracking-tight">
                  {receivedFormatted}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#5C4841] font-medium">
                  Saldo líquido
                </p>
                <p className="text-[14.5px] font-bold text-[#2D1C18] mt-0.5">
                  {netBalanceFormatted}
                </p>
              </div>
            </div>

            <div className="bg-[#FAF3EE] px-4 py-3 divide-y divide-[#EADCD4]">
              <div className="pb-2.5 flex items-center justify-between text-[13.5px]">
                <span className="text-[#3D2A24] font-medium">
                  Sinais pendentes
                </span>
                <span className="text-[#2E8540] font-bold">
                  {pendingSignalsFormatted}
                </span>
              </div>

              <div className="pt-2.5 flex items-center justify-between text-[13.5px]">
                <span className="text-[#3D2A24] font-medium">Despesas</span>
                <span className="text-[#B84A48] font-bold">
                  {expensesFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Últimos lançamentos */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[15px] font-bold text-[#2D1C18]">
                Últimos lançamentos
              </h2>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(true)}
                className="min-h-[38px] px-2 text-[12.5px] font-semibold text-[#B87472] flex items-center gap-0.5 touch-manipulation"
              >
                <span>+ Despesa</span>
                <ChevronRight size={15} />
              </button>
            </div>

            {loading ? (
              <p className="text-[13px] text-[#7A655D] py-4 text-center">
                Calculando lançamentos...
              </p>
            ) : entries.length === 0 ? (
              <div className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[14px] p-4 text-center text-[12.5px] text-[#6E5B53]">
                Nenhum lançamento registrado neste mês.
              </div>
            ) : (
              <div className="divide-y divide-[#E9DDD5]">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-3 flex items-start justify-between gap-2 text-[13px]"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-[12.5px] text-[#6E5B53] font-medium shrink-0 pt-0.5 w-[36px]">
                        {entry.date}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#2D1C18] leading-snug truncate">
                          {entry.title}
                        </p>
                        {entry.subtitle && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`text-[12px] font-medium ${
                                entry.subtitleType === "pending"
                                  ? "text-[#B57F24]"
                                  : "text-[#2E8540]"
                              }`}
                            >
                              {entry.subtitle}
                            </span>

                            {entry.subtitleType === "pending" &&
                              entry.appointmentId && (
                                <button
                                  type="button"
                                  disabled={
                                    actionLoadingId === entry.appointmentId
                                  }
                                  onClick={() =>
                                    handleConfirmSignalManual(
                                      entry.appointmentId!
                                    )
                                  }
                                  className="min-h-[34px] inline-flex items-center gap-1 text-[11.5px] bg-[#D8EFDC] text-[#2E8540] font-bold px-2.5 py-1 rounded-full hover:bg-[#C6E8CC] active:scale-95 transition touch-manipulation disabled:opacity-55"
                                >
                                  <Check size={12} />
                                  {actionLoadingId === entry.appointmentId
                                    ? "Confirmando..."
                                    : "Confirmar Pix"}
                                </button>
                              )}

                            {entry.paymentStatus === "SIGNAL_PAID" &&
                              entry.appointmentId && (
                                <button
                                  type="button"
                                  disabled={
                                    actionLoadingId === entry.appointmentId
                                  }
                                  onClick={() =>
                                    handleCompleteFullPayment(
                                      entry.appointmentId!
                                    )
                                  }
                                  className="min-h-[34px] inline-flex items-center gap-1 text-[11.5px] bg-[#EFE3DC] text-[#3D2923] font-semibold px-2.5 py-1 rounded-full hover:bg-[#E4D2C7] active:scale-95 transition touch-manipulation disabled:opacity-55"
                                >
                                  <Check size={12} />
                                  {actionLoadingId === entry.appointmentId
                                    ? "Registrando..."
                                    : "Receber restante"}
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <span
                        className={`font-bold text-[13px] ${
                          entry.type === "income"
                            ? "text-[#2E8540]"
                            : "text-[#B84A48]"
                        }`}
                      >
                        {entry.amountFormatted}
                      </span>
                      {entry.expenseId && (
                        <button
                          type="button"
                          disabled={actionLoadingId === entry.expenseId}
                          onClick={() => handleDeleteExpense(entry.expenseId!)}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[#A87573] hover:text-[#B84A48] hover:bg-[#F3D8D8]/60 active:scale-95 transition touch-manipulation disabled:opacity-50"
                          aria-label="Excluir despesa"
                          title="Excluir despesa"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <BotanicalSprigRight className="w-[80px] h-[55px] absolute -right-3 -bottom-2 opacity-65 pointer-events-none" />
      </div>

      {/* Modal de Registro de Despesa */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-2.5 min-[375px]:p-3">
          <div className="w-full max-w-[410px] max-h-[88dvh] overflow-y-auto bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-4 min-[375px]:p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                Registrar despesa
              </h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                aria-label="Fechar modal"
                className="w-10 h-10 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="mt-3 space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Descrição (ex: Materiais, Cola, Fios) *
                </label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Materiais"
                  enterKeyHint="next"
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18]"
                />
              </div>

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="100,00"
                    enterKeyHint="next"
                    className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[13.5px] text-[#2D1C18]"
                  />
                </div>
              </div>

              <PrimaryButton
                type="submit"
                variant="rose"
                disabled={!isExpenseValid || saving}
              >
                {saving ? "Salvando..." : "Salvar despesa"}
              </PrimaryButton>
            </form>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
