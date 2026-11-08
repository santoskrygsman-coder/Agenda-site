-- ============================================================================
-- MIGRATION: 20261108_corrective_update
-- Objetivo:
-- 1. Adicionar depositPercentage em Service (percentual de sinal por serviço 1%..100%).
-- 2. Adicionar signalPercentage em Appointment (preservação histórica do % cobrado).
-- 3. Criar tabela ServicePhoto (armazenamento de fotos personalizadas no Supabase com exclusão sem órfãos).
-- 4. Criar tabelas PushSubscription e AdminNotification (Web Push VAPID + histórico/deduplicação).
-- 5. Habilitar RLS e revogar acesso público (anon/authenticated) nas novas tabelas.
-- ============================================================================

-- 1. Colunas de percentual do sinal em Service e Appointment
ALTER TABLE "public"."Service"
  ADD COLUMN IF NOT EXISTS "depositPercentage" DOUBLE PRECISION DEFAULT 50;

UPDATE "public"."Service"
  SET "depositPercentage" = 50
  WHERE "depositPercentage" IS NULL;

ALTER TABLE "public"."Appointment"
  ADD COLUMN IF NOT EXISTS "signalPercentage" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- 2. Tabela ServicePhoto (fotos de serviços no Supabase sem arquivos órfãos)
CREATE TABLE IF NOT EXISTS "public"."ServicePhoto" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "dataBase64" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServicePhoto_fileName_key"
  ON "public"."ServicePhoto"("fileName");

-- 3. Tabela PushSubscription (assinaturas Web Push VAPID dos dispositivos da profissional)
CREATE TABLE IF NOT EXISTS "public"."PushSubscription" (
  "id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
  ON "public"."PushSubscription"("endpoint");

-- 4. Tabela AdminNotification (eventos, deduplicação e leitura de notificações)
CREATE TABLE IF NOT EXISTS "public"."AdminNotification" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminNotification_dedupeKey_key"
  ON "public"."AdminNotification"("dedupeKey");

CREATE INDEX IF NOT EXISTS "AdminNotification_readAt_createdAt_idx"
  ON "public"."AdminNotification"("readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "AdminNotification_appointmentId_idx"
  ON "public"."AdminNotification"("appointmentId");

-- 5. Segurança RLS nas novas tabelas
ALTER TABLE "public"."ServicePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdminNotification" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."ServicePhoto" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."PushSubscription" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."AdminNotification" FROM anon, authenticated;

DROP POLICY IF EXISTS "service_role_full_access_service_photo" ON "public"."ServicePhoto";
CREATE POLICY "service_role_full_access_service_photo" ON "public"."ServicePhoto"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_push_subscription" ON "public"."PushSubscription";
CREATE POLICY "service_role_full_access_push_subscription" ON "public"."PushSubscription"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_admin_notification" ON "public"."AdminNotification";
CREATE POLICY "service_role_full_access_admin_notification" ON "public"."AdminNotification"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
