import { FormEvent, useState } from 'react';
import { TerminalSquare, Play, Loader2, Clock, CheckCircle2, XCircle, Copy, Check, Sparkles, FolderOpen, Zap } from 'lucide-react';
import api from '../lib/api';

const PRESETS = [
  { label: 'Informações do Sistema', cmd: 'uname -a && whoami && pwd' },
  { label: 'Uso de Memória', cmd: 'free -h' },
  { label: 'Uso de Disco', cmd: 'df -h' },
  { label: 'Processos Top CPU/RAM', cmd: 'ps aux --sort=-%mem | head -15' },
  { label: 'Portas em Escuta', cmd: 'ss -tulpn 2>/dev/null || netstat -tulpn' },
  { label: 'Status dos Containers', cmd: 'docker ps -a' },
  { label: 'Atualizar Pacotes (apt)', cmd: 'sudo apt update -y' },
  { label: 'Logs de Inicialização', cmd: 'journalctl -b --no-pager -n 40' },
];

export default function CommandPage() {
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const runWithEvent = async (e: FormEvent) => {
    e.preventDefault();
    await doRun(command);
  };

  const run = async (cmd?: string) => {
    if (cmd) setCommand(cmd);
    await doRun(cmd);
  };

  const doRun = async (cmd?: string) => {
    const toRun = cmd ?? command;
    if (!toRun.trim()) return;
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

  const copyAll = () => {
    const text = `$ ${result.command}\n${result.stdout}${result.stderr ? '\nSTDERR:\n' + result.stderr : ''}\nExit code: ${result.exitCode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Executar Comando</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              Direct Shell
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Execute rotinas shell, scripts de manutenção e diagnósticos diretamente no ambiente WSL
          </p>
        </div>
      </div>

      {/* Preset Command Strip */}
      <div className="card p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Zap className="w-3.5 h-3.5 text-brand-400" />
          <span>Comandos Rápidos Recomendados</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={() => run(p.cmd)}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-brand-500/40 text-slate-300 hover:text-white transition-all active:scale-[0.98]"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command Form */}
      <form onSubmit={runWithEvent} className="card p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="label">Instrução Shell / Script</label>
          <textarea
            className="input font-mono text-xs min-h-[90px] resize-y leading-relaxed"
            placeholder="ex: docker ps -a ; curl -I http://localhost"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Diretório de Trabalho (CWD)</label>
            <div className="relative">
              <FolderOpen className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                className="input pl-10 font-mono text-xs"
                placeholder="/hub-apps/apache ou /opt"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Limite de Tempo (Timeout em segundos)</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min={5}
                max={600}
                className="input pl-10 text-xs font-mono"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="btn-primary text-xs px-6 py-2.5"
            disabled={loading || !command.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando Comando...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Executar no Host</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Execution Results Terminal Box */}
      {result && (
        <div className="card overflow-hidden border-white/[0.1] shadow-2xl bg-[#0a0c12] animate-fade-in">
          {/* Status Header */}
          <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between flex-wrap gap-3 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              {result.success ? (
                <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Código 0 (Sucesso)
                </span>
              ) : (
                <span className="badge bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <XCircle className="w-3.5 h-3.5" />
                  Código {result.exitCode} (Erro)
                </span>
              )}
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.executionTimeMs} ms
              </span>
            </div>

            <button
              onClick={copyAll}
              className="btn-secondary text-xs px-3 py-1.5"
              title="Copiar saída completa"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Saída'}</span>
            </button>
          </div>

          {/* Terminal Output */}
          <div className="p-5 font-mono text-xs bg-[#06070a] overflow-x-auto space-y-3 leading-relaxed select-text">
            <div className="text-brand-400 font-semibold">$ {result.command}</div>

            {result.stdout && (
              <pre className="text-slate-200 whitespace-pre-wrap break-words">{result.stdout}</pre>
            )}

            {result.stderr && (
              <div className="pt-2 border-t border-rose-500/20 text-rose-300 whitespace-pre-wrap break-words">
                <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider mb-1">
                  STDERR:
                </div>
                {result.stderr}
              </div>
            )}

            {!result.stdout && !result.stderr && (
              <div className="text-slate-500 italic">(O comando não produziu nenhuma saída)</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
