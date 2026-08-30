import { useEffect, useMemo, useState } from 'react';
import {
  PackageCheck,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Play,
  Square,
  RotateCw,
  Layers,
  Power,
  Copy,
  Check,
  X,
  Terminal,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Database,
  Globe,
  Server,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
} from 'lucide-react';
import api from '../lib/api';

interface InstalledApp {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  installed: boolean;
  version?: string;
  running: boolean | null;
  defaultPort?: number;
  postInstallHint?: string;
  startCommand?: string;
  stopCommand?: string;
  restartCommand?: string;
  composePath?: string;
  isDocker?: boolean;
  protocol?: 'http' | 'https';
  webPath?: string;
  hasWebUi?: boolean;
  connectionString?: string;
  nginxPath?: string;
  nginxSubdomain?: string;
}

interface Category {
  key: string;
  label: string;
  emoji: string;
}

interface InstalledResponse {
  apps: InstalledApp[];
  categories: Category[];
}

export default function AppsInstalledPage() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // App action states
  const [actionInProgress, setActionInProgress] = useState<
    Record<string, 'start' | 'stop' | 'restart' | 'compose-up' | 'compose-down' | null>
  >({});
  const [composeLoading, setComposeLoading] = useState(false);
  const [globalComposePath, setGlobalComposePath] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Modal output state
  const [composeModal, setComposeModal] = useState<{
    open: boolean;
    title: string;
    output: string;
    success?: boolean;
    running?: boolean;
  }>({
    open: false,
    title: '',
    output: '',
  });

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<InstalledResponse>('/apps/installed');
      setApps(data.apps || []);
      setCategories(data.categories || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const installedApps = useMemo(() => apps.filter((app) => app.installed), [apps]);

  const filteredApps = useMemo(() => {
    return installedApps.filter((app) => {
      // Category match
      if (activeCategory !== 'all' && app.category !== activeCategory) return false;
      // Status match
      if (statusFilter === 'running' && app.running !== true) return false;
      if (statusFilter === 'stopped' && app.running !== false) return false;
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q);
        const matchPort = app.defaultPort?.toString().includes(q);
        const matchId = app.id.toLowerCase().includes(q);
        return matchName || matchDesc || matchPort || matchId;
      }
      return true;
    });
  }, [installedApps, activeCategory, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: installedApps.length };
    for (const app of installedApps) {
      map[app.category] = (map[app.category] || 0) + 1;
    }
    return map;
  }, [installedApps]);

  const runningCount = useMemo(() => installedApps.filter((a) => a.running === true).length, [installedApps]);
  const stoppedCount = useMemo(() => installedApps.filter((a) => a.running === false).length, [installedApps]);

  const getAppUrl = (app: InstalledApp): string | null => {
    if (
      app.hasWebUi === false ||
      app.category === 'database' ||
      app.id === 'docker' ||
      app.id === 'ufw' ||
      app.id === 'fail2ban' ||
      app.id === 'certbot' ||
      app.id === 'zabbix'
    ) {
      return null;
    }
    if (!app.defaultPort && !app.webPath) return null;
    const protocol =
      app.protocol ||
      (app.defaultPort === 443 || app.defaultPort === 8083 || app.defaultPort === 9090 ? 'https' : 'http');
    const host = window.location.hostname || 'localhost';
    const port =
      (protocol === 'http' && app.defaultPort === 80) || (protocol === 'https' && app.defaultPort === 443)
        ? ''
        : app.defaultPort
        ? `:${app.defaultPort}`
        : '';
    const path = app.webPath || '/';
    return `${protocol}://${host}${port}${path.startsWith('/') ? path : '/' + path}`;
  };

  const getNginxPathUrl = (app: InstalledApp): string | null => {
    if (!app.nginxPath) return null;
    const host = window.location.hostname || 'localhost';
    const path = app.nginxPath;
    return `http://${host}${path.startsWith('/') ? path : '/' + path}`;
  };

  const getNginxSubdomainUrl = (app: InstalledApp): string | null => {
    if (!app.nginxSubdomain) return null;
    return `http://${app.nginxSubdomain}/`;
  };

  const copyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleAppAction = async (
    appId: string,
    action: 'start' | 'stop' | 'restart',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setActionInProgress((prev) => ({ ...prev, [appId]: action }));
    try {
      const { data } = await api.post(`/apps/action/${appId}`, { action });
      if (data.success) {
        showToast('success', data.message || `Ação "${action}" executada com sucesso!`);
      } else {
        showToast('error', data.message || `Falha ao executar "${action}".`);
      }
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || `Erro ao executar ${action}`;
      showToast('error', msg);
    } finally {
      setActionInProgress((prev) => ({ ...prev, [appId]: null }));
    }
  };

  const handleDockerCompose = async (
    action: 'up' | 'down',
    composePath?: string,
    appId?: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const actKey = action === 'up' ? 'compose-up' : 'compose-down';
    if (appId) {
      setActionInProgress((prev) => ({ ...prev, [appId]: actKey }));
    } else {
      setComposeLoading(true);
    }

    const title = action === 'up' ? 'docker compose up -d --build' : 'docker compose down';
    const targetPath = composePath || (appId ? apps.find((a) => a.id === appId)?.composePath : undefined) || globalComposePath || '.';

    setComposeModal({
      open: true,
      title: `${title} [${targetPath}]`,
      output: `⏳ Executando: ${title}\nDiretório: ${targetPath}\nAguarde o processamento...\n`,
      running: true,
    });

    try {
      const { data } = await api.post('/apps/compose', {
        action,
        composePath: targetPath,
        appId,
      });

      setComposeModal({
        open: true,
        title: `${title} [${targetPath}]`,
        output:
          (data.output || '').trim() ||
          (data.success ? 'Comando finalizado com sucesso!' : 'Comando finalizado.'),
        success: data.success,
        running: false,
      });

      if (data.success) {
        showToast('success', `${title} finalizado com sucesso!`);
      } else {
        showToast('error', `Falha na execução de ${title}`);
      }
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao executar comando Docker Compose';
      setComposeModal({
        open: true,
        title: `${title} [${targetPath}]`,
        output: `❌ ERRO:\n${msg}`,
        success: false,
        running: false,
      });
      showToast('error', msg);
    } finally {
      if (appId) {
        setActionInProgress((prev) => ({ ...prev, [appId]: null }));
      }
      setComposeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl shadow-2xl flex items-start gap-3 border backdrop-blur-xl animate-fade-in ${
            toast.type === 'success'
              ? 'bg-[#0a1f18]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
              : toast.type === 'error'
              ? 'bg-[#220d13]/95 border-rose-500/40 text-rose-100 shadow-rose-950/50'
              : 'bg-[#10141f]/95 border-white/[0.12] text-slate-100'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium leading-relaxed">{toast.text}</div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Aplicações Instaladas</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              {installedApps.length} Ativos
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerenciamento de containers, portas de acesso, proxy reverso Nginx e ciclo de vida
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary text-xs px-3.5 py-2.5"
            title="Atualizar status dos aplicativos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <a
            href="/apps/install"
            className="btn-primary text-xs px-4 py-2.5"
          >
            <PackageCheck className="w-4 h-4" />
            <span>+ Catálogo de Apps</span>
          </a>
        </div>
      </div>

      {/* Docker Compose Global Controller Bar */}
      <div className="card p-5 bg-gradient-to-r from-[#121624] via-[#0f121c] to-[#0c0e15] border-white/[0.08] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600/30 to-indigo-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Controle Global Docker Compose</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute build e subida de containers em lote diretamente no host
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-[#08090d]/90 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 focus-within:border-brand-500/80 transition-all">
              <FolderOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Diretório (ex: /opt/apache ou .)"
                value={globalComposePath}
                onChange={(e) => setGlobalComposePath(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none placeholder-slate-500 w-48 sm:w-64 font-mono"
              />
            </div>

            <button
              onClick={() => handleDockerCompose('up', globalComposePath)}
              disabled={composeLoading}
              className="btn-primary text-xs px-3.5 py-2"
              title="Executa: docker compose up -d --build"
            >
              {composeLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Compose Up</span>
            </button>

            <button
              onClick={() => handleDockerCompose('down', globalComposePath)}
              disabled={composeLoading}
              className="btn-danger text-xs px-3.5 py-2"
              title="Executa: docker compose down"
            >
              {composeLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
              <span>Compose Down</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, porta, descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-brand-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({installedApps.length})
          </button>
          <button
            onClick={() => setStatusFilter('running')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'running'
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Rodando ({runningCount})
          </button>
          <button
            onClick={() => setStatusFilter('stopped')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'stopped'
                ? 'bg-amber-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Parados ({stoppedCount})
          </button>
        </div>
      </div>

      {/* Main Grid with Category Filter Pill Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Category Filter Sidebar */}
        <aside className="space-y-4">
          <div className="card p-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 pb-1 border-b border-white/[0.06]">
              Categorias
            </div>
            <div className="space-y-1 pt-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeCategory === 'all'
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <span>Todas as Aplicações</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-slate-300 font-mono">
                  {installedApps.length}
                </span>
              </button>

              {categories.map((c) => {
                const count = counts[c.key] || 0;
                const isActive = activeCategory === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(c.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{c.emoji}</span>
                      <span className="truncate">{c.label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-slate-300 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Reference Card */}
          <div className="card p-4 text-xs text-slate-400 space-y-2.5">
            <div className="font-semibold text-slate-200 text-xs">Legenda de Status</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Porta ouvindo / Container ativo</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-300">Instalado porém parado</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span className="text-slate-300">Proxy Nginx / Subdomínio ativo</span>
            </div>
          </div>
        </aside>

        {/* Apps Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-5 space-y-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.08] rounded w-1/2" />
                      <div className="h-3 bg-white/[0.04] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-white/[0.04] rounded-xl" />
                  <div className="h-8 bg-white/[0.04] rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="card p-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-base font-bold text-slate-200">Nenhum aplicativo encontrado</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? 'Nenhum resultado corresponde aos termos da pesquisa.'
                  : 'Nenhum aplicativo instalado nesta categoria.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-secondary text-xs px-3.5 py-1.5"
                >
                  Limpar pesquisa
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApps.map((app) => {
                const isExpanded = expandedId === app.id;
                const appUrl = getAppUrl(app);
                const isActionBusy = !!actionInProgress[app.id];
                const currentAction = actionInProgress[app.id];

                return (
                  <div
                    key={app.id}
                    className={`card p-5 flex flex-col justify-between space-y-4 transition-all hover:border-white/[0.14] ${
                      app.running === true ? 'ring-1 ring-emerald-500/20' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#141824] border border-white/[0.08] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                            {app.icon}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                              <span>{app.name}</span>
                              {app.running === true && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Em execução" />
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>{categories.find((c) => c.key === app.category)?.emoji}</span>
                              <span>{categories.find((c) => c.key === app.category)?.label || app.category}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          title={isExpanded ? 'Recolher detalhes' : 'Ver detalhes técnicos'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
                        {app.description}
                      </p>

                      {/* Pill Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {app.running === true ? (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Rodando
                          </span>
                        ) : app.running === false ? (
                          <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Parado
                          </span>
                        ) : (
                          <span className="badge bg-slate-800 text-slate-300 border border-white/[0.08]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Instalado
                          </span>
                        )}

                        {typeof app.defaultPort === 'number' && (
                          <span className="badge bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[11px]">
                            Porta {app.defaultPort}
                          </span>
                        )}

                        {(app.isDocker || app.composePath) && (
                          <span className="badge bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px]">
                            Docker
                          </span>
                        )}
                      </div>
                    </div>

                    {/* App Actions & Links Strip */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                      {/* Direct Web UI Access */}
                      {appUrl && (
                        <div className="flex items-center gap-2">
                          <a
                            href={appUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 btn-primary text-xs py-2 px-3 justify-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Acessar Web (Porta {app.defaultPort})</span>
                          </a>
                          <button
                            onClick={(e) => copyToClipboard(appUrl, app.id, e)}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
                            title="Copiar URL"
                          >
                            {copiedUrl === app.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Database Connection String Quick Copy */}
                      {app.connectionString && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(app.connectionString!, `conn-${app.id}`, e)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600/40 shadow-sm transition-all group"
                            title="Copiar URI de Conexão do Banco"
                          >
                            <Database className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span className="truncate">
                              {copiedUrl === `conn-${app.id}` ? 'Copiado para o Clip!' : 'Copiar URI do Banco'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(app.connectionString!, `conn-${app.id}`, e)}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
                            title="Copiar string de conexão"
                          >
                            {copiedUrl === `conn-${app.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Nginx Reverse Proxy Route Access */}
                      {(app.nginxPath || app.nginxSubdomain) && (
                        <div className="flex items-center gap-2">
                          <a
                            href={getNginxPathUrl(app) || getNginxSubdomainUrl(app) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 shadow-sm transition-all group"
                            title={`Acessar pelo Nginx Proxy (${getNginxPathUrl(app) || getNginxSubdomainUrl(app)})`}
                          >
                            <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span className="truncate">
                              Nginx: {app.nginxPath ? `http://localhost${app.nginxPath}` : `http://${app.nginxSubdomain}`}
                            </span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(getNginxPathUrl(app) || getNginxSubdomainUrl(app) || '', `nginx-${app.id}`, e)}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-colors"
                            title="Copiar URL Nginx"
                          >
                            {copiedUrl === `nginx-${app.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Start / Stop / Restart Controls */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={(e) => handleAppAction(app.id, 'start', e)}
                          disabled={isActionBusy || app.running === true}
                          className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            app.running === true
                              ? 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                          title="Iniciar aplicação"
                        >
                          {currentAction === 'start' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>Iniciar</span>
                        </button>

                        <button
                          onClick={(e) => handleAppAction(app.id, 'stop', e)}
                          disabled={isActionBusy || app.running === false}
                          className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            app.running === false
                              ? 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                          title="Parar aplicação"
                        >
                          {currentAction === 'stop' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Square className="w-3 h-3 fill-current" />
                          )}
                          <span>Parar</span>
                        </button>

                        <button
                          onClick={(e) => handleAppAction(app.id, 'restart', e)}
                          disabled={isActionBusy}
                          className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition-all disabled:opacity-50"
                          title="Reiniciar aplicação"
                        >
                          {currentAction === 'restart' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCw className="w-3 h-3" />
                          )}
                          <span>Reiniciar</span>
                        </button>
                      </div>

                      {/* App Docker Compose Actions */}
                      {(app.isDocker || app.composePath) && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={(e) => handleDockerCompose('up', app.composePath, app.id, e)}
                            disabled={isActionBusy}
                            className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all disabled:opacity-50"
                            title="docker compose up -d --build"
                          >
                            {currentAction === 'compose-up' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Layers className="w-3 h-3" />
                            )}
                            <span>Compose Up</span>
                          </button>

                          <button
                            onClick={(e) => handleDockerCompose('down', app.composePath, app.id, e)}
                            disabled={isActionBusy}
                            className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/30 transition-all disabled:opacity-50"
                            title="docker compose down"
                          >
                            {currentAction === 'compose-down' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Power className="w-3 h-3" />
                            )}
                            <span>Compose Down</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded Technical Details */}
                    {isExpanded && (
                      <div className="pt-3 mt-2 border-t border-white/[0.06] space-y-2.5 text-xs animate-fade-in">
                        {app.version && (
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 font-medium min-w-[70px]">Versão:</span>
                            <span className="text-slate-200 font-mono text-[11px] break-all">
                              {app.version}
                            </span>
                          </div>
                        )}

                        {app.composePath && (
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 font-medium min-w-[70px]">Pasta:</span>
                            <span className="text-slate-200 font-mono text-[11px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                              {app.composePath}
                            </span>
                          </div>
                        )}

                        {app.postInstallHint && (
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-300 space-y-1">
                            <div className="font-semibold text-slate-200 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Instruções de Acesso:
                            </div>
                            <div className="text-[11px] text-slate-400 leading-relaxed">
                              {app.postInstallHint}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Terminal Output Modal for Docker Compose */}
      {composeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border-white/[0.12] shadow-2xl bg-[#0a0c12]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5 font-mono text-sm text-white font-semibold">
                <Terminal className="w-4 h-4 text-brand-400" />
                <span className="truncate">{composeModal.title}</span>
              </div>
              <button
                onClick={() => setComposeModal({ open: false, title: '', output: '' })}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Terminal Body */}
            <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-slate-300 bg-[#06070a] leading-relaxed whitespace-pre-wrap select-text">
              {composeModal.output}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs">
                {composeModal.running ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Em execução...
                  </span>
                ) : composeModal.success ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    Finalizado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => copyToClipboard(composeModal.output, 'modal-output', e)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUrl === 'modal-output' ? 'Copiado!' : 'Copiar Log'}</span>
                </button>
                <button
                  onClick={() => setComposeModal({ open: false, title: '', output: '' })}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
