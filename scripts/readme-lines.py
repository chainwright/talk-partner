#!/usr/bin/env python3
"""Keeps README's file:line table true after an edit: for each row whose line no longer holds its snippet, finds the one
line of that file that does and writes its number. A snippet found on no line or on several is reported and left alone
(tests/unit/judge-path.test.ts then fails)."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
readme = root / 'README.md'
text = readme.read_text()
changed = 0
def fix(m):
    global changed
    f, n, snip = m.group(1), int(m.group(2)), m.group(3)
    lines = (root / f).read_text().split('\n')
    if n <= len(lines) and snip in lines[n - 1]:
        return m.group(0)
    hits = [i + 1 for i, l in enumerate(lines) if snip in l]
    if len(hits) != 1:
        print(f'NOT FIXED {f}:{n} `{snip}`: found on {len(hits)} lines', file=sys.stderr)
        return m.group(0)
    changed += 1
    print(f'{f}:{n} -> {hits[0]}')
    return f'| `{f}:{hits[0]}` | `{snip}` |'
text = re.sub(r'^\| `([^`:]+):(\d+)` \| `([^`]+)` \|', fix, text, flags=re.M)
if changed:
    readme.write_text(text)
