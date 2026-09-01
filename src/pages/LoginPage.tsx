import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Server, Loader2, ShieldCheck, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
      setError(
        err.response?.data?.error ||
          'Credenciais inválidas. Use o usuário/senha do Linux no WSL ou AUTH_USERNAME/AUTH_PASSWORD do .env.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#f6f7f8] text-[#1d1f20] relative overflow-hidden">
      {/* Subtle clean background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-lg bg-[#0051c3] flex items-center justify-center">
            <Server className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1d1f20]">
                Central Apps Hub
              </h1>
              <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#f0f1f2] text-[#0051c3] border border-[#e5e6e8]">
                PRO
              </span>
            </div>
            <p className="text-xs text-[#4c4f52] mt-1.5">
              Entre com o usuário e a senha do Linux no WSL
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="card p-5 sm:p-8 space-y-5 border-[#e5e6e8] bg-white">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="label">Usuário do Sistema</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#808487] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <Lock className="w-4 h-4 text-[#808487] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#808487] hover:text-[#1d1f20] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium leading-relaxed animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm justify-center font-semibold mt-2"
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
          <div className="pt-4 border-t border-[#e5e6e8] flex items-start gap-2.5 text-[11px] text-[#4c4f52] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#0051c3] flex-shrink-0 mt-0.5" />
            <span>
              Credenciais autenticadas via Linux PAM. A sessão é isolada e autorizada para comandos com <code className="text-[#0051c3] font-mono bg-blue-50 px-1 py-0.5 rounded">sudo</code>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#808487]">
          Central Apps Hub &copy; {new Date().getFullYear()} • Cloudflare Protected
        </div>
      </div>
    </div>
  );
}
