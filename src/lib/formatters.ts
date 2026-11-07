export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0min";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h${mins.toString().padStart(2, "0")}`;
}

export function formatCurrency(value: number): string {
  const num = Number(value) || 0;
  return `R$ ${num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone || "(00) 00000-0000";
}

export function normalizePhoneDigits(phone: string): string {
  const clean = (phone || "").replace(/\D/g, "");
  if (clean.length >= 10 && !clean.startsWith("55")) {
    return `55${clean}`;
  }
  return clean;
}

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatDateLongPtBr(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const weekday = WEEKDAY_NAMES[dateObj.getDay()];
  const month = MONTH_NAMES[m - 1];
  return `${weekday}, ${d} de ${month} de ${y}`;
}

export function formatDateShortDdMm(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}
