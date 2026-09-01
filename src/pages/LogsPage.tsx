import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Search, Download, Play, Pause, Eraser } from 'lucide-react';
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
  const cursorRef = useRef<string | null>(null);

  const applyIncoming = (incoming: string[]) => {
    const cursor = cursorRef.current;
    if (!cursor) {
      setLogs(incoming);
      return;
    }
    const idx = incoming.lastIndexOf(cursor);
    setLogs(idx >= 0 ? incoming.slice(idx + 1) : incoming);
  };

  const load = async (opts?: { resetCursor?: boolean }) => {
    if (opts?.resetCursor) cursorRef.current = null;
    setLoading(true);
    try {
      const { data } = await api.get('/logs', { params: { rows } });
      applyIncoming(data.logs || []);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    if (logs.length > 0) {
      cursorRef.current = logs[logs.length - 1];
    }
    setLogs([]);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Logs do Sistema</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              Journalctl
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
            Visualizador contínuo dos logs do kernel, serviços e eventos do sistema operacional
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`btn-secondary text-xs px-3 py-2 ${
              autoRefresh ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''
            }`}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Auto {autoRefresh ? 'Ativo (6s)' : 'Pausado'}</span>
          </button>

          <button className="btn-secondary text-xs px-3 py-2" onClick={() => load({ resetCursor: true })} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Atualizar</span>
          </button>

          <button className="btn-secondary text-xs px-3 py-2" onClick={download} disabled={filtered.length === 0}>
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>

          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={clearLogs}
            disabled={logs.length === 0}
            title="Limpa o visualizador. Não apaga o journal do sistema."
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Filter and Settings Bar */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#808487]" />
            <input
              className="input pl-10 text-xs"
              placeholder="Filtrar por mensagem, serviço ou nível (error, warn, fail)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[#4c4f52] flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
                className="rounded bg-white border-[#e5e6e8] text-[#0051c3] focus:ring-[#0051c3]/15"
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
        className="card overflow-hidden flex-1 min-h-[280px] sm:min-h-[480px] border-[#e5e6e8] bg-white flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e6e8] bg-white text-xs font-mono text-[#808487]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>systemd-journald stream</span>
          </div>
          <div>{filtered.length} linhas filtradas</div>
        </div>

        <div className="p-3 sm:p-4 h-[50vh] sm:h-[58vh] overflow-auto bg-white font-mono text-xs leading-relaxed select-text">
          {loading && logs.length === 0 && !cursorRef.current ? (
            <div className="py-20 text-center text-[#808487] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0051c3]" />
              <div className="text-xs">Lendo buffer de logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-[#808487] text-xs">
              {cursorRef.current
                ? 'Visualizador limpo. Novas linhas aparecem automaticamente.'
                : 'Nenhuma linha de log encontrada.'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-[#808487] text-xs">
              Nenhuma linha de log encontrada com o filtro especificado.
            </div>
          ) : (
            filtered.map((line, i) => {
              const isErr = /error|fail|panic|fatal|critical/i.test(line);
              const isWarn = /warn|warning/i.test(line);
              return (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-all py-0.5 px-2 -mx-1.5 rounded transition-colors hover:bg-[#f6f7f8] ${
                    isErr
                      ? 'text-rose-700 bg-rose-500/[0.06]'
                      : isWarn
                      ? 'text-amber-700 bg-amber-500/[0.04]'
                      : 'text-[#4c4f52]'
                  }`}
                >
                  <span className="text-[#c5c6c8] mr-3 select-none w-10 inline-block text-right font-mono text-[10px]">
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
