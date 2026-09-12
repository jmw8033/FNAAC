(function(global){
'use strict';
const D=global.FrontierData,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const count=(bag,id)=>bag[id]||0;
function add(bag,id,n=1){bag[id]=count(bag,id)+n;if(bag[id]<=0)delete bag[id];}
function inventoryValue(bag){return Object.entries(bag).reduce((n,[id,q])=>n+D.items[id].value*q,0);}
function keepThree(bag){const kept={},lost={...bag};const ordered=Object.keys(bag).sort((a,b)=>D.items[b].value-D.items[a].value);let left=3;for(const id of ordered){const n=Math.min(left,lost[id]);if(n){add(kept,id,n);add(lost,id,-n);left-=n;}if(!left)break;}return {kept,lost};}
class Engine{
 constructor(world,random=Math.random){this.world=world;this.random=random;this.time=0;this.serial=0;this.events=[];this.bullets=[];this.blasts=[];this.floaters=[];this.loot=[];this.wrecks=[];this.paused=false;this.gather=null;this.dirty=true;this.enemies=world.spawns.map(s=>({...s,homeX:s.x,homeY:s.y,hp:D.enemyTypes[s.type].hp,angle:0,body:0,cool:1,dead:false,respawn:0,slow:0,burn:0,burnTick:0,windup:0}));
 this.player={x:34*64,y:57*64,body:-Math.PI/2,angle:-Math.PI/2,speed:0,hp:100,inv:{cannon:1,repeater:1,kit:3},bank:{},coins:40,bankCoins:0,equipped:'cannon',xp:Object.fromEntries(D.skills.map(k=>[k,0])),home:'brindle',cool:0,invuln:2,kills:0,discovered:['brindle']};
 }
 level(skill){return D.level(this.player.xp[skill]);}
 maxHP(){return 100+(this.level('Armor')-1)*4;}
 notify(text){this.needsSave=true;this.events.unshift(text);this.events.length=Math.min(this.events.length,6);this.dirty=true;}
 xp(skill,n){const old=this.level(skill);this.player.xp[skill]+=n;const lv=this.level(skill);if(lv>old){this.notify(skill+' level '+lv);if(skill==='Armor')this.player.hp=Math.min(this.maxHP(),this.player.hp+(lv-old)*4);}this.dirty=true;}
 equip(id){const it=D.items[id];if(!it?.skill||!count(this.player.inv,id))return false;if(this.level(it.skill)<it.req){this.notify(it.skill+' '+it.req+' required.');return false;}this.player.equipped=id;this.player.cool=Math.max(this.player.cool,.35);this.dirty=true;return true;}
 move(t,dx,dy){let moved=0;const blocked=(x,y)=>this.world.blocked(x,y)||[this.player,...this.enemies.filter(e=>!e.dead),...this.world.npcs].some(o=>o!==t&&Math.hypot(o.x-x,o.y-y)<39&&Math.hypot(o.x-t.x,o.y-t.y)>=Math.hypot(o.x-x,o.y-y));if(!blocked(t.x+dx,t.y)){t.x+=dx;moved+=Math.abs(dx);}if(!blocked(t.x,t.y+dy)){t.y+=dy;moved+=Math.abs(dy);}return moved;}
 fire(){const p=this.player,it=D.items[p.equipped];if(this.paused||!it?.skill||p.cool>0||!count(p.inv,p.equipped)||this.world.safe(p.x,p.y))return false;
 const angle=p.angle;p.cool=it.cool;this.gather=null;this.bullets.push({x:p.x+Math.cos(angle)*31,y:p.y+Math.sin(angle)*31,vx:Math.cos(angle)*it.speed,vy:Math.sin(angle)*it.speed,life:2.5,player:true,item:p.equipped,damage:D.rollDamage(it,this.level(it.skill),this.random),color:it.color});return true;}
 hitEnemy(e,damage,id){if(e.dead)return;const it=D.items[id],cfg=D.enemyTypes[e.type];const dealt=Math.min(e.hp,Math.max(1,damage-cfg.armor*(it.pierce?.5:1)));e.hp-=dealt;e.flash=.1;this.floaters.push({x:e.x,y:e.y-30,text:String(Math.round(dealt)),color:'#fff0ad',life:.8});this.xp(it.skill,dealt*.85);if(it.slow)e.slow=1.5;if(it.burn){e.burn=3;e.burnItem=id;}
 if(e.hp<=0)this.killEnemy(e);}
 killEnemy(e){e.hp=0;this.needsSave=true;e.dead=true;e.respawn=this.time+50;e.windup=0;this.player.kills++;const cfg=D.enemyTypes[e.type],inv={scrap:2+Math.floor(cfg.level/3)},coins=5+cfg.level*3;if(this.random()<.3)add(inv,'iron',2);if(this.random()<.2)add(inv,'kit');if(cfg.rare&&this.random()<.04){add(inv,cfg.rare);this.notify('Rare find: '+D.items[cfg.rare].name);}this.loot.push({id:'loot'+(++this.serial),x:e.x,y:e.y,inv,coins});this.blasts.push({x:e.x,y:e.y,r:44,life:.4,color:'#ffc576'});this.dirty=true;}
 damagePlayer(damage){const p=this.player;if(p.invuln>0||this.world.safe(p.x,p.y))return;const n=Math.max(1,damage-Math.floor((this.level('Armor')-1)*.4));p.hp-=n;this.xp('Armor',Math.min(n,30)*1.6);this.floaters.push({x:p.x,y:p.y-30,text:'−'+Math.round(n),color:'#ff9e93',life:.9});if(p.hp<=0)this.die();}
 die(){const p=this.player,{kept,lost}=keepThree(p.inv);if(Object.keys(lost).length||p.coins)this.wrecks.push({id:'wreck'+(++this.serial),x:p.x,y:p.y,inv:lost,coins:p.coins});p.inv=kept;p.coins=0;if(!count(kept,p.equipped))p.equipped=Object.keys(kept).find(id=>D.items[id].skill&&this.level(D.items[id].skill)>=D.items[id].req)||null;const home=this.world.towns.find(t=>t.id===p.home)||this.world.towns[0];p.x=home.x*64;p.y=home.y*64;p.hp=this.maxHP();p.speed=0;p.invuln=3;this.gather=null;this.bullets=[];this.notify('Recovered at '+home.name+'. Three items kept. Your wreck is marked on the map.');this.dirty=true;}
 repairKit(){const p=this.player;if(!count(p.inv,'kit')||p.hp>=this.maxHP())return false;add(p.inv,'kit',-1);p.hp=Math.min(this.maxHP(),p.hp+45);this.notify('Repaired 45 hull.');return true;}
 nearest(){const p=this.player;return [...this.world.npcs.map(n=>({...n,kind:'npc'})),...this.world.nodes.filter(n=>n.ready<=this.time).map(n=>({...n,kind:'node'})),...this.wrecks.map(n=>({...n,kind:'wreck'})),...this.loot.map(n=>({...n,kind:'loot'}))].filter(n=>distance(p,n)<105&&this.world.clear(p,n)).sort((a,b)=>distance(p,a)-distance(p,b))[0]||null;}
 interact(){if(this.paused)return null;const n=this.nearest();if(!n)return null;this.player.speed=0;if(n.kind==='npc')return n;if(n.kind==='node'){if(this.level(n.skill)<n.req){this.notify(n.skill+' '+n.req+' required.');return null;}this.gather={id:n.id,left:2.2,total:2.2};return null;}if(n.kind==='loot'||n.kind==='wreck'){const list=n.kind==='wreck'?this.wrecks:this.loot,real=list.find(v=>v.id===n.id);for(const [id,q] of Object.entries(real.inv))add(this.player.inv,id,q);this.player.coins+=real.coins;list.splice(list.indexOf(real),1);this.notify(n.kind==='wreck'?'Wreck recovered.':'Supplies collected.');this.dirty=true;}return null;}
 nearService(service){return this.world.npcs.some(n=>n.service===service&&distance(this.player,n)<130);}
 craft(id){const r=D.recipes.find(r=>r.item===id);if(!r||!this.nearService('workshop')||this.level('Engineering')<r.level||Object.entries(r.cost).some(([k,n])=>count(this.player.inv,k)<n))return false;for(const [k,n] of Object.entries(r.cost))add(this.player.inv,k,-n);add(this.player.inv,id);this.xp('Engineering',r.xp);this.notify('Built '+D.items[id].name+'.');return true;}
 bank(id,withdraw=false){if(!this.nearService('bank'))return false;const p=this.player,from=withdraw?p.bank:p.inv,to=withdraw?p.inv:p.bank;if(!count(from,id))return false;if(!withdraw&&id===p.equipped&&count(from,id)===1){this.notify('Unequip this weapon first.');return false;}add(from,id,-1);add(to,id);this.dirty=true;return true;}
 transferCoins(withdraw=false){if(!this.nearService('bank'))return;const p=this.player;if(withdraw){p.coins+=p.bankCoins;p.bankCoins=0;}else{p.bankCoins+=p.coins;p.coins=0;}this.dirty=true;}
 recoveryFee(w){return Math.max(5,Math.ceil((inventoryValue(w.inv)+w.coins)*.08));}
 recover(id){if(!this.nearService('recovery'))return false;const w=this.wrecks.find(w=>w.id===id),p=this.player;if(!w)return false;const fee=this.recoveryFee(w);if(p.coins+p.bankCoins<fee){this.notify('Not enough credits. Recover this wreck in the field for free.');return false;}const cash=Math.min(fee,p.coins);p.coins-=cash;p.bankCoins-=fee-cash;for(const [k,n] of Object.entries(w.inv))add(p.inv,k,n);p.coins+=w.coins;this.wrecks.splice(this.wrecks.indexOf(w),1);this.notify('Equipment returned.');this.dirty=true;return true;}
 repair(){if(!this.nearService('repair'))return false;this.player.hp=this.maxHP();this.notify('Hull repaired.');return true;}
 setHome(){const t=this.world.towns.find(t=>Math.abs(this.player.x/64-t.x)<11&&Math.abs(this.player.y/64-t.y)<9);if(t){this.player.home=t.id;this.notify('Recovery point: '+t.name);}}
 step(dt,input={}){if(this.paused)return;dt=clamp(dt,0,.05);this.time+=dt;const p=this.player;
 p.cool=Math.max(0,p.cool-dt);p.invuln=Math.max(0,p.invuln-dt);
 const throttle=clamp(input.throttle||0,-1,1),turn=clamp(input.turn||0,-1,1),terrain=this.world.region(p.x,p.y),traction=this.world.tile(p.x,p.y)===3?1:terrain===3?.68:terrain===2?.86:1;
 const desired=throttle*(throttle<0?105:195)*traction;p.speed+=clamp(desired-p.speed,-dt*(input.brake?700:210),dt*150);if(input.brake)p.speed*=Math.max(0,1-dt*9);
 p.body=wrap(p.body+turn*dt*(1.45-Math.min(.35,Math.abs(p.speed)/600)));
 if(throttle||turn||Math.abs(p.speed)>8)this.gather=null;
 if(this.move(p,Math.cos(p.body)*p.speed*dt,Math.sin(p.body)*p.speed*dt)<Math.abs(p.speed)*dt*.1)p.speed*=.7;
 if(input.aim){const aim=Math.atan2(input.aim.y-p.y,input.aim.x-p.x);p.angle=wrap(p.angle+clamp(wrap(aim-p.angle),-dt*3.6,dt*3.6));}
 if(input.fire)this.fire();
 for(const t of this.world.towns)if(distance(p,{x:t.x*64,y:t.y*64})<650&&!p.discovered.includes(t.id)){p.discovered.push(t.id);this.notify('Discovered '+t.name);}
 if(this.gather){const node=this.world.nodes.find(n=>n.id===this.gather.id);if(!node||distance(p,node)>110||node.ready>this.time)this.gather=null;else{this.gather.left-=dt;if(this.gather.left<=0){add(p.inv,node.kind);node.ready=this.time+18;this.xp(node.skill,node.kind==='crystal'?40:24);this.notify('+1 '+D.items[node.kind].name);this.gather=null;}}}
 for(const e of this.enemies){const cfg=D.enemyTypes[e.type];if(e.dead){if(this.time>=e.respawn&&distance(p,{x:e.homeX,y:e.homeY})>400){e.dead=false;e.x=e.homeX;e.y=e.homeY;e.hp=cfg.hp;e.burn=0;e.slow=0;}continue;}e.cool-=dt;e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,(e.flash||0)-dt);
 if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=1;e.hp-=4;this.xp('Rockets',3);this.floaters.push({x:e.x,y:e.y-30,text:'4',color:'#ffae77',life:.6});if(e.hp<=0){this.killEnemy(e);continue;}}}
 const d=distance(p,e),home=distance(e,{x:e.homeX,y:e.homeY}),aggro=d<650&&home<650&&!this.world.safe(p.x,p.y);
 if(!aggro){e.windup=0;if(home>15){const a=Math.atan2(e.homeY-e.y,e.homeX-e.x);e.body=a;this.move(e,Math.cos(a)*cfg.speed*dt,Math.sin(a)*cfg.speed*dt);}continue;}
 const aim=Math.atan2(p.y-e.y,p.x-e.x),clear=this.world.clear(e,p);e.angle=wrap(e.angle+clamp(wrap(aim-e.angle),-dt*1.45,dt*1.45));
 if(cfg.speed&&(d>cfg.range*.68||!clear)){let moveAngle=aim;if(this.world.blocked(e.x+Math.cos(aim)*45,e.y+Math.sin(aim)*45)){e.avoid=(e.avoid||0)-dt;if(e.avoid<=0){e.avoid=1;e.side=this.random()<.5?-1:1;}moveAngle=aim+e.side*Math.PI/2;}e.body=wrap(e.body+clamp(wrap(moveAngle-e.body),-dt*1.8,dt*1.8));const sp=cfg.speed*(e.slow>0?.45:1);if(!this.world.safe(e.x+Math.cos(e.body)*sp*dt,e.y+Math.sin(e.body)*sp*dt))this.move(e,Math.cos(e.body)*sp*dt,Math.sin(e.body)*sp*dt);}
 if(d<cfg.range&&clear&&e.cool<=0&&Math.abs(wrap(aim-e.angle))<.15){
 if(!e.windup){e.windup=.45;e.target={x:p.x,y:p.y};}
 else{e.windup-=dt;if(e.windup<=0){e.cool=cfg.cool;e.windup=0;if(cfg.artillery)this.blasts.push({x:e.target.x,y:e.target.y,r:78,life:1.1,warning:true,damage:cfg.damage});else{const a=Math.atan2(e.target.y-e.y,e.target.x-e.x);this.bullets.push({x:e.x+Math.cos(a)*30,y:e.y+Math.sin(a)*30,vx:Math.cos(a)*cfg.shot,vy:Math.sin(a)*cfg.shot,life:3,player:false,damage:cfg.damage,color:'#fa9174'});}}}
 }else e.windup=0;
 }
 for(const b of this.bullets){const n=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/7));for(let i=0;i<n&&!b.dead;i++){b.x+=b.vx*dt/n;b.y+=b.vy*dt/n;b.life-=dt/n;
 if(b.life<=0||this.world.blocked(b.x,b.y,3,true)){this.impact(b,null);break;}
 if(b.player){const e=this.enemies.find(e=>!e.dead&&distance(e,b)<24);if(e)this.impact(b,e);}else if(distance(p,b)<23){b.dead=true;this.damagePlayer(b.damage);}
 }}this.bullets=this.bullets.filter(b=>!b.dead);
 for(const b of this.blasts){b.life-=dt;if(b.warning&&b.life<=0){if(distance(p,b)<b.r)this.damagePlayer(b.damage);b.warning=false;b.life=.35;b.color='#efb175';}}this.blasts=this.blasts.filter(b=>b.life>0);
 for(const f of this.floaters){f.y-=dt*25;f.life-=dt;}this.floaters=this.floaters.filter(f=>f.life>0);
 }
 impact(b,target){b.dead=true;if(!b.player)return;const it=D.items[b.item];if(it.splash){this.blasts.push({x:b.x,y:b.y,r:it.splash,life:.28,color:it.color});for(const e of this.enemies)if(!e.dead&&distance(e,b)<it.splash&&this.world.clear(b,e))this.hitEnemy(e,b.damage*(e===target?1:.75),b.item);}else if(target)this.hitEnemy(target,b.damage,b.item);}
 snapshot(){return {version:1,time:this.time,serial:this.serial,player:JSON.parse(JSON.stringify(this.player)),wrecks:this.wrecks,loot:this.loot,nodes:this.world.nodes.filter(n=>n.ready>this.time).map(n=>({id:n.id,ready:n.ready})),enemies:this.enemies.map(e=>({id:e.id,hp:e.hp,dead:e.dead,respawn:e.respawn} ))};}
 restore(raw){const s=validateSave(raw,this.world);this.player=s.player;this.time=s.time;this.serial=s.serial;this.wrecks=s.wrecks;this.loot=s.loot;for(const n of this.world.nodes)n.ready=0;for(const n of s.nodes){const node=this.world.nodes.find(v=>v.id===n.id);if(node)node.ready=n.ready;}for(const e of this.enemies){const saved=s.enemies.find(v=>v.id===e.id);e.x=e.homeX;e.y=e.homeY;e.burn=0;e.slow=0;e.windup=0;e.hp=saved?.hp??D.enemyTypes[e.type].hp;e.dead=saved?.dead??false;e.respawn=saved?.respawn??0;e.cool=1;}this.player.speed=0;this.player.cool=.5;this.player.invuln=2;this.bullets=[];this.blasts=[];this.gather=null;this.dirty=true;}
}
function validateSave(raw,world){
 const fail=()=>{throw new Error('This is not a compatible Tank Frontier save.');},num=(n,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!raw||raw.version!==1)fail();const s=JSON.parse(JSON.stringify(raw)),p=s.player;
 function bag(v){if(!v||Array.isArray(v)||typeof v!=='object')fail();for(const [id,n] of Object.entries(v))if(!Object.hasOwn(D.items,id)||!Number.isSafeInteger(n)||n<1||n>1e6)fail();return v;}
 if(!p||!num(s.time)||!Number.isSafeInteger(s.serial)||s.serial<0||s.serial>1e8||!num(p.x,world.width)||!num(p.y,world.height)||world.blocked(p.x,p.y)||!Number.isFinite(p.body)||!Number.isFinite(p.angle)||!num(p.hp,500)||p.hp===0||!num(p.coins)||!num(p.bankCoins)||!num(p.kills))fail();
 bag(p.inv);bag(p.bank);if(!p.xp||D.skills.some(k=>!num(p.xp[k])))fail();if(p.hp>100+(D.level(p.xp.Armor)-1)*4)fail();if(!world.towns.some(t=>t.id===p.home)||!Array.isArray(p.discovered)||p.discovered.some(id=>!world.towns.some(t=>t.id===id)))fail();
 if(p.equipped!==null&&(!Object.hasOwn(D.items,p.equipped)||!D.items[p.equipped].skill||!p.inv[p.equipped]||D.level(p.xp[D.items[p.equipped].skill])<D.items[p.equipped].req))fail();
 const ids=new Set();for(const list of [s.wrecks,s.loot]){if(!Array.isArray(list)||list.length>10000)fail();for(const v of list){if(typeof v.id!=='string'||ids.has(v.id)||!num(v.x,world.width)||!num(v.y,world.height)||!num(v.coins))fail();ids.add(v.id);bag(v.inv);}}
 if(!Array.isArray(s.nodes)||!Array.isArray(s.enemies)||s.nodes.length>world.nodes.length||s.enemies.length>world.spawns.length)fail();for(const n of s.nodes)if(!world.nodes.some(v=>v.id===n.id)||!num(n.ready))fail();for(const e of s.enemies){const spawn=world.spawns.find(v=>v.id===e.id);if(!spawn||!num(e.hp,D.enemyTypes[spawn.type].hp)||typeof e.dead!=='boolean'||(!e.dead&&e.hp<=0)||!num(e.respawn))fail();}
 return s;
}
global.FrontierEngine={Engine,validateSave,keepThree,inventoryValue,count,add,distance,wrap};
})(globalThis);
