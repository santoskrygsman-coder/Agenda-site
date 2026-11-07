import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import {
  derivePeriodsFromWorkingHour,
  normalizeAndValidateWorkingHourItem,
  NormalizedWorkingHourItem,
  WorkingHourInputItem,
} from "@/lib/validation";
import {
  getCachedWorkingHours,
  setCachedWorkingHours,
} from "@/lib/cache";

const DEFAULT_WEEKDAYS: Array<{
  weekday: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  active: boolean;
}> = [
  {
    weekday: 0,
    startTime: "09:00",
    endTime: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: false,
  },
  {
    weekday: 1,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 2,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 3,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 4,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 5,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
  {
    weekday: 6,
    startTime: "08:30",
    endTime: "18:30",
    breakStart: "12:00",
    breakEnd: "13:00",
    active: true,
  },
];

async function getOrderedCompleteWorkingHours() {
  const existing = await getCachedWorkingHours();

  const existingWeekdays = new Set(existing.map((r) => r.weekday));
  const missingDefaults = DEFAULT_WEEKDAYS.filter(
    (d) => !existingWeekdays.has(d.weekday)
  );

  if (missingDefaults.length > 0) {
    const upsertedDefaults = await Promise.all(
      missingDefaults.map((def) =>
        prisma.workingHours.upsert({
          where: { weekday: def.weekday },
          update: {},
          create: def,
        })
      )
    );
    const mergedMap = new Map(existing.map((r) => [r.weekday, r]));
    for (const row of upsertedDefaults) {
      mergedMap.set(row.weekday, row);
    }
    const refreshed = Array.from(mergedMap.values()).sort(
      (a, b) => a.weekday - b.weekday
    );
    setCachedWorkingHours(refreshed);
    return refreshed.map((row) => ({
      ...row,
      periods: derivePeriodsFromWorkingHour(row),
    }));
  }

  return existing.map((row) => ({
    ...row,
    periods: derivePeriodsFromWorkingHour(row),
  }));
}

export async function GET() {
  try {
    const wh = await getOrderedCompleteWorkingHours();
    return NextResponse.json(wh, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching working hours:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários de funcionamento no banco de dados." },
      { status: 500 }
    );
  }
}

async function handleSaveWorkingHours(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        {
          error:
            "Sessão expirada ou não autorizada. Faça login novamente no painel da profissional.",
        },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Formato de requisição inválido (JSON malformado)." },
        { status: 400 }
      );
    }

    const rawItems: WorkingHourInputItem[] = Array.isArray(body)
      ? body
      : body &&
        typeof body === "object" &&
        Array.isArray((body as { days?: unknown }).days)
      ? ((body as { days: WorkingHourInputItem[] }).days)
      : body && typeof body === "object"
      ? [body as WorkingHourInputItem]
      : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Nenhum horário de funcionamento informado para salvar." },
        { status: 400 }
      );
    }

    const fieldErrors: Record<number, string> = {};
    const byWeekday = new Map<number, NormalizedWorkingHourItem>();

    for (const rawItem of rawItems) {
      const validation = normalizeAndValidateWorkingHourItem(rawItem);
      if (!validation.valid || !validation.data) {
        const wd = Number(rawItem?.weekday);
        if (Number.isInteger(wd) && wd >= 0 && wd <= 6) {
          fieldErrors[wd] = validation.error || "Horário inválido.";
        }
        return NextResponse.json(
          {
            error:
              validation.error ||
              "Dados de horário de funcionamento inválidos.",
            fieldErrors,
          },
          { status: 400 }
        );
      }
      // Deduplica por weekday para evitar que cliques ou entradas duplicadas gerem operações repetidas
      byWeekday.set(validation.data.weekday, validation.data);
    }

    const normalizedItems = Array.from(byWeekday.values()).sort(
      (a, b) => a.weekday - b.weekday
    );

    const existingRows = await getCachedWorkingHours();
    const existingByDay = new Map(existingRows.map((r) => [r.weekday, r]));

    // Filtrar apenas dias que realmente mudaram ou ainda não existem no banco
    const itemsToWrite = normalizedItems.filter((item) => {
      const cur = existingByDay.get(item.weekday);
      if (!cur) return true;
      return (
        cur.active !== item.active ||
        cur.startTime !== item.startTime ||
        cur.endTime !== item.endTime ||
        (cur.breakStart || null) !== (item.breakStart || null) ||
        (cur.breakEnd || null) !== (item.breakEnd || null)
      );
    });

    if (itemsToWrite.length > 0) {
      const writtenRows = await Promise.all(
        itemsToWrite.map((item) =>
          prisma.workingHours.upsert({
            where: { weekday: item.weekday },
            update: {
              startTime: item.startTime,
              endTime: item.endTime,
              breakStart: item.breakStart,
              breakEnd: item.breakEnd,
              active: item.active,
            },
            create: {
              weekday: item.weekday,
              startTime: item.startTime,
              endTime: item.endTime,
              breakStart: item.breakStart,
              breakEnd: item.breakEnd,
              active: item.active,
            },
          })
        )
      );
      for (const row of writtenRows) {
        existingByDay.set(row.weekday, row);
      }
      setCachedWorkingHours(
        Array.from(existingByDay.values()).sort((a, b) => a.weekday - b.weekday)
      );
    }

    const persistedAllDays = await getOrderedCompleteWorkingHours();

    return NextResponse.json(persistedAllDays, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error updating working hours:", error);
    return NextResponse.json(
      {
        error:
          "Erro interno ao salvar os horários de funcionamento no banco de dados.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return handleSaveWorkingHours(request);
}

export async function POST(request: Request) {
  return handleSaveWorkingHours(request);
}
