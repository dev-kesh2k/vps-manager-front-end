import { create } from 'zustand';
import api from '../lib/api';

export type ServerType = 'wsl' | 'ssh' | 'local';

export interface PublicServerNode {
  id: string;
  name: string;
  type: ServerType;
  isDefault?: boolean;
  isActive?: boolean;
  status?: 'online' | 'offline' | 'checking';
  description?: string;
  wslDistro?: string;
  host?: string;
  port?: number;
  username?: string;
  authType?: 'password' | 'key';
  hasPassword?: boolean;
  hasPrivateKey?: boolean;
  createdAt: number;
  lastConnectedAt?: number;
  lastError?: string;
  distro?: string;
  kernel?: string;
  uptime?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  distro?: string;
  kernel?: string;
  uptime?: string;
  executionTimeMs?: number;
}

interface ServerState {
  servers: PublicServerNode[];
  activeServer: PublicServerNode | null;
  loading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  setActiveServer: (id: string) => Promise<boolean>;
  addServer: (data: Partial<PublicServerNode> & { password?: string; privateKey?: string }) => Promise<PublicServerNode>;
  updateServer: (id: string, data: Partial<PublicServerNode> & { password?: string; privateKey?: string }) => Promise<PublicServerNode>;
  deleteServer: (id: string) => Promise<boolean>;
  testConnection: (data: Partial<PublicServerNode> & { password?: string; privateKey?: string }) => Promise<TestResult>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServer: null,
  loading: false,
  error: null,

  fetchServers: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get('/servers');
      const servers: PublicServerNode[] = res.data.servers || [];
      const active = res.data.active || servers.find((s) => s.isActive) || servers[0] || null;
      set({ servers, activeServer: active, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
    }
  },

  setActiveServer: async (id: string) => {
    try {
      set({ loading: true });
      const res = await api.post(`/servers/active/${id}`);
      const updatedActive = res.data.active;
      const servers = get().servers.map((s) => ({
        ...s,
        isActive: s.id === id,
      }));
      set({ servers, activeServer: updatedActive, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      return false;
    }
  },

  addServer: async (data) => {
    set({ loading: true });
    try {
      const res = await api.post('/servers', data);
      await get().fetchServers();
      return res.data.server;
    } finally {
      set({ loading: false });
    }
  },

  updateServer: async (id, data) => {
    set({ loading: true });
    try {
      const res = await api.put(`/servers/${id}`, data);
      await get().fetchServers();
      return res.data.server;
    } finally {
      set({ loading: false });
    }
  },

  deleteServer: async (id) => {
    set({ loading: true });
    try {
      await api.delete(`/servers/${id}`);
      await get().fetchServers();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      return false;
    }
  },

  testConnection: async (data) => {
    const res = await api.post('/servers/test', data);
    return res.data;
  },
}));
