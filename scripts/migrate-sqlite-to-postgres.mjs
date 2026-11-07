import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  const isDryRun =
    process.argv.includes("--dry-run") ||
    process.argv.includes("--validate");

  const backupPath = path.join(
    process.cwd(),
    "backups",
    "sqlite-data-export.json"
  );
  const raw = await fs.readFile(backupPath, "utf-8");
  const backup = JSON.parse(raw);
  const { data } = backup;

  // Validação de integridade relacional do backup SQLite antes de qualquer gravação
  const clientIds = new Set((data.clients || []).map((c) => c.id));
  const serviceIds = new Set((data.services || []).map((s) => s.id));
  for (const a of data.appointments || []) {
    if (!clientIds.has(a.clientId)) {
      throw new Error(
        `Integridade violada: Appointment ${a.id} referencia clientId inexistente (${a.clientId}).`
      );
    }
    if (!serviceIds.has(a.serviceId)) {
      throw new Error(
        `Integridade violada: Appointment ${a.id} referencia serviceId inexistente (${a.serviceId}).`
      );
    }
  }
  for (const img of data.galleryImages || []) {
    if (img.serviceId && !serviceIds.has(img.serviceId)) {
      throw new Error(
        `Integridade violada: GalleryImage ${img.id} referencia serviceId inexistente (${img.serviceId}).`
      );
    }
  }

  if (isDryRun) {
    console.log(
      "✅ [DRY-RUN / VALIDAÇÃO] Backup SQLite validado com 100% de integridade relacional!"
    );
    console.log("📊 Contagens prontas para migração:", backup.counts);
    return;
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    console.error(
      "⚠️  ABORTADO: DATABASE_URL atual não aponta para um banco PostgreSQL (Supabase)."
    );
    console.error(
      "Configure DATABASE_URL e DIRECT_URL do Supabase no .env e execute `npm run db:use-postgres` antes de migrar."
    );
    process.exit(1);
  }

  // Regra de Segurança #4: Proibir a senha padrão admin123 em produção
  const prodPassword = (process.env.ADMIN_PRODUCTION_PASSWORD || "").trim();
  const prodEmail = (
    process.env.ADMIN_PRODUCTION_EMAIL || "contato@emilelash.com.br"
  )
    .trim()
    .toLowerCase();

  if (!prodPassword || prodPassword === "admin123" || prodPassword.length < 8) {
    console.error(
      "🔒 SEGURANÇA: Defina a variável ADMIN_PRODUCTION_PASSWORD (mínimo 8 caracteres e diferente de 'admin123') antes de migrar para o Supabase."
    );
    process.exit(1);
  }

  console.log("🚀 Iniciando migração controlada para Supabase PostgreSQL...");

  await prisma.$transaction(async (tx) => {
    // 1. Users (com senha forte de produção)
    for (const u of data.users || []) {
      const isDefaultAdmin = u.username === "admin";
      await tx.user.upsert({
        where: { id: u.id },
        update: {
          name: u.name,
          username: u.username,
          email: isDefaultAdmin ? prodEmail : u.email,
          passwordHash: isDefaultAdmin
            ? hashPassword(prodPassword)
            : u.passwordHash,
          role: u.role,
        },
        create: {
          id: u.id,
          name: u.name,
          username: u.username,
          email: isDefaultAdmin ? prodEmail : u.email,
          passwordHash: isDefaultAdmin
            ? hashPassword(prodPassword)
            : u.passwordHash,
          role: u.role,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    // 2. Settings
    for (const s of data.settings || []) {
      await tx.settings.upsert({
        where: { id: s.id },
        update: {
          professionalName: s.professionalName,
          specialty: s.specialty,
          description: s.description,
          whatsapp: s.whatsapp,
          pixKey: s.pixKey,
          pixKeyType: s.pixKeyType,
          signalPercentage: s.signalPercentage,
          holdMinutes: s.holdMinutes ?? 15,
          minAdvanceMinutes: s.minAdvanceMinutes,
          maxDaysAhead: s.maxDaysAhead,
          pendingBlocksSlot: s.pendingBlocksSlot,
        },
        create: {
          id: s.id,
          professionalName: s.professionalName,
          specialty: s.specialty,
          description: s.description,
          whatsapp: s.whatsapp,
          pixKey: s.pixKey,
          pixKeyType: s.pixKeyType,
          signalPercentage: s.signalPercentage,
          holdMinutes: s.holdMinutes ?? 15,
          minAdvanceMinutes: s.minAdvanceMinutes,
          maxDaysAhead: s.maxDaysAhead,
          pendingBlocksSlot: s.pendingBlocksSlot,
        },
      });
    }

    // 3. WorkingHours
    for (const wh of data.workingHours || []) {
      await tx.workingHours.upsert({
        where: { weekday: wh.weekday },
        update: {
          startTime: wh.startTime,
          endTime: wh.endTime,
          breakStart: wh.breakStart,
          breakEnd: wh.breakEnd,
          active: wh.active,
        },
        create: {
          id: wh.id,
          weekday: wh.weekday,
          startTime: wh.startTime,
          endTime: wh.endTime,
          breakStart: wh.breakStart,
          breakEnd: wh.breakEnd,
          active: wh.active,
        },
      });
    }

    // 4. Services
    for (const svc of data.services || []) {
      await tx.service.upsert({
        where: { id: svc.id },
        update: {
          name: svc.name,
          description: svc.description,
          price: svc.price,
          duration: svc.duration,
          image: svc.image,
          active: svc.active,
          requiresDeposit: svc.requiresDeposit,
          sortOrder: svc.sortOrder,
        },
        create: {
          id: svc.id,
          name: svc.name,
          description: svc.description,
          price: svc.price,
          duration: svc.duration,
          image: svc.image,
          active: svc.active,
          requiresDeposit: svc.requiresDeposit,
          sortOrder: svc.sortOrder,
          createdAt: new Date(svc.createdAt),
          updatedAt: new Date(svc.updatedAt),
        },
      });
    }

    // 5. GalleryImages
    for (const img of data.galleryImages || []) {
      await tx.galleryImage.upsert({
        where: { id: img.id },
        update: {
          url: img.url,
          type: img.type,
          order: img.order,
          isFeature: img.isFeature,
          serviceId: img.serviceId,
        },
        create: {
          id: img.id,
          url: img.url,
          type: img.type,
          order: img.order,
          isFeature: img.isFeature,
          serviceId: img.serviceId,
          createdAt: new Date(img.createdAt),
        },
      });
    }

    // 6. Clients
    for (const c of data.clients || []) {
      await tx.client.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          birthDate: c.birthDate,
          avatar: c.avatar,
          category: c.category,
        },
        create: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          birthDate: c.birthDate,
          avatar: c.avatar,
          category: c.category,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        },
      });
    }

    // 7. Appointments
    for (const a of data.appointments || []) {
      await tx.appointment.upsert({
        where: { id: a.id },
        update: {
          clientId: a.clientId,
          serviceId: a.serviceId,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          paymentStatus: a.paymentStatus,
          signalAmount: a.signalAmount,
          totalAmount: a.totalAmount,
          expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
          receiptUrl: a.receiptUrl ?? null,
          receiptFileName: a.receiptFileName ?? null,
          receiptReportedAt: a.receiptReportedAt
            ? new Date(a.receiptReportedAt)
            : null,
          signalPaidAt: a.signalPaidAt ? new Date(a.signalPaidAt) : null,
          fullPaidAt: a.fullPaidAt ? new Date(a.fullPaidAt) : null,
          notes: a.notes,
          whatsappStatus: a.whatsappStatus,
        },
        create: {
          id: a.id,
          clientId: a.clientId,
          serviceId: a.serviceId,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          paymentStatus: a.paymentStatus,
          signalAmount: a.signalAmount,
          totalAmount: a.totalAmount,
          expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
          receiptUrl: a.receiptUrl ?? null,
          receiptFileName: a.receiptFileName ?? null,
          receiptReportedAt: a.receiptReportedAt
            ? new Date(a.receiptReportedAt)
            : null,
          signalPaidAt: a.signalPaidAt ? new Date(a.signalPaidAt) : null,
          fullPaidAt: a.fullPaidAt ? new Date(a.fullPaidAt) : null,
          notes: a.notes,
          whatsappStatus: a.whatsappStatus,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        },
      });
    }

    // 8. BlockedDates
    for (const b of data.blockedDates || []) {
      await tx.blockedDate.upsert({
        where: { id: b.id },
        update: {
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason,
        },
        create: {
          id: b.id,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason,
        },
      });
    }

    // 9. Expenses
    for (const e of data.expenses || []) {
      await tx.expense.upsert({
        where: { id: e.id },
        update: {
          description: e.description,
          amount: e.amount,
          date: e.date,
          category: e.category,
        },
        create: {
          id: e.id,
          description: e.description,
          amount: e.amount,
          date: e.date,
          category: e.category,
          createdAt: new Date(e.createdAt),
        },
      });
    }
  });

  // Verificação pós-migração
  const destCounts = {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    services: await prisma.service.count(),
    galleryImages: await prisma.galleryImage.count(),
    appointments: await prisma.appointment.count(),
    workingHours: await prisma.workingHours.count(),
    blockedDates: await prisma.blockedDate.count(),
    expenses: await prisma.expense.count(),
    settings: await prisma.settings.count(),
  };

  console.log("✅ Migração para PostgreSQL concluída com sucesso!");
  console.log("📊 Contagem de registros no destino (PostgreSQL):", destCounts);
}

main()
  .catch((err) => {
    console.error("Erro na migração de dados:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
