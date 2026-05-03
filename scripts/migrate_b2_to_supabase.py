#!/usr/bin/env python3
"""
One-time migration: copy every B2-hosted media URL stored in the DB into
Supabase Storage and rewrite the row to point at the new public URL.

Why: Backblaze B2 refused to flip our bucket public ("Account has no payment
history"), leaving every uploaded image returning 401 from media.aangan.app.
The web upload route already routes new uploads to Supabase Storage as of
v0.13.20; this script handles existing rows.

Surface scanned (2026-05-03):
  - users.avatar_url            (3 rows)
  - users.profile_photo_url     (0 rows — included for completeness)
  - posts.media_urls (TEXT[])   (1 row)
  - events.banner_url           (0 rows — included for completeness)
  - events.voice_invite_url     (0 rows)
  - support_messages.attachment_url (scanned)

Idempotent: if a URL is already a Supabase URL, it's skipped.
"""

import os, json, base64, urllib.request, urllib.error, sys, time

B2_KEY_ID  = os.environ['B2_KEY_ID']
B2_APP_KEY = os.environ['B2_APP_KEY']
B2_BUCKET  = os.environ['B2_BUCKET']
SUPA_URL   = os.environ['SUPA_URL']
SUPA_SVC   = os.environ['SUPA_SVC']

# B2-path prefix → (Supabase bucket, key prefix to strip)
# B2 URLs look like: https://media.aangan.app/file/<bucket>/<folder>/<userId>/<file>
# We map by folder; the rest of the path becomes the Supabase key.
FOLDER_TO_BUCKET = {
    'avatars':       'avatars',
    'posts':         'posts',
    'event-covers':  'event-covers',
    'event-audio':   'event-audio',
    'event-photos':  'event-photos',
    'voice-messages':'voice-messages',
}

# ── B2 auth ──────────────────────────────────────────────────────────────
auth_b64 = base64.b64encode(f"{B2_KEY_ID}:{B2_APP_KEY}".encode()).decode()
req = urllib.request.Request(
    "https://api.backblazeb2.com/b2api/v3/b2_authorize_account",
    headers={"Authorization": f"Basic {auth_b64}"},
)
auth = json.loads(urllib.request.urlopen(req).read())
api = auth.get('apiInfo', {}).get('storageApi', {})
download_url = api.get('downloadUrl') or auth.get('downloadUrl')
auth_token   = auth['authorizationToken']
print(f"[B2] authed; downloadUrl={download_url}")

# ── helpers ──────────────────────────────────────────────────────────────
def is_b2_url(url):
    return isinstance(url, str) and 'media.aangan.app/file/' in url

def parse_b2_key(b2_url):
    """Extract folder + sub-path from a B2 download URL."""
    # Format: https://media.aangan.app/file/<bucket>/<folder>/<rest>
    parts = b2_url.split(f'/file/{B2_BUCKET}/', 1)
    if len(parts) != 2:
        return None, None
    rest = parts[1]
    folder, slash, sub = rest.partition('/')
    if not slash:
        return folder, ''
    return folder, sub

def download_b2(b2_url):
    # Cloudflare in front of media.aangan.app blocks unknown User-Agents
    # (returns "error code: 1010"). Send a real-browser UA so the request
    # passes the bot-management check.
    req = urllib.request.Request(b2_url, headers={
        "Authorization": auth_token,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/120.0.0.0 Safari/537.36",
    })
    with urllib.request.urlopen(req) as r:
        return r.read(), r.headers.get('Content-Type', 'application/octet-stream')

