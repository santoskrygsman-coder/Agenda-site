import { prisma } from "@/lib/prisma";

const BUCKET_NAME = "service-photos";

function getSupabaseServerCredentials(): {
  supabaseUrl: string;
  serviceRoleKey: string;
} | null {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    serviceRoleKey.includes("SUA_SERVICE_ROLE_KEY")
  ) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

/**
 * Extrai o fileName gerenciado caso a URL pertença ao bucket `service-photos`
 * do Supabase Storage ou à rota `/api/upload/file/[fileName]`.
 * Retorna `null` para imagens padrão do catálogo (`/servicos/...`).
 */
export function extractManagedPhotoFileName(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  const storagePrefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const storageIdx = trimmed.indexOf(storagePrefix);
  if (storageIdx !== -1) {
    const rawName = trimmed
      .slice(storageIdx + storagePrefix.length)
      .split("?")[0];
    return sanitizeFileName(rawName);
  }

  const apiPrefix = "/api/upload/file/";
  const apiIdx = trimmed.indexOf(apiPrefix);
  if (apiIdx !== -1) {
    const rawName = trimmed.slice(apiIdx + apiPrefix.length).split("?")[0];
    return sanitizeFileName(rawName);
  }

  return null;
}

function sanitizeFileName(raw: string): string | null {
  const decoded = decodeURIComponent(raw || "").trim();
  if (!decoded || decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(decoded)) {
    return null;
  }
  return decoded;
}

/**
 * Faz upload seguro da fotografia personalizada do serviço para o Supabase
 * (Bucket `service-photos` quando SUPABASE_SERVICE_ROLE_KEY está configurada +
 * persistência gerenciada em `ServicePhoto` no Supabase PostgreSQL para entrega
 * serverless imutável na Netlify sem jamais depender de `public/uploads`).
 */
export async function uploadServicePhoto(params: {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  previousUrl?: string | null;
}): Promise<{
  url: string;
  fileName: string;
  storage: "supabase-storage" | "supabase-db";
}> {
  const { buffer, mimeType, ext, previousUrl } = params;

  if (previousUrl) {
    await deleteStoredServicePhoto(previousUrl).catch(() => {});
  }

  const fileName = `servico-hd-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  // Salva no Supabase PostgreSQL (tabela ServicePhoto com RLS ativa)
  await prisma.servicePhoto.create({
    data: {
      fileName,
      mimeType,
      sizeBytes: buffer.byteLength,
      dataBase64: buffer.toString("base64"),
    },
  });

  // Se SUPABASE_SERVICE_ROLE_KEY estiver configurada no servidor, envia também para o bucket `service-photos`
  const creds = getSupabaseServerCredentials();
  if (creds) {
    try {
      const uploadEndpoint = `${creds.supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${fileName}`;
      const uploadRes = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.serviceRoleKey}`,
          apikey: creds.serviceRoleKey,
          "Content-Type": mimeType,
          "x-upsert": "true",
          "Cache-Control": "max-age=31536000",
        },
        body: new Uint8Array(buffer),
      });

      if (uploadRes.ok) {
        const publicUrl = `${creds.supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
        return {
          url: publicUrl,
          fileName,
          storage: "supabase-storage",
        };
      }
    } catch (err) {
      console.warn(
        "Aviso: falha ao gravar diretamente no bucket service-photos, usando URL gerenciada do Supabase PostgreSQL:",
        err
      );
    }
  }

  return {
    url: `/api/upload/file/${fileName}`,
    fileName,
    storage: "supabase-db",
  };
}

/**
 * Remove a fotografia personalizada tanto do bucket `service-photos` do Supabase Storage
 * quanto da tabela `ServicePhoto` no PostgreSQL, impedindo arquivos órfãos quando
 * uma imagem é substituída ou removida.
 */
export async function deleteStoredServicePhoto(
  imageUrl: string | null | undefined
): Promise<{ deleted: boolean; fileName: string | null }> {
  const fileName = extractManagedPhotoFileName(imageUrl);
  if (!fileName) {
    return { deleted: false, fileName: null };
  }

  let deleted = false;

  try {
    const dbRes = await prisma.servicePhoto.deleteMany({
      where: { fileName },
    });
    if (dbRes.count > 0) {
      deleted = true;
    }
  } catch (err) {
    console.warn("Erro ao excluir ServicePhoto do PostgreSQL:", err);
  }

  const creds = getSupabaseServerCredentials();
  if (creds) {
    try {
      const delRes = await fetch(
        `${creds.supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${fileName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${creds.serviceRoleKey}`,
            apikey: creds.serviceRoleKey,
          },
        }
      );
      if (delRes.ok) {
        deleted = true;
      }
    } catch (err) {
      console.warn("Erro ao excluir objeto do bucket service-photos:", err);
    }
  }

  return { deleted, fileName };
}
