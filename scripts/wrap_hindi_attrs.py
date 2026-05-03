#!/usr/bin/env python3
"""
Codemod: rewrite JSX attributes whose VALUE contains Devanagari characters
from `attr="...देवनागरी..."` to `attr={'...देवनागरी...'}` per the CLAUDE.md
hard rule "Hindi text in JSX MUST be wrapped in {'...'}".

Why: bare attribute values can be silently mangled by tooling into literal
\\u escape sequences (the v0.13.16 Google-button regression). Wrapping in
a JS expression forces the build to keep the Hindi as runtime strings.

Surface (2026-05-03 audit): 81 occurrences across 30+ files in
aangan_web/src/.

Behaviour:
  - In-place edit; safe to re-run (idempotent — already-wrapped values
    don't match the pattern).
  - Touches only `*.tsx` and `*.ts` files under aangan_web/src.
  - Skips lines where the attribute value contains `'` (we'd need to
    escape it, and the few cases like that are easier to fix by hand).
  - Skips lines that already contain `{'`.

Run: python3 scripts/wrap_hindi_attrs.py
"""

import os, re, sys

ROOT = '/Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_web/src'

# JSX/HTML attribute with double-quoted value containing Devanagari.
# attr name: identifier or hyphenated
# value: anything not a double-quote, with at least one Devanagari char
# Allows single quotes inside? — see SKIP guard below.
ATTR_RE = re.compile(r'(\b[\w-]+)="([^"]*[ऀ-ॿ][^"]*)"')

def transform_line(line):
    if "{'" in line and ATTR_RE.search(line):
        # Mixed line — skip both for safety. Manual fix.
        return line, 0
    def replace(m):
        name, value = m.group(1), m.group(2)
        if "'" in value:
            return m.group(0)  # skip — single-quote escaping not handled
        return f"{name}={{'{value}'}}"
    new_line, count = ATTR_RE.subn(replace, line)
    return new_line, count

def process(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    new_lines = []
    file_changes = 0
    for line in lines:
        new_line, n = transform_line(line)
        new_lines.append(new_line)
        file_changes += n
    if file_changes:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
    return file_changes

def main():
    total = 0
    files_touched = 0
    for dirpath, _, filenames in os.walk(ROOT):
        for fn in filenames:
            if not (fn.endswith('.tsx') or fn.endswith('.ts')):
                continue
            path = os.path.join(dirpath, fn)
            n = process(path)
            if n:
                rel = os.path.relpath(path, ROOT)
                print(f"  {n:3d}  {rel}")
                total += n
                files_touched += 1
    print(f"\nWrapped {total} attributes across {files_touched} files.")
    print("Manual-fix candidates (skipped due to single-quote in value):")
    for dirpath, _, filenames in os.walk(ROOT):
        for fn in filenames:
            if not (fn.endswith('.tsx') or fn.endswith('.ts')):
                continue
            path = os.path.join(dirpath, fn)
            with open(path, encoding='utf-8') as f:
                for i, line in enumerate(f, 1):
                    m = ATTR_RE.search(line)
                    if m and "'" in m.group(2):
                        rel = os.path.relpath(path, ROOT)
                        print(f"  {rel}:{i}: {line.strip()[:120]}")

if __name__ == '__main__':
    main()
