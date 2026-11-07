"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { BotanicalSprigBottomLeft } from "@/components/ui/BotanicalDecor";
import { useBooking } from "@/context/BookingContext";
import { getTodayLocalIso, isPastDate } from "@/lib/validation";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
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

export default function SelectDateAndTimePage() {
  const router = useRouter();
  const {
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedDate,
    setSelectedDay,
    setSelectedYearMonth,
    selectedTime,
    setSelectedTime,
    availableTimes,
    loadingAvailability,
    availabilityReason,
  } = useBooking();

  const todayIso = getTodayLocalIso();
  const [todayYear, todayMonth, todayDay] = todayIso.split("-").map(Number);
  const isAtCurrentOrPastMonth =
    selectedYear < todayYear ||
    (selectedYear === todayYear && selectedMonth <= todayMonth);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth - 1, 1).getDay();
  const leadingEmptyDays = Array.from({ length: firstDayWeekday }, (_, i) => i);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    if (isAtCurrentOrPastMonth) return;
    const prevY = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1;
    setSelectedYearMonth(prevY, prevM);
    const maxDaysPrev = new Date(prevY, prevM, 0).getDate();
    if (prevY === todayYear && prevM === todayMonth) {
      setSelectedDay(Math.min(maxDaysPrev, Math.max(selectedDay, todayDay)));
    } else {
      setSelectedDay(Math.min(maxDaysPrev, selectedDay));
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      const nextY = selectedYear + 1;
      setSelectedYearMonth(nextY, 1);
      setSelectedDay(1);
    } else {
      const nextM = selectedMonth + 1;
      setSelectedYearMonth(selectedYear, nextM);
      if (selectedYear === todayYear && nextM === todayMonth) {
        setSelectedDay(todayDay);
      } else {
        setSelectedDay(1);
      }
    }
  };

  const isSelectedDatePast = isPastDate(selectedDate);
  const isStepValid =
    !loadingAvailability &&
    !isSelectedDatePast &&
    availableTimes.length > 0 &&
    Boolean(selectedTime) &&
    availableTimes.includes(selectedTime);

  return (
    <MobileContainer>
      <PageHeader
        title="Escolha a data"
        leftType="back"
        backHref="/servicos"
        rightType="date-eye"
      />

      <div className="px-4 min-[375px]:px-5 pt-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex-1 flex flex-col justify-between relative">
        <div>
          {/* Calendar Section directly on warm nude-cream surface */}
          <div className="pb-4 border-b border-[#E5D6CC]">
            {/* Month Header with 44x44px touch buttons */}
            <div className="flex items-center justify-between mb-2.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={isAtCurrentOrPastMonth}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition ${
                  isAtCurrentOrPastMonth
                    ? "text-[#C5B4AC] cursor-not-allowed opacity-50"
                    : "text-[#4A3731] hover:bg-[#EADCD3] active:scale-95"
                }`}
                aria-label="Mês anterior"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-[15.5px] font-bold text-[#2D1C18]">
                {MONTH_LABELS[selectedMonth - 1]} de {selectedYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[#4A3731] hover:bg-[#EADCD3] active:scale-95 transition"
                aria-label="Próximo mês"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Weekday Initials */}
            <div className="grid grid-cols-7 text-center mb-1.5">
              {WEEKDAYS.map((wd, idx) => (
                <span
                  key={idx}
                  className="text-[12px] font-semibold text-[#7A655D]"
                >
                  {wd}
                </span>
              ))}
            </div>

            {/* Days Grid aligned with real day of the week (comfortable touch targets) */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {leadingEmptyDays.map((emptyIdx) => (
                <div
                  key={`empty-${emptyIdx}`}
                  className="w-10 h-10 min-[375px]:w-11 min-[375px]:h-11 mx-auto"
                />
              ))}
              {daysArray.map((day) => {
                const cellIso = `${selectedYear}-${String(
                  selectedMonth
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isPast = isPastDate(cellIso);
                const isSelected = selectedDay === day && !isPast;
                const weekdayOfCell = (firstDayWeekday + day - 1) % 7;
                const isSunday = weekdayOfCell === 0;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      if (!isPast) setSelectedDay(day);
                    }}
                    className={`w-10 h-10 min-[375px]:w-11 min-[375px]:h-11 mx-auto rounded-full text-[13.5px] flex items-center justify-center transition-colors touch-manipulation ${
                      isPast
                        ? "text-[#C5B4AC] line-through cursor-not-allowed opacity-55"
                        : isSelected
                        ? "bg-[#B87472] text-white font-bold shadow-xs"
                        : isSunday
                        ? "text-[#A8968E] font-normal hover:bg-[#EADCD3]/50"
                        : "text-[#2D1C18] font-medium hover:bg-[#EADCD3]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Times Section */}
          <div className="mt-4">
            <h2 className="text-[15px] font-bold text-[#2D1C18] mb-3">
              Horários disponíveis
            </h2>

            {loadingAvailability ? (
              <p className="text-[13px] text-[#7A655D] py-4 text-center">
                Consultando disponibilidade...
              </p>
            ) : availableTimes.length === 0 ? (
              <div className="bg-[#FAF5F1] border border-[#E6D8CF] rounded-[14px] p-4 text-center text-[13px] text-[#6E5B53]">
                {availabilityReason ||
                  "Nenhum horário disponível para esta data. Selecione outro dia."}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 min-[375px]:gap-2.5">
                {availableTimes.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`min-h-[46px] py-2.5 rounded-[12px] text-[13.5px] transition-all border touch-manipulation ${
                        isSelected
                          ? "bg-[#B87472] text-white border-[#B87472] font-semibold shadow-xs"
                          : "bg-[#FAF5F1] text-[#2D1C18] border-[#E4D5CB] font-medium hover:bg-[#F0E4DC]"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA & Decorative Botanical */}
        <div className="mt-6 relative pt-1">
          {!loadingAvailability && !isStepValid && (
            <p className="mb-2.5 text-[11.5px] font-medium text-[#B84A48] flex items-center justify-center gap-1 text-center">
              <AlertCircle size={13} className="shrink-0" />
              <span>
                {isSelectedDatePast
                  ? "Selecione uma data válida a partir de hoje."
                  : "Selecione um dia e horário disponível para avançar."}
              </span>
            </p>
          )}
          <BotanicalSprigBottomLeft className="w-[125px] h-[80px] absolute -left-5 -bottom-8 opacity-85 pointer-events-none" />
          <div className="relative z-10">
            <PrimaryButton
              variant="rose"
              showArrow
              disabled={!isStepValid}
              onClick={() => {
                if (isStepValid) {
                  router.push("/agendar/dados");
                }
              }}
            >
              Continuar
            </PrimaryButton>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}
