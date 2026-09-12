# Tank Arena — setup guide

This package contains both halves of the game. Keep the entire `tank-arena` folder on the computer running the server. Copy only its `arena` subfolder into your GitHub Pages website.

The game is an eight-player free-for-all with heavier tank driving, independently aimed turrets, server-controlled cannon shots and damage, a scoreboard, automatic respawning, and reconnection. It uses Colyseus on Node.js. SQLite persistence is included through Node 24; no separate database installation or paid hosting subscription is required.

## 1. Run it on your computer first

These instructions use Windows. The included files also run on macOS and Linux.

1. Download and install **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/en/download). Use the normal installer with npm. Reopen your terminal afterward.
2. Extract the ZIP to a normal folder, for example `C:\Games\tank-arena`. Do not run inside the ZIP viewer.
3. Open that folder in VS Code, then choose **Terminal → New Terminal**. Confirm that this folder contains `package.json`.
4. Run these commands in PowerShell:

```powershell
node --version
npm.cmd ci
Copy-Item .env.example .env
npm.cmd start
```

`node --version` should start with `v24`. The first installation needs internet access and can take a minute. Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`; no execution-policy changes are needed.

On macOS/Linux, use `npm ci`, `cp .env.example .env`, then `npm start`.

The server prints:

```text
Tank Arena ready. Open http://localhost:2567/arena/
```

5. Visit [the local arena](http://localhost:2567/arena/) in a browser, enter a name, and join.
6. Open the same address in an incognito window or a different browser, use another name, and join again. Both tanks should appear in the same arena. Each browser context creates its own profile on first join. Two tabs sharing one profile cannot play simultaneously.

Controls: **W/S** drive, **A/D** turn, **mouse** aims, **left click** fires, **Space** brakes. Each tank has 100 hull; each hit deals 34 damage. Death respawns you after three seconds. A gold ring grants two seconds of spawn protection; firing ends it.

In the Profile panel, use **Save recovery key** after your first join. Keep that file private: it is your login credential for returning from another browser.

The server must remain running. `Ctrl+C` stops it. On subsequent runs, open the folder and run `npm.cmd start`, or double-click `start-server.cmd`; dependencies need installation only initially or after an update.

## 2. Check the server before going online

Visit [the local status endpoint](http://localhost:2567/status). You should see JSON with `"ok":true`, a `roomId`, and player counts. This confirms that the server is listening.

The optional automated checks run with:

```powershell
npm.cmd test
```

These tests start their own temporary server and open actual multiplayer connections. They check joining, movement synchronization, combat, player limits, reconnection, request restrictions, persistent identity, full server restarts, interrupted saves, and backup/restore. They do not require you to stop your normal server, because they use a different available port. Deliberately rejected connections can print `4002` or an invalid reconnect-token message. The simulated failed-save test prints `test disk failure`; the final test summary determines success. All tests use temporary or in-memory databases and do not modify your real profiles.

## 3. Make a stable public connection to your home server

Use a named Cloudflare Tunnel for the permanent setup. This requires a Cloudflare account and a domain using Cloudflare DNS. If your DNS is currently elsewhere, follow Cloudflare's domain onboarding and preserve your existing GitHub Pages and other DNS records. Your website hosting can remain on GitHub Pages.

In Cloudflare's dashboard, go to **Networking → Tunnels**, create a tunnel, and choose your computer's platform. Run the dashboard's installation command on that computer; on Windows it may require an administrator terminal. Wait for the tunnel to report healthy.

Add a **Published application** route with:

| Setting | Value |
|---|---|
| Public hostname | `play.fnaac.world` |
| Local service | `http://127.0.0.1:2567` |

