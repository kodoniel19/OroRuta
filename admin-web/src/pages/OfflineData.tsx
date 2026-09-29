import React, { useState } from 'react';
import { DatabaseIcon, UploadIcon, CheckCircleIcon, ClockIcon, PackageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useData } from '../contexts/DataContext';
import { offlineDatasets, deviceAdoption } from '../data/offline';
import { formatDateTime, formatRelative } from '../utils/format';
import { cn } from '../utils/cn';

function AdoptionBar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 text-fg-muted">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-canvas">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-fg">{pct}%</span>
    </div>
  );
}

export function OfflineData() {
  const { bundles, setBundles } = useData();
  const [publishing, setPublishing] = useState(false);

  const live = bundles.find(b => b.status === 'Published');

  const handlePublish = async () => {
    setPublishing(true);
    await new Promise(r => setTimeout(r, 1800));
    const nextVersion = (() => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const existing = bundles.filter(b => b.version.startsWith(`v${y}.${m}.`));
      return `v${y}.${m}.${existing.length + 1}`;
    })();

    setBundles(prev => [
      { version: nextVersion, publishedAt: new Date().toISOString(), size: '4.9 MB', changes: 0, status: 'Published' },
      ...prev.map(b => b.status === 'Published' ? { ...b, status: 'Superseded' as const } : b),
    ]);
    setPublishing(false);
    toast.success(`Offline bundle ${nextVersion} published`, {
      description: 'All Android app users will receive an update prompt on next launch.',
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Offline Data Management"
        description="Manage offline dataset bundles distributed to the OroRuta Android app"
        actions={
          <Button icon={<UploadIcon className="h-4 w-4" />} loading={publishing} onClick={handlePublish}>
            {publishing ? 'Publishing bundle…' : 'Publish new bundle'}
          </Button>
        }
      />

      {live && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-primary-500/30 bg-primary-50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
            <CheckCircleIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-primary-800">
              Current live bundle: <span className="font-mono">{live.version}</span>
            </p>
            <p className="text-sm text-primary-700">
              Published {formatRelative(live.publishedAt)} · {live.size} · {live.changes} dataset changes included
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Bundle history"
          description="Offline dataset bundles published to the Android app"
        >
          <div className="divide-y divide-line">
            {bundles.map((b, i) => (
              <div key={b.version} className="flex items-center gap-4 px-5 py-4">
                <span className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  b.status === 'Published' ? 'bg-primary-50 text-primary-600' : 'bg-canvas text-fg-subtle',
                )}>
                  {b.status === 'Published' ? <CheckCircleIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-fg">{b.version}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-fg-subtle mt-0.5">
                    {formatDateTime(b.publishedAt)} · {b.size} · {b.changes} changes
                  </p>
                </div>
                {i === 0 && (
                  <span className="shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Live
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Dataset contents"
          description="Components included in every published bundle"
        >
          <div className="divide-y divide-line">
            {offlineDatasets.map(ds => (
              <div key={ds.id} className="flex items-center gap-3 px-5 py-4">
                <span className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  ds.included ? 'bg-primary-50 text-primary-600' : 'bg-canvas text-fg-subtle',
                )}>
                  <PackageIcon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg">{ds.name}</p>
                    {ds.required && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-canvas text-fg-muted ring-1 ring-inset ring-line">Required</span>
                    )}
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5">{ds.description}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-fg-subtle">{ds.size}</span>
                <span className={cn('shrink-0 h-2 w-2 rounded-full', ds.included ? 'bg-primary-500' : 'bg-fg-subtle')} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Device adoption"
          description={`${deviceAdoption.activeDevices.toLocaleString()} active devices tracked`}
          className="lg:col-span-2"
        >
          <div className="px-5 py-4 space-y-3">
            <AdoptionBar pct={deviceAdoption.latest} color="#12825F" label="Latest bundle" />
            <AdoptionBar pct={deviceAdoption.previous} color="#E9A21B" label="Previous bundle" />
            <AdoptionBar pct={deviceAdoption.older} color="#D93A3A" label="Older bundles" />

            <p className="pt-2 text-xs text-fg-subtle">
              Based on app startup pings from the past 30 days. Devices running older bundles will be prompted to update on next launch.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
