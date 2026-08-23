import { Settings, Image as ImageIcon, MessageCircle, Gift, Bell, User, Clock, Scissors, ChevronRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function MaisPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 sm:pb-0 font-sans text-[#3A3335] animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#3A3335] flex items-center gap-2">
          Mais
        </h1>
        <p className="text-[#8B7E7F] text-sm mt-1 font-medium">
          Gerencie seu espaço e suas configurações.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* PRINCIPAL */}
        <section>
          <h2 className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-2 px-2">Principal</h2>
          <div className="bg-white rounded-3xl border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <MenuLink href="/admin/procedimentos" icon={<Scissors size={18} className="text-[#A76D74]" />} title="Procedimentos" bgIcon="bg-[#FFF5F5]" />
            <MenuLink href="/admin/horarios" icon={<Clock size={18} className="text-[#5A7A66]" />} title="Meus Horários" bgIcon="bg-[#E9F0EC]" />
            <MenuLink href="/admin/fotos" icon={<ImageIcon size={18} className="text-[#D4A373]" />} title="Fotos e Vídeos" bgIcon="bg-[#FFF9F2]" />
            <MenuLink href="/admin/whatsapp" icon={<MessageCircle size={18} className="text-[#1ebd5a]" />} title="WhatsApp" bgIcon="bg-[#25D366]/10" last />
          </div>
        </section>

        {/* CLIENTES */}
        <section>
          <h2 className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-2 px-2">Clientes</h2>
          <div className="bg-white rounded-3xl border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <MenuLink href="/admin/aniversarios" icon={<Gift size={18} className="text-[#B98389]" />} title="Aniversários" bgIcon="bg-[#FFF5F5]" />
            <MenuLink href="/admin/lembretes" icon={<Bell size={18} className="text-[#A76D74]" />} title="Lembretes" bgIcon="bg-[#F3E8E8]" last />
          </div>
        </section>

        {/* CONTA */}
        <section>
          <h2 className="text-[11px] font-bold text-[#8B7E7F] uppercase tracking-wider mb-2 px-2">Conta</h2>
          <div className="bg-white rounded-3xl border border-[#F3E8E8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <MenuLink href="/admin/perfil" icon={<User size={18} className="text-[#5A5052]" />} title="Meu Perfil" bgIcon="bg-[#FCFAFA]" />
            <MenuLink href="/admin/config-agenda" icon={<Settings size={18} className="text-[#8B7E7F]" />} title="Configurações de Agenda" bgIcon="bg-[#F3E8E8]" last />
          </div>
        </section>
        
      </div>
    </div>
  );
}

function MenuLink({ href, icon, title, bgIcon, last = false }: { href: string, icon: React.ReactNode, title: string, bgIcon: string, last?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-4 p-4 hover:bg-[#FCFAFA] transition-colors active:bg-[#F3E8E8] ${!last ? 'border-b border-[#F3E8E8]' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgIcon}`}>
        {icon}
      </div>
      <div className="flex-1 font-bold text-[#3A3335] text-sm">
        {title}
      </div>
      <div className="text-[#D9A0A0]">
        <ChevronRight size={18} />
      </div>
    </Link>
  );
}
