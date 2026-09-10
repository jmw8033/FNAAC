# FNAAC Building Map — Text Reference

Based on the current **2.2.0 development topology** in `game.js`. Connections below are bidirectional unless a scripted mechanic says otherwise. The two floor graphs are not directly connected; Gordon changes floors only through the four scripted ducts.

## Legend
- `n##`, `gW/gE/gS`, `OFFICE` — upper-floor position nodes.
- `b##` — lower-floor position nodes.
- `C##` — camera feed/pin.
- `D#` — controllable lower-floor door.
- `V#` — Gordon duct link between floors.
- **Peek** — the camera can see the position only at the edge of frame.

## Floor 1 — Upper Floor

| Node | Room / meaning | Connected positions | Camera coverage |
|---|---|---|---|
| `gW` | Outside West Spawn | `n04` | C04 |
| `gE` | Outside East Spawn | `n22` | **No direct camera coverage** |
| `gS` | Outside South Spawn | `n19` | **No direct camera coverage** |
| `n01` | Office 1 / North-West Room | `n20` | C01 |
| `n02` | Office 2 / North Room | `n05` | C02 |
| `n03` | Office 3 / North-East Room | `n21` | C03 |
| `n04` | North Hall - west end | `gW`, `n20` | C04 |
| `n20` | North Hall - outside NW room | `n01`, `n04`, `n05` | C04 |
| `n05` | North Hall - outside north room | `n02`, `n07`, `n20`, `n21` | C04 |
| `n21` | North Hall - outside NE room | `n03`, `n05`, `n22` | C04 |
| `n22` | North Hall - east end | `gE`, `n08`, `n21` | C04 |
| `n06` | Office 4 / Upper Annex | `n07` | **No direct camera coverage** |
| `n07` | Center | `n05`, `n06`, `n09`, `n11` | C05 |
| `n08` | Bathroom / East Closet | `n22` | C06 |
| `n09` | Server Room / East Gallery | `n07` | **No direct camera coverage** |
| `n11` | Office Hall - north junction | `n07`, `n10`, `n12`, `nDL` | C07 |
| `nDL` | Hall left of office door | `OFFICE`, `n11`, `nDR` | C07; Peek: C08 |
| `nDR` | Hall right of office door | `OFFICE`, `n14`, `n15`, `nDL` | C07; Peek: C12 |
| `n14` | Office Hall - south junction | `n15`, `n16`, `n17`, `n18`, `nDR` | C07 |
| `n10` | Office 5 / North Office | `n11` | C08 |
| `n16` | Office 7 / South Office | `n14` | C12 |
| `n12` | Break Room / East Wing | `n11`, `n13` | C09 |
| `n13` | Break Room dead end | `n12` | C09 |
| `n15` | Office 6 / East Store | `n14`, `nDR` | C10 |
| `n17` | Office 8 / East Dock | `n14`, `n26` | C11 |
| `n25` | Engineering - west | `n18`, `n19` | C14 |
| `n18` | Engineering - center | `n14`, `n25`, `n26` | C07, C14 |
| `n19` | Engineering - south | `gS`, `n25` | C14 |
| `n26` | Engineering / Dock Corner | `n17`, `n18` | C07 |
| `OFFICE` | Player Office | `nDL`, `nDR` | **No direct camera coverage** |

## Floor 2 — Lower Floor

