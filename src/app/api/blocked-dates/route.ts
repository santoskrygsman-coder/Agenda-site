import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const dates = await prisma.blockedDate.findMany({
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(dates);
  } catch (error) {
    console.error("Error fetching blocked dates:", error);
    return NextResponse.json(
      { error: "Erro ao buscar bloqueios de agenda" },
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
    const date = (body.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Informe uma data válida (AAAA-MM-DD)" },
        { status: 400 }
      );
    }

    const created = await prisma.blockedDate.create({
      data: {
        date,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        reason: body.reason || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating blocked date:", error);
    return NextResponse.json(
      { error: "Erro ao criar bloqueio de data" },
      { status: 500 }
    );
  }
}
