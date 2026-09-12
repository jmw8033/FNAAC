// Shared deterministic driving and arena geometry. The server owns combat.
export const VERSION=2,WIDTH=1440,HEIGHT=960,DT=1/30,RADIUS=18;
export const WALLS=[
 {x:0,y:0,w:1440,h:32},{x:0,y:928,w:1440,h:32},{x:0,y:0,w:32,h:960},{x:1408,y:0,w:32,h:960},
 {x:240,y:176,w:224,h:48},{x:976,y:736,w:224,h:48},
 {x:240,y:736,w:224,h:48},{x:976,y:176,w:224,h:48},
 {x:288,y:368,w:48,h:224},{x:1104,y:368,w:48,h:224},
 {x:584,y:336,w:272,h:48},{x:584,y:576,w:272,h:48},
 {x:536,y:384,w:48,h:64},{x:856,y:512,w:48,h:64},
 {x:680,y:160,w:80,h:64},{x:680,y:736,w:80,h:64}
];
export const SPAWNS=[{x:128,y:128},{x:1312,y:832},{x:128,y:832},{x:1312,y:128},{x:720,y:96},{x:720,y:864},{x:112,y:480},{x:1328,y:480}];
export const COLORS=['#67c6df','#ef9875','#baa1e9','#e5c969','#82cda0','#de92bf','#b6bdc5','#edae62'];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function blocked(x,y,r=RADIUS){return !Number.isFinite(x)||!Number.isFinite(y)||WALLS.some(w=>x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h);}
export function drive(p,input,dt=DT){
 if(p.hp<=0)return;
 const target=input.throttle*(input.throttle<0?100:180);
 p.speed+=clamp(target-p.speed,-dt*230,dt*155);
 if(input.brake)p.speed*=Math.max(0,1-dt*10);
 p.body=wrap(p.body+input.turn*dt*(1.55-Math.min(.3,Math.abs(p.speed)/600)));
 p.angle=wrap(p.angle+clamp(wrap(input.aim-p.angle),-dt*4,dt*4));
 const dx=Math.cos(p.body)*p.speed*dt,dy=Math.sin(p.body)*p.speed*dt;
 if(!blocked(p.x+dx,p.y))p.x+=dx;else p.speed*=.4;
 if(!blocked(p.x,p.y+dy))p.y+=dy;else p.speed*=.4;
}
export function normalizeInput(v){if(!v||!Number.isSafeInteger(v.seq)||v.seq<0||v.seq>2147483647||!Number.isFinite(v.throttle)||!Number.isFinite(v.turn)||!Number.isFinite(v.aim)||typeof v.fire!=='boolean'||typeof v.brake!=='boolean')return null;return {seq:v.seq,throttle:clamp(v.throttle,-1,1),turn:clamp(v.turn,-1,1),aim:wrap(v.aim),fire:v.fire,brake:v.brake};}
export function neutral(angle=0){return {seq:0,throttle:0,turn:0,aim:angle,fire:false,brake:true};}
