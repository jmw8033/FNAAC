/* Tank Frontier: editable balance tables. No dependency on the Tanks! game. */
(function(global){
'use strict';
const skills=['Cannons','Machine Guns','Rockets','Armor','Engineering','Mining','Salvaging'];
const items={
 iron:{name:'Iron ore',value:4},copper:{name:'Copper ore',value:5},scrap:{name:'Scrap metal',value:3},crystal:{name:'Quartz',value:14},alloy:{name:'Alloy plate',value:22},kit:{name:'Repair kit',value:12},
 cannon:{name:'Field cannon',skill:'Cannons',req:1,min:9,max:21,cool:.85,speed:440,value:90,color:'#eec66f'},
 repeater:{name:'Rivet repeater',skill:'Machine Guns',req:1,min:2,max:6,cool:.16,speed:560,value:85,color:'#ffd78e'},
 launcher:{name:'Tube launcher',skill:'Rockets',req:1,min:13,max:27,cool:1.4,speed:290,splash:65,value:100,color:'#ff9271'},
 cannon2:{name:'Forged cannon',skill:'Cannons',req:5,min:15,max:31,cool:.85,speed:460,value:230,color:'#eec66f'},
 repeater2:{name:'Belt-fed repeater',skill:'Machine Guns',req:5,min:4,max:10,cool:.16,speed:570,value:210,color:'#ffd78e'},
 launcher2:{name:'Twin-fin launcher',skill:'Rockets',req:5,min:22,max:41,cool:1.4,speed:320,splash:75,value:250,color:'#ff9271'},
 cannon3:{name:'Alloy longbarrel',skill:'Cannons',req:12,min:24,max:46,cool:.8,speed:520,value:550,color:'#eec66f'},
 repeater3:{name:'Alloy chaingun',skill:'Machine Guns',req:12,min:7,max:15,cool:.15,speed:620,value:510,color:'#ffd78e'},
 launcher3:{name:'Quartz launcher',skill:'Rockets',req:12,min:34,max:62,cool:1.4,speed:340,splash:85,value:600,color:'#ff9271'},
 sunspike:{name:'Sunspike',skill:'Cannons',req:8,min:20,max:38,cool:.9,speed:500,value:900,color:'#ffc352',rare:true,pierce:true,trait:'Ignores half of enemy armor.'},
 frostbite:{name:'Frostbite',skill:'Machine Guns',req:10,min:5,max:12,cool:.16,speed:580,value:1100,color:'#82e9fc',rare:true,slow:true,trait:'Slows enemies for 1.5 seconds.'},
 wildfire:{name:'Wildfire',skill:'Rockets',req:14,min:30,max:57,cool:1.4,speed:330,splash:105,value:1400,color:'#ff8368',rare:true,burn:true,trait:'Burns targets for 12 extra damage.'}
};
const recipes=[
 {item:'kit',level:1,cost:{scrap:2,copper:1},xp:18},
 {item:'cannon',level:1,cost:{iron:5,scrap:4},xp:60},
 {item:'repeater',level:1,cost:{iron:3,copper:3,scrap:3},xp:60},
 {item:'launcher',level:1,cost:{iron:5,copper:2,scrap:4},xp:65},
 {item:'alloy',level:4,cost:{iron:2,copper:1},xp:24},
 {item:'cannon2',level:5,cost:{alloy:4,scrap:8},xp:150},
 {item:'repeater2',level:5,cost:{alloy:3,copper:6,scrap:7},xp:150},
 {item:'launcher2',level:5,cost:{alloy:4,copper:4,scrap:8},xp:165},
 {item:'cannon3',level:10,cost:{alloy:10,crystal:5,scrap:12},xp:320},
 {item:'repeater3',level:10,cost:{alloy:8,crystal:6,copper:10},xp:320},
 {item:'launcher3',level:10,cost:{alloy:10,crystal:8,scrap:12},xp:350}
];
const regions=[
 {name:'Brindle Meadows',color:'#63895c',shade:'#6e9365',level:'1–4'},
 {name:'Pinewood',color:'#3f7158',shade:'#497d60',level:'3–7'},
 {name:'Amber Dunes',color:'#c4a16d',shade:'#d0ae77',level:'6–12'},
 {name:'Mosswater',color:'#628c81',shade:'#6e9788',level:'5–10'},
 {name:'Frostfall',color:'#bccdd3',shade:'#cad8dc',level:'10–16'},
 {name:'Iron March',color:'#717776',shade:'#7d817c',level:'14–20'}
];
const enemyTypes={
 scout:{name:'Scrap scout',hp:40,armor:0,speed:62,damage:7,cool:1.7,shot:245,range:330,color:'#bb755e',level:1},
 rover:{name:'Woodland rover',hp:72,armor:1,speed:77,damage:10,cool:1.5,shot:270,range:370,color:'#acb06c',level:4},
 raider:{name:'Dune raider',hp:110,armor:2,speed:88,damage:14,cool:1.6,shot:290,range:400,color:'#c78158',level:7,rare:'sunspike'},
 carrier:{name:'Salvage crawler',hp:95,armor:1,speed:48,damage:9,cool:.75,shot:260,range:350,color:'#aaa476',level:6,truck:true},
 sentry:{name:'Frost sentry',hp:150,armor:3,speed:0,damage:19,cool:1.9,shot:350,range:480,color:'#6d92b5',level:11,rare:'frostbite'},
 heavy:{name:'March heavy',hp:220,armor:4,speed:49,damage:24,cool:1.8,shot:305,range:430,color:'#99749d',level:15,rare:'wildfire'},
 artillery:{name:'Siege carrier',hp:170,armor:2,speed:35,damage:27,cool:3.4,range:650,color:'#a88867',level:14,truck:true,artillery:true}
};
function threshold(level){let n=0;for(let i=1;i<level;i++)n+=Math.floor(55*Math.pow(i,1.32));return n;}
const thresholds=Array.from({length:100},(_,i)=>threshold(i+1));
function level(xp){let n=1;while(n<99&&xp>=thresholds[n])n++;return n;}
function rollDamage(weapon,skillLevel,random=Math.random){const mastery=Math.min(2.5,Math.max(0,skillLevel-weapon.req)/12);return Math.min(weapon.max,Math.floor(weapon.min+(weapon.max-weapon.min+1)*Math.pow(random(),1/(1+mastery))));}
global.FrontierData={skills,items,recipes,regions,enemyTypes,thresholds,level,rollDamage};
})(globalThis);
