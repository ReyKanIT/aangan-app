import { RELEASES } from '@/data/versions';

export const metadata = { title: 'Version History · Aangan Admin' };

const CATEGORY_STYLE: Record<string, string> = {
  feature: 'bg-mehndi-green/15 text-mehndi-green',
  fix: 'bg-amber-100 text-amber-700',
  chore: 'bg-gray-100 text-gray-600',
  security: 'bg-red-100 text-red-700',
};

/**
 * /admin/versions — release history for admins only. Gated by the admin
 * layout's is_app_admin / admin_role check. Data is static (src/data/versions.ts)
 * so there's nothing to migrate or seed.
 */
export default function AdminVersionsPage() {
  const sorted = [...RELEASES].sort((a, b) =>
    new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-brown">Version History</h1>
        <p className="text-brown-light text-sm mt-1">
          {sorted.length} releases · latest: <span className="font-mono">v{sorted[0]?.version}</span>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brown-light uppercase tracking-wide w-24">Version</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brown-light uppercase tracking-wide w-40">Released</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brown-light uppercase tracking-wide">Summary</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brown-light uppercase tracking-wide w-24">Type</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => (
              <tr key={r.version} className={idx > 0 ? 'border-t border-cream-dark' : ''}>
                <td className="px-4 py-3 align-top">
                  <span className="font-mono text-sm font-semibold text-brown">v{r.version}</span>
                </td>
                <td className="px-4 py-3 align-top text-sm text-brown-light font-mono">{r.stamp}</td>
                <td className="px-4 py-3 align-top text-sm text-brown">
                  <p className="font-medium">{r.summary}</p>
                  <ul className="mt-2 space-y-0.5 text-sm text-brown-light list-disc list-inside">
                    {r.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                  {r.migration && (
                    <p className="mt-2 text-xs text-brown-light">
                      Migration: <span className="font-mono">{r.migration}</span>
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_STYLE[r.category] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.category}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-brown-light">
        Maintained at <span className="font-mono">src/data/versions.ts</span> · update on each release
      </p>
    </div>
  );
}
