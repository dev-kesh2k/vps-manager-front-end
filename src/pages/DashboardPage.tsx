import { useEffect, useState } from 'react';
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  Server,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  Terminal,
  Play,
  FolderOpen,
  ScrollText,
  SlidersHorizontal,
  PackageCheck,
  CheckCircle2,
  Clock,
  Radio,
  Globe,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../lib/api';
import { useServerStore } from '../store/server';

interface Stats {
  cpuUsage: number;
  memoryUsedGB: number;
  memoryTotalGB: number;
  memoryPercent: number;
  diskUsedGB: number;
  diskTotalGB: number;
  diskPercent: number;
  runningProcesses: number;
  networkRxMB: number;
  networkTxMB: number;
}

interface WslInfo {
  distro: string;
  state: string;
  version: string;
  kernel?: string;
  uptime?: string;
}

function pct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function StatusBadge({ state }: { state: string }) {
  const running = state.toLowerCase().includes('running');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
        running
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-950/50'
          : 'bg-slate-800 text-slate-300 border-slate-700'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
      {state}
    </span>
  );
}

function StatBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden p-0.5">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${pct(value)}%` }}
      />
    </div>
  );
}

type Point = { t: string; cpu: number; mem: number };

export default function DashboardPage() {
  const activeServer = useServerStore((s) => s.activeServer);
  const [stats, setStats] = useState<Stats | null>(null);
  const [info, setInfo] = useState<WslInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Point[]>([]);

  const load = async () => {
    try {
      const [s, i] = await Promise.all([
        api.get('/wsl/stats').then((r) => r.data),
        api.get('/wsl/info').then((r) => r.data),
      ]);
      setStats(s);
      setInfo(i);
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            t: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
            cpu: Number((s.cpuUsage || 0).toFixed(1)),
            mem: Number((s.memoryPercent || 0).toFixed(1)),
          },
        ];
        return next.slice(-20);
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setHistory([]);
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [activeServer?.id]);

  return (
    <div className="space-y-6">
      {/* Header with Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Dashboard</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              Live Telemetry
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Métricas de desempenho em tempo real do ambiente Linux / WSL2
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="btn-secondary text-xs px-3.5 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      {/* Server Specs Hero Banner */}
      {info && (
        <div className="card p-6 bg-gradient-to-r from-[#121622] via-[#0f121a] to-[#0c0e15] border-white/[0.08] relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600/30 to-indigo-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-950/60">
                {activeServer?.type === 'ssh' ? (
                  <Globe className="w-6 h-6 text-indigo-400" />
                ) : (
                  <Server className="w-6 h-6 text-brand-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{activeServer?.name || info.distro}</span>
                  <StatusBadge state={info.state} />
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                    {activeServer?.type === 'ssh' ? 'SSH Remoto' : activeServer?.type === 'local' ? 'Linux Nativo' : 'WSL 2 Local'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>SO: {info.distro}</span>
                  {info.kernel && <span>• Kernel {info.kernel}</span>}
                  {activeServer?.host && <span>• Host {activeServer.username}@{activeServer.host}:{activeServer.port || 22}</span>}
                </div>
              </div>
            </div>
            {info.uptime && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-slate-300">
                <Clock className="w-4 h-4 text-brand-400" />
                <span>Uptime: {info.uptime}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 Core KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <div className="card p-5 space-y-3 relative overflow-hidden group hover:border-brand-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-brand-400" />
              <span>Processador</span>
            </div>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
              CPU
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.cpuUsage.toFixed(1) || '0.0'}
            </span>
            <span className="text-slate-400 text-sm font-semibold">%</span>
          </div>
          <StatBar value={stats?.cpuUsage || 0} colorClass="bg-gradient-to-r from-brand-500 to-indigo-500" />
        </div>

        {/* Memory Usage */}
        <div className="card p-5 space-y-3 relative overflow-hidden group hover:border-violet-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <MemoryStick className="w-4 h-4 text-violet-400" />
              <span>Memória RAM</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {stats?.memoryUsedGB.toFixed(1) || '0'} / {stats?.memoryTotalGB.toFixed(1) || '0'} GB
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.memoryPercent.toFixed(1) || '0.0'}
            </span>
            <span className="text-slate-400 text-sm font-semibold">%</span>
          </div>
          <StatBar value={stats?.memoryPercent || 0} colorClass="bg-gradient-to-r from-violet-500 to-purple-500" />
        </div>

        {/* Disk Usage */}
        <div className="card p-5 space-y-3 relative overflow-hidden group hover:border-amber-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Armazenamento</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {stats?.diskUsedGB.toFixed(1) || '0'} / {stats?.diskTotalGB.toFixed(1) || '0'} GB
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.diskPercent || 0}
            </span>
            <span className="text-slate-400 text-sm font-semibold">%</span>
          </div>
          <StatBar value={stats?.diskPercent || 0} colorClass="bg-gradient-to-r from-amber-500 to-yellow-500" />
        </div>

        {/* Processes & Network */}
        <div className="card p-5 space-y-3 relative overflow-hidden group hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Processos Ativos</span>
            </div>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Linux
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.runningProcesses || 0}
            </span>
            <span className="text-slate-400 text-xs">threads</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/[0.06]">
            <span className="flex items-center gap-1 text-emerald-400">
              <ArrowDownRight className="w-3 h-3" /> RX {stats?.networkRxMB.toFixed(2) || '0.00'} MB
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <ArrowUpRight className="w-3 h-3" /> TX {stats?.networkTxMB.toFixed(2) || '0.00'} MB
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Real-time Timeline Chart */}
        <div className="card p-6 xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="font-bold text-white text-base">Atividade em Tempo Real</h3>
              <p className="text-xs text-slate-400 mt-0.5">Histórico contínuo de CPU e Memória (amostrado a cada 4s)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-sm shadow-indigo-500/50" />
                <span className="text-slate-300">CPU %</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50" />
                <span className="text-slate-300">RAM %</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c0e15',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      fontSize: 12,
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#cpuGradient)"
                    name="CPU %"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="mem"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    fill="url(#memGradient)"
                    name="RAM %"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand-400" />
                Coletando telemetria...
              </div>
            )}
          </div>
        </div>

        {/* Quick Hub Navigation */}
        <div className="card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-white/[0.06]">
              <h3 className="font-bold text-white text-base">Atalhos do Servidor</h3>
              <p className="text-xs text-slate-400 mt-0.5">Gerenciamento direto do host</p>
            </div>

            <div className="space-y-2 mt-4">
              <a
                href="/apps/installed"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-500/40 text-slate-200 hover:text-white transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Apps Instalados</div>
                  <div className="text-[11px] text-slate-400">Acesse Apache, Portainer, pgAdmin</div>
                </div>
              </a>

              <a
                href="/terminal"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-500/40 text-slate-200 hover:text-white transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Terminal Web SSH</div>
                  <div className="text-[11px] text-slate-400">Acesso root interativo no Linux</div>
                </div>
              </a>

              <a
                href="/services"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-500/40 text-slate-200 hover:text-white transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Serviços Systemd</div>
                  <div className="text-[11px] text-slate-400">Iniciar, parar e reiniciar daemons</div>
                </div>
              </a>

              <a
                href="/files"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-brand-500/40 text-slate-200 hover:text-white transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Gerenciador de Arquivos</div>
                  <div className="text-[11px] text-slate-400">Navegue em /hub-apps e /opt</div>
                </div>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] text-xs text-slate-400 flex items-center justify-between">
            <span>Servidor Nginx 80</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
