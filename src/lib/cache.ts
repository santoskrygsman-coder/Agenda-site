import { prisma } from "./prisma";
import { ensureDatabaseSchemaSynced } from "./db-sync";
import type {
  Settings,
  Service,
  WorkingHours,
  BlockedDate,
} from "@prisma/client";

const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface ServerCacheStore {
  settings?: CacheEntry<Settings>;
  servicesAll?: CacheEntry<Service[]>;
  workingHours?: CacheEntry<WorkingHours[]>;
  blockedDates?: CacheEntry<BlockedDate[]>;
  inflight: Record<string, Promise<unknown> | undefined>;
}

const globalForCache = globalThis as unknown as {
  __studioServerCache?: ServerCacheStore;
};

const store: ServerCacheStore = globalForCache.__studioServerCache ?? {
  inflight: {},
};

globalForCache.__studioServerCache = store;

function isFresh<T>(entry?: CacheEntry<T>): entry is CacheEntry<T> {
  return Boolean(entry && entry.expiresAt > Date.now());
}

export async function getCachedSettings(): Promise<Settings> {
  if (isFresh(store.settings)) {
    return store.settings.data;
  }
  if (store.inflight.settings) {
    return store.inflight.settings as Promise<Settings>;
  }
  const promise = (async () => {
    try {
      await ensureDatabaseSchemaSynced();
      let settings: Settings | null = null;
      try {
        settings = await prisma.settings.findFirst();
        if (!settings) {
          settings = await prisma.settings.create({ data: {} });
        }
      } catch {
        const rows = await prisma
          .$queryRawUnsafe<Array<Record<string, unknown>>>(
            `SELECT * FROM "Settings" LIMIT 1`
          )
          .catch(() => []);
        const r = rows[0] || {};
        settings = {
          id: String(r.id || "default-settings"),
          professionalName: String(
            r.professionalName || "Emile Lash Designer"
          ),
          specialty: String(
            r.specialty ||
              "Cílios • Sobrancelha • Brow Lamination • Lash Lifting"
          ),
          description: r.description
            ? String(r.description)
            : "Centro - Posto da Mata • @emiledesiigner",
          whatsapp: String(r.whatsapp || ""),
          pixKey: String(r.pixKey || "000.000.000-00"),
          pixKeyType: String(r.pixKeyType || "CPF"),
          signalPercentage:
            r.signalPercentage != null ? Number(r.signalPercentage) : 50,
          holdMinutes: r.holdMinutes != null ? Number(r.holdMinutes) : 15,
          minAdvanceMinutes:
            r.minAdvanceMinutes != null ? Number(r.minAdvanceMinutes) : 0,
          maxDaysAhead: r.maxDaysAhead != null ? Number(r.maxDaysAhead) : 60,
          pendingBlocksSlot: r.pendingBlocksSlot !== false,
        };
      }
      store.settings = {
        data: settings,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return settings;
    } finally {
      delete store.inflight.settings;
    }
  })();
  store.inflight.settings = promise;
  return promise;
}

export function setCachedSettings(settings: Settings): void {
  store.settings = {
    data: settings,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function invalidateSettingsCache(): void {
  delete store.settings;
}

export async function getCachedAllServices(): Promise<Service[]> {
  if (isFresh(store.servicesAll)) {
    return store.servicesAll.data;
  }
  if (store.inflight.servicesAll) {
    return store.inflight.servicesAll as Promise<Service[]>;
  }
  const promise = (async () => {
    try {
      await ensureDatabaseSchemaSynced();
      let list: Service[] = [];
      try {
        list = await prisma.service.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
      } catch {
        const rawRows = await prisma
          .$queryRawUnsafe<Array<Record<string, unknown>>>(
            `SELECT * FROM "Service" ORDER BY "createdAt" ASC`
          )
          .catch(() => []);
        list = rawRows.map((r, idx) => ({
          id: String(r.id),
          name: String(r.name || ""),
          description: r.description ? String(r.description) : "",
          price: Number(r.price || 0),
          duration: Number(r.duration || 90),
          image: String(r.image || "/images/service-classica.png"),
          active: r.active !== false,
          requiresDeposit: r.requiresDeposit !== false,
          depositPercentage:
            r.depositPercentage != null ? Number(r.depositPercentage) : 50,
          sortOrder: r.sortOrder != null ? Number(r.sortOrder) : idx,
          createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(),
          updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(),
        }));
      }
      store.servicesAll = {
        data: list,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return list;
    } finally {
      delete store.inflight.servicesAll;
    }
  })();
  store.inflight.servicesAll = promise;
  return promise;
}

export function invalidateServicesCache(): void {
  delete store.servicesAll;
}

export async function getCachedWorkingHours(): Promise<WorkingHours[]> {
  if (isFresh(store.workingHours)) {
    return store.workingHours.data;
  }
  if (store.inflight.workingHours) {
    return store.inflight.workingHours as Promise<WorkingHours[]>;
  }
  const promise = (async () => {
    try {
      const list = await prisma.workingHours.findMany({
        orderBy: { weekday: "asc" },
      });
      store.workingHours = {
        data: list,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return list;
    } finally {
      delete store.inflight.workingHours;
    }
  })();
  store.inflight.workingHours = promise;
  return promise;
}

export function setCachedWorkingHours(list: WorkingHours[]): void {
  store.workingHours = {
    data: [...list].sort((a, b) => a.weekday - b.weekday),
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function invalidateWorkingHoursCache(): void {
  delete store.workingHours;
}

export async function getCachedBlockedDates(): Promise<BlockedDate[]> {
  if (isFresh(store.blockedDates)) {
    return store.blockedDates.data;
  }
  if (store.inflight.blockedDates) {
    return store.inflight.blockedDates as Promise<BlockedDate[]>;
  }
  const promise = (async () => {
    try {
      const list = await prisma.blockedDate.findMany({
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });
      store.blockedDates = {
        data: list,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return list;
    } finally {
      delete store.inflight.blockedDates;
    }
  })();
  store.inflight.blockedDates = promise;
  return promise;
}

export function invalidateBlockedDatesCache(): void {
  delete store.blockedDates;
}
