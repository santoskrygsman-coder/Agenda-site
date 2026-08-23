export const dynamic = "force-dynamic";
import SettingsManager from "@/components/settings/SettingsManager";
import BlockedDatesManager from "@/components/settings/BlockedDatesManager";
import GalleryManager from "@/components/settings/GalleryManager";
import WorkingHoursManager from "@/components/WorkingHoursManager";
import { prisma } from "@/lib/prisma";

export default async function ConfigPage() {
  // Fetch working hours initial data
  const workingHours = await prisma.workingHours.findMany({
    orderBy: { weekday: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 font-sans text-[#3A3335]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#3A3335] flex items-center gap-2">
          <span className="text-[#D4A373]">✦</span> Configurações
        </h1>
        <p className="text-[#8B7E7F] mt-2 font-medium">
          Gerencie o seu perfil, regras de agendamento, comunicação e horários.
        </p>
      </div>

      <div className="space-y-10">
        <SettingsManager />
        <GalleryManager />
        <WorkingHoursManager initialWorkingHours={workingHours} />
        <BlockedDatesManager />
      </div>
    </div>
  );
}
