import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json(images);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const count = await prisma.galleryImage.count();
    
    if (count >= 50) {
      return NextResponse.json({ error: "Maximum limit of 50 images reached" }, { status: 400 });
    }

    const newImage = await prisma.galleryImage.create({
      data: {
        url: data.url,
        type: data.type || "IMAGE",
        order: data.order ?? count,
        isFeature: count === 0 ? true : false
      }
    });

    return NextResponse.json(newImage);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add image" }, { status: 500 });
  }
}
