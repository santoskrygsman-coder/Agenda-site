import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { formatCurrency, formatDuration } from "@/lib/formatters";
import { getCachedAllServices, invalidateServicesCache } from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "true";

    if (includeInactive) {
      const session = await getAdminSession();
      if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const allServices = await getCachedAllServices();
    const services = includeInactive
      ? allServices
      : allServices.filter((s) => s.active);

    const mapped = services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || "",
      price: s.price,
      priceFormatted: formatCurrency(s.price),
      durationMinutes: s.duration,
      duration: formatDuration(s.duration),
      image: s.image || "/images/service-classica.png",
      active: s.active,
      requiresDeposit: s.requiresDeposit,
      depositPercentage: s.depositPercentage ?? 50,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Erro ao buscar serviços" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || "").trim();
    const description = (body.description || "").trim();
    const price = Number(body.price);
    const duration = Number(body.durationMinutes ?? body.duration);
    const image = body.image || "/images/service-classica.png";

    if (!name) {
      return NextResponse.json(
        { error: "O nome do serviço é obrigatório" },
        { status: 400 }
      );
    }
    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Informe um preço válido" },
        { status: 400 }
      );
    }
    if (isNaN(duration) || duration < 15) {
      return NextResponse.json(
        { error: "A duração mínima é de 15 minutos" },
        { status: 400 }
      );
    }

    const rawDepositPct =
      body.depositPercentage !== undefined ? Number(body.depositPercentage) : 50;
    const depositPercentage =
      !isNaN(rawDepositPct) && rawDepositPct >= 1 && rawDepositPct <= 100
        ? Math.round(rawDepositPct)
        : 50;

    const allExisting = await getCachedAllServices();
    const created = await prisma.service.create({
      data: {
        name,
        description,
        price,
        duration,
        image,
        active: body.active !== undefined ? Boolean(body.active) : true,
        requiresDeposit:
          body.requiresDeposit !== undefined
            ? Boolean(body.requiresDeposit)
            : true,
        depositPercentage,
        sortOrder: allExisting.length + 1,
      },
    });
    invalidateServicesCache();

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        description: created.description || "",
        price: created.price,
        priceFormatted: formatCurrency(created.price),
        durationMinutes: created.duration,
        duration: formatDuration(created.duration),
        image: created.image,
        active: created.active,
        requiresDeposit: created.requiresDeposit,
        depositPercentage: created.depositPercentage ?? 50,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar serviço" },
      { status: 500 }
    );
  }
}
