import { prisma } from "./prisma";
import type {
  Settings,
  Service,
  WorkingHours,
  BlockedDate,
} from "@prisma/client";

const CACHE_TTL_MS = 1_500;

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

if (process.env.NODE_ENV !== "production") {
  globalForCache.__studioServerCache = store;
}

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
      let settings = await prisma.settings.findFirst();
      if (!settings) {
        settings = await prisma.settings.create({ data: {} });
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
      const list = await prisma.service.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
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
