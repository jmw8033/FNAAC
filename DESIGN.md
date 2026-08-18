# NIGHT SHIFT — design reference

Generated from `index.html`. Every number here is the number the game runs.

---

## 1. The shape of it

A security-camera horror game built from photographs of a real office. No
doors, no power meter, no way to lock anything out. You have two tools —
noise and attention — and two things that answer to them differently, plus a
third that answers to neither and cannot kill you.

A night runs 12 AM to 6 AM: **45000 ms** an hour, **270 seconds** in total.
The clock shows the hour; under it a stopwatch counts the shift in real
minutes and seconds, because the hour hand moves too rarely to time anything
by — a reboot, a gap between flickers, how long she has been out of sight.

---

## 2. The two of them

| | THE WARDEN | THE AUDITOR |
|---|---|---|
| At your door | a few seconds to cut the power | a cue into a nearby room, or **18%** on the breaker |
| Answers to | audio cues | audio cues, completely |
| Waits outside | 44000–5000 ms, plus a 24000 ms stagger | **26000–2000 ms**, no stagger |
| Lure resistance | 0.05 | **0.00** |
| Stalls while watched | no | yes, 0.85 |
| Pace | the night's base rate | 4.2× to 3.6× slower |
| Tell while you're on camera | every feed stutters | a soft dry tick |
| Sensor chirp | low falling double | high rising triple |
| Walk-by | heavy low drag | quicker, drier |

### The Warden — a reaction test

Walks the building at the night's base pace, mostly toward you. Reaching a
doorway starts a countdown; cutting the power inside it usually sends him past.
The first **1100 ms** are free, and after that your odds decay from
**95%** to **30%** by the end of the window. At 2200 the flicker that told you
he had moved left time to drop the monitor and hit the breaker at leisure; the
reflex has to be a reflex. A successful
pass-by pushes him **4 rooms** back out.

He is handled by reflex. Watching him achieves nothing.

### The Auditor — a prevention problem

Slow, and she does not turn around: her approach chance is fixed at
**0.95** regardless of night, where the Warden's climbs from 0.50 to 0.84 across the week. Watching her on the active feed nearly freezes
her.

Reaching a doorway is a crisis. She stands there for 3600–2600 ms first — long
enough to react once, but not safely. A player-fired audio cue aimed at another
feed can pull the Auditor away immediately if it lands. This emergency escape
is exclusive to her; it never works on the Warden at a doorway.

Her `lureResist` is **0.20**, so she can ignore a cue. A cue she takes carries
her **7 moves** across the floor, against **3** for him. The door escape counts
as the first of those seven moves.

Cutting the mains while she stands there is the fallback, not the answer:
**one** roll at **18%**, taken once per arrival, and taken automatically if she
walks into an office that is already dark. A cue into the room next door is
44%, and two rooms out 26.5%.

### Her pace, and why it changed

`moveMult` multiplies the night's move interval, and her rhythm of **1.27**
multiplies it again. At the old **5.2–6.5** that meant a step every **39
seconds** on night six — around seven for the whole night, against seven rooms
of building to cross, before the watch stall slowed her further. She could be
ignored outright. The values now tighten across the week rather than loosening:
**4.2 · 4.05 · 3.9 · 3.8 · 3.7 · 3.6**, roughly a step every 48 s on night one
and 22 s on night six, falling to 18 s by 5 AM.

She also stops loitering. Her wait outside is her own figure now rather than
the night's — **26000 · 19000 · 13000 · 8000 · 4000 · 2000 ms** — and she no
longer takes the second-arrival stagger, which used to add a flat 24 seconds on
top. On night six she was on the pavement for the first half-minute of a
four-and-a-half minute shift; now she is walking almost immediately. A step
still costs a full move interval on top of that, so this is a floor on when she
starts, not on when you first see her.

Knocks per night, measured over 120 nights per figure against a player who
never plays a cue:

| | night 1 | night 3 | night 6 |
|---|---|---|---|
| watching her half the night | 0.2 | 0.9 | 2.4 |
| never watching her | 0.7 | 1.7 | 3.7 |

