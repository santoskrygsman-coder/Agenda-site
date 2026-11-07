-- Migration Reproduzível: Estrutura Inicial PostgreSQL (Supabase)
-- Compatível com Prisma ORM e boas práticas Supabase Postgres

-- CreateTable: User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Client
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "birthDate" TEXT,
    "avatar" TEXT,
    "category" TEXT NOT NULL DEFAULT 'ativas',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Service
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "image" TEXT NOT NULL DEFAULT '/images/service-classica.png',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requiresDeposit" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GalleryImage
CREATE TABLE IF NOT EXISTS "GalleryImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeature" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" TEXT,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Appointment
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_SIGNAL',
    "signalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "receiptFileName" TEXT,
    "receiptReportedAt" TIMESTAMP(3),
    "signalPaidAt" TIMESTAMP(3),
    "fullPaidAt" TIMESTAMP(3),
    "notes" TEXT,
    "whatsappStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkingHours
CREATE TABLE IF NOT EXISTS "WorkingHours" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BlockedDate
CREATE TABLE IF NOT EXISTS "BlockedDate" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Expense
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Materiais',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Settings
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL,
    "professionalName" TEXT NOT NULL DEFAULT 'Emile Lash Designer',
    "specialty" TEXT NOT NULL DEFAULT 'Cílios • Sobrancelha • Brow Lamination • Lash Lifting',
    "description" TEXT DEFAULT 'Centro - Posto da Mata • @emiledesiigner',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "pixKey" TEXT NOT NULL DEFAULT '000.000.000-00',
    "pixKeyType" TEXT NOT NULL DEFAULT 'CPF',
    "signalPercentage" INTEGER NOT NULL DEFAULT 50,
    "holdMinutes" INTEGER NOT NULL DEFAULT 15,
    "minAdvanceMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxDaysAhead" INTEGER NOT NULL DEFAULT 60,
    "pendingBlocksSlot" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_phone_key" ON "Client"("phone");
CREATE INDEX IF NOT EXISTS "Appointment_date_status_idx" ON "Appointment"("date", "status");
CREATE INDEX IF NOT EXISTS "Appointment_date_startTime_idx" ON "Appointment"("date", "startTime");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkingHours_weekday_key" ON "WorkingHours"("weekday");
CREATE INDEX IF NOT EXISTS "BlockedDate_date_idx" ON "BlockedDate"("date");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- Índice único parcial no PostgreSQL para impedir que dois agendamentos ativos (PENDING, CONFIRMED, COMPLETED)
-- comecem exatamente no mesmo dia e horário
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_active_date_startTime_unique"
ON "Appointment"("date", "startTime")
WHERE "status" IN ('PENDING', 'CONFIRMED', 'COMPLETED');

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GalleryImage_serviceId_fkey') THEN
        ALTER TABLE "GalleryImage"
        ADD CONSTRAINT "GalleryImage_serviceId_fkey"
        FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_clientId_fkey') THEN
        ALTER TABLE "Appointment"
        ADD CONSTRAINT "Appointment_clientId_fkey"
        FOREIGN KEY ("clientId") REFERENCES "Client"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_serviceId_fkey') THEN
        ALTER TABLE "Appointment"
        ADD CONSTRAINT "Appointment_serviceId_fkey"
        FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
