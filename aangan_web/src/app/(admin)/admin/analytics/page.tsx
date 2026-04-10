'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Analytics {
  // Users
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsers7d: number;
  newUsers30d: number;
  // Content
  totalPosts: number;
  postsThisWeek: number;
  totalEvents: number;
  eventsThisMonth: number;
  totalFamilies: number;
  // Support
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgFirstResponseHours: number | null;
  // Engagement
  totalComments: number;
  totalPhotos: number;
  totalMessages: number;
  // Signup trend (last 7 days)
  signupsByDay: { date: string; count: number }[];
  // Ticket status breakdown
  ticketsByStatus: { status: string; count: number }[];
  ticketsByCategory: { category: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { fetchAnalytics(); }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
      const d7iso = d7.toISOString();
      const d30iso = d30.toISOString();

      const [
        { count: totalUsers },
        { count: activeUsers7d },
        { count: activeUsers30d },
        { count: newUsers7d },
        { count: newUsers30d },
        { count: totalPosts },
        { count: postsThisWeek },
        { count: totalEvents },
        { count: eventsThisMonth },
        { count: totalTickets },
        { count: openTickets },
        { count: resolvedTickets },
        { count: totalComments },
        { count: totalMessages },
        { count: totalFamilies },
        { count: totalPhotos },
        { data: ticketStatusRaw },
        { data: ticketCatRaw },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', d7iso),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', d30iso),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', d7iso),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', d30iso),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', d7iso),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', d30iso),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('post_comments').select('*', { count: 'exact', head: true }),
        supabase.from('direct_messages').select('*', { count: 'exact', head: true }),
        supabase.from('family_members').select('*', { count: 'exact', head: true }),
        supabase.from('event_photos').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('status'),
        supabase.from('support_tickets').select('category'),
      ]);

      // Build signup trend (last 7 days)
      const signupsByDay: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', start).lt('created_at', end);
        signupsByDay.push({
          date: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
          count: count ?? 0,
        });
      }

      // Aggregate ticket status breakdown
      const statusMap: Record<string, number> = {};
      for (const t of ticketStatusRaw ?? []) {
        statusMap[t.status] = (statusMap[t.status] ?? 0) + 1;
      }
      const ticketsByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      const catMap: Record<string, number> = {};
      for (const t of ticketCatRaw ?? []) {
        catMap[t.category] = (catMap[t.category] ?? 0) + 1;
      }
      const ticketsByCategory = Object.entries(catMap).map(([category, count]) => ({ category, count }));

      setData({
        totalUsers: totalUsers ?? 0,
        activeUsers7d: activeUsers7d ?? 0,
        activeUsers30d: activeUsers30d ?? 0,
        newUsers7d: newUsers7d ?? 0,
        newUsers30d: newUsers30d ?? 0,
        totalPosts: totalPosts ?? 0,
        postsThisWeek: postsThisWeek ?? 0,
        totalEvents: totalEvents ?? 0,
        eventsThisMonth: eventsThisMonth ?? 0,
        totalFamilies: totalFamilies ?? 0,
        totalTickets: totalTickets ?? 0,
        openTickets: openTickets ?? 0,
        resolvedTickets: resolvedTickets ?? 0,
        avgFirstResponseHours: null,
        totalComments: totalComments ?? 0,
        totalPhotos: totalPhotos ?? 0,
        totalMessages: totalMessages ?? 0,
        signupsByDay,
        ticketsByStatus,
        ticketsByCategory,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <AnalyticsSkeleton />;
  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-500 text-sm mb-4">{error}</p>
      <button onClick={fetchAnalytics} className="px-4 py-2 bg-haldi-gold text-brown rounded-lg text-sm font-medium">Retry</button>
    </div>
  );
  if (!data) return null;

  const retentionRate = data.totalUsers > 0 ? Math.round((data.activeUsers30d / data.totalUsers) * 100) : 0;
  const resolutionRate = data.totalTickets > 0 ? Math.round((data.resolvedTickets / data.totalTickets) * 100) : 0;
  const maxSignup = Math.max(...data.signupsByDay.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-brown">Usage Analytics</h1>
          <p className="text-brown-light text-sm mt-1">Platform health & engagement overview</p>
        </div>
        <button onClick={fetchAnalytics} className="text-sm text-haldi-gold-dark hover:text-haldi-gold transition-colors">
          Refresh ↻
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KPICard label="Total Users" value={data.totalUsers} icon="👥" color="haldi" />
        <KPICard label="Active (7d)" value={data.activeUsers7d} icon="🟢" color="green"
          sub={`${data.totalUsers > 0 ? Math.round((data.activeUsers7d / data.totalUsers) * 100) : 0}% of total`} />
        <KPICard label="New This Week" value={data.newUsers7d} icon="🆕" color="blue" />
        <KPICard label="30d Retention" value={`${retentionRate}%`} icon="🔄" color="purple" />
        <KPICard label="Total Posts" value={data.totalPosts} icon="📝" color="brown" />
        <KPICard label="Posts (7d)" value={data.postsThisWeek} icon="✍️" color="green" />
        <KPICard label="Total Events" value={data.totalEvents} icon="📅" color="haldi" />
        <KPICard label="Comments" value={data.totalComments} icon="💬" color="blue" />
      </div>

      {/* Support KPIs */}
      <div>
        <h2 className="font-heading text-lg text-brown mb-3">Support Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label="Total Tickets" value={data.totalTickets} icon="🎫" color="brown" />
          <KPICard label="Open Tickets" value={data.openTickets} icon="📬" color="orange"
            sub={data.openTickets > 10 ? '⚠️ High volume' : undefined} />
          <KPICard label="Resolved" value={data.resolvedTickets} icon="✅" color="green" />
          <KPICard label="Resolution Rate" value={`${resolutionRate}%`} icon="📊" color="purple" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Signups chart */}
        <div className="bg-white rounded-2xl border border-cream-dark p-5">
          <h3 className="font-semibold text-brown mb-4">New Signups — Last 7 Days</h3>
          <div className="flex items-end gap-3 h-40">
            {data.signupsByDay.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-brown font-semibold">{d.count}</span>
                <div
                  className="w-full bg-haldi-gold rounded-t-lg transition-all"
                  style={{ height: `${Math.max((d.count / maxSignup) * 120, d.count > 0 ? 8 : 2)}px` }}
                />
                <span className="text-[10px] text-brown-light text-center leading-tight">{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket category breakdown */}
        <div className="bg-white rounded-2xl border border-cream-dark p-5">
          <h3 className="font-semibold text-brown mb-4">Tickets by Category</h3>
          {data.ticketsByCategory.length === 0 ? (
            <p className="text-brown-light text-sm text-center py-8">No tickets yet</p>
          ) : (
            <div className="space-y-3">
              {data.ticketsByCategory.sort((a, b) => b.count - a.count).map((item) => {
                const total = data.totalTickets || 1;
                const pct = Math.round((item.count / total) * 100);
                const labels: Record<string, string> = {
                  billing: '💳 Billing', account: '👤 Account', bug_report: '🐛 Bug',
                  feature_request: '💡 Feature', complaint: '📢 Complaint', general: '❓ General',
                };
                return (
                  <div key={item.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-brown">{labels[item.category] ?? item.category}</span>
                      <span className="text-brown-light font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-haldi-gold rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ticket status breakdown */}
      <div className="bg-white rounded-2xl border border-cream-dark p-5">
        <h3 className="font-semibold text-brown mb-4">Ticket Status Distribution</h3>
        {data.ticketsByStatus.length === 0 ? (
          <p className="text-brown-light text-sm">No tickets yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {data.ticketsByStatus.map((item) => {
              const colors: Record<string, string> = {
                open: 'bg-blue-100 text-blue-700', assigned: 'bg-purple-100 text-purple-700',
                in_progress: 'bg-orange-100 text-orange-700', waiting_for_user: 'bg-red-100 text-red-700',
                resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600',
              };
              const labels: Record<string, string> = {
                open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
                waiting_for_user: 'Waiting', resolved: 'Resolved', closed: 'Closed',
              };
              return (
                <div key={item.status} className={`px-4 py-2 rounded-xl ${colors[item.status] ?? 'bg-cream'}`}>
                  <span className="text-lg font-bold">{item.count}</span>
                  <span className="text-sm ml-2">{labels[item.status] ?? item.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Engagement summary */}
      <div className="bg-white rounded-2xl border border-cream-dark p-5">
        <h3 className="font-semibold text-brown mb-4">Engagement Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Active 30d', value: data.activeUsers30d, icon: '🔥' },
            { label: 'New 30d', value: data.newUsers30d, icon: '🌱' },
            { label: 'Events (30d)', value: data.eventsThisMonth, icon: '📅' },
            { label: 'Messages', value: data.totalMessages, icon: '💬' },
          ].map((item) => (
            <div key={item.label} className="bg-cream rounded-xl p-4">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xl font-bold text-brown">{item.value.toLocaleString()}</div>
              <div className="text-xs text-brown-light mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label, value, icon, color, sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    haldi: 'bg-haldi-gold/10 text-haldi-gold-dark',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    brown: 'bg-brown/10 text-brown',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <div className="bg-white rounded-xl border border-cream-dark p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[color] ?? 'bg-cream text-brown'}`}>
          {color}
        </span>
      </div>
      <p className="text-2xl font-bold text-brown">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs text-brown-light mt-0.5">{label}</p>
      {sub && <p className="text-xs text-brown-light/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 bg-cream-dark rounded animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-cream-dark rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 bg-cream-dark rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
