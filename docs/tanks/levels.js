'use strict';
/* Original room designs informed by the supplied corridor / crossfire references.
   Each entry: name, columns, rows, rectangles [x,y,w,h,tile], enemy starts.
   Tile 1 = solid wall, 2 = mine-breakable wall, 3 = pit. Coordinates are cells. */
window.TANK_LEVELS = (() => {
 // Most rooms use the original 24 × 15 footprint; four use 26 × 16.
 const layouts=[
 ["First contact",24,15,[[11,4,1,7,1]],[["brown",20,3]]],
 ["Crossfire",24,15,[[13,3,1,8,1],[6,6,3,1,1],[18,9,2,1,2]],[["ash",18,4],["brown",20,12]]],
 ["The long way",24,15,[[1,5,18,1,1],[5,9,18,1,1],[9,5,1,1,2],[14,9,2,1,2]],[["ash",20,3],["ash",11,7],["brown",20,12]]],
 ["Four corners",24,15,[[7,3,1,4,1],[7,6,3,1,1],[16,3,1,4,1],[13,6,3,1,1],[7,10,1,3,1],[7,10,3,1,1],[16,10,1,3,1],[13,10,3,1,1]],[["brown",3,3],["brown",20,3],["brown",20,12]]],
 ["Rocket lanes",24,15,[[8,1,1,9,1],[16,5,1,9,1],[8,7,1,1,2],[16,10,1,1,2],[11,5,2,1,3]],[["marine",19,2],["ash",11,8],["brown",19,12]]],
 ["Switchback",24,15,[[1,4,18,1,1],[5,7,18,1,1],[1,11,18,1,1],[6,4,2,1,2],[15,7,1,1,2],[9,11,2,1,2]],[["marine",20,2],["marine",9,6],["ash",19,13]]],
 ["Dogleg alley",24,15,[[8,1,1,6,1],[6,6,3,1,1],[6,6,1,4,1],[6,10,5,1,1],[16,5,1,9,1],[14,5,3,1,1],[16,10,1,2,2]],[["ash",4,2],["marine",19,2],["ash",12,7],["brown",20,12]]],
 ["Demolition route",24,15,[[1,5,18,1,1],[5,9,18,1,1],[4,5,2,1,2],[11,5,2,1,2],[8,9,3,1,2],[17,9,2,1,2],[13,11,1,2,1]],[["yellow",18,2],["ash",10,7],["marine",19,12]]],
 ["Causeways",24,15,[[6,3,4,3,3],[14,3,4,3,3],[6,9,4,4,3],[14,9,4,4,3],[11,4,1,7,1],[11,7,1,2,2]],[["yellow",20,2],["marine",20,9],["ash",4,4],["brown",20,13]]],
 ["Pink patrol",24,15,[[1,4,18,1,1],[5,9,18,1,1],[5,4,1,3,1],[17,7,1,2,1],[10,4,1,1,2],[13,9,1,1,2],[9,11,5,1,3]],[["pink",20,2],["pink",11,7],["yellow",20,13],["ash",4,7]]],
 ["Breach the barricades",24,15,[[7,1,1,9,1],[16,5,1,9,1],[7,5,1,2,2],[16,9,1,2,2],[10,5,3,1,1],[10,9,3,1,1],[12,6,1,3,2]],[["pink",20,2],["yellow",11,3],["marine",20,12],["ash",11,11]]],
 ["Green crossfire",26,16,[[10,1,1,6,1],[6,6,5,1,1],[15,4,1,3,1],[15,6,10,1,1],[1,10,10,1,1],[10,10,1,3,1],[15,10,1,5,1],[15,10,6,1,1],[9,6,2,1,2],[15,5,1,1,2],[9,10,2,1,2],[15,10,2,1,2]],[["green",5,3],["green",21,4],["ash",12,8],["pink",21,12]]],
 ["Reservoir locks",24,15,[[5,3,6,3,3],[15,8,5,3,3],[13,1,1,6,1],[8,8,1,6,1],[13,4,1,1,2],[8,11,1,1,2],[17,4,3,1,1]],[["green",20,2],["marine",18,7],["yellow",5,8],["pink",19,13]]],
 ["Sniper gallery",24,15,[[1,4,18,1,1],[5,8,18,1,1],[1,11,18,1,1],[7,4,1,1,2],[15,8,1,1,2],[8,11,1,1,2]],[["green",19,2],["green",3,6],["green",20,10],["pink",12,10],["yellow",20,13]]],
 ["Violet labyrinth",24,15,[[7,1,1,9,1],[15,5,1,9,1],[7,5,4,1,1],[11,5,1,5,1],[11,9,5,1,1],[7,7,1,1,2],[15,11,1,1,2],[4,11,2,1,3]],[["violet",18,3],["pink",11,3],["green",20,12],["yellow",4,7]]],
 ["Broken causeway",24,15,[[1,5,9,1,1],[10,5,1,4,1],[14,6,9,1,1],[14,2,1,5,1],[5,5,2,1,2],[17,6,2,1,2],[10,9,1,2,3],[11,10,6,1,3],[6,11,1,2,1]],[["violet",19,3],["violet",4,3],["green",19,12],["marine",12,7]]],
 ["Six green angles",26,16,[[10,1,1,6,1],[5,6,5,1,1],[16,3,1,4,1],[16,6,9,1,1],[1,9,9,1,1],[10,9,1,4,1],[16,9,1,6,1],[16,9,5,1,1],[8,6,2,1,2],[16,5,1,1,2],[8,9,2,1,2],[16,9,1,1,2]],[["green",5,3],["green",21,4],["green",4,8],["green",12,7],["green",22,8],["green",21,13]]],
 ["The narrow road",26,16,[[1,4,21,1,1],[4,6,21,1,1],[1,9,21,1,1],[4,11,21,1,1],[9,4,1,1,2],[15,6,1,1,2],[9,9,1,1,2],[15,11,1,1,2]],[["violet",22,2],["green",2,5],["green",22,7],["pink",8,10],["yellow",22,13]]],
 ["Fortress approach",26,16,[[7,3,1,9,1],[18,3,1,9,1],[7,3,12,1,1],[7,11,12,1,1],[12,3,2,1,2],[12,11,2,1,2],[7,6,1,2,2],[18,6,1,2,2],[11,6,4,1,1],[11,8,4,1,1]],[["violet",21,2],["violet",4,3],["pink",22,13],["green",10,5],["green",16,10],["yellow",13,7]]],
 ["Ghost corridors",24,15,[[7,1,1,5,1],[6,5,2,1,1],[6,5,1,4,1],[6,9,4,1,1],[15,4,1,10,1],[14,4,2,1,1],[6,7,1,1,2],[15,11,1,1,2],[10,4,1,1,1],[18,8,3,1,3]],[["white",20,3],["white",4,3],["violet",12,7],["green",20,12],["pink",10,11]]]
 ];
 function make(n,overrideTypes){
  if(!Number.isInteger(n)||n<1||n>100)throw Error('Mission must be 1–100.');
  let seed=(n*73471+829)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const base=layouts[n<=20?n-1:4+Math.floor(random()*16)], [name,cols,rows,rectangles,presets]=base;
  const grid=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>x===0||x===cols-1||y===0||y===rows-1?1:0));
  for(const [x,y,w,h,k] of rectangles){if(x<1||y<1||x+w>cols-1||y+h>rows-1)throw Error('Rectangle outside '+name);for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)grid[j][i]=k;}
  const players=[{x:2*40+20,y:(rows-3)*40+20},{x:4*40+20,y:(rows-3)*40+20}];
  const queue=[[2,rows-3]],seen=new Set([queue[0].join(',')]);
  // Breakable walls count as reachable: players can open them with mines.
  for(let q=0;q<queue.length;q++){const [x,y]=queue[q];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if([0,2].includes(grid[yy]?.[xx])&&!seen.has(k)){seen.add(k);queue.push([xx,yy]);}}}
  let types=overrideTypes||presets.map(e=>e[0]);
  if(n>20&&!overrideTypes){const pool=['ash','marine','yellow','pink','green','violet','white',...(n>=50?['black','black']:[])],count=n<34?4:n<61?5:n<81?6:n<91?7:8;types=Array.from({length:count},()=>pool[Math.floor(random()*pool.length)]);if(n===50||n===100)types[0]='black';}
  const candidates=queue.filter(([x,y])=>grid[y][x]===0).map(p=>({p,rank:random()})).sort((a,b)=>a.rank-b.rank).map(o=>o.p),taken=[];
  const spawns=types.map((type,id)=>{const preferred=presets[id]?.slice(1);const possible=preferred?[preferred,...candidates]:candidates;const p=possible.find(([x,y])=>grid[y]?.[x]===0&&seen.has(x+','+y)&&players.every(s=>Math.hypot(s.x/40-.5-x,s.y/40-.5-y)>6)&&taken.every(([a,b])=>Math.hypot(x-a,y-b)>=2.5));if(!p)throw Error('No spawn in '+name);taken.push(p);return {id,type,x:p[0]*40+20,y:p[1]*40+20};});
  return {name,grid,players,spawns,cols,rows};
 }
 return {make,layouts};
})();
