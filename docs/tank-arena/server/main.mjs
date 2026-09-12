import {Server,matchMaker} from '@colyseus/core';
import {WebSocketTransport} from '@colyseus/ws-transport';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {ArenaRoom} from './arena-room.mjs';
import {ProfileStore,DEFAULT_DB} from './profile-store.mjs';
import {VERSION} from '../arena/shared.mjs';
export async function startServer({dbPath=DEFAULT_DB,port=Number(process.env.PORT||2567),host=process.env.HOST||'127.0.0.1',maxPlayers=Number(process.env.MAX_PLAYERS||8),joinCode=process.env.JOIN_CODE||'',origins=(process.env.ALLOWED_ORIGINS||'http://localhost:2567,http://127.0.0.1:2567,https://fnaac.world,https://www.fnaac.world,https://play.fnaac.world').split(',').map(s=>s.trim())}={}){
 if(!Number.isInteger(port)||port<0||port>65535||!Number.isInteger(maxPlayers)||maxPlayers<2||maxPlayers>16)throw new Error('PORT must be valid; MAX_PLAYERS must be between 2 and 16.');
 const store=new ProfileStore(dbPath);
 const allowed=new Set(origins),acceptOrigin=origin=>!origin||allowed.has(origin),requests=new Map();
 function allowRequest(key,limit){const now=Date.now();let r=requests.get(key);if(!r||now-r.start>60000){if(requests.size>2000){for(const [k,v] of requests)if(now-v.start>60000)requests.delete(k);if(requests.size>2000)return false;}r={start:now,count:0};requests.set(key,r);}return ++r.count<=limit;}
 const transport=new WebSocketTransport({maxPayload:2048,pingInterval:5000,pingMaxRetries:3,verifyClient:(info,next)=>{const ok=acceptOrigin(info.origin)&&allowRequest('ws:'+info.req.socket.remoteAddress,60);next(ok,403,'Connection denied');}});
 const gameServer=new Server({transport,greet:false,gracefullyShutdown:false});
 // The public cannot create additional rooms and bypass the configured cap.
 matchMaker.controller.exposedMethods=['joinById','reconnect'];
 matchMaker.controller.getCorsHeaders=headers=>({'Access-Control-Allow-Origin':allowed.has(headers.get('origin'))?headers.get('origin'):'null','Vary':'Origin'});
 gameServer.define('arena',ArenaRoom,{store});
 try{await gameServer.listen(port,host);}catch(err){store.close();throw err;}
 const room=await matchMaker.createRoom('arena',{maxPlayers,joinCode});
 const arenaId=room.roomId,root=fileURLToPath(new URL('../arena/',import.meta.url));
 const files=new Map([['/arena/','index.html'],['/arena/index.html','index.html'],['/arena/style.css','style.css'],['/arena/client.mjs','client.mjs'],['/arena/shared.mjs','shared.mjs'],['/arena/profiles.mjs','profiles.mjs'],['/arena/config.js','config.js'],['/arena/colyseus.js','colyseus.js']]);
 const mime={html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',mjs:'text/javascript'};
 const server=transport.server,handlers=server.listeners('request');server.removeAllListeners('request');
 server.on('request',async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  const origin=req.headers.origin;if(!acceptOrigin(origin)){res.writeHead(403);res.end('Origin not allowed');return;}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  let path;try{path=new URL(req.url,'http://server').pathname;}catch{res.writeHead(400);res.end();return;}
  if(path==='/status'){
   if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');res.writeHead(204);res.end();return;}
   if(req.method!=='GET'){res.writeHead(405);res.end();return;}
   const state=matchMaker.getLocalRoomById(arenaId);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:!state?.storageFailed,persistence:state?.storageFailed?'error':'ready',version:VERSION,roomId:arenaId,players:state?.sim.players.size||0,maxPlayers,requiresCode:Boolean(joinCode)}));return;
  }
  if(path==='/profile'){
   res.setHeader('Content-Type','application/json');
   res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   const reply=(status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));};
   if(!['GET','POST'].includes(req.method)){reply(405,{error:'Method not allowed.'});return;}
   if(!allowRequest('profile:'+req.socket.remoteAddress,180)){reply(429,{error:'Too many requests. Try again in a minute.'});return;}
   try{
    if(req.method==='GET'){
     const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1],profile=store.authenticate(token);
     reply(profile?200:401,profile?{profile}:{error:'Profile key is invalid. Restore your key or create a new profile.'});return;
    }
    if(!allowRequest('create:'+req.socket.remoteAddress,30)){reply(429,{error:'Too many new profiles. Try again in a minute.'});return;}
    if(Number(req.headers['content-length']||0)>1024){reply(413,{error:'Request too large.'});return;}
    if(!req.headers['content-type']?.startsWith('application/json')){reply(415,{error:'Send JSON.'});return;}
    let bytes=0,chunks=[];
    const timer=setTimeout(()=>req.destroy(),6000);
    try{for await(const chunk of req){bytes+=chunk.length;if(bytes>1024){reply(413,{error:'Request too large.'});return;}chunks.push(chunk);}}finally{clearTimeout(timer);}
    let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{reply(400,{error:'Invalid JSON.'});return;}
    if(!data||typeof data.name!=='string'||data.name.length>40){reply(400,{error:'Enter a name.'});return;}
    if(joinCode&&data.code!==joinCode){reply(403,{error:'Incorrect arena code.'});return;}
    reply(201,store.create(data.name));
   }catch(err){console.error('Profile request failed:',err.message);if(!res.headersSent&&!res.destroyed)reply(503,{error:'Profile storage unavailable. Try again after the host checks the server.'});}
   return;
  }
  if(path.startsWith('/matchmake/')){
   if(!/^\/matchmake\/(joinById|reconnect)\/[a-zA-Z0-9_-]+$/.test(path)){res.writeHead(404);res.end();return;}
   if(!allowRequest('join:'+req.socket.remoteAddress,180)){res.writeHead(429);res.end('Too many requests. Retry in a minute.');return;}
   if(Number(req.headers['content-length']||0)>4096){res.writeHead(413);res.end();return;}
   // Tunnels may use chunked requests. Bound the body without rejecting that encoding.
   let bytes=0;req.on('data',chunk=>{bytes+=chunk.length;if(bytes>4096)req.destroy();});
   for(const fn of handlers)fn.call(server,req,res);return;
  }
  if(path==='/'||path==='/arena'){res.writeHead(302,{Location:'/arena/'});res.end();return;}
  if((req.method==='GET'||req.method==='HEAD')&&files.has(path)){
   try{const file=files.get(path),data=await readFile(join(root,file));res.setHeader('Content-Type',mime[file.split('.').pop()]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('File missing');}return;
  }
  res.writeHead(404);res.end('Not found');
 });
 const actualPort=server.address().port;
 let stopping;return {gameServer,store,room:matchMaker.getLocalRoomById(arenaId),port:actualPort,stop:()=>stopping??=(async()=>{try{await gameServer.gracefullyShutdown(false);}finally{store.close();}})()};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const {port,stop}=await startServer();console.log(`Tank Arena ready. Open http://localhost:${port}/arena/`);console.log('Use Ctrl+C to stop. Lifetime stats are saved. Session scores reset on restart.');let stopping=false;const shutdown=async()=>{if(stopping)return;stopping=true;await stop();process.exit(0);};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);}catch(err){console.error('Server could not start:',err.message);process.exitCode=1;}
}
