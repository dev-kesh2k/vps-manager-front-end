import { useEffect, useState } from 'react';
import { FolderOpen, FileText, ChevronRight, ArrowLeft, Loader2, RefreshCw, Folder, File, Copy, Check, X, Sparkles, HardDrive } from 'lucide-react';
import api from '../lib/api';

interface FileEntry {
  perms: string;
  links: string;
  owner: string;
  group: string;
  size: string;
  date: string;
  name: string;
}

const QUICK_PATHS = [
  { label: '/hub-apps', path: '/hub-apps' },
  { label: '/opt', path: '/opt' },
  { label: '/etc/nginx', path: '/etc/nginx' },
  { label: '/var/www', path: '/var/www' },
  { label: '/home', path: '/home' },
  { label: '/', path: '/' },
];

export default function FilesPage() {
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ path: string; content: string; truncated: boolean; totalLines: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async (target?: string) => {
    const finalPath = target ?? path;
    setLoading(true);
    try {
      const { data } = await api.get('/files', { params: { path: finalPath } });
      setFiles(data.files || []);
      if (target !== undefined) {
        setHistory((h) => [...h, target]);
        setPath(target);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('/');
  }, []);

  const goBack = () => {
    const next = path === '/' ? null : path.split('/').slice(0, -1).join('/') || '/';
    if (next === null) return;
    setHistory((h) => h.slice(0, -1));
    setPath(next);
    load(next);
  };

  const click = (entry: FileEntry) => {
    if (!entry.name) return;
    const isDir = entry.perms?.startsWith('d') || entry.name === '..';
    const target = isDir
      ? entry.name === '..'
        ? (path.split('/').slice(0, -1).join('/') || '/')
        : (path === '/' ? '/' + entry.name : path + '/' + entry.name)
      : entry.name;

    if (isDir) {
      load(target);
    } else {
      openFile(target);
    }
  };

  const openFile = async (filePath: string) => {
    const fullPath = filePath.startsWith('/') ? filePath : (path === '/' ? '/' + filePath : path + '/' + filePath);
    setViewer({ path: fullPath, content: 'Carregando conteúdo do arquivo...', truncated: false, totalLines: 0 });
    try {
      const { data } = await api.post('/files/read', { path: fullPath });
      setViewer(data);
    } catch (err: any) {
      setViewer({ path: fullPath, content: 'ERRO AO ABRIR: ' + (err.response?.data?.error || err.message), truncated: false, totalLines: 0 });
    }
  };

  const breadcrumbs = path === '/' ? [''] : path.split('/').filter(Boolean);

  const copyContent = () => {
    if (!viewer) return;
    navigator.clipboard.writeText(viewer.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Gerenciador de Arquivos</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
              Filesystem
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Navegue pelos diretórios, visualize arquivos de configuração e scripts no host
          </p>
        </div>

        <button className="btn-secondary text-xs px-3.5 py-2.5" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Atualizar Pasta</span>
        </button>
      </div>

      {/* Quick Shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1">
          Atalhos:
        </span>
        {QUICK_PATHS.map((qp) => (
          <button
            key={qp.path}
            onClick={() => load(qp.path)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
              path === qp.path
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]'
            }`}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Explorer Box */}
      <div className="card p-5 space-y-4">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="btn-secondary !p-2"
            onClick={goBack}
            disabled={path === '/'}
            title="Pasta Anterior"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs bg-[#08090d] rounded-xl px-3.5 py-2 border border-white/[0.08] flex-1 overflow-x-auto font-mono whitespace-nowrap">
            <span
              className="text-slate-400 hover:text-white cursor-pointer flex items-center gap-1"
              onClick={() => load('/')}
            >
              <HardDrive className="w-3.5 h-3.5 text-brand-400" />
              <span>/</span>
            </span>

            {breadcrumbs.length > 0 &&
              breadcrumbs.map((seg, i) => {
                const sub = '/' + breadcrumbs.slice(0, i + 1).join('/');
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={sub} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span
                      className={`cursor-pointer hover:underline ${
                        isLast ? 'text-brand-300 font-semibold' : 'text-slate-300 hover:text-white'
                      }`}
                      onClick={() => load(sub)}
                    >
                      {seg}
                    </span>
                  </span>
                );
              })}
          </div>
        </div>

        {/* Directory Items List */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-400" />
            <div className="text-xs">Lendo arquivos do sistema...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {files.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3 py-12 text-center text-slate-500 text-xs">
                (Diretório vazio)
              </div>
            )}

            {files.map((f, idx) => {
              const isDir = f.perms?.startsWith('d');
              return (
                <button
                  key={idx + f.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.12] text-left transition-all group active:scale-[0.99]"
                  onClick={() => click(f)}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                      isDir
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {isDir ? <Folder className="w-5 h-5" /> : <File className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-xs text-slate-200 group-hover:text-white">
                      {f.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-400">{f.perms}</span>
                      {!isDir && <span className="font-mono">{formatSize(f.size)}</span>}
                      {isDir && <span className="text-amber-400/90 font-medium">pasta</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded File Viewer Modal/Card */}
      {viewer && (
        <div className="card overflow-hidden border-white/[0.1] shadow-2xl bg-[#0a0c12] animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2.5 min-w-0 font-mono text-xs">
              <FileText className="w-4 h-4 text-brand-400 shrink-0" />
              <span className="text-white font-semibold truncate">{viewer.path}</span>
              {viewer.truncated && (
                <span className="badge bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
                  exibindo 2000/{viewer.totalLines} linhas
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="btn-secondary text-xs px-3 py-1.5" onClick={copyContent}>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button className="btn-primary text-xs px-3.5 py-1.5" onClick={() => setViewer(null)}>
                <X className="w-3.5 h-3.5" />
                <span>Fechar</span>
              </button>
            </div>
          </div>

          <pre className="font-mono text-xs p-5 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all text-slate-200 bg-[#06070a] leading-relaxed select-text">
            {viewer.content || '(arquivo vazio)'}
          </pre>
        </div>
      )}
    </div>
  );
}

function formatSize(raw: string): string {
  const n = parseInt(raw);
  if (isNaN(n)) return raw;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}
