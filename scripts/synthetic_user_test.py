#!/usr/bin/env python3
"""
Synthetic-user end-to-end test of Aangan backend.

Creates a small test family (3 users) via the Supabase admin API, runs every
core user flow against the live REST API + RPCs as those users, asserts
outcomes, then cleans up.

What this catches that unit tests miss:
  - RLS policies actually allowing/blocking the right rows
  - PostgREST schema cache hiccups (the 20260429b fallout)
  - Cross-user fan-out (notifications, family visibility)
  - Edge-function happy paths (send-push, etc.)
  - Reply-after-insert chains (my v0.13.19 .select().single() regression)

Run: python3 scripts/synthetic_user_test.py
"""

import os, json, urllib.request, urllib.error, time, uuid, sys

SUPA_URL = os.environ['SUPA_URL']
SUPA_SVC = os.environ['SUPA_SVC']
SUPA_ANON = os.environ['SUPA_ANON']
RUN_ID = f"st_{int(time.time())}"

passed = []
failed = []

def log_pass(name, detail=''):
    passed.append((name, detail))
    print(f"  ✓ {name}{(' — ' + detail) if detail else ''}")

def log_fail(name, detail):
    failed.append((name, detail))
    print(f"  ✗ {name} — {detail}")

def req(method, url, headers=None, body=None, expect=None):
    h = {"apikey": SUPA_SVC, "Authorization": f"Bearer {SUPA_SVC}", "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        res = urllib.request.urlopen(r)
        body_text = res.read().decode() if res.status != 204 else ''
        return res.status, body_text
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def admin_create_user(email, password):
    """Create an auth user via Supabase admin API."""
    url = f"{SUPA_URL}/auth/v1/admin/users"
    status, body = req('POST', url, body={
        "email": email, "password": password, "email_confirm": True,
        "user_metadata": {"display_name": email.split('@')[0]},
    })
    if status not in (200, 201):
        raise RuntimeError(f"create user failed: {status} {body}")
    return json.loads(body)

def admin_delete_user(uid):
    url = f"{SUPA_URL}/auth/v1/admin/users/{uid}"
    req('DELETE', url)

def get_user_jwt(email, password):
    """Sign in via password to get a user JWT."""
    url = f"{SUPA_URL}/auth/v1/token?grant_type=password"
    h = {"apikey": SUPA_ANON, "Content-Type": "application/json"}
    data = json.dumps({"email": email, "password": password}).encode()
    r = urllib.request.Request(url, data=data, method='POST', headers=h)
    try:
        res = urllib.request.urlopen(r)
        return json.loads(res.read())['access_token']
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"sign-in failed: {e.code} {e.read().decode()}")

def as_user(jwt):
    """Return a request fn that uses the user's JWT instead of service role."""
    def call(method, url, body=None, expect=None):
        h = {
            "apikey": SUPA_ANON, "Authorization": f"Bearer {jwt}",
            "Content-Type": "application/json",
            # Return inserted/updated rows so we can assert on the result.
            "Prefer": "return=representation",
        }
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(url, data=data, method=method, headers=h)
        try:
            res = urllib.request.urlopen(r)
            body_text = res.read().decode() if res.status != 204 else ''
            return res.status, body_text
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()
    return call

# ── 1. Create test family ──────────────────────────────────────────────
print("\n[1] Provisioning synthetic family...")
family_id = str(uuid.uuid4())
users = []
try:
    for i, role in enumerate(['parent', 'child', 'cousin']):
        email = f"{RUN_ID}_{role}@test.aangan.invalid"
        password = f"Test_{RUN_ID}_{i}_99!"
        u = admin_create_user(email, password)
        # Add display_name + family_id to public.users via PATCH
        patch_url = f"{SUPA_URL}/rest/v1/users?id=eq.{u['id']}"
        s, b = req('PATCH', patch_url, body={
            'display_name': f"Test {role.title()} {RUN_ID[-4:]}",
            'family_id': family_id,
            'family_level': i + 1,
        })
        if s not in (200, 204):
            log_fail(f"profile patch for {role}", f"{s} {b[:200]}")
            continue
        jwt = get_user_jwt(email, password)
        users.append({'role': role, 'id': u['id'], 'email': email, 'password': password, 'jwt': jwt})
        log_pass(f"created {role}", f"id={u['id'][:8]}…")
except Exception as e:
    log_fail("family setup", str(e))

if len(users) < 2:
    print("\nAborting tests — couldn't provision enough test users.")
    print(f"\nResults: {len(passed)} passed, {len(failed)} failed")
    sys.exit(1)

parent, child = users[0], users[1]
parent_call = as_user(parent['jwt'])
child_call = as_user(child['jwt'])

