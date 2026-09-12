# Update an already-working server to 0.3

Your Cloudflare Tunnel, `play.fnaac.world`, port 2567, and GitHub Pages hosting stay the same. The server now runs Tank Arena, Tank Frontier, and accounts together.

## 1. Back up before replacing files

In your current server folder, run:

```powershell
npm.cmd run db:backup
```

Keep the printed backup file somewhere safe. Stop the server with Ctrl+C (or stop its scheduled task).

Extract this update. Copy its source folders and package files into your server folder. **Keep your existing `.env`, `data/`, `backups/`, and customized `arena/config.js`.** Do not replace your database with an empty folder. The ZIP contains no player database, passwords, cookies, or recovery codes.

Run:

```powershell
npm.cmd ci
npm.cmd start
```

The server automatically applies database migration 002. Existing arena profile IDs, kills, and deaths are retained. The new database should be used with this version of the server; to roll back, stop it and restore your pre-update backup into a separate file using the restore command.

## 2. Update the public website

Copy these complete folders into your GitHub Pages publishing folder, alongside your existing games:

- `arena/`
- `frontier/`
- `account/`

Keep their relative arrangement: both games import shared files from `account/`, and Frontier uses the bundled SDK and protocol definitions in `arena/`. No browser build is needed.

`account/config.js` already uses `https://play.fnaac.world` on your public website and the current local server on localhost. If you use another backend hostname, update it there and in your existing `arena/config.js`. A saved browser override under Server settings takes precedence.

The prepared homepage is `website/index.html`. It adds Arena and Frontier alongside Tanks! and FNAAC in the homepage copy available for this update. I could not retrieve your live homepage, so use the following option if it now contains other games or custom changes:

```powershell
node tools/add-home-links.mjs "C:\path\to\your\website\index.html"
```

This adds missing Arena and Frontier links to your current homepage while preserving its other contents. It saves the original beside it with the suffix `.before-multiplayer`. Keep that backup outside your published files. Commit/push your website changes and refresh the game pages. Protocol version 3 requires the server and browser files to be updated together.

## 3. Create or claim your account

Open `https://fnaac.world/account/` and choose Create account. Use a username and a password of at least 12 characters. If you already played the arena, paste your **old `ta_…` recovery key** into the optional existing-profile field. The page fills it from this browser when available. This retains your lifetime arena stats.

Save the **new `ar_…` account recovery code** when it appears. Claiming a profile disables its old key. Your username/password now work for both games. Recovery codes reset your password without email; each reset or password change creates a replacement code and signs out old sessions.

Your current offline RPG save is preserved. Use `frontier/offline/` to play it or export it. Online characters start fresh; browser save imports cannot overwrite authoritative multiplayer progress.

## 4. Test the update

1. Sign in and join the arena; confirm your claimed stats and try full-speed movement.
2. Open another browser/incognito context, create a second account, and join Frontier from both.
3. Move out of Brindle together. Both players should see the same enemies and resource depletion. Loot and death wrecks belong to the player who earned/lost them.
4. Gather materials, craft a repair kit, and check equipment/skills. Stop and restart the server, then join again to verify progress.
5. Test Account → Change password or Recover, saving the replacement recovery code. Other sessions should be disconnected within about a second.

`npm.cmd test` runs the automated account, migration, movement, database, and real multiplayer checks without modifying your real database. Expected rejected connections and the simulated disk failure can print messages; use the final test summary to determine success.

The movement update renders your tank every display frame, predicts between simulation steps, blends small server corrections, and interpolates remote movement using server ticks. This addresses the previous 30 Hz stepping; your home connection, device rendering speed, and tunnel latency still affect the result. Interactive testing on your actual setup remains necessary.
