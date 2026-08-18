"""
Bundle the whole game into a single .html file with every photograph, sprite
and sound embedded as a data URI.

The point is distribution. A folder has to be unzipped intact, keeps its
relative paths, and breaks the moment somebody drags index.html to their
desktop on its own. One file cannot be taken apart by accident: you send it,
they double-click it, it plays. No server, no install, no folder discipline.
"""
import base64, mimetypes, os, re, sys

# Wherever this script lives — so it works from D:\0Memes\Games\FNAAC\night-shift
# or anywhere else, with no path to edit.
SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SRC, "FNAAC.html")

html = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()

def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())

# every asset the file actually names
refs = set(re.findall(r'["\'(](images/[\w.\-]+|sounds/[\w.\-]+)["\')]', html))
missing, embedded, total = [], 0, 0

for rel in sorted(refs):
    p = os.path.join(SRC, rel)
    if not os.path.exists(p):
        missing.append(rel)
        continue
    uri = data_uri(p)
    total += os.path.getsize(p)
    # replace every occurrence, quoted however it appears
    html = html.replace('"%s"' % rel, '"%s"' % uri).replace("'%s'" % rel, "'%s'" % uri)
    embedded += 1

# Sprite and jumpscare paths are BUILT at runtime ("images/ani_" + id + ".png"),
# so no literal replacement can catch them. Inject a lookup of everything that
# exists and route those two through it.
assets = {}
for folder in ("images", "sounds"):
    d = os.path.join(SRC, folder)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        fp = os.path.join(d, f)
        # ONLY the runtime-built ones; everything else was already inlined as a
        # literal, and putting it in here too would embed the lot twice
        if os.path.isfile(fp) and f.startswith(("ani_", "scare_")):
            assets[f"{folder}/{f}"] = data_uri(fp)

import json
inject = ("const ASSETS = " + json.dumps(assets) + ";\n"
          "const asset = p => ASSETS[p] || p;\n")
html = html.replace('"use strict";', '"use strict";\n' + inject, 1)

html = html.replace('art:"images/ani_" + u.id + ".png",',
                    'art:asset("images/ani_" + u.id + ".png"),')
html = html.replace('scare:"images/scare_" + u.id + ".jpg",',
                    'scare:asset("images/scare_" + u.id + ".jpg"),')

# the service worker and manifest are meaningless in a single file
html = html.replace('<link rel="manifest" href="manifest.json">', "")
html = re.sub(r'if \("serviceWorker" in navigator.*?\n\}\n', "", html, flags=re.S)

# a note at the top for whoever opens it in an editor
html = html.replace("<title>NIGHT SHIFT — Facilities Monitoring</title>",
 """<title>NIGHT SHIFT — Facilities Monitoring</title>
<!-- SINGLE FILE BUILD. Every photograph and sprite is embedded below as a data
     URI, so this file plays on its own with no folder, no server and no
     connection. Generated from the project — edit index.html, not this. -->""")

open(OUT, "w", encoding="utf-8").write(html)

print(f"embedded {embedded} assets ({total/1e6:.1f} MB of originals)")
if missing:
    print("referenced but not found:", ", ".join(missing))
print(f"single file: {os.path.basename(OUT)}  {os.path.getsize(OUT)/1e6:.1f} MB")

# prove nothing still points at the folder
left = re.findall(r'["\'(](images/[\w.\-]+|sounds/[\w.\-]+)["\')]', html)
left = [x for x in set(left) if x not in assets and not x.startswith(("images/ani_", "images/scare_"))]
print("unresolved (these fall back to the built-in synth):", len(left), "sound files")
print("sprites embedded via lookup:",
      sum(1 for k in assets if k.startswith(("images/ani_", "images/scare_"))))
