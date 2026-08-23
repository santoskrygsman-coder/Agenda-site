import WorkingHoursManager from "@/components/WorkingHoursManager";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HorariosPage() {
  const workingHours = await prisma.workingHours.findMany({
    orderBy: { weekday: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 sm:pb-0 font-sans text-[#3A3335] animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/admin/mais" className="w-10 h-10 bg-white border border-[#F3E8E8] rounded-full flex items-center justify-center text-[#8B7E7F] hover:bg-[#FCFAFA] active:scale-95 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3A3335]">
            Meus Horários
          </h1>
          <p className="text-[#8B7E7F] text-sm mt-0.5 font-medium">
            Defina seus horários de atendimento.
          </p>
        </div>
      </div>

      <div className="bg-white p-1 sm:p-6 sm:rounded-3xl sm:border sm:border-[#F3E8E8] sm:shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <WorkingHoursManager initialWorkingHours={workingHours} />
      </div>
    </div>
  );
}