def upload_supabase(bucket, key, data, content_type):
    url = f"{SUPA_URL}/storage/v1/object/{bucket}/{key}"
    req = urllib.request.Request(
        url, data=data, method='POST',
        headers={
            "apikey": SUPA_SVC,
            "Authorization": f"Bearer {SUPA_SVC}",
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    try:
        urllib.request.urlopen(req).read()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise RuntimeError(f"upload {bucket}/{key} -> {e.code}: {body}")
    return f"{SUPA_URL}/storage/v1/object/public/{bucket}/{key}"

def patch_row(table, row_id, patch):
    url = f"{SUPA_URL}/rest/v1/{table}?id=eq.{row_id}"
    req = urllib.request.Request(
        url, data=json.dumps(patch).encode(), method='PATCH',
        headers={
            "apikey": SUPA_SVC,
            "Authorization": f"Bearer {SUPA_SVC}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    res = urllib.request.urlopen(req)
    if res.status not in (200, 204):
        raise RuntimeError(f"patch {table}/{row_id} -> {res.status}")

def get_rows(table, select, query=''):
    url = f"{SUPA_URL}/rest/v1/{table}?select={select}"
    if query:
        url += f"&{query}"
    req = urllib.request.Request(
        url,
        headers={"apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}"},
    )
    return json.loads(urllib.request.urlopen(req).read())

def migrate_url(b2_url):
    """B2 URL -> Supabase URL. Returns (new_url, status)."""
    if not is_b2_url(b2_url):
        return b2_url, 'skip'
    folder, sub = parse_b2_key(b2_url)
    target_bucket = FOLDER_TO_BUCKET.get(folder)
    if not target_bucket:
        return b2_url, f'unmapped_folder:{folder}'
    try:
        data, content_type = download_b2(b2_url)
    except urllib.error.HTTPError as e:
        return b2_url, f'download_404' if e.code == 404 else f'download_{e.code}'
    new_key = sub or f"orphan_{int(time.time())}"
    try:
        new_url = upload_supabase(target_bucket, new_key, data, content_type)
    except Exception as e:
        return b2_url, f'upload_error:{e}'
    return new_url, 'migrated'

# ── 1. users.avatar_url ────────────────────────────────────────────────
print("\n[users.avatar_url]")
rows = get_rows('users', 'id,avatar_url', 'avatar_url=like.%25media.aangan.app%25')
print(f"  {len(rows)} candidates")
for r in rows:
    new_url, status = migrate_url(r['avatar_url'])
    if status == 'migrated':
        patch_row('users', r['id'], {'avatar_url': new_url})
        print(f"  ✓ {r['id'][:8]}…: {status}")
    else:
        print(f"  ✗ {r['id'][:8]}…: {status} (left as-is)")

# ── 2. users.profile_photo_url ─────────────────────────────────────────
print("\n[users.profile_photo_url]")
rows = get_rows('users', 'id,profile_photo_url', 'profile_photo_url=like.%25media.aangan.app%25')
print(f"  {len(rows)} candidates")
for r in rows:
    new_url, status = migrate_url(r['profile_photo_url'])
    if status == 'migrated':
        patch_row('users', r['id'], {'profile_photo_url': new_url})
        print(f"  ✓ {r['id'][:8]}…: {status}")
    else:
        print(f"  ✗ {r['id'][:8]}…: {status}")

# ── 3. posts.media_urls (TEXT[]) ───────────────────────────────────────
print("\n[posts.media_urls]")
rows = get_rows('posts', 'id,media_urls', 'media_urls=neq.%7B%7D')
candidates = [r for r in rows if any(is_b2_url(u) for u in (r['media_urls'] or []))]
print(f"  {len(candidates)} posts with B2 URLs")
for r in candidates:
    new_urls = []
    statuses = []
    for u in r['media_urls']:
        nu, st = migrate_url(u)
        new_urls.append(nu)
        statuses.append(st)
    if any(s == 'migrated' for s in statuses):
        patch_row('posts', r['id'], {'media_urls': new_urls})
    print(f"  ~{r['id'][:8]}…: {statuses}")

# ── 4. events.banner_url ───────────────────────────────────────────────
print("\n[events.banner_url]")
rows = get_rows('events', 'id,banner_url', 'banner_url=like.%25media.aangan.app%25')
print(f"  {len(rows)} candidates")
for r in rows:
    new_url, status = migrate_url(r['banner_url'])
    if status == 'migrated':
        patch_row('events', r['id'], {'banner_url': new_url})
    print(f"  ~{r['id'][:8]}…: {status}")

# ── 5. events.voice_invite_url ─────────────────────────────────────────
print("\n[events.voice_invite_url]")
rows = get_rows('events', 'id,voice_invite_url', 'voice_invite_url=like.%25media.aangan.app%25')
print(f"  {len(rows)} candidates")
for r in rows:
    new_url, status = migrate_url(r['voice_invite_url'])
    if status == 'migrated':
        patch_row('events', r['id'], {'voice_invite_url': new_url})
    print(f"  ~{r['id'][:8]}…: {status}")

# ── 6. support_messages.attachment_url ─────────────────────────────────
print("\n[support_messages.attachment_url]")
try:
    rows = get_rows('support_messages', 'id,attachment_url', 'attachment_url=like.%25media.aangan.app%25')
    print(f"  {len(rows)} candidates")
    for r in rows:
        new_url, status = migrate_url(r['attachment_url'])
        if status == 'migrated':
            patch_row('support_messages', r['id'], {'attachment_url': new_url})
        print(f"  ~{r['id'][:8]}…: {status}")
except Exception as e:
    print(f"  (skipped: {e})")

print("\nDone.")
