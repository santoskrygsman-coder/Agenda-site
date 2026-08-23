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
    const obsText = notes ? `\n📝 Observação:\n${notes}\n` : "";
    const priceFormatted = price.toFixed(2).replace('.', ',');
    
    if (requiresDeposit) {
      return `💕 Olá! Tudo bem?\n\nMeu nome é ${clientName} e gostaria de solicitar um agendamento.\n\n✨ Procedimento: ${serviceName}\n📅 Data: ${date}\n⏰ Horário: ${time}\n💰 Valor: R$ ${priceFormatted}\n${obsText}\n🟡 STATUS: AGUARDANDO CONFIRMAÇÃO DO AGENDAMENTO\n\n💳 Vi que este procedimento necessita de um sinal para confirmação do horário.\n\nGostaria de saber quais são as formas de pagamento disponíveis para realizar o sinal.\n\nPoderia verificar a disponibilidade e me orientar sobre o sinal para confirmar meu horário? 💗\n\nAguardo sua confirmação! 😊`;
    } else {
      return `💕 Olá! Tudo bem?\n\nMeu nome é ${clientName} e gostaria de solicitar um agendamento.\n\n✨ Procedimento: ${serviceName}\n📅 Data: ${date}\n⏰ Horário: ${time}\n💰 Valor: R$ ${priceFormatted}\n${obsText}\n🟡 STATUS: AGUARDANDO CONFIRMAÇÃO DO AGENDAMENTO\n\nGostaria de confirmar se esse horário está disponível.\n\nAguardo sua confirmação. 💗\n\nObrigada! 😊`;
    }
  }

  static getConfirmedMessage(clientName: string, serviceName: string, date: string, time: string, price: number): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `✨ AGENDAMENTO CONFIRMADO!\n\nOlá, ${firstName}! 💕\n\nSeu horário foi confirmado:\n\n✨ Procedimento: ${serviceName}\n📅 Data: ${date}\n⏰ Horário: ${time}\n💰 Valor: R$ ${price.toFixed(2).replace('.', ',')}\n\nTe esperamos! 💗`;
  }

  static getRejectedMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Olá, ${firstName}! 💕\n\nInfelizmente não conseguimos confirmar o horário solicitado:\n\n✨ Procedimento: ${serviceName}\n📅 Data: ${date}\n⏰ Horário: ${time}\n\nEntre em contato conosco pelo WhatsApp para escolher outro horário. 💗`;
  }

  static getCancelledMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Olá, ${firstName}. 💕\n\nSeu agendamento para ${serviceName} no dia ${date} às ${time} precisou ser cancelado.\n\nQualquer dúvida, estamos à disposição. 💗`;
  }

  static getReminderMessage(template: string, clientName: string, serviceName: string, date: string, time: string, price: number): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return template
      .replace(/{cliente}/g, firstName)
      .replace(/{procedimento}/g, serviceName)
      .replace(/{data}/g, date)
      .replace(/{horario}/g, time)
      .replace(/{valor}/g, `R$ ${price.toFixed(2).replace('.', ',')}`);
  }

  static getBirthdayMessage(template: string, clientName: string, benefit: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return template
      .replace(/{cliente}/g, firstName)
      .replace(/{beneficio}/g, benefit);
  }
}
