import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, ScreenKey } from './store/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TerminalPage from './pages/TerminalPage';
import ServicesPage from './pages/ServicesPage';
import FilesPage from './pages/FilesPage';
import LogsPage from './pages/LogsPage';
import CommandPage from './pages/CommandPage';
import UsersPage from './pages/UsersPage';
import ServersPage from './pages/ServersPage';
import AppsInstalledPage from './pages/AppsInstalledPage';
import AppsInstallPage from './pages/AppsInstallPage';
import WebsitesPage from './pages/WebsitesPage';
import AplicacoesPage from './pages/AplicacoesPage';
import AppLayout from './layouts/AppLayout';
import { Lock, ShieldAlert } from 'lucide-react';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function RedirectIfAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function RequireScreen({
  screen,
  level = 'read',
  children,
}: {
  screen: ScreenKey;
  level?: 'read' | 'full';
  children: JSX.Element;
}) {
  const can = useAuthStore((s) => s.canAccess);
  const user = useAuthStore((s) => s.user);
  if (!can(screen, level)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-xl font-semibold mb-1">Acesso negado</h2>
        <p className="text-sm text-[#4c4f52] max-w-md">
          Você está logado como <span className="font-medium text-[#1d1f20]">{user}</span> mas não tem
          permissão necessária para acessar esta tela
          {level === 'full' && (
            <>
              {' '}
              em nível <span className="font-medium text-amber-700">Escrita / Acesso Geral</span>
            </>
          )}
          .
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e5e6e8] bg-white text-xs text-[#4c4f52]">
          <Lock className="w-3 h-3" />
          Tela: <code className="font-mono">{screen}</code> · Nível requerido: {level}
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <LoginPage />
          </RedirectIfAuth>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequireScreen screen="dashboard">
              <DashboardPage />
            </RequireScreen>
          }
        />
        <Route
          path="/terminal"
          element={
            <RequireScreen screen="terminal" level="full">
              <TerminalPage />
            </RequireScreen>
          }
        />
        <Route
          path="/command"
          element={
            <RequireScreen screen="command" level="full">
              <CommandPage />
            </RequireScreen>
          }
        />
        <Route
          path="/services"
          element={
            <RequireScreen screen="services">
              <ServicesPage />
            </RequireScreen>
          }
        />
        <Route
          path="/files"
          element={
            <RequireScreen screen="files">
              <FilesPage />
            </RequireScreen>
          }
        />
        <Route
          path="/logs"
          element={
            <RequireScreen screen="logs">
              <LogsPage />
            </RequireScreen>
          }
        />
        <Route
          path="/apps/installed"
          element={
            <RequireScreen screen="appsInstalled">
              <AppsInstalledPage />
            </RequireScreen>
          }
        />
        <Route
          path="/apps/install"
          element={
            <RequireScreen screen="appsInstall">
              <AppsInstallPage />
            </RequireScreen>
          }
        />
        <Route
          path="/aplicacoes"
          element={
            <RequireScreen screen="aplicacoes">
              <AplicacoesPage />
            </RequireScreen>
          }
        />
        <Route
          path="/websites"
          element={
            <RequireScreen screen="websites">
              <WebsitesPage />
            </RequireScreen>
          }
        />
        <Route
          path="/users"
          element={
            <RequireScreen screen="users" level="full">
              <UsersPage />
            </RequireScreen>
          }
        />
        <Route
          path="/servers"
          element={
            <RequireScreen screen="servers">
              <ServersPage />
            </RequireScreen>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
