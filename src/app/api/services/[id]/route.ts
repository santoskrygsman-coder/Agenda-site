import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { formatCurrency, formatDuration } from "@/lib/formatters";
import { invalidateServicesCache } from "@/lib/cache";

async function updateServiceHandler(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "O nome do serviço não pode ficar vazio" },
          { status: 400 }
        );
      }
      data.name = trimmed;
    }
    if (body.description !== undefined) {
      data.description = String(body.description).trim();
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
      }
      data.price = price;
    }
    if (body.duration !== undefined || body.durationMinutes !== undefined) {
      const dur = Number(body.durationMinutes ?? body.duration);
      if (isNaN(dur) || dur < 15) {
        return NextResponse.json(
          { error: "A duração mínima é de 15 minutos" },
          { status: 400 }
        );
      }
      data.duration = dur;
    }
    if (body.image !== undefined) data.image = String(body.image);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.requiresDeposit !== undefined) {
      data.requiresDeposit = Boolean(body.requiresDeposit);
    }

    const updated = await prisma.service.update({
      where: { id },
      data,
    });
    invalidateServicesCache();

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description || "",
      price: updated.price,
      priceFormatted: formatCurrency(updated.price),
      durationMinutes: updated.duration,
      duration: formatDuration(updated.duration),
      image: updated.image,
      active: updated.active,
      requiresDeposit: updated.requiresDeposit,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar serviço" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return updateServiceHandler(request, props);
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  return updateServiceHandler(request, props);
}

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
    const apptCount = await prisma.appointment.count({
      where: { serviceId: id },
    });

    if (apptCount > 0) {
      return NextResponse.json(
        {
          error:
            "Este serviço possui agendamentos vinculados. Desative-o em vez de excluir.",
        },
        { status: 400 }
      );
    }

    await prisma.service.delete({ where: { id } });
    invalidateServicesCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Erro ao excluir serviço" },
      { status: 500 }
    );
  }
}
