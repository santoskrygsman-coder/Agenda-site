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
    const obsText = notes ? `\n\uD83D\uDCDD *Observa\u00E7\u00E3o:*\n_${notes}_\n` : "";
    const priceFormatted = price.toFixed(2).replace('.', ',');
    
    if (requiresDeposit) {
      return `\u2728 *NOVA SOLICITA\u00C7\u00C3O DE AGENDAMENTO* \u2728\n\nOii, tudo bem? \uD83D\uDC95\nMeu nome \u00E9 *${clientName}* e acabei de solicitar um hor\u00E1rio pelo site!\n\n\uD83C\uDF38 *Procedimento:* ${serviceName}\n\uD83D\uDCC5 *Data:* ${date}\n\u23F0 *Hor\u00E1rio:* ${time}\n\uD83D\uDCB0 *Valor Total:* R$ ${priceFormatted}\n${obsText}\n\u26A0\uFE0F *STATUS:* Aguardando sua confirma\u00E7\u00E3o\n\n\uD83D\uDCB3 Vi no site que esse procedimento exige um sinal para garantir a vaga.\nComo fa\u00E7o o pagamento? Gostaria muito de confirmar esse hor\u00E1rio! \uD83E\uDD70\n\nAguardo seu retorno! \uD83D\uDC96`;
    } else {
      return `\u2728 *NOVA SOLICITA\u00C7\u00C3O DE AGENDAMENTO* \u2728\n\nOii, tudo bem? \uD83D\uDC95\nMeu nome \u00E9 *${clientName}* e acabei de solicitar um hor\u00E1rio pelo site!\n\n\uD83C\uDF38 *Procedimento:* ${serviceName}\n\uD83D\uDCC5 *Data:* ${date}\n\u23F0 *Hor\u00E1rio:* ${time}\n\uD83D\uDCB0 *Valor Total:* R$ ${priceFormatted}\n${obsText}\n\u26A0\uFE0F *STATUS:* Aguardando sua confirma\u00E7\u00E3o\n\nGostaria muito de saber se esse hor\u00E1rio est\u00E1 dispon\u00EDvel para mim! \uD83E\uDD70\n\nAguardo seu retorno! \uD83D\uDC96`;
    }
  }

  static getConfirmedMessage(clientName: string, serviceName: string, date: string, time: string, price: number): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `\u2728 AGENDAMENTO CONFIRMADO!\n\nOl\u00E1, ${firstName}! \uD83D\uDC95\n\nSeu hor\u00E1rio foi confirmado:\n\n\u2728 Procedimento: ${serviceName}\n\uD83D\uDCC5 Data: ${date}\n\u23F0 Hor\u00E1rio: ${time}\n\uD83D\uDCB0 Valor: R$ ${price.toFixed(2).replace('.', ',')}\n\nTe esperamos! \uD83D\uDC97`;
  }

  static getRejectedMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Ol\u00E1, ${firstName}! \uD83D\uDC95\n\nInfelizmente n\u00E3o conseguimos confirmar o hor\u00E1rio solicitado:\n\n\u2728 Procedimento: ${serviceName}\n\uD83D\uDCC5 Data: ${date}\n\u23F0 Hor\u00E1rio: ${time}\n\nEntre em contato conosco pelo WhatsApp para escolher outro hor\u00E1rio. \uD83D\uDC97`;
  }

  static getCancelledMessage(clientName: string, serviceName: string, date: string, time: string): string {
    const firstName = clientName.split(" ")[0] || clientName;
    return `Ol\u00E1, ${firstName}. \uD83D\uDC95\n\nSeu agendamento para ${serviceName} no dia ${date} \u00E0s ${time} precisou ser cancelado.\n\nQualquer d\u00FAvida, estamos \u00E0 disposi\u00E7\u00E3o. \uD83D\uDC97`;
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
