# FNAAC Autopilot Reference — V 2.2.0

This document describes the benchmark autopilot implemented in `game.js`. The bot is intended to model a **perfect-execution player**, not an omniscient one. It reacts with exact timing and perfect memory, but its release behavior is limited to information a human player could actually obtain from the game's camera feeds and sound cues.

## 1. Purpose and activation

- Press **B** during a normal night to toggle the autopilot.
- `BOT_CHEATS` is `false` in the release build.
- The bot is disabled during **MIDNIGHT SHIFT**, because the existing benchmark controller is designed around one Sloppy and would not be a valid perfect-player model for three independent Sloppys.
- The bot runs its decision loop roughly every **100 ms**.

The autopilot's job is to minimize four resources at the same time:

1. Main electrical power.
2. Camera battery/stability.
3. Camera exposure time.
4. Attention that must be divided between Sloppy, Gordon, Jeffrey, faults, and the office.

It does **not** know future random rolls, future paths, or hidden locations. Its advantage is perfect memory and exact execution.

---

## 2. Information model: what the bot is allowed to know

The bot only commits a character's location to memory when that information has legitimately become available.

### Camera visibility

With `BOT_CHEATS = false`, camera static counts as genuinely opaque. If Eugene's movement flicker, doorway transit static, or an unstable-feed dropout covers the current feed, the bot waits for the picture to become readable before deciding whether a character is present.

### Audible information

The bot reacts to the same event cues a player can hear:

- Sloppy entering the building.
- Sloppy moving.
- Sloppy being successfully stopped by a completed watch cycle.
- Gordon's pre-movement warning.
- Gordon's actual movement sound.
- Gordon striking a door.
- Gordon exiting a duct upstairs.
- Motion-sensor chirps when a sensor is mounted.

### Exact memory

When a character is legitimately seen, the bot stores:

- camera ID,
- graph node,
- time seen,
- how that information was obtained (`seen`, `sensor`, `door`, or a deterministic `predicted` Gordon step).

The memory is not erased merely because a later search fails.

---

## 3. Finite camera searches

A major design rule is that a search is **one sweep, not a loop**.

When Sloppy moves or Gordon gives a warning:

1. The bot starts with the last camera where the character was actually seen.
2. It checks cameras covering that node and adjacent nodes.
3. It checks the remaining stable cameras on the relevant floor.
4. Unstable cameras are checked last.
5. Each camera is checked once for that event.

If every relevant camera has been checked and the character is not visible, the bot assumes the character is currently in a camera-blind graph position. It lowers the monitor, preserves the last known location, and waits for the next audible event before searching again.

This prevents the bot from wasting an entire night sweeping cameras for a character who physically cannot be seen at that moment.

The nominal perfect-player camera-check dwell is **80 ms per readable feed**. Static can extend that because the bot must wait until the image is readable.

---

## 4. Global priority order

The main decision loop follows this approximate threat hierarchy:

1. **Release a Gordon door that has already served its purpose.**
2. **Eugene at the doorway: lights off immediately.**
3. **Jeffrey on the active camera: switch away immediately.**
4. **Camera system offline: repair cameras.**
5. **Active Gordon warning / required Gordon door action.**
6. **Emergency doorway threats, especially Sloppy at the office.**
7. **Door Array repair when Gordon is still downstairs and it is becoming urgent.**
8. **Continue or cancel an already-running reboot based on threat timing.**
9. **Critical ventilation repair if oxygen cannot safely wait.**
10. **Normal Sloppy observation cycle.**
11. **Noncritical maintenance during downtime.**
12. **Low-power dark-office idle cycle.**

The key principle is that the bot compares the *cost of missing an action*. Missing one Sloppy observation usually costs one room of ground. Missing the wrong Gordon door can put Gordon upstairs with no remaining defensive door, so Gordon wins most direct timing conflicts.

---

## 5. Office lights and main power

The bot treats darkness as the default idle state.

### Normal idle cycle

- Lights remain off for up to approximately **6.3 seconds**.
- The official ventilation-safe darkness window is **7.0 seconds**, so the bot keeps about 0.7 seconds of reaction margin.
- It briefly restores the lights for about **180 ms** to reset the darkness timer.
- It then shuts them off again if no other task requires power.

