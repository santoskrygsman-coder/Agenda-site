import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import AppointmentCardAdmin from "@/components/AppointmentCardAdmin";
import { Users, Calendar as CalendarIcon, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = format(new Date(), "yyyy-MM-dd");

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 sm:pb-0">
      
      {/* Cards de Métrica */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <Clock className="text-yellow-500 mb-2" size={24} />
          <span className="text-3xl font-bold text-gray-800">{pending.length}</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pendentes</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <CalendarIcon className="text-green-500 mb-2" size={24} />
          <span className="text-3xl font-bold text-gray-800">{todaysAppointments.length}</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Hoje</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <Users className="text-blue-500 mb-2" size={24} />
          <span className="text-3xl font-bold text-gray-800">{totalClients}</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Clientes</span>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
          Solicitações Pendentes
        </h2>
        
        {pending.length === 0 ? (
          <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-xl">Nenhuma solicitação pendente no momento.</p>
        ) : (
          <div className="space-y-4">
            {pending.map(appt => (
              <AppointmentCardAdmin key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
          Agendamentos de Hoje
        </h2>

        {todaysAppointments.length === 0 ? (
          <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-xl">Nenhum agendamento confirmado para hoje.</p>
        ) : (
          <div className="space-y-4">
            {todaysAppointments.map(appt => (
              <AppointmentCardAdmin key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      {nextAppointments.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-gray-800">Próximos Agendamentos</h2>
            <Link href="/admin/agenda" className="text-pink-600 text-sm font-bold hover:underline">Ver Agenda</Link>
          </div>
          <div className="space-y-3">
            {nextAppointments.map(appt => (
              <div key={appt.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{appt.client.name}</p>
                  <p className="text-xs text-gray-500">{appt.date.split("-").reverse().join("/")} às {appt.startTime}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-pink-600">{appt.service.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
