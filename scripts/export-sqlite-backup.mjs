import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const backupDir = path.join(process.cwd(), "backups");
  await fs.mkdir(backupDir, { recursive: true });

  const [
    users,
    clients,
    services,
    galleryImages,
    appointments,
    workingHours,
    blockedDates,
    expenses,
    settings,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.client.findMany(),
    prisma.service.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.galleryImage.findMany(),
    prisma.appointment.findMany(),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.blockedDate.findMany(),
    prisma.expense.findMany(),
    prisma.settings.findMany(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    source: "prisma/dev.db (SQLite)",
    counts: {
      users: users.length,
      clients: clients.length,
      services: services.length,
      galleryImages: galleryImages.length,
      appointments: appointments.length,
      workingHours: workingHours.length,
      blockedDates: blockedDates.length,
      expenses: expenses.length,
      settings: settings.length,
    },
    data: {
      users,
      clients,
      services,
      galleryImages,
      appointments,
      workingHours,
      blockedDates,
      expenses,
      settings,
    },
  };

  const outPath = path.join(backupDir, "sqlite-data-export.json");
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");

  console.log("✅ Backup JSON exportado com sucesso em:", outPath);
  console.log("📊 Contagem de registros preservados:", payload.counts);
}

main()
  .catch((err) => {
    console.error("Erro ao exportar backup SQLite:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
