export const dynamic = "force-dynamic";
import ServicesManager from "@/components/ServicesManager";
import { prisma } from "@/lib/prisma";

export default async function ProcedimentosPage() {
  const services = await prisma.service.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans text-[#3A3335]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#3A3335] flex items-center gap-2">
          <span className="text-[#D4A373]">✦</span> Procedimentos
        </h1>
        <p className="text-[#8B7E7F] mt-2 font-medium">
          Gerencie os serviços que você oferece, defina preços, duração e descrição. Estes dados aparecerão no seu site público de agendamentos.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-5 overflow-hidden">
        <ServicesManager initialServices={services} />
      </div>
    </div>
  );
}
