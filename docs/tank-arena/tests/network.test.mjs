import {request} from 'node:http';
import test from 'node:test';import assert from 'node:assert/strict';
import {VERSION} from '../arena/shared.mjs';
import {Client} from '@colyseus/sdk';import {startServer} from '../server/main.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=3500){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw new Error('Timed out');await delay(25);}}
test('real clients share one arena and reconnect; server guards hold',async t=>{
 const server=await startServer({dbPath:':memory:',port:0,maxPlayers:2,joinCode:'test-code',origins:['http://localhost:2567']});
 const base='http://127.0.0.1:'+server.port,sdk=new Client(base),clients=[];
 t.after(async()=>{await Promise.allSettled(clients.map(r=>{r.reconnection.enabled=false;return Promise.race([r.leave(),delay(1000)]);}));await delay(50);await server.stop();});
 const response=await fetch(base+'/status'),status=await response.json();assert.equal(status.maxPlayers,2);assert(status.requiresCode);
 assert.equal((await fetch(base+'/status',{headers:{Origin:'https://invalid.example'}})).status,403);
 assert.equal((await fetch(base+'/.env')).status,404);
 assert.equal((await fetch(base+'/matchmake/create/arena',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,404);
 const chunked=await new Promise((resolve,reject)=>{const req=request(base+'/matchmake/reconnect/'+status.roomId,{method:'POST',headers:{'Content-Type':'application/json'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.write('{"reconnectionToken":');req.end('"invalid"}');});
 assert.notEqual(chunked.status,413);assert(JSON.parse(chunked.body).error);
 assert.equal((await fetch(base+'/matchmake/reconnect/'+status.roomId,{method:'POST',body:'x'.repeat(4097)})).status,413);
 await assert.rejects(()=>sdk.joinById(status.roomId,{name:'A',version:VERSION,code:'bad'}));
 const makeProfile=async name=>(await (await fetch(base+'/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,code:'test-code'})})).json()).token;
 const tokenA=await makeProfile('Tank A'),tokenB=await makeProfile('Tank B');
 const a=await sdk.joinById(status.roomId,{name:'<Tank A>',version:VERSION,code:'test-code',profileToken:tokenA});clients.push(a);let sa=null;a.onMessage('snapshot',s=>sa=s);a.onMessage('pong',()=>{});
 const b=await sdk.joinById(status.roomId,{name:'Tank B',version:VERSION,code:'test-code',profileToken:tokenB});clients.push(b);let sb=null;b.onMessage('snapshot',s=>sb=s);b.onMessage('pong',()=>{});
 await until(()=>sa?.players.length===2&&sb?.players.length===2);
 assert.equal(sa.players.find(p=>p.id===a.sessionId).name,'Tank A');
 await assert.rejects(()=>sdk.joinById(status.roomId,{name:'Third',version:VERSION,code:'test-code'}));
 const p=server.room.sim.players.get(a.sessionId);p.x=100;p.y=300;p.body=0;const before=p.x;
 for(let i=1;i<=15;i++){a.send('input',{seq:i,throttle:1,turn:0,aim:0,fire:false,brake:false,x:9999,hp:9999});await delay(34);}
 await until(()=>sb.players.find(p=>p.id===a.sessionId).x>before+10);assert.equal(p.hp,100);assert(p.x<300);
 const ap=server.room.sim.players.get(a.sessionId),bp=server.room.sim.players.get(b.sessionId);ap.x=90;ap.y=90;ap.angle=0;ap.body=0;ap.speed=0;ap.cool=0;ap.queue=[];bp.x=300;bp.y=90;bp.shield=0;
 for(let i=16;i<=100&&bp.hp>0;i++){a.send('input',{seq:i,throttle:0,turn:0,aim:0,fire:true,brake:true});await delay(34);}
 await until(()=>sb.players.find(p=>p.id===b.sessionId).hp===0);assert.equal(ap.kills,1);assert.equal(server.store.authenticate(tokenA).kills,1);assert.equal(server.store.authenticate(tokenB).deaths,1);assert(!JSON.stringify(sa).includes(tokenA));
 a.reconnection.minUptime=0;const sessionId=a.sessionId;let reconnected=false;a.onReconnect(()=>{reconnected=true;});server.room.clients.find(c=>c.sessionId===sessionId).ref.terminate();
 await until(()=>reconnected,7000);assert.equal(a.sessionId,sessionId);assert.equal(server.room.sim.players.get(sessionId).kills,1);assert.equal(server.room.sim.players.size,2);
 let paused='';a.onMessage('persistence-error',m=>paused=m);b.onMessage('persistence-error',()=>{});
 server.store.db.exec("CREATE TEMP TRIGGER fail_save BEFORE UPDATE OF deaths ON profiles BEGIN SELECT RAISE(ABORT, 'test disk failure'); END;");
 bp.hp=34;bp.shield=0;server.room.sim.shots.push({id:9999,owner:ap.id,x:bp.x-3,y:bp.y,vx:360,vy:0,life:1,color:ap.color});
 await until(()=>server.room.storageFailed&&paused);assert.match(paused,/could not be saved/);assert.equal(server.store.authenticate(tokenA).kills,1);assert.equal(server.store.authenticate(tokenB).deaths,1);
 const failedStatus=await (await fetch(base+'/status')).json();assert.equal(failedStatus.persistence,'error');assert.equal(failedStatus.ok,false);
 console.log('Real network test: join, input sync, combat, room cap, reconnect, origin and route guards passed.');
});
