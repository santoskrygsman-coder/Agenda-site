import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await context.params;
    const cleanName = decodeURIComponent(fileName || "").trim();

    if (!cleanName || cleanName.includes("/") || cleanName.includes("..")) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }

    const photo = await prisma.servicePhoto.findUnique({
      where: { fileName: cleanName },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Fotografia não encontrada." },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(photo.dataBase64, "base64");
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType || "image/jpeg",
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Erro ao servir fotografia do serviço:", error);
    return NextResponse.json(
      { error: "Erro ao carregar fotografia." },
      { status: 500 }
    );
  }
}
