import { prisma } from "./prisma";
import { parse, addMinutes, isBefore, format } from "date-fns";

/**
 * Função utilitária para verificar se um horário com duração X está disponível 
 * na data especificada, dadas as regras de negócio.
 */
export async function isTimeAvailable(dateStr: string, startTime: string, durationMins: number) {
  const dateObj = new Date(dateStr + "T00:00:00");
  const weekday = dateObj.getDay();

  // 1. Expediente ativo
  const workingHours = await prisma.workingHours.findUnique({ where: { weekday } });
  if (!workingHours || !workingHours.active) return false;

  const startObj = parse(startTime, "HH:mm", dateObj);
  const endObj = addMinutes(startObj, durationMins);

  const whStart = parse(workingHours.startTime, "HH:mm", dateObj);
  const whEnd = parse(workingHours.endTime, "HH:mm", dateObj);

  // Fora do expediente?
  if (startObj < whStart || endObj > whEnd) return false;

  // 2. Bloqueio de data
  const blocked = await prisma.blockedDate.findUnique({ where: { date: dateStr } });
  if (blocked) return false;

  // 3. Intervalo (Almoço)
  if (workingHours.breakStart && workingHours.breakEnd) {
    const breakStart = parse(workingHours.breakStart, "HH:mm", dateObj);
    const breakEnd = parse(workingHours.breakEnd, "HH:mm", dateObj);

    if (
      (startObj >= breakStart && startObj < breakEnd) || 
      (endObj > breakStart && endObj <= breakEnd) ||
      (startObj <= breakStart && endObj >= breakEnd)
    ) {
      return false; // Sobrepõe o almoço
    }
  }

  // 4. Conflito com agendamentos (PENDING ou CONFIRMED)
  const appointments = await prisma.appointment.findMany({
    where: {
      date: dateStr,
      status: { in: ["PENDING", "CONFIRMED"] }
    }
  });

  for (const appt of appointments) {
    const aStart = parse(appt.startTime, "HH:mm", dateObj);
    const aEnd = parse(appt.endTime, "HH:mm", dateObj);
    
    // Sobreposição estrita (não toca nas bordas)
    if (
      (startObj >= aStart && startObj < aEnd) || 
      (endObj > aStart && endObj <= aEnd) ||
      (startObj <= aStart && endObj >= aEnd)
    ) {
      return false; // Sobrepõe um agendamento existente
    }
  }

  return true;
}
