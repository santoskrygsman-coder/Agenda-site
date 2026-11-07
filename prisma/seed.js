const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  // 1. Criar ou atualizar usuária administrativa padrão
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Profissional",
      username: "admin",
      email: "admin@estetica.local",
      passwordHash: hashPassword(initialPassword),
      role: "ADMIN",
    },
  });

  // 2. Configurar Horários de Funcionamento (Segunda a Sábado: 09:00 às 17:00, intervalo 11:00 às 13:00 para gerar 09:00..10:30 e 13:00..16:30)
  for (let weekday = 1; weekday <= 6; weekday++) {
    await prisma.workingHours.upsert({
      where: { weekday },
      update: {},
      create: {
        weekday,
        startTime: "09:00",
        endTime: "18:30",
        breakStart: "12:00",
        breakEnd: "13:00",
        active: true,
      },
    });
  }

  // Domingo como folga padrão
  await prisma.workingHours.upsert({
    where: { weekday: 0 },
    update: {},
    create: {
      weekday: 0,
      startTime: "09:00",
      endTime: "18:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      active: false,
    },
  });

  // 3. Criar catálogo inicial de procedimentos de cílios se ainda não existir
  const existingServices = await prisma.service.count();
  if (existingServices === 0) {
    const defaultServices = [
      {
        name: "Extensão clássica",
        description: "Resultado natural e elegante",
        price: 120,
        duration: 90,
        image: "/images/service-classica.png",
        active: true,
        requiresDeposit: true,
        sortOrder: 1,
      },
      {
        name: "Volume brasileiro",
        description: "Mais volume e definição",
        price: 150,
        duration: 120,
        image: "/images/service-brasileiro.png",
        active: true,
        requiresDeposit: true,
        sortOrder: 2,
      },
      {
        name: "Volume híbrido",
        description: "Natural com mais densidade",
        price: 160,
        duration: 120,
        image: "/images/service-hibrido.png",
        active: true,
        requiresDeposit: true,
        sortOrder: 3,
      },
      {
        name: "Volume russo",
        description: "Máximo volume e impacto",
        price: 180,
        duration: 150,
        image: "/images/service-russo.png",
        active: true,
        requiresDeposit: true,
        sortOrder: 4,
      },
      {
        name: "Manutenção",
        description: "Retoque para manter o resultado",
        price: 100,
        duration: 90,
        image: "/images/service-manutencao.png",
        active: true,
        requiresDeposit: true,
        sortOrder: 5,
      },
      {
        name: "Remoção",
        description: "Remoção segura das extensões",
        price: 50,
        duration: 30,
        image: "/images/service-remocao.png",
        active: true,
        requiresDeposit: true,
        sortOrder: 6,
      },
    ];

    for (const svc of defaultServices) {
      await prisma.service.create({ data: svc });
    }
  }

  // 4. Criar configurações básicas do sistema (sem dados fictícios de clientes/agendamentos)
  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        professionalName: "Estética de Cílios",
        specialty: "Extensão de Cílios",
        description:
          "Extensão de cílios com técnica, segurança e um resultado natural.",
        whatsapp: "",
        pixKey: "",
        pixKeyType: "CPF",
        signalPercentage: 50,
        minAdvanceMinutes: 0,
        maxDaysAhead: 60,
        pendingBlocksSlot: true,
      },
    });
  }

  console.log("Banco de dados inicializado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
