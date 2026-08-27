"use strict";

/* Gameplay milestones for Google Analytics 4. The game remains fully playable
   when the analytics tag is unavailable (for example, when played offline). */
function trackGameEvent(name, details){
  if (typeof window.gtag === "function") window.gtag("event", name, details);
}
const asset = p => p;


/* ===========================================================================
   1. THE BUILDING
   Coordinates are percentages of your floorplan image, so they line up with
   the sketch exactly. Edges only need to be listed once — the reverse is
   generated automatically, which is one less thing to get wrong.
   =========================================================================== */

const OFFICE_AT = { x:40.0, y:58.8 };

const GRAPH = {
  // spawn nodes, outside the building. No camera covers these on purpose.
  gW:{ x:6.9,  y:12.9, edges:["n04"], outside:true },
  gE:{ x:92.9, y:16.4, edges:["n22"], outside:true },
  gS:{ x:67.5, y:99.0, edges:["n19"], outside:true },

  // --- north rooms, each opening onto the north hall ---
  n01:{ x:26.6, y:10.3, edges:["n20"] },
  n02:{ x:50.0, y:10.3, edges:["n05"] },
  n03:{ x:71.0, y:10.6, edges:["n21"] },

  // --- north hall ---
  n04:{ x:17.0, y:16.5, edges:["n20"] },                  // west end
  n20:{ x:30.0, y:16.2, edges:["n05"] },                  // outside NW room
  n05:{ x:50.0, y:17.7, edges:["n21","n07"] },            // outside N room
  n21:{ x:70.0, y:17.0, edges:["n22"] },                  // outside NE room
  n22:{ x:85.0, y:16.5, edges:["n08"] },                  // east end

  // --- second tier. 06 and 09 are dead-end pockets off the center room. ---
  n06:{ x:33.1, y:22.9, edges:["n07"] },                  // upper annex   (NO CAMERA)
  n07:{ x:46.4, y:33.2, edges:["n09","n11"] },            // center room
  n08:{ x:79.2, y:22.4, edges:[] },                       // east closet
  n09:{ x:75.5, y:32.9, edges:[] },                       // east gallery  (NO CAMERA)

  // --- the center hall ---
  // north end: the junction for the north office and the east wing
  n11:{ x:48.6, y:43.0, edges:["nDL","n12","n10"] },

  // THE TWO SQUARES THAT MATTER. Directly left and right of your door, and
  // the last place anything stands before it reaches you.
  nDL:{ x:48.6, y:54.0, edges:["nDR","OFFICE"] },         // hall, LEFT of your door
  nDR:{ x:48.8, y:64.0, edges:["n14","n15","OFFICE"] },   // hall, RIGHT of your door

  // south end: the junction for the south office, the dock and the south hall
  n14:{ x:49.2, y:74.0, edges:["n15","n16","n17","n18"] },

  // --- the two offices flanking yours. Reached from the hall's two ends, so
  //     something in here is close, but not yet beside you. ---
  n10:{ x:39.4, y:44.2, edges:[] },                       // NORTH OFFICE
  n16:{ x:39.7, y:73.5, edges:[] },                       // SOUTH OFFICE

  // --- east wing ---
  n12:{ x:57.4, y:39.0, edges:["n13"] },
  n13:{ x:57.1, y:54.8, edges:[] },                       // dead end off 12
  n15:{ x:58.9, y:65.1, edges:[] },                       // between DR and 14
  n17:{ x:62.7, y:77.7, edges:[] },                       // dock, now open to 26

  // --- south hall, now a loop back to the dock end ---
  n25:{ x:33.0, y:85.0, edges:["n18","n19"] },
  n18:{ x:49.8, y:84.8, edges:["n19"] },
  n19:{ x:64.2, y:92.5, edges:[] },

  /* --- the dock corner. The east end of the south hall, and the one square
         that ties the dock back into it without coming past your door again.
         Seen only from the office hall, at the very end of the corridor. --- */
  n26:{ x:59.0, y:85.5, edges:["n17","n18"] },

  OFFICE:{ x:OFFICE_AT.x, y:OFFICE_AT.y, edges:[] }
};

/* ---------------------------------------------------------------------------
   THE FLOOR BELOW  —  PLACEHOLDER GEOMETRY

   A second storey under the first. Every node id begins with "b", which is the
   ONLY thing that marks a square as being downstairs — floorOf() reads the
   prefix, so nothing here needs a redundant floor: key that could disagree
   with the id.

   The two floors are NOT joined in the walk graph. That is deliberate and it
   is what keeps the old code honest: DO, oneStep, retreatFrom and stepToward
   all still describe the upper floor exactly as they did, so Eugene and Sloppy
   cannot wander downstairs by accident and no existing distance changes by a
   single step. The only way between floors is a DUCT, and a duct is a scripted
   climb rather than an edge.

   Shape is a placeholder, but the TOPOLOGY is the part worth keeping when you
   swap in the real plan:

        b01 ─ b04 ─ b05 ─ b06 ─ b07 ─ b08 ─ b03
        ^ducts             │            └ b02
                           b09 ─ b12 (blind) / b13
                           │
                           b10 ─ b14 / b15 ^duct
                           │
                           b11
                           │
        b19 ─ b16 ─ b17 ─ b18 ─ b20 ^duct

   Three ducts, each sitting at a dead end behind exactly ONE door, and spread
   so that no single closed door can seal him away from all three. The duct
   that drops him NEAREST your office is also the one that takes him LONGEST to
   walk to, so which one he picks is a real difference and not a coin flip.
--------------------------------------------------------------------------- */
const GRAPH_B = {
  b02:{ x: 32.0, y: 91.6, edges:["b03"] },                     // HALL N
  b03:{ x: 32.0, y: 84.3, edges:["b04","b06"] },               // HALL C
  b04:{ x: 32.0, y: 70.3, edges:["b05","b09"] },               // HALL S
  b05:{ x: 32.0, y: 56.2, edges:["b18"] },                     // HALL FOOT
  b06:{ x: 48.1, y: 85.6, edges:["b07","b09"] },               // ENG OFFICE E
  b07:{ x: 68.8, y: 85.6, edges:["b08"] },                     // ENG OFFICE C
  b08:{ x: 89.5, y: 70.3, edges:[] },                          // ENG OFFICE W
  b09:{ x: 48.1, y: 69.1, edges:[] },                          // OFFICE A
  b10:{ x: 68.8, y: 56.8, edges:["b16"] },                     // OFFICE B
  b11:{ x: 45.9, y: 56.8, edges:["b17"] },                     // OFFICE C
  b12:{ x: 89.2, y: 58.2, edges:["b13"] },                     // VAULT N
  b13:{ x: 89.2, y: 42.2, edges:["b16"] },                     // VAULT S
  b14:{ x: 89.2, y: 34.0, edges:["b16"] },                     // CLOSET
  b15:{ x: 89.2, y: 27.2, edges:["b23"] },                     // UTILITY CLOSET
  b16:{ x: 72.0, y: 40.8, edges:["b17"] },                     // PAYROLL W
  b17:{ x: 54.5, y: 40.8, edges:["b18"] },                     // PAYROLL C
  b18:{ x: 34.5, y: 40.8, edges:["b19","b28"] },               // PAYROLL E
  b19:{ x: 14.6, y: 40.8, edges:[] },                          // NORTH OFFICE
  b20:{ x: 72.5, y: 26.8, edges:["b23"] },                     // LADIES
  b21:{ x: 57.0, y: 26.8, edges:["b24"] },                     // MENS
  b22:{ x: 44.3, y: 26.8, edges:["b24"] },                     // EAST CLOSET
  b23:{ x: 84.7, y: 19.7, edges:["b24","b25","b26"] },         // CORRIDOR W
  b24:{ x: 52.9, y: 19.7, edges:["b27","b28"] },               // CORRIDOR E
  b25:{ x: 87.9, y:  9.4, edges:[] },                          // SALES 1
  b26:{ x: 68.8, y:  9.4, edges:[] },                          // SALES 2
  b27:{ x: 48.4, y:  9.4, edges:[] },                          // SALES 3
  b28:{ x: 21.0, y: 24.1, edges:["b29"] },                     // ATRIUM N
  b29:{ x: 32.1, y:  8.1, edges:["b30"] },                     // ATRIUM S
  b30:{ x: 14.6, y:  8.1, edges:[] },                          // ENTRY
};

/* Every downstairs square folded into the one graph the rest of the file
   already reads. They are still unreachable from upstairs: nothing here names
   an "n" node as an edge, so the two halves stay disjoint. */
Object.assign(GRAPH, GRAPH_B);

/* Which storey a square is on, read straight off its id. */
const floorOf = n => (n && n.charAt(0) === "b") ? 2 : 1;

/* ---------------------------------------------------------------------------
   DUCTS  —  the only way between the two floors

   down   the downstairs square he climbs INTO
   up     the upstairs square he climbs OUT OF
   Only Gordon uses these. Nothing else in the building knows they exist.

   The three exits are deliberately unequal, and that inequality is the whole
   reason to watch which duct he commits to:

     V1 → n06   four rooms out, and NOTHING can see him arrive
     V2 → n08   seven rooms out, the longest walk you can hope for
     V3 → n17   three rooms out, on camera, and far too close
--------------------------------------------------------------------------- */
const DUCTS = [
  { id:"V1", name:"UTILITY CLOSET", down:"b15", up:"n08" },
  { id:"V2", name:"ENG OFFICE WEST", down:"b08", up:"n11" },
  { id:"V3", name:"ENGINEERING", down:"b02", up:"n25" },
  { id:"V4", name:"ENTRY", down:"b30", up:"gE" }
];

/* ---------------------------------------------------------------------------
   DOORS  —  downstairs only, one at a time

   Each entry seals the edge between two adjacent downstairs squares. Closing
   one OPENS whichever was closed before it: the building has current for
   exactly one, which is what turns three ducts and five doors into a shell
   game rather than a fortress.

   pin is where the icon sits on the lower map, as a percentage. It is drawn
   halfway between the two squares by default, so a pin only needs setting when
   the automatic spot lands on top of something else.

   IMPORTANT: no arrangement of a single closed door may cut Gordon off from
   ALL THREE ducts, or he would simply stop and the night would stall. The
   layout below is checked for that at boot — see auditBuilding().
--------------------------------------------------------------------------- */
const DOOR_LINKS = [
  { id:"D1", name:"UTILITY CLOSET DOOR", a:"b23", b:"b15", pin:{x:84.9,y:22.9} },
  { id:"D2", name:"OFFICE A DOOR", a:"b09", b:"b06", pin:{x:47.9,y:75} },
  { id:"D3", name:"ENGINEERING DOOR", a:"b02", b:"b03", pin:{x:32,y:92.5} },
  { id:"D4", name:"ENG OFFICE DOOR", a:"b03", b:"b06", pin:{x:37,y:84.1} },
  { id:"D5", name:"PAYROLL DOOR", a:"b17", b:"b18", pin:{x:36,y:43.8} },
  { id:"D6", name:"ATRIUM DOOR", a:"b24", b:"b28", pin:{x:38.8,y:19.5} },
  { id:"D7", name:"ENTRY DOOR", a:"b29", b:"b30", pin:{x:25.6,y:7.9} }
];

/* Cameras.

   sees      nodes this feed covers properly
   peek      nodes it can only just make out — small, dim, at the frame edge
   unstable  a failing feed. Constant dropout, and the motion sensor will not
             hold on it. This is deliberately the ONE camera that looks at the
             two squares beside your door: the thing you most want to check is
             the thing you can least rely on. Your warning comes instead from
             the two ordinary cameras in the offices either side of yours.
   pan       width comes from each photo's real aspect ratio. 102 means the
             photo isn't wide enough to sweep, so it reads as a fixed camera.
*/
const CAMERAS = {
  C01:{ name:"1A  NORTH-WEST ROOM", pin:{x:36.4,y:7.7},  sees:["n01"],
        art:"images/cameras/C01.jpg", pan:{width:102,period:34000,phase:0.0} },
  C02:{ name:"1B  NORTH ROOM",      pin:{x:59.9,y:7.8},  sees:["n02"],
        art:"images/cameras/C02.jpg", pan:{width:102,period:29000,phase:1.7} },
  C03:{ name:"1C  NORTH-EAST ROOM", pin:{x:80.6,y:8},  sees:["n03"],
        art:"images/cameras/C03.jpg", pan:{width:131,period:37000,phase:3.1} },
  // gW is outside the building — visible from the hall camera through the
  // west end, so you can watch one arrive before it is even indoors
  C04:{ name:"2A  NORTH HALL",      pin:{x:81.8,y:15.7}, sees:["gW","n04","n20","n05","n21","n22"],
        art:"images/cameras/C04.jpg", pan:{width:102,period:44000,phase:0.8} },
  C05:{ name:"2B  CENTER ROOM",     pin:{x:54.6,y:31.5}, sees:["n07"],
        art:"images/cameras/C05.jpg", pan:{width:132,period:31000,phase:2.2} },
  C06:{ name:"2C  EAST CLOSET",     pin:{x:83.1,y:27.4}, sees:["n08"],
        art:"images/cameras/C06.jpg", pan:{width:102,period:26000,phase:4.4} },

  // the one you need and cannot trust
  C07:{ name:"3A  OFFICE HALL",     pin:{x:50.1,y:43.2}, sees:["n11","nDL","nDR","n14","n18","n26"],
        unstable:true,
        art:"images/cameras/C07.jpg", pan:{width:102,period:39000,phase:5.0} },

  C08:{ name:"3B  NORTH OFFICE",    pin:{x:39.1,y:46.2}, sees:["n10"], peek:["nDL"],
        art:"images/cameras/C08.jpg", pan:{width:162,period:28000,phase:1.1} },
  C09:{ name:"4A  EAST WING",       pin:{x:63.9,y:53.7}, sees:["n12","n13"],
        art:"images/cameras/C09.jpg", pan:{width:149,period:41000,phase:2.9} },
  C10:{ name:"4B  EAST STORE",      pin:{x:63.7,y:65.6}, sees:["n15"],
        art:"images/cameras/C10.jpg", pan:{width:122,period:33000,phase:0.4} },
  C11:{ name:"4C  EAST DOCK",       pin:{x:63.9,y:78.5}, sees:["n17"],
        art:"images/cameras/C11.jpg", pan:{width:125,period:30000,phase:3.6} },
  C12:{ name:"5A  SOUTH OFFICE",    pin:{x:39.1,y:78.3}, sees:["n16"], peek:["nDR"],
        art:"images/cameras/C12.jpg", pan:{width:137,period:27000,phase:5.4} },
  C14:{ name:"7A  ENGINEERING", pin:{x:49.7,y:86}, pan:{width:124,period:39000,phase:0.0}, sees:["b02","n25","n18","n19"], art:"images/cameras/C14.jpg" }
};

/* ---------------------------------------------------------------------------
     THE FLOOR BELOW.

     `art` deliberately names a file that does not exist yet. mountArt already
     turns a missing photograph into a labelled placeholder that prints the
     exact path it went looking for, so these play as grey NO SIGNAL cards
     naming themselves until you shoot the real thing — which is the same way
     the upper floor was built. Drop images/cam_b*.jpg in and they light up
     with no code change.

     floor:2 is what puts a pin on the lower map instead of the upper one.

     b12 has no camera on purpose, exactly as n06 and n09 have none upstairs.
     One square he can cross unobserved is worth more than total coverage.
--------------------------------------------------------------------------- */
const CAMERAS_B = {

  C15:{ name:"7B  NORTH HALL", floor:2, pin:{x:30.6,y:60.7}, pan:{width:118,period:35000,phase:1.4}, sees:["b03","b04"], peek:["b05"], art:"images/cameras/C15.jpg" },
  C16:{ name:"7C  ENG OFFICE EAST", floor:2, pin:{x:47.3,y:82.7}, pan:{width:126,period:41000,phase:2.7}, sees:["b06","b07"], art:"images/cameras/C16.jpg" },
  C25:{ name:"7E  ENG OFFICE WEST", floor:2, pin:{x:75.3,y:71}, pan:{width:102}, sees:["b08"], peek:["b07"], art:"images/cameras/C25.jpg" },
  C17:{ name:"7D  OFFICE A", floor:2, pin:{x:53.5,y:66.2}, pan:{width:102}, sees:["b09"], art:"images/cameras/C17.jpg" },
  C18:{ name:"8A  VAULT", floor:2, pin:{x:91.5,y:58.1}, pan:{width:108,period:37000,phase:4.1}, sees:["b12","b13"], art:"images/cameras/C18.jpg" },
  C19:{ name:"8B  PAYROLL", floor:2, pin:{x:32.3,y:36.9}, pan:{width:130,period:43000,phase:5.3}, sees:["b16","b17","b18"], peek:["b10","b11"], art:"images/cameras/C19.jpg" },
  C20:{ name:"8C  NORTH OFFICE", floor:2, pin:{x:8.2,y:45.4}, pan:{width:102}, sees:["b19"], art:"images/cameras/C20.jpg" },
  C21:{ name:"9A  WASHROOM ROW", floor:2, pin:{x:56.5,y:28.6}, pan:{width:120,period:36000,phase:0.7}, sees:["b20","b21","b22"], art:"images/cameras/C21.jpg" },
  C22:{ name:"9B  CENTRE CORRIDOR", floor:2, pin:{x:48.8,y:17.8}, pan:{width:122,period:40000,phase:2.1}, unstable:true, sees:["b23","b24","b15"], art:"images/cameras/C22.jpg" },
  C23:{ name:"9C  SALES FLOOR", floor:2, pin:{x:91.8,y:13.1}, pan:{width:126,period:38000,phase:3.4}, sees:["b25","b26","b27","b23"], art:"images/cameras/C23.jpg" },
  C24:{ name:"9D  ATRIUM", floor:2, pin:{x:8,y:26.5}, pan:{width:114,period:34000,phase:4.8}, sees:["b28","b29","b30"], art:"images/cameras/C24.jpg" }
};

/* Folded into the one table the rest of the file already reads, exactly as
   GRAPH_B is. Kept as a separate literal rather than typed into CAMERAS above
   for two reasons: the calibration tool rewrites that block wholesale and must
   keep finding it in the shape it expects, and every entry in it ends in a
   megabyte of base64 that nothing should ever have to be inserted between. */
Object.assign(CAMERAS, CAMERAS_B);

/* Which storey a feed belongs to. Absent means the original floor. */
const camFloor = id => (CAMERAS[id] && CAMERAS[id].floor) || 1;

/* A CAMERA CAN BELONG TO BOTH STOREYS.

   The engineering feed watches an open stairwell — the upper landing and the
   lower hall are one volume, and one lens sees both. It is not a pair of
   cameras that happen to agree; it is ONE camera that appears on both plans
   and shows the same picture from either, because the stairwell does not care
   which floor you think you are on.

   `floors:[1,2]` says so. Anything without it belongs to the single storey in
   `floor`, which is nearly everything. */
const camOnFloor = (id, f) => {
  const c = CAMERAS[id];
  if (!c) return false;
  if (c.floors) return c.floors.includes(f);
  return (c.floor || 1) === f;
};

/* Feed ids on one storey, in declaration order — which is also the order the
   swipe gesture and the autopilot walk them in. */
const camIdsOn = f => Object.keys(CAMERAS).filter(id => camOnFloor(id, f));

/* Where the door actually is in office.jpg, as percentages of the panorama.
   Measured off the photo: the frame runs x 36.3-44.3, its head beam sits at
   y 36.5, and the floor is hidden behind the monitor at about y 50.5 — so a
   figure standing there shows head and shoulders and nothing else. */
const OFFICE_DOOR = { x:39.7, w:5.2, top:39.1, h:12 };

const OFFICE_ART   = "images/office.jpg";
/* Optional sketch behind the floorplan on the map. Empty by default: probing
   for a file that is not in the project logs a 404 on every single load, which
   is noise normally and actively misleading when you are trying to work out
   why a static host is not serving your photographs. Put a path here and the
   map picks it up. */
const FLOORPLAN_ART= "";

/* ---------------------------------------------------------------------------
   WHERE A BODY STANDS IN EACH SHOT

   Placement is per NODE, not per camera, because a camera that covers two
   nodes is looking at two different parts of the room — C04 sees both ends of
   the north hall and they are nowhere near each other in the panorama.

   left/bottom/width are percentages of the FULL panorama, not the screen, so
   a figure stays nailed to its spot while the camera sweeps past it.
   flip:true mirrors the sprite so it faces into the room.
   rotate turns the sprite in degrees around its feet; positive is clockwise.
   dim scales brightness — use it for nodes far from the lens.

   Tune these once per photo, with the game running. Anything missing falls
   back to DEFAULT_SHOT, which is centre-frame and will look wrong on purpose
   so you notice it.
--------------------------------------------------------------------------- */
/* clipT/R/B/L cut percentages off each edge of the sprite, so a figure can sit
   behind a desk, be swallowed by a door frame, or lean out from a wall showing
   only half of itself. Cropping happens in the sprite's own space, so it holds
   as the camera sweeps. */
const DEFAULT_SHOT = { left:42, bottom:12, width:16, flip:false, rotate:0, dim:1,
                       clipT:0, clipR:0, clipB:0, clipL:0 };

/* Calibrated in the tool against the real photographs.

   Note n18: it is the only node two cameras look at from genuinely different
   places — the far end of a corridor on C07, the middle of the room on C13 —
   so it carries one entry per camera and no plain one. A plain "n18" would
   mean "n18 as C07 sees it" and would quietly drive C13 as well, which is how
   the south hall framing was lost once already. Same in SHOTS_UNIT.

   This note lives ABOVE the block rather than inside it because the
   calibration tool regenerates everything between the braces on write. */
const SHOTS = {
  n01 :{ left:40, bottom:14, width:17 },
  n02 :{ left:44, bottom:14, width:17 },
  n03 :{ left:38, bottom:14, width:17, flip:true },
  n04 :{ left:10, bottom:22, width:10, dim:0.7 },
  n20 :{ left:26, bottom:20, width:12, dim:0.8 },
  n05 :{ left:44, bottom:17, width:15 },
  n21 :{ left:62, bottom:15, width:18 },
  n22 :{ left:76, bottom:13, width:21 },
  n06 :{ left:36, bottom:13, width:18 },
  n07 :{ left:46, bottom:14, width:17 },
  n08 :{ left:44, bottom:12, width:20 },
  n09 :{ left:40, bottom:15, width:16 },
  nDR :{ left:34.6, bottom:15.1, width:15.8 },
  nDL :{ left:33, bottom:22, width:18 },
  n14 :{ left:36, bottom:32, width:12, dim:0.8 },
  n11 :{ left:38, bottom:40, width:8, dim:0.7 },
  n10 :{ left:44, bottom:12, width:19 },
  n16 :{ left:42, bottom:12, width:19, flip:true },
  n12 :{ left:24, bottom:20, width:13, dim:0.8 },
  n13 :{ left:58, bottom:14, width:18, flip:true },
  n15 :{ left:42, bottom:14, width:17 },
  n17 :{ left:38, bottom:16, width:16 },
  n26 :{ left:35.7, bottom:41.6, width:5.6, flip:true },
  n25 :{ left:18, bottom:20, width:12, dim:0.8 },
  n19 :{ left:62, bottom:14, width:18, flip:true },
  gW  :{ left:31, bottom:54.1, width:2.8, flip:true, dim:0.55, clipR:36, clipB:54, clipL:38 },
  "n18@C07":{ left:42, bottom:12, width:16 },
  "n18@C13":{ left:41.5, bottom:23, width:7.5 },
  b01 :{ left:42, bottom:12, width:16 },
  b03 :{ left:42, bottom:12, width:16 },
  b04 :{ left:56.7, bottom:20.5, width:12.5 },
  b05 :{ left:42, bottom:12, width:16 },
  b06 :{ left:4.2, bottom:-231.3, width:85.4 },
  b07 :{ left:14.9, bottom:30.1, width:12.4, rotate:-4.7 },
  b08 :{ left:75.1, bottom:36.5, width:14.1, rotate:-3 },
  b09 :{ left:54.6, bottom:13, width:19.3 },
  b12 :{ left:21.4, bottom:25.2, width:17, rotate:3.8 },
  b13 :{ left:7.5, bottom:38.6, width:14.1, rotate:3.3, clipT:2, clipR:2, clipB:44, clipL:78 },
  b16 :{ left:20.3, bottom:32, width:8.1, rotate:-3, clipT:2, clipB:38 },
  b17 :{ left:14.5, bottom:-2.3, width:17, rotate:-8.2, clipB:36 },
  b18 :{ left:57.3, bottom:-40.7, width:28 },
  b10 :{ left:42, bottom:12, width:16 },
  b11 :{ left:42, bottom:12, width:16 },
  b19 :{ left:2.1, bottom:-202, width:90.9 },
  b20 :{ left:41.2, bottom:-6.6, width:21.8, rotate:2, clipT:40, clipB:95, clipL:52 },
  b21 :{ left:36, bottom:-0.5, width:21.8, rotate:2.3, clipL:52 },
  b22 :{ left:42, bottom:12, width:16, clipT:18, clipB:95 },
  b24 :{ left:32.2, bottom:-35.8, width:26.3, rotate:6 },
  b15 :{ left:41.8, bottom:11.9, width:16, clipT:95, clipB:44 },
  b25 :{ left:-0.6, bottom:-282.5, width:96.7 },
  b26 :{ left:42, bottom:12, width:16, clipT:16, clipB:95 },
  b27 :{ left:42, bottom:12, width:16, clipT:16, clipB:95 },
  b28 :{ left:69.6, bottom:-20, width:26.3 },
  b29 :{ left:18.5, bottom:34.2, width:12.5, rotate:-3 },
  b30 :{ left:42, bottom:12, width:16, clipT:14, clipB:95 },
  "b02@C14":{ left:42, bottom:12, width:16 },
  "b02@C15":{ left:76.1, bottom:47.5, width:4.6 },
  "b23@C22":{ left:50.6, bottom:39.5, width:6.7, rotate:6 },
  "b23@C23":{ left:58.8, bottom:19.9, width:11, rotate:-1.5, clipT:4, clipL:56 },
  b02 :{ left:42, bottom:12, width:16, clipT:95, clipB:20 },
  "n18@C14":{ left:-8, bottom:-244.4, width:123.9 }
};

/* ---------------------------------------------------------------------------
   PER-ANIMATRONIC PLACEMENT

   SHOTS above is the shared placement for a node — where a body stands in that
   shot. Anything listed here overrides it for one animatronic only, so the two
   of them can occupy a room differently: Eugene filling a doorway head-on
   while Sloppy hangs back against the far wall, or one crowding the lens
   in the hall while the other keeps its distance.

   Only the keys you name are overridden; everything else falls through to
   SHOTS. Leave a unit's object empty to have it use the shared placement
   everywhere. The calibration tool writes this block for you.
--------------------------------------------------------------------------- */
const SHOTS_UNIT = {
  eugene: {
    nDR :{ left:39.5, bottom:15.6, width:11.1 },
    nDL :{ left:40.3, bottom:3.9, width:14 },
    n01 :{ left:3.9, bottom:-24.6, width:26.2, clipR:6, clipL:6 },
    n02 :{ left:-5.1, bottom:-56.9, width:31.6 },
    n03 :{ left:15.9, bottom:8.7, width:12.5, flip:true },
    n05 :{ left:25.8, bottom:21.3, width:11.7, rotate:-3.2 },
    n20 :{ left:30.2, bottom:43.4, width:6.5, rotate:-3.7, dim:0.8 },
    n21 :{ left:34.1, bottom:-6.7, width:18, rotate:-3.2 },
    n04 :{ left:27.4, bottom:47.6, width:5.4, rotate:-4.5, dim:0.7 },
    n22 :{ left:-13.1, bottom:-278.7, width:99.1 },
    n07 :{ left:42.3, bottom:11.2, width:13.3, rotate:7 },
    n08 :{ left:24.2, bottom:-57.7, width:35, rotate:-9 },
    n14 :{ left:38.7, bottom:34.4, width:6.5, dim:0.8 },
    n11 :{ left:41.9, bottom:-77.2, width:35.5, dim:0.7 },
    n10 :{ left:62.6, bottom:-29.6, width:14.8, rotate:12 },
    n12 :{ left:47.7, bottom:31.9, width:5.8, rotate:6, dim:0.8 },
    n13 :{ left:14, bottom:-62.1, width:21.7, flip:true, rotate:-2.2 },
    n15 :{ left:14.3, bottom:-15.9, width:17, rotate:-7 },
    n17 :{ left:11.7, bottom:-7.7, width:16 },
    n16 :{ left:65.8, bottom:-33.4, width:19, flip:true, rotate:9 },
    "n18@C07":{ left:37.6, bottom:46.8, width:3.2, clipT:4, clipR:30.8, clipB:59, clipL:21.6 },
    "n18@C13":{ left:16.3, bottom:-92.3, width:38 },
    n25 :{ left:69.2, bottom:20.6, width:6.9, rotate:13.5, dim:0.8 },
    n19 :{ left:18.3, bottom:21.8, width:6.7, flip:true, rotate:-9 },
    n06 :{ left:36, bottom:13, width:18 },
    n09 :{ left:40, bottom:15, width:16 },
    n26 :{ left:36.1, bottom:41.6, width:4.9 },
    "n18@C14":{ left:7.4, bottom:-156.2, width:52 },
    "b02@C14":{ left:42, bottom:12, width:16, clipT:95, clipB:24 },
    "b02@C15":{ left:76.1, bottom:47.5, width:3.6 }
  },
  sloppy: {
    nDR :{ left:38.8, bottom:15.3, width:12.6, flip:true },
    nDL :{ left:39.7, bottom:3.4, width:16, flip:true },
    n01 :{ left:68.8, bottom:-52.1, width:35.8 },
    n02 :{ left:-7.3, bottom:-55.2, width:35.8, flip:true },
    n03 :{ left:15.3, bottom:8.7, width:14.1, flip:true },
    n05 :{ left:25.2, bottom:21.5, width:13.2, rotate:-3.5 },
    n20 :{ left:29.9, bottom:43.1, width:7.3, flip:true, rotate:-3.7, dim:0.8 },
    n21 :{ left:32.8, bottom:-9.4, width:21.7, flip:true, rotate:-3.2 },
    n04 :{ left:27.2, bottom:47.1, width:6.1, flip:true, rotate:-3.2, dim:0.7 },
    n22 :{ left:38.9, bottom:-130.8, width:60.3 },
    n07 :{ left:23, bottom:5, width:17 },
    n08 :{ left:56.4, bottom:12.2, width:24.1, rotate:18 },
    n14 :{ left:38.2, bottom:35, width:7.3, flip:true, dim:0.8 },
    n11 :{ left:42.7, bottom:-64.8, width:37.7, dim:0.7 },
    n10 :{ left:62.2, bottom:-23.8, width:15.8, rotate:12 },
    n12 :{ left:47.5, bottom:31.8, width:6.6, rotate:6, dim:0.8 },
    n13 :{ left:11.7, bottom:-53.5, width:24.6, flip:true, rotate:-3 },
    n15 :{ left:55.3, bottom:-21.6, width:21.8, rotate:3 },
    n17 :{ left:61.2, bottom:-6.7, width:18.1, rotate:10 },
    n16 :{ left:20, bottom:25.8, width:13.9, flip:true, rotate:6 },
    "n18@C07":{ left:36.8, bottom:42.7, width:4.9, rotate:-1, clipT:18.6, clipR:36, clipB:59.4, clipL:33 },
    "n18@C13":{ left:12.6, bottom:-99.3, width:45.9, flip:true },
    n25 :{ left:68.2, bottom:19.9, width:8.3, rotate:15.3, dim:0.8 },
    n19 :{ left:18.1, bottom:20.3, width:7.6, flip:true, rotate:-9 },
    gW  :{ left:30.8, bottom:53.5, width:3.1, dim:0.55, clipR:36, clipB:54, clipL:36 },
    "n18@C14":{ left:-2.9, bottom:-205.9, width:71 },
    "b02@C14":{ left:42, bottom:12, width:16, clipT:95, clipB:24 },
    "b02@C15":{ left:75.9, bottom:47.8, width:4.1 }
  },
  gordon: {
    n01 :{ left:-8.2, bottom:-259.4, width:109.3 },
    n02 :{ left:-8.8, bottom:-257.2, width:109.3 },
    n03 :{ left:1.7, bottom:-273.3, width:90.8, flip:true },
    n05 :{ left:28, bottom:21.3, width:16, rotate:-5.2 },
    n20 :{ left:28.7, bottom:43.9, width:8.3, rotate:-5.5, dim:0.8 },
    n21 :{ left:29.6, bottom:-14.7, width:27.8, rotate:-3.5 },
    n04 :{ left:28.1, bottom:46.5, width:7.8, rotate:-6, dim:0.7 },
    n22 :{ left:-7.1, bottom:-238.6, width:105.4 },
    n07 :{ left:7.1, bottom:-221.6, width:75.3 },
    n08 :{ left:-10.2, bottom:-260.9, width:113.6 },
    nDR :{ left:34.6, bottom:15.1, width:15.8 },
    nDL :{ left:34.3, bottom:3.2, width:19.2 },
    n14 :{ left:35.9, bottom:34.5, width:8.8, dim:0.8 },
    n11 :{ left:-4.7, bottom:-233.7, width:101.8, dim:0.7 },
    "n18@C07":{ left:36.1, bottom:42.7, width:5.9, rotate:-0.2, clipT:13.6, clipR:37.6, clipB:63, clipL:36.8 },
    n26 :{ left:36.2, bottom:41.6, width:6.3, flip:true },
    n10 :{ left:17.7, bottom:-225.3, width:61.8 },
    n12 :{ left:47.9, bottom:30.1, width:8.4, rotate:6, dim:0.8 },
    n13 :{ left:9.8, bottom:-258.6, width:75, flip:true },
    n15 :{ left:0.3, bottom:-249.4, width:90.8 },
    n17 :{ left:-4.5, bottom:-297, width:102.9 },
    n16 :{ left:5.1, bottom:-259.4, width:84.2, flip:true },
    "n18@C13":{ left:3.2, bottom:-224.3, width:84.3 },
    n25 :{ left:68.4, bottom:20.1, width:10, rotate:12, dim:0.8 },
    n19 :{ left:18.7, bottom:22.1, width:8.6, flip:true, rotate:-9 },
    "n18@C14":{ left:1.5, bottom:-254.8, width:90.9 },
    "b02@C14":{ left:42, bottom:12, width:16, clipT:95, clipB:22 },
    "b02@C15":{ left:72.5, bottom:47.1, width:4.1 },
    b03 :{ left:68.7, bottom:39, width:6.7 }
  }
};

/* A node visible from two cameras needs a placement in each — n18 is down the
   hall on one feed and across the room on the other. A key of "node@CAM"
   overrides the plain one, but only on that camera.

   DEFAULT_SHOT < SHOTS[node] < SHOTS[node@cam] < unit[node] < unit[node@cam]

   MIND THE PRECEDENCE. A per-unit PLAIN key outranks a shared node@CAM one,
   so calibrating a two-camera node without naming the camera silently applies
   that one framing to both feeds. That is what happened to n18: a pass on the
   office hall wrote a 2.2%-wide figure at the end of a corridor into the plain
   key, which then also drove the south hall, where it rendered as a sliver too
   small to see. Both are now spelled out per camera and neither can overwrite
   the other. */
function shotFor(u, node, camId){
  const per  = SHOTS_UNIT[u.id] || {};
  const key  = node + "@" + (camId || S.activeCam);
  return Object.assign({}, DEFAULT_SHOT,
    SHOTS[node] || {}, SHOTS[key] || {},
    per[node]  || {}, per[key]  || {});
}

/* Use one transform for normal bodies, hallucinations, and the doorway.
   `baseFlip` preserves the doorway's normal inward-facing orientation. */
function shotTransform(shot, baseFlip=false){
  const parts = [];
  if (shot.rotate) parts.push("rotate(" + shot.rotate + "deg)");
  if (!!shot.flip !== !!baseFlip) parts.push("scaleX(-1)");
  return parts.join(" ") || "none";
}

/* The rooms themselves, traced off the floorplan sketch as percentages. Drawn
   behind the camera pins so the map reads as a building rather than a scatter
   of buttons. `hall` shades it; `you` is your office. */
const ROOMS = [
  { x1:16.6, y1:1.7, x2:42, y2:12.2, name:"OFFICE 1" },
  { x1:42.7, y1:1.7, x2:65.3, y2:12.2, name:"OFFICE 2" },
  { x1:66, y1:2.3, x2:86.1, y2:12.6, name:"OFFICE 3" },
  { x1:16.6, y1:12.2, x2:87.2, y2:20, name:"NORTH HALL", hall:true },
  { x1:29.2, y1:20.4, x2:42.7, y2:35.8, name:"OFFICE 4" },
  { x1:43.1, y1:20.4, x2:60.1, y2:35.8, name:"CENTER" },
  { x1:74.5, y1:20.4, x2:84, y2:27.3, name:"BATHROOM", lx:0, ly:3.6 },
  { x1:60.4, y1:29.4, x2:78.6, y2:35.8, name:"SERVER ROOM" },
  { x1:33.5, y1:35.8, x2:45.8, y2:50.3, name:"OFFICE 5" },
  { x1:34.4, y1:50.5, x2:45.6, y2:67, name:"YOU", you:true },
  { x1:33.5, y1:67.7, x2:45.8, y2:82.5, name:"OFFICE 7" },
  { x1:46.1, y1:35.8, x2:52.9, y2:83.1, name:"HALL", hall:true },
  { x1:53.2, y1:35.8, x2:69.5, y2:58, name:"BREAK ROOM" },
  { x1:53.2, y1:58.2, x2:69.5, y2:69.6, name:"OFFICE 6" },
  { x1:53.2, y1:70.2, x2:69.5, y2:82.5, name:"OFFICE 8" },
  { x1:28.7, y1:83.1, x2:70.5, y2:96.6, name:"ENGINEERING", hall:true }
];

/* The lower floor's rooms, drawn on the same board when the map is flipped.
   Kept in its own block rather than folded into ROOMS with a floor: key, so
   the calibration tool can keep rewriting ROOMS exactly as it always has and
   this one alongside it. `hall` shades a run of tunnel; nothing down here is
   marked `you`, because you are never down here. */
const ROOMS_B = [
  { x1:27.8, y1:49.7, x2:36, y2:98.3, name:"NORTH HALL", hall:true },
  { x1:36, y1:74.9, x2:97.5, y2:98.3, name:"ENGINEERING OFFICE", lx:33.4, ly:2.9 },
  { x1:60.2, y1:63, x2:97.5, y2:74.9, name:"ENG OFFICE WEST" },
  { x1:36, y1:63, x2:60.2, y2:74.9, name:"OFFICE A" },
  { x1:55.7, y1:49.7, x2:80.9, y2:63, name:"OFFICE B" },
  { x1:36, y1:49.7, x2:55.7, y2:63, name:"OFFICE C" },
  { x1:80.9, y1:35.9, x2:97.5, y2:63, name:"VAULT" },
  { x1:80.9, y1:32.2, x2:97.5, y2:35.9, name:"CLOSET" },
  { x1:80.9, y1:22.3, x2:97.5, y2:32.2, name:"UTILITY CLOSET", lx:56.2, ly:5.8 },
  { x1:26.7, y1:31.2, x2:80.9, y2:49.7, name:"PAYROLL & BILLING" },
  { x1:2.5, y1:31.2, x2:26.7, y2:49.7, name:"NORTH OFFICE" },
  { x1:63.9, y1:22.3, x2:80.9, y2:31.2, name:"LADIES" },
  { x1:50, y1:22.3, x2:63.9, y2:31.2, name:"MENS" },
  { x1:38.5, y1:22.3, x2:50, y2:31.2, name:"EAST CLOSET" },
  { x1:38.5, y1:17.2, x2:97.5, y2:22.3, name:"CENTRE CORRIDOR", hall:true, lx:30.2, ly:37.7 },
  { x1:78.4, y1:1.7, x2:97.5, y2:17.2, name:"SALES OFFICE" },
  { x1:59.1, y1:1.7, x2:78.4, y2:17.2, name:"SALES OFFICE 2" },
  { x1:37.7, y1:1.7, x2:59.1, y2:17.2, name:"SALES OFFICE 3" },
  { x1:2.5, y1:13.6, x2:38.5, y2:31.2, name:"ATRIUM", hall:true },
  { x1:26.1, y1:1.7, x2:37.7, y2:13.6, name:"", hall:true },
  { x1:2.5, y1:1.7, x2:26.1, y2:13.6, name:"ENTRY" }
];

