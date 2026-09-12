import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  FolderOpen,
  Zap,
  PackagePlus,
  Search,
  Terminal,
  Download,
} from 'lucide-react';
import api from '../lib/api';

type Mode = 'free' | 'install';

type AppCategory =
  | 'web'
  | 'containers'
  | 'database'
  | 'filemanager'
  | 'security'
  | 'monitoring'
  | 'utilities';

interface CatalogApp {
  id: string;
  name: string;
  icon: string;
  category: AppCategory;
  description: string;
  installCommand?: string;
  requiresSudo?: boolean;
  postInstallHint?: string;
  docsUrl?: string;
}

interface CategoryMeta {
  key: AppCategory;
  label: string;
}

const PRESETS = [
  { label: 'Informações do Sistema', cmd: 'uname -a && whoami && pwd' },
  { label: 'Uso de Memória', cmd: 'free -h' },
  { label: 'Uso de Disco', cmd: 'df -h' },
  { label: 'Processos Top', cmd: 'ps aux --sort=-%mem | head -15' },
  { label: 'Portas em Escuta', cmd: 'ss -tulpn 2>/dev/null || netstat -tulpn' },
  { label: 'Containers Docker', cmd: 'docker ps -a' },
  { label: 'Atualizar apt', cmd: 'sudo apt update -y' },
  { label: 'Logs de boot', cmd: 'journalctl -b --no-pager -n 40' },
];

const CATEGORY_FALLBACK: CategoryMeta[] = [
  { key: 'web', label: 'Web / Proxy' },
  { key: 'containers', label: 'Containers' },
  { key: 'database', label: 'Bancos de dados' },
  { key: 'filemanager', label: 'Arquivos' },
  { key: 'security', label: 'Segurança' },
  { key: 'monitoring', label: 'Monitoramento' },
  { key: 'utilities', label: 'Utilitários' },
];

