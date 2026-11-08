import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.adminNotification.count({
        where: { readAt: null },
      }),
    ]);

    return NextResponse.json({
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        appointmentId: n.appointmentId,
        clientName: n.clientName,
        serviceName: n.serviceName,
        date: n.date,
        time: n.time,
        targetUrl: n.targetUrl,
        dedupeKey: n.dedupeKey,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar notificações." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date();

    if (body?.markAllRead) {
      await prisma.adminNotification.updateMany({
        where: { readAt: null },
        data: { readAt: now },
      });
    } else if (typeof body?.id === "string" && body.id.trim()) {
      await prisma.adminNotification.updateMany({
        where: { id: body.id.trim(), readAt: null },
        data: { readAt: now },
      });
    } else {
      return NextResponse.json(
        { error: "Informe id ou markAllRead: true." },
        { status: 400 }
      );
    }

    const unreadCount = await prisma.adminNotification.count({
      where: { readAt: null },
    });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar notificação." },
      { status: 500 }
    );
  }
}
