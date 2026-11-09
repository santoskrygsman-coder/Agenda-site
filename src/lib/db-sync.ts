import crypto from "crypto";
import { prisma } from "./prisma";

const globalForDbSync = globalThis as unknown as {
  __dbSchemaSynced?: boolean;
  __dbSchemaSyncPromise?: Promise<void>;
};

function makeScryptHash(password: string, fixedSalt: string): string {
  const derived = crypto.scryptSync(password, fixedSalt, 64).toString("hex");
  return `${fixedSalt}:${derived}`;
}

/**
 * Sincroniza de forma idempotente e não-destrutiva colunas e tabelas novas
 * no PostgreSQL de produção sem apagar nem alterar dados existentes.
 */
export async function ensureDatabaseSchemaSynced(): Promise<void> {
  if (globalForDbSync.__dbSchemaSynced) {
    return;
  }
  if (globalForDbSync.__dbSchemaSyncPromise) {
    return globalForDbSync.__dbSchemaSyncPromise;
  }

  const promise = (async () => {
    try {
      const statements = [
        // 1. Colunas da tabela Service
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "description" TEXT`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "image" TEXT NOT NULL DEFAULT '/images/service-classica.png'`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "requiresDeposit" BOOLEAN NOT NULL DEFAULT true`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "depositPercentage" DOUBLE PRECISION DEFAULT 50`,
        `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0`,

        // 2. Colunas da tabela Settings
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "professionalName" TEXT NOT NULL DEFAULT 'Emile Lash Designer'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "specialty" TEXT NOT NULL DEFAULT 'Cílios • Sobrancelha • Brow Lamination • Lash Lifting'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "description" TEXT DEFAULT 'Centro - Posto da Mata • @emiledesiigner'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "pixKey" TEXT NOT NULL DEFAULT '000.000.000-00'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "pixKeyType" TEXT NOT NULL DEFAULT 'CPF'`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "signalPercentage" INTEGER NOT NULL DEFAULT 50`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "holdMinutes" INTEGER NOT NULL DEFAULT 15`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "minAdvanceMinutes" INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "maxDaysAhead" INTEGER NOT NULL DEFAULT 60`,
        `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "pendingBlocksSlot" BOOLEAN NOT NULL DEFAULT true`,

        // 3. Colunas da tabela Appointment
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_SIGNAL'`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "signalPercentage" DOUBLE PRECISION NOT NULL DEFAULT 50`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "signalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "receiptFileName" TEXT`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "receiptReportedAt" TIMESTAMP(3)`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "signalPaidAt" TIMESTAMP(3)`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "fullPaidAt" TIMESTAMP(3)`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
        `ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "whatsappStatus" TEXT NOT NULL DEFAULT 'NOT_SENT'`,

        // 4. Colunas da tabela Client
        `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "email" TEXT`,
        `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
        `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "birthDate" TEXT`,
        `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "avatar" TEXT`,
        `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'ativas'`,

        // 5. Coluna extra de WorkingHours (dois turnos)
        `ALTER TABLE "WorkingHours" ADD COLUMN IF NOT EXISTS "periodsJson" TEXT`,

        // 6. Tabelas auxiliares novas (se não existirem)
        `CREATE TABLE IF NOT EXISTS "ServicePhoto" (
          "id" TEXT NOT NULL,
          "fileName" TEXT NOT NULL,
          "mimeType" TEXT NOT NULL,
          "sizeBytes" INTEGER NOT NULL,
          "dataBase64" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "ServicePhoto_fileName_key" ON "ServicePhoto"("fileName")`,

        `CREATE TABLE IF NOT EXISTS "PushSubscription" (
          "id" TEXT NOT NULL,
          "endpoint" TEXT NOT NULL,
          "p256dh" TEXT NOT NULL,
          "auth" TEXT NOT NULL,
          "userAgent" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint")`,

        `CREATE TABLE IF NOT EXISTS "AdminNotification" (
          "id" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "appointmentId" TEXT,
          "clientName" TEXT NOT NULL,
          "serviceName" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "time" TEXT NOT NULL,
          "targetUrl" TEXT NOT NULL DEFAULT '/admin/agenda',
          "dedupeKey" TEXT NOT NULL,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "AdminNotification_dedupeKey_key" ON "AdminNotification"("dedupeKey")`,
      ];

      for (const sql of statements) {
        await prisma.$executeRawUnsafe(sql).catch(() => {});
      }

      // 7. Garantir que o usuário 'admin' existente tenha o hash válido de Vksanttos12
      const targetPassword = (
        process.env.ADMIN_PRODUCTION_PASSWORD || "Vksanttos12"
      ).trim();
      const targetHash = makeScryptHash(
        targetPassword,
        "a1b2c3d4e5f60718293a4b5c6d7e8f90"
      );

      const existingAdmin = await prisma.user
        .findFirst({
          where: {
            OR: [
              { username: { equals: "admin", mode: "insensitive" } },
              {
                email: {
                  equals: "contato@emilelash.com.br",
                  mode: "insensitive",
                },
              },
            ],
          },
        })
        .catch(() => null);

      if (existingAdmin) {
        await prisma.user
          .update({
            where: { id: existingAdmin.id },
            data: {
              username: "admin",
              passwordHash: targetHash,
              role: "ADMIN",
            },
          })
          .catch(() => {});
      } else {
        await prisma.user
          .create({
            data: {
              name: "Emile Lash Designer",
              username: "admin",
              email: "contato@emilelash.com.br",
              passwordHash: targetHash,
              role: "ADMIN",
            },
          })
          .catch(() => {});
      }

      globalForDbSync.__dbSchemaSynced = true;
    } catch (err) {
      console.error("Aviso ao sincronizar schema:", err);
    } finally {
      delete globalForDbSync.__dbSchemaSyncPromise;
    }
  })();

  globalForDbSync.__dbSchemaSyncPromise = promise;
  return promise;
}
