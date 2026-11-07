import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const ROOT = process.cwd();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`✅ PASS: ${message}`);
  }
}

async function getAdminCookieJar() {
  const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  const pwdMatch = envFile.match(/ADMIN_PRODUCTION_PASSWORD=["']?([^"'\r\n]+)["']?/);
  const adminPassword = process.env.ADMIN_PRODUCTION_PASSWORD || (pwdMatch ? pwdMatch[1] : "");

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const setCookies1 = csrfRes.headers.getSetCookie?.() || [];
  const { csrfToken } = await csrfRes.json();

  const cookieHeader1 = setCookies1.map((c) => c.split(";")[0]).join("; ");

  const loginParams = new URLSearchParams({
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
      Cookie: cookieHeader1,
    },
    body: loginParams.toString(),
    redirect: "manual",
  });

  const setCookies2 = loginRes.headers.getSetCookie?.() || [];
  const map = new Map();
  for (const raw of [...setCookies1, ...setCookies2]) {
    const pair = raw.split(";")[0].trim();
    const eq = pair.indexOf("=");
    if (eq > 0) map.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function getFutureWorkingDate(daysAhead = 5) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function runTests() {
  console.log("=== INICIANDO AUDITORIA FUNCIONAL COMPLETA (E2E + MOBILE) ===");

  // 1. Autenticação da Profissional
  const adminCookies = await getAdminCookieJar();
  assert(
    adminCookies.includes("next-auth.session-token"),
    "Login da profissional no NextAuth retorna cookie de sessão válido"
  );

  // 2. Fluxo 1 — Agendamento da Cliente (Serviços, Disponibilidade, Criação com Slug/ID e Comprovante WhatsApp)
  const svcRes = await fetch(`${BASE_URL}/api/services`);
  assert(svcRes.ok, "GET /api/services retorna catálogo ativo para a cliente");
  const services = await svcRes.json();
  assert(
    Array.isArray(services) && services.length > 0,
    "Catálogo possui serviços ativos no banco"
  );

  const testDate = getFutureWorkingDate(6);
  const availStart = Date.now();
  const availRes = await fetch(
    `${BASE_URL}/api/availability?date=${testDate}&serviceId=${services[0].id}`
  );
  const availElapsed = Date.now() - availStart;
  assert(availRes.ok, "GET /api/availability responde com HTTP 200");
  const availData = await availRes.json();
  assert(
    Array.isArray(availData.times) && availData.times.length > 0,
    `GET /api/availability retorna horários livres (${availData.times.length} slots em ${availElapsed}ms)`
  );

  const chosenSlot = availData.times[0];
  const createApptRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: "extensao-classica", // Testa também fallback seguro caso slug mock seja enviado
      date: testDate,
      time: chosenSlot,
      name: "Cliente Auditoria Funcional",
      phone: "(73) 99911-2233",
      email: "auditoria@teste.com",
      notes: "Teste automatizado de agendamento",
      acceptedPolicies: true,
    }),
  });
  assert(
    createApptRes.status === 201,
    "POST /api/appointments cria agendamento da cliente (mesmo com slug fallback)"
  );
  const createdAppt = await createApptRes.json();
  assert(
    Boolean(createdAppt.id),
    "Agendamento criado retorna ID persistido no banco"
  );

  try {
    const receiptRes = await fetch(
      `${BASE_URL}/api/appointments/${createdAppt.id}/receipt`,
      { method: "POST" }
    );
    assert(
      receiptRes.ok,
      "POST /api/appointments/[id]/receipt registra abertura do WhatsApp para envio de comprovante"
    );

    // 3. Fluxo 2 — Gestão pela Profissional (Confirmar Sinal, Remarcar, Concluir 100% e Excluir)
    const confirmRes = await fetch(
      `${BASE_URL}/api/appointments/${createdAppt.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies,
        },
        body: JSON.stringify({
          status: "CONFIRMED",
          paymentStatus: "SIGNAL_PAID",
        }),
      }
    );
    assert(
      confirmRes.ok,
      "PATCH /api/appointments/[id] confirma o sinal Pix manualmente sem falso erro 409"
    );
    const confirmedData = await confirmRes.json();
    assert(
      confirmedData.status === "CONFIRMED" &&
        confirmedData.paymentStatus === "SIGNAL_PAID",
      "Status do agendamento persistido como CONFIRMED / SIGNAL_PAID"
    );

    const nextSlot = availData.times[1] || chosenSlot;
    const rescheduleRes = await fetch(
      `${BASE_URL}/api/appointments/${createdAppt.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies,
        },
        body: JSON.stringify({
          date: testDate,
          startTime: nextSlot,
        }),
      }
    );
    assert(
      rescheduleRes.ok,
      "PATCH /api/appointments/[id] remarca horário do agendamento com sucesso"
    );

    const completeRes = await fetch(
      `${BASE_URL}/api/appointments/${createdAppt.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies,
        },
        body: JSON.stringify({
          status: "COMPLETED",
          paymentStatus: "FULL_PAID",
        }),
      }
    );
    assert(
      completeRes.ok,
      "PATCH /api/appointments/[id] conclui atendimento (100% pago) com sucesso"
    );
  } finally {
    if (createdAppt?.id) {
      const delApptRes = await fetch(
        `${BASE_URL}/api/appointments/${createdAppt.id}`,
        {
          method: "DELETE",
          headers: { Cookie: adminCookies },
        }
      );
      assert(
        delApptRes.ok,
        "DELETE /api/appointments/[id] exclui agendamento de teste"
      );
    }

    if (createdAppt?.clientId) {
      const delClientRes = await fetch(
        `${BASE_URL}/api/clients/${createdAppt.clientId}`,
        {
          method: "DELETE",
          headers: { Cookie: adminCookies },
        }
      );
      assert(
        delClientRes.ok,
        "DELETE /api/clients/[id] remove cliente temporária de auditoria no teardown"
      );
    }
  }

  // 4. Fluxo 4 — Serviços (Criar, Editar, Ativar/Desativar e Excluir)
  const createSvcRes = await fetch(`${BASE_URL}/api/services`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      name: "Serviço Auditoria Temp",
      description: "Teste de criação e edição",
      price: 180,
      durationMinutes: 90,
      image: "/images/service-classica.png",
      active: true,
    }),
  });
  assert(
    createSvcRes.status === 201,
    "POST /api/services cria novo serviço no painel da profissional"
  );
  const createdSvc = await createSvcRes.json();

  const toggleSvcRes = await fetch(
    `${BASE_URL}/api/services/${createdSvc.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies,
      },
      body: JSON.stringify({ active: false }),
    }
  );
  assert(
    toggleSvcRes.ok,
    "PATCH /api/services/[id] alterna switch ativo/inativo do serviço"
  );

  const editSvcRes = await fetch(`${BASE_URL}/api/services/${createdSvc.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      name: "Serviço Auditoria Editado",
      description: "Descrição atualizada",
      price: 195,
      durationMinutes: 120,
      image: "/images/service-brasileiro.png",
      active: true,
    }),
  });
  assert(
    editSvcRes.ok,
    "PUT /api/services/[id] atualiza preço, duração e foto do serviço"
  );

  const delSvcRes = await fetch(`${BASE_URL}/api/services/${createdSvc.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookies },
  });
  assert(
    delSvcRes.ok,
    "DELETE /api/services/[id] remove serviço temporário com sucesso"
  );

  // 5. Fluxo 5 — Clientes, Financeiro e Configurações (Pix / WhatsApp)
  const createClientRes = await fetch(`${BASE_URL}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      name: "Maria Teste Ficha",
      phone: "(73) 98877-6655",
      email: "maria.ficha@teste.com",
      notes: "Curvatura D 11mm",
      category: "ativas",
    }),
  });
  assert(
    createClientRes.status === 201 || createClientRes.status === 409,
    "POST /api/clients cadastra cliente no banco"
  );

  const listClientsRes = await fetch(`${BASE_URL}/api/clients`, {
    headers: { Cookie: adminCookies },
  });
  const clientsList = await listClientsRes.json();
  const testClient = clientsList.find((c) => c.rawPhone.endsWith("988776655"));
  assert(Boolean(testClient), "GET /api/clients localiza cliente cadastrada");

  const updateClientRes = await fetch(
    `${BASE_URL}/api/clients/${testClient.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        notes: "Mapping atualizado pela auditoria",
        category: "frequentes",
      }),
    }
  );
  assert(
    updateClientRes.ok,
    "PUT /api/clients/[id] salva ficha técnica e categoria selecionada no <select>"
  );

  const verifyClientsRes = await fetch(
    `${BASE_URL}/api/clients?category=frequentes`,
    { headers: { Cookie: adminCookies } }
  );
  const freqClients = await verifyClientsRes.json();
  assert(
    freqClients.some((c) => c.id === testClient.id),
    "GET /api/clients preserva a categoria alterada pela profissional sem sobrescrevê-la"
  );

  const delClientRes = await fetch(`${BASE_URL}/api/clients/${testClient.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookies },
  });
  assert(
    delClientRes.ok,
    "DELETE /api/clients/[id] exclui cliente de teste com sucesso"
  );

  // Financeiro: criar e excluir despesa
  const createExpRes = await fetch(`${BASE_URL}/api/finance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      description: "Cola e Fios Auditoria",
      amount: 85.5,
      date: testDate,
    }),
  });
  assert(
    createExpRes.status === 201,
    "POST /api/finance registra nova despesa no financeiro"
  );
  const createdExp = await createExpRes.json();

  const delExpRes = await fetch(
    `${BASE_URL}/api/finance?expenseId=${encodeURIComponent(createdExp.id)}`,
    {
      method: "DELETE",
      headers: { Cookie: adminCookies },
    }
  );
  assert(delExpRes.ok, "DELETE /api/finance exclui despesa registrada");

  // Configurações do Estúdio (Pix, WhatsApp, Reserva)
  const getSettingsRes = await fetch(`${BASE_URL}/api/settings`);
  const currentSettings = await getSettingsRes.json();
  const putSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      ...currentSettings,
      holdMinutes: 15,
      signalPercentage: 50,
      pendingBlocksSlot: true,
    }),
  });
  assert(
    putSettingsRes.ok,
    "PUT /api/settings salva configurações de Pix, WhatsApp, sinal e regras de agenda"
  );

  // 6. Verificação Estática dos Componentes Corrigidos
  const bottomNavCode = fs.readFileSync(
    path.join(ROOT, "src/components/ui/BottomNavAdmin.tsx"),
    "utf8"
  );
  assert(
    bottomNavCode.includes('href="/admin/mais"'),
    "BottomNavAdmin navega diretamente para /admin/mais ao tocar na aba 'Mais'"
  );

  const homePageCode = fs.readFileSync(
    path.join(ROOT, "src/app/page.tsx"),
    "utf8"
  );
  assert(
    homePageCode.includes('router.push("/agendar/data")'),
    "Card de serviço em destaque na Home direciona para /agendar/data ao tocar em Agendar"
  );

  console.log(
    `\n🎉 AUDITORIA FUNCIONAL CONCLUÍDA: ${passed} testes aprovados, ${failed} falhas.`
  );
}

runTests().catch((err) => {
  console.error("Erro fatal na auditoria:", err);
  process.exit(1);
});
