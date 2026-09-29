import React, { useState } from 'react';
import { toast } from 'sonner';
import { UserIcon, LockIcon, MonitorIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Field, inputClass, errorInputClass } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { admins, loginHistory } from '../data/admins';
import { formatDateTime, formatRelative } from '../utils/format';
import { delay } from '../utils/async';
import { cn } from '../utils/cn';

export function Account() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    await delay(600);
    updateUser({ name, email, phone });
    setSavingProfile(false);
    toast.success('Profile updated');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!currentPw) errs.currentPw = 'Enter your current password';
    if (newPw.length < 8) errs.newPw = 'New password must be at least 8 characters';
    if (newPw !== confirmPw) errs.confirmPw = "Passwords don't match";
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingPw(true);
    await delay(800);
    setSavingPw(false);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    toast.success('Password changed', { description: 'All other sessions have been signed out.' });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Account" description="Manage your administrator profile and security settings" />

      <div className="space-y-6">
        {/* Profile */}
        <Panel title="Profile information" description="Your public name and contact details">
          <form onSubmit={handleProfileSave} noValidate className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
                {name.split(' ').map(p => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="font-semibold text-fg">{user?.name}</p>
                <p className="text-sm text-fg-muted">{user?.role}</p>
                <StatusBadge status="Active" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name" htmlFor="acc-name" className="col-span-2 sm:col-span-1">
                <input id="acc-name" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Email address" htmlFor="acc-email" className="col-span-2 sm:col-span-1">
                <input id="acc-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Phone number" htmlFor="acc-phone" className="col-span-2 sm:col-span-1">
                <input id="acc-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Role" htmlFor="acc-role" hint="Contact a Super Admin to change your role" className="col-span-2 sm:col-span-1">
                <input id="acc-role" value={user?.role ?? ''} disabled className={cn(inputClass, 'bg-canvas text-fg-muted')} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>Save profile</Button>
            </div>
          </form>
        </Panel>

        {/* Change password */}
        <Panel title="Change password">
          <form onSubmit={handlePasswordChange} noValidate className="space-y-4 px-5 py-4">
            <Field label="Current password" htmlFor="pw-current" error={pwErrors.currentPw}>
              <div className="relative">
                <input id="pw-current" type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  className={cn(inputClass, 'pr-11', pwErrors.currentPw && errorInputClass)} />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-fg-subtle hover:bg-canvas hover:text-fg">
                  {showPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="New password" htmlFor="pw-new" error={pwErrors.newPw}>
                <input id="pw-new" type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                  className={cn(inputClass, pwErrors.newPw && errorInputClass)} />
              </Field>
              <Field label="Confirm new password" htmlFor="pw-confirm" error={pwErrors.confirmPw}>
                <input id="pw-confirm" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  className={cn(inputClass, pwErrors.confirmPw && errorInputClass)} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingPw} icon={<LockIcon className="h-4 w-4" />}>Change password</Button>
            </div>
          </form>
        </Panel>

        {/* Admin team */}
        <Panel title="Admin team" description="All administrators with system access">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-fg-muted">
                <th className="px-5 py-2.5 font-medium">Admin</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-canvas transition-colors duration-150">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600/10 text-xs font-semibold text-primary-700">
                        {a.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-fg">{a.name}</p>
                        <p className="text-xs text-fg-muted">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{a.role}</td>
                  <td className="px-3 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-3 py-3 text-xs text-fg-subtle">{a.lastActive ? formatRelative(a.lastActive) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Login history */}
        <Panel title="Recent login activity">
          <div className="divide-y divide-line px-5">
            {loginHistory.map(lh => (
              <div key={lh.id} className="flex items-center gap-3 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
                  <MonitorIcon className="h-4 w-4 text-fg-muted" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">{lh.device}</p>
                  <p className="text-xs text-fg-muted">{lh.location} · {formatDateTime(lh.at)}</p>
                </div>
                {lh.current && (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    Current session
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
