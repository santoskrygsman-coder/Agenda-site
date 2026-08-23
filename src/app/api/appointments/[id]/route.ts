import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const { id } = await params;
    const body = await request.json();

    const dataToUpdate: any = {};
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.paymentStatus !== undefined) dataToUpdate.paymentStatus = body.paymentStatus;
    if (body.whatsappStatus !== undefined) {
      dataToUpdate.whatsappStatus = body.whatsappStatus;
      if (body.whatsappStatus === "OPENED") {
        dataToUpdate.whatsappOpenedAt = new Date();
      }
    }
    if (body.reminder1SentAt !== undefined) {
      dataToUpdate.reminder1SentAt = body.reminder1SentAt;
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
