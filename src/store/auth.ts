import { create } from 'zustand';
import api from '../lib/api';

export type ScreenKey =
  | 'dashboard'
  | 'terminal'
  | 'command'
  | 'services'
  | 'files'
  | 'logs'
  | 'appsInstalled'
  | 'users'
  | 'servers'
  | 'websites'
  | 'aplicacoes';

export type AccessLevel = 'read' | 'full';
export type Role = 'admin' | 'operator' | 'viewer';

export interface ScreenPermission {
  screen: ScreenKey;
  level: AccessLevel;
}

interface AuthState {
  token: string | null;
  user: string | null;
  id: string | null;
  role: Role | null;
  permissions: ScreenPermission[];
  permissionsLoaded: boolean;
  login: (payload: {
    token: string;
    user: string;
    id: string;
    role: Role;
    permissions: ScreenPermission[];
  }) => void;
  logout: () => void;
  hydrate: () => void;
  isAuthenticated: boolean;
  canAccess: (screen: ScreenKey, level?: AccessLevel) => boolean;
  refreshMe: () => Promise<void>;
}

function parsePerms(raw: any): ScreenPermission[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p: any) => p && typeof p.screen === 'string' && typeof p.level === 'string')
    .map((p: any) => ({ screen: p.screen as ScreenKey, level: p.level as AccessLevel }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  id: null,
  role: null,
  permissions: [],
  permissionsLoaded: false,
  isAuthenticated: false,
  login: ({ token, user, id, role, permissions }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', user);
    localStorage.setItem('auth_id', id);
    localStorage.setItem('auth_role', role);
    localStorage.setItem('auth_permissions', JSON.stringify(permissions));
    set({
      token,
      user,
      id,
      role,
      permissions,
      isAuthenticated: true,
      permissionsLoaded: false,
    });
    get()
      .refreshMe()
      .catch(() => {})
      .finally(() => set({ permissionsLoaded: true }));
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_id');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_permissions');
    set({
      token: null,
      user: null,
      id: null,
      role: null,
      permissions: [],
      isAuthenticated: false,
      permissionsLoaded: false,
    });
  },
  hydrate: () => {
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      const id = localStorage.getItem('auth_id');
      const role = localStorage.getItem('auth_role') as Role | null;
      const rawPerms = localStorage.getItem('auth_permissions');
      const permissions = parsePerms(rawPerms ? JSON.parse(rawPerms) : []);
      if (token) {
        set({
          token,
          user,
          id,
          role,
          permissions,
          isAuthenticated: true,
          permissionsLoaded: false,
        });
        get()
          .refreshMe()
          .catch(() => {})
          .finally(() => set({ permissionsLoaded: true }));
      }
    } catch {}
  },
  canAccess: (screen, level = 'read') => {
    const { role, permissions, isAuthenticated, permissionsLoaded } = get();
    if (role === 'admin') return true;
    if (isAuthenticated && !permissionsLoaded) return false;
    if (role === null && isAuthenticated) return false;
    const p = permissions.find((x) => x.screen === screen);
    if (!p) return false;
    if (level === 'full') return p.level === 'full';
    return true;
  },
  refreshMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const perms = parsePerms(data.permissions);
      const role = (data.role || 'viewer') as Role;
      localStorage.setItem('auth_role', role);
      localStorage.setItem('auth_permissions', JSON.stringify(perms));
      localStorage.setItem('auth_id', String(data.id || get().id || ''));
      localStorage.setItem('auth_user', String(data.user || get().user || ''));
      set({
        role,
        permissions: perms,
        id: String(data.id || get().id || null),
        user: String(data.user || get().user || null),
      });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) get().logout();
    }
  },
}));
