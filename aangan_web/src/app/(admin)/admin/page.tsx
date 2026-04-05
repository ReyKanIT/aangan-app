'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalEvents: number;
  pendingReports: number;
  newUsersThisWeek: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalPosts },
        { count: totalEvents },
        { count: pendingReports },
        { count: newUsersThisWeek },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgoISO),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('content_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgoISO),
      ]);

      setStats({
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        totalPosts: totalPosts ?? 0,
        totalEvents: totalEvents ?? 0,
        pendingReports: pendingReports ?? 0,
        newUsersThisWeek: newUsersThisWeek ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error text-sm mb-4">{error}</p>
        <button onClick={fetchStats} className="px-4 py-2 bg-haldi-gold text-brown rounded-lg text-sm font-medium hover:bg-haldi-gold-dark transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, color: 'bg-haldi-gold', icon: '👥' },
    { label: 'Active (7 days)', value: stats?.activeUsers ?? 0, color: 'bg-mehndi-green', icon: '🟢' },
    { label: 'Total Posts', value: stats?.totalPosts ?? 0, color: 'bg-brown', icon: '📝' },
    { label: 'Total Events', value: stats?.totalEvents ?? 0, color: 'bg-haldi-gold-dark', icon: '📅' },
    { label: 'Pending Reports', value: stats?.pendingReports ?? 0, color: 'bg-error', icon: '⚠️' },
    { label: 'New This Week', value: stats?.newUsersThisWeek ?? 0, color: 'bg-mehndi-green-light', icon: '🆕' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-brown">Admin Dashboard</h1>
        <p className="text-brown-light text-sm mt-1">Overview of Aangan activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-cream-dark p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${card.color}`} />
            </div>
            <p className="text-3xl font-bold text-brown">{card.value.toLocaleString()}</p>
            <p className="text-sm text-brown-light mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 text-right">
        <button
          onClick={fetchStats}
          className="text-sm text-haldi-gold-dark hover:text-haldi-gold transition-colors"
        >
          Refresh stats
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 bg-cream-dark rounded animate-pulse" />
        <div className="h-4 w-64 bg-cream-dark rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-cream-dark p-5">
            <div className="h-6 w-6 bg-cream-dark rounded animate-pulse mb-3" />
            <div className="h-8 w-20 bg-cream-dark rounded animate-pulse" />
            <div className="h-4 w-28 bg-cream-dark rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
