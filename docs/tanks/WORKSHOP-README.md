# Tanks! Mission Workshop — compact arenas update

## Install

Merge the ZIP's `tanks/` folder into your existing GitHub Pages publishing folder, replacing the older Tanks files. Commit and push as usual. This ZIP includes no root page, CNAME, AC game, AC images, AC sounds, or campaign.js. Keep your existing tanks/campaign.js; it is deliberately excluded to preserve any published custom campaign.

- Game: https://fnaac.world/tanks/
- Editor: https://fnaac.world/tanks/editor/

If your publishing folder is `/docs`, these files belong under `docs/tanks/`. If a browser still uses old files after deployment, hard-refresh. No build step or new dependencies are needed.

This update is based on the Tanks version supplied earlier in this conversation. Any subsequent edits you made directly to those Tanks files will need merging; the working AC game is outside this update.

## Design and organize missions

The editor opens with the 20 redesigned missions. The starting-point menu can load the redesigned 100-mission sequence, the ten Reinforcements missions, or an installed published campaign.

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

Exports use JSON version 3; existing version-2 packs and saved drafts still load with their contents preserved. Each level has a rectangular grid, 16–48 columns by 12–30 rows (0 = floor, 1 = solid wall, 2 = cracked wall, 3 = pit), two player cell coordinates, an enemy list, a name, and a music selection. Imported packs reject malformed grids, broken borders, invalid tank types, overlapping starts, obstructed spawns, and excessive counts. Enemies with no driving route generate warnings, because firing across pits can be an intentional level design.

The editor uses the same physics/game when playtesting. Custom campaigns finish at their actual length in either solo or duo and do not alter the original campaign's progress/unlock records. Solo lives and retry behavior continue to work. There is no cloud save, collaborative editing, online multiplayer, or mid-run save.

For local use, run `python -m http.server 8000` from the publishing folder and open `http://localhost:8000/tanks/editor/`. The editor and game must share an origin to exchange playtests. Browser rules for local `file://` storage vary, so an HTTP server is recommended for the editor workflow.

## Extra enemy types

| Type | Ability and behavior | Counterplay |
| --- | --- | --- |
| Azure bulwark | Slow pursuit; a cyan arc marks its forward turret shield, which absorbs frontal shells and flashes on impact. | Attack its sides/rear, bank a shot behind it, or use mines. The shield does not stop explosions. |
| Coral scattergun | Three-shell fan, six active shells maximum; retreats when a player approaches. Its extra barrels distinguish it visually. | Attack between volleys or corner it. |
| Crimson lancer | Pursues, flashes and draws a direction line for 0.7 seconds, then dashes on that fixed heading for about 0.48 seconds, followed by a recovery pause. | Sidestep the warning, then fire during recovery. It cannot fire while charging, dashing, or recovering. It cannot cross obstacles and does not deal collision damage. |

| Copper mortar | Stationary artillery that fires over walls at a fixed orange warning circle. Each round lands after 1.5 seconds with a 70-pixel blast radius; two rounds maximum, 3.8-second firing cooldown. | Move out of the warning circle, then flank the launcher. Impacts can damage any tank and destroy cracked cover. |

All still have one hit point when an attack gets through. These designs appear in the ten-mission Reinforcements campaign and the editor palette. Classic unlocks remain available; built-in layouts retain the corridor designs in more compact rooms.

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

Copper mortars also use the Intense layer. The highest threat among **living enemies** controls the layers. Destroying the last high-threat tank reduces intensity smoothly over roughly half a second without restarting the song. Player tanks, wrecks and previous mission enemies do not affect intensity. A level may choose a song, or Auto rotates the three tracks by mission order.

Music starts after a user interaction, pauses with the game, and has an independent on/off button and volume slider. The existing Sound toggle mutes both effects and music. In the editor, choose a song and preview Peaceful / Alert / Intense while listening to hear layer changes. The music is generated live using Web Audio, so separate audio-file downloads are unnecessary.

## File map

