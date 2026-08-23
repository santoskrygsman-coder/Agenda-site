import { prisma } from "@/lib/prisma";
import { Users, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({
    include: {
      appointments: {
        orderBy: { date: 'desc' }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-24 sm:pb-0 font-sans text-[#3A3335]">
      <div className="bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8]">
        <h1 className="text-xl font-bold text-[#3A3335] flex items-center gap-2">
          <Users className="text-[#B98389]" size={22} /> Meus Clientes <span className="text-[#8B7E7F] text-sm ml-2 font-medium">({clients.length})</span>
        </h1>
      </div>

      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="bg-white border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-10 rounded-3xl text-center text-[#8B7E7F] font-medium">
            <Users size={32} className="mx-auto mb-3 opacity-20" />
            Nenhum cliente cadastrado.
          </div>
        ) : (
          clients.map(client => {
            const totalAppts = client.appointments.length;
            const lastAppt = totalAppts > 0 ? client.appointments[0] : null;

            return (
              <div key={client.id} className="bg-white p-5 rounded-2xl border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-2 transition-all hover:border-[#D9A0A0]">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-[#3A3335] text-lg">{client.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-[#FFF5F5] text-[#A76D74] px-3 py-1.5 rounded-full">
                    {totalAppts} agendamento{totalAppts !== 1 && 's'}
                  </span>
                </div>
                
                <p className="text-[#8B7E7F] text-sm flex items-center gap-1.5 font-medium">
                  <Phone size={14} className="text-[#D4A373]" /> {client.phone}
                </p>

                {lastAppt && (
                  <div className="mt-3 text-xs bg-[#FCFAFA] border border-[#F3E8E8] p-3 rounded-xl text-[#5A5052] flex items-center gap-2 font-medium">
                    <Calendar size={14} className="text-[#B98389]" />
                    Último: {format(new Date(lastAppt.date + "T00:00:00"), "dd/MM/yyyy")} 
                    <span className={`font-bold ml-1 uppercase tracking-wider text-[10px] ${
                      lastAppt.status === 'CONFIRMED' || lastAppt.status === 'COMPLETED' ? 'text-[#5A7A66]' :
                      lastAppt.status === 'PENDING' ? 'text-[#D4A373]' : 'text-[#8B7E7F]'
                    }`}>({lastAppt.status === 'PENDING' ? 'Aguardando' : lastAppt.status === 'CONFIRMED' ? 'Confirmado' : lastAppt.status === 'CANCELLED' ? 'Cancelado' : lastAppt.status === 'COMPLETED' ? 'Concluído' : 'Recusado'})</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