The distance between those rows is the character. The autopilot — which
watches, cues her out on sight, and answers the door — survives:

| night | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| survives | 100% | 80% | 63% | 55% | 38% | 18% |

A human should beat that: the bot only ever acts on a body already on the feed
in front of it, and never plans a sweep.

### The Phantom — a tax on watching

He is not on the floorplan. He does not walk, does not approach, and never
appears in a doorway. He does not arrive either — **he is already there when
you get there**. His clock decides only *when* he is somewhere; it arms him,
and the next camera you open has him in it. Change camera again and he is gone.
Sit there past `showMs`, or drop the monitor with him still up, and he takes
the frame.

That is the difference between a jump and a dread. A figure fading in while you
watch is something happening to you; a figure already standing in the frame you
just opened was true before you looked, and it makes every camera change a
small gamble. Raising the monitor counts as opening a feed. He will not be
waiting on the one you just fled him on, so switching away is never punished by
finding him again immediately.

| night | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| time to change camera (ms) | 1700 | 1600 | 1450 | 1300 | 1200 | 1050 | 850 |
| gap between visits (ms) | 58000 | 50000 | 43000 | 36000 | 30000 | 25000 | 18000 |

Gaps are jittered ±45%, and his clock only runs while you are actually on a
camera — he is a cost of watching, not of existing.

What it costs when he lands: the **camera system**, always, because that is
what he came in through; a **second system at random** from night three, once
you have met him and know what the frame means; and a noise in your office at
strength **0.62** for **7000 ms**, which is louder than the ventilation cue and
is heard by the two who *can* kill you. You are put back in the office with the
monitor down. Nobody dies.

The reason he exists: the Auditor makes watching compulsory and watching is
otherwise free. He is the thing that makes the safest habit in the game cost
something.

---

## 3. Movement

```
interval = night.moveMs x unit.rhythm x unit.jitter x (auditor: moveMult)
  rhythm  fixed, 1.00 and 1.27 — deliberately not 1.25, which would re-sync
  jitter  re-rolled 0.85-1.15 after every move, so they keep drifting apart
```

On each tick: an idle roll may pass the turn entirely; otherwise a weighted
step (`approach` toward you, else level or away), then a chance at a second.
Landing on a square at distance 1 begins a doorway event.

### Watch fatigue

Holding a unit on screen decays its stall from full to **0.28** over
**9000 ms**, recovering **1.7×** faster when you look away. You cannot park
on her — you buy stretches of time and pay for each by going elsewhere.

### Audio cues

`chance = 0.92 × 0.60 ^ rooms × (1 − lureResist)`

| rooms away | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Auditor takes it | 44% | 26.5% | 15.9% | 9.5% |

For the intended door rescue, cue the nearby office feed rather than the
doorway feed itself. It is two rooms away, giving roughly a 26.5% last-chance
escape: helpful, but not dependable enough to replace prevention.

Holds **9000 ms**, then **6500 ms** before another. Rebooting ventilation
makes its own noise at strength **0.40**, aimed at your office.

---

## 4. The floor

**28 positions**, deepest **7 rooms** out.

| distance | positions |
|---|---|
| 1 | nDL, nDR |
| 2 | n11, n14, n15 |
| 3 | n07, n10, n12, n16, n17, n18 |
| 4 | n05, n06, n09, n13, n19, n25 |
| 5 | gS, n02, n20, n21 |
| 6 | n01, n03, n04, n22 |
| 7 | gE, gW, n08 |

**Blind rooms:** `n06`, `n09` — walkable, watched by nothing.

**Spawns:** `gE` (7 out), `gS` (5 out), `gW` (7 out). Two of three each night, staggered by 24000 ms.

---

## 5. Cameras

