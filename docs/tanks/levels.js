/* Original arenas. Rectangles use a 24 × 15 grid of 40px cells.
   x, y, width, height, kind: 1 = block, 2 = cracked block, 3 = pit. */
'use strict';
window.TANK_LEVELS = (() => {
 const layouts = [
 ['First contact',[[11,5,2,5,1]],['brown']],
 ['Crossfire',[[7,4,2,6,1],[16,5,2,6,1]],['ash','brown']],
 ['The long way',[[5,7,14,1,1],[11,7,2,1,2]],['ash','ash','brown']],
 ['Four corners',[[6,4,3,3,1],[15,4,3,3,1],[6,10,3,2,1],[15,10,3,2,1]],['brown','brown','brown']],
 ['Incoming',[[11,3,2,4,1],[11,9,2,3,1],[6,7,3,1,3],[15,7,3,1,3]],['marine','ash','brown']],
 ['Split decision',[[5,4,1,7,1],[18,4,1,7,1],[9,7,6,1,2]],['marine','marine','ash']],
 ['Ricochet alley',[[7,3,1,8,1],[15,5,1,7,1]],['ash','marine','ash','brown']],
 ['Mind the mines',[[7,5,3,3,2],[14,8,3,3,2]],['yellow','ash','marine']],
 ['Island hopping',[[5,5,4,3,3],[15,5,4,3,3],[11,9,2,3,1]],['yellow','marine','ash','brown']],
 ['Pink patrol',[[7,4,2,6,1],[15,4,2,6,1],[10,10,4,1,2]],['pink','pink','yellow','ash']],
 ['Breakthrough',[[6,4,1,7,2],[17,4,1,7,2],[10,6,4,2,1]],['pink','yellow','marine','ash']],
 ['Bank shot',[[10,5,4,5,1],[5,7,2,1,3],[17,7,2,1,3]],['green','green','ash','pink']],
 ['The reservoir',[[8,5,8,4,3],[11,5,2,4,1]],['green','marine','yellow','pink']],
 ['Checkmate',[[6,4,2,2,1],[16,4,2,2,1],[6,9,2,2,1],[16,9,2,2,1],[11,7,2,1,2]],['green','pink','pink','yellow','marine']],
 ['Violet hour',[[7,3,1,8,1],[16,4,1,8,1],[10,7,4,1,2]],['violet','pink','green','yellow']],
 ['Fault lines',[[5,6,5,1,3],[14,8,5,1,3],[11,4,2,2,2],[11,10,2,2,2]],['violet','violet','green','marine']],
 ['Double trouble',[[6,4,3,6,1],[15,5,3,6,1],[11,7,2,2,2]],['violet','yellow','pink','green','marine']],
 ['The gauntlet',[[5,4,1,6,1],[9,6,1,6,1],[14,3,1,6,1],[18,6,1,6,1]],['violet','green','green','pink','yellow']],
 ['Last stand',[[6,4,3,2,2],[15,4,3,2,2],[6,10,3,2,2],[15,10,3,2,2],[11,6,2,3,1]],['violet','violet','pink','green','yellow','marine']],
 ['Ghost tracks',[[7,5,3,5,1],[14,5,3,5,1],[11,7,2,1,3]],['white','white','violet','green','pink']]
 ];
 function make(n){
  let seed=(n*73471+829)>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const base=layouts[n<=20?n-1:1+Math.floor(random()*18)];
  let types=[...base[2]];
  if(n>20){const pool=['ash','marine','yellow','pink','green','violet','white',...(n>=50?['black','black']:[])];const count=n<34?4:n<61?5:n<81?6:n<91?7:8;types=Array.from({length:count},()=>pool[Math.floor(random()*pool.length)]);if(n===50||n===100)types[0]='black';}
  const grid=Array.from({length:15},(_,y)=>Array.from({length:24},(_,x)=>x===0||x===23||y===0||y===14?1:0));
  for(const [x,y,w,h,k] of base[1])for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)grid[j][i]=k;
  // Keep spawn cells in the connected component of the player; no inaccessible enemies.
  const queue=[[2,12]],seen=new Set(['2,12']);for(let z=0;z<queue.length;z++){const [x,y]=queue[z];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,key=xx+','+yy;if(grid[yy]?.[xx]===0&&!seen.has(key)){seen.add(key);queue.push([xx,yy]);}}}
  const preferred=[[21,2],[18,2],[21,7],[13,2],[3,2],[21,12],[10,2],[19,11]];
  const taken=[];const spawns=types.map((type,i)=>{const candidates=[preferred[i],...queue.filter(([x,y])=>y<10)];const p=candidates.find(([x,y])=>seen.has(x+','+y)&&!taken.some(([a,b])=>Math.hypot(a-x,b-y)<2.5)&&Math.hypot(x-2,y-12)>7);if(!p)throw Error('No safe enemy spawn');taken.push(p);return {id:i,type,x:p[0]*40+20,y:p[1]*40+20};});
  return {name:base[0],grid,spawns};
 }
 return {make,layouts};
})();