/* ---------------------------------------------------------------------------
   WHO STANDS IN THE DOORWAY, AND WHERE

   Percentages of the doorway opening, not of the panorama. The sprite is far
   taller than the opening, so a large negative `bottom` is normal — it puts
   the head in frame and leaves the body below the sill.

   DOOR_SHOTS is shared; DOOR_SHOTS_UNIT overrides it per animatronic, exactly
   like SHOTS and SHOTS_UNIT. The calibration tool writes both.
--------------------------------------------------------------------------- */
const DOOR_SHOTS = {
  left :{ left:-51.8, bottom:-252.9, width:136.4, flip:true },
  right:{ left:24.3, bottom:-232.6, width:128.2 }
};

const DOOR_SHOTS_UNIT = {
  eugene: {
      left :{ left:-43, bottom:-229.1, width:113.2 },
      right:{ left:31.4, bottom:-229.8, width:113.2 }
  },
  sloppy: {
      left :{ left:-51.8, bottom:-252.9, width:136.4, flip:true },
      right:{ left:24.3, bottom:-232.6, width:128.2 }
  },
  gordon: {
      left :{ left:-67.8, bottom:-258.7, width:154.4, flip:true },
      right:{ left:10.1, bottom:-259.3, width:154.4 }
  }
};

function doorShot(u, side){
  const per = (DOOR_SHOTS_UNIT[u.id] || {})[side];
  return Object.assign({}, DOOR_SHOTS[side], per || {});
}

/* Which edge of your office panorama each hall square appears at. If your desk
   faces the other way, swap these two values. */
const DOOR_SIDE = { nDL:"left", nDR:"right" };
/* The building is not a left-to-right drawing, so doorway departures use the
   actual wing each room belongs to rather than its map coordinates. */
const EXIT_SIDE = {
  n15:"right", n14:"right", n16:"right", n17:"right", n18:"right", n25:"right", n19:"right",
  n26:"right", gS:"right",
  n11:"left", n10:"left", n12:"left", n13:"left", n07:"left", n06:"left", n09:"left", n04:"left",
  n20:"left", n01:"left", n02:"left", n05:"left", n03:"left", n21:"left", n22:"left", n08:"left",
  gE:"left", gW:"left"
};

/* ===========================================================================
   2. TUNING
   =========================================================================== */

const CONFIG = {
  hourMs: 45000,
  officePan: 0.42,
  camPan: { width:128, period:33000, reach:0.9 },

  // audio lure. chance = strength * falloff^(rooms between them and the noise)
  lureCommitMoves: 7,      // a cue that lands carries HER a long way
  lureStrength: 0.92,
  lureFalloff:  0.60,      // 1 room .55 · 2 rooms .33 · 3 rooms .20 · 4 rooms .12
  lureHoldMs:   9000,      // how long a cue keeps working
  lureCooldownMs: 8000,    // she is lethal now, so the tool that steers her
                           // has to be available when you actually need it.
                           // Measured at 8000 the relay was still recharging
                           // on nearly half the arrivals it was needed for.
  ventLureStrength: 0.40,  // the fans coming back on, pointed at your office
  sensorMoveCooldownMs: 1200, // debounce, so remounting doesn't spam the chirp

  entryStaggerMs: 24000,   // gap between the first and second arrival

  botDwellMs: 1400,        // how long the bot holds a feed before moving on
  botHuntMs:  9000,        // how long a flicker keeps it hunting Eugene
  botHuntCooldownMs: 9000, // quiet period after a hunt, so flickers cannot chain
  botHallCheckMs: 6500,    // how often it glances down the office hall
  botDoorCheckMs: 850,     // monitor DOWN, eyes on the doorways, after a flicker
  botWatchMaxMs: 4200,     // longest unbroken hold on Sloppy before the
                           // stall has decayed far enough to be worth breaking
  botWatchRestMs: 3000,    // and how long it stays off her, letting it recover


  /* Room tone. Fires on a random gap, from a pool that means nothing. Raise
     ambienceMinMs to quieten the building down. */
  ambienceMinMs: 26000,
  ambienceMaxMs: 78000,
  ambienceScale: [1.0, 0.92, 0.80, 0.66, 0.52, 0.40, 0.10],  // gaps shrink by night
  ambienceFirstMs: 20000,

  // the last resort
  // Reaction, not luck. The moment one of them reaches a door a clock starts,
  // and where you cut the power inside that window sets your odds. Never
  // cutting it is always fatal.
  passByFast: 0.95,        // power already off, or killed the instant they arrived
  passBySlow: 0.30,        // cut at the last possible moment
  darkCamMs: 5000,         // how long the feeds last on residual power
  ventAlarmMs: 2600,       // initial gap between air warnings, tightening as it thins
  /* OFFICE WARNING LIGHTS. `warningLightCycleMs` is one full bright-to-dim-to-
     bright fade: lower values fade faster; higher values fade more slowly. */
  warningLightCycleMs: 850,
  /* A system that has just come back is left alone for a while. Watching the
     cameras fault again in the second after an eight-second reboot reads as
     the game cheating rather than as bad luck, and there is nothing to be done
     about it either way. Faults still arrive on schedule — they just pick
     something else, or nothing. */
  /* Moved to FAULTS.graceMs, which is where every other fault number now
     lives. Left out of CONFIG deliberately rather than kept as an alias: two
     names for one grace window is how they end up disagreeing. */
  passBySteps: 4,          // how many rooms it carries on before settling
  /* How often a pass-by crosses your doorway instead of backing off the way it
     came. This is the ONLY thing that puts something on the other side of your
     office without it walking all the way round, so it is also the only reason
     the door you were watching can become the wrong one. At 0 the crossing
     animation never plays; at 1 they never simply retreat. */
  crossDoorChance: 0.38,
  walkByMs: 2600,          // how long they take to cross your doorway
  powerRestoreMs: 2600,    // breaker warm-up, so you can't strobe it
  passOutMs: 6500,         // how long you're face-down when the air runs out
  passOutO2: 40,           // what you come round with
  doomMs: 3400,            // dread before the cut, if you're hiding in the monitor

  /* How long the door array needs between commands. Short enough that a
     genuine change of mind is allowed, long enough that you cannot flutter a
     door in Gordon's face and have him bounce off it twice. */
  doorCooldownMs: 2200,

  /* Where each floor starts you the first time you look at it. */
  /* Where each floor starts you the first time you look at it.

     The lower default is the vault, because that is where Gordon wakes up —
     flipping down for the first time should show you the thing you flipped
     down to check. It used to be C14, which stopped being a lower camera when
     engineering moved upstairs and would have dropped you onto the wrong floor
     entirely. */
  homeCam: { 1:"C04", 2:"C18" },

  /* HOW A FAILING CAMERA FAILS.
     Snow for dropoutOnMs, picture for dropoutOffMs, each jittered so the
     rhythm is never countable. Longer than instinct suggests — the point is
     that both states last long enough to matter, rather than flickering fast
     enough to just read as noise. */
  dropoutOnMs:  850,
  dropoutOffMs: 2900,

  // air
  o2Drain: 4.2,            // % per second while ventilation is offline
  o2Regen: 7.0,
  /* Long enough that a cycle is a real commitment, short enough that a fault
     during a bad stretch is a problem you can still solve. */
  rebootOneMs: 6800,
  rebootAllMs: 12000
};

/* Simulated at 6000 runs per night against a player who never plays a cue and
   never mounts the sensor. These are the values AFTER the intra-night ramp is
   applied, so they describe a whole night rather than its opening minute:

     night 1 — first knock ~3AM, ~4 arrivals      night 4 — ~1AM, ~14
     night 2 — ~2AM, ~7                           night 5 — ~1AM, ~18
     night 3 — ~1AM, ~10                          night 6 — 12AM, ~21

   Arrivals per hour on night 1 run 0.0 · 0.0 · 0.4 · 1.0 · 1.4 · 1.6 — the
   opening is still quiet, but the last two hours are where it is won or lost.

     enterMs     how long they loiter OUTSIDE before entering.
     idleChance  odds a movement cycle passes with nothing happening.
     approach    odds a step is toward you rather than anywhere else.
     moveMs      base interval, before rhythm, jitter and the ramp.
     breachMs    your reaction window once something reaches nDL or nDR. */
const NIGHTS = [
  /* failEveryMs and failChance are GONE from these rows. Faults are no longer
     rolled against a clock — they are worn into the systems by the use you put
     them to, and the numbers that govern that live in FAULTS above. Jeffrey
     still takes systems down directly, which is his own cost and is unchanged.
     If you are looking for the old "how often does something break" knob, it
     is now four knobs, one per system, and each is a rate per use. */
  { moveMs:9000, approach:0.50, doubleStep:0.32, idleChance:0.34, breachMs:7000, respiteMs:16000, enterMs:44000 },
  { moveMs:8000, approach:0.57, doubleStep:0.34, idleChance:0.28, breachMs:6600, respiteMs:14000, enterMs:34000 },
  { moveMs:7000, approach:0.64, doubleStep:0.36, idleChance:0.22, breachMs:6200, respiteMs:12500, enterMs:24000 },
  { moveMs:6200, approach:0.71, doubleStep:0.38, idleChance:0.16, breachMs:5800, respiteMs:11000, enterMs:15000 },
  { moveMs:5500, approach:0.78, doubleStep:0.40, idleChance:0.10, breachMs:5400, respiteMs: 9500, enterMs: 9000 },
  { moveMs:4800, approach:0.84, doubleStep:0.42, idleChance:0.06, breachMs:5000, respiteMs: 9000, enterMs: 5000 },

  /* NIGHT SEVEN. Not a seventh step on the same staircase — the week ends at
     six and this is the one after it. He moves faster than the base rate has
     ever been and hardly ever idles, her doorway pause is down to two seconds,
     Jeffrey is on you every twenty-odd, and the breach window is short
     enough that the breaker has to be muscle memory. It is meant to be beaten
     rarely. */
  { moveMs:4100, approach:0.90, doubleStep:0.46, idleChance:0.02, breachMs:4300, respiteMs: 7500, enterMs: 2500 }
];

/* ---------------------------------------------------------------------------
   CUSTOM NIGHT

   Difficulty 1 is the Night 1 tuning for Eugene and Sloppy. Difficulty 17 is
   exactly Night 7. Levels 18-20 continue past Night 7 so an all-20 setup can
   be substantially nastier than the hardest authored night.

   Gordon first exists on Night 3, so his level-1 anchor is his existing Night 3
   tuning; level 17 still lands exactly on his Night 7 values.
--------------------------------------------------------------------------- */
const CUSTOM_DEFAULTS = { eugene:0, sloppy:0, gordon:0, jeffrey:0 };
const CUSTOM_KEY = "fnaac-custom-night";
const CUSTOM_20_KEY = "fnaac-custom-20-complete";
let customLevels = { ...CUSTOM_DEFAULTS };
let custom20Complete = false;

function loadCustomLevels(){
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "{}");
    for (const id of Object.keys(CUSTOM_DEFAULTS)){
      if (Number.isFinite(raw[id]))
        customLevels[id] = Math.max(0, Math.min(20, Math.round(raw[id])));
    }
    custom20Complete = localStorage.getItem(CUSTOM_20_KEY) === "1";
  } catch (_) {}
}

function saveCustomLevels(){
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customLevels)); } catch (_) {}
}

function saveCustom20Complete(){
  custom20Complete = true;
  try { localStorage.setItem(CUSTOM_20_KEY, "1"); } catch (_) {}
}

function customLevel(id){
  return S.night === 8 ? customLevels[id] : null;
}

/* 1 = Night 1 baseline, 17 = Night 7 baseline. Levels 18-20 push beyond 7. */
function customScale(level){
  const d = Math.max(1, Math.min(20, level));
  return (d - 1) / 16 + Math.max(0, d - 17) * 0.17;
}

function lerp(a, b, t){ return a + (b - a) * t; }

function customPairCfg(id){
  const d = customLevel(id);
  if (d === null || d === 0) return null;
  const t = customScale(d);
  const a = NIGHTS[0], b = NIGHTS[6];
  return {
    moveMs:     Math.max(1800, lerp(a.moveMs, b.moveMs, t)),
    approach:   Math.min(0.995, Math.max(0, lerp(a.approach, b.approach, t))),
    doubleStep: Math.min(0.78, Math.max(0, lerp(a.doubleStep, b.doubleStep, t))),
    idleChance: Math.max(0, lerp(a.idleChance, b.idleChance, t)),
    breachMs:   Math.max(2400, lerp(a.breachMs, b.breachMs, t)),
    respiteMs:  Math.max(3500, lerp(a.respiteMs, b.respiteMs, t)),
    enterMs:    Math.max(650, lerp(a.enterMs, b.enterMs, t))
  };
}

function customGordonCfg(){
  const d = customLevel("gordon");
  if (d === null || d === 0) return null;
  const t = customScale(d);
  const n3 = 2, n7 = 6;
  return {
    moveMs:  Math.max(5200, lerp(GORDON.moveMs[n3], GORDON.moveMs[n7], t)),
    doorMs:  Math.max(1800, lerp(GORDON.doorMs[n3], GORDON.doorMs[n7], t)),
    enterMs: Math.max(900,  lerp(GORDON.enterMs[n3], GORDON.enterMs[n7], t)),
    breakMs: Math.max(17000, lerp(GORDON.breakMs[n3], GORDON.breakMs[n7], t))
  };
}

function customJeffreyCfg(){
  const d = customLevel("jeffrey");
  if (d === null || d === 0) return null;
  const t = customScale(d);
  /* Jeffrey is absent from Nights 1-2, so level 1 uses Night 3. His main
     Custom-Night difficulty is the show window: time available to change feeds. */
  return {
    firstMs: Math.max(6000, lerp(JEFFREY.firstMs[2], JEFFREY.firstMs[6], t)),
    gapMs:   Math.max(3500, lerp(JEFFREY.gapMs[2],   JEFFREY.gapMs[6],   t)),
    showMs:  Math.max(550,  lerp(JEFFREY.showMs[2],  JEFFREY.showMs[6],  t))
  };
}

function customEnabled(id){
  return S.night !== 8 || customLevel(id) > 0;
}

/* All global, night-authored settings use the total Custom Night level.
   This keeps the building itself on one of the seven authored difficulty tiers
   while each animatronic keeps its own independent A.I. level.

   Total level partitions:
     0-11 -> Night 1
     12-23 -> Night 2
     24-35 -> Night 3
     36-47 -> Night 4
     48-57 -> Night 5
     58-67 -> Night 6
     68-80 -> Night 7

   Power economy, system-fault rates, hallucination frequency, and ambience
   frequency all use this same partition. */
const CUSTOM_SETTING_BANDS = [12,24,36,48,58,68];
function customTotalLevel(){
  return Object.values(customLevels).reduce(
    (sum, v) => sum + Math.max(0, Math.min(20, Number(v) || 0)), 0
  );
}
function customSettingNightIndex(){
  const total = customTotalLevel();
  let idx = 0;
  while (idx < CUSTOM_SETTING_BANDS.length && total >= CUSTOM_SETTING_BANDS[idx]) idx++;
  return idx;
}
function authoredSettingNightIndex(){
  return S.night === 8 ? customSettingNightIndex() : nightIdx();
}

/* ---------------------------------------------------------------------------
   SLOPPY'S COMMITMENT

   She does not run on a countdown. When she reaches a doorway a meter starts:
   it rises while you are NOT watching her and falls while you are. Fill it and
   she comes in. Drain it past zero and she goes away.

   The power cut does nothing to her. Watching is the only thing that does, and
   watching costs you everything else you could be doing with those seconds —
   which is the entire reason to open the cameras at all.

   A camera fault gives no protection: the meter keeps rising because you still
   cannot watch her. The answer is to reboot the array and then hold her, which
   has to fit inside killMs. Simulated at 6.8s to reboot plus 4s to hold,
   against 15s on night one down to 10s on night six.

   Verified by simulation over 6000 nights per configuration:
     a player who never opens the cameras dies on 100% of nights, every night
     a competent player survives 89% of night 1 falling to 46% of night 6
     and spends roughly 60% of the night holding a feed
--------------------------------------------------------------------------- */
/* Staring at one feed forever was the whole optimal strategy, so it stops
   working. Hold a unit on screen and its stall decays; look away and it
   recovers. You cannot park on her — you can only buy stretches of time, and
   the price of each one is going and doing something else in between. */
const FATIGUE = {
  fullMs:   9000,   // continuous watching before the stall is at its weakest
  floor:    0.28,   // how much of the stall survives at that point
  recover:  1.7     // how much faster it comes back than it wore off
};

/* ---------------------------------------------------------------------------
   EUGENE — his sound-led behaviour

   These used to be scattered through CONFIG because they are also the rules
   used by any alternate-preset character without Sloppy's commitment model.
   In the normal pair they are Eugene's settings: the way he gives himself
   away, how strongly audio redirects him, and how much time the player gets
   to answer him at the doorway.
--------------------------------------------------------------------------- */
const EUGENE = {
  lureCommitMoves: 3,  // successful audio keeps him walking toward its target
  flickerMs: 420,      // every feed stutters for this long when he moves
  entryJitterMs: 6000, // random extra delay before he enters from outside
  cutGraceMs: 1100     // free doorway reaction time before dark-pass odds decay
};

const SLOPPY = {
  /* Reaching a doorway is still a crisis. She stands there for a moment first,
     but an aimed audio cue gives one last chance: if she takes it, she leaves
     immediately. Eugene never gets this doorway escape. She can still
     ignore a cue, so prevention and watching remain the safer answers. */
  /* How long she stands there first. Enough to react once — find the feed,
     aim it, fire — and not enough to think about it. */
  doorMs:   [3600, 3400, 3200, 3000, 2800, 2600, 2200],

  /* HER PACE. This is the number that decides whether she is a threat at all.

     It multiplies the night's move interval, and it also carries her rhythm
     of 1.27, so 6.5 meant a step every 39 SECONDS on night six — around seven
     for the whole night, against seven rooms of building to cross, before the
     watch stall slowed her further. A player who watched her at all could
     finish night six having seen her move once. She was not slow, she was
     stationary.

     It now tightens across the week instead of loosening, and it is set
     against her entry time below: she walks in far sooner than she used to, so
     the interval could come back up a little without giving her the night
     back. Measured over 120 nights per figure, against a player who never
     plays a cue:

                                    night 1      night 3      night 6
       watching her half the night  0.2 knocks   0.9 knocks   2.4 knocks
       never watching her           0.7 knocks   1.7 knocks   3.7 knocks

     The gap between those two rows is the whole point of the character: what
     watching buys you, and what ignoring her costs. The autopilot, which
     watches, cues her out on sight and answers the door, survives 100 · 80 ·
     63 · 55 · 38 · 18 percent across the six nights, 40 nights each — where
     before these numbers it could finish night six having seen her move
     once. */
  moveMult: [3.6, 3.45, 3.3, 3.2, 3.1, 3.0, 2.7],
  approach: 0.95,
  idleMult: 0.5,

  /* HOW LONG SHE WAITS OUTSIDE.

     Her own figure rather than the night's, because the night's was written
     for him. She walks slowly and she starts up to seven rooms out, so time
     spent loitering on the pavement is time subtracted from the only part of
     her that is interesting — and on the late nights it was subtracting most
     of it. She also skips the second-arrival stagger now: he is the one who
     can cross the building in a hurry, so he is the one who should be made to
     wait his turn. */
  enterMs:  [26000, 19000, 13000, 8000, 4000, 2000, 1000],

  /* Cutting the mains while she is in a doorway. One roll per arrival, and the
     cue is worth reaching for first — two rooms out it is 26.5%, next door
     44%. This is the fallback, not the plan. */
  darkEscape: 0.18
};

function sloppyCfg(){
  if (S.night === 8){
    const t = customScale(customLevels.sloppy);
    return {
      doorMs: Math.max(1700, lerp(SLOPPY.doorMs[0], SLOPPY.doorMs[6], t)),
      moveMult: Math.max(1.95, lerp(SLOPPY.moveMult[0], SLOPPY.moveMult[6], t))
    };
  }
  const h = nightIdx();
  return { doorMs:SLOPPY.doorMs[h], moveMult:SLOPPY.moveMult[h] };
}

/* THE NIGHT GETS WORSE AS IT GOES.

   Applied per in-game hour elapsed, so 5AM is meaningfully harder than 12AM on
   every night. This is what stops a night from being one difficulty repeated
   six times — the shape of the pressure is what you remember. */
const RAMP = { approach:0.035, idle:0.030, moveMs:0.035 };

/* The night's numbers with the hour's ramp already folded in. Everything that
   reads difficulty goes through here, never NIGHTS directly. */
function tuned(){
  const n = night(), h = Math.min(5, S.hour);
  let base = n;
  if (S.night === 8) base = customPairCfg("eugene");
  return {
    moveMs:     base.moveMs * Math.pow(1 - RAMP.moveMs, h),
    approach:   Math.min(0.99, base.approach + RAMP.approach * h),
    idleChance: Math.max(0, base.idleChance - RAMP.idle * h),
    doubleStep: base.doubleStep,
    breachMs:   base.breachMs,
    respiteMs:  base.respiteMs
  };
}

/* ---------------------------------------------------------------------------
   THE PAIR

   They answer to different defenses, and you cannot apply both at once. The
   Eugene follows sound, so you handle him with the audio cue. Sloppy is
   nearly deaf to it but freezes while she is on your active feed — she is
   handled with attention. Since the monitor shows one camera at a time, and
   playing a cue means being on the camera you want him to walk to, these two
   are always competing for the same few seconds of your night.

   Per-unit modifiers, all optional:
     speedMod        multiplies moveMs. 0.85 = moves 15% more often.
     approachMod     added to the night's approach chance, then clamped.
     doubleStepMod   added to the night's double-step chance.
     lureResist      0-1. How much of an audio cue's pull it ignores.
     watchStall      0-1. How much its move timer slows while you watch it.
     passByMod       added to the odds of being walked past in the dark.
     ghost           never renders on a feed at all. Sound only.
     flickerOnMove   every feed stutters when this one takes a step.
     walkBySfx       which crossing sound it makes when it passes your door.
     moveTell        a sound played on every step, but ONLY while the player
                     is on the monitor. The audible counterpart to
                     flickerOnMove — one of them is seen, the other heard.
     chirp           which sensor tone this one sets off, so a mounted sensor
                     tells you WHICH of them walked in, not merely that
                     something did. Low double note = Eugene, high triple =
                     Sloppy.
--------------------------------------------------------------------------- */
const PAIRS = {

  // A - one answers to sound, one answers to being watched. Recommended.
  soundAndSight: [
    { id:"eugene",  name:"EUGENE",  lureResist:0.05, watchStall:0.20, passByMod:+0.05,
      flickerOnMove:true, chirp:"sensorA", walkBySfx:"walkByA", enterSfx:"enterA" },
    /* ONE ROOM AT A TIME, ALWAYS.

       doubleStepMod is added to the night's double-step chance and the sum is
       clamped to 0..1, so -1 puts her at zero on every night — she can never
       cover two rooms in a move the way he can. That matters more for her than
       it would for him: he announces every step with a flicker, so a double is
       felt even when it is not seen, while hers are silent. Watching her cross
       two rooms between glances is indistinguishable from having misread where
       she was, and a threat you cannot track stops being a threat you can play
       against. She is faster to compensate — see SLOPPY.moveMult. */
    { id:"sloppy", name:"SLOPPY", lureResist:0.20, watchStall:0.85, passByMod:-0.05, speedMod:0.95,
      doubleStepMod:-1,
      moveTell:"tellB",   chirp:"sensorB", walkBySfx:"walkByB", enterSfx:"enterB",
      commitModel:true }
  ],

  // B - the two defenses split by body instead: audio vs the power cut.
  lureAndDark: [
    { id:"eugene",  name:"EUGENE",  lureResist:0.05, passByMod:+0.08 },
    { id:"sloppy", name:"SLOPPY", lureResist:0.55, passByMod:-0.34, speedMod:0.95 }
  ],

  // C - one is fast and legible, one is slow and never shows on a feed.
  loudAndQuiet: [
    { id:"eugene",  name:"EUGENE",  speedMod:1.20, approachMod:+0.06 },
    { id:"sloppy", name:"SLOPPY", speedMod:0.78, ghost:true, lureResist:0.25 }
  ],

  // D - mechanically identical. Two bodies, one behaviour.
  identical: [
    { id:"eugene",  name:"EUGENE"  },
    { id:"sloppy", name:"SLOPPY" }
  ]
};

const ACTIVE_PAIR = "soundAndSight";

const ROSTER = PAIRS[ACTIVE_PAIR].map(u => ({
  speedMod:1, approachMod:0, doubleStepMod:0, lureResist:0, watchStall:0,
  passByMod:0, ghost:false, flickerOnMove:false, chirp:"sensorA",
  walkBySfx:"walkByA", moveTell:null, enterSfx:"enterA", commitModel:false,
  art:asset("images/characters/ani_" + u.id + ".png"),
  scare:asset("images/scares/scare_" + u.id + ".jpg"),
  ...u
}));

/* What each one does while faulted is in section 6 of the design notes; the
   panel itself only says which are down. A line of explanation under every row
   is read once and then skipped forever, and it costs a third of the height of
   a screen you are reading in a hurry. */
/* ---------------------------------------------------------------------------
   JEFFREY

   The third one, and the only one that is not on the floorplan. He does not
   walk, he does not approach, and he cannot kill you. He does not arrive,
   either — he is ALREADY THERE when you get there. The clock below only
   decides WHEN he is somewhere: it arms him, and the next camera you open has
   him in it.

   That is the difference between a jump and a dread. A figure fading in while
   you watch is something happening to you; a figure already standing in the
   frame you just opened was true before you looked, and it makes every camera
   change a small gamble. Change camera again and he is gone. Sit there, or
   drop the monitor with him still up, and he takes the frame.

   What that costs you is not your life, it is your night: two systems down at
   once, and a noise in your office loud enough to be worth walking to. He is a
   tax on watching, which is the one thing Sloppy forces you to do, and
   his whole function is to make the safest habit in the game cost something.

   showMs   how long you have to change camera once he is up
   gapMs    quiet time between visits, jittered
   firstMs  how long into the shift the first one can come
   lure     how loudly the noise he leaves behind calls to the other two
--------------------------------------------------------------------------- */
const JEFFREY = {
  id:"jeffrey", name:"JEFFREY",
  art:"images/characters/ani_jeffrey.png",
  scare:"images/scares/scare_jeffrey.jpg",
  firstMs: [270000, 54000, 46000, 38000, 32000, 26000, 8000],
  gapMs:   [58000, 50000, 43000, 36000, 30000, 25000, 5000],
  jitter:  0.45,                     // gaps vary by this much either way
  showMs:  [1700, 1600, 1450, 1300, 1200, 1050, 850],
  /* He will not be waiting on the feed you just left, so switching away from
     him is never punished by finding him again immediately. */
  noRepeatFeed: true,
  /* Feeds he will never be waiting on. Both are the deliberately unstable
     ones: a figure that only shows in the gaps between dropouts is a figure
     you cannot reliably react to, and his whole mechanic is that seeing him
     is a thing you can answer by changing camera. */
  blockedFeeds: ["C13", "C18"],
  scareMs: 1100,                     // how long the frame holds
  lure:    0.62,                     // the noise he leaves in your office
  lureMs:  7000,
  /* One system on the early nights, two once you know what he is. The camera
     system is always one of them: he came in through it. */
  /* extraFaultFrom is gone. He now takes the camera system AND the
     ventilation on every visit, on every night — see jeffreyTakes(). */
};

const SYSTEMS = [
  { id:"cam",   name:"CAMERA SYSTEM" },
  { id:"audio", name:"AUDIO RELAY" },
  { id:"vent",  name:"VENTILATION" },
  /* The fourth. It cannot fail on its own — only Gordon breaks it, by walking
     into a closed one hard enough to jam the run. See FAULTS.doorPerBlock. */
  { id:"door",  name:"DOOR ARRAY" }
];

/* ---------------------------------------------------------------------------
   GORDON

   The third body, and the only one that is not answerable to anything you own.
   Audio does not move him. Watching does not slow him. He starts on the floor
   below, walks to a duct, climbs it, and then walks to you.

   What you have instead is the door array, and the door array is downstairs.
   That is the shape of the whole character: everything you can do about him,
   you have to do BEFORE he is on your floor, and once he is up here the only
   currency left is time. He is a deadline that starts before you can see it.

   startNodes    where he begins. Picked at random so his opening direction is
                 not a thing you can memorise.
   moveMs        base interval between his steps, per night. He is slow — this
                 is measured in tens of seconds, not thousands of milliseconds,
                 and it is the number that decides how much night he costs you.
   upMult        multiplies moveMs once he is UPSTAIRS. Below 1 he speeds up
                 after the climb, which is what makes the vent sound a thing
                 you dread rather than a thing you note.
   blockPenalty  extra multiples of moveMs after he walks into a shut door.
                 This is the entire return on closing one, so it is the first
                 number to reach for if doors feel weak or overpowering.
   climbInMs     how long he spends going INTO the duct, downstairs and visible
   inDuctMs      how long he is inside it, on neither floor and on no camera
   climbOutMs    how long he spends arriving upstairs, visible
   doorMs        how long he stands in your doorway before it is over. There is
                 no escape roll here and no cue that reaches him — this is the
                 length of the last thing that happens to you, and nothing more.
   startNight    the first night he is in the building at all.
   camBurnMs     how long one of your upstairs feeds survives having him in it
                 before it tears itself apart for the rest of the night.
--------------------------------------------------------------------------- */
const GORDON = {
  id:"gordon", name:"GORDON",
  art:  asset("images/characters/ani_gordon.png"),
  scare:asset("images/scares/scare_gordon.jpg"),

  startNight: 3,
  /* WHERE HE WAKES UP.

     Not chosen for flavour. What matters about a start square is the TOTAL
     journey it implies — steps across the basement to the duct he commits to,
     plus rooms from that duct's exit to your door — because that total is how
     much night he costs you, and it has to be roughly the same wherever he
     begins or his opening roll would decide the shift on its own.

     These four run 7, 8, 8 and 10 steps, and between them they open toward
     all three ducts, so his first move is genuinely unpredictable without
     ever being unfair. Squares that read fine and are not on this list:
     b17 is FIVE steps from your door and b05 and b16 are six, which on night
     six is him arriving before you have finished learning where Sloppy is.
     If you re-cut the basement, re-run the totals before touching this. */
  startNodes: ["b12"],

  /* Nights 1-2 are empty for him; the first two figures are the ones he is
     tuned against. From night three the interval tightens hard, because the
     thing that actually kills you is not his pace, it is that watching him
     costs you the seconds Sloppy is charging you for at the same time. */
  moveMs:   [0, 0, 15000, 13000, 11500, 10000, 8200],
  upMult:   0.82,
  blockPenalty: 1.6,

  /* How long he loiters on the floor below before his first step, per night.
     This is your grace period, and it is the difference between "he is a
     problem later" and "he is a problem now". */
  enterMs:  [0, 0, 62000, 48000, 36000, 26000, 12000],

  climbInMs:  2600,
  inDuctMs:   2400,
  climbOutMs: 2600,

  doorMs:   [0, 0, 4200, 4000, 3800, 3600, 3000],

  /* HOW OFTEN HE WANDERS.
     A step that does not take him toward the duct he wants. Without this he
     traces the same shortest path every night and the rooms off it might as
     well not exist; with it, the squares between the routes are places he can
     actually turn up, which is the only thing that makes checking them worth
     the seconds. Kept low — he is a clock, and a clock that wanders too much
     stops reading as one. */
  strayChance: 0.18,

  /* WHICH WAY UP HE COMMITS TO, and why it is not simply the nearest.

     It used to be: after a rebuff, re-pick the closest reachable duct. That is
     deterministic, and against a layout where two ducts sit near each other it
     is exploitable — shut the door on one and he turns for the other, shut
     that and he turns back, and he shuffles between two squares making no
     progress for as long as you can pay for it. Measured on the engineering
     end: V3, V2, V3, V2 with no advance.

     He now picks at random, weighted by distance:

         weight = ductBias ^ (rooms further than the nearest)

     At 0.45 the nearest gets about two-thirds of the roll, the next about a
     third, and anything four rooms further is under 5%. Near enough to be
     predictable, random enough that you cannot bank on it — so shutting a door
     is a push in a direction rather than a lever with a known output, and the
     shuffle has a real chance of ending with him bolting for the far one. */
  ductBias: 0.45,

  /* THE TELL.
     He makes a noise this long before each step. It is the only warning in the
     game that something is ABOUT to happen rather than reporting that it just
     did, and it exists so that hearing him is worth more than watching him:
     two seconds is enough to raise the monitor and find him, and not enough to
     do that and anything else. */
  tellMs: 2200,

  /* HOW LONG HE SPENDS BREAKING A ONE-SHOT DOOR, per night, in milliseconds.

     Absolute rather than a multiple of his move interval, and deliberately so.
     A multiplier would shrink exactly when it matters most — night six needs
     this to be worth as many real seconds as night three, not fewer. */
  breakMs: [0, 0, 62000, 55000, 48000, 42000, 34000],

  camBurnMs: 3200,
  /* He does not idle. A wandering Gordon would be a slower Eugene; a Gordon
     that only ever closes distance is a clock. */
  approach: 1.0,
  chirp: "sensorC"
};

/* ---------------------------------------------------------------------------
   POWER

   Every drain is expressed in PERCENT PER SECOND, so the numbers can be read
   against the length of a night directly: an hour is CONFIG.hourMs, a night is
   six of them, which at the shipped 45 s hour is 270 seconds. A drain of 0.20
   held for the whole night is therefore 54% of the bar.

   Sitting in the dark with nothing raised costs NOTHING. That is deliberate
   and it is the pivot the whole system turns on: power is not a tax on
   existing, it is a tax on ACTING. The three things you must do to survive —
   look at Sloppy, light the room against Eugene, hold a door against Gordon —
   are the three things that spend it, and the night is built so you cannot
   afford all three at once.

   lure is charged per PRESS rather than per second, because a cue is an
   instant and charging it by the second would just be a tax on the relay's
   cooldown, which you do not control.

   nightMult scales every drain together, so the shape of the economy is set
   once here and the difficulty curve is one number per night underneath it.
--------------------------------------------------------------------------- */
const POWER = {
  capacity: 100,

  /* THESE FOUR ARE NOT GUESSES. They were solved against a stated design — how
     much of the bar four different kinds of player should have burned by 6 AM
     on each of the seven nights — and then hand-adjusted where the arithmetic
     and the design disagreed.

     The arithmetic wanted the lure near free and the lights near irrelevant,
     because neither varies much between a careless player and a careful one
     and so neither moved the fit. That is a fact about the fitting, not about
     the game: "every one of the four things you can switch on costs something
     you can feel" is a requirement, so the mix below is set by hand and only
     the per-night CURVE is solved.

     Held on for an entire night, at night 4, they come to: lights 33%,
     monitor 58%, one door 86%, and 1.38% per cue. Which is the shape you want
     stated plainly — the lights are an affordable habit, the monitor is a real
     commitment, and a door is most of a night. */
  drain: {
    lights: 0.130,   // the office lit. Your defence against Eugene, all night.
    monitor:0.230,   // the monitor raised. Your defence against Sloppy.
    door:   0.340,   // one closed door. Your only defence against Gordon.
    panel:  0.0,     // free, on purpose — see the note in togglePanel()
    lure:   1.60     // percent per press, not per second
  },

  /* Solved by least squares against the target table, then forced monotonic.

     A tuning knob that goes DOWN as the night number goes up is a trap for
     whoever reads it next: it looks like a typo and invites a "fix" that
     silently reshapes the whole curve. The raw fit dipped at night three,
     because that is where Gordon adds the door as a fifth consumer and the fit
     compensated by easing everything else. That dip is real, but it belongs in
     how much door a night demands, not in the difficulty knob.

     What this produces: on night three a careless player runs out at the last
     minute and an average one finishes at 69%. By night six the average player
     no longer makes it and only efficient play does, at 76%. On night seven
     efficient finishes at 92% — one forgotten door from an outage. */
  /* RE-SOLVED against the current lower floor, and the method changed as well
     as the numbers.

     The old fit assumed door time was a HABIT — a flat fraction of the night
     per skill level. It is not. It is a DEBT: Gordon arrives at a time you can
     compute, and the doors have to buy exactly the difference between that and
     6 AM. On nights one to four the payroll door alone covers the whole
     shortfall, so a competent player holds no door at all and the old model was
     charging them for a third of the night that never happened.

     Derived from the building instead, the debt is a step: 0s, 0s, 0s, 0s, 5s,
     43s, 93s. Which means GORDON IS NOW THE DIFFICULTY CURVE, and a steep
     multiplier on top of him double-counts. Solving for one anyway produces a
     curve that peaks at night four and then FALLS — the late nights need no
     help from it.

     So this is set by hand to rise smoothly rather than forced out of a solve
     that wanted to go down. What it produces, checked rather than assumed:

       nights 1-4  everyone survives, careless scraping night four at 97%
       night 5     careless fails       average 90%
       night 6     average fails        efficient 82%
       night 7     efficient fails      optimal 82%

     One skill tier removed per night from five onward, which is the shape the
     whole game is built around. */
  nightMult: [0.60, 0.72, 0.90, 1.05, 1.15, 1.24, 1.30],

  /* THE OUTAGE.
     The clock keeps running through all of it, so an outage at 5:40 is
     survivable and an outage at 2:00 is not — which is what makes burning the
     last of the bar to answer one more knock a real decision rather than an
     obvious mistake. */
  jingleMs: 5200,          // how long the box plays before the grace begins
  graceMinMs: 4000,        // shortest wait after the jingle before he moves
  graceMaxMs: 21000,       // longest. Rolled once, per outage.
  warnAt: 20,

  /* THE USAGE METER.

     Bars, not numbers, and derived from the drains rather than hand-assigned
     so it cannot drift out of step with what is actually being spent. One
     "unit" is set a hair above the cost of the lights, which lands the four
     states you actually occupy on four distinct readings:

       lights only                 1 bar
       monitor only                2
       lights + monitor            3
       monitor + door              4
       lights + monitor + door     5

     nightMult is divided back out first. The meter reports WHAT YOU HAVE ON,
     not how expensive tonight is — a night six player holding nothing should
     see an empty meter, the same as on night one. */
  barUnit: 0.145,
  maxBars: 5,
  /* An audio cue is a lump, not a rate, so it has nothing to show on a meter
     of rates. It is faked as a spike: the meter jumps for this long and drops
     back, which is the only honest way to draw an instant. */
  lureSpikeMs: 700,
  lureSpikeBars: 2               // percent at which the readout starts shouting
};

