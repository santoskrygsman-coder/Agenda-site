import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getCachedSettings, setCachedSettings } from "@/lib/cache";

export async function GET() {
  try {
    const settings = await getCachedSettings();
    return NextResponse.json({
      professionalName: settings.professionalName,
      specialty: settings.specialty,
      description: settings.description,
      whatsapp: settings.whatsapp,
      pixKey: settings.pixKey,
      pixKeyType: settings.pixKeyType,
      signalPercentage: settings.signalPercentage,
      holdMinutes: settings.holdMinutes ?? 15,
      minAdvanceMinutes: settings.minAdvanceMinutes,
      maxDaysAhead: settings.maxDaysAhead,
      pendingBlocksSlot: settings.pendingBlocksSlot,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    let settings = await getCachedSettings();

    const data: Record<string, unknown> = {};
    if (body.professionalName !== undefined) {
      data.professionalName = String(body.professionalName).trim();
    }
    if (body.specialty !== undefined) {
      data.specialty = String(body.specialty).trim();
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim();
    }
    if (body.whatsapp !== undefined) {
      data.whatsapp = String(body.whatsapp).trim();
    }
    if (body.pixKey !== undefined) {
      data.pixKey = String(body.pixKey).trim();
    }
    if (body.pixKeyType !== undefined) {
      data.pixKeyType = String(body.pixKeyType).trim();
    }
    if (body.signalPercentage !== undefined) {
      data.signalPercentage = Number(body.signalPercentage) || 50;
    }
    if (body.holdMinutes !== undefined) {
      data.holdMinutes = Math.max(1, Number(body.holdMinutes) || 15);
    }
    if (body.minAdvanceMinutes !== undefined) {
      data.minAdvanceMinutes = Math.max(0, Number(body.minAdvanceMinutes) || 0);
    }
    if (body.maxDaysAhead !== undefined) {
      data.maxDaysAhead = Math.max(1, Number(body.maxDaysAhead) || 60);
    }
    if (body.pendingBlocksSlot !== undefined) {
      data.pendingBlocksSlot = Boolean(body.pendingBlocksSlot);
    }

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.settings.create({ data });
    }

    setCachedSettings(settings);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar configurações" },
      { status: 500 }
    );
  }
}
