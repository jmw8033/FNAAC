'use strict';
// Shared by the game, pack validator and editor. Threat controls music layers.
window.TANK_UNITS = {
 player:{name:'Player',color:'#478fae',speed:108,shot:245,bounce:1,cap:5,mines:2,cool:.19,threat:0},
 brown:{name:'Brown sentry',color:'#a07947',speed:0,shot:245,bounce:1,cap:1,mines:0,cool:2.5,threat:0,help:'Stationary; slow single shots.'},
 ash:{name:'Ash patrol',color:'#899390',speed:65,shot:245,bounce:1,cap:1,mines:0,cool:2.1,threat:0,help:'Slow patrol with defensive movement.'},
 marine:{name:'Marine rocketeer',color:'#48a6a4',speed:65,shot:430,bounce:0,cap:1,mines:0,cool:2.3,threat:1,help:'Fast rockets that cannot bounce.'},
 yellow:{name:'Yellow minelayer',color:'#e6bc39',speed:108,shot:245,bounce:1,cap:1,mines:4,cool:2.2,threat:1,help:'Approaches and lays mines frequently.'},
 pink:{name:'Pink gunner',color:'#dc7894',speed:65,shot:245,bounce:1,cap:3,mines:0,cool:.65,threat:1,help:'Quick fire with three active shells.'},
 green:{name:'Green sniper',color:'#69a758',speed:0,shot:430,bounce:2,cap:2,mines:0,cool:1.1,threat:2,help:'Predictive aim and two-bounce rockets.'},
 violet:{name:'Violet hunter',color:'#9479ba',speed:108,shot:245,bounce:1,cap:5,mines:2,cool:.6,threat:2,help:'Pursues players, dodges and lays mines.'},
 white:{name:'White ghost',color:'#dddace',speed:65,shot:245,bounce:1,cap:5,mines:2,cool:.7,threat:2,help:'Invisible after deployment; watch its tracks.'},
 black:{name:'Black ace',color:'#444946',speed:155,shot:430,bounce:0,cap:3,mines:2,cool:.5,threat:2,help:'Fast movement, rockets and mines.'},
 bulwark:{name:'Azure bulwark',color:'#4ebce1',speed:53,shot:220,bounce:1,cap:2,mines:0,cool:1.8,threat:2,help:'Its forward turret shield absorbs shells. Flank it or use mines.'},
 scatter:{name:'Coral scattergun',color:'#f18a61',speed:78,shot:230,bounce:1,cap:6,mines:0,cool:1.65,threat:1,help:'Fires a three-shell fan and keeps its distance. Rush between volleys.'},
 dash:{name:'Crimson lancer',color:'#cf4d64',speed:87,shot:300,bounce:0,cap:2,mines:0,cool:1.5,threat:2,help:'Flashes for 0.7 seconds, then dashes on a locked heading. Cannot fire while charging or dashing.'}
};
