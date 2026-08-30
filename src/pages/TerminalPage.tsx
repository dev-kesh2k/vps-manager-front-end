import { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Maximize2, Minimize2, RefreshCcw, Wifi, WifiOff, Sparkles, Server } from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useAuthStore } from '../store/auth';

type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export default function TerminalPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);

  const [status, setStatus] = useState<WsStatus>('connecting');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: '#06070a',
        foreground: '#e2e8f0',
        cursor: '#6366f1',
        cursorAccent: '#06070a',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#0d1017',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#cbd5e1',
        brightBlack: '#38435f',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc',
      },
      cursorBlink: true,
      convertEol: true,
      allowProposedApi: true,
      scrollback: 10000,
    });
    termRef.current = term;

    const fit = new FitAddon();
    term.loadAddon(fit);
    fitRef.current = fit;

    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);
    fit.fit();

    term.writeln('\x1b[1;38;2;99;102;241m⟡ Kesh VPS Engine - Terminal Web Interativo\x1b[0m');
    term.writeln('\x1b[90mConectando ao shell WSL via WebSocket seguro...\x1b[0m\r\n');

    const connect = () => {
      setStatus('connecting');
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${window.location.host}/ws/terminal`;
      const ws = new WebSocket(url, [`token-${token}`]);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('open');
        ws.send(
          JSON.stringify({
            type: 'init',
            cols: term.cols,
            rows: term.rows,
          })
        );
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'output') term.write(msg.data);
          else if (msg.type === 'ready') {
            term.clear();
          } else if (msg.type === 'error') {
            term.writeln(`\r\n\x1b[1;31mERRO:\x1b[0m ${msg.message}\r\n`);
          } else if (msg.type === 'exit') {
            term.writeln(`\r\n\x1b[90m[Sessão encerrada com código ${msg.code}]\x1b[0m`);
          }
        } catch {
          term.write(evt.data);
        }
      };

      ws.onerror = () => setStatus('error');
      ws.onclose = () => {
        setStatus('closed');
        term.writeln('\r\n\x1b[90m[Conexão WebSocket encerrada. Clique no botão de reconectar.]\x1b[0m');
      };
    };

    const onData = (data: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    };
    const onResize = () => {
      try {
        fitRef.current?.fit();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows })
          );
        }
      } catch {}
    };

    term.onData(onData);
    window.addEventListener('resize', onResize);

    connect();

    return () => {
      window.removeEventListener('resize', onResize);
      try { wsRef.current?.close(); } catch {}
      try { term.dispose(); } catch {}
    };
  }, [token]);

  const reconnect = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }
    setTimeout(() => window.location.reload(), 200);
  };

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-[#08090d] p-6' : ''} space-y-4`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>Terminal Interativo</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30 font-mono">
              /bin/bash
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Console SSH nativo em tempo real executando dentro do host WSL Ubuntu
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] font-medium">
            {status === 'open' && <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            {status === 'connecting' && <Wifi className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
            {(status === 'closed' || status === 'error') && <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span
              className={
                status === 'open'
                  ? 'text-emerald-400 font-semibold'
                  : status === 'connecting'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {status === 'open'
                ? 'Conectado (WS)'
                : status === 'connecting'
                ? 'Conectando...'
                : status === 'closed'
                ? 'Desconectado'
                : 'Erro de Conexão'}
            </span>
          </span>

          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={reconnect}
            title="Reconectar Terminal"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reconectar</span>
          </button>

          <button
            className="btn-secondary text-xs px-3 py-2"
            onClick={() => setFullscreen((v) => !v)}
            title="Alternar Tela Cheia"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{fullscreen ? 'Restaurar' : 'Tela Cheia'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Container Frame */}
      <div className="terminal-wrapper card overflow-hidden shadow-2xl border-white/[0.1] bg-[#06070a]">
        {/* Terminal Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0e111a]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f43f5e] shadow-sm shadow-rose-500/50" />
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-sm shadow-amber-500/50" />
            <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-sm shadow-emerald-500/50" />
            <span className="ml-3 text-xs text-slate-300 font-mono flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-brand-400" />
              <span>ubuntu@wsl-host: ~</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            xterm.js • VT100
          </span>
        </div>

        {/* Terminal Screen Body */}
        <div
          ref={containerRef}
          className={`${
            fullscreen ? 'h-[calc(100vh-160px)]' : 'h-[65vh]'
          } bg-[#06070a] p-2`}
        />
      </div>
    </div>
  );
}
