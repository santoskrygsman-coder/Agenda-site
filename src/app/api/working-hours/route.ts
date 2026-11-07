import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const wh = await prisma.workingHours.findMany({
      orderBy: { weekday: "asc" },
    });
    return NextResponse.json(wh);
  } catch (error) {
    console.error("Error fetching working hours:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários de funcionamento" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    const results = [];
    for (const item of items) {
      const weekday = Number(item.weekday);
      if (isNaN(weekday) || weekday < 0 || weekday > 6) continue;

      const updated = await prisma.workingHours.upsert({
        where: { weekday },
        update: {
          startTime: item.startTime || "09:00",
          endTime: item.endTime || "18:00",
          breakStart: item.breakStart || null,
          breakEnd: item.breakEnd || null,
          active: Boolean(item.active),
        },
        create: {
          weekday,
          startTime: item.startTime || "09:00",
          endTime: item.endTime || "18:00",
          breakStart: item.breakStart || null,
          breakEnd: item.breakEnd || null,
          active: Boolean(item.active),
        },
      });
      results.push(updated);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error updating working hours:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar horários de funcionamento" },
      { status: 500 }
    );
  }
}
