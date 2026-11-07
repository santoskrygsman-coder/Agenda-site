import {
  formatCurrency,
  formatDateLongPtBr,
  normalizePhoneDigits,
} from "./formatters";

export function buildWaMeUrl(phone: string, message: string): string {
  const cleanPhone = normalizePhoneDigits(phone);
  const encoded = encodeURIComponent(message);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function buildClientReceiptWhatsAppUrl(params: {
  studioPhone: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  dateStr: string;
  timeStr: string;
  signalAmount: number;
  totalAmount: number;
}): string {
  const dateHuman = formatDateLongPtBr(params.dateStr);
  const signalText = formatCurrency(params.signalAmount);
  const totalText = formatCurrency(params.totalAmount);

  const msg = [
    "Olá! Acabei de realizar meu agendamento e estou enviando o comprovante do sinal via Pix para confirmação:",
    "",
    `• Cliente: ${params.clientName} (${params.clientPhone})`,
    `• Serviço escolhido: ${params.serviceName}`,
    `• Data: ${dateHuman}`,
    `• Horário: ${params.timeStr}`,
    `• Valor do sinal: ${signalText} (Total do procedimento: ${totalText})`,
    "",
    "📎 Vou anexar a imagem do comprovante manualmente aqui no WhatsApp para confirmação do meu horário.",
  ].join("\n");

  return buildWaMeUrl(params.studioPhone, msg);
}

export function buildProfessionalToClientWhatsAppUrl(params: {
  clientPhone: string;
  clientName: string;
  serviceName: string;
  dateStr: string;
  timeStr: string;
  status: string;
  paymentStatus?: string;
}): string {
  const dateHuman = formatDateLongPtBr(params.dateStr);

  if (params.status === "CONFIRMED") {
    const msg = [
      `Olá, ${params.clientName}!`,
      "",
      "Seu agendamento foi confirmado com sucesso:",
      `• Procedimento: ${params.serviceName}`,
      `• Data: ${dateHuman}`,
      `• Horário: ${params.timeStr}`,
      "",
      "Qualquer dúvida, estou à disposição!",
    ].join("\n");
    return buildWaMeUrl(params.clientPhone, msg);
  }

  if (params.status === "CANCELLED") {
    const msg = [
      `Olá, ${params.clientName}!`,
      "",
      `Informamos que o agendamento de ${params.serviceName} em ${dateHuman} às ${params.timeStr} foi cancelado.`,
      "Caso deseje reagendar um novo horário, fale conosco por aqui!",
    ].join("\n");
    return buildWaMeUrl(params.clientPhone, msg);
  }

  const msg = [
    `Olá, ${params.clientName}!`,
    "",
    `Referente ao seu agendamento de ${params.serviceName} para ${dateHuman} às ${params.timeStr}:`,
    "Aguardamos o comprovante do sinal via Pix para confirmar seu horário.",
  ].join("\n");

  return buildWaMeUrl(params.clientPhone, msg);
}

export function buildGeneralContactWhatsAppUrl(studioPhone: string): string {
  const msg =
    "Olá! Gostaria de tirar uma dúvida sobre os procedimentos de extensão de cílios e agendamentos.";
  return buildWaMeUrl(studioPhone, msg);
}

/**
 * Gera link wa.me para avisar a cliente que o horário foi liberado por falta de comprovante no prazo.
 */
export function buildExpiredAppointmentWhatsAppUrl(params: {
  clientPhone: string;
  clientName: string;
  dateStr: string;
  timeStr: string;
  studioName?: string;
  bookingUrl?: string;
}): string {
  const firstName = (params.clientName || "Cliente").trim().split(/\s+/)[0];
  const [, month, day] = (params.dateStr || "").split("-");
  const shortDate = day && month ? `${day}/${month}` : formatDateLongPtBr(params.dateStr);
  const studio = params.studioName || "nosso estúdio";
  const url = params.bookingUrl || "https://agendamento-estetica.local/servicos";

  const msg = [
    `Olá, ${firstName}! Seu horário de ${shortDate} às ${params.timeStr} em ${studio} foi liberado porque o comprovante do pagamento não chegou a tempo.`,
    "",
    "Se ainda quiser, é só agendar de novo:",
    url,
  ].join("\n");

  return buildWaMeUrl(params.clientPhone, msg);
}
