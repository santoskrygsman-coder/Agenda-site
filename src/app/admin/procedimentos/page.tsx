export const dynamic = "force-dynamic";
import ServicesManager from "@/components/ServicesManager";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ProcedimentosPage() {
  const services = await prisma.service.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans text-[#3A3335]">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/mais" className="w-10 h-10 bg-white border border-[#F3E8E8] rounded-full flex items-center justify-center text-[#8B7E7F] hover:bg-[#FCFAFA] active:scale-95 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3A3335]">
            Procedimentos
          </h1>
          <p className="text-[#8B7E7F] text-sm mt-0.5 font-medium">
            Gerencie os serviços que você oferece.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-5 overflow-hidden">
        <ServicesManager initialServices={services} />
      </div>
    </div>
  );
}
