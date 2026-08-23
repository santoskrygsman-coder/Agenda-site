import GalleryManager from "@/components/settings/GalleryManager";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function FotosPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 sm:pb-0 font-sans text-[#3A3335] animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/admin/mais" className="w-10 h-10 bg-white border border-[#F3E8E8] rounded-full flex items-center justify-center text-[#8B7E7F] hover:bg-[#FCFAFA] active:scale-95 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3A3335]">
            Fotos e Vídeos
          </h1>
          <p className="text-[#8B7E7F] text-sm mt-0.5 font-medium">
            Gerencie sua galeria de trabalhos.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <GalleryManager />
      </div>
    </div>
  );
}
