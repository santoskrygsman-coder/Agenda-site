import ServicesManager from "@/components/ServicesManager";
import { prisma } from "@/lib/prisma";

export default async function ProcedimentosPage() {
  const services = await prisma.service.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Procedimentos</h1>
        <p className="text-gray-500 mt-2">
          Gerencie os serviços que você oferece, defina preços, duração e descrição. Estes dados aparecerão no seu site público de agendamentos.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <ServicesManager initialServices={services} />
      </div>
    </div>
  );
}
