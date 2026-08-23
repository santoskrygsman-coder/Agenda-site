import { prisma } from "@/lib/prisma";
import AppointmentCardAdmin from "@/components/AppointmentCardAdmin";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === 'string' ? resolvedParams.date : undefined;
  const dateParam = dateStr || format(new Date(), "yyyy-MM-dd");

  const appointments = await prisma.appointment.findMany({
    where: { date: dateParam },
    include: { client: true, service: true },
    orderBy: { startTime: 'asc' }
  });

  const settings = await prisma.settings.findFirst();

  return (
    <div className="space-y-6 animate-in fade-in pb-24 sm:pb-0 font-sans text-[#3A3335]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white p-5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8]">
        <h1 className="text-xl font-bold text-[#3A3335] flex items-center gap-2">
          <CalendarIcon className="text-[#B98389]" size={22} /> Agenda Diária
        </h1>
        
        <form className="flex gap-2 w-full sm:w-auto">
          <input 
            type="date" 
            name="date"
            defaultValue={dateParam}
            className="flex-1 sm:flex-none p-3 sm:p-2 border border-[#F3E8E8] rounded-xl text-sm outline-none focus:border-[#B98389] text-[#5A5052] bg-[#FCFAFA]"
          />
          <button type="submit" className="bg-[#B98389] text-white px-5 sm:px-4 py-3 sm:py-2 rounded-xl text-sm font-bold shadow-md hover:bg-[#A76D74] transition-colors whitespace-nowrap">
            Buscar
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="bg-white border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-10 rounded-3xl text-center text-[#8B7E7F] font-medium">
            <CalendarIcon size={32} className="mx-auto mb-3 opacity-20" />
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
