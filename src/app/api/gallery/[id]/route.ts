import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.galleryImage.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const image = await prisma.galleryImage.update({
      where: { id },
      data: { serviceId: body.serviceId }
    });
    return NextResponse.json(image);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 });
  }
}
