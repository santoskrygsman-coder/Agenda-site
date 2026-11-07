-- ============================================================================
-- POLÍTICAS DE SEGURANÇA RLS E STORAGE PARA SUPABASE (PRODUÇÃO)
-- ============================================================================
-- Arquitetura de Acesso:
-- 1. O backend Next.js (Netlify Functions) conecta-se ao PostgreSQL via Prisma
--    usando a role `postgres` (que possui atributo BYPASSRLS nativo no Supabase).
-- 2. A Data API pública do Supabase (PostgREST via roles `anon` e `authenticated`)
--    NÃO deve ter acesso direto a dados de clientes, agendamentos, usuários ou
--    financeiro.
-- 3. Ao habilitar RLS em todas as tabelas do schema `public` e revogar privilégios
--    diretos das roles `anon` e `authenticated`, bloqueamos 100% qualquer tentativa
--    de leitura ou escrita externa fora das Netlify Functions autenticadas.
-- ============================================================================

-- 1. Habilitar Row Level Security (RLS) em TODAS as tabelas do schema public
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GalleryImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WorkingHours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."BlockedDate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Settings" ENABLE ROW LEVEL SECURITY;

-- 2. Revogar acesso direto via PostgREST (anon / authenticated) às tabelas sensíveis
REVOKE ALL ON TABLE "public"."User" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."Client" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."Appointment" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."Expense" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."Settings" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."BlockedDate" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."WorkingHours" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."Service" FROM anon, authenticated;
REVOKE ALL ON TABLE "public"."GalleryImage" FROM anon, authenticated;

-- 3. Políticas explícitas para service_role (caso o backend utilize supabase-js com service_role)
DROP POLICY IF EXISTS "service_role_full_access_user" ON "public"."User";
CREATE POLICY "service_role_full_access_user" ON "public"."User"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_client" ON "public"."Client";
CREATE POLICY "service_role_full_access_client" ON "public"."Client"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_service" ON "public"."Service";
CREATE POLICY "service_role_full_access_service" ON "public"."Service"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_gallery" ON "public"."GalleryImage";
CREATE POLICY "service_role_full_access_gallery" ON "public"."GalleryImage"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_appointment" ON "public"."Appointment";
CREATE POLICY "service_role_full_access_appointment" ON "public"."Appointment"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_working_hours" ON "public"."WorkingHours";
CREATE POLICY "service_role_full_access_working_hours" ON "public"."WorkingHours"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_blocked_date" ON "public"."BlockedDate";
CREATE POLICY "service_role_full_access_blocked_date" ON "public"."BlockedDate"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_expense" ON "public"."Expense";
CREATE POLICY "service_role_full_access_expense" ON "public"."Expense"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_settings" ON "public"."Settings";
CREATE POLICY "service_role_full_access_settings" ON "public"."Settings"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. CONFIGURAÇÃO DO SUPABASE STORAGE (Bucket: service-photos)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  15728640, -- 15 MB para fotos em alta definição (HD)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública das fotos de procedimentos do catálogo para exibição no app
DROP POLICY IF EXISTS "public_read_service_photos" ON storage.objects;
CREATE POLICY "public_read_service_photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'service-photos');

-- Escrita/Upload e atualização restritos exclusivamente ao backend (service_role)
DROP POLICY IF EXISTS "service_role_manage_service_photos" ON storage.objects;
CREATE POLICY "service_role_manage_service_photos" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'service-photos')
  WITH CHECK (bucket_id = 'service-photos');
