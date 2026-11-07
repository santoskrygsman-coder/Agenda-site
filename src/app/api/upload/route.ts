import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB para fotos em alta definição (HD)
const SUPABASE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "service-photos";

async function uploadToSupabaseStorage(
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const uploadEndpoint = `${supabaseUrl}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
  const res = await fetch(uploadEndpoint, {
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
    throw new Error(
      `Falha ao enviar imagem para Supabase Storage (${res.status}): ${errText}`
    );
  }

  return `${supabaseUrl}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const contentTypeHeader = request.headers.get("content-type") || "";
    let buffer: Buffer;
    let ext = "jpg";
    let detectedMime = "image/jpeg";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "Nenhum arquivo de imagem enviado." },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "A imagem excede o limite máximo de 15 MB." },
          { status: 400 }
        );
      }

      const mime = file.type.toLowerCase();
      if (!ALLOWED_MIME_TYPES[mime]) {
        return NextResponse.json(
          {
            error:
              "Formato inválido. Envie uma fotografia em JPG, PNG, WEBP ou AVIF.",
          },
          { status: 400 }
        );
      }

      detectedMime = mime;
      ext = ALLOWED_MIME_TYPES[mime];
      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      const body = await request.json();
      const dataUrl = String(body.dataUrl || "");
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: "Imagem inválida." },
          { status: 400 }
        );
      }
      const mime = match[1].toLowerCase();
      if (!ALLOWED_MIME_TYPES[mime]) {
        return NextResponse.json(
          {
            error:
              "Formato inválido. Envie uma fotografia em JPG, PNG, WEBP ou AVIF.",
          },
          { status: 400 }
        );
      }
      detectedMime = mime;
      ext = ALLOWED_MIME_TYPES[mime];
      buffer = Buffer.from(match[2], "base64");

      if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "A imagem excede o limite máximo de 15 MB." },
          { status: 400 }
        );
      }
    }

    const uniqueName = `servico-hd-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    // 1. Se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estiverem configurados, envia para o Supabase Storage (Produção)
    const cloudUrl = await uploadToSupabaseStorage(
      uniqueName,
      buffer,
      detectedMime
    );
    if (cloudUrl) {
      return NextResponse.json(
        { url: cloudUrl, storage: "supabase" },
        { status: 201 }
      );
    }

    // 2. Fallback local em desenvolvimento (preserva compatibilidade sem Supabase configurado)
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "services"
    );
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, uniqueName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/services/${uniqueName}`;
    return NextResponse.json(
      { url: publicUrl, storage: "local" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading HD service photo:", error);
    return NextResponse.json(
      { error: "Erro ao salvar fotografia em alta definição." },
      { status: 500 }
    );
  }
}
