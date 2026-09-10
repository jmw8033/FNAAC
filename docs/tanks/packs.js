'use strict';
window.TankPacks = (() => {
 const DRAFT_KEY='fnaac-tanks-editor-v2',PLAY_KEY='fnaac-tanks-play-v2';
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validate(raw,allowEmpty=false){
  if(!raw||raw.version!==2||!Array.isArray(raw.levels)||raw.levels.length<1||raw.levels.length>100)throw Error('Use a version 2 pack with 1–100 levels.');
  const pack={version:2,name:String(raw.name||'Custom campaign').slice(0,80),levels:[]};
  for(let i=0;i<raw.levels.length;i++){
   const l=raw.levels[i],label='Level '+(i+1)+': ';
   if(!l||!Array.isArray(l.grid)||l.grid.length!==15||l.grid.some(r=>!Array.isArray(r)||r.length!==24||r.some(v=>!Number.isInteger(v)||v<0||v>3)))throw Error(label+'grid must be 24 × 15 with tile values 0–3.');
   const grid=l.grid.map(r=>r.slice());for(let y=0;y<15;y++)for(let x=0;x<24;x++)if((x===0||x===23||y===0||y===14)&&grid[y][x]!==1)throw Error(label+'outer border must be solid wall.');
   const cell=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=1&&p.x<=22&&p.y>=1&&p.y<=13;
   if(!Array.isArray(l.players)||l.players.length!==2||l.players.some(p=>!cell(p)))throw Error(label+'place both player starts on the grid.');
   if(!Array.isArray(l.enemies)||(!allowEmpty&&l.enemies.length<1)||l.enemies.length>24)throw Error(label+'place between 1 and 24 enemies.');
   const players=l.players.map(p=>({x:p.x,y:p.y})),enemies=l.enemies.map(e=>{if(!cell(e)||!Object.hasOwn(TANK_UNITS,e.type)||e.type==='player')throw Error(label+'unknown tank or invalid spawn.');return {x:e.x,y:e.y,type:e.type};});
   const occupied=new Set();for(const p of [...players,...enemies]){const key=p.x+','+p.y;if(grid[p.y][p.x])throw Error(label+'a tank is inside an obstacle.');if(occupied.has(key))throw Error(label+'two starts share a cell.');occupied.add(key);}
   const music=['auto','march','citadel','night'].includes(l.music)?l.music:'auto';
   pack.levels.push({name:String(l.name||'Untitled arena').slice(0,64),music,grid,players,enemies});
  }return pack;
 }
 function warnings(level){
  // Cracked walls can be removed with mines. Pits can be shot across.
  const p=level.players[0],queue=[p],seen=new Set([p.x+','+p.y]);
  for(let i=0;i<queue.length;i++){const {x,y}=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if([0,2].includes(level.grid[yy]?.[xx])&&!seen.has(k)){seen.add(k);queue.push({x:xx,y:yy});}}}
  const count=level.enemies.filter(e=>!seen.has(e.x+','+e.y)).length;return count?[`${count} enemies cannot be reached by driving, even after breaking cracked walls. Check firing lanes across pits or walls.`]:[];
 }
 function builtin(n=20){return {version:2,name:n===100?'Classic extended':'Classic campaign',levels:Array.from({length:n},(_,i)=>{const l=TANK_LEVELS.make(i+1);return {name:l.name,music:'auto',grid:l.grid,players:[{x:2,y:12},{x:4,y:12}],enemies:l.spawns.map(e=>({type:e.type,x:(e.x-20)/40,y:(e.y-20)/40}))};})};}
 function expansion(){const pack=builtin(6);pack.name='Reinforcements';const names=['Meet the bulwark','Coral crossfire','Crimson rush','Shield and scatter','Moving targets','Combined arms'];const types=[['bulwark','ash'],['scatter','scatter','brown'],['dash','ash','ash'],['bulwark','scatter','yellow'],['dash','dash','marine'],['bulwark','scatter','dash','green']];pack.levels.forEach((l,i)=>{l.name=names[i];const base=TANK_LEVELS.make([2,3,6,10,14,18][i]);l.grid=base.grid;l.enemies=types[i].map((type,j)=>({type,x:(base.spawns[j].x-20)/40,y:(base.spawns[j].y-20)/40}));l.music=['march','citadel','night'][i%3];});return validate(pack);}
 function runtime(pack,n){const l=pack.levels[n-1];if(!l)throw Error('Mission not in campaign');return {name:l.name,music:l.music,grid:l.grid.map(r=>r.slice()),players:l.players.map(p=>({x:p.x*40+20,y:p.y*40+20})),spawns:l.enemies.map((e,id)=>({id,type:e.type,x:e.x*40+20,y:e.y*40+20}))};}
 return {DRAFT_KEY,PLAY_KEY,clone,validate,warnings,builtin,expansion,runtime};
})();
