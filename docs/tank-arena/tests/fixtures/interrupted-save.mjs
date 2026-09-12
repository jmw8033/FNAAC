import {ProfileStore} from '../../server/profile-store.mjs';
const [path,mode,attacker,victim]=process.argv.slice(2),store=new ProfileStore(path);
if(mode==='interrupt'){
 store.db.function('interrupt_save',()=>process.exit(78));
 store.db.exec('CREATE TEMP TRIGGER interrupt_after_kill AFTER UPDATE OF kills ON profiles BEGIN SELECT interrupt_save(); END;');
}
store.recordKill(mode,attacker,victim);
// Deliberately exit without a graceful database close, after COMMIT in this mode.
process.exit(77);