| Node | Room / meaning | Connected positions | Camera coverage |
|---|---|---|---|
| `b02` | North Hall / Engineering duct end | `b03` | C14 |
| `b03` | North Hall center | `b02`, `b04`, `b06` | C15 |
| `b04` | North Hall south | `b03`, `b05`, `b09` | C15 |
| `b05` | North Hall foot | `b04`, `b18` | Peek: C15 |
| `b06` | Engineering Office east | `b03`, `b07`, `b09` | C16 |
| `b07` | Engineering Office center | `b06`, `b08` | C16; Peek: C25 |
| `b08` | Eng Office West / V2 duct | `b07` | C25 |
| `b09` | Office A | `b04`, `b06` | C17 |
| `b10` | Office B | `b16` | Peek: C19 |
| `b11` | Office C | `b17` | Peek: C19 |
| `b12` | Vault north | `b13` | C18 |
| `b13` | Vault south | `b12`, `b16` | C18 |
| `b14` | Closet | `b16` | **No direct camera coverage** |
| `b15` | Utility Closet / V1 duct | `b23` | C22 |
| `b16` | Payroll west | `b10`, `b13`, `b14`, `b17` | C19 |
| `b17` | Payroll center | `b11`, `b16`, `b18` | C19 |
| `b18` | Payroll east | `b05`, `b17`, `b19`, `b28` | C19 |
| `b19` | North Office | `b18` | C20 |
| `b20` | Ladies | `b23` | C21 |
| `b21` | Mens | `b24` | C21 |
| `b22` | East Closet | `b24` | C21 |
| `b23` | Centre Corridor west | `b15`, `b20`, `b24`, `b25`, `b26` | C22, C23 |
| `b24` | Centre Corridor east | `b21`, `b22`, `b23`, `b27`, `b31` | C22 |
| `b25` | Sales Office 1 | `b23` | C23 |
| `b26` | Sales Office 2 | `b23` | C23 |
| `b27` | Sales Office 3 | `b24` | C23 |
| `b28` | Atrium north | `b18`, `b29`, `b31` | C24 |
| `b29` | Atrium south | `b28`, `b30`, `b31` | C24 |
| `b31` | Atrium door approach | `b24`, `b28`, `b29` | C24 |
| `b30` | Entry / V4 duct | `b29` | C24 |

## Cameras

| Camera | Map floor | Feed name | Full positions | Peek positions |
|---|---|---|---|---|
| `C01` | Floor 1 | 1A NORTH-WEST ROOM | `n01` | — |
| `C02` | Floor 1 | 1B NORTH ROOM | `n02` | — |
| `C03` | Floor 1 | 1C NORTH-EAST ROOM | `n03` | — |
| `C04` | Floor 1 | 2A NORTH HALL | `gW`, `n04`, `n20`, `n05`, `n21`, `n22` | — |
| `C05` | Floor 1 | 2B CENTER ROOM | `n07` | — |
| `C06` | Floor 1 | 2C EAST CLOSET | `n08` | — |
| `C07` | Floor 1 | 3A OFFICE HALL | `n11`, `nDL`, `nDR`, `n14`, `n18`, `n26` | — |
| `C08` | Floor 1 | 3B NORTH OFFICE | `n10` | `nDL` |
| `C09` | Floor 1 | 4A EAST WING | `n12`, `n13` | — |
| `C10` | Floor 1 | 4B EAST STORE | `n15` | — |
| `C11` | Floor 1 | 4C EAST DOCK | `n17` | — |
| `C12` | Floor 1 | 5A SOUTH OFFICE | `n16` | `nDR` |
| `C14` | Floor 1 pin | 7A ENGINEERING | `b02`, `n25`, `n18`, `n19` | — |
| `C15` | Floor 2 | 7B NORTH HALL | `b03`, `b04` | `b05` |
| `C16` | Floor 2 | 7C ENG OFFICE EAST | `b06`, `b07` | — |
| `C25` | Floor 2 | 7E ENG OFFICE WEST | `b08` | `b07` |
| `C17` | Floor 2 | 7D OFFICE A | `b09` | — |
| `C18` | Floor 2 | 8A VAULT | `b12`, `b13` | — |
| `C19` | Floor 2 | 8B PAYROLL | `b16`, `b17`, `b18` | `b10`, `b11` |
| `C20` | Floor 2 | 8C NORTH OFFICE | `b19` | — |
| `C21` | Floor 2 | 9A WASHROOM ROW | `b20`, `b21`, `b22` | — |
| `C22` | Floor 2 | 9B CENTRE CORRIDOR | `b23`, `b24`, `b15` | — |
| `C23` | Floor 2 | 9C SALES FLOOR | `b25`, `b26`, `b27`, `b23` | — |
| `C24` | Floor 2 | 9D ATRIUM | `b28`, `b29`, `b30`, `b31` | — |

**C14 note:** the current code places C14 with the upper-floor cameras, but its feed explicitly includes lower-floor node `b02` as well as upper-floor `n25`, `n18`, and `n19`.

## Lower-floor doors

| Door | Name | Sealed edge | Behavior |
|---|---|---|---|
| `D1` | UTILITY CLOSET DOOR | `b23` ↔ `b15` | Reusable |
| `D2` | OFFICE A DOOR | `b09` ↔ `b06` | Reusable |
| `D3` | ENGINEERING DOOR | `b02` ↔ `b03` | Reusable |
| `D4` | ENG OFFICE DOOR | `b03` ↔ `b06` | Reusable |
| `D5` | PAYROLL DOOR | `b17` ↔ `b18` | One-shot; breaks after Gordon hits it; ~2.8s delay |
| `D6` | ATRIUM DOOR | `b24` ↔ `b31` | Reusable |
| `D7` | ENTRY DOOR | `b29` ↔ `b30` | Reusable |

