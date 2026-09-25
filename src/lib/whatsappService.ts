export class WhatsAppService {
  static formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return "";
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  }

  static generateWhatsAppLink(phone: string, message: string): string {
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) return "#";
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  static getNewRequestMessage(
    clientName: string,
    serviceName: string,
    date: string,
    time: string,
    price: number,
    requiresDeposit: boolean,
    notes?: string
  ): string {
    const obsText = notes ? `\nðŸ“ *ObservaÃ§Ã£o:*\n_${notes}_\n` : "";
    const priceFormatted = price.toFixed(2).replace('.', ',');
    
    if (requiresDeposit) {
      return `âœ¨ *NOVA SOLICITAÃ‡ÃƒO DE AGENDAMENTO* âœ¨\n\nOii, tudo bem? ðŸ’•\nMeu nome Ã© *${clientName}* e acabei de solicitar um horÃ¡rio pelo site!\n\nðŸŒ¸ *Procedimento:* ${serviceName}\nðŸ“… *Data:* ${date}\nâ° *HorÃ¡rio:* ${time}\nðŸ’° *Valor Total:* R$ ${priceFormatted}\n${obsText}\nâš ï¸ *STATUS:* Aguardando sua confirmaÃ§Ã£o\n\nðŸ’³ Vi no site que esse procedimento exige um sinal para garantir a vaga.\nComo faÃ§o o pagamento? Gostaria muito de confirmar esse horÃ¡rio! ðŸ¥°\n\nAguardo seu retorno! ðŸ’–`;
    } else {
      return `âœ¨ *NOVA SOLICITAÃ‡ÃƒO DE AGENDAMENTO* âœ¨\n\nOii, tudo bem? ðŸ’•\nMeu nome Ã© *${clientName}* e acabei de solicitar um horÃ¡rio pelo site!\n\nðŸŒ¸ *Procedimento:* ${serviceName}\nðŸ“… *Data:* ${date}\nâ° *HorÃ¡rio:* ${time}\nðŸ’° *Valor Total:* R$ ${priceFormatted}\n${obsText}\nâš ï¸ *STATUS:* Aguardando sua confirmaÃ§Ã£o\n\nGostaria muito de saber se esse horÃ¡rio estÃ¡ disponÃ­vel para mim! ðŸ¥°\n\nAguardo seu retorno! ðŸ’–`;
    }
  }

  static getConfirmedMessage(clientName: string, serviceName: string, date: string, time: string, price: number): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `âœ¨ AGENDAMENTO CONFIRMADO!\n\nOlÃ¡, ${firstName}! ðŸ’•\n\nSeu horÃ¡rio foi confirmado:\n\nâœ¨ Procedimento: ${serviceName}\nðŸ“… Data: ${date}\nâ° HorÃ¡rio: ${time}\nðŸ’° Valor: R$ ${price.toFixed(2).replace('.', ',')}\n\nTe esperamos! ðŸ’—`;
  }

  static getRejectedMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `OlÃ¡, ${firstName}! ðŸ’•\n\nInfelizmente nÃ£o conseguimos confirmar o horÃ¡rio solicitado:\n\nâœ¨ Procedimento: ${serviceName}\nðŸ“… Data: ${date}\nâ° HorÃ¡rio: ${time}\n\nEntre em contato conosco pelo WhatsApp para escolher outro horÃ¡rio. ðŸ’—`;
  }

  static getCancelledMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `OlÃ¡, ${firstName}. ðŸ’•\n\nSeu agendamento para ${serviceName} no dia ${date} Ã s ${time} precisou ser cancelado.\n\nQualquer dÃºvida, estamos Ã  disposiÃ§Ã£o. ðŸ’—`;
  }

  static getReminderMessage(template: string, clientName: string, serviceName: string, date: string, time: string, price: number, professionalName: string = "a profissional"): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return template
      .replace(/{cliente}/gi, firstName)
      .replace(/{nome_cliente}/gi, firstName)
      .replace(/{procedimento}/gi, serviceName)
      .replace(/{data}/gi, date)
      .replace(/{horario}/gi, time)
      .replace(/{nome_profissional}/gi, professionalName)
      .replace(/{valor}/gi, `R$ ${price.toFixed(2).replace('.', ',')}`);
  }

  static getBirthdayMessage(template: string, clientName: string, benefit: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return template
      .replace(/{cliente}/g, firstName)
      .replace(/{beneficio}/g, benefit);
  }
}
