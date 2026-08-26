#!/usr/bin/env python3
import re, os

SCALE = 0.7

def scale(v):
    n = float(v) * SCALE
    if n >= 10:
        return str(int(round(n)))
    return str(round(n, 1)).rstrip("0").rstrip(".")

files = []
for root, dirs, fs in os.walk("src"):
    for f in fs:
        if f.endswith((".tsx", ".ts")):
            files.append(os.path.join(root, f))

total = 0
for path in files:
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    def repl_px(m):
        global total
        total += 1
        return 'borderRadius: "%spx"' % scale(m.group(1))
    new = re.sub(r'borderRadius: "(\d+(?:\.\d+)?)px"', repl_px, text)
    def repl_num(m):
        global total
        total += 1
        return "borderRadius: %s" % scale(m.group(1))
    new = re.sub(r'borderRadius: (\d+(?:\.\d+)?)(?!px|\d|\.)', repl_num, new)
    def repl_rx(m):
        global total
        total += 1
        return 'attr("rx", %s)' % scale(m.group(1))
    new = re.sub(r'attr\("rx", (\d+(?:\.\d+)?)\)', repl_rx, new)
    if new != text:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
        print("degisti:", path)
print("toplam degisiklik:", total)
