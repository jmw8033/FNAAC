# Camera Draw Order Reference — 2.2.0 development update

Every order is **far → near**. Later entries paint over earlier entries. The same order now applies to real animatronics, Gordon, and camera hallucinations.

| Camera | Far → near |
|---|---|
| C01 | n01 |
| C02 | n02 |
| C03 | n03 |
| C04 | gW → n04 → n20 → n05 → n21 → n22 |
| C05 | n07 |
| C06 | n08 |
| C07 | n18 → n26 → n14 → nDR → nDL → n11 |
| C08 | nDL → n10 |
| C09 | n12 → n13 |
| C10 | n15 |
| C11 | n17 |
| C12 | nDR → n16 |
| C14 | b02 → n25 → n19 → n18 |
| C15 | b05 → b03 → b04 |
| C16 | b06 → b07 |
| C25 | b07 → b08 |
| C17 | b09 |
| C18 | b12 → b13 |
| C19 | b10 → b11 → b16 → b17 → b18 |
| C20 | b19 |
| C21 | b20 → b21 → b22 |
| C22 | b23 → b24 → b15 |
| C23 | b25 → b26 → b27 → b23 |
| C24 | b28 → b29 → b30 → b31 |

## Audit notes
- The previous renderer did **not** actually have a complete per-camera table.
- Hallucinations were appended after normal subjects and therefore could incorrectly paint over closer real animatronics.
- The previous `n18@C07` draw-order key was ineffective because the renderer looked up only the plain node id. The new table is camera-aware.
- C04, C07, C09, and the upper C14 corridor order preserve the prior hand-authored painter intent.
- Cameras that had no prior explicit order were initialized from their current `peek`/`sees` declarations and should be visually verified against the photographs.
- The calibrator now has a DRAW ORDER tab, so these can be corrected without editing JavaScript.