import { prisma } from "@/lib/prisma";
import AppointmentCardAdmin from "@/components/AppointmentCardAdmin";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendaPage({ searchParams }: { searchParams: { date?: string } }) {
  // Use searchParams in Next 15 with await if needed, but here it might be simpler to just fetch all upcoming or specific date
  const dateParam = (await searchParams).date || format(new Date(), "yyyy-MM-dd");

  const appointments = await prisma.appointment.findMany({
    where: { date: dateParam },
    include: { client: true, service: true },
    orderBy: { startTime: 'asc' }
  });

  const settings = await prisma.settings.findFirst();

  return (
    <div className="space-y-6 animate-in fade-in pb-20 sm:pb-0">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-pink-600" /> Agenda Diária
        </h1>
        
        {/* Simples seletor de data - num app real seria um componente de DatePicker */}
        <form>
          <input 
            type="date" 
            name="date"
            defaultValue={dateParam}
            className="p-2 border border-gray-300 rounded-lg text-sm"
            onChange={(e) => {
              e.target.form?.submit();
            }}
          />
        </form>
      </div>

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-2xl text-center text-gray-500">
            Nenhum agendamento para este dia.
          </div>
        ) : (
          appointments.map(appt => (
            <AppointmentCardAdmin key={appt.id} appointment={appt} settings={settings} />
          ))
        )}
      </div>
    </div>
  );
}
