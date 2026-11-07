import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import {
  formatCurrency,
  formatDateLongPtBr,
  formatDuration,
  formatPhoneDisplay,
  normalizePhoneDigits,
} from "@/lib/formatters";
import { expireOverduePendingAppointments } from "@/lib/scheduling";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const phoneParam = (searchParams.get("phone") || "").trim();
    const digits = phoneParam.replace(/\D/g, "");

    if (digits.length < 10) {
      return NextResponse.json(
        { error: "Informe seu WhatsApp com DDD para localizar seu agendamento." },
        { status: 400 }
      );
    }

    await expireOverduePendingAppointments();

    const normalized = normalizePhoneDigits(phoneParam);
    const last8 = digits.slice(-8);

    const client = await prisma.client.findFirst({
      where: {
        OR: [{ phone: normalized }, { phone: { endsWith: last8 } }],
      },
      include: {
        appointments: {
          include: { service: true },
          orderBy: [{ createdAt: "desc" }],
          take: 5,
        },
      },
    });

    if (!client || client.appointments.length === 0) {
      return NextResponse.json(
        { error: "Nenhum agendamento encontrado para este telefone." },
        { status: 404 }
      );
    }

    const mapped = client.appointments.map((a) => ({
      id: a.id,
      date: a.date,
      dateFormatted: formatDateLongPtBr(a.date),
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      paymentStatus: a.paymentStatus,
      signalAmount: a.signalAmount,
      signalFormatted: formatCurrency(a.signalAmount),
      totalAmount: a.totalAmount || a.service.price,
      totalFormatted: formatCurrency(a.totalAmount || a.service.price),
      expiresAt: a.expiresAt,
      receiptReportedAt: a.receiptReportedAt,
      receiptFileName: a.receiptFileName,
      clientName: client.name,
      clientPhone: formatPhoneDisplay(client.phone),
      service: {
        id: a.service.id,
        name: a.service.name,
        description: a.service.description || "",
        duration: formatDuration(a.service.duration),
        durationMinutes: a.service.duration,
        price: a.service.price,
        priceFormatted: formatCurrency(a.service.price),
        image: a.service.image || "/images/service-classica.png",
        active: a.service.active,
      },
    }));

    return NextResponse.json({
      clientName: client.name,
      clientPhone: formatPhoneDisplay(client.phone),
      appointments: mapped,
    });
  } catch (error) {
    console.error("Error looking up appointment by phone:", error);
    return NextResponse.json(
      { error: "Erro ao consultar agendamento." },
      { status: 500 }
    );
  }
}
