import { useEffect, useRef, useState } from 'react';
import { ScrollText, Loader2, RefreshCw, Search, Download, Play, Pause, ArrowDown } from 'lucide-react';
import api from '../lib/api';

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState(200);
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [follow, setFollow] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/logs', { params: { rows } });
      setLogs(data.logs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [rows]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [autoRefresh, rows]);

  useEffect(() => {
    if (follow && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, follow]);

  const filtered = filter.trim()
    ? logs.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const download = () => {
    const blob = new Blob([filtered.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wsl-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Logs do Sistema</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              Journalctl
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualizador contínuo dos logs do kernel, serviços e eventos do sistema operacional
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`btn-secondary text-xs px-3 py-2 ${
              autoRefresh ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : ''
            }`}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Auto {autoRefresh ? 'Ativo (6s)' : 'Pausado'}</span>
          </button>

          <button className="btn-secondary text-xs px-3 py-2" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Atualizar</span>
          </button>

          <button className="btn-secondary text-xs px-3 py-2" onClick={download} disabled={filtered.length === 0}>
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Filter and Settings Bar */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10 text-xs"
              placeholder="Filtrar por mensagem, serviço ou nível (error, warn, fail)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
                className="rounded bg-[#0e111a] border-white/[0.1] text-brand-500 focus:ring-brand-500/30"
              />
              <span>Rolar automaticamente</span>
            </label>

            <select
              className="input text-xs w-36 font-semibold"
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
            >
              <option value={50}>50 linhas</option>
              <option value={100}>100 linhas</option>
              <option value={200}>200 linhas</option>
              <option value={500}>500 linhas</option>
              <option value={1000}>1000 linhas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Terminal Screen */}
      <div
        ref={containerRef}
        className="card overflow-hidden flex-1 min-h-[480px] border-white/[0.1] shadow-2xl bg-[#06070a] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-[#0e111a] text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>systemd-journald stream</span>
          </div>
          <div>{filtered.length} linhas filtradas</div>
        </div>

        <div className="p-4 h-[58vh] overflow-auto bg-[#06070a] font-mono text-xs leading-relaxed select-text">
          {loading && logs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-400" />
              <div className="text-xs">Lendo buffer de logs...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              Nenhuma linha de log encontrada com o filtro especificado.
            </div>
          ) : (
            filtered.map((line, i) => {
              const isErr = /error|fail|panic|fatal|critical/i.test(line);
              const isWarn = /warn|warning/i.test(line);
              return (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-all py-0.5 px-2 -mx-1.5 rounded transition-colors hover:bg-white/[0.04] ${
                    isErr
                      ? 'text-rose-300 bg-rose-500/[0.06]'
                      : isWarn
                      ? 'text-amber-300 bg-amber-500/[0.04]'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 mr-3 select-none w-10 inline-block text-right font-mono text-[10px]">
                    {i + 1}
                  </span>
                  {line}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
