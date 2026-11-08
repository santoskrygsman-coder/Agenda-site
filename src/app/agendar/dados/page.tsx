"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, AlertCircle, Check } from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import FormField from "@/components/ui/FormField";
import { WhatsAppCircleIcon } from "@/components/ui/BotanicalDecor";
import { useBooking } from "@/context/BookingContext";
import {
  isPastDate,
  maskBrazilianPhone,
  validateFullName,
  validateOptionalEmail,
  validateWhatsAppPhone,
} from "@/lib/validation";

export default function ClientDataFormPage() {
  const router = useRouter();
  const {
    selectedService,
    selectedDate,
    selectedTime,
    clientData,
    setClientData,
    createBooking,
    studioSettings,
  } = useBooking();

  const [touched, setTouched] = useState<{
    name: boolean;
    phone: boolean;
    email: boolean;
    policies: boolean;
  }>({
    name: false,
    phone: false,
    email: false,
    policies: false,
  });

  const [serverError, setServerError] = useState("");
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const nameError =
    serverFieldErrors.name || validateFullName(clientData.name);
  const phoneError =
    serverFieldErrors.phone || validateWhatsAppPhone(clientData.phone);
  const emailError =
    serverFieldErrors.email || validateOptionalEmail(clientData.email);
  const policiesError =
    serverFieldErrors.acceptedPolicies ||
    (clientData.acceptedPolicies
      ? null
      : "Confirme o aceite das políticas de agendamento para continuar.");

  const hasValidSchedule =
    Boolean(selectedService?.id) &&
    /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) &&
    !isPastDate(selectedDate) &&
    /^\d{2}:\d{2}$/.test(selectedTime);

  const isFormValid =
    !nameError &&
    !phoneError &&
    !emailError &&
    clientData.acceptedPolicies &&
    hasValidSchedule;

  const handleReviewAndCreate = async () => {
    setTouched({
      name: true,
      phone: true,
      email: true,
      policies: true,
    });
    setServerError("");
    setServerFieldErrors({});

    if (!isFormValid) {
      return;
    }

    setSubmitting(true);
    const result = await createBooking();
    setSubmitting(false);

    if (!result.ok) {
      if (result.fieldErrors) {
        setServerFieldErrors(result.fieldErrors);
      }
      setServerError(
        result.error || "Não foi possível reservar este horário."
      );
      return;
    }

    router.push("/agendar/resumo");
  };

  const signalPct =
    selectedService?.depositPercentage ?? studioSettings.signalPercentage ?? 50;

  return (
    <MobileContainer>
      <PageHeader
        title="Seus dados"
        leftType="back"
        backHref="/agendar/data"
        rightType="botanical"
      />

      <div className="px-4 min-[375px]:px-5 pt-2 flex-1 flex flex-col justify-between">
        <div className="pb-4">
          <p className="text-[13.5px] leading-[1.45] text-[#3D2A24] mb-3.5">
            Preencha seus dados obrigatórios para finalizar o agendamento.
          </p>

          {serverError && (
            <div className="mb-3 bg-[#F3D8D8] border border-[#E2B8B8] text-[#9E3836] rounded-[12px] px-3 py-2 text-[12.5px] flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-3">
            <FormField
              icon={<User size={18} strokeWidth={1.8} />}
              placeholder="Seu nome completo (nome e sobrenome) *"
              autoComplete="name"
              enterKeyHint="next"
              value={clientData.name}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              error={touched.name ? nameError : null}
              onChange={(val) => {
                setServerFieldErrors((prev) => ({ ...prev, name: "" }));
                setTouched((prev) => ({ ...prev, name: true }));
                setClientData((prev) => ({ ...prev, name: val }));
              }}
            />

            <FormField
              icon={<Phone size={18} strokeWidth={1.8} />}
              rightIcon={<WhatsAppCircleIcon size={20} variant="dark" />}
              placeholder="WhatsApp com DDD: (73) 99999-9999 *"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              value={clientData.phone}
              onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              error={touched.phone ? phoneError : null}
              onChange={(val) => {
                setServerFieldErrors((prev) => ({ ...prev, phone: "" }));
                setTouched((prev) => ({ ...prev, phone: true }));
                setClientData((prev) => ({
                  ...prev,
                  phone: maskBrazilianPhone(val),
                }));
              }}
            />

            <FormField
              icon={<Mail size={18} strokeWidth={1.8} />}
              placeholder="E-mail (opcional)"
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="next"
              value={clientData.email}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              error={touched.email ? emailError : null}
              onChange={(val) => {
                setServerFieldErrors((prev) => ({ ...prev, email: "" }));
                setTouched((prev) => ({ ...prev, email: true }));
                setClientData((prev) => ({ ...prev, email: val }));
              }}
            />

            <FormField
              icon={<User size={18} strokeWidth={1.8} />}
              placeholder="Alguma observação? (opcional)"
              subPlaceholder="Ex: primeira vez, alergia, etc."
              multiline
              value={clientData.notes}
              onChange={(val) =>
                setClientData((prev) => ({ ...prev, notes: val }))
              }
            />

            {/* Aceite obrigatório das políticas de agendamento (área de toque ampla) */}
            <div>
              <label
                className={`flex items-start gap-3 p-3.5 rounded-[14px] border cursor-pointer transition-colors touch-manipulation ${
                  touched.policies && !clientData.acceptedPolicies
                    ? "bg-[#FDF4F4] border-[#C95B59]"
                    : "bg-[#FAF5F0] border-[#E6D8CF]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={clientData.acceptedPolicies}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTouched((prev) => ({ ...prev, policies: true }));
                    setServerFieldErrors((prev) => ({
                      ...prev,
                      acceptedPolicies: "",
                    }));
                    setClientData((prev) => ({
                      ...prev,
                      acceptedPolicies: checked,
                    }));
                  }}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 w-6 h-6 rounded-[7px] border flex items-center justify-center shrink-0 transition-colors ${
                    clientData.acceptedPolicies
                      ? "bg-[#B87472] border-[#B87472] text-white"
                      : touched.policies && !clientData.acceptedPolicies
                      ? "bg-white border-[#C95B59]"
                      : "bg-white border-[#C5B1A7]"
                  }`}
                >
                  {clientData.acceptedPolicies && (
                    <Check size={14} strokeWidth={3} />
                  )}
                </span>
                <span className="text-[12.5px] leading-[1.4] text-[#3D2A24]">
                  Li e aceito as{" "}
                  <strong className="text-[#2D1C18]">
                    políticas de agendamento
                  </strong>
                  {selectedService?.requiresDeposit === false
                    ? ": compromisso de comparecer no horário reservado ou avisar com antecedência em caso de imprevisto (pagamento realizado no atendimento). *"
                    : `: confirmação do horário mediante pagamento do sinal (${signalPct}%) via Pix e envio manual do comprovante pelo WhatsApp. *`}
                </span>
              </label>

              {touched.policies && policiesError && (
                <p className="mt-1 px-1 text-[11.5px] font-medium text-[#B84A48] flex items-center gap-1">
                  <AlertCircle size={12.5} className="shrink-0" />
                  <span>{policiesError}</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <PrimaryButton
              variant="rose"
              showArrow
              disabled={!isFormValid || submitting}
              onClick={handleReviewAndCreate}
            >
              {submitting ? "Reservando horário..." : "Revisar agendamento"}
            </PrimaryButton>
          </div>
        </div>

        {/* Bottom Eye & Botanical Footer Blend */}
        <div className="relative -mx-4 min-[375px]:-mx-5 mt-1 h-[110px] overflow-hidden shrink-0 pointer-events-none">
          <img
            src="/images/footer-dados-eye.png"
            alt="Detalhe cílios e folhas botânicas"
            className="w-full h-full object-cover object-bottom"
          />
          <div
            className="absolute inset-x-0 top-0 h-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, #F4EAE3 0%, rgba(244,234,227,0) 100%)",
            }}
          />
        </div>
      </div>
    </MobileContainer>
  );
}
