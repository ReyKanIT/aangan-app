import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import AdminShell from './AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_app_admin, admin_role')
    .eq('id', user.id)
    .single();

  if (!profile?.is_app_admin && !profile?.admin_role) {
    redirect('/feed');
  }

  return (
    <AdminShell adminRole={profile?.admin_role ?? (profile?.is_app_admin ? 'super_admin' : null)}>
      {children}
    </AdminShell>
  );
}
