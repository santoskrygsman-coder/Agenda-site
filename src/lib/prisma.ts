import { PrismaClient } from "@prisma/client";

function buildOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  if (
    !rawUrl.startsWith("postgres://") &&
    !rawUrl.startsWith("postgresql://")
  ) {
    return rawUrl;
  }
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.hostname.includes("pooler.supabase.com") ||
      parsed.port === "6543"
    ) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    const currentLimit = Number(parsed.searchParams.get("connection_limit"));
    if (!currentLimit || currentLimit > 5) {
      parsed.searchParams.set("connection_limit", "3");
    }
    if (!parsed.searchParams.get("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPooledV3: PrismaClient | undefined;
};

if (globalForPrisma.prisma && !globalForPrisma.prismaPooledV3) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

const optimizedUrl = buildOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prismaPooledV3 ??
  new PrismaClient(
    optimizedUrl
      ? {
          datasources: {
            db: { url: optimizedUrl },
          },
        }
      : undefined
  );

globalForPrisma.prismaPooledV3 = prisma;
