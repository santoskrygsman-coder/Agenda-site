export class WhatsAppService {
  /**
   * Formata um número de telefone para o padrão WhatsApp: apenas números,
   * garantindo o prefixo do país (55 para Brasil se não especificado).
   */
  static formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return "";
    // Se começar com DDD local (10 ou 11 dígitos) adiciona 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Gera o link do WhatsApp (wa.me) para envio manual via browser/app.
   */
  static generateWhatsAppLink(phone: string, message: string): string {
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) return "#";
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  /**
   * Mensagem gerada para a CLIENTE enviar para a DESIGNER após fazer o pedido de agendamento.
   */
  static getNewRequestMessage(
    clientName: string,
    serviceName: string,
    date: string,
    time: string,
    price: number,
    notes?: string
  ): string {
    return `💕 NOVO AGENDAMENTO

Olá! Você recebeu uma nova solicitação de agendamento. 💕

👤 Cliente: ${clientName}
✨ Procedimento: ${serviceName}
📅 Data: ${date}
⏰ Horário: ${time}
💰 Valor: R$ ${price.toFixed(2).replace('.', ',')}
📝 Observação: ${notes || "Nenhuma"}

🟡 Status: Aguardando confirmação.

Acesse o painel para confirmar ou recusar o horário.`;
  }

  /**
   * Mensagem gerada para a DESIGNER enviar para a CLIENTE após CONFIRMAR o agendamento.
   */
  static getConfirmedMessage(
    clientName: string,
    serviceName: string,
    date: string,
    time: string
  ): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Olá, ${firstName}! 💕 Seu agendamento foi confirmado!\n\n✨ Procedimento: ${serviceName}\n📅 Data: ${date}\n⏰ Horário: ${time}\n\nEstamos te esperando! 💕\n\nAté lá! 😊`;
  }

  /**
   * Mensagem gerada para a DESIGNER enviar para a CLIENTE após RECUSAR o agendamento.
   */
  static getRejectedMessage(clientName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Olá, ${firstName}! 💕\n\nInfelizmente não conseguimos confirmar o horário solicitado para ${date} às ${time}.\n\nEntre em contato conosco para verificarmos outro horário disponível para você. 💕`;
  }

  /**
   * Mensagem gerada para a DESIGNER enviar para a CLIENTE após CANCELAR um agendamento já confirmado.
   */
  static getCancelledMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Olá, ${firstName}. 💕\n\nSeu agendamento para ${serviceName} no dia ${date} às ${time} precisou ser cancelado.\n\nQualquer dúvida, estamos à disposição.`;
  }
}
