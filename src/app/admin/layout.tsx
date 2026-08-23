import Link from "next/link";
import { CalendarDays, Settings, Users, Home as HomeIcon, Scissors, Sparkles, Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FCFAFA] pb-[100px] sm:pb-0 sm:flex-row font-sans text-[#3A3335] max-w-[100vw] overflow-x-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden sm:flex flex-col w-64 bg-white border-r border-[#F3E8E8] shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        <div className="p-6 border-b border-[#F3E8E8] flex items-center gap-2">
          <Sparkles className="text-[#D4A373]" size={20} />
          <h2 className="text-xl font-bold tracking-tight text-[#3A3335]">Painel <span className="text-[#B98389]">Premium</span></h2>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          <NavItem href="/admin" icon={<HomeIcon size={18} />} text="Início" />
          <NavItem href="/admin/agenda" icon={<CalendarDays size={18} />} text="Agenda" />
          <NavItem href="/admin/clientes" icon={<Users size={18} />} text="Clientes" />
          <NavItem href="/admin/mais" icon={<Menu size={18} />} text="Mais" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 sm:p-8 overflow-y-auto w-full max-w-[1200px] mx-auto">
        <div className="sm:hidden mb-6 flex items-center justify-center gap-2 pt-2">
          <Sparkles className="text-[#D4A373]" size={18} />
          <h2 className="text-lg font-bold tracking-tight text-[#3A3335]">Painel <span className="text-[#B98389]">Premium</span></h2>
        </div>
        {children}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav 
        className="sm:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-[#F3E8E8] flex justify-around items-center px-1 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] pb-[env(safe-area-inset-bottom)]"
      >
        <NavItem href="/admin" icon={<HomeIcon size={22} />} text="Início" mobile />
        <NavItem href="/admin/agenda" icon={<CalendarDays size={22} />} text="Agenda" mobile />
        <NavItem href="/admin/clientes" icon={<Users size={22} />} text="Clientes" mobile />
        <NavItem href="/admin/mais" icon={<Menu size={22} />} text="Mais" mobile />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, text, mobile = false }: { href: string; icon: React.ReactNode; text: string; mobile?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex ${mobile ? 'flex-col justify-center items-center text-[10px] min-w-[64px] min-h-[72px] h-[72px]' : 'items-center gap-3 px-4 py-3 rounded-xl text-sm w-full'} text-[#8B7E7F] hover:text-[#B98389] hover:bg-[#FFF5F5] transition-all duration-300 active:scale-95`}
    >
      <div className={`${mobile ? 'mb-1' : ''}`}>{icon}</div>
      <span className={mobile ? 'font-semibold tracking-wide uppercase text-center w-full' : 'font-semibold'}>{text}</span>
    </Link>
  );
}
