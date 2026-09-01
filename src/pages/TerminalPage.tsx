import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, RefreshCcw, Wifi, WifiOff, Server } from 'lucide-react';
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
      fontSize: window.innerWidth < 640 ? 12 : 13,
      lineHeight: 1.3,
      theme: {
        background: '#1d1f20',
        foreground: '#e8e8e8',
        cursor: '#0051c3',
        cursorAccent: '#1d1f20',
        selectionBackground: 'rgba(0, 81, 195, 0.35)',
        black: '#1d1f20',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e8e8e8',
        brightBlack: '#808487',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
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

    term.writeln('\x1b[1;38;2;0;81;195m⟡ Central Apps Hub - Terminal Web Interativo\x1b[0m');
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
    window.visualViewport?.addEventListener('resize', onResize);

    connect();

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
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
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-white p-3 sm:p-6' : ''} space-y-4`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1f20] flex items-center gap-2.5">
            <span>Terminal Interativo</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#4c4f52] border border-[#e5e6e8] font-mono">
              /bin/bash
            </span>
          </h1>
          <p className="text-sm text-[#4c4f52] mt-1 hidden sm:block">
            Console SSH nativo em tempo real executando dentro do host WSL Ubuntu
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-white border border-[#e5e6e8] font-medium">
            {status === 'open' && <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            {status === 'connecting' && <Wifi className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
            {(status === 'closed' || status === 'error') && <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
            <span
              className={
                status === 'open'
                  ? 'text-emerald-600 font-semibold'
                  : status === 'connecting'
                  ? 'text-amber-600'
                  : 'text-rose-600'
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
      <div className="terminal-wrapper card overflow-hidden border-[#e5e6e8] bg-white">
        {/* Terminal Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e6e8] bg-white">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f43f5e] shadow-sm shadow-rose-500/50" />
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-sm shadow-amber-500/50" />
            <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-sm shadow-emerald-500/50" />
            <span className="ml-3 text-xs text-[#4c4f52] font-mono flex items-center gap-1.5 truncate">
              <Server className="w-3.5 h-3.5 text-[#0051c3] shrink-0" />
              <span className="truncate">ubuntu@wsl-host</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#808487] hidden sm:inline">
            xterm.js • VT100
          </span>
        </div>

        {/* Terminal Screen Body */}
        <div
          ref={containerRef}
          className={`${
            fullscreen ? 'h-[calc(100dvh-11rem)] sm:h-[calc(100vh-160px)]' : 'h-[50vh] sm:h-[65vh]'
          } bg-[#1d1f20] p-2`}
        />
      </div>
    </div>
  );
}
