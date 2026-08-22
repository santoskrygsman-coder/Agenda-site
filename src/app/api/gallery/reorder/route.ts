import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const { orders } = await request.json(); // [{ id: '...', order: 0 }, { id: '...', order: 1 }]
    
    // We can't do a bulk update with different values easily in Prisma, so we map over them:
    const updates = orders.map((item: any) => 
      prisma.galleryImage.update({
        where: { id: item.id },
        data: { order: item.order }
      })
    );
    
    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reorder images" }, { status: 500 });
  }
}
