import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const count = await prisma.appointment.count({
      where: { status: "PENDING" }
    });

    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching count" }, { status: 500 });
  }
}
