import { NextResponse } from "next/server";
import { getAdminSession, unauthorizedResponse } from "@/lib/auth";
import { deleteStoredServicePhoto, uploadServicePhoto } from "@/lib/storage";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const contentType = request.headers.get("content-type") || "";
    let buffer: Buffer;
    let mimeType = "image/jpeg";
    let ext = "jpg";
    let previousUrl: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const rawDataUrl =
        typeof body?.dataUrl === "string" ? body.dataUrl.trim() : "";
      previousUrl =
        typeof body?.previousUrl === "string" ? body.previousUrl.trim() : null;

      const match = rawDataUrl.match(
        /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i
      );
      if (!match) {
        return NextResponse.json(
          {
            error:
              "Formato inválido. Envie uma imagem JPG, PNG ou WebP válida.",
          },
          { status: 400 }
        );
      }

      mimeType = match[1].toLowerCase();
      ext = ALLOWED_TYPES[mimeType] || "jpg";
      buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    } else {
      const formData = await request.formData();
      const file = formData.get("file");
      const prevField = formData.get("previousUrl");
      if (typeof prevField === "string" && prevField.trim()) {
        previousUrl = prevField.trim();
      }

      if (!file || typeof (file as Blob).arrayBuffer !== "function") {
        return NextResponse.json(
          { error: "Nenhuma foto enviada." },
          { status: 400 }
        );
      }

      const blob = file as File;
      const rawType = (blob.type || "").toLowerCase();
      ext = ALLOWED_TYPES[rawType];
      if (!ext) {
        return NextResponse.json(
          { error: "Formato inválido. Envie uma foto JPG, PNG ou WebP." },
          { status: 400 }
        );
      }
      mimeType = rawType === "image/jpg" ? "image/jpeg" : rawType;
      const bytes = await blob.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    if (buffer.byteLength === 0) {
      return NextResponse.json(
        { error: "O arquivo de imagem está vazio." },
        { status: 400 }
      );
    }

    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "A foto excede o limite máximo de 10 MB." },
        { status: 400 }
      );
    }

    const uploaded = await uploadServicePhoto({
      buffer,
      mimeType,
      ext,
      previousUrl,
    });

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    console.error("Erro ao processar upload de foto:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a foto enviada." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    let targetUrl = searchParams.get("url");

    if (!targetUrl) {
      const body = await request.json().catch(() => ({}));
      if (typeof body?.url === "string") {
        targetUrl = body.url;
      }
    }

    if (!targetUrl) {
      return NextResponse.json(
        { error: "URL da imagem não informada." },
        { status: 400 }
      );
    }

    const result = await deleteStoredServicePhoto(targetUrl);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Erro ao remover foto personalizada:", error);
    return NextResponse.json(
      { error: "Erro ao remover foto personalizada." },
      { status: 500 }
    );
  }
}