/* ---------------------------------------------------------------------------
   FAULTS — caused, and pressing

   Nothing breaks on a timer any more. Every system breaks because of the thing
   you used it for, and the odds RISE with each use that gets away with it and
   drop back to the floor the moment one doesn't.

   That shape matters more than any single number in it. A flat per-use chance
   is memoryless: forty quiet uses tell you nothing about the forty-first, so
   the array breaking always feels like weather even when you caused it. A
   rising one has a memory. The tenth cue in a row is visibly worse than the
   first, you can feel the bill accruing, and the reset on failure means the
   moment after a fault is the safest the system will ever be — which is the
   one thing that makes rebooting worth the seconds it costs.

     base   the chance on the first use after a fault
     step   added for every use since then
     max    ceiling, so a long clean run never becomes a certainty

   Every row is one entry per night, 1 to 7.

   THE COUNTER IS PER SYSTEM, NOT PER SOURCE. The camera array has two things
   that flicker it and they share one rising counter, because they are wearing
   out one array — a night of Eugene flickers leaves the feed cameras primed
   and vice versa.
--------------------------------------------------------------------------- */
const FAULTS = {

  /* THE AUDIO RELAY — rolled after each cue is placed, never before, so the
     cue you paid for always lands. Firing it is the most deliberate thing you
     do all night, and it is the system with the steepest climb: leaning on the
     relay is supposed to cost you the relay. */
  audio: {
    base: [0.030, 0.045, 0.060, 0.075, 0.095, 0.115, 0.150],
    step: [0.018, 0.026, 0.034, 0.042, 0.052, 0.064, 0.085],
    max:  [0.45,  0.50,  0.55,  0.60,  0.65,  0.72,  0.80]
  },

  /* THE CAMERA ARRAY — rolled on a flicker, from either of its two sources.

     EUGENE'S FLICKER is a whole-array stutter caused by something walking
     around inside the building, and it carries the bigger number.

     A FAILING FEED's dropout is the camera you are already looking at doing
     what it always does. It is far more frequent — a couple of times a second
     while you sit on 3A or 8A — so its per-flicker chance has to be an order
     of magnitude smaller or holding an unstable feed for three seconds would
     be a coin flip. It is still not free, and that is the point: the two
     cameras that show you the things you most need to see are also the two
     that are quietly chewing through the array while you watch them. */
  camEugene: {
    base: [0.020, 0.030, 0.042, 0.055, 0.070, 0.088, 0.115],
    step: [0.012, 0.018, 0.025, 0.032, 0.041, 0.051, 0.068],
    max:  [0.40,  0.45,  0.50,  0.55,  0.60,  0.66,  0.75]
  },
  camFeed: {
    base: [0.0012, 0.0018, 0.0026, 0.0034, 0.0044, 0.0056, 0.0075],
    step: [0.0007, 0.0011, 0.0016, 0.0021, 0.0027, 0.0034, 0.0046],
    max:  [0.040,  0.050,  0.060,  0.070,  0.080,  0.092,  0.110]
  },

  /* VENTILATION, FROM THE DARK.

     Rolled once a second while the lights are off, and this is the answer to
     the oldest degenerate line in the build: sit in the dark, spend nothing,
     be safe from Eugene, and wait the night out. You still can. It now costs
     you the fans, and the fans cost you the air, and running out of air puts
     you on the floor where anything that arrives finds you there.

     THE GRACE IS THE WHOLE REASON THIS IS FAIR. Cutting the lights because
     something is at your door is not a strategy, it is the correct play, and
     it must not be the thing that kills you. For graceMs after the lights go
     out the chance is multiplied by graceScale and barely moves. Past that you
     are no longer answering a knock, you are hiding, and the ramp starts.

     graceMs is set a little above the longest breachMs in NIGHTS so that
     answering a door and turning the lights straight back on is always free. */
  ventDark: {
    base: [0.0030, 0.0045, 0.0062, 0.0080, 0.0100, 0.0125, 0.0165],
    step: [0.0022, 0.0033, 0.0046, 0.0060, 0.0076, 0.0095, 0.0125],
    max:  [0.16,   0.19,   0.22,   0.25,   0.29,   0.33,   0.40],
    graceMs: 7600,
    graceScale: 0.12
  },

  /* THE DOOR ARRAY — rolled only when Gordon walks into a closed door. It
     cannot break any other way, so a door is never taken off you for reasons
     you had no hand in: the array only ever fails at the exact moment it was
     doing its job. Set step to 0 for a flat chance per block. */
  door: {
    base: [0.00, 0.00, 0.10, 0.13, 0.16, 0.20, 0.26],
    step: [0.00, 0.00, 0.04, 0.05, 0.06, 0.075, 0.10],
    max:  [0.00, 0.00, 0.40, 0.46, 0.52, 0.60,  0.70],
    /* Multiplies the jam chance when the closed door has him sealed away from
       every duct at once. At 3 he is through in two or three attempts rather
       than half a dozen, so a total seal buys a minute rather than a night. */
    sealedMult: 3.0
  },

  /* A system that has just come back is left alone for a while. Faults still
     accrue on schedule — they just cannot land inside this window, so watching
     the array die one second after an eight-second reboot is not a thing that
     can happen. */
  graceMs: 15000
};

/* ===========================================================================
   3. GRAPH MATH — symmetry, distances, pathing
   =========================================================================== */

const ADJ = {};
Object.keys(GRAPH).forEach(k => ADJ[k] = new Set(GRAPH[k].edges || []));
Object.keys(GRAPH).forEach(k => (GRAPH[k].edges || []).forEach(e => {
  if (!ADJ[e]) { console.warn("edge to unknown node:", e); return; }
  ADJ[e].add(k);                                   // make every edge two-way
}));
Object.keys(ADJ).forEach(k => ADJ[k] = [...ADJ[k]]);

function bfs(start){
  const d = { [start]:0 }, q = [start];
  while (q.length){
    const c = q.shift();
    for (const nb of ADJ[c]) if (d[nb] === undefined){ d[nb] = d[c] + 1; q.push(nb); }
  }
  return d;
}

const DO = bfs("OFFICE");                          // distance from your office
const DIST_CACHE = {};
function distFrom(node){ return DIST_CACHE[node] || (DIST_CACHE[node] = bfs(node)); }

// which nodes nobody can see — a real feature of the floorplan, not a bug
const BLIND = Object.keys(GRAPH).filter(n =>
  !GRAPH[n].outside && n !== "OFFICE" &&
  !Object.values(CAMERAS).some(c => c.sees.includes(n)));

/* Renamed from DOORS. It means "the squares that open onto your office", which
   now reads as the closable doors downstairs to anyone skimming — and those are
   DOOR_LINKS, a completely different thing. */
const OFFICE_DOORS = ADJ["OFFICE"];                // nodes that open onto you
const SPAWNS  = Object.keys(GRAPH).filter(n => GRAPH[n].outside);

const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffled(a){
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const walkable = n => n !== "OFFICE" && !GRAPH[n].outside;

/* ---------------------------------------------------------------------------
   DOORS, DUCTS AND BLOCKED PATHING

   A closed door removes exactly one undirected edge. Everything that has to
   path around one takes the closed door's id as an argument rather than
   reading game state, so the same helpers answer both "where does he go now"
   and the boot-time question "could this door ever strand him".
--------------------------------------------------------------------------- */
const DOOR_BY_ID = {};
DOOR_LINKS.forEach(d => DOOR_BY_ID[d.id] = d);

/* Floor 2 door cameras: only the feed with direct sight of a closed door
   should show the red warning. These are explicit because map connectivity
   does not describe which camera lens actually sees each doorway. */
const FLOOR2_DOOR_CAMERA = Object.freeze({
  D1:"C22",
  D2:"C17",
  D3:"C15",
  D4:"C15",
  D5:"C19",
  D6:"C24",
  D7:"C24"
});

/* Every door touching a square, so a step can be tested without a scan. */
const DOORS_AT = {};
DOOR_LINKS.forEach(d => {
  (DOORS_AT[d.a] = DOORS_AT[d.a] || []).push(d);
  (DOORS_AT[d.b] = DOORS_AT[d.b] || []).push(d);
});

/* Is the step from → to sealed by this door? */
function edgeShut(from, to, shutId){
  if (!shutId) return false;
  const d = DOOR_BY_ID[shutId];
  if (!d) return false;
  return (d.a === from && d.b === to) || (d.b === from && d.a === to);
}

const ductAt   = node => DUCTS.find(v => v.down === node) || null;
const DUCT_DOWN = DUCTS.map(v => v.down);

/* Breadth-first distances with one edge removed. Not cached against the door,
   because the closed door changes several times a night and a stale table
   would send him confidently through a shut door. The downstairs graph is
   twenty squares, so this is cheap enough to run on every one of his moves. */
function distFromBlocked(start, shutId){
  const d = { [start]:0 }, q = [start];
  while (q.length){
    const c = q.shift();
    for (const nb of ADJ[c]){
      if (d[nb] !== undefined) continue;
      if (edgeShut(c, nb, shutId)) continue;
      d[nb] = d[c] + 1; q.push(nb);
    }
  }
  return d;
}

/* WHICH DUCT HE COMMITS TO. Weighted by distance rather than simply nearest —
   see GORDON.ductBias for why. Returns null only when every way up is walled
   off, which is a supported case rather than an error. */
function chooseDuct(from, shutId){
  const d = distFromBlocked(from, shutId);
  const opts = [];
  for (const v of DUCTS){
    const dist = d[v.down];
    if (dist !== undefined) opts.push({ v, dist });
  }
  if (!opts.length) return null;

  const min = Math.min(...opts.map(o => o.dist));
  let total = 0;
  for (const o of opts){
    o.w = Math.pow(GORDON.ductBias, o.dist - min);
    total += o.w;
  }
  let r = Math.random() * total;
  for (const o of opts){ r -= o.w; if (r <= 0) return o.v; }
  return opts[0].v;
}

/* The nearest duct he can actually still reach, and how far it is. Kept for
   the boot audit and the sealed-in check, which both want "is ANY way up
   reachable" rather than "which one is he taking". */
function nearestDuct(from, shutId){
  const d = distFromBlocked(from, shutId);
  let best = null, bestD = Infinity;
  for (const v of DUCTS){
    const dist = d[v.down];
    if (dist === undefined) continue;
    if (dist < bestD){ bestD = dist; best = v; }
  }
  return best ? { duct:best, dist:bestD } : null;
}

/* One step toward a target, refusing to walk through the closed door. */
function stepTowardBlocked(from, target, shutId){
  const opts = ADJ[from].filter(n => walkable(n) && !edgeShut(from, n, shutId));
  if (!opts.length) return from;
  let best = from, bestD = Infinity;
  for (const o of opts){
    const dist = distFromBlocked(o, shutId)[target];
    if (dist === undefined) continue;
    if (dist < bestD){ bestD = dist; best = o; }
  }
  return best;
}

/* Away from a target — used when a shut door turns him around. Prefers a
   square that is strictly further from where he was heading, so a rebuff
   actually costs him ground rather than shuffling him sideways. */
function stepAwayFrom(from, target, shutId){
  const here = distFromBlocked(from, shutId)[target];
  const opts = ADJ[from].filter(n => walkable(n) && !edgeShut(from, n, shutId));
  if (!opts.length) return from;
  const back = opts.filter(n => {
    const d = distFromBlocked(n, shutId)[target];
    return d !== undefined && here !== undefined && d > here;
  });
  return back.length ? pick(back) : pick(opts);
}

/* ---------------------------------------------------------------------------
   BOOT-TIME AUDIT

   Three things can be silently wrong in the block above and none of them
   would throw: a duct naming a square that does not exist, a door naming two
   squares that are not adjacent, or a single closed door sealing him away
   from every duct at once. The last one would look exactly like a bug in his
   movement code — he would simply stop — so it is worth a check that names
   the door rather than an evening of reading pathfinding.
--------------------------------------------------------------------------- */
function auditBuilding(){
  const say = m => console.warn("BUILDING AUDIT: " + m);

  DUCTS.forEach(v => {
    if (!GRAPH[v.down]) say(v.id + " climbs from unknown square " + v.down);
    else if (floorOf(v.down) !== 2) say(v.id + " climbs from " + v.down + ", which is not downstairs");
    if (!GRAPH[v.up]) say(v.id + " arrives at unknown square " + v.up);
    else if (floorOf(v.up) !== 1) say(v.id + " arrives at " + v.up + ", which is not upstairs");
  });

  DOOR_LINKS.forEach(d => {
    if (!GRAPH[d.a] || !GRAPH[d.b]) return say(d.id + " joins unknown squares");
    if (!ADJ[d.a].includes(d.b)) say(d.id + " joins " + d.a + " and " + d.b + ", which do not touch");
    if (floorOf(d.a) !== 2 || floorOf(d.b) !== 2) say(d.id + " is not entirely downstairs");
  });

  /* THE ONE THAT MATTERS — and what it means has changed.

     It used to be a hard error: a door that sealed him away from every duct
     would leave him standing still and the night would stall. That is now a
     supported case, handled two ways. A one-shot door lets him break through
     it; an ordinary one lets him jam the array open. So this is a NOTICE, not
     a fault — but it is still worth printing, because a door with this
     property plays completely differently from the others and you want to know
     you have made one. */
  const lower = Object.keys(GRAPH).filter(n => floorOf(n) === 2);
  DOOR_LINKS.forEach(d => {
    const stranded = lower.filter(n => !nearestDuct(n, d.id));
    if (stranded.length)
      console.info("BUILDING: " + d.id + (d.oneShot ? " (one-shot)" : "") +
        " seals him off from every duct when he is at: " + stranded.join(", ") +
        (d.oneShot ? " — he breaks through it" : " — he jams the array open"));
  });

  const uncovered = lower.filter(n =>
    !Object.values(CAMERAS).some(c => (c.sees || []).includes(n)));
  if (uncovered.length) console.info("lower floor blind squares:", uncovered.join(", "));
}

/* ===========================================================================
   4. ART LOADING — every missing file names itself
   =========================================================================== */

/* Once the panorama is decoded, tell the scene its real shape — so swapping in
   a differently proportioned photo needs no code change. */
function fitOfficeScene(img){
  if (!img.naturalWidth) return;
  el.officeScene.style.aspectRatio = img.naturalWidth + "/" + img.naturalHeight;
}

function mountArt(container, src, note){
  container.innerHTML = "";
  const img = new Image();
  img.alt = "";
  img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
  /* Name the file and where it was looked for. On a static host a missing
     photograph is nearly always a path or a case mismatch, and "NO SIGNAL"
     alone tells you nothing about which. */
  img.onerror = () => container.innerHTML =
    '<div class="ph">NO SIGNAL<br>' + src +
    (src.startsWith("data:") ? "" : "<br>" + new URL(src, location.href).href) +
    (note ? "<br>" + note : "") + "</div>";
  img.src = src;
  container.appendChild(img);
  return img;
}

const jeffreySprite = new Image();
jeffreySprite.dataset.ok = "0";
jeffreySprite.onload = () => (jeffreySprite.dataset.ok = "1");
jeffreySprite.src = JEFFREY.art;

const sprites = {};
ROSTER.forEach(a => {
  const i = new Image();
  i.dataset.ok = "0";
  i.onload = () => (i.dataset.ok = "1");
  i.src = a.art;
  sprites[a.id] = i;
});

/* Gordon is not in ROSTER — he is not half of a pair and none of the pair
   presets should be able to swap him out — but he renders through exactly the
   same drawSubjects/addSubject path, so his sprite has to live in the same
   table under his own id. */
{
  const g = new Image();
  g.dataset.ok = "0";
  g.onload = () => (g.dataset.ok = "1");
  g.src = GORDON.art;
  sprites[GORDON.id] = g;
}

/* ===========================================================================
   5. SOUND

   Every cue has a filename AND a synthesized fallback. Drop a real file into
   images/../sounds and it takes over; leave it out and you still hear
   something. That means you can ship and playtest before you own a single
   audio asset, and add them one at a time without touching game logic.

   `pan` is -1 (hard left) to +1 (hard right), which is how footsteps end up
   coming from the correct doorway.
   =========================================================================== */

let actx = null, hiss = null, master = null, vent = null;
const buffers = {};

/* ---------------------------------------------------------------------------
   GORDON'S SOUNDS, AND THE BUILDING'S NEW ONES

   Written in the same two primitives as everything above — tone() and noise()
   — so they sit in the same world as the rest of the mix and can be replaced
   one at a time by dropping real recordings into sounds/.

   The metal in these is made the way metal is always made from oscillators:
   two INHARMONIC partials over a low body. Harmonically related partials read
   as a musical note; ones that are not related read as a struck object, which
   is why the ring frequencies below are deliberately not multiples of anything.
--------------------------------------------------------------------------- */

/* One Gordon footfall. Weight first, then the ring, then the room answering.
   Called with a vol that rises as he closes, so this is written flat and the
   distance is applied at the call site — see gordonFootstep(). */
const gordonClank = () => {
  noise(0.09, "bandpass", 2600, .16, undefined, t => (1 - t) ** 3);   // the strike
  tone(58, .34, "sine", .30, 38);                                     // the weight
  setTimeout(() => {
    tone(1870, .30, "square", .028, 1790);                            // ring, and
    tone(2540, .22, "square", .018, 2470);                            // its partner
  }, 18);
  setTimeout(() => noise(0.30, "lowpass", 420, .13, undefined,
                        t => (1 - t) ** 2), 40);
};

/* THREE SURFACES.

   The original gordonClank is the concrete one and stays as it is. The other
   two are built from the same weight-then-ring recipe with the ring changed,
   because that is what actually differs when a heavy thing lands on carpet
   rather than bare slab: the mass is identical, what the room does with it
   is not.

     concrete  bright inharmonic ring, long tail — the plant and the vault
     carpet    ring almost entirely gone, just the thud and a dull slap
     tile      shorter, harder, with a slap that comes back at you

   They have to be told apart in three seconds through a floor, so the
   difference is deliberately larger than realism would allow. */
const gordonCarpet = () => {
  noise(0.07, "lowpass", 900, .14, undefined, t => (1 - t) ** 3);
  tone(54, .30, "sine", .30, 36);
  setTimeout(() => noise(0.22, "lowpass", 320, .17, undefined,
                         t => (1 - t) ** 1.6), 26);
  setTimeout(() => tone(190, .13, "triangle", .028, 150), 20);
};

const gordonTile = () => {
  noise(0.06, "bandpass", 3400, .19, undefined, t => (1 - t) ** 4);
  tone(62, .26, "sine", .28, 42);
  setTimeout(() => {
    tone(2380, .17, "square", .034, 2330);
    tone(3110, .12, "square", .020, 3060);
  }, 12);
  // the slap coming back off a hard floor
  setTimeout(() => noise(0.15, "highpass", 1500, .10, undefined,
                         t => (1 - t) ** 2), 95);
};

/* The shift of weight before he moves. Deliberately NOT a small footstep: it
   is a low swell with no impact in it, so it can never be mistaken for the
   step itself and counted twice. */
const gordonTellFx = () => {
  tone(41, .62, "sine", .26, 33);
  noise(0.55, "lowpass", 190, .16, undefined, t => Math.sin(t * Math.PI) ** 1.4);
  setTimeout(() => tone(96, .28, "triangle", .035, 74), 150);
};

/* Going INTO a duct, heard from the floor below. The body tone rises, because
   he is going up and the sound should say so without a word of interface. */
const ductIn = () => {
  noise(1.50, "bandpass", 700, .26, undefined, t => Math.sin(t * Math.PI) ** 0.8);
  tone(70, .90, "sine", .22, 128);
  setTimeout(() => tone(150, .50, "triangle", .06, 210), 500);
  setTimeout(() => noise(0.50, "bandpass", 1500, .14, undefined,
                         t => (1 - t) ** 1.5), 900);
};

/* Inside it. Hollow, boxed in, and coming from no room you can name — this is
   the stretch where he is on neither floor and no camera has him. */
const ductCrawl = () => {
  noise(2.00, "bandpass", 420, .20, undefined, t => Math.sin(t * Math.PI) ** 1.2);
  [0, 620, 1260].forEach((d, i) => setTimeout(() => {
    tone(126 - i * 8, .22, "sine", .17, 92);
    noise(.14, "bandpass", 1300, .11, undefined, t => (1 - t) ** 2);
  }, d));
};

/* Arriving. The cover comes off first — bright, thin, high — and then all of
   his weight lands on your floor. The gap between those two is the sound. */
const ductOut = () => {
  noise(0.50, "highpass", 1800, .30, undefined, t => (1 - t) ** 1.2);
  setTimeout(() => {
    tone(1500, .26, "square", .050, 600);
    tone(2100, .20, "square", .035, 900);
  }, 40);
  setTimeout(() => {
    tone(52, .70, "sine", .40, 32);
    noise(0.80, "lowpass", 300, .30, undefined, t => (1 - t) ** 1.6);
  }, 560);
};

/* A door running shut: the motor, the travel, and the seat. */
const doorShutFx = () => {
  noise(0.42, "bandpass", 620, .13, undefined, t => Math.sin(t * Math.PI));
  tone(320, .40, "sawtooth", .05, 250);
  setTimeout(() => {
    tone(96, .30, "sine", .32, 54);
    noise(.20, "lowpass", 500, .22, undefined, t => (1 - t) ** 2);
  }, 430);
};

/* And running open. Lighter, and the clunk is at the START — a latch letting
   go rather than a door arriving. */
const doorOpenFx = () => {
  tone(120, .16, "sine", .20, 88);
  setTimeout(() => {
    noise(0.40, "bandpass", 700, .11, undefined, t => Math.sin(t * Math.PI));
    tone(250, .36, "sawtooth", .04, 330);
  }, 90);
};

/* Gordon walking into one that is shut. This is the only good news the game
   ever gives you about him, so it is the biggest sound he makes. */
const doorBlockedFx = () => {
  tone(46, .55, "sine", .42, 30);
  noise(0.32, "lowpass", 260, .34, undefined, t => (1 - t) ** 1.4);
  setTimeout(() => {
    tone(890, .34, "square", .045, 860);
    tone(1310, .28, "square", .030, 1280);
  }, 30);
  setTimeout(() => noise(0.50, "bandpass", 900, .14, undefined,
                         t => (1 - t) ** 2), 120);
};

/* A one-shot door coming apart. Three impacts, each lower than the last, with
   the frame tearing out between them and a long low collapse at the end. */
const doorBreakFx = () => {
  [0, 380, 760].forEach((delay, i) => setTimeout(() => {
    tone(52 - i * 6, .60, "sine", .42, 30 - i * 4);
    noise(0.34, "lowpass", 300 - i * 40, .34, undefined, t => (1 - t) ** 1.3);
    tone(840 - i * 90, .30, "square", .050, 810 - i * 90);
    tone(1270 - i * 130, .24, "square", .034, 1240 - i * 130);
  }, delay));
  // the frame letting go
  setTimeout(() => {
    noise(1.10, "bandpass", 1250, .26, undefined,
          t => Math.sin(t * Math.PI * 5) ** 2 * (1 - t));
    tone(300, .90, "sawtooth", .09, 62);
  }, 1080);
  setTimeout(() => noise(1.60, "lowpass", 160, .24, undefined,
                         t => (1 - t) ** 0.7), 1500);
};

/* A feed that has had Gordon in it for too long. It stutters, it whines, and
   then it is simply not there any more. */
const camBurnFx = () => {
  noise(0.90, "bandpass", 1900, .30, undefined,
        t => Math.sin(t * Math.PI * 7) ** 2 * (1 - t));
  setTimeout(() => tone(1400, .30, "square", .10, 180), 300);
  setTimeout(() => {
    noise(0.35, "lowpass", 400, .24, undefined, t => (1 - t) ** 1.2);
    tone(120, .40, "sawtooth", .10, 44);
  }, 700);
};

/* The bar reaching zero. Two tones falling away together, three relays letting
   go in sequence underneath, and then the building's own noise floor. */
const powerOutFx = () => {
  tone(240, 1.50, "sawtooth", .16, 30);
  tone(180, 1.70, "sine", .12, 24);
  noise(1.20, "lowpass", 700, .26, undefined, t => (1 - t) ** 0.8);
  [40, 190, 330].forEach((d, i) =>
    setTimeout(() => tone(150 - i * 22, .12, "square", .13, 70), d));
  setTimeout(() => noise(1.60, "lowpass", 180, .20, undefined,
                         t => Math.sin(t * Math.PI) ** 0.6), 420);
};

/* ===========================================================================
   MENU MUSIC

   Generative rather than a loop, because a loop of any length becomes
   furniture: you learn where it repeats and it stops working on you. This
   never repeats. It is built from three parts that run on unrelated periods,
   so the combination does not come back around inside any session.

     DRONE     two detuned oscillators a fifth apart, plus a third an octave
               down. The detune is the whole trick — 0.4 Hz apart produces a
               beat every two and a half seconds that you feel rather than
               hear, and it is what makes a held note sound like a room instead
               of a synth.

     BREATH    filtered noise swelling and falling on a 19-second cycle,
               nothing like the drone's period, so the two drift in and out of
               phase forever.

     FIGURE    six notes from a minor scale, played at random with long gaps,
               on a music box that is slightly out of tune with itself. Never
               resolves and never lands on the root.

   All of it sits under -20 dB. Menu music that announces itself is menu music
   you turn off.
   =========================================================================== */
let menuNodes = null;

function startMenuMusic(){
  if (!actx || menuNodes) return;
  const out = actx.createGain();
  /* THE FADE IS SHORT, AND IT STARTS WHEN THE SOUND CAN ACTUALLY BE HEARD.

     It used to ramp over four seconds from the moment the nodes were built.
     Two things went wrong with that. An exponential ramp spends most of its
     length near the bottom, so four seconds meant two or three of silence even
     when nothing was blocking it. And if the browser had suspended the context
     — which it does until the page is touched — the ramp was scheduled against
     a clock that was not running, so the whole four seconds happened AFTER the
     first click, on top of however long the player took to click.

     It is 1.2 seconds now, and whenAudioRunning() holds it until the context
     is genuinely playing. */
  out.gain.setValueAtTime(0.0001, actx.currentTime);
  out.connect(master || actx.destination);

  const nodes = { out, osc:[], timers:[], stopped:false };

  /* --- the drone -------------------------------------------------------- */
  // D2, A2 and D1: a bare fifth with the octave under it. No third, so it is
  // neither major nor minor and refuses to tell you how to feel about it.
  [[73.42, 0.34, "sine"], [73.42 * 1.006, 0.30, "sine"],
   [110.00, 0.16, "sine"], [110.00 * 0.994, 0.15, "sine"],
   [36.71, 0.42, "sine"]].forEach(([hz, amp, type]) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = hz;
    g.gain.value = amp;
    o.connect(g).connect(out);
    o.start();
    nodes.osc.push(o);
  });

  /* --- the breath ------------------------------------------------------- */
  const nb = actx.createBufferSource();
  const len = actx.sampleRate * 4;
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const dat = buf.getChannelData(0);
  for (let i = 0; i < len; i++) dat[i] = (Math.random() * 2 - 1) * 0.5;
  nb.buffer = buf; nb.loop = true;
  const nf = actx.createBiquadFilter();
  nf.type = "bandpass"; nf.frequency.value = 220; nf.Q.value = 0.7;
  const ng = actx.createGain(); ng.gain.value = 0.0;
  nb.connect(nf).connect(ng).connect(out);
  nb.start();
  nodes.osc.push(nb);

  // a 19-second swell, deliberately coprime with everything else on screen
  const lfo = actx.createOscillator(), lfoGain = actx.createGain();
  lfo.frequency.value = 1 / 19; lfo.type = "sine";
  lfoGain.gain.value = 0.055;
  lfo.connect(lfoGain).connect(ng.gain);
  ng.gain.value = 0.06;
  lfo.start();
  nodes.osc.push(lfo);

  /* --- the figure ------------------------------------------------------- */
  // D minor, no root at the top: A, C, D, F, G, Bb — and the box is a hair
  // flat, which is what makes it sound wound rather than played.
  const SCALE = [440.00, 523.25, 587.33, 698.46, 783.99, 932.33];
  function note(){
    if (nodes.stopped) return;
    const f = SCALE[Math.floor(Math.random() * SCALE.length)] * 0.994;
    const t = actx.currentTime;
    [[1, 0.030, "triangle", 1.7], [2, 0.012, "sine", 0.9]].forEach(([m, a, ty, dur]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = ty; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + dur + 0.1);
    });
    // 2.5 to 8 seconds of nothing. The gaps are the frightening part.
    nodes.timers.push(setTimeout(note, 2500 + Math.random() * 5500));
  }
  /* The first note lands under a second in. The drone alone reads as a hum
     rather than as music, so until a note has played nobody is sure anything
     is happening. */
  nodes.timers.push(setTimeout(note, 700));

  menuNodes = nodes;

  /* THE FADE IS SCHEDULED LAST, and that ordering is load-bearing.

     When the context is already running — which is most of the time, because
     the player clicked something to get here — whenAudioRunning() calls back
     SYNCHRONOUSLY. Doing that before `menuNodes` was assigned meant the
     callback's own guard saw a null menuNodes, decided the music had been
     stopped in the meantime, and returned without ever ramping the gain up.
     The graph played perfectly, at a volume of 0.0001, forever.

     The guard has to stay — a fast clock-in can genuinely stop the music
     between here and the callback — so the assignment moves above it. */
  whenAudioRunning(() => {
    if (menuNodes !== nodes) return;          // stopped in the meantime
    out.gain.cancelScheduledValues(actx.currentTime);
    out.gain.setValueAtTime(0.0001, actx.currentTime);
    /* As short as it can be without clicking. A hard jump from zero to full on
       a drone that is already running produces an audible pop — 120 ms is
       under the threshold where the ear hears a fade at all, but long enough
       for the waveform to get there smoothly. Effectively instant. */
    out.gain.exponentialRampToValueAtTime(0.10, actx.currentTime + 0.12);
  });
}

function stopMenuMusic(){
  if (!menuNodes || !actx) return;
  const n = menuNodes;
  menuNodes = null;
  n.stopped = true;
  n.timers.forEach(clearTimeout);
  // fade rather than cut: a hard stop on a drone is a click
  try {
    n.out.gain.cancelScheduledValues(actx.currentTime);
    n.out.gain.setValueAtTime(n.out.gain.value, actx.currentTime);
    n.out.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.8);
  } catch (e) {}
  setTimeout(() => n.osc.forEach(o => { try { o.stop(); } catch (e) {} }), 900);
}

/* The stab under the face when it appears. Short, loud, and gone. */
const titleStabFx = () => {
  noise(0.16, "highpass", 2600, .34, undefined, t => (1 - t) ** 2.2);
  tone(1180, .13, "sawtooth", .10, 320);
  tone(58, .55, "sine", .30, 34);
  setTimeout(() => noise(0.42, "lowpass", 420, .17, undefined,
                         t => (1 - t) ** 1.4), 60);
};

/* The sound immediately before a shift begins. It is deliberately short and
   unlike the menu music: two relay-like clicks, a descending confirmation tone,
   and a low thump. The fallback means the transition still has a sound even if
   the optional WAV is unavailable. */
const nightStartFx = () => {
  tone(620, .075, "square", .11, 430);
  setTimeout(() => tone(430, .11, "square", .10, 300), 85);
  setTimeout(() => tone(220, .20, "sawtooth", .12, 92), 180);
  setTimeout(() => noise(0.16, "lowpass", 260, .17, undefined, t => (1 - t) ** 2), 205);
};

/* All-20 laugh: a deep, breathy, irregular chuckle. It is intentionally synthesized
   so the special-mode sound works even without an optional WAV asset. */
const all20LaughFx = () => {
  if (!actx) return;
  const beats = [
    {f:82, d:.28, v:.15, to:58},
    {f:70, d:.24, v:.17, to:49},
    {f:78, d:.30, v:.16, to:54},
    {f:63, d:.42, v:.18, to:42}
  ];
  let at = 0;
  beats.forEach((b, i) => {
    setTimeout(() => {
      tone(b.f, b.d, "sine", b.v, b.to);
      noise(.18 + i * .02, "lowpass", 260, .055, undefined, t =>
        Math.pow(Math.sin(t * Math.PI), 1.7));
    }, at);
    at += 120 + i * 55;
  });
  setTimeout(() => tone(48, .62, "triangle", .10, 31), 330);
};

/* ===========================================================================
   ROOM TONE

   Every feed hums differently, and switching camera cross-fades between them.
   This is the single biggest thing available for making the building feel like
   a place: with one ambience the cameras are pictures, and with a dozen they
   are rooms you can navigate by ear. Ten seconds in and a player knows the
   plant room without reading the label.

   Each tone is at most three nodes, held and modulated rather than retriggered,
   because anything that repeats on a period becomes furniture. They run at
   about a tenth of the volume of an event and are meant to be noticed only when
   they change.

   The types, and what each is actually made of:

     plant     a 47 Hz throb with a slow tremolo — machinery under load
     fluor     a 120 Hz mains buzz with its third harmonic, the sound of a tube
     duct      band-passed noise, breathing, no pitch at all
     dead      almost nothing: a whisper of high noise, so the room reads as
               ANECHOIC rather than as the audio having failed. Silence and
               broken sound identical, and the vault has to sound like silence
               on purpose.
     drip      dead tone plus an occasional drop, at intervals long enough that
               you stop expecting it
     yard      wind, wide and low, for anything with outside on the other side
   =========================================================================== */
const ROOM_TONE = {
  plant: { hum:[47, 0.055, "sine"], second:[94, 0.018, "sine"],
           noise:[180, 0.020, "lowpass"], trem:0.19 },
  /* THE DEFAULT, and therefore the one you hear most of the night.

     It used to be a 120 Hz sawtooth — an accurate mains buzz, and genuinely
     unpleasant after thirty seconds. A sawtooth at that pitch puts energy
     right where the ear is most sensitive, and it was on for as long as the
     monitor was up.

     It is now air rather than electricity: a soft low hush off the ceiling
     diffusers with the faintest ballast hum under it, at a third of the level.
     Quiet enough to sit behind everything else and still tell you the room is
     a room. */
  fluor: { hum:[86, 0.011, "sine"], second:[172, 0.004, "sine"],
           noise:[520, 0.026, "lowpass"], trem:0.13 },
  duct:  { hum:[62, 0.026, "sine"], noise:[420, 0.042, "bandpass"], trem:0.11 },
  dead:  { noise:[5200, 0.010, "highpass"], trem:0.05 },
  drip:  { noise:[3800, 0.009, "highpass"], trem:0.05, drip:true },
  yard:  { hum:[38, 0.030, "sine"], noise:[260, 0.055, "lowpass"], trem:0.07 }
};

/* Which room sounds like what. Anything unlisted gets `fluor`, because most of
   this building is a drop ceiling with a tube in it. */
const CAM_TONE = {
  C05:"plant", C06:"dead",  C07:"fluor", C09:"duct",  C11:"yard",
  C14:"duct",  C15:"yard",  C16:"fluor", C17:"fluor", C25:"duct",
  C18:"dead",  C19:"fluor", C20:"fluor", C21:"drip",  C22:"duct",
  C23:"fluor", C24:"yard"
};
const toneFor = id => ROOM_TONE[CAM_TONE[id] || "fluor"];

let roomTone = null;

function startRoomTone(kind){
  if (!actx) return;
  stopRoomTone();
  const spec = ROOM_TONE[kind] || ROOM_TONE.fluor;
  const out = actx.createGain();
  out.gain.setValueAtTime(0.0001, actx.currentTime);
  out.gain.exponentialRampToValueAtTime(1.0, actx.currentTime + 0.45);
  out.connect(master || actx.destination);
  const n = { out, nodes:[], timers:[], kind, stopped:false };

  const osc = (hz, amp, type) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = hz; g.gain.value = amp;
    o.connect(g).connect(out); o.start(); n.nodes.push(o);
    return g;
  };
  if (spec.hum)    osc(spec.hum[0], spec.hum[1], spec.hum[2]);
  if (spec.second) osc(spec.second[0], spec.second[1], spec.second[2]);

  if (spec.noise){
    const [freq, amp, ftype] = spec.noise;
    const len = actx.sampleRate * 3;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = actx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq;
    const g = actx.createGain(); g.gain.value = amp;
    src.connect(f).connect(g).connect(out); src.start(); n.nodes.push(src);

    /* The slow breath. Its period is the one number that stops a held tone
       from sounding like a synthesiser left switched on. */
    if (spec.trem){
      const lfo = actx.createOscillator(), lg = actx.createGain();
      lfo.frequency.value = spec.trem; lg.gain.value = amp * 0.55;
      lfo.connect(lg).connect(g.gain); lfo.start(); n.nodes.push(lfo);
    }
  }

  if (spec.drip){
    const drop = () => {
      if (n.stopped) return;
      tone(1400 + Math.random() * 500, .06, "sine", .035, 600);
      setTimeout(() => noise(0.10, "bandpass", 900, .03, undefined,
                             t => (1 - t) ** 2.5), 22);
      n.timers.push(setTimeout(drop, 4000 + Math.random() * 9000));
    };
    n.timers.push(setTimeout(drop, 2000 + Math.random() * 5000));
  }
  roomTone = n;
}

function stopRoomTone(){
  if (!roomTone || !actx) return;
  const n = roomTone; roomTone = null; n.stopped = true;
  n.timers.forEach(clearTimeout);
  try {
    n.out.gain.cancelScheduledValues(actx.currentTime);
    n.out.gain.setValueAtTime(n.out.gain.value, actx.currentTime);
    n.out.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.35);
  } catch (e) {}
  setTimeout(() => n.nodes.forEach(o => { try { o.stop(); } catch (e) {} }), 420);
}

/* Called whenever what you are listening to might have changed. Only restarts
   when the KIND changes, so sweeping four fluorescent rooms in a row does not
   retrigger the same hum four times. */
function syncRoomTone(){
  const want = (S.running && S.monUp && !S.panelTab && !S.outage &&
                S.sys.cam.ok && !camDead(S.activeCam))
    ? (CAM_TONE[S.activeCam] || "fluor") : null;
  if (!want){ stopRoomTone(); return; }
  if (roomTone && roomTone.kind === want) return;
  startRoomTone(want);
}

/* ---------------------------------------------------------------------------
   THE LIGHT SWITCH

   An old commercial toggle, the kind screwed to a metal box. Three things in
   quick succession, and the order matters more than any of them individually:
   the CLACK of the mechanism, then the relay in the wall behind it, then the
   fluorescent tubes actually letting go — which lags by about a tenth of a
   second and is the part that makes it read as a real building rather than a
   button in a menu.
--------------------------------------------------------------------------- */
const lightsOffFx = () => {
  // the toggle
  noise(0.035, "bandpass", 2100, .30, undefined, t => (1 - t) ** 4);
  tone(430, .045, "square", .10, 300);
  // the box behind it
  setTimeout(() => {
    tone(120, .09, "square", .085, 96);
    noise(0.06, "lowpass", 700, .16, undefined, t => (1 - t) ** 3);
  }, 26);
  // the tubes dying: a 120 Hz hum that falls away over a third of a second
  setTimeout(() => {
    tone(120, .34, "sawtooth", .075, 58);
    tone(240, .26, "sine", .030, 96);
    noise(0.30, "lowpass", 420, .12, undefined, t => (1 - t) ** 1.6);
  }, 105);
};

