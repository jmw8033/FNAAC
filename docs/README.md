# FNAAC games — GitHub Pages package

This package adds Tanks! at https://fnaac.world/tanks/ and moves your uploaded Five Nights at Atlantic Concrete game to https://fnaac.world/ac/. The root becomes a small game selector. GitHub Pages normally redirects the directory URLs without a trailing slash to these slash-ending URLs.

## Install into your EXISTING publishing folder

1. Back up your existing root index.html and game.js, or make a Git commit before changing them.
2. Extract this ZIP and copy its contents into the folder currently published by GitHub Pages. Usually this is the repository root; if Pages publishes `/docs`, copy the contents into `/docs` instead. Do not upload the ZIP itself or put the whole package inside another folder.
3. KEEP the existing `images/` and `sounds/` folders at the root of that publishing folder. Their contents were not attached and are not included here. The adjusted AC game deliberately points to `../images/` and `../sounds/`.
4. The provided root `index.html` replaces the old main page with the game selector. The copies in `ac/index.html` and `ac/game.js` are based on your attached `index(4).html` and `game(3).js`. The migration changes image/sound references only. A scoped `ac/manifest.json` is also supplied.
5. Keep a single root `CNAME` containing `fnaac.world`. The included CNAME has that value. No DNS changes are needed for the two subpaths. The empty `.nojekyll` file supports plain static publishing.
6. Commit and push the changes to the branch/folder already used by Pages. If you use a custom Pages workflow, ensure its output contains `index.html`, both game directories, and your existing asset directories. No npm install, build, server, or database is required for Tanks!.
7. After the Pages deployment finishes, visit the root, `/tanks/`, and `/ac/`. Test AC images, audio, and existing saved nights. Once `/ac/` works, you can remove the now-unused old root `game.js`. Other root utilities can remain in place.

Expected files and URLs:

| File in publishing folder | URL / purpose |
| --- | --- |
| index.html | https://fnaac.world/ — game selector |
| tanks/index.html | https://fnaac.world/tanks/ |
| tanks/game.js, levels.js, style.css | Self-contained Tanks assets |
| ac/index.html, game.js, manifest.json | https://fnaac.world/ac/ |
| images/ and sounds/ | Your existing files; leave these at root |
| CNAME | Existing custom domain |
| .nojekyll | Plain static publishing |

Existing AC progress keys are unchanged. Local storage is shared by origin, so progress on `https://fnaac.world` remains available at `/ac/`. Tanks uses separate `fnaac-tanks-*` keys. A different domain, protocol, browser, or cleared browser storage will not share those saves. Your original analytics remains in AC; no new tracking was added to Tanks.

If your repository has an old service worker that caches `/index.html`, it may temporarily show the old root game. That worker was not among the attachments, so it has not been changed. Update its existing cache/version strategy if this occurs. Do not delete unrelated site files as part of this migration.

## Tanks! gameplay

An unofficial Canvas 2D browser adaptation, inspired by Wii Play's Tanks!. It uses original canvas graphics, original arenas, synthesized effects, and newly implemented AI. No Nintendo artwork, music, or game code is included.

- Independent tank movement and turret aim; one hit destroys a tank.
- Five active player shells, two active mines, shell cancellation, ricochets and friendly/self damage.
- Mines have a 10-second fuse, a short arming delay, proximity detonation, and shell-triggered chain reactions. Blasts remove cracked blocks and pass through cover.
- Solid cover and pits; shells can cross pits.
- Nine enemy classes with different movement, shell speed, shot limits, ricochet counts, mine use, and behavior. White enemies become invisible, leaving tracks; green enemies search for predictive bank shots.
- 20 authored missions. Clearing solo mission 20 unlocks a 100-mission campaign on subsequent runs; later missions reuse arenas with deterministically generated enemy compositions. Black tanks appear from mission 50.
- Solo starts with three lives and grants one extra life after every five cleared missions. Defeated enemies remain defeated on retry. Best cleared mission and the long-campaign unlock persist; there is no mid-run save/continue.
- Local two-player semi-cooperative play: friendly fire, separate kill scores, teammate revival next mission, and game over when both fall. Duo ends after 20 missions.

This is a mechanics-focused adaptation, not an exact recreation. Arena layouts, enemy counts in the first 20 missions, physics timings, pathfinding, dodge behavior, bank-shot calculation, effects, and audio differ from the Wii game. It has no original soundtrack, online multiplayer, or exact Wii mission maps. Enemy placement is deterministic for repeatable retries. The aim guide indicates direction, not a guaranteed hit trajectory.

## Controls

| Action | Player 1 | Player 2 (local duo) |
| --- | --- | --- |
| Move | WASD | Arrow keys |
| Aim | Mouse | I / J / K / L |
| Fire | Left click / hold | Enter / hold |
| Lay mine | Space | Right Shift |
| Pause | Escape or on-screen pause | Same |

On touch devices, use the direction buttons, drag on the battlefield to aim and fire, and tap Lay mine. Touch controls support player 1. For duo, use a keyboard or gamepad for player 2.

Standard-mapped gamepad: left stick moves, right stick aims, right trigger fires, A lays a mine. The first connected pad controls player 1 in solo, player 2 in duo; a second connected pad controls player 1 in duo. Browser/controller mappings can vary.

Full screen and sound toggles are in the header. Losing window focus pauses active play. Sound begins after interaction, in line with browser autoplay restrictions.

## Editing / testing

`tanks/levels.js` owns arena definitions and later-mission generation. Grid cells are 40 pixels; kinds are 1=wall, 2=destructible wall, 3=pit. `tanks/game.js` owns enemy tuning, physics, AI, input, state transitions, rendering, and audio. `tanks/style.css` owns the surrounding interface.

To test locally, open `tanks/index.html` directly, or run `python -m http.server 8000` from the publishing folder and visit `http://localhost:8000/tanks/`. AC needs your actual asset folders beside `ac/`.

Validation performed: JavaScript syntax for both games; 12 headless engine checks covering generated spawn placement, shell and mine limits, wall bounce, rockets, self-damage, shell cancellation, blast cover destruction/chaining, pits, next-mission flow, retry persistence/lives, campaign unlock, and duo defeat handling. Route entrypoints and relative script/style references were checked. AC changes were compared against the attachments to confirm only asset prefixes changed. Browser visual/gamepad/touch playtesting and AC asset loading could not be completed in this environment. Playtest before deploying publicly, particularly for difficulty and AI tuning.

## References

- Gameplay rules and enemy attributes: https://nintendo.fandom.com/wiki/Tanks! (the provided URL works without the trailing underscore).
- Additional overview: https://en.wikipedia.org/wiki/Wii_Play
- GitHub Pages entry files and directory structure: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

No changes have been pushed to your live website by creating this package.
