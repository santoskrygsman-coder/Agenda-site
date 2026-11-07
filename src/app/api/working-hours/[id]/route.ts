import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import {
  derivePeriodsFromWorkingHour,
  normalizeAndValidateWorkingHourItem,
} from "@/lib/validation";
import { invalidateWorkingHoursCache } from "@/lib/cache";

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const params = await props.params;
    const body = await request.json();

    const existing = await prisma.workingHours.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Horário de funcionamento não encontrado." },
        { status: 404 }
      );
    }

    const validation = normalizeAndValidateWorkingHourItem({
      ...body,
      weekday: existing.weekday,
    });
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || "Horário inválido." },
        { status: 400 }
      );
    }

    const wh = await prisma.workingHours.update({
      where: { id: params.id },
      data: {
        startTime: validation.data.startTime,
        endTime: validation.data.endTime,
        breakStart: validation.data.breakStart,
        breakEnd: validation.data.breakEnd,
        active: validation.data.active,
      },
    });
    invalidateWorkingHoursCache();

    return NextResponse.json({
      ...wh,
      periods: derivePeriodsFromWorkingHour(wh),
    });
  } catch (error) {
    console.error("Error updating working hour by id:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar horário de funcionamento." },
      { status: 500 }
    );
  }
}
