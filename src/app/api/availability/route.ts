import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse, addMinutes, isBefore, format, startOfDay } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const durationStr = searchParams.get("duration");

  if (!dateStr || !durationStr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const duration = parseInt(durationStr);
  const dateObj = new Date(dateStr + "T00:00:00");
  const weekday = dateObj.getDay(); // 0 is Sunday

  // Get Working Hours
  const workingHours = await prisma.workingHours.findUnique({
    where: { weekday },
  });

  if (!workingHours || !workingHours.active) {
    return NextResponse.json({ times: [] });
  }

  // Get Blocked Dates
  const blocked = await prisma.blockedDate.findUnique({
    where: { date: dateStr }
  });
  if (blocked) {
    return NextResponse.json({ times: [] });
  }

  // Carregar configurações do sistema
  const settings = await prisma.settings.findFirst();

  const statusesToCheck = ["CONFIRMED"];
  if (!settings || settings.pendingBlocksSlot) {
    statusesToCheck.push("PENDING");
  }

  // Get existing appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      date: dateStr,
      status: { in: statusesToCheck }
    }
  });

  const slots = [];
  let current = parse(workingHours.startTime, "HH:mm", dateObj);
  const end = parse(workingHours.endTime, "HH:mm", dateObj);
  
  let breakStart = null;
  let breakEnd = null;
  if (workingHours.breakStart && workingHours.breakEnd) {
    breakStart = parse(workingHours.breakStart, "HH:mm", dateObj);
    breakEnd = parse(workingHours.breakEnd, "HH:mm", dateObj);
  }

  const now = new Date();

  while (addMinutes(current, duration) <= end) {
    const slotEnd = addMinutes(current, duration);
    
    // Regra de antecedência mínima
    const diffMinutes = (current.getTime() - now.getTime()) / (1000 * 60);
    if (diffMinutes < (settings?.minAdvanceMinutes || 0)) {
      current = addMinutes(current, 30);
      continue;
    }

    // Check lunch break
    let overlapsBreak = false;
    if (breakStart && breakEnd) {
      if ((current >= breakStart && current < breakEnd) || 
          (slotEnd > breakStart && slotEnd <= breakEnd) ||
          (current <= breakStart && slotEnd >= breakEnd)) {
        overlapsBreak = true;
      }
    }

    // Check appointments
    let overlapsAppt = false;
    for (const appt of appointments) {
      const aStart = parse(appt.startTime, "HH:mm", dateObj);
      const aEnd = parse(appt.endTime, "HH:mm", dateObj);
      if ((current >= aStart && current < aEnd) || 
          (slotEnd > aStart && slotEnd <= aEnd) ||
          (current <= aStart && slotEnd >= aEnd)) {
        overlapsAppt = true;
        break;
      }
    }

    if (!overlapsBreak && !overlapsAppt) {
      slots.push(format(current, "HH:mm"));
    }

    // O incremento pode ser 30 min para gerar mais opções de horários se os serviços tiverem durações variadas.
    current = addMinutes(current, 30);
  }

  return NextResponse.json({ times: slots });
}
