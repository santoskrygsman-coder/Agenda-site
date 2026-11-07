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

export const WEEKDAY_NAMES_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export interface WorkingHourPeriod {
  startTime: string;
  endTime: string;
}

export interface WorkingHourInputItem {
  id?: string;
  weekday: number;
  startTime?: string;
  endTime?: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  active?: boolean;
  periods?: WorkingHourPeriod[];
}

export interface NormalizedWorkingHourItem {
  weekday: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
  periods: WorkingHourPeriod[];
}

export function isValidTimeFormat(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.trim().split(":").map(Number);
  return h * 60 + m;
}

export function derivePeriodsFromWorkingHour(item: {
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}): WorkingHourPeriod[] {
  if (
    item.breakStart &&
    item.breakEnd &&
    isValidTimeFormat(item.breakStart) &&
    isValidTimeFormat(item.breakEnd) &&
    isValidTimeFormat(item.startTime) &&
    isValidTimeFormat(item.endTime) &&
    parseTimeToMinutes(item.startTime) < parseTimeToMinutes(item.breakStart) &&
    parseTimeToMinutes(item.breakStart) < parseTimeToMinutes(item.breakEnd) &&
    parseTimeToMinutes(item.breakEnd) < parseTimeToMinutes(item.endTime)
  ) {
    return [
      { startTime: item.startTime, endTime: item.breakStart },
      { startTime: item.breakEnd, endTime: item.endTime },
    ];
  }
  return [{ startTime: item.startTime, endTime: item.endTime }];
}