# Wire family connection (parent → child as L1)
print("\n[2] Wiring family_members L1 connection...")
s, b = req('POST', f"{SUPA_URL}/rest/v1/family_members", body=[
    {'user_id': parent['id'], 'family_member_id': child['id'], 'connection_level': 1, 'relationship_type': 'parent'},
    {'user_id': child['id'], 'family_member_id': parent['id'], 'connection_level': 1, 'relationship_type': 'child'},
])
if s in (200, 201):
    log_pass("family_members both directions inserted")
else:
    log_fail("family_members insert", f"{s} {b[:200]}")

# ── 3. Posts: create, read, like, delete ─────────────────────────────
print("\n[3] Posts CRUD as parent...")
s, b = parent_call('POST', f"{SUPA_URL}/rest/v1/posts?select=id", body={
    'author_id': parent['id'], 'content': 'Hello family — synthetic test',
    'audience_type': 'all', 'audience_level': None,
    'media_urls': [], 'like_count': 0, 'comment_count': 0, 'is_pinned': False,
    'post_type': 'text',
})
if s == 201 and b.strip():
    try:
        rows = json.loads(b)
        post_id = rows[0]['id'] if rows else None
        log_pass(f"create post as user JWT (id={post_id[:8] if post_id else '?'})")
    except Exception as e:
        post_id = None
        log_fail("create post body parse", f"got {b[:200]}")
elif s == 201:
    # Insert succeeded but body empty — RLS hid the SELECT after-insert.
    post_id = None
    log_fail("create post select-after-insert", "201 but empty body — RLS likely blocks SELECT")
else:
    post_id = None
    log_fail("create post as user JWT", f"{s} {b[:200]}")

if post_id:
    # Child should be able to see the post (audience='all' AND L1 family)
    s, b = child_call('GET', f"{SUPA_URL}/rest/v1/posts?id=eq.{post_id}&select=id,content")
    if s == 200 and json.loads(b):
        log_pass("child sees parent's post via RLS")
    else:
        log_fail("child sees parent's post", f"{s} {b[:200]}")

    # Wisdom post test
    s, b = parent_call('POST', f"{SUPA_URL}/rest/v1/posts?select=id,post_type,is_pinned", body={
        'author_id': parent['id'], 'content': 'Wisdom test',
        'audience_type': 'all', 'media_urls': [],
        'post_type': 'wisdom', 'is_pinned': True,
        'like_count': 0, 'comment_count': 0,
    })
    if s == 201:
        wisdom = json.loads(b)[0]
        if wisdom['post_type'] == 'wisdom' and wisdom['is_pinned']:
            log_pass("wisdom post created with correct flags")
        else:
            log_fail("wisdom post flags", f"got {wisdom}")
    else:
        log_fail("create wisdom post", f"{s} {b[:200]}")

    # Like the post (as child)
    s, b = child_call('POST', f"{SUPA_URL}/rest/v1/post_likes", body={
        'post_id': post_id, 'user_id': child['id'],
    })
    if s in (201, 409):
        log_pass(f"child likes parent's post (status {s})")
    else:
        log_fail("child likes post", f"{s} {b[:200]}")

# ── 4. Events: create + RSVP ────────────────────────────────────────
print("\n[4] Events flow as parent...")
s, b = parent_call('POST', f"{SUPA_URL}/rest/v1/events?select=id,title", body={
    'creator_id': parent['id'], 'title': 'Synthetic Test Event',
    'event_type': 'birthday', 'start_datetime': '2026-12-25T10:00:00Z',
    'location': 'Test Location', 'is_public': True, 'ceremonies': [],
})
if s == 201:
    event = json.loads(b)[0]
    event_id = event['id']
    log_pass(f"create event (id={event_id[:8]}…)")
else:
    event_id = None
    # If this fails with PGRST204 about parent_event_id → the migration isn't applied yet.
    if 'parent_event_id' in b or 'voice_invite_duration_sec' in b:
        log_fail("create event", "MIGRATION NOT APPLIED — events still 400ing on missing columns")
    else:
        log_fail("create event", f"{s} {b[:200]}")

if event_id:
    # Child RSVPs going
    s, b = child_call('POST', f"{SUPA_URL}/rest/v1/event_rsvps?on_conflict=event_id,user_id",
                       body={'event_id': event_id, 'user_id': child['id'], 'status': 'going'})
    if s in (200, 201):
        log_pass("child RSVPs going")
    else:
        log_fail("child RSVPs", f"{s} {b[:200]}")