| ID | name | sees | notes |
|---|---|---|---|
| C01 | 1A  NORTH-WEST ROOM | n01 |  |
| C02 | 1B  NORTH ROOM | n02 |  |
| C03 | 1C  NORTH-EAST ROOM | n03 |  |
| C04 | 2A  NORTH HALL | gW, n04, n20, n05, n21, n22 |  |
| C05 | 2B  CENTER ROOM | n07 |  |
| C06 | 2C  EAST CLOSET | n08 |  |
| C07 | 3A  OFFICE HALL | n11, nDL, nDR, n14, n18 | **UNSTABLE**; n18 far off |
| C08 | 3B  NORTH OFFICE | n10 | peeks nDL |
| C09 | 4A  EAST WING | n12, n13 |  |
| C10 | 4B  EAST STORE | n15 |  |
| C11 | 4C  EAST DOCK | n17 |  |
| C12 | 5A  SOUTH OFFICE | n16 | peeks nDR |
| C13 | 6A  SOUTH HALL | n25, n18, n19 | n18 close |

The office hall camera is the only one that sees both kill squares, and it is
the unreliable one. Your dependable warning is the pair of flanking offices.

Placement is per node, and per `node@CAMERA` when a node is visible from more
than one. Sprites can be cropped on any edge to sit behind furniture.

**n18 is the one node that needs both.** It is a speck at the end of a corridor
on C07 and fills the frame on C13, so it carries an explicit `n18@C07` and
`n18@C13` for each animatronic. Note the precedence: a per-unit *plain* key
outranks a shared `node@CAMERA` one, so calibrating a two-camera node without
naming the camera writes one framing into both feeds and silently loses the
other.

---

## 6. Systems

| system | while faulted |
|---|---|
| Camera system | no feeds, no sprites, no sensor |
| Audio relay | no cues |
| Ventilation | air drains; an alarm repeats, faster as it thins |

The panel lists the three by name and state and nothing else. A faulted row
lights its own reboot button red, so which system is down reads before any of
it does.

One reboot at a time: **6800 ms** each, or **12000 ms** for all three. A system
that has just come back cannot fault again for **15000 ms** — faults still
arrive on schedule, they just pick something else or nothing. Watching the
cameras die in the second after a seven-second reboot reads as the game
cheating, and there is nothing to be done about it either way.
Leaving the panel aborts the cycle. There is no air gauge — the alarm is the
only warning. Running out puts you on the floor for
**6500 ms**; anything that reaches a doorway then finds you there.

---

## 7. Power

A switch, not a meter. Cutting it kills the lights, the panel and any cycle in
progress. The relay runs off it too, so cutting the mains costs you the audio
cue for as long as they are off — which is why the breaker is the wrong first
answer to the Auditor and the right one to the Warden. The feeds run **5000 ms** on residual power and then burn out, and
cannot be repaired until it is back. The Warden is far likelier to walk past a
dark office. The Auditor very nearly does not care: one roll at **18%** per
arrival, and nothing else.

---

## 8. What you can hear and see

**Hallucinations.** A figure resolves in a room, holds, and is gone — never in
a doorway, never real. It stands on the calibrated spot for that node, on that
camera, for that body: same scale, same mirroring, same crop behind the same
furniture as the real one. The only tell is that it fades. Gaps by night: 0, 52000, 36000, 26000, 18000, 12000, 9000 ms, `0` meaning never.
Night one has none, so the rules are learned clean.

**Room tone.** Ten sounds that mean nothing, on gaps of 26000–78000 ms scaled
by night (1.0, 0.92, 0.80, 0.66, 0.52, 0.40, 0.34), so night six is roughly twice as noisy as night one. The
music box plays at most once a night, and often not at all.

**No glow.** A figure in your doorway is lit by the room and nothing else. In
the dark it is brightness and contrast alone — a halo would turn the one thing
you are straining to see into a marker for itself, and cutting the power is
supposed to make the office harder to read, not easier.

**Transit.** Anything crossing your doorway drops every feed to snow until it
lands, so hiding on the monitor tells you it is moving and nothing else.

**Motion sensor.** One, mounted on one camera, moved freely. It chirps only on
entry, with a different tone per animatronic.

**The scrape at your door.** Played the instant something arrives, then every
2400 ms while it stands there. It used to wait for the first tick of that
2400 ms cycle, so a figure could stand in your doorway in silence for over two
seconds while you looked straight at it.

