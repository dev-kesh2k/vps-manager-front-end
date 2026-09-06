import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  Upload,
  Globe,
  Server,
  Search,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Plus,
  FolderOpen,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

interface HubApplication {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hasFrontend: boolean;
  hasBackend: boolean;
  frontendPath?: string;
  backendPath?: string;
  backendPort?: number;
  publicPort?: number;
  frontendUrl?: string;
  backendUrl?: string;
  publicUrl?: string;
  nginxEnabled: boolean;
  nginxMessage?: string;
  cloudflareEnabled: boolean;
  cloudflareMessage?: string;
  status: 'deploying' | 'active' | 'error';
  lastError?: string;
  databaseName?: string;
  replicas?: number;
  memoryLimitMb?: number;
  cpuLimit?: number;
  autoScaleEnabled?: boolean;
  autoScaleMin?: number;
  autoScaleMax?: number;
  autoScaleCpuUp?: number;
  autoScaleMemUp?: number;
  autoScaleCpuDown?: number;
  autoScaleMemDown?: number;
  lastScaleAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface PortAllocation {
  port: number;
  status: 'reserved' | 'allocated' | 'listening';
  appId?: string;
  appName?: string;
  role?: 'backend' | 'public' | 'system';
  process?: string;
}

interface PortPools {
  backend: { start: number; end: number };
  public: { start: number; end: number };
}

function statusLabel(status: HubApplication['status']): string {
  if (status === 'deploying') return 'Publicando';
  if (status === 'error') return 'Erro';
  return 'Ativa';
}

function portStatusLabel(status: PortAllocation['status']): string {
  if (status === 'listening') return 'Em uso';
  if (status === 'allocated') return 'Reservada';
  return 'Sistema';
}

function roleLabel(role?: PortAllocation['role']): string {
  if (role === 'backend') return 'Backend';
  if (role === 'public') return 'Nginx';
  return 'Sistema';
}

function FileDrop({
  label,
  hint,
  file,
  onFile,
  accept,
  disabled,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (file: File | null) => void;
  accept: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      className="w-full text-left rounded-lg border border-dashed border-[#c5c6c8] bg-[#f6f7f8] hover:border-[#0051c3] hover:bg-[#f0f4fb] transition-colors p-4 disabled:opacity-50"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-white border border-[#e5e6e8] flex items-center justify-center text-[#0051c3] shrink-0">
          <Upload className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#1d1f20]">{label}</div>
          <div className="text-[11px] text-[#808487] mt-0.5">{hint}</div>
          <div className="text-xs mt-2 font-mono truncate text-[#313335]">
            {file ? file.name : 'Nenhum arquivo selecionado'}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function AplicacoesPage() {
  const canManage = useAuthStore((s) => s.canAccess('aplicacoes', 'full'));
  const [items, setItems] = useState<HubApplication[]>([]);
  const [ports, setPorts] = useState<PortAllocation[]>([]);
  const [pools, setPools] = useState<PortPools | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [portsOpen, setPortsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [patchId, setPatchId] = useState<string | null>(null);
  const [focusSide, setFocusSide] = useState<'frontend' | 'backend' | 'both'>('both');
  const [form, setForm] = useState({
    name: '',
    description: '',
    replicas: 1,
    memoryLimitMb: 512,
    cpuLimit: '',
  });
  const [frontendFile, setFrontendFile] = useState<File | null>(null);
  const [backendFile, setBackendFile] = useState<File | null>(null);
  const [scaleApp, setScaleApp] = useState<HubApplication | null>(null);
  const [scaleForm, setScaleForm] = useState({
    replicas: 1,
    memoryLimitMb: 512,
    cpuLimit: '',
    autoScaleEnabled: false,
    autoScaleMin: 1,
    autoScaleMax: 3,
    autoScaleCpuUp: 70,
    autoScaleMemUp: 80,
    autoScaleCpuDown: 25,
    autoScaleMemDown: 40,
  });
  const [scaling, setScaling] = useState(false);

  const load = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [appsRes, portsRes] = await Promise.all([api.get('/aplicacoes'), api.get('/aplicacoes/ports')]);
      setItems(appsRes.data.applications || []);
      setPorts(portsRes.data.ports || []);
      setPools(portsRes.data.pools || null);
    } catch (e: any) {
      if (!opts?.silent) {
        setError(e?.response?.data?.error || 'Não foi possível carregar as aplicações.');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deploying = items.some((a) => a.status === 'deploying');
  useEffect(() => {
    if (!deploying) return;
    const timer = window.setInterval(() => {
      load({ silent: true });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [deploying]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openCreate = (side: 'frontend' | 'backend' | 'both' = 'both') => {
    setPatchId(null);
    setFocusSide(side);
    setForm({ name: '', description: '', replicas: 1, memoryLimitMb: 512, cpuLimit: '' });
    setFrontendFile(null);
    setBackendFile(null);
    setError(null);
    setModalOpen(true);
  };

  const openPatch = (app: HubApplication) => {
    setPatchId(app.id);
    setFocusSide('both');
    setForm({
      name: app.name,
      description: app.description || '',
      replicas: app.replicas || 1,
      memoryLimitMb: app.memoryLimitMb || 512,
      cpuLimit: app.cpuLimit ? String(app.cpuLimit) : '',
    });
    setFrontendFile(null);
    setBackendFile(null);
    setError(null);
    setModalOpen(true);
  };

  const openScale = (app: HubApplication) => {
    setScaleApp(app);
    setScaleForm({
      replicas: app.replicas || 1,
      memoryLimitMb: app.memoryLimitMb || 512,
      cpuLimit: app.cpuLimit ? String(app.cpuLimit) : '',
      autoScaleEnabled: !!app.autoScaleEnabled,
      autoScaleMin: app.autoScaleMin || 1,
      autoScaleMax: app.autoScaleMax || 3,
      autoScaleCpuUp: app.autoScaleCpuUp || 70,
      autoScaleMemUp: app.autoScaleMemUp || 80,
      autoScaleCpuDown: app.autoScaleCpuDown || 25,
      autoScaleMemDown: app.autoScaleMemDown || 40,
    });
    setError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!frontendFile && !backendFile) {
      setError('Selecione o ZIP do frontend, do backend, ou ambos.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = new FormData();
      if (!patchId) {
        data.append('name', form.name);
        data.append('description', form.description);
      }
      data.append('replicas', String(form.replicas));
      data.append('memoryLimitMb', String(form.memoryLimitMb));
      if (form.cpuLimit.trim()) data.append('cpuLimit', form.cpuLimit.trim());
      if (frontendFile) data.append('frontend', frontendFile);
      if (backendFile) data.append('backend', backendFile);
      if (patchId) {
        await api.post(`/aplicacoes/${patchId}/upload`, data, { timeout: 180000 });
      } else {
        await api.post('/aplicacoes', data, { timeout: 180000 });
      }
      setModalOpen(false);
      await load({ silent: true });
    } catch (err: any) {
      const status = err?.response?.status;
      setError(
        err?.response?.data?.error ||
          (status === 502 || status === 504
            ? 'O proxy cortou a resposta, mas a publicação pode ter seguido no servidor. Atualize a lista em alguns segundos.'
            : 'Não foi possível publicar a aplicação.')
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    try {
      await api.delete(`/aplicacoes/${id}`, { timeout: 180000 });
      setDeleteId(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível remover a aplicação.');
      setDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  const onRedeploy = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/aplicacoes/${id}/redeploy`, {}, { timeout: 30000 });
      await load({ silent: true });
    } catch (err: any) {
      const status = err?.response?.status;
      setError(
        err?.response?.data?.error ||
          (status === 502 || status === 504
            ? 'O proxy cortou a resposta. Se o status ficou em Publicando, aguarde — o servidor continua o trabalho.'
            : 'Não foi possível reconfigurar o Nginx.')
      );
    } finally {
      setBusyId(null);
    }
  };

  const onCloudflare = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/aplicacoes/${id}/cloudflare`, {}, { timeout: 60000 });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível publicar no Cloudflare.');
    } finally {
      setBusyId(null);
    }
  };

  const onScaleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!scaleApp) return;
    setScaling(true);
    setError(null);
    try {
      await api.post(
        `/aplicacoes/${scaleApp.id}/scale`,
        {
          replicas: scaleForm.replicas,
          memoryLimitMb: scaleForm.memoryLimitMb,
          cpuLimit: scaleForm.cpuLimit.trim() ? Number(scaleForm.cpuLimit) : null,
          autoScaleEnabled: scaleForm.autoScaleEnabled,
          autoScaleMin: scaleForm.autoScaleMin,
          autoScaleMax: scaleForm.autoScaleMax,
          autoScaleCpuUp: scaleForm.autoScaleCpuUp,
          autoScaleMemUp: scaleForm.autoScaleMemUp,
          autoScaleCpuDown: scaleForm.autoScaleCpuDown,
          autoScaleMemDown: scaleForm.autoScaleMemDown,
        },
        { timeout: 60000 }
      );
      setScaleApp(null);
      await load({ silent: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível ajustar réplicas/limites.');
    } finally {
      setScaling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Aplicações</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              {items.length} {items.length === 1 ? 'app' : 'apps'}
            </span>
          </h1>
        </div>

        {canManage && (
          <button className="btn-primary text-xs h-8" onClick={() => openCreate('both')}>
            <Plus className="w-4 h-4" />
            <span>Publicar</span>
          </button>
        )}
      </div>

      {error && !modalOpen && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-[#1d1f20] text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium whitespace-pre-wrap">{error}</div>
          <button onClick={() => setError(null)} className="text-[#808487] hover:text-[#1d1f20]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-[11px] text-[#808487] font-medium">Portas Nginx</div>
          <div className="text-sm font-semibold mt-1">{pools ? `${pools.public.start}–${pools.public.end}` : '8100–8199'}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-[#808487] font-medium">Portas em uso</div>
          <div className="text-sm font-semibold mt-1">
            {ports.filter((p) => p.status === 'listening' || p.status === 'allocated').length}
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#808487] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          className="input pl-9 text-xs h-8"
          placeholder="Buscar por nome ou pasta..."
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

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-44 animate-pulse">
              <div className="h-4 bg-[#f0f1f2] rounded w-1/3 mb-3" />
              <div className="h-3 bg-[#f6f7f8] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Boxes className="w-12 h-12 mx-auto text-[#c5c6c8]" />
          <div className="text-base font-semibold text-[#1d1f20]">
            {items.length === 0 ? 'Nenhuma aplicação publicada' : 'Nenhuma aplicação encontrada'}
          </div>
          <p className="text-xs text-[#808487] max-w-sm mx-auto">
            Envie o ZIP do frontend (Apache) e/ou do backend (serviços). O Hub escolhe a porta e configura o Nginx.
          </p>
          {canManage && items.length === 0 && (
            <button className="btn-primary text-xs h-8 mx-auto mt-2" onClick={() => openCreate('both')}>
              <Upload className="w-4 h-4" />
              Publicar primeira aplicação
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((app) => (
            <div key={app.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[#1d1f20] text-sm truncate">{app.name}</div>
                  <div className="text-[11px] text-[#808487] font-mono truncate">{app.slug}</div>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    app.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : app.status === 'deploying'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {statusLabel(app.status)}
                </span>
              </div>

              {app.description && <p className="text-xs text-[#4c4f52] line-clamp-2">{app.description}</p>}

              <div className="flex flex-wrap gap-1.5">
                {app.hasFrontend && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
                    Frontend · Apache
                  </span>
                )}
                {app.hasBackend && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
                    Backend · :{app.backendPort}
                    {(app.replicas || 1) > 1 ? ` · ${app.replicas}×` : ''}
                  </span>
                )}
                {app.hasBackend && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0f4fb] text-[#0051c3] border border-[#d6e4f7]">
                    {app.memoryLimitMb || 512}MB
                    {app.cpuLimit ? ` · ${app.cpuLimit} CPU` : ''}
                    {app.autoScaleEnabled ? ' · auto' : ''}
                  </span>
                )}
                {app.databaseName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0f4fb] text-[#0051c3] border border-[#d6e4f7]">
                    Postgres · {app.databaseName}
                  </span>
                )}
                {app.publicPort && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0f4fb] text-[#0051c3] border border-[#d6e4f7]">
                    Nginx · :{app.publicPort}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-[12px]">
                {app.publicUrl && (
                  <a
                    href={app.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#0051c3] hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="truncate font-mono">{app.publicUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
                {app.backendUrl && app.backendUrl !== app.publicUrl && (
                  <a
                    href={app.backendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#4c4f52] hover:text-[#0051c3]"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span className="truncate font-mono">{app.backendUrl}</span>
                  </a>
                )}
                {app.frontendPath && (
                  <div className="flex items-center gap-2 text-[#808487]">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="truncate font-mono">{app.frontendPath}</span>
                  </div>
                )}
                {app.backendPath && (
                  <div className="flex items-center gap-2 text-[#808487]">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="truncate font-mono">{app.backendPath}</span>
                  </div>
                )}
              </div>

              <div
                className={`flex items-start gap-2 text-[11px] rounded-md px-2.5 py-2 border ${
                  app.nginxEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {app.nginxEnabled ? (
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                )}
                <span>{app.nginxMessage || (app.nginxEnabled ? 'Nginx configurado' : 'Nginx pendente')}</span>
              </div>

              <div
                className={`flex items-start gap-2 text-[11px] rounded-md px-2.5 py-2 border ${
                  app.cloudflareEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {app.cloudflareEnabled ? (
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                )}
                <span>
                  {app.cloudflareMessage ||
                    (app.cloudflareEnabled ? 'Cloudflare publicado' : 'Cloudflare pendente')}
                </span>
              </div>

              {app.status === 'deploying' && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
                  Publicando no Docker e no Nginx. Isso pode levar alguns minutos — o status atualiza sozinho.
                </p>
              )}

              {app.lastError && app.status === 'error' && (
                <pre className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2 whitespace-pre-wrap">
                  {app.lastError}
                </pre>
              )}

              {canManage && (
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-[#e5e6e8] mt-auto flex-wrap">
                  {app.hasBackend && (
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() => openScale(app)}
                      disabled={busyId === app.id || app.status === 'deploying'}
                      title="Réplicas e limites de RAM/CPU"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      Scale
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => openPatch(app)}
                    disabled={busyId === app.id || app.status === 'deploying'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => onRedeploy(app.id)}
                    disabled={busyId === app.id || app.status === 'deploying'}
                  >
                    {busyId === app.id || app.status === 'deploying' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Nginx
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => onCloudflare(app.id)}
                    disabled={busyId === app.id || app.status === 'deploying'}
                  >
                    {busyId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    Cloudflare
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-md text-[#808487] hover:text-rose-600 hover:bg-rose-50"
                    title="Remover"
                    onClick={() => setDeleteId(app.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 text-left group"
          onClick={() => setPortsOpen((v) => !v)}
          aria-expanded={portsOpen}
        >
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#1d1f20] group-hover:text-[#0051c3] transition-colors">
              Gestão de portas
            </h2>
            <p className="text-xs text-[#808487] mt-1">
              Portas do sistema ficam reservadas. Apps recebem backend em 3100–3199 e Nginx em 8100–8199.
            </p>
          </div>
          <span className="shrink-0 p-1.5 rounded-md text-[#808487] group-hover:bg-[#f0f1f2] group-hover:text-[#1d1f20]">
            {portsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        {portsOpen && (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="text-[#808487] border-b border-[#e5e6e8]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Porta</th>
                  <th className="px-4 py-2.5 font-medium">Papel</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Aplicação</th>
                  <th className="px-4 py-2.5 font-medium">Processo</th>
                </tr>
              </thead>
              <tbody>
                {ports.map((row) => (
                  <tr key={`${row.role}-${row.port}`} className="border-b border-[#f0f1f2] last:border-0">
                    <td className="px-4 py-2.5 font-mono font-medium">{row.port}</td>
                    <td className="px-4 py-2.5">{roleLabel(row.role)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full border ${
                          row.status === 'listening'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.status === 'allocated'
                            ? 'bg-[#f0f4fb] text-[#0051c3] border-[#d6e4f7]'
                            : 'bg-[#f0f1f2] text-[#4c4f52] border-[#e5e6e8]'
                        }`}
                      >
                        {portStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{row.appName || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[#808487]">{row.process || '—'}</td>
                  </tr>
                ))}
                {ports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#808487]">
                      Nenhuma porta listada ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-fade-in">
          <div className="card w-full max-w-lg p-5 sm:p-6 bg-white rounded-t-2xl sm:rounded-lg max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center text-[#0051c3]">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1d1f20]">
                    {patchId ? 'Atualizar arquivos' : 'Publicar aplicação'}
                  </h2>
                  <p className="text-xs text-[#808487]">
                    ZIP do frontend e/ou backend. Projeto Vite é compilado no servidor; pasta dist também vale.
                  </p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-md text-[#808487] hover:text-[#1d1f20] hover:bg-[#f6f7f8]"
                onClick={() => setModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && modalOpen && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="whitespace-pre-wrap">{error}</span>
                </div>
              )}

              {!patchId && (
                <>
                  <div>
                    <label className="label">Nome</label>
                    <input
                      className="input"
                      placeholder="Ex: Loja, Painel, API clientes"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Descrição (opcional)</label>
                    <input
                      className="input"
                      placeholder="O que essa aplicação faz"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {(focusSide === 'both' || focusSide === 'backend' || !!backendFile || (!!patchId && items.find((a) => a.id === patchId)?.hasBackend)) && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Réplicas</label>
                    <select
                      className="input"
                      value={form.replicas}
                      onChange={(e) => setForm((f) => ({ ...f, replicas: Number(e.target.value) }))}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}×
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">RAM / réplica</label>
                    <select
                      className="input"
                      value={form.memoryLimitMb}
                      onChange={(e) => setForm((f) => ({ ...f, memoryLimitMb: Number(e.target.value) }))}
                    >
                      {[256, 512, 768, 1024, 1536, 2048].map((n) => (
                        <option key={n} value={n}>
                          {n} MB
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">CPU (opcional)</label>
                    <input
                      className="input"
                      placeholder="ex: 0.5"
                      value={form.cpuLimit}
                      onChange={(e) => setForm((f) => ({ ...f, cpuLimit: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className={`grid grid-cols-1 ${focusSide === 'both' ? 'sm:grid-cols-2' : ''} gap-3`}>
                {(focusSide === 'both' || focusSide === 'frontend') && (
                  <FileDrop
                    label="Frontend"
                    hint="Pasta Apache · .zip"
                    file={frontendFile}
                    onFile={setFrontendFile}
                    accept=".zip,.tar.gz,.tgz,.tar"
                    disabled={saving}
                  />
                )}
                {(focusSide === 'both' || focusSide === 'backend') && (
                  <FileDrop
                    label="Backend"
                    hint="Pasta serviços · .zip"
                    file={backendFile}
                    onFile={setBackendFile}
                    accept=".zip,.tar.gz,.tgz,.tar"
                    disabled={saving}
                  />
                )}
              </div>

              <p className="text-[11px] text-[#808487]">
                Envie pelo menos um dos dois. Frontend Vite (com src/main.tsx) é compilado automaticamente; ou envie só a
                pasta dist. O backend sobe em Docker. Se o projeto precisar de banco e o Postgres não estiver no ar, o
                Hub cria o container, ajusta o .env e aplica as migrations.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Publicando…' : patchId ? 'Enviar arquivos' : 'Publicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-fade-in">
          <div className="card w-full max-w-md p-5 sm:p-6 bg-white rounded-t-2xl sm:rounded-lg max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2 rounded-md bg-rose-50 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#1d1f20]">Remover aplicação?</h3>
            </div>
            <p className="text-sm text-[#4c4f52] mb-6">
              Os arquivos em Apache e serviços, o container e o vhost do Nginx dessa aplicação serão removidos. A porta volta
              para o pool.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button className="btn-ghost text-xs" onClick={() => setDeleteId(null)} disabled={busyId === deleteId}>
                Cancelar
              </button>
              <button className="btn-danger text-xs" onClick={() => onDelete(deleteId)} disabled={busyId === deleteId}>
                {busyId === deleteId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {scaleApp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-fade-in">
          <div className="card w-full max-w-lg p-5 sm:p-6 bg-white rounded-t-2xl sm:rounded-lg max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1f20]">Scale · {scaleApp.name}</h3>
                <p className="text-xs text-[#808487] mt-1">
                  Réplicas, limites e auto-scale por CPU/RAM (monitora docker stats a cada ~45s).
                </p>
              </div>
              <button className="p-1.5 rounded-md text-[#808487] hover:bg-[#f6f7f8]" onClick={() => setScaleApp(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onScaleSubmit} className="space-y-4">
              <label className="flex items-center gap-3 p-3 rounded-md border border-[#e5e6e8] bg-[#f6f7f8] cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-[#c5c6c8]"
                  checked={scaleForm.autoScaleEnabled}
                  onChange={(e) => setScaleForm((f) => ({ ...f, autoScaleEnabled: e.target.checked }))}
                />
                <span className="text-sm text-[#1d1f20]">
                  <span className="font-medium">Auto-scale</span>
                  <span className="block text-[11px] text-[#808487]">
                    Sobe réplica se CPU/RAM altos; desce se baixos (com cooldown).
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">{scaleForm.autoScaleEnabled ? 'Réplicas agora' : 'Réplicas'}</label>
                  <select
                    className="input"
                    value={scaleForm.replicas}
                    onChange={(e) =>
                      setScaleForm((f) => {
                        const replicas = Number(e.target.value);
                        return {
                          ...f,
                          replicas,
                          autoScaleMin: Math.min(f.autoScaleMin, replicas),
                          autoScaleMax: Math.max(f.autoScaleMax, replicas),
                        };
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                  </select>
                  {scaleForm.autoScaleEnabled && (
                    <p className="text-[10px] text-[#808487] mt-1">Auto-scale respeita min/max; isto define o valor atual.</p>
                  )}
                </div>
                <div>
                  <label className="label">RAM / réplica</label>
                  <select
                    className="input"
                    value={scaleForm.memoryLimitMb}
                    onChange={(e) => setScaleForm((f) => ({ ...f, memoryLimitMb: Number(e.target.value) }))}
                  >
                    {[256, 512, 768, 1024, 1536, 2048].map((n) => (
                      <option key={n} value={n}>
                        {n} MB
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">CPU</label>
                  <input
                    className="input"
                    placeholder="0.5"
                    value={scaleForm.cpuLimit}
                    onChange={(e) => setScaleForm((f) => ({ ...f, cpuLimit: e.target.value }))}
                  />
                </div>
              </div>

              {scaleForm.autoScaleEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Mín. réplicas</label>
                      <select
                        className="input"
                        value={scaleForm.autoScaleMin}
                        onChange={(e) =>
                          setScaleForm((f) => ({
                            ...f,
                            autoScaleMin: Number(e.target.value),
                            autoScaleMax: Math.max(Number(e.target.value), f.autoScaleMax),
                          }))
                        }
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}×
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Máx. réplicas</label>
                      <select
                        className="input"
                        value={scaleForm.autoScaleMax}
                        onChange={(e) =>
                          setScaleForm((f) => ({
                            ...f,
                            autoScaleMax: Math.max(f.autoScaleMin, Number(e.target.value)),
                          }))
                        }
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}×
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Subir se CPU ≥</label>
                      <input
                        className="input"
                        type="number"
                        min={10}
                        max={95}
                        value={scaleForm.autoScaleCpuUp}
                        onChange={(e) => setScaleForm((f) => ({ ...f, autoScaleCpuUp: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="label">Subir se RAM ≥</label>
                      <input
                        className="input"
                        type="number"
                        min={10}
                        max={95}
                        value={scaleForm.autoScaleMemUp}
                        onChange={(e) => setScaleForm((f) => ({ ...f, autoScaleMemUp: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="label">Descer se CPU ≤</label>
                      <input
                        className="input"
                        type="number"
                        min={5}
                        max={80}
                        value={scaleForm.autoScaleCpuDown}
                        onChange={(e) => setScaleForm((f) => ({ ...f, autoScaleCpuDown: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="label">Descer se RAM ≤</label>
                      <input
                        className="input"
                        type="number"
                        min={5}
                        max={80}
                        value={scaleForm.autoScaleMemDown}
                        onChange={(e) => setScaleForm((f) => ({ ...f, autoScaleMemDown: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </>
              )}

              <p className="text-[11px] text-[#808487]">
                Com auto-scale, o Hub mantém um load balancer e ajusta réplicas sem rebuild. Em 1 máquina as réplicas
                compartilham a mesma CPU/RAM do host.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setScaleApp(null)} disabled={scaling}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={scaling}>
                  {scaling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-3.5 h-3.5" />}
                  <span>{scaling ? 'Aplicando…' : 'Aplicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