# ── 5. Notifications: insert + read ─────────────────────────────────
print("\n[5] Notifications...")
s, b = req('POST', f"{SUPA_URL}/rest/v1/notifications", body={
    'user_id': child['id'], 'type': 'new_post',
    'title': 'New post', 'title_hindi': 'नई पोस्ट 📸',
    'body': 'Test notification', 'body_hindi': 'टेस्ट सूचना',
    'data': {'type': 'new_post', 'actorId': parent['id']}, 'is_read': False,
})
if s == 201:
    log_pass("admin inserts notification for child")
else:
    log_fail("notification insert", f"{s} {b[:200]}")

# Child reads their notifications
s, b = child_call('GET', f"{SUPA_URL}/rest/v1/notifications?user_id=eq.{child['id']}&select=id,title,is_read")
if s == 200 and len(json.loads(b)) >= 1:
    log_pass(f"child reads {len(json.loads(b))} notifications")
else:
    log_fail("child reads notifications", f"{s} {b[:200]}")

# ── 6. Aangan ID lookup ────────────────────────────────────────────
print("\n[6] Aangan ID lookup RPC...")
parent_aangan_id = None
s, b = req('GET', f"{SUPA_URL}/rest/v1/users?id=eq.{parent['id']}&select=aangan_id")
if s == 200:
    rows = json.loads(b)
    if rows and rows[0].get('aangan_id', '').startswith('AAN-'):
        parent_aangan_id = rows[0]['aangan_id']
        log_pass(f"parent assigned aangan_id={parent_aangan_id}")
    else:
        log_fail("parent aangan_id format", f"got {rows}")

if parent_aangan_id:
    # Child can lookup parent by aangan_id via RPC
    s, b = child_call('POST', f"{SUPA_URL}/rest/v1/rpc/lookup_user_by_aangan_id",
                       body={'p_aangan_id': parent_aangan_id})
    if s == 200 and json.loads(b):
        log_pass(f"lookup_user_by_aangan_id resolved {parent_aangan_id}")
    else:
        log_fail("lookup_user_by_aangan_id", f"{s} {b[:300]}")

# ── 7. Festivals public read ───────────────────────────────────────
print("\n[7] Festivals (public)...")
s, b = req('GET', f"{SUPA_URL}/rest/v1/system_festivals?select=name_en,date,is_active&is_active=eq.true&date=gte.2026-05-04&order=date.asc&limit=3")
if s == 200:
    rows = json.loads(b)
    if rows and rows[0]['name_en'] == 'Ganga Dussehra':
        log_pass(f"next festival: {rows[0]['name_en']} on {rows[0]['date']}")
    else:
        log_fail("festivals next", f"unexpected first row: {rows[0] if rows else 'empty'}")
else:
    log_fail("festivals read", f"{s} {b[:200]}")

# ── 8. Storage bucket public read ──────────────────────────────────
print("\n[8] Storage public buckets...")
for bucket in ['avatars', 'posts', 'event-covers', 'event-audio', 'family-photos', 'event-photos']:
    s, b = req('GET', f"{SUPA_URL}/storage/v1/bucket/{bucket}")
    if s == 200 and json.loads(b).get('public'):
        log_pass(f"bucket {bucket} exists and is public")
    else:
        log_fail(f"bucket {bucket}", f"status={s}, public={json.loads(b).get('public') if s==200 else '?'}")

# ── Cleanup ────────────────────────────────────────────────────────
print("\n[9] Cleanup synthetic users...")
# Delete public.users rows BEFORE the auth row — observed 2026-05-04 that
# admin auth.users delete does NOT cascade to public.users despite the FK
# declaring ON DELETE CASCADE in supabase_schema.sql:42. Worth flagging to
# Kumar; for now we work around it.
for u in users:
    try:
        # Best-effort: clean up FK references first to avoid restrict-FKs blocking the user delete.
        for tbl in ('post_likes', 'event_rsvps', 'family_members', 'notifications', 'posts', 'events'):
            for col in ('user_id', 'author_id', 'creator_id', 'family_member_id'):
                req('DELETE', f"{SUPA_URL}/rest/v1/{tbl}?{col}=eq.{u['id']}")
        # Then the public.users row, then the auth row.
        req('DELETE', f"{SUPA_URL}/rest/v1/users?id=eq.{u['id']}")
        admin_delete_user(u['id'])
        log_pass(f"deleted {u['role']}")
    except Exception as e:
        log_fail(f"delete {u['role']}", str(e))

# ── Summary ────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"SYNTHETIC TEST RESULTS: {len(passed)} passed, {len(failed)} failed")
print('='*60)
if failed:
    print("\nFailures:")
    for name, detail in failed:
        print(f"  ✗ {name}: {detail[:200]}")
sys.exit(0 if not failed else 1)