const lightsOnFx = () => {
  noise(0.035, "bandpass", 2400, .28, undefined, t => (1 - t) ** 4);
  tone(500, .045, "square", .10, 380);
  setTimeout(() => {
    tone(96, .09, "square", .085, 130);
    noise(0.05, "lowpass", 800, .15, undefined, t => (1 - t) ** 3);
  }, 24);
  /* Tubes strike, they do not fade up. Two stutters and then the hum settles,
     which is the sound every fluorescent in a building this old makes. */
  [130, 172, 250].forEach((d, i) => setTimeout(() => {
    noise(0.05, "bandpass", 1700 - i * 300, .13 - i * .03, undefined, t => (1 - t) ** 2);
    tone(120, .07 + i * .05, "sawtooth", .05 + i * .012, 120);
  }, d));
};


/* THE BOX THAT PLAYS WHEN THE POWER GOES.

   An original figure, and a different one from the ambient music box — slower,
   lower, with twice the wow, and it does not resolve either. Twelve notes at
   0.42 s is a shade over five seconds, which is POWER.jingleMs: the tune ends
   exactly when the waiting begins, so the silence afterwards is the thing you
   are actually listening to. */
function outageBoxTune(){
  if (!actx) return;
  const notes = [440, 523, 659, 523, 587, 440, 392, 523, 440, 415, 349, 330];
  notes.forEach((f, i) => {
    const t = actx.currentTime + i * 0.42;
    const detune = 1 - 0.018 * Math.sin(i * 1.3);        // a tired motor
    [0, 1].forEach(h => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = h ? "sine" : "triangle";
      o.frequency.value = f * detune * (h ? 2 : 1);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(h ? .020 : .046, t + .014);
      g.gain.exponentialRampToValueAtTime(.0001, t + (h ? .62 : 1.15));
      o.connect(g).connect(master || actx.destination);
      o.start(t); o.stop(t + 1.25);
    });
  });
}

const SFX = {
  step:      { src:"sounds/step.wav",       vol:0.35, synth:() => thump(90, .18) },
  stepClose: { src:"sounds/step_close.wav", vol:0.60, synth:() => thump(62, .28) },
  atDoor:    { src:"sounds/at_door.wav",    vol:0.55, synth:() => breath() },
  // one per body. Eugene is weight — a slow scrape that takes its time.
  // Sloppy is quicker and drier, gone before you place it.
  walkByA:   { src:"sounds/walk_by_eugene.wav",  vol:0.68, synth:() => dragHeavy() },
  walkByB:   { src:"sounds/walk_by_sloppy.wav", vol:0.58, synth:() => dragQuick() },
  // Sloppy's step, heard only while you're on the monitor
  /* Room tone. None of these mean anything — that is the point. A building
     this old makes noise, and not being able to tell which sounds matter is
     most of what keeps you on the cameras. */
  ambBox:    { src:"sounds/amb_musicbox.wav", vol:0.26, synth:() => musicBox() },
  ambKnock:  { src:"sounds/amb_knock.wav",    vol:0.32,
               synth:() => { tone(150,.14,"sine",.16,70);
                             setTimeout(()=>tone(138,.17,"sine",.13,62),190); } },
  ambCreak:  { src:"sounds/amb_creak.wav",    vol:0.30,
               synth:() => noise(1.5,"bandpass",420,.16,undefined,
                                 t=>Math.sin(t*Math.PI)*(0.5+0.5*Math.sin(t*11))) },
  ambPipes:  { src:"sounds/amb_pipes.wav",    vol:0.24,
               synth:() => noise(2.6,"lowpass",190,.20,undefined,
                                 t=>Math.sin(t*Math.PI)) },
  ambSigh:   { src:"sounds/amb_sigh.wav",     vol:0.22,
               synth:() => noise(1.9,"bandpass",520,.15,undefined,
                                 t=>Math.pow(Math.sin(t*Math.PI),2)) },

  /* Ventilation warning. Two flat tones, industrial and unpleasant, repeating
     faster as the air runs down. Not a beep you can ignore. */
  ventAlarm: { src:"sounds/vent_alarm.wav",   vol:0.50,
               synth:() => { tone(660,.16,"square",.09);
                             setTimeout(()=>tone(520,.20,"square",.09),190); } },

  ambDoor:   { src:"sounds/amb_door.wav",     vol:0.30,   // a latch, not close
               synth:() => { tone(320,.05,"square",.07);
                             setTimeout(()=>noise(.5,"lowpass",300,.20,undefined,
                                                  t=>Math.pow(1-t,2)),60); } },
  ambDrip:   { src:"sounds/amb_drip.wav",     vol:0.26,   // water, patient
               synth:() => [0,760,1580].forEach((d,i)=>
                 setTimeout(()=>tone(1400-i*90,.05,"sine",.09,540),d)) },
  ambChair:  { src:"sounds/amb_chair.wav",    vol:0.28,   // weight off a chair
               synth:() => noise(1.1,"bandpass",300,.20,undefined,
                                 t=>Math.sin(t*Math.PI)*(1-t*0.4)) },
  ambFloor:  { src:"sounds/amb_floor.wav",    vol:0.30,   // one floorboard
               synth:() => { tone(84,.20,"sine",.16,52);
                             setTimeout(()=>tone(96,.14,"sine",.10,60),260); } },
  ambDistant:{ src:"sounds/amb_distant.wav",  vol:0.20,   // a voice, too far off
               synth:() => { tone(228,.42,"sawtooth",.045,196);
                             setTimeout(()=>tone(262,.36,"sawtooth",.038,214),380); } },

  tellB:     { src:"sounds/move_sloppy.wav",    vol:0.42, synth:() => softTell() },

  /* The moment one of them steps in off the street. Distinct per body, played
     once a night each, and the only sound in the game that tells you something
     has definitely started. */
  enterA:    { src:"sounds/enter_eugene.wav",    vol:0.62, synth:() => {
                 tone(96,.55,"sine",.30,44);
                 setTimeout(()=>noise(1.4,"lowpass",240,.30,undefined,
                                      t=>Math.sin(t*Math.PI)),140); } },
  enterB:    { src:"sounds/enter_sloppy.wav",   vol:0.55, synth:() => {
                 tone(1580,.10,"square",.10);
                 setTimeout(()=>tone(1180,.09,"square",.09),120);
                 setTimeout(()=>noise(1.1,"bandpass",900,.22,undefined,
                                      t=>Math.pow(1-t,1.5)),210); } },
  cue:       { src:"sounds/audio_cue.wav",  vol:0.50, synth:() => cueChirp() },
  /* Switching feeds. A relay closing and the new picture arriving — short and
     dry, because you do it constantly and anything with a tail would turn a
     sweep of the building into a chord. */
  camSwitch: { src:"sounds/cam_switch.wav", vol:0.20, synth:() => camClunk() },
  camOpen:   { src:null, vol:0.34, synth:() => camOpenFx() },
  camClose:  { src:null, vol:0.31, synth:() => camCloseFx() },
  panelOpen: { src:null, vol:0.32, synth:() => panelOpenFx() },
  panelClose:{ src:null, vol:0.30, synth:() => panelCloseFx() },
  /* Him arriving on the feed. Not an alarm — a swell of interference, the
     sound of the picture going wrong, so that the thing you actually react to
     is the shape and not the cue. */
  jeffreyIn: { src:"sounds/jeffrey_in.wav",  vol:0.45, synth:() => {
                 noise(0.55,"bandpass",1400,.22,undefined,t=>Math.sin(t*Math.PI)**1.2);
                 tone(88,.5,"sawtooth",.07,58); } },
  // and him taking it: shorter and flatter than a death, because you live
  jeffreyHit:{ src:"sounds/jeffrey_hit.wav", vol:0.75, synth:() => {
                 noise(0.75,"bandpass",900,.42,undefined,t=>(1-t)**1.4);
                 tone(150,.45,"square",.16,52);
                 setTimeout(()=>noise(0.5,"lowpass",320,.28,undefined,t=>1-t),140); } },
  /* Separate system failures should be recognizable before the panel is open:
     the camera tears down in a burst of interference, while the audio relay
     gives a low, mechanical cutout. */
  camFault:  { src:"sounds/camera_fault.wav", vol:0.48, synth:() => {
                 noise(.24,"bandpass",1650,.20,undefined,t=>1-t);
                 tone(1180,.18,"square",.11,320);
                 setTimeout(()=>tone(380,.16,"sawtooth",.10,110),115); } },
  audioFault:{ src:"sounds/audio_fault.wav",  vol:0.48, synth:() => {
                 tone(210,.20,"square",.13,74);
                 setTimeout(()=>noise(.32,"lowpass",240,.18,undefined,t=>1-t),70); } },
  fault:     { src:"sounds/fault.wav",      vol:0.40, synth:() => tone(190,.32,"sawtooth",.14,90) },
  reboot:    { src:"sounds/reboot.wav",     vol:0.35, synth:() => tone(1250,.09,"square",.07) },
  breaker:   { src:"sounds/breaker.wav",    vol:0.55, synth:() => tone(120,.3,"sine",.28,38) },
  hourBell:  { src:"sounds/hour.wav",       vol:0.45, synth:() => { tone(660,.5,"triangle",.13);
                                                setTimeout(()=>tone(880,.6,"triangle",.13),160); } },
  scream:    { src:"sounds/scream.wav",     vol:0.90, synth:() => screechSynth() },
  /* One per figure. The scare frame is on screen for barely a second, so the
     sound is what gets remembered, and the same noise for all four flattened
     every one of them. */
  screamEugene:  { src:"sounds/scream_eugene.wav",  vol:0.92, synth:() => scareEugene() },
  screamSloppy:  { src:"sounds/scream_sloppy.wav",  vol:0.88, synth:() => scareSloppy() },
  screamJeffrey: { src:"sounds/scream_jeffrey.wav", vol:0.80, synth:() => scareJeffrey() },
  screamGordon:  { src:"sounds/scream_gordon.wav",  vol:1.00, synth:() => scareGordon() },
  // one chirp per body, so a single mounted sensor answers two questions at
  // once: something moved, AND which of them it was. Low falling double note
  // is Eugene; high rising triple is Sloppy.
  sensorA:   { src:"sounds/sensor_eugene.wav",  vol:0.55, synth:() => { tone(760,.10,"square",.10);
                                                setTimeout(()=>tone(560,.13,"square",.10),105); } },
  sensorB:   { src:"sounds/sensor_sloppy.wav", vol:0.50, synth:() => { tone(1980,.06,"square",.09);
                                                setTimeout(()=>tone(2400,.06,"square",.09),70);
                                                setTimeout(()=>tone(2850,.08,"square",.09),140); } },
  doom:      { src:"sounds/doom.wav",       vol:0.70, synth:() => doomSynth() },
  passOut:   { src:"sounds/pass_out.wav",   vol:0.60, synth:() => tone(300,1.6,"sine",.22,40) },

  /* --- GORDON, THE DUCTS, THE DOORS AND THE DARK --------------------------
     gordonStep is played at a volume computed from how close he is, so its
     `vol` here is the CEILING rather than the level — see gordonFootstep().
     Everything else is played flat. */
  /* One entry per surface. gordonFootstep() builds the name from the square he
     is standing on, so adding a fourth surface means adding a row here and a
     line in ZONE, and nothing else. */
  gordonStepConcrete:{ src:"sounds/gordon_step_concrete.wav", vol:0.66, synth:() => gordonClank() },
  gordonStepCarpet:  { src:"sounds/gordon_step_carpet.wav",   vol:0.62, synth:() => gordonCarpet() },
  gordonStepTile:    { src:"sounds/gordon_step_tile.wav",     vol:0.66, synth:() => gordonTile() },
  gordonTell:        { src:"sounds/gordon_tell.wav",          vol:0.58, synth:() => gordonTellFx() },
  /* His sensor chirp. Eugene is a low falling double and Sloppy a high rising
     triple, so his is a low FALLING triple: unmistakably the heaviest thing in
     the building, and unmistakably not either of them. */
  sensorC:   { src:"sounds/sensor_gordon.wav", vol:0.58, synth:() => {
                 tone(300,.13,"square",.10);
                 setTimeout(()=>tone(232,.13,"square",.10),120);
                 setTimeout(()=>tone(174,.20,"square",.11),240); } },
  ductIn:    { src:"sounds/duct_in.wav",    vol:0.60, synth:() => ductIn() },
  ductCrawl: { src:"sounds/duct_crawl.wav", vol:0.50, synth:() => ductCrawl() },
  /* The one sound in the game that means something has changed floor. It is
     mixed loud on purpose: you are meant to hear it with the monitor down,
     from the other end of the building, and know exactly what it was. */
  ductOut:   { src:"sounds/duct_out.wav",   vol:0.82, synth:() => ductOut() },
  doorShut:  { src:"sounds/door_shut.wav",  vol:0.52, synth:() => doorShutFx() },
  doorOpen:  { src:"sounds/door_open.wav",  vol:0.44, synth:() => doorOpenFx() },
  doorBlocked:{src:"sounds/door_blocked.wav",vol:0.70, synth:() => doorBlockedFx() },
  /* A door being destroyed rather than bounced off. Longer, lower and with the
     tearing metal underneath it, because it has to be unmistakable: it is the
     sound of a defence you no longer have. */
  doorBreak: { src:"sounds/door_break.wav",  vol:0.90, synth:() => doorBreakFx() },
  camBurn:   { src:"sounds/cam_burn.wav",   vol:0.62, synth:() => camBurnFx() },
  powerOut:  { src:"sounds/power_out.wav",  vol:0.78, synth:() => powerOutFx() },
  outageBox: { src:"sounds/outage_box.wav", vol:0.62, synth:() => outageBoxTune() },
  /* The bar getting low. One short, dry tick, played at 25% and again at the
     POWER.warnAt threshold — twice a night at most, so it stays a warning
     rather than becoming part of the room tone. */
  titleStab: { src:"sounds/title_stab.wav", vol:0.72, synth:() => titleStabFx() },
  nightStart: { src:"sounds/night_start.wav", vol:0.76, synth:() => nightStartFx() },
  all20Laugh: { src:null, vol:0.78, synth:() => all20LaughFx() },
  lightsOff: { src:"sounds/lights_off.wav", vol:0.74, synth:() => lightsOffFx() },
  lightsOn:  { src:"sounds/lights_on.wav",  vol:0.70, synth:() => lightsOnFx() },
  powerWarn: { src:"sounds/power_warn.wav", vol:0.50, synth:() => {
                 tone(520,.10,"square",.09);
                 setTimeout(()=>tone(392,.16,"square",.09),130); } }
};

function initAudio(){
  if (actx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  /* A very early click can create an AudioContext before game.js finishes
     loading. Reuse it so the browser's transient user activation is preserved
     instead of creating a second, still-suspended context later. */
  const earlyAudio = window.__FNAAC && window.__FNAAC.audioContext;
  actx = earlyAudio || new AC();
  try { actx.resume(); } catch (_) {}
  master = actx.createGain(); master.gain.value = 1; master.connect(actx.destination);

  // camera hiss, always synthesized
  const buf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;

  /* Room tone for a monitor, not a burst of white noise. The bright band that
     made the old hiss abrasive is rolled off above 1.1k, the rumble below 160
     is cut so it doesn't muddy the footsteps, and the level sits well under
     everything else — it should be something you stop noticing. */
  const hp = actx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 160;
  const lp = actx.createBiquadFilter();
  lp.type = "lowpass";  lp.frequency.value = 1100; lp.Q.value = .3;
  const tilt = actx.createBiquadFilter();
  tilt.type = "peaking"; tilt.frequency.value = 3200; tilt.gain.value = -14; tilt.Q.value = .7;

  hiss = actx.createGain(); hiss.gain.value = 0;
  src.connect(hp).connect(lp).connect(tilt).connect(hiss).connect(master);
  src.start();

  /* THE AIR.

     What the office sounds like when you are sitting in it: moving air and the
     blade of the fan under it, low enough to stop hearing after a minute. It
     belongs to the room, so it plays while you are IN the room — raise the
     cameras and the monitor's own hiss takes over instead.

     It is also the ventilation telling you it is alive. When that system
     faults the hum stops, and the silence arrives a good while before the
     alarm does. */
  const vsrc = actx.createBufferSource(); vsrc.buffer = buf; vsrc.loop = true;
  const vhp = actx.createBiquadFilter();
  vhp.type = "highpass"; vhp.frequency.value = 46;
  const vlp = actx.createBiquadFilter();
  vlp.type = "lowpass";  vlp.frequency.value = 200; vlp.Q.value = .5;
  vent = actx.createGain(); vent.gain.value = 0;
  vsrc.connect(vhp).connect(vlp).connect(vent).connect(master);
  vsrc.start();
  // a faint blade under the air, so it reads as machinery rather than as noise
  const vosc = actx.createOscillator(), vog = actx.createGain();
  vosc.type = "triangle"; vosc.frequency.value = 61; vog.gain.value = .085;
  vosc.connect(vog).connect(vent); vosc.start();

  /* Try to load every file; silence on failure is fine, the synth covers it.

     Wrapped, because this is the LAST thing initAudio does and everything
     after it depends on initAudio having returned. A synchronous throw here —
     no fetch at all, a blocked origin, a security policy — would abort the
     function partway and take the caller down with it. That is how the title
     screen ended up with no music and no glitches in one environment: not
     because the audio failed, but because the preload did and nothing after
     the preload ever ran. */
  try {
    Object.entries(SFX).forEach(([name, def]) => {
      if (!def.src || typeof fetch !== "function") return;
      fetch(def.src)
        .then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(b => actx.decodeAudioData(b))
        .then(buf => { buffers[name] = buf; })
        .catch(() => {/* no file, synth handles it */});
    });
  } catch (e) {
    /* every sound is synthesised anyway; the files are only ever an upgrade */
  }
}

const setHiss = on => hiss && hiss.gain.setTargetAtTime(on ? .018 : 0, actx.currentTime, .14);
/* Slower than the hiss on purpose. Air takes a moment to stop moving, and a
   hum that snapped off would read as a sound effect rather than as a room. */
const setVentHum = on => vent && vent.gain.setTargetAtTime(on ? .052 : 0, actx.currentTime, .55);

/* Play a named cue. opts: {vol, pan, rate} */
function play(name, opts){
  if (!actx) return;
  const def = SFX[name]; if (!def) return;
  const o = opts || {};

  if (!buffers[name]){ if (def.synth) def.synth(o); return; }

  const s = actx.createBufferSource();
  s.buffer = buffers[name];
  s.playbackRate.value = o.rate || 1;
  const g = actx.createGain();
  g.gain.value = (def.vol || .5) * (o.vol === undefined ? 1 : o.vol);

  let tail = g;
  if (o.pan !== undefined && actx.createStereoPanner){
    const p = actx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    g.connect(p); tail = p;
  }
  s.connect(g); tail.connect(master);
  s.start();
}

/* --- synthesized fallbacks --- */
function tone(freq, dur, type, vol, slideTo){
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, actx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, actx.currentTime + dur);
  g.gain.setValueAtTime(vol || .18, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
  o.connect(g).connect(master || actx.destination);
  o.start(); o.stop(actx.currentTime + dur + .05);
}

function noise(dur, filterType, freq, vol, pan, shape){
  if (!actx) return;
  const len = Math.floor(actx.sampleRate * dur);
  const b = actx.createBuffer(1, len, actx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++){
    const t = i / len;
    d[i] = (Math.random()*2-1) * (shape ? shape(t) : (1 - t));
  }
  const s = actx.createBufferSource(); s.buffer = b;
  const f = actx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq;
  const g = actx.createGain(); g.gain.value = vol;
  let tail = g;
  if (pan !== undefined && actx.createStereoPanner){
    const p = actx.createStereoPanner(); p.pan.value = pan; g.connect(p); tail = p;
  }
  s.connect(f).connect(g); tail.connect(master || actx.destination);
  s.start();
}

const thump = (f, v) => tone(f, .13, "sine", v, f * 0.55);
const breath = () => noise(1.1, "lowpass", 300, .30, undefined, t => Math.sin(t*Math.PI)**2);
/* Eugene crossing: long, low, weighted, with a slight rise as it passes */
/* An original eight-note figure on a detuned box. Slightly flat, slightly
   uneven, and it stops one note before it resolves. */
function musicBox(){
  if (!actx) return;
  const notes = [784, 659, 523, 659, 587, 494, 440, 523];
  notes.forEach((f, i) => {
    const t = actx.currentTime + i * 0.34;
    const detune = 1 - 0.012 * Math.sin(i * 1.7);       // wow and flutter
    [0, 1].forEach(h => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = h ? "sine" : "triangle";
      o.frequency.value = f * detune * (h ? 2 : 1);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(h ? .022 : .05, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + (h ? .5 : .95));
      o.connect(g).connect(master || actx.destination);
      o.start(t); o.stop(t + 1.0);
    });
  });
}

const dragHeavy = () => {
  noise(1.9, "lowpass", 300, .40, undefined, t => Math.sin(t*Math.PI) ** 0.7);
  setTimeout(() => tone(74, .5, "sine", .16, 52), 420);
};
/* Sloppy crossing: shorter, drier, higher, over before you locate it */
const dragQuick = () => {
  noise(0.85, "bandpass", 1250, .30, undefined, t => Math.sin(t*Math.PI) ** 1.6);
  setTimeout(() => noise(0.4, "highpass", 2600, .16, undefined, t => 1-t), 260);
};
/* one Sloppy step. Soft on purpose — a hint, not an alarm. */
const softTell = () => {
  noise(0.16, "bandpass", 900, .16, undefined, t => (1-t) ** 2);
  setTimeout(() => tone(392, .13, "triangle", .045), 40);
};
const cueChirp = () => { tone(520,.22,"triangle",.12,760); setTimeout(()=>tone(430,.3,"triangle",.1,300),200); };

/* --- interface movement ---------------------------------------------------
   These are deliberately physical rather than musical: a heavy monitor arm,
   a short burst of picture static, and the soft hollow travel of the panel.
   The sounds are generated here so they add no network cost. */
function camOpenFx(){
  if (!actx) return;
  tone(88, .15, "sine", .040, 76);
  noise(.10, "bandpass", 1200, .028, undefined, t => Math.sin(t * Math.PI) ** 1.8);
  setTimeout(() => tone(410, .042, "square", .010, 300), 46);
}

function camCloseFx(){
  if (!actx) return;
  tone(70, .16, "sine", .036, 60);
  noise(.085, "bandpass", 760, .023, undefined, t => Math.sin(t * Math.PI) ** 1.4);
  setTimeout(() => tone(118, .05, "square", .014, 82), 48);
}

function panelOpenFx(){
  if (!actx) return;
  tone(118, .17, "sine", .044, 101);
  noise(.23, "lowpass", 560, .038, undefined, t => Math.sin(t * Math.PI) ** 1.1);
  setTimeout(() => noise(.12, "bandpass", 980, .014, undefined, t => (1 - t) ** 1.8), 78);
}

function panelCloseFx(){
  if (!actx) return;
  noise(.15, "lowpass", 470, .032, undefined, t => Math.sin(t * Math.PI) ** .95);
  setTimeout(() => {
    tone(92, .08, "square", .014, 68);
    tone(176, .042, "sine", .009, 116);
  }, 100);
}

/* THE FEED CHANGING.

   Three of them, because it is the sound you will hear more than any other in
   the game and the right one is a matter of taste rather than of argument.
   Change CAM_SWITCH to audition:

     "relock"  the default now. A tape head finding the new picture: a short
               downward whoop of filtered noise with a soft click under it. No
               mechanism, no clack — it belongs to the signal rather than to
               the switch, which is what everything else on the monitor sounds
               like.
     "relay"   the previous one. A contact closing, then the picture landing.
               Drier and more mechanical.
     "tick"    barely there. One damped click and a breath of tape hiss, for
               when the sweep starts to grate after an hour of play. */
const CAM_SWITCH = "relock";

const camSwitchFx = {
  /* noise swept down through a bandpass reads as the picture re-locking. The
     click is at the START, so the sound follows the button rather than
     announcing itself after it. */
  relock(){
    if (!actx) return;
    const b = actx.createBuffer(1, actx.sampleRate * 0.26, actx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++){
      const t = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.7);
    }
    const s = actx.createBufferSource(); s.buffer = b;
    const f = actx.createBiquadFilter();
    f.type = "bandpass"; f.Q.value = 3.2;
    f.frequency.setValueAtTime(2600, actx.currentTime);
    f.frequency.exponentialRampToValueAtTime(420, actx.currentTime + 0.22);
    const g = actx.createGain(); g.gain.value = 0.16;
    s.connect(f).connect(g).connect(master || actx.destination);
    s.start();
    tone(320, .03, "sine", .022, 190);
  },
  relay(){
    tone(184,.05,"square",.026,124);
    noise(0.14,"highpass",1900,.040,undefined,t=>(1-t)**2);
  },
  tick(){
    tone(240,.025,"sine",.020,150);
    noise(0.09,"bandpass",2400,.030,undefined,t=>(1-t)**2.5);
  }
};

const camClunk = () => (camSwitchFx[CAM_SWITCH] || camSwitchFx.relock)();
/* the few seconds before it reaches you: a rising bed of noise under a
   detuned pair of tones, so it reads as approach rather than as an alarm */
function doomSynth(){
  if (!actx) return;
  noise(3.2, "lowpass", 220, .30, undefined, t => t * t);
  [58, 61].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "sawtooth"; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.16, actx.currentTime + 2.6);
    g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + 3.3);
    o.connect(g).connect(master || actx.destination);
    o.start(); o.stop(actx.currentTime + 3.4);
  });
}

const screechSynth = () => {
  if (!actx) return;
  const b = actx.createBuffer(1, actx.sampleRate*1.1, actx.sampleRate);
  const d = b.getChannelData(0);
  for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=actx.createBufferSource(); s.buffer=b;
  const f=actx.createBiquadFilter(); f.type="bandpass"; f.Q.value=1.4;
  f.frequency.setValueAtTime(2800, actx.currentTime);
  f.frequency.exponentialRampToValueAtTime(320, actx.currentTime+1);
  const g=actx.createGain(); g.gain.value=.5;
  s.connect(f).connect(g).connect(master||actx.destination); s.start();
};

/* ===========================================================================
   FOUR SCREAMS

   One sound for all four was the single loudest missed opportunity in the mix.
   The scare frame is on screen for barely a second; the sound is what the
   player actually remembers, and hearing the SAME noise for a thing that
   creeps and a thing that weighs four hundred pounds flattens both of them.

   Each is built to match how that one moves and what it did to get here:

     EUGENE    he walked into a lit office. A human shriek — a formant pair
               sliding down over a noise burst, the closest an oscillator gets
               to a throat. The most "normal" of the four, which is the point:
               he is the one you understand.

     SLOPPY    she committed and the timer ran out. No shriek at all. A dry,
               fast, insectile rattle — amplitude-modulated noise at 38 Hz,
               which the ear reads as chittering rather than as a tone — under
               a rising whine that never resolves. Nothing about it sounds like
               a voice, and that is why it is worse.

     JEFFREY   he was never going to kill you, so his is the shortest and the
               least serious: a hard camera-static bark, one frame of digital
               garbage, gone before you can flinch. It should feel like the
               equipment failed rather than like something got you.

     GORDON    all of his weight arriving at once. Sub-bass impact, a long
               metallic groan bending down a fifth, and a low roar with almost
               no high end. Mixed loudest and longest of the four because he is
               the one you could not have stopped.

   Each ends the same way — everything cut to nothing over about 200 ms — so
   the silence after the frame is as abrupt as the frame itself.
   =========================================================================== */

/* A formant is what makes a noise sound like a voice: two resonant peaks at
   the right frequencies. Sliding them down together is a scream. */
function formantScream(t0, f1, f2, dur, amp){
  const dst = master || actx.destination;
  const n = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++){
    const p = i / d.length;
    // a little periodicity in the noise reads as vocal cords rather than wind
    d[i] = (Math.random() * 2 - 1) * (1 - p) * (0.7 + 0.3 * Math.sin(i * 0.02));
  }
  const src = actx.createBufferSource(); src.buffer = n;
  const g = actx.createGain(); g.gain.value = amp;
  [f1, f2].forEach((f, k) => {
    const bp = actx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 6 - k * 2;
    bp.frequency.setValueAtTime(f, t0);
    bp.frequency.exponentialRampToValueAtTime(f * 0.34, t0 + dur);
    src.connect(bp).connect(g);
  });
  g.connect(dst);
  src.start(t0);
}

const scareEugene = () => {
  if (!actx) return;
  const t = actx.currentTime;
  formantScream(t, 900, 2400, 1.05, 0.42);
  tone(210, 0.95, "sawtooth", 0.10, 68);      // the chest under it
  noise(0.09, "highpass", 3200, 0.30, undefined, t2 => (1 - t2) ** 2);
  setTimeout(() => tone(150, 0.5, "sine", 0.16, 52), 380);
};

const scareSloppy = () => {
  if (!actx) return;
  const dst = master || actx.destination;
  const dur = 1.0;
  const b = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate);
  const d = b.getChannelData(0);
  /* 38 Hz amplitude modulation. Fast enough to feel like motion, slow enough
     that the ear hears individual pulses — which is what separates a rattle
     from a buzz. */
  for (let i = 0; i < d.length; i++){
    const p = i / d.length;
    const gate = Math.max(0, Math.sin(i / actx.sampleRate * Math.PI * 2 * 38));
    d[i] = (Math.random() * 2 - 1) * gate * (1 - p * 0.7);
  }
  const src = actx.createBufferSource(); src.buffer = b;
  const bp = actx.createBiquadFilter();
  bp.type = "bandpass"; bp.Q.value = 2.2;
  bp.frequency.setValueAtTime(1900, actx.currentTime);
  bp.frequency.exponentialRampToValueAtTime(4200, actx.currentTime + dur);
  const g = actx.createGain(); g.gain.value = 0.34;
  src.connect(bp).connect(g).connect(dst);
  src.start();
  // the whine that never arrives anywhere
  tone(640, 1.0, "sawtooth", 0.075, 1850);
  tone(58, 0.85, "sine", 0.26, 40);
};

const scareJeffrey = () => {
  if (!actx) return;
  /* Three bursts of hard static in 140 ms and then nothing. Equipment failing,
     not a creature — he takes your cameras, he does not take you. */
  [0, 55, 105].forEach((delay, i) => setTimeout(() => {
    noise(0.05, "highpass", 1800 + i * 900, 0.44 - i * 0.09, undefined,
          t => (1 - t) ** 0.6);
    tone(2600 - i * 700, 0.045, "square", 0.085, 2500 - i * 700);
  }, delay));
  setTimeout(() => {
    tone(120, 0.30, "sawtooth", 0.13, 44);
    noise(0.26, "lowpass", 500, 0.20, undefined, t => (1 - t) ** 1.5);
  }, 150);
};

const scareGordon = () => {
  if (!actx) return;
  // the impact
  tone(44, 1.30, "sine", 0.52, 26);
  tone(66, 1.10, "sine", 0.28, 38);
  noise(0.55, "lowpass", 220, 0.42, undefined, t => (1 - t) ** 1.1);
  // metal bending, a fifth down over the whole length
  setTimeout(() => {
    tone(430, 1.15, "sawtooth", 0.115, 287);
    tone(646, 0.95, "square", 0.048, 431);
    tone(881, 0.80, "square", 0.030, 588);
  }, 40);
  // and the roar, with the top rolled off so it stays underneath
  setTimeout(() => {
    noise(1.10, "lowpass", 760, 0.34, undefined,
          t => Math.sin(t * Math.PI) ** 0.5);
    tone(96, 1.00, "sawtooth", 0.13, 58);
  }, 90);
  setTimeout(() => noise(0.9, "lowpass", 180, 0.26, undefined,
                        t => (1 - t) ** 0.8), 620);
};

/* Which scream belongs to whom. Anything unlisted falls back to the original
   all-purpose screech, so a new figure is never silent by omission. */
const SCARE_SFX = {
  eugene:  "screamEugene",
  sloppy:  "screamSloppy",
  jeffrey: "screamJeffrey",
  gordon:  "screamGordon"
};

/* Named helpers used by the game, so call sites stay readable. */
const chime   = () => play("hourBell");
const clunk   = () => play("breaker");
const buzz    = () => play("fault");
const blip    = () => play("reboot");
const lureFx  = () => play("cue");
/* The scream belongs to whoever is on screen. Falls back to the original
   all-purpose screech for anything not in SCARE_SFX, so a figure added later
   is never silent by omission. */
const screech = (unit) => play((unit && SCARE_SFX[unit.id]) || "scream");

/* Camera and audio failures each have their own cue; other systems retain the
   existing general fault tone. */
function playSystemFault(id){
  if (id === "cam") return play("camFault");
  if (id === "audio") return play("audioFault");
  buzz();
}

/* A footstep somewhere in the building. Quieter the further out it is, and
   panned toward whichever door that route leads to. */
function footstep(u){
  const d = DO[u.node];
  if (d === undefined || d > 4) return;
  const near = d <= 1;
  play(near ? "stepClose" : "step", {
    vol: Math.max(.12, 1 - (d - 1) * 0.26),
    pan: sideOf(u.node) === "left" ? -0.7 : 0.7,
    rate: 0.92 + Math.random() * 0.16
  });
}

function scrape(u){
  play("atDoor", { pan: u && sideOf(u.node) === "left" ? -0.6 : 0.6 });
}

/* WHAT HE IS WALKING ON.

   Three surfaces, and each has its own footfall. This is not decoration: with
   one step sound the only thing his footsteps tell you is how far away he is,
   and the room he is in has to be looked up. With three, a listener who has
   learned them knows he has just come off the concrete and onto carpet — which
   narrows him to a handful of squares without the monitor ever going up.

   Anything not named here is CARPET, which is most of the office wing. */
const ZONE = {};
[["concrete", ["b01","b02","b03","b04","b05","b12","b13"]],
 ["tile",     ["b15","b20","b21","b22","b23","b24","b28","b29"]]
].forEach(([z, list]) => list.forEach(n => ZONE[n] = z));
const zoneOf = n => (floorOf(n) === 2 ? (ZONE[n] || "carpet") : "carpet");

/* The shift of weight before a step. Quiet, low, and deliberately not the same
   shape as the footfall so the two never get confused. */
function gordonTell(g){
  if (!g) return;
  const far = floorOf(g.node) === 2;
  const d = far ? undefined : DO[g.node];
  const near = (d === undefined) ? 0 : Math.max(0, Math.min(1, 1 - (d - 1) / 6));
  play("gordonTell", {
    vol:  far ? 0.30 : 0.34 + near * 0.55,
    pan:  far ? 0 : (sideOf(g.node) === "left" ? -0.45 : 0.45) * (1 - near * 0.5),
    rate: 0.96 + Math.random() * 0.08
  });
}

/* GORDON'S FOOTFALL — the one sound that is a distance readout.

   The others go quiet past four rooms because they are texture. His does not:
   it is audible from the moment he sets foot on your floor and it grows on
   every single step, so the thing that tells you how long you have left is
   something you hear rather than something you look up. You can be on the
   monitor, on the panel, or sitting in the dark doing nothing, and the count
   carries on regardless.

   While he is DOWNSTAIRS it is muffled and centred: the ceiling below you,
   direction unknown. The moment he is upstairs it pans to the wing he is
   walking up, and gets louder every room. */
const zoneCap = z => z.charAt(0).toUpperCase() + z.slice(1);

function gordonFootstep(g){
  if (!g) return;

  if (floorOf(g.node) === 2){
    /* Through the floor: quiet, dull, and it could be anywhere — except that
       the SURFACE still comes through, which is the one thing about his
       position you can learn without looking. */
    play("gordonStep" + zoneCap(zoneOf(g.node)),
         { vol: 0.26, pan: 0, rate: 0.80 + Math.random() * 0.08 });
    return;
  }

  const d = DO[g.node];
  if (d === undefined) return;
  /* Six rooms out is a knock in another part of the building; one room out is
     the loudest thing in the game. The curve is deliberately steep at the
     bottom end so the last three steps are unmistakable. */
  const near = Math.max(0, Math.min(1, 1 - (d - 1) / 6));
  play("gordonStep" + zoneCap(zoneOf(g.node)), {
    vol:  0.20 + near * near * 0.80,
    pan:  (sideOf(g.node) === "left" ? -0.55 : 0.55) * (1 - near * 0.5),
    rate: 0.94 + Math.random() * 0.10
  });
}

/* ===========================================================================
   6. STATE
   =========================================================================== */

const S = {
  running:false, night:1, hour:0, hourAcc:0, ventHum:false,
  monUp:false, panelOpen:false, activeCam:"C04",
  power:true, powerBackAt:0,
  o2:100,

  /* --- THE BAR -----------------------------------------------------------
     pw     percent remaining, 100 down to 0
     draw   percent per second at this instant, recomputed every frame and
            shown on the readout, so the cost of what you are doing is never
            something you have to remember
     outage null, or the scripted ending in progress. See beginOutage(). */
  pw:100, draw:0, pwWarned:0, outage:null,
  lureSpike:0,            // ms left on the cue's usage-meter blip
  lastDoor:null,          // what the D key works
  shownBars:-1,           // last usage reading drawn, to avoid restyling every frame
  brokeMsg:null,          // a door destroyed, shown briefly and then gone

  /* --- THE FLOOR BELOW ---------------------------------------------------
     mapFloor  which storey the map is showing. Purely a view: it does not
               gate anything, and you can watch a lower feed while looking at
               the upper plan.
     doorShut  the id of the ONE closed door, or null
     doorReadyAt  cooldown, so the array cannot be strobed
     gordon    his whole state, or null on the nights he is not in
     deadCams  feeds he has burned out, gone for the rest of the night */
  mapFloor:1,
  lastCam:{},             // the feed each floor was left on
  doorShut:null, doorReadyAt:0,
  doorBroken:{},          // one-shot doors he has already taken apart tonight
  gordon:null,
  deadCams:{},
  burnCam:null, burnAcc:0,   // the feed currently being ruined by looking at him

  units:[], sys:{}, lure:null, lureReadyAt:0,
  failAcc:0, lastFrame:0, raf:null, breathAcc:0, flicker:0, ambAcc:0,
  darkCamAcc:0, boxPlayed:false, ventAlarmAcc:0, transitUntil:0, hallucAcc:0,
  darkCamAcc:0, boxPlayed:false, ventAlarmAcc:0, transitUntil:0, hallucAcc:0,
  all20LaughAcc:0,
  sensorOn:null,          // camera id the motion sensor is mounted on
  sensorAcc:0,
  passedOut:0,            // ms remaining face-down
  jeffrey:null,           // {at, acc} — he is on the feed right now
  jeffreyAcc:0,           // time until he is somewhere again
  jeffreyArmed:false,     // he is somewhere: the next feed you open is it
  jeffreyLeft:null,       // the feed you just walked away from him on
  jeffreyScare:0,         // ms left of his frame
  shownSecs:-1,           // last whole second painted on the shift timer
  doom:null               // {unit, acc} - the kill is coming, you just can't see it
};

