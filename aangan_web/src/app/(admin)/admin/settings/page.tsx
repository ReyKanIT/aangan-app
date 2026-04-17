'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toastError } from '@/lib/toast';

interface AppSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

interface UpdaterMap {
  [userId: string]: string;
}

/**
 * Baseline settings the app expects. If the table is empty in prod (migration
 * only created the shell, seeds were skipped), the "Initialize defaults" button
 * lets an admin populate them with one click instead of running SQL.
 */
const DEFAULT_SETTINGS: Array<{ key: string; value: unknown; description: string }> = [
  { key: 'maintenance_mode', value: false, description: 'When true, app shows maintenance screen to all users' },
  { key: 'min_app_version', value: '0.9.0', description: 'Minimum app version users must run' },
  { key: 'max_otp_attempts', value: 5, description: 'Maximum OTP verification attempts before temporary block' },
  { key: 'otp_block_minutes', value: 5, description: 'Minutes to block after exceeding OTP attempts' },
  { key: 'max_reports_per_day', value: 10, description: 'Maximum content reports a user can submit per day' },
  { key: 'registration_open', value: true, description: 'When false, new user registration is disabled' },
  { key: 'feed_refresh_seconds', value: 45, description: 'How often the /feed auto-refreshes in seconds' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [updaters, setUpdaters] = useState<UpdaterMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  // editValues keyed by `key` — the canonical app_settings has `key` as PK.
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDiagnostic(null);

      const { data, error: fetchError, count } = await supabase
        .from('app_settings')
        .select('key, value, description, updated_by, updated_at', { count: 'exact' })
        .order('key', { ascending: true });

      if (fetchError) {
        // 42P01 = table doesn't exist → migration not run
        // 42501 = permission denied → RLS blocking admin
        if (fetchError.code === '42P01') {
          setDiagnostic('app_settings table does not exist. Run supabase_migration_v0.2_security.sql (or create_app_settings.sql) in the Supabase SQL editor.');
        } else if (fetchError.code === '42501') {
          setDiagnostic('Permission denied — RLS is blocking the read. Confirm your user row has is_app_admin=true OR admin_role set.');
        } else {
          setDiagnostic(`Postgres error ${fetchError.code}: ${fetchError.message}`);
        }
        throw fetchError;
      }

      const items = (data ?? []) as AppSetting[];
      setSettings(items);

      if (items.length === 0) {
        setDiagnostic(`app_settings table exists but has 0 rows (count=${count ?? 0}). Seed rows were skipped by ON CONFLICT or the seed block never ran. Click "Initialize defaults" to populate.`);
      }

      // Updater names — manual join to avoid FK-name fragility.
      const updaterIds = Array.from(new Set(items.map((s) => s.updated_by).filter((x): x is string => !!x)));
      if (updaterIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', updaterIds);
        const map: UpdaterMap = {};
        for (const u of users ?? []) map[(u as { id: string }).id] = (u as { display_name: string }).display_name;
        setUpdaters(map);
      } else {
        setUpdaters({});
      }

      const values: Record<string, string> = {};
      items.forEach((s) => {
        values[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value, null, 2);
      });
      setEditValues(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function seedDefaults() {
    try {
      setSeeding(true);
      setError(null);

      // Upsert so existing rows don't conflict. RLS requires is_app_admin — the
      // admin layout already gates this page on that, so the session is valid.
      const rows = DEFAULT_SETTINGS.map((s) => ({
        key: s.key,
        value: s.value,
        description: s.description,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from('app_settings')
        .upsert(rows, { onConflict: 'key' });

      if (upsertErr) throw upsertErr;
      await fetchSettings();
    } catch (err) {
      toastError('डिफ़ॉल्ट सेव नहीं हुए', err instanceof Error ? err.message : 'Failed to seed');
    } finally {
      setSeeding(false);
    }
  }

  async function saveSetting(setting: AppSetting) {
    try {
      setSaving(setting.key);
      setSaveSuccess(null);

      const rawValue = editValues[setting.key];
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(rawValue);
      } catch {
        parsedValue = rawValue;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({
          value: parsedValue,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('key', setting.key);

      if (updateError) throw updateError;

      setSaveSuccess(setting.key);
      setTimeout(() => setSaveSuccess(null), 2000);

      fetchSettings();
    } catch (err) {
      toastError('सेटिंग सेव नहीं हो सकी', err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-8 w-40 bg-cream-dark rounded animate-pulse" />
          <div className="h-4 w-56 bg-cream-dark rounded animate-pulse mt-2" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-cream-dark p-4 mb-3">
            <div className="h-4 w-32 bg-cream-dark rounded animate-pulse mb-2" />
            <div className="h-20 w-full bg-cream-dark rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-brown">App Settings</h1>
          <p className="text-brown-light text-sm mt-1">Configure application-wide settings · {settings.length} rows</p>
        </div>
        <button
          onClick={fetchSettings}
          className="text-sm px-3 py-2 rounded-lg border border-cream-dark hover:bg-cream transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-base mb-4">
          <p className="font-semibold">Load error</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchSettings} className="mt-2 text-sm underline">Retry</button>
        </div>
      )}

      {diagnostic && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm mb-4">
          <p className="font-semibold">Diagnostic</p>
          <p className="mt-1">{diagnostic}</p>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="bg-white rounded-xl border border-cream-dark p-6 text-center">
          <p className="text-brown-light mb-4">No settings found in <span className="font-mono text-xs">app_settings</span>.</p>
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="px-4 py-2 bg-haldi-gold text-brown rounded-lg text-sm font-medium hover:bg-haldi-gold-dark disabled:opacity-60"
          >
            {seeding ? 'Seeding…' : `Initialize defaults (${DEFAULT_SETTINGS.length} rows)`}
          </button>
          <p className="text-xs text-brown-light mt-3">
            This upserts baseline keys (maintenance_mode, min_app_version, OTP limits, registration_open, etc.) using RLS.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => {
            const isJsonValue = typeof setting.value === 'object' && setting.value !== null;
            const updaterName = setting.updated_by ? updaters[setting.updated_by] : null;
            const stamp = setting.updated_at
              ? new Date(setting.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
              : 'Never';
            return (
              <div
                key={setting.key}
                className="bg-white rounded-xl border border-cream-dark p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-brown font-mono">{setting.key}</h3>
                    {setting.description && (
                      <p className="text-sm text-brown-light mt-0.5">{setting.description}</p>
                    )}
                    <p className="text-xs text-brown-light mt-1">
                      Last updated: {stamp}
                      {updaterName && (
                        <> by <span className="font-medium">{updaterName}</span></>
                      )}
                    </p>
                  </div>
                  <button
                    disabled={saving === setting.key}
                    onClick={() => saveSetting(setting)}
                    className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      saveSuccess === setting.key
                        ? 'bg-mehndi-green text-white'
                        : 'bg-haldi-gold text-brown hover:bg-haldi-gold-dark'
                    }`}
                  >
                    {saving === setting.key ? 'Saving...' : saveSuccess === setting.key ? 'Saved!' : 'Save'}
                  </button>
                </div>

                {isJsonValue ? (
                  <textarea
                    value={editValues[setting.key] ?? ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                    }
                    rows={Math.min(10, (editValues[setting.key] ?? '').split('\n').length + 1)}
                    className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm text-brown font-mono bg-cream/50 focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 resize-y"
                    spellCheck={false}
                  />
                ) : (
                  <input
                    type="text"
                    value={editValues[setting.key] ?? ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-haldi-gold/40"
                  />
                )}
              </div>
            );
          })}

          <div className="text-center pt-4">
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="text-sm px-3 py-2 rounded-lg border border-cream-dark hover:bg-cream transition-colors disabled:opacity-60"
            >
              {seeding ? 'Adding…' : '+ Add any missing defaults'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
