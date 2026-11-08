import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDateShortDdMm } from "@/lib/formatters";
import { emitAdminNotification } from "@/lib/notifications";

/**
 * Registra que a cliente clicou no botão "Enviar comprovante pelo WhatsApp".
 *
 * REGRAS OBRIGATÓRIAS DE SEGURANÇA:
 * 1. Não é permitido upload de arquivos de comprovante dentro do sistema; o envio é exclusivo pelo WhatsApp.
 * 2. O sistema NÃO considera o pagamento realizado apenas porque a cliente clicou no botão.
 * 3. O pagamento permanece rigorosamente como "PENDING_SIGNAL" ("Aguardando confirmação").
 * 4. Somente a profissional autenticada pode alterar para "SIGNAL_PAID" ("Sinal confirmado").
 * 5. Agendamentos cancelados NÃO aceitam aviso de comprovante (HTTP 400).
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    // Recusar qualquer tentativa de enviar arquivo de comprovante via upload no sistema
    try {
      const body = await request.json();
      if (body && (body.receiptUrl || body.receiptFileName)) {
        return NextResponse.json(
          {
            error:
              "O upload de comprovante não é permitido no sistema. Envie o comprovante diretamente pelo WhatsApp da profissional.",
          },
          { status: 400 }
        );
      }
    } catch {
      // Requisição sem body JSON é esperada
    }

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true, service: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    if (existing.status === "CANCELLED" || existing.status === "REJECTED") {
      return NextResponse.json(
        {
          error:
            "Este agendamento foi cancelado e não aceita confirmação de comprovante.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        receiptReportedAt: new Date(),
        whatsappStatus: "OPENED",
        // Mantém status ("PENDING") e paymentStatus ("PENDING_SIGNAL" = Aguardando confirmação) inalterados!
      },
    });

    await emitAdminNotification({
      type: "RECEIPT_REPORTED",
      title: "Comprovante do sinal informado!",
      body: `${existing.client.name} informou envio do sinal Pix para ${
        existing.service.name
      } (${formatDateShortDdMm(existing.date)} às ${existing.startTime})`,
      appointmentId: existing.id,
      clientName: existing.client.name,
      serviceName: existing.service.name,
      date: existing.date,
      time: existing.startTime,
      targetUrl: `/admin/agendamento?id=${existing.id}`,
      dedupeKey: `receipt-${existing.id}`,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      paymentStatusLabel:
        updated.paymentStatus === "PENDING_SIGNAL"
          ? "Aguardando confirmação"
          : "Sinal confirmado",
      receiptReportedAt: updated.receiptReportedAt,
    });
  } catch (error) {
    console.error("Error recording receipt report:", error);
    return NextResponse.json(
      { error: "Erro ao registrar redirecionamento para WhatsApp" },
      { status: 500 }
    );
  }
}
