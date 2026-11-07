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

  const isExpenseValid =
    expDesc.trim().length >= 2 &&
    !isNaN(Number(String(expAmount).replace(",", "."))) &&
    Number(String(expAmount).replace(",", ".")) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(expDate);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?month=${selectedMonth}`);
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
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: "SIGNAL_PAID",
        status: "CONFIRMED",
      }),
    });
    if (res.ok) {
      loadFinance();
    }
  };

  const handleCompleteFullPayment = async (appointmentId: string) => {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: "FULL_PAID",
        status: "COMPLETED",
      }),
    });
    if (res.ok) {
      loadFinance();
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const res = await fetch(
      `/api/finance?expenseId=${encodeURIComponent(expenseId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      loadFinance();
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(String(expAmount).replace(",", "."));
    if (!expDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSaving(true);
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expDesc.trim(),
        amount: parsedAmount,
        date: expDate,
      }),
    });
    setSaving(false);

    if (res.ok) {
      setExpenseModalOpen(false);
      setExpDesc("");
      setExpAmount("");
      loadFinance();
    }
  };

  const currentMonthLabel = formatMonthLabel(selectedMonth);

  return (
    <MobileContainer showAdminNav activeAdminTab="financeiro">
      <PageHeader title="Financeiro" leftType="menu" rightType="botanical" />

      <div className="px-5 pt-1 pb-6 flex-1 flex flex-col justify-between relative">
        <div>
          {/* Dynamic Month Selector with Prev/Next */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 bg-[#FAF5F1] border border-[#E6D8CF] rounded-full px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3]"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[13px] font-bold text-[#2D1C18]">
                {currentMonthLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#5C4841] hover:bg-[#EADCD3]"
                aria-label="Próximo mês"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setExpDate(`${selectedMonth}-14`);
                setExpenseModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-full bg-[#FAF5F1] border border-[#E6D8CF] flex items-center gap-1 text-[12px] font-semibold text-[#5C4841] hover:bg-[#EADCD3]"
              aria-label="Registrar nova despesa"
            >
              <Plus size={13} />
              <span>Despesa</span>
            </button>
          </div>

          {/* Financial Summary Card (Blush Pink + Warm Cream) */}
          <div className="rounded-[20px] overflow-hidden border border-[#E8CFD0] shadow-[0_2px_10px_rgba(45,28,24,0.03)]">
            <div className="bg-[#F5DADC] px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[12.5px] text-[#4E3835] font-medium">
                  Recebimentos ({currentMonthLabel})
                </p>
                <p className="text-[24px] font-bold text-[#2D1C18] mt-0.5 tracking-tight">
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
                className="text-[12.5px] font-medium text-[#B87472] flex items-center gap-0.5"
              >
                <span>+ Despesa</span>
                <ChevronRight size={14} />
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
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                                  onClick={() =>
                                    handleConfirmSignalManual(
                                      entry.appointmentId!
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] bg-[#D8EFDC] text-[#2E8540] font-bold px-2 py-0.5 rounded-full hover:bg-[#C6E8CC]"
                                >
                                  <Check size={11} />
                                  Confirmar Pix
                                </button>
                              )}

                            {entry.paymentStatus === "SIGNAL_PAID" &&
                              entry.appointmentId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCompleteFullPayment(
                                      entry.appointmentId!
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] bg-[#EFE3DC] text-[#3D2923] font-semibold px-2 py-0.5 rounded-full hover:bg-[#E4D2C7]"
                                >
                                  <Check size={11} />
                                  Receber restante
                                </button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
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
                          onClick={() => handleDeleteExpense(entry.expenseId!)}
                          className="p-1 text-[#A87573] hover:text-[#B84A48]"
                          aria-label="Excluir despesa"
                          title="Excluir despesa"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <BotanicalSprigRight className="w-[80px] h-[55px] absolute -right-3 -bottom-2 opacity-65" />
      </div>

      {/* Modal de Registro de Despesa */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-3">
          <div className="w-full max-w-[390px] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                Registrar despesa
              </h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="mt-3 space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Descrição (ex: Materiais, Cola, Fios)
                </label>
                <input
                  type="text"
                  required
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Materiais"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="100,00"
                    className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px]"
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
