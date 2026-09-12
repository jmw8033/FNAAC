(function(global){
'use strict';
const TILE=64,COLS=160,ROWS=120;
function hash(x,y,s=0){let n=Math.imul(x+731,374761393)^Math.imul(y+193,668265263)^Math.imul(s+19,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
function regionAt(x,y){if(x>112+Math.sin(y*.14)*3&&y<51+Math.sin(x*.09)*3)return 5;if(y<35+Math.sin(x*.12)*3)return x<72+Math.sin(y*.2)*3?1:4;if(x>89+Math.sin(y*.1)*4)return 2;if(y>79+Math.sin(x*.11)*4)return 3;return 0;}
const towns=[{id:'brindle',name:'Brindle',x:34,y:57,color:'#df8c61'},{id:'dunewell',name:'Dunewell',x:117,y:74,color:'#deb65f'},{id:'frostgate',name:'Frostgate',x:83,y:23,color:'#809dba'}];
function makeWorld(){
 const tiles=new Uint8Array(COLS*ROWS),regions=new Uint8Array(COLS*ROWS),roads=new Set(),buildings=[],npcs=[],nodes=[],spawns=[],landmarks=[];
 const set=(x,y,v)=>{if(x>=0&&y>=0&&x<COLS&&y<ROWS)tiles[y*COLS+x]=v;};
 function road(ax,ay,bx,by,width=1){let x=ax,y=ay;while(true){for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++){set(x+dx,y+dy,3);roads.add((y+dy)*COLS+x+dx);}if(x===bx&&y===by)break;if(x!==bx)x+=Math.sign(bx-x);else y+=Math.sign(by-y);}}
 // Region silhouettes, a winding river, wetlands, and a northern rock belt.
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const r=regionAt(x,y);regions[y*COLS+x]=r;let t=0;
  const river=67+Math.sin(y*.095)*6;
  if(Math.abs(x-river)<2.3)t=1;
  if(((x-23)/12)**2+((y-91)/8)**2<1||((x-102)/7)**2+((y-20)/5)**2<1)t=1;
  if(r===3&&hash(Math.floor(x/4),Math.floor(y/4),8)>.91)t=1;
  if((r===1||r===4)&&hash(Math.floor(x/3),Math.floor(y/3),5)>.88)t=2;
  if(x<2||y<2||x>=COLS-2||y>=ROWS-2)t=2;
  set(x,y,t);
 }
 road(34,57,117,74);road(34,57,34,23);road(34,23,83,23);road(83,23,132,38);road(117,74,132,38);road(34,57,47,97);road(47,97,90,97);road(83,23,83,57);
 for(const town of towns){
  for(let y=town.y-8;y<=town.y+8;y++)for(let x=town.x-10;x<=town.x+10;x++)set(x,y,Math.abs(x-town.x)<=1||Math.abs(y-town.y)<=1?3:0);
  const defs=[[-7,-5,4,3,'Workshop','workshop'],[3,-5,4,3,'Depot','bank'],[-7,3,4,3,'Garage','repair'],[3,3,4,3,'Recovery','recovery'],[-1,-7,2,2,'House',null],[7,-1,2,2,'House',null]];
  for(const [dx,dy,w,h,name,service] of defs){const b={x:(town.x+dx)*TILE,y:(town.y+dy)*TILE,w:w*TILE,h:h*TILE,name,color:town.color};buildings.push(b);for(let yy=town.y+dy;yy<=town.y+dy+h+1;yy++)for(let xx=town.x+dx-1;xx<=town.x+dx+w;xx++)set(xx,yy,3);if(service)npcs.push({id:town.id+'-'+service,name:service==='recovery'?'Keeper':service==='repair'?'Mechanic':service==='bank'?'Quartermaster':'Engineer',service,x:b.x+b.w/2,y:b.y+b.h+45,body:Math.PI/2,angle:Math.PI/2,color:service==='recovery'?'#b6a2d4':'#77c8d1'});}
  npcs.push({id:town.id+'-citizen',name:'Resident',service:'resident',x:(town.x+1)*TILE,y:(town.y+1)*TILE,body:0,angle:0,color:'#e6ba70'});
 }
 const occupied=(x,y,pad=0)=>buildings.some(b=>x>b.x-pad&&y>b.y-pad&&x<b.x+b.w+pad&&y<b.y+b.h+pad);
 const safe=(x,y)=>towns.some(t=>Math.abs(x/TILE-t.x)<11&&Math.abs(y/TILE-t.y)<9);
 for(let y=4;y<ROWS-4;y++)for(let x=4;x<COLS-4;x++){
  if(tiles[y*COLS+x]||safe(x*TILE,y*TILE))continue;
  const r=regionAt(x,y),h=hash(x,y,11);
  if(h<.025){let kind=r===4?'crystal':r===2?'copper':h<.012?'iron':'scrap';nodes.push({id:'n'+x+'-'+y,x:(x+.5)*TILE,y:(y+.5)*TILE,kind,req:kind==='crystal'?5:1,skill:kind==='scrap'?'Salvaging':'Mining',ready:0});}
  if((r===1&&h>.83)||(r===3&&h>.94)||(r===4&&h>.975))set(x,y,4);
 }
 // Guaranteed nearby gathering and training sites, off the main street.
 for(const [x,y,kind] of [[23,66,'iron'],[24,66,'copper'],[25,66,'scrap'],[21,63,'scrap']]){set(x,y,0);nodes.push({id:'start-'+kind+x,x:(x+.5)*TILE,y:(y+.5)*TILE,kind,req:1,skill:kind==='scrap'?'Salvaging':'Mining',ready:0});}
 const camps=[[20,56,'scout'],[28,71,'scout'],[48,64,'scout'],[39,41,'scout'],[25,29,'rover'],[45,16,'rover'],[53,31,'rover'],[52,87,'carrier'],[35,105,'carrier'],[85,88,'carrier'],[98,62,'raider'],[136,89,'raider'],[125,102,'raider'],[146,61,'raider'],[76,12,'sentry'],[93,33,'sentry'],[103,12,'sentry'],[122,18,'heavy'],[145,29,'heavy'],[141,45,'artillery'],[118,46,'artillery']];
 for(const [x,y,type] of camps){for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++)set(x+ox,y+oy,0);spawns.push({id:'e'+spawns.length,x:(x+.5)*TILE,y:(y+.5)*TILE,type});if(type!=='scout')spawns.push({id:'e'+spawns.length,x:(x+2.5)*TILE,y:(y+1.5)*TILE,type});}
 landmarks.push({name:'Copper quarry',x:105,y:89},{name:'Old rail yard',x:50,y:91},{name:'Northwatch',x:140,y:30});
 for(const [x,y] of [[104,86],[105,86],[106,86]])nodes.push({id:'quarry'+x,x:x*TILE,y:y*TILE,kind:'copper',req:1,skill:'Mining',ready:0});
 // Ruins and military compounds create cover without sealing off routes.
 for(const [x,y,w,h] of [[50,89,5,1],[50,94,1,4],[54,94,3,1],[137,26,7,1],[137,26,1,7],[144,29,1,4],[118,43,5,1],[101,88,1,4]])buildings.push({x:x*TILE,y:y*TILE,w:w*TILE,h:h*TILE,name:'',color:'#8d8f83',ruin:true});
 const tile=(x,y)=>x<0||y<0||x>=COLS*TILE||y>=ROWS*TILE?2:tiles[Math.floor(y/TILE)*COLS+Math.floor(x/TILE)];
 function blocked(x,y,r=18,projectile=false){for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){const t=tile(x+dx,y+dy);if(t===2||(!projectile&&(t===1||t===4)))return true;}return occupied(x,y,r);}
 const clear=(a,b)=>{const d=Math.hypot(a.x-b.x,a.y-b.y),n=Math.ceil(d/14);for(let i=1;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,3,true))return false;return true;};
 return {TILE,COLS,ROWS,tiles,regions,towns,buildings,npcs,nodes,spawns,landmarks,tile,blocked,clear,safe,region:(x,y)=>regionAt(x/TILE,y/TILE),width:COLS*TILE,height:ROWS*TILE};
}
global.FrontierWorld={makeWorld,hash,TILE,COLS,ROWS};
})(globalThis);
