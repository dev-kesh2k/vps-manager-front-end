import { useEffect, useState } from 'react';
import { PlayCircle, Loader2, RefreshCw, Play, Square, RotateCw, AlertCircle, Search, Activity, CheckCircle2, X } from 'lucide-react';
import api from '../lib/api';

interface Service {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [notify, setNotify] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/services');
      setServices(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (service: string, action: 'start' | 'stop' | 'restart' | 'status') => {
    setActing(`${action}-${service}`);
    setNotify(null);
    try {
      const { data } = await api.post('/services/action', { action, service });
      setNotify({
        type: data.success ? 'ok' : 'err',
        text: `${action.toUpperCase()} ${service}: ${data.success ? 'Operação concluída com sucesso' : data.output || data.stderr || 'Falhou'}`,
      });
    } catch (err: any) {
      setNotify({ type: 'err', text: 'Erro: ' + (err.response?.data?.error || err.message) });
    } finally {
      setActing(null);
      setTimeout(() => load(), 1200);
    }
  };

  const filtered = services.filter((s) =>
    (s.name + s.description).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Serviços Systemd</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              {services.length} Daemons
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle de processos em segundo plano, servidores e daemons no WSL
          </p>
        </div>

        <button className="btn-secondary text-xs px-3.5 py-2.5" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Atualizar Serviços</span>
        </button>
      </div>

      {/* Notifications */}
      {notify && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs border backdrop-blur-xl animate-fade-in ${
            notify.type === 'ok'
              ? 'bg-[#0a1f18]/90 border-emerald-500/40 text-emerald-200'
              : 'bg-[#220d13]/90 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notify.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-medium">{notify.text}</span>
          </div>
          <button onClick={() => setNotify(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Services Table Card */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10 text-xs"
              placeholder="Filtrar serviço (ex: nginx, cron, docker)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Mostrando {filtered.length} de {services.length}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-400" />
            <div className="text-xs">Consultando systemctl no host...</div>
          </div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
            <div className="text-sm font-semibold text-slate-300">Nenhum serviço retornado</div>
            <p className="text-xs text-slate-500">O systemd pode não estar em execução no container padrão.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[0.08]">
            <table className="w-full text-xs">
              <thead className="bg-[#0e111a] text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Nome do Daemon</th>
                  <th className="text-left px-4 py-3 font-semibold">Status Ativo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Descrição</th>
                  <th className="text-right px-4 py-3 font-semibold">Ações de Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] bg-[#080a0f]">
                {filtered.map((s) => {
                  const isRunning = s.active === 'active';
                  return (
                    <tr key={s.name} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-200">{s.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            isRunning
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          {s.active}/{s.sub}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell max-w-xs truncate">
                        {s.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 disabled:opacity-30 transition-colors"
                            onClick={() => runAction(s.name, 'start')}
                            disabled={!!acting || isRunning}
                            title="Iniciar serviço"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 disabled:opacity-30 transition-colors"
                            onClick={() => runAction(s.name, 'stop')}
                            disabled={!!acting || !isRunning}
                            title="Parar serviço"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] disabled:opacity-30 transition-colors"
                            onClick={() => runAction(s.name, 'restart')}
                            disabled={!!acting}
                            title="Reiniciar serviço"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Action Card */}
      <div className="card p-6 space-y-3">
        <h3 className="font-bold text-white text-sm">Ação Manual em Serviço Específico</h3>
        <p className="text-xs text-slate-400">Envie comandos systemctl diretamente para qualquer daemon</p>
        <ManualAction onRun={(name, act) => runAction(name, act)} busy={!!acting} />
      </div>
    </div>
  );
}

function ManualAction({ onRun, busy }: { onRun: (n: string, a: any) => void; busy: boolean }) {
  const [name, setName] = useState('');
  const [act, setAct] = useState<'status' | 'start' | 'stop' | 'restart'>('status');

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 pt-1">
      <input
        className="input font-mono text-xs"
        placeholder="Nome do serviço (ex: nginx, docker, apache2, postgresql)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="input text-xs font-semibold"
        value={act}
        onChange={(e) => setAct(e.target.value as any)}
      >
        <option value="status">status</option>
        <option value="start">start</option>
        <option value="stop">stop</option>
        <option value="restart">restart</option>
      </select>
      <button
        className="btn-primary text-xs px-5"
        disabled={!name.trim() || busy}
        onClick={() => onRun(name.trim(), act)}
      >
        Executar Ação
      </button>
    </div>
  );
}
