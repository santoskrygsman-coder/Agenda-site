"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  MOCK_SERVICES,
  ServiceItem,
  AppointmentItem,
} from "@/lib/mockData";
import { getDefaultBookingDate } from "@/lib/validation";

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  notes: string;
  acceptedPolicies: boolean;
}

interface StudioSettings {
  professionalName: string;
  specialty: string;
  description: string;
  whatsapp: string;
  pixKey: string;
  pixKeyType: string;
  signalPercentage: number;
  holdMinutes: number;
}

interface BookingContextType {
  services: ServiceItem[];
  allServices: ServiceItem[];
  servicesLoading: boolean;
  refreshServices: (includeAll?: boolean) => Promise<void>;
  toggleServiceActive: (id: string) => Promise<void>;
  createOrUpdateService: (payload: {
    id?: string;
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    image: string;
    active: boolean;
    requiresDeposit?: boolean;
    depositPercentage?: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ ok: boolean; error?: string }>;
  selectedService: ServiceItem;
  setSelectedServiceById: (id: string) => void;
  selectedYear: number;
  selectedMonth: number; // 1..12
  selectedDay: number;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDay: (day: number) => void;
  setSelectedYearMonth: (year: number, month: number) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  availableTimes: string[];
  loadingAvailability: boolean;
  availabilityReason?: string;
  clientData: ClientFormData;
  setClientData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  lastCreatedAppointmentId: string | null;
  lastCreatedExpiresAt: string | null;
  createBooking: () => Promise<{
    ok: boolean;
    appointmentId?: string;
    expiresAt?: string | null;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
  reportReceiptSent: (appointmentId: string) => Promise<boolean>;
  resumeClientAppointment: (appt: {
    id: string;
    serviceId: string;
    date: string;
    startTime: string;
    clientName: string;
    clientPhone: string;
    expiresAt?: string | null;
  }) => void;
  studioSettings: StudioSettings;
  refreshSettings: () => Promise<void>;
  todayOpenStatus: string;
  refreshWorkingHours: (
    preloadedList?: Array<{ weekday: number; active: boolean; endTime: string }>
  ) => Promise<void>;
  selectedAppointment: AppointmentItem | null;
  setSelectedAppointment: (apt: AppointmentItem | null) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const STORAGE_SERVICES_KEY = "emile_services_cache_v2";
const STORAGE_ALL_SERVICES_KEY = "emile_all_services_cache_v2";
const STORAGE_SELECTED_SVC_KEY = "emile_selected_service_id_v2";
const STORAGE_OPEN_STATUS_KEY = "emile_open_status_cache_v2";
const STORAGE_SETTINGS_KEY = "emile_settings_cache_v2";

function readCachedJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeCachedJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  professionalName: "Emile Lash Designer",
  specialty: "Cílios • Sobrancelha • Brow Lamination • Lash Lifting",
  description: "Centro - Posto da Mata • @emiledesiigner",
  whatsapp: "",
  pixKey: "000.000.000-00",
  pixKeyType: "CPF",
  signalPercentage: 50,
  holdMinutes: 15,
};

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const defaultBookingDate = getDefaultBookingDate();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [allServices, setAllServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);
  const [servicesLoaded, setServicesLoaded] = useState<boolean>(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const [selectedYear, setSelectedYear] = useState<number>(
    defaultBookingDate.year
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    defaultBookingDate.month
  );
  const [selectedDay, setSelectedDayState] = useState<number>(
    defaultBookingDate.day
  );
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingAvailability, setLoadingAvailability] =
    useState<boolean>(true);
  const [availabilityReason, setAvailabilityReason] = useState<
    string | undefined
  >(undefined);

  const [clientData, setClientData] = useState<ClientFormData>({
    name: "",
    phone: "",
    email: "",
    notes: "",
    acceptedPolicies: false,
  });

  const [lastCreatedAppointmentId, setLastCreatedAppointmentId] = useState<
    string | null
  >(null);
  const [lastCreatedExpiresAt, setLastCreatedExpiresAt] = useState<
    string | null
  >(null);
  const [todayOpenStatus, setTodayOpenStatus] = useState<string>("");

  const [studioSettings, setStudioSettings] = useState<StudioSettings>(
    DEFAULT_STUDIO_SETTINGS
  );

  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [scheduleVersion, setScheduleVersion] = useState<number>(0);

  const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(
    2,
    "0"
  )}-${String(selectedDay).padStart(2, "0")}`;

  const selectedService =
    services.find((s) => s.id === selectedServiceId) ||
    allServices.find((s) => s.id === selectedServiceId) ||
    services[0] ||
    allServices[0] ||
    MOCK_SERVICES[0];

  const refreshServices = useCallback(async (includeAll = false) => {
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      let activeList: ServiceItem[] = [];
      if (res.ok) {
        const data: ServiceItem[] = await res.json();
        activeList = Array.isArray(data) ? data : [];
        setServices(activeList);
        writeCachedJson(STORAGE_SERVICES_KEY, activeList);

        if (activeList.length > 0) {
          setSelectedServiceId((prev) => {
            let nextId = prev;
            if (!prev || !activeList.some((s) => s.id === prev)) {
              nextId = activeList[0].id;
            }
            if (typeof window !== "undefined") {
              try {
                window.sessionStorage.setItem(STORAGE_SELECTED_SVC_KEY, nextId);
              } catch {}
            }
            return nextId;
          });
        }
      }

      const isAdminPath =
        includeAll ||
        (typeof window !== "undefined" &&
          window.location.pathname.startsWith("/admin"));

      if (isAdminPath) {
        const adminRes = await fetch("/api/services?all=true", {
          cache: "no-store",
        });
        if (adminRes.ok) {
          const adminData: ServiceItem[] = await adminRes.json();
          const fullList = Array.isArray(adminData) ? adminData : activeList;
          setAllServices(fullList);
          writeCachedJson(STORAGE_ALL_SERVICES_KEY, fullList);
        } else {
          setAllServices(activeList);
          writeCachedJson(STORAGE_ALL_SERVICES_KEY, activeList);
        }
      } else {
        setAllServices(activeList);
        writeCachedJson(STORAGE_ALL_SERVICES_KEY, activeList);
      }
    } catch {
      // Fallback silencioso mantendo cache local
    } finally {
      setServicesLoading(false);
      setServicesLoaded(true);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const r = await fetch("/api/settings", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      if (data) {
        const nextSettings: StudioSettings = {
          professionalName:
            data.professionalName &&
            data.professionalName !== "Estética de Cílios"
              ? data.professionalName
              : "Emile Lash Designer",
          specialty:
            data.specialty && data.specialty !== "Extensão de Cílios"
              ? data.specialty
              : "Cílios • Sobrancelha • Brow Lamination • Lash Lifting",
          description:
            data.description || "Centro - Posto da Mata • @emiledesiigner",
          whatsapp: data.whatsapp || "",
          pixKey: data.pixKey || "000.000.000-00",
          pixKeyType: data.pixKeyType || "CPF",
          signalPercentage: data.signalPercentage ?? 50,
          holdMinutes: data.holdMinutes ?? 15,
        };
        setStudioSettings(nextSettings);
        writeCachedJson(STORAGE_SETTINGS_KEY, nextSettings);
      }
    } catch {
      // Fallback silencioso
    }
  }, []);

  const refreshWorkingHours = useCallback(
    async (
      preloadedList?: Array<{
        weekday: number;
        active: boolean;
        endTime: string;
      }>
    ) => {
      try {
        let whList = preloadedList;
        if (!Array.isArray(whList)) {
          const r = await fetch("/api/working-hours", { cache: "no-store" });
          if (!r.ok) return;
          whList = await r.json();
        }
        if (Array.isArray(whList) && whList.length > 0) {
          const todayWeekday = new Date().getDay();
          const todayWh = whList.find(
            (w: { weekday: number; active: boolean; endTime: string }) =>
              w.weekday === todayWeekday
          );
          let nextStatus = "Atendimento com hora marcada";
          if (todayWh && todayWh.active) {
            nextStatus = `Aberto hoje até ${todayWh.endTime}`;
          } else {
            const anyActive = whList.find(
              (w: { active: boolean; endTime: string }) => w.active
            );
            if (anyActive) {
              nextStatus = `Seg a Sáb até ${anyActive.endTime}`;
            }
          }
          setTodayOpenStatus(nextStatus);
          writeCachedJson(STORAGE_OPEN_STATUS_KEY, nextStatus);
        }
        setScheduleVersion((v) => v + 1);
      } catch {
        // Fallback silencioso
      }
    },
    []
  );

  useEffect(() => {
    const cachedServices = readCachedJson<ServiceItem[]>(
      STORAGE_SERVICES_KEY,
      []
    );
    const cachedAllServices = readCachedJson<ServiceItem[]>(
      STORAGE_ALL_SERVICES_KEY,
      []
    );
    const cachedOpenStatus = readCachedJson<string>(STORAGE_OPEN_STATUS_KEY, "");
    const cachedSettings = readCachedJson<StudioSettings | null>(
      STORAGE_SETTINGS_KEY,
      null
    );

    if (cachedServices.length > 0) {
      setServices(cachedServices);
      setServicesLoading(false);
    }
    if (cachedAllServices.length > 0) {
      setAllServices(cachedAllServices);
    }
    if (cachedOpenStatus) {
      setTodayOpenStatus(cachedOpenStatus);
    }
    if (cachedSettings) {
      setStudioSettings(cachedSettings);
    }
    try {
      const savedSvcId = window.sessionStorage.getItem(STORAGE_SELECTED_SVC_KEY);
      if (savedSvcId) {
        setSelectedServiceId(savedSvcId);
      }
    } catch {}

    refreshServices();
    refreshSettings();
    refreshWorkingHours();
  }, [refreshServices, refreshSettings, refreshWorkingHours]);

  // Carregar disponibilidade real somente nas telas de agendamento (/agendar/*)
  useEffect(() => {
    if (!pathname?.startsWith("/agendar")) {
      return;
    }
    if (!servicesLoaded && services.length === 0) {
      return;
    }
    let active = true;
    const fetchSlots = async () => {
      setLoadingAvailability(true);
      try {
        const query = new URLSearchParams({
          date: selectedDate,
          duration: String(selectedService?.durationMinutes || 90),
        });
        if (
          selectedService?.id &&
          !selectedService.id.startsWith("extensao-") &&
          !selectedService.id.startsWith("volume-") &&
          !selectedService.id.startsWith("manutencao") &&
          !selectedService.id.startsWith("remocao")
        ) {
          query.set("serviceId", selectedService.id);
        }
        const res = await fetch(`/api/availability?${query.toString()}`, {
          cache: "no-store",
        });
        if (res.ok && active) {
          const data = await res.json();
          const slots: string[] = Array.isArray(data.times) ? data.times : [];
          setAvailableTimes(slots);
          setAvailabilityReason(data.reason);
          setSelectedTime((prevTime) => {
            if (slots.length === 0) return "";
            if (prevTime && slots.includes(prevTime)) return prevTime;
            return slots.includes("14:00") ? "14:00" : slots[0];
          });
        }
      } catch {
        // Ignorar erro de rede
      } finally {
        if (active) setLoadingAvailability(false);
      }
    };
    fetchSlots();
    return () => {
      active = false;
    };
  }, [
    pathname,
    servicesLoaded,
    services.length,
    selectedDate,
    selectedService?.id,
    selectedService?.durationMinutes,
    scheduleVersion,
  ]);

  const toggleServiceActive = async (id: string) => {
    const target = allServices.find((s) => s.id === id);
    if (!target) return;
    const nextActive = !target.active;

    setAllServices((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, active: nextActive } : item
      );
      const nextActiveList = next.filter((item) => item.active);
      setServices(nextActiveList);
      writeCachedJson(STORAGE_ALL_SERVICES_KEY, next);
      writeCachedJson(STORAGE_SERVICES_KEY, nextActiveList);
      return next;
    });

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) {
        await refreshServices(true);
      }
    } catch {
      await refreshServices(true);
    }
  };

  const createOrUpdateService = async (payload: {
    id?: string;
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    image: string;
    active: boolean;
    requiresDeposit?: boolean;
    depositPercentage?: number;
  }) => {
    try {
      const url = payload.id ? `/api/services/${payload.id}` : "/api/services";
      const method = payload.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Erro ao salvar serviço" };
      }
      await refreshServices(true);
      return { ok: true };
    } catch {
      return { ok: false, error: "Erro de comunicação com o servidor" };
    }
  };

  const deleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Erro ao excluir serviço" };
      }
      setAllServices((prev) => {
        const next = prev.filter((item) => item.id !== id);
        const nextActiveList = next.filter((item) => item.active);
        setServices(nextActiveList);
        writeCachedJson(STORAGE_ALL_SERVICES_KEY, next);
        writeCachedJson(STORAGE_SERVICES_KEY, nextActiveList);
        return next;
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "Erro de comunicação com o servidor" };
    }
  };

  const setSelectedServiceById = (id: string) => {
    if (id !== selectedServiceId) {
      setLoadingAvailability(true);
      setAvailableTimes([]);
    }
    setSelectedServiceId(id);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(STORAGE_SELECTED_SVC_KEY, id);
      } catch {}
    }
  };

  const setSelectedDay = (day: number) => {
    if (day !== selectedDay) {
      setLoadingAvailability(true);
    }
    setSelectedDayState(day);
  };

  const setSelectedYearMonth = (year: number, month: number) => {
    if (year !== selectedYear || month !== selectedMonth) {
      setLoadingAvailability(true);
    }
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const createBooking = async () => {
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedTime,
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email,
          notes: clientData.notes,
          acceptedPolicies: clientData.acceptedPolicies,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || "Não foi possível concluir o agendamento.",
          fieldErrors: data.fieldErrors,
        };
      }
      setLastCreatedAppointmentId(data.id);
      const fallbackExp = new Date(
        Date.now() + (studioSettings.holdMinutes || 15) * 60 * 1000
      ).toISOString();
      setLastCreatedExpiresAt(data.expiresAt || fallbackExp);
      return {
        ok: true,
        appointmentId: data.id,
        expiresAt: data.expiresAt || fallbackExp,
      };
    } catch {
      return {
        ok: false,
        error: "Erro de conexão ao registrar agendamento.",
      };
    }
  };

  const reportReceiptSent = async (appointmentId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/receipt`, {
        method: "POST",
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const resumeClientAppointment = (appt: {
    id: string;
    serviceId: string;
    date: string;
    startTime: string;
    clientName: string;
    clientPhone: string;
    expiresAt?: string | null;
  }) => {
    setSelectedServiceId(appt.serviceId);
    const [y, m, d] = (appt.date || "2025-03-14").split("-").map(Number);
    if (y && m && d) {
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDayState(d);
    }
    setSelectedTime(appt.startTime);
    setClientData((prev) => ({
      ...prev,
      name: appt.clientName,
      phone: appt.clientPhone,
    }));
    setLastCreatedAppointmentId(appt.id);
    setLastCreatedExpiresAt(appt.expiresAt || null);
  };

  return (
    <BookingContext.Provider
      value={{
        services,
        allServices,
        servicesLoading,
        refreshServices,
        toggleServiceActive,
        createOrUpdateService,
        deleteService,
        selectedService,
        setSelectedServiceById,
        selectedYear,
        selectedMonth,
        selectedDay,
        selectedDate,
        setSelectedDay,
        setSelectedYearMonth,
        selectedTime,
        setSelectedTime,
        availableTimes,
        loadingAvailability,
        availabilityReason,
        clientData,
        setClientData,
        lastCreatedAppointmentId,
        lastCreatedExpiresAt,
        createBooking,
        reportReceiptSent,
        resumeClientAppointment,
        studioSettings,
        refreshSettings,
        todayOpenStatus,
        refreshWorkingHours,
        selectedAppointment,
        setSelectedAppointment,
        isMenuOpen,
        setIsMenuOpen,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return ctx;
}
