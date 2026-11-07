import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Registra que a cliente clicou no botão "Enviar comprovante pelo WhatsApp".
 *
 * REGRAS OBRIGATÓRIAS DE SEGURANÇA:
 * 1. Não é permitido upload de arquivos de comprovante dentro do sistema; o envio é exclusivo pelo WhatsApp.
 * 2. O sistema NÃO considera o pagamento realizado apenas porque a cliente clicou no botão.
 * 3. O pagamento permanece rigorosamente como "PENDING_SIGNAL" ("Aguardando confirmação").
 * 4. Somente a profissional autenticada pode alterar para "SIGNAL_PAID" ("Sinal confirmado").
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

    const existing = await prisma.appointment.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
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
