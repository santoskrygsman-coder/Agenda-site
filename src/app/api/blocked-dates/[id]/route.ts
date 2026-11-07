import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { invalidateBlockedDatesCache } from "@/lib/cache";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await props.params;
    await prisma.blockedDate.delete({ where: { id } });
    invalidateBlockedDatesCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blocked date:", error);
    return NextResponse.json(
      { error: "Erro ao remover bloqueio" },
      { status: 500 }
    );
  }
}
