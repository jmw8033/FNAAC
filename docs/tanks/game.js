'use strict';
(() => {
 const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
 let W=960,H=600;
 const CELL=40,R=15,TAU=Math.PI*2;
 const TYPES=TANK_UNITS;
 let tanks=[],shells=[],mines=[],artillery=[],fx=[],tracks=[],wrecks=[],grid=[],time=0,mission=1,lives=3,kills=0,mode=1,phase='menu',limit=20,defeated=new Set(),uid=0,shake=0;
 let last=0,acc=0,transition=0,unlocked=false,best=0,muted=false,audio=null,moveTouch={x:0,y:0};
 const music=new TankMusic.Player();
 let campaign=null,source='classic',currentSong='march';
 const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const missionData=()=>campaign?TankPacks.runtime(campaign,mission):TANK_LEVELS.make(mission);
 const campaignLimit=()=>campaign?campaign.levels.length:mode===2?20:unlocked?100:20;
 const keys=new Set(),pointer={x:760,y:100,down:false},gamepadMine=new Map();let action=()=>start();
 try{unlocked=localStorage.getItem('fnaac-tanks-unlocked')==='1';best=+localStorage.getItem('fnaac-tanks-best')||0;muted=localStorage.getItem('fnaac-tanks-muted')==='1';}catch{}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function save(){try{localStorage.setItem('fnaac-tanks-best',String(best));localStorage.setItem('fnaac-tanks-unlocked',unlocked?'1':'0');localStorage.setItem('fnaac-tanks-muted',muted?'1':'0');}catch{}}
 function sound(f=220,d=.1,type='square',vol=.035){if(muted)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,f*.35),audio.currentTime+d);g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d);}catch{}}
 function makeTank(type,x,y,player=0,id=0){return {uid:uid++,id,type,x,y,player,cfg:TYPES[type],angle:player?-.7:2.4,body:player?-.7:2.4,alive:true,cool:player?0:1.5+Math.random(),mineCool:player?0:3+Math.random()*4,stop:0,vx:0,vy:0,think:0,path:[],wander:Math.random()*TAU,track:0,score:0};}
 function load(retry=false){const level=missionData();grid=level.grid;H=grid.length*CELL;W=grid[0].length*CELL;canvas.width=W;canvas.height=H;canvas.style.aspectRatio=W+' / '+H;pointer.x=W*.75;pointer.y=H*.25;const starts=level.players||[{x:100,y:500},{x:180,y:500}];currentSong=level.music&&level.music!=='auto'?level.music:['march','citadel','night'][(mission-1)%3];tanks=[makeTank('player',starts[0].x,starts[0].y,1)];if(mode===2)tanks.push(makeTank('player',starts[1].x,starts[1].y,2));for(const e of level.spawns)if(!defeated.has(e.id))tanks.push(makeTank(e.type,e.x,e.y,0,e.id));shells=[];mines=[];artillery=[];fx=[];tracks=[];wrecks=[];time=0;pointer.down=false;gamepadMine.clear();$('field-name').textContent=level.name.toUpperCase();hud();}
 function panel(tag,title,text,label,fn,secondary=false){$('overlay').hidden=false;$('overlay-tag').textContent=tag;$('overlay-tag').hidden=!tag;$('overlay-title').innerHTML=title;$('overlay-text').innerHTML=text;$('overlay-text').hidden=!text;$('action').textContent=label;$('secondary').hidden=!secondary;$('mode-row').hidden=phase!=='menu';$('mode-row').style.display=phase==='menu'?'flex':'none';$('campaign-row').hidden=phase!=='menu';$('record').textContent=phase==='menu'?(campaign?`${campaign.name} · ${limit} missions`:`Best: ${best} cleared · ${unlocked?'100 missions unlocked':'20 missions · 3 lives · one hit'}`):'';action=fn;}
 function menu(){phase='menu';mission=1;lives=3;kills=0;defeated.clear();limit=campaignLimit();load();panel('','Tanks!','','Start',start);}
 function start(){mission=1;lives=3;kills=0;limit=campaignLimit();defeated.clear();load();brief();sound(400,.15);}
 function brief(){phase='brief';panel(`MISSION ${String(mission).padStart(2,'0')}`,escapeHTML(missionData().name),`${tanks.filter(t=>!t.player).length} enemies.`,'Start mission',()=>{phase='play';$('overlay').hidden=true;keys.clear();canvas.focus();});}
 function pause(){if(phase==='play'){phase='pause';pointer.down=false;keys.clear();moveTouch={x:0,y:0};held.clear();panel('','Paused','','Resume',()=>{phase='play';$('overlay').hidden=true;canvas.focus();},true);}else if(phase==='pause'){phase='play';$('overlay').hidden=true;canvas.focus();}}
 function hud(){const p=tanks.find(t=>t.player===1),n=tanks.filter(t=>!t.player&&t.alive).length;$('mission').innerHTML=`${String(mission).padStart(2,'0')} <em>/ ${limit}</em>`;$('lives-label').textContent=mode===2?'BLUE / RED':'LIVES';$('lives').textContent=mode===2?tanks.filter(t=>t.player).map(t=>t.alive?'●':'×').join(' / '):lives;$('score').textContent=mode===2?tanks.filter(t=>t.player).map(t=>t.score).join(' / '):String(kills).padStart(2,'0');$('enemies').textContent=`${n} ${n===1?'enemy':'enemies'} remaining`;$('shells').textContent=Array.from({length:5},(_,i)=>i<5-shells.filter(s=>s.owner===p?.uid&&!s.dead).length?'●':'○').join(' ');$('mines').textContent=Array.from({length:2},(_,i)=>i<2-mines.filter(m=>m.owner===p?.uid&&!m.dead).length?'◆':'◇').join(' ');}
 function tile(x,y){return grid[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]??1;}
 function solid(x,y,r=R,holes=true){if(x-r<40||y-r<40||x+r>W-40||y+r>H-40)return true;for(let j=Math.floor((y-r)/40);j<=Math.floor((y+r)/40);j++)for(let i=Math.floor((x-r)/40);i<=Math.floor((x+r)/40);i++){const v=grid[j]?.[i]??1;if(v&&(holes||v!==3)){const nx=clamp(x,i*40,(i+1)*40),ny=clamp(y,j*40,(j+1)*40);if((nx-x)**2+(ny-y)**2<r*r)return true;}}return false;}
 function move(t,dx,dy){const ox=t.x,oy=t.y;const free=(x,y)=>!solid(x,y)&&!tanks.some(o=>o!==t&&o.alive&&Math.hypot(o.x-x,o.y-y)<R*2);if(free(t.x+dx,t.y))t.x+=dx;if(free(t.x,t.y+dy))t.y+=dy;return Math.hypot(t.x-ox,t.y-oy);}
 function burst(x,y,color,n=14){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=30+Math.random()*120;fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.4,max:.7,color,size:2+Math.random()*4});}}
 // Enemy fire discipline: inspect the real muzzle path, including ricochets.
 // A small margin and short linear motion estimate discourage risky shots without
 // granting friendly-fire immunity or assuming perfect knowledge of future movement.
 function risksAlly(t,angle,offset=0){
  const allies=tanks.filter(o=>o.alive&&!o.player&&o!==t);if(!allies.length)return false;
  const muzzle=t.type==='scatter'?29:23,lateral=t.type==='scatter'?Math.sign(offset)*5:0;
  let x=t.x+Math.cos(angle)*muzzle-Math.sin(t.angle)*lateral,y=t.y+Math.sin(angle)*muzzle+Math.cos(t.angle)*lateral;
  let dx=Math.cos(angle)*4,dy=Math.sin(angle)*4,b=t.cfg.bounce,travel=0;
  if(solid(x,y,3,false))return false;
  const max=Math.ceil(Math.min(t.cfg.shot*15,Math.hypot(W,H)*(b+1))/4);
  for(let i=0;i<max;i++){
   const arrival=Math.min(.35,travel/Math.max(1,t.cfg.shot));
   for(const o of allies){
    const nx=o.x+o.vx*arrival,ny=o.y+o.vy*arrival;
    if(Math.hypot(x-o.x,y-o.y)<R+8||Math.hypot(x-nx,y-ny)<R+8)return true;
   }
   // A shell ends on the first player it strikes, so allies beyond it are safe.
   if(tanks.some(o=>o.alive&&o.player&&Math.hypot(x-o.x,y-o.y)<R+2))return false;
   const nx=x+dx,ny=y+dy,hx=solid(nx,y,3,false),hy=solid(x,ny,3,false);
   if(hx||hy||solid(nx,ny,3,false)){
    if(b--<=0)return false;if(hx)dx=-dx;if(hy)dy=-dy;if(!hx&&!hy){dx=-dx;dy=-dy;}
   }else{x=nx;y=ny;}travel+=4;
  }return false;
 }
 function safeToFire(t,offsets=[0]){
  if(t.player)return true;
  if(t.type==='mortar'){
   if(!t.aimPoint)return false;
   return !tanks.some(o=>o.alive&&!o.player&&(Math.hypot(o.x-t.aimPoint.x,o.y-t.aimPoint.y)<70+R+12||Math.hypot(o.x+o.vx*.35-t.aimPoint.x,o.y+o.vy*.35-t.aimPoint.y)<70+R+12));
  }
  return !offsets.some(a=>risksAlly(t,t.angle+a,a));
 }
 function fire(t){
  if(!t.alive||phase!=='play'||t.cool>0||t.charge>0||t.dashing>0||t.recover>0)return false;
  if(t.type==='mortar'){if(!safeToFire(t)){t.cool=.16;return false;}return launchMortar(t);}
  const room=t.cfg.cap-shells.filter(s=>s.owner===t.uid&&!s.dead).length;if(room<=0)return false;
  const offsets=(t.type==='scatter'?[0,-.23,.23]:[0]).slice(0,room);
  if(!safeToFire(t,offsets)){t.cool=.16;return false;}
  t.cool=t.cfg.cool;t.stop=.085;
  for(const offset of offsets){
   const a=t.angle+offset,dx=Math.cos(a),dy=Math.sin(a),muzzle=t.type==='scatter'?29:23,lateral=t.type==='scatter'?Math.sign(offset)*5:0;
   const s={x:t.x+dx*muzzle-Math.sin(t.angle)*lateral,y:t.y+dy*muzzle+Math.cos(t.angle)*lateral,vx:dx*t.cfg.shot,vy:dy*t.cfg.shot,owner:t.uid,player:t.player,bounce:t.cfg.bounce,age:0,dead:false};
   if(solid(s.x,s.y,3,false))burst(s.x,s.y,'#ffe3a1',4);else shells.push(s);
  }
  sound(t.cfg.shot>300?150:220,.07,'square',t.player?.03:.015);return true;
 }
 function launchMortar(t){
  if(!t.aimPoint||artillery.filter(a=>a.owner===t.uid&&!a.dead).length>=t.cfg.cap)return false;
  t.cool=t.cfg.cool;t.stop=.2;
  artillery.push({x:t.aimPoint.x,y:t.aimPoint.y,fromX:t.x,fromY:t.y,age:0,duration:1.5,radius:70,owner:t.uid,player:t.player,dead:false});
  sound(100,.18,'triangle',.03);return true;
 }
 function updateArtillery(dt){for(const a of artillery){if(a.dead)continue;a.age+=dt;if(a.age>=a.duration)explode(a);}artillery=artillery.filter(a=>!a.dead);}
 function shellHit(t,s){
  if(t.type==='bulwark'&&Math.abs(wrap(Math.atan2(s.y-t.y,s.x-t.x)-t.angle))<Math.PI*.36){
   t.shieldFlash=.2;burst(s.x,s.y,'#9de9ff',7);sound(810,.07,'triangle',.015);s.dead=true;return;
  }kill(t,s.player);s.dead=true;
 }

 function lay(t){if(!t?.alive||phase!=='play'||!t.cfg.mines||t.mineCool>0||mines.filter(m=>m.owner===t.uid&&!m.dead).length>=t.cfg.mines)return;t.mineCool=t.player?.35:t.type==='yellow'?1.8:5;mines.push({x:t.x,y:t.y,owner:t.uid,player:t.player,age:0,fuse:10,dead:false});sound(650,.09,'sine');}
 function kill(t,credit=0){if(!t.alive)return;t.alive=false;wrecks.push({x:t.x,y:t.y});burst(t.x,t.y,t.cfg.color,20);burst(t.x,t.y,'#ffc465',12);shake=5;sound(80,.3,'sawtooth',.055);if(!t.player){defeated.add(t.id);kills++;const p=tanks.find(t=>t.player===credit);if(p)p.score++;}}
 function explode(m){if(m.dead)return;const radius=m.radius||95;m.dead=true;burst(m.x,m.y,'#ffc158',50);shake=9;sound(60,.5,'sawtooth',.07);fx.push({x:m.x,y:m.y,vx:0,vy:0,life:.35,max:.35,color:'#ffd77d',size:radius,ring:true});for(const t of tanks)if(t.alive&&dist(t,m)<radius+R)kill(t,m.player);for(const s of shells)if(dist(s,m)<radius)s.dead=true;for(let y=1;y<grid.length-1;y++)for(let x=1;x<grid[0].length-1;x++)if(grid[y][x]===2&&Math.hypot(clamp(m.x,x*40,x*40+40)-m.x,clamp(m.y,y*40,y*40+40)-m.y)<radius){grid[y][x]=0;burst(x*40+20,y*40+20,'#a67742',12);}for(const other of mines)if(!other.dead&&dist(other,m)<radius)explode(other);}
 // Fine substeps prevent fast rockets tunneling through tanks or walls.
 function updateShells(dt){const steps=4,sub=dt/steps;for(let k=0;k<steps;k++){for(const s of shells){if(s.dead)continue;s.age+=sub;if(s.age>15){s.dead=true;continue;}let nx=s.x+s.vx*sub,ny=s.y+s.vy*sub;const hitX=solid(nx,s.y,3,false),hitY=solid(s.x,ny,3,false),hitBoth=solid(nx,ny,3,false);if(hitX||hitY||hitBoth){if(s.bounce<=0){s.dead=true;burst(s.x,s.y,'#ffe3a1',4);continue;}s.bounce--;if(hitX)s.vx=-s.vx;if(hitY)s.vy=-s.vy;if(!hitX&&!hitY){s.vx=-s.vx;s.vy=-s.vy;}burst(s.x,s.y,'#ffe8bd',3);sound(600,.035,'triangle',.008);}else{s.x=nx;s.y=ny;}for(const t of tanks)if(t.alive&&!(s.owner===t.uid&&s.age<.12)&&dist(s,t)<R+3){shellHit(t,s);break;}if(s.dead)continue;for(const m of mines)if(!m.dead&&dist(s,m)<10){s.dead=true;explode(m);break;}}
 for(let i=0;i<shells.length;i++)for(let j=i+1;j<shells.length;j++){const a=shells[i],b=shells[j];if(!a.dead&&!b.dead&&dist(a,b)<8){a.dead=b.dead=true;burst(a.x,a.y,'#ffeba8',6);}}}shells=shells.filter(s=>!s.dead);}
 function pathTo(t,target){const sx=Math.floor(t.x/40),sy=Math.floor(t.y/40),gx=Math.floor(target.x/40),gy=Math.floor(target.y/40),queue=[[sx,sy]],parents=new Map([[sx+','+sy,null]]);let found=null;for(let q=0;q<queue.length;q++){const [x,y]=queue[q];if(x===gx&&y===gy){found=[x,y];break;}for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const xx=x+dx,yy=y+dy,key=xx+','+yy;if(grid[yy]?.[xx]===0&&!parents.has(key)){parents.set(key,[x,y]);queue.push([xx,yy]);}}}if(!found)return [];const path=[];while(found){path.push({x:found[0]*40+20,y:found[1]*40+20});found=parents.get(found.join(','));}path.reverse();path.shift();return path;}
 // Ray simulation finds direct and bank shots against the actual arena geometry.
 function rayHits(t,angle,target){let x=t.x+Math.cos(angle)*23,y=t.y+Math.sin(angle)*23,dx=Math.cos(angle)*7,dy=Math.sin(angle)*7,b=t.cfg.bounce;for(let n=0,max=Math.ceil(Math.hypot(W,H)*(t.cfg.bounce+1)/7);n<max;n++){const nx=x+dx,ny=y+dy,hx=solid(nx,y,3,false),hy=solid(x,ny,3,false);if(hx||hy||solid(nx,ny,3,false)){if(b--<=0)return false;if(hx)dx=-dx;if(hy)dy=-dy;if(!hx&&!hy){dx=-dx;dy=-dy;}}else{x=nx;y=ny;}if(Math.hypot(x-target.x,y-target.y)<20)return true;}return false;}
 function visibleShot(t,s){
  const d=dist(t,s);for(let n=8;n<d;n+=8){const x=t.x+(s.x-t.x)*n/d,y=t.y+(s.y-t.y)*n/d,v=tile(x,y);if(v===1||v===2)return false;}return true;
 }
 function threatening(t,s){
  if(s.dead||(s.owner===t.uid&&s.age<.18)||dist(t,s)>130)return false;
  const dx=t.x-s.x,dy=t.y-s.y,v=Math.hypot(s.vx,s.vy);if(!v)return false;
  const along=(dx*s.vx+dy*s.vy)/v,cross=(dx*s.vy-dy*s.vx)/v;
  return along>0&&Math.abs(cross)<27&&visibleShot(t,s);
 }
 function reactToShells(t,dt){
  if(!t.cfg.speed||t.type==='yellow')return null;
  t.dodgeCooldown=Math.max(0,(t.dodgeCooldown||0)-dt);
  if(t.dodge){t.dodge.left-=dt;if(t.dodge.left>0)return t.dodge;t.dodge=null;t.dodgeCooldown=.28;}
  if(t.pendingDodge){
   t.pendingDodge.left-=dt;
   if(t.pendingDodge.left<=0){const p=t.pendingDodge;t.pendingDodge=null;
    if(threatening(t,p.shell)){t.dodge={x:p.x,y:p.y,left:.24};return t.dodge;}
   }return null;
  }
  t.sense=(t.sense||0)-dt;if(t.sense>0||t.dodgeCooldown>0)return null;t.sense=.09;
  const s=shells.find(s=>threatening(t,s));if(!s)return null;
  const v=Math.hypot(s.vx,s.vy),cross=(t.x-s.x)*s.vy-(t.y-s.y)*s.vx,sign=cross>=0?1:-1;
  // Commit to the observed side, without reading future shell/player motion.
  t.pendingDodge={shell:s,left:t.cfg.reaction+Math.random()*.08,x:s.vy/v*sign,y:-s.vx/v*sign};return null;
 }
 const DEFENDERS=new Set(['green','violet','white','black','bulwark']);
 function incoming(t,s){
  if(s.dead||!s.player||dist(t,s)>280||!visibleShot(t,s))return false;
  const dx=t.x-s.x,dy=t.y-s.y,v=Math.hypot(s.vx,s.vy);
  return v>0&&(dx*s.vx+dy*s.vy)/v>0&&Math.abs((dx*s.vy-dy*s.vx)/v)<45;
 }
 function intercept(t,s){
  // Solve where the incoming shell and a new shot meet, including muzzle offset.
  const rx=s.x-t.x,ry=s.y-t.y,q=t.cfg.shot,m=23;
  const a=s.vx*s.vx+s.vy*s.vy-q*q,b=2*(rx*s.vx+ry*s.vy-m*q),c=rx*rx+ry*ry-m*m;
  let roots=[];if(Math.abs(a)<.001){if(Math.abs(b)>.001)roots=[-c/b];}else{const d=b*b-4*a*c;if(d>=0)roots=[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)];}
  const seconds=roots.filter(v=>v>.025&&v<1.5).sort((a,b)=>a-b)[0];if(seconds===undefined)return null;
  const point={x:s.x+s.vx*seconds,y:s.y+s.vy*seconds};
  if(solid(point.x,point.y,4,false)||!visibleShot(t,point)||!visibleShot(s,point))return null;
  return {angle:Math.atan2(point.y-t.y,point.x-t.x),seconds};
 }
 function defensiveFire(t,dt){
  if(!DEFENDERS.has(t.type))return false;
  t.defenseRest=Math.max(0,(t.defenseRest||0)-dt);
  if(t.defenseRest>0||t.cool>0||shells.filter(s=>s.owner===t.uid&&!s.dead).length>=t.cfg.cap){t.defense=null;return false;}
  if(t.defense&&!incoming(t,t.defense.shell))t.defense=null;
  if(!t.defense){
   t.defenseSense=(t.defenseSense||0)-dt;if(t.defenseSense>0)return false;t.defenseSense=.1;
   const shell=shells.filter(s=>incoming(t,s)).sort((a,b)=>dist(t,a)-dist(t,b))[0];if(!shell)return false;
   t.defense={shell,wait:t.type==='black'?.1:.15};
  }
  const d=t.defense;d.wait-=dt;if(d.wait>0)return true;
  const aim=intercept(t,d.shell);if(!aim){t.defense=null;t.defenseRest=.15;return false;}
  t.angle+=clamp(wrap(aim.angle-t.angle),-dt*3.5,dt*3.5);
  if(Math.abs(wrap(aim.angle-t.angle))<.025){
   const fired=fire(t);t.defense=null;t.defenseRest=fired?.3:.16;
  }
  return true;
 }
 function greenScan(t,targets,dt){
  if(defensiveFire(t,dt)){t.scanLock=null;return;}
  // Sweep independently of player position. Only inspect the narrow sector
  // currently under the turret, including paths that bank off walls.
  if(t.scanDirection===undefined){t.scanDirection=t.uid%2?1:-1;t.scanHold=0;t.scanCheck=0;}
  if(t.scanLock){
   const lock=t.scanLock;lock.remaining-=dt;
   if(!lock.target.alive||!rayHits(t,lock.angle,lock.target)||lock.remaining<=0){t.scanLock=null;t.scanHold=.15;}
   else {t.angle+=clamp(wrap(lock.angle-t.angle),-dt*1.8,dt*1.8);lock.settle-=dt;
    if(lock.settle<=0&&Math.abs(wrap(lock.angle-t.angle))<.025&&fire(t)){t.scanLock=null;t.scanHold=.35;}
    return;
   }
  }
  if(t.scanHold>0){t.scanHold-=dt;return;}
  t.angle=wrap(t.angle+t.scanDirection*.72*dt);
  t.scanCheck-=dt;if(t.scanCheck>0)return;t.scanCheck=.07;
  const sector=[t.angle,t.angle-.035,t.angle+.035];
  for(const angle of sector)for(const target of targets){
   if(rayHits(t,angle,target)&&!risksAlly(t,angle)){
    t.scanLock={target,angle,settle:.16,remaining:.65};return;
   }
  }
 }
 function enemy(t,dt){const targets=tanks.filter(p=>p.player&&p.alive);if(!targets.length)return {x:0,y:0};if(t.type==='green'){greenScan(t,targets,dt);return {x:0,y:0};}const p=targets.sort((a,b)=>dist(t,a)-dist(t,b))[0];
 if(t.type==='dash'){
  t.dashCool=(t.dashCool??2)-dt;t.recover=Math.max(0,(t.recover||0)-dt);
  if(t.charge>0){t.charge-=dt;t.angle=t.dashAngle;if(t.charge<=0){t.dashing=.48;sound(120,.2,'sawtooth',.025);}return {x:0,y:0};}
  if(t.dashing>0){t.dashing-=dt;if(t.dashing<=0){t.recover=.85;t.dashCool=3.5;t.cool=Math.max(t.cool,.9);}return {x:Math.cos(t.dashAngle),y:Math.sin(t.dashAngle)};}
  if(t.recover>0)return {x:0,y:0};
  if(t.dashCool<=0&&dist(t,p)<430&&rayHits(t,Math.atan2(p.y-t.y,p.x-t.x),p)){t.charge=.7;t.dashAngle=Math.atan2(p.y-t.y,p.x-t.x);return {x:0,y:0};}
 }
 t.think-=dt;if(t.think<=0){t.think=.38+Math.random()*.17;const lead=0;const target={x:clamp(p.x+p.vx*lead,56,W-56),y:clamp(p.y+p.vy*lead,56,H-56)};const direct=Math.atan2(target.y-t.y,target.x-t.x);let angles=[direct];if(t.cfg.bounce)angles.push(Math.atan2(target.y-t.y,80-target.x-t.x),Math.atan2(target.y-t.y,2*(W-40)-target.x-t.x),Math.atan2(80-target.y-t.y,target.x-t.x),Math.atan2(2*(H-40)-target.y-t.y,target.x-t.x));const aim=angles.find(a=>rayHits(t,a,target));t.aimPoint=target;t.aim=aim??direct;t.canShoot=t.type==='mortar'?dist(t,p)>120&&dist(t,p)<850:aim!==undefined;if(t.cfg.speed){if(['violet','white','black','yellow','bulwark','scatter','dash'].includes(t.type))t.path=pathTo(t,p);else if(!t.path.length||Math.random()<.08){const spaces=[];for(let y=2;y<grid.length-2;y++)for(let x=2;x<grid[0].length-2;x++)if(!grid[y][x])spaces.push({x:x*40+20,y:y*40+20});t.path=pathTo(t,spaces[Math.floor(Math.random()*spaces.length)]);}}}
 if(!defensiveFire(t,dt)){t.angle+=clamp(wrap((t.aim??t.angle)-t.angle),-dt*3.5,dt*3.5);if(t.canShoot&&Math.abs(wrap((t.aim??t.angle)-t.angle))<.08)fire(t);}
 let x=0,y=0;if(t.path.length){let node=t.path[0];if(dist(t,node)<7){t.path.shift();node=t.path[0];}if(node){x=node.x-t.x;y=node.y-t.y;const d=Math.hypot(x,y);x/=d;y/=d;}}
 // Dodge only after recognizing a visible threat and waiting out reaction time.
 const dodge=reactToShells(t,dt);if(dodge){x=dodge.x;y=dodge.y;}
 for(const m of mines){if(m.dead||m.owner===t.uid&&m.age<.4)continue;if(dist(t,m)<115&&(t.cfg.mines||m.player===0)){const d=Math.max(1,dist(t,m));x=(t.x-m.x)/d;y=(t.y-m.y)/d;}}
 if(t.type==='scatter'&&dist(t,p)<210){const d=Math.max(1,dist(t,p));x=(t.x-p.x)/d;y=(t.y-p.y)/d;}
 if(t.cfg.mines&&t.mineCool<=0&&(dist(t,p)<230||Math.random()<dt*.25))lay(t);return {x,y};}
 function controls(t){let x=0,y=0;if(t.player===1){x=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+moveTouch.x;y=Number(keys.has('KeyS'))-Number(keys.has('KeyW'))+moveTouch.y;t.angle=Math.atan2(pointer.y-t.y,pointer.x-t.x);if(pointer.down)fire(t);}else{x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));y=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));const ax=Number(keys.has('KeyL'))-Number(keys.has('KeyJ')),ay=Number(keys.has('KeyK'))-Number(keys.has('KeyI'));if(ax||ay)t.angle=Math.atan2(ay,ax);if(keys.has('Enter'))fire(t);}
 const pads=navigator.getGamepads?.()||[];const pad=Array.from(pads).filter(Boolean)[mode===2?t.player===2?0:1:0];if(pad){if(Math.hypot(pad.axes[0]||0,pad.axes[1]||0)>.2){x=pad.axes[0];y=pad.axes[1];}if(Math.hypot(pad.axes[2]||0,pad.axes[3]||0)>.25)t.angle=Math.atan2(pad.axes[3],pad.axes[2]);if(pad.buttons[7]?.pressed)fire(t);const pressed=!!pad.buttons[0]?.pressed;if(pressed&&!gamepadMine.get(t.uid))lay(t);gamepadMine.set(t.uid,pressed);}return {x,y};}
 function update(dt){for(const f of fx){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.96;f.vy*=.96;}fx=fx.filter(f=>f.life>0);shake=Math.max(0,shake-dt*25);if(phase==='settle'){transition-=dt;if(transition<=0)finishRound();return;}if(phase!=='play')return;time+=dt;
 for(const t of tanks){if(!t.alive)continue;t.cool-=dt;t.mineCool-=dt;t.stop-=dt;t.shieldFlash=Math.max(0,(t.shieldFlash||0)-dt);const old={x:t.x,y:t.y};let {x,y}=t.player?controls(t):enemy(t,dt);const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}if(t.stop<=0){const moved=move(t,x*(t.dashing>0?306:t.cfg.speed)*dt,y*(t.dashing>0?306:t.cfg.speed)*dt);if(moved>.01){t.body+=clamp(wrap(Math.atan2(y,x)-t.body),-dt*7,dt*7);t.track+=moved;if(t.track>8){tracks.push({x:t.x,y:t.y,a:t.body});t.track=0;if(tracks.length>1600)tracks.shift();}}else if(!t.player&&d&&t.path.length){t.stuck=(t.stuck||0)+dt;if(t.stuck>.6){t.path=[];t.stuck=0;}}}
 t.vx=(t.x-old.x)/dt;t.vy=(t.y-old.y)/dt;}
 updateShells(dt);updateArtillery(dt);for(const m of mines){if(m.dead)continue;m.age+=dt;m.fuse-=dt;if(m.age>1.3&&tanks.some(t=>t.alive&&dist(t,m)<43))m.fuse=Math.min(m.fuse,.55);if(m.fuse<=0)explode(m);}mines=mines.filter(m=>!m.dead);
 const alive=tanks.filter(t=>t.player&&t.alive),enemyAlive=tanks.some(t=>!t.player&&t.alive);if(!alive.length||!enemyAlive){phase='settle';transition=1;pointer.down=false;}hud();}
 function finishRound(){const alive=tanks.some(t=>t.player&&t.alive),enemies=tanks.some(t=>!t.player&&t.alive);if(!alive){if(mode===1)lives--;if(mode===2||lives<=0){phase='over';panel('','Game over',`Mission ${mission} · ${kills} enemy tanks destroyed${mode===2?'<br>'+duoScore():''}`,'Try again',start,true);}else{phase='retry';panel('TANK LOST',`${lives} ${lives===1?'life':'lives'} remaining`,'','Retry mission',()=>{load(true);brief();},true);}hud();return;}
 if(!enemies){if(!campaign)best=Math.max(best,mission);if(mode===1&&mission%5===0)lives++;if(!campaign&&mode===1&&mission>=20)unlocked=true;save();phase='clear';if(mission===limit){panel('','Campaign complete',mode===2?duoScore():campaign?`${limit} missions cleared.`:limit===20?'100-mission campaign unlocked.':'100 missions cleared.','New campaign',start,true);}else{const scores=tanks.filter(t=>t.player).map(t=>t.score);panel('','Mission clear',`${kills} tanks destroyed${mode===1&&mission%5===0?' · extra life earned':''}`,'Next mission',()=>{mission++;defeated.clear();load();tanks.filter(t=>t.player).forEach((t,i)=>t.score=scores[i]);brief();},true);}sound(700,.25,'triangle');}}
 function duoScore(){const p=tanks.filter(t=>t.player);return `Blue ${p[0].score} · Red ${p[1].score}<br>${p[0].score===p[1].score?'A draw!':p[0].score>p[1].score?'Blue wins!':'Red wins!'}`;}
 function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
 function drawTank(t){if(!t.alive)return;if(t.type==='white'&&phase==='play'&&time>1.6)return;ctx.save();ctx.translate(t.x+3,t.y+4);ctx.rotate(t.body);ctx.fillStyle='#503b2870';ctx.fillRect(-19,-17,39,36);ctx.restore();ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.body);rect(-19,-18,37,10,'#394344');rect(-19,8,37,10,'#394344');for(let x=-17;x<19;x+=6){rect(x,-17,3,8,'#647071');rect(x,9,3,8,'#647071');}const color=t.player===2?'#db6e58':t.cfg.color;rect(-17,-12,33,24,color);rect(-15,-11,28,3,'#ffffff40');rect(-17,9,33,3,'#0003');rect(-13,-7,8,14,'#0002');ctx.restore();ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);rect(0,-5,30,10,'#303b3b');rect(0,-4,29,6,color);rect(25,-4,5,8,'#2d3939');circle(0,0,12,'#0004');circle(-1,-2,11,color);circle(-3,-4,6,'#ffffff28');rect(-5,-6,7,3,'#ffffff35');ctx.restore();
 if(t.type==='mortar'){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);circle(0,0,13,'#85593c');circle(0,0,9,'#d7a768');circle(0,0,5,'#3e3430');rect(-18,-19,5,38,'#95693f');rect(13,-19,5,38,'#95693f');ctx.restore();}
 if(t.type==='bulwark'){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);ctx.strokeStyle=t.shieldFlash?'#fff':'#81e0f8';ctx.lineWidth=t.shieldFlash?6:4;ctx.beginPath();ctx.arc(0,0,21,-Math.PI*.36,Math.PI*.36);ctx.stroke();ctx.restore();}
 if(t.type==='scatter'){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);for(const a of [-.23,.23]){ctx.save();ctx.rotate(a);rect(10,-3,20,6,'#6b4138');rect(12,-2,17,3,'#ffc2a0');ctx.restore();}ctx.restore();}
 if(t.type==='dash'){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.charge>0||t.dashing>0?t.dashAngle:t.body);ctx.fillStyle=t.charge>0&&Math.floor(time*12)%2?'#fff':'#ffc7b6';ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(3,-7);ctx.lineTo(3,7);ctx.fill();if(t.charge>0){ctx.setLineDash([6,8]);ctx.strokeStyle='#c53649a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(27,0);ctx.lineTo(210,0);ctx.stroke();}if(t.dashing>0){rect(-40,-9,18,3,'#d24d6470');rect(-40,6,18,3,'#d24d6470');}ctx.restore();}
 if(t.player){ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillStyle='#284550';ctx.fillText(t.player===1?'1P':'2P',t.x,t.y-26);}}
 function render(){ctx.clearRect(0,0,W,H);ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);rect(0,0,W,H,'#d1b47d');for(let y=0;y<H;y+=40){rect(0,y,W,1,'#7857331c');for(let x=0;x<W;x+=120){rect(x+(y/40%2)*60,y,1,40,'#78573312');ctx.strokeStyle='#926c3420';ctx.beginPath();ctx.moveTo(x+10,y+12);ctx.bezierCurveTo(x+45,y+7,x+58,y+22,x+104,y+13);ctx.stroke();}}
 for(const t of tracks){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.a);rect(-3,-17,5,7,'#674e3430');rect(-3,10,5,7,'#674e3430');ctx.restore();}
 for(const w of wrecks){circle(w.x,w.y,23,'#674c3a45');ctx.strokeStyle='#5c4936';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w.x-9,w.y-9);ctx.lineTo(w.x+9,w.y+9);ctx.moveTo(w.x+9,w.y-9);ctx.lineTo(w.x-9,w.y+9);ctx.stroke();}
 for(let y=0;y<grid.length;y++)for(let x=0;x<grid[0].length;x++){const v=grid[y]?.[x];if(!v)continue;const xx=x*40,yy=y*40;if(v===3){rect(xx+1,yy+1,38,38,'#725b40');rect(xx+5,yy+6,31,30,'#493f32');rect(xx+7,yy+10,27,24,'#37382f');continue;}rect(xx+5,yy+7,39,38,'#75533045');rect(xx,yy,40,40,v===2?'#af7444':'#a98550');rect(xx+1,yy-5,38,37,v===2?'#d2a16b':'#e0c497');rect(xx+3,yy-3,34,3,'#ffefd260');rect(xx+1,yy+31,38,6,v===2?'#986034':'#a8814b');rect(xx+37,yy-3,2,35,'#8b6b4440');if(v===2){ctx.strokeStyle='#997345';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx+19,yy-4);ctx.lineTo(xx+14,yy+9);ctx.lineTo(xx+25,yy+16);ctx.lineTo(xx+18,yy+31);ctx.moveTo(xx+25,yy+16);ctx.lineTo(xx+37,yy+10);ctx.stroke();}}
 for(const a of artillery){const progress=Math.min(1,a.age/a.duration);ctx.save();ctx.strokeStyle=progress>.7?'#dc4739':'#b96627';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(a.x,a.y,a.radius,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(a.x,a.y,a.radius*(1-progress),0,TAU);ctx.stroke();ctx.fillStyle='#b75b2b20';ctx.beginPath();ctx.arc(a.x,a.y,a.radius,0,TAU);ctx.fill();const px=a.fromX+(a.x-a.fromX)*progress,py=a.fromY+(a.y-a.fromY)*progress;circle(px,py,5,'#58462b50');circle(px,py-Math.sin(progress*Math.PI)*90,6,'#78512e');ctx.restore();}
 for(const m of mines){circle(m.x+2,m.y+3,10,'#5b42294a');circle(m.x,m.y,10,'#82632b');circle(m.x,m.y-1,8,m.fuse<1&&Math.floor(time*12)%2?'#fff0b4':'#e9b744');circle(m.x,m.y-2,3,m.age<1.3?'#8d7545':Math.floor(time*5)%2?'#ea6443':'#ffe6a6');}
 for(const t of tanks)drawTank(t);for(const s of shells){ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(s.vy,s.vx));if(Math.hypot(s.vx,s.vy)>300){rect(-14,-2,10,4,'#e49445');rect(-20,-1,8,2,'#eed3a0');}rect(-6,-3,11,6,'#484940');rect(1,-2,4,4,'#fff5c7');ctx.restore();}
 for(const f of fx){ctx.globalAlpha=Math.min(1,f.life/f.max);if(f.ring){ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,f.size*(1-f.life/f.max),0,TAU);ctx.stroke();}else rect(f.x,f.y,f.size,f.size,f.color);}ctx.globalAlpha=1;
 const p=tanks.find(t=>t.player===1&&t.alive);if(p&&phase==='play'){ctx.strokeStyle='#27556f90';ctx.lineWidth=1.3;ctx.setLineDash([3,9]);ctx.beginPath();ctx.moveTo(p.x+Math.cos(p.angle)*33,p.y+Math.sin(p.angle)*33);ctx.lineTo(pointer.x,pointer.y);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#1d536c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pointer.x,pointer.y,9,0,TAU);ctx.moveTo(pointer.x-14,pointer.y);ctx.lineTo(pointer.x-6,pointer.y);ctx.moveTo(pointer.x+6,pointer.y);ctx.lineTo(pointer.x+14,pointer.y);ctx.moveTo(pointer.x,pointer.y-14);ctx.lineTo(pointer.x,pointer.y-6);ctx.moveTo(pointer.x,pointer.y+6);ctx.lineTo(pointer.x,pointer.y+14);ctx.stroke();}ctx.restore();}
 function frame(ts){music.tick({ctx:audio,playing:phase==='play',muted,intensity:TankMusic.threat(tanks),song:currentSong});const pressure=['Peaceful','Alert','Intense'][TankMusic.threat(tanks)];$('music-status').textContent=TankMusic.songs[currentSong].name+' · '+pressure;const dt=Math.min((ts-last)/1000||0,.1);last=ts;acc+=dt;while(acc>=1/120){update(1/120);acc-=1/120;}render();requestAnimationFrame(frame);}
 function point(e){const b=canvas.getBoundingClientRect(),scale=Math.min(b.width/W,b.height/H),ox=(b.width-W*scale)/2,oy=(b.height-H*scale)/2;pointer.x=clamp((e.clientX-b.left-ox)/scale,40,W-40);pointer.y=clamp((e.clientY-b.top-oy)/scale,40,H-40);}
 canvas.addEventListener('pointermove',point);canvas.addEventListener('pointerdown',e=>{if(e.button!==0||phase!=='play')return;e.preventDefault();canvas.focus();point(e);pointer.down=true;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',()=>pointer.down=false);canvas.addEventListener('pointercancel',()=>pointer.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 const bound=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyI','KeyJ','KeyK','KeyL','Space','ShiftRight','Enter','Escape'];window.addEventListener('keydown',e=>{if(!bound.includes(e.code))return;if(phase==='play'||phase==='pause'){e.preventDefault();keys.add(e.code);}if(e.repeat)return;if(e.code==='Escape')pause();if(phase==='play'&&e.code==='Space')lay(tanks.find(t=>t.player===1));if(phase==='play'&&e.code==='ShiftRight'&&mode===2)lay(tanks.find(t=>t.player===2));});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pointer.down=false;if(phase==='play')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='play')pause();});
 $('action').onclick=()=>{sound(460,.06,'triangle');action();};$('secondary').onclick=menu;$('pause').onclick=pause;$('solo').onclick=()=>{mode=1;$('solo').classList.add('selected');$('duo').classList.remove('selected');menu();};$('duo').onclick=()=>{mode=2;$('duo').classList.add('selected');$('solo').classList.remove('selected');menu();};
 function soundLabel(){$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted));}$('sound').onclick=()=>{muted=!muted;soundLabel();save();sound();};soundLabel();$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('arena').requestFullscreen();}catch{$('fullscreen').textContent='Use browser full screen';}};
 const held=new Set();function touchMove(){moveTouch.x=Number(held.has('right'))-Number(held.has('left'));moveTouch.y=Number(held.has('down'))-Number(held.has('up'));}document.querySelectorAll('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();held.add(b.dataset.move);touchMove();b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>{held.delete(b.dataset.move);touchMove();};});$('touch-mine').onpointerdown=e=>{e.preventDefault();lay(tanks.find(t=>t.player===1));};

 const sources=new Map([['classic',null],['expansion',TankPacks.expansion()]]);
 try{if(window.TANK_CAMPAIGN)sources.set('published',TankPacks.validate(window.TANK_CAMPAIGN));}catch(e){$('pack-message').textContent='Published campaign rejected: '+e.message;}
 try{const raw=localStorage.getItem(TankPacks.PLAY_KEY);if(raw)sources.set('editor',TankPacks.validate(JSON.parse(raw)));}catch(e){$('pack-message').textContent='Editor pack unavailable: '+e.message;}
 const labels={classic:'Classic campaign',expansion:'Reinforcements · new enemies',published:'Published campaign',editor:'Editor playtest'};
 for(const [key,value] of sources){const o=document.createElement('option');o.value=key;o.textContent=labels[key]+(value?' · '+value.levels.length+' missions':'');$('campaign').append(o);}
 source=new URLSearchParams(location.search).has('editor')&&sources.has('editor')?'editor':sources.has('published')?'published':'classic';campaign=sources.get(source);$('campaign').value=source;
 if(new URLSearchParams(location.search).has('editor')&&!sources.has('editor'))$('pack-message').textContent='No editor playtest found. Open Test level from the editor on this same website.';
 $('campaign').onchange=()=>{source=$('campaign').value;campaign=sources.get(source);menu();};
 try{music.volume=clamp(Number(localStorage.getItem('fnaac-tanks-music-volume')??.45),0,1);if(!Number.isFinite(music.volume))music.volume=.45;music.enabled=localStorage.getItem('fnaac-tanks-music-enabled')!=='0';}catch{}
 function musicLabel(){$('music-toggle').textContent=music.enabled?'Music on':'Music off';$('music-toggle').setAttribute('aria-pressed',String(music.enabled));$('music-volume').value=Math.round(music.volume*100);}
 $('music-toggle').onclick=()=>{music.enabled=!music.enabled;musicLabel();try{localStorage.setItem('fnaac-tanks-music-enabled',music.enabled?'1':'0');}catch{}sound(400,.04,'sine',.01);};
 $('music-volume').oninput=()=>{music.volume=Number($('music-volume').value)/100;try{localStorage.setItem('fnaac-tanks-music-volume',String(music.volume));}catch{}};musicLabel();
 // Opt-in test surface; absent during ordinary visits.
 if(new URLSearchParams(location.search).has('test'))window.__tanks={get state(){return {tanks,shells,mines,artillery,W,H,grid,phase,mission,lives,kills,defeated,limit};},step:update,fire,lay,kill,explode,solid,rayHits,shellHit,enemy,render,risksAlly,safeToFire,intercept,defensiveFire,greenScan,reactToShells,updateArtillery,pathTo,point,selectPack(pack){campaign=pack?TankPacks.validate(pack):null;limit=campaignLimit();},loadMission(n){mission=n;defeated.clear();load();phase='play';$('overlay').hidden=true;},finishRound};
 menu();requestAnimationFrame(frame);
})();