export default function CommandPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get('mode') === 'install' ? 'install' : 'free'
  );

  useEffect(() => {
    if (searchParams.get('mode') === 'install') setMode('install');
  }, [searchParams]);
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [catalog, setCatalog] = useState<CatalogApp[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>(CATEGORY_FALLBACK);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [appCategory, setAppCategory] = useState<AppCategory | 'all'>('all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'install') return;
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const { data } = await api.get('/apps/catalog');
        if (cancelled) return;
        setCatalog(data.apps || []);
        if (Array.isArray(data.categories) && data.categories.length) {
          setCategories(
            data.categories.map((c: CategoryMeta) => ({
              key: c.key,
              label: String(c.label || c.key).replace(/^[^\wÀ-ÿ]+\s*/, ''),
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          setCatalogError(e?.response?.data?.error || 'Não foi possível carregar o catálogo.');
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const selectedApp = useMemo(
    () => catalog.find((a) => a.id === selectedAppId) || null,
    [catalog, selectedAppId]
  );

  const filteredApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    return catalog.filter((a) => {
      if (appCategory !== 'all' && a.category !== appCategory) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    });
  }, [catalog, appSearch, appCategory]);

  const selectApp = (app: CatalogApp) => {
    setSelectedAppId(app.id);
    if (app.installCommand) {
      setCommand(app.installCommand);
      setTimeoutSeconds((t) => Math.max(t, 600));
    }
    setResult(null);
  };

  const pollInstallJob = async (jobId: string, startedAt: number) => {
    const maxWaitMs = Math.max(timeoutSeconds, 600) * 1000;
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await api.get<{ job: { status: string; output?: string; error?: string; finishedAt?: number } }>(
        `/apps/jobs/${jobId}`
      );
      const job = data.job;
      if (!job) continue;
      if (job.status === 'running') continue;
      const elapsed = (job.finishedAt || Date.now()) - startedAt;
      return {
        success: job.status === 'success',
        stdout: job.output || '',
        stderr: job.error || '',
        exitCode: job.status === 'success' ? 0 : 1,
        executionTimeMs: Math.max(0, elapsed),
        command: selectedApp
          ? `POST /apps/install/${selectedApp.id}  # ${selectedApp.name} (Apache + Cloudflare)`
          : `job ${jobId}`,
      };
    }
    return {
      success: false,
      stdout: '',
      stderr: 'Timeout aguardando o job de instalação. Veja Apps instalados ou tente sincronizar as rotas.',
      exitCode: -1,
      executionTimeMs: maxWaitMs,
      command: selectedApp ? `POST /apps/install/${selectedApp.id}` : `job ${jobId}`,
    };
  };

  const doInstallCatalogApp = async () => {
    if (!selectedAppId) {
      setResult({
        success: false,
        stdout: '',
        stderr: 'Selecione um app no catálogo antes de instalar.',
        exitCode: -1,
        executionTimeMs: 0,
        command: '',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post<{ jobId: string; status: string; startedAt: number }>(
        `/apps/install/${selectedAppId}`
      );
      const result = await pollInstallJob(data.jobId, data.startedAt || Date.now());
      setResult(result);
    } catch (err: any) {
      setResult({
        success: false,
        stdout: '',
        stderr: err.response?.data?.error || err.message || 'Erro ao iniciar instalação',
        exitCode: -1,
        executionTimeMs: 0,
        command: `POST /apps/install/${selectedAppId}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const doRun = async (cmd?: string) => {
    const toRun = (cmd ?? command).trim();
    if (!toRun) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/command', {
        command: toRun,
        workingDirectory: cwd || undefined,
        timeout: timeoutSeconds * 1000,
      });
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        stdout: '',
        stderr: err.response?.data?.error || err.message || 'Erro desconhecido',
        exitCode: -1,
        executionTimeMs: 0,
        command: toRun,
      });
    } finally {
      setLoading(false);
    }
  };

  const runWithEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'install' && selectedAppId) {
      await doInstallCatalogApp();
      return;
    }
    await doRun(command);
  };

  const runPreset = async (cmd: string) => {
    setMode('free');
    setCommand(cmd);
    await doRun(cmd);
  };

  const copyAll = () => {
    if (!result) return;
    const text = `$ ${result.command}\n${result.stdout}${result.stderr ? '\nSTDERR:\n' + result.stderr : ''}\nExit code: ${result.exitCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Executar comando</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              Shell + install
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
            Rode comandos no host ou instale apps do catálogo (aparecem em Aplicações com rota Cloudflare)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('free')}
          className={`text-xs px-3.5 py-2 rounded-md border transition-colors inline-flex items-center gap-2 ${
            mode === 'free'
              ? 'bg-[#0051c3] text-white border-[#0051c3]'
              : 'bg-white text-[#4c4f52] border-[#e5e6e8] hover:border-[#c5c6c8]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Comando livre
        </button>
        <button
          type="button"
          onClick={() => setMode('install')}
          className={`text-xs px-3.5 py-2 rounded-md border transition-colors inline-flex items-center gap-2 ${
            mode === 'install'
              ? 'bg-[#0051c3] text-white border-[#0051c3]'
              : 'bg-white text-[#4c4f52] border-[#e5e6e8] hover:border-[#c5c6c8]'
          }`}
        >
          <PackagePlus className="w-3.5 h-3.5" />
          Instalar app Linux
        </button>
      </div>

      {mode === 'free' && (
        <div className="card p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#808487]">
            <Zap className="w-3.5 h-3.5 text-[#0051c3]" />
            <span>Atalhos</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={() => runPreset(p.cmd)}
                className="text-xs px-3 py-1.5 rounded-md bg-white hover:bg-[#f6f7f8] border border-[#e5e6e8] hover:border-[#c5c6c8] text-[#4c4f52] hover:text-[#1d1f20] transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'install' && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="label">Buscar no catálogo</label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#808487] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  className="input pl-10 text-xs"
                  placeholder="nginx, docker, postgresql, redis…"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-52 space-y-1.5">
              <label className="label">Categoria</label>
              <select
                className="input text-xs"
                value={appCategory}
                onChange={(e) => setAppCategory(e.target.value as AppCategory | 'all')}
              >
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {catalogLoading ? (
            <div className="flex items-center gap-2 text-xs text-[#808487] py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando catálogo…
            </div>
          ) : catalogError ? (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {catalogError}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-[#e5e6e8] rounded-md divide-y divide-[#e5e6e8]">
              {filteredApps.length === 0 ? (
                <div className="px-4 py-6 text-xs text-[#808487] text-center">Nenhum app encontrado.</div>
              ) : (
                filteredApps.map((app) => {
                  const active = selectedAppId === app.id;
                  return (
                    <button
                      type="button"
                      key={app.id}
                      onClick={() => selectApp(app)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        active ? 'bg-blue-50' : 'bg-white hover:bg-[#f6f7f8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#1d1f20] flex items-center gap-2">
                            <span className="truncate">{app.name}</span>
                            {app.requiresSudo && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                sudo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#808487] mt-0.5 line-clamp-2">{app.description}</p>
                        </div>
                        {active && <CheckCircle2 className="w-4 h-4 text-[#0051c3] shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {selectedApp && (
            <div className="rounded-md border border-[#e5e6e8] bg-[#f6f7f8] px-4 py-3 space-y-1.5">
              <div className="text-xs font-semibold text-[#1d1f20] flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-[#0051c3]" />
                Comando de instalação: {selectedApp.name}
              </div>
              <p className="text-[11px] text-[#4c4f52]">
                O comando abaixo será executado no host. Apps com sudo podem pedir privilégios elevados.
              </p>
              {selectedApp.postInstallHint && (
                <p className="text-[11px] text-[#808487]">{selectedApp.postInstallHint}</p>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={runWithEvent} className="card p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="label">
            {mode === 'install' ? 'Comando de instalação' : 'Instrução shell'}
          </label>
          <textarea
            className="input font-mono text-xs min-h-[110px] resize-y leading-relaxed"
            placeholder={
              mode === 'install'
                ? 'Selecione um app no catálogo para preencher o comando de instalação'
                : 'ex: docker ps -a ; curl -I http://localhost'
            }
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            rows={mode === 'install' ? 6 : 3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Diretório de trabalho (CWD)</label>
            <div className="relative">
              <FolderOpen className="w-4 h-4 text-[#808487] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                className="input pl-10 font-mono text-xs"
                placeholder="/hub-apps ou deixe vazio"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Timeout (segundos)</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-[#808487] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min={5}
                max={1800}
                className="input pl-10 text-xs font-mono"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
              />
            </div>
            {mode === 'install' && (
              <p className="text-[11px] text-[#808487]">
                A instalação pelo catálogo configura proxy Apache e rota Cloudflare automaticamente.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="btn-primary text-xs px-6 py-2.5"
            disabled={
              loading ||
              (mode === 'install' ? !selectedAppId : !command.trim())
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'install' ? 'Instalando…' : 'Executando…'}</span>
              </>
            ) : mode === 'install' ? (
              <>
                <PackagePlus className="w-4 h-4" />
                <span>Instalar e publicar rota</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Executar no host</span>
              </>
            )}
          </button>
        </div>
      </form>

      {result && (
        <div className="card overflow-hidden border-[#e5e6e8] bg-white animate-fade-in">
          <div className="px-5 py-3.5 border-b border-[#e5e6e8] flex items-center justify-between flex-wrap gap-3 bg-[#f6f7f8]">
            <div className="flex items-center gap-3">
              {result.success ? (
                <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Código 0 (sucesso)
                </span>
              ) : (
                <span className="badge bg-rose-50 text-rose-600 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5" />
                  Código {result.exitCode} (erro)
                </span>
              )}
              <span className="text-xs font-mono text-[#808487] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.executionTimeMs} ms
              </span>
            </div>

            <button onClick={copyAll} className="btn-secondary text-xs px-3 py-1.5" title="Copiar saída">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar saída'}</span>
            </button>
          </div>

          <div className="p-5 font-mono text-xs bg-white overflow-x-auto space-y-3 leading-relaxed select-text">
            <div className="text-[#0051c3] font-semibold break-all">$ {result.command}</div>

            {result.stdout && (
              <pre className="text-[#313335] whitespace-pre-wrap break-words">{result.stdout}</pre>
            )}

            {result.stderr && (
              <div className="pt-2 border-t border-rose-200 text-rose-700 whitespace-pre-wrap break-words">
                <div className="text-[10px] uppercase font-bold text-rose-600 tracking-wider mb-1">
                  STDERR
                </div>
                {result.stderr}
              </div>
            )}

            {!result.stdout && !result.stderr && (
              <div className="text-[#808487] italic">(sem saída)</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