## Duct / vent links between floors

| Duct | Lower-floor entrance | Upper-floor exit | Meaning |
|---|---|---|---|
| `V1` | `b15` (Utility Closet / V1 duct) | `n08` (Bathroom / East Closet) | UTILITY CLOSET |
| `V2` | `b08` (Eng Office West / V2 duct) | `n11` (Office Hall - north junction) | ENG OFFICE WEST |
| `V3` | `b02` (North Hall / Engineering duct end) | `n25` (Engineering - west) | ENGINEERING |
| `V4` | `b30` (Entry / V4 duct) | `gE` (Outside East Spawn) | ENTRY |

These are **scripted Gordon transitions**, not ordinary graph edges. Other roaming animatronics do not use them.

## Compact connection lists

### Floor 1
- `gW` ↔ `n04`
- `gE` ↔ `n22`
- `gS` ↔ `n19`
- `n01` ↔ `n20`
- `n02` ↔ `n05`
- `n03` ↔ `n21`
- `n04` ↔ `gW`, `n20`
- `n20` ↔ `n01`, `n04`, `n05`
- `n05` ↔ `n02`, `n07`, `n20`, `n21`
- `n21` ↔ `n03`, `n05`, `n22`
- `n22` ↔ `gE`, `n08`, `n21`
- `n06` ↔ `n07`
- `n07` ↔ `n05`, `n06`, `n09`, `n11`
- `n08` ↔ `n22`
- `n09` ↔ `n07`
- `n11` ↔ `n07`, `n10`, `n12`, `nDL`
- `nDL` ↔ `OFFICE`, `n11`, `nDR`
- `nDR` ↔ `OFFICE`, `n14`, `n15`, `nDL`
- `n14` ↔ `n15`, `n16`, `n17`, `n18`, `nDR`
- `n10` ↔ `n11`
- `n16` ↔ `n14`
- `n12` ↔ `n11`, `n13`
- `n13` ↔ `n12`
- `n15` ↔ `n14`, `nDR`
- `n17` ↔ `n14`, `n26`
- `n25` ↔ `n18`, `n19`
- `n18` ↔ `n14`, `n25`, `n26`
- `n19` ↔ `gS`, `n25`
- `n26` ↔ `n17`, `n18`
- `OFFICE` ↔ `nDL`, `nDR`

### Floor 2
- `b02` ↔ `b03`
- `b03` ↔ `b02`, `b04`, `b06`
- `b04` ↔ `b03`, `b05`, `b09`
- `b05` ↔ `b04`, `b18`
- `b06` ↔ `b03`, `b07`, `b09`
- `b07` ↔ `b06`, `b08`
- `b08` ↔ `b07`
- `b09` ↔ `b04`, `b06`
- `b10` ↔ `b16`
- `b11` ↔ `b17`
- `b12` ↔ `b13`
- `b13` ↔ `b12`, `b16`
- `b14` ↔ `b16`
- `b15` ↔ `b23`
- `b16` ↔ `b10`, `b13`, `b14`, `b17`
- `b17` ↔ `b11`, `b16`, `b18`
- `b18` ↔ `b05`, `b17`, `b19`, `b28`
- `b19` ↔ `b18`
- `b20` ↔ `b23`
- `b21` ↔ `b24`
- `b22` ↔ `b24`
- `b23` ↔ `b15`, `b20`, `b24`, `b25`, `b26`
- `b24` ↔ `b21`, `b22`, `b23`, `b27`, `b31`
- `b25` ↔ `b23`
- `b26` ↔ `b23`
- `b27` ↔ `b24`
- `b28` ↔ `b18`, `b29`, `b31`
- `b29` ↔ `b28`, `b30`, `b31`
- `b31` ↔ `b24`, `b28`, `b29`
- `b30` ↔ `b29`

## Camera-blind / partially covered positions
- Upper floor positions with no direct full camera coverage include `n06` and `n09`. `nDL` and `nDR` have direct coverage on C07 and also edge peeks from C08/C12 respectively.
- Lower-floor `b14` currently has no camera coverage. `b05`, `b07`, `b10`, and `b11` are available only as peek positions on at least one feed.
