const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function driveFrontier(p,input,world,dt=1/30){const throttle=clamp(input.throttle||0,-1,1),turn=clamp(input.turn||0,-1,1),region=world.region(p.x,p.y),traction=world.tile(p.x,p.y)===3?1:region===3?.68:region===2?.86:1;
 const target=throttle*(throttle<0?105:195)*traction;p.speed+=clamp(target-p.speed,-dt*(input.brake?700:210),dt*150);if(input.brake)p.speed*=Math.max(0,1-dt*9);p.body=wrap(p.body+turn*dt*(1.45-Math.min(.35,Math.abs(p.speed)/600)));
 const dx=Math.cos(p.body)*p.speed*dt,dy=Math.sin(p.body)*p.speed*dt;let moved=0;if(!world.blocked(p.x+dx,p.y)){p.x+=dx;moved+=Math.abs(dx);}if(!world.blocked(p.x,p.y+dy)){p.y+=dy;moved+=Math.abs(dy);}if(moved<Math.abs(p.speed)*dt*.1)p.speed*=.7;
 if(Number.isFinite(input.aim))p.angle=wrap(p.angle+clamp(wrap(input.aim-p.angle),-dt*3.6,dt*3.6));
}
globalThis.FrontierMovement={drive:driveFrontier};
