import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, MailCheckIcon, MailIcon } from 'lucide-react';
import { AuthShell } from '../../components/auth/AuthShell';
import { Field, inputClass, errorInputClass } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { delay } from '../../utils/async';
import { cn } from '../../utils/cn';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setStatus('loading');
    await delay(1000);
    setStatus('sent');
    setCooldown(30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return setError('Enter the email linked to your admin account');
    if (!/^\S+@\S+\.\S+$/.test(value)) return setError('Enter a valid email address');
    setError(undefined);
    await send();
  };

  if (status === 'sent') {
    return (
      <AuthShell>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <MailCheckIcon className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          If an administrator account exists for{' '}
          <span className="font-medium text-fg">{email.trim()}</span>, we've sent a password reset link. It expires in 30 minutes.
        </p>
        <div className="mt-6 space-y-2.5">
          <Button size="lg" className="w-full" onClick={() => navigate('/reset-password?token=demo-7f3a')}>
            Open reset link (prototype)
          </Button>
          <Button variant="secondary" size="lg" className="w-full" disabled={cooldown > 0} onClick={send}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-fg-muted">
          <Link to="/login" className="font-medium text-primary-600 hover:underline">← Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <MailIcon className="h-5 w-5" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">Reset your password</h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        Enter your admin email address and we'll send you a link to reset your password.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
        <Field label="Email address" htmlFor="fp-email" required error={error}>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(undefined); }}
            placeholder="admin@ororuta.ph"
            className={cn(inputClass, error && errorInputClass)}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={status === 'loading'}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-fg-muted">
        <Link to="/login" className="flex items-center justify-center gap-1 font-medium text-primary-600 hover:underline">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}