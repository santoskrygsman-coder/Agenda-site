import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";
import { getTodayLocalIso, isPastDate } from "./validation";
import {
  getCachedBlockedDates,
  getCachedSettings,
  getCachedWorkingHours,
} from "./cache";

// Fila de serialização em memória para complementar transações do banco e impedir condições de corrida (race conditions)
let bookingLockPromise: Promise<unknown> = Promise.resolve();

export function withBookingLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = bookingLockPromise.then(fn, fn);
  bookingLockPromise = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * Em produção no PostgreSQL (Supabase + Netlify Functions), adquire um bloqueio
 * consultivo transacional (pg_advisory_xact_lock) por profissional e data.
 * Isso serializa reservas concorrentes para o mesmo dia mesmo entre múltiplas
 * instâncias serverless, impedindo duplicidade de horários.
 */
export async function acquirePostgresBookingLock(
  tx: Prisma.TransactionClient,
  dateStr: string,
  professionalKey = "default-professional"
): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    const lockKey = `booking:${professionalKey}:${dateStr}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
  }
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

let lastExpireCheckMs = 0;

/**
 * Libera automaticamente horários em que o prazo de reserva (expiresAt) venceu
 * sem envio de comprovante e sem confirmação de pagamento.
 */
export async function expireOverduePendingAppointments(
  db: Prisma.TransactionClient | typeof prisma = prisma,
  force = false
): Promise<number> {
  const nowMs = Date.now();
  if (!force && nowMs - lastExpireCheckMs < 15000) {
    return 0;
  }
  lastExpireCheckMs = nowMs;
  const now = new Date(nowMs);
  const result = await db.appointment.updateMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING_SIGNAL",
      receiptReportedAt: null,
      expiresAt: {
        not: null,
        lt: now,
      },
    },
    data: {
      status: "CANCELLED",
    },
  });
  return result.count;
}

export async function getAvailableSlotsForDate(
  dateStr: string,
  durationMins: number,
  excludeAppointmentId?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{
  available: boolean;
  reason?: string;
  times: string[];
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || durationMins <= 0) {
    return { available: false, reason: "Parâmetros inválidos", times: [] };
  }

  if (isPastDate(dateStr)) {
    return {
      available: false,
      reason: "Não é permitido agendar em datas passadas.",
      times: [],
    };
  }

  await expireOverduePendingAppointments(db);

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekday = dateObj.getDay();

  // Buscar expediente, bloqueios e configurações do cache em memória do servidor
  const [allWorkingHours, allBlockedDates, settings] = await Promise.all([
    getCachedWorkingHours(),
    getCachedBlockedDates(),
    getCachedSettings(),
  ]);

  const workingHours = allWorkingHours.find((w) => w.weekday === weekday);
  const blockedRecords = allBlockedDates.filter((b) => b.date === dateStr);

  if (!workingHours || !workingHours.active) {
    return { available: false, reason: "Dia de folga", times: [] };
  }

  const fullDayBlock = blockedRecords.find(
    (b) => !b.startTime || !b.endTime
  );
  if (fullDayBlock) {
    return {
      available: false,
      reason: fullDayBlock.reason || "Data bloqueada",
      times: [],
    };
  }

  const statusesToBlock = ["CONFIRMED", "COMPLETED"];
  if (!settings || settings.pendingBlocksSlot) {
    statusesToBlock.push("PENDING");
  }

  const existingAppointments = await db.appointment.findMany({
    where: {
      date: dateStr,
      status: { in: statusesToBlock },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const whStart = timeToMinutes(workingHours.startTime);
  const whEnd = timeToMinutes(workingHours.endTime);

  const hasBreak = Boolean(workingHours.breakStart && workingHours.breakEnd);
  const breakStart = hasBreak ? timeToMinutes(workingHours.breakStart!) : -1;
  const breakEnd = hasBreak ? timeToMinutes(workingHours.breakEnd!) : -1;

  const partialBlocks = blockedRecords
    .filter((b) => b.startTime && b.endTime)
    .map((b) => ({
      start: timeToMinutes(b.startTime!),
      end: timeToMinutes(b.endTime!),
    }));

  const bookedIntervals = existingAppointments.map((a) => ({
    start: timeToMinutes(a.startTime),
    end: timeToMinutes(a.endTime),
  }));

  const slots: string[] = [];
  let cursor = whStart;
  const isToday = dateStr === getTodayLocalIso();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  while (cursor + durationMins <= whEnd) {
    const slotStart = cursor;
    const slotEnd = cursor + durationMins;

    // Impedir horários que já passaram no dia de hoje
    const isPastSlotToday = isToday && slotStart <= currentMinutes;

    // Verificar intervalo de almoço / pausa
    const overlapsBreak =
      hasBreak && intervalsOverlap(slotStart, slotEnd, breakStart, breakEnd);

    // Verificar bloqueios parciais
    const overlapsPartialBlock = partialBlocks.some((b) =>
      intervalsOverlap(slotStart, slotEnd, b.start, b.end)
    );

    // Verificar conflito com outros agendamentos
    const overlapsAppointment = bookedIntervals.some((appt) =>
      intervalsOverlap(slotStart, slotEnd, appt.start, appt.end)
    );

    if (
      !isPastSlotToday &&
      !overlapsBreak &&
      !overlapsPartialBlock &&
      !overlapsAppointment
    ) {
      slots.push(minutesToTime(slotStart));
    }

    cursor += 30;
  }

  return { available: slots.length > 0, times: slots };
}

export async function isTimeAvailable(
  dateStr: string,
  startTime: string,
  durationMins: number,
  excludeAppointmentId?: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
  options?: {
    allowPastToday?: boolean;
    allowPastDates?: boolean;
    ignoreWorkingHours?: boolean;
  }
): Promise<boolean> {
  if (!/^\d{2}:\d{2}$/.test(startTime)) return false;
  if (!options?.allowPastDates && isPastDate(dateStr)) return false;

  await expireOverduePendingAppointments(db);

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekday = dateObj.getDay();

  const [allWorkingHours, allBlockedDates, settings] = await Promise.all([
    getCachedWorkingHours(),
    getCachedBlockedDates(),
    getCachedSettings(),
  ]);

  const workingHours = allWorkingHours.find((w) => w.weekday === weekday);
  const blockedRecords = allBlockedDates.filter((b) => b.date === dateStr);

  const slotStart = timeToMinutes(startTime);
  const slotEnd = slotStart + durationMins;

  if (!options?.ignoreWorkingHours) {
    if (!workingHours || !workingHours.active) return false;

    const whStart = timeToMinutes(workingHours.startTime);
    const whEnd = timeToMinutes(workingHours.endTime);

    if (slotStart < whStart || slotEnd > whEnd) return false;

    if (!options?.allowPastToday && dateStr === getTodayLocalIso()) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotStart <= currentMinutes) return false;
    }

    if (workingHours.breakStart && workingHours.breakEnd) {
      const bStart = timeToMinutes(workingHours.breakStart);
      const bEnd = timeToMinutes(workingHours.breakEnd);
      if (intervalsOverlap(slotStart, slotEnd, bStart, bEnd)) return false;
    }

    for (const b of blockedRecords) {
      if (!b.startTime || !b.endTime) return false;
      const bs = timeToMinutes(b.startTime);
      const be = timeToMinutes(b.endTime);
      if (intervalsOverlap(slotStart, slotEnd, bs, be)) return false;
    }
  }

  const statusesToBlock = ["CONFIRMED", "COMPLETED"];
  if (!settings || settings.pendingBlocksSlot) {
    statusesToBlock.push("PENDING");
  }

  const existingAppointments = await db.appointment.findMany({
    where: {
      date: dateStr,
      status: { in: statusesToBlock },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  for (const appt of existingAppointments) {
    const aStart = timeToMinutes(appt.startTime);
    const aEnd = timeToMinutes(appt.endTime);
    if (intervalsOverlap(slotStart, slotEnd, aStart, aEnd)) {
      return false;
    }
  }

  return true;
}
