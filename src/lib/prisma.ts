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
    const currentLimit = Number(parsed.searchParams.get("connection_limit"));
    if (!currentLimit || currentLimit < 10) {
      parsed.searchParams.set("connection_limit", "10");
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
  prismaPooledV2: PrismaClient | undefined;
};

// Desconecta eventual instância legada que estava limitada a 1 conexão (connection_limit=1)
if (globalForPrisma.prisma && !globalForPrisma.prismaPooledV2) {
  globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

const optimizedUrl = buildOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prismaPooledV2 ??
  new PrismaClient(
    optimizedUrl
      ? {
          datasources: {
            db: { url: optimizedUrl },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPooledV2 = prisma;
}