- `game.js`: gameplay, enemy abilities and campaign integration.
- `levels.js`: redesigned variable-size classic arenas and later-mission generation.
- `units.js`: shared enemy names, tuning, colors and music-threat ranks.
- `packs.js`: validation, editor/game conversion and Reinforcements campaign.
- `campaign.js`: your existing published custom campaign data; retained separately from this update.
- `music.js`: original compositions and adaptive Web Audio sequencer.
- `editor/`: standalone Mission Workshop interface.
- `index.html`, `style.css`: game interface, campaign selector and controls.

## Room sizes and movement tuning

Room dimensions include the one-cell outer border. Use Room width and Room height in the editor, then Resize room. Each cell remains 40 world pixels; tanks, hitboxes, and movement are not scaled up when a room grows. The game fits the full room on screen; Full screen helps with larger maps. The editor offers Fit, 100%, and 150% views, with scrolling when zoomed.

Resizing keeps content at its existing coordinates, opens the old border when expanding, and adds a new outer wall. Shrinking rejects any operation that would discard tank starts or interior obstacles. Move/erase those objects first; resize supports undo and redo.

All tank movement is reduced by 15%, including both players and the Lancer's dash. Standard shells are about 10% slower (245 → 221 world pixels/second); the Bulwark and Scattergun's slower standard shots scale similarly. Fast rockets and the Lancer's distinct 300-pixel/second shell retain their original speed.

Enemy aiming/path decisions now update every 0.38–0.55 seconds rather than 0.22–0.37. Dodge sensing checks every 0.09 seconds, with a separate reaction delay: Ash/Silver 0.34–0.42 seconds, most intermediate enemies 0.30–0.38, advanced enemies 0.24–0.32, and Black 0.18–0.26. A dodge commits to the observed direction for 0.24 seconds, followed by a 0.28-second recovery. Yellow still prioritizes mining; stationary tanks do not dodge. Tanks only react to approaching shells within 130 pixels with an unobstructed view.

Sixteen of the 20 opening arenas use the original 24 × 15 footprint. Green crossfire, Six green angles, The narrow road, and Fortress approach use 26 × 16, adding two columns and one row. Layouts include switchbacks, doglegs, breakable shortcuts, reservoirs, fortress walls, sniper galleries, and six-green-tank crossfire. Their world size is reduced rather than merely zooming the camera. Missions 21–100 reuse the compact layouts with seeded enemy compositions. Reinforcements has ten missions; missions 7–10 introduce artillery.

## Enemy firing discipline

Enemies check the actual shot path immediately before firing. They hold fire if a living teammate is in the path, including wall ricochets. The check uses a small clearance margin and a short, 0.35-second estimate of teammate motion. A blocked shooter retries after 0.16 seconds rather than consuming its full attack cooldown.

Scatterguns check all barrels in the volley. Mortars avoid impact areas near allied tanks, including their own launcher. Walls and a player struck before a farther ally terminate the safety trace. Player firing controls and actual friendly-fire damage are unchanged. A teammate can still move into an already-fired shot; these checks reduce accidental hits without granting immunity.

## Existing campaigns and drafts

Your editor draft is preserved. To edit the redesigned premade levels, choose Classic or Reinforcements under Load a starting point, then Load into editor. Export your draft first if you want a separate backup; preset loading can also be undone during the current editor session.

If your installed campaign.js contains a custom campaign, the game still defaults to Published campaign. Choose Classic campaign or Reinforcements on the game menu to see the redesigned built-in rooms. Exporting a new campaign is not required to play the new built-ins.

## Validation and limits

13 focused automated checks cover all 110 premade missions, compact room sizes and reachable spawns; direct-shot hold/resume; ricochet safety; rocket wall termination; player-hit termination; spread-shot barrels; nearby teammate motion; mortar impact avoidance; unchanged player firing and friendly-fire damage; and preserved movement tuning/custom room sizes. Updated scripts pass syntax checks.

The checks exercise JavaScript logic in a headless harness. Browser visual and game-feel testing were not performed. No live-site deployment was performed.