**The air.** A low hum you stop hearing after a minute, audible from the office
chair only — raise the cameras and the monitor's hiss takes over. It is also
the ventilation reporting for duty: when that system faults the hum stops, well
before the alarm starts.

**The feeds.** Changing camera makes a sound; raising the monitor onto the feed
you were already on does not. Three are built, because it is the sound you hear
more than any other and the right one is taste rather than argument — set
`CAM_SWITCH` to audition:

| | |
|---|---|
| `relock` | the default. A tape head finding the new picture: a short downward whoop of filtered noise with a click under it. Belongs to the signal rather than to the switch. |
| `relay` | the previous one. A contact closing, then the picture landing. Drier, more mechanical. |
| `tick` | barely there. One damped click and a breath of hiss, for when the sweep starts to grate. |

---

## 9. Difficulty by night

| night | moveMs | approach | doubleStep | idle | breach | respite | grace | fault every | odds |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 9000 | 0.50 | 0.32 | 0.34 | 7000 | 16000 | 44000 | 50000 | 0.25 |
| 2 | 8000 | 0.57 | 0.34 | 0.28 | 6600 | 14000 | 34000 | 44000 | 0.35 |
| 3 | 7000 | 0.64 | 0.36 | 0.22 | 6200 | 12500 | 24000 | 37000 | 0.48 |
| 4 | 6200 | 0.71 | 0.38 | 0.16 | 5800 | 11000 | 15000 | 31000 | 0.60 |
| 5 | 5500 | 0.78 | 0.40 | 0.10 | 5400 | 9500 | 9000 | 25500 | 0.70 |
| 6 | 4800 | 0.84 | 0.42 | 0.06 | 5000 | 9000 | 5000 | 22000 | 0.80 |
| 7 | 4100 | 0.90 | 0.46 | 0.02 | 4300 | 7500 | 2500 | 19000 | 0.88 |

`fault every` is longer than it was on every night. The Phantom faults systems
as well, and two independent sources of the same interruption stack into a
night that is nothing but reboots.

**Night seven** is not a seventh step on the same staircase; the week ends at
six. He moves faster than the base rate has ever been and hardly ever idles,
her doorway pause is down to **2200 ms**, her step to **3.2×**, she is outside
for **one second**, the Phantom comes every **18 s**, and the breach window is
short enough that the breaker has to be muscle memory. The autopilot clears it
about **5% of the time**, against 23% on night six. It is meant to be beaten
rarely.

Plus a ramp applied per in-game hour: approach:0.035, idle:0.030, moveMs:0.035

---

## 10. Files

```
index.html       the game
FNAAC.html       single-file build, everything embedded — this is the one to send
calibrate.html   sprite placement, doorway, map editor, and every tuning number
bundle.py        rebuilds FNAAC.html
images/          photographs and sprites
                 ani_/scare_ per body — warden, auditor, phantom
sounds/          optional; every cue has a synthesized fallback
```

Press **N** on any menu screen to choose a night — there are **seven**. **B** hands the office to the
autopilot, which is held to the same information a player has.

The autopilot's two rules of thumb, both of them things a good player does:

- **A flicker sends it to the doorways first.** He moved, and nowhere on the
  monitor answers the only question that matters immediately. It drops the
  cameras for **850 ms**, looks at the two squares beside the desk, and only
  then starts searching the feeds for him.
- **It cues her out on sight.** The door is the losing position, so the moment
  she is on the feed in front of it and within four rooms, it aims at a deep
  camera — five or more rooms out, nearest to her of those — and fires. A cue
  she takes is worth seven moves of floor; watching is worth seconds.
- **At her door it reaches for the relay, not the breaker.** Cutting the mains
  would take the cue away with them. It puts the monitor up, aims at the
  nearest room she is not standing in, and fires; only with the relay down or
  still recharging does it take the breaker and the 18%.
- **It will not park on the Auditor.** Watching decays her stall to
  `FATIGUE.floor`, so past **4200 ms** of unbroken holding it lets go, spends
  **3000 ms** checking on him while the stall recovers, and comes back. Parked
  forever she runs at roughly 72% of full speed; on the cycle, nearer 50%.
