import { PrismaClient } from "@prisma/client";

// Utiliza DIRECT_URL (Session mode porta 5432) para comandos DDL e políticas RLS
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const TABLES = [
  "User",
  "Client",
  "Service",
  "GalleryImage",
  "Appointment",
  "WorkingHours",
  "BlockedDate",
  "Expense",
  "Settings",
];

async function main() {
  console.log("🔐 Aplicando índice de unicidade parcial, RLS e Storage no Supabase...");

  // 1. Índice único parcial no PostgreSQL para impedir reservas ativas duplicadas no mesmo dia e horário
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_active_date_startTime_unique"
    ON "public"."Appointment"("date", "startTime")
    WHERE "status" IN ('PENDING', 'CONFIRMED', 'COMPLETED');
  `);

  // 2. Habilitar RLS, revogar acesso público (anon/authenticated) e criar política para service_role em cada tabela
  for (const table of TABLES) {
    const policyName = `service_role_full_access_${table.toLowerCase()}`;
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;`
    );
    await prisma.$executeRawUnsafe(
      `REVOKE ALL ON TABLE "public"."${table}" FROM anon, authenticated;`
    );
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS "${policyName}" ON "public"."${table}";`
    );
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${policyName}" ON "public"."${table}"
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
  }

  // 3. Configurar bucket público 'service-photos' no Supabase Storage (se o schema storage existir)
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'service-photos',
        'service-photos',
        true,
        15728640,
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
      )
      ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
    `);

    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "public_read_service_photos" ON storage.objects;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "public_read_service_photos" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'service-photos');
    `);

    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "service_role_manage_service_photos" ON storage.objects;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "service_role_manage_service_photos" ON storage.objects
      FOR ALL TO service_role
      USING (bucket_id = 'service-photos')
      WITH CHECK (bucket_id = 'service-photos');
    `);
    console.log("📦 Bucket 'service-photos' configurado no Supabase Storage.");
  } catch (storageErr) {
    console.warn(
      "ℹ️  Aviso ao configurar políticas de storage.objects (pode requerer owner supabase_storage_admin):",
      storageErr instanceof Error ? storageErr.message : storageErr
    );
  }

  // 4. Auditar status do RLS nas tabelas do schema public
  const rlsStatus = await prisma.$queryRawUnsafe(`
    SELECT relname AS table_name, relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY relname;
  `);

  console.log("✅ RLS habilitado em todas as tabelas do Supabase:", rlsStatus);
}

main()
  .catch((err) => {
    console.error("Erro ao aplicar segurança no Supabase:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
