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
  Search,
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
  publicUrl?: string;
  localUrl?: string;
}

interface Category {
  key: string;
  label: string;
  emoji: string;
}

interface InstalledResponse {
  apps: InstalledApp[];
  categories: Category[];
  publicOrigin?: string;
}

export default function AppsInstalledPage() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [publicOrigin, setPublicOrigin] = useState('');
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
      setPublicOrigin(data.publicOrigin || '');
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

  const isPublicHub = useMemo(() => {
    if (!publicOrigin) return false;
    try {
      return window.location.hostname === new URL(publicOrigin).hostname;
    } catch {
      return false;
    }
  }, [publicOrigin]);

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

    if (isPublicHub && app.publicUrl) return app.publicUrl;
    if (app.localUrl) return app.localUrl;

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
    if (isPublicHub && app.publicUrl) return app.publicUrl;
    if (!app.nginxPath) return null;
    const protocol = isPublicHub ? 'https' : 'http';
    const host = window.location.hostname || 'localhost';
    const path =
      app.nginxPath === '/'
        ? '/'
        : `${app.nginxPath.replace(/\/$/, '')}/`;
    return `${protocol}://${host}${path.startsWith('/') ? path : '/' + path}`;
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
          className={`fixed left-4 right-4 sm:left-auto bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:right-6 z-50 sm:max-w-md p-4 rounded-lg shadow-lg flex items-start gap-3 border bg-white animate-fade-in ${
            toast.type === 'success'
              ? 'border-emerald-200 text-[#1d1f20]'
              : toast.type === 'error'
              ? 'border-rose-200 text-[#1d1f20]'
              : 'border-[#e5e6e8] text-[#1d1f20]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#0051c3] flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium leading-relaxed">{toast.text}</div>
          <button
            onClick={() => setToast(null)}
            className="text-[#808487] hover:text-[#1d1f20] p-1 rounded hover:bg-[#f6f7f8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Aplicações instaladas</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              {installedApps.length} ativos
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
            Containers, portas de acesso, proxy Nginx e ciclo de vida
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary text-xs h-8"
            title="Atualizar status dos aplicativos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <a href="/apps/install" className="btn-primary text-xs h-8">
            <PackageCheck className="w-4 h-4" />
            <span>Catálogo de apps</span>
          </a>
        </div>
      </div>

      <div className="bg-white border border-[#e5e6e8] rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center text-[#0051c3]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium text-[#1d1f20] text-sm">Controle global Docker Compose</div>
              <p className="text-xs text-[#808487] mt-0.5">
                Execute build e subida de containers em lote no host
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-[#f6f7f8] border border-[#c5c6c8] rounded-md px-3 h-8 text-xs text-[#4c4f52] focus-within:border-[#0051c3]">
              <FolderOpen className="w-3.5 h-3.5 text-[#808487] flex-shrink-0" />
              <input
                type="text"
                placeholder="Diretório (ex: /opt/apache ou .)"
                value={globalComposePath}
                onChange={(e) => setGlobalComposePath(e.target.value)}
                className="bg-transparent border-none text-xs text-[#1d1f20] focus:outline-none placeholder-[#808487] w-48 sm:w-64 font-mono"
              />
            </div>
            <button
              onClick={() => handleDockerCompose('up', globalComposePath)}
              disabled={composeLoading}
              className="btn-primary text-xs h-8"
              title="Executa: docker compose up -d --build"
            >
              {composeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Compose Up</span>
            </button>
            <button
              onClick={() => handleDockerCompose('down', globalComposePath)}
              disabled={composeLoading}
              className="btn-danger text-xs h-8"
              title="Executa: docker compose down"
            >
              {composeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
              <span>Compose Down</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#808487] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, porta, descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 text-xs h-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#808487] hover:text-[#1d1f20] absolute right-3 top-1/2 -translate-y-1/2 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] text-xs self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded font-medium shrink-0 ${
              statusFilter === 'all' ? 'bg-white text-[#1d1f20] shadow-sm' : 'text-[#4c4f52] hover:text-[#1d1f20]'
            }`}
          >
            Todos ({installedApps.length})
          </button>
          <button
            onClick={() => setStatusFilter('running')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'running' ? 'bg-white text-[#1d1f20] shadow-sm' : 'text-[#4c4f52] hover:text-[#1d1f20]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Rodando ({runningCount})
          </button>
          <button
            onClick={() => setStatusFilter('stopped')}
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 shrink-0 ${
              statusFilter === 'stopped' ? 'bg-white text-[#1d1f20] shadow-sm' : 'text-[#4c4f52] hover:text-[#1d1f20]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Parados ({stoppedCount})
          </button>
        </div>
      </div>

      {/* Main Grid with Category Filter Pill Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 lg:gap-6">
        {/* Category Filter Sidebar */}
        <aside className="space-y-4 min-w-0">
          <div className="card p-3 lg:p-4 space-y-2">
            <div className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-[#808487] px-2 pb-1 border-b border-[#e5e6e8]">
              Categorias
            </div>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:pt-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 lg:py-1.5 rounded-md text-[13px] ${
                  activeCategory === 'all'
                    ? 'bg-[#f0f1f2] text-[#1d1f20] font-medium'
                    : 'text-[#313335] hover:bg-[#f6f7f8]'
                }`}
              >
                <span>Todas</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f6f7f8] text-[#4c4f52] font-mono">
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
                    className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 lg:py-1.5 rounded-md text-[13px] ${
                      isActive
                        ? 'bg-[#f0f1f2] text-[#1d1f20] font-medium'
                        : 'text-[#313335] hover:bg-[#f6f7f8]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{c.emoji}</span>
                      <span className="truncate">{c.label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f6f7f8] text-[#4c4f52] font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Reference Card */}
          <div className="hidden lg:block card p-4 text-xs text-[#808487] space-y-2.5">
            <div className="font-semibold text-[#313335] text-xs">Legenda de Status</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#4c4f52]">Porta ouvindo / Container ativo</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-[#4c4f52]">Instalado porém parado</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0051c3]" />
              <span className="text-[#4c4f52]">Proxy Nginx / Subdomínio ativo</span>
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
                    <div className="w-10 h-10 rounded-md bg-[#f0f1f2]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#f0f1f2] rounded w-1/2" />
                      <div className="h-3 bg-[#f6f7f8] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-[#f6f7f8] rounded-xl" />
                  <div className="h-8 bg-[#f6f7f8] rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="card p-12 text-center text-[#808487] space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-[#c5c6c8]" />
              <div className="text-base font-bold text-[#313335]">Nenhum aplicativo encontrado</div>
              <p className="text-xs text-[#808487] max-w-sm mx-auto">
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
                    className={`bg-white border border-[#e5e6e8] rounded-lg p-4 flex flex-col justify-between space-y-4 ${
                      app.running === true ? 'border-l-2 border-l-emerald-500' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-[#f6f7f8] border border-[#e5e6e8] flex items-center justify-center text-xl flex-shrink-0">
                            {app.icon}
                          </div>
                          <div>
                            <div className="font-bold text-[#1d1f20] text-base tracking-tight flex items-center gap-2">
                              <span>{app.name}</span>
                              {app.running === true && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Em execução" />
                              )}
                            </div>
                            <div className="text-xs text-[#808487] mt-0.5 flex items-center gap-1.5">
                              <span>{categories.find((c) => c.key === app.category)?.emoji}</span>
                              <span>{categories.find((c) => c.key === app.category)?.label || app.category}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          className="p-1.5 rounded-xl text-[#808487] hover:text-[#1d1f20] hover:bg-[#f6f7f8] transition-colors"
                          title={isExpanded ? 'Recolher detalhes' : 'Ver detalhes técnicos'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#808487] line-clamp-2 leading-relaxed min-h-[2rem]">
                        {app.description}
                      </p>

                      {/* Pill Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {app.running === true ? (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Rodando
                          </span>
                        ) : app.running === false ? (
                          <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Parado
                          </span>
                        ) : (
                          <span className="badge bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Instalado
                          </span>
                        )}

                        {typeof app.defaultPort === 'number' && (
                          <span className="badge bg-[#f0f1f2] text-[#313335] border border-[#e5e6e8] font-mono text-[11px]">
                            Porta {app.defaultPort}
                          </span>
                        )}

                        {(app.isDocker || app.composePath) && (
                          <span className="badge bg-blue-50 text-[#0051c3] border border-blue-100 text-[10px]">
                            Docker
                          </span>
                        )}
                      </div>
                    </div>

                    {/* App Actions & Links Strip */}
                    <div className="space-y-2 pt-3 border-t border-[#e5e6e8]">
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
                            <span>{isPublicHub && app.publicUrl ? 'Acessar Web' : `Acessar Web (Porta ${app.defaultPort})`}</span>
                          </a>
                          <button
                            onClick={(e) => copyToClipboard(appUrl, app.id, e)}
                            className="p-2 rounded-xl bg-[#f6f7f8] hover:bg-[#f6f7f8] text-[#4c4f52] border border-[#e5e6e8] transition-colors"
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                            title="Copiar URI de Conexão do Banco"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span className="truncate">
                              {copiedUrl === `conn-${app.id}` ? 'Copiado para o Clip!' : 'Copiar URI do Banco'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(app.connectionString!, `conn-${app.id}`, e)}
                            className="p-2 rounded-xl bg-[#f6f7f8] hover:bg-[#f6f7f8] text-[#4c4f52] border border-[#e5e6e8] transition-colors"
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-blue-50 hover:bg-blue-100 text-[#0051c3] border border-blue-200"
                            title={`Acessar pelo Nginx Proxy (${getNginxPathUrl(app) || getNginxSubdomainUrl(app)})`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span className="truncate">
                              {isPublicHub && app.publicUrl
                                ? `Público: ${app.publicUrl}`
                                : app.nginxPath
                                  ? `Proxy: http://localhost${app.nginxPath}`
                                  : `http://${app.nginxSubdomain}`}
                            </span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(getNginxPathUrl(app) || getNginxSubdomainUrl(app) || '', `nginx-${app.id}`, e)}
                            className="p-2 rounded-xl bg-[#f6f7f8] hover:bg-[#f6f7f8] text-[#4c4f52] border border-[#e5e6e8] transition-colors"
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
                          className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${
                            app.running === true
                              ? 'bg-[#f6f7f8] text-[#808487] border border-[#e5e6e8] cursor-not-allowed'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                          className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium ${
                            app.running === false
                              ? 'bg-[#f6f7f8] text-[#808487] border border-[#e5e6e8] cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
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
                          className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-white hover:bg-[#f6f7f8] text-[#313335] border border-[#c5c6c8] disabled:opacity-50"
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
                            className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-blue-50 hover:bg-blue-100 text-[#0051c3] border border-blue-200 disabled:opacity-50"
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
                            className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-white hover:bg-rose-50 text-[#4c4f52] hover:text-rose-700 border border-[#c5c6c8] hover:border-rose-200 disabled:opacity-50"
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
                      <div className="pt-3 mt-2 border-t border-[#e5e6e8] space-y-2.5 text-xs animate-fade-in">
                        {app.version && (
                          <div className="flex items-start gap-2">
                            <span className="text-[#808487] font-medium min-w-[70px]">Versão:</span>
                            <span className="text-[#313335] font-mono text-[11px] break-all">
                              {app.version}
                            </span>
                          </div>
                        )}

                        {app.composePath && (
                          <div className="flex items-start gap-2">
                            <span className="text-[#808487] font-medium min-w-[70px]">Pasta:</span>
                            <span className="text-[#313335] font-mono text-[11px] bg-[#f6f7f8] px-1.5 py-0.5 rounded border border-[#e5e6e8]">
                              {app.composePath}
                            </span>
                          </div>
                        )}

                        {app.postInstallHint && (
                          <div className="p-3 rounded-xl bg-[#f6f7f8] border border-[#e5e6e8] text-[#4c4f52] space-y-1">
                            <div className="font-semibold text-[#313335] flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Instruções de Acesso:
                            </div>
                            <div className="text-[11px] text-[#808487] leading-relaxed">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-fade-in">
          <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden bg-white border border-[#e5e6e8] rounded-t-2xl sm:rounded-lg shadow-xl pb-[env(safe-area-inset-bottom)]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#e5e6e8] flex items-center justify-between bg-[#f6f7f8]">
              <div className="flex items-center gap-2.5 font-mono text-sm text-[#1d1f20] font-semibold">
                <Terminal className="w-4 h-4 text-[#0051c3]" />
                <span className="truncate">{composeModal.title}</span>
              </div>
              <button
                onClick={() => setComposeModal({ open: false, title: '', output: '' })}
                className="text-[#808487] hover:text-[#1d1f20] p-1 rounded-lg hover:bg-[#f6f7f8] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Terminal Body */}
            <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-[#4c4f52] bg-white leading-relaxed whitespace-pre-wrap select-text">
              {composeModal.output}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#e5e6e8] flex items-center justify-between bg-[#f6f7f8]">
              <div className="flex items-center gap-2 text-xs">
                {composeModal.running ? (
                  <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Em execução...
                  </span>
                ) : composeModal.success ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[#808487]">
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
