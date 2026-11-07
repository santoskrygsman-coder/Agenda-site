"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  refreshServices: () => Promise<void>;
  toggleServiceActive: (id: string) => Promise<void>;
  createOrUpdateService: (payload: {
    id?: string;
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    image: string;
    active: boolean;
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
  todayOpenStatus: string;
  selectedAppointment: AppointmentItem | null;
  setSelectedAppointment: (apt: AppointmentItem | null) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const defaultBookingDate = getDefaultBookingDate();
  const [services, setServices] = useState<ServiceItem[]>(MOCK_SERVICES);
  const [allServices, setAllServices] = useState<ServiceItem[]>(MOCK_SERVICES);
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
  const [selectedTime, setSelectedTime] = useState<string>("14:00");

  const [availableTimes, setAvailableTimes] = useState<string[]>([
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ]);
  const [loadingAvailability, setLoadingAvailability] =
    useState<boolean>(false);
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
  const [todayOpenStatus, setTodayOpenStatus] = useState<string>(
    "Aberto hoje até 18:00"
  );

  const [studioSettings, setStudioSettings] = useState<StudioSettings>({
    professionalName: "Emile Lash Designer",
    specialty: "Cílios • Sobrancelha • Brow Lamination • Lash Lifting",
    description: "Centro - Posto da Mata • @emiledesiigner",
    whatsapp: "",
    pixKey: "000.000.000-00",
    pixKeyType: "CPF",
    signalPercentage: 50,
    holdMinutes: 15,
  });

  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(
    2,
    "0"
  )}-${String(selectedDay).padStart(2, "0")}`;

  const selectedService =
    services.find((s) => s.id === selectedServiceId) ||
    services.find((s) => s.name.toLowerCase().includes("brasileiro")) ||
    services[0] ||
    MOCK_SERVICES[1];

  const refreshServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data: ServiceItem[] = await res.json();
        if (data.length > 0) {
          setServices(data);
          setSelectedServiceId((prev) => {
            if (prev && data.some((s) => s.id === prev)) return prev;
            const br = data.find((s) =>
              s.name.toLowerCase().includes("brasileiro")
            );
            return br ? br.id : data[0].id;
          });
        }
      }

      const adminRes = await fetch("/api/services?all=true");
      if (adminRes.ok) {
        const adminData: ServiceItem[] = await adminRes.json();
        if (adminData.length > 0) {
          setAllServices(adminData);
        }
      } else {
        setAllServices((prev) => (services.length > 0 ? services : prev));
      }
    } catch {
      // Fallback silencioso
    }
  }, [services.length]);

  useEffect(() => {
    refreshServices();
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setStudioSettings({
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
          });
        }
      })
      .catch(() => {});

    fetch("/api/working-hours")
      .then((r) => (r.ok ? r.json() : null))
      .then((whList) => {
        if (Array.isArray(whList) && whList.length > 0) {
          const todayWeekday = new Date().getDay();
          const todayWh = whList.find(
            (w: { weekday: number; active: boolean; endTime: string }) =>
              w.weekday === todayWeekday
          );
          if (todayWh && todayWh.active) {
            setTodayOpenStatus(`Aberto hoje até ${todayWh.endTime}`);
          } else {
            const anyActive = whList.find(
              (w: { active: boolean; endTime: string }) => w.active
            );
            setTodayOpenStatus(
              anyActive
                ? `Seg a Sáb até ${anyActive.endTime}`
                : "Atendimento com hora marcada"
            );
          }
        }
      })
      .catch(() => {});
  }, [refreshServices]);

  // Carregar disponibilidade real sempre que a data ou serviço mudar
  useEffect(() => {
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
          !selectedService.id.startsWith("volume-")
        ) {
          query.set("serviceId", selectedService.id);
        }
        const res = await fetch(`/api/availability?${query.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          const slots: string[] = Array.isArray(data.times) ? data.times : [];
          setAvailableTimes(slots);
          setAvailabilityReason(data.reason);
          if (slots.length > 0 && !slots.includes(selectedTime)) {
            setSelectedTime(slots.includes("14:00") ? "14:00" : slots[0]);
          }
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
  }, [selectedDate, selectedService?.id, selectedService?.durationMinutes]);

  const toggleServiceActive = async (id: string) => {
    const target = allServices.find((s) => s.id === id);
    if (!target) return;
    const nextActive = !target.active;

    setAllServices((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, active: nextActive } : item
      )
    );

    await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: nextActive }),
    });
    await refreshServices();
  };

  const createOrUpdateService = async (payload: {
    id?: string;
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    image: string;
    active: boolean;
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
      await refreshServices();
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
      await refreshServices();
      return { ok: true };
    } catch {
      return { ok: false, error: "Erro de comunicação com o servidor" };
    }
  };

  const setSelectedServiceById = (id: string) => {
    setSelectedServiceId(id);
  };

  const setSelectedDay = (day: number) => {
    setSelectedDayState(day);
  };

  const setSelectedYearMonth = (year: number, month: number) => {
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
        todayOpenStatus,
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
