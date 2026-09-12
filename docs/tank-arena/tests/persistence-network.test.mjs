import test from 'node:test';import assert from 'node:assert/strict';
import {fork} from 'node:child_process';import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {fileURLToPath} from 'node:url';
import {Client} from '@colyseus/sdk';import {VERSION} from '../arena/shared.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=5000){const at=Date.now();while(!fn()){if(Date.now()-at>ms)throw new Error('Timed out');await delay(25);}}
async function launch(path){const child=fork(fileURLToPath(new URL('./fixtures/arena-process.mjs',import.meta.url)),[path],{stdio:['ignore','ignore','inherit','ipc']});const [ready]=await once(child,'message');return {child,base:'http://127.0.0.1:'+ready.port};}
async function stop(child){const ended=once(child,'exit');child.send({type:'stop'});await ended;}
test('full server restart restores lifetime stats, recovery key identity and fresh session scores',{timeout:20000},async t=>{
 const dir=mkdtempSync(join(tmpdir(),'arena-network-')),path=join(dir,'arena.sqlite'),children=[],rooms=[];
 t.after(async()=>{for(const r of rooms){r.reconnection.enabled=false;try{r.leave();}catch{}}for(const c of children)if(c.exitCode===null){const done=once(c,'exit');c.kill();await done;}rmSync(dir,{recursive:true,force:true});});
 let server=await launch(path);children.push(server.child);
 const make=async name=>(await (await fetch(server.base+'/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})})).json());
 const pa=await make('Same'),pb=await make('Same');assert.notEqual(pa.profile.id,pb.profile.id);
 const status=await (await fetch(server.base+'/status')).json(),sdk=new Client(server.base);
 const auth=token=>({name:'Same',version:VERSION,profileToken:token});
 await assert.rejects(()=>sdk.joinById(status.roomId,auth('ta_'+'x'.repeat(43))));
 const a=await sdk.joinById(status.roomId,auth(pa.token)),b=await sdk.joinById(status.roomId,auth(pb.token));rooms.push(a,b);let latest;a.onMessage('snapshot',s=>latest=s);a.onMessage('pong',()=>{});b.onMessage('snapshot',()=>{});
 await assert.rejects(()=>sdk.joinById(status.roomId,auth(pa.token)));
 assert.equal((await fetch(server.base+'/profile')).status,401);
 assert.equal((await fetch(server.base+'/profile',{headers:{Authorization:'Bearer '+pb.token}})).status,200);
 assert.equal((await fetch(server.base+'/data/arena.sqlite')).status,404);
 const preflight=await fetch(server.base+'/profile',{method:'OPTIONS',headers:{Origin:'https://fnaac.world','Access-Control-Request-Headers':'authorization'}});assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-headers'),/Authorization/);
 const arranged=once(server.child,'message');server.child.send({type:'arrange'});await arranged;
 for(let seq=1;seq<=100&&!latest?.players.some(p=>p.kills===1);seq++){a.send('input',{seq,throttle:0,turn:0,aim:0,fire:true,brake:true,kills:999,lifetimeKills:999});await delay(34);}
 await until(()=>latest?.players.some(p=>p.kills===1));const me=latest.players.find(p=>p.id===a.sessionId);assert.equal(me.lifetimeKills,1);assert(!JSON.stringify(latest).includes(pa.token));
 a.reconnection.enabled=false;b.reconnection.enabled=false;await stop(server.child);
 server=await launch(path);children.push(server.child);
 const profile=await (await fetch(server.base+'/profile',{headers:{Authorization:'Bearer '+pa.token}})).json();assert.equal(profile.profile.id,pa.profile.id);assert.equal(profile.profile.kills,1);
 const freshStatus=await (await fetch(server.base+'/status')).json(),returning=await new Client(server.base).joinById(freshStatus.roomId,auth(pa.token));rooms.push(returning);let state;returning.onMessage('snapshot',s=>state=s);
 await until(()=>state?.players.length===1);assert.equal(state.players[0].kills,0);assert.equal(state.players[0].lifetimeKills,1);
 const victim=await (await fetch(server.base+'/profile',{headers:{Authorization:'Bearer '+pb.token}})).json();assert.equal(victim.profile.deaths,1);
 returning.reconnection.enabled=false;await returning.leave();await stop(server.child);
});
