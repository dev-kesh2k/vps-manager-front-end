import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  X,
  Loader2,
  AlertCircle,
  Link2,
  RefreshCw,
} from 'lucide-react';
import api from '../lib/api';
import { safeExternalUrl } from '../lib/safe-url';
import { useAuthStore } from '../store/auth';

interface Website {
  id: string;
  name: string;
  url: string;
  description?: string;
  managed?: boolean;
  createdAt: number;
  updatedAt: number;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function faviconOf(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return '';
  }
}

export default function WebsitesPage() {
  const canManage = useAuthStore((s) => s.canAccess('websites', 'full'));
  const [items, setItems] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Website | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', description: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/websites');
      setItems(data.websites || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Não foi possível carregar os sites.');
    } finally {
      setLoading(false);
    }
  };

  const syncFromHub = async () => {
    setSyncing(true);
    setError(null);
    try {
      const { data } = await api.post('/websites/sync');
      setItems(data.websites || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Não foi possível sincronizar apps/Cloudflare.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.url.toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        hostnameOf(w.url).toLowerCase().includes(q)
    );
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', url: '', description: '' });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (w: Website) => {
    setEditing(w);
    setForm({ name: w.name, url: w.url, description: w.description || '' });
    setError(null);
    setModalOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/websites/${editing.id}`, form);
      } else {
        await api.post('/websites', form);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível salvar o site.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/websites/${id}`);
      setDeleteId(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível remover o site.');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Website</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              {items.length} {items.length === 1 ? 'site' : 'sites'}
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
            Apps instalados e rotas Cloudflare aparecem aqui com nome e URL; você também pode
            adicionar atalhos manuais
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-xs h-8"
              onClick={syncFromHub}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Sincronizar Hub</span>
            </button>
            <button className="btn-primary text-xs h-8" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              <span>Adicionar site</span>
            </button>
          </div>
        )}
      </div>

      {error && !modalOpen && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-[#1d1f20] text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-medium">{error}</div>
          <button onClick={() => setError(null)} className="text-[#808487] hover:text-[#1d1f20]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#808487] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          className="input pl-9 text-xs h-8"
          placeholder="Buscar por nome, domínio ou descrição..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 h-36 animate-pulse">
              <div className="w-10 h-10 rounded-md bg-[#f0f1f2] mb-3" />
              <div className="h-4 bg-[#f0f1f2] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[#f6f7f8] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Globe className="w-12 h-12 mx-auto text-[#c5c6c8]" />
          <div className="text-base font-semibold text-[#1d1f20]">
            {items.length === 0 ? 'Nenhum site cadastrado' : 'Nenhum site encontrado'}
          </div>
          <p className="text-xs text-[#808487] max-w-sm mx-auto">
            {items.length === 0
              ? 'Sincronize o Hub para trazer apps e rotas Cloudflare, ou adicione um atalho manual.'
              : 'Ajuste os termos da pesquisa para encontrar o atalho.'}
          </p>
          {canManage && items.length === 0 && (
            <button className="btn-primary text-xs h-8 mx-auto mt-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Adicionar primeiro site
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((w) => {
            const favicon = faviconOf(w.url);
            const href = safeExternalUrl(w.url);
            const cardClass =
              'card p-5 flex flex-col gap-3 hover:border-[#c5c6c8] transition-colors group';
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center overflow-hidden shrink-0">
                      {favicon ? (
                        <img src={favicon} alt="" className="w-6 h-6" />
                      ) : (
                        <Globe className="w-5 h-5 text-[#0051c3]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1d1f20] text-sm truncate flex items-center gap-1.5">
                        <span className="truncate">{w.name}</span>
                        {w.managed && (
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#eef4fc] text-[#0051c3] border border-[#d6e4f7]">
                            Hub
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#808487] font-mono truncate">{w.url}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#c5c6c8] group-hover:text-[#0051c3] shrink-0 mt-1" />
                </div>

                {w.description && (
                  <p className="text-xs text-[#4c4f52] line-clamp-2 leading-relaxed">{w.description}</p>
                )}

                {canManage && !w.managed && (
                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-[#e5e6e8] mt-auto">
                    <button
                      type="button"
                      className="p-1.5 rounded-md text-[#808487] hover:text-[#1d1f20] hover:bg-[#f6f7f8]"
                      title="Editar"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEdit(w);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-md text-[#808487] hover:text-rose-600 hover:bg-rose-50"
                      title="Remover"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteId(w.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            );

            return href ? (
              <a
                key={w.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
              >
                {inner}
              </a>
            ) : (
              <div key={w.id} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-fade-in">
          <div className="card w-full max-w-md p-5 sm:p-6 bg-white rounded-t-2xl sm:rounded-lg max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center text-[#0051c3]">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1d1f20]">{editing ? 'Editar site' : 'Adicionar site'}</h2>
                  <p className="text-xs text-[#808487]">O card abre o link em uma nova aba</p>
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
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="label">Nome</label>
                <input
                  className="input"
                  placeholder="Ex: Painel da loja, Blog, Portainer"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="label">URL</label>
                <input
                  className="input font-mono text-xs"
                  placeholder="https://meusite.com.br"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Descrição (opcional)</label>
                <input
                  className="input"
                  placeholder="O que esse atalho abre"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editing ? 'Salvar' : 'Adicionar'}</span>
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
              <h3 className="text-lg font-semibold text-[#1d1f20]">Remover site?</h3>
            </div>
            <p className="text-sm text-[#4c4f52] mb-6">
              O atalho sai desta página. O site em si não é alterado.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button className="btn-ghost text-xs" onClick={() => setDeleteId(null)}>
                Cancelar
              </button>
              <button className="btn-danger text-xs" onClick={() => onDelete(deleteId)}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
