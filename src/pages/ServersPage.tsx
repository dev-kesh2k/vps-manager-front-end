import { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Terminal,
  Cpu,
  Key,
  Lock,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  HardDrive,
  Info,
} from 'lucide-react';
import { useServerStore, PublicServerNode, ServerType, TestResult } from '../store/server';
import { useAuthStore } from '../store/auth';

export default function ServersPage() {
  const {
    servers,
    activeServer,
    loading,
    error,
    fetchServers,
    setActiveServer,
    addServer,
    updateServer,
    deleteServer,
    testConnection,
  } = useServerStore();

  const role = useAuthStore((s) => s.role);
  const canManage = role === 'admin' || useAuthStore((s) => s.canAccess('servers', 'full'));

  // Modals & UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<PublicServerNode | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Testing connection state (by server id or in modal)
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<TestResult | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    type: ServerType;
    description: string;
    wslDistro: string;
    host: string;
    port: number;
    username: string;
    authType: 'password' | 'key';
    password: string;
    privateKey: string;
  }>({
    name: '',
    type: 'ssh',
    description: '',
    wslDistro: 'Ubuntu',
    host: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKey: '',
  });

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleOpenAdd = () => {
    setEditingServer(null);
    setFormData({
      name: '',
      type: 'ssh',
      description: '',
      wslDistro: 'Ubuntu',
      host: '',
      port: 22,
      username: 'root',
      authType: 'password',
      password: '',
      privateKey: '',
    });
    setModalTestResult(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (server: PublicServerNode) => {
    setEditingServer(server);
    setFormData({
      name: server.name || '',
      type: server.type || 'ssh',
      description: server.description || '',
      wslDistro: server.wslDistro || 'Ubuntu',
      host: server.host || '',
      port: server.port || 22,
      username: server.username || 'root',
      authType: server.authType || 'password',
      password: '',
      privateKey: '',
    });
    setModalTestResult(null);
    setModalOpen(true);
  };

  const handleTestModalConnection = async () => {
    setModalTesting(true);
    setModalTestResult(null);
    try {
      const result = await testConnection(formData);
      setModalTestResult(result);
    } catch (err: any) {
      setModalTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Erro ao testar conexão',
      });
    } finally {
      setModalTesting(false);
    }
  };

  const handleTestCardConnection = async (server: PublicServerNode) => {
    setTestingId(server.id);
    try {
      const result = await testConnection({
        name: server.name,
        type: server.type,
        wslDistro: server.wslDistro,
        host: server.host,
        port: server.port,
        username: server.username,
        authType: server.authType,
      });
      setTestResults((prev) => ({ ...prev, [server.id]: result }));
      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: `Conexão com ${server.name} testada com sucesso! (${result.distro || 'Online'})`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: `Falha na conexão com ${server.name}: ${result.message}`,
        });
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [server.id]: {
          success: false,
          message: err.response?.data?.message || err.message || 'Erro ao conectar',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSwitchActive = async (server: PublicServerNode) => {
    if (server.id === activeServer?.id) return;
    const ok = await setActiveServer(server.id);
    if (ok) {
      setActionFeedback({
        type: 'success',
        message: `Servidor ativo alterado para "${server.name}"! Todas as operações agora serão executadas nele.`,
      });
      // Clear previous test results cache
      setTestResults({});
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServer) {
        await updateServer(editingServer.id, formData);
        setActionFeedback({
          type: 'success',
          message: `Servidor "${formData.name}" atualizado com sucesso!`,
        });
      } else {
        const created = await addServer(formData);
        setActionFeedback({
          type: 'success',
          message: `Novo servidor "${created.name}" adicionado com sucesso!`,
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Erro ao salvar servidor',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteServer(id);
    setDeleteConfirmId(null);
    if (ok) {
      setActionFeedback({
        type: 'info',
        message: 'Servidor removido da configuração.',
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between transition-all shadow-xl ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : actionFeedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : actionFeedback.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{actionFeedback.message}</p>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Servidores & Ambientes</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Alterne entre o ambiente WSL2 local e servidores Linux remotos (VPS, Dedicados ou Nuvem) via SSH.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchServers()}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-xs py-2 px-3.5"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Atualizar</span>
          </button>
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-lg shadow-brand-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Servidor</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Server Hero Banner */}
      {activeServer && (
        <div className="relative overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-950/40 via-[#0e111a] to-indigo-950/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/30 ring-2 ring-white/20 shrink-0">
                {activeServer.type === 'wsl' ? (
                  <Server className="w-7 h-7" />
                ) : activeServer.type === 'ssh' ? (
                  <Globe className="w-7 h-7" />
                ) : (
                  <Cpu className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl font-bold text-white tracking-tight">{activeServer.name}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Servidor Ativo
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] text-slate-300 border border-white/[0.08] uppercase tracking-wider">
                    {activeServer.type === 'wsl'
                      ? 'WSL 2 Local'
                      : activeServer.type === 'ssh'
                      ? 'SSH Remoto'
                      : 'Linux Nativo'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {activeServer.description ||
                    (activeServer.type === 'wsl'
                      ? `Distribuição Linux: ${activeServer.wslDistro || 'Ubuntu'}`
                      : `Conexão SSH: ${activeServer.username || 'root'}@${activeServer.host || '127.0.0.1'}:${activeServer.port || 22}`)}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/[0.06]">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                    <span>Todas as telas (Dashboard, Terminal, Apps, Arquivos) estão conectadas a este servidor.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
              <button
                onClick={() => handleTestCardConnection(activeServer)}
                disabled={testingId === activeServer.id}
                className="btn-secondary text-xs py-2 px-4 flex items-center gap-2"
              >
                <Zap className={`w-3.5 h-3.5 ${testingId === activeServer.id ? 'animate-bounce text-amber-400' : 'text-amber-400'}`} />
                <span>{testingId === activeServer.id ? 'Testando Conexão...' : 'Testar Conexão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Servidores Configurados</span>
            <span className="px-2 py-0.5 rounded-lg text-xs bg-white/[0.06] text-slate-400 font-mono">
              {servers.length}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {servers.map((server) => {
            const isActive = server.id === activeServer?.id;
            const test = testResults[server.id];

            return (
              <div
                key={server.id}
                className={`relative rounded-2xl border p-5.5 transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? 'bg-brand-950/20 border-brand-500/40 shadow-xl shadow-brand-950/40 ring-1 ring-brand-500/20'
                    : 'bg-[#0f121d]/70 border-white/[0.06] hover:border-white/15 hover:bg-[#121624]'
                }`}
              >
                <div>
                  {/* Top Row: Icon + Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-md ${
                          isActive
                            ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                            : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        {server.type === 'wsl' ? (
                          <Server className="w-5 h-5" />
                        ) : server.type === 'ssh' ? (
                          <Globe className="w-5 h-5" />
                        ) : (
                          <Cpu className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-base leading-snug tracking-tight">
                          {server.name}
                        </h3>
                        <span className="text-xs text-slate-400 font-mono">
                          {server.type === 'wsl'
                            ? `WSL · ${server.wslDistro || 'Ubuntu'}`
                            : server.type === 'ssh'
                            ? `${server.username || 'root'}@${server.host || '127.0.0.1'}:${server.port || 22}`
                            : 'Linux Nativo'}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.04] text-slate-400 border border-white/[0.06] uppercase shrink-0">
                        {server.type}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {server.description && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                      {server.description}
                    </p>
                  )}

                  {/* Details Meta */}
                  <div className="bg-black/25 rounded-xl p-3 border border-white/[0.04] space-y-2 mb-4 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-slate-500">Tipo:</span>
                      <span className="text-slate-300 uppercase">
                        {server.type === 'wsl' ? 'WSL 2' : server.type === 'ssh' ? 'SSH 2' : 'Nativo'}
                      </span>
                    </div>

                    {server.type === 'ssh' && (
                      <>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-slate-500">Host:</span>
                          <span className="text-indigo-300 font-medium">{server.host}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-slate-500">Autenticação:</span>
                          <span className="text-slate-300">
                            {server.authType === 'key' ? '🔑 Chave SSH' : '🔒 Senha'}
                          </span>
                        </div>
                      </>
                    )}

                    {server.type === 'wsl' && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-slate-500">Distro:</span>
                        <span className="text-brand-300">{server.wslDistro || 'Ubuntu'}</span>
                      </div>
                    )}
                  </div>

                  {/* Test Result Live Badge */}
                  {test && (
                    <div
                      className={`p-3 rounded-xl border text-xs mb-4 ${
                        test.success
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {test.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span>{test.success ? 'Conexão Estabelecida' : 'Falha no Teste'}</span>
                      </div>
                      {test.distro && <div className="mt-1 text-[11px] opacity-90">Distro: {test.distro}</div>}
                      {test.uptime && <div className="text-[11px] opacity-80">Uptime: {test.uptime}</div>}
                      {!test.success && <div className="mt-1 text-[11px] break-words">{test.message}</div>}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="border-t border-white/[0.06] pt-4 mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {!isActive && (
                      <button
                        onClick={() => handleSwitchActive(server)}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Tornar Ativo
                      </button>
                    )}
                    <button
                      onClick={() => handleTestCardConnection(server)}
                      disabled={testingId === server.id}
                      className="btn-secondary text-xs py-1.5 px-2.5 text-slate-300"
                      title="Testar Conexão"
                    >
                      {testingId === server.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </button>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(server)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title="Editar Configuração"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!server.isDefault && (
                        <button
                          onClick={() => setDeleteConfirmId(server.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Excluir Servidor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Informational Guidance */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e16]/60 p-5 text-xs text-slate-400 leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Info className="w-4 h-4 text-brand-400" />
          <span>Como funciona a troca de servidores no VPS Kesh</span>
        </div>
        <p>
          • <strong>WSL 2 (Local)</strong>: Utiliza o subsistema Linux integrado do Windows diretamente pelo <code className="text-brand-300 font-mono">wsl.exe</code>.
        </p>
        <p>
          • <strong>Servidor Remoto Linux (SSH / VPS)</strong>: Conecta-se de forma nativa e segura através do protocolo SSH2. Quando você define um servidor SSH como ativo, comandos, terminal web interativo, telemetria de CPU/RAM, catálogo de aplicativos e gerenciamento de arquivos operam diretamente na máquina remota.
        </p>
        <p>
          • <strong>Linux Nativo</strong>: Caso você instale este painel diretamente em uma máquina Linux física ou máquina virtual no futuro, o backend executará comandos nativos sem precisar de emulação.
        </p>
      </div>

      {/* Modal: Adicionar / Editar Servidor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d101a] p-6 md:p-8 shadow-2xl text-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingServer ? 'Editar Servidor' : 'Adicionar Novo Servidor'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure as credenciais e parâmetros de conexão do nó
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.06]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Server Type Selector Tabs */}
              <div>
                <label className="label mb-2">Tipo de Conexão do Servidor</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: 'ssh' }))}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.type === 'ssh'
                        ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg ring-1 ring-brand-500/30'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                    <div className="text-xs font-semibold">SSH (Remoto)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">VPS / Nuvem</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: 'wsl' }))}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.type === 'wsl'
                        ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg ring-1 ring-brand-500/30'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Server className="w-4 h-4 mx-auto mb-1 text-brand-400" />
                    <div className="text-xs font-semibold">WSL 2</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Local Windows</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: 'local' }))}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      formData.type === 'local'
                        ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg ring-1 ring-brand-500/30'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cpu className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    <div className="text-xs font-semibold">Linux Nativo</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Host Direto</div>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">Nome Identificador</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: VPS Produção Ubuntu, Servidor Dedicado, WSL Dev"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* WSL Specific */}
              {formData.type === 'wsl' && (
                <div>
                  <label className="label">Nome da Distribuição WSL</label>
                  <input
                    type="text"
                    required
                    placeholder="Ubuntu, Debian, etc."
                    className="input font-mono text-xs"
                    value={formData.wslDistro}
                    onChange={(e) => setFormData({ ...formData, wslDistro: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Execute <code className="text-brand-300">wsl -l -v</code> no PowerShell para verificar o nome.
                  </p>
                </div>
              )}

              {/* SSH Specific Fields */}
              {formData.type === 'ssh' && (
                <div className="space-y-4 rounded-2xl bg-black/20 p-4 border border-white/[0.05]">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="label">Host / Endereço IP</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 192.168.1.100 ou vps.dominio.com"
                        className="input font-mono text-xs"
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label">Porta SSH</label>
                      <input
                        type="number"
                        required
                        placeholder="22"
                        className="input font-mono text-xs"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Usuário SSH</label>
                      <input
                        type="text"
                        required
                        placeholder="root, ubuntu, debian"
                        className="input font-mono text-xs"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label">Tipo de Autenticação</label>
                      <select
                        className="input text-xs"
                        value={formData.authType}
                        onChange={(e) =>
                          setFormData({ ...formData, authType: e.target.value as 'password' | 'key' })
                        }
                      >
                        <option value="password">Senha</option>
                        <option value="key">Chave SSH Privada</option>
                      </select>
                    </div>
                  </div>

                  {formData.authType === 'password' ? (
                    <div>
                      <label className="label">
                        Senha SSH {editingServer?.hasPassword && '(Deixe em branco para manter a atual)'}
                      </label>
                      <input
                        type="password"
                        placeholder={editingServer?.hasPassword ? '••••••••' : 'Digite a senha do servidor'}
                        className="input"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="label">
                        Chave Privada SSH (PEM / OpenSSH RSA/ED25519){' '}
                        {editingServer?.hasPrivateKey && '(Deixe em branco para manter a atual)'}
                      </label>
                      <textarea
                        rows={4}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                        className="input font-mono text-[11px] leading-tight"
                        value={formData.privateKey}
                        onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="label">Descrição / Observações (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Servidor de banco de dados na Hetzner"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Modal Test Result */}
              {modalTestResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs ${
                    modalTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {modalTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{modalTestResult.message}</span>
                  </div>
                  {modalTestResult.distro && (
                    <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] opacity-90">
                      <div>Sistema: {modalTestResult.distro}</div>
                      <div>Kernel: {modalTestResult.kernel}</div>
                      <div>Uptime: {modalTestResult.uptime}</div>
                      <div>Latência: {modalTestResult.executionTimeMs}ms</div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
                <button
                  type="button"
                  onClick={handleTestModalConnection}
                  disabled={modalTesting || (formData.type === 'ssh' && !formData.host)}
                  className="btn-secondary w-full sm:w-auto text-xs py-2 px-4 flex items-center justify-center gap-2"
                >
                  <Zap className={`w-3.5 h-3.5 ${modalTesting ? 'animate-bounce text-amber-400' : 'text-amber-400'}`} />
                  <span>{modalTesting ? 'Testando Conexão...' : 'Testar Conexão'}</span>
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-ghost text-xs py-2 px-4"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary text-xs py-2 px-5 shadow-lg shadow-brand-600/30"
                  >
                    {editingServer ? 'Salvar Alterações' : 'Adicionar Servidor'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0e111a] p-6 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Remover Servidor?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Tem certeza que deseja remover as credenciais e configuração deste servidor? Se ele estiver ativo, outro servidor padrão será selecionado.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-ghost text-xs py-2 px-4"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="btn-danger text-xs py-2 px-4"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
