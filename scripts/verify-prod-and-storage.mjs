import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const PROD_URL = "https://emile-lash-designer.netlify.app";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("=== 1. CONFIGURANDO BUCKET `service-photos` NO SUPABASE STORAGE VIA SQL ===");
  await prisma.$executeRawUnsafe(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'service-photos',
      'service-photos',
      true,
      10485760,
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  `);

  const buckets = await prisma.$queryRawUnsafe(`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets
    WHERE id = 'service-photos';
  `);
  console.log("✔ Bucket configurado no Supabase:", buckets[0]);

  console.log("\n=== 2. VERIFICANDO ENDPOINTS EM PRODUÇÃO NA NETLIFY ===");

  // 2.1 Verificar /api/services em produção
  const svcRes = await fetch(`${PROD_URL}/api/services`);
  assert.equal(svcRes.status, 200, "GET /api/services em produção deve retornar 200");
  const services = await svcRes.json();
  assert.ok(Array.isArray(services) && services.length > 0, "Deve retornar lista de serviços");
  assert.ok(
    "depositPercentage" in services[0] && "requiresDeposit" in services[0],
    "Serviços em produção devem conter depositPercentage e requiresDeposit"
  );
  console.log(`✔ GET ${PROD_URL}/api/services OK (${services.length} serviços ativos com depositPercentage)`);

  // 2.2 Verificar /api/notifications/subscribe (VAPID publicKey em produção)
  const vapidRes = await fetch(`${PROD_URL}/api/notifications/subscribe`);
  assert.equal(vapidRes.status, 200);
  const vapidData = await vapidRes.json();
  assert.ok(vapidData.publicKey, "VAPID publicKey deve estar ativa em produção na Netlify");
  console.log(`✔ GET ${PROD_URL}/api/notifications/subscribe OK (publicKey: ${vapidData.publicKey.slice(0, 18)}...)`);

  // 2.3 Verificar /sw.js em produção
  const swRes = await fetch(`${PROD_URL}/sw.js`);
  assert.equal(swRes.status, 200);
  const swText = await swRes.text();
  assert.ok(
    swText.includes("showNotification") && swText.includes("notificationclick"),
    "Service Worker em produção deve conter handlers de push e notificationclick"
  );
  console.log(`✔ GET ${PROD_URL}/sw.js OK (Service Worker Web Push ativo)`);

  // 2.4 Testar upload e exclusão real de foto personalizada diretamente na Netlify em produção
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    token: {
      id: adminUser.id,
      sub: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: "ADMIN",
    },
  });
  const cookieHeader = `__Secure-next-auth.session-token=${token}; next-auth.session-token=${token}`;

  const tinyPngDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  const prodUploadRes = await fetch(`${PROD_URL}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ dataUrl: tinyPngDataUrl }),
  });
  assert.equal(prodUploadRes.status, 201, "POST /api/upload na Netlify deve retornar 201");
  const prodUploaded = await prodUploadRes.json();
  console.log(`✔ POST ${PROD_URL}/api/upload OK -> ${prodUploaded.url}`);

  // Verificar leitura pública da foto recém-enviada na Netlify
  const prodPhotoGet = await fetch(`${PROD_URL}${prodUploaded.url}`);
  assert.equal(prodPhotoGet.status, 200, "Foto enviada deve abrir publicamente com 200 OK na Netlify");
  console.log(`✔ GET ${PROD_URL}${prodUploaded.url} OK (200 image/png)`);

  // Limpar a foto de teste sem deixar órfãos
  const prodDelRes = await fetch(`${PROD_URL}/api/upload`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ url: prodUploaded.url }),
  });
  assert.equal(prodDelRes.status, 200, "DELETE /api/upload na Netlify deve retornar 200");
  console.log("✔ DELETE /api/upload OK (foto de teste removida sem deixar órfãos)");

  console.log("\n=== TUDO CONFIGURADO E VALIDADO EM PRODUÇÃO COM SUCESSO! ===");
}

main()
  .catch((err) => {
    console.error("Erro na verificação de produção:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
