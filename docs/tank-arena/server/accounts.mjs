import {scrypt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt),N=131072,r=8,p=1,hash=v=>createHash('sha256').update(v).digest('hex');
export class AuthError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function username(s){if(typeof s!=='string'||!/^\w{3,20}$/.test(s)||!/^[a-zA-Z0-9_]+$/.test(s))throw new AuthError('Username must be 3–20 letters, numbers or underscores.');return s.toLowerCase();}
function password(s){if(typeof s!=='string'||s.length<12||s.length>128)throw new AuthError('Use a password of 12–128 characters.');return s;}
let hashing=0;
async function key(pass,salt){if(hashing>=2)throw new AuthError('Login is busy. Try again shortly.',503);hashing++;try{return await derive(pass,salt,32,{N,r,p,maxmem:256*1024*1024});}finally{hashing--;}}
async function encode(pass){password(pass);const salt=randomBytes(16).toString('hex');return salt+':'+(await key(pass,salt)).toString('hex');}
async function verify(pass,encoded){if(typeof pass!=='string'||pass.length>128)return false;const [salt,wanted]=encoded.split(':'),got=await key(pass,salt);return timingSafeEqual(got,Buffer.from(wanted,'hex'));}
const secret=prefix=>prefix+randomBytes(32).toString('base64url');
export class Accounts {
 constructor(store){this.store=store;this.db=store.db;this.tickets=new Map();this.limits=new Map();}
 limit(bucket,max,period=60000){const now=Date.now();let e=this.limits.get(bucket);if(!e||e.until<now){if(this.limits.size>4000)for(const [k,v]of this.limits)if(v.until<now)this.limits.delete(k);if(this.limits.size>5000)throw new AuthError('Try again shortly.',429);e={n:0,until:now+period};this.limits.set(bucket,e);}if(++e.n>max)throw new AuthError('Too many attempts. Try again later.',429);}
 profile(id){const a=this.db.prepare('SELECT username FROM accounts WHERE profile_id=?').get(id);return a?{...this.store.get(id),username:a.username}:null;}
 session(token){if(typeof token!=='string'||!/^as_[\w-]{43}$/.test(token))return null;const tokenHash=hash(token),now=Date.now(),s=this.db.prepare('SELECT * FROM sessions WHERE token_hash=?').get(tokenHash);if(!s)return null;if(s.expires_at<=now||s.last_seen<now-30*60*1000){this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash);return null;}if(now-s.last_seen>15000)this.db.prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?').run(now,tokenHash);return {...s,profile:this.profile(s.profile_id)};}
 createSession(id){const now=Date.now(),token=secret('as_');this.db.prepare('DELETE FROM sessions WHERE expires_at<? OR last_seen<?').run(now,now-30*60*1000);this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),id,now+12*60*60*1000,now);return {token,profile:this.profile(id)};}
 async register(data){const user=username(data.username),encoded=await encode(data.password);if(this.db.prepare('SELECT 1 FROM accounts WHERE username=?').get(user))throw new AuthError('That username is unavailable.',409);const recovery=secret('ar_');let id;
 this.store.transaction(()=>{if(data.legacyKey){const old=this.store.authenticate(data.legacyKey);if(!old)throw new AuthError('The old profile key is invalid or already claimed.',409);id=old.id;}else id=this.store.create(data.name||user).profile.id;try{this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?)').run(id,user,encoded,hash(recovery),Date.now());}catch(err){if(err.message?.includes('UNIQUE constraint'))throw new AuthError('That username or profile is already claimed.',409);throw err;}});
 return {...this.createSession(id),recovery};
 }
 async login(data){const user=username(data.username);this.limit('user:'+user,10,5*60000);const a=this.db.prepare('SELECT * FROM accounts WHERE username=?').get(user);const dummy='00000000000000000000000000000000:'+ '00'.repeat(32);if(!await verify(data.password,a?.password_hash||dummy)||!a)throw new AuthError('Incorrect username or password.',401);if(this.db.prepare('SELECT password_hash FROM accounts WHERE profile_id=?').get(a.profile_id)?.password_hash!==a.password_hash)throw new AuthError('Account changed. Sign in again.',401);return this.createSession(a.profile_id);}
 async recover(data){const user=username(data.username);this.limit('recover:'+user,5,15*60000);if(typeof data.recovery!=='string'||!/^ar_[\w-]{43}$/.test(data.recovery))throw new AuthError('Incorrect username or recovery code.',401);const a=this.db.prepare('SELECT * FROM accounts WHERE username=? AND recovery_hash=?').get(user,hash(data.recovery));if(!a)throw new AuthError('Incorrect username or recovery code.',401);const encoded=await encode(data.password),recovery=secret('ar_');this.store.transaction(()=>{const changed=this.db.prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE profile_id=? AND recovery_hash=?').run(encoded,hash(recovery),a.profile_id,hash(data.recovery)).changes;if(!changed)throw new AuthError('Recovery code was already used.',401);this.db.prepare('DELETE FROM sessions WHERE profile_id=?').run(a.profile_id);});return {...this.createSession(a.profile_id),recovery};}
 async change(token,data){const s=this.session(token);if(!s)throw new AuthError('Sign in again.',401);const old=this.db.prepare('SELECT password_hash FROM accounts WHERE profile_id=?').get(s.profile_id);if(!await verify(data.currentPassword,old.password_hash))throw new AuthError('Current password is incorrect.',401);const encoded=await encode(data.password),recovery=secret('ar_');this.store.transaction(()=>{const changed=this.db.prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE profile_id=? AND password_hash=?').run(encoded,hash(recovery),s.profile_id,old.password_hash).changes;if(!changed)throw new AuthError('Account changed. Sign in again.',409);this.db.prepare('DELETE FROM sessions WHERE profile_id=?').run(s.profile_id);});return {...this.createSession(s.profile_id),recovery};}
 logout(token){if(typeof token==='string')this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));}
 ticket(token,game){const s=this.session(token);if(!s)throw new AuthError('Sign in to play.',401);if(!['arena','frontier'].includes(game))throw new AuthError('Unknown game.');const now=Date.now();for(const [k,v]of this.tickets)if(v.until<now)this.tickets.delete(k);if(this.tickets.size>1000)throw new AuthError('Try again shortly.',429);const ticket=secret('jt_');this.tickets.set(ticket,{token,game,until:now+30000});return ticket;}
 consume(ticket,game){const t=this.tickets.get(ticket);this.tickets.delete(ticket);if(!t||t.game!==game||t.until<Date.now())return null;const s=this.session(t.token);return s?{profile:s.profile,sessionToken:t.token}:null;}
}
export function cookieToken(req){return /(?:^|;\s*)arena_session=([^;]+)/.exec(req.headers.cookie||'')?.[1]||'';}
export function authHandler(accounts,{joinCode,acceptOrigin}){return async function(req,res,path){
 if(!path.startsWith('/auth/'))return false;
 const origin=req.headers.origin;if(origin&&!acceptOrigin(origin)){res.writeHead(403);res.end();return true;}
 res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Arena-Request');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Content-Type','application/json');
 const reply=(status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));};
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return true;}
 const token=cookieToken(req),secure=req.headers['x-forwarded-proto']==='https'||origin?.startsWith('https:'),setCookie=(v,age)=>res.setHeader('Set-Cookie',`arena_session=${v}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`);
 try{
  if(path==='/auth/me'&&req.method==='GET'){const s=accounts.session(token);reply(s?200:401,s?{profile:s.profile}:{error:'Sign in to play.'});return true;}
  if(req.method!=='POST'||req.headers['x-arena-request']!=='1'||!req.headers['content-type']?.startsWith('application/json'))throw new AuthError('Invalid request.',403);
  if(!['/auth/register','/auth/login','/auth/recover','/auth/change','/auth/logout','/auth/ticket'].includes(path))throw new AuthError('Not found.',404);
  accounts.limit('ip:'+req.socket.remoteAddress,90);
  if(path==='/auth/register')accounts.limit('registration:'+req.socket.remoteAddress,16,3600000);
  if(path==='/auth/change')accounts.limit('change:'+hash(token),5,300000);
  let body='',bytes=0;const timer=setTimeout(()=>req.destroy(),6000);try{for await(const c of req){bytes+=c.length;if(bytes>4096)throw new AuthError('Request too large.',413);body+=c;}}finally{clearTimeout(timer);}
  let data;try{data=JSON.parse(body);}catch{throw new AuthError('Invalid JSON.');}if(!data||Array.isArray(data)||typeof data!=='object')throw new AuthError('Invalid JSON.');
  if(path==='/auth/logout'){accounts.logout(token);setCookie('',0);reply(200,{ok:true});return true;}
  if(path==='/auth/ticket'){reply(200,{ticket:accounts.ticket(token,data.game)});return true;}
  if(path==='/auth/register'&&joinCode&&data.code!==joinCode)throw new AuthError('Incorrect arena code.',403);
  let result;if(path==='/auth/register')result=await accounts.register(data);if(path==='/auth/login')result=await accounts.login(data);if(path==='/auth/recover')result=await accounts.recover(data);if(path==='/auth/change')result=await accounts.change(token,data);
  setCookie(result.token,12*3600);reply(200,{profile:result.profile,...(result.recovery?{recovery:result.recovery}:{})});
 }catch(err){if(!res.headersSent&&!res.destroyed)reply(err.status||503,{error:err.status?err.message:'Account service unavailable. Try again shortly.'});if(!err.status)console.error('Account request failed:',err.message);}
 return true;
};}
