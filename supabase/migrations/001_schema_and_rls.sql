-- Migração PostgreSQL / Supabase com Row Level Security (RLS)
-- Sistema de Agendamento Mobile-Only para Estética de Cílios

CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "duration" INTEGER NOT NULL,
  "image" TEXT NOT NULL DEFAULT '/images/service-classica.png',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "requiresDeposit" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Client" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "notes" TEXT,
  "birthDate" TEXT,
  "avatar" TEXT,
  "category" TEXT NOT NULL DEFAULT 'ativas',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE,
  "serviceId" TEXT NOT NULL REFERENCES "Service"("id"),
  "date" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_SIGNAL',
  "signalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "receiptReportedAt" TIMESTAMPTZ,
  "signalPaidAt" TIMESTAMPTZ,
  "fullPaidAt" TIMESTAMPTZ,
  "notes" TEXT,
  "whatsappStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Appointment_date_status_idx" ON "Appointment"("date", "status");

CREATE TABLE IF NOT EXISTS "WorkingHours" (
  "id" TEXT PRIMARY KEY,
  "weekday" INTEGER NOT NULL UNIQUE,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "breakStart" TEXT,
  "breakEnd" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "BlockedDate" (
  "id" TEXT PRIMARY KEY,
  "date" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "reason" TEXT
);

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT PRIMARY KEY,
  "description" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "date" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Materiais',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ativar Row Level Security (RLS) em todas as tabelas
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkingHours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlockedDate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS):
-- 1. Serviços ativos e horários de funcionamento podem ser lidos publicamente
CREATE POLICY "Public read active services" ON "Service"
  FOR SELECT USING ("active" = true OR auth.role() = 'authenticated');

CREATE POLICY "Admin full access services" ON "Service"
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read working hours" ON "WorkingHours"
  FOR SELECT USING (true);

CREATE POLICY "Admin full access working hours" ON "WorkingHours"
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. Dados sensíveis (Clientes, Agendamentos, Despesas) restritos exclusivamente à profissional autenticada
CREATE POLICY "Admin only clients" ON "Client"
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin only appointments" ON "Appointment"
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin only expenses" ON "Expense"
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin only blocked dates" ON "BlockedDate"
  FOR ALL USING (auth.role() = 'authenticated');
