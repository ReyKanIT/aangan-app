'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalPosts: number;
  postsThisWeek: number;
  totalEvents: number;
  eventsThisMonth: number;
  totalFamilyLinks: number;
  totalMessages: number;
  pendingReports: number;
  openTickets: number;
  newUsersThisWeek: number;
  newUsersLastWeek: number;
  postsLastWeek: number;
}

interface RecentActivity {
  id: string;
  type: 'signup' | 'post' | 'event' | 'report' | 'ticket' | 'message';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
}

interface RecentUser {
  id: string;
  display_name: string;
  display_name_hindi: string | null;
  village_city: string | null;
  created_at: string;
  last_seen_at: string | null;
  avatar_url: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
      const d14 = new Date(now); d14.setDate(d14.getDate() - 14);
      const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
      const d7iso = d7.toISOString();
      const d14iso = d14.toISOString();
      const d30iso = d30.toISOString();

      // ── Stats queries (parallel) ──
      const [
        { count: totalUsers },
        { count: activeUsers7d },
        { count: activeUsers30d },
        { count: totalPosts },
        { count: postsThisWeek },
        { count: postsLastWeek },
        { count: totalEvents },
        { count: eventsThisMonth },
        { count: totalFamilyLinks },
        { count: totalMessages },
        { count: pendingReports },
        { count: openTickets },
        { count: newUsersThisWeek },
        { count: newUsersLastWeek },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', d7iso),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', d30iso),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', d7iso),
        supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', d14iso).lt('created_at', d7iso),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', d30iso),
        supabase.from('family_members').select('*', { count: 'exact', head: true }),
        supabase.from('direct_messages').select('*', { count: 'exact', head: true }),
        supabase.from('content_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', d7iso),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', d14iso).lt('created_at', d7iso),
      ]);

      setStats({
        totalUsers: totalUsers ?? 0,
        activeUsers7d: activeUsers7d ?? 0,
        activeUsers30d: activeUsers30d ?? 0,
        totalPosts: totalPosts ?? 0,
        postsThisWeek: postsThisWeek ?? 0,
        postsLastWeek: postsLastWeek ?? 0,
        totalEvents: totalEvents ?? 0,
        eventsThisMonth: eventsThisMonth ?? 0,
        totalFamilyLinks: totalFamilyLinks ?? 0,
        totalMessages: totalMessages ?? 0,
        pendingReports: pendingReports ?? 0,
        openTickets: openTickets ?? 0,
        newUsersThisWeek: newUsersThisWeek ?? 0,
        newUsersLastWeek: newUsersLastWeek ?? 0,
      });

      // ── Recent Activity Feed (parallel) ──
      const [
        { data: recentSignups },
        { data: recentPosts },
        { data: recentEvents },
        { data: recentReports },
        { data: recentTickets },
      ] = await Promise.all([
        supabase.from('users').select('id, display_name, display_name_hindi, village_city, created_at, last_seen_at, avatar_url').order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('id, content, created_at, author:users!posts_author_id_fkey(display_name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('events').select('id, title, title_hindi, start_datetime, created_at, creator:users!events_creator_id_fkey(display_name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('content_reports').select('id, reason, content_type, created_at, reporter:users!content_reports_reporter_id_fkey(display_name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('support_tickets').select('id, ticket_number, subject, priority, created_at, user:users!user_id(display_name)').order('created_at', { ascending: false }).limit(3),
      ]);

      setRecentUsers(recentSignups as RecentUser[] ?? []);

      // Build unified activity feed
      const feed: RecentActivity[] = [];

      for (const u of recentSignups ?? []) {
        feed.push({
          id: `signup-${u.id}`,
          type: 'signup',
          title: u.display_name_hindi || u.display_name,
          subtitle: u.village_city ? `joined from ${u.village_city}` : 'joined Aangan',
          timestamp: u.created_at,
          icon: '👤',
        });
      }
      for (const p of recentPosts ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const authorObj = p.author as any;
        const author = authorObj?.display_name ?? 'Unknown';
        const content = String(p.content ?? '');
        feed.push({
          id: `post-${p.id}`,
          type: 'post',
          title: author,
          subtitle: content.slice(0, 60) + (content.length > 60 ? '...' : '') || 'shared a post',
          timestamp: String(p.created_at),
          icon: '📝',
        });
      }
      for (const e of recentEvents ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const creatorObj = e.creator as any;
        const creator = creatorObj?.display_name ?? 'Unknown';
        feed.push({
          id: `event-${e.id}`,
          type: 'event',
          title: String(e.title_hindi || e.title),
          subtitle: `created by ${creator}`,
          timestamp: String(e.created_at),
          icon: '📅',
        });
      }
      for (const r of recentReports ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reporterObj = r.reporter as any;
        const reporter = reporterObj?.display_name ?? 'Unknown';
        feed.push({
          id: `report-${r.id}`,
          type: 'report',
          title: `${r.content_type} reported`,
          subtitle: `by ${reporter} — ${r.reason}`,
          timestamp: String(r.created_at),
          icon: '⚠️',
        });
      }
      for (const t of recentTickets ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userObj = t.user as any;
        const userName = userObj?.display_name ?? 'Unknown';
        feed.push({
          id: `ticket-${t.id}`,
          type: 'ticket',
          title: String(t.subject),
          subtitle: `${t.ticket_number} by ${userName} • ${t.priority}`,
          timestamp: String(t.created_at),
          icon: '🎫',
        });
      }

      // Sort by timestamp descending
      feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(feed.slice(0, 15));
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error text-base mb-4">{error}</p>
        <button onClick={fetchAll} className="px-6 py-3 bg-haldi-gold text-brown rounded-xl text-base font-semibold hover:bg-haldi-gold-dark transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Trend calculations
  const userGrowth = stats.newUsersLastWeek > 0
    ? Math.round(((stats.newUsersThisWeek - stats.newUsersLastWeek) / stats.newUsersLastWeek) * 100)
    : stats.newUsersThisWeek > 0 ? 100 : 0;
  const postGrowth = stats.postsLastWeek > 0
    ? Math.round(((stats.postsThisWeek - stats.postsLastWeek) / stats.postsLastWeek) * 100)
    : stats.postsThisWeek > 0 ? 100 : 0;
  const retentionRate = stats.totalUsers > 0 ? Math.round((stats.activeUsers7d / stats.totalUsers) * 100) : 0;
  const avgFamilySize = stats.totalUsers > 0 ? (stats.totalFamilyLinks / stats.totalUsers).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-brown">Admin Dashboard</h1>
          <p className="text-brown-light text-sm mt-1">
            Last refreshed: {lastRefresh.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="px-4 py-2 bg-haldi-gold/10 text-haldi-gold-dark rounded-xl text-sm font-medium hover:bg-haldi-gold/20 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Alerts Banner ── */}
      {(stats.pendingReports > 0 || stats.openTickets > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.pendingReports > 0 && (
            <Link href="/admin/reports"
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-semibold">{stats.pendingReports} pending report{stats.pendingReports > 1 ? 's' : ''} need review</span>
              <span className="text-sm">→</span>
            </Link>
          )}
          {stats.openTickets > 0 && (
            <Link href="/admin/support"
              className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl hover:bg-orange-100 transition-colors">
              <span className="text-lg">🎫</span>
              <span className="text-sm font-semibold">{stats.openTickets} open support ticket{stats.openTickets > 1 ? 's' : ''}</span>
              <span className="text-sm">→</span>
            </Link>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon="👥" label="Total Users" value={stats.totalUsers}
          trend={`+${stats.newUsersThisWeek} this week`}
          trendUp={userGrowth >= 0} trendValue={`${userGrowth >= 0 ? '+' : ''}${userGrowth}%`}
        />
        <KPICard
          icon="🟢" label="Active (7d)" value={stats.activeUsers7d}
          trend={`${retentionRate}% retention`}
          trendUp={retentionRate >= 30} trendValue={`${retentionRate}%`}
        />
        <KPICard
          icon="📝" label="Posts" value={stats.totalPosts}
          trend={`+${stats.postsThisWeek} this week`}
          trendUp={postGrowth >= 0} trendValue={`${postGrowth >= 0 ? '+' : ''}${postGrowth}%`}
        />
        <KPICard
          icon="👨‍👩‍👧‍👦" label="Family Links" value={stats.totalFamilyLinks}
          trend={`Avg ${avgFamilySize} per user`}
          trendUp={true} trendValue={`${avgFamilySize}`}
        />
      </div>

      {/* ── Secondary Stats ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniCard icon="📅" label="Events" value={stats.totalEvents} sub={`+${stats.eventsThisMonth} this month`} />
        <MiniCard icon="💬" label="Messages" value={stats.totalMessages} />
        <MiniCard icon="🔄" label="30d Active" value={stats.activeUsers30d} />
        <MiniCard icon="🆕" label="New (7d)" value={stats.newUsersThisWeek} />
        <MiniCard icon="⚠️" label="Reports" value={stats.pendingReports} alert={stats.pendingReports > 0} />
        <MiniCard icon="🎫" label="Open Tickets" value={stats.openTickets} alert={stats.openTickets > 0} />
      </div>

      {/* ── Two Column: Activity Feed + Recent Users ── */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-cream-dark">
          <div className="px-5 py-4 border-b border-cream-dark flex items-center justify-between">
            <h2 className="font-heading text-lg text-brown">Recent Activity</h2>
            <span className="text-xs text-brown-light">{activities.length} items</span>
          </div>
          <div className="divide-y divide-cream-dark max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-brown-light text-sm">No recent activity</div>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="px-5 py-3 hover:bg-cream/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 flex-shrink-0">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brown font-medium truncate">{a.title}</p>
                      <p className="text-xs text-brown-light truncate">{a.subtitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-brown-light whitespace-nowrap">{timeAgo(a.timestamp)}</p>
                      <p className="text-[10px] text-brown-light/50 whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-cream-dark">
          <div className="px-5 py-4 border-b border-cream-dark flex items-center justify-between">
            <h2 className="font-heading text-lg text-brown">New Users</h2>
            <Link href="/admin/users" className="text-xs text-haldi-gold-dark hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-cream-dark max-h-[500px] overflow-y-auto">
            {recentUsers.length === 0 ? (
              <div className="text-center py-12 text-brown-light text-sm">No users yet</div>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="px-5 py-3 hover:bg-cream/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(u.display_name_hindi || u.display_name)?.[0] ?? '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brown font-medium truncate">
                        {u.display_name_hindi || u.display_name}
                      </p>
                      <p className="text-xs text-brown-light truncate">
                        {u.village_city || 'No location'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-brown-light whitespace-nowrap">{timeAgo(u.created_at)}</p>
                      <p className="text-[10px] text-brown-light/50 whitespace-nowrap">
                        {u.last_seen_at ? `Active ${timeAgo(u.last_seen_at)}` : 'Never seen'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { href: '/admin/users', icon: '👥', label: 'Users' },
          { href: '/admin/analytics', icon: '📊', label: 'Analytics' },
          { href: '/admin/reports', icon: '⚠️', label: 'Reports' },
          { href: '/admin/support', icon: '🎫', label: 'Support' },
          { href: '/admin/audit', icon: '📋', label: 'Audit Log' },
          { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-3 bg-white rounded-xl border border-cream-dark p-4 hover:shadow-md hover:border-haldi-gold/30 transition-all">
            <span className="text-2xl">{link.icon}</span>
            <span className="text-sm text-brown font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Helper Components ──

function KPICard({ icon, label, value, trend, trendUp, trendValue }: {
  icon: string; label: string; value: number;
  trend: string; trendUp: boolean; trendValue: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {trendValue}
        </span>
      </div>
      <p className="text-3xl font-bold text-brown">{value.toLocaleString()}</p>
      <p className="text-sm text-brown-light mt-1">{label}</p>
      <p className="text-xs text-brown-light/60 mt-0.5">{trend}</p>
    </div>
  );
}

function MiniCard({ icon, label, value, sub, alert: isAlert }: {
  icon: string; label: string; value: number; sub?: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 text-center ${isAlert ? 'bg-red-50 border-red-200' : 'bg-white border-cream-dark'}`}>
      <span className="text-lg">{icon}</span>
      <p className={`text-xl font-bold mt-1 ${isAlert ? 'text-red-700' : 'text-brown'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-brown-light">{label}</p>
      {sub && <p className="text-[10px] text-brown-light/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-cream-dark rounded animate-pulse" />
          <div className="h-4 w-64 bg-cream-dark rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-24 bg-cream-dark rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-cream-dark p-5">
            <div className="h-6 w-6 bg-cream-dark rounded animate-pulse mb-3" />
            <div className="h-10 w-24 bg-cream-dark rounded animate-pulse" />
            <div className="h-4 w-32 bg-cream-dark rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-cream-dark rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-96 bg-cream-dark rounded-2xl animate-pulse" />
        <div className="lg:col-span-2 h-96 bg-cream-dark rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
