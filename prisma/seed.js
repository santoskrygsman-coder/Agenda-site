const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Configurar Horários Úteis (Segunda a Sábado, 08:00 as 18:00)
  for (let i = 1; i <= 6; i++) {
    await prisma.workingHours.upsert({
      where: { weekday: i },
      update: {},
      create: {
        weekday: i,
        startTime: '08:00',
        endTime: '18:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        active: true,
      },
    });
  }

  // Desativar Domingo
  await prisma.workingHours.upsert({
    where: { weekday: 0 },
    update: {},
    create: {
      weekday: 0,
      startTime: '00:00',
      endTime: '00:00',
      active: false,
    },
  });

  // Criar Procedimentos Básicos
  const services = [
    { name: 'Volume Brasileiro', description: 'Cílios em formato Y, técnica rápida e volume médio.', price: 150, duration: 120 },
    { name: 'Volume Russo', description: 'Fios super finos montados em fans, volume intenso.', price: 200, duration: 150 },
    { name: 'Lash Lifting', description: 'Curvatura e coloração dos cílios naturais.', price: 120, duration: 60 },
    { name: 'Design de Sobrancelhas', description: 'Alinhamento e design para o seu rosto.', price: 50, duration: 30 },
    { name: 'Design + Henna', description: 'Design completo com aplicação de henna.', price: 70, duration: 45 },
  ];

  for (const s of services) {
    await prisma.service.create({
      data: s
    });
  }
  console.log('Serviços criados/atualizados!');

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        professionalName: "Designer de Sobrancelhas",
        specialty: "Especialista em olhar",
        whatsapp: "5511999999999",
      }
    });
    console.log('Configurações criadas!');
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
