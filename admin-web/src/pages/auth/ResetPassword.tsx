import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckIcon, CircleCheckIcon, EyeIcon, EyeOffIcon, LinkIcon, XIcon } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { Field, inputClass, errorInputClass } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { delay } from '../../utils/async';
import { cn } from '../../utils/cn';

const rules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
  { label: 'One symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { clearLock } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const passed = rules.filter((r) => r.test(password)).length;
  const strength = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][passed];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (passed < rules.length) next.password = 'Password does not meet all requirements';
    if (!confirm) next.confirm = 'Confirm your new password';
    else if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus('loading');
    await delay(1100);
    clearLock();
    setStatus('done');
  };

  if (!token) {
    return (
      <AuthShell>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <LinkIcon className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Reset link is invalid</h1>
        <p className="mt-2 text-sm text-fg-muted">This link has expired or was already used. Request a new one to continue.</p>
        <Button size="lg" className="mt-6 w-full" onClick={() => navigate('/forgot-password')}>Request a new link</Button>
      </AuthShell>
    );
  }

  if (status === 'done') {
    return (
      <AuthShell>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <CircleCheckIcon className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Password updated</h1>
        <p className="mt-2 text-sm text-fg-muted">Your admin password has been changed and all other sessions were signed out.</p>
        <Button size="lg" className="mt-6 w-full" onClick={() => navigate('/login', { state: { passwordReset: true } })}>
          Continue to sign in
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Set a new password</h1>
      <p className="mt-1.5 text-sm text-fg-muted">Choose a strong password you haven't used before.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field label="New password" htmlFor="new-password" error={errors.password}>
          <div className="relative">
            <input
              id="new-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, 'h-11 pr-11', errors.password && errorInputClass)}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:bg-canvas hover:text-fg"
            >
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <div>
          <div className="flex gap-1" aria-hidden>
            {rules.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-200',
                  i < passed ? (passed <= 2 ? 'bg-warn-500' : 'bg-primary-500') : 'bg-line',
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-fg-muted">Strength: <span className="font-medium text-fg">{password ? strength : '—'}</span></p>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {rules.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-primary-700' : 'text-fg-muted')}>
                  {ok ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5 text-fg-subtle" />}
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Field label="Confirm new password" htmlFor="confirm-password" error={errors.confirm}>
          <input
            id="confirm-password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cn(inputClass, 'h-11', errors.confirm && errorInputClass)}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={status === 'loading'}>
          {status === 'loading' ? 'Updating password…' : 'Update password'}
        </Button>
      </form>

      <Link to="/login" className="mt-6 inline-block text-sm font-medium text-fg-muted hover:text-fg">Cancel and return to sign in</Link>
    </AuthShell>
  );
}