const $ = id => document.getElementById(id);
const el = {
  officeScene:$("officeScene"), officeArt:$("officeArt"), shiftTimer:$("shiftTimer"),
  monitor:$("monitor"), camFeed:$("camFeed"), camBox:$("camBox"),
  camPan:$("camPan"), camArt:$("camArt"),
  camName:$("camName"), mapPlan:$("mapPlan"),
  audioBtn:$("audioBtn"), sensorBtn:$("sensorBtn"),
  sysList:$("sysList"), panel:$("panel"), usage:$("usage"),
  clockHour:$("clockHour"), nightLabel:$("nightLabel"),
  alerts:$("alerts"),
  title:$("titleScreen"), lose:$("loseScreen"), win:$("winScreen"), death:$("deathScreen"),
  scare:$("scare"), scareArt:$("scareArt"),
  loseNote:$("loseNote"), winNote:$("winNote"),
  monBtn:$("monBtn"), panelBtn:$("panelBtn"), powerBtn:$("powerBtn")
};
const night = () => NIGHTS[nightIdx()];
/* Every per-night table is indexed through here. It used to be a hard-coded
   Math.min(5, ...) in five places, which is exactly the sort of thing that
   silently keeps a seventh night running on the sixth night's numbers. */
const nightIdx = () => Math.min(NIGHTS.length - 1, S.night - 1);

/* Deliberately not a round ratio — 1 : 1.27 drifts continuously instead of
   re-syncing every few cycles the way 1 : 1.25 would. */
const ROSTER_RHYTHM = [1.00, 1.27];

/* ===========================================================================
   7. BUILD THE UI
   =========================================================================== */

function makeNoise(){
  const c = document.createElement("canvas"); c.width = c.height = 90;
  const g = c.getContext("2d"), d = g.createImageData(90, 90);
  for (let i = 0; i < d.data.length; i += 4){
    const v = Math.random() * 255;
    d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255;
  }
  g.putImageData(d, 0, 0);
  document.documentElement.style.setProperty("--noise", "url(" + c.toDataURL() + ")");
}

/* Push OFFICE_DOOR into CSS custom properties so the doorway box, the sprite
   clip and the glow all read from one measurement. */
function applyDoorVars(){
  const r = document.documentElement.style;
  r.setProperty("--door-x",   OFFICE_DOOR.x + "%");
  r.setProperty("--door-w",   OFFICE_DOOR.w + "%");
  r.setProperty("--door-top", OFFICE_DOOR.top + "%");
  r.setProperty("--door-h",   OFFICE_DOOR.h + "%");
}

function buildMap(){
  el.mapPlan.querySelectorAll(".camPin,.room,.doorPin,.ductPin").forEach(n => n.remove());

  const floor = S.mapFloor;
  el.mapPlan.classList.toggle("lower", floor === 2);

  if (!FLOORPLAN_ART || floor === 2){
    el.mapPlan.classList.add("noplan");                 // drawn rooms only
  } else {
    const probe = new Image();
    probe.onload  = () => { document.documentElement.style.setProperty("--plan","url("+FLOORPLAN_ART+")");
                            el.mapPlan.classList.remove("noplan"); };
    probe.onerror = () => el.mapPlan.classList.add("noplan");
    probe.src = FLOORPLAN_ART;
  }

  // rooms first, so the buttons sit on top of them
  (floor === 2 ? ROOMS_B : ROOMS).forEach(r => {
    const d = document.createElement("div");
    d.className = "room" + (r.hall ? " hall" : "") + (r.you ? " you" : "");
    d.dataset.room = r.name;
    d.style.left = r.x1 + "%"; d.style.top = r.y1 + "%";
    d.style.width = (r.x2 - r.x1) + "%"; d.style.height = (r.y2 - r.y1) + "%";
    /* A room name can be positioned inside its own rectangle. Centring is
       wrong for an L-shaped room, for a corridor, or wherever a camera pin
       lands on top of the text — so lx/ly are percentages OF THE ROOM, set in
       the calibration tool, and absent for anything left where it was. */
    d.innerHTML = "<i" + (r.lx !== undefined || r.ly !== undefined
        ? ' style="' + (r.lx !== undefined ? "left:" + r.lx + "%;" : "")
                     + (r.ly !== undefined ? "top:"  + r.ly + "%;" : "") + '"'
        : "") + ">" + r.name + "</i>";
    el.mapPlan.appendChild(d);
  });

  /* THE DUCTS, marked but not interactive. You cannot close one, block one or
     do anything at all about one — the mark is there so that the three places
     he is walking toward are a thing you can read off the plan rather than
     something you have to memorise. */
  if (floor === 2){
    DUCTS.forEach(v => {
      const g = GRAPH[v.down]; if (!g) return;
      const d = document.createElement("div");
      d.className = "ductPin";
      d.dataset.duct = v.id;
      d.title = v.name + " — climbs to " + v.up;
      d.style.left = g.x + "%"; d.style.top = g.y + "%";
      d.textContent = "▲";
      el.mapPlan.appendChild(d);
    });

    /* THE DOORS. Drawn halfway between the two squares they join unless the
       entry carries its own pin, and clicking one is the only way to work it.
       They are on the lower plan and nowhere else, which is the mechanical
       heart of the whole floor: to hold a door you must be on the cameras,
       looking at the basement, and not looking at anything else. */
    DOOR_LINKS.forEach(dl => {
      const a = GRAPH[dl.a], b = GRAPH[dl.b];
      if (!a || !b) return;
      const btn = document.createElement("button");
      btn.className = "doorPin";
      btn.dataset.door = dl.id;
      btn.title = dl.name;
      btn.style.left = (dl.pin ? dl.pin.x : (a.x + b.x) / 2) + "%";
      btn.style.top  = (dl.pin ? dl.pin.y : (a.y + b.y) / 2) + "%";
      /* The glyph is the door itself rather than a label: a bar across the
         gap when shut, an outline when open. At this size a word would not
         survive being read at a glance, and a glance is all you get. */
      btn.innerHTML = '<i></i>';
      btn.addEventListener("click", e => { e.stopPropagation(); toggleDoor(dl.id); });
      el.mapPlan.appendChild(btn);
    });
  }

  Object.entries(CAMERAS).forEach(([id, cam]) => {
    if (!camOnFloor(id, floor)) return;
    const b = document.createElement("button");
    b.className = "camPin"; b.dataset.cam = id;
    b.textContent = cam.name.trim().split(/\s+/)[0];
    b.title = cam.name;
    /* A camera on two plans needs a spot on each of them — the stairwell is in
       a different place on the upper drawing than on the lower one. `pin2`
       carries the second position; without one it reuses the first. */
    const pin = (floor === 2 && cam.pin2) ? cam.pin2 : cam.pin;
    b.style.left = pin.x + "%"; b.style.top = pin.y + "%";
    b.addEventListener("click", e => { e.stopPropagation(); viewCam(id); });
    el.mapPlan.appendChild(b);
  });

  syncMapChrome();
  // re-apply the highlight for whichever feed is live, if it is on this floor
  const lit = litRooms(S.activeCam);
  el.mapPlan.querySelectorAll(".room").forEach(r =>
    r.classList.toggle("lit", lit.has(r.dataset.room) && !r.classList.contains("you")));
  el.mapPlan.querySelectorAll(".camPin").forEach(b =>
    b.classList.toggle("active", b.dataset.cam === S.activeCam));
}

/* The floor button's label and the plan's own caption. Split out of buildMap
   so flipping a door does not rebuild forty elements. */
function syncMapChrome(){
  const btn = $("floorBtn");
  if (btn){
    btn.textContent = S.mapFloor === 1 ? "FLOOR 1  ·  UPPER  [TAB]"
                                       : "FLOOR 2  ·  LOWER  [TAB]";
    btn.classList.toggle("lower", S.mapFloor === 2);
  }
}

function buildPanel(){
  el.sysList.innerHTML = "";
  SYSTEMS.forEach(s => {
    const row = document.createElement("div");
    row.className = "sysRow"; row.id = "sys_" + s.id;
    row.innerHTML =
      '<div class="sysHead"><span class="sysName">' + s.name + '</span>' +
      '<span class="sysState">NOMINAL</span></div>' +
      '<button class="rebootBtn" data-sys="' + s.id + '">REBOOT</button>' +
      '<div class="bar"><i></i></div>';
    row.querySelector("button").addEventListener("click", e => {
      e.stopPropagation(); reboot([s.id]);
    });
    el.sysList.appendChild(row);
  });
  $("rebootAll").addEventListener("click", e => {
    e.stopPropagation(); reboot(SYSTEMS.map(s => s.id), true);
  });
}

/* ===========================================================================
   8. NIGHT SETUP
   =========================================================================== */

/* How long one of them loiters outside before the first step. Note that a step
   still costs a full move interval on top of this, which for her is the better
   part of half a minute — so her delay is a floor on when she starts walking,
   not on when she is first seen. */
function entryDelay(u, i){
  if (S.night === 8){
    if (u.commitModel)
      return customPairCfg("sloppy").enterMs + Math.random() * 2500;
    const jitter = u.id === "eugene" ? EUGENE.entryJitterMs : 6000;
    return customPairCfg("eugene").enterMs + i * CONFIG.entryStaggerMs + Math.random() * jitter;
  }
  if (u.commitModel)
    return SLOPPY.enterMs[nightIdx()] + Math.random() * 4000;
  const jitter = u.id === "eugene" ? EUGENE.entryJitterMs : 6000;
  return night().enterMs + i * CONFIG.entryStaggerMs + Math.random() * jitter;
}

function startNight(n){
  S.running = true; S.night = n; S.hour = 0; S.hourAcc = 0;
  trackGameEvent("night_start", { night_number:n });
  S.monUp = false; S.panelOpen = false; S.panelTab = false; S.power = true; S.powerBackAt = 0;
  S.o2 = 100; S.lure = null; S.lureReadyAt = 0; S.failAcc = 0; S.breathAcc = 0;
  S.sensorOn = null; S.sensorAcc = 0;
  S.passedOut = 0; S.doom = null; S.flicker = 0;
  S.ambAcc = CONFIG.ambienceFirstMs; S.darkCamAcc = 0; S.boxPlayed = false;
  S.shownSecs = -1;
  S.transitUntil = 0; S.hallucAcc = hallucinationGap();
  S.hallucDoor = null;
  S.all20SoundAcc = all20Mode() ? (7000 + Math.random() * 7000) : 0;
  S.all20LaughAcc = all20Mode() ? (12000 + Math.random() * 9000) : 0;
  S.all20LightAcc = all20Mode() ? (10000 + Math.random() * 16000) : 0;
  S.all20LightHold = 0;
  S.all20DoorAcc = all20Mode() ? (9000 + Math.random() * 11000) : 0;
  document.body.classList.remove("all20-office-flicker");
  S.jeffrey = null; S.jeffreyScare = 0;
  S.jeffreyArmed = false; S.jeffreyLeft = null;
  { const jc = jeffreyCfg(); S.jeffreyAcc = jc ? jc.firstMs * (0.8 + Math.random() * 0.4) : Infinity; }
  hideJeffrey();
  S.activeCam = "C04";

  S.sys = {};
  SYSTEMS.forEach(s => S.sys[s.id] = { ok:true, reboot:0, total:0, safeUntil:0 });

  /* THE NEW NIGHT STARTS CLEAN. Every one of these is a thing that would
     otherwise carry across a death: a bar still empty from the shift that just
     ended, a door still shut, a camera still burned out, or — the nastiest of
     them — a wear counter left high, so the first cue of a fresh night would
     roll at the tenth cue's odds. */
  S.pw = POWER.capacity; S.draw = 0; S.pwWarned = 0; S.outage = null;
  S.wear = {}; SYSTEMS.forEach(s => S.wear[s.id] = 0);
  S.darkAcc = 0;
  S.doorShut = null; S.doorReadyAt = 0; S.doorBroken = {};
  S.lastDoor = null; S.lureSpike = 0; S.brokeMsg = null; S.shownBars = -1;
  S.deadCams = {}; S.burnCam = null; S.burnAcc = 0;
  S.mapFloor = 1;
  S.lastCam = {};
  S.gordon = spawnGordon();
  document.body.classList.remove("outage");

  // Two roamers, dropped at distinct outside markers. A Fisher–Yates shuffle
  // gives all three entrances an equal chance instead of favouring list order.
  const spots = shuffled(SPAWNS);
  S.units = ROSTER.slice(0, 2).filter(a => customEnabled(a.id)).map((a, i) => ({
    ...a,
    node: spots[i % spots.length],
    // Out of step on purpose. Each one carries its own rhythm multiplier and
    // re-jitters after every move, so they never settle into lockstep and you
    // can't learn one clock and get both for free.
    rhythm: ROSTER_RHYTHM[i % ROSTER_RHYTHM.length],
    jitter: 1,
    // They do not walk in together. The second hangs back by a good margin, so
    // the first half of a night has one thing in the building, not two.
    acc: -entryDelay(a, i),
    breaching:false, breachAcc:0, commit:0, respite:0, lastLure:0, darkTried:false,
    lureTarget:null, lureMoves:0, watchAcc:0,
    cutFrac:null, seenBySensor:false
  }));

  /* Whatever killed you is not still standing there when you clock back in.
     The .present class survives a death — nothing clears it until the first
     render of the new night — and the fade-out is 400 ms long, so the new
     shift opened on a figure in your doorway quietly dissolving. Cleared here,
     with the transition suppressed for one frame so it goes rather than
     fades. */
  ["left","right"].forEach(side => {
    const box = doorEl(side); if (!box) return;
    box.classList.remove("present","walkby","exitLeft","exitRight");
    const img = box.querySelector(".lurker");
    if (!img) return;
    img.style.transition = "none";
    void img.offsetWidth;
    requestAnimationFrame(() => { img.style.transition = ""; });
  });

  stopVictory();
  [el.title, el.lose, el.win, el.scare, el.death].forEach(s => s.classList.remove("show"));
  document.body.classList.remove("camsup","dark","ventbad","warningLights","camdown","paneltab",
                                "warn-left","warn-right","flicker","out","doom","atdoor");
  el.monitor.classList.remove("up");

  const oimg = mountArt(el.officeArt, OFFICE_ART, "(wide panorama from your desk)");
  if (oimg){ oimg.addEventListener("load", () => fitOfficeScene(oimg)); fitOfficeScene(oimg); }
  applyDoorVars();
  el.nightLabel.textContent = n === 8 ? "CUSTOM NIGHT" : "NIGHT " + n;
  syncChrome();

  S.lastFrame = performance.now();
  cancelAnimationFrame(S.raf);
  S.raf = requestAnimationFrame(loop);
}

/* ===========================================================================
   9. PLAYER ACTIONS
   =========================================================================== */

const rebootActive = () => SYSTEMS.some(s => S.sys[s.id].reboot > 0);

/* Walking away mid-cycle aborts it. The system stays broken and the clock goes
   back to zero, so a reboot is a commitment rather than something you start and
   wander off from. */
function cancelReboots(){
  let any = false;
  SYSTEMS.forEach(s => {
    const st = S.sys[s.id];
    if (st.reboot > 0){ st.reboot = 0; st.total = 0; st.ok = false; any = true; }
  });
  if (any) buzz();
  el.panel.classList.remove("held");
}

function toggleMonitor(){
  if (!S.running || S.passedOut > 0 || S.doom) return;
  if (S.outage) return;                       // there is nothing left to raise
  // With the mains off the feeds run on whatever is left in the line. They
  // work briefly, then they do not — and you cannot fix them until it is back.
  if (!S.power && !S.sys.cam.ok) return;
  if (rebootActive()) return;                 // pinned to the panel until it finishes
  // Opening the monitor from the office must close the panel in the same
  // action. Otherwise its visual state waits for the next pointer movement.
  if (!S.monUp && S.panelTab){
    S.panelTab = false; S.panelOpen = false;
    document.body.classList.remove("paneltab");
  }
  const wasMonUp = S.monUp;
  S.monUp = !S.monUp;
  if (!wasMonUp && S.monUp) play("camOpen");
  if (wasMonUp && !S.monUp) play("camClose");
  if (!S.monUp){                              // dropping the monitor closes the page too
    S.panelTab = false; S.panelOpen = false;
    document.body.classList.remove("paneltab");
  }
  el.monitor.classList.toggle("up", S.monUp);
  document.body.classList.toggle("camsup", S.monUp);
  setHiss(S.monUp);
  if (S.monUp) viewCam(S.activeCam);
  syncChrome();
}

/* The panel is now a page of the monitor. Opening it requires the monitor to
   be up, and leaving it aborts anything mid-cycle. */
function togglePanel(){
  if (!S.running || !S.power || S.passedOut > 0 || S.doom) return;
  if (S.outage) return;                       // and nothing left to fix
  if (S.panelTab && rebootActive()) cancelReboots();
  const wasOpen = S.panelTab;
  // Drop the monitor FIRST. Lowering it clears the panel flag, so setting the
  // flag before lowering was immediately undoing itself — the panel opened and
  // shut in the same frame.
  if (!S.panelTab && S.monUp) toggleMonitor();
  S.panelTab = !S.panelTab;
  S.panelOpen = S.panelTab;
  if (!wasOpen && S.panelTab) play("panelOpen");
  if (wasOpen && !S.panelTab) play("panelClose");
  document.body.classList.toggle("paneltab", S.panelTab);
  syncChrome();
}

function togglePower(){
  if (!S.running || S.passedOut > 0) return;
  /* The switch is dead for the rest of the shift. An outage is not the lights
     being off, it is there being no lights to turn on. */
  if (S.outage) return;
  if (!S.power && performance.now() < S.powerBackAt) return;   // still warming up
  S.power = !S.power;
  clunk();
  if (!S.power){
    // Killing the mains kills anything mid-cycle with it. This is also your way
    // out of a reboot you no longer have time to finish.
    cancelReboots();
    // Anyone already at a door has their fate decided by how fast this was.
    S.units.forEach(u => {
      /* She is unmoved by the mains going off. For him, the first stretch after
         he arrives is free — reacting at all is the skill, not reacting inside
         200ms. Only after the grace does hesitation start costing you odds. */
      if (u.breaching && !u.commitModel && u.cutFrac === null){
        const win = tuned().breachMs, grace = EUGENE.cutGraceMs;
        u.cutFrac = Math.max(0, Math.min(1,
          (u.breachAcc - grace) / Math.max(1, win - grace)));
      }
    });

    /* THE LONG SHOT.

       The lights still mean nothing to her in the way they mean something to
       him — there is no window, no decay curve, no reward for reacting fast.
       There is one roll, taken once per arrival so the breaker cannot be
       flicked for a second one, and it usually fails. What it is for is the
       moment you have nothing else: the relay is down, or the cue is still
       recharging, and the alternative is standing there doing nothing.

       Aiming a cue at a feed near her is still the answer worth reaching for
       first, at better than twice these odds. */
    S.units.forEach(u => { if (u.breaching && u.commitModel) darkRoll(u); });
    // the monitor stays available — on residual power, and not for long
    S.panelOpen = false; S.panelTab = false;
    document.body.classList.remove("paneltab");
    S.powerBackAt = performance.now() + CONFIG.powerRestoreMs;
  }
  document.body.classList.toggle("dark", !S.power);
  syncChrome();
}

/* Point-in-rectangle, so a node's room is derived rather than hand-listed.
   Now floor-aware: the two plans share one coordinate space, so searching the
   whole list would happily report that a basement square is in your office. */
function roomOf(node){
  const g = GRAPH[node]; if (!g) return null;
  const list = floorOf(node) === 2 ? ROOMS_B : ROOMS;
  return list.find(r => g.x >= r.x1 && g.x <= r.x2 && g.y >= r.y1 && g.y <= r.y2) || null;
}

function litRooms(camId, floor){
  const names = new Set();
  const f = floor || S.mapFloor || 1;
  (CAMERAS[camId].sees || []).forEach(n => {
    /* Only squares on the plan being drawn. Room names are not unique between
       floors — there is a NORTH HALL on each — so a camera that sees a square
       downstairs would otherwise light the identically named room upstairs.
       The engineering feed does exactly that: it watches the landing below,
       and that lit the upper north hall every time you opened it. */
    if (floorOf(n) !== f) return;
    const r = roomOf(n);
    if (r) names.add(r.name);
  });
  return names;
}

function viewCam(id){
  // The sound is for CHANGING feed, so raising the monitor onto the camera you
  // were already on stays silent — that action has the hiss coming up instead.
  const changed = S.activeCam !== id;
  S.activeCam = id;
  S.lastCam[camFloor(id)] = id;      // so flipping floors comes back here
  if (changed && S.monUp && S.sys.cam.ok) play("camSwitch");
  syncRoomTone();
  const cam = CAMERAS[id];
  el.camName.textContent = cam.name;
  /* updateCamPan() has always defended against a camera with no pan block;
     this line did not, so the first feed added without one took the whole game
     down the moment it was opened. Both now read the same way. */
  el.camPan.style.width = ((cam.pan && cam.pan.width) || CONFIG.camPan.width) + "%";
  mountArt(el.camArt, cam.art, "");
  el.camArt.querySelector("img")?.classList.add("feed");
  updateCamPan();
  drawSubjects(true);
  el.mapPlan.querySelectorAll(".camPin").forEach(b =>
    b.classList.toggle("active", b.dataset.cam === id));
  // shade whichever rooms this feed actually covers
  const lit = litRooms(id);
  el.mapPlan.querySelectorAll(".room").forEach(r =>
    r.classList.toggle("lit", lit.has(r.dataset.room) && !r.classList.contains("you")));

  // whatever was already on this feed before you opened it
  jeffreyOnEntry();
}

function playCue(){
  if (!S.running || !S.power || !S.monUp) return;
  if (!S.sys.audio.ok) { buzz(); return; }
  if (performance.now() < S.lureReadyAt) { buzz(); return; }

  setLure(CAMERAS[S.activeCam].sees, CONFIG.lureStrength, CONFIG.lureHoldMs,
          S.activeCam, true);
  offerLure();                       // decided the moment it plays, not later
  S.lureReadyAt = performance.now() + CONFIG.lureCooldownMs;
  lureFx();
  spendPower(lureCost());            // charged per press, not per second
  S.lureSpike = POWER.lureSpikeMs;   // and the meter jumps for a moment

  /* AND THEN THE RELAY ROLLS. Deliberately last: the cue has already been
     placed and already been offered to everything in the building, so a relay
     that burns out on this press still did the thing you pressed it for. You
     lose the tool, never the shot you spent it on. */
  rollAudioCue();

  el.audioBtn.classList.add("firing");
  setTimeout(() => el.audioBtn.classList.remove("firing"), 400);
}

/* ---------------------------------------------------------------------------
   THE DOORS

   One closed at a time, and closing a second one opens the first. That is not
   a restriction bolted onto a door system — it IS the door system. With five
   doors and three ducts you are never choosing whether to hold a line, you are
   choosing which single line to hold, and Gordon's whole job is to make that
   choice wrong.

   They live on the lower map and can only be worked from the monitor, so
   holding a door means being on the cameras, which means spending power on the
   monitor as well as on the door — the two costs arrive together and that is
   the point.
--------------------------------------------------------------------------- */
function toggleDoor(id){
  if (!S.running || S.outage) return;
  if (!S.monUp || S.panelTab) return;         // worked from the cameras only
  if (!S.power) return;                       // the mains run the motors
  if (!S.sys.door.ok){ buzz(); return; }      // the array is jammed
  if (performance.now() < S.doorReadyAt){ buzz(); return; }
  if (!DOOR_BY_ID[id]) return;
  if (S.doorBroken[id]){ buzz(); return; }    // he already took this one apart

  S.doorReadyAt = performance.now() + CONFIG.doorCooldownMs;

  S.lastDoor = id;                            // the key works this one from now on
  if (S.doorShut === id){                     // this one was shut: open it
    S.doorShut = null;
    play("doorOpen");
    return;
  }

  /* Closing a different one lets the old one go first, and you hear both. The
     open is deliberately audible: it is the sound of the thing you were
     relying on being given away, and you should never lose a door quietly. */
  if (S.doorShut){
    play("doorOpen");
    setTimeout(() => { if (S.running) play("doorShut"); }, 170);
  } else {
    play("doorShut");
  }
  S.doorShut = id;
}

/* Every door the player can currently reach. Closed doors are always listed,
   so the one you shut never disappears from the map when the array faults. */
const doorOpenable = () => S.running && !S.outage && S.power && S.sys.door.ok;

/* THE DOOR KEY.

   Works the LAST door you touched, from anywhere — monitor up, monitor down,
   in the office, in the dark. Everything else about the array still requires
   the cameras; this one binding does not.

   The reason is asymmetry. CHOOSING a door needs the map, because you have to
   know where he is to know which one matters. RELEASING one needs nothing at
   all — you already decided, he has already gone past — and the only thing
   between you and switching it off was having to raise a monitor that itself
   costs power to hold. Charging for that was charging you to stop spending.

   It re-closes as well as releases, so a door you are shuffling can be worked
   without the map once you have picked it. */
function toggleLastDoor(){
  if (!S.running || S.outage || S.passedOut > 0 || S.doom) return;
  const id = S.doorShut || S.lastDoor;
  if (!id || !DOOR_BY_ID[id]){ buzz(); return; }
  if (S.doorBroken[id]){ buzz(); return; }
  if (!S.power){ buzz(); return; }
  if (performance.now() < S.doorReadyAt){ buzz(); return; }
  if (S.doorShut !== id && !S.sys.door.ok){ buzz(); return; }

  S.doorReadyAt = performance.now() + CONFIG.doorCooldownMs;
  if (S.doorShut === id){ S.doorShut = null; play("doorOpen"); }
  else { S.doorShut = id; play("doorShut"); }
}


/* Which storey the map is drawing. TAB flips it, as does the button above the
   plan. It is a view and nothing else: your feed does not change, so you can
   read the lower plan while still watching an upper room. */
/* WHERE EACH FLOOR LEFT YOU.

   Switching floors used to change the plan and leave the feed alone, which
   meant you were looking at a map of one storey and a picture of the other,
   then had to click a pin to catch up. Flipping now takes you to the camera
   you were last on for that floor, so each storey remembers its own place and
   going down and back is one keypress each way rather than two and a click.

   The first visit to a floor has nothing to remember and falls back to
   CONFIG.homeCam. */
function setMapFloor(f){
  if (S.mapFloor === f) return;

  // remember where this floor was before leaving it
  if (camFloor(S.activeCam) === S.mapFloor) S.lastCam[S.mapFloor] = S.activeCam;

  S.mapFloor = f;
  buildMap();
  syncMapChrome();

  /* If the feed you are on belongs to both storeys, flipping the plan does not
     move you — you are already looking at the right thing. */
  if (camOnFloor(S.activeCam, f)){ syncMapChrome(); play("camSwitch", { vol:0.5 }); return; }

  const want = S.lastCam[f] || CONFIG.homeCam[f];
  if (want && CAMERAS[want] && !camDead(want)) viewCam(want);
  else {
    /* Everything remembered on that floor has burned out, so take the first
       feed still alive rather than dropping the player onto a dead one. */
    const alive = camIdsOn(f).find(c => !camDead(c));
    if (alive) viewCam(alive);
  }
  play("camSwitch", { vol: 0.5 });
}
const toggleMapFloor = () => setMapFloor(S.mapFloor === 1 ? 2 : 1);

function reboot(ids, all){
  if (!S.running || !S.power || S.outage) return;
  // One cycle at a time. Three faults means three waits, or one long one.
  if (rebootActive()) { buzz(); return; }
  const ms = all ? CONFIG.rebootAllMs : CONFIG.rebootOneMs;
  let started = false;
  ids.forEach(id => {
    const s = S.sys[id];
    if (s.reboot > 0) return;              // already cycling
    s.reboot = ms; s.total = ms; s.ok = false;
    started = true;
  });
  if (!started) return;
  blip();

  /* Ventilation doesn't come back quietly. The fans spin up right over your
     head, and that noise is coming from exactly where you are — a cue you
     didn't choose to play, pointed at yourself. */
  if (ids.includes("vent")){
    setLure(["OFFICE"],
            all ? CONFIG.ventLureStrength * 1.35 : CONFIG.ventLureStrength,
            all ? CONFIG.rebootAllMs : CONFIG.rebootOneMs);
    offerLure();
  }
}

/* --- wiring --- */
el.monBtn.onclick   = e => { e.stopPropagation(); toggleMonitor(); };
el.panelBtn.onclick = e => { e.stopPropagation(); togglePanel(); };
el.powerBtn.onclick = e => { e.stopPropagation(); togglePower(); };
el.audioBtn.onclick  = e => { e.stopPropagation(); playCue(); };
$("floorBtn").onclick = e => { e.stopPropagation(); toggleMapFloor(); };

el.sensorBtn.onclick = e => { e.stopPropagation(); mountSensor(S.activeCam); };
$("customBack").onclick = e => { e.stopPropagation(); closeCustomMenu(); };
$("customReady").onclick = e => { e.stopPropagation(); startCustomNight(); };

/* Menu state. Night 7 remains the default after Custom Night unlocks.
   Custom opens a separate screen and only becomes Night 8 when READY is pressed. */
const PICKERS = ["pickTitle", "pickLose"];
const PROGRESS_KEY = "fnaac-unlocked-night";
const COMPLETED_KEY = "fnaac-completed-night";
const STAR_DISPLAYS = ["starsTitle", "starsLose"];
let unlockedNight = 1;
let completedNight = 0;

function loadProgress(){
  try {
    const savedUnlocked = Number.parseInt(localStorage.getItem(PROGRESS_KEY), 10);
    const savedCompleted = Number.parseInt(localStorage.getItem(COMPLETED_KEY), 10);
    if (Number.isInteger(savedCompleted)) {
      completedNight = Math.min(7, Math.max(0, savedCompleted));
      unlockedNight = Math.min(8, completedNight + 1);
    } else if (Number.isInteger(savedUnlocked)) {
      unlockedNight = Math.min(8, Math.max(1, savedUnlocked));
      completedNight = Math.min(7, unlockedNight - 1);
    }
  } catch (_) {}
  S.night = unlockedNight >= 8 ? 7 : unlockedNight;
  try {
    const early = window.__FNAAC;
    if (early && Number.isInteger(early.night) &&
        early.night >= 1 && early.night <= unlockedNight) S.night = early.night;
    if (unlockedNight >= 8 && S.night === 8) S.night = 7;
  } catch (_) {}
}

function saveProgress(){
  try {
    localStorage.setItem(PROGRESS_KEY, unlockedNight);
    localStorage.setItem(COMPLETED_KEY, completedNight);
  } catch (_) {}
}

function resetProgress(){
  unlockedNight = 1;
  completedNight = 0;
  saveProgress();
  S.night = 1;
  buildPickers();
}

function unlockNextNight(){
  if (S.night === 7) {
    completedNight = Math.max(completedNight, 7);
    unlockedNight = 8;
    S.night = 7;
  } else if (S.night < 7) {
    completedNight = Math.max(completedNight, S.night);
    unlockedNight = Math.min(7, completedNight + 1);
    S.night = Math.min(7, S.night + 1);
  } else {
    completedNight = Math.max(completedNight, 7);
    unlockedNight = 8;
    S.night = 7;
  }
  saveProgress();
}

function customAllAt(level){
  return Object.keys(customLevels).every(k => customLevels[k] === level);
}

function all20Mode(){
  return S.night === 8 && customAllAt(20);
}

function buildCustomMenu(){
  const host = $("customAnimatics");
  if (!host) return;
  const defs = [
    { id:"eugene",  name:"EUGENE",  art:"images/characters/ani_eugene.png" },
    { id:"sloppy",  name:"SLOPPY",  art:"images/characters/ani_sloppy.png" },
    { id:"gordon",  name:"GORDON",  art:"images/characters/ani_gordon.png" },
    { id:"jeffrey", name:"JEFFREY", art:"images/characters/ani_jeffrey.png" }
  ];
  host.innerHTML = defs.map(d =>
    '<div class="customCard" data-anim="'+d.id+'">' +
      '<div class="customName">'+d.name+'</div>' +
      '<div class="customArtFrame"><img class="customArt" src="'+d.art+'" alt=""></div>' +
      '<div class="customAILabel"><span>A.I. LEVEL</span><span class="customLevelState">OFF</span></div>' +
      '<div class="customControl">' +
        '<button type="button" class="customStep" data-dir="-1" aria-label="Decrease '+d.name+'">‹</button>' +
        '<span class="customValue">0</span>' +
        '<button type="button" class="customStep" data-dir="1" aria-label="Increase '+d.name+'">›</button>' +
      '</div>' +
      '<div class="customLevelTrack"><i class="customLevelFill"></i></div>' +
    '</div>'
  ).join('');
  host.querySelectorAll('.customStep').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.closest('.customCard').dataset.anim;
      customLevels[id] = Math.max(0, Math.min(20, customLevels[id] + Number(btn.dataset.dir)));
      saveCustomLevels();
      refreshCustomMenu();
    });
  });
  const all0 = $("customAll0"), all20 = $("customAll20");
  if (all0) all0.onclick = e => { e.stopPropagation(); Object.keys(customLevels).forEach(k => customLevels[k]=0); saveCustomLevels(); refreshCustomMenu(); };
  if (all20) all20.onclick = e => { e.stopPropagation(); Object.keys(customLevels).forEach(k => customLevels[k]=20); saveCustomLevels(); refreshCustomMenu(); };
  refreshCustomMenu();
}

function refreshCustomMenu(){
  const host = $("customAnimatics");
  if (!host) return;
  host.querySelectorAll('.customCard').forEach(card => {
    const id = card.dataset.anim, value = customLevels[id];
    card.querySelector('.customValue').textContent = String(value);
    const fill = card.querySelector('.customLevelFill');
    if (fill) fill.style.width = (value / 20 * 100) + "%";
    card.classList.toggle('off', value === 0);
    const state = card.querySelector('.customLevelState');
    if (state) state.textContent = value === 0 ? "OFF" : (value === 20 ? "MAX" : "ACTIVE");
    card.querySelectorAll('.customStep').forEach(btn => {
      btn.disabled = Number(btn.dataset.dir) < 0 ? value <= 0 : value >= 20;
    });
  });
  const total = customTotalLevel();
  const totalEl = $("customTotal");
  if (totalEl) totalEl.textContent = "TOTAL A.I. " + total + " / 80";
  const tierEl = $("customTier");
  if (tierEl) tierEl.textContent = "BUILDING DIFFICULTY  ·  NIGHT " + (customSettingNightIndex() + 1);
}

function openCustomMenu(){
  if (unlockedNight < 8) return;
  buildCustomMenu();
  [el.title, el.lose, el.win, el.scare, el.death].forEach(s => s.classList.remove("show"));
  $("customScreen").classList.add("show");
  document.body.classList.add("custom-menu");
}

function closeCustomMenu(){
  $("customScreen").classList.remove("show");
  document.body.classList.remove("custom-menu");
  S.night = 7;
  markPickers();
  el.title.classList.add("show");
}

function startCustomNight(){
  if (unlockedNight < 8) return;
  saveCustomLevels();
  S.night = 8;
  $("customScreen").classList.remove("show");
  document.body.classList.remove("custom-menu");
  el.title.classList.add("show");
  clockIn();
}

function buildPickers(){
  PICKERS.forEach(id => {
    const host = $(id);
    host.innerHTML = "<span>NIGHT</span>";
    for (let n = 1; n <= 8; n++){
      if (n > unlockedNight) continue;
      const b = document.createElement("button");
      b.textContent = n === 8 ? "CUSTOM" : n;
      b.dataset.night = n;
      b.classList.toggle('customPick', n === 8);
      b.onclick = e => {
        e.stopPropagation();
        if (n > unlockedNight) return;
        if (n === 8){ openCustomMenu(); return; }
        S.night = n;
        markPickers();
      };
      host.appendChild(b);
    }
  });
  markPickers();
}

function markStars(){
  const stars = custom20Complete ? 3 : (completedNight >= 7 ? 2 : completedNight >= 6 ? 1 : 0);
  STAR_DISPLAYS.forEach(id => $(id).textContent = "★".repeat(stars));
}

function markPickers(){
  PICKERS.forEach(id => $(id).querySelectorAll("button").forEach(b => {
    const n = +b.dataset.night;
    b.disabled = n > unlockedNight;
    b.classList.toggle("on", n !== 8 && n === S.night);
  }));
  el.nightLabel.textContent = S.night === 8 ? "CUSTOM NIGHT" : "NIGHT " + S.night;
  markStars();
}

/* ===========================================================================
   THE TITLE SCREEN — glitches and music

   Both run only while the title is showing, and both stop dead the moment you
   clock in. Nothing here survives into a night.
   =========================================================================== */

/* The face behind everything is Gordon, blurred to almost nothing. He is the
   one nobody has met yet on their first run, and using a sprite you already
   have costs nothing and means the thing behind the title is a real thing in
   the building rather than a texture. */
document.documentElement.style.setProperty("--titleFace", "url(" + GORDON.art + ")");

let titleGlitch = null, titleAlive = false, all20TitleLaugh = null;

/* WHY THIS IS SCHEDULED AND NOT RANDOM PER FRAME.

   A screen that glitches constantly reads as broken — the eye normalises it in
   about two seconds and then it is just texture. A screen that is completely
   still for eight or ten seconds and THEN tears reads as something noticing
   you. So each event picks its own next delay, and the gaps are long enough to
   be uncomfortable. */
function scheduleGlitch(){
  if (!titleAlive) return;
  const wait = 3200 + Math.random() * 9000;
  titleGlitch = setTimeout(() => {
    if (!titleAlive) return;
    const roll = Math.random();

    if (roll < 0.34){
      // a horizontal tear: a band of inverted screen, two frames long
      const t = $("titleTear");
      if (t){
        t.style.top = (8 + Math.random() * 76) + "%";
        t.style.height = (2 + Math.random() * 7) + "px";
        t.classList.add("on");
        setTimeout(() => t.classList.remove("on"), 40 + Math.random() * 90);
      }
      if (Math.random() < 0.5) blip();

    } else if (roll < 0.62){
      // the title loses its registration for a moment
      const h = document.querySelector("#titleScreen h1");
      if (h){
        h.style.setProperty("--jx", ((Math.random() * 8) - 4).toFixed(1) + "px");
        h.classList.add("jolt");
        setTimeout(() => h.classList.remove("jolt"), 90 + Math.random() * 130);
      }

    } else if (roll < 0.80){
      // the snow surges, as if the signal dropped
      const sn = $("titleSnow");
      if (sn){
        sn.style.opacity = "0.24";
        setTimeout(() => sn.style.opacity = "", 70 + Math.random() * 140);
      }

    } else {
      /* HE IS THERE, for about a fifth of a second. The rarest event by a
         distance — roughly once every forty seconds — and the only one with a
         sound under it. If a player ever screenshots the menu to check whether
         they imagined it, this is doing its job. */
      const f = $("titleFace");
      if (f){
        f.classList.add("peek");
        setTimeout(() => f.classList.remove("peek"), 110 + Math.random() * 120);
      }
      play("titleStab", { vol: 0.5 + Math.random() * 0.3 });
    }
    scheduleGlitch();
  }, wait);
}

function scheduleAll20TitleLaugh(){
  clearTimeout(all20TitleLaugh);
  all20TitleLaugh = null;
  if (!titleAlive || !all20Mode()) return;
  const wait = 900 + Math.random() * 1800;
  all20TitleLaugh = setTimeout(() => {
    if (!titleAlive || !all20Mode()) return;
    play("all20Laugh", { vol:0.62 + Math.random() * 0.16, pan:Math.random() * .8 - .4 });
    scheduleAll20TitleLaugh();
  }, wait);
}

function titleScreenOn(){
  if (titleAlive) return;
  titleAlive = true;
  scheduleGlitch();
  scheduleAll20TitleLaugh();
  startMenuMusic();
}
function titleScreenOff(){
  titleAlive = false;
  clearTimeout(titleGlitch);
  clearTimeout(all20TitleLaugh);
  all20TitleLaugh = null;
  stopMenuMusic();
}