### Eugene override

Eugene at either office doorway is an absolute interrupt:

- Any nonessential reboot is cancelled.
- The office lights are shut off immediately.
- If the monitor is not doing useful Sloppy work, it is lowered too.

There is one important exception: if the bot is already looking at the camera containing Sloppy and has enough camera battery to finish the remaining observation, it can keep the monitor raised on residual camera power while the office remains dark.

---

## 6. Camera battery management

The bot treats camera stability as a scarcer resource than a small amount of main power.

### During Sloppy work

When Eugene is not at the door, the bot generally turns the office lights **on while actively watching Sloppy** because powered camera use drains the camera battery at half the lights-off rate.

### Recharge behavior

After a successful Sloppy block, the bot looks for a genuine slack window before the next worst-case Sloppy deadline and uses that time to:

- lower the monitor,
- shut off the office lights when possible,
- recharge the camera battery.

It does not recharge merely to make the meter look full if doing so would endanger the next five-second Sloppy observation.

For a fresh Sloppy job, the bot prefers roughly **80%+ camera stability** when it has enough time to wait, giving room for the five-second observation plus event drains.

---

## 7. Sloppy strategy

Sloppy is managed as a deadline-driven observation task.

### Scheduling the next check

The bot calculates Sloppy's **worst legal movement interval**, not the expected interval. It assumes:

- the hardest hourly ramp,
- the lowest random movement jitter,
- the character's speed and rhythm modifiers.

It then calculates the latest safe time to begin the next five-second observation, with an additional small camera-relocation margin.

### When Sloppy enters or moves

The audible event marks Sloppy as needing attention. The bot:

1. Reuses the last known Sloppy camera first.
2. Performs a finite upper-floor search if necessary.
3. Once found, watches until Sloppy's five-second bank is complete.
4. Uses the growl/glitch confirmation to know the observation bank is ready.
5. Gets off the monitor as soon as the cycle's useful work is complete.

Sloppy's accumulated watch time persists across camera switches. Static also counts as observation if the correct camera is selected, matching normal player behavior.

### Audio lure use

Audio is a regular resource, not just a doorway emergency.

After the five-second observation requirement has been satisfied, the bot may queue a lure if:

- the audio system works,
- cooldown is ready,
- Sloppy is not already committed to an earlier successful lure,
- power reserve is acceptable,
- Sloppy is close enough to justify it, or enough cycles have passed since the previous cue.

At healthy power, the bot is willing to cue very frequently. At lower power, it spaces cues more aggressively.

A successful lure remains active for multiple movement opportunities and each committed step is consumed correctly.

### If Sloppy cannot be seen

If the complete upper-floor sweep finds no Sloppy, the bot stops searching, keeps the old memory, lowers the cameras, and waits for the next Sloppy movement sound.

---

## 8. Gordon strategy

Gordon is handled from his approximately four-second pre-movement tell.

### Memory-based risk test

The bot does not automatically open the monitor for every Gordon sound. From the last legitimately seen downstairs position and the number of audible steps since then, it computes the set of positions Gordon could currently occupy.

If none of those possible positions can cross a still-functioning door on the upcoming move, the bot skips the camera search entirely.

This saves camera battery and avoids stealing time from Sloppy for harmless Gordon hallway movement.

### When a door might matter

If a door crossing is possible:

1. Gordon's tell creates a response deadline.
2. The bot opens the monitor and changes to Floor 2.
3. It begins near Gordon's last seen camera/node.
4. It waits out static like a human player.
5. Once Gordon is seen, it predicts the next movement edge from Gordon's current target state.
6. If that edge crosses a live door, the bot closes that exact door.
7. It lowers the cameras immediately afterward.

### Door impact and release

When Gordon actually hits the closed door:

- The block has already succeeded.
- Reusable doors are opened immediately afterward to stop unnecessary power drain.
- The Payroll one-shot door is treated as broken after its special impact.

Opening a used door is intentionally fail-open, so the bot can release it even while Eugene forces the office dark.

