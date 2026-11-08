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
  calculateSignalInCents,
  formatCurrency,
  formatDateLongPtBr,
  formatDateShortDdMm,
  formatPhoneDisplay,
  normalizePhoneDigits,
} from "@/lib/formatters";
import { validateBookingPayload } from "@/lib/validation";
import { getCachedAllServices, getCachedSettings } from "@/lib/cache";
import { emitAdminNotification } from "@/lib/notifications";

function mapStatusToUi(
  status: string,
  paymentStatus: string
): {
  uiStatus: "concluido" | "confirmado" | "aguardando" | "agendado" | "cancelado";
  statusLabel: string;
} {
  if (status === "COMPLETED") {
    return { uiStatus: "concluido", statusLabel: "Concluído" };
  }
  if (status === "CANCELLED" || status === "REJECTED") {
    return { uiStatus: "cancelado", statusLabel: "Cancelado" };
  }
  if (paymentStatus === "SIGNAL_PAID") {
    return { uiStatus: "confirmado", statusLabel: "Sinal confirmado" };
  }
  if (paymentStatus === "PAY_ON_SITE") {
    return { uiStatus: "confirmado", statusLabel: "Confirmado (sem sinal)" };
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
    const id = searchParams.get("id");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const month = searchParams.get("month"); // YYYY-MM

    const whereClause: Record<string, unknown> = {};
    if (id) {
      whereClause.id = id;
    } else if (date) {
      whereClause.date = date;
    } else if (startDate && endDate) {
      whereClause.date = { gte: startDate, lte: endDate };
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      whereClause.date = { startsWith: month };
    }

    const [appointments, allServices] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          client: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      getCachedAllServices(),
    ]);
    const serviceById = new Map(allServices.map((s) => [s.id, s]));

    const mapped = appointments.map((a) => {
      const { uiStatus, statusLabel } = mapStatusToUi(
        a.status,
        a.paymentStatus
      );
      const svc = serviceById.get(a.serviceId);
      const svcPrice = svc?.price ?? 0;
      // Preservação histórica: sempre prioriza totalAmount, signalAmount e signalPercentage salvos no agendamento
      const savedTotal = a.totalAmount > 0 ? a.totalAmount : svcPrice;
      const savedSignal = typeof a.signalAmount === "number" ? a.signalAmount : 0;
      const savedSignalPct =
        typeof a.signalPercentage === "number"
          ? a.signalPercentage
          : savedTotal > 0
          ? Math.round((savedSignal / savedTotal) * 100)
          : 0;
      const savedRemaining = Math.max(
        0,
        Math.round((savedTotal - savedSignal) * 100) / 100
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
        serviceName: svc?.name || "Procedimento",
        serviceDuration: svc?.duration || 90,
        price: savedTotal,
        priceFormatted: formatCurrency(savedTotal),
        signalPercentage: savedSignalPct,
        signalAmount: savedSignal,
        signalFormatted: formatCurrency(savedSignal),
        remainingAmount: savedRemaining,
        remainingFormatted: formatCurrency(savedRemaining),
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

    const [allCachedServices, cachedSettings] = await Promise.all([
      getCachedAllServices(),
      getCachedSettings(),
    ]);

    // Preparar ou atualizar cadastro da cliente antes da transação de trava de horário
    const client = await prisma.client.upsert({
      where: { phone: normalizedPhone },
      create: {
        name,
        phone: normalizedPhone,
        email: email || null,
        notes: notes || null,
        category: "ativas",
      },
      update: {
        name,
        ...(email ? { email } : {}),
        ...(notes ? { notes } : {}),
      },
    });

    // Serialização + transação de banco (com pg_advisory_xact_lock no PostgreSQL) para impedir concorrência/duplicidade no mesmo horário
    const created = await withBookingLock(() =>
      prisma.$transaction(async (tx) => {
        let service =
          allCachedServices.find((s) => s.id === serviceId) || null;
        if (!service) {
          const allActive = allCachedServices.filter((s) => s.active);
          const slugWords = serviceId
            .toLowerCase()
            .replace(/[-_]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 3);
          service =
            allActive.find((s) => {
              const sName = s.name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              return slugWords.some((w) => sName.includes(w));
            }) ||
            allActive[0] ||
            null;
        }
        if (!service || (!service.active && !isAdmin)) {
          throw new Error("SERVICE_NOT_FOUND");
        }

        const requiresSignal = service.requiresDeposit !== false;
        const configuredPct =
          service.depositPercentage ?? cachedSettings?.signalPercentage ?? 50;
        const holdMinutes = cachedSettings?.holdMinutes ?? 15;
        const signalCalc = calculateSignalInCents(
          service.price,
          requiresSignal,
          configuredPct
        );

        // Bloquear qualquer tentativa de manipulação de preço, valor do sinal ou status pelo cliente
        if (!isAdmin) {
          if (
            (body.status !== undefined && body.status !== "PENDING") ||
            (body.paymentStatus !== undefined &&
              body.paymentStatus !== "PENDING_SIGNAL") ||
            (body.price !== undefined &&
              Number(body.price) !== signalCalc.totalAmount) ||
            (body.totalAmount !== undefined &&
              Number(body.totalAmount) !== signalCalc.totalAmount) ||
            (body.signalAmount !== undefined &&
              Number(body.signalAmount) !== signalCalc.signalAmount)
          ) {
            throw new Error("MANIPULATED_VALUES");
          }
        }

        await acquirePostgresBookingLock(tx, date);

        const available = await isTimeAvailable(
          date,
          time,
          service.duration,
          undefined,
          tx,
          isAdmin ? { allowPastToday: true } : undefined
        );
        if (!available) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        const expiresAt = requiresSignal
          ? new Date(Date.now() + holdMinutes * 60 * 1000)
          : null;

        const endTime = minutesToTime(timeToMinutes(time) + service.duration);

        const appt = await tx.appointment.create({
          data: {
            clientId: client.id,
            serviceId: service.id,
            date,
            startTime: time,
            endTime,
            status: requiresSignal ? "PENDING" : "CONFIRMED",
            paymentStatus: requiresSignal ? "PENDING_SIGNAL" : "PAY_ON_SITE",
            signalPercentage: signalCalc.signalPercentage,
            signalAmount: signalCalc.signalAmount,
            totalAmount: signalCalc.totalAmount,
            expiresAt,
            notes: notes || null,
          },
        });

        return {
          appt,
          serviceName: service.name,
          holdMinutes,
          remainingAmount: signalCalc.remainingAmount,
        };
      })
    );

    // Emitir notificação para o celular da designer (Web Push VAPID + histórico em PostgreSQL)
    await emitAdminNotification({
      type: "NEW_APPOINTMENT",
      title: "Novo agendamento realizado!",
      body: `${name} • ${created.serviceName} (${formatDateShortDdMm(
        created.appt.date
      )} às ${created.appt.startTime})`,
      appointmentId: created.appt.id,
      clientName: name,
      serviceName: created.serviceName,
      date: created.appt.date,
      time: created.appt.startTime,
      targetUrl: `/admin/agendamento?id=${created.appt.id}`,
      dedupeKey: `new-appt-${created.appt.id}`,
    });

    return NextResponse.json(
      {
        id: created.appt.id,
        clientId: client.id,
        date: created.appt.date,
        startTime: created.appt.startTime,
        endTime: created.appt.endTime,
        status: created.appt.status,
        paymentStatus: created.appt.paymentStatus,
        paymentStatusLabel:
          created.appt.paymentStatus === "PENDING_SIGNAL"
            ? "Aguardando confirmação"
            : created.appt.paymentStatus === "PAY_ON_SITE"
            ? "Confirmado (sem sinal)"
            : "Sinal confirmado",
        signalPercentage: created.appt.signalPercentage,
        signalAmount: created.appt.signalAmount,
        remainingAmount: created.remainingAmount,
        totalAmount: created.appt.totalAmount,
        serviceName: created.serviceName,
        expiresAt: created.appt.expiresAt,
        holdMinutes: created.holdMinutes,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    const prismaCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
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
    if (msg === "SLOT_UNAVAILABLE" || prismaCode === "P2002") {
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
