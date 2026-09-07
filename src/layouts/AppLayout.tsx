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
  Users,
  Globe,
  Boxes,
  ChevronDown,
  Check,
  Plus,
  Cpu,
  Search,
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
};

const ALL_NAV: NavItem[] = [
  { to: '/', label: 'Página inicial', icon: LayoutDashboard, end: true, screen: 'dashboard', section: 'Recentes' },
  { to: '/aplicacoes', label: 'Aplicações', icon: Boxes, screen: 'aplicacoes', section: 'Aplicações' },
  { to: '/apps/installed', label: 'Apps instalados', icon: PackageCheck, screen: 'appsInstalled', section: 'Aplicações' },
  { to: '/websites', label: 'Website', icon: Globe, screen: 'websites', section: 'Aplicações' },
  { to: '/terminal', label: 'Terminal SSH', icon: TerminalSquare, screen: 'terminal', section: 'Sistema' },
  { to: '/command', label: 'Executar comando', icon: SlidersHorizontal, screen: 'command', section: 'Sistema' },
  { to: '/services', label: 'Serviços systemd', icon: Play, screen: 'services', section: 'Sistema' },
  { to: '/files', label: 'Arquivos', icon: FolderOpen, screen: 'files', section: 'Observe' },
  { to: '/logs', label: 'Logs', icon: ScrollText, screen: 'logs', section: 'Observe' },
  { to: '/servers', label: 'Servidores', icon: Server, screen: 'servers', section: 'Build' },
  { to: '/users', label: 'Usuários', icon: Users, screen: 'users', section: 'Build' },
];

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setServerDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const visible = ALL_NAV.filter((item) => canAccess(item.screen, 'read')).filter((item) =>
    item.label.toLowerCase().includes(navQuery.trim().toLowerCase())
  );
  const currentItem = ALL_NAV.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-dvh flex bg-[#f6f7f8] text-[#1d1f20]">
      <aside
        className={`${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-200 ease-out md:flex md:flex-col w-[min(260px,85vw)] border-r border-[#e5e6e8] bg-white fixed md:static inset-y-0 left-0 z-40 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-[#0051c3] flex items-center justify-center shrink-0">
                <Server className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-[#1d1f20] truncate">
                Central Hub
              </span>
            </div>
            <button
              className="md:hidden text-[#4c4f52] hover:text-[#1d1f20] p-2 rounded hover:bg-[#f0f1f2]"
              onClick={() => setMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#808487] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Pesquisa rápida..."
              className="w-full h-10 sm:h-8 pl-8 pr-3 sm:pr-12 rounded-md bg-[#f6f7f8] border border-[#e5e6e8] text-xs text-[#1d1f20] placeholder-[#808487] outline-none focus:border-[#0051c3] focus:ring-2 focus:ring-[#0051c3]/10"
            />
            <span className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#808487] border border-[#e5e6e8] rounded px-1 py-px font-medium">
              Ctrl K
            </span>
          </div>
        </div>

        <nav className="px-3 pb-4 flex-1 overflow-y-auto space-y-5">
          {(() => {
            const sections: Record<string, NavItem[]> = {};
            for (const item of visible) {
              const s = item.section || 'Geral';
              (sections[s] ||= []).push(item);
            }
            return Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <div className="px-3 mb-1 text-[11px] font-medium text-[#808487]">{section}</div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2.5 md:py-1.5 rounded-md text-[13px] transition-colors ${
                            isActive
                              ? 'bg-[#f0f1f2] text-[#1d1f20] font-medium'
                              : 'text-[#313335] hover:bg-[#f6f7f8]'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 text-[#4c4f52] stroke-[1.75]" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </nav>
      </aside>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#1d1f20]/30" onClick={() => setMenuOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between bg-[#f6f7f8]/95 backdrop-blur-sm border-b border-transparent md:border-none pt-[env(safe-area-inset-top)]">
          <div className="h-12 flex items-center gap-3 min-w-0">
            <button
              className="md:hidden text-[#4c4f52] p-2 -ml-1 rounded-md hover:bg-white border border-transparent hover:border-[#e5e6e8]"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="sm:hidden text-[14px] font-medium text-[#1d1f20] truncate">
              {currentItem?.label || 'Página inicial'}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-[#808487]">
              <span>Conta</span>
              <span>/</span>
              <span className="text-[#1d1f20] font-medium">{currentItem?.label || 'Página inicial'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setServerDropdownOpen(!serverDropdownOpen)}
                className="inline-flex items-center gap-2 h-9 sm:h-8 px-2.5 rounded-md bg-white border border-[#c5c6c8] text-[12px] font-medium text-[#313335] hover:bg-[#f6f7f8]"
              >
                {activeServer?.type === 'ssh' ? (
                  <Globe className="w-3.5 h-3.5 text-[#0051c3]" />
                ) : activeServer?.type === 'local' ? (
                  <Cpu className="w-3.5 h-3.5 text-[#0051c3]" />
                ) : (
                  <Server className="w-3.5 h-3.5 text-[#0051c3]" />
                )}
                <span className="max-w-[88px] sm:max-w-[140px] truncate">{activeServer?.name || 'Servidor local'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#808487]" />
              </button>

              {serverDropdownOpen && (
                <div className="absolute right-0 left-auto mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-md border border-[#e5e6e8] bg-white shadow-lg p-1.5 z-50">
                  <div className="px-2.5 py-2 border-b border-[#f0f1f2] mb-1">
                    <div className="text-[11px] font-medium text-[#808487]">Servidores conectados</div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {servers.map((s) => {
                      const isCurr = s.id === activeServer?.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActiveServer(s.id);
                            setServerDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left text-[12px] ${
                            isCurr ? 'bg-[#f0f1f2] text-[#1d1f20] font-medium' : 'text-[#313335] hover:bg-[#f6f7f8]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{s.name}</div>
                            <div className="text-[11px] text-[#808487] truncate font-mono">
                              {s.type === 'ssh'
                                ? `${s.username}@${s.host}`
                                : s.type === 'wsl'
                                ? `WSL · ${s.wslDistro || 'Ubuntu'}`
                                : 'Linux nativo'}
                            </div>
                          </div>
                          {isCurr && <Check className="w-4 h-4 text-[#0051c3] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <NavLink
                    to="/servers"
                    onClick={() => setServerDropdownOpen(false)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 mt-1 rounded-md text-[12px] font-medium text-[#0051c3] hover:bg-[#f6f7f8]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Gerenciar servidores
                  </NavLink>
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="w-7 h-7 rounded-full bg-[#0051c3] text-white text-[11px] font-semibold flex items-center justify-center hover:opacity-90"
                title={user || 'Usuário'}
              >
                {(user || 'U').charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-md border border-[#e5e6e8] bg-white shadow-lg p-1.5 z-50">
                  <div className="px-2.5 py-2 border-b border-[#f0f1f2] mb-1">
                    <div className="text-[13px] font-medium text-[#1d1f20] truncate">{user || 'Usuário'}</div>
                    <div className="text-[11px] text-[#808487]">{roleLabel(role)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-[12px] text-[#d9211e] hover:bg-[#f6f7f8]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 pb-[max(2rem,env(safe-area-inset-bottom))] overflow-auto">
          <div className="max-w-[1120px] mx-auto w-full">{<Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
