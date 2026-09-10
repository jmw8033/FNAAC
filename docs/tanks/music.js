'use strict';
/* Three original 16-bar loops. Eighth-note sequences, synchronized stems,
   and smoothed layer gains keep changes musical without restarting the song. */
window.TankMusic = (() => {
 const songs={
  march:{name:'Tin March',bpm:108,roots:[48,53,55,48],melody:[72,0,76,79,76,0,74,72,77,0,81,79,77,76,74,0,79,0,83,81,79,0,77,74,76,79,74,72,0,67,72,0]},
  citadel:{name:'Paper Citadel',bpm:116,roots:[50,58,53,57],melody:[74,0,77,81,79,77,76,0,77,0,82,81,77,0,74,77,77,0,81,84,81,79,77,0,76,79,81,85,81,0,76,0]},
  night:{name:'Night Maneuvers',bpm:100,roots:[45,53,48,55],melody:[69,0,72,76,0,74,72,0,77,0,81,79,77,0,76,72,72,0,76,79,0,76,74,72,74,0,79,83,81,79,74,0]}
 };
 class Player{
  constructor(){this.ctx=null;this.master=null;this.layers=[];this.step=0;this.next=0;this.song='march';this.running=false;this.volume=.45;this.enabled=true;this.nodes=new Set();this.intensity=0;this.targets={};}
  init(ctx){if(this.ctx)return;this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);for(let i=0;i<3;i++){const g=ctx.createGain();g.gain.value=i?0:1;g.connect(this.master);this.layers.push(g);}const b=ctx.createBuffer(1,ctx.sampleRate*.2,ctx.sampleRate),d=b.getChannelData(0);let seed=811;for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d[i]=(seed/4294967296*2-1);}this.noise=b;}
  setSong(id){if(!songs[id])id='march';if(this.song===id)return;this.song=id;this.step=0;this.next=0;this.stopVoices();}
  stopVoices(){for(const o of this.nodes)try{o.stop();}catch{}this.nodes.clear();}
  tone(note,when,duration,layer,type='triangle',volume=.06){if(!note)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=440*2**((note-69)/12);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(volume,when+.015);g.gain.exponentialRampToValueAtTime(.0001,when+duration);o.connect(g);g.connect(this.layers[layer]);o.start(when);o.stop(when+duration+.02);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};}
  drum(when,kind,layer){const c=this.ctx,g=c.createGain();g.connect(this.layers[layer]);const v=kind==='hat'?.018:kind==='snare'?.04:.11;g.gain.setValueAtTime(v,when);g.gain.exponentialRampToValueAtTime(.0001,when+.12);let o;if(kind==='kick'){o=c.createOscillator();o.frequency.setValueAtTime(100,when);o.frequency.exponentialRampToValueAtTime(35,when+.12);o.connect(g);}else{o=c.createBufferSource();o.buffer=this.noise;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=kind==='hat'?6500:1800;o.connect(f);f.connect(g);o.onended=()=>f.disconnect();}o.start(when);o.stop(when+.14);this.nodes.add(o);const end=o.onended;o.onended=()=>{end?.();this.nodes.delete(o);o.disconnect();g.disconnect();};}
  schedule(step,when){const s=songs[this.song],beat=60/s.bpm/2,bar=Math.floor(step/8)%16,root=s.roots[Math.floor(bar/4)],idx=step%32,third=this.song==='march'?4:3,mel=s.melody[idx]+(Math.floor(bar/8)%2?12:0);
   // Calm: flute-like melody, soft bass and slow arpeggiated harmony.
   if(s.melody[idx])this.tone(mel,when,beat*1.6,0,'triangle',.055);
   if(step%4===0)this.tone(root,when,beat*3.6,0,'sine',.07);
   if(step%2===0)this.tone(root+12+[0,third,7,third][Math.floor(step/2)%4],when,beat*1.8,0,'sine',.027);
   // Alert: walking bass, plucked offbeats and a marching rhythm.
   this.tone(root+[0,7,12,7][step%4],when,beat*.85,1,'triangle',.075);
   if(step%2)this.tone(root+24+[third,7,12,7][step%4],when,beat*.6,1,'square',.014);
   if(step%4===0)this.drum(when,'kick',1);if(step%4===2)this.drum(when,'snare',1);
   // Intense: upper counter-melody, double-time accents and extra percussion.
   this.tone(root+24+[0,7,third,12,7,third,14,7][step%8],when,beat*.6,2,'sawtooth',.018);
   if(step%2===0)this.drum(when,'hat',2);if(step%8===7){this.drum(when,'snare',2);this.drum(when+beat*.5,'snare',2);}
  }
  tick({ctx,playing,muted=false,intensity=0,song='march'}){if(!ctx)return;this.init(ctx);this.setSong(song);this.intensity=Math.max(0,Math.min(2,intensity));const now=ctx.currentTime,active=playing&&!muted&&this.enabled&&ctx.state==='running';const target=(key,node,value,smoothing)=>{if(this.targets[key]!==value){node.gain.setTargetAtTime(value,now,smoothing);this.targets[key]=value;}};target('master',this.master,active?this.volume:0,.09);target('alert',this.layers[1],this.intensity>=1?.8:0,.45);target('intense',this.layers[2],this.intensity>=2?.9:0,.45);
   if(!active){if(this.running)this.stopVoices();this.running=false;return;}if(!this.running){this.next=now+.04;this.running=true;}if(this.next<now-.2)this.next=now+.04;while(this.next<now+.12){this.schedule(this.step,this.next);this.step=(this.step+1)%128;this.next+=60/songs[this.song].bpm/2;}
  }
 }
 return {Player,songs,threat:tanks=>tanks.reduce((m,t)=>t.alive&&!t.player?Math.max(m,t.cfg.threat||0):m,0)};
})();
