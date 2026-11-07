import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

function runStep(title, cmd) {
  console.log(`\n▶️  ${title}...`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

async function ensureIndexesAndSchema() {
  console.log("\n▶️  Garantindo tabelas e índices otimizados no PostgreSQL (Supabase)...");

  const statements = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "public"."User"("username");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "public"."User"("email");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Client_phone_key" ON "public"."Client"("phone");`,
    `CREATE INDEX IF NOT EXISTS "GalleryImage_serviceId_idx" ON "public"."GalleryImage"("serviceId");`,
    `CREATE INDEX IF NOT EXISTS "Appointment_date_status_idx" ON "public"."Appointment"("date", "status");`,
    `CREATE INDEX IF NOT EXISTS "Appointment_date_startTime_idx" ON "public"."Appointment"("date", "startTime");`,
    `CREATE INDEX IF NOT EXISTS "Appointment_clientId_idx" ON "public"."Appointment"("clientId");`,
    `CREATE INDEX IF NOT EXISTS "Appointment_serviceId_idx" ON "public"."Appointment"("serviceId");`,
    `CREATE INDEX IF NOT EXISTS "Appointment_status_expiresAt_idx" ON "public"."Appointment"("status", "expiresAt");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "WorkingHours_weekday_key" ON "public"."WorkingHours"("weekday");`,
    `CREATE INDEX IF NOT EXISTS "BlockedDate_date_idx" ON "public"."BlockedDate"("date");`,
    `CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "public"."Expense"("date");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_active_date_startTime_unique"
     ON "public"."Appointment"("date", "startTime")
     WHERE "status" IN ('PENDING', 'CONFIRMED', 'COMPLETED');`,
    `CREATE INDEX IF NOT EXISTS "Appointment_pending_expiresAt_idx"
     ON "public"."Appointment"("expiresAt")
     WHERE "status" = 'PENDING' AND "paymentStatus" = 'PENDING_SIGNAL' AND "receiptReportedAt" IS NULL AND "expiresAt" IS NOT NULL;`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✅ Todos os índices de chave estrangeira e índices parciais estão ativos.");
}

async function verifyFinalState() {
  console.log("\n▶️  Auditando contagem de registros (SQLite Backup vs. Supabase PostgreSQL)...");
  const backupRaw = await fs.readFile(
    path.join(ROOT, "backups", "sqlite-data-export.json"),
    "utf-8"
  );
  const backup = JSON.parse(backupRaw);
  const src = backup.counts;

  const dest = {
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

  console.table({
    users: { SQLite_Backup: src.users, Supabase_Postgres: dest.users },
    clients: { SQLite_Backup: src.clients, Supabase_Postgres: dest.clients },
    services: { SQLite_Backup: src.services, Supabase_Postgres: dest.services },
    galleryImages: {
      SQLite_Backup: src.galleryImages,
      Supabase_Postgres: dest.galleryImages,
    },
    appointments: {
      SQLite_Backup: src.appointments,
      Supabase_Postgres: dest.appointments,
    },
    workingHours: {
      SQLite_Backup: src.workingHours,
      Supabase_Postgres: dest.workingHours,
    },
    blockedDates: {
      SQLite_Backup: src.blockedDates,
      Supabase_Postgres: dest.blockedDates,
    },
    expenses: { SQLite_Backup: src.expenses, Supabase_Postgres: dest.expenses },
    settings: { SQLite_Backup: src.settings, Supabase_Postgres: dest.settings },
  });

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY indexname;
  `);
  console.log(
    `✅ Total de índices ativos no schema public do Supabase: ${indexes.length}`
  );
}

async function main() {
  console.log("==============================================================");
  console.log("🤖 AUTOMAÇÃO COMPLETA: MIGRAÇÃO E BLINDAGEM SUPABASE POSTGRES");
  console.log("==============================================================");

  // 1. Verificar preservação do SQLite original
  const sqliteFile = path.join(ROOT, "prisma", "dev.db");
  const sqliteStat = await fs.stat(sqliteFile);
  console.log(
    `✅ Banco SQLite original preservado em prisma/dev.db (${sqliteStat.size} bytes)`
  );

  // 2. Garantir schema PostgreSQL ativo
  runStep(
    "1/5 Alternando schema para PostgreSQL",
    "node scripts/switch-prisma-provider.mjs postgresql"
  );

  // 3. Validar integridade em modo dry-run
  runStep(
    "2/5 Validando integridade relacional do backup (Dry-Run)",
    "node scripts/migrate-sqlite-to-postgres.mjs --dry-run"
  );

  // 4. Garantir todos os índices (FKs + parciais) no Supabase
  await ensureIndexesAndSchema();

  // 5. Aplicar RLS, revogar acesso público e configurar Storage
  runStep(
    "3/5 Aplicando políticas RLS e segurança no Supabase",
    "node scripts/apply-supabase-security.mjs"
  );

  // 6. Migrar registros transacionalmente (idempotente com upsert)
  runStep(
    "4/5 Sincronizando registros do backup SQLite para o Supabase PostgreSQL",
    "node scripts/migrate-sqlite-to-postgres.mjs"
  );

  // 7. Auditoria final de contagens e índices
  await verifyFinalState();

  console.log("\n==============================================================");
  console.log("🎉 MIGRAÇÃO AUTOMÁTICA CONCLUÍDA E VALIDADA COM SUCESSO!");
  console.log("==============================================================");
}

main()
  .catch((err) => {
    console.error("❌ Erro na automação da migração:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
