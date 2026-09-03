import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseConfigError, isSupabaseConfigured, supabase } from '../api/supabaseClient';

function mapSupabaseAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email ou palavra-passe inválidos.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'O email ainda não foi confirmado.';
  }

  if (normalized.includes('too many requests')) {
    return 'Tentativas em excesso. Tenta novamente em alguns minutos.';
  }

  return 'Não foi possível autenticar. Verifica os dados e tenta novamente.';
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      const configError = getSupabaseConfigError();
      console.error('[Auth][Login] Configuração Supabase inválida', {
        error: configError,
        hasUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
        hasAnonKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
      });
      setError('Configuração Supabase inválida. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return;
    }

    if (!email || !password) {
      setError('Preenche o email e a palavra-passe para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Erro de autenticação.';
      console.error('[Auth][Login] Supabase signInWithPassword falhou', {
        email,
        message,
        status: err?.status,
        code: err?.code,
        name: err?.name
      });
      setError(mapSupabaseAuthError(message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(14,116,144,0.22),transparent_55%)]" />
      <div className="relative min-h-screen grid lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between p-10 border-r border-slate-800/70 bg-slate-900/35 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide">FROTA PRO</h1>
              <p className="text-xs text-slate-400">Gestão de Frotas e Telemática</p>
            </div>
          </div>

          <div className="space-y-5 max-w-md">
            <h2 className="text-3xl font-semibold leading-tight">Controlo total da operação com segurança empresarial</h2>
            <p className="text-sm text-slate-300/80">Acede ao dashboard para monitorizar viaturas, combustíveis e dados telemáticos em tempo real.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <InfoCard title="Autenticação" value="Supabase Auth" />
            <InfoCard title="Sessão" value="Persistente" />
            <InfoCard title="Módulos" value="Viaturas + BP" />
            <InfoCard title="Segurança" value="Sem secrets no frontend" />
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/40">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-lg font-semibold">Entrar na Frota Pro</h3>
              <p className="text-xs text-slate-400 mt-1">Autenticação segura com email e palavra-passe</p>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Email</span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="empresa@dominio.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Palavra-passe</span>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Inserir palavra-passe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
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
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white rounded-lg transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                {isLoading ? 'A autenticar...' : 'Entrar'}
              </button>

              {error && (
                <div className="text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="pt-1 text-[11px] text-slate-500">
                Recuperação de palavra-passe: funcionalidade preparada para fase seguinte.
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
    <span className="text-[11px] text-slate-500 block">{title}</span>
    <span className="text-xs font-semibold text-slate-200 mt-1 block">{value}</span>
  </div>
);
