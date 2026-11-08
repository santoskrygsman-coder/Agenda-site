import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { formatCurrency, formatDateShortDdMm } from "@/lib/formatters";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const month = searchParams.get("month") || defaultMonth;

    const [appointments, expenses] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          date: { startsWith: month },
          status: { notIn: ["CANCELLED", "REJECTED"] },
        },
        include: {
          client: true,
          service: true,
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
      }),
      prisma.expense.findMany({
        where: {
          date: { startsWith: month },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    let receivedTotal = 0;
    let pendingSignalsTotal = 0;
    let expensesTotal = 0;

    for (const exp of expenses) {
      expensesTotal += exp.amount;
    }

    const entries: Array<{
      id: string;
      appointmentId?: string;
      expenseId?: string;
      rawDate: string;
      date: string;
      title: string;
      subtitle?: string;
      subtitleType?: "pending" | "confirmed";
      amount: number;
      amountFormatted: string;
      type: "income" | "expense";
      paymentStatus?: string;
    }> = [];

    for (const appt of appointments) {
      const totalVal =
        appt.totalAmount > 0 ? appt.totalAmount : appt.service.price;
      const signalVal =
        typeof appt.signalAmount === "number" && appt.signalAmount >= 0
          ? appt.signalAmount
          : Math.round(totalVal * 50) / 100;

      if (appt.paymentStatus === "FULL_PAID" || appt.status === "COMPLETED") {
        receivedTotal += totalVal;
        entries.push({
          id: `appt-full-${appt.id}`,
          appointmentId: appt.id,
          rawDate: appt.date,
          date: formatDateShortDdMm(appt.date),
          title: `Pagamento - ${appt.client.name}`,
          amount: totalVal,
          amountFormatted: `+ ${formatCurrency(totalVal)}`,
          type: "income",
          paymentStatus: "FULL_PAID",
        });
      } else if (appt.paymentStatus === "SIGNAL_PAID") {
        receivedTotal += signalVal;
        entries.push({
          id: `appt-sig-${appt.id}`,
          appointmentId: appt.id,
          rawDate: appt.date,
          date: formatDateShortDdMm(appt.date),
          title: `Sinal - ${appt.client.name}`,
          subtitle: "• Sinal confirmado",
          subtitleType: "confirmed",
          amount: signalVal,
          amountFormatted: `+ ${formatCurrency(signalVal)}`,
          type: "income",
          paymentStatus: "SIGNAL_PAID",
        });
      } else if (appt.paymentStatus === "PENDING_SIGNAL" && appt.signalAmount > 0) {
        // PENDING_SIGNAL
        pendingSignalsTotal += signalVal;
        entries.push({
          id: `appt-pend-${appt.id}`,
          appointmentId: appt.id,
          rawDate: appt.date,
          date: formatDateShortDdMm(appt.date),
          title: `Sinal - ${appt.client.name}`,
          subtitle: "Aguardando confirmação",
          subtitleType: "pending",
          amount: signalVal,
          amountFormatted: `+ ${formatCurrency(signalVal)}`,
          type: "income",
          paymentStatus: "PENDING_SIGNAL",
        });
      }
    }

    for (const exp of expenses) {
      entries.push({
        id: `exp-${exp.id}`,
        expenseId: exp.id,
        rawDate: exp.date,
        date: formatDateShortDdMm(exp.date),
        title: `Despesa - ${exp.description}`,
        amount: exp.amount,
        amountFormatted: `- ${formatCurrency(exp.amount)}`,
        type: "expense",
      });
    }

    entries.sort((a, b) => b.rawDate.localeCompare(a.rawDate));

    const netBalance = receivedTotal - expensesTotal;

    return NextResponse.json({
      month,
      receivedTotal,
      receivedFormatted: formatCurrency(receivedTotal),
      pendingSignalsTotal,
      pendingSignalsFormatted: formatCurrency(pendingSignalsTotal),
      expensesTotal,
      expensesFormatted: formatCurrency(expensesTotal),
      netBalance,
      netBalanceFormatted: formatCurrency(netBalance),
      entries,
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Erro ao carregar controle financeiro" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Registro de nova despesa
    const description = (body.description || "").trim();
    const amount = Number(body.amount);
    const date = (body.date || "").trim();
    const category = (body.category || "Materiais").trim();

    if (!description) {
      return NextResponse.json(
        { error: "Informe a descrição da despesa" },
        { status: 400 }
      );
    }
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Informe um valor válido maior que zero" },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Informe uma data válida (AAAA-MM-DD)" },
        { status: 400 }
      );
    }

    const created = await prisma.expense.create({
      data: {
        description,
        amount,
        date,
        category,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Erro ao registrar despesa" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("expenseId");
    if (!expenseId) {
      return NextResponse.json(
        { error: "Informe o ID da despesa para excluir" },
        { status: 400 }
      );
    }

    await prisma.expense.delete({ where: { id: expenseId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Erro ao excluir despesa" },
      { status: 500 }
    );
  }
}
