import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dates = await prisma.blockedDate.findMany({
      orderBy: { date: 'asc' }
    });
    return NextResponse.json(dates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch blocked dates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const date = await prisma.blockedDate.create({ data });
    return NextResponse.json(date);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create blocked date" }, { status: 500 });
  }
}
