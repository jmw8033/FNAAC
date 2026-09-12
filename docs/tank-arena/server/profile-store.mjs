import {DatabaseSync,backup} from 'node:sqlite';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,copyFileSync,unlinkSync,constants} from 'node:fs';
import {dirname,resolve} from 'node:path';
export const DEFAULT_DB=resolve(process.env.DB_PATH||'data/arena.sqlite');
const hash=token=>createHash('sha256').update(token).digest('hex');
export const validToken=token=>typeof token==='string'&&/^ta_[A-Za-z0-9_-]{43}$/.test(token);
export function cleanName(name){if(typeof name!=='string'||name.length>40)throw new Error('Enter a name of up to 16 characters.');return name.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,16)||'Tank';}
const publicFields='id,name,kills,deaths,created_at AS createdAt,updated_at AS updatedAt';
export class ProfileStore {
 constructor(path=DEFAULT_DB){
  this.path=path===':memory:'?path:resolve(path);
  if(this.path!==':memory:')mkdirSync(dirname(this.path),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(this.path);
  try{
   this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
   const version=this.db.prepare('PRAGMA user_version').get().user_version;
   if(version>1)throw new Error('Database is newer than this server. Use the matching server version.');
   if(version===0){this.transaction(()=>{this.db.exec(readFileSync(new URL('./migrations/001-profiles.sql',import.meta.url),'utf8'));this.db.exec('PRAGMA user_version=1;');});}
   validateDatabase(this.db);
   this.findByToken=this.db.prepare(`SELECT ${publicFields} FROM profiles WHERE token_hash=?`);
   this.findById=this.db.prepare(`SELECT ${publicFields} FROM profiles WHERE id=?`);
   this.insertProfile=this.db.prepare('INSERT INTO profiles(id,token_hash,name,created_at,updated_at) VALUES(?,?,?,?,?)');
   this.insertEvent=this.db.prepare('INSERT INTO kill_events(id,attacker_id,victim_id,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING');
   this.addKill=this.db.prepare('UPDATE profiles SET kills=kills+1,updated_at=? WHERE id=?');
   this.addDeath=this.db.prepare('UPDATE profiles SET deaths=deaths+1,updated_at=? WHERE id=?');
  }catch(err){this.db.close();throw err;}
 }
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(err){this.db.exec('ROLLBACK');throw err;}}
 create(name){name=cleanName(name);const token='ta_'+randomBytes(32).toString('base64url'),id=randomUUID(),now=Date.now();this.insertProfile.run(id,hash(token),name,now,now);return {token,profile:this.get(id)};}
 authenticate(token){return validToken(token)?this.findByToken.get(hash(token))||null:null;}
 get(id){return this.findById.get(id)||null;}
 rename(id,name){this.db.prepare('UPDATE profiles SET name=?,updated_at=? WHERE id=?').run(cleanName(name),Date.now(),id);return this.get(id);}
 recordKill(eventId,attackerId,victimId){
  if(attackerId===victimId)throw new Error('A profile cannot score against itself.');
  return this.transaction(()=>{
   const now=Date.now(),inserted=this.insertEvent.run(eventId,attackerId,victimId,now).changes>0;
   if(inserted){this.addKill.run(now,attackerId);this.addDeath.run(now,victimId);}
   else{const prior=this.db.prepare('SELECT attacker_id,victim_id FROM kill_events WHERE id=?').get(eventId);if(prior.attacker_id!==attackerId||prior.victim_id!==victimId)throw new Error('Conflicting combat event.');}
   return {inserted,attacker:this.get(attackerId),victim:this.get(victimId)};
  });
 }
 close(){this.db.close();}
}
export function validateDatabase(db){
 if(db.prepare('PRAGMA user_version').get().user_version!==1)throw new Error('Not a supported arena database.');
 if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Database integrity check failed.');
 db.prepare(`SELECT ${publicFields},token_hash FROM profiles LIMIT 0`).all();
 db.prepare('SELECT id,attacker_id,victim_id,created_at FROM kill_events LIMIT 0').all();
}
// The SQLite backup API includes committed WAL data. Never copy just a live .sqlite file.
// Publish only a validated snapshot, and never replace an existing destination.
export async function snapshotDatabase(source,destination){
 source=resolve(source);destination=resolve(destination);
 if(!existsSync(source))throw new Error('Source database does not exist.');
 if([destination,destination+'-wal',destination+'-shm'].some(existsSync))throw new Error('Destination already exists. Choose a new filename.');
 mkdirSync(dirname(destination),{recursive:true,mode:0o700});
 const temporary=destination+'.'+randomUUID()+'.tmp',db=new DatabaseSync(source,{readOnly:true});
 try{validateDatabase(db);await backup(db,temporary);const check=new DatabaseSync(temporary,{readOnly:true});try{validateDatabase(check);}finally{check.close();}copyFileSync(temporary,destination,constants.COPYFILE_EXCL);}finally{db.close();if(existsSync(temporary))unlinkSync(temporary);}
 return destination;
}
