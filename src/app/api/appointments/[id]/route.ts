import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import {
  acquirePostgresBookingLock,
  isTimeAvailable,
  minutesToTime,
  timeToMinutes,
  withBookingLock,
} from "@/lib/scheduling";
import { formatDateShortDdMm } from "@/lib/formatters";
import { emitAdminNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await request.json();

    const result = await withBookingLock(() =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.appointment.findUnique({
          where: { id },
          include: { client: true, service: true },
        });

        if (!existing) {
          throw new Error("NOT_FOUND");
        }

        // REGRAS DE SEGURANÇA PARA AGENDAMENTOS CANCELADOS (PROBLEMA 4)
        if (existing.status === "CANCELLED") {
          const isAttemptingConfirmationOrCompletion =
            body.paymentStatus === "SIGNAL_PAID" ||
            body.paymentStatus === "FULL_PAID" ||
            body.status === "COMPLETED" ||
            (body.status === "CONFIRMED" && body.reactivateCancelled !== true);

          if (isAttemptingConfirmationOrCompletion) {
            throw new Error("CANCELLED_CANNOT_CONFIRM");
          }

          const isAttemptingDirectReschedule =
            (body.date !== undefined || body.startTime !== undefined) &&
            body.reactivateCancelled !== true;

          if (isAttemptingDirectReschedule) {
            throw new Error("CANCELLED_CANNOT_RESCHEDULE");
          }
        }

        const dataToUpdate: Record<string, unknown> = {};

        // Fluxo de reativação explícita de agendamento cancelado ("Reagendar atendimento cancelado")
        if (existing.status === "CANCELLED" && body.reactivateCancelled === true) {
          const nextDate = String(body.date || existing.date).trim();
          const nextStartTime = String(
            body.startTime || existing.startTime
          ).trim();

          await acquirePostgresBookingLock(tx, nextDate);

          const available = await isTimeAvailable(
            nextDate,
            nextStartTime,
            existing.service.duration,
            existing.id,
            tx,
            { allowPastToday: true }
          );
          if (!available) {
            throw new Error("SLOT_UNAVAILABLE");
          }

          dataToUpdate.date = nextDate;
          dataToUpdate.startTime = nextStartTime;
          dataToUpdate.endTime = minutesToTime(
            timeToMinutes(nextStartTime) + existing.service.duration
          );

          const requiresDeposit = existing.service.requiresDeposit !== false;
          dataToUpdate.status =
            body.status && body.status !== "CANCELLED"
              ? body.status
              : requiresDeposit && existing.paymentStatus !== "SIGNAL_PAID"
              ? "PENDING"
              : "CONFIRMED";
          if (
            existing.paymentStatus !== "SIGNAL_PAID" &&
            existing.paymentStatus !== "FULL_PAID"
          ) {
            dataToUpdate.paymentStatus = requiresDeposit
              ? "PENDING_SIGNAL"
              : "PAY_ON_SITE";
          }
        } else {
          // Fluxo normal para agendamentos ativos
          const nextDate = body.date || existing.date;
          const nextStartTime = body.startTime || existing.startTime;
          const isRescheduling =
            (body.date && body.date !== existing.date) ||
            (body.startTime && body.startTime !== existing.startTime);
          const isConfirming =
            body.status === "CONFIRMED" || body.paymentStatus === "SIGNAL_PAID";

          if (isRescheduling || isConfirming) {
            await acquirePostgresBookingLock(tx, nextDate);

            const available = await isTimeAvailable(
              nextDate,
              nextStartTime,
              existing.service.duration,
              existing.id,
              tx,
              isRescheduling
                ? { allowPastToday: true }
                : {
                    allowPastToday: true,
                    allowPastDates: true,
                    ignoreWorkingHours: true,
                  }
            );
            if (!available) {
              throw new Error("SLOT_UNAVAILABLE");
            }
            if (isRescheduling) {
              dataToUpdate.date = nextDate;
              dataToUpdate.startTime = nextStartTime;
              dataToUpdate.endTime = minutesToTime(
                timeToMinutes(nextStartTime) + existing.service.duration
              );
            }
          }

          if (body.status !== undefined) {
            dataToUpdate.status = body.status;
            if (body.status === "CANCELLED") {
              dataToUpdate.expiresAt = null;
            }
          }

          // Confirmação manual do sinal ou pagamento integral exclusivamente pela profissional
          if (body.paymentStatus !== undefined) {
            dataToUpdate.paymentStatus = body.paymentStatus;
            if (body.paymentStatus === "SIGNAL_PAID") {
              dataToUpdate.signalPaidAt = new Date();
              dataToUpdate.expiresAt = null;
            } else if (body.paymentStatus === "FULL_PAID") {
              dataToUpdate.fullPaidAt = new Date();
              dataToUpdate.expiresAt = null;
              if (!existing.signalPaidAt) {
                dataToUpdate.signalPaidAt = new Date();
              }
            }
          }
        }

        if (body.notes !== undefined) {
          dataToUpdate.notes = body.notes;
        }

        if (body.whatsappStatus !== undefined) {
          dataToUpdate.whatsappStatus = body.whatsappStatus;
        }

        const updated = await tx.appointment.update({
          where: { id },
          data: dataToUpdate,
          include: { client: true, service: true },
        });

        return { existing, updated };
      })
    );

    const { existing, updated } = result;

    // Disparar notificações administrativas quando houver cancelamento ou alteração importante
    if (existing.status !== "CANCELLED" && updated.status === "CANCELLED") {
      await emitAdminNotification({
        type: "APPOINTMENT_CANCELLED",
        title: "Agendamento cancelado",
        body: `${updated.client.name} • ${
          updated.service.name
        } (${formatDateShortDdMm(updated.date)} às ${
          updated.startTime
        }) — horário liberado`,
        appointmentId: updated.id,
        clientName: updated.client.name,
        serviceName: updated.service.name,
        date: updated.date,
        time: updated.startTime,
        targetUrl: `/admin/agendamento?id=${updated.id}`,
        dedupeKey: `cancel-${updated.id}-${updated.updatedAt.getTime()}`,
      });
    } else if (
      existing.date !== updated.date ||
      existing.startTime !== updated.startTime ||
      body.reactivateCancelled === true
    ) {
      await emitAdminNotification({
        type: "APPOINTMENT_UPDATED",
        title:
          body.reactivateCancelled === true
            ? "Atendimento reagendado!"
            : "Agendamento remarcado",
        body: `${updated.client.name} • ${
          updated.service.name
        } para ${formatDateShortDdMm(updated.date)} às ${updated.startTime}`,
        appointmentId: updated.id,
        clientName: updated.client.name,
        serviceName: updated.service.name,
        date: updated.date,
        time: updated.startTime,
        targetUrl: `/admin/agendamento?id=${updated.id}`,
        dedupeKey: `reschedule-${updated.id}-${updated.date}-${updated.startTime}`,
      });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    const prismaCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }
    if (msg === "CANCELLED_CANNOT_CONFIRM") {
      return NextResponse.json(
        {
          error:
            "Não é permitido confirmar pagamento ou concluir um agendamento cancelado.",
        },
        { status: 400 }
      );
    }
    if (msg === "CANCELLED_CANNOT_RESCHEDULE") {
      return NextResponse.json(
        {
          error:
            "Não é permitido remarcar diretamente um agendamento cancelado. Use a opção de reagendar atendimento cancelado.",
        },
        { status: 400 }
      );
    }
    if (msg === "SLOT_UNAVAILABLE" || prismaCode === "P2002") {
      return NextResponse.json(
        {
          error:
            "O novo horário escolhido não está disponível ou conflita com outro agendamento.",
        },
        { status: 409 }
      );
    }
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await props.params;
    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Erro ao excluir agendamento" },
      { status: 500 }
    );
  }
}