/* The CSS above stops the drag in every engine that honours user-drag.
   Firefox does not, so the gesture is cancelled at the source as well. Capture
   phase, so nothing downstream can re-enable it by accident. */
document.addEventListener("dragstart", e => e.preventDefault(), true);

let preNightTimer = null;
let preNightActive = false;

function showPreNight(){
  if (preNightActive) return;
  preNightActive = true;
  const title = $("titleScreen");
  const night = $("preNightNight");
  const start = $("btnStart");
  if (!title) return;

  if (night) night.textContent = S.night === 8 ? "CUSTOM NIGHT" : "NIGHT " + S.night;
  title.classList.toggle("all20-preNight", typeof all20Mode === "function" && all20Mode());
  title.classList.add("preNight");
  if (start) start.disabled = true;

  /* Keep the title layer alive for the whole handoff. That preserves both the
     menu music and the CRT background while the player is being told which
     shift they are about to enter. */
  titleScreenOn();

  clearTimeout(preNightTimer);
  preNightTimer = setTimeout(() => {
    /* Flash Gordon's actual eye positions just before the handoff. The eye layer
       now follows the same drift transform as the sprite underneath it. */
    const eyes = $("titleEyes");
    if (eyes){
      eyes.classList.remove("flash");
      void eyes.offsetWidth;
      eyes.classList.add("flash");
    }
    play("nightStart");

    preNightTimer = setTimeout(() => {
      titleScreenOff();
      initAudio();
      startNight(S.night);
      title.classList.remove("preNight");
      if (start) start.disabled = false;
      if (eyes) eyes.classList.remove("flash");
      preNightActive = false;
    }, 300);
  }, 2700);
}

const clockIn = () => {
  if (preNightActive) return;
  if (!actx) initAudio();
  showPreNight();
};
$("btnStart").onclick = clockIn;

/* ---------------------------------------------------------------------------
   GETTING THE AUDIO RUNNING

   Every browser refuses to play sound until the page has been interacted with,
   and each has its own idea of what counts. The old code listened for three
   events, once each, and assumed resume() worked. When it did not — and it
   often does not first time, because resume() is asynchronous and can simply
   not settle — nothing tried again, so the music waited for whatever the
   player happened to do next. That is where the ten-second silences came from.

   This keeps trying: a wide net of events, none of them once-only, plus a
   poll, until the context reports `running`. Everything queued through
   whenAudioRunning() then fires at that exact moment rather than at some
   earlier one when the clock was still stopped.
--------------------------------------------------------------------------- */
const audioWaiters = [];
let audioWatch = null;

const audioRunning = () => !!actx && actx.state === "running";

/* Anything a person might plausibly do first. Capture phase, so a handler
   further down that stops propagation cannot swallow the one chance. */
const UNBLOCK = ["pointerdown","pointerup","mousedown","click","keydown",
                 "touchstart","touchend","wheel","scroll"];

/* Every attempt is guarded, and the whole thing gives up after a while.

   Without the guard, a browser that refuses to construct an AudioContext at
   all throws here on every tick — four times a second, forever — and each one
   is an uncaught error. That is noise in the console at best, and on a page
   with an error reporter it looks exactly like the game has crashed when in
   fact it is running perfectly with no sound.

   audioTries stops the poll after roughly two minutes. If audio has not
   started by then it is not going to, and a permanent timer for a permanent
   failure is just a battery drain. */
let audioTries = 0;

function tryUnblock(){
  try {
    if (!actx) initAudio();
  } catch (e) {
    /* No Web Audio here. Stop asking; every sound in the game is optional. */
    if (audioWatch){ clearInterval(audioWatch); audioWatch = null; }
    UNBLOCK.forEach(ev => document.removeEventListener(ev, tryUnblock, true));
    audioWaiters.length = 0;
    return;
  }
  if (!actx) return;
  if (++audioTries > 480){          // ~2 minutes at 250 ms
    if (audioWatch){ clearInterval(audioWatch); audioWatch = null; }
    return;
  }
  if (actx.state === "suspended"){
    // nothing is chained to this — the poll is what decides we are running
    try { actx.resume(); } catch (e) {}
  }
  if (!audioRunning()) return;
  if (audioWatch){ clearInterval(audioWatch); audioWatch = null; }
  UNBLOCK.forEach(ev => document.removeEventListener(ev, tryUnblock, true));
  while (audioWaiters.length) (audioWaiters.shift())();
}

function startUnblocking(){
  if (audioWatch) return;
  UNBLOCK.forEach(ev =>
    document.addEventListener(ev, tryUnblock, { capture:true, passive:true }));
  audioWatch = setInterval(tryUnblock, 250);
  tryUnblock();
}

function whenAudioRunning(fn){
  if (audioRunning()) return fn();
  audioWaiters.push(fn);
  startUnblocking();
}

/* START THE TITLE IMMEDIATELY.

   The visual half never needed permission and runs the moment the screen
   exists. The audio queues behind whenAudioRunning() and arrives the instant
   the browser allows it — which, on a page the player has already clicked to
   reach, is usually straight away. */
function armTitle(){
  const t = $("titleScreen");
  if (!t || !t.classList.contains("show")) return;
  /* The visual half must survive the audio half failing entirely. A browser
     with no Web Audio at all should still get the glitches and the face. */
  try { initAudio(); } catch (e) {}
  titleScreenOn();
  startUnblocking();
}
$("btnRetry").onclick = clockIn;

addEventListener("keydown", e => {
  if (e.repeat) return;
  if (!S.running){
    if (e.key === "]") resetProgress();
    return;
  }
  if (e.key === "["){ winNight(); return; }
  /* TAB flips the plan between floors. preventDefault matters here: the tab
     key's normal job is to walk the focus ring through every camera button on
     the map, which both steals the key and leaves a focus outline sitting on a
     pin you did not choose. */
  if (e.key === "Tab"){
    /* The floor switch is part of the map, and the map only exists on the
       monitor. Flipping it from the office changed which plan you would see
       when you next raised the camera, with no feedback at the moment you
       pressed — so it read as the key doing nothing. preventDefault still
       runs, because letting tab walk the focus ring is worse. */
    e.preventDefault();
    if (S.monUp && !S.panelTab) toggleMapFloor();
    return;
  }
  const k = e.key.toLowerCase();
  if (k === " "){ e.preventDefault(); toggleMonitor(); }
  else if (k === "c") togglePanel();
  else if (k === "x") togglePower();
  else if (k === "f") playCue();
  else if (k === "m" && S.monUp) mountSensor(S.activeCam);
  else if (k === "b") toggleBot();
  else if (k === "d") toggleLastDoor();
  /* 1-5 work the doors from the keyboard, in DOOR_LINKS order, so holding a
     line does not cost you a trip to the map and back with the mouse. They do
     nothing unless the monitor is up, exactly like clicking a pin. */
  else if (k >= "1" && k <= "9"){
    const dl = DOOR_LINKS[Number(k) - 1];
    if (dl) toggleDoor(dl.id);
  }
});

/* ---------------------------------------------------------------------------
   REACHING FOR THINGS

   Bottom edge raises and lowers the monitor; right edge opens the panel. Both
   need the cursor to LEAVE the strip before they will fire again, otherwise
   resting there would strobe the monitor.
--------------------------------------------------------------------------- */
const EDGE = { inBottom:false, armedRight:true, lastX:null };

addEventListener("mousemove", e => {
  if (!S.running) return;

  if (TOUCH.used) return;                 // a finger is not a hover
  // A tenth of the screen was enough to swallow a reach for the power switch
  const nearBottom = e.clientY > innerHeight * 0.955;
  const nearRight  = e.clientX > innerWidth  * 0.94;

  /* Anything you might be reaching FOR is not part of the strip. The floorplan
     hangs into the bottom of the screen, and losing the monitor every time you
     go for one of the lower camera buttons was maddening. */
  /* The monitor button is deliberately NOT excluded: sliding down onto it
     should raise the cameras, which is what you were reaching for anyway. The
     power switch and the panel button are, because hitting those by accident
     is how you lose a night. */
  const overUI = !!(e.target && e.target.closest &&
    e.target.closest("#map, #floorBtn, #audioBtn, #sensorBtn, #camLabel, #panel, #powerBtn, #panelBtn"));

  document.body.classList.toggle("nearBottom", nearBottom && !overUI && !S.monUp && !S.panelOpen);
  document.body.classList.toggle("nearRight",  nearRight  && !overUI && !S.monUp && !S.panelOpen);

  // Fire on the CROSSING into the strip, and only over dead space. Sitting on
  // a button counts as "already inside", so sliding off it will not re-trigger.
  if (nearBottom && !EDGE.inBottom && !overUI) toggleMonitor();
  EDGE.inBottom = nearBottom || overUI;

  // right strip in the OFFICE opens the panel
  if (nearRight && !S.monUp && !overUI){
    if (EDGE.armedRight){ EDGE.armedRight = false; if (!S.panelTab) togglePanel(); }
  } else if (!nearRight) EDGE.armedRight = true;

  // stepping back off the page closes it — and aborts anything mid-cycle
  if (S.panelTab){
    const edge = innerWidth - el.panel.offsetWidth - 30;
    const movingRight = EDGE.lastX === null || e.clientX >= EDGE.lastX;
    if (e.clientX < edge && !movingRight) togglePanel();
  }
  EDGE.lastX = e.clientX;
});

/* Looking around. On a mouse the office follows the cursor; on a touch screen
   you drag it, because there is no hover to follow. */
function lookAt(fraction){
  const travel = el.officeScene.offsetWidth - innerWidth;
  el.officeScene.style.transform =
    "translateX(" + (-fraction*travel*CONFIG.officePan - travel*(1-CONFIG.officePan)/2) + "px)";
}

addEventListener("mousemove", e => {
  if (S.monUp || TOUCH.used) return;
  lookAt(e.clientX / innerWidth);
});

/* ---------------------------------------------------------------------------
   TOUCH

   Everything the mouse does by hovering needs a deliberate equivalent: drag to
   look, swipe up from the bottom for the monitor, swipe down to drop it, swipe
   in from the right edge for the panel. Every button is already a real button,
   so those need nothing.
--------------------------------------------------------------------------- */
/* Adopt the touch layout up front rather than waiting for the first tap, or
   the opening seconds are laid out for a mouse that will never arrive. */
if (matchMedia("(pointer:coarse)").matches || navigator.maxTouchPoints > 0)
  document.body.classList.add("touch");

const TOUCH = { used:false, x:0, y:0, look:0.5, moved:false, onUI:false };

addEventListener("touchstart", e => {
  TOUCH.used = true;
  document.body.classList.add("touch");
  const t = e.touches[0];
  TOUCH.x = t.clientX; TOUCH.y = t.clientY; TOUCH.moved = false;
  TOUCH.onUI = !!(e.target && e.target.closest &&
    e.target.closest("button, #map, #panel, .screen"));
}, {passive:true});

addEventListener("touchmove", e => {
  if (!S.running || TOUCH.onUI) return;
  const t = e.touches[0];
  const dx = t.clientX - TOUCH.x, dy = t.clientY - TOUCH.y;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) TOUCH.moved = true;

  // drag the room around when the monitor is down
  if (!S.monUp && Math.abs(dx) > Math.abs(dy)){
    TOUCH.look = Math.max(0, Math.min(1, TOUCH.look - dx / innerWidth * 1.4));
    TOUCH.x = t.clientX;
    lookAt(TOUCH.look);
  }
}, {passive:true});

addEventListener("touchend", e => {
  if (!S.running || TOUCH.onUI) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - TOUCH.x, dy = t.clientY - TOUCH.y;

  // a decisive vertical swipe raises or drops the monitor
  if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)){
    if (dy < 0 && !S.monUp) toggleMonitor();
    else if (dy > 0 && S.monUp){
      if (S.panelTab) togglePanel(); else toggleMonitor();
    }
    return;
  }
  // a swipe in from the right edge, while watching, turns to the panel
  if (S.monUp && !S.panelTab && dx < -60 && t.clientX > innerWidth * 0.55){
    togglePanel(); return;
  }

  /* Otherwise a horizontal swipe on a feed walks to the next camera. A phone
     cannot show a readable floorplan and a readable feed at once, so being able
     to step through them without aiming at a small pin is what makes this
     playable one-handed. */
  if (S.monUp && !S.panelTab && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)){
    /* Stepping through feeds stays on the floor you are LOOKING at, and skips
       anything Gordon has burned out. Swiping into a dead feed and having to
       swipe again is the sort of small betrayal that makes a control feel
       broken rather than difficult. */
    const ids = camIdsOn(S.mapFloor).filter(c => !camDead(c) || c === S.activeCam);
    if (ids.length){
      const i = ids.indexOf(S.activeCam);
      const step = dx < 0 ? 1 : -1;
      viewCam(i === -1 ? ids[0] : ids[(i + step + ids.length) % ids.length]);
    }
  }
}, {passive:true});

/* ===========================================================================
   10. MOVEMENT — the heart of it
   =========================================================================== */

function activeLure(){
  if (S.lure && performance.now() > S.lure.until) S.lure = null;
  return S.lure;
}

/* How persuasive a noise is from where this one is standing. Falls off a fixed
   fraction per room, so a sound two rooms away is a suggestion and a sound next
   door is close to an order. `strength` is what separates a deliberate cue from
   the incidental clatter of rebooting your own ventilation. */
function lureOdds(u, lure){
  const d = distFrom(u.node);
  const rooms = Math.min(...lure.nodes.map(t => d[t] === undefined ? 99 : d[t]));
  if (rooms > 6) return 0;
  return lure.strength * Math.pow(CONFIG.lureFalloff, rooms) * (1 - u.lureResist);
}

function setLure(nodes, strength, ms, camId, canRecallSloppy = false){
  S.lure = { nodes, strength, until:performance.now() + ms, cam:camId || null,
             canRecallSloppy };
}

function stepToward(from, targets){
  const opts = ADJ[from].filter(walkable);
  if (!opts.length) return from;
  let best = opts[0], bestD = Infinity;
  for (const o of opts){
    const d = distFrom(o);
    const v = Math.min(...targets.map(t => d[t] === undefined ? 99 : d[t]));
    if (v < bestD){ bestD = v; best = o; }
  }
  return best;
}

/* A pass-by isn't a single sidestep — it keeps walking. Two rooms of distance
   is what makes the powered-down gamble worth the air you lose taking it.

   THE CROSSING, AND WHY IT NEEDED ONE.

   `away` is every neighbour STRICTLY further from your office; `side` is every
   neighbour at the same distance or further. The loop prefers `away` and only
   falls back to `side` when `away` is empty.

   At a doorway that preference is fatal to the crossing animation. The other
   doorway is the only neighbour on the opposite wing, and it sits at exactly
   the same distance from you — so it lands in `side`, never in `away`. And
   `away` is never empty at either doorway: nDL always has n11, nDR always has
   n14 and n15. The result was that something at your left door retreated left
   one hundred percent of the time, and the cross-the-doorway animation could
   not physically play. Twenty thousand trials per door, zero crossings.

   So the crossing is now its own roll, taken before the walk rather than
   emerging from it. It is worth having as a mechanic and not just a picture:
   whichever door you had been watching is now the wrong one.

   Passing allowCross=false gives the old behaviour, which is what anything
   that is not a doorway pass-by wants. */
function retreatFrom(node, steps, allowCross){
  if (allowCross && DOOR_SIDE[node] && Math.random() < CONFIG.crossDoorChance){
    const sibling = ADJ[node].find(n => DOOR_SIDE[n] && n !== node);
    if (sibling){
      node = sibling;
      // One step is spent crossing, but never the last one — he has to end up
      // off the doorway, or he would be standing at your other door for free.
      steps = Math.max(1, steps - 1);
    }
  }
  for (let i = 0; i < steps; i++){
    const away = ADJ[node].filter(n => walkable(n) && DO[n] > DO[node]);
    const side = ADJ[node].filter(n => walkable(n) && DO[n] >= DO[node]);
    const opts = away.length ? away : (side.length ? side : ADJ[node].filter(walkable));
    if (!opts.length) break;
    node = pick(opts);
  }
  return node;
}

/* One step. This is the rule that defines the whole game: a weighted coin,
   not a guarantee. Win the roll and it closes a room; lose it and it goes
   sideways or back the way it came. */
/* Which doorway a node leads to. Nodes deeper in the building inherit the side
   of whichever door they're closest to, so footsteps pan sensibly all night. */
const SIDE_CACHE = {};
function sideOf(node){
  if (SIDE_CACHE[node]) return SIDE_CACHE[node];
  let best = "left", bestD = Infinity;
  for (const door in DOOR_SIDE){
    const d = distFrom(node)[door];
    if (d !== undefined && d < bestD){ bestD = d; best = DOOR_SIDE[door]; }
  }
  return (SIDE_CACHE[node] = best);
}

const exitSideOf = node => EXIT_SIDE[node] || sideOf(node);

const doorEl = side => side === "left" ? $("doorLeft") : $("doorRight");

/* Are you actually looking at this square right now? The panel counts as not
   looking — that is the whole point of putting it inside the monitor. */
function watchingNode(node){
  return S.monUp && !S.panelTab && S.sys.cam.ok &&
         CAMERAS[S.activeCam].sees.includes(node);
}

/* Someone is standing in the doorway. Show the sliver of them that clears the
   frame — this is peripheral vision, not a reveal. */
function applyDoorShot(img, u, side){
  const sh = doorShot(u, side);
  img.style.left   = sh.left + "%";
  img.style.bottom = sh.bottom + "%";
  img.style.width  = sh.width + "%";
  img.style.height = "auto";
  img.style.transform = shotTransform(sh, side === "right");
  const cT = sh.clipT || 0, cR = sh.clipR || 0, cB = sh.clipB || 0, cL = sh.clipL || 0;
  img.style.clipPath = (cT || cR || cB || cL)
    ? "inset(" + cT + "% " + cR + "% " + cB + "% " + cL + "%)" : "none";
}

function showLurker(u){
  const side = DOOR_SIDE[u.node];
  const box = doorEl(side);
  if (!box || box.classList.contains("walkby")) return;
  const img = box.querySelector(".lurker");
  if (!sprites[u.id] || sprites[u.id].dataset.ok !== "1") return;
  if (img.getAttribute("src") !== u.art) img.src = u.art;
  applyDoorShot(img, u, side);
  box.classList.add("present");
  /* The outage figure gets the eye flicker — the lights coming back for a
     fraction of a second at a time, on nothing you would want to see. */
  box.classList.toggle("jingle", !!S.outage);
}

function clearLurkers(){
  ["left","right"].forEach(s => {
    const b = doorEl(s);
    if (b && !b.classList.contains("walkby")) b.classList.remove("present","jingle");
  });
}

/* The pass-by. They cross the doorway and keep going, and you see all of it —
   which is the payoff for having cut the power and blinded yourself. */
function playWalkBy(u, fromNode){
  const side = DOOR_SIDE[fromNode];
  const destinationSide = exitSideOf(u.node);
  const box = doorEl(side);
  if (!box) return;
  const img = box.querySelector(".lurker");
  if (sprites[u.id].dataset.ok === "1" && img.getAttribute("src") !== u.art) img.src = u.art;
  applyDoorShot(img, u, side);

  box.classList.remove("present");
  box.classList.remove("exitLeft","exitRight");
  if (destinationSide === side)
    box.classList.add(destinationSide === "left" ? "exitLeft" : "exitRight");
  box.style.setProperty("--walkMs", CONFIG.walkByMs + "ms");
  void box.offsetWidth;                       // restart the animation
  box.classList.add("walkby");
  play(u.walkBySfx, { pan: side === "left" ? -0.6 : 0.6 });

  /* Something crossing your doorway drags the feeds down with it. The cameras
     cut to snow until it settles somewhere new — so if you are hiding on the
     monitor you get told it is moving, and nothing else. The animation runs on
     the office view regardless of what you are looking at, so dropping the
     monitor part-way through catches the rest of it. */
  S.transitUntil = performance.now() + CONFIG.walkByMs;

  setTimeout(() => box.classList.remove("walkby","exitLeft","exitRight"), CONFIG.walkByMs + 60);
}

/* SOMETHING HAS ARRIVED BESIDE YOU.

   The scrape belonged here rather than on the next tick of the breathing
   timer. That timer counted up from zero on a 2400 ms cycle, so a figure could
   be standing in your doorway — visible on the feed, visible in the office —
   for over two seconds of silence before the room said anything about it. You
   could be looking straight at it and still be waiting to be told. Now the
   arrival is heard as it happens, and the breathing carries on from there. */
function beginBreach(u){
  u.breaching = true; u.breachAcc = 0; u.commit = 0;
  u.darkTried = false;                  // one breaker roll per arrival, not per flick
  scrape(u);
  S.breathAcc = 0;

  /* Walking into an office that is ALREADY dark is the same coin as cutting it
     in her face — otherwise the roll would exist only for players who happened
     to still have the lights on, and sitting in the dark, which costs you the
     cameras, would be worth strictly less than nothing. */
  if (u.commitModel && !S.power) darkRoll(u);
}

/* The one chance the mains give you against her. Taken once per arrival. */
function darkRoll(u){
  if (u.darkTried) return false;
  u.darkTried = true;
  if (Math.random() >= SLOPPY.darkEscape) return false;
  const cameFrom = u.node;
  u.node = retreatFrom(u.node, CONFIG.passBySteps, true);
  u.breaching = false; u.breachAcc = 0; u.acc = 0;
  u.respite = tuned().respiteMs;
  playWalkBy(u, cameFrom);
  return true;
}

function oneStep(from, approach){
  const closer = ADJ[from].filter(n => walkable(n) && DO[n] === DO[from] - 1);
  const other  = ADJ[from].filter(n => walkable(n) && DO[n] >= DO[from]);
  if (Math.random() < approach) return closer.length ? pick(closer) : (other.length ? pick(other) : from);
  return other.length ? pick(other) : (closer.length ? pick(closer) : from);
}

/* A cue used to be a single coin flip on a single step, inside a window that
   barely covered one move — which is why it appeared to do nothing at all. Now
   a cue that lands sets a DESTINATION and he commits to it for a few moves.
   Fewer successes, but a success is worth crossing the building for. */
function lureSloppyFromDoor(u, lure){
  // This is deliberately an Sloppy-only emergency response. Eugene keeps
  // his existing doorway rules: audio cannot call him away once he is there.
  if (u.id !== "sloppy" || !u.commitModel || !u.breaching || !lure.canRecallSloppy)
    return false;

  const next = stepToward(u.node, lure.nodes);
  if (next === u.node) return false;  // a cue on her doorway cannot draw her away
  if (Math.random() >= lureOdds(u, lure)) return false;

  const was = u.node;
  u.node = next;                       // leave now — the doorway timer is too short to wait
  u.breaching = false; u.breachAcc = 0; u.commit = 0; u.acc = 0;
  u.lureTarget = lure.nodes;
  u.lureMoves = Math.max(0, CONFIG.lureCommitMoves - 1); // this departure is move one
  u.lastLure = performance.now();
  playWalkBy(u, was);
  footstep(u);
  pingSensor(u, was);
  if (u.moveTell && S.monUp) play(u.moveTell, { vol:0.55 });
  return true;
}

function offerLure(){
  const lure = activeLure();
  if (!lure) return;
  S.units.forEach(u => {
    if (lureSloppyFromDoor(u, lure)) return;
    if (u.lureMoves > 0) return;                    // already on his way
    if (Math.random() < lureOdds(u, lure)){
      u.lureTarget = lure.nodes;
      u.lureMoves  = u.commitModel ? CONFIG.lureCommitMoves : EUGENE.lureCommitMoves;
      u.lastLure   = performance.now();
    }
  });
}

function moveUnit(u){
  const T = tuned();
  // she barely wavers; he wanders
  const approach = u.commitModel
    ? SLOPPY.approach
    : Math.max(0, Math.min(1, T.approach + u.approachMod));
  const dbl      = Math.max(0, Math.min(1, T.doubleStep + u.doubleStepMod));

  // Already committed to a noise: keep walking toward it.
  if (u.lureMoves > 0 && u.lureTarget){
    u.node = stepToward(u.node, u.lureTarget);
    u.lureMoves--;
    if (u.lureTarget.includes(u.node)) u.lureMoves = 0;   // arrived
    if (DO[u.node] === 1) beginBreach(u);
    return;
  }

  // A weighted step: mostly toward you, sometimes not.
  u.node = oneStep(u.node, approach);

  // Sometimes it covers two rooms rather than one.
  if (DO[u.node] > 1 && Math.random() < dbl){
    u.node = oneStep(u.node, approach);
  }

  if (DO[u.node] === 1) beginBreach(u);
}

function stepUnits(dt){
  for (const u of S.units){

    if (u.respite > 0){ u.respite -= dt; continue; }

    // She arrived. That is the whole event — the pause is for you, not for her.
    if (u.breaching && u.commitModel){
      u.breachAcc += dt;
      if (u.breachAcc >= sloppyCfg().doorMs)
        return kill(u, u.name + " reached the door.");
      continue;
    }

    if (u.breaching){
      u.breachAcc += dt;
      if (u.breachAcc >= tuned().breachMs){
        // Lights on when the window closes: there is nothing to discuss.
        if (S.power) return kill(u, u.name + " walked into a lit office.");

        const frac = u.cutFrac === null ? 0 : u.cutFrac;
        const odds = Math.max(0, Math.min(1,
          CONFIG.passByFast - (CONFIG.passByFast - CONFIG.passBySlow) * frac + u.passByMod));

        if (Math.random() < odds){
          const cameFrom = u.node;
          u.node = retreatFrom(u.node, CONFIG.passBySteps, true);
          u.breaching = false; u.breachAcc = 0; u.acc = 0; u.cutFrac = null;
          u.respite = tuned().respiteMs;
          playWalkBy(u, cameFrom);
        } else {
          return kill(u, u.name + " found you in the dark.");
        }
      }
      continue;
    }

    // Being looked at holds some of them in place. This is the only reason
    // to sit on a camera rather than skim, and it costs you the audio cue.
    let tick = dt * u.speedMod;
    const seenNow = watchingNode(u.node);
    u.watchAcc = Math.max(0, Math.min(FATIGUE.fullMs,
      u.watchAcc + (seenNow ? dt : -dt * FATIGUE.recover)));

    if (u.watchStall > 0 && !S.doom && seenNow){
      const wear = u.watchAcc / FATIGUE.fullMs;                 // 0 fresh, 1 spent
      const effective = u.watchStall * (1 - (1 - FATIGUE.floor) * wear);
      tick *= (1 - effective);
      u.stalling = true;
    } else u.stalling = false;

    u.acc += tick;
    const paceMult = u.commitModel ? sloppyCfg().moveMult : 1;
    if (u.acc >= tuned().moveMs * paceMult * u.rhythm * u.jitter){
      u.acc = 0;
      u.jitter = 0.85 + Math.random() * 0.30;    // re-roll so they keep drifting

      // Some cycles it simply doesn't go anywhere. Early nights are mostly
      // this: something is in the building, and it is in no hurry.
      const idleHere = tuned().idleChance * (u.commitModel ? SLOPPY.idleMult : 1);
      if (Math.random() < idleHere) continue;

      const was = u.node;
      moveUnit(u);
      if (u.node !== was){
        // crossing the threshold from outside into the building
        if (GRAPH[was].outside && !GRAPH[u.node].outside) play(u.enterSfx);
        footstep(u);
        pingSensor(u, was);
        // Each of them leaks one bit of information per step, but only while
        // you are actually on the monitor. Eugene stutters the picture;
        // Sloppy is heard and not seen. Look away and you get neither.
        if (u.flickerOnMove){
          S.flicker = EUGENE.flickerMs;
          /* And the stutter is what wears the array out. Rolled only while the
             monitor is actually up, which is a deliberate restriction: he
             moves whether or not you are watching, and an array that could
             fault itself while you sat in the dark doing nothing would be
             exactly the arriving-on-a-timer weather this model replaced. The
             rule stays "a system breaks because you were using it". */
          if (S.monUp && !S.panelTab) rollCamFlicker("eugene");
        }
        if (u.moveTell && S.monUp) play(u.moveTell, { vol:0.55 });
      }
    }
  }
}

const unitsOn = node => S.units.filter(u => u.node === node);
const unitsSeenBy = camId => S.units.filter(u => CAMERAS[camId].sees.includes(u.node));

/* ===========================================================================
   10b. GORDON

   A state machine rather than a walker, because he does five different things
   and only two of them are walking:

     "wait"      downstairs, not yet started. His grace period.
     "down"      downstairs, walking to whichever duct is nearest
     "climbIn"   at the duct's lower square, going up. Visible, on that camera.
     "inDuct"    inside. On no camera, on neither floor, and unreachable.
     "climbOut"  at the duct's upper square, arriving. Visible.
     "up"        upstairs, walking to your office and nothing else
     "door"      in your doorway. This one has no exit.

   The three climb phases run on wall-clock time and they run whether or not
   anybody is watching, which is the whole reason they are phases at all: open
   the right camera halfway through and you catch him mid-climb, exactly as far
   along as he actually is. Nothing waits for an audience.
   =========================================================================== */

function gordonCfg(){
  if (S.night === 8) return customGordonCfg();
  const h = nightIdx();
  return {
    moveMs: GORDON.moveMs[h],
    doorMs: GORDON.doorMs[h],
    enterMs: GORDON.enterMs[h],
    breakMs: GORDON.breakMs[h]
  };
}

function spawnGordon(){
  if (S.night < GORDON.startNight && S.night !== 8) return null;
  const cfg = gordonCfg();
  if (!cfg || !cfg.moveMs) return null;               // disabled/not active
  return {
    ...GORDON,
    node: pick(GORDON.startNodes),
    phase: "wait",
    acc: 0,
    wait: cfg.enterMs * (0.85 + Math.random() * 0.3),
    duct: null,          // the one he is committed to
    phaseAcc: 0,
    penalty: 0,          // extra move time owed from walking into a door
    seenBySensor: false,
    /* He is deaf to cues and indifferent to being watched, and these two
       fields exist so that anything reading a unit generically still gets a
       sane answer out of him rather than undefined. */
    lureResist: 1, watchStall: 0, ghost: false
  };
}

/* The duct he is heading for, recomputed whenever he is free to reconsider.
   Committing to one and then re-checking it after every rebuff is what makes
   the door a lever instead of a wall: you do not stop him, you point him. */
function gordonRetarget(g){
  const found = chooseDuct(g.node, S.doorShut);
  g.duct = found;
  /* SEALED IN.
     Some door layouts have a single closed door that cuts him off from every
     duct at once — auditBuilding() names them at boot. Rather than forbid such
     doors, a total seal is treated as a delaying tactic: he walks to the door
     and throws himself at it until the array gives out. */
  g.sealed = !found;
  return g.duct;
}

/* HE HAS WALKED INTO THE CLOSED DOOR.

   Two completely different things can happen, and which one depends on the
   door rather than on a roll:

   AN ORDINARY DOOR rebuffs him. He loses blockPenalty and turns around, and
   there is a small chance the array jams doing it. The door survives and can
   be closed again — its value is that it POINTED him somewhere worse.

   A ONE-SHOT DOOR does not survive. He spends breakMs taking it apart, it is
   gone for the night, and he carries on exactly where he was going. Its value
   is not redirection, it is the minute he spent. No roll, no jam, and the rest
   of the array is untouched: you paid a door, you got a known number of
   seconds, and that is the whole transaction.

   Returns true if the door broke. */
function gordonHitsDoor(g, sealed){
  const id = S.doorShut;
  const dl = DOOR_BY_ID[id];
  if (!dl) return false;

  if (dl.oneShot){
    const ms = (gordonCfg() && gordonCfg().breakMs) || 0;
    S.doorBroken[id] = true;
    S.doorShut = null;
    /* Shown for a few seconds and then gone. It used to sit in the alert strip
       for the rest of the night, which is exactly the wrong trade: the fact is
       worth a shout at the moment it happens and worth nothing afterwards,
       because the map already shows the door struck through. */
    S.brokeMsg = { text:(dl.name || id) + " DESTROYED",
                   until: performance.now() + 4200 };
    /* Expressed as a multiple of his move interval because that is the unit
       the movement loop counts in — the arithmetic here turns an absolute
       number of milliseconds into the same thing. */
    g.penalty = ms / Math.max(1, gordonCfg().moveMs);
    g.acc = 0; g.telled = false;
    play("doorBreak", { vol: 1.0 });
    trackGameEvent("door_broken", { night_number:S.night, door:id });
    return true;
  }

  play("doorBlocked", { vol: sealed ? 1.0 : 0.9 });
  g.penalty = GORDON.blockPenalty;
  rollDoorJam(sealed);
  return false;
}

/* Whichever end of the closed door he can still reach, or null if the shut
   door is nowhere near him. */
function sealSideNode(from, shutId){
  const d = DOOR_BY_ID[shutId];
  if (!d) return null;
  const reach = distFromBlocked(from, shutId);
  if (reach[d.a] !== undefined) return d.a;
  if (reach[d.b] !== undefined) return d.b;
  return null;
}

function gordonBeginClimb(g){
  g.phase = "climbIn";
  g.phaseAcc = 0;
  play("ductIn", { vol: 0.9 });
  /* The sensor sees him leave, if you had it pointed at the right room. That
     is the last thing it can ever tell you about him — there is no sensor on
     the floor he is going to that will pick him up again. */
  if (S.sensorOn && CAMERAS[S.sensorOn].sees.includes(g.node) && S.sensorAcc <= 0)
    play(g.chirp || "sensorC");
}

/* One downstairs step. Returns nothing; everything is on g. */
function gordonStepDown(g){
  const target = g.duct || gordonRetarget(g);

  /* WALLED IN COMPLETELY. He goes to the door and works on it. Every attempt
     rolls the jam at much better odds than an ordinary rebuff, because this is
     not him blundering into a door on his way past — it is the only thing left
     for him to do, and he has all night. */
  if (!target){
    const at = sealSideNode(g.node, S.doorShut);
    if (!at) return;                          // nothing reachable to hit
    if (g.node !== at){
      const step = stepTowardBlocked(g.node, at, S.doorShut);
      if (step !== g.node){ g.node = step; gordonFootstep(g); gordonPingSensor(g); }
      return;
    }
    gordonHitsDoor(g, true);
    return;
  }

  if (g.node === target.down) return gordonBeginClimb(g);

  /* THE STRAY STEP, rolled before the purposeful one so it can override it. */
  if (Math.random() < GORDON.strayChance){
    const wander = ADJ[g.node].filter(n =>
      walkable(n) && !edgeShut(g.node, n, S.doorShut) && floorOf(n) === 2);
    if (wander.length){
      g.node = pick(wander);
      gordonFootstep(g);
      gordonPingSensor(g);
      if (g.node === target.down) gordonBeginClimb(g);
      return;
    }
  }

  const next = stepTowardBlocked(g.node, target.down, S.doorShut);

  /* THE REBUFF.

     stepTowardBlocked already refuses to walk through a shut door, so a step
     that comes back unchanged means every route onward is sealed. He does not
     stand there: he turns around, eats a penalty, and picks a different duct —
     which is the pendulum the door array is for. */
  if (next === g.node){
    /* A one-shot door does not turn him around — he goes through the space it
       used to occupy, just a long time later. Only an ordinary rebuff costs
       him ground. */
    if (gordonHitsDoor(g, false)) return;
    g.node = stepAwayFrom(g.node, target.down, S.doorShut);
    gordonRetarget(g);
    gordonFootstep(g);
    return;
  }

  g.node = next;
  gordonFootstep(g);
  gordonPingSensor(g);
  if (g.node === target.down) gordonBeginClimb(g);
}

/* One upstairs step. No wandering, no idling, no second-guessing: the shortest
   path to your office, one room at a time, forever. */
function gordonStepUp(g){
  if (DO[g.node] === 1) return;               // already there
  const next = stepToward(g.node, ["OFFICE"]);
  if (next === g.node) return;
  g.node = next;
  gordonFootstep(g);
  gordonPingSensor(g);
  if (DO[g.node] === 1){
    g.phase = "door";
    g.phaseAcc = 0;
    scrape(g);
    S.breathAcc = 0;
  }
}

function gordonPingSensor(g){
  if (!S.sensorOn || S.sensorAcc > 0) return;
  const inNow = CAMERAS[S.sensorOn].sees.includes(g.node);
  if (inNow && !g.seenBySensor) play(g.chirp || "sensorC");
  g.seenBySensor = inNow;
}

function stepGordon(dt){
  const g = S.gordon;
  if (!g || S.outage) return;
  const cfg = gordonCfg();

  switch (g.phase){

    case "wait":
      g.wait -= dt;
      if (g.wait <= 0){ g.phase = "down"; g.acc = 0; gordonRetarget(g); }
      return;

    /* The three climb phases. Each is a fixed stretch of real time and none of
       them can be interrupted — no door reaches him inside a duct, and neither
       does anything else. */
    case "climbIn":
      g.phaseAcc += dt;
      if (g.phaseAcc >= GORDON.climbInMs){
        g.phase = "inDuct"; g.phaseAcc = 0;
        play("ductCrawl", { vol: 0.85 });
      }
      return;

    case "inDuct":
      g.phaseAcc += dt;
      if (g.phaseAcc >= GORDON.inDuctMs){
        g.phase = "climbOut"; g.phaseAcc = 0;
        g.node = g.duct.up;                   // he is upstairs from this instant
        /* The loudest thing he does, and the only unambiguous one. Wherever
           you are and whatever you are looking at, this means the floor you
           are sitting on now has him on it. */
        play("ductOut", { vol: 1.0 });
        g.seenBySensor = false;
      }
      return;

    case "climbOut":
      g.phaseAcc += dt;
      if (g.phaseAcc >= GORDON.climbOutMs){
        g.phase = "up"; g.phaseAcc = 0; g.acc = 0;
        gordonPingSensor(g);
      }
      return;

    /* In the doorway. There is no roll here, no cue that reaches him, and the
       lights make no difference: the only variable left is the clock, and
       whether six o'clock arrives before this timer does. */
    case "door":
      g.phaseAcc += dt;
      if (g.phaseAcc >= cfg.doorMs) return kill(g, "GORDON reached the door.");
      return;

    case "down":
    case "up": {
      g.acc += dt;
      const mult = (g.phase === "up" ? GORDON.upMult : 1) * (1 + g.penalty);
      const interval = cfg.moveMs * mult;

      /* THE TELL. He shifts his weight before he moves, and you hear it
         wherever you are. This is the only cue in the game that reports
         something ABOUT to happen — everything else tells you afterwards — and
         it is what makes listening for him worth more than watching for him. */
      if (!g.telled && g.acc >= interval - GORDON.tellMs){
        g.telled = true;
        gordonTell(g);
      }

      if (g.acc >= interval){
        g.acc = 0;
        g.telled = false;
        g.penalty = 0;                        // a penalty is paid once
        if (g.phase === "down") gordonStepDown(g);
        else gordonStepUp(g);
      }
      return;
    }
  }
}

