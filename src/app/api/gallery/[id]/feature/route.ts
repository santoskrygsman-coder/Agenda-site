import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Unset all other features
    await prisma.galleryImage.updateMany({
      data: { isFeature: false }
    });

    // Set new feature
    const updated = await prisma.galleryImage.update({
      where: { id },
      data: { isFeature: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to set feature image" }, { status: 500 });
  }
}
