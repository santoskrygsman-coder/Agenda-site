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

  // Get existing appointments (Pending or Confirmed)
  const appointments = await prisma.appointment.findMany({
    where: {
      date: dateStr,
      status: { in: ["PENDING", "CONFIRMED"] }
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
    
    // Check if slot is in the past
    if (isBefore(current, now)) {
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

    current = addMinutes(current, 60); // Incremento de 60 mins para não ficar tão denso (ou poderia ser 30)
  }

  return NextResponse.json({ times: slots });
}