/* ---------------------------------------------------------------------------
   WHAT LOOKING AT HIM COSTS

   An upstairs feed cannot hold him. Put him on screen and the picture starts
   to go, and if you stay on it long enough it tears itself apart and that
   camera is gone for the rest of the night — not faulted, not rebootable,
   gone.

   This is the only place in the game where finding something is punished, and
   it is what stops him from being a problem you solve once by parking on the
   right camera. You are allowed to confirm where he is. You are not allowed to
   watch him walk.

   It applies UPSTAIRS ONLY. The lower floor is where you are supposed to be
   tracking him, and burning out the basement feeds would take away the only
   information the door array is playable with.
--------------------------------------------------------------------------- */
function stepCamBurn(dt){
  const g = S.gordon;
  const node = gordonVisibleNode();
  const cam = S.activeCam;

  const watching = g && node && floorOf(node) === 1 &&
                   S.monUp && !S.panelTab && S.sys.cam.ok && !S.outage &&
                   !camDead(cam) && (CAMERAS[cam].sees || []).includes(node);

  if (!watching){
    // it recovers, but only about half as fast as it burns
    S.burnAcc = Math.max(0, (S.burnAcc || 0) - dt * 0.5);
    S.burnCam = S.burnAcc > 0 ? S.burnCam : null;
    return;
  }

  if (S.burnCam !== cam){ S.burnCam = cam; S.burnAcc = 0; }
  S.burnAcc = (S.burnAcc || 0) + dt;

  if (S.burnAcc >= GORDON.camBurnMs){
    S.deadCams[cam] = true;
    S.burnAcc = 0; S.burnCam = null;
    play("camBurn");
    trackGameEvent("camera_burned", { night_number:S.night, camera:cam });
    /* You are not thrown off the monitor — you are left holding a dead feed,
       which is worse and more informative. Switch away yourself. */
    drawSubjects(true);
  }
}

const camDead = id => !!S.deadCams[id];

/* How far gone the picture is on the feed currently being burned, 0 to 1. The
   renderer hangs the tearing effect on this. */
function camBurnFrac(){
  if (!S.burnCam || S.burnCam !== S.activeCam) return 0;
  return Math.max(0, Math.min(1, (S.burnAcc || 0) / GORDON.camBurnMs));
}

/* WHERE HE IS SHOWN.

   During a climb he is drawn on the square he is climbing at, so the feed
   covering that room has him in it for the whole phase. Inside the duct he is
   nowhere and no camera has him — which is the only time all night he is not
   findable, and it is deliberately the moment you most want to look. */
function gordonVisibleNode(){
  const g = S.gordon;
  if (!g) return null;
  if (g.phase === "wait" || g.phase === "inDuct") return null;
  if (g.phase === "climbIn")  return g.duct ? g.duct.down : g.node;
  return g.node;
}

/* How far through a climb he is, 0 to 1, for the rise-and-fade transform.
   Returns null when he is not climbing. */
function gordonClimbProgress(){
  const g = S.gordon;
  if (!g) return null;
  if (g.phase === "climbIn")  return Math.min(1, g.phaseAcc / GORDON.climbInMs);
  if (g.phase === "climbOut") return 1 - Math.min(1, g.phaseAcc / GORDON.climbOutMs);
  return null;
}

/* ===========================================================================
   11. SYSTEMS, AIR, CLOCK
   =========================================================================== */

/* ---------------------------------------------------------------------------
   WEAR

   S.wear counts USES SINCE THE LAST FAULT, one counter per system. The chance
   of the next use breaking something is base + step * wear, capped at max, and
   a fault puts that system's counter back to zero.

   Everything goes through rollFault() so there is exactly one place where a
   system can be taken away from you, and exactly one place to instrument if a
   night ever feels like it is faulting for reasons nobody can name.
--------------------------------------------------------------------------- */
function canFault(id){
  const s = S.sys[id];
  return S.running && !S.outage && s && s.ok && s.reboot === 0 &&
         performance.now() >= s.safeUntil;
}

function faultSystem(id){
  if (!canFault(id)) return false;
  S.sys[id].ok = false;
  S.wear[id] = 0;
  /* A JAMMED ARRAY CANNOT HOLD WHAT IT WAS HOLDING. The door you had shut
     springs open with the rest — which is what stops a door that seals him off
     entirely from being a way to win the night by pressing one button. */
  if (id === "door" && S.doorShut){
    S.doorShut = null;
    play("doorOpen");
  }
  playSystemFault(id);
  return true;
}

/* spec is one of the tables in FAULTS; scale multiplies the final chance and
   is how the per-second rolls are made frame-rate independent. */
function rollFault(id, spec, scale){
  if (!canFault(id)) return false;
  const h = authoredSettingNightIndex();
  const wear = S.wear[id] || 0;
  const chance = Math.min(spec.max[h], spec.base[h] + spec.step[h] * wear) *
                 (scale === undefined ? 1 : scale);
  if (chance <= 0) return false;

  if (Math.random() < chance) return faultSystem(id);
  /* It held. The next one is worse — and for the per-second rolls the counter
     advances a fraction of a use per frame, so a second in the dark is one
     step of the ramp however the frames happen to land. */
  S.wear[id] = wear + (scale === undefined ? 1 : scale);
  return false;
}

/* --- the four things that can break something ---------------------------- */

/* THE RELAY. Rolled AFTER the cue is placed and its effect has been offered to
   everything in the building, so a relay that dies on this press still did the
   job you pressed it for. */
const rollAudioCue = () => rollFault("audio", FAULTS.audio);

/* THE ARRAY, from either flicker. Both share S.wear.cam. */
const rollCamFlicker = src =>
  rollFault("cam", src === "feed" ? FAULTS.camFeed : FAULTS.camEugene);

/* THE DOOR ARRAY. Only ever called when Gordon walks into a closed door. */
/* sealed multiplies the odds: he is not passing by, he is working on it. */
const rollDoorJam = sealed =>
  rollFault("door", FAULTS.door, sealed ? FAULTS.door.sealedMult : undefined);

/* ---------------------------------------------------------------------------
   THE BAR

   Draw is recomputed from scratch every frame rather than accumulated, so the
   readout can never drift away from what is actually being spent, and adding a
   consumer later means adding one line here and nowhere else.
--------------------------------------------------------------------------- */
function powerMult(){
  return POWER.nightMult[authoredSettingNightIndex()];
}

function currentDraw(){
  if (!S.running || S.outage) return 0;
  const d = POWER.drain;
  let sum = 0;
  if (S.power)            sum += d.lights;
  if (S.monUp)            sum += d.monitor;
  if (S.panelTab)         sum += d.panel;
  if (S.doorShut)         sum += d.door;
  return sum * powerMult();
}

/* What one press of the cue costs. Scaled by the night like everything else. */
const lureCost = () => POWER.drain.lure * powerMult();

/* HOW MANY BARS ARE LIT.

   Built from the same drain figures the bar itself is spending, with the night
   multiplier divided back out — see POWER.barUnit. Anything not currently
   switched on contributes nothing, so sitting in the dark with the monitor down
   reads as genuinely empty rather than as "low". */
function usageBars(){
  if (!S.running || S.outage) return 0;
  const d = POWER.drain;
  let raw = 0;
  if (S.power)    raw += d.lights;
  if (S.monUp)    raw += d.monitor;
  if (S.panelTab) raw += d.panel;
  if (S.doorShut) raw += d.door;
  let bars = Math.ceil(raw / POWER.barUnit);
  if (S.lureSpike > 0) bars += POWER.lureSpikeBars;
  return Math.max(0, Math.min(POWER.maxBars, bars));
}

function spendPower(amount){
  if (!S.running || S.outage) return;
  S.pw = Math.max(0, S.pw - amount);
}

function stepPower(dt){
  if (S.lureSpike > 0) S.lureSpike = Math.max(0, S.lureSpike - dt);
  if (S.brokeMsg && performance.now() > S.brokeMsg.until) S.brokeMsg = null;
  if (S.outage) return;
  S.draw = currentDraw();
  spendPower(S.draw * (dt / 1000));

  /* Two warnings a night at most: one at a quarter left, one at whatever
     POWER.warnAt is set to. They fire once each and never again. */
  const marks = [25, POWER.warnAt];
  marks.forEach((m, i) => {
    const bit = 1 << i;
    if (S.pw <= m && !(S.pwWarned & bit)){
      S.pwWarned |= bit;
      play("powerWarn");
    }
  });

  if (S.pw <= 0) beginOutage();
}

/* ---------------------------------------------------------------------------
   SITTING IN THE DARK

   One roll per second while the lights are off, on a ramp that only starts
   once the grace has run out. darkAcc is time in the dark THIS EPISODE and it
   resets the moment the lights come back, so answering a door costs nothing
   and the ramp is only ever climbed by someone who is hiding.

   The wear counter climbs alongside it, which means darkness compounds twice:
   the per-second chance rises with the ramp, and the system's own counter
   rises with every second that gets away with it.
--------------------------------------------------------------------------- */
function stepDarkVent(dt){
  if (S.power || S.outage){ S.darkAcc = 0; return; }
  S.darkAcc = (S.darkAcc || 0) + dt;

  const V = FAULTS.ventDark;
  const inGrace = S.darkAcc < V.graceMs;
  const scale = (dt / 1000) * (inGrace ? V.graceScale : 1);

  /* Beyond the grace the ramp is carried by the wear counter, which rollFault
     already advances by `scale` per call — so a second past the grace is a
     full step and a second inside it is a twelfth of one. */
  rollFault("vent", V, scale);
}

function stepSystems(dt){
  for (const id in S.sys){
    const s = S.sys[id];
    if (s.reboot > 0){
      s.reboot -= dt;
      if (s.reboot <= 0){
        s.reboot = 0; s.ok = true;
        s.safeUntil = performance.now() + FAULTS.graceMs;
        blip();
      }
    }
  }

  stepDarkVent(dt);

  /* Air freezes during an outage. It does not make physical sense — the fans
     are dead, so it should be draining faster than ever — but an outage is
     already a fixed sentence with its own clock, and stacking a suffocation
     timer underneath it would only mean dying of the wrong thing first. The
     ending you get should be the one the game has been building toward. */
  if (!S.outage){
    const ventOk = S.sys.vent.ok;
    S.o2 += (ventOk ? CONFIG.o2Regen : -CONFIG.o2Drain) * (dt / 1000);
    S.o2 = Math.max(0, Math.min(100, S.o2));

    // Running out of air does NOT kill you. It puts you on the floor, which is
    // far worse: you are still alive, still findable, and can do nothing at all.
    if (S.o2 <= 0 && !S.passedOut) passOut();
  }
}

/* ---------------------------------------------------------------------------
   THINGS THAT ARE NOT THERE

   A figure resolves in a room, stands for a moment, and is gone. It is not on
   the graph, it cannot hurt you, and it never appears in a doorway — the two
   squares that matter always tell the truth.

   The point is to spend your attention. By night six you cannot trust a glimpse
   and have to actually check, which costs the seconds you needed elsewhere.
   Night one has none at all, so the rules are learned clean first.
--------------------------------------------------------------------------- */
const HALLUCINATION = {
  gapMs:  [0, 52000, 36000, 26000, 18000, 12000, 3000],
  jitter: 0.5,
  holdMs: 4150,
  all20GapMs: 7000,
  all20DoorGapMs: 13500,
  all20DoorHoldMs: 2800
};

function hallucinationGap(){
  const g = all20Mode() ? HALLUCINATION.all20GapMs
                        : HALLUCINATION.gapMs[authoredSettingNightIndex()];
  if (!g) return 0;
  const jitter = all20Mode() ? 0.42 : HALLUCINATION.jitter;
  return g * (1 - jitter + Math.random() * jitter * 2);
}

function hallucinationWhoForFloor(floor){
  const choices = floor === 2
    ? [GORDON, JEFFREY]
    : [...ROSTER, ...(all20Mode() ? [GORDON, JEFFREY] : [])];
  const live = choices.filter(a => sprites[a.id] && sprites[a.id].dataset.ok === "1");
  return live.length ? pick(live) : null;
}

function createHallucination(node, who, camId){
  const shot = shotFor(who, node, camId);
  const s = document.createElement("img");
  s.className = "subject hallucination";
  s.src = who.art; s.alt = "";
  s.style.left = shot.left + "%";
  s.style.bottom = shot.bottom + "%";
  s.style.width = shot.width + "%";
  s.style.height = "auto";
  s.style.transform = shotTransform(shot);
  s.style.filter = "grayscale(.6) contrast(1.1) brightness(" + (0.65 * shot.dim) + ")";
  const cT = shot.clipT || 0, cR = shot.clipR || 0, cB = shot.clipB || 0, cL = shot.clipL || 0;
  if (cT || cR || cB || cL)
    s.style.clipPath = "inset(" + cT + "% " + cR + "% " + cB + "% " + cL + "%)";
  const hold = all20Mode() ? 2500 : HALLUCINATION.holdMs;
  s.style.animationDuration = hold + "ms";
  el.camPan.appendChild(s);
  setTimeout(() => s.remove(), hold + 80);
}

function createDoorHallucination(side, who){
  const box = doorEl(side);
  const img = box && box.querySelector(".hallucLurker");
  if (!box || !img || !sprites[who.id] || sprites[who.id].dataset.ok !== "1") return;
  img.src = who.art;
  applyDoorShot(img, who, side);
  img.style.animationDuration = HALLUCINATION.all20DoorHoldMs + "ms";
  box.classList.add("halluc-present");
  img.classList.remove("halluc-fade");
  void img.offsetWidth;
  img.classList.add("halluc-fade");
  setTimeout(() => {
    box.classList.remove("halluc-present");
    img.classList.remove("halluc-fade");
  }, HALLUCINATION.all20DoorHoldMs + 80);
}

function stepHallucination(dt){
  if (!S.hallucAcc && !all20Mode()) return;
  if (S.hallucAcc > 0) S.hallucAcc -= dt;

  if (all20Mode() && !S.monUp && !S.panelTab && S.power && !S.outage && !S.doom){
    S.all20DoorAcc -= dt;
    if (S.all20DoorAcc <= 0){
      S.all20DoorAcc = HALLUCINATION.all20DoorGapMs * (0.65 + Math.random() * 0.7);
      const realDoors = S.units.some(u => u.breaching) || (S.gordon && S.gordon.phase === "door");
      if (!realDoors){
        const who = hallucinationWhoForFloor(1);
        if (who) createDoorHallucination(Math.random() < 0.5 ? "left" : "right", who);
      }
    }
  } else if (!all20Mode()) {
    S.all20DoorAcc = 0;
  }

  if (S.hallucAcc > 0) return;
  S.hallucAcc = hallucinationGap();
  if (!S.monUp || S.panelTab || !S.sys.cam.ok || S.doom) return;
  if (camDead(S.activeCam) || S.outage) return;
  const cam = CAMERAS[S.activeCam];
  const floor = camFloor(S.activeCam);
  const spots = (cam.sees || []).filter(n =>
    floorOf(n) === floor && DO[n] !== 1 && !unitsOn(n).length
  );
  if (!spots.length) return;
  const node = pick(spots);
  const who = hallucinationWhoForFloor(floor);
  if (!who) return;
  createHallucination(node, who, S.activeCam);
}

/* ---------------------------------------------------------------------------
   JEFFREY, IN FOUR PARTS

   He can only appear on a feed you are watching, so his clock only runs while
   you are watching one. He picks the camera you are ON — there is no searching
   for him and no warning, and the answer is always the same: any other camera.
--------------------------------------------------------------------------- */
function jeffreyCfg(){
  if (S.night === 8) return customJeffreyCfg();
  const i = nightIdx();
  return { firstMs:JEFFREY.firstMs[i], gapMs:JEFFREY.gapMs[i], showMs:JEFFREY.showMs[i] };
}

function jeffreyGap(){
  const cfg = jeffreyCfg();
  if (!cfg) return Infinity;
  const g = cfg.gapMs;
  return g * (1 - JEFFREY.jitter + Math.random() * JEFFREY.jitter * 2);
}

function showJeffrey(){
  if (jeffreySprite.dataset.ok !== "1") return;
  const img = $("jeffreyArt");
  if (img.getAttribute("src") !== JEFFREY.art) img.src = JEFFREY.art;
  img.classList.add("on");
}
function hideJeffrey(){ $("jeffreyArt").classList.remove("on"); }

/* A feed hidden behind snow is not a fair place to begin or advance a Jeffrey
   attack. This covers Eugene's movement stutter, a doorway crossing, and
   the random dropout on an unstable feed. */
function feedCoveredByStatic(){
  const cam = CAMERAS[S.activeCam];
  return S.flicker > 0 || performance.now() < S.transitUntil ||
         (!!cam && cam.unstable && S.dropout);
}

/* You have just opened a feed. If he is armed, he was already standing in it.
   Called from viewCam, which fires both when you change camera and when you
   raise the monitor onto one — opening a feed is opening a feed. */
/* WHERE AND WHEN JEFFREY IS ALLOWED TO BE.

   TWO RULES, both about keeping him a problem of the UPPER floor.

   He never appears on a lower-floor feed. Down there you are tracking one
   thing, and tracking it is slow, deliberate work with the door array — having
   him jump you mid-sweep would turn the one part of the game that rewards
   patience into the part that punishes it.

   And he stops entirely once Gordon is upstairs. From that moment the night
   has exactly one question in it and a fixed number of seconds to answer it;
   anything that takes the camera system away in that window is not tension, it
   is a coin flip on top of a countdown. He has had the whole night to be a
   nuisance. Once the clock is real he is done. */
function jeffreyAllowed(camId){
  if (camFloor(camId) !== 1) return false;
  const g = S.gordon;
  if (g && (g.phase === "up" || g.phase === "door" || g.phase === "climbOut"))
    return false;
  return true;
}

function jeffreyOnEntry(){
  if (!S.jeffreyArmed || S.jeffrey || S.jeffreyScare > 0) return;
  if (!S.monUp || S.panelTab || !S.sys.cam.ok || !S.power) return;
  if (S.doom || S.passedOut > 0 || rebootActive()) return;
  if (JEFFREY.blockedFeeds.includes(S.activeCam)) return;
  if (!jeffreyAllowed(S.activeCam)) return;

  /* STATIC NO LONGER KEEPS HIM OUT — it only stops the clock.

     It used to block his arrival outright, which meant opening a feed while it
     happened to be snowing was a free pass: he did not spawn, and by the time
     the picture came back the moment had gone. That rewarded the one thing the
     player has no control over.

     He can now be standing there behind the snow. What static still does is
     pause his timer — see stepJeffrey — so the seconds you cannot see him are
     seconds he does not gain. You get the whole window, starting from the
     moment the picture actually resolves. */
  /* Not the feed you just fled him on. Going back to it a second later and
     finding him standing there again would read as the game following you
     rather than as him being somewhere. He stays armed, so the next OTHER
     camera still has him. */
  if (JEFFREY.noRepeatFeed && S.jeffreyLeft === S.activeCam) return;
  S.jeffreyArmed = false;
  S.jeffreyLeft = null;                 // one feed is blocked at a time, not forever
  S.jeffrey = { at:S.activeCam, acc:0 };
  showJeffrey();
  play("jeffreyIn");
}

function stepJeffrey(dt){
  const jcfg = jeffreyCfg();
  if (!jcfg) return;
  // his frame is up: hold it, then hand the office back
  if (S.jeffreyScare > 0){
    S.jeffreyScare -= dt;
    if (S.jeffreyScare <= 0){
      S.jeffreyScare = 0;
      el.scare.classList.remove("show");
      /* Nothing to arm here any more. He always faults the ventilation, so the
         office lights are already pulsing for that reason by the time this
         frame clears — one warning with one meaning, rather than two patterns
         that look identical and are caused by different things. */
    }
    return;
  }

  const canSee = S.monUp && !S.panelTab && S.sys.cam.ok && S.power && !S.outage &&
                 !camDead(S.activeCam) &&
                 !S.doom && S.passedOut <= 0 && !rebootActive() &&
                 !feedCoveredByStatic();

  if (S.jeffrey){
    // changed camera, or lost the picture some other way: he is gone
    if (S.activeCam !== S.jeffrey.at || !S.sys.cam.ok || S.panelTab){
      S.jeffreyLeft = S.jeffrey.at;
      S.jeffrey = null; hideJeffrey();
      S.jeffreyAcc = jeffreyGap();
      return;
    }
    // dropped the monitor with him still on it: that is the same as staying
    if (!S.monUp) return jeffreyTakes();
    /* Snow conceals the picture, so it also pauses the time you have to react.
       This is the other half of letting him arrive behind static: he can be
       there before you can see him, and none of that counts against you. */
    if (feedCoveredByStatic()) return;
    S.jeffrey.acc += dt;
    if (S.jeffrey.acc >= jcfg.showMs) return jeffreyTakes();
    return;
  }

  /* The clock runs while you are on the cameras and arms him when it expires.
     Nothing appears at that moment — he is simply now somewhere, and you find
     out which feed by opening one. */
  if (!canSee || S.jeffreyArmed) return;
  S.jeffreyAcc -= dt;
  /* Arming stops too, not just appearing — otherwise he would be waiting the
     instant Gordon reached the doorway and you survived it. */
  if (S.jeffreyAcc <= 0 && jeffreyAllowed(S.activeCam)) S.jeffreyArmed = true;
}

/* He takes the frame. Nobody dies: you lose systems, and he leaves a noise in
   your office that the two who DO kill you can hear. */
function jeffreyTakes(){
  S.jeffreyLeft = S.jeffrey ? S.jeffrey.at : null;
  S.jeffrey = null; hideJeffrey();
  S.jeffreyAcc = jeffreyGap();
  S.jeffreyArmed = false;
  S.jeffreyScare = JEFFREY.scareMs;

  el.scareArt.onerror = () => el.scare.innerHTML =
    '<div class="ph" style="border:none">' + JEFFREY.name + '<br>' + JEFFREY.scare + '</div>';
  el.scareArt.src = JEFFREY.scare;
  el.scare.classList.add("show");
  play("jeffreyHit");

  // you come out of it in the office, not on the cameras
  if (S.monUp) toggleMonitor();

  /* WHAT HE COSTS YOU: the camera system, because he came in through it, and
     the VENTILATION, every time, on every night.

     The ventilation is the important half. A vent fault already pulses the
     office lights and already starts the air draining, so his visit now
     announces itself with the building's own warning rather than with a
     bespoke light flicker that meant nothing else — that dedicated pulse has
     been removed, and CONFIG.jeffreyWarningLightMs with it. One warning, one
     meaning: the lights are breathing because the fans are down.

     It also gives him a real cost for the first time. He used to be two
     systems and a noise; he is now two systems, a noise, and a clock on your
     air that you have to go and stop. */
  const hit = ["cam", "vent"];
  hit.forEach(id => {
    const s = S.sys[id];
    const wasOk = s.ok;
    s.ok = false; s.reboot = 0; s.total = 0; s.safeUntil = 0;
    S.wear[id] = 0;                    // he does not wear it out, he breaks it
    if (wasOk) playSystemFault(id);
  });

  // and the noise, pointed at exactly where you are sitting
  setLure(["OFFICE"], JEFFREY.lure, JEFFREY.lureMs);
  offerLure();
}

const AMBIENCE = ["ambBox","ambKnock","ambCreak","ambPipes","ambSigh",
                  "ambDoor","ambDrip","ambChair","ambFloor","ambDistant"];

const ALL20_THREAT_SOUNDS = {
  eugene:["enterA","walkByA","stepClose"],
  sloppy:["enterB","walkByB","tellB"],
  gordon:["gordonTell","gordonStepConcrete","gordonStepCarpet","gordonStepTile"],
  jeffrey:["jeffreyIn"]
};

function stepAll20Sounds(dt){
  if (!all20Mode() || S.outage || S.doom || S.passedOut > 0) return;
  S.all20SoundAcc -= dt;
  if (S.all20SoundAcc > 0) return;
  S.all20SoundAcc = 8500 + Math.random() * 9500;
  const live = ["eugene","sloppy","gordon","jeffrey"].filter(id =>
    id === "gordon" ? !!S.gordon : id === "jeffrey" ? !!jeffreyCfg() : customLevel(id) > 0
  );
  if (!live.length) return;
  const names = ALL20_THREAT_SOUNDS[pick(live)];
  if (names && names.length)
    play(pick(names), { vol:0.20 + Math.random()*0.18, pan:Math.random()*1.2-0.6, rate:0.94+Math.random()*0.12 });
}

function stepAll20Laugh(dt){
  if (!all20Mode() || S.outage || S.doom || S.passedOut) return;
  S.all20LaughAcc -= dt;
  if (S.all20LaughAcc > 0) return;
  S.all20LaughAcc = 14500 + Math.random() * 12500;
  play("all20Laugh", { vol:0.72 + Math.random() * 0.18, pan:Math.random() * 1.0 - 0.5 });
}

function stepAll20OfficeFlicker(dt){
  if (!all20Mode() || S.outage || S.monUp || S.panelTab || !S.power || S.passedOut > 0 || S.doom){
    if (S.all20LightHold <= 0) document.body.classList.remove("all20-office-flicker");
    return;
  }
  if (S.all20LightHold > 0){
    S.all20LightHold -= dt;
    if (S.all20LightHold <= 0){
      S.all20LightHold = 0;
      document.body.classList.remove("all20-office-flicker");
      S.all20LightAcc = 15000 + Math.random()*18000;
    }
    return;
  }
  S.all20LightAcc -= dt;
  if (S.all20LightAcc <= 0){
    S.all20LightHold = 350 + Math.random()*750;
    document.body.classList.add("all20-office-flicker");
  }
}

function stepAmbience(dt){
  S.ambAcc -= dt;
  if (S.ambAcc > 0) return;
  /* The building gets noisier as the week goes on. By night six the gaps are
     less than half what they were, so silence stops being the default state
     and a sound stops being worth turning your head for. */
  const squeeze = CONFIG.ambienceScale[authoredSettingNightIndex()];
  S.ambAcc = (CONFIG.ambienceMinMs +
              Math.random() * (CONFIG.ambienceMaxMs - CONFIG.ambienceMinMs)) * squeeze;
  /* The music box is once a night at most, and often not at all. A thing that
     happens every few minutes is set dressing; a thing that happens once is an
     event people describe to each other afterwards. */
  let pool = AMBIENCE.slice(1);
  if (!S.boxPlayed && Math.random() < 0.10){ pool = ["ambBox"]; S.boxPlayed = true; }
  play(pick(pool), { pan: Math.random() * 1.6 - 0.8, vol: 0.75 + Math.random() * 0.4 });
}

function stepClock(dt){
  S.hourAcc += dt;
  if (S.hourAcc >= CONFIG.hourMs){
    S.hourAcc -= CONFIG.hourMs;
    S.hour++;
    chime();
    if (S.hour >= 6) winNight();
  }
}

/* ===========================================================================
   12. LOOP + RENDER
   =========================================================================== */

function loop(now){
  const dt = Math.min(now - S.lastFrame, 100);
  S.lastFrame = now;
  if (S.running){
    if (S.doom){ stepDoom(dt); render(dt); S.raf = requestAnimationFrame(loop); return; }

    /* The hour still turns during an outage — see beginOutage(). Everything
       else that could change your situation is skipped, because during an
       outage nothing can. */
    stepClock(dt);
    if (S.running && S.outage){
      stepOutage(dt);
      if (S.running) render(dt);
      S.raf = requestAnimationFrame(loop);
      return;
    }

    stepAmbience(dt);
    stepAll20Sounds(dt);
    stepAll20Laugh(dt);
    stepAll20OfficeFlicker(dt);
    stepPower(dt);
    if (S.running && !S.outage) stepSystems(dt);
    if (S.running && S.sensorAcc > 0) S.sensorAcc -= dt;
    if (S.running) stepHallucination(dt);
    if (S.running && S.passedOut > 0) stepPassOut(dt);
    if (S.running) stepJeffrey(dt);
    if (S.running) stepBot(dt);
    if (S.running) stepUnits(dt);
    if (S.running) stepGordon(dt);
    if (S.running) stepCamBurn(dt);
    if (S.running) render(dt);
    if (S.running) syncRoomTone();
  }
  S.raf = requestAnimationFrame(loop);
}

function render(dt){
  el.clockHour.textContent = (S.hour === 0 ? 12 : S.hour) + " AM";

  /* The stopwatch. One number in real seconds, redrawn only when it changes,
     because a value that repaints sixty times a second to say the same thing
     is sixty layouts nobody asked for. */
  const secs = Math.floor((S.hour * CONFIG.hourMs + S.hourAcc) / 1000);
  if (secs !== S.shownSecs){
    S.shownSecs = secs;
    el.shiftTimer.textContent =
      String(Math.floor(secs / 60)).padStart(2, "0") + ":" +
      String(secs % 60).padStart(2, "0");
  }


  document.body.classList.toggle("ventbad", !S.sys.vent.ok);

  /* The panel is a drawer over the office, not a place you go — the room is
     still there beside it. So a vent fault or a Jeffrey hit keeps pulsing the
     lights while you read the panel, and the warning cannot be silenced by
     hiding behind the thing you fix it with. Only raising the MONITOR, which
     covers the office entirely, stops it. */
  const officeLightWarning = !S.monUp && S.power &&
    !S.sys.vent.ok;
  document.body.classList.toggle("warningLights", officeLightWarning);
  if (!all20Mode()) document.body.classList.remove("all20-office-flicker");

  /* The ventilation alarm. It repeats, it gets faster as the air thins, and it
     is the only warning you get — there is no gauge to glance at any more. */
  if (!S.sys.vent.ok){
    S.ventAlarmAcc -= dt;
    if (S.ventAlarmAcc <= 0){
      const urgency = Math.max(0, Math.min(1, 1 - S.o2 / 100));
      S.ventAlarmAcc = CONFIG.ventAlarmMs - urgency * (CONFIG.ventAlarmMs - 900);
      play("ventAlarm", { vol: 0.55 + urgency * 0.45 });
    }
  } else S.ventAlarmAcc = 0;

  /* The air is audible from the office chair and nowhere else: not through the
     monitor, not with the mains off, not with the fans faulted, and not while
     you are face down on the floor. */
  const hum = !S.monUp && S.power && S.sys.vent.ok && S.passedOut <= 0 && !S.doom;
  if (hum !== S.ventHum){ S.ventHum = hum; setVentHum(hum); }

  document.body.classList.toggle("camdown", !S.sys.cam.ok);
  document.body.classList.toggle("doom", !!S.doom);
  document.body.classList.toggle("transit", performance.now() < S.transitUntil);

  /* Watching on residual power burns the array out. The cost is for using it,
     not for cutting the lights. */
  if (!S.power && S.monUp && S.sys.cam.ok){
    S.darkCamAcc += dt;
    if (S.darkCamAcc >= CONFIG.darkCamMs){
      S.darkCamAcc = 0;
      S.sys.cam.ok = false;
      playSystemFault("cam");
      if (S.monUp) toggleMonitor();
    }
  } else if (S.power) S.darkCamAcc = Math.max(0, S.darkCamAcc - dt * 0.5);

  if (S.flicker > 0){
    S.flicker -= dt;
    if (S.flicker <= 0){ S.flicker = 0; }
  }
  document.body.classList.toggle("flicker", S.monUp && S.flicker > 0);

  /* DROPOUT ON A FAILING FEED.

     This used to re-roll a coin every 260 ms, which produced a strobe: on,
     off, on, off, several times a second for as long as you held the camera.
     It read as a broken effect rather than a broken camera, and it was
     genuinely unpleasant to look at.

     Each state is now HELD. Snow for most of a second, picture for two to
     four, both jittered so the rhythm is never countable. That is closer to
     what a failing camera actually does, and far easier to play against —
     the gaps are long enough to make a decision inside. */
  S.dropAcc = (S.dropAcc || 0) - dt;
  if (S.dropAcc <= 0){
    const was = S.dropout;
    S.dropout = !was;
    S.dropAcc = S.dropout
      ? CONFIG.dropoutOnMs  * (0.70 + Math.random() * 0.60)
      : CONFIG.dropoutOffMs * (0.70 + Math.random() * 0.90);
    /* One roll per flicker EDGE, not per frame and not per re-roll — a
       dropout that is already running is one flicker, however long it lasts.
       Only while you are actually holding the failing feed, which is the only
       time its dropout is a thing the array is being asked to do. */
    if (!was && S.dropout && S.monUp && !S.panelTab &&
        CAMERAS[S.activeCam].unstable && !camDead(S.activeCam))
      rollCamFlicker("feed");
  }
  document.body.classList.toggle("dropout",
    S.monUp && !!CAMERAS[S.activeCam].unstable && S.dropout);

  // panel rows
  SYSTEMS.forEach(s => {
    const st = S.sys[s.id], row = $("sys_" + s.id);
    if (!row) return;
    const busy = st.reboot > 0;
    row.classList.toggle("bad", !st.ok && !busy);
    row.classList.toggle("busy", busy);
    /* The lamp needs a positive state too, not just the absence of a fault —
       a panel where a healthy system shows nothing at all reads as a panel
       that is switched off. */
    row.classList.toggle("ok", st.ok && !busy);
    row.querySelector(".sysState").textContent =
      busy ? "REBOOTING " + Math.ceil(st.reboot/1000) + "s" : (st.ok ? "NOMINAL" : "FAULT");
    row.querySelector(".rebootBtn").disabled = rebootActive() || st.ok;
    row.querySelector(".bar i").style.width =
      busy ? (100 - (st.reboot / st.total) * 100) + "%" : "0%";
  });
  $("rebootAll").disabled = SYSTEMS.every(s => S.sys[s.id].ok) || rebootActive();
  el.panel.classList.toggle("held", rebootActive());

  /* ---- THE BAR ---------------------------------------------------------
     Percentage, live draw, and an estimate of how long the current draw can
     be sustained. The estimate is deliberately shown in the same mm:ss as the
     shift timer, so the only arithmetic the player ever has to do is compare
     two clocks: how long the power lasts against how long the night has left.
     That comparison IS the resource game. */
  /* The office meter, redrawn only when the reading actually changes so a
     five-bar hold is not restyling ten elements sixty times a second. */
  const bars = usageBars();
  if (bars !== S.shownBars){
    S.shownBars = bars;
    const cells = el.usage ? el.usage.querySelectorAll("i") : [];
    cells.forEach((c, i) => {
      c.className = i < bars
        ? (i < 2 ? "on lo" : i < 3 ? "on mid" : i < 4 ? "on hi" : "on max")
        : "";
    });
  }
  if (el.usage) el.usage.classList.toggle("hidden", !S.running || !!S.outage);

  const pct = Math.max(0, S.pw);
  const pf = $("pwFill"), pp = $("pwPct");
  if (pf){
    pf.style.width = pct + "%";
    pf.className = pct <= POWER.warnAt ? "crit" : (pct <= 45 ? "low" : "");
  }
  if (pp){
    pp.textContent = pct.toFixed(0) + "%";
    pp.className = pct <= POWER.warnAt ? "crit" : (pct <= 45 ? "low" : "");
  }
  // alerts
  const msgs = [];
  if (!S.sys.vent.ok)  msgs.push(["VENTILATION FAULT", ""]);
  if (!S.sys.cam.ok)   msgs.push(["CAMERA FAULT", "warn"]);
  if (!S.sys.audio.ok) msgs.push(["AUDIO FAULT", "warn"]);
  if (!S.sys.door.ok)  msgs.push(["DOOR ARRAY JAMMED", "warn"]);
  if (S.outage)        msgs.push(["POWER OUT", "warn"]);
  else if (!S.power)   msgs.push(["LIGHTS OFF", "warn"]);
  if (S.doorShut && !S.outage){
    const dl = DOOR_BY_ID[S.doorShut];
    msgs.push([(dl ? dl.name : "DOOR") + " SHUT", "ok"]);
  }
  if (S.brokeMsg) msgs.push([S.brokeMsg.text, "warn"]);
  if (BOT.on)          msgs.push(["AUTOPILOT", "ok"]);
  if (S.sensorOn)      msgs.push(["SENSOR: " + CAMERAS[S.sensorOn].name.trim().split(/\s+/)[0], "ok"]);
  el.alerts.innerHTML = msgs.map(m => '<div class="'+m[1]+'">'+m[0]+'</div>').join("");

  // something is in the doorway — you get a sliver of them and a sound
  const atDoor = S.units.filter(u => u.breaching);
  clearLurkers();
  atDoor.forEach(showLurker);

  /* Gordon in a doorway, and the outage figure, both go through the same
     showLurker() as everything else. His arrival is not a special case
     visually — it is the same sliver of a body in the same frame. What makes
     it different is that there is nothing you can do about it. */
  const gAtDoor = S.gordon && S.gordon.phase === "door" ? S.gordon : null;
  if (gAtDoor) showLurker(gAtDoor);

  const outageUnit = S.outage && S.outage.phase === "wait"
    ? S.units.find(u => DO[u.node] === 1) : null;
  if (outageUnit) showLurker(outageUnit);

  const leftSide  = atDoor.some(u => DOOR_SIDE[u.node] === "left")  ||
                    (gAtDoor && DOOR_SIDE[gAtDoor.node] === "left")  ||
                    (outageUnit && DOOR_SIDE[outageUnit.node] === "left");
  const rightSide = atDoor.some(u => DOOR_SIDE[u.node] === "right") ||
                    (gAtDoor && DOOR_SIDE[gAtDoor.node] === "right") ||
                    (outageUnit && DOOR_SIDE[outageUnit.node] === "right");
  /* The office warning glow is suppressed during an outage. There is no power
     to run it, and a warning light for a threat you cannot answer is just
     decoration on a foregone conclusion. */
  document.body.classList.toggle("warn-left",  !!leftSide && !S.outage);
  document.body.classList.toggle("warn-right", !!rightSide && !S.outage);

  if (atDoor.length || gAtDoor){
    S.breathAcc += dt;
    if (S.breathAcc > 2400){ S.breathAcc = 0; scrape(atDoor[0] || gAtDoor); }
  } else S.breathAcc = 0;

  if (S.monUp){
    updateCamPan();
    const lure = activeLure();
    el.mapPlan.querySelectorAll(".camPin").forEach(b => {
      const id = b.dataset.cam;
      b.classList.toggle("lured",  !!lure && lure.cam === id);
      b.classList.toggle("sensor", S.sensorOn === id);
      b.classList.toggle("dead",   camDead(id));
    });

    /* Door pins. `shut` is the one holding, `busy` is the cooldown, and
       `jammed` is the whole array down — drawn on every pin at once, because a
       jam is not a property of any one door. */
    const canWork = doorOpenable();
    const cooling = performance.now() < S.doorReadyAt;
    el.mapPlan.querySelectorAll(".doorPin").forEach(b => {
      const id = b.dataset.door;
      const broken = !!S.doorBroken[id];
      b.classList.toggle("shut",   S.doorShut === id);
      b.classList.toggle("jammed", !S.sys.door.ok && !broken);
      b.classList.toggle("busy",   cooling && S.doorShut !== id && !broken);
      /* Broken is permanent and looks it. A one-shot door you have already
         spent stays on the map rather than disappearing, because knowing which
         of your defences is gone is information you want at a glance. */
      b.classList.toggle("broken", broken);
      b.disabled = broken || !canWork || cooling;
    });

    drawSubjects();
    const cam = CAMERAS[S.activeCam];
    const dead = camDead(S.activeCam);
    /* The picture coming apart while he is in it. Hung on a class rather than
       drawn here, so the effect lives in one place in the stylesheet with the
       rest of the CRT work. */
    /* A door you are holding, shown on the feed rather than only on the map —
       the map tells you WHICH door, this tells you THAT one is costing you. */
    const floor2DoorCam = S.doorShut ? FLOOR2_DOOR_CAMERA[S.doorShut] : null;
    const directDoorSight = !S.outage && !!floor2DoorCam && floor2DoorCam === S.activeCam;
    const legacyDoorWarning = !S.outage && !!S.doorShut && !floor2DoorCam;
    document.body.classList.toggle("doorshut", directDoorSight || legacyDoorWarning);
    document.body.classList.toggle("camburn", camBurnFrac() > 0.22);
    document.body.classList.toggle("feeddead", dead);
    el.sensorBtn.disabled = !!cam.unstable || dead;
    el.sensorBtn.classList.toggle("engaged", S.sensorOn === S.activeCam);
    el.sensorBtn.textContent = dead ? "FEED BURNED OUT"
      : cam.unstable ? "FEED TOO WEAK FOR SENSOR"
      : S.sensorOn === S.activeCam ? "REMOVE SENSOR  [M]" : "MOUNT SENSOR  [M]";
    el.audioBtn.disabled = !S.sys.audio.ok || performance.now() < S.lureReadyAt;
    el.audioBtn.classList.toggle("audio-error", !S.sys.audio.ok);
    el.audioBtn.textContent = !S.sys.audio.ok ? "AUDIO RELAY DOWN"
      : performance.now() < S.lureReadyAt
        ? "RECHARGING " + Math.ceil((S.lureReadyAt - performance.now())/1000) + "s"
        : "PLAY AUDIO CUE  [F]";
  } else {
    document.body.classList.remove("camburn", "feeddead", "doorshut");
  }

  syncChrome();
}

