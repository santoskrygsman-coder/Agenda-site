import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await request.json();
    
    const wh = await prisma.workingHours.update({
      where: { id: params.id },
      data: {
        startTime: body.startTime,
        endTime: body.endTime,
        breakStart: body.breakStart,
        breakEnd: body.breakEnd,
        active: body.active
      }
    });
    
    return NextResponse.json(wh);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}
