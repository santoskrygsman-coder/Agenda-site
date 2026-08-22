import { prisma } from "@/lib/prisma";
import BookingWizard from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  const settings = await prisma.settings.findFirst();

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white shadow-lg sm:rounded-xl sm:my-8 overflow-hidden flex flex-col">
      <div className="bg-pink-100 p-6 text-center shrink-0">
        <div className="w-24 h-24 bg-pink-300 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center text-pink-600">
          <span className="font-bold text-2xl">{settings?.professionalName?.charAt(0) || "P"}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{settings?.professionalName || "Profissional"}</h1>
        <p className="text-pink-600 text-sm mt-1">{settings?.specialty || "Especialidade"}</p>
        
        {settings?.address && (
          <p className="text-gray-600 text-xs mt-3 flex items-center justify-center gap-1">
            📍 {settings.address}
          </p>
        )}
        
        {settings?.description && (
          <p className="text-gray-500 text-sm mt-3 italic">"{settings.description}"</p>
        )}
      </div>
      
      <div className="flex-1 bg-white p-4">
        <BookingWizard services={services} settings={settings} />
      </div>
    </main>
  );
}
