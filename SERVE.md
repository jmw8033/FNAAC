# Getting it onto a phone

The game is a folder of files. A phone can only load it over `http://` or
`https://`, so it needs to be served from somewhere — you cannot open it from a
downloaded zip the way you can on a laptop.

## Quickest, same wifi as your computer

From inside this folder:

    python3 -m http.server 8080

Then find your computer's local address (`ipconfig` on Windows, `ifconfig` or
`ipconfig getifaddr en0` on a Mac) and on the phone open:

    http://192.168.x.x:8080

Good enough for testing. It only works while that terminal is open and both
devices are on the same network, and because it is plain `http` the offline
install will not activate.

## Proper, for sharing with the company

Put the folder on any internal web server over **https**. Then on the phone:

- **iPhone** — open it in Safari, Share, *Add to Home Screen*
- **Android** — open it in Chrome, menu, *Install app*

It gets an icon, launches fullscreen with no browser bars, locks to landscape,
and after the first load runs with no connection at all.

`https` is the requirement for that last part. On plain `http` it still plays
perfectly, it just will not install or cache.

## Files

    index.html      the game
    manifest.json   name, icon, fullscreen, landscape
    sw.js           offline cache
    images/         photographs, sprites, icons
    sounds/         optional
    calibrate.html  the sprite tool, desktop only
