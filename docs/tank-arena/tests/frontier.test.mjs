import test from 'node:test';import assert from 'node:assert/strict';import {ProfileStore} from '../server/profile-store.mjs';import {Accounts} from '../server/accounts.mjs';import {FrontierSimulation} from '../server/frontier-simulation.mjs';
const input=(seq,fire=false)=>({seq,throttle:0,turn:0,aim:0,fire,brake:true});
test('shared RPG gathering, combat, private loot, services, death recovery and saved characters',async()=>{
 const store=new ProfileStore(':memory:'),accounts=new Accounts(store);try{
 const a=await accounts.register({username:'player_a',password:'a long test password'}),b=await accounts.register({username:'player_b',password:'a long test password'});const sim=new FrontierSimulation(store),ma=sim.addPlayer('a',a.profile),mb=sim.addPlayer('b',b.profile);
 assert.throws(()=>sim.addPlayer('duplicate',a.profile));const node=sim.world.nodes.find(n=>n.id==='start-iron23');for(const m of [ma,mb]){m.player.x=node.x;m.player.y=node.y;}
 sim.action('a',{type:'interact'});sim.action('b',{type:'interact'});for(let i=0;i<70;i++)sim.step();assert.equal((ma.player.inv.iron||0)+(mb.player.inv.iron||0),1);assert(node.ready>sim.time);
 const workshop=sim.world.npcs.find(n=>n.service==='workshop');Object.assign(ma.player,{x:workshop.x,y:workshop.y});Object.assign(ma.player.inv,{scrap:10,copper:10});assert(sim.action('a',{type:'craft',item:'kit'}).ok);assert.equal(ma.player.inv.scrap,8);assert.equal(store.loadCharacter(a.profile.id).player.inv.kit,4);
 assert.equal(sim.action('b',{type:'craft',item:'kit'}).ok,false);assert.equal(sim.action('b',{type:'coins',coins:999999}).ok,false);assert.equal(sim.action('b',{type:'bank',item:'__proto__'}).ok,false);
 const enemy=sim.enemies[0];enemy.hp=1;enemy.cool=10;Object.assign(ma.player,{x:enemy.x-180,y:enemy.y,angle:0,body:0,cool:0,speed:0});Object.assign(mb.player,{x:enemy.x-80,y:enemy.y,speed:0});const beforeB=mb.player.hp;
 for(let i=1;i<=50&&!enemy.dead;i++){sim.inputFor('a',input(i,true));sim.step();}assert(enemy.dead);assert.equal(ma.player.kills,1);assert(ma.player.xp.Cannons>0);assert.equal(mb.player.hp,beforeB);assert.equal(ma.loot.length,1);assert.equal(mb.loot.length,0);assert.equal(sim.snapshot('b').loot.length,0);assert(!Object.hasOwn(sim.snapshot('b').players[0],'inv'));
 Object.assign(ma.player,{x:enemy.x,y:enemy.y});const oldCoins=ma.player.coins;assert(sim.action('a',{type:'interact'}).ok);assert(ma.player.coins>oldCoins);assert.equal(ma.loot.length,0);
 const bank=sim.world.npcs.find(n=>n.service==='bank');Object.assign(ma.player,{x:bank.x,y:bank.y});assert(sim.action('a',{type:'coins'}).ok);assert(ma.player.bankCoins>0);assert.equal(ma.player.coins,0);
 Object.assign(ma.player,{x:enemy.x,y:enemy.y,invuln:0,coins:20});sim.withMember(ma,()=>sim.damagePlayer(1000));sim.save();assert.equal(Object.values(ma.player.inv).reduce((n,q)=>n+q,0),3);assert.equal(ma.wrecks.length,1);assert.equal(mb.wrecks.length,0);assert(ma.player.bankCoins>0);
 const wreck=ma.wrecks[0];Object.assign(ma.player,{x:wreck.x,y:wreck.y});sim.action('a',{type:'interact'});assert.equal(ma.wrecks.length,0);assert.equal(ma.player.coins,20);
 sim.save();const loaded=new FrontierSimulation(store),returning=loaded.addPlayer('new-session',a.profile);assert.equal(returning.player.kills,1);assert.equal(returning.player.coins,20);assert.equal(returning.player.bankCoins,ma.player.bankCoins);assert.equal(loaded.enemies[0].dead,true);assert.equal(returning.wrecks.length,0);
 }finally{store.close();}
});
