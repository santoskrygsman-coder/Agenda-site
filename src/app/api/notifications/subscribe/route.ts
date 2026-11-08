import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
  return NextResponse.json({
    publicKey: publicKey && !publicKey.includes("SUA_VAPID") ? publicKey : null,
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const endpoint =
      typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh =
      typeof body?.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
    const auth =
      typeof body?.keys?.auth === "string" ? body.keys.auth.trim() : "";
    const userAgent =
      typeof body?.userAgent === "string"
        ? body.userAgent.slice(0, 500)
        : request.headers.get("user-agent")?.slice(0, 500) || null;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Assinatura Web Push incompleta (endpoint, p256dh, auth)." },
        { status: 400 }
      );
    }

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth,
        userAgent,
      },
      create: {
        endpoint,
        p256dh,
        auth,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      id: sub.id,
    });
  } catch (error) {
    console.error("Erro ao salvar assinatura Web Push:", error);
    return NextResponse.json(
      { error: "Não foi possível registrar o dispositivo para notificações." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const endpoint =
      typeof body?.endpoint === "string" ? body.endpoint.trim() : "";

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint não informado." },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover assinatura Web Push:", error);
    return NextResponse.json(
      { error: "Erro ao remover inscrição de notificações." },
      { status: 500 }
    );
  }
}