function updateCamPan(){
  const cam = CAMERAS[S.activeCam]; if (!cam) return;
  const p = cam.pan || CONFIG.camPan;
  // travel is measured against the BOX, not the window
  const travel = el.camPan.offsetWidth - el.camBox.offsetWidth;
  if (travel <= 0) return;
  const raw = Math.sin((performance.now() / (p.period || 33000)) * Math.PI * 2 + (p.phase || 0));
  el.camPan.style.transform =
    "translateX(" + (-travel/2 + (raw * travel/2) * CONFIG.camPan.reach) + "px)";
}

let subjKey = "";
/* Painter's order down each corridor. The game has no idea where a lens is,
   so the running order is given: first in the list is furthest away and gets
   drawn first, so nearer bodies overlap it rather than the other way round. */
const DRAW_ORDER = {};
[
  ["n04","n20","n05","n21","n22"],      // north hall, far end to near
  ["n18@C07", "n26","n14","nDR","nDL","n11"],      // office hall, far end to near
  ["n25","n19","n18"],                  // south hall, far end to near
  ["n12","n13"], ["n07","n06"]
].forEach(run => run.forEach((n, i) => DRAW_ORDER[n] = i));

const depthOf = n => DRAW_ORDER[n] === undefined ? 0 : DRAW_ORDER[n];

function drawSubjects(force){
  if (!S.sys.cam.ok || camDead(S.activeCam)){
    el.camPan.querySelectorAll(".subject").forEach(n=>n.remove()); subjKey=""; return;
  }
  const cam = CAMERAS[S.activeCam];

  const solid = unitsSeenBy(S.activeCam);
  const faint = (cam.peek || []).length
    ? S.units.filter(u => cam.peek.includes(u.node)) : [];

  /* GORDON. He is not in S.units — he is not half of a pair and none of the
     movement code above applies to him — so he is gathered separately and
     drawn through the same addSubject() as everything else.

     During a climb he is drawn on the square he is climbing at, with a rise
     applied so he is visibly going up or coming down rather than standing
     there. Inside the duct he is on no camera at all. */
  const gNode = gordonVisibleNode();
  const gSolid = (S.gordon && gNode && (cam.sees || []).includes(gNode)) ? gNode : null;
  const gFaint = (!gSolid && S.gordon && gNode && (cam.peek || []).includes(gNode))
                 ? gNode : null;
  const climb = gordonClimbProgress();

  const key = S.activeCam + "|" + solid.map(u=>u.id+u.node).join(",")
                          + "|" + faint.map(u=>u.id+u.node).join(",")
                          + "|" + (gSolid || gFaint || "-")
                          + "|" + (climb === null ? "-" : Math.round(climb * 12))
                          + "|" + (S.dropout ? 1 : 0);
  if (!force && key === subjKey) return;
  subjKey = key;

  el.camPan.querySelectorAll(".subject").forEach(n => n.remove());

  // a failing camera shows them only in the gaps between dropouts
  if (cam.unstable && S.dropout) return;

  solid.slice().sort((a, b) => depthOf(a.node) - depthOf(b.node))
       .forEach(u => addSubject(u, shotFor(u, u.node, S.activeCam), 1));
  // peeked figures sit at the edge of frame, small and unconvincing
  faint.forEach(u => {
    const b = shotFor(u, u.node, S.activeCam);
    addSubject(u, Object.assign({}, b, {
      width:  b.width  * 0.55,
      bottom: b.bottom + 8
    }), 0.34);
  });

  if (gSolid || gFaint){
    const node = gSolid || gFaint;
    let shot = shotFor(S.gordon, node, S.activeCam);
    if (climb !== null){
      /* THE CLIMB. He sinks into the floor going up and rises out of the
         ceiling coming down, clipped so the half of him that has gone is
         actually gone rather than floating. Driven purely by elapsed time, so
         opening this feed halfway through the climb shows him halfway through
         the climb — the animation was always running, you just were not
         looking at it. */
      const gone = climb;                     // 0 = fully in room, 1 = fully in duct
      shot = Object.assign({}, shot, {
        bottom: shot.bottom + shot.width * 1.9 * gone,
        clipB:  Math.max(shot.clipB || 0, gone * 88)
      });
    }
    addSubject(S.gordon, shot, gFaint ? 0.34 : 1);
  }
}

function addSubject(u, shotIn, alpha){
  if (u.ghost) return;
  if (sprites[u.id].dataset.ok !== "1") return;
  const shot = Object.assign({}, DEFAULT_SHOT, shotIn || {});
  const s = document.createElement("img");
  // DO[node] === 1 means one of the two squares beside your door
  s.className = "subject" + (DO[u.node] === 1 ? " atdoor" : "");
  s.src = u.art; s.alt = "";
  s.style.left   = shot.left + "%";
  s.style.bottom = shot.bottom + "%";
  s.style.width  = shot.width + "%";
  s.style.height = "auto";
  s.style.opacity = alpha;
  s.style.transform = shotTransform(shot);

  // The class stays so a rule can be hung on it later, but nothing is drawn.
  // Where a body is standing should be told by where it is standing.
  if (DO[u.node] === 1) s.classList.add("imminent");
  s.style.filter = "grayscale(.6) contrast(1.1) brightness(" + (0.65 * shot.dim) + ")";

  // hidden behind whatever is really in the room
  const cT = shot.clipT || 0, cR = shot.clipR || 0,
        cB = shot.clipB || 0, cL = shot.clipL || 0;
  if (cT || cR || cB || cL)
    s.style.clipPath = "inset(" + cT + "% " + cR + "% " + cB + "% " + cL + "%)";
  el.camPan.appendChild(s);
}

function syncChrome(){
  el.monBtn.classList.toggle("engaged", S.monUp);
  el.panelBtn.classList.toggle("engaged", S.panelTab);

  /* An outage disables all three docks outright. Leaving them live but inert
     would have the player pressing a button that does nothing and reading it
     as the game having hung, when in fact it is working exactly as intended.
     A greyed control says "this is over" in a way a dead one cannot. */
  if (S.outage){
    el.panelBtn.disabled = true;
    el.monBtn.disabled = true;
    el.powerBtn.disabled = true;
    el.powerBtn.classList.remove("cut");
    el.powerBtn.textContent = "NO POWER";
    return;
  }

  el.panelBtn.disabled = !S.power || rebootActive();
  el.monBtn.disabled = rebootActive() || (!S.power && !S.sys.cam.ok);
  const warming = !S.power && performance.now() < S.powerBackAt;
  el.powerBtn.classList.toggle("cut", !S.power && !warming);
  el.powerBtn.disabled = warming;
  el.powerBtn.textContent = !S.power
    ? (warming ? "..." : "TURN ON LIGHTS  [X]")
    : "TURN OFF LIGHTS  [X]";
}

/* ===========================================================================
   12b. THE ONLY WAY TO DIE

   One gate for every death in the game. Nothing kills you unless it is
   standing in one of your two doorways — no exceptions, no distance kills,
   no suffocation kill. If you are hiding in the monitor when it happens you
   get a few seconds of noise first, and dropping the monitor during those
   seconds does not save you. It only makes it sooner.
   =========================================================================== */

function kill(unit, why){
  if (!S.running || S.doom) return;
  if (!unit || DO[unit.node] !== 1){
    // Should be unreachable. If it fires, something called kill() from a
    // place it had no business calling it from.
    console.warn("kill() blocked: nobody is at a door", unit && unit.node);
    return;
  }
  if (S.monUp){
    S.doom = { unit, acc:0, why };
    setHiss(false);
    play("doom");
    return;
  }
  jumpscare(unit, why);
}

function stepDoom(dt){
  S.doom.acc += dt;
  // Lowering the monitor hands yourself over early.
  if (!S.monUp || S.doom.acc >= CONFIG.doomMs){
    const d = S.doom; S.doom = null;
    jumpscare(d.unit, d.why);
  }
}

/* ---------------------------------------------------------------------------
   THE OUTAGE

   Everything stops at once: the doors let go, the monitor and the panel will
   not open, the lights are off and the switch is dead, and every fault on the
   board clears — there is nothing left to reboot and a panel full of red would
   only be asking you to fix a building that no longer has power to fix.

   Then the box plays, and then you wait.

   THE CLOCK KEEPS RUNNING THROUGH ALL OF IT. That is the single most important
   line in this function. An outage is not a loss, it is a race you have
   already mostly lost: at 5:40 the grace roll will very often outlast the hour
   and you walk out in the dark, and at 2:00 nothing will save you. It is what
   makes spending the last four percent of the bar on one more closed door a
   real decision instead of an obvious mistake.

   Eugene delivers it, every time, on every night. Not the nearest one and not
   a random one — the same face in the same doorway, so that after the first
   time you know exactly what the dark means.
--------------------------------------------------------------------------- */
function beginOutage(){
  if (S.outage || !S.running) return;

  const grace = POWER.graceMinMs +
                Math.random() * Math.max(0, POWER.graceMaxMs - POWER.graceMinMs);
  S.outage = { phase:"jingle", acc:0, grace, side:null };

  // everything you were holding, let go of at once
  S.doorShut = null;
  S.power = false;
  S.monUp = false; S.panelOpen = false; S.panelTab = false;
  el.monitor.classList.remove("up");
  document.body.classList.remove("camsup", "paneltab", "warningLights");
  document.body.classList.add("dark", "outage");
  setHiss(false);
  setVentHum(false); S.ventHum = false;
  cancelReboots();

  /* Faults simply cease to exist. Nothing is broken any more because nothing
     is running, and a REBOOT button on a dead building is a cruel joke rather
     than a mechanic. */
  SYSTEMS.forEach(s => {
    const st = S.sys[s.id];
    st.ok = true; st.reboot = 0; st.total = 0; st.safeUntil = 0;
  });

  play("powerOut");
  trackGameEvent("power_outage", { night_number:S.night, hour:S.hour });
  setTimeout(() => { if (S.running && S.outage) play("outageBox"); }, 900);
}

/* He is put in a real doorway before anything else happens, because kill()
   refuses to fire on anything that is not standing in one and that guard is
   worth more than the convenience of skipping it. */
function outageStager(){
  const him = S.units.find(u => u.id === "eugene") || S.units[0];
  if (!him) return null;
  if (DO[him.node] !== 1) him.node = pick(OFFICE_DOORS);
  him.breaching = false;                       // his own timer must not also run
  return him;
}

function stepOutage(dt){
  const o = S.outage;
  o.acc += dt;

  if (o.phase === "jingle"){
    if (o.acc >= POWER.jingleMs){
      o.phase = "wait"; o.acc = 0;
      const him = outageStager();
      o.side = him ? DOOR_SIDE[him.node] : "left";
    }
    return;
  }

  if (o.phase === "wait" && o.acc >= o.grace){
    const him = outageStager();
    if (him) kill(him, "The power ran out.");
  }
}

function passOut(){
  S.passedOut = CONFIG.passOutMs;
  S.monUp = false; S.panelOpen = false; S.panelTab = false;
  el.monitor.classList.remove("up");
  document.body.classList.remove("camsup", "paneltab");
  document.body.classList.add("out");
  setHiss(false);
  play("passOut");
}

function stepPassOut(dt){
  S.passedOut -= dt;
  // Anything that reaches a door while you are face-down finds you there.
  const atDoor = S.units.find(u => DO[u.node] === 1) ||
                 (S.gordon && S.gordon.phase === "door" ? S.gordon : null);
  if (atDoor) return jumpscare(atDoor, "It found you on the floor.");
  if (S.passedOut <= 0){
    S.passedOut = 0;
    S.o2 = CONFIG.passOutO2;
    document.body.classList.remove("out");
    // you come round with the vents already cycling
    const v = S.sys.vent;
    if (!v.ok && v.reboot <= 0){ v.reboot = CONFIG.rebootOneMs; v.total = CONFIG.rebootOneMs; }
    play("reboot");
  }
}

/* ---------------------------------------------------------------------------
   THE MOTION SENSOR

   One sensor, mounted on one camera. It chirps when something enters that
   camera's coverage. It replaces the old always-on motion flags, so the map
   no longer tells you where anything is — you get one question answered per
   mounting, and you choose the question.
--------------------------------------------------------------------------- */
function mountSensor(camId){
  if (!S.running || !S.power || S.outage) return;
  if (camDead(camId)){ buzz(); return; }      // nothing to mount it on
  if (CAMERAS[camId].unstable){ buzz(); return; }   // won't hold on a failing feed
  S.sensorOn = (S.sensorOn === camId) ? null : camId;
  S.sensorAcc = CONFIG.sensorMoveCooldownMs;
  S.units.forEach(u => u.seenBySensor = S.sensorOn
    ? CAMERAS[S.sensorOn].sees.includes(u.node) : false);
  blip();
}

function pulseSensorCamera(camId){
  /* The map pin is the visual counterpart to the sensor chirp. Only pulse it
     when the player can actually see the camera map and is looking at the same
     floor; otherwise the event remains audio-only, as it should be. */
  if (!S.monUp || S.panelTab || camFloor(camId) !== S.mapFloor) return;
  const btn = el.mapPlan.querySelector('.camPin[data-cam="' + camId + '"]');
  if (!btn || btn.classList.contains("dead")) return;
  btn.classList.remove("motion-hit");
  void btn.offsetWidth;
  btn.classList.add("motion-hit");
  window.setTimeout(() => btn.classList.remove("motion-hit"), 1100);
}

function pingSensor(u, wasNode){
  if (!S.sensorOn || S.sensorAcc > 0) return;
  const covered = CAMERAS[S.sensorOn].sees;
  const inNow = covered.includes(u.node);
  if (inNow && !u.seenBySensor){
    play(u.chirp);                                 // only on entry, not on loitering
    pulseSensorCamera(S.sensorOn);
    // the chirp names which of them it was, so the bot learns a room from it
    if (BOT.on) BOT.mem[u.id] = { cam:S.sensorOn, t:performance.now(), via:"sensor" };
  }
  u.seenBySensor = inNow;
}

/* ===========================================================================
   12c. AUTOPILOT

   Press B to hand the office over and watch. The bot drives the same four
   controls a player has and — with BOT_CHEATS false — is held to the same
   information: what is on the camera it is currently looking at, the sensor
   chirps it has heard, the red glow at the door, and the panel. It cannot see
   through walls. Watching it fail is a decent read on whether the information
   the game gives you is actually enough to survive on.
   =========================================================================== */

const BOT_CHEATS = false;

const BOT = { on:false, acc:0, camIdx:0, dwell:0, hunt:0, hallAcc:0,
              huntBlock:0, sawFlicker:false, mem:{},
              doorCheck:0, watchAcc:0, restUntil:0, cueAim:null };

function toggleBot(){
  BOT.on = !BOT.on;
  BOT.mem = {}; BOT.hunt = 0; BOT.hallAcc = 0; BOT.huntBlock = 0;
  BOT.doorCheck = 0; BOT.watchAcc = 0; BOT.restUntil = 0; BOT.cueAim = null;
  document.body.classList.toggle("bot", BOT.on);
  blip();
}

/* Which feeds are worth luring toward, and where to look next for a given
   animatronic. Memory is only ever "I saw it on camera X at time T" — the same
   thing a player carries in their head, and it goes stale. */
const farCams = ids => ids.filter(c => !CAMERAS[c].unstable &&
  Math.max(...CAMERAS[c].sees.map(n => DO[n] === undefined ? 0 : DO[n])) >= 5);

function guessCam(id, ids){
  const m = BOT.mem[id];
  // a sighting under 20s old is worth acting on; older than that it has moved
  if (m && performance.now() - m.t < 20000 && S.activeCam !== m.cam) return m.cam;
  for (let i = 0; i < ids.length; i++){
    BOT.camIdx = (BOT.camIdx + 1) % ids.length;
    if (!CAMERAS[ids[BOT.camIdx]].unstable) return ids[BOT.camIdx];
  }
  return ids[0];
}

/* WHERE TO SHOUT TO GET RID OF HER.

   The opposite problem to cueCamFor. That one is an emergency and takes the
   best odds it can get at any distance; this one is prevention, so the room
   has to be worth walking to: five or more out, deep enough that a cue she
   takes spends most of her seven committed moves getting there and the rest
   getting back. Among those, the nearest to her, because the odds fall 40% a
   room and a cue she ignores is eight seconds of cooldown for nothing. */
function lureCamAway(u){
  const d = distFrom(u.node);
  let best = null, bestRooms = 99;
  for (const id in CAMERAS){
    const c = CAMERAS[id];
    if (c.unstable) continue;
    const out = Math.max(...c.sees.map(x => DO[x] === undefined ? 0 : DO[x]));
    if (out < 5) continue;
    const rooms = Math.min(...c.sees.map(x => d[x] === undefined ? 99 : d[x]));
    if (rooms < 1 || rooms > 5) continue;
    if (rooms < bestRooms){ bestRooms = rooms; best = id; }
  }
  return best;
}

/* WHERE TO SHOUT WHEN SHE IS AT THE DOOR.

   A cue aimed at the square she is standing on cannot move her — stepToward
   returns the square she is already on and the escape is refused — so the feed
   has to be a DIFFERENT room, and a near one: the odds fall by 40% per room,
   so next door is 44% and two rooms is 26.5%. Unstable feeds are skipped
   because the bot cannot see what it is aiming at through the dropouts. */
function cueCamFor(u){
  const d = distFrom(u.node);
  let best = null, bestRooms = 99;
  for (const id in CAMERAS){
    const c = CAMERAS[id];
    if (c.unstable || c.sees.includes(u.node)) continue;
    const rooms = Math.min(...c.sees.map(x => d[x] === undefined ? 99 : d[x]));
    if (rooms < 1 || rooms > 3) continue;
    if (rooms < bestRooms){ bestRooms = rooms; best = id; }
  }
  return best;
}

/* Close out a hunt and hold off starting another. */
function endHunt(){
  BOT.hunt = 0;
  BOT.dwell = 500;
  BOT.huntBlock = performance.now() + CONFIG.botHuntCooldownMs;
}

function stepBot(dt){
  if (!BOT.on || !S.running || S.doom || S.passedOut > 0) return;

  /* A flicker means Eugene took a step. He steps every few seconds, so
     without a cooldown every hunt is interrupted by the next flicker and the
     bot never stops searching — which is exactly what it was doing. One hunt,
     then a quiet period, then it may hunt again. */
  const eugeneSeen = BOT.mem.eugene && performance.now() - BOT.mem.eugene.t < 6000;
  if (S.flicker > 0 && !BOT.sawFlicker &&
      BOT.hunt <= 0 && performance.now() > BOT.huntBlock && !eugeneSeen){
    BOT.hunt = CONFIG.botHuntMs;
    /* Look up from the desk BEFORE searching the feeds. A flicker says he
       moved and nothing about where to; the two squares that can actually kill
       you are the two you can see without a camera at all. Checking them first
       costs under a second and answers the only urgent question. */
    BOT.doorCheck = CONFIG.botDoorCheckMs;
  }
  BOT.sawFlicker = S.flicker > 0;

  if (BOT.hunt  > 0) BOT.hunt  -= dt;
  if (BOT.dwell > 0) BOT.dwell -= dt;
  if (BOT.doorCheck > 0) BOT.doorCheck -= dt;
  BOT.hallAcc += dt;

  /* Watch fatigue, tracked exactly the way a unit tracks it. Holding her on
     screen wears the stall down over FATIGUE.fullMs; looking away brings it
     back FATIGUE.recover times faster. The bot needs its own copy because it
     has to decide when to let go BEFORE the stall is spent, and it is only
     allowed to know what it is currently looking at. */
  const holding = S.monUp && !S.panelTab && S.sys.cam.ok &&
                  unitsSeenBy(S.activeCam).some(u => u.watchStall > 0);
  BOT.watchAcc = Math.max(0, Math.min(FATIGUE.fullMs,
    BOT.watchAcc + (holding ? dt : -dt * FATIGUE.recover)));

  BOT.acc += dt;
  if (BOT.acc < 200) return;
  BOT.acc = 0;

  // remember whatever is on screen right now
  if (S.monUp && S.sys.cam.ok){
    unitsSeenBy(S.activeCam).forEach(u =>
      BOT.mem[u.id] = { cam:S.activeCam, t:performance.now(), via:"seen" });
  }

  /* He is on the feed right now. Any other camera, and nothing else matters
     for the next fifth of a second — including dropping the monitor, which is
     the one thing that makes it worse. Checked before the doorways for that
     reason; the doorway check drops the cameras, and doing that with him up
     hands him the frame. */
  if (S.jeffrey && S.jeffrey.at === S.activeCam && S.monUp){
    const ids = camIdsOn(1);
    const away = ids.filter(c => c !== S.activeCam && !CAMERAS[c].unstable && !camDead(c));
    if (away.length){ viewCam(pick(away)); BOT.dwell = 300; return; }
  }

  /* AT THE DOOR. The two of them want opposite things done about it.

     He is a reflex: the breaker, immediately, and the odds decay from the
     moment he arrives. She does not care about the lights beyond one long
     shot, and cutting them costs the cue outright — the relay needs mains
     power — so for her the monitor goes UP and a cue goes into a room near
     her. Only when there is nothing to shout with does the bot take the
     breaker and the long odds. */
  const breach = S.units.filter(u => u.breaching);
  const him = breach.find(u => !u.commitModel);
  const her = breach.find(u => u.commitModel);

  if (him && S.power){ togglePower(); return; }

  /* The lights are off and she is the one at the door. The relay runs on
     mains, so sitting in the dark here is choosing to do nothing at all — the
     breaker roll has already been taken and failed. Get the power back. */
  if (her && !him && !S.power){
    if (performance.now() >= S.powerBackAt) togglePower();
    return;
  }

  if (her && !him && S.power){
    const canCue = S.sys.audio.ok && performance.now() >= S.lureReadyAt;
    if (canCue){
      if (S.panelOpen){ togglePanel(); return; }
      if (!S.monUp){ toggleMonitor(); return; }
      const t = cueCamFor(her);
      // no dwell and no hesitation: this is the whole of the next two seconds
      if (t && S.activeCam !== t){ viewCam(t); return; }
      playCue(); return;
    }
    togglePower(); return;
  }

  if (!breach.length && !S.power){
    if (performance.now() >= S.powerBackAt) togglePower();
    return;
  }
  if (!S.power) return;

  // a cycle in progress must be held to the end, so sit on the panel
  if (rebootActive()){ if (!S.panelOpen) togglePanel(); return; }

  const faults = SYSTEMS.filter(s => !S.sys[s.id].ok && S.sys[s.id].reboot <= 0).map(s => s.id);
  if (faults.length){
    if (!S.panelOpen){ togglePanel(); return; }
    reboot([faults.includes("vent") ? "vent" : faults[0]]);
    return;
  }
  if (S.panelOpen){ togglePanel(); return; }

  // the doorway check a flicker just asked for: monitor down, look at the doors
  if (BOT.doorCheck > 0){
    if (S.monUp) toggleMonitor();
    return;
  }

  if (!S.monUp){ toggleMonitor(); return; }

  /* THE AUTOPILOT IS AN UPPER-FLOOR PLAYER ONLY.

     It drives the four things it always drove — the feeds, the cue, the
     sensor and the breaker — against the two figures it was written for. It
     does NOT play Gordon: it will not go downstairs, will not read the ducts
     and will not touch a door, so from night three it is a demonstration of
     half the game rather than a solution to all of it. That is a deliberate
     limit rather than an oversight — teaching it the door shell game is its
     own piece of work, and a bot that played it badly would be worse than one
     that visibly does not play it at all. */
  const ids = camIdsOn(1).filter(c => !camDead(c));

  if (!S.sensorOn){
    const j = ids.find(c => !CAMERAS[c].unstable && CAMERAS[c].sees.length > 2);
    if (j){ viewCam(j); mountSensor(j); BOT.dwell = 500; return; }
  }

  const visible   = S.sys.cam.ok ? unitsSeenBy(S.activeCam) : [];
  const stallHere = visible.find(u => u.watchStall > 0);
  const eugeneHere= visible.find(u => u.flickerOnMove);

  /* PREVENTION, WHICH IS THE ONLY THING THAT ACTUALLY WORKS ON HER.

     Watching buys seconds; a cue she takes buys seven moves of floor. The door
     is already the losing position — better than even odds of dying there —
     so the bot answers her while she is still out in the building, the moment
     it can see her closing and the relay is charged. It aims deep, holds the
     aim for one tick to actually get there, and fires.

     Fair on information: it fires at a body it can SEE on the feed in front of
     it, never at one it has only remembered or inferred. */
  if (BOT.cueAim){
    if (!S.sys.audio.ok || performance.now() < S.lureReadyAt){ BOT.cueAim = null; }
    else if (S.activeCam !== BOT.cueAim){ viewCam(BOT.cueAim); return; }
    else { playCue(); BOT.cueAim = null; BOT.dwell = 400; return; }
  }
  const closing = visible.find(u => u.commitModel && DO[u.node] <= 4);
  if (closing && BOT.hunt <= 0 && S.sys.audio.ok && performance.now() >= S.lureReadyAt){
    const aim = lureCamAway(closing);
    if (aim && aim !== S.activeCam){ BOT.cueAim = aim; viewCam(aim); return; }
    if (aim){ playCue(); BOT.dwell = 400; return; }
  }

  // glance down the office hall now and then. It is the only feed that shows
  // the two squares beside the door, unreliable or not.
  if (BOT.hallAcc > CONFIG.botHallCheckMs && BOT.dwell <= 0){
    BOT.hallAcc = 0;
    const hall = ids.find(c => CAMERAS[c].unstable);
    if (hall && S.activeCam !== hall){ viewCam(hall); BOT.dwell = 1000; return; }
  }

  // THE HUNT. A flicker pulls it off whatever it was watching — staring at the
  // Sloppy while Eugene closes in is exactly how it used to die.
  if (BOT.hunt > 0){
    if (eugeneHere){
      // found him — the hunt is over either way, and it will not restart for a
      // while, so a burst of flickers cannot pin the bot in search mode
      if (S.sys.audio.ok && performance.now() >= S.lureReadyAt){
        const far = farCams(ids);
        if (far.length){
          const t = far[Math.floor(Math.random() * far.length)];
          if (S.activeCam !== t){ viewCam(t); BOT.dwell = 320; return; }
          playCue();
        }
      }
      endHunt(); return;
    }
    if (BOT.dwell > 0) return;

    // give up rather than search forever
    if (BOT.hunt <= 0){ endHunt(); return; }

    // if the remembered feed came up empty, forget it so the sweep can progress
    const m = BOT.mem.eugene;
    if (m && m.cam === S.activeCam) m.t = 0;

    BOT.dwell = CONFIG.botDwellMs * 0.9;
    viewCam(guessCam("eugene", ids));
    return;
  }

  /* Holding this feed is the only thing stopping her — but only for a while.
     The stall decays to FATIGUE.floor over FATIGUE.fullMs of unbroken watching,
     so past botWatchMaxMs the seconds are buying a fraction of what the first
     ones did, and they are the same seconds he is walking through. It lets go,
     spends the recovery window looking for him instead, and comes back to her
     with the stall most of the way restored. Parking on her forever leaves her
     at 72% of full speed; this cycle holds her nearer 50%. */
  const resting = performance.now() < BOT.restUntil;
  if (stallHere && !resting){
    if (BOT.watchAcc < CONFIG.botWatchMaxMs){ BOT.dwell = CONFIG.botDwellMs; return; }
    BOT.restUntil = performance.now() + CONFIG.botWatchRestMs;
    BOT.dwell = 0;                       // break off now, not after another hold
  }

  if (BOT.dwell > 0) return;
  BOT.dwell = CONFIG.botDwellMs;
  viewCam(guessCam(resting ? "eugene" : "sloppy", ids));
}

/* ===========================================================================
   13. ENDINGS
   =========================================================================== */

const DEATH_INTERFERENCE_DURATION_MS = 2900;
let deathTimer = null;

function playDeathInterference(){
  if (!actx) return;
  /* One continuous dead-channel static bed. Keep it heavy and uninterrupted
     for the full death-interference screen; no extra tones or bursts. */
  noise(DEATH_INTERFERENCE_DURATION_MS / 1000, "bandpass", 2300, .13, undefined,
    t => .78 + .22 * Math.random());
}

function showDeathInterference(){
  clearTimeout(deathTimer);
  if (el.death) el.death.classList.add("show");
  playDeathInterference();
  deathTimer = setTimeout(() => {
    if (el.death) el.death.classList.remove("show");
    el.title.classList.add("show");
    titleScreenOn();
  }, DEATH_INTERFERENCE_DURATION_MS);
}

function jumpscare(unit, why){
  stopRoomTone();
  /* Losing sends you back to the title rather than a dedicated loss screen.
     The menu already carries the dread — the music, the glitches, the face —
     and dropping you into it after a death makes a shift feel like something
     you clock into rather than a level you retry. */
  S.returnToTitle = true;
  if (!S.running) return;
  S.running = false;
  S.jeffrey = null; S.jeffreyScare = 0; hideJeffrey();
  setHiss(false); setVentHum(false); S.ventHum = false; screech(unit);
  const u = unit || ROSTER[0];
  trackGameEvent("night_loss", {
    night_number:S.night,
    loss_reason:why || "unknown",
    threat:u.id
  });

  el.scareArt.onerror = () => el.scare.innerHTML =
    '<div class="ph" style="border:none">' + u.name + '<br>' + u.scare + '</div>';
  el.scareArt.src = u.scare;
  el.scare.classList.add("show");

  setTimeout(() => {
    el.scare.classList.remove("show");
    /* Hold the player in dead-channel interference before the title returns.
       This gives the scare a visual/audio afterimage instead of snapping straight
       back to the ordinary menu. The menu music does not resume until the static
       has finished. */
    showDeathInterference();
  }, 1500);
}

// Change these values to make the victory screen shorter or longer.
const VICTORY_DURATION_MS = 5000;
const VICTORY_REDUCED_DURATION_MS = 1100;
const VICTORY = { raf:0, active:false };

function playVictoryJingle(){
  if (!actx) return;
  const startsAt = actx.currentTime + .03;
  const dst = master || actx.destination;

  /* More of a building powering down cleanly than a cheerful level-up. A
     relay click answers each rising note, then the last chord hangs in the
     room while the clock rolls over to 6 AM. */
  const notes = [
    [392.00, 0.00, .24, .08],
    [493.88, 0.23, .24, .09],
    [587.33, 0.46, .34, .10],
    [739.99, 0.82, .55, .10],
    [493.88, 1.18, .26, .06],
    [659.25, 1.46, .72, .075],
    [783.99, 1.46, .82, .055]
  ];
  notes.forEach(([freq, offset, length, volume]) => {
    const oscillator = actx.createOscillator();
    const gain = actx.createGain();
    const start = startsAt + offset;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(freq, start);
    oscillator.detune.value = -7;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .016);
    gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    oscillator.connect(gain).connect(dst);
    oscillator.start(start);
    oscillator.stop(start + length + .04);
  });
  [0, 235, 470, 820].forEach((offset, i) => {
    setTimeout(() => tone(
      180 - i * 18, .055 + i * .008, "square", .045, 180 - i * 12
    ), offset);
  });
  setTimeout(() => noise(.34, "lowpass", 900, .035, undefined,
                          t => Math.exp(-5 * t)), 900);
}

function stopVictory(){
  VICTORY.active = false;
  if (VICTORY.raf) cancelAnimationFrame(VICTORY.raf);
  VICTORY.raf = 0;
}

function showVictory(){
  stopVictory();
  const canvas = $("victoryFireworks");
  const ctx = canvas.getContext("2d");
  const time = $("victoryTime");
  const scale = Math.min(devicePixelRatio || 1, 2);
  const width = canvas.clientWidth || innerWidth;
  const height = canvas.clientHeight || innerHeight;
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const sparks = [];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reduceMotion ? VICTORY_REDUCED_DURATION_MS : VICTORY_DURATION_MS;
  const started = performance.now();
  let previous = started, nextSpark = 260;

  time.textContent = "5 AM";
  el.winNote.textContent = "SHIFT COMPLETE";
  el.win.classList.add("show");
  VICTORY.active = true;
  playVictoryJingle();

  function sparkBurst(){
    const x = width * (.18 + Math.random() * .64);
    const y = height * (.18 + Math.random() * .40);
    for (let i = 0; i < 38; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = .85 + Math.random() * 3.35;
      sparks.push({
        x, y,
        vx:Math.cos(angle) * speed,
        vy:Math.sin(angle) * speed - .62,
        life:420 + Math.random() * 560, age:0,
        size:1.25 + Math.random() * 2.05
      });
    }
  }

  function frame(now){
    if (!VICTORY.active) return;
    const elapsed = now - started;
    const dt = Math.min(2.5, (now - previous) / 16.67);
    previous = now;

    if (!reduceMotion && elapsed >= nextSpark && elapsed < duration * .78){
      sparkBurst();
      nextSpark += 520 + Math.random() * 180;
    }

    ctx.clearRect(0, 0, width, height);
    const wash = ctx.createRadialGradient(width/2, height*.48, 0, width/2, height*.48, height*.82);
    wash.addColorStop(0, "rgba(125,250,176,.070)");
    wash.addColorStop(.42, "rgba(32,76,52,.032)");
    wash.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    // Slow CRT-like scan band: a visual sense of the building waking after 5 AM.
    const bandY = ((elapsed / 3200) * height * .8) % (height * 1.25) - height * .10;
    const band = ctx.createLinearGradient(0, bandY - 70, 0, bandY + 70);
    band.addColorStop(0, "rgba(125,250,176,0)");
    band.addColorStop(.5, "rgba(125,250,176,.045)");
    band.addColorStop(1, "rgba(125,250,176,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY - 70, width, 140);

    for (let i = sparks.length - 1; i >= 0; i--){
      const p = sparks[i];
      p.age += dt * 16.67;
      if (p.age >= p.life){ sparks.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += .022 * dt;
      const alpha = (1 - p.age / p.life) * .72;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(236,213,108,1)";
      ctx.fillRect(p.x, p.y, p.size, p.size * 2.2);
    }
    ctx.globalAlpha = 1;

    time.textContent = elapsed < duration * .58 ? "5 AM" : "6 AM";
    if (elapsed >= duration){
      stopVictory();
      el.win.classList.remove("show");
      el.title.classList.add("show");
      titleScreenOn();
      return;
    }
    VICTORY.raf = requestAnimationFrame(frame);
  }

  if (!reduceMotion) sparkBurst();
  VICTORY.raf = requestAnimationFrame(frame);
}

function winNight(){
  stopRoomTone();
  S.running = false;
  trackGameEvent("night_complete", { night_number:S.night });
  S.jeffrey = null; S.jeffreyScare = 0; hideJeffrey();
  el.scare.classList.remove("show");
  setHiss(false); setVentHum(false); S.ventHum = false;
  S.monUp = false; S.panelTab = false; S.panelOpen = false;
  el.monitor.classList.remove("up");
  /* An outage that was outlasted still has to be cleaned up here. Surviving
     one is the whole reason the clock keeps running through it, and leaving
     .dark and .outage on the body would carry a black screen into the victory
     card of the night you just won in the dark. */
  document.body.classList.remove("camsup", "paneltab", "atdoor",
                                 "outage", "dark", "warningLights");
  S.outage = null;
  clearLurkers();
  if (S.night === 8 && customAllAt(20)) saveCustom20Complete();
  unlockNextNight();
  buildPickers();
  showVictory();
}

/* ===========================================================================
   14. BOOT
   =========================================================================== */

/* Installable, and playable with the phone in aeroplane mode once it has been
   opened one time. Silently does nothing when opened straight off the disk,
   because a service worker needs a real origin. */
/* Both of these only mean anything over http(s). Attaching the manifest from a
   file:// page just fills the console with CORS errors that look alarming and
   are not — so it is attached at runtime, only where it can work. */
if (location.protocol.startsWith("http")){
  const m = document.createElement("link");
  m.rel = "manifest"; m.href = "manifest.json";
  document.head.appendChild(m);
}


makeNoise();
document.body.style.setProperty("--warning-light-cycle", CONFIG.warningLightCycleMs + "ms");
loadProgress();
loadCustomLevels();
buildPickers();
applyDoorVars();
{
  const boot = mountArt(el.officeArt, OFFICE_ART, "(wide panorama from your desk)");
  if (boot){ boot.addEventListener("load", () => fitOfficeScene(boot)); }
}
/* THE BOOT AUDIT.

   This was written and then never called, which meant every guarantee its
   comments make about the building was unchecked for the whole of its
   existence. It runs now, at boot, and prints to the console.

   It is expected to complain about the payroll door on the current lower
   floor: that single door genuinely does seal Gordon away from all three ways
   up. That is not an oversight — it is a door the layout wants — and the
   sealed-in behaviour in gordonStepDown() is what makes it survivable rather
   than a way to stop the night. The warning is left switched on so that any
   FUTURE door with the same property announces itself instead of being
   discovered as a Gordon who mysteriously stopped walking. */
/* LAST, AND GUARDED. The music and the glitch scheduler are the only things
   in this file that touch an API a browser may refuse outright, so they run
   after everything else is already working. A title screen with no music is a
   disappointment; a title screen that stops the game loading is a bug. */
try { armTitle(); } catch (e) {
  console.warn("title screen could not start:", e);
}

/* The script reached its end, so the watchdog has nothing to report. */
try { clearTimeout(window.__bootTimer); } catch (e) {}

auditBuilding();
buildMap();
buildPanel();

/* The lightweight loader paints the title before this file executes. Mark the
   game ready only after all normal wiring is complete, then release anything
   the player clicked while the game was still loading. */
try {
  const early = window.__FNAAC;
  if (early) {
    if (Number.isInteger(early.night) && early.night >= 1 && early.night <= unlockedNight) {
      S.night = early.night;
      buildPickers();
    }
    early.ready = true;
    if (typeof early.removeEarlyCapture === "function") early.removeEarlyCapture();

    if (early.openCustomRequested && typeof openCustomMenu === "function") {
      early.openCustomRequested = false;
      openCustomMenu();
    }

    if (early.startRequested) {
      early.startRequested = false;
      const start = $("btnStart");
      if (start) { start.disabled = false; start.textContent = "CLOCK IN"; }
      clockIn();
    }
  }
} catch (e) {
  console.warn("deferred boot handoff failed:", e);
}

console.log("distance from office:", DO);
console.log("rooms with no camera:", BLIND);
