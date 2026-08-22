import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const wh = await prisma.workingHours.findMany({
      orderBy: { weekday: 'asc' }
    });
    return NextResponse.json(wh);
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
