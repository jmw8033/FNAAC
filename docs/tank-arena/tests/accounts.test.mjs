import test from 'node:test';import assert from 'node:assert/strict';import {ProfileStore} from '../server/profile-store.mjs';import {Accounts} from '../server/accounts.mjs';
test('account ownership, legacy claim, login, recovery rotation and session revocation',async()=>{
 const store=new ProfileStore(':memory:'),accounts=new Accounts(store);try{
 const legacy=store.create('Veteran'),victim=store.create('Target');store.recordKill('old',legacy.profile.id,victim.profile.id);
 const a=await accounts.register({username:'Veteran_1',password:'a strong test password',legacyKey:legacy.token});assert.equal(a.profile.id,legacy.profile.id);assert.equal(a.profile.kills,1);assert.equal(store.authenticate(legacy.token),null);
 await assert.rejects(accounts.register({username:'Another',password:'a strong test password',legacyKey:legacy.token}));
 await assert.rejects(accounts.login({username:'veteran_1',password:'wrong password'}));
 const login=await accounts.login({username:'VETERAN_1',password:'a strong test password'});assert.equal(login.profile.id,a.profile.id);
 const ticket=accounts.ticket(login.token,'frontier');assert(accounts.consume(ticket,'frontier'));assert.equal(accounts.consume(ticket,'frontier'),null);
 const wrongGame=accounts.ticket(login.token,'frontier');assert.equal(accounts.consume(wrongGame,'arena'),null);
 const reset=await accounts.recover({username:'veteran_1',recovery:a.recovery,password:'a different strong password'});assert.notEqual(reset.recovery,a.recovery);assert.equal(accounts.session(login.token),null);assert.equal(accounts.session(a.token),null);
 await assert.rejects(accounts.recover({username:'veteran_1',recovery:a.recovery,password:'cannot reuse this password'}));
 const changed=await accounts.change(reset.token,{currentPassword:'a different strong password',password:'a third strong password'});assert.equal(accounts.session(reset.token),null);assert(accounts.session(changed.token));
 const stored=store.db.prepare('SELECT * FROM accounts').get();assert(!stored.password_hash.includes('strong'));assert.notEqual(stored.recovery_hash,changed.recovery);accounts.logout(changed.token);assert.equal(accounts.session(changed.token),null);
 const final=await accounts.login({username:'veteran_1',password:'a third strong password'});store.db.prepare('UPDATE sessions SET last_seen=0').run();assert.equal(accounts.session(final.token),null);
 }finally{store.close();}
});
