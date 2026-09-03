import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';

export const MotoristaLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (session) {
      navigate('/motorista/painel', { replace: true });
    }
  }, [session, navigate]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Preenche o email e a palavra-passe do motorista.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signInError } = await (await import('../../api/supabaseClient')).supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      navigate('/motorista/painel', { replace: true });
    } catch (err: any) {
      console.error('[Motorista][Login] Falha no login', err);
      setError(err?.message || 'Não foi possível autenticar o motorista.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071b2e] text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(14,116,144,0.22),transparent_48%)]" />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-slate-950/50">
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
            <div className="text-xs font-semibold text-cyan-300 uppercase tracking-[0.18em]">AlgarTempo</div>
            <h1 className="mt-2 text-2xl font-semibold">Motorista</h1>
            <p className="mt-1 text-xs text-slate-400">Acesso ao cartão de abastecimento</p>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="motorista@dominio.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-400">Palavra-passe</span>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Inserir palavra-passe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white rounded-lg transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {isLoading ? 'A autenticar...' : 'Entrar'}
            </button>

            {error && (
              <div className="text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
