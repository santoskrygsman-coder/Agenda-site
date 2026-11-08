import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

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

const sqlPath = path.resolve(
  process.cwd(),
  "prisma/migrations/20261108_corrective_update/migration.sql"
);
const sqlContent = fs.readFileSync(sqlPath, "utf8");

// Split statements by semicolon outside comments
const statements = sqlContent
  .split(/;\s*\r?\n/)
  .map((s) =>
    s
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim()
  )
  .filter(Boolean);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log(`Executando ${statements.length} instruções SQL da migration 20261108_corrective_update...`);
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log("Migration 20261108_corrective_update aplicada com sucesso no Supabase PostgreSQL!");
}

main()
  .catch((err) => {
    console.error("Erro ao aplicar migration:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
