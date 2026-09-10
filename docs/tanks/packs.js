'use strict';
window.TankPacks = (() => {
 const DRAFT_KEY='fnaac-tanks-editor-v2',PLAY_KEY='fnaac-tanks-play-v2';
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validate(raw,allowEmpty=false){
  if(!raw||![2,3].includes(raw.version)||!Array.isArray(raw.levels)||raw.levels.length<1||raw.levels.length>100)throw Error('Use a version 2 or 3 pack with 1–100 levels.');
  const pack={version:3,name:String(raw.name||'Custom campaign').slice(0,80),levels:[]};
  for(let i=0;i<raw.levels.length;i++){
   const l=raw.levels[i],label='Level '+(i+1)+': ';
   const rows=l?.grid?.length,cols=l?.grid?.[0]?.length;
   if(!l||!Array.isArray(l.grid)||rows<12||rows>30||cols<16||cols>48||l.grid.some(r=>!Array.isArray(r)||r.length!==cols||r.some(v=>!Number.isInteger(v)||v<0||v>3)))throw Error(label+'room must be 16–48 columns × 12–30 rows, using tile values 0–3.');
   const grid=l.grid.map(r=>r.slice());for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if((x===0||x===cols-1||y===0||y===rows-1)&&grid[y][x]!==1)throw Error(label+'outer border must be solid wall.');
   const cell=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=1&&p.x<cols-1&&p.y>=1&&p.y<rows-1;
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
 function fromRuntime(l){return {name:l.name,music:'auto',grid:l.grid,players:l.players.map(p=>({x:(p.x-20)/40,y:(p.y-20)/40})),enemies:l.spawns.map(e=>({type:e.type,x:(e.x-20)/40,y:(e.y-20)/40}))};}
 function builtin(n=20){return {version:3,name:n===100?'Classic extended':'Classic campaign',levels:Array.from({length:n},(_,i)=>fromRuntime(TANK_LEVELS.make(i+1)))};}
 function expansion(){
  const maps=[2,3,6,10,14,18,7,12,16,19];
  const names=['Meet the bulwark','Coral crossfire','Crimson rush','Shield and scatter','Moving targets','Combined arms','Incoming artillery','Counter-battery','Copper causeway','Siege of the citadel'];
  const types=[['bulwark','ash'],['scatter','scatter','brown'],['dash','ash','ash'],['bulwark','scatter','yellow'],['dash','dash','marine'],['bulwark','scatter','dash','green'],['mortar','ash','brown'],['mortar','mortar','scatter'],['mortar','bulwark','dash','marine'],['mortar','mortar','bulwark','scatter','dash','green']];
  return validate({version:3,name:'Reinforcements',levels:maps.map((n,i)=>{const l=fromRuntime(TANK_LEVELS.make(n,types[i]));l.name=names[i];l.music=['march','citadel','night'][i%3];return l;})});
 }
 // Resize without silently discarding content. Expansion preserves coordinates.
 // Shrinking fails if an object or interior obstacle would be cut off.
 function resize(level,cols,rows){
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<16||cols>48||rows<12||rows>30)throw Error('Use 16–48 columns and 12–30 rows.');
  const oldH=level.grid.length,oldW=level.grid[0].length;
  for(const p of [...level.players,...level.enemies])if(p.x>=cols-1||p.y>=rows-1)throw Error('Move tanks and player starts inside the new room before shrinking.');
  for(let y=1;y<oldH-1;y++)for(let x=1;x<oldW-1;x++)if(level.grid[y][x]&&(x>=cols-1||y>=rows-1))throw Error('Erase obstacles outside the new room before shrinking. Undo is available.');
  const result=clone(level);result.grid=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>x===0||y===0||x===cols-1||y===rows-1?1:x<oldW-1&&y<oldH-1?level.grid[y][x]:0));return result;
 }
 function runtime(pack,n){const l=pack.levels[n-1];if(!l)throw Error('Mission not in campaign');return {name:l.name,music:l.music,grid:l.grid.map(r=>r.slice()),players:l.players.map(p=>({x:p.x*40+20,y:p.y*40+20})),spawns:l.enemies.map((e,id)=>({id,type:e.type,x:e.x*40+20,y:e.y*40+20}))};}
 return {DRAFT_KEY,PLAY_KEY,clone,validate,warnings,builtin,expansion,runtime,resize};
})();
