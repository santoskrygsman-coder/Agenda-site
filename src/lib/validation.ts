/**
 * Validações compartilhadas entre Frontend e Backend para garantir
 * integridade dos formulários, formatos e regras de agendamento.
 */

export function getTodayLocalIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDefaultBookingDate(now = new Date()): {
  year: number;
  month: number;
  day: number;
  iso: string;
} {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Se já passou das 17:30 hoje, avança para o dia seguinte
  if (now.getHours() > 17 || (now.getHours() === 17 && now.getMinutes() >= 30)) {
    candidate.setDate(candidate.getDate() + 1);
  }
  // Se cair no domingo (0), avança para segunda-feira
  if (candidate.getDay() === 0) {
    candidate.setDate(candidate.getDate() + 1);
  }
  const year = candidate.getFullYear();
  const month = candidate.getMonth() + 1;
  const day = candidate.getDate();
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
  return { year, month, day, iso };
}

export function isPastDate(dateStr: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return true;
  const todayIso = getTodayLocalIso(now);
  return dateStr < todayIso;
}

export function maskBrazilianPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function validateFullName(name: string): string | null {
  const trimmed = (name || "").trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "Informe seu nome completo.";
  }
  if (trimmed.length < 5) {
    return "O nome completo deve ter pelo menos 5 caracteres.";
  }
  const parts = trimmed.split(" ");
  if (parts.length < 2 || parts.some((p) => p.length < 2)) {
    return "Informe nome e sobrenome (ex: Mariana Lima).";
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(trimmed)) {
    return "O nome deve conter apenas letras.";
  }
  return null;
}

export function validateWhatsAppPhone(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  const local =
    digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;

  if (!local) {
    return "Informe seu número de WhatsApp com DDD.";
  }
  if (local.length !== 10 && local.length !== 11) {
    return "Informe um número válido com DDD de 2 dígitos + 8 ou 9 dígitos.";
  }
  const ddd = Number(local.slice(0, 2));
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return "Informe um DDD brasileiro válido (11 a 99).";
  }
  if (/^(\d)\1+$/.test(local)) {
    return "Número de telefone inválido.";
  }
  return null;
}

export function validateOptionalEmail(email: string): string | null {
  const trimmed = (email || "").trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Informe um e-mail válido (ex: voce@email.com).";
  }
  return null;
}

export interface BookingValidationInput {
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string;
  acceptedPolicies: boolean;
  requirePolicies?: boolean;
}

export function validateBookingPayload(input: BookingValidationInput): {
  valid: boolean;
  fieldErrors: Record<string, string>;
  firstError?: string;
} {
  const fieldErrors: Record<string, string> = {};

  if (!input.serviceId || !input.serviceId.trim()) {
    fieldErrors.serviceId = "Selecione um procedimento válido.";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || "")) {
    fieldErrors.date = "Selecione uma data válida.";
  } else if (isPastDate(input.date)) {
    fieldErrors.date = "Não é permitido realizar agendamentos em datas passadas.";
  }

  if (!/^\d{2}:\d{2}$/.test(input.time || "")) {
    fieldErrors.time = "Selecione um horário disponível.";
  }

  const nameErr = validateFullName(input.name);
  if (nameErr) fieldErrors.name = nameErr;

  const phoneErr = validateWhatsAppPhone(input.phone);
  if (phoneErr) fieldErrors.phone = phoneErr;

  const emailErr = validateOptionalEmail(input.email || "");
  if (emailErr) fieldErrors.email = emailErr;

  if (input.requirePolicies !== false && input.acceptedPolicies !== true) {
    fieldErrors.acceptedPolicies =
      "Você precisa aceitar as políticas de agendamento para continuar.";
  }

  const keys = Object.keys(fieldErrors);
  return {
    valid: keys.length === 0,
    fieldErrors,
    firstError: keys.length > 0 ? fieldErrors[keys[0]] : undefined,
  };
}
