import {Room,ServerError} from '@colyseus/core';
import {randomUUID} from 'node:crypto';
import {Simulation} from './simulation.mjs';
import {cleanName} from './profile-store.mjs';
import {DT,VERSION,neutral} from '../arena/shared.mjs';
export class ArenaRoom extends Room {
 onCreate(options){
  this.autoDispose=false;this.maxClients=options.maxPlayers;this.store=options.store;this.matchId=randomUUID();this.killSerial=0;this.storageFailed=false;
  this.sim=new Simulation({onKill:(attacker,victim)=>{
   if(!attacker)throw new Error('Missing attacker profile.');
   const saved=this.store.recordKill(this.matchId+':'+(++this.killSerial),attacker.profileId,victim.profileId);
   attacker.lifetimeKills=saved.attacker.kills;victim.lifetimeDeaths=saved.victim.deaths;
  }});
  this.joinCode=options.joinCode||'';this.seatReservationTimeout=10;
  this.onMessage('input',(client,data)=>{if(!this.permit(client)||this.storageFailed)return;this.sim.input(client.sessionId,data);});
  this.onMessage('ping',(client,data)=>{if(this.permit(client)&&Number.isFinite(data))client.send('pong',data);});
  this.onMessage('*',client=>{client.userData.kicked=true;client.leave(4000,'Unsupported message');});
  this.setSimulationInterval(()=>{
   if(this.storageFailed)return;
   try{this.sim.step();}catch(err){this.storageFailed=true;console.error('Arena paused: database save failed.',err.message);this.broadcast('persistence-error','Match paused: stats could not be saved. The host needs to check the server.');return;}
   if(this.sim.tick%2===0)this.broadcast('snapshot',this.sim.snapshot());
   if(this.sim.tick%30===0)for(const client of this.clients){const p=this.sim.players.get(client.sessionId);if(p&&this.sim.tick-p.lastActive>30*180){client.userData.kicked=true;client.leave(4000,'Idle for three minutes');}}
  },1000*DT);
 }
 permit(client){const u=client.userData,now=performance.now();u.tokens=Math.min(90,u.tokens+(now-u.tokenTime)*.07);u.tokenTime=now;if(u.tokens<1){u.kicked=true;client.leave(4000,'Message rate exceeded');return false;}u.tokens--;return true;}
 onAuth(client,options){
  if(this.storageFailed)throw new ServerError(503,'Arena paused: database unavailable.');
  if(options.version!==VERSION)throw new ServerError(400,'Refresh the page to update your game.');
  if(this.joinCode&&options.code!==this.joinCode)throw new ServerError(403,'Incorrect arena code.');
  try{cleanName(options.name);}catch(err){throw new ServerError(400,err.message);}
  const profile=this.store.authenticate(options.profileToken);
  if(!profile)throw new ServerError(401,'Profile key is invalid. Restore your key or create a new profile.');
  if([...this.sim.players.values()].some(p=>p.profileId===profile.id))throw new ServerError(409,'This profile is already in the arena. Leave the other session or wait 30 seconds.');
  return profile;
 }
 onJoin(client,options,auth){
  // Repeat after seat reservation: two joins can authenticate before either joins.
  if([...this.sim.players.values()].some(p=>p.profileId===auth.id))throw new ServerError(409,'This profile is already in the arena.');
  const profile=this.store.rename(auth.id,options.name);
  let name=profile.name;if([...this.sim.players.values()].some(p=>p.name===name))name=name.slice(0,12)+' '+client.sessionId.slice(0,3);
  client.userData={tokens:90,tokenTime:performance.now(),kicked:false};
  const p=this.sim.add(client.sessionId,name);p.profileId=profile.id;p.lifetimeKills=profile.kills;p.lifetimeDeaths=profile.deaths;
  client.send('snapshot',this.sim.snapshot());
 }
 onDrop(client){const p=this.sim.players.get(client.sessionId);if(p){p.connected=false;p.queue=[];p.input=neutral(p.angle);p.speed=0;}if(!this.shuttingDown&&!client.userData?.kicked)this.allowReconnection(client,30).catch(()=>{});}
 onReconnect(client){const p=this.sim.players.get(client.sessionId);if(p){p.connected=true;p.lastActive=this.sim.tick;p.queue=[];p.lastSeq=p.ack;p.input=neutral(p.angle);}client.userData.tokens=90;client.userData.tokenTime=performance.now();client.send('snapshot',this.sim.snapshot());if(this.storageFailed)client.send('persistence-error','Match paused: stats could not be saved. The host needs to check the server.');}
 onBeforeShutdown(){this.shuttingDown=true;super.onBeforeShutdown();}
 onLeave(client){this.sim.remove(client.sessionId);}
}
