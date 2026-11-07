import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Migra arquivos existentes em public/uploads/services/ para o Supabase Storage
 * sem excluir os arquivos locais e atualizando referências de serviços caso existam.
 * Imagens estáticas padrão (/images/*) permanecem intactas.
 */
async function main() {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "service-photos";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "⚠️  Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env para migrar uploads para o Supabase Storage."
    );
    process.exit(1);
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "services");
  let files = [];
  try {
    files = await fs.readdir(uploadsDir);
  } catch {
    console.log("ℹ️  Nenhuma pasta public/uploads/services encontrada.");
    return;
  }

  const imageFiles = files.filter((f) =>
    Object.keys(MIME_BY_EXT).includes(path.extname(f).toLowerCase())
  );

  console.log(
    `📦 Encontrados ${imageFiles.length} arquivos locais em public/uploads/services.`
  );

  for (const fileName of imageFiles) {
    const fullPath = path.join(uploadsDir, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "image/jpeg";
    const buffer = await fs.readFile(fullPath);

    const endpoint = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`❌ Erro ao enviar ${fileName}: ${res.status} ${errText}`);
      continue;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
    const localRelativeUrl = `/uploads/services/${fileName}`;

    // Atualizar serviços que apontavam para o caminho local /uploads/services/...
    const updatedServices = await prisma.service.updateMany({
      where: { image: localRelativeUrl },
      data: { image: publicUrl },
    });

    await prisma.galleryImage.updateMany({
      where: { url: localRelativeUrl },
      data: { url: publicUrl },
    });

    console.log(
      `✅ ${fileName} enviado -> ${publicUrl} (${updatedServices.count} serviços atualizados; arquivo local preservado)`
    );
  }
}

main()
  .catch((err) => {
    console.error("Erro na migração de uploads:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
