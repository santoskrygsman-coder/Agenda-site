import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlotsForDate } from "@/lib/scheduling";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");
    const durationParam = searchParams.get("duration");
    const excludeAppointmentId =
      searchParams.get("excludeAppointmentId") || undefined;

    if (!dateStr) {
      return NextResponse.json(
        { error: "Parâmetro date é obrigatório" },
        { status: 400 }
      );
    }

    let durationMins = durationParam ? parseInt(durationParam, 10) : 0;

    if (serviceId) {
      const svc = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!svc || !svc.active) {
        return NextResponse.json(
          { error: "Serviço inválido ou inativo", times: [] },
          { status: 404 }
        );
      }
      durationMins = svc.duration;
    }

    if (!durationMins || isNaN(durationMins) || durationMins <= 0) {
      durationMins = 90;
    }

    const result = await getAvailableSlotsForDate(
      dateStr,
      durationMins,
      excludeAppointmentId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error computing availability:", error);
    return NextResponse.json(
      { error: "Erro ao calcular disponibilidade", times: [] },
      { status: 500 }
    );
  }
}
