import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Play, Square, RotateCw, AlertCircle, Search, CheckCircle2, X } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Serviços Systemd</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              {services.length} Daemons
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
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
          className={`p-4 rounded-lg flex items-center justify-between gap-3 text-xs border animate-fade-in ${
            notify.type === 'ok'
              ? 'bg-white border-emerald-200 text-[#1d1f20]'
              : 'bg-rose-50 border-rose-200 text-[#1d1f20]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notify.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{notify.text}</span>
          </div>
          <button onClick={() => setNotify(null)} className="text-[#808487] hover:text-[#1d1f20]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Services Table Card */}
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#808487]" />
            <input
              className="input pl-10 text-xs"
              placeholder="Filtrar serviço (ex: nginx, cron, docker)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="text-xs text-[#808487] font-mono">
            Mostrando {filtered.length} de {services.length}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#808487] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0051c3]" />
            <div className="text-xs">Consultando systemctl no host...</div>
          </div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center text-[#808487] space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-[#c5c6c8]" />
            <div className="text-sm font-semibold text-[#4c4f52]">Nenhum serviço retornado</div>
            <p className="text-xs text-[#808487]">O systemd pode não estar em execução no container padrão.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#e5e6e8] -mx-1 sm:mx-0">
            <table className="w-full text-xs min-w-[520px]">
              <thead className="bg-white text-[11px] uppercase tracking-wider text-[#808487] border-b border-[#e5e6e8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Nome do Daemon</th>
                  <th className="text-left px-4 py-3 font-semibold">Status Ativo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Descrição</th>
                  <th className="text-right px-4 py-3 font-semibold">Ações de Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e6e8] bg-white">
                {filtered.map((s) => {
                  const isRunning = s.active === 'active';
                  return (
                    <tr key={s.name} className="hover:bg-[#f6f7f8] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#313335]">{s.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            isRunning
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-[#f6f7f8] text-[#808487] border border-[#e5e6e8]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-[#c5c6c8]'
                            }`}
                          />
                          {s.active}/{s.sub}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#808487] hidden md:table-cell max-w-xs truncate">
                        {s.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="p-2.5 sm:p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 disabled:opacity-30 transition-colors"
                            onClick={() => runAction(s.name, 'start')}
                            disabled={!!acting || isRunning}
                            title="Iniciar serviço"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            className="p-2.5 sm:p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 disabled:opacity-30 transition-colors"
                            onClick={() => runAction(s.name, 'stop')}
                            disabled={!!acting || !isRunning}
                            title="Parar serviço"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            className="p-2.5 sm:p-1.5 rounded-md bg-white hover:bg-[#f6f7f8] text-[#4c4f52] border border-[#e5e6e8] disabled:opacity-30 transition-colors"
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
      <div className="card p-4 sm:p-6 space-y-3">
        <h3 className="font-semibold text-[#1d1f20] text-sm">Ação Manual em Serviço Específico</h3>
        <p className="text-xs text-[#4c4f52]">Envie comandos systemctl diretamente para qualquer daemon</p>
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
