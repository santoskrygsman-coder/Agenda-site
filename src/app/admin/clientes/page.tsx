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
    <div className="space-y-6 animate-in fade-in pb-20 sm:pb-0">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-pink-600" /> Meus Clientes ({clients.length})
        </h1>
      </div>

      <div className="space-y-3">
        {clients.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum cliente cadastrado.</p>
        ) : (
          clients.map(client => {
            const totalAppts = client.appointments.length;
            const lastAppt = totalAppts > 0 ? client.appointments[0] : null;

            return (
              <div key={client.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
                  <span className="text-xs font-bold bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                    {totalAppts} agendamento{totalAppts !== 1 && 's'}
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm flex items-center gap-2">
                  <Phone size={14} /> {client.phone}
                </p>

                {lastAppt && (
                  <div className="mt-2 text-xs bg-gray-50 p-2 rounded text-gray-600 flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    Último agendamento: {format(new Date(lastAppt.date + "T00:00:00"), "dd/MM/yyyy")} 
                    <span className="font-bold text-gray-800">({lastAppt.status})</span>
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
