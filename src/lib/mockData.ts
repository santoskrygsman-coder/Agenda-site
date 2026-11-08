export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  duration: string;
  durationMinutes?: number;
  price: number;
  priceFormatted: string;
  image: string;
  active: boolean;
  requiresDeposit?: boolean;
  depositPercentage?: number;
}

export interface AppointmentItem {
  id: string;
  date?: string;
  time: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  price?: number;
  priceFormatted: string;
  signalPercentage?: number;
  signalAmount?: number;
  signalFormatted?: string;
  remainingAmount?: number;
  remainingFormatted?: string;
  dateFormatted: string;
  status: "concluido" | "confirmado" | "aguardando" | "agendado" | "cancelado";
  statusLabel: string;
  notes?: string;
  dbStatus?: string;
  paymentStatus?: string;
  receiptReportedAt?: string | null;
  receiptUrl?: string | null;
  receiptFileName?: string | null;
  expiresAt?: string | null;
}

export interface ClientItem {
  id: string;
  initials: string;
  name: string;
  phone: string;
  appointmentsCount: number;
  avatar?: string;
  category: "ativas" | "frequentes" | "inativas";
}

export interface FinancialEntry {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  subtitleType?: "pending" | "confirmed";
  amountFormatted: string;
  type: "income" | "expense";
}

export const MOCK_SERVICES: ServiceItem[] = [
  {
    id: "extensao-classica",
    name: "Extensão clássica",
    description: "Resultado natural e elegante",
    duration: "1h30",
    price: 120,
    priceFormatted: "R$ 120,00",
    image: "/images/service-classica.png",
    active: true,
  },
  {
    id: "volume-brasileiro",
    name: "Volume brasileiro",
    description: "Mais volume e definição",
    duration: "2h",
    price: 150,
    priceFormatted: "R$ 150,00",
    image: "/images/service-brasileiro.png",
    active: true,
  },
  {
    id: "volume-hibrido",
    name: "Volume híbrido",
    description: "Natural com mais densidade",
    duration: "2h",
    price: 160,
    priceFormatted: "R$ 160,00",
    image: "/images/service-hibrido.png",
    active: true,
  },
  {
    id: "volume-russo",
    name: "Volume russo",
    description: "Máximo volume e impacto",
    duration: "2h30",
    price: 180,
    priceFormatted: "R$ 180,00",
    image: "/images/service-russo.png",
    active: true,
  },
  {
    id: "manutencao",
    name: "Manutenção",
    description: "Retoque para manter o resultado",
    duration: "1h30",
    price: 100,
    priceFormatted: "R$ 100,00",
    image: "/images/service-manutencao.png",
    active: true,
  },
  {
    id: "remocao",
    name: "Remoção",
    description: "Remoção segura das extensões",
    duration: "30min",
    price: 50,
    priceFormatted: "R$ 50,00",
    image: "/images/service-remocao.png",
    active: true,
  },
];

export const AVAILABLE_TIME_SLOTS = [
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
];

export const MOCK_APPOINTMENTS: AppointmentItem[] = [
  {
    id: "ag-1",
    time: "09:00",
    endTime: "10:30",
    clientName: "Ana Silva",
    clientPhone: "(00) 00000-0000",
    serviceId: "extensao-classica",
    serviceName: "Extensão clássica",
    priceFormatted: "R$ 120,00",
    dateFormatted: "Sexta, 14 de março de 2025",
    status: "concluido",
    statusLabel: "Concluído",
    notes: "Cliente pontual, gosta de curvatura C.",
  },
  {
    id: "ag-2",
    time: "10:30",
    endTime: "12:00",
    clientName: "Juliana Costa",
    clientPhone: "(00) 00000-0000",
    serviceId: "manutencao",
    serviceName: "Manutenção",
    priceFormatted: "R$ 100,00",
    dateFormatted: "Sexta, 14 de março de 2025",
    status: "confirmado",
    statusLabel: "Confirmado",
    notes: "Manutenção de 20 dias.",
  },
  {
    id: "ag-3",
    time: "14:00",
    endTime: "16:00",
    clientName: "Mariana Lima",
    clientPhone: "(00) 00000-0000",
    serviceId: "volume-brasileiro",
    serviceName: "Volume brasileiro",
    priceFormatted: "R$ 150,00",
    dateFormatted: "Sexta, 14 de março de 2025",
    status: "aguardando",
    statusLabel: "Aguardando pagamento",
    notes: "Prefere um resultado mais natural.",
  },
  {
    id: "ag-4",
    time: "16:00",
    endTime: "18:30",
    clientName: "Camila Souza",
    clientPhone: "(00) 00000-0000",
    serviceId: "volume-russo",
    serviceName: "Volume russo",
    priceFormatted: "R$ 180,00",
    dateFormatted: "Sexta, 14 de março de 2025",
    status: "agendado",
    statusLabel: "agendado",
    notes: "Primeira vez fazendo volume russo.",
  },
];

export const MOCK_CLIENTS: ClientItem[] = [
  {
    id: "cli-1",
    initials: "AS",
    name: "Ana Silva",
    phone: "(00) 00000-0000",
    appointmentsCount: 5,
    category: "frequentes",
  },
  {
    id: "cli-2",
    initials: "JC",
    name: "Juliana Costa",
    phone: "(00) 00000-0000",
    appointmentsCount: 3,
    category: "ativas",
  },
  {
    id: "cli-3",
    initials: "ML",
    name: "Mariana Lima",
    phone: "(00) 00000-0000",
    appointmentsCount: 2,
    avatar: "/images/avatar-mariana.png",
    category: "ativas",
  },
  {
    id: "cli-4",
    initials: "CS",
    name: "Camila Souza",
    phone: "(00) 00000-0000",
    appointmentsCount: 4,
    category: "frequentes",
  },
  {
    id: "cli-5",
    initials: "BP",
    name: "Beatriz Pereira",
    phone: "(00) 00000-0000",
    appointmentsCount: 1,
    category: "inativas",
  },
];

export const MOCK_FINANCIAL_ENTRIES: FinancialEntry[] = [
  {
    id: "fin-1",
    date: "14/03",
    title: "Sinal - Mariana Lima",
    subtitle: "Aguardando confirmação",
    subtitleType: "pending",
    amountFormatted: "+ R$ 75,00",
    type: "income",
  },
  {
    id: "fin-2",
    date: "13/03",
    title: "Pagamento - Ana Silva",
    amountFormatted: "+ R$ 120,00",
    type: "income",
  },
  {
    id: "fin-3",
    date: "12/03",
    title: "Despesa - Materiais",
    amountFormatted: "- R$ 100,00",
    type: "expense",
  },
  {
    id: "fin-4",
    date: "11/03",
    title: "Sinal - Juliana Costa",
    subtitle: "• Confirmado",
    subtitleType: "confirmed",
    amountFormatted: "+ R$ 75,00",
    type: "income",
  },
];

export const FICTITIOUS_PIX_KEY = "000.000.000-00";
export const FICTITIOUS_PHONE = "(00) 00000-0000";
