import { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Cpu,
  Trash2,
  Edit2,
  ShieldCheck,
  Zap,
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
  const canManageServers = useAuthStore((s) => s.canAccess('servers', 'full'));
  const canManage = role === 'admin' || canManageServers;

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
          className={`p-4 rounded-lg border flex items-center justify-between transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : actionFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-blue-50 border-blue-200 text-[#0051c3]'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : actionFeedback.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-[#0051c3] shrink-0" />
            )}
            <p className="text-sm font-medium">{actionFeedback.message}</p>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#f0f1f2] hover:bg-[#e5e6e8] text-[#1d1f20] font-medium"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] text-[#0051c3]">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20]">Servidores & Ambientes</h1>
          </div>
          <p className="text-sm text-[#4c4f52] mt-1">
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0051c3]' : ''}`} />
            <span>Atualizar</span>
          </button>
          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Servidor</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Server Hero Banner */}
      {activeServer && (
        <div className="bg-white border border-[#e5e6e8] rounded-lg p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-md bg-[#0051c3] flex items-center justify-center text-white shrink-0">
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
                  <span className="text-xl font-bold text-[#1d1f20] tracking-tight">{activeServer.name}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Servidor Ativo
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f6f7f8] text-[#4c4f52] border border-[#e5e6e8] uppercase tracking-wider">
                    {activeServer.type === 'wsl'
                      ? 'WSL 2 Local'
                      : activeServer.type === 'ssh'
                      ? 'SSH Remoto'
                      : 'Linux Nativo'}
                  </span>
                </div>
                <p className="text-sm text-[#808487] mt-1">
                  {activeServer.description ||
                    (activeServer.type === 'wsl'
                      ? `Distribuição Linux: ${activeServer.wslDistro || 'Ubuntu'}`
                      : `Conexão SSH: ${activeServer.username || 'root'}@${activeServer.host || '127.0.0.1'}:${activeServer.port || 22}`)}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-[#4c4f52]">
                  <div className="flex items-center gap-1.5 bg-[#f6f7f8] px-3 py-1.5 rounded-md border border-[#e5e6e8]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0051c3]" />
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
                <Zap className={`w-3.5 h-3.5 ${testingId === activeServer.id ? 'animate-bounce text-amber-600' : 'text-amber-600'}`} />
                <span>{testingId === activeServer.id ? 'Testando Conexão...' : 'Testar Conexão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1d1f20] flex items-center gap-2">
            <span>Servidores Configurados</span>
            <span className="px-2 py-0.5 rounded-lg text-xs bg-[#f6f7f8] text-[#808487] font-mono">
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
                className={`relative rounded-lg border p-5 transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? 'bg-white border-[#0051c3] ring-1 ring-[#0051c3]/15'
                    : 'bg-white border-[#e5e6e8] hover:border-[#c5c6c8]'
                }`}
              >
                <div>
                  {/* Top Row: Icon + Badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-md flex items-center justify-center border ${
                          isActive
                            ? 'bg-blue-50 border-blue-200 text-[#0051c3]'
                            : 'bg-[#f6f7f8] border-[#e5e6e8] text-[#4c4f52]'
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
                        <h3 className="font-semibold text-[#1d1f20] text-base leading-snug tracking-tight">
                          {server.name}
                        </h3>
                        <span className="text-xs text-[#808487] font-mono">
                          {server.type === 'wsl'
                            ? `WSL · ${server.wslDistro || 'Ubuntu'}`
                            : server.type === 'ssh'
                            ? `${server.username || 'root'}@${server.host || '127.0.0.1'}:${server.port || 22}`
                            : 'Linux Nativo'}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f6f7f8] text-[#808487] border border-[#e5e6e8] uppercase shrink-0">
                        {server.type}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {server.description && (
                    <p className="text-xs text-[#808487] mb-4 line-clamp-2 leading-relaxed">
                      {server.description}
                    </p>
                  )}

                  {/* Details Meta */}
                  <div className="bg-[#f6f7f8] rounded-md p-3 border border-[#e5e6e8] space-y-2 mb-4 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#808487]">
                      <span className="text-[#808487]">Tipo:</span>
                      <span className="text-[#4c4f52] uppercase">
                        {server.type === 'wsl' ? 'WSL 2' : server.type === 'ssh' ? 'SSH 2' : 'Nativo'}
                      </span>
                    </div>

                    {server.type === 'ssh' && (
                      <>
                        <div className="flex items-center justify-between text-[#808487]">
                          <span className="text-[#808487]">Host:</span>
                          <span className="text-[#0051c3] font-medium">{server.host}</span>
                        </div>
                        <div className="flex items-center justify-between text-[#808487]">
                          <span className="text-[#808487]">Autenticação:</span>
                          <span className="text-[#4c4f52]">
                            {server.authType === 'key' ? '🔑 Chave SSH' : '🔒 Senha'}
                          </span>
                        </div>
                      </>
                    )}

                    {server.type === 'wsl' && (
                      <div className="flex items-center justify-between text-[#808487]">
                        <span className="text-[#808487]">Distro:</span>
                        <span className="text-[#0051c3]">{server.wslDistro || 'Ubuntu'}</span>
                      </div>
                    )}
                  </div>

                  {/* Test Result Live Badge */}
                  {test && (
                    <div
                      className={`p-3 rounded-md border text-xs mb-4 ${
                        test.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {test.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
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
                <div className="border-t border-[#e5e6e8] pt-4 mt-2 flex items-center justify-between gap-2">
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
                      className="btn-secondary text-xs py-1.5 px-2.5 text-[#4c4f52]"
                      title="Testar Conexão"
                    >
                      {testingId === server.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(server)}
                        className="p-1.5 rounded-lg text-[#808487] hover:text-[#1d1f20] hover:bg-[#f6f7f8] transition-colors"
                        title="Editar Configuração"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!server.isDefault && (
                        <button
                          onClick={() => setDeleteConfirmId(server.id)}
                          className="p-1.5 rounded-lg text-[#808487] hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
      <div className="rounded-lg border border-[#e5e6e8] bg-white p-5 text-xs text-[#808487] leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-semibold text-[#313335]">
          <Info className="w-4 h-4 text-[#0051c3]" />
          <span>Como funciona a troca de servidores no VPS Kesh</span>
        </div>
        <p>
          • <strong>WSL 2 (Local)</strong>: Utiliza o subsistema Linux integrado do Windows diretamente pelo <code className="text-[#0051c3] font-mono">wsl.exe</code>.
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-t-2xl sm:rounded-lg border border-[#e5e6e8] bg-white p-5 sm:p-6 md:p-8 text-[#313335] max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between border-b border-[#e5e6e8] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-[#f0f1f2] border border-[#e5e6e8] text-[#0051c3]">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1d1f20]">
                    {editingServer ? 'Editar Servidor' : 'Adicionar Novo Servidor'}
                  </h3>
                  <p className="text-xs text-[#808487]">
                    Configure as credenciais e parâmetros de conexão do nó
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#808487] hover:text-[#1d1f20] p-2 rounded-xl hover:bg-[#f6f7f8]"
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
                    className={`p-3 rounded-md border text-center transition-all ${
                      formData.type === 'ssh'
                        ? 'bg-blue-50 border-[#0051c3] text-[#1d1f20] ring-1 ring-[#0051c3]/15'
                        : 'bg-white border-[#e5e6e8] text-[#4c4f52] hover:border-[#c5c6c8]'
                    }`}
                  >
                    <Globe className="w-4 h-4 mx-auto mb-1 text-[#0051c3]" />
                    <div className="text-xs font-semibold">SSH (Remoto)</div>
                    <div className="text-[10px] text-[#808487] mt-0.5">VPS / Nuvem</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: 'wsl' }))}
                    className={`p-3 rounded-md border text-center transition-all ${
                      formData.type === 'wsl'
                        ? 'bg-blue-50 border-[#0051c3] text-[#1d1f20] ring-1 ring-[#0051c3]/15'
                        : 'bg-white border-[#e5e6e8] text-[#4c4f52] hover:border-[#c5c6c8]'
                    }`}
                  >
                    <Server className="w-4 h-4 mx-auto mb-1 text-[#0051c3]" />
                    <div className="text-xs font-semibold">WSL 2</div>
                    <div className="text-[10px] text-[#808487] mt-0.5">Local Windows</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((f) => ({ ...f, type: 'local' }))}
                    className={`p-3 rounded-md border text-center transition-all ${
                      formData.type === 'local'
                        ? 'bg-blue-50 border-[#0051c3] text-[#1d1f20] ring-1 ring-[#0051c3]/15'
                        : 'bg-white border-[#e5e6e8] text-[#4c4f52] hover:border-[#c5c6c8]'
                    }`}
                  >
                    <Cpu className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="text-xs font-semibold">Linux Nativo</div>
                    <div className="text-[10px] text-[#808487] mt-0.5">Host Direto</div>
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
                  <p className="text-[11px] text-[#808487] mt-1">
                    Execute <code className="text-[#0051c3]">wsl -l -v</code> no PowerShell para verificar o nome.
                  </p>
                </div>
              )}

              {/* SSH Specific Fields */}
              {formData.type === 'ssh' && (
                <div className="space-y-4 rounded-lg bg-[#f6f7f8] p-4 border border-[#e5e6e8]">
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
                  className={`p-3.5 rounded-lg border text-xs ${
                    modalTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {modalTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[#e5e6e8] pt-5">
                <button
                  type="button"
                  onClick={handleTestModalConnection}
                  disabled={modalTesting || (formData.type === 'ssh' && !formData.host)}
                  className="btn-secondary w-full sm:w-auto text-xs py-2 px-4 flex items-center justify-center gap-2"
                >
                  <Zap className={`w-3.5 h-3.5 ${modalTesting ? 'animate-bounce text-amber-600' : 'text-amber-600'}`} />
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
                    className="btn-primary text-xs py-2 px-5"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1d1f20]/40 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-lg border border-rose-200 bg-white p-5 sm:p-6 text-[#313335] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1d1f20]">Remover Servidor?</h3>
            </div>
            <p className="text-sm text-[#808487] mb-6">
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
