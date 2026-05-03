#!/usr/bin/env python3
"""
Renumber every existing aangan_id from random AAN-XXXXXXXX to a serial
AAN-1, AAN-2, … by created_at ASC (order of joining).

Why: Kumar's request 2026-05-03 — random IDs are hard to remember/share.
Serial IDs read like a "membership number" and are easier for Dadi-aged
users to dictate over phone.

Caveats:
  - Anyone who already shared their old random AAN-XXXXXXXX in WhatsApp
    or similar will have a stale ID. With ~10 beta users this risk is
    negligible. If we discover otherwise, the old IDs can be restored
    from git history of the migration file 20260430h plus Sentry logs
    of any clipboard-share events.
  - The companion migration (20260503b_aangan_id_serial.sql) replaces
    the random-string generator with a sequence-backed one so future
    signups continue the serial. Until that migration is applied, NEW
    users created in the gap will get a random AAN-XXXXXXXX and need
    a follow-up re-run of this script.

Idempotent: re-running re-renumbers based on current created_at order.
"""

import os, json, urllib.request

SUPA_URL = os.environ['SUPA_URL']
SUPA_SVC = os.environ['SUPA_SVC']

def get(url):
    req = urllib.request.Request(url, headers={"apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}"})
    return json.loads(urllib.request.urlopen(req).read())

def patch(query, body):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/users?{query}",
        data=json.dumps(body).encode(),
        method='PATCH',
        headers={
            "apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}",
            "Content-Type": "application/json", "Prefer": "return=minimal",
        },
    )
    return urllib.request.urlopen(req).status

# Pull all users in join order
rows = get(f"{SUPA_URL}/rest/v1/users?select=id,aangan_id,display_name,created_at&order=created_at.asc")
print(f"Found {len(rows)} users.\n")

# UNIQUE constraint means we can't have two rows holding the same target value
# mid-update. Move all rows to a temporary parking namespace first, then
# assign final serials. The parking ID is also AAN-prefixed but uses a
# random-looking suffix that won't collide with serials.
import time
parking_token = f"TMP{int(time.time())}"

print("Phase 1: park existing IDs to avoid UNIQUE collisions...")
for i, r in enumerate(rows):
    parked = f"AAN-{parking_token}-{i}"
    patch(f"id=eq.{r['id']}", {'aangan_id': parked})
print(f"  parked {len(rows)}\n")

print("Phase 2: assign serial IDs by join order...")
for i, r in enumerate(rows, start=1):
    new_id = f"AAN-{i}"
    patch(f"id=eq.{r['id']}", {'aangan_id': new_id})
    name = r.get('display_name') or '(no name)'
    print(f"  {new_id}  ←  {r['aangan_id']}  ({name[:40]})")

print(f"\nDone. {len(rows)} users renumbered AAN-1 through AAN-{len(rows)}.")
print("\nNEXT STEP: apply supabase/migrations/20260503b_aangan_id_serial.sql")
print("so new signups continue the serial instead of getting random IDs.")