export function normalizeAndValidateWorkingHourItem(
  raw: WorkingHourInputItem
): {
  valid: boolean;
  error?: string;
  data?: NormalizedWorkingHourItem;
} {
  const weekday = Number(raw?.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return {
      valid: false,
      error: "Dia da semana inválido (deve ser entre 0 - Domingo e 6 - Sábado).",
    };
  }

  const dayLabel = WEEKDAY_NAMES_PT[weekday];
  const active = Boolean(raw?.active);

  let startTime = typeof raw?.startTime === "string" ? raw.startTime.trim() : "";
  let endTime = typeof raw?.endTime === "string" ? raw.endTime.trim() : "";
  let breakStart =
    typeof raw?.breakStart === "string" && raw.breakStart.trim() !== ""
      ? raw.breakStart.trim()
      : null;
  let breakEnd =
    typeof raw?.breakEnd === "string" && raw.breakEnd.trim() !== ""
      ? raw.breakEnd.trim()
      : null;

  // Se foi enviado o array `periods` (1 ou 2 períodos no mesmo dia), converte e valida
  if (Array.isArray(raw?.periods) && raw.periods.length > 0) {
    if (raw.periods.length > 2) {
      return {
        valid: false,
        error: `${dayLabel}: são permitidos no máximo 2 períodos de atendimento no mesmo dia.`,
      };
    }

    const p1 = raw.periods[0];
    const p1Start = typeof p1?.startTime === "string" ? p1.startTime.trim() : "";
    const p1End = typeof p1?.endTime === "string" ? p1.endTime.trim() : "";

    if (!isValidTimeFormat(p1Start) || !isValidTimeFormat(p1End)) {
      return {
        valid: false,
        error: `${dayLabel}: informe horários válidos (HH:MM) no 1º período.`,
      };
    }
    if (parseTimeToMinutes(p1End) <= parseTimeToMinutes(p1Start)) {
      return {
        valid: false,
        error: `${dayLabel}: no 1º período, o horário de término (${p1End}) deve ser posterior ao início (${p1Start}).`,
      };
    }

    if (raw.periods.length === 2) {
      const p2 = raw.periods[1];
      const p2Start = typeof p2?.startTime === "string" ? p2.startTime.trim() : "";
      const p2End = typeof p2?.endTime === "string" ? p2.endTime.trim() : "";

      if (!isValidTimeFormat(p2Start) || !isValidTimeFormat(p2End)) {
        return {
          valid: false,
          error: `${dayLabel}: informe horários válidos (HH:MM) no 2º período.`,
        };
      }
      if (parseTimeToMinutes(p2End) <= parseTimeToMinutes(p2Start)) {
        return {
          valid: false,
          error: `${dayLabel}: no 2º período, o horário de término (${p2End}) deve ser posterior ao início (${p2Start}).`,
        };
      }
      if (parseTimeToMinutes(p2Start) < parseTimeToMinutes(p1End)) {
        return {
          valid: false,
          error: `${dayLabel}: o 2º período (${p2Start}) não pode começar antes do término do 1º período (${p1End}).`,
        };
      }

      startTime = p1Start;
      endTime = p2End;
      if (parseTimeToMinutes(p2Start) === parseTimeToMinutes(p1End)) {
        breakStart = null;
        breakEnd = null;
      } else {
        breakStart = p1End;
        breakEnd = p2Start;
      }
    } else {
      startTime = p1Start;
      endTime = p1End;
    }
  }

  // Quando o dia está marcado como folga (sem atendimento), preserva os horários se válidos
  if (!active) {
    const safeStart = isValidTimeFormat(startTime) ? startTime : "09:00";
    const safeEnd =
      isValidTimeFormat(endTime) &&
      parseTimeToMinutes(endTime) > parseTimeToMinutes(safeStart)
        ? endTime
        : "18:00";
    const hasValidBreak =
      breakStart &&
      breakEnd &&
      isValidTimeFormat(breakStart) &&
      isValidTimeFormat(breakEnd) &&
      parseTimeToMinutes(breakStart) > parseTimeToMinutes(safeStart) &&
      parseTimeToMinutes(breakEnd) > parseTimeToMinutes(breakStart) &&
      parseTimeToMinutes(breakEnd) < parseTimeToMinutes(safeEnd);

    const normalizedInactive: NormalizedWorkingHourItem = {
      weekday,
      startTime: safeStart,
      endTime: safeEnd,
      breakStart: hasValidBreak ? breakStart : null,
      breakEnd: hasValidBreak ? breakEnd : null,
      active: false,
      periods: derivePeriodsFromWorkingHour({
        startTime: safeStart,
        endTime: safeEnd,
        breakStart: hasValidBreak ? breakStart : null,
        breakEnd: hasValidBreak ? breakEnd : null,
      }),
    };

    return { valid: true, data: normalizedInactive };
  }

  // Validação obrigatória quando o dia está ativo
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return {
      valid: false,
      error: `${dayLabel}: preencha horários de início e término válidos no formato HH:MM.`,
    };
  }

  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);

  if (endMins <= startMins) {
    return {
      valid: false,
      error: `${dayLabel}: o horário de término (${endTime}) deve ser posterior ao horário de início (${startTime}).`,
    };
  }

  if ((breakStart && !breakEnd) || (!breakStart && breakEnd)) {
    return {
      valid: false,
      error: `${dayLabel}: preencha tanto o início quanto o término do intervalo (ou 2º período), ou deixe ambos em branco.`,
    };
  }

  if (breakStart && breakEnd) {
    if (!isValidTimeFormat(breakStart) || !isValidTimeFormat(breakEnd)) {
      return {
        valid: false,
        error: `${dayLabel}: informe horários de intervalo válidos no formato HH:MM.`,
      };
    }

    const bStartMins = parseTimeToMinutes(breakStart);
    const bEndMins = parseTimeToMinutes(breakEnd);

    if (bEndMins <= bStartMins) {
      return {
        valid: false,
        error: `${dayLabel}: o fim do intervalo (${breakEnd}) deve ser posterior ao início do intervalo (${breakStart}).`,
      };
    }

    if (bStartMins <= startMins || bEndMins >= endMins) {
      return {
        valid: false,
        error: `${dayLabel}: o intervalo (${breakStart} às ${breakEnd}) deve estar dentro do horário de expediente (${startTime} às ${endTime}).`,
      };
    }
  }

  const normalized: NormalizedWorkingHourItem = {
    weekday,
    startTime,
    endTime,
    breakStart,
    breakEnd,
    active: true,
    periods: derivePeriodsFromWorkingHour({
      startTime,
      endTime,
      breakStart,
      breakEnd,
    }),
  };

  return { valid: true, data: normalized };
}
