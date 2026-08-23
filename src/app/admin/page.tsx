import { prisma } from "@/lib/prisma";
import { format, addDays, startOfDay, endOfDay, isWithinInterval, parse } from "date-fns";
import AppointmentCardAdmin from "@/components/AppointmentCardAdmin";
import { Users, Calendar as CalendarIcon, Clock, Bell, Gift, CreditCard, MessageCircle } from "lucide-react";
import Link from "next/link";
import { WhatsAppService } from "@/lib/whatsappService";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const todayDate = new Date();
  const today = format(todayDate, "yyyy-MM-dd");
  const tomorrow = format(addDays(todayDate, 1), "yyyy-MM-dd");
  const next7Days = addDays(todayDate, 7);

  const settings = await prisma.settings.findFirst();

  const pending = await prisma.appointment.findMany({
    where: { status: "PENDING" },
    include: { client: true, service: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });

  const todaysAppointments = await prisma.appointment.findMany({
    where: { date: today, status: "CONFIRMED" },
    include: { client: true, service: true },
    orderBy: { startTime: 'asc' }
  });

  const totalClients = await prisma.client.count();

  const nextAppointments = await prisma.appointment.findMany({
    where: { 
      status: "CONFIRMED", 
      date: { gt: today } 
    },
    include: { client: true, service: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    take: 5
  });

  // Central de Avisos - Lógica
  // 1. Sinais Pendentes
  const pendingDeposits = pending.filter(a => a.service.requiresDeposit && a.paymentStatus === "PENDING");
  
  // 2. Aniversariantes (Filtro manual por causa do formato DD/MM armazenado como string)
  const allClients = await prisma.client.findMany({ where: { birthDate: { not: null } } });
  const birthdayClients = allClients.filter(c => {
    if (!c.birthDate) return false;
    // birthDate is likely DD/MM or DD/MM/YYYY
    const parts = c.birthDate.split("/");
    if (parts.length < 2) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    
    // Set to current year to compare
    const bDate = new Date(todayDate.getFullYear(), month, day);
    
    return isWithinInterval(bDate, { start: startOfDay(todayDate), end: endOfDay(next7Days) });
  });

  // 3. Lembretes de Amanhã
  const tomorrowAppointments = await prisma.appointment.findMany({
    where: { date: tomorrow, status: "CONFIRMED" },
    include: { client: true, service: true }
  });

  const hour = new Date().getHours();
  let greeting = "Boa noite";
  if (hour < 12) greeting = "Bom dia";
  else if (hour < 18) greeting = "Boa tarde";

  const firstName = settings?.professionalName?.split(" ")[0] || "Profissional";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 sm:pb-0 font-sans text-[#3A3335]">
      
      <div className="mb-2 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#3A3335]">{greeting}, {firstName}!</h1>
          <p className="text-[#8B7E7F] text-sm mt-1">Aqui está o resumo da sua agenda.</p>
        </div>
      </div>

      {/* ATENÇÃO (PENDÊNCIas) */}
      {pending.length > 0 && (
        <section className="bg-gradient-to-r from-[#FFF5F5] to-white rounded-3xl p-5 border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute -top-4 -right-4 text-[#A76D74] opacity-5"><Bell size={100} /></div>
          
          <h2 className="text-sm font-bold text-[#A76D74] uppercase tracking-widest flex items-center gap-2 mb-4">
            <Bell size={16} /> Precisa da sua atenção
          </h2>
          
          <div className="space-y-4 relative z-10">
            {pending.map(appt => (
              <AppointmentCardAdmin key={appt.id} appointment={appt} settings={settings} />
            ))}
          </div>
        </section>
      )}

      {/* SEU DIA */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-sm font-bold text-[#3A3335] uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon size={16} className="text-[#5A7A66]" /> Seu Dia (Hoje)
          </h2>
          <Link href="/admin/agenda" className="text-[#B98389] text-[10px] font-bold hover:text-[#A76D74] uppercase tracking-wider transition-colors bg-[#FFF5F5] px-3 py-1.5 rounded-full">Ver Agenda</Link>
        </div>

        {todaysAppointments.length === 0 ? (
          <div className="bg-white border border-[#F3E8E8] p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center">
            <span className="text-2xl mb-2 block">✨</span>
            <p className="text-[#3A3335] font-bold text-lg tracking-tight">Tudo tranquilo por aqui!</p>
            <p className="text-[#8B7E7F] text-sm mt-1 font-medium">Você não tem atendimentos agendados para hoje.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaysAppointments.slice(0, 3).map(appt => (
              <AppointmentCardAdmin key={appt.id} appointment={appt} settings={settings} />
            ))}
            {todaysAppointments.length > 3 && (
              <div className="text-center pt-2">
                <Link href="/admin/agenda" className="text-xs font-bold text-[#A76D74] uppercase tracking-wider">
                  + {todaysAppointments.length - 3} atendimentos hoje
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* AVISOS */}
      {(birthdayClients.length > 0 || pendingDeposits.length > 0 || tomorrowAppointments.length > 0) && (
        <section>
          <h2 className="text-sm font-bold text-[#3A3335] uppercase tracking-widest flex items-center gap-2 mb-4">
            <Gift size={16} className="text-[#D4A373]" /> Avisos
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {birthdayClients.map(c => (
              <div key={c.id} className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FFF9F2] p-2.5 rounded-xl text-[#D4A373]"><Gift size={20} /></div>
                  <div>
                    <p className="text-sm font-bold text-[#3A3335]">{c.name}</p>
                    <p className="text-[11px] text-[#8B7E7F] font-bold uppercase tracking-wider mt-0.5">Aniversário {c.birthDate?.substring(0, 5) === format(todayDate, "dd/MM") ? "HOJE" : `dia ${c.birthDate?.substring(0, 5)}`}</p>
                  </div>
                </div>
                {settings?.birthdayBenefitActive && settings?.whatsappSystemNumber && (
                  <a href={WhatsAppService.generateWhatsAppLink(c.phone, WhatsAppService.getBirthdayMessage(settings.msgBirthday, c.name, settings.birthdayBenefitValue || "nosso mimo"))} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#1ebd5a] font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-[#25D366]/20 transition-colors">
                    Avisar
                  </a>
                )}
              </div>
            ))}

            {pendingDeposits.length > 0 && (
              <div className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="bg-[#FFF5F5] p-2.5 rounded-xl text-[#A76D74]"><CreditCard size={20} /></div>
                <div>
                  <p className="text-sm font-bold text-[#3A3335]">{pendingDeposits.length} {pendingDeposits.length === 1 ? 'sinal pendente' : 'sinais pendentes'}</p>
                  <p className="text-[11px] text-[#8B7E7F] font-bold uppercase tracking-wider mt-0.5">Verifique as solicitações no topo</p>
                </div>
              </div>
            )}
            
            {tomorrowAppointments.length > 0 && (
              <div className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-[#E9F0EC] p-2.5 rounded-xl text-[#5A7A66]"><Clock size={20} /></div>
                  <div>
                    <p className="text-sm font-bold text-[#3A3335]">{tomorrowAppointments.length} para amanhã</p>
                    <p className="text-[11px] text-[#8B7E7F] font-bold uppercase tracking-wider mt-0.5">Lembretes para enviar</p>
                  </div>
                </div>
                <Link href="/admin/agenda" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F3E8E8] text-[#8B7E7F] font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-[#e4d5d5] transition-colors">
                  Ver
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ATALHOS */}
      <section>
        <h2 className="text-sm font-bold text-[#3A3335] uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className="text-[#B98389]">✦</span> Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/" target="_blank" className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full bg-[#FFF5F5] text-[#A76D74] flex items-center justify-center"><Clock size={20} /></div>
            <span className="text-[11px] font-bold text-[#3A3335] uppercase tracking-wide">Site Público</span>
          </Link>
          <Link href="/admin/agenda" className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full bg-[#E9F0EC] text-[#5A7A66] flex items-center justify-center"><CalendarIcon size={20} /></div>
            <span className="text-[11px] font-bold text-[#3A3335] uppercase tracking-wide">Sua Agenda</span>
          </Link>
          <Link href="/admin/clientes" className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full bg-[#F3E8E8] text-[#8B7E7F] flex items-center justify-center"><Users size={20} /></div>
            <span className="text-[11px] font-bold text-[#3A3335] uppercase tracking-wide">Clientes</span>
          </Link>
          <Link href="/admin/mais" className="bg-white border border-[#F3E8E8] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-full bg-[#FFF9F2] text-[#D4A373] flex items-center justify-center"><MessageCircle size={20} /></div>
            <span className="text-[11px] font-bold text-[#3A3335] uppercase tracking-wide">Mensagens</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