Keep the tunnel token private. Use the HTTP service type for this game; players connect with ordinary browsers. No inbound router port forwarding is required. [Cloudflare setup documentation](https://developers.cloudflare.com/tunnel/get-started/)

Keep `HOST=127.0.0.1` in `.env` when the tunnel runs on the same computer. The public connection uses HTTPS/WSS; the loopback connection between the tunnel and Node uses HTTP.

Visit `https://play.fnaac.world/status`. It should show the same server status. The address `https://play.fnaac.world/arena/` also serves the game directly if needed: expand Connection settings and enter `https://play.fnaac.world`, or set config.js as described below.

If you choose a different public hostname, add its exact HTTPS origin to the comma-separated `ALLOWED_ORIGINS` line in `.env`, then restart the game server. Origins contain a protocol and hostname, with an optional port and no trailing slash or path.

The supplied list already permits your `fnaac.world`, `www.fnaac.world`, and `play.fnaac.world` addresses plus the local test page. Keep existing entries you still use.

## 4. Put the browser game on GitHub Pages

Open `arena/config.js` and change it to:

```js
window.ARENA_CONFIG = { serverUrl: "https://play.fnaac.world" };
```

The bundled example comments can stay. Copy the entire **arena** folder into your website's published folder, beside `tanks`, `ac`, and `frontier`. This includes `colyseus.js`, its license, and `shared.mjs`; do not omit these files. No browser build is needed.

Only the public `arena` folder belongs in GitHub Pages. The `.env`, server files, package files, tests, and `node_modules` stay on the server computer. This split also prevents inadvertently publishing a future invite code or tunnel credential.

Add a link to your existing home page:

```html
<a href="/arena/">Tank Arena</a>
```

Commit and push, then wait for GitHub Pages to deploy. Your intended player address is [fnaac.world/arena/](https://fnaac.world/arena/). This package does not overwrite your existing home page or any other game.

If your Pages settings publish from `docs/`, copy the arena folder into `docs/arena/`. If Pages publishes from the repository root, use `arena/` at the root.

## 5. Test with someone outside your network

Have a friend open your website's arena address. They should see your tank after joining. Their computer requires only a browser; they do not install Node.js, Colyseus, or a tunnel.

Your home computer must run both the Node game server and the tunnel. Disable sleep while hosting and prefer wired networking if available. Restarting Node clears the live arena and session scores. Profiles and lifetime kills/deaths remain in the database. Restarting only the tunnel may interrupt connections, but the game attempts to reconnect for 30 seconds. WebSocket connections can also be interrupted by network maintenance; reconnect handling is built in. [Cloudflare WebSocket documentation](https://developers.cloudflare.com/network/websockets/)

A player whose connection drops remains vulnerable until their seat expires. If killed while disconnected, they respawn upon returning. This avoids granting invulnerability by disconnecting.

## 6. Optional private trial and player limit

Edit `.env` on the server:

```dotenv
MAX_PLAYERS=8
JOIN_CODE=
```

Leave the code empty for public joining. Set it to a private value if you want an invitation-only trial; the browser will ask for it when required. This is a shared admission code, separate from each player’s private profile key. Do not put the code into `arena/config.js` or commit `.env`.

The code supports limits from 2 to 16, but start with 8 until you measure performance on your computer and home connection. There is one room. Extra players receive an arena-full response; they do not silently enter a separate room.

Idle players are removed after three minutes. Browser origin checks, a connection/join rate limit, a message rate limit, payload limits, and input validation provide basic protection. Origin checks are not authentication and do not prevent a custom client from connecting. This is a public-playtest foundation, not a guarantee of resistance to determined abuse. Recovery keys are prototype credentials; password/email account recovery, moderation, and additional monitoring should accompany wider promotion.

## 7. Optional automatic startup on Windows

First confirm that manual startup and remote play work. If Cloudflare's installer registered the tunnel as a service, its service can start with Windows. The game server is a separate process and needs its own startup task.

In **Task Scheduler**, create a task for your Windows user:

- Trigger: **At startup**, with a short delay such as 30 seconds.
- Action: **Start a program**.
- Program: `C:\Windows\System32\cmd.exe`
- Arguments, adapting the folder if necessary: `/c ""C:\Games\tank-arena\start-server.cmd""`
- Start in: `C:\Games\tank-arena`
- Choose **Run whether user is logged on or not** if you need unattended hosting; Windows may ask for your local account credentials.
- In Settings, choose **Do not start a new instance** if already running. Disable the task's maximum run-time limit and enable restart on failure if desired.

Test the task using **Run**, then visit `/status`. Do not run a second manual copy on the same port. Node must be installed for the account running this task. You do not need to run the game itself as administrator.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `npm` or `node` is not recognized | Install Node 24 LTS and reopen the terminal. |
| PowerShell says `npm.ps1` cannot run | Use `npm.cmd` as shown above. |
| `ENOENT` mentioning package.json | Run commands from the extracted `tank-arena` folder. |
| `EADDRINUSE` | Another copy already uses port 2567. Stop that copy or change PORT and the tunnel's service together. |
| Local status does not load | Keep `npm.cmd start` running and inspect its error message. |
| Public status fails but local status works | Check the tunnel's healthy status and its service address/port. Confirm Node is still running. |
| Public status works but the game cannot join | Check config.js, exact ALLOWED_ORIGINS entries, arena code, and available seats. Restart Node after editing .env. |
| Game says it needs HTTPS | An HTTPS website must use the public HTTPS server address, not a plain HTTP address. |
| Status works at localhost but not at your LAN IP | Default binding intentionally accepts only local connections for the tunnel. See LAN testing below. |
| Wrong server address persists | Expand Connection settings, enter the desired address, and use Check server. A previously saved browser override takes precedence over config.js. |
| Profile is already in the arena | Use incognito or a different browser for a second player, or leave the first session. An interrupted session can take 30 seconds to expire. |
| Profile key is invalid after restoring a database | The backup may predate that profile. Return to the previous database or create a new profile explicitly. |
| Match paused: stats could not be saved | Check server logs, free disk space, database permissions, and competing writers. Run db:check, address the cause, then restart. Committed lifetime stats are retained. |
| Room stays full after someone closes a tab | Their reconnect seat can remain reserved for up to 30 seconds. Leave explicitly to release it immediately. |
| Join requests temporarily fail after repeated attempts | Wait a minute for the request limiter to reset. |

For optional LAN testing without a tunnel: set `HOST=0.0.0.0`, add `http://YOUR-LAN-IP:2567` to ALLOWED_ORIGINS, restart Node, and allow the port through the computer's firewall on your private network. Other devices open `http://YOUR-LAN-IP:2567/arena/` and enter that same server address under Connection settings. Restore the loopback bind for the tunnel-only setup. You do not need to enable LAN access to use the tunnel.

## 8. Profiles and persistence

A new browser creates a profile when you first join. The browser remembers a randomly generated private key; the server stores only its SHA-256 hash alongside a stable profile ID. A display name is not a login, and two profiles may use the same name. Renaming your tank on the join form does not reset its lifetime stats.

**Save recovery key** downloads a small text file. To return from another device or browser, open **Profile → Recover or change profile**, paste the key from that file, and select **Restore profile**, then join. Leave the old session first. The same profile cannot occupy two seats, including a disconnected seat within its 30-second reconnect window.

Keys are remembered separately for each server address and browser origin. Moving from localhost to fnaac.world, or changing the public server hostname, requires restoring your saved key on that page. Profiles belong to the server database, so a key works only against the database that created it. A recovery key is different from the optional shared arena admission code.

**Use a new profile** removes the saved key from this browser after confirmation. It does not delete the server’s records. Save the old key first if you want to return. Invalid keys never silently create replacement profiles. If browser storage is unavailable, the page can retain the key only until it closes; use the download immediately.

This prototype has no passwords, email reset, or account recovery service. Anyone holding a key can play that profile. Losing both the browser’s copy and your downloaded copy means the profile cannot be recovered through the game. Keep keys off GitHub and do not share them. Public play uses HTTPS; keys are sent in request headers or join bodies, never URL query parameters.

The database defaults to `data/arena.sqlite`, created automatically at startup. You can set `DB_PATH` in `.env`; relative paths are resolved from the project folder. This file, its `-wal`/`-shm` companions, and backups remain on the server computer. Do not put them in `arena/`, GitHub Pages, or a synced network drive used by several servers. Run one arena server against the database.

The session scoreboard tracks the current connection session; a short reconnect retains it, while leaving or restarting the server resets it. Your Profile panel shows lifetime kills and deaths, which survive both. Both sides of a kill and its unique combat event are committed in one transaction before the server reports the kill. Retrying an identical event does not add duplicate stats. A failed commit rolls back the operation and pauses gameplay until the host resolves the problem and restarts.

SQLite uses WAL journaling and FULL synchronization. Saves occur on profile changes and kills, not on every movement tick. This deliberately small synchronous workload suits the test server; measure save latency before expanding it into a large RPG. Database opening errors stop startup rather than falling back to temporary storage.

## 9. Test saving, backups, and recovery

A manual persistence check:

1. Join with two independent profiles and save both recovery keys.
2. Destroy one tank. Confirm session scores and the attacking player’s lifetime kills change.
3. Stop the server with Ctrl+C, then start it again using the same folder and DB_PATH.
4. Rejoin. Lifetime stats should remain, while session scores start at zero.
5. Leave, open another browser, restore a saved key, and join. It should recover that profile’s lifetime stats.

Run these commands from the project folder in a second terminal:

```powershell
npm.cmd run db:check
npm.cmd run db:backup
```

The backup command prints a timestamped file under `backups/`. It uses SQLite’s online backup API, including committed WAL data, so it can run while the game is running. Never copy only the live `.sqlite` file as a backup. Each completed snapshot is validated before it is placed at the destination. [SQLite backup documentation](https://www.sqlite.org/backup.html)

You can choose a destination explicitly:

```powershell
npm.cmd run db:backup -- backups/before-update.sqlite
```

To test restoration without overwriting your active data:

```powershell
npm.cmd run db:restore -- backups/before-update.sqlite data/restored-test.sqlite
npm.cmd run db:check -- data/restored-test.sqlite
```

Restore always requires a **new destination filename**. To use the restored copy, stop the game server, set `DB_PATH=data/restored-test.sqlite` in `.env`, then restart. You can switch back to the original DB_PATH to return to the original data. Both backup and restore refuse to overwrite existing destinations.

Restoring returns records to the backup’s point in time: later stats and profiles are absent from that copy. Keep the original database until you have verified the restore. Back up before updates and periodically while hosting; schedule `db:backup` with Task Scheduler if desired. Backups are manual unless you schedule them. Copy completed backup files to another device for protection against disk failure; a backup on the same disk cannot cover that failure.

## 10. Updating from the first arena ZIP

Stop the old server. Replace the source files with this version, retaining your existing `.env`, customized `arena/config.js`, and any future `data/` or `backups/` folders. Do not extract a blank database over an existing one; this package contains no player database or keys.

Run `npm.cmd ci` again, then `npm.cmd start`. An older `.env` still works because DB_PATH defaults to `data/arena.sqlite`; add the DB_PATH line if you want a custom location. The original 0.1 arena never saved profiles or lifetime scores, so there is no old persistent data to import.

Replace the entire public `arena/` folder in GitHub Pages, including the new `profiles.mjs`, and retain your server URL in config.js. This update uses protocol version 2, so update the server and browser files together. Existing games and your home page do not need changes.

## Project layout and future work

- `arena/`: the complete static browser game; only this directory goes to Pages.
- `arena/shared.mjs`: movement rules and map geometry used by browser prediction and server simulation.
- `arena/client.mjs`: controls, local prediction/reconciliation, remote interpolation, drawing, and connection UI.
- `server/simulation.mjs`: authoritative fixed-step movement, bullets, damage, scoring, and respawns.
- `server/arena-room.mjs`: Colyseus room lifecycle, messages, capacity, and reconnect handling.
- `server/profile-store.mjs`: profile credentials, SQLite access, atomic stats, and snapshot validation.
- `server/migrations/001-profiles.sql`: versioned schema; subsequent schema changes should add migrations.
- `server/database-cli.mjs`: database check, backup, and restore commands.
- `arena/profiles.mjs`: profile recovery and credential storage; stats remain server-owned.
- `server/main.mjs`: HTTP and WebSocket server, status, static-file allowlist, and request restrictions.
- `package-lock.json`: the exact tested server dependency versions; `npm ci` installs them.
- `tests/`: repeatable simulation tests and an actual two-client connection test.

The server simulates at 30 ticks per second and sends snapshots at 15 per second. The browser predicts its own driving, corrects it from server results, and interpolates remote players. Shots, hit detection, cooldowns, and health are server-owned. Session scores are memory-only. Lifetime stats and profiles are stored in SQLite. There are no RPG saves or item transfers yet.

After local and remote testing, the next step can be full account login/recovery and persistent RPG characters, followed by adapting the RPG simulation. This arena is independent of Tank Frontier and Tanks!, so testing it does not change either game.

Verification performed: automated real client connections, movement, combat, capacity, a forced network drop and reconnect, full server restart with lifetime-stat preservation, fresh session scores, profile ownership and duplicate-session checks, interrupted-transaction rollback, committed-write recovery after abrupt exit, live backup/restore, save-failure pause, origin/route restrictions, and simulation rules. A headless client check also covered the bundled browser SDK, joining, snapshots, scoreboard updates, Canvas drawing, leaving, recovery-key export, forgetting a browser key, restoring it, and rejoining the same profile. Interactive browser and home-network playtesting remain for your setup. No public tunnel or GitHub deployment was performed on your behalf.
