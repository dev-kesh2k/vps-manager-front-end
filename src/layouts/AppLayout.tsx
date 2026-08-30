import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TerminalSquare,
  Play,
  FolderOpen,
  ScrollText,
  SlidersHorizontal,
  LogOut,
  Server,
  Menu,
  X,
  PackageCheck,
  PackagePlus,
  Users,
  Shield,
  Activity,
  Globe,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Cpu,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore, ScreenKey } from '../store/auth';
import { useServerStore } from '../store/server';

type NavItem = {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
  screen: ScreenKey;
  section?: string;
  badge?: string;
};

const ALL_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, screen: 'dashboard', section: 'Visão Geral' },
  { to: '/apps/installed', label: 'Apps Instalados', icon: PackageCheck, screen: 'appsInstalled', section: 'Aplicações' },
  { to: '/apps/install', label: 'Instalar Apps', icon: PackagePlus, screen: 'appsInstall', section: 'Aplicações' },
  { to: '/terminal', label: 'Terminal SSH', icon: TerminalSquare, screen: 'terminal', section: 'Sistema' },
  { to: '/command', label: 'Executar Comando', icon: SlidersHorizontal, screen: 'command', section: 'Sistema' },
  { to: '/services', label: 'Serviços Systemd', icon: Play, screen: 'services', section: 'Sistema' },
  { to: '/files', label: 'Gerenciador Arquivos', icon: FolderOpen, screen: 'files', section: 'Armazenamento' },
  { to: '/logs', label: 'Visualizador de Logs', icon: ScrollText, screen: 'logs', section: 'Monitoramento' },
  { to: '/servers', label: 'Servidores & Nós', icon: Server, screen: 'servers', section: 'Administração' },
  { to: '/users', label: 'Gerenciar Usuários', icon: Users, screen: 'users', section: 'Administração' },
];

const roleBadge = (role: string | null): { bg: string; text: string; border: string } => {
  if (role === 'admin') return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
  if (role === 'operator') return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
  return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
};

const roleLabel = (role: string | null): string => {
  if (role === 'admin') return 'Administrador';
  if (role === 'operator') return 'Operador';
  return 'Visualizador';
};

export default function AppLayout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const canAccess = useAuthStore((s) => s.canAccess);
  const navigate = useNavigate();
  const location = useLocation();

  const { servers, activeServer, fetchServers, setActiveServer } = useServerStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visible = ALL_NAV.filter((item) => canAccess(item.screen, 'read'));
  const currentItem = ALL_NAV.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));
  const roleStyle = roleBadge(role);

  return (
    <div className="min-h-screen flex bg-[#08090d] text-slate-200">
      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-200 ease-out md:flex md:flex-col w-72 border-r border-white/[0.07] bg-[#0c0e15]/95 backdrop-blur-2xl fixed md:static inset-y-0 left-0 z-40 flex flex-col justify-between`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-white/[0.06]">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#0c0e15]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white truncate">Kesh VPS</span>
                  <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-md bg-brand-500/15 text-brand-400 border border-brand-500/20">
                    Engine
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">{activeServer?.name || 'WSL2 Ubuntu'}</span>
                </div>
              </div>
            </div>
            <button
              className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05]"
              onClick={() => setMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-190px)]">
            {(() => {
              const sections: Record<string, NavItem[]> = {};
              for (const item of visible) {
                const s = item.section || 'Geral';
                (sections[s] ||= []).push(item);
              }
              return Object.entries(sections).map(([section, items]) => (
                <div key={section} className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{section}</span>
                  </div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-gradient-to-r from-brand-600/20 to-indigo-600/10 text-brand-300 border border-brand-500/30 shadow-sm shadow-indigo-950/40 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </NavLink>
                    );
                  })}
                </div>
              ));
            })()}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-white/[0.06] bg-[#090b10]/60 space-y-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center font-bold text-sm text-slate-200 flex-shrink-0">
                {(user || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{user || 'Usuário'}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    {roleLabel(role)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Desconectar do painel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/[0.06] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 bg-[#08090d]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-400 hover:text-white p-2 rounded-xl bg-white/[0.03] border border-white/[0.08]"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Painel</span>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <div className="flex items-center gap-2 font-semibold text-slate-100">
                {currentItem && <currentItem.icon className="w-4 h-4 text-brand-400" />}
                <span>{currentItem?.label || 'Visão Geral'}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions Bar */}
          <div className="flex items-center gap-3">
            {/* Interactive Server Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setServerDropdownOpen(!serverDropdownOpen)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-950/40 hover:bg-brand-900/40 border border-brand-500/30 hover:border-brand-500/50 text-xs font-medium text-brand-200 transition-all shadow-sm"
                title="Trocar Servidor / Ambiente"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeServer?.type === 'ssh' ? (
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                ) : activeServer?.type === 'local' ? (
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-brand-400" />
                )}
                <span className="max-w-[130px] sm:max-w-[180px] truncate font-semibold">
                  {activeServer?.name || 'Servidor Local'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Server Switcher Dropdown Menu */}
              {serverDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0c0f18]/95 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Servidores Conectados
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Clique para alternar o servidor de execução
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {servers.map((s) => {
                      const isCurr = s.id === activeServer?.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActiveServer(s.id);
                            setServerDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all ${
                            isCurr
                              ? 'bg-brand-600/20 border border-brand-500/30 text-white font-semibold'
                              : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                s.type === 'ssh'
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : s.type === 'local'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-brand-500/20 text-brand-300'
                              }`}
                            >
                              {s.type === 'ssh' ? (
                                <Globe className="w-3.5 h-3.5" />
                              ) : s.type === 'local' ? (
                                <Cpu className="w-3.5 h-3.5" />
                              ) : (
                                <Server className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{s.name}</div>
                              <div className="text-[10px] text-slate-400 truncate font-mono">
                                {s.type === 'ssh'
                                  ? `${s.username}@${s.host}`
                                  : s.type === 'wsl'
                                  ? `WSL · ${s.wslDistro || 'Ubuntu'}`
                                  : 'Linux Nativo'}
                              </div>
                            </div>
                          </div>
                          {isCurr && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-white/[0.06] pt-1.5 mt-1">
                    <NavLink
                      to="/servers"
                      onClick={() => setServerDropdownOpen(false)}
                      className="flex items-center gap-2 w-full p-2 rounded-xl text-xs font-semibold text-brand-300 hover:bg-brand-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar / Gerenciar Servidores</span>
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* Live Status indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Nginx 80 • Proxy Ativo</span>
            </div>

            {/* Clock Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-slate-400">
              <Activity className="w-3.5 h-3.5 text-brand-400" />
              <span>{currentTime || '00:00:00'}</span>
            </div>

            {/* Hub Apps Direct Shortcut */}
            <a
              href="http://localhost/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs font-medium text-slate-300 hover:text-white transition-all group"
              title="Acessar Proxy Nginx Principal (http://localhost/)"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">http://localhost/</span>
              <span className="sm:hidden">Proxy</span>
            </a>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 p-4 md:p-8 overflow-auto bg-radial-fade">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
