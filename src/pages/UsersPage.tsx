import { useEffect, useState } from 'react';
import {
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  X,
  Shield,
  Eye,
  EyeOff,
  UserPlus,
  Search,
  Save,
  KeyRound,
} from 'lucide-react';
import api from '../lib/api';
import { ScreenKey, Role, AccessLevel, ScreenPermission } from '../store/auth';

interface ScreenMeta {
  key: ScreenKey;
  label: string;
  description: string;
}

interface UserRow {
  id: string;
  username: string;
  role: Role;
  createdAt: number;
  permissions: ScreenPermission[];
}

type PermissionState = 'none' | 'read' | 'full';

interface FormState {
  username: string;
  password: string;
  role: Role;
  permissions: Record<ScreenKey, PermissionState>;
}

const ALL_SCREENS: ScreenKey[] = [
  'dashboard',
  'terminal',
  'command',
  'services',
  'files',
  'logs',
  'appsInstalled',
  'appsInstall',
  'users',
  'servers',
  'websites',
  'aplicacoes',
];

function defaultPermsForRole(role: Role): Record<ScreenKey, PermissionState> {
  const result: Record<ScreenKey, PermissionState> = {} as Record<ScreenKey, PermissionState>;
  ALL_SCREENS.forEach((s) => (result[s] = 'none'));
  if (role === 'admin') {
    ALL_SCREENS.forEach((s) => (result[s] = 'full'));
  } else if (role === 'operator') {
    const full: ScreenKey[] = [
      'dashboard',
      'terminal',
      'command',
      'services',
      'files',
      'logs',
      'appsInstalled',
      'appsInstall',
      'websites',
      'aplicacoes',
    ];
    full.forEach((s) => (result[s] = 'full'));
  } else {
    ALL_SCREENS.filter((s) => s !== 'users').forEach((s) => (result[s] = 'read'));
  }
  return result;
}

function emptyForm(): FormState {
  return {
    username: '',
    password: '',
    role: 'viewer',
    permissions: defaultPermsForRole('viewer'),
  };
}

function permsFromUser(user: UserRow): Record<ScreenKey, PermissionState> {
  const result: Record<ScreenKey, PermissionState> = {} as Record<ScreenKey, PermissionState>;
  ALL_SCREENS.forEach((s) => (result[s] = 'none'));
  user.permissions.forEach((p) => {
    result[p.screen] = p.level;
  });
  return result;
}

function buildPermissionsPayload(role: Role, perms: Record<ScreenKey, PermissionState>): ScreenPermission[] {
  if (role === 'admin') {
    return ALL_SCREENS.map((s) => ({ screen: s, level: 'full' as AccessLevel }));
  }
  const out: ScreenPermission[] = [];
  ALL_SCREENS.forEach((s) => {
    const state = perms[s];
    if (state === 'read' || state === 'full') out.push({ screen: s, level: state });
  });
  return out;
}

function roleLabel(role: Role): string {
  if (role === 'admin') return 'Administrador';
  if (role === 'operator') return 'Operador';
  return 'Visualizador';
}

