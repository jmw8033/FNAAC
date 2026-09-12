// IPC controls exist only in this test fixture; never in the public server.
import {startServer} from '../../server/main.mjs';
const server=await startServer({dbPath:process.argv[2],port:0,maxPlayers:8});
process.send({type:'ready',port:server.port});
process.on('message',async m=>{
 if(m.type==='arrange'){
  const [a,b]=[...server.room.sim.players.values()];Object.assign(a,{x:90,y:90,body:0,angle:0,speed:0,cool:0,shield:0});Object.assign(b,{x:300,y:90,body:0,angle:Math.PI,speed:0,cool:0,shield:0});
  process.send({type:'arranged'});
 }
 if(m.type==='stop'){await server.stop();process.exit(0);}
});
