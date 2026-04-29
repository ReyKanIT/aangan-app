# Android Keystore Backup Runbook

**Issued:** `[7:38pm - 29Apr26]`
**Status:** 🔴 P0 — execute before any Play Store submission, ideally today.
**Why:** `aangan_rn/aangan-release.keystore` is the SIGNING KEY for the Aangan Android app. **If you lose it:**
- You cannot publish updates to the existing app on Play Store.
- You'd need to publish a new app under a different package name and start over.
- All Android users would have to migrate to the new app.

A keystore that exists in only one place (one Mac, one disk) is a single point of failure for the entire Android product line.

---

## Files to back up

| File | Why it matters |
|---|---|
| `aangan_rn/aangan-release.keystore` | The actual signing key (PKCS12 file, ~3 KB) |
| `aangan_rn/credentials.json` | Contains the keystore password & key alias password — needed to *use* the keystore |

Both files are gitignored (`aangan_rn/.gitignore:35,36`) — confirmed not in git history. They live on Kumar's Mac only.

---

## Step 1 — verify current state (1 min)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn
ls -la aangan-release.keystore credentials.json

# Confirm keystore is well-formed (should print certificate fingerprint):
keytool -list -v -keystore aangan-release.keystore -storepass "$(grep -m1 keystorePassword credentials.json | sed 's/.*"\([^"]*\)".*/\1/')" 2>/dev/null | head -20
```

If `ls` fails or the keytool command errors, **STOP** — the keystore is missing or corrupt. Restore from any earlier backup before continuing.

Note the **SHA-256 fingerprint** that `keytool` prints. You will use this to verify any restored copy.

---

## Step 2 — back up to 1Password (recommended primary)

1. Open **1Password** desktop app.
2. **New Item** → **Document**.
3. **Title:** `Aangan — Android Release Keystore (PKCS12)`
4. **Vault:** Personal (or your Aangan vault).
5. **Attach file:** `/Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/aangan-release.keystore`
6. Add a **Notes** section with:
   ```
   Generated: 2026-04-29
   Package:   app.aangan.family
   Alias:     aangan-key  (verify with keytool -list)
   SHA-256:   <paste fingerprint from Step 1>
   Store password: see "Aangan — Keystore Passwords" item
   Key password:   see "Aangan — Keystore Passwords" item
   Restore path:   aangan_rn/aangan-release.keystore
   ```
7. Save.

8. **New Item** → **Password** (or Secure Note).
9. **Title:** `Aangan — Keystore Passwords`
10. Paste the contents of `credentials.json` into the secure-notes field, including the alias and both passwords.
11. Save.

---

## Step 3 — second offline copy (mandatory)

A single backup in one cloud account is not "backed up". Make a second copy in a different location/medium.

**Option A — encrypted disk image on iCloud Drive:**

```bash
cd /tmp
mkdir aangan-keystore-backup
cp /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/aangan-release.keystore aangan-keystore-backup/
cp /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/credentials.json aangan-keystore-backup/
echo "Generated 2026-04-29. SHA-256: <paste from Step 1>" > aangan-keystore-backup/README.txt

# Create encrypted DMG (you will be prompted for a strong password — store it in 1Password too):
hdiutil create -volname "AanganKeystore" -srcfolder aangan-keystore-backup \
    -fs HFS+ -encryption AES-256 -format UDZO ~/iCloud\ Drive/aangan-keystore-2026-04-29.dmg

rm -rf aangan-keystore-backup
```

Verify by mounting the DMG once: `open ~/iCloud\ Drive/aangan-keystore-2026-04-29.dmg`, enter the password, confirm files are there, then unmount.

**Option B — encrypted USB drive (preferred if you have one):**

1. Plug in a USB drive.
2. Open **Disk Utility** → format the drive as **APFS (Encrypted)**.
3. Copy `aangan-release.keystore` and `credentials.json` to it.
4. Eject and store physically separate from the Mac (different drawer, ideally different room).

**Option C — second password manager** (Bitwarden, KeePassXC vault on a different cloud):

Repeat Step 2 in Bitwarden or a KeePassXC `.kdbx` file synced via Dropbox/Google Drive. Use a *different* master password from your primary 1Password.

---

## Step 4 — verify restore works (5 min)

The whole point of a backup is being able to restore. Test it.

```bash
# Pretend the original is gone:
mv /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/aangan-release.keystore /tmp/orig.keystore.bak

# Restore from 1Password: download the document into the original location:
# (use 1Password GUI → Document → "Open in Finder" / drag-drop)

# Confirm fingerprint matches Step 1:
keytool -list -v -keystore /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/aangan-release.keystore \
    -storepass "$(grep -m1 keystorePassword /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/credentials.json | sed 's/.*"\([^"]*\)".*/\1/')" \
    | grep -i "SHA-256"

# If fingerprint matches, restore worked. Move the original back:
mv /tmp/orig.keystore.bak /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/aangan-release.keystore
```

---

## Step 5 — also enable Play App Signing (long-term insurance)

When you submit to Play Store, opt in to **Play App Signing** (Google's recommended default). Google will keep their own copy of the signing key on their secure servers. Your local keystore becomes the *upload* key — losing it just means you reset it via the Play Console without losing access to the app.

This is independent of Steps 2–4 but layers on top: even if all your local backups vanish, Google still has the canonical signing key.

Where to enable: Play Console → Setup → App integrity → Play App Signing → "Use Play App Signing".

---

## Step 6 — close the loop (1 min)

- [ ] Mark T09 done in `PRODUCTION_AUDIT_2026-04-29.md`.
- [ ] Add to your password manager: 1Password Document URL + USB-drive physical location + DMG path.
- [ ] Diary entry: backups verified on `<date>`, fingerprint `<SHA-256>`.

---

## Recovery if the original is lost

1. Mount the iCloud DMG (Option A) or plug in the USB drive (Option B), or download from 1Password (Step 2).
2. Copy `aangan-release.keystore` + `credentials.json` back to `aangan_rn/`.
3. Re-run the keytool fingerprint check from Step 1.
4. Re-run an EAS production build to confirm signing still works:
   ```bash
   cd aangan_rn
   eas build --platform android --profile production --local
   ```

If all backups are corrupted: open a Play Console support ticket. Without a valid signing key, recovery requires Play App Signing (Step 5) — the only escape hatch.

---

## Audit cadence

Re-verify the backup chain monthly (set a recurring calendar reminder):

1. Keystore fingerprint matches across primary and offline copies.
2. Both copies are still mountable / openable.
3. `credentials.json` passwords are still valid (run keytool with them).