function roleBadgeClass(role: Role): string {
  if (role === 'admin') return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (role === 'operator') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-blue-50 text-[#0051c3] border border-blue-200';
}

function formatDate(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [screens, setScreens] = useState<ScreenMeta[]>([]);
  const [envRootUsername, setEnvRootUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notify, setNotify] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users || []);
      setScreens(data.screens || []);
      setEnvRootUsername(data.envRootUsername || null);
    } catch (err: any) {
      setNotify({ type: 'err', text: 'Erro ao carregar: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditUser(null);
    setShowCreate(true);
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setShowCreate(true);
    setForm({
      username: u.username,
      password: '',
      role: u.role,
      permissions: permsFromUser(u),
    });
    setFormError(null);
  };

  const closeModal = () => {
    setShowCreate(false);
    setEditUser(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const setRole = (role: Role) => {
    setForm((f) => ({
      ...f,
      role,
      permissions: defaultPermsForRole(role),
    }));
  };

  const setPerm = (screen: ScreenKey, state: PermissionState) => {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [screen]: state },
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.username.trim() || form.username.trim().length < 3) {
      setFormError('Nome de usuário Linux deve ter pelo menos 3 caracteres');
      return;
    }
    if (!editUser && (!form.password || form.password.length < 4)) {
      setFormError('Senha deve ter pelo menos 4 caracteres');
      return;
    }
    if (editUser && form.password && form.password.length < 4) {
      setFormError('Senha deve ter pelo menos 4 caracteres ou deixe em branco para manter a atual');
      return;
    }

    setSubmitting(true);
    setNotify(null);

    try {
      const payload: any = {
        role: form.role,
        permissions: buildPermissionsPayload(form.role, form.permissions),
      };

      if (editUser) {
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editUser.id}`, payload);
        setNotify({ type: 'ok', text: `Usuário "${form.username}" atualizado com sucesso.` });
      } else {
        payload.username = form.username.trim();
        payload.password = form.password;
        await api.post('/users', payload);
        setNotify({ type: 'ok', text: `Usuário Linux "${form.username}" criado com sucesso no host WSL.` });
      }

      closeModal();
      load();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao processar usuário';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!window.confirm(`Deseja realmente excluir o usuário "${u.username}" da aplicação?`)) return;
    setDeletingId(u.id);
    setNotify(null);
    try {
      await api.delete(`/users/${u.id}`);
      setNotify({
        type: 'ok',
        text: `Usuário "${u.username}" removido do painel.`,
      });
      load();
    } catch (err: any) {
      setNotify({ type: 'err', text: 'Erro: ' + (err.response?.data?.error || err.message) });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => u.username.toLowerCase().includes(filter.toLowerCase()));
  const screenMap: Record<ScreenKey, ScreenMeta> = {} as Record<ScreenKey, ScreenMeta>;
  screens.forEach((s) => (screenMap[s.key] = s));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Gerenciar Usuários</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8]">
              {users.length} Contas
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1">
            Contas do Hub armazenadas no PostgreSQL (separadas do root do .env)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button className="btn-secondary text-xs px-3.5 py-2.5" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Atualizar</span>
          </button>
          <button className="btn-primary text-xs px-4 py-2.5" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-white border border-[#e5e6e8] rounded-lg p-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center text-[#0051c3] shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-xs text-[#4c4f52] leading-relaxed">
            <div className="font-semibold text-[#1d1f20] mb-0.5">Root do Hub × usuários do painel</div>
            O root fica em <code className="text-[#0051c3] font-mono">AUTH_USERNAME</code> /{' '}
            <code className="text-[#0051c3] font-mono">AUTH_PASSWORD</code> no arquivo{' '}
            <code className="text-[#0051c3] font-mono">.env</code>
            {envRootUsername ? (
              <>
                {' '}
                (atual: <strong className="text-[#1d1f20]">{envRootUsername}</strong>)
              </>
            ) : null}
            . Usuários criados aqui vão só para o banco de dados e não criam conta Linux.
          </div>
        </div>
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

      {/* Users List Table */}
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#808487]" />
            <input
              className="input pl-10 text-xs"
              placeholder="Buscar usuário..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="text-xs text-[#808487] font-mono">
            {users.length} usuário(s) cadastrado(s)
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#808487] space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#0051c3]" />
            <div className="text-xs">Carregando usuários...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-[#808487] space-y-2">
            <Users className="w-8 h-8 mx-auto text-[#c5c6c8]" />
            <div className="text-sm font-semibold text-[#4c4f52]">Nenhum usuário cadastrado</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#e5e6e8] -mx-1 sm:mx-0">
            <table className="w-full text-xs min-w-[560px]">
              <thead className="bg-white text-[11px] uppercase tracking-wider text-[#808487] border-b border-[#e5e6e8]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Usuário Linux</th>
                  <th className="text-left px-4 py-3 font-semibold">Perfil RBAC</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Data de Criação</th>
                  <th className="text-left px-4 py-3 font-semibold">Permissões de Tela</th>
                  <th className="text-right px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e6e8] bg-white">
                {filtered.map((u) => {
                  const count = u.permissions.length;
                  return (
                    <tr key={u.id} className="hover:bg-[#f6f7f8] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center text-xs font-bold text-[#0051c3] flex-shrink-0">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#1d1f20]">{u.username}</div>
                            <div className="text-[11px] text-[#808487]">Conta WSL Local</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${roleBadgeClass(u.role)}`}>
                          <Shield className="w-3 h-3" />
                          <span>{roleLabel(u.role)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#808487] hidden md:table-cell font-mono text-[11px]">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-[#f6f7f8] text-[#4c4f52] border border-[#e5e6e8] font-mono text-[11px]">
                          {u.role === 'admin' ? 'Total (Todas as Telas)' : `${count} / ${ALL_SCREENS.length} Telas`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="p-1.5 rounded-lg bg-[#f6f7f8] hover:bg-blue-50 text-[#4c4f52] hover:text-[#0051c3] border border-[#e5e6e8] transition-colors"
                            onClick={() => openEdit(u)}
                            disabled={submitting || !!deletingId}
                            title="Editar usuário"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                            onClick={() => handleDelete(u)}
                            disabled={!!deletingId}
                            title="Remover usuário"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
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

      {/* Create / Edit User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-fade-in">
          <div className="card w-full max-w-3xl max-h-[92dvh] overflow-hidden flex flex-col border-[#e5e6e8] bg-white rounded-t-2xl sm:rounded-lg pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#e5e6e8] bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] flex items-center justify-center text-[#0051c3]">
                  {editUser ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="font-bold text-base text-[#1d1f20]">{editUser ? 'Editar Usuário' : 'Novo Usuário Linux'}</h2>
                  <p className="text-xs text-[#808487]">
                    {editUser
                      ? 'Atualize funções, permissões de tela e senha do usuário'
                      : 'Crie uma nova conta com acesso autenticado ao sistema'}
                  </p>
                </div>
              </div>
              <button className="p-1.5 rounded-lg text-[#808487] hover:text-[#1d1f20] hover:bg-[#f6f7f8]" onClick={closeModal}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Nome de Usuário Linux</label>
                  <input
                    className="input"
                    placeholder="ex: operador, dev, gestor"
                    value={form.username}
                    disabled={!!editUser}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  />
                  {editUser && (
                    <p className="text-[11px] text-[#808487]">
                      O login Linux é imutável após a criação.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="label">
                    {editUser ? 'Nova Senha (opcional)' : 'Senha de Acesso'}
                  </label>
                  <input
                    type="password"
                    className="input"
                    placeholder={editUser ? 'Deixe vazio para não alterar' : 'Mínimo 4 caracteres'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="label">Perfil de Acesso (Função)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['admin', 'operator', 'viewer'] as Role[]).map((r) => {
                    const selected = form.role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          selected
                            ? 'bg-blue-50 border-[#0051c3] ring-1 ring-[#0051c3]/20'
                            : 'bg-white border-[#e5e6e8] hover:border-[#c5c6c8]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Shield
                            className={`w-4 h-4 ${
                              r === 'admin'
                                ? 'text-rose-600'
                                : r === 'operator'
                                ? 'text-amber-600'
                                : 'text-[#0051c3]'
                            }`}
                          />
                          <span className="font-bold text-[#1d1f20] text-xs">{roleLabel(r)}</span>
                        </div>
                        <div className="text-[11px] text-[#808487]">
                          {r === 'admin'
                            ? 'Acesso total e irrestrito'
                            : r === 'operator'
                            ? 'Opera apps e comandos'
                            : 'Apenas leitura'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Screen Permissions Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Permissões Específicas por Módulo</label>
                  <span className="text-[11px] text-[#808487]">
                    {form.role === 'admin' ? 'Administradores têm acesso total automático.' : 'Configure o acesso individualmente:'}
                  </span>
                </div>

                <div className="rounded-xl border border-[#e5e6e8] overflow-x-auto">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] bg-white text-[10px] uppercase tracking-wider text-[#808487] border-b border-[#e5e6e8]">
                    <div className="px-4 py-2.5 font-semibold">Módulo / Tela</div>
                    <div className="px-4 py-2.5 text-center whitespace-nowrap font-semibold">Nenhum</div>
                    <div className="px-4 py-2.5 text-center whitespace-nowrap font-semibold">Leitura</div>
                    <div className="px-4 py-2.5 text-center whitespace-nowrap font-semibold">Total</div>
                  </div>

                  <div className="divide-y divide-[#e5e6e8] bg-white">
                    {(screens.length > 0 ? screens.map((s) => s.key) : ALL_SCREENS).map((key) => {
                      const meta = screenMap[key];
                      const state = form.permissions[key] || 'none';
                      const disabled = form.role === 'admin';
                      const cols: PermissionState[] = ['none', 'read', 'full'];
                      return (
                        <div
                          key={key}
                          className={`grid grid-cols-[1fr_auto_auto_auto] items-center ${
                            disabled ? 'opacity-60' : ''
                          } hover:bg-[#f6f7f8] transition-colors`}
                        >
                          <div className="px-4 py-2.5">
                            <div className="font-semibold text-[#313335]">{meta?.label || key}</div>
                            <div className="text-[11px] text-[#808487]">{meta?.description}</div>
                          </div>

                          {cols.map((c) => {
                            const selected = state === c;
                            return (
                              <div key={c} className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => setPerm(key, c)}
                                  className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                                    selected
                                      ? c === 'none'
                                        ? 'bg-[#313335] border-[#313335] text-white'
                                        : c === 'read'
                                        ? 'bg-blue-50 border-[#0051c3] text-[#0051c3]'
                                        : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                      : 'border-[#e5e6e8] bg-white text-[#808487] hover:border-[#c5c6c8]'
                                  }`}
                                  title={
                                    c === 'none'
                                      ? 'Sem Acesso'
                                      : c === 'read'
                                      ? 'Somente Leitura'
                                      : 'Acesso Completo'
                                  }
                                >
                                  {c === 'none' ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : c === 'read' ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-[#e5e6e8] bg-white">
              <button className="btn-secondary text-xs px-4 py-2" onClick={closeModal} disabled={submitting}>
                Cancelar
              </button>
              <button className="btn-primary text-xs px-5 py-2" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{editUser ? 'Salvar Modificações' : 'Criar Usuário Linux'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
