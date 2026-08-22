import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";
import WorkingHoursManager from "@/components/WorkingHoursManager";
import ServicesManager from "@/components/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
  const workingHours = await prisma.workingHours.findMany({ orderBy: { weekday: 'asc' } });

  return (
    <div className="space-y-6 animate-in fade-in pb-20 sm:pb-0">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="text-pink-600" /> Configurações
        </h1>
      </div>

      <WorkingHoursManager initialWorkingHours={workingHours} />
      <ServicesManager initialServices={services} />
    </div>
  );
}
