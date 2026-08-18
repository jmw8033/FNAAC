# Getting it to other people on PC

## Best option: the single file

`FNAAC.html` — 9 MB, everything inside it. Email it, drop it on
a share, put it on a stick. They double-click, it opens in their browser, it
plays. No unzipping, no folder to keep together, no server, no install, nothing
to explain.

This is the one to send unless you have a reason not to. It needs nothing
installed and no particular Windows version — any machine with Chrome, Edge or
Firefox from the last few years will run it.

Its one limitation is that it is a snapshot. Change a photo or a placement and
you rebuild and resend, rather than updating a folder in place.

## If you want to update it without resending

Put the project folder on any internal web server and send a link. Everyone
gets whatever is currently there, and on https it also installs to a phone
home screen and plays offline. Setup lives in SERVE.md.

## The folder itself

`night-shift.zip` still works — unzip and open `index.html`. Fine for you while
you are working, worse for sharing: people move `index.html` out of the folder,
the images stop loading, and it looks broken.

## What NOT to bother with

Wrapping it as a .exe. It buys nothing here — the game is a browser page either
way — and it costs you code signing, antivirus false positives on an unsigned
binary, and a build step. Corporate machines are far happier opening an HTML
file than an unrecognised executable.

## Rebuilding the single file

After changing anything in `index.html` or `images/`:

    python3 bundle.py

It inlines every photograph and sprite as a data URI, strips the service worker
and manifest (meaningless in one file), and writes
`FNAAC.html`.

Sound files, if you add any, are not embedded — the synthesized fallbacks play
instead. If you want real audio in the single file, add the sounds folder to the
embed list in `bundle.py`; expect the file to grow by roughly their size plus a
third.
