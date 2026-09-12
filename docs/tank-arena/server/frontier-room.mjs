import {Room,ServerError} from '@colyseus/core';import {FrontierSimulation} from './frontier-simulation.mjs';
import {DT,VERSION,neutral} from '../arena/shared.mjs';
export class FrontierRoom extends Room{
 onCreate(o){this.autoDispose=false;this.maxClients=o.maxPlayers;this.accounts=o.accounts;this.sim=new FrontierSimulation(o.store);this.storageFailed=false;this.seatReservationTimeout=10;
 this.onMessage('input',(c,v)=>{if(this.permit(c)&&!this.storageFailed)this.sim.inputFor(c.sessionId,v);});
 this.onMessage('action',(c,v)=>{if(!this.permit(c)||this.storageFailed)return;const now=performance.now();if(now-c.userData.lastAction<150)return;c.userData.lastAction=now;try{const result=this.sim.action(c.sessionId,v);c.send('action-result',result);}catch(err){this.fail(err);}});
 this.onMessage('ping',(c,v)=>{if(this.permit(c)&&Number.isFinite(v))c.send('pong',v);});
 this.onMessage('*',c=>c.leave(4000,'Unsupported message'));
 this.setSimulationInterval(()=>{if(this.storageFailed)return;try{this.sim.step();if(this.sim.tick%2===0)for(const c of this.clients){const s=this.sim.snapshot(c.sessionId);if(s)c.send('snapshot',s);}if(this.sim.tick%30===0)for(const c of this.clients)if(this.sim.tick-(this.sim.members.get(c.sessionId)?.lastActive??this.sim.tick)>30*180){c.userData.kicked=true;c.leave(4000,'Idle for three minutes.');}else if(!this.accounts.session(c.userData.sessionToken)){c.userData.kicked=true;c.leave(4001,'Session expired. Sign in again.');}}catch(err){this.fail(err);}},DT*1000);
 }
 fail(err){this.storageFailed=true;console.error('Frontier paused:',err.message);this.broadcast('persistence-error','World paused: progress could not be saved. Contact the host.');}
 permit(c){const u=c.userData,now=performance.now();u.tokens=Math.min(90,u.tokens+(now-u.at)*.07);u.at=now;if(u.tokens<1){u.kicked=true;c.leave(4000,'Message rate exceeded');return false;}u.tokens--;return true;}
 onAuth(c,o){if(o.version!==VERSION)throw new ServerError(400,'Refresh the game.');if(this.storageFailed)throw new ServerError(503,'World is paused.');const a=this.accounts.consume(o.ticket,'frontier');if(!a)throw new ServerError(401,'Sign in to play.');if([...this.sim.members.values()].some(m=>m.profile.id===a.profile.id))throw new ServerError(409,'Character already online. Leave the other session or wait 30 seconds.');return a;}
 onJoin(c,o,a){c.userData={tokens:90,at:performance.now(),lastAction:0,sessionToken:a.sessionToken,kicked:false};try{this.sim.addPlayer(c.sessionId,a.profile);}catch(err){this.sim.members.delete(c.sessionId);if(err.message==='This character is already online.')throw new ServerError(409,err.message);this.fail(err);throw new ServerError(503,'Character could not be loaded or saved. Contact the host.');}c.send('snapshot',this.sim.snapshot(c.sessionId));}
 onDrop(c){const m=this.sim.members.get(c.sessionId);if(m){m.connected=false;m.queue=[];m.input=neutral(m.player.angle);m.player.speed=0;}if(!this.shuttingDown&&!c.userData?.kicked)this.allowReconnection(c,30).catch(()=>{});}
 onReconnect(c){if(!this.accounts.session(c.userData.sessionToken)){c.userData.kicked=true;c.leave(4001,'Sign in again.');return;}const m=this.sim.members.get(c.sessionId);if(m){m.connected=true;m.queue=[];m.lastSeq=m.ack;m.lastInput=this.sim.tick;}c.send('snapshot',this.sim.snapshot(c.sessionId));if(this.storageFailed)c.send('persistence-error','World paused: progress could not be saved.');}
 onLeave(c){if(this.storageFailed){this.sim.members.delete(c.sessionId);return;}try{this.sim.removePlayer(c.sessionId);}catch(err){this.fail(err);}}
 onBeforeShutdown(){this.shuttingDown=true;if(!this.storageFailed)try{this.sim.save();}catch(err){this.fail(err);}super.onBeforeShutdown();}
}
