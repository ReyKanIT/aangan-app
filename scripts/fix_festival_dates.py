#!/usr/bin/env python3
"""
Apply 2026-27 festival date corrections from the audit run on 2026-05-03.
Sources: drikpanchang.com cross-checked with mypanchang/smartpuja/hindutone.

DATA-ONLY changes — no schema change. PATCHes existing rows by name match.
Idempotent: re-running with the same data sets the same date.

Also:
  - Buddha Purnima (already past) → is_active = false (Kumar deactivated this
    earlier today; this re-runs that for safety / idempotency).
  - Vat Savitri 2026-05-19 → date corrected to 2026-05-16 + is_active=false
    (already past on 2026-05-03).
  - Inserts Eid ul-Adha 2026-05-27 (was missing).
"""

import os, json, urllib.request, urllib.error

SUPA_URL = os.environ['SUPA_URL']
SUPA_SVC = os.environ['SUPA_SVC']

# (match-by-name, patch_dict). Names matched case-insensitively against name_en.
CORRECTIONS = [
    # 2026 — past festivals: deactivate
    ('Buddha Purnima',          {'date': '2026-05-01', 'is_active': False}),
    ('Vat Savitri',             {'date': '2026-05-16', 'is_active': False}),

    # 2026 — date fixes (still upcoming)
    ('Ganga Dussehra',          {'date': '2026-05-25'}),
    ('Nirjala Ekadashi',        {'date': '2026-06-25'}),
    ('Devshayani Ekadashi',     {'date': '2026-07-25'}),
    ('Guru Purnima',            {'date': '2026-07-29'}),
    ('Hariyali Teej',           {'date': '2026-08-15'}),
    ('Nag Panchami',            {'date': '2026-08-16'}),
    ('Raksha Bandhan',          {'date': '2026-08-28'}),
    ('Anant Chaturdashi',       {'date': '2026-09-25'}),
    ('Pitru Paksha',            {'date': '2026-09-26'}),  # name may be "Pitru Paksha begins"
    ('Sarva Pitru Amavasya',    {'date': '2026-10-10'}),
    ('Sharad Navratri',         {'date': '2026-10-11'}),  # name may be "Sharad Navratri begins"
    ('Vijayadashami',           {'date': '2026-10-20'}),  # may be stored as "Dussehra"
    ('Dussehra',                {'date': '2026-10-20'}),
    ('Karwa Chauth',            {'date': '2026-10-29'}),
    ('Dhanteras',               {'date': '2026-11-06'}),
    ('Diwali',                  {'date': '2026-11-08'}),
    ('Chhath Puja',             {'date': '2026-11-15'}),

    # 2027 — major fixes (DB had Vasant Panchami, Maha Shivratri, Holi all 18-19 days early)
    ('Makar Sankranti',         {'date': '2027-01-15'}),
    ('Vasant Panchami',         {'date': '2027-02-11'}),
    ('Maha Shivratri',          {'date': '2027-03-06'}),
    ('Holika Dahan',            {'date': '2027-03-22'}),
    ('Holi',                    {'date': '2027-03-23'}),
    ('Hanuman Jayanti',         {'date': '2027-04-20'}),
]

def get(url):
    req = urllib.request.Request(url, headers={"apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}"})
    return json.loads(urllib.request.urlopen(req).read())

def patch(query, body):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/system_festivals?{query}",
        data=json.dumps(body).encode(),
        method='PATCH',
        headers={
            "apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}",
            "Content-Type": "application/json", "Prefer": "return=representation",
        },
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read())

def post(body):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/system_festivals",
        data=json.dumps(body).encode(),
        method='POST',
        headers={
            "apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}",
            "Content-Type": "application/json", "Prefer": "return=representation",
        },
    )
    return json.loads(urllib.request.urlopen(req).read())

# Pull current rows once for matching
print("Loading current festivals...")
all_rows = get(f"{SUPA_URL}/rest/v1/system_festivals?select=id,name_en,name_hi,date,is_active&order=date.asc")
print(f"  {len(all_rows)} rows total")

applied = 0
skipped = 0
for name_pattern, patch_body in CORRECTIONS:
    matches = [r for r in all_rows if name_pattern.lower() in (r['name_en'] or '').lower()]
    if not matches:
        print(f"  - {name_pattern}: NO MATCH (skipping)")
        skipped += 1
        continue
    # Pick the row whose date is in 2026 if patch is 2026, else 2027.
    target_year = patch_body['date'][:4]
    candidates = [r for r in matches if (r['date'] or '').startswith(target_year)]
    if not candidates:
        # Maybe the row exists but with a wrong year — match the closest by name+season.
        candidates = matches
    if len(candidates) > 1:
        # Match by closest current date to patch date as a tiebreaker.
        candidates.sort(key=lambda r: abs(int(r['date'][:4] + r['date'][5:7] + r['date'][8:10])
                                          - int(patch_body['date'].replace('-',''))))
    target = candidates[0]
    if target['date'] == patch_body.get('date') and target.get('is_active') == patch_body.get('is_active', target['is_active']):
        print(f"  = {name_pattern}: already correct")
        skipped += 1
        continue
    res = patch(f"id=eq.{target['id']}", patch_body)
    print(f"  ✓ {name_pattern}: {target['date']} → {patch_body.get('date')} (active={patch_body.get('is_active', target.get('is_active'))})")
    applied += 1

# Add missing Eid ul-Adha 2026
existing_eid = [r for r in all_rows if 'eid ul-adha' in (r['name_en'] or '').lower() or 'bakrid' in (r['name_en'] or '').lower()]
if not existing_eid:
    print("\nAdding Eid ul-Adha 2026...")
    try:
        res = post({
            'name_en': 'Eid ul-Adha (Bakrid)',
            'name_hi': 'ईद उल-अज़हा (बकरीद)',
            'date': '2026-05-27',
            'region': 'all-india',
            'is_active': True,
        })
        print(f"  ✓ inserted ({res[0].get('id') if res else 'unknown id'})")
        applied += 1
    except urllib.error.HTTPError as e:
        print(f"  ✗ insert failed: {e.code} {e.read().decode()[:200]}")
else:
    print(f"\nEid ul-Adha already exists ({len(existing_eid)} rows) — skipping insert.")

print(f"\nApplied {applied} changes, skipped {skipped}.")
