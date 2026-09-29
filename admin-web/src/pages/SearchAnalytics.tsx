import React, { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUpIcon, TrendingDownIcon, ArrowRightIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { RouteChip } from '../components/ui/RouteChip';
import {
  dailySearches,
  hourlySearches,
  popularDestinations,
  frequentRoutes,
  recentSearches,
  analyticsSummary,
} from '../data/analytics';
import { useData } from '../contexts/DataContext';
import { formatRelative } from '../utils/format';
import { cn } from '../utils/cn';

function StatCard({ label, value, sub, trend }: { label: string; value: string | number; sub: string; trend?: number }) {
  const isUp = trend !== undefined && trend >= 0;
  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
      <p className="text-[13px] font-medium text-fg-muted">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tabular-nums tracking-tight text-fg">{typeof value === 'number' ? value.toLocaleString() : value}</p>
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
  );
}

export function SearchAnalytics() {
  const { routes } = useData();
  const [period, setPeriod] = useState<'7' | '30'>('30');

  const colorOf = (id: string) => routes.find(r => r.id === id)?.color;
  const nameOf = (id: string) => routes.find(r => r.id === id)?.name ?? id;

  const trendDays = period === '7' ? dailySearches.slice(-7) : dailySearches;
  const thisP = trendDays.reduce((s, d) => s + d.searches, 0);
  const prevP = dailySearches.slice(-(Number(period) * 2), -Number(period)).reduce((s, d) => s + d.searches, 0);
  const change = prevP > 0 ? ((thisP - prevP) / prevP) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Search Analytics" description="Anonymized route search activity from OroRuta commuter app" />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Searches (30 days)" value={analyticsSummary.sessions30.toLocaleString()} sub="sessions recorded" />
        <StatCard label="Searches (7 days)" value={analyticsSummary.sessions7.toLocaleString()} sub="this week" />
        <StatCard label="No-result rate (30d)" value={`${analyticsSummary.noResultRate30}%`} sub="searches with no route found" trend={-analyticsSummary.noResultRate30} />
        <StatCard label="No-result rate (7d)" value={`${analyticsSummary.noResultRate7}%`} sub="this week" trend={-analyticsSummary.noResultRate7} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Search volume trend"
          actions={
            <div className="flex rounded-lg border border-line overflow-hidden">
              {(['7', '30'] as const).map(p => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className={cn('px-3 py-1 text-xs font-medium transition-colors duration-150',
                    period === p ? 'bg-ink text-white' : 'bg-white text-fg-muted hover:bg-canvas')}>
                  {p}d
                </button>
              ))}
            </div>
          }
        >
          <div className="h-52 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendDays} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E3E6EB" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A93A3' }} axisLine={false} tickLine={false}
                  interval={period === '30' ? 6 : 0} />
                <YAxis tick={{ fontSize: 11, fill: '#8A93A3' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3E6EB', fontSize: 12 }}
                  formatter={(v: number) => [v.toLocaleString(), 'Searches']} />
                <Area type="monotone" dataKey="searches" stroke="#0B6E4F" strokeWidth={2}
                  fill="#0B6E4F" fillOpacity={0.08} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Searches by hour of day">
          <div className="h-52 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlySearches} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E3E6EB" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#8A93A3' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A93A3' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E3E6EB', fontSize: 12 }}
                  formatter={(v: number) => [v.toLocaleString(), 'Searches']} />
                <Bar dataKey="searches" fill="#0B6E4F" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Most searched destinations">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-fg-muted">
                <th className="px-5 py-2.5 font-medium"># Destination</th>
                <th className="px-3 py-2.5 text-right font-medium">30 days</th>
                <th className="px-3 py-2.5 text-right font-medium">7 days</th>
                <th className="px-5 py-2.5 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {popularDestinations.map((d, i) => (
                <tr key={d.name} className="hover:bg-canvas transition-colors duration-150">
                  <td className="px-5 py-3">
                    <span className="font-mono text-[11px] text-fg-subtle mr-2">{i + 1}</span>
                    <span className="font-medium text-fg">{d.name}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg-muted">{d.searches30.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg-muted">{d.searches7.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-xs font-medium', d.change >= 0 ? 'text-primary-700' : 'text-danger-600')}>
                      {d.change >= 0 ? '+' : ''}{d.change.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Most searched routes">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-fg-muted">
                <th className="px-5 py-2.5 font-medium">Route</th>
                <th className="px-3 py-2.5 text-right font-medium">30 days</th>
                <th className="px-3 py-2.5 text-right font-medium">7 days</th>
                <th className="px-5 py-2.5 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {frequentRoutes.map(fr => (
                <tr key={fr.routeId} className="hover:bg-canvas transition-colors duration-150">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <RouteChip id={fr.routeId} color={colorOf(fr.routeId)} />
                      <span className="truncate text-fg-muted">{nameOf(fr.routeId)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg-muted">{fr.searches30.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-fg-muted">{fr.searches7.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-xs font-medium', fr.change >= 0 ? 'text-primary-700' : 'text-danger-600')}>
                      {fr.change >= 0 ? '+' : ''}{fr.change.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel className="mt-6" title="Recent searches" description="Last 9 route searches across all devices">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-fg-muted">
              <th className="px-5 py-2.5 font-medium">From</th>
              <th className="px-3 py-2.5 font-medium">To</th>
              <th className="px-3 py-2.5 font-medium">Matched Route</th>
              <th className="px-3 py-2.5 font-medium">Time</th>
              <th className="px-3 py-2.5 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recentSearches.map(s => (
              <tr key={s.id} className="hover:bg-canvas transition-colors duration-150">
                <td className="px-5 py-3 font-medium text-fg">{s.from}</td>
                <td className="px-3 py-3 font-medium text-fg">{s.to}</td>
                <td className="px-3 py-3 font-mono text-xs text-fg-muted">{s.match}</td>
                <td className="px-3 py-3 text-xs text-fg-subtle">{formatRelative(s.at)}</td>
                <td className="px-3 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                    s.found ? 'bg-primary-50 text-primary-700' : 'bg-danger-50 text-danger-600')}>
                    {s.found ? 'Route found' : 'No result'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
