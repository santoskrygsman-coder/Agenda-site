import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

function getFutureFridayIso(weeksAhead = 3) {
  const dt = new Date();
  dt.setDate(dt.getDate() + weeksAhead * 7);
  while (dt.getDay() !== 5) {
    dt.setDate(dt.getDate() + 1);
  }
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

test("HTTP API: Validações obrigatórias, bloqueio de datas passadas, rejeição de valores manipulados, concorrência 409, comprovante exclusivo via WhatsApp e proteção de rotas", async () => {
  const testDate = getFutureFridayIso(3); // Sexta-feira futura válida
  const pastDate = "2024-01-12"; // Data passada
  await prisma.appointment.deleteMany({ where: { date: testDate } });

  // 1. GET /api/services
  const svcRes = await fetch(`${BASE_URL}/api/services`);
  assert.equal(svcRes.status, 200);
  const services = await svcRes.json();
  assert.ok(services.length >= 6);
  const service =
    services.find((s) => s.name === "Volume brasileiro") || services[0];

  // 2. Bloqueio de datas passadas em GET /api/availability
  const pastAvailRes = await fetch(
    `${BASE_URL}/api/availability?date=${pastDate}&serviceId=${service.id}`
  );
  assert.equal(pastAvailRes.status, 200);
  const pastAvailData = await pastAvailRes.json();
  assert.equal(
    pastAvailData.times.length,
    0,
    "Datas passadas não devem retornar horários disponíveis"
  );

  // 3. GET /api/availability em data futura válida
  const availRes = await fetch(
    `${BASE_URL}/api/availability?date=${testDate}&serviceId=${service.id}`
  );
  assert.equal(availRes.status, 200);
  const availData = await availRes.json();
  assert.ok(availData.times.includes("14:00"));

  // 4. Validações obrigatórias no backend (Nome incompleto, WhatsApp inválido, Data passada, Políticas não aceitas)
  const invalidNameRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      date: testDate,
      time: "14:00",
      name: "Maria", // Sem sobrenome
      phone: "(73) 99988-7766",
      acceptedPolicies: true,
    }),
  });
  assert.equal(invalidNameRes.status, 400);
  const invalidNameData = await invalidNameRes.json();
  assert.ok(invalidNameData.fieldErrors?.name);

  const invalidPhoneRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      date: testDate,
      time: "14:00",
      name: "Maria Clara Silva",
      phone: "(00) 00000-0000", // DDD e dígitos inválidos
      acceptedPolicies: true,
    }),
  });
  assert.equal(invalidPhoneRes.status, 400);
  const invalidPhoneData = await invalidPhoneRes.json();
  assert.ok(invalidPhoneData.fieldErrors?.phone);

  const noPoliciesRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      date: testDate,
      time: "14:00",
      name: "Maria Clara Silva",
      phone: "(73) 99988-7766",
      acceptedPolicies: false,
    }),
  });
  assert.equal(noPoliciesRes.status, 400);
  const noPoliciesData = await noPoliciesRes.json();
  assert.ok(noPoliciesData.fieldErrors?.acceptedPolicies);

  const pastBookingRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      date: pastDate,
      time: "14:00",
      name: "Maria Clara Silva",
      phone: "(73) 99988-7766",
      acceptedPolicies: true,
    }),
  });
  assert.equal(pastBookingRes.status, 400);
  const pastBookingData = await pastBookingRes.json();
  assert.ok(pastBookingData.fieldErrors?.date);

  // 5. Rejeitar valores ou status manipulados enviados pelo cliente
  const manipulatedRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      date: testDate,
      time: "14:00",
      name: "Maria Clara Silva",
      phone: "(73) 99988-7766",
      acceptedPolicies: true,
      price: 1, // Valor manipulado
      paymentStatus: "SIGNAL_PAID", // Status manipulado
    }),
  });
  assert.equal(
    manipulatedRes.status,
    400,
    "Tentativa de manipular preço ou status deve ser recusada com HTTP 400"
  );

  // 6. Proteção contra concorrência (duas clientes tentando reservar o mesmo horário simultaneamente)
  const [concRes1, concRes2] = await Promise.all([
    fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        date: testDate,
        time: "14:00",
        name: "Cliente Fluxo Um",
        phone: "(11) 97777-6661",
        acceptedPolicies: true,
      }),
    }),
    fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: service.id,
        date: testDate,
        time: "14:00",
        name: "Cliente Fluxo Dois",
        phone: "(11) 97777-6662",
        acceptedPolicies: true,
      }),
    }),
  ]);

  const statuses = [concRes1.status, concRes2.status].sort();
  assert.deepEqual(
    statuses,
    [201, 409],
    "Em requisições simultâneas para o mesmo horário, exatamente uma deve criar (201) e a outra deve ser bloqueada (409)"
  );

  const createdAppt =
    concRes1.status === 201 ? await concRes1.json() : await concRes2.json();
  assert.equal(createdAppt.status, "PENDING");
  assert.equal(createdAppt.paymentStatus, "PENDING_SIGNAL");
  assert.equal(createdAppt.paymentStatusLabel, "Aguardando confirmação");
  assert.equal(createdAppt.signalAmount, service.price * 0.5);

  // 7. Upload de comprovante no sistema deve ser recusado (HTTP 400)
  const uploadAttemptRes = await fetch(
    `${BASE_URL}/api/appointments/${createdAppt.id}/receipt`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiptUrl: "data:image/png;base64,iVBORw0KGgo=",
        receiptFileName: "comprovante.png",
      }),
    }
  );
  assert.equal(
    uploadAttemptRes.status,
    400,
    "Upload de comprovante dentro do sistema deve ser proibido"
  );

  // 8. Clique no botão "Enviar comprovante pelo WhatsApp" NÃO deve marcar pagamento como realizado
  const receiptRes = await fetch(
    `${BASE_URL}/api/appointments/${createdAppt.id}/receipt`,
    {
      method: "POST",
    }
  );
  assert.equal(receiptRes.status, 200);
  const receiptData = await receiptRes.json();
  assert.equal(receiptData.paymentStatus, "PENDING_SIGNAL");
  assert.equal(receiptData.paymentStatusLabel, "Aguardando confirmação");
  assert.equal(receiptData.status, "PENDING");
  assert.ok(receiptData.receiptReportedAt);

  // 9. Impedir que clientes alterem, cancelem ou consultem agendamentos sem autenticação
  const unauthPatch = await fetch(
    `${BASE_URL}/api/appointments/${createdAppt.id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
      redirect: "manual",
    }
  );
  assert.ok(
    [307, 308, 401].includes(unauthPatch.status),
    "Clientes não autenticados não podem alterar ou cancelar agendamentos"
  );

  const unauthLookup = await fetch(
    `${BASE_URL}/api/appointments/lookup?phone=${encodeURIComponent("(11) 97777-6661")}`,
    { redirect: "manual" }
  );
  assert.ok(
    [307, 308, 401].includes(unauthLookup.status),
    "Consulta de agendamentos de clientes sem autenticação deve ser bloqueada"
  );

  // Limpar dados do teste
  await prisma.appointment.delete({ where: { id: createdAppt.id } });
  await prisma.client.deleteMany({
    where: { phone: { in: ["5511977776661", "5511977776662"] } },
  });
});

test("HTTP API Admin Autenticado: Login NextAuth, Confirmação Manual de Sinal, Serviços HD, Clientes e Financeiro", async () => {
  // 1. Obter CSRF token do NextAuth e realizar login com admin / admin123
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  assert.equal(csrfRes.status, 200);
  const csrfCookies = csrfRes.headers.getSetCookie
    ? csrfRes.headers.getSetCookie()
    : [csrfRes.headers.get("set-cookie")].filter(Boolean);
  const { csrfToken } = await csrfRes.json();

  const cookieHeader1 = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader1,
    },
    body: new URLSearchParams({
      csrfToken,
      username: "admin",
      password: process.env.ADMIN_PRODUCTION_PASSWORD || "admin123",
      json: "true",
    }),
    redirect: "manual",
  });

  const loginCookies = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : [loginRes.headers.get("set-cookie")].filter(Boolean);
  const allCookies = [...csrfCookies, ...loginCookies]
    .map((c) => c.split(";")[0])
    .join("; ");

  assert.ok(
    allCookies.includes("next-auth.session-token"),
    "Login deve gerar cookie de sessão next-auth.session-token"
  );

  // 2. Criar agendamento e confirmar manualmente como profissional ("Sinal confirmado")
  const testDate = getFutureFridayIso(4);
  await prisma.appointment.deleteMany({ where: { date: testDate } });
  const svcRes = await fetch(`${BASE_URL}/api/services`);
  const services = await svcRes.json();
  const service = services[0];

  const createRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: service.id,
      date: testDate,
      time: "10:00",
      name: "Juliana Costa Oliveira",
      phone: "(73) 99911-2233",
      acceptedPolicies: true,
    }),
  });
  assert.equal(createRes.status, 201);
  const appt = await createRes.json();
  assert.equal(appt.paymentStatusLabel, "Aguardando confirmação");

  // Somente a profissional autenticada altera para SIGNAL_PAID ("Sinal confirmado")
  const confirmRes = await fetch(`${BASE_URL}/api/appointments/${appt.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: allCookies,
    },
    body: JSON.stringify({
      status: "CONFIRMED",
      paymentStatus: "SIGNAL_PAID",
    }),
  });
  assert.equal(confirmRes.status, 200);
  const confirmedData = await confirmRes.json();
  assert.equal(confirmedData.paymentStatus, "SIGNAL_PAID");
  assert.equal(confirmedData.status, "CONFIRMED");

  await prisma.appointment.delete({ where: { id: appt.id } });
  await prisma.client.deleteMany({ where: { phone: "5573999112233" } });

  // 3. Testar POST /api/upload (Envio de foto real em HD de serviço pela profissional)
  const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: allCookies,
    },
    body: JSON.stringify({
      dataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    }),
  });
  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.ok(uploadData.url.startsWith("/uploads/services/servico-hd-"));

  // 4. Testar registro e exclusão de despesa no Financeiro
  const expRes = await fetch(`${BASE_URL}/api/finance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: allCookies,
    },
    body: JSON.stringify({
      description: "Adesivo e Fios Y",
      amount: 85,
      date: testDate,
    }),
  });
  assert.equal(expRes.status, 201);
  const createdExp = await expRes.json();

  const delExpRes = await fetch(
    `${BASE_URL}/api/finance?expenseId=${createdExp.id}`,
    {
      method: "DELETE",
      headers: { Cookie: allCookies },
    }
  );
  assert.equal(delExpRes.status, 200);
});
