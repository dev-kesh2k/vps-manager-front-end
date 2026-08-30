import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Server, Loader2, ShieldCheck, Lock, User, Eye, EyeOff, Terminal, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      login({
        token: data.token,
        user: data.user,
        id: data.id || '',
        role: data.role || 'viewer',
        permissions: data.permissions || [],
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciais inválidas. Verifique seu usuário e senha do Linux/WSL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090d] text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-2xl shadow-indigo-600/40 ring-1 ring-white/20">
            <Server className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Kesh VPS Engine
              </h1>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Autentique-se com sua conta Linux para gerenciar o servidor
            </p>
          </div>
        </div>

        {/* Login Glass Card */}
        <div className="card p-7 sm:p-8 space-y-5 border-white/[0.09] shadow-2xl bg-[#0e111a]/90 backdrop-blur-2xl">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="label">Usuário do Sistema</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="ex: jefer, ubuntu, root"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label">Senha do Linux (sudo)</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium leading-relaxed animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm justify-center font-semibold mt-2 shadow-lg shadow-indigo-950/70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando no host...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-white/[0.06] flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              Credenciais autenticadas via Linux PAM. A sessão é isolada e autorizada para comandos com <code className="text-brand-300 font-mono">sudo</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
