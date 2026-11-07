import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import {
  acquirePostgresBookingLock,
  expireOverduePendingAppointments,
  isTimeAvailable,
  minutesToTime,
  timeToMinutes,
  withBookingLock,
} from "@/lib/scheduling";
import {
  formatCurrency,
  formatDateLongPtBr,
  formatPhoneDisplay,
  normalizePhoneDigits,
} from "@/lib/formatters";
import { validateBookingPayload } from "@/lib/validation";

function mapStatusToUi(
  status: string,
  paymentStatus: string
): {
  uiStatus: "concluido" | "confirmado" | "aguardando" | "agendado";
  statusLabel: string;
} {
  if (status === "COMPLETED") {
    return { uiStatus: "concluido", statusLabel: "Concluído" };
  }
  if (status === "CANCELLED" || status === "REJECTED") {
    return { uiStatus: "agendado", statusLabel: "Cancelado" };
  }
  if (paymentStatus === "SIGNAL_PAID") {
    return { uiStatus: "confirmado", statusLabel: "Sinal confirmado" };
  }
  if (status === "CONFIRMED") {
    return { uiStatus: "confirmado", statusLabel: "Confirmado" };
  }
  if (paymentStatus === "PENDING_SIGNAL") {
    return { uiStatus: "aguardando", statusLabel: "Aguardando confirmação" };
  }
  return { uiStatus: "agendado", statusLabel: "Agendado" };
}

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await expireOverduePendingAppointments();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const month = searchParams.get("month"); // YYYY-MM

    const whereClause: Record<string, unknown> = {};
    if (date) {
      whereClause.date = date;
    } else if (startDate && endDate) {
      whereClause.date = { gte: startDate, lte: endDate };
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      whereClause.date = { startsWith: month };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        client: true,
        service: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const mapped = appointments.map((a) => {
      const { uiStatus, statusLabel } = mapStatusToUi(
        a.status,
        a.paymentStatus
      );
      return {
        id: a.id,
        date: a.date,
        dateFormatted: formatDateLongPtBr(a.date),
        time: a.startTime,
        endTime: a.endTime,
        clientId: a.clientId,
        clientName: a.client.name,
        clientPhone: formatPhoneDisplay(a.client.phone),
        clientRawPhone: a.client.phone,
        serviceId: a.serviceId,
        serviceName: a.service.name,
        serviceDuration: a.service.duration,
        price: a.totalAmount || a.service.price,
        priceFormatted: formatCurrency(a.totalAmount || a.service.price),
        signalAmount: a.signalAmount,
        signalFormatted: formatCurrency(a.signalAmount),
        dbStatus: a.status,
        paymentStatus: a.paymentStatus,
        receiptReportedAt: a.receiptReportedAt,
        receiptUrl: a.receiptUrl || null,
        receiptFileName: a.receiptFileName || null,
        expiresAt: a.expiresAt || null,
        status: uiStatus,
        statusLabel,
        notes: a.notes || a.client.notes || "",
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agendamentos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    const isAdmin = Boolean(session);

    const body = await request.json();
    const serviceId = String(body.serviceId || "").trim();
    const date = String(body.date || "").trim();
    const time = String(body.time || "").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const notes = String(body.notes || "").trim();

    // Repetir todas as validações no backend (não confiar apenas no frontend)
    const validation = validateBookingPayload({
      serviceId,
      date,
      time,
      name,
      phone,
      email,
      acceptedPolicies: body.acceptedPolicies === true,
      requirePolicies: !isAdmin,
    });
    if (!validation.valid) {
      const firstError =
        validation.firstError ||
        "Preencha todos os campos obrigatórios corretamente.";
      return NextResponse.json(
        {
          error: firstError,
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneDigits(phone);

    // Serialização + transação de banco (com pg_advisory_xact_lock no PostgreSQL) para impedir concorrência/duplicidade no mesmo horário
    const created = await withBookingLock(() =>
      prisma.$transaction(async (tx) => {
        await acquirePostgresBookingLock(tx, date);

        const service = await tx.service.findUnique({ where: { id: serviceId } });
        if (!service || !service.active) {
          throw new Error("SERVICE_NOT_FOUND");
        }

        const settings = await tx.settings.findFirst();
        const signalPct = settings?.signalPercentage ?? 50;
        const holdMinutes = settings?.holdMinutes ?? 15;
        const signalAmount = Number(((service.price * signalPct) / 100).toFixed(2));

        // Bloquear qualquer tentativa de manipulação de preço, valor do sinal ou status pelo cliente
        if (!isAdmin) {
          if (
            (body.status !== undefined && body.status !== "PENDING") ||
            (body.paymentStatus !== undefined &&
              body.paymentStatus !== "PENDING_SIGNAL") ||
            (body.price !== undefined &&
              Number(body.price) !== Number(service.price)) ||
            (body.totalAmount !== undefined &&
              Number(body.totalAmount) !== Number(service.price)) ||
            (body.signalAmount !== undefined &&
              Number(body.signalAmount) !== signalAmount)
          ) {
            throw new Error("MANIPULATED_VALUES");
          }
        }

        const available = await isTimeAvailable(
          date,
          time,
          service.duration,
          undefined,
          tx
        );
        if (!available) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        const expiresAt = service.requiresDeposit
          ? new Date(Date.now() + holdMinutes * 60 * 1000)
          : null;

        let client = await tx.client.findUnique({
          where: { phone: normalizedPhone },
        });

        if (!client) {
          client = await tx.client.create({
            data: {
              name,
              phone: normalizedPhone,
              email: email || null,
              notes: notes || null,
              category: "ativas",
            },
          });
        } else {
          const apptCount = await tx.appointment.count({
            where: { clientId: client.id },
          });
          client = await tx.client.update({
            where: { id: client.id },
            data: {
              name,
              email: email || client.email,
              notes: notes || client.notes,
              category: apptCount + 1 >= 3 ? "frequentes" : "ativas",
            },
          });
        }

        const endTime = minutesToTime(timeToMinutes(time) + service.duration);

        const appt = await tx.appointment.create({
          data: {
            clientId: client.id,
            serviceId: service.id,
            date,
            startTime: time,
            endTime,
            status: "PENDING",
            paymentStatus: service.requiresDeposit
              ? "PENDING_SIGNAL"
              : "FULL_PAID",
            signalAmount,
            totalAmount: service.price,
            expiresAt,
            notes: notes || null,
          },
          include: {
            service: true,
          },
        });

        return { appt, holdMinutes };
      })
    );

    return NextResponse.json(
      {
        id: created.appt.id,
        date: created.appt.date,
        startTime: created.appt.startTime,
        endTime: created.appt.endTime,
        status: created.appt.status,
        paymentStatus: created.appt.paymentStatus,
        paymentStatusLabel:
          created.appt.paymentStatus === "PENDING_SIGNAL"
            ? "Aguardando confirmação"
            : "Sinal confirmado",
        signalAmount: created.appt.signalAmount,
        totalAmount: created.appt.totalAmount,
        serviceName: created.appt.service.name,
        expiresAt: created.appt.expiresAt,
        holdMinutes: created.holdMinutes,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "MANIPULATED_VALUES") {
      return NextResponse.json(
        {
          error:
            "Valores ou status inválidos/manipulados detectados. Operação recusada.",
        },
        { status: 400 }
      );
    }
    if (msg === "SERVICE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Serviço não encontrado ou indisponível." },
        { status: 404 }
      );
    }
    if (msg === "SLOT_UNAVAILABLE") {
      return NextResponse.json(
        {
          error:
            "Este horário já foi reservado ou conflita com outro atendimento. Escolha outro horário.",
        },
        { status: 409 }
      );
    }
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Erro ao criar agendamento." },
      { status: 500 }
    );
  }
}
