import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse, addMinutes, format } from "date-fns";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { serviceId, date, time, name, phone, notes } = data;

    // Fetch Service
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Strict validation of time availability
    const { isTimeAvailable } = await import("@/lib/scheduling");
    const isAvailable = await isTimeAvailable(date, time, service.duration);

    if (!isAvailable) {
      return NextResponse.json({ error: "O horário selecionado não está mais disponível ou entra em conflito com outro." }, { status: 400 });
    }

    // Find or create Client
    let client = await prisma.client.findUnique({
      where: { phone }
    });

    if (!client) {
      client = await prisma.client.create({
        data: { name, phone }
      });
    }

    const startObj = parse(time, "HH:mm", new Date());
    const endObj = addMinutes(startObj, service.duration);
    const endTime = format(endObj, "HH:mm");

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        serviceId: service.id,
        date: date,
        startTime: time,
        endTime: endTime,
        status: "PENDING",
        notes: notes
      }
    });

    // Here we could trigger WhatsApp webhook/message in a real integration.
    // For now, it will just appear in the admin panel.

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
