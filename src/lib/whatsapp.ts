/**
 * WhatsAppService
 * 
 * Camada de abstração para envio de mensagens via WhatsApp.
 * Nesta primeira versão, gera links oficiais do wa.me.
 * Futuramente, esta classe pode ser alterada para chamar uma API (ex: Z-API, Evolution, WhatsApp Cloud API)
 * sem precisar alterar o restante do código do painel administrativo.
 */

export class WhatsAppService {
  /**
   * Limpa formatação do telefone e garante o código do país
   */
  private static formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, "");
    return clean.length >= 10 && !clean.startsWith("55") ? `55${clean}` : clean;
  }

  /**
   * Gera o link do wa.me para uma mensagem específica
   */
  private static generateWaMeLink(phone: string, text: string): string {
    const formattedPhone = this.formatPhone(phone);
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Mensagem para quando a cliente acaba de solicitar um horário (PENDING)
   * (Usado pela designer para responder a solicitação pendente)
   */
  public static getPendingAdminLink(clientName: string, phone: string, date: string, time: string, serviceName: string, price: number): string {
    const msg = `✨ NOVA SOLICITAÇÃO DE AGENDAMENTO\n\n👤 Cliente: ${clientName}\n📱 WhatsApp: ${phone}\n📅 Data: ${date}\n⏰ Horário: ${time}\n✨ Procedimento: ${serviceName}\n💰 Valor: R$ ${price.toFixed(2)}\n\n🟡 Status: AGUARDANDO CONFIRMAÇÃO`;
    return this.generateWaMeLink(phone, msg);
  }

  /**
   * Mensagem para quando o agendamento é CONFIRMADO
   */
  public static getConfirmedLink(clientName: string, phone: string, date: string, time: string, serviceName: string, price: number): string {
    const msg = `✨ AGENDAMENTO CONFIRMADO\n\nOlá, ${clientName}! 💕\nSeu horário foi confirmado!\n\n📅 Data: ${date}\n⏰ Horário: ${time}\n✨ Procedimento: ${serviceName}\n💰 Valor: R$ ${price.toFixed(2)}\n\nEstamos te esperando! 💕`;
    return this.generateWaMeLink(phone, msg);
  }

  /**
   * Mensagem para quando o agendamento é RECUSADO
   */
  public static getRejectedLink(clientName: string, phone: string, date: string, time: string, reason?: string): string {
    let msg = `Olá, ${clientName}! 💕\n\nInfelizmente não conseguimos confirmar seu horário.\n\n📅 Data: ${date}\n⏰ Horário: ${time}\n`;
    if (reason) {
      msg += `Motivo: ${reason}\n\n`;
    }
    msg += `Entre em contato conosco para verificarmos outro horário disponível. 💕`;
    return this.generateWaMeLink(phone, msg);
  }

  /**
   * Mensagem para quando o agendamento é CANCELADO
   */
  public static getCancelledLink(clientName: string, phone: string, date: string, time: string): string {
    const msg = `Olá, ${clientName}.\n\nSeu agendamento para o dia ${date} às ${time} foi CANCELADO.\n\nQualquer dúvida, estamos à disposição.`;
    return this.generateWaMeLink(phone, msg);
  }
}
