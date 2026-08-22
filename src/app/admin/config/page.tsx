import SettingsManager from "@/components/settings/SettingsManager";
import BlockedDatesManager from "@/components/settings/BlockedDatesManager";
import WorkingHoursManager from "@/components/WorkingHoursManager";
import { prisma } from "@/lib/prisma";

export default async function ConfigPage() {
  // Fetch working hours initial data
  const workingHours = await prisma.workingHours.findMany({
    orderBy: { weekday: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-500 mt-2">
          Gerencie o seu perfil, regras de agendamento, comunicação e horários.
        </p>
      </div>

      <div className="space-y-10">
        <SettingsManager />
        <WorkingHoursManager initialWorkingHours={workingHours} />
        <BlockedDatesManager />
      </div>
    </div>
  );
}
