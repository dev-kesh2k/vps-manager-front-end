# vps-manager-front-end

Frontend antigo do **Central Apps Hub** (na época, *VPS Manager*): painel web para administrar um servidor Linux.

**Stack:** React 18 + Vite + TypeScript + Tailwind, `react-router-dom`, `zustand` (estado), `axios`, `recharts` (gráficos) e `xterm` (terminal no navegador).

## Páginas
Painel, Servidores, Serviços, Aplicações, Apps instalados, Sites, Arquivos, Logs, Terminal, Comandos e Usuários (`src/pages/`).

## Rodar
```bash
npm install
npm run dev      # Vite em modo desenvolvimento
npm run build    # gera dist/
```
`scripts/_deploy-hub-frontend.sh` publica o `dist/` no Apache do Hub.

> Substituído pelo frontend atual do Hub; mantido como referência.
