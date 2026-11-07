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

    const updated = await withBookingLock(() =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.appointment.findUnique({
          where: { id },
          include: { service: true },
        });

        if (!existing) {
          throw new Error("NOT_FOUND");
        }

        const dataToUpdate: Record<string, unknown> = {};

        // Se houver remarcação de data/horário OU confirmação do agendamento/sinal,
        // revalidar disponibilidade no servidor para impedir conflitos
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
            tx
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
        }

        // Confirmação manual do sinal ou pagamento integral exclusivamente pela profissional
        if (body.paymentStatus !== undefined) {
          dataToUpdate.paymentStatus = body.paymentStatus;
          if (body.paymentStatus === "SIGNAL_PAID") {
            dataToUpdate.signalPaidAt = new Date();
          } else if (body.paymentStatus === "FULL_PAID") {
            dataToUpdate.fullPaidAt = new Date();
            if (!existing.signalPaidAt) {
              dataToUpdate.signalPaidAt = new Date();
            }
          }
        }

        if (body.notes !== undefined) {
          dataToUpdate.notes = body.notes;
        }

        if (body.whatsappStatus !== undefined) {
          dataToUpdate.whatsappStatus = body.whatsappStatus;
        }

        return await tx.appointment.update({
          where: { id },
          data: dataToUpdate,
          include: { client: true, service: true },
        });
      })
    );

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }
    if (msg === "SLOT_UNAVAILABLE") {
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
