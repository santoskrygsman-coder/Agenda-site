import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

function extractCookies(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

function mergeCookieStrings(...cookieStrings) {
  const map = new Map();
  for (const str of cookieStrings) {
    if (!str) continue;
    for (const part of str.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        map.set(trimmed.slice(0, eqIdx), trimmed.slice(eqIdx + 1));
      }
    }
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function loginAsProfessional() {
  const adminPassword = process.env.ADMIN_PRODUCTION_PASSWORD;
  assert.ok(adminPassword, "ADMIN_PRODUCTION_PASSWORD deve estar definida no .env");

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  assert.equal(csrfRes.status, 200);
  const csrfCookies = extractCookies(csrfRes.headers);
  const { csrfToken } = await csrfRes.json();

  const loginBody = new URLSearchParams({
    csrfToken,
    username: "admin",
    password: adminPassword,
    redirect: "false",
    json: "true",
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies,
    },
    body: loginBody.toString(),
    redirect: "manual",
  });

  const authCookies = mergeCookieStrings(
    csrfCookies,
    extractCookies(loginRes.headers)
  );
  assert.ok(
    authCookies.includes("next-auth.session-token"),
    "Deve obter cookie de sessão autenticada da profissional"
  );
  return authCookies;
}

test("Fase 3 — Testes completos de salvamento, validação e persistência de horários de funcionamento", async (t) => {
  // Guardar estado inicial do banco para restaurar ao final
  const initialDbHours = await prisma.workingHours.findMany({
    orderBy: { weekday: "asc" },
  });

  let sessionCookies = await loginAsProfessional();

  await t.test("1. Salvar Segunda a Sexta, Sábado com horário diferente e Desativar Domingo", async () => {
    const payload = [
      {
        weekday: 0, // Domingo desativado
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
        active: false,
      },
      ...[1, 2, 3, 4, 5].map((wd) => ({
        weekday: wd, // Segunda a Sexta: 09:00 às 18:00 com intervalo 12:00-13:00
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "12:00",
        breakEnd: "13:00",
        active: true,
      })),
      {
        weekday: 6, // Sábado com horário diferente: 09:00 às 14:00 sem intervalo
        startTime: "09:00",
        endTime: "14:00",
        breakStart: null,
        breakEnd: null,
        active: true,
      },
    ];

    const res = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const saved = await res.json();
    assert.equal(saved.length, 7);

    // Confirmar persistência real diretamente no banco de dados
    const dbRows = await prisma.workingHours.findMany({
      orderBy: { weekday: "asc" },
    });
    assert.equal(dbRows.length, 7);

    // Domingo desativado
    assert.equal(dbRows[0].weekday, 0);
    assert.equal(dbRows[0].active, false);

    // Segunda a Sexta
    for (let wd = 1; wd <= 5; wd++) {
      assert.equal(dbRows[wd].active, true);
      assert.equal(dbRows[wd].startTime, "09:00");
      assert.equal(dbRows[wd].endTime, "18:00");
      assert.equal(dbRows[wd].breakStart, "12:00");
      assert.equal(dbRows[wd].breakEnd, "13:00");
    }

    // Sábado diferente
    assert.equal(dbRows[6].weekday, 6);
    assert.equal(dbRows[6].active, true);
    assert.equal(dbRows[6].startTime, "09:00");
    assert.equal(dbRows[6].endTime, "14:00");
    assert.equal(dbRows[6].breakStart, null);
    assert.equal(dbRows[6].breakEnd, null);
  });

  await t.test("2. Salvar dois períodos no mesmo dia (ex: Terça-feira 08:00-11:30 e 13:30-17:30)", async () => {
    const res = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify({
        weekday: 2,
        active: true,
        periods: [
          { startTime: "08:00", endTime: "11:30" },
          { startTime: "13:30", endTime: "17:30" },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const tuesday = data.find((d) => d.weekday === 2);
    assert.ok(tuesday);
    assert.equal(tuesday.startTime, "08:00");
    assert.equal(tuesday.breakStart, "11:30");
    assert.equal(tuesday.breakEnd, "13:30");
    assert.equal(tuesday.endTime, "17:30");
    assert.deepEqual(tuesday.periods, [
      { startTime: "08:00", endTime: "11:30" },
      { startTime: "13:30", endTime: "17:30" },
    ]);

    // Verificar no banco de dados
    const dbTuesday = await prisma.workingHours.findUnique({
      where: { weekday: 2 },
    });
    assert.equal(dbTuesday.startTime, "08:00");
    assert.equal(dbTuesday.breakStart, "11:30");
    assert.equal(dbTuesday.breakEnd, "13:30");
    assert.equal(dbTuesday.endTime, "17:30");
  });

  await t.test("3. Editar somente um dia (Quarta-feira) preservando os horários já cadastrados nos demais dias", async () => {
    const res = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify({
        weekday: 3,
        active: true,
        startTime: "10:00",
        endTime: "19:30",
        breakStart: "13:00",
        breakEnd: "14:00",
      }),
    });

    assert.equal(res.status, 200);

    const dbRows = await prisma.workingHours.findMany({
      orderBy: { weekday: "asc" },
    });

    // Quarta-feira atualizada
    assert.equal(dbRows[3].startTime, "10:00");
    assert.equal(dbRows[3].endTime, "19:30");
    assert.equal(dbRows[3].breakStart, "13:00");
    assert.equal(dbRows[3].breakEnd, "14:00");

    // Terça-feira (2 períodos) preservada!
    assert.equal(dbRows[2].startTime, "08:00");
    assert.equal(dbRows[2].breakStart, "11:30");
    assert.equal(dbRows[2].breakEnd, "13:30");
    assert.equal(dbRows[2].endTime, "17:30");

    // Sábado preservado!
    assert.equal(dbRows[6].startTime, "09:00");
    assert.equal(dbRows[6].endTime, "14:00");

    // Domingo desativado preservado!
    assert.equal(dbRows[0].active, false);
  });

  await t.test("4. Atualizar a página (GET /api/working-hours) e Sair/Entrar novamente verificando persistência", async () => {
    // Simula atualização da página (GET sem cache)
    const getRes1 = await fetch(`${BASE_URL}/api/working-hours`, {
      cache: "no-store",
    });
    assert.equal(getRes1.status, 200);
    const list1 = await getRes1.json();
    assert.equal(list1.find((d) => d.weekday === 3).startTime, "10:00");
    assert.equal(list1.find((d) => d.weekday === 3).endTime, "19:30");

    // Simula logout (sem cookies -> PUT deve ser bloqueado com 401)
    const unauthPut = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekday: 3,
        active: true,
        startTime: "08:00",
        endTime: "12:00",
      }),
    });
    assert.equal(unauthPut.status, 401);

    // Simula novo login da profissional e nova leitura
    sessionCookies = await loginAsProfessional();
    const getRes2 = await fetch(`${BASE_URL}/api/working-hours`, {
      headers: { Cookie: sessionCookies },
      cache: "no-store",
    });
    assert.equal(getRes2.status, 200);
    const list2 = await getRes2.json();
    assert.equal(list2.find((d) => d.weekday === 3).startTime, "10:00");
    assert.equal(list2.find((d) => d.weekday === 3).endTime, "19:30");
    assert.equal(list2.find((d) => d.weekday === 6).endTime, "14:00");
    assert.equal(list2.find((d) => d.weekday === 0).active, false);
  });

  await t.test("5. Testar horários inválidos (término <= início, intervalo inválido, 2 períodos sobrepostos)", async () => {
    // 5a. Término anterior ao início
    const r1 = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify({
        weekday: 1,
        active: true,
        startTime: "18:00",
        endTime: "09:00",
      }),
    });
    assert.equal(r1.status, 400);
    const err1 = await r1.json();
    assert.match(err1.error, /posterior ao horário de início/i);

    // 5b. Término igual ao início
    const r2 = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify({
        weekday: 1,
        active: true,
        startTime: "10:00",
        endTime: "10:00",
      }),
    });
    assert.equal(r2.status, 400);

    // 5c. Intervalo fora do expediente
    const r3 = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify({
        weekday: 1,
        active: true,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "07:30",
        breakEnd: "08:30",
      }),
    });
    assert.equal(r3.status, 400);
    const err3 = await r3.json();
    assert.match(err3.error, /dentro do horário de expediente/i);

    // 5d. Dois períodos sobrepostos (2º período começando antes do fim do 1º)
    const r4 = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify({
        weekday: 1,
        active: true,
        periods: [
          { startTime: "08:00", endTime: "13:00" },
          { startTime: "12:00", endTime: "18:00" },
        ],
      }),
    });
    assert.equal(r4.status, 400);
    const err4 = await r4.json();
    assert.match(err4.error, /não pode começar antes do término do 1º período/i);
  });

  await t.test("6. Testar falha na API e proteção contra clique duplo (sem registros duplicados)", async () => {
    // Payload vazio -> 400
    const badRes = await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify([]),
    });
    assert.equal(badRes.status, 400);

    // Clique duplo concorrente para o mesmo dia
    const doublePayload = {
      weekday: 5,
      active: true,
      startTime: "08:30",
      endTime: "18:30",
      breakStart: "12:00",
      breakEnd: "13:00",
    };

    const [p1, p2] = await Promise.all([
      fetch(`${BASE_URL}/api/working-hours`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookies,
        },
        body: JSON.stringify(doublePayload),
      }),
      fetch(`${BASE_URL}/api/working-hours`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookies,
        },
        body: JSON.stringify(doublePayload),
      }),
    ]);

    assert.equal(p1.status, 200);
    assert.equal(p2.status, 200);

    const totalCount = await prisma.workingHours.count();
    assert.equal(
      totalCount,
      7,
      "Clique duplo nunca deve criar mais de 7 registros (1 por dia da semana)"
    );
  });

  // Restaurar os horários originais do banco ao final do teste
  if (initialDbHours.length > 0) {
    await fetch(`${BASE_URL}/api/working-hours`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookies,
      },
      body: JSON.stringify(initialDbHours),
    });
  }

  await prisma.$disconnect();
});
