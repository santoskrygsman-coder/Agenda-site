import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const BASE_URL = "http://localhost:3000";

const prismaPooled = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const prismaDirect = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

function maskName(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p, idx) => (idx === 0 ? p : `${p[0]}***`))
    .join(" ");
}

function maskPhone(phone) {
  if (!phone) return "";
  const d = String(phone).replace(/\D/g, "");
  if (d.length < 6) return "***";
  return `${d.slice(0, 4)}*****${d.slice(-4)}`;
}

async function main() {
  console.log("=================================================================");
  console.log("🔍 AUDITORIA PÓS-MIGRAÇÃO: SQLITE vs. SUPABASE POSTGRESQL");
  console.log("=================================================================\n");

  const backupRaw = await fs.readFile(
    path.join(ROOT, "backups", "sqlite-data-export.json"),
    "utf-8"
  );
  const sqliteBackup = JSON.parse(backupRaw);
  const src = sqliteBackup.data;

  // ---------------------------------------------------------------------------
  // 1. INVESTIGAR DIVERGÊNCIAS (Client: 2 vs 3 | BlockedDate: 0 vs 3)
  // ---------------------------------------------------------------------------
  console.log("### 1. INVESTIGAÇÃO DE DIVERGÊNCIAS (Client & BlockedDate)");

  const pgClients = await prismaDirect.client.findMany({
    include: {
      appointments: {
        select: { id: true, date: true, startTime: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const sqliteClientIds = new Set(src.clients.map((c) => c.id));
  console.log("\n[1A] Registros na tabela Client no Supabase PostgreSQL:");
  for (const c of pgClients) {
    const inSqlite = sqliteClientIds.has(c.id);
    console.log({
      id: c.id,
      inSqliteBackup: inSqlite,
      maskedName: maskName(c.name),
      maskedPhone: maskPhone(c.phone),
      category: c.category,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      appointmentsCount: c.appointments.length,
      appointments: c.appointments,
    });
  }

  const pgBlockedDates = await prismaDirect.blockedDate.findMany({
    orderBy: { date: "asc" },
  });
  const sqliteBlockedIds = new Set((src.blockedDates || []).map((b) => b.id));
  console.log("\n[1B] Registros na tabela BlockedDate no Supabase PostgreSQL:");
  for (const b of pgBlockedDates) {
    console.log({
      id: b.id,
      inSqliteBackup: sqliteBlockedIds.has(b.id),
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason,
    });
  }

  // ---------------------------------------------------------------------------
  // 2. VALIDAR INTEGRIDADE CAMPO A CAMPO (SQLite Backup vs. Supabase)
  // ---------------------------------------------------------------------------
  console.log("\n### 2. VALIDAÇÃO DE INTEGRIDADE CAMPO A CAMPO");

  // 2.1 Users
  const pgUsers = await prismaDirect.user.findMany();
  for (const su of src.users) {
    const pu = pgUsers.find((u) => u.id === su.id);
    const [salt, key] = (pu?.passwordHash || "").split(":");
    console.log("[2.1 User]", {
      id: su.id,
      existsInPostgres: Boolean(pu),
      usernameMatch: pu?.username === su.username,
      roleMatch: pu?.role === su.role,
      emailInSqlite: su.email,
      emailInPostgres: pu?.email,
      passwordHashUpdatedFromDefault: pu?.passwordHash !== su.passwordHash,
      passwordHashValidScryptFormat:
        Boolean(salt && salt.length === 32 && key && key.length === 128),
      createdAtMatch:
        pu?.createdAt.toISOString() === new Date(su.createdAt).toISOString(),
    });
  }

  // 2.2 Services (10 registros)
  const pgServices = await prismaDirect.service.findMany({
    orderBy: { sortOrder: "asc" },
  });
  let serviceMismatches = [];
  for (const ss of src.services) {
    const ps = pgServices.find((s) => s.id === ss.id);
    if (!ps) {
      serviceMismatches.push({ id: ss.id, error: "Ausente no Postgres" });
      continue;
    }
    const diffs = {};
    for (const k of [
      "name",
      "description",
      "price",
      "duration",
      "image",
      "active",
      "requiresDeposit",
      "sortOrder",
    ]) {
      if (ps[k] !== ss[k]) {
        diffs[k] = { sqlite: ss[k], postgres: ps[k] };
      }
    }
    if (Object.keys(diffs).length > 0) {
      serviceMismatches.push({ id: ss.id, name: ss.name, diffs });
    }
  }
  console.log("[2.2 Services]", {
    sqliteCount: src.services.length,
    postgresCount: pgServices.length,
    exactFieldMatches: src.services.length - serviceMismatches.length,
    mismatches: serviceMismatches,
  });

  // 2.3 WorkingHours (7 registros)
  const pgWh = await prismaDirect.workingHours.findMany({
    orderBy: { weekday: "asc" },
  });
  let whDiffs = [];
  for (const swh of src.workingHours) {
    const pwh = pgWh.find((w) => w.weekday === swh.weekday);
    if (!pwh) {
      whDiffs.push({ weekday: swh.weekday, error: "Ausente" });
      continue;
    }
    const d = {};
    for (const k of ["id", "startTime", "endTime", "breakStart", "breakEnd", "active"]) {
      if (pwh[k] !== swh[k]) {
        d[k] = { sqlite: swh[k], postgres: pwh[k] };
      }
    }
    if (Object.keys(d).length > 0) {
      whDiffs.push({ weekday: swh.weekday, diffs: d });
    }
  }
  console.log("[2.3 WorkingHours]", {
    sqliteCount: src.workingHours.length,
    postgresCount: pgWh.length,
    exactMatches: src.workingHours.length - whDiffs.length,
    diffs: whDiffs,
  });

  // 2.4 Appointments & Foreign Keys
  const pgAppts = await prismaDirect.appointment.findMany({
    include: { client: true, service: true },
  });
  for (const sa of src.appointments) {
    const pa = pgAppts.find((a) => a.id === sa.id);
    console.log("[2.4 Appointment]", {
      id: sa.id,
      existsInPostgres: Boolean(pa),
      clientIdMatch: pa?.clientId === sa.clientId,
      clientFkResolved: Boolean(pa?.client),
      serviceIdMatch: pa?.serviceId === sa.serviceId,
      serviceFkResolved: Boolean(pa?.service),
      dateMatch: pa?.date === sa.date,
      startTimeMatch: pa?.startTime === sa.startTime,
      endTimeMatch: pa?.endTime === sa.endTime,
      statusMatch: pa?.status === sa.status,
      paymentStatusMatch: pa?.paymentStatus === sa.paymentStatus,
      signalAmountMatch: pa?.signalAmount === sa.signalAmount,
      totalAmountMatch: pa?.totalAmount === sa.totalAmount,
      expiresAtMatch:
        pa?.expiresAt?.toISOString() === new Date(sa.expiresAt).toISOString(),
    });
  }

  // 2.5 Settings
  const pgSettings = await prismaDirect.settings.findMany();
  for (const sset of src.settings) {
    const pset = pgSettings.find((s) => s.id === sset.id);
    const diffs = {};
    if (pset) {
      for (const k of Object.keys(sset)) {
        if (pset[k] !== sset[k]) {
          diffs[k] = { sqlite: sset[k], postgres: pset[k] };
        }
      }
    }
    console.log("[2.5 Settings]", {
      id: sset.id,
      existsInPostgres: Boolean(pset),
      diffs,
    });
  }

  // ---------------------------------------------------------------------------
  // 3. AUDITAR SEGURANÇA RLS DIRETAMENTE NO POSTGRESQL
  // ---------------------------------------------------------------------------
  console.log("\n### 3. AUDITORIA DE SEGURANÇA RLS E PRIVILÉGIOS NO POSTGRESQL");

  const rlsTables = await prismaDirect.$queryRawUnsafe(`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced,
      has_table_privilege('anon', 'public."' || c.relname || '"', 'SELECT') AS anon_select,
      has_table_privilege('anon', 'public."' || c.relname || '"', 'INSERT') AS anon_insert,
      has_table_privilege('anon', 'public."' || c.relname || '"', 'UPDATE') AS anon_update,
      has_table_privilege('anon', 'public."' || c.relname || '"', 'DELETE') AS anon_delete,
      has_table_privilege('authenticated', 'public."' || c.relname || '"', 'SELECT') AS auth_select,
      has_table_privilege('authenticated', 'public."' || c.relname || '"', 'INSERT') AS auth_insert,
      has_table_privilege('authenticated', 'public."' || c.relname || '"', 'UPDATE') AS auth_update,
      has_table_privilege('authenticated', 'public."' || c.relname || '"', 'DELETE') AS auth_delete
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);
  console.log("[3.1 Status RLS e Permissões de anon / authenticated]:");
  console.table(rlsTables);

  const policies = await prismaDirect.$queryRawUnsafe(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  console.log("[3.2 Políticas RLS ativas em pg_policies]:");
  console.table(policies);

  const prismaRoleInfo = await prismaDirect.$queryRawUnsafe(`
    SELECT
      current_user AS connected_role,
      session_user AS session_role,
      r.rolsuper AS is_superuser,
      r.rolbypassrls AS has_bypassrls
    FROM pg_roles r
    WHERE r.rolname = current_user;
  `);
  console.log("[3.3 Role utilizada pelo Prisma]:", prismaRoleInfo);

  // ---------------------------------------------------------------------------
  // 4. AUDITAR PREVENÇÃO DE CONFLITOS E ÍNDICE PARCIAL
  // ---------------------------------------------------------------------------
  console.log("\n### 4. AUDITORIA DE PREVENÇÃO DE CONFLITOS (ÍNDICE PARCIAL + CONCORRÊNCIA)");

  const indexDef = await prismaDirect.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'Appointment_active_date_startTime_unique',
        'Appointment_pending_expiresAt_idx',
        'Appointment_clientId_idx',
        'Appointment_serviceId_idx'
      )
    ORDER BY indexname;
  `);
  console.log("[4.1 Definição exata dos índices no PostgreSQL]:", indexDef);

  // ---------------------------------------------------------------------------
  // 5. TESTAR CONEXÃO E CONCORRÊNCIA NA APLICAÇÃO (COM LIMPEZA SEGURA)
  // ---------------------------------------------------------------------------
  console.log("\n### 5. TESTE CONTROLADO DE CONEXÃO, LEITURA, CONCORRÊNCIA E LIMPEZA");

  // 5.1 Teste direto no pooler (porta 6543) vs direto (porta 5432)
  const pooledPing = await prismaPooled.$queryRaw`SELECT 1 AS ok`;
  const directPing = await prismaDirect.$queryRaw`SELECT 1 AS ok`;
  console.log("[5.1 Conexão Prisma]:", {
    pooled6543: pooledPing[0]?.ok === 1,
    direct5432: directPing[0]?.ok === 1,
  });

  // 5.2 Leituras via API da aplicação
  const [svcRes, whRes, availRes] = await Promise.all([
    fetch(`${BASE_URL}/api/services`),
    fetch(`${BASE_URL}/api/working-hours`),
    fetch(`${BASE_URL}/api/availability?date=2028-11-20`),
  ]);
  const svcList = await svcRes.json();
  const whList = await whRes.json();
  const availData = await availRes.json();

  console.log("[5.2 Leituras da Aplicação]:", {
    servicesHttp: svcRes.status,
    servicesCount: svcList.length,
    workingHoursHttp: whRes.status,
    workingHoursCount: whList.length,
    availabilityHttp: availRes.status,
    availableSlotsCount: availData.times?.length || 0,
  });

  // 5.3 Teste de Concorrência Real (2 clientes clicando exatamente no mesmo milissegundo para 2028-11-20 às 14:00)
  const testDate = "2028-11-20"; // Segunda-feira futura isolada
  const testServiceId = svcList[0].id;
  const createdTestApptIds = [];
  const createdTestClientIds = new Set();

  try {
    const payloadA = {
      serviceId: testServiceId,
      date: testDate,
      time: "14:00",
      name: "Teste Concorrencia Alfa",
      phone: "(73) 99100-0001",
      acceptedPolicies: true,
    };
    const payloadB = {
      serviceId: testServiceId,
      date: testDate,
      time: "14:00",
      name: "Teste Concorrencia Beta",
      phone: "(73) 99100-0002",
      acceptedPolicies: true,
    };

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadA),
      }),
      fetch(`${BASE_URL}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadB),
      }),
    ]);

    const bodyA = await resA.json();
    const bodyB = await resB.json();
    if (bodyA?.id) createdTestApptIds.push(bodyA.id);
    if (bodyB?.id) createdTestApptIds.push(bodyB.id);
    if (bodyA?.clientId) createdTestClientIds.add(bodyA.clientId);
    if (bodyB?.clientId) createdTestClientIds.add(bodyB.clientId);

    const statuses = [resA.status, resB.status].sort();
    console.log("[5.3 Teste de Duas Requisições Simultâneas no Mesmo Horário (14:00)]:", {
      httpStatuses: statuses,
      exactlyOneCreatedAndOneConflict:
        statuses[0] === 201 && statuses[1] === 409,
    });

    // 5.4 Teste de Conflito de Intervalo Parcial (serviço de 90min às 14:00 ocupa até 15:30; tentar agendar às 15:00 deve retornar 409)
    const resOverlap = await fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: testServiceId,
        date: testDate,
        time: "15:00",
        name: "Teste Concorrencia Beta",
        phone: "(73) 99100-0002",
        acceptedPolicies: true,
      }),
    });
    const bodyOverlap = await resOverlap.json();
    if (bodyOverlap?.id) createdTestApptIds.push(bodyOverlap.id);
    if (bodyOverlap?.clientId) createdTestClientIds.add(bodyOverlap.clientId);

    console.log("[5.4 Teste de Sobreposição de Duração (14:00-15:30 bloqueia 15:00)]:", {
      httpStatus: resOverlap.status,
      blockedCorrectly: resOverlap.status === 409,
    });

    // 5.5 Teste de Cancelamento Liberando o Horário (Status CANCELLED no índice parcial)
    const winnerId = createdTestApptIds[0];
    await prismaDirect.appointment.update({
      where: { id: winnerId },
      data: { status: "CANCELLED" },
    });

    const resAfterCancel = await fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadB),
    });
    const bodyAfterCancel = await resAfterCancel.json();
    if (bodyAfterCancel?.id) createdTestApptIds.push(bodyAfterCancel.id);
    if (bodyAfterCancel?.clientId) createdTestClientIds.add(bodyAfterCancel.clientId);

    console.log("[5.5 Teste de Liberação de Horário Após Cancelamento (CANCELLED)]:", {
      httpStatusAfterCancel: resAfterCancel.status,
      rebookedSuccessfully: resAfterCancel.status === 201,
    });
  } finally {
    // Limpeza estrita APENAS dos registros temporários criados neste teste (2028-11-20)
    if (createdTestApptIds.length > 0) {
      await prismaDirect.appointment.deleteMany({
        where: { id: { in: createdTestApptIds } },
      });
    }
    const testPhones = ["5573991000001", "5573991000002"];
    await prismaDirect.client.deleteMany({
      where: { phone: { in: testPhones } },
    });
    console.log("[5.6 Limpeza dos registros temporários de teste concluída com sucesso]");
  }
}

main()
  .catch((err) => {
    console.error("Erro na auditoria pós-migração:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaPooled.$disconnect();
    await prismaDirect.$disconnect();
  });
