import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EyeIcon, EyeOffIcon, LockIcon, UserIcon, ShieldCheckIcon } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { Field, inputClass, errorInputClass } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { DEMO_CREDENTIALS, useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

type FormError = { kind: 'invalid'; attemptsLeft: number } | { kind: 'locked' };
type LoginState = { from?: string; loggedOut?: boolean; passwordReset?: boolean } | null;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as LoginState;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const id = identifier.trim();
    if (!id) next.identifier = 'Enter your email or username';
    else if (id.includes('@') && !/^\S+@\S+\.\S+$/.test(id)) next.identifier = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    const result = await login(id, password, remember);
    setLoading(false);

    if ('reason' in result) {
      if (result.reason === 'locked') {
        setFormError({ kind: 'locked' });
      } else {
        setFormError({ kind: 'invalid', attemptsLeft: result.attemptsLeft });
        setPassword('');
      }
      return;
    }

    toast.success('Signed in', { description: 'Welcome back to the OroRuta Admin Portal.' });
    navigate(state?.from ?? '/dashboard', { replace: true });
  };

  const fillDemo = () => {
    setIdentifier(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setErrors({});
  };

  const locked = formError?.kind === 'locked';

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">OroRuta Admin Portal</h1>
      <p className="mt-1.5 text-sm text-fg-muted">Sign in to manage routes, stops and commuter updates.</p>

      <div className="mt-6 space-y-3">
        {state?.loggedOut && !formError && (
          <Alert tone="success" title="You've been signed out securely." />
        )}
        {state?.passwordReset && !formError && (
          <Alert tone="success" title="Password updated">Sign in with your new password.</Alert>
        )}
        {state?.from && !state.loggedOut && !formError && (
          <Alert tone="info" title="Please sign in to continue">The admin dashboard requires authentication.</Alert>
        )}
        {formError?.kind === 'invalid' && (
          <Alert tone="error" title="Invalid email or password">
            Check your credentials and try again. {formError.attemptsLeft} attempt{formError.attemptsLeft === 1 ? '' : 's'} left before the account is locked.
          </Alert>
        )}
        {locked && (
          <Alert tone="error" title="Account temporarily locked">
            Too many failed attempts. <Link to="/forgot-password" className="font-medium underline underline-offset-2">Reset your password</Link> to regain access.
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Email or username" htmlFor="identifier" error={errors.identifier}>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@ororuta.ph"
              disabled={loading || locked}
              aria-invalid={!!errors.identifier}
              aria-describedby={errors.identifier ? 'identifier-error' : undefined}
              className={cn(inputClass, 'h-11 pl-10', errors.identifier && errorInputClass)}
            />
          </div>
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading || locked}
              aria-invalid={!!errors.password || formError?.kind === 'invalid'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={cn(inputClass, 'h-11 pl-10 pr-11', (errors.password || formError?.kind === 'invalid') && errorInputClass)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:bg-canvas hover:text-fg"
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-primary-600"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={loading} disabled={locked} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-line bg-canvas px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-fg-muted">
            <p className="font-medium text-fg">Prototype credentials</p>
            <p className="mt-0.5 font-mono">{DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fillDemo} disabled={loading || locked}>Fill in</Button>
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
        <ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Restricted to authorized OroRuta administrators. The public commuter app for Android does not use accounts or sign-in.
      </p>
    </AuthShell>
  );
}

