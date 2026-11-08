import * as webpush from "web-push";
import { prisma } from "@/lib/prisma";

export type AdminNotificationType =
  | "NEW_APPOINTMENT"
  | "RECEIPT_REPORTED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_UPDATED";

export interface EmitAdminNotificationParams {
  type: AdminNotificationType;
  title: string;
  body: string;
  appointmentId?: string | null;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  targetUrl?: string;
  dedupeKey: string;
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = (
    process.env.VAPID_SUBJECT || "mailto:contato@emilelash.com.br"
  ).trim();

  if (
    !publicKey ||
    !privateKey ||
    publicKey.includes("SUA_VAPID") ||
    privateKey.includes("SUA_VAPID")
  ) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.warn("Aviso: falha ao configurar VAPID para Web Push:", err);
    return false;
  }
}

/**
 * Registra um evento administrativo no PostgreSQL com deduplicação estrita (`dedupeKey`)
 * e dispara notificações Web Push reais (VAPID) para todos os celulares inscritos da designer.
 */
export async function emitAdminNotification(
  params: EmitAdminNotificationParams
) {
  const {
    type,
    title,
    body,
    appointmentId = null,
    clientName,
    serviceName,
    date,
    time,
    targetUrl = appointmentId
      ? `/admin/agendamento?id=${appointmentId}`
      : "/admin/agenda",
    dedupeKey,
  } = params;

  try {
    // 1. Verifica deduplicação para evitar notificações duplicadas
    const existing = await prisma.adminNotification.findUnique({
      where: { dedupeKey },
    });
    if (existing) {
      return {
        created: false,
        notification: existing,
        pushedCount: 0,
      };
    }

    let notification;
    try {
      notification = await prisma.adminNotification.create({
        data: {
          type,
          title,
          body,
          appointmentId,
          clientName,
          serviceName,
          date,
          time,
          targetUrl,
          dedupeKey,
        },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        const already = await prisma.adminNotification.findUnique({
          where: { dedupeKey },
        });
        return {
          created: false,
          notification: already,
          pushedCount: 0,
        };
      }
      throw err;
    }

    // 2. Dispara Web Push real para os dispositivos inscritos
    let pushedCount = 0;
    if (ensureVapidConfigured()) {
      const subscriptions = await prisma.pushSubscription.findMany();
      if (subscriptions.length > 0) {
        const payload = JSON.stringify({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          appointmentId: notification.appointmentId,
          clientName: notification.clientName,
          serviceName: notification.serviceName,
          date: notification.date,
          time: notification.time,
          targetUrl: notification.targetUrl,
          dedupeKey: notification.dedupeKey,
          createdAt: notification.createdAt.toISOString(),
        });

        await Promise.all(
          subscriptions.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                payload,
                { TTL: 86400, urgency: "high" }
              );
              pushedCount += 1;
            } catch (pushErr: unknown) {
              const statusCode = (pushErr as { statusCode?: number })
                ?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                await prisma.pushSubscription
                  .delete({ where: { id: sub.id } })
                  .catch(() => {});
              } else {
                console.warn("Erro ao enviar Web Push para dispositivo:", pushErr);
              }
            }
          })
        );
      }
    }

    return {
      created: true,
      notification,
      pushedCount,
    };
  } catch (error) {
    console.error("Erro ao emitir notificação administrativa:", error);
    return {
      created: false,
      notification: null,
      pushedCount: 0,
    };
  }
}
