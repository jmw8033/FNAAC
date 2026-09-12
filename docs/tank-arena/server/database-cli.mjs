import {DEFAULT_DB,snapshotDatabase,validateDatabase} from './profile-store.mjs';
import {DatabaseSync} from 'node:sqlite';
import {existsSync} from 'node:fs';
const [command,...args]=process.argv.slice(2);
try{
 if(command==='backup'){
  if(args.length>1)throw new Error('Usage: npm run db:backup -- [new-backup-path]');
  const target=args[0]||'backups/arena-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';
  console.log('Backup saved: '+await snapshotDatabase(DEFAULT_DB,target));
 }else if(command==='restore'){
  if(args.length!==2)throw new Error('Usage: npm run db:restore -- backup.sqlite data/restored.sqlite');
  const path=await snapshotDatabase(args[0],args[1]);console.log('Restored to: '+path);console.log('Stop the server, set DB_PATH to this file in .env, then restart. Existing data was not overwritten.');
 }else if(command==='check'){
  if(args.length>1)throw new Error('Usage: npm run db:check -- [database-path]');
  const path=args[0]||DEFAULT_DB;if(!existsSync(path))throw new Error('Database does not exist. Start the server first.');
  const db=new DatabaseSync(path,{readOnly:true});try{validateDatabase(db);console.log('Database OK; profiles: '+db.prepare('SELECT count(*) AS n FROM profiles').get().n);}finally{db.close();}
 }else throw new Error('Choose backup, restore, or check.');
}catch(err){console.error(err.message);process.exitCode=1;}
