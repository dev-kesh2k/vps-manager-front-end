import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import {
  RefreshCw,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Search,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  ShieldCheck,
  X,
} from 'lucide-react';

type AppCategory =
  | 'web'
  | 'containers'
  | 'database'
  | 'filemanager'
  | 'security'
  | 'monitoring'
  | 'utilities';

interface Category {
  key: AppCategory | 'all';
  label: string;
  emoji?: string;
}

const ALL_CATEGORIES: { key: AppCategory; label: string; emoji: string }[] = [
  { key: 'web', label: 'Servidores Web e Proxy Reverso', emoji: '🌐' },
  { key: 'containers', label: 'Containers e Orquestração', emoji: '🐳' },
  { key: 'database', label: 'Bancos de Dados e Cache', emoji: '🗄️' },
  { key: 'filemanager', label: 'Arquivos e Painéis', emoji: '📂' },
  { key: 'security', label: 'Segurança e Firewall', emoji: '🔒' },
  { key: 'monitoring', label: 'Monitoramento e Saúde', emoji: '📊' },
  { key: 'utilities', label: 'Utilitários e CLI', emoji: '⚙️' },
];

interface CatalogApp {
  id: string;
  name: string;
  icon: string;
  category: AppCategory;
  description: string;
  defaultPort?: number;
  docsUrl?: string;
  postInstallHint?: string;
  requiresSudo?: boolean;
  installCommand?: string;
  detectCommand?: string;
}

interface InstalledState {
  [id: string]: { installed: boolean; version?: string; running?: boolean | null };
}

type JobStatus = 'running' | 'success' | 'error';

interface InstallJob {
  jobId: string;
  appId: string;
  status: JobStatus;
  startedAt: number;
  finishedAt?: number;
  output: string;
  error?: string;
}

const CATEGORIES: Category[] = [
  { key: 'all', label: 'Todas as categorias' },
  ...ALL_CATEGORIES,
];

