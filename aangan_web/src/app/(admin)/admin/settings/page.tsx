'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toastError } from '@/lib/toast';

interface AppSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

interface UpdaterMap {
  [userId: string]: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [updaters, setUpdaters] = useState<UpdaterMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // editValues is keyed by the setting's primary key (`key`) — the canonical
  // supabase_schema.sql declares `app_settings.key` as PK with no `id` column.
  // An earlier version of this page used `setting.id` which returned undefined
  // in prod, collapsing all rows into one editValues slot and making saves
  // issue `WHERE id = undefined` which PostgREST rejected silently.
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('key, value, description, updated_by, updated_at')
        .order('key', { ascending: true });

      if (fetchError) throw fetchError;

      const items = (data ?? []) as AppSetting[];
      setSettings(items);

      // Second query for updater display names — done manually because the
      // embedded join form `users!app_settings_updated_by_fkey(...)` depends on
      // an exact FK constraint name that isn't guaranteed across migrations.
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
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-brown">App Settings</h1>
        <p className="text-brown-light text-sm mt-1">Configure application-wide settings</p>
      </div>

      {error && (
        <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-base mb-4">
          {error}
          <button onClick={fetchSettings} className="ml-2 underline">Retry</button>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="text-center py-12 text-brown-light">
          No settings found in app_settings table.
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => {
            const isJsonValue = typeof setting.value === 'object' && setting.value !== null;
            const updaterName = setting.updated_by ? updaters[setting.updated_by] : null;
            return (
              <div
                key={setting.key}
                className="bg-white rounded-xl border border-cream-dark p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-brown font-mono">{setting.key}</h3>
                    {setting.description && (
                      <p className="text-xs text-brown-light mt-0.5">{setting.description}</p>
                    )}
                    <p className="text-xs text-brown-light mt-0.5">
                      Last updated: {new Date(setting.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
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
        </div>
      )}
    </div>
  );
}
