import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import AppointmentCardAdmin from "@/components/AppointmentCardAdmin";
import { Users, Calendar as CalendarIcon, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 sm:pb-0 font-sans text-[#3A3335]">
      
      {/* Cards de Métrica */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] flex flex-col items-center justify-center text-center">
          <Clock className="text-[#D4A373] mb-3" size={26} />
          <span className="text-3xl font-bold text-[#3A3335]">{pending.length}</span>
          <span className="text-[10px] text-[#8B7E7F] font-bold uppercase tracking-widest mt-1">Pendentes</span>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] flex flex-col items-center justify-center text-center">
          <CalendarIcon className="text-[#5A7A66] mb-3" size={26} />
          <span className="text-3xl font-bold text-[#3A3335]">{todaysAppointments.length}</span>
          <span className="text-[10px] text-[#8B7E7F] font-bold uppercase tracking-widest mt-1">Hoje</span>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] flex flex-col items-center justify-center text-center">
          <Users className="text-[#B98389] mb-3" size={26} />
          <span className="text-3xl font-bold text-[#3A3335]">{totalClients}</span>
          <span className="text-[10px] text-[#8B7E7F] font-bold uppercase tracking-widest mt-1">Clientes</span>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold text-[#3A3335] mb-5 flex items-center gap-2">
          <span className="text-[#D4A373] text-sm">✦</span>
          Solicitações Pendentes
        </h2>
        
        {pending.length === 0 ? (
          <p className="text-[#8B7E7F] text-sm bg-white border border-[#F3E8E8] p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center font-medium">Nenhuma solicitação pendente no momento.</p>
        ) : (
          <div className="space-y-4">
            {pending.map(appt => (
              <AppointmentCardAdmin key={appt.id} appointment={appt} settings={settings} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#3A3335] mb-5 flex items-center gap-2">
          <span className="text-[#5A7A66] text-sm">✦</span>
          Agendamentos de Hoje
        </h2>

        {todaysAppointments.length === 0 ? (
          <p className="text-[#8B7E7F] text-sm bg-white border border-[#F3E8E8] p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] text-center font-medium">Nenhum agendamento confirmado para hoje.</p>
        ) : (
          <div className="space-y-4">
            {todaysAppointments.map(appt => (
              <AppointmentCardAdmin key={appt.id} appointment={appt} settings={settings} />
            ))}
          </div>
        )}
      </section>

      {nextAppointments.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-5">
            <h2 className="text-lg font-bold text-[#3A3335] flex items-center gap-2">
              <span className="text-[#B98389] text-sm">✦</span> Próximos Agendamentos
            </h2>
            <Link href="/admin/agenda" className="text-[#B98389] text-xs font-bold hover:text-[#A76D74] uppercase tracking-wide transition-colors">Ver Agenda</Link>
          </div>
          <div className="space-y-3">
            {nextAppointments.map(appt => (
              <div key={appt.id} className="bg-white p-4 rounded-2xl border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex justify-between items-center transition-all hover:border-[#D9A0A0]">
                <div>
                  <p className="font-bold text-[#3A3335] text-sm">{appt.client.name}</p>
                  <p className="text-xs text-[#8B7E7F] font-medium mt-0.5 flex items-center gap-1">
                    <CalendarIcon size={12} className="text-[#D4A373]"/> {appt.date.split("-").reverse().join("/")} às {appt.startTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[#B98389] bg-[#FFF5F5] px-2 py-1 rounded-lg inline-block">{appt.service.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
