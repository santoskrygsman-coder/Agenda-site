import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getCachedAllServices } from "@/lib/cache";
import {
  formatCurrency,
  formatDateLongPtBr,
  formatPhoneDisplay,
  normalizePhoneDigits,
} from "@/lib/formatters";

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const category = searchParams.get("category") || "todos";

    const [clients, allServices] = await Promise.all([
      prisma.client.findMany({
        include: {
          appointments: {
            orderBy: [{ date: "desc" }, { startTime: "desc" }],
          },
        },
        orderBy: { name: "asc" },
      }),
      getCachedAllServices(),
    ]);
    const serviceById = new Map(allServices.map((s) => [s.id, s]));

    const mapped = clients
      .map((c) => {
        const count = c.appointments.length;
        const validCategories = ["ativas", "frequentes", "inativas"];
        const resolvedCategory: "ativas" | "frequentes" | "inativas" =
          validCategories.includes(c.category)
            ? (c.category as "ativas" | "frequentes" | "inativas")
            : count >= 3
            ? "frequentes"
            : "ativas";

        return {
          id: c.id,
          initials: getInitials(c.name),
          name: c.name,
          phone: formatPhoneDisplay(c.phone),
          rawPhone: c.phone,
          email: c.email || "",
          notes: c.notes || "",
          avatar: c.avatar || undefined,
          appointmentsCount: count,
          category: resolvedCategory,
          history: c.appointments.map((a) => {
            const svc = serviceById.get(a.serviceId);
            return {
              id: a.id,
              date: a.date,
              dateFormatted: formatDateLongPtBr(a.date),
              time: a.startTime,
              endTime: a.endTime,
              serviceName: svc?.name || "Procedimento",
              priceFormatted: formatCurrency(
                a.totalAmount || svc?.price || 0
              ),
              status: a.status,
              paymentStatus: a.paymentStatus,
            };
          }),
        };
      })
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.rawPhone.includes(q);
        const matchesCategory =
          category === "todos" || c.category === category;
        return matchesSearch && matchesCategory;
      });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
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
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim();
    const notes = (body.notes || "").trim();
    const category = body.category || "ativas";

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Informe o nome da cliente" },
        { status: 400 }
      );
    }

    const cleanDigits = phone.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      return NextResponse.json(
        { error: "Informe um telefone válido com DDD" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneDigits(phone);

    const existing = await prisma.client.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma cliente cadastrada com este telefone." },
        { status: 409 }
      );
    }

    const created = await prisma.client.create({
      data: {
        name,
        phone: normalizedPhone,
        email: email || null,
        notes: notes || null,
        category,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        initials: getInitials(created.name),
        name: created.name,
        phone: formatPhoneDisplay(created.phone),
        rawPhone: created.phone,
        email: created.email || "",
        notes: created.notes || "",
        appointmentsCount: 0,
        category: created.category as "ativas" | "frequentes" | "inativas",
        history: [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Erro ao cadastrar cliente" },
      { status: 500 }
    );
  }
}
