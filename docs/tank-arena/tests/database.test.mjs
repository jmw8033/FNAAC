import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ProfileStore,snapshotDatabase} from '../server/profile-store.mjs';
function directory(t){const p=mkdtempSync(join(tmpdir(),'arena-db-'));t.after(()=>rmSync(p,{recursive:true,force:true}));return p;}
test('profile keys authenticate independently of names and stats survive reopening',t=>{
 const path=join(directory(t),'arena.sqlite');let db=new ProfileStore(path);
 const a=db.create('Same name'),b=db.create('Same name');assert.notEqual(a.profile.id,b.profile.id);
 assert.equal(db.authenticate(a.token).id,a.profile.id);assert.equal(db.authenticate('ta_'+'x'.repeat(43)),null);assert.equal(db.authenticate("' OR 1=1 --"),null);
 assert.equal(db.db.prepare('SELECT token_hash FROM profiles WHERE id=?').get(a.profile.id).token_hash.length,64);
 db.recordKill('match:1',a.profile.id,b.profile.id);db.recordKill('match:1',a.profile.id,b.profile.id);
 assert.equal(db.get(a.profile.id).kills,1);assert.equal(db.get(b.profile.id).deaths,1);
 assert.throws(()=>db.recordKill('invalid',a.profile.id,'missing'));assert.equal(db.get(a.profile.id).kills,1);
 db.close();db=new ProfileStore(path);assert.equal(db.authenticate(a.token).kills,1);assert.equal(db.authenticate(b.token).deaths,1);db.close();
 assert(!readFileSync(path).includes(Buffer.from(a.token)));
});
test('process interruption rolls back the whole kill; committed saves survive abrupt exit',t=>{
 const path=join(directory(t),'arena.sqlite');let db=new ProfileStore(path);const a=db.create('A'),b=db.create('B');db.close();
 const run=mode=>spawnSync(process.execPath,[fileURLToPath(new URL('./fixtures/interrupted-save.mjs',import.meta.url)),path,mode,a.profile.id,b.profile.id],{encoding:'utf8'});
 const interrupted=run('interrupt');assert.equal(interrupted.status,78,interrupted.stderr);
 db=new ProfileStore(path);assert.equal(db.get(a.profile.id).kills,0);assert.equal(db.get(b.profile.id).deaths,0);assert.equal(db.db.prepare('SELECT count(*) AS n FROM kill_events').get().n,0);db.close();
 const committed=run('commit');assert.equal(committed.status,77,committed.stderr);
 db=new ProfileStore(path);assert.equal(db.get(a.profile.id).kills,1);assert.equal(db.get(b.profile.id).deaths,1);assert.equal(db.db.prepare('SELECT count(*) AS n FROM kill_events').get().n,1);db.close();
});
test('live backup includes WAL commits; restore preserves profiles and refuses overwrite',async t=>{
 const dir=directory(t),path=join(dir,'arena.sqlite'),backup=join(dir,'backup.sqlite'),restored=join(dir,'restored.sqlite');
 const db=new ProfileStore(path),a=db.create('A'),b=db.create('B');try{db.recordKill('first',a.profile.id,b.profile.id);
 await snapshotDatabase(path,backup);db.recordKill('second',a.profile.id,b.profile.id);await snapshotDatabase(backup,restored);
 const recovery=new ProfileStore(restored);try{assert.equal(recovery.authenticate(a.token).kills,1);assert.equal(recovery.authenticate(b.token).deaths,1);}finally{recovery.close();}
 assert.equal(db.authenticate(a.token).kills,2);await assert.rejects(snapshotDatabase(path,backup),/already exists/);
 writeFileSync(join(dir,'invalid.sqlite'),'not a database');await assert.rejects(snapshotDatabase(join(dir,'invalid.sqlite'),join(dir,'invalid-copy.sqlite')));
 }finally{db.close();}
});
