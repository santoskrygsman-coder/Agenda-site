import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = await params;
    const body = await request.json();

    const dataToUpdate: any = {};
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.whatsappStatus !== undefined) {
      dataToUpdate.whatsappStatus = body.whatsappStatus;
      if (body.whatsappStatus === "OPENED") {
        dataToUpdate.whatsappOpenedAt = new Date();
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
