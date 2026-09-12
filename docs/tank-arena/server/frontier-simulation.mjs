import '../frontier/movement.mjs';import '../frontier/data.js';import '../frontier/world.js';import '../frontier/engine.js';
import {DT,normalizeInput,neutral} from '../arena/shared.mjs';
const D=globalThis.FrontierData,E=globalThis.FrontierEngine,W=globalThis.FrontierWorld;
const clone=v=>JSON.parse(JSON.stringify(v));
export class FrontierSimulation extends E.Engine{
 constructor(store){super(W.makeWorld());this.store=store;this.members=new Map();this.tick=0;this.changed=false;this.remotePlayers=[];const saved=store.loadWorld();if(saved){if(saved.version!==1)throw new Error('Unsupported Frontier world save.');this.time=saved.time;this.serial=saved.serial;for(const n of this.world.nodes)n.ready=saved.nodes.find(v=>v.id===n.id)?.ready||0;for(const e of this.enemies){const v=saved.enemies.find(v=>v.id===e.id);if(v)Object.assign(e,v);e.burn=0;e.windup=0;}}
 }
 focus(m){this.active=m;this.player=m.player;this.wrecks=m.wrecks;this.loot=m.loot;this.events=m.events;this.gather=m.gather;}
 unfocus(){if(this.active)this.active.gather=this.gather;}
 withMember(m,fn){const old=this.active;this.unfocus();this.focus(m);try{return fn();}finally{this.unfocus();if(old)this.focus(old);}}
 forOwner(id,fn){if(!id)return fn();const m=[...this.members.values()].find(v=>v.player.id===id);if(m)return this.withMember(m,fn);}
 forPlayers(fn){for(const m of this.members.values())this.withMember(m,fn);}
 targetFor(e){let best=null,dist=Infinity;for(const m of this.members.values()){const d=E.distance(m.player,e);if(!this.world.safe(m.player.x,m.player.y)&&d<dist){best=m.player;dist=d;}}return best||{x:0,y:0};}
 addPlayer(sessionId,profile){if([...this.members.values()].some(m=>m.profile.id===profile.id))throw new Error('This character is already online.');const saved=this.store.loadCharacter(profile.id);const fresh=new E.Engine(this.world);if(saved){if(saved.version!==1)throw new Error('Unsupported character save.');const validation={version:1,time:this.time,serial:this.serial,player:saved.player,wrecks:saved.wrecks,loot:saved.loot,nodes:[],enemies:[]};E.validateSave(validation,this.world);fresh.player=clone(saved.player);}
 const m={profile,player:fresh.player,wrecks:clone(saved?.wrecks||[]),loot:clone(saved?.loot||[]),events:[],gather:null,queue:[],lastSeq:0,ack:0,lastInput:this.tick,input:neutral(),connected:true,lastActive:this.tick};m.player.id=sessionId;m.player.name=profile.name;m.player.speed=0;m.player.cool=.5;m.player.invuln=saved?0:2;this.members.set(sessionId,m);this.focus(m);this.changed=true;this.save();return m;}
 removePlayer(id){const m=this.members.get(id);if(!m)return;this.save();this.members.delete(id);this.bullets=this.bullets.filter(b=>b.owner!==id);if(this.active===m)this.active=null;}
 move(t,dx,dy){let moved=0;for(const [axis,d]of [['x',dx],['y',dy]]){const x=t.x+(axis==='x'?d:0),y=t.y+(axis==='y'?d:0);if(!this.world.blocked(x,y)){t[axis]+=d;moved+=Math.abs(d);}}return moved;}
 notify(text){super.notify(text);this.changed=true;}
 xp(skill,n){super.xp(skill,n);this.changed=true;}
 die(){const shared=this.bullets;super.die();this.bullets=shared.filter(b=>b.owner!==this.player.id);this.changed=true;}
 killEnemy(e){super.killEnemy(e);this.changed=true;}
 inputFor(id,raw){const m=this.members.get(id),i=normalizeInput(raw);if(!m||!i||i.seq<=m.lastSeq||i.seq>m.lastSeq+600)return false;m.lastSeq=i.seq;m.lastInput=this.tick;if(i.throttle||i.turn||i.fire)m.lastActive=this.tick;if(m.queue.length>=6)m.queue.shift();m.queue.push(i);return true;}
 step(){this.tick++;this.time+=DT;for(const m of this.members.values())this.withMember(m,()=>{if(m.queue.length){m.input=m.queue.shift();m.ack=m.input.seq;}if(!m.connected||this.tick-m.lastInput>8){m.input=neutral(m.player.angle);m.queue=[];}const i=m.input;super.stepPlayer(DT,{...i,aim:{x:m.player.x+Math.cos(i.aim)*100,y:m.player.y+Math.sin(i.aim)*100}});});if(this.members.size){this.focus(this.members.values().next().value);super.stepWorld(DT);this.unfocus();}if(this.changed||this.tick%60===0)this.save();}
 action(id,a){const m=this.members.get(id);if(!m||!a||typeof a.type!=='string'||!m.connected||(a.item!==undefined&&(typeof a.item!=='string'||!Object.hasOwn(D.items,a.item)))||(a.id!==undefined&&(typeof a.id!=='string'||a.id.length>80)))return {ok:false};m.lastActive=this.tick;let service=null;
 const ok=this.withMember(m,()=>{let result=false;switch(a.type){
 case 'interact':service=super.interact();result=true;break;
 case 'equip':result=this.equip(a.item);break;
 case 'kit':result=this.repairKit();break;
 case 'craft':result=this.craft(a.item);break;
 case 'bank':result=this.bank(a.item,a.withdraw===true);break;
 case 'coins':if(this.nearService('bank')){this.transferCoins(a.withdraw===true);result=true;}break;
 case 'recover':result=this.recover(a.id);break;
 case 'repair':result=this.repair();break;
 case 'home':if(this.nearService('repair')){this.setHome();result=true;}break;
 case 'buy-kit':if(this.nearService('repair')&&this.player.coins>=10){this.player.coins-=10;E.add(this.player.inv,'kit');result=true;}break;
 case 'sell':if(this.nearService('bank')&&Object.hasOwn(D.items,a.item)&&!D.items[a.item].skill&&this.player.inv[a.item]){E.add(this.player.inv,a.item,-1);this.player.coins+=Math.max(1,Math.floor(D.items[a.item].value/2));result=true;}break;
 case 'save':result=true;break;
 }return result;});this.changed=true;this.save();return {ok:Boolean(ok),service};}
 worldSave(){return {version:1,time:this.time,serial:this.serial,nodes:this.world.nodes.filter(n=>n.ready>this.time).map(n=>({id:n.id,ready:n.ready})),enemies:this.enemies.map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,dead:e.dead,respawn:e.respawn,body:e.body,angle:e.angle}))};}
 save(){this.unfocus();this.store.saveFrontier(this.worldSave(),[...this.members.values()].map(m=>[m.profile.id,{version:1,player:m.player,wrecks:m.wrecks,loot:m.loot}]));this.changed=false;}
 snapshot(id){const m=this.members.get(id);if(!m)return null;const near=o=>Math.hypot(o.x-m.player.x,o.y-m.player.y)<1400;return {version:3,tick:this.tick,time:this.time,ack:m.ack,player:clone(m.player),players:[...this.members.values()].map(v=>({id:v.player.id,name:v.profile.name,x:v.player.x,y:v.player.y,body:v.player.body,angle:v.player.angle,hp:v.player.hp,maxHP:100+(D.level(v.player.xp.Armor)-1)*4,connected:v.connected})),enemies:this.enemies.filter(near).map(e=>({...e})),nodes:this.world.nodes.filter(near).map(n=>({id:n.id,ready:n.ready})),bullets:this.bullets.filter(near).map((b,i)=>({...b,id:b.id??(b.id=++this.serial)})),blasts:this.blasts.filter(near),floaters:this.floaters.filter(near),wrecks:clone(m.wrecks),loot:clone(m.loot),gather:m.gather,events:[...m.events],savedAt:Date.now()};}
}
