import React, { useState } from 'react';
import { toast } from 'sonner';
import { SettingsIcon, GlobeIcon, BellIcon, ShieldIcon, DatabaseIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Toggle } from '../components/ui/Toggle';
import { Select } from '../components/ui/Select';
import { delay } from '../utils/async';

export function Settings() {
  const [systemName, setSystemName] = useState('OroRuta Admin Portal');
  const [apiUrl, setApiUrl] = useState('http://localhost:3000/api/v1');
  const [timezone, setTimezone] = useState('Asia/Manila');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [reportNotify, setReportNotify] = useState(true);
  const [offlineNotify, setOfflineNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await delay(700);
    setSaving(false);
    toast.success('Settings saved', { description: 'System configuration has been updated.' });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="System Settings"
        description="Configure general system preferences and operational settings"
        actions={<Button loading={saving} onClick={handleSave}>Save settings</Button>}
      />

      <div className="space-y-6">
        <Panel title="General" description="Basic system configuration">
          <div className="space-y-4 px-5 py-4">
            <Field label="System name" htmlFor="sys-name">
              <input id="sys-name" value={systemName} onChange={e => setSystemName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Backend API URL" htmlFor="sys-api" hint="Base URL for the OroRuta Node.js REST API">
              <input id="sys-api" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Timezone" htmlFor="sys-tz">
              <Select id="sys-tz" value={timezone} onChange={e => setTimezone(e.target.value)}>
                <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
                <option value="UTC">UTC</option>
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title="Maintenance Mode">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-fg">Enable maintenance mode</p>
              <p className="text-xs text-fg-muted mt-0.5">
                When enabled, the Android app will display a maintenance notice and API endpoints will return 503.
              </p>
            </div>
            <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} label="Maintenance mode" />
          </div>
        </Panel>

        <Panel title="Notifications">
          <div className="divide-y divide-line px-5">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-fg">New report submitted</p>
                <p className="text-xs text-fg-muted mt-0.5">Notify admins when a commuter submits a new report</p>
              </div>
              <Toggle checked={reportNotify} onChange={setReportNotify} label="Notify on new report" />
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-fg">Offline bundle ready</p>
                <p className="text-xs text-fg-muted mt-0.5">Notify admins when a new offline bundle is ready to publish</p>
              </div>
              <Toggle checked={offlineNotify} onChange={setOfflineNotify} label="Notify on offline bundle" />
            </div>
          </div>
        </Panel>

        <Panel title="About">
          <div className="px-5 py-4 space-y-2 text-sm text-fg-muted">
            <div className="flex justify-between"><span>Version</span><span className="font-mono text-fg">1.0.0</span></div>
            <div className="flex justify-between"><span>Environment</span><span className="font-mono text-fg">Development</span></div>
            <div className="flex justify-between"><span>Database</span><span className="font-mono text-fg">MySQL 8 (OroRuta)</span></div>
            <div className="flex justify-between"><span>API</span><span className="font-mono text-fg">Node.js 20 + Express 4</span></div>
            <p className="pt-3 border-t border-line text-xs">
              © 2026 OroRuta · College of Information Technology, Liceo de Cagayan University (BSIT).
              Research project supporting UN SDG 9, 11, 13. Route data based on CDO LPTRP.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
