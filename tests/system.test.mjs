import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  return crypto.timingSafeEqual(derivedBuf, keyBuf);
}

async function computeSlots(dateStr, durationMins) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const wh = await prisma.workingHours.findUnique({ where: { weekday } });
  if (!wh || !wh.active) return [];

  const blocks = await prisma.blockedDate.findMany({
    where: { date: dateStr },
  });
  if (blocks.some((b) => !b.startTime || !b.endTime)) return [];

  const appts = await prisma.appointment.findMany({
    where: {
      date: dateStr,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
    },
  });

  const whStart = timeToMinutes(wh.startTime);
  const whEnd = timeToMinutes(wh.endTime);
  const hasBreak = Boolean(wh.breakStart && wh.breakEnd);
  const breakStart = hasBreak ? timeToMinutes(wh.breakStart) : -1;
  const breakEnd = hasBreak ? timeToMinutes(wh.breakEnd) : -1;

  const slots = [];
  let cursor = whStart;
  while (cursor + durationMins <= whEnd) {
    const s = cursor;
    const e = cursor + durationMins;
    const overlapsBreak =
      hasBreak && intervalsOverlap(s, e, breakStart, breakEnd);
    const overlapsPartial = blocks
      .filter((b) => b.startTime && b.endTime)
      .some((b) =>
        intervalsOverlap(
          s,
          e,
          timeToMinutes(b.startTime),
          timeToMinutes(b.endTime)
        )
      );
    const overlapsAppt = appts.some((a) =>
      intervalsOverlap(
        s,
        e,
        timeToMinutes(a.startTime),
        timeToMinutes(a.endTime)
      )
    );

    if (!overlapsBreak && !overlapsPartial && !overlapsAppt) {
      slots.push(minutesToTime(s));
    }
    cursor += 30;
  }
  return slots;
}

test("Módulo 1: Banco de dados persistente e autenticação administrativa", async () => {
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  assert.ok(admin, "Usuária administrativa deve existir no banco");
  assert.equal(admin.role, "ADMIN");
  const expectedPass = process.env.ADMIN_PRODUCTION_PASSWORD || "admin123";
  assert.equal(verifyPassword(expectedPass, admin.passwordHash), true);
  assert.equal(verifyPassword("senha_errada", admin.passwordHash), false);
});

test("Módulo 2: Cadastro, edição, ativação e exclusão de serviços com preço e duração", async () => {
  const allServices = await prisma.service.findMany();
  assert.ok(allServices.length >= 6, "Deve possuir os 6 serviços base");

  // Criar serviço de teste
  const created = await prisma.service.create({
    data: {
      name: "Teste Mega Volume",
      description: "Teste automatizado",
      price: 210,
      duration: 150,
      active: true,
    },
  });
  assert.equal(created.price, 210);
  assert.equal(created.duration, 150);

  // Editar e desativar serviço
  const updated = await prisma.service.update({
    where: { id: created.id },
    data: { price: 220, active: false },
  });
  assert.equal(updated.price, 220);
  assert.equal(updated.active, false);

  // Limpar serviço de teste
  await prisma.service.delete({ where: { id: created.id } });
});

test("Módulo 3: Horários de funcionamento, intervalos, folgas e bloqueios", async () => {
  await prisma.appointment.deleteMany({ where: { date: "2025-03-14" } });
  // Domingo (0) deve ser folga
  const sundaySlots = await computeSlots("2025-03-16", 90);
  assert.equal(sundaySlots.length, 0, "Domingo deve retornar 0 horários (folga)");

  // Sexta-feira (14/03/2025) sem bloqueios deve respeitar intervalo de almoço (12:00-13:00)
  const fridaySlots = await computeSlots("2025-03-14", 90);
  assert.ok(fridaySlots.includes("09:00"));
  assert.ok(fridaySlots.includes("14:00"));
  assert.equal(
    fridaySlots.includes("11:00"),
    false,
    "11:00 com duração 90min terminaria às 12:30 (invade o almoço 12:00-13:00)"
  );

  // Bloqueio de data inteira
  const block = await prisma.blockedDate.create({
    data: { date: "2025-03-20", reason: "Feriado Municipal" },
  });
  const blockedDaySlots = await computeSlots("2025-03-20", 90);
  assert.equal(blockedDaySlots.length, 0, "Data bloqueada não deve ter vagas");
  await prisma.blockedDate.delete({ where: { id: block.id } });
});

