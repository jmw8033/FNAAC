# Tanks! Mission Workshop update

## Install

Merge the ZIP's `tanks/` folder into your existing GitHub Pages publishing folder, replacing the older Tanks files. Commit and push as usual. This ZIP includes no root page, CNAME, AC game, AC images, or AC sounds.

- Game: https://fnaac.world/tanks/
- Editor: https://fnaac.world/tanks/editor/

If your publishing folder is `/docs`, these files belong under `docs/tanks/`. If a browser still uses old files after deployment, hard-refresh. No build step or new dependencies are needed.

This update is based on the Tanks version supplied earlier in this conversation. Any subsequent edits you made directly to those Tanks files will need merging; the working AC game is outside this update.

## Design and organize missions

The editor opens with the original 20 missions. The starting-point menu can load the original 100-mission sequence, the six new Reinforcements missions, or an installed published campaign.

- Paint solid walls, cracked/destructible walls, and pits; drag to paint multiple cells. The eraser removes obstacles and enemies. The outer border is locked.
- Place both player starts. These starts cannot be erased or painted over.
- Pick a tank from the palette and use the Enemy tool to place it. To change an enemy in place, click it with a different palette type selected or use the selected-object inspector.
- Use Select / move to drag tanks between empty cells. The inspector also accepts exact cell coordinates.
- Add a mission, duplicate one, remove one, or reorder using Earlier/Later or by dragging the mission list.
- Undo/redo covers map edits, mission order, names, imports, deletion, and preset loading. History lasts for the current editor session; the draft campaign persists between reloads.
- Keyboard on the canvas: arrows move the cell cursor; Space applies the tool; Delete erases. Ctrl/Cmd+Z undoes, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redoes. Text fields retain their native undo behavior while focused.

The editor supports 1–100 missions and up to 24 enemies per mission. Both player starts are required for duo compatibility, even when testing solo. A temporarily empty mission can be saved as a draft, but play/export requires at least one enemy per level.

## Save, test, and publish

Draft changes autosave only in the current browser on the current origin. Export JSON regularly for a portable backup; browser data can be cleared. Import JSON restores an exported pack. A quota/storage failure is shown in the status message instead of being reported as a save.

**Test level** opens a one-mission playtest in a new tab. **Play campaign** opens the full current sequence from mission 1. The game selects the Editor playtest option automatically. After making more edits, launch Test level / Play campaign again to refresh that snapshot. Existing game tabs keep the pack they originally loaded.

**Export campaign.js** downloads a script containing only validated level data. Replace `tanks/campaign.js` in your GitHub Pages repository with it and push the deployment. The game then defaults to Published campaign, while Classic and Reinforcements remain selectable. The editor itself does not write to GitHub. Later game updates should preserve your customized campaign.js.

The JSON format is version 2. Each level has a 24 × 15 grid (0 = floor, 1 = solid wall, 2 = cracked wall, 3 = pit), two player cell coordinates, an enemy list, a name, and a music selection. Imported packs reject malformed grids, broken borders, invalid tank types, overlapping starts, obstructed spawns, and excessive counts. Enemies with no driving route generate warnings, because firing across pits can be an intentional level design.

The editor uses the same physics/game when playtesting. Custom campaigns finish at their actual length in either solo or duo and do not alter the original campaign's progress/unlock records. Solo lives and retry behavior continue to work. There is no cloud save, collaborative editing, online multiplayer, or mid-run save.

For local use, run `python -m http.server 8000` from the publishing folder and open `http://localhost:8000/tanks/editor/`. The editor and game must share an origin to exchange playtests. Browser rules for local `file://` storage vary, so an HTTP server is recommended for the editor workflow.

## Three new enemy types

| Type | Ability and behavior | Counterplay |
| --- | --- | --- |
| Azure bulwark | Slow pursuit; a cyan arc marks its forward turret shield, which absorbs frontal shells and flashes on impact. | Attack its sides/rear, bank a shot behind it, or use mines. The shield does not stop explosions. |
| Coral scattergun | Three-shell fan, six active shells maximum; retreats when a player approaches. Its extra barrels distinguish it visually. | Attack between volleys or corner it. |
| Crimson lancer | Pursues, flashes and draws a direction line for 0.7 seconds, then dashes on that fixed heading for about 0.48 seconds, followed by a recovery pause. | Sidestep the warning, then fire during recovery. It cannot fire while charging, dashing, or recovering. It cannot cross obstacles and does not deal collision damage. |

All still have one hit point when an attack gets through. The new designs appear in the six-mission Reinforcements campaign and the editor palette. Original classic missions and unlocks remain available.

## Three original adaptive songs

| Track | Feel | Tempo |
| --- | --- | --- |
| Tin March | Bright tabletop march | 108 BPM |
| Paper Citadel | More urgent minor-key patrol | 116 BPM |
| Night Maneuvers | Slower, stealthy pulse | 100 BPM |

Each track is an original 16-bar synthesized loop with three synchronized arrangements/layers. No original Wii music recordings or melodies are included.

- Peaceful: soft melody, bass and harmony when only Brown/Ash enemies remain.
- Alert: adds moving bass, plucked accents and marching percussion for Marine, Yellow, Pink or Coral enemies.
- Intense: adds a counter-melody and stronger percussion while Green, Violet, White, Black, Azure or Crimson enemies remain.

The highest threat among **living enemies** controls the layers. Destroying the last high-threat tank reduces intensity smoothly over roughly half a second without restarting the song. Player tanks, wrecks and previous mission enemies do not affect intensity. A level may choose a song, or Auto rotates the three tracks by mission order.

Music starts after a user interaction, pauses with the game, and has an independent on/off button and volume slider. The existing Sound toggle mutes both effects and music. In the editor, choose a song and preview Peaceful / Alert / Intense while listening to hear layer changes. The music is generated live using Web Audio, so separate audio-file downloads are unnecessary.

## File map

- `game.js`: gameplay, enemy abilities and campaign integration.
- `levels.js`: original classic arena generator, unchanged.
- `units.js`: shared enemy names, tuning, colors and music-threat ranks.
- `packs.js`: validation, editor/game conversion and Reinforcements campaign.
- `campaign.js`: published custom campaign data; replace with your editor export.
- `music.js`: original compositions and adaptive Web Audio sequencer.
- `editor/`: standalone Mission Workshop interface.
- `index.html`, `style.css`: game interface, campaign selector and controls.

## Validation and limits

20 automated checks cover pack validation, original/expansion pack generation, custom spawn mapping, shell/mine limits, ricochet self-damage, shield/flank/explosion rules, spread-shot survival and caps, lancer telegraph/dash/recovery, rendering code execution, threat changes, custom campaign completion, retries, editor undo/redo and mission operations, playtest serialization, and all three music schedules/pause behavior. JavaScript syntax and local HTML resource paths were also checked.

These checks exercise the JavaScript engine and editor logic in a headless harness. Full browser visual, touch/gamepad, musical listening and gameplay-balance testing were not available here. Playtest the update before relying on difficulty or publishing a large custom campaign.

This package has not been pushed to fnaac.world.
