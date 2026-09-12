import {DT,SPAWNS,COLORS,drive,blocked,neutral,normalizeInput,VERSION} from '../arena/shared.mjs';
export class Simulation {
 constructor({onKill=()=>{}}={}){this.onKill=onKill;this.players=new Map();this.shots=[];this.tick=0;this.serial=0;this.events=[];}
 add(id,name){const p={id,name,color:COLORS.find(c=>![...this.players.values()].some(p=>p.color===c))||COLORS[this.players.size%COLORS.length],x:0,y:0,body:0,angle:0,speed:0,hp:100,kills:0,deaths:0,connected:true,cool:0,shield:0,respawn:0,ack:0,input:neutral(),queue:[],lastInput:0,lastActive:0,lastSeq:0};this.players.set(id,p);this.spawn(p);return p;}
 remove(id){this.players.delete(id);this.shots=this.shots.filter(s=>s.owner!==id);}
 spawn(p){let best=SPAWNS[0],score=-1;for(const s of SPAWNS){let nearest=Infinity;for(const o of this.players.values())if(o!==p&&o.hp>0)nearest=Math.min(nearest,Math.hypot(o.x-s.x,o.y-s.y));const value=nearest===Infinity?1000+((this.serial++)%SPAWNS.length===SPAWNS.indexOf(s)?1:0):nearest;if(value>score){score=value;best=s;}}p.x=best.x;p.y=best.y;p.body=Math.atan2(480-p.y,720-p.x);p.angle=p.body;p.speed=0;p.hp=100;p.shield=2;p.cool=.3;p.respawn=0;p.queue=[];p.input=neutral(p.angle);p.lastInput=this.tick;p.lastActive=this.tick;}
 input(id,raw){const p=this.players.get(id),i=normalizeInput(raw);if(!p||!i||i.seq<=p.lastSeq||i.seq>p.lastSeq+600)return false;p.lastSeq=i.seq;p.lastInput=this.tick;if(i.throttle||i.turn||i.fire||Math.abs(i.aim-p.angle)>.02)p.lastActive=this.tick;if(p.queue.length>=6)p.queue.shift();p.queue.push(i);return true;}
 step(){this.tick++;for(const p of this.players.values()){
 p.cool=Math.max(0,p.cool-DT);p.shield=Math.max(0,p.shield-DT);
 if(p.hp<=0){p.respawn-=DT;if(p.respawn<=0&&p.connected)this.spawn(p);continue;}
 if(p.queue.length){p.input=p.queue.shift();p.ack=p.input.seq;}
 if(!p.connected||this.tick-p.lastInput>8){p.input=neutral(p.angle);p.queue=[];}
 drive(p,p.input);
 if(p.connected&&p.input.fire&&p.cool<=0&&this.shots.filter(s=>s.owner===p.id).length<5){p.cool=.72;p.shield=0;this.shots.push({id:++this.serial,owner:p.id,x:p.x+Math.cos(p.angle)*29,y:p.y+Math.sin(p.angle)*29,vx:Math.cos(p.angle)*360,vy:Math.sin(p.angle)*360,life:2.7,color:p.color});}
 }
 for(const s of this.shots){for(let i=0;i<3&&!s.dead;i++){s.x+=s.vx*DT/3;s.y+=s.vy*DT/3;s.life-=DT/3;if(s.life<=0||blocked(s.x,s.y,3)){s.dead=true;break;}for(const p of this.players.values())if(p.id!==s.owner&&p.hp>0&&Math.hypot(p.x-s.x,p.y-s.y)<21){s.dead=true;if(p.shield<=0){const nextHp=Math.max(0,p.hp-34);if(nextHp===0)this.onKill(this.players.get(s.owner),p);p.hp=nextHp;if(p.hp===0){p.deaths++;p.respawn=3;p.speed=0;const attacker=this.players.get(s.owner);if(attacker)attacker.kills++;this.events.push({id:++this.serial,text:(attacker?.name||'A tank')+' destroyed '+p.name});this.events=this.events.slice(-5);}}break;}}
 }
 this.shots=this.shots.filter(s=>!s.dead);
 }
 snapshot(){return {version:VERSION,tick:this.tick,players:Array.from(this.players.values(),p=>({id:p.id,name:p.name,color:p.color,x:p.x,y:p.y,body:p.body,angle:p.angle,speed:p.speed,hp:p.hp,kills:p.kills,deaths:p.deaths,lifetimeKills:p.lifetimeKills||0,lifetimeDeaths:p.lifetimeDeaths||0,connected:p.connected,shield:p.shield,respawn:p.respawn,ack:p.ack,cool:p.cool})),shots:this.shots.map(({dead,...s})=>s),events:this.events};}
}
