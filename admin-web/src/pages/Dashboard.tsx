import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowRightIcon, BusFrontIcon, MegaphoneIcon, MapPinIcon, AlertCircleIcon,
  ActivityIcon, TrendingUpIcon, TrendingDownIcon, PlusIcon,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RouteChip } from '../components/ui/RouteChip';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import { dailySearches } from '../data/analytics';
import { announcementTypes } from '../data/announcementTypes';
import { formatRelative, formatDateTime } from '../utils/format';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

function StatCard({
  label, value, sub, href, trend, icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  href?: string;
  trend?: number;
  icon: React.ReactNode;
}) {
  const isUp = trend !== undefined && trend >= 0;
  const inner = (
    <div className={cn(
      'flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-card transition-shadow duration-150',
      href && 'hover:shadow-card-hover',
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-fg-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-[32px] font-semibold leading-none tabular-nums tracking-tight text-fg">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <div className="mt-2 flex items-center gap-2">
          {trend !== undefined && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', isUp ? 'text-primary-700' : 'text-danger-600')}>
              {isUp ? <TrendingUpIcon className="h-3.5 w-3.5" /> : <TrendingDownIcon className="h-3.5 w-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
          <p className="text-xs text-fg-subtle">{sub}</p>
        </div>
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

export function Dashboard() {
  const { user } = useAuth();
  const { routes, locations, announcements, reports, activity } = useData();
  const navigate = useNavigate();
  const loading = useSimulatedLoad(500);

  const colorOf = (id: string) => routes.find((r) => r.id === id)?.color;
  const ofKind = (kind: string) => locations.filter((l) => l.kind === kind);
  const activeOf = (kind: string) => ofKind(kind).filter((l) => l.status === 'Active').length;
  const published = announcements.filter((a) => a.status === 'Published');
  const pending = reports.filter((r) => r.status === 'Pending').length;

  const chartData = dailySearches.slice(-14).map(d => ({
    date: d.date,
    searches: d.searches,
  }));

  const recentActivity = [...activity]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user?.name?.split(' ')[0] ?? 'Admin'}`}
        description={`${format(new Date(), "EEEE, MMMM d, yyyy")} · OroRuta Admin System`}
        actions={
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/announcements')}>
            New announcement
          </Button>
        }
      />

      {/* Pending alert */}
      {pending > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-warn-200 bg-warn-50 px-4 py-3">
          <AlertCircleIcon className="h-5 w-5 shrink-0 text-warn-600" />
          <p className="flex-1 text-sm text-warn-700">
            <strong>{pending} commuter report{pending > 1 ? 's' : ''}</strong> awaiting review.
          </p>
          <Button size="sm" variant="secondary" onClick={() => navigate('/reports')}>
            Review now <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active routes" value={routes.filter(r => r.status === 'Active').length}
          sub={`of ${routes.length} total routes`} href="/routes" trend={2.1}
          icon={<BusFrontIcon className="h-4 w-4" />} />
        <StatCard label="Terminals" value={activeOf('terminal')}
          sub={`of ${ofKind('terminal').length} terminals active`} href="/terminals"
          icon={<MapPinIcon className="h-4 w-4" />} />
        <StatCard label="Published announcements" value={published.length}
          sub={`${announcements.filter(a => a.status === 'Draft').length} drafts pending`} href="/announcements"
          icon={<MegaphoneIcon className="h-4 w-4" />} />
        <StatCard label="Pending reports" value={pending}
          sub={`${reports.length} total from commuter app`} href="/reports"
          trend={pending > 0 ? -pending : 0}
          icon={<AlertCircleIcon className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Search trend chart */}
        <Panel title="Search activity (14 days)" description="Route searches from the OroRuta Android app"
          className="xl:col-span-2"
          actions={<Link to="/analytics" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">View analytics <ArrowRightIcon className="h-3.5 w-3.5" /></Link>}>
          <div className="h-56 px-2 pb-4 pt-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E3E6EB" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A93A3' }} axisLine={false} tickLine={false}
                  interval={2} />
                <YAxis tick={{ fontSize: 11, fill: '#8A93A3' }} axisLine={false} tickLine={false} width={38} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3E6EB', fontSize: 12 }}
                  formatter={(v: number) => [v.toLocaleString(), 'Searches']} />
                <Area type="monotone" dataKey="searches" stroke="#0B6E4F" strokeWidth={2.5}
                  fill="#0B6E4F" fillOpacity={0.07} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Active announcements */}
        <Panel title={`Active announcements (${published.length})`}
          actions={<Link to="/announcements" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">Manage <ArrowRightIcon className="h-3.5 w-3.5" /></Link>}>
          {published.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MegaphoneIcon className="h-8 w-8 text-fg-subtle mb-2" />
              <p className="text-sm text-fg-muted">No active announcements</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/announcements')}>Create one</Button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {published.slice(0, 5).map(a => {
                const meta = announcementTypes.find(t => t.type === a.type) ?? announcementTypes[announcementTypes.length - 1];
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', meta.className)}>
                      <meta.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-fg">{a.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                        <span>{a.type}</span>
                        <span>·</span>
                        <span>{a.startDate}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
              {published.length > 5 && (
                <li className="px-5 py-2.5">
                  <Link to="/announcements" className="text-xs text-primary-600 hover:underline">
                    +{published.length - 5} more
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Panel>
      </div>

      {/* Route summary + activity log */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Route network"
          actions={<Link to="/routes" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">Manage routes <ArrowRightIcon className="h-3.5 w-3.5" /></Link>}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-fg-muted">
                <th className="px-5 py-2.5 font-medium">Route</th>
                <th className="px-3 py-2.5 font-medium">Direction</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {routes.slice(0, 7).map(r => (
                <tr key={r.id} className="hover:bg-canvas transition-colors duration-150 cursor-pointer"
                  onClick={() => navigate('/routes')}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <RouteChip id={r.id} color={r.color} />
                      <span className="truncate text-fg font-medium max-w-[12rem]">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-fg-muted">{r.direction}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg-muted">₱{r.fare.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {routes.length > 7 && (
            <div className="border-t border-line px-5 py-3">
              <Link to="/routes" className="text-xs text-primary-600 hover:underline">
                View all {routes.length} routes
              </Link>
            </div>
          )}
        </Panel>

        <Panel title="Recent activity"
          description="Last admin actions on routes and data"
          actions={<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-canvas"><ActivityIcon className="h-4 w-4 text-fg-muted" /></span>}>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ActivityIcon className="h-8 w-8 text-fg-subtle mb-2" />
              <p className="text-sm text-fg-muted">No activity recorded yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-line px-5">
              {recentActivity.map(log => (
                <li key={log.id} className="flex items-start gap-3 py-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas ring-1 ring-inset ring-line">
                    <RouteChip id={log.routeId} color={colorOf(log.routeId)} className="h-4 text-[10px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg">
                      <span className="font-medium">{log.action}</span>
                      {' — '}{log.detail}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                      <span>by {log.by}</span>
                      <span>·</span>
                      <span>{formatRelative(log.at)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}