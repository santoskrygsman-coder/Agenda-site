import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const PORT = 3100 + Math.floor(Math.random() * 400);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const prisma = new PrismaClient();

async function getAdminCookieHeader() {
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  assert.ok(adminUser, "Admin user deve existir no banco");
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    token: {
      id: adminUser.id,
      sub: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: "ADMIN",
    },
  });
  return `next-auth.session-token=${token}`;
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/services`);
      if (res.ok) return;
    } catch {
      // Aguardando servidor iniciar
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error("Timeout aguardando servidor Next.js iniciar.");
}

async function main() {
  console.log("=== INICIANDO BATERIA DE TESTES DA ATUALIZAÇÃO CORRETIVA ===");

  const serverProc = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
  });

  const createdAppointmentIds = [];
  const createdClientIds = [];
  const createdServiceIds = [];
  const createdPhotoNames = [];
  const testPushEndpoint = `https://fcm.googleapis.com/fcm/send/test-device-${Date.now()}`;

  try {
    await waitForServer(BASE_URL);
    const adminCookie = await getAdminCookieHeader();
    const authHeaders = {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    };

    // =========================================================================
    // 1. TESTES DE FOTOS PERSONALIZADAS (JPG, PNG, WebP, Substituição sem órfãos, Remoção)
    // =========================================================================
    console.log("\n[1/4] Testando Fotos Personalizadas (JPG, PNG, WebP + Sem Órfãos)...");

    const tinyJpgDataUrl =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const tinyPngDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const tinyWebpDataUrl =
      "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";

    // 1.1 Upload JPG
    const upJpgRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ dataUrl: tinyJpgDataUrl }),
    });
    assert.equal(upJpgRes.status, 201, "Upload JPG deve retornar 201");
    const upJpg = await upJpgRes.json();
    assert.ok(upJpg.url && upJpg.fileName, "Upload JPG deve retornar url e fileName");
    createdPhotoNames.push(upJpg.fileName);

    // 1.2 Upload PNG
    const upPngRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ dataUrl: tinyPngDataUrl }),
    });
    assert.equal(upPngRes.status, 201, "Upload PNG deve retornar 201");
    const upPng = await upPngRes.json();
    createdPhotoNames.push(upPng.fileName);

    // 1.3 Upload WebP
    const upWebpRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ dataUrl: tinyWebpDataUrl }),
    });
    assert.equal(upWebpRes.status, 201, "Upload WebP deve retornar 201");
    const upWebp = await upWebpRes.json();
    createdPhotoNames.push(upWebp.fileName);

    // 1.4 Rejeitar formato inválido (GIF)
    const upGifRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dataUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      }),
    });
    assert.equal(upGifRes.status, 400, "Formato GIF não permitido deve retornar 400");

    // 1.5 Criar serviço de teste com a foto JPG e verificar entrega da imagem
    const createSvcRes = await fetch(`${BASE_URL}/api/services`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Serviço Teste Auditoria Corretiva",
        description: "Teste automatizado de fotos e sinal",
        price: 150,
        durationMinutes: 60,
        image: upJpg.url,
        active: true,
        requiresDeposit: true,
        depositPercentage: 30,
      }),
    });
    assert.equal(createSvcRes.status, 201, "Criação de serviço com foto deve retornar 201");
    const testService = await createSvcRes.json();
    createdServiceIds.push(testService.id);
    assert.equal(testService.image, upJpg.url);

    // Verificar que a imagem personalizada é servida com HTTP 200
    const fetchPhotoRes = await fetch(`${BASE_URL}/api/upload/file/${upJpg.fileName}`);
    assert.equal(fetchPhotoRes.status, 200, "Foto personalizada deve ser servida com 200 OK");

    // 1.6 Substituir a foto do serviço pela PNG e confirmar que a JPG antiga foi removida (sem órfãos!)
    const replacePhotoRes = await fetch(
      `${BASE_URL}/api/services/${testService.id}`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          image: upPng.url,
        }),
      }
    );
    assert.equal(replacePhotoRes.status, 200, "Substituição de foto deve retornar 200");

    const orphanJpgCheck = await prisma.servicePhoto.findUnique({
      where: { fileName: upJpg.fileName },
    });
    assert.equal(
      orphanJpgCheck,
      null,
      "Foto antiga (JPG) deve ser excluída automaticamente ao ser substituída (zero órfãos)"
    );

    // 1.7 Remover a foto personalizada (voltando para catálogo) e confirmar que a PNG também foi removida
    const removePhotoRes = await fetch(
      `${BASE_URL}/api/services/${testService.id}`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          image: "/images/service-classica.png",
        }),
      }
    );
    assert.equal(removePhotoRes.status, 200);
    const orphanPngCheck = await prisma.servicePhoto.findUnique({
      where: { fileName: upPng.fileName },
    });
    assert.equal(
      orphanPngCheck,
      null,
      "Foto personalizada (PNG) deve ser excluída ao voltar para foto padrão (zero órfãos)"
    );

    // Limpar o WebP de teste via DELETE /api/upload
    const delWebpRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "DELETE",
      headers: authHeaders,
      body: JSON.stringify({ url: upWebp.url }),
    });
    assert.equal(delWebpRes.status, 200);
    console.log("✔ [1/4] Fotos personalizadas (JPG, PNG, WebP, substituição e remoção sem órfãos) OK!");

    // =========================================================================
    // 2. TESTES DO SINAL PIX EM PORCENTAGEM (0%, 30%, 50%, 100%, Inválidos, Preservação Histórica)
    // =========================================================================
    console.log("\n[2/4] Testando Sinal Pix em Porcentagem e Preservação Histórica...");

    // 2.1 Valores inválidos (< 1 ou > 100) devem ser rejeitados com HTTP 400
    for (const invalidPct of [0, -15, 101, 250, "abc"]) {
      const badRes = await fetch(
        `${BASE_URL}/api/services/${testService.id}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ depositPercentage: invalidPct }),
        }
      );
      assert.equal(
        badRes.status,
        400,
        `Percentual inválido (${invalidPct}) deve ser recusado com HTTP 400`
      );
    }

    // Encontrar uma data futura aberta (segunda a sábado) para os testes de agendamento
    const testDate = "2027-05-10"; // Segunda-feira futura livre
    const getNextFreeSlot = async () => {
      const avRes = await fetch(
        `${BASE_URL}/api/availability?date=${testDate}&serviceId=${testService.id}`
      );
      const avData = await avRes.json();
      assert.ok(
        Array.isArray(avData.times) && avData.times.length > 0,
        "Deve haver horários disponíveis na data de teste"
      );
      return avData.times[0];
    };

    // 2.2 Serviço com 30% de sinal (R$ 150,00 -> Sinal R$ 45,00 / Restante R$ 105,00)
    await fetch(`${BASE_URL}/api/services/${testService.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        price: 150,
        requiresDeposit: true,
        depositPercentage: 30,
      }),
    });

    const slot30 = await getNextFreeSlot();
    const appt30Res = await fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: testService.id,
        date: testDate,
        time: slot30,
        name: "Maria Teste Sinal Trinta",
        phone: "(73) 99911-0030",
        acceptedPolicies: true,
      }),
    });
    assert.equal(appt30Res.status, 201, "Agendamento 30% deve retornar 201");
    const appt30 = await appt30Res.json();
    createdAppointmentIds.push(appt30.id);
    if (appt30.clientId) createdClientIds.push(appt30.clientId);

    assert.equal(appt30.signalPercentage, 30);
    assert.equal(appt30.signalAmount, 45);
    assert.equal(appt30.remainingAmount, 105);
    assert.equal(appt30.totalAmount, 150);

    // 2.3 Serviço com 50% de sinal (R$ 120,00 -> Sinal R$ 60,00 / Restante R$ 60,00)
    await fetch(`${BASE_URL}/api/services/${testService.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        price: 120,
        requiresDeposit: true,
        depositPercentage: 50,
      }),
    });

    const slot50 = await getNextFreeSlot();
    const appt50Res = await fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: testService.id,
        date: testDate,
        time: slot50,
        name: "Maria Teste Sinal Cinquenta",
        phone: "(73) 99911-0050",
        acceptedPolicies: true,
      }),
    });
    assert.equal(appt50Res.status, 201);
    const appt50 = await appt50Res.json();
    createdAppointmentIds.push(appt50.id);
    if (appt50.clientId && !createdClientIds.includes(appt50.clientId)) {
      createdClientIds.push(appt50.clientId);
    }
    assert.equal(appt50.signalPercentage, 50);
    assert.equal(appt50.signalAmount, 60);
    assert.equal(appt50.remainingAmount, 60);
    assert.equal(appt50.totalAmount, 120);

    // 2.4 Serviço com 100% de sinal (R$ 180,00 -> Sinal R$ 180,00 / Restante R$ 0,00)
    await fetch(`${BASE_URL}/api/services/${testService.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        price: 180,
        requiresDeposit: true,
        depositPercentage: 100,
      }),
    });

    const slot100 = await getNextFreeSlot();
    const appt100Res = await fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: testService.id,
        date: testDate,
        time: slot100,
        name: "Maria Teste Sinal Cem",
        phone: "(73) 99911-0100",
        acceptedPolicies: true,
      }),
    });
    assert.equal(appt100Res.status, 201);
    const appt100 = await appt100Res.json();
    createdAppointmentIds.push(appt100.id);
    if (appt100.clientId && !createdClientIds.includes(appt100.clientId)) {
      createdClientIds.push(appt100.clientId);
    }
    assert.equal(appt100.signalPercentage, 100);
    assert.equal(appt100.signalAmount, 180);
    assert.equal(appt100.remainingAmount, 0);
    assert.equal(appt100.totalAmount, 180);

    // 2.5 Serviço sem sinal obrigatório (requiresDeposit: false -> 0% sinal)
    await fetch(`${BASE_URL}/api/services/${testService.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        price: 90,
        requiresDeposit: false,
        depositPercentage: 50,
      }),
    });

    const slot0 = await getNextFreeSlot();
    const appt0Res = await fetch(`${BASE_URL}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: testService.id,
        date: testDate,
        time: slot0,
        name: "Maria Teste Sem Sinal",
        phone: "(73) 99911-0000",
        acceptedPolicies: true,
      }),
    });
    assert.equal(appt0Res.status, 201);
    const appt0 = await appt0Res.json();
    createdAppointmentIds.push(appt0.id);
    if (appt0.clientId && !createdClientIds.includes(appt0.clientId)) {
      createdClientIds.push(appt0.clientId);
    }
    assert.equal(appt0.signalPercentage, 0);
    assert.equal(appt0.signalAmount, 0);
    assert.equal(appt0.remainingAmount, 90);
    assert.equal(appt0.status, "CONFIRMED");
    assert.equal(appt0.paymentStatus, "PAY_ON_SITE");

    // 2.6 PRESERVAÇÃO HISTÓRICA: O serviço agora custa R$ 90 sem sinal,
    // mas o agendamento `appt30` (feito quando custava R$ 150 com 30%) DEVE manter R$ 150, 30%, R$ 45 e R$ 105!
    const checkHistRes = await fetch(
      `${BASE_URL}/api/appointments?id=${appt30.id}`,
      { headers: authHeaders }
    );
    assert.equal(checkHistRes.status, 200);
    const [histAppt] = await checkHistRes.json();
    assert.equal(histAppt.price, 150, "Preço histórico de R$ 150 deve ser preservado");
    assert.equal(histAppt.signalPercentage, 30, "% histórico de 30% deve ser preservado");
    assert.equal(histAppt.signalAmount, 45, "Sinal histórico de R$ 45 deve ser preservado");
    assert.equal(histAppt.remainingAmount, 105, "Restante histórico de R$ 105 deve ser preservado");
    console.log("✔ [2/4] Sinal Pix em porcentagem (0%, 30%, 50%, 100%, validação 400 e preservação histórica) OK!");

    // =========================================================================
    // 3. TESTES DE NOTIFICAÇÕES (Web Push Subscription, Eventos, Deduplicação, Leitura)
    // =========================================================================
    console.log("\n[3/4] Testando Notificações Administrativas e Web Push VAPID...");

    const vapidRes = await fetch(`${BASE_URL}/api/notifications/subscribe`);
    assert.equal(vapidRes.status, 200);
    const vapidData = await vapidRes.json();
    assert.ok(vapidData.publicKey, "Chave pública VAPID deve estar configurada");

    // Inscrever dispositivo de teste
    const subRes = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        endpoint: testPushEndpoint,
        keys: {
          p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
          auth: "tBHItJI5svbpez7KI4CCXg",
        },
        userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/124.0 Mobile",
      }),
    });
    assert.equal(subRes.status, 200, "Registro de PushSubscription deve retornar 200");

    // Informar pagamento do sinal em appt30 -> deve gerar notificação RECEIPT_REPORTED
    const receiptRes = await fetch(
      `${BASE_URL}/api/appointments/${appt30.id}/receipt`,
      { method: "POST" }
    );
    assert.equal(receiptRes.status, 200);

    // Repetir chamada de comprovante -> NÃO deve duplicar notificação (dedupeKey)
    await fetch(`${BASE_URL}/api/appointments/${appt30.id}/receipt`, {
      method: "POST",
    });

    const notifListRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: authHeaders,
    });
    assert.equal(notifListRes.status, 200);
    const notifListData = await notifListRes.json();
    assert.ok(notifListData.unreadCount >= 2, "Deve haver notificações não lidas");

    const receiptNotifs = notifListData.notifications.filter(
      (n) => n.dedupeKey === `receipt-${appt30.id}`
    );
    assert.equal(
      receiptNotifs.length,
      1,
      "Deduplicação deve garantir apenas 1 notificação de comprovante para o mesmo agendamento"
    );

    // Marcar uma notificação como lida
    const markOneRes = await fetch(`${BASE_URL}/api/notifications`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ id: receiptNotifs[0].id }),
    });
    assert.equal(markOneRes.status, 200);
    console.log("✔ [3/4] Notificações (VAPID, eventos, deduplicação e leitura) OK!");

    // =========================================================================
    // 4. TESTES DE CANCELAMENTO E SEGURANÇA DE ESTADO
    // =========================================================================
    console.log("\n[4/4] Testando Cancelamento, Liberação de Horário e Bloqueio de Ações Inválidas...");

    // 4.1 Antes de cancelar, slot30 em testDate deve estar ocupado
    const availBeforeRes = await fetch(
      `${BASE_URL}/api/availability?date=${testDate}&serviceId=${testService.id}`
    );
    const availBefore = await availBeforeRes.json();
    assert.ok(
      !availBefore.times.includes(slot30),
      `Horário ${slot30} deve estar ocupado antes do cancelamento`
    );

    // 4.2 Cancelar o agendamento appt30
    const cancelRes = await fetch(
      `${BASE_URL}/api/appointments/${appt30.id}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "CANCELLED" }),
      }
    );
    assert.equal(cancelRes.status, 200, "Cancelamento deve retornar 200");
    const cancelledAppt = await cancelRes.json();
    assert.equal(cancelledAppt.status, "CANCELLED");
    assert.equal(cancelledAppt.expiresAt, null);

    // 4.3 Verificar liberação imediata do horário slot30 em /api/availability
    const availAfterRes = await fetch(
      `${BASE_URL}/api/availability?date=${testDate}&serviceId=${testService.id}`
    );
    const availAfter = await availAfterRes.json();
    assert.ok(
      availAfter.times.includes(slot30),
      `Horário ${slot30} deve ser liberado imediatamente após o cancelamento`
    );

    // 4.4 Tentar confirmar sinal de um agendamento cancelado -> DEVE RETORNAR HTTP 400
    const confirmCancelledRes = await fetch(
      `${BASE_URL}/api/appointments/${appt30.id}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          status: "CONFIRMED",
          paymentStatus: "SIGNAL_PAID",
        }),
      }
    );
    assert.equal(
      confirmCancelledRes.status,
      400,
      "Confirmar sinal de agendamento cancelado DEVE ser bloqueado com HTTP 400"
    );

    // 4.5 Tentar enviar aviso de comprovante em agendamento cancelado -> DEVE RETORNAR HTTP 400
    const receiptCancelledRes = await fetch(
      `${BASE_URL}/api/appointments/${appt30.id}/receipt`,
      { method: "POST" }
    );
    assert.equal(
      receiptCancelledRes.status,
      400,
      "Enviar comprovante em agendamento cancelado DEVE ser bloqueado com HTTP 400"
    );

    // 4.6 Tentar remarcar diretamente um agendamento cancelado sem reactivateCancelled -> DEVE RETORNAR HTTP 400
    const directRescheduleRes = await fetch(
      `${BASE_URL}/api/appointments/${appt30.id}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          date: testDate,
          startTime: slot30,
        }),
      }
    );
    assert.equal(
      directRescheduleRes.status,
      400,
      "Remarcar diretamente agendamento cancelado sem reativação explícita DEVE retornar HTTP 400"
    );

    // 4.7 Reagendar explicitamente um agendamento cancelado (reactivateCancelled: true) -> DEVE RETORNAR HTTP 200
    const reactivateRes = await fetch(
      `${BASE_URL}/api/appointments/${appt30.id}`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          date: testDate,
          startTime: slot30,
          reactivateCancelled: true,
        }),
      }
    );
    assert.equal(
      reactivateRes.status,
      200,
      "Reagendamento explícito (reactivateCancelled: true) deve funcionar com HTTP 200"
    );
    const reactivatedAppt = await reactivateRes.json();
    assert.notEqual(reactivatedAppt.status, "CANCELLED");
    assert.equal(reactivatedAppt.startTime, slot30);

    console.log("✔ [4/4] Cancelamento, liberação de horário, bloqueios de segurança (400) e reagendamento explícito OK!");
    console.log("\n=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===");
  } finally {
    // Teardown completo sem deixar resíduos no banco de produção
    console.log("\nExecutando limpeza cirúrgica dos registros de teste...");
    try {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: testPushEndpoint },
      });
      if (createdAppointmentIds.length > 0) {
        await prisma.adminNotification.deleteMany({
          where: { appointmentId: { in: createdAppointmentIds } },
        });
        await prisma.appointment.deleteMany({
          where: { id: { in: createdAppointmentIds } },
        });
      }
      if (createdServiceIds.length > 0) {
        await prisma.service.deleteMany({
          where: { id: { in: createdServiceIds } },
        });
      }
      if (createdClientIds.length > 0) {
        await prisma.client.deleteMany({
          where: { id: { in: createdClientIds } },
        });
      }
      if (createdPhotoNames.length > 0) {
        await prisma.servicePhoto.deleteMany({
          where: { fileName: { in: createdPhotoNames } },
        });
      }
    } catch (cleanupErr) {
      console.error("Erro na limpeza de teardown:", cleanupErr);
    }
    await prisma.$disconnect();
    if (process.platform === "win32" && serverProc.pid) {
      spawn("taskkill", ["/pid", String(serverProc.pid), "/f", "/t"]);
    } else {
      serverProc.kill();
    }
  }
}

main().catch((err) => {
  console.error("FALHA NOS TESTES:", err);
  process.exit(1);
});
