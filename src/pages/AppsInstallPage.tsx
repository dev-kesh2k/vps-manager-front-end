import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import {
  PackagePlus,
  RefreshCw,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  Search,
  Server,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  ShieldCheck,
  Terminal,
  ExternalLink,
  X,
  Sparkles,
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
  const jobsInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const loadJobs = async () => {
    try {
      const { data } = await api.get('/apps/jobs');
      setJobs(data.jobs || []);
    } catch {}
  };

  useEffect(() => {
    loadEverything();
    loadJobs();
    jobsInterval.current = setInterval(loadJobs, 2500);
    return () => {
      if (jobsInterval.current) clearInterval(jobsInterval.current);
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

  const filteredApps = useMemo(() => {
    return catalog.filter((app) => {
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
  }, [catalog, activeCategory, search]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: catalog.length };
    for (const app of catalog) {
      map[app.category] = (map[app.category] || 0) + 1;
    }
    return map;
  }, [catalog]);

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <Loader2 className="w-3 h-3 animate-spin" />
          Instalando
        </span>
      );
    if (s === 'success')
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          Concluído
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300">
        <XCircle className="w-3 h-3" />
        Falhou
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Catálogo de Aplicativos</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              {catalog.length} Softwares
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
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
        <div className="p-4 rounded-2xl bg-[#220d13]/90 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 shadow-xl backdrop-blur-xl animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {info && (
        <div className="p-4 rounded-2xl bg-[#0a1f18]/90 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3 shadow-xl backdrop-blur-xl animate-fade-in">
          <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium leading-relaxed">{info}</div>
          <button onClick={() => setInfo(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Input Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            className="text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Layout Sidebar + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Category Filter Sidebar */}
        <aside className="space-y-4">
          <div className="card p-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 pb-1 border-b border-white/[0.06]">
              Categorias
            </div>
            <div className="space-y-1 pt-1">
              {CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.key] || 0;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key as any)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{cat.emoji || '📦'}</span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-slate-300 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-4 text-xs text-slate-400 space-y-2.5">
            <div className="font-semibold text-slate-200 text-xs">Informação</div>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300 leading-relaxed">
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
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/[0.08] rounded w-1/2" />
                      <div className="h-3 bg-white/[0.04] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-white/[0.04] rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="card p-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-base font-bold text-slate-200">Nenhum software encontrado</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tente ajustar os termos da pesquisa ou mude a categoria selecionada.
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
                    className={`card p-5 flex flex-col justify-between space-y-4 transition-all hover:border-white/[0.14] ${
                      expanded ? 'ring-1 ring-brand-500/30' : ''
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#141824] border border-white/[0.08] flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                            {app.icon || '📦'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                              <span>{app.name}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>{(categories.find((c) => c.key === app.category) || ALL_CATEGORIES.find((c) => c.key === app.category))?.emoji}</span>
                              <span>{(categories.find((c) => c.key === app.category) || ALL_CATEGORIES.find((c) => c.key === app.category))?.label || app.category}</span>
                            </div>
                          </div>
                        </div>

                        {installed ? (
                          <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Instalado
                          </span>
                        ) : (
                          <span className="badge bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                            Disponível
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
                        {app.description}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {typeof app.defaultPort === 'number' && (
                          <span className="badge bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[11px]">
                            Porta {app.defaultPort}
                          </span>
                        )}
                        {s?.running && (
                          <span className="badge bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Rodando
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-3 border-t border-white/[0.06]">
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
                        <div className="mt-2 pt-3 border-t border-white/[0.06] space-y-3 text-xs animate-fade-in">
                          {app.postInstallHint && (
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-300 space-y-1">
                              <div className="font-semibold text-slate-200 text-[11px]">
                                💡 Informações de Acesso:
                              </div>
                              <div className="text-[11px] text-slate-400 leading-relaxed">
                                {app.postInstallHint}
                              </div>
                            </div>
                          )}

                          {/* Install Logs History */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Terminal de Instalação
                              </span>
                              <button
                                onClick={loadJobs}
                                className="text-[11px] text-brand-400 hover:text-brand-300 font-medium"
                              >
                                Atualizar log
                              </button>
                            </div>

                            {appJobs.length === 0 ? (
                              <div className="text-slate-500 text-xs p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center">
                                Nenhuma instalação registrada nesta sessão.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {appJobs.map((j) => {
                                  const isActive = activeJobId === j.jobId;
                                  return (
                                    <div
                                      key={j.jobId}
                                      className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0a0c12]"
                                    >
                                      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                          <StatusChip s={j.status} />
                                          <span className="text-[11px] font-mono text-slate-400">
                                            {fmtTime(j.startedAt)}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => setActiveJobId(isActive ? null : j.jobId)}
                                          className="text-[11px] text-slate-400 hover:text-white"
                                        >
                                          {isActive ? 'Ocultar' : 'Ver Saída'}
                                        </button>
                                      </div>

                                      {isActive && (
                                        <pre className="p-3 text-[11px] leading-relaxed overflow-auto max-h-[220px] font-mono text-slate-300 bg-[#06070a] whitespace-pre-wrap break-words select-text">
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