### Forced Payroll movement

After an ordinary blocked Gordon door, Gordon's next step toward Payroll is deterministic. Because this is a public gameplay rule, the bot predicts that one step without spending camera battery to rediscover it.

### Gordon versus Sloppy

An active Gordon warning usually interrupts Sloppy immediately, even if Sloppy is close to completing five seconds. Sloppy's accumulated watch time remains banked, while missing a Gordon door can permanently remove the player's defense.

The exception is when the bot can mathematically prove that finishing the remaining Sloppy observation still leaves enough time for breaker warm-up, camera relocation, and the required Gordon door command.

---

## 9. Jeffrey strategy

Jeffrey requires a simple but absolute reaction:

- If Jeffrey appears on the active feed, the bot changes to another functioning camera immediately.
- It prefers a non-unstable feed when available.

Jeffrey does not cause a broad search. The bot only reacts when the threat is actually present on the feed being viewed.

---

## 10. Fault and reboot strategy

Individual system repairs take **6 seconds**. Reboot All takes **11 seconds**.

### Camera fault

Camera failure is the most urgent generic system fault because both Sloppy observation and downstairs Gordon defense can require camera access.

### Door Array fault

While Gordon is still downstairs, the bot evaluates how many possible steps separate him from a live door. If the Door Array is broken and Gordon is becoming close enough that a later four-second warning would be too late for a six-second repair, the bot repairs the array proactively.

If Gordon is safely multiple steps from every usable door and Sloppy urgently needs observation, Sloppy can be handled first.

### Ventilation fault

Ventilation urgency is based on an actual time budget rather than a fixed oxygen percentage. The bot estimates:

- time until oxygen reaches zero,
- breaker warm-up if the office is dark,
- remaining Sloppy observation time,
- the six-second repair,
- a reaction margin.

Only when that combined budget no longer fits does ventilation preempt Sloppy.

### Audio fault

Audio is normally repaired during genuine downtime, provided the six-second repair fits before the next Sloppy deadline.

### Reboot All

The bot uses the 11-second Reboot All only when multiple systems are down during genuinely quiet early-night downtime. Once Sloppy or Gordon is actively demanding time, two targeted six-second repairs are usually easier to schedule safely than one uninterrupted 11-second block.

### Active repairs and Gordon

Gordon normally interrupts maintenance. However, if a camera or Door Array repair is already nearly finished and the remaining repair time plus a conservative Gordon response reserve still fits inside Gordon's warning window, the bot finishes the relevant repair instead of throwing away almost six seconds of completed work.

---

## 11. Doorway emergencies

### Eugene at the door

Darkness is immediate and non-negotiable.

### Sloppy at the door

A doorway Sloppy is no longer treated as an ordinary five-second cycle. The bot attempts the special audio recall if the audio system and cooldown allow it. If that cannot be done, it falls back to the normal doorway survival behavior.

Gordon's active door warning still outranks the Sloppy doorway task if both occur simultaneously.

---

## 12. Why this is a useful benchmark

The bot deliberately has several advantages over a human:

- exact timing,
- exact memory,
- instant recognition once a readable feed is shown,
- consistent 80 ms camera decisions,
- no panic or input mistakes.

But it does **not** have the most damaging unfair advantages:

- it cannot see through camera static,
- it cannot see camera-blind rooms,
- it does not know future random rolls,
- it does not know Gordon's hidden future path before the public rules and observed state allow that inference.

That makes a successful autopilot run evidence that the mechanics are schedulable by a theoretically excellent player, while human playtesting remains necessary to decide whether the experience is actually understandable and enjoyable.

---

## 13. V 2.2.0 special-night limitation

The new **MIDNIGHT SHIFT** easter-egg challenge contains three independent Sloppys. The current benchmark autopilot is intentionally disabled in that mode because its state (`sloppyNeeds`, one Sloppy memory, one observation deadline, one cue target) assumes a single Sloppy.

A future benchmark for MIDNIGHT SHIFT should use a separate scheduler with one watch bank and deadline per clone rather than trying to stretch the normal-night bot into a different problem.
