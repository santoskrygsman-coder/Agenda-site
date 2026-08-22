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
   * Applica o template substituindo variáveis
   */
  private static parseTemplate(template: string, data: any): string {
    return template
      .replace(/{cliente}/g, data.clientName)
      .replace(/{data}/g, data.date)
      .replace(/{horario}/g, data.time)
      .replace(/{procedimento}/g, data.serviceName)
      .replace(/{valor}/g, data.price ? `R$ ${data.price.toFixed(2)}` : "");
  }

  /**
   * Mensagem para quando a cliente acaba de solicitar um horário (PENDING)
   */
  public static getPendingAdminLink(clientName: string, phone: string, date: string, time: string, serviceName: string, price: number, template: string): string {
    const msg = this.parseTemplate(template, { clientName, date, time, serviceName, price });
    return this.generateWaMeLink(phone, msg);
  }

  /**
   * Mensagem para quando o agendamento é CONFIRMADO
   */
  public static getConfirmedLink(clientName: string, phone: string, date: string, time: string, serviceName: string, price: number, template: string): string {
    const msg = this.parseTemplate(template, { clientName, date, time, serviceName, price });
    return this.generateWaMeLink(phone, msg);
  }

  /**
   * Mensagem para quando o agendamento é RECUSADO/CANCELADO
   */
  public static getRejectedLink(clientName: string, phone: string, date: string, time: string, template: string): string {
    const msg = this.parseTemplate(template, { clientName, date, time, serviceName: "", price: 0 });
    return this.generateWaMeLink(phone, msg);
  }
}
