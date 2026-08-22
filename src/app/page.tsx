import { prisma } from "@/lib/prisma";
import BookingWizard from "@/components/BookingWizard";
import PublicGallery from "@/components/PublicGallery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" }
  });

  const settings = await prisma.settings.findFirst();
  const gallery = await prisma.galleryImage.findMany({
    orderBy: { order: "asc" }
  });

  return (
    <main className="max-w-md mx-auto min-h-screen bg-[#FCFAFA] sm:shadow-2xl sm:shadow-pink-900/5 sm:rounded-[2rem] sm:my-8 overflow-hidden flex flex-col font-sans text-[#3A3335]">
      {/* HEADER PREMIUM */}
      <div className="bg-gradient-to-b from-[#FFF5F5] to-[#FCFAFA] px-6 pt-10 pb-6 text-center shrink-0 border-b border-[#F3E8E8]">
        <div className="w-28 h-28 bg-white rounded-full mx-auto mb-5 overflow-hidden border-4 border-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center justify-center text-[#B98389]">
          {settings?.avatarUrl ? (
            <img src={settings.avatarUrl} alt="Profissional" className="w-full h-full object-cover" />
          ) : (
            <span className="font-serif italic text-4xl text-[#B98389]">
              {settings?.professionalName?.charAt(0) || "P"}
            </span>
          )}
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-[#3A3335] flex items-center justify-center gap-2">
          <span className="text-[#D4A373] text-sm">✦</span>
          {settings?.professionalName || "Profissional"}
          <span className="text-[#D4A373] text-sm">✦</span>
        </h1>
        
        <p className="text-[#B98389] text-sm mt-1.5 font-medium tracking-wide uppercase">
          {settings?.specialty || "Lash & Brow Designer"}
        </p>
        
        {settings?.address && (
          <p className="text-[#8B7E7F] text-xs mt-4 flex items-center justify-center gap-1 font-medium">
            · {settings.address} ·
          </p>
        )}
        
        {settings?.description && (
          <p className="text-[#6B5E5F] text-sm mt-4 font-serif italic px-4 leading-relaxed">
            "{settings.description}"
          </p>
        )}
      </div>
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 bg-[#FCFAFA] p-5 sm:p-8">
        <PublicGallery images={gallery} />
        <BookingWizard services={services} settings={settings} />
      </div>
    </main>
  );
}
