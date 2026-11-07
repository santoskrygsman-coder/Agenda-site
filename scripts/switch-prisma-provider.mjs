import fs from "node:fs/promises";
import path from "node:path";

/**
 * Alterna de forma segura o prisma/schema.prisma entre:
 * - "sqlite" (desenvolvimento local com prisma/dev.db preservado)
 * - "postgresql" (produção / homologação com Supabase PostgreSQL)
 */
async function main() {
  const mode = (process.argv[2] || "").toLowerCase();
  if (mode !== "postgresql" && mode !== "sqlite") {
    console.error("Uso: node scripts/switch-prisma-provider.mjs <postgresql|sqlite>");
    process.exit(1);
  }

  const prismaDir = path.join(process.cwd(), "prisma");
  const activeSchemaPath = path.join(prismaDir, "schema.prisma");
  const sqliteBackupSchemaPath = path.join(prismaDir, "schema.sqlite.prisma");
  const pgSchemaPath = path.join(prismaDir, "schema.postgresql.prisma");

  // Preservar cópia do schema SQLite se ainda não existir
  try {
    await fs.access(sqliteBackupSchemaPath);
  } catch {
    const currentContent = await fs.readFile(activeSchemaPath, "utf-8");
    if (currentContent.includes('provider = "sqlite"')) {
      await fs.writeFile(sqliteBackupSchemaPath, currentContent, "utf-8");
    }
  }

  if (mode === "postgresql") {
    const pgContent = await fs.readFile(pgSchemaPath, "utf-8");
    await fs.writeFile(activeSchemaPath, pgContent, "utf-8");
    console.log("✅ prisma/schema.prisma atualizado para provider = 'postgresql' (Supabase).");
    console.log("👉 Em seguida execute: npx prisma generate");
  } else {
    const sqliteContent = await fs.readFile(sqliteBackupSchemaPath, "utf-8");
    await fs.writeFile(activeSchemaPath, sqliteContent, "utf-8");
    console.log("✅ prisma/schema.prisma restaurado para provider = 'sqlite' (prisma/dev.db).");
    console.log("👉 Em seguida execute: npx prisma generate");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
