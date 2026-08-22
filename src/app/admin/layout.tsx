import Link from "next/link";
import { CalendarDays, Settings, Users, Home as HomeIcon } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-16 sm:pb-0 sm:flex-row">
      {/* Sidebar Desktop / Topbar Mobile */}
      <aside className="hidden sm:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-pink-600">Admin Painel</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem href="/admin" icon={<HomeIcon size={20} />} text="Dashboard" />
          <NavItem href="/admin/agenda" icon={<CalendarDays size={20} />} text="Agenda" />
          <NavItem href="/admin/clientes" icon={<Users size={20} />} text="Clientes" />
          <NavItem href="/admin/config" icon={<Settings size={20} />} text="Configurações" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="sm:hidden mb-4">
          <h2 className="text-xl font-bold text-pink-600">Admin Painel</h2>
        </div>
        {children}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav className="sm:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2 z-50">
        <NavItem href="/admin" icon={<HomeIcon size={24} />} text="Início" mobile />
        <NavItem href="/admin/agenda" icon={<CalendarDays size={24} />} text="Agenda" mobile />
        <NavItem href="/admin/clientes" icon={<Users size={24} />} text="Clientes" mobile />
        <NavItem href="/admin/config" icon={<Settings size={24} />} text="Config" mobile />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, text, mobile = false }: { href: string; icon: React.ReactNode; text: string; mobile?: boolean }) {
  return (
    <Link href={href} className={`flex ${mobile ? 'flex-col justify-center text-[10px]' : 'items-center gap-3 px-3 py-2.5 rounded-lg text-sm'} text-gray-600 hover:text-pink-600 hover:bg-pink-50 transition-colors`}>
      {icon}
      <span className={mobile ? 'mt-1 font-medium' : 'font-medium'}>{text}</span>
    </Link>
  );
}
