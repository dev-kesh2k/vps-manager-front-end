import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
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

type Point = {
  t: string;
  cpu: number;
  mem: number;
  disk: number;
  proc: number;
  rx: number;
  tx: number;
};

function MetricCard({
  title,
  value,
  dataKey,
  history,
  large,
}: {
  title: string;
  value: string;
  dataKey: keyof Point;
  history: Point[];
  large?: boolean;
}) {
  const hasData = history.length > 1;

  return (
    <div className="bg-white border border-[#e5e6e8] rounded-lg p-4 flex flex-col min-h-[180px] sm:min-h-[220px]">
      <div className="flex items-start justify-between">
        <div className="text-[13px] text-[#4c4f52]">{title}</div>
        <button type="button" className="text-[#808487] hover:text-[#1d1f20] p-0.5 rounded">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className={`mt-2 text-[24px] sm:text-[28px] font-semibold tracking-tight text-[#1d1f20] leading-none`}>{value}</div>
      <div className={`relative mt-4 flex-1 ${large ? 'min-h-[96px] sm:min-h-[120px]' : 'min-h-[72px] sm:min-h-[88px]'}`}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${String(dataKey)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0051c3" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0051c3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#d9d9d9"
                strokeWidth={1.5}
                fill={`url(#fill-${String(dataKey)})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <>
            <svg className="absolute inset-0 w-full h-full text-[#ececed]" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                points="0,70 40,62 80,66 120,50 160,58 200,44 240,52 280,38 320,48 360,42 400,46"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-2.5 py-1 rounded-full bg-[#f0f1f2] text-[12px] text-[#4c4f52]">Nenhum dado</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const activeServer = useServerStore((s) => s.activeServer);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Point[]>([]);

  const load = async () => {
    try {
      const s = await api.get('/wsl/stats').then((r) => r.data);
      setStats(s);
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            t: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
            cpu: Number((s.cpuUsage || 0).toFixed(1)),
            mem: Number((s.memoryPercent || 0).toFixed(1)),
            disk: Number((s.diskPercent || 0).toFixed(1)),
            proc: Number(s.runningProcesses || 0),
            rx: Number((s.networkRxMB || 0).toFixed(2)),
            tx: Number((s.networkTxMB || 0).toFixed(2)),
          },
        ];
        return next.slice(-24);
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
    <div className="space-y-5 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-[#1d1f20]">Análise de dados</h1>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button type="button" className="inline-flex items-center gap-2 h-9 sm:h-8 px-3 rounded-full border border-[#c5c6c8] bg-white text-[13px] text-[#313335] hover:bg-[#f6f7f8] shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#4c4f52]" />
            <span className="sm:hidden">24h</span>
            <span className="hidden sm:inline">Últimas 24 horas</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#808487]" />
          </button>
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#4c4f52] hover:bg-white hover:border hover:border-[#e5e6e8]"
            title="Adicionar"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#4c4f52] hover:bg-white hover:border hover:border-[#e5e6e8]"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MetricCard
          large
          title="Uso de CPU"
          value={`${(stats?.cpuUsage ?? 0).toFixed(1)}%`}
          dataKey="cpu"
          history={history}
        />
        <MetricCard
          large
          title="Uso de memória"
          value={`${(stats?.memoryPercent ?? 0).toFixed(1)}%`}
          dataKey="mem"
          history={history}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          title="Armazenamento"
          value={`${stats?.diskPercent ?? 0}%`}
          dataKey="disk"
          history={history}
        />
        <MetricCard
          title="Processos ativos"
          value={String(stats?.runningProcesses ?? 0)}
          dataKey="proc"
          history={history}
        />
        <MetricCard
          title="Tráfego recebido"
          value={`${(stats?.networkRxMB ?? 0).toFixed(2)} MB`}
          dataKey="rx"
          history={history}
        />
        <MetricCard
          title="Tráfego enviado"
          value={`${(stats?.networkTxMB ?? 0).toFixed(2)} MB`}
          dataKey="tx"
          history={history}
        />
      </div>
    </div>
  );
}
