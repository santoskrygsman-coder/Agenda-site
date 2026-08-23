import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const service = await prisma.service.create({
      data: {
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        duration: parseInt(body.duration),
        requiresDeposit: body.requiresDeposit || false,
        active: true
      }
    });
    return NextResponse.json(service);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