export default function AppsInstallPage() {
  const canInstall = useAuthStore((s) => s.canAccess('appsInstall', 'full'));
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogApp[]>([]);
  const [categories, setCategories] = useState<typeof ALL_CATEGORIES>(ALL_CATEGORIES);
  const [state, setState] = useState<InstalledState>({});
  const [activeCategory, setActiveCategory] = useState<AppCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [jobs, setJobs] = useState<InstallJob[]>([]);
  const jobsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobsRef = useRef<InstallJob[]>([]);

  const jobsChanged = (prev: InstallJob[], next: InstallJob[]) => {
    if (prev.length !== next.length) return true;
    for (let i = 0; i < next.length; i++) {
      const a = prev[i];
      const b = next[i];
      if (
        a.jobId !== b.jobId ||
        a.status !== b.status ||
        a.output.length !== b.output.length ||
        a.error !== b.error
      ) {
        return true;
      }
    }
    return false;
  };

  const getJobsPollDelay = () => {
    if (document.hidden) {
      return jobsRef.current.some((job) => job.status === 'running') ? 30000 : null;
    }
    return jobsRef.current.some((job) => job.status === 'running') ? 2500 : 15000;
  };

  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const loadEverything = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: cat }, { data: instRes }] = await Promise.all([
        api.get('/apps/catalog'),
        api.get('/apps/installed'),
      ]);
      setCatalog(cat.apps || []);
      setCategories(cat.categories || ALL_CATEGORIES);
      const map: InstalledState = {};
      for (const a of instRes.apps || []) {
        map[a.id] = { installed: !!a.installed, version: a.version, running: a.running };
      }
      setState(map);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Não foi possível carregar o catálogo de aplicativos.');
    } finally {
      setLoading(false);
    }
  };

  const refreshInstalled = async () => {
    try {
      const { data: instRes } = await api.get('/apps/installed');
      const map: InstalledState = {};
      for (const a of instRes.apps || []) {
        map[a.id] = { installed: !!a.installed, version: a.version, running: a.running };
      }
      setState(map);
    } catch {}
  };

  const loadJobs = async () => {
    try {
      const { data } = await api.get('/apps/jobs');
      const next: InstallJob[] = data.jobs || [];
      const finished = next.some(
        (j) =>
          (j.status === 'success' || j.status === 'error') &&
          jobsRef.current.some((p) => p.jobId === j.jobId && p.status === 'running')
      );
      const prev = jobsRef.current;
      jobsRef.current = next;
      if (jobsChanged(prev, next)) {
        setJobs(next);
      }
      if (finished) await refreshInstalled();
    } catch {}
  };

  useEffect(() => {
    loadEverything();
    loadJobs();

    let cancelled = false;

    const scheduleJobsPoll = () => {
      if (cancelled) return;
      const delay = getJobsPollDelay();
      if (delay === null) return;
      jobsTimer.current = setTimeout(async () => {
        if (!cancelled) await loadJobs();
        scheduleJobsPoll();
      }, delay);
    };

    const onVisibilityChange = () => {
      if (jobsTimer.current) clearTimeout(jobsTimer.current);
      scheduleJobsPoll();
    };

    scheduleJobsPoll();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (jobsTimer.current) clearTimeout(jobsTimer.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const startInstall = async (appId: string) => {
    if (!canInstall) {
      setError('Seu perfil não tem permissão para instalar novos aplicativos.');
      return;
    }
    setError(null);
    setInfo(null);
    setExpandedApp(appId);
    try {
      const { data } = await api.post(`/apps/install/${appId}`);
      if (data.jobId) {
        setActiveJobId(data.jobId);
        setInfo(`Instalação do app iniciada (Job #${data.jobId.slice(0, 8)}). Acompanhe o log abaixo.`);
      }
      await loadJobs();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Falha ao iniciar o processo de instalação.');
    }
  };

  const availableApps = useMemo(() => {
    return catalog.filter((app) => {
      if (!state[app.id]?.installed) return true;
      return jobs.some((j) => j.appId === app.id && j.status === 'running');
    });
  }, [catalog, state, jobs]);

  const filteredApps = useMemo(() => {
    return availableApps.filter((app) => {
      if (activeCategory !== 'all' && app.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = app.name.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q);
        const matchPort = app.defaultPort?.toString().includes(q);
        const matchId = app.id.toLowerCase().includes(q);
        return matchName || matchDesc || matchPort || matchId;
      }
      return true;
    });
  }, [availableApps, activeCategory, search]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: availableApps.length };
    for (const app of availableApps) {
      map[app.category] = (map[app.category] || 0) + 1;
    }
    return map;
  }, [availableApps]);

  const jobsForActiveApp = useMemo(() => {
    if (!expandedApp) return [];
    return jobs.filter((j) => j.appId === expandedApp).sort((a, b) => b.startedAt - a.startedAt);
  }, [jobs, expandedApp]);

  const fmtTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const StatusChip = ({ s }: { s: JobStatus }) => {
    if (s === 'running')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
          <Loader2 className="w-3 h-3 animate-spin" />
          Instalando
        </span>
      );
    if (s === 'success')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          Concluído
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
        <XCircle className="w-3 h-3" />
        Falhou
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Catálogo de Aplicativos</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              {availableApps.length} disponíveis
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
            Instale servidores web, bancos de dados e ferramentas com 1-clique via Docker Compose e APT
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="btn-secondary text-xs px-3.5 py-2.5"
            onClick={loadEverything}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Atualizar Catálogo</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-[#1d1f20] text-xs flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
          <button onClick={() => setError(null)} className="text-[#808487] hover:text-[#1d1f20]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {info && (
        <div className="p-4 rounded-lg bg-white border border-emerald-200 text-[#1d1f20] text-xs flex items-start gap-3 animate-fade-in">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium leading-relaxed">{info}</div>
          <button onClick={() => setInfo(null)} className="text-[#808487] hover:text-[#1d1f20]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Input Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#808487] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          className="input pl-10 text-xs"
          placeholder="Buscar software (PostgreSQL, Apache, Nginx, Portainer, etc)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[#808487] hover:text-[#1d1f20] absolute right-3 top-1/2 -translate-y-1/2 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Layout Sidebar + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 lg:gap-6">
        {/* Category Filter Sidebar */}
        <aside className="space-y-4 min-w-0">
          <div className="card p-3 lg:p-4 space-y-2">
            <div className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-[#808487] px-2 pb-1 border-b border-[#e5e6e8]">
              Categorias
            </div>
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:pt-1">
              {CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.key] || 0;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key as any)}
                    className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 lg:py-1.5 rounded-md text-[13px] ${
                      isActive
                        ? 'bg-[#f0f1f2] text-[#1d1f20] font-medium'
                        : 'text-[#313335] hover:bg-[#f6f7f8]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{cat.emoji || '📦'}</span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f6f7f8] text-[#4c4f52] font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden lg:block card p-4 text-xs text-[#808487] space-y-2.5">
            <div className="font-semibold text-[#313335] text-xs">Informação</div>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[#4c4f52] leading-relaxed">
                Comandos executados com segurança através da credencial sudo do WSL.
              </span>
            </div>
          </div>
        </aside>

        {/* Catalog Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-5 space-y-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#f0f1f2]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#f0f1f2] rounded w-1/2" />
                      <div className="h-3 bg-[#f6f7f8] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-[#f6f7f8] rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="card p-12 text-center text-[#808487] space-y-3">
              <AlertCircle className="w-12 h-12 mx-auto text-[#c5c6c8]" />
              <div className="text-base font-bold text-[#313335]">Nenhum software encontrado</div>
              <p className="text-xs text-[#808487] max-w-sm mx-auto">
                Apps já instalados ficam em Apps instalados. Ajuste a pesquisa ou a categoria para ver outros.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApps.map((app) => {
                const s = state[app.id];
                const installed = !!s?.installed;
                const expanded = expandedApp === app.id;
                const appJobs = expanded ? jobsForActiveApp : [];
                const running = !!appJobs.find((j) => j.status === 'running');

                return (
                  <div
                    key={app.id}
                    className={`card p-5 flex flex-col justify-between space-y-4 transition-all hover:border-[#c5c6c8] ${
                      expanded ? 'ring-1 ring-[#0051c3]/20' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-[#f6f7f8] border border-[#e5e6e8] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                            {app.icon || '📦'}
                          </div>
                          <div>
                            <div className="font-bold text-[#1d1f20] text-base tracking-tight flex items-center gap-2">
                              <span>{app.name}</span>
                            </div>
                            <div className="text-xs text-[#808487] mt-0.5 flex items-center gap-1.5">
                              <span>{(categories.find((c) => c.key === app.category) || ALL_CATEGORIES.find((c) => c.key === app.category))?.emoji}</span>
                              <span>{(categories.find((c) => c.key === app.category) || ALL_CATEGORIES.find((c) => c.key === app.category))?.label || app.category}</span>
                            </div>
                          </div>
                        </div>

                        {installed ? (
                          <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Instalado
                          </span>
                        ) : (
                          <span className="badge bg-[#f6f7f8] text-[#808487] border border-[#e5e6e8]">
                            Disponível
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#808487] line-clamp-2 leading-relaxed min-h-[2rem]">
                        {app.description}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {typeof app.defaultPort === 'number' && (
                          <span className="badge bg-[#f0f1f2] text-[#0051c3] border border-[#e5e6e8] font-mono text-[11px]">
                            Porta {app.defaultPort}
                          </span>
                        )}
                        {s?.running && (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Rodando
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-3 border-t border-[#e5e6e8]">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!canInstall || !!running}
                          onClick={() => startInstall(app.id)}
                          className={`flex-1 btn-primary text-xs py-2 px-3 justify-center ${
                            !canInstall ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                        >
                          {running ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Instalando no Host...</span>
                            </>
                          ) : installed ? (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>Reinstalar / Atualizar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Instalar Agora</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setExpandedApp(expanded ? null : app.id)}
                          className="btn-secondary text-xs p-2"
                          title="Ver detalhes técnicos e log de instalação"
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Expanded Section with Details & Logs */}
                      {expanded && (
                        <div className="mt-2 pt-3 border-t border-[#e5e6e8] space-y-3 text-xs animate-fade-in">
                          {app.postInstallHint && (
                            <div className="p-3 rounded-xl bg-[#f6f7f8] border border-[#e5e6e8] text-[#4c4f52] space-y-1">
                              <div className="font-semibold text-[#313335] text-[11px]">
                                💡 Informações de Acesso:
                              </div>
                              <div className="text-[11px] text-[#808487] leading-relaxed">
                                {app.postInstallHint}
                              </div>
                            </div>
                          )}

                          {/* Install Logs History */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#808487]">
                                Terminal de Instalação
                              </span>
                              <button
                                onClick={loadJobs}
                                className="text-[11px] text-[#0051c3] hover:text-[#003d99] font-medium"
                              >
                                Atualizar log
                              </button>
                            </div>

                            {appJobs.length === 0 ? (
                              <div className="text-[#808487] text-xs p-3 rounded-xl bg-[#f6f7f8] border border-dashed border-[#e5e6e8] text-center">
                                Nenhuma instalação registrada nesta sessão.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {appJobs.map((j) => {
                                  const isActive = activeJobId === j.jobId;
                                  return (
                                    <div
                                      key={j.jobId}
                                      className="rounded-xl border border-[#e5e6e8] overflow-hidden bg-white"
                                    >
                                      <div className="flex items-center justify-between px-3 py-2 bg-[#f6f7f8] border-b border-[#e5e6e8]">
                                        <div className="flex items-center gap-2">
                                          <StatusChip s={j.status} />
                                          <span className="text-[11px] font-mono text-[#808487]">
                                            {fmtTime(j.startedAt)}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => setActiveJobId(isActive ? null : j.jobId)}
                                          className="text-[11px] text-[#808487] hover:text-[#1d1f20]"
                                        >
                                          {isActive ? 'Ocultar' : 'Ver Saída'}
                                        </button>
                                      </div>

                                      {isActive && (
                                        <pre className="p-3 text-[11px] leading-relaxed overflow-auto max-h-[220px] font-mono text-[#4c4f52] bg-white whitespace-pre-wrap break-words select-text">
                                          {j.output || j.error || '(aguardando saída...)'}
                                        </pre>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