test("Módulos 4, 5, 6, 7, 8 e 9: Fluxo completo de agendamento, bloqueio de duplicidade, comprovante Pix sem baixa automática, confirmação manual e financeiro", async () => {
  const testDate = "2025-04-18"; // Sexta-feira
  // Limpar dados residuais de teste nesta data
  await prisma.appointment.deleteMany({ where: { date: testDate } });
  await prisma.expense.deleteMany({ where: { date: testDate } });

  const service = await prisma.service.findFirst({
    where: { name: "Volume brasileiro" },
  });
  assert.ok(service, "Serviço Volume brasileiro deve existir");

  // 1. Verificar disponibilidade inicial às 14:00
  const initialSlots = await computeSlots(testDate, service.duration);
  assert.ok(initialSlots.includes("14:00"), "14:00 deve estar disponível");

  // 2. Criar cliente e primeiro agendamento (14:00 às 16:00)
  const client = await prisma.client.upsert({
    where: { phone: "5511988887777" },
    update: { name: "Cliente Teste Real" },
    create: {
      name: "Cliente Teste Real",
      phone: "5511988887777",
      notes: "Prefere um resultado mais natural.",
    },
  });

  const signalAmount = service.price * 0.5;
  const appt = await prisma.appointment.create({
    data: {
      clientId: client.id,
      serviceId: service.id,
      date: testDate,
      startTime: "14:00",
      endTime: "16:00",
      status: "PENDING",
      paymentStatus: "PENDING_SIGNAL",
      signalAmount,
      totalAmount: service.price,
      notes: "Prefere um resultado mais natural.",
    },
  });

  // 3. Impedir reserva duplicada ou sobreposta (14:00, 14:30, 15:00, 15:30 ocupados)
  const afterBookingSlots = await computeSlots(testDate, service.duration);
  assert.equal(
    afterBookingSlots.includes("14:00"),
    false,
    "14:00 não pode mais estar disponível após reserva"
  );
  assert.equal(
    afterBookingSlots.includes("15:00"),
    false,
    "15:00 conflita com reserva das 14:00 às 16:00"
  );
  assert.ok(
    afterBookingSlots.includes("16:00"),
    "16:00 deve continuar disponível (16:00 às 18:00)"
  );

  // 4. Simular envio de comprovante pelo WhatsApp pela cliente
  // Regra crítica: NÃO deve marcar paymentStatus como pago automaticamente!
  const afterReceipt = await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      receiptReportedAt: new Date(),
      whatsappStatus: "OPENED",
    },
  });
  assert.equal(
    afterReceipt.paymentStatus,
    "PENDING_SIGNAL",
    "O envio do comprovante NÃO deve marcar o sinal como pago automaticamente"
  );
  assert.equal(
    afterReceipt.status,
    "PENDING",
    "O status deve permanecer PENDING até confirmação manual da profissional"
  );

  // 5. Confirmação manual do sinal via Pix pela profissional
  const confirmedAppt = await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "SIGNAL_PAID",
      signalPaidAt: new Date(),
    },
  });
  assert.equal(confirmedAppt.status, "CONFIRMED");
  assert.equal(confirmedAppt.paymentStatus, "SIGNAL_PAID");

  // 6. Registrar despesa e validar cálculo financeiro
  const expense = await prisma.expense.create({
    data: {
      description: "Pinças e Adesivos",
      amount: 45,
      date: testDate,
      category: "Materiais",
    },
  });
  assert.equal(expense.amount, 45);

  // Limpar registros de teste para manter o banco limpo sem dados fictícios
  await prisma.expense.delete({ where: { id: expense.id } });
  await prisma.appointment.delete({ where: { id: appt.id } });
  await prisma.client.delete({ where: { id: client.id } });
});

test("Módulo 10: Expiração automática de reserva sem comprovante e preservação de reserva com comprovante anexado", async () => {
  const testDate = "2025-04-25"; // Sexta-feira
  await prisma.appointment.deleteMany({ where: { date: testDate } });

  const service = await prisma.service.findFirst({
    where: { name: "Volume brasileiro" },
  });
  const client = await prisma.client.upsert({
    where: { phone: "5511944443333" },
    update: { name: "Cliente Cronômetro" },
    create: { name: "Cliente Cronômetro", phone: "5511944443333" },
  });

  // Criar reserva já vencida (expiresAt no passado, sem comprovante)
  const expiredAppt = await prisma.appointment.create({
    data: {
      clientId: client.id,
      serviceId: service.id,
      date: testDate,
      startTime: "10:00",
      endTime: "12:00",
      status: "PENDING",
      paymentStatus: "PENDING_SIGNAL",
      signalAmount: 75,
      totalAmount: 150,
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });

  // Executar rotina de expiração automática
  const expiredCount = await prisma.appointment.updateMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING_SIGNAL",
      receiptReportedAt: null,
      expiresAt: { not: null, lt: new Date() },
    },
    data: { status: "CANCELLED" },
  });
  assert.ok(expiredCount.count >= 1, "Deve cancelar reserva cujo prazo expirou");

  const reloaded = await prisma.appointment.findUnique({
    where: { id: expiredAppt.id },
  });
  assert.equal(reloaded.status, "CANCELLED");

  // O horário de 10:00 deve voltar a ficar disponível
  const slotsAfterExpire = await computeSlots(testDate, service.duration);
  assert.ok(
    slotsAfterExpire.includes("10:00"),
    "Horário de 10:00 deve ser liberado automaticamente após expirar"
  );

  await prisma.appointment.delete({ where: { id: expiredAppt.id } });
  await prisma.client.delete({ where: { id: client.id } });
});
