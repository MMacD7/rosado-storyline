/* Rosado Nights · Level 3 "The Alley" + Level 4 "The Airfield" hangar fight (v0.4.0: start('airfield') = Big Manny + Aces duo at the hangar, then Richie boards the plane; v0.3.1: KICK button + kick combos, RICHIE RAGE special with a rage meter; v0.3.2: El Jefe is a 7 ft giant, boss KO hands off to the cutscene video)
   Side-scrolling 2.5D beat-'em-up: Richie vs El Jefe Esteban Lavanda's linen-suited bodyguards.
   Cartoon fighting only: hit flashes, knock-downs, blink-and-vanish. Canvas fallback art when images fail.
   API: RosadoFight.start(), update(dt), render(ctx,W,t) (ctx is a 2x buffer), move(x,y), press('atk'|'kick'|'jump'|'special'),
        hold(bool), ending(), retryWave(), setAuto(bool), auto(), on(evt,fn), snap(), portrait(cv), loadSprites(map,cb), spriteMode(), dev.* (tests). No network. */
(function(){
"use strict";
var H=225,LEN=1600,YMIN=152,YMAX=214,GRAV=640;
var META={"l3-r-guard":[99,172,49.0],"l3-r-jab":[125,170,49.5],"l3-r-hook":[128,169,53.5],"l3-r-kick":[125,117,56.0],"l3-r-hurt":[98,165,46.0],"l3-r-jump":[70,115,32.0],"l3-r-grab":[124,147,47.5],"l3-r-throw":[97,153,48.0],"l3-r-spin":[97,141,45.0],"l3-r-down":[139,69,69.5],"l3-r-chamber":[77,172,29.5],"l3-r-fkick":[126,167,40.5],"l3-r-round":[121,165,43.0],"l3-r-heel":[106,167,35.0],"l3-r-jkick":[113,116,53.0],"l3-r-walk-0":[81,168,40.0],"l3-r-walk-1":[78,168,38.5],"l3-r-walk-2":[83,169,41.0],"l3-r-walk-3":[64,169,27.0],"l3-bruno-idle":[87,180,43.0],"l3-bruno-walk":[109,177,54.0],"l3-bruno-hug":[147,167,74.5],"l3-bruno-hurt":[98,178,50.5],"l3-bruno-down":[140,52,70.0],"l3-tito-idle":[102,182,50.5],"l3-tito-walk":[109,181,54.0],"l3-tito-hurt":[97,168,48.0],"l3-tito-down":[163,78,81.5],"l3-tito-up":[134,251,66.5],"l3-tito-slam":[162,181,103.5],"l3-rafa-idle":[99,176,49.0],"l3-rafa-walk":[102,176,50.5],"l3-rafa-block":[98,174,48.5],"l3-rafa-punch":[133,173,79.5],"l3-rafa-hurt":[98,172,43.5],"l3-rafa-down":[172,98,86.0],"l3-jefe-idle":[101,238,50.5],"l3-jefe-walk":[123,236,61.0],"l3-jefe-hook":[158,185,61.0],"l3-jefe-twirl":[158,221,50.5],"l3-jefe-whistle":[104,237,47.5],"l3-jefe-down":[166,196,83.0],"l3-empanada":[56,40,28.0],"l3-cane":[35,80,17.5],"l3-watch":[27,44,13.5],"l3-bin":[53,76,26.5],"l3-crate":[60,64,30.0],"l3-planks":[47,44,23.5],"l3-car":[440,135,220.0],"l3-car-dmg":[440,135,220.0],"l4-manny-idle":[113,200,58.0],"l4-manny-walk":[113,196,60.5],"l4-manny-charge":[127,158,67.0],"l4-manny-stomp":[108,214,51.5],"l4-manny-hurt":[129,158,52.0],"l4-manny-down":[166,58,83.0],"l4-aces-idle":[112,176,55.5],"l4-aces-jab":[140,181,83.5],"l4-aces-fly":[160,141,78.0],"l4-aces-hurt":[144,163,99.0],"l4-aces-down":[189,66,94.5],"l4-aces-walk":[100,176,50.5]};
var SLOTS=Object.keys(META).concat(['l3-bg-a','l3-bg-b','l3-jefe-portrait','l4-bg-a','l4-bg-b','l4-manny-portrait','l4-aces-portrait']);
var CORE=['l3-bg-a','l3-bg-b','l3-r-guard','l3-r-jab','l3-bruno-idle','l3-tito-idle','l3-rafa-idle','l3-jefe-idle','l3-car'];
var SPR={},WHITE={};
function loadSprites(map,cb){var ks=Object.keys(map||{}).filter(function(k){return SLOTS.indexOf(k)>=0}),n=ks.length;if(!n){if(cb)cb();return}
 ks.forEach(function(k){var im=new Image();im.onload=function(){SPR[k]=im;if(--n===0&&cb)cb()};im.onerror=function(){if(--n===0&&cb)cb()};im.src=map[k]})}
function spriteMode(){for(var i=0;i<CORE.length;i++)if(!SPR[CORE[i]])return false;return true}
var SFX=window.RosadoSFX||{},sfx=function(n,a){if(SFX[n])try{SFX[n](a)}catch(e){}};
var EV={};function on(e,f){(EV[e]=EV[e]||[]).push(f)}function emit(e,a){(EV[e]||[]).forEach(function(f){f(a)})}

/* ---------- tuning ---------- */
var TYPES={
 richie:{hp:100,spd:74,spdY:44},
 rafa:{hp:42,spd:52,name:'RAFA',reach:30,cd:[1.0,1.8],block:0.45},
 bruno:{hp:58,spd:38,name:'BRUNO',reach:24,cd:[1.4,2.4]},
 tito:{hp:62,spd:30,name:'TITO',reach:32,cd:[1.6,2.6]},
 jefe:{hp:150,spd:44,name:'EL JEFE ESTEBAN LAVANDA',reach:52,cd:[1.4,2.2],big:1},
 /* Level 4 hangar duo: Big Manny (heavy: can't be grabbed, shrugs off jabs mid-move, shoulder CHARGE + ground STOMP) and Aces (fast: dodges punches, double jab + flying kick) */
 manny:{hp:120,spd:34,name:'BIG MANNY',reach:30,cd:[1.5,2.4]},
 aces:{hp:84,spd:60,name:'ACES',reach:30,cd:[0.9,1.6],dodge:0.45}};
var STAGE='alley',LEN4=800,PLANE_X=LEN4-132;
var JEFE_YMIN=YMIN+14; /* 7 ft: keep his head below the HUD / pause button */
var ATK={jab:{d:7,r:34,t:0.24,hit:0.07,kb:8},jab2:{d:7,r:34,t:0.24,hit:0.07,kb:8},hook:{d:13,r:38,t:0.36,hit:0.12,kb:0,down:1},
 kick:{d:13,r:42,t:0.5,hit:0.02,kb:0,down:1},
 fkick:{d:9,r:46,t:0.34,hit:0.12,kb:72,k:1},round:{d:11,r:46,t:0.4,hit:0.15,kb:20,k:1},heel:{d:15,r:48,t:0.5,hit:0.24,down:1,k:1},round2:{d:14,r:46,t:0.42,hit:0.15,down:1,k:1},
 rage:{d:8,r:74,t:0.95,hit:0.18,both:1,down:1,cost:12},cane:{d:15,r:48,t:0.34,hit:0.1,kb:0,down:1},
 knee:{d:6,r:30,t:0.22,hit:0.08,kb:0},throw:{d:16,r:30,t:0.45,hit:0.2,down:1}};
var WAVES=[{cam:170,list:['rafa','bruno']},{cam:560,list:['tito','rafa','bruno']},{cam:960,list:['bruno','tito','rafa','rafa','tito'],max:3}];
var BREAK=[{k:'bin',x:150,y:168,item:'empanada'},{k:'crate',x:345,y:196,item:'cane'},{k:'crate',x:690,y:170,item:'watch'},{k:'bin',x:880,y:200,item:'empanada'},{k:'crate',x:1150,y:176,item:'empanada'},{k:'bin',x:1290,y:200,item:'cane'}];
var CAR_X=LEN-128,CAR_Y=YMIN-3,RAGE_MAX=100,RAGE_HP=12;
var BREAK4=[{k:'crate',x:230,y:196,item:'empanada'},{k:'crate',x:420,y:166,item:'watch'}];

/* ---------- state ---------- */
var F=null,IN={mx:0,my:0},AUTO=false,W=400,SPEED=1;
function ent(type,x,y,face){var T=TYPES[type];return {type:type,x:x,y:y,z:0,vx:0,vz:0,face:face||-1,hp:T.hp,max:T.hp,st:'idle',t:0,flash:0,inv:0,cd:0.6+Math.random()*0.8,hits:0,atk:null,hitDone:false,blockN:0,id:Math.random()}}
function fresh(){return {stage:STAGE,waves:STAGE==='airfield'?[]:WAVES,duo:null,st:'intro',time:0,cam:0,lock:null,wave:-1,waveQ:[],waveMax:3,spawnT:0,player:null,enemies:[],items:[],breaks:[],fx:[],pops:[],score:0,lives:3,
 go:false,rage:0,slowT:0,shakeT:0,flashT:0,boss:null,bossHalf:false,held:false,story:[],car:{dmg:false,x:CAR_X,vx:0,gone:false,richieIn:false},ehud:null,holdT:0,
 stats:{dodges:0,tough:0,stomps:0,charges:0,flykicks:0,kos:0,hits:0,specials:0,kicks:0,rageHits:0,rageFree:0,throws:0,pickups:0,deaths:0,retries:0,blocks:0,hugs:0,trips:0}}}
function start(stage){STAGE=stage==='airfield'?'airfield':'alley';LEN=STAGE==='airfield'?LEN4:1600;F=fresh();F.player=ent('richie',-30,186,1);F.player.st='walkin';F.player.combo=0;F.player.comboT=0;F.player.weapon=0;F.player.mash=0;
 F.breaks=(STAGE==='airfield'?BREAK4:BREAK).map(function(b){return {k:b.k,x:b.x,y:b.y,item:b.item,hp:1,st:'ok',t:0}});F.time=0;F.cam=0}
function hold(h){if(!F)return;if(h){if(F.st!=='hold'){F.prev=F.st;F.st='hold'}}else if(F.st==='hold'){F.st=F.prev||'play'}}

/* ---------- input ---------- */
var Q=[];
function press(k){if(!F)return;if(F.player&&F.player.st==='held'){F.player.mash++;sfx('blip');return}Q.push(k)}
function move(x,y){IN.mx=Math.max(-1,Math.min(1,x||0));IN.my=Math.max(-1,Math.min(1,y||0))}
function setAuto(a){AUTO=!!a}

/* ---------- helpers ---------- */
function rnd(a,b){return a+Math.random()*(b-a)}
function clampLane(e){e.y=Math.max(YMIN,Math.min(YMAX,e.y))}
function alive(e){return e.st!=='dead'&&e.st!=='gone'}
function active(e){return alive(e)&&e.st!=='down'&&e.st!=='air'&&e.st!=='getup'}
function spark(x,y,big){F.fx.push({k:'spark',x:x,y:y,t:0,life:big?0.28:0.2,big:big})}
function dust(x,y){F.fx.push({k:'dust',x:x,y:y,t:0,life:0.45})}
function pop(x,y,txt,c){F.pops.push({x:x,y:y,txt:txt,c:c||'#fff',t:0})}
function addScore(n){F.score+=n}
function enemiesAlive(){return F.enemies.filter(alive).length}

/* ---------- player ---------- */
function startAtk(p,k){p.st='atk';p.atk=k;p.t=0;p.hitDone=false;p.hitList=[];p.r1=p.r2=false;if(ATK[k]&&ATK[k].k){F.stats.kicks++;sfx('kwhoosh')}else if(k==='rage'){sfx('rage')}else if(k!=='knee'&&k!=='throw')sfx('whiff')}
/* RICHIE RAGE: spinning tornado kick, 2 hits on everything around him, neon shockwave, shake, slow-mo flash */
function rageStart(p){var free=F.rage>=RAGE_MAX;if(free){F.rage=0;F.stats.rageFree++}else{var c=Math.min(RAGE_HP,Math.max(0,p.hp-1));p.hp-=c}
 startAtk(p,'rage');F.stats.specials++;F.flashT=0.2;F.slowT=0.3;F.shakeT=0.5;p.inv=Math.max(p.inv,1.0);pop(p.x,p.y-100,'RAGE!','#ff3ad8');emit('rage',{free:free})}
function rageHit(p,fin){var n=0;F.fx.push({k:'ring',x:p.x,y:p.y,t:0,life:fin?0.6:0.45,big:fin});F.shakeT=Math.max(F.shakeT,fin?0.45:0.25);sfx('rageHit',fin?1.4:1);
 F.enemies.forEach(function(e){if(!alive(e)||e.st==='down'||e.st==='air'||e.st==='getup'||e.st==='dead'||e.st==='enter')return;if(Math.abs(e.x-p.x)>ATK.rage.r||Math.abs(e.y-p.y)>24)return;
  n++;F.stats.rageHits++;damage(e,fin?14:8,p,fin);if(fin){var sd=e.x>=p.x?1:-1;e.vx=sd*230;e.vz=170;e.face=-sd}else if(e.st!=='air'){e.vx=(e.x>=p.x?1:-1)*60}});
 F.breaks.forEach(function(b){if(b.st!=='ok'||Math.abs(b.x-p.x)>ATK.rage.r+6||Math.abs(b.y-p.y)>26)return;b.st='broke';b.t=0;sfx('crash',0.5);addScore(100);F.items.push({k:b.item,x:b.x,y:b.y+2,t:0});dust(b.x,b.y);emit('break',b.item)});
 if(n)pop(p.x,p.y-80,n>1?n+' HIT RAGE!':'RAGE HIT!','#29d6ff');return n}
function gainRage(n){F.rage=Math.min(RAGE_MAX,F.rage+n)}
function playerUpdate(p,dt){
 var T=TYPES.richie,mx=IN.mx,my=IN.my;p.t+=dt;p.inv=Math.max(0,p.inv-dt);p.comboT=Math.max(0,p.comboT-dt);if(p.comboT<=0)p.combo=0;
 var k=Q.shift();Q.length=0;
 if(p.st==='held'){if(p.mash>=6||p.t>2.6){p.st='idle';p.t=0;p.inv=0.8;var hb=F.enemies.filter(function(e){return e.st==='hug'})[0];if(hb){hb.st='hurt';hb.t=0;hb.vx=-hb.face*60;hb.cd=1.6;pop(hb.x,hb.y-70,'ESCAPED!','#9ff')}sfx('thump',0.8)}return}
 if(p.st==='hurt'){if(p.t>0.32){p.st='idle';p.t=0}p.x+=p.vx*dt;p.vx*=0.85;return}
 if(p.st==='air'||p.st==='down'||p.st==='getup'){fall(p,dt);return}
 if(p.st==='grab'){var g=p.grab;if(!g||!alive(g)||g.st!=='grabbed'||p.t>1.6){p.st='idle';p.grab=null;if(g&&g.st==='grabbed'){g.st='idle';g.t=0}}else{
   g.x=p.x+p.face*22;g.y=p.y;g.face=-p.face;
   if(k==='atk'||k==='kick'||k==='special'||k==='jump'){p.knees=(p.knees||0)+1;if(p.knees>=3||k!=='atk'){doThrow(p,g)}else{startAtk(p,'knee');p.grabKeep=g}}}return}
 if(p.st==='atk'){var A=ATK[p.atk];
  if(p.atk==='kick'){p.z+=p.vz*dt;p.vz-=GRAV*dt;p.x+=p.vx*dt;if(p.z<=0){p.z=0;p.st='idle';p.t=0;dust(p.x,p.y)}}
  if(p.atk==='rage'){var pr=Math.min(1,p.t/A.t);p.z=Math.sin(pr*Math.PI)*16;p.inv=Math.max(p.inv,0.2);p.x+=p.face*20*dt;clampX(p);
   if(!p.r1&&p.t>=0.18){p.r1=true;rageHit(p,false)}if(!p.r2&&p.t>=0.52){p.r2=true;rageHit(p,true)}
   if(p.t>=A.t){p.z=0;p.st='idle';p.t=0;dust(p.x,p.y)}return}
  if(!p.hitDone&&p.t>=A.hit){if(p.atk!=='kick')p.hitDone=true;playerHit(p,A)}
  if(p.atk==='kick')p.hitDone=p.hitDone||false;
  if(p.atk==='spin'){p.inv=0.1}
  if(p.atk!=='kick'&&p.t>=A.t){if(p.grabKeep&&alive(p.grabKeep)&&p.grabKeep.st==='grabbed'){p.st='grab';p.grab=p.grabKeep;p.t=Math.min(p.t,0.5);p.grabKeep=null}else{p.st='idle';p.t=0;p.grabKeep=null}}
  if((k==='atk'||k==='kick')&&p.atk!=='kick'&&p.atk!=='knee'&&p.t>A.hit)p.buf=k;
  return}
 if(p.st==='jump'){p.z+=p.vz*dt;p.vz-=GRAV*dt;p.x+=p.vx*dt;if(k==='atk'||k==='kick'){startAtk(p,'kick');return}if(p.z<=0){p.z=0;p.st='idle';p.t=0;dust(p.x,p.y)}clampX(p);return}
 if(p.st==='walkin'){p.x+=50*dt;if(p.x>=60){p.st='idle';p.t=0}return}
 if(p.st==='auto'){return}
 /* idle / walk */
 if(p.buf){k=k||p.buf;p.buf=null}
 if(k==='jump'){p.st='jump';p.vz=210;p.vx=mx*T.spd;p.t=0;sfx('whiff');return}
 if(k==='special'){rageStart(p);return}
 if(k==='kick'){var kk;if(p.combo===2&&p.comboT>0){kk='round2';p.combo=0;p.kc=0}else{p.kc=(p.comboT>0&&p.kc?p.kc:0)+1;if(p.kc>3)p.kc=1;kk=p.kc===1?'fkick':p.kc===2?'round':'heel'}
  p.comboT=0.55;startAtk(p,kk);return}
 if(k==='atk'){
  if(p.weapon>0){startAtk(p,'cane');p.weapon--;if(p.weapon===0){pop(p.x,p.y-90,'CANE BROKE!','#ffd23a');sfx('clunk')}return}
  var near=grabTarget(p);if(near&&p.contact>0.18){near.st='grabbed';near.t=0;p.st='grab';p.grab=near;p.knees=0;p.t=0;sfx('thump',0.5);startAtk(p,'knee');p.grabKeep=near;return}
  p.kc=0;p.combo=(p.comboT>0?p.combo:0)+1;if(p.combo>3)p.combo=1;p.comboT=0.5;startAtk(p,p.combo===1?'jab':p.combo===2?'jab2':'hook');return}
 var spd=T.spd;p.x+=mx*spd*dt;p.y+=my*T.spdY*dt;clampLane(p);
 if(Math.abs(mx)>0.15)F.enemies.forEach(function(e){if(e.type==='jefe'||!active(e)||e.st==='enter'||Math.abs(e.y-p.y)>=7)return;var d=e.x-p.x;if(d*mx>0&&Math.abs(d)<16)p.x=e.x-Math.sign(mx)*16});clampX(p);
 if(Math.abs(mx)>0.15)p.face=mx>0?1:-1;
 p.st=(Math.abs(mx)>0.15||Math.abs(my)>0.15)?'walk':'idle';
 var gt=grabTarget(p);p.contact=gt&&Math.abs(mx)>0.3&&(gt.x-p.x)*mx>0?(p.contact||0)+dt:0;
 if(p.contact>0.25&&gt){gt.st='grabbed';gt.t=0;p.st='grab';p.grab=gt;p.knees=0;p.t=0;p.contact=0;sfx('thump',0.5);pop(p.x,p.y-92,'GRAB!','#9ff')}
 /* pickups */
 F.items.forEach(function(it){if(it.taken||Math.abs(it.x-p.x)>16||Math.abs(it.y-p.y)>10)return;
  if(it.k==='cane'&&p.weapon>0)return;it.taken=true;F.stats.pickups++;sfx('pickup');
  if(it.k==='empanada'){p.hp=Math.min(100,p.hp+40);pop(it.x,it.y-30,'+HEALTH','#3dff7a')}
  else if(it.k==='watch'){addScore(1000);pop(it.x,it.y-30,'+1000','#ffd23a')}
  else{p.weapon=8;pop(it.x,it.y-30,'CANE!','#ffd23a')}
  emit('pickup',it.k)});
}
function grabTarget(p){var b=null;F.enemies.forEach(function(e){if(e.type==='jefe'||e.type==='manny'||!active(e)||e.st==='hug'||e.st==='wind'||e.st==='atk')return;var dx=(e.x-p.x)*p.face;if(dx>8&&dx<26&&Math.abs(e.y-p.y)<7)b=e});return b}
function clampX(e){var lo=F.cam+12,hi=F.cam+W-12;if(F.st==='ending'||F.st==='drive')hi=LEN+200;if(F.st==='board')hi=LEN;e.x=Math.max(lo,Math.min(hi,e.x))}
function doThrow(p,g){startAtk(p,'throw');p.grabKeep=null;p.grab=null;F.stats.throws++;gainRage(10);
 g.st='air';g.t=0;g.thrown=true;g.face=-p.face;g.vx=p.face*170;g.vz=150;g.z=8;g.x=p.x+p.face*10;damage(g,ATK.throw.d,p,true);sfx('whiff');pop(p.x,p.y-95,'THROW!','#ff8af0')}
function playerHit(p,A){var any=false;
 F.enemies.forEach(function(e){if(!alive(e)||e.st==='down'||e.st==='air'||e.st==='getup'||e.st==='dead')return;if(e.inv>0)return;
  var dx=(e.x-p.x)*p.face,bigE=e.type==='jefe'?8:0;if(A.both)dx=Math.abs(e.x-p.x);if(dx<-6||dx>A.r+bigE||Math.abs(e.y-p.y)>12+bigE/2)return;if(p.atk==='knee'&&e!==p.grabKeep)return;
  if(p.atk==='kick'&&p.hitList&&p.hitList.indexOf(e)>=0)return;
  /* Aces slips punches: use kicks, throws or RICHIE RAGE on him */
  if(e.type==='aces'&&(e.st==='idle'||e.st==='walk')&&!A.k&&!A.both&&p.atk!=='kick'&&p.atk!=='throw'&&p.atk!=='knee'&&Math.random()<TYPES.aces.dodge){e.st='hop';e.t=0;e.vx=(e.x>=p.x?1:-1)*120;F.stats.dodges++;pop(e.x,e.y-92,'DODGE!','#ffb38a');sfx('whiff');any=true;return}
  /* Rafa blocks jabs from the front */
  if(e.type==='rafa'&&(e.st==='idle'||e.st==='walk'||e.st==='block')&&(p.atk==='jab'||p.atk==='jab2')&&e.face===-p.face&&(e.st==='block'||Math.random()<TYPES.rafa.block)){
   e.st='block';e.t=0;e.blockN++;F.stats.blocks++;spark(e.x-e.face*-10,e.y-60,false);sfx('block');pop(e.x,e.y-88,'BLOCK!','#cfe');if(e.blockN>=2){e.st='wind';e.atk='counter';e.t=0.15;e.blockN=0}any=true;return}
  any=true;gainRage(A.k||p.atk==='kick'?8:6);if(p.atk==='kick'){p.hitList=p.hitList||[];p.hitList.push(e)}
  var down=A.down||(e.type!=='jefe'&&e.hits>=(e.type==='manny'?4:3));damage(e,A.d,p,down);
  if(!down&&e.st!=='grabbed'){e.vx=p.face*(A.kb||8)*2.5}});
 F.breaks.forEach(function(b){if(b.st!=='ok')return;var dx=(b.x-p.x)*p.face;if(A.both)dx=Math.abs(b.x-p.x);if(dx<-6||dx>A.r+6||Math.abs(b.y-p.y)>14)return;
  b.st='broke';b.t=0;any=true;sfx('crash',0.5);addScore(100);F.items.push({k:b.item,x:b.x,y:b.y+2,t:0});dust(b.x,b.y);emit('break',b.item)});
 if(!any&&p.atk!=='kick'){} }
function damage(e,d,src,down){
 if((e.type==='jefe'||e.type==='manny')&&down&&e.hp-d>0&&Math.random()<(e.type==='manny'?0.4:0.5))down=false;
 e.hp=Math.max(0,e.hp-d);e.flash=0.14;e.hits++;F.stats.hits++;addScore(100);F.ehud={e:e,t:2.2};
 var big=down||d>=13;spark(e.x+(src.x<e.x?-8:8),e.y-(e.type==='jefe'?84:e.type==='manny'?74:66),big);sfx('punch',big?1.3:1);
 if(e.hp<=0)down=true;
 if(!down&&e.z>3)down=true; /* knocked out of a jump / flying kick */
 /* Big Manny shrugs off light hits while he winds up or charges */
 if(e.type==='manny'&&(e.st==='wind'||e.st==='atk')&&!down){F.stats.tough++;pop(e.x,e.y-104,'TOUGH!','#9fe8cc');return}
 if(e.st==='hug'&&F.player.st==='held'){F.player.st='idle';F.player.inv=0.8}
 if(down){e.st='air';e.t=0;e.vx=(e.x>=src.x?1:-1)*(e.thrown?170:110);e.vz=e.thrown?e.vz:130;e.z=Math.max(e.z,2);e.hits=0;e.face=e.x>=src.x?-1:1}
 else if(e.st==='grabbed'){e.t=Math.min(e.t,0.6)}else{e.st='hurt';e.t=0}
 if(e.type==='jefe'&&!F.bossHalf&&e.hp<=e.max/2&&e.hp>0){F.bossHalf=true;e.pendingWhistle=true}
}
function fall(e,dt){
 if(e.st==='air'){e.t+=dt;e.x+=e.vx*dt;e.z+=e.vz*dt;e.vz-=GRAV*dt;
  if(e.thrown&&e!==F.player)F.enemies.forEach(function(o){if(o!==e&&active(o)&&o.st!=='grabbed'&&Math.abs(o.x-e.x)<20&&Math.abs(o.y-e.y)<12){damage(o,8,e,true)}});
  if(e.z<=0){e.z=0;e.st='down';e.t=0;e.thrown=false;dust(e.x,e.y);sfx('thud');if(e!==F.player&&e.hp<=0){e.st='dead';e.t=0;F.stats.kos++;addScore(e.type==='jefe'?5000:(e.type==='manny'||e.type==='aces')?2000:500);sfx('ko');if(e.type==='jefe')bossDefeated(e);else if(F.duo&&F.duo.indexOf(e)>=0)duoKO(e)}}
  if(e!==F.player)e.x=Math.max(F.cam+6,Math.min(F.cam+W-6,e.x));else clampX(e);return}
 if(e.st==='down'){e.t+=dt;if(e.t>(e===F.player?0.9:0.8)){if(e===F.player&&e.hp<=0){playerDied();return}e.st='getup';e.t=0}return}
 if(e.st==='getup'){e.t+=dt;if(e.t>0.3){e.st='idle';e.t=0;e.inv=e===F.player?1.2:0.4;e.cd=Math.max(e.cd,0.6)}}
}
function playerDied(){var p=F.player;F.stats.deaths++;
 if(F.lives>0){F.lives--;p.hp=100;p.st='idle';p.inv=2.2;p.t=0;pop(p.x,p.y-95,'BACK UP!','#9ff');
  F.enemies.forEach(function(e){if(active(e)&&Math.abs(e.x-p.x)<70){damage(e,0,p,true)}});emit('life',F.lives)}
 else{p.st='down';p.t=-99;hold(true);emit('lose')}}
function retryWave(){var p=F.player;F.stats.retries++;F.lives=3;p.hp=100;p.st='idle';p.t=0;p.inv=2;p.z=0;
 F.enemies=F.enemies.filter(function(e){return false});
 if(F.duo){F.duo=null;F.lock=null;duoStart(true)}
 else if(F.boss){F.boss=null;F.bossHalf=false;F.wave=F.waves.length-1;F.lock=null;bossStart(true)}
 else if(F.wave>=0&&F.lock!=null){F.waveQ=F.waves[F.wave].list.slice();F.spawnT=0.5}
 F.st='play'}

/* ---------- enemies ---------- */
function spawn(type,side){var x=side>0?F.cam+W+24:F.cam-24,e=ent(type,x,rnd(YMIN+4,YMAX-4),side>0?-1:1);e.st='enter';F.enemies.push(e);return e}
function tokens(){return F.enemies.filter(function(e){return e.st==='wind'||e.st==='atk'||e.st==='hug'}).length}
function enemyUpdate(e,dt){var p=F.player,T=TYPES[e.type];e.t+=dt;e.flash=Math.max(0,e.flash-dt);e.inv=Math.max(0,e.inv-dt);
 if(e.st==='dead'){e.t+=0;if(e.t>1.5)e.st='gone';return}
 if(e.st==='air'||e.st==='down'||e.st==='getup'){fall(e,dt);return}
 if(e.st==='grabbed'){if(e.t>1.8){e.st='idle';e.t=0}return}
 if(e.st==='hurt'){e.x+=e.vx*dt;e.vx*=0.82;if(e.t>0.3){e.st='idle';e.t=0;e.cd=Math.max(e.cd,0.35)}return}
 if(e.st==='block'){if(e.t>0.5){e.st='idle';e.t=0}return}
 if(e.st==='hop'){e.x+=e.vx*dt;e.x=Math.max(F.cam+8,Math.min(F.cam+W-8,e.x));e.z=Math.sin(Math.min(1,e.t/0.32)*Math.PI)*10;if(e.t>0.32){e.z=0;e.st='idle';e.t=0;e.cd=Math.min(e.cd,0.4)}return}
 if(e.st==='whistle'){if(e.t>1.1){e.st='idle';e.t=0;e.cd=1}return}
 if(e.pendingWhistle&&(e.st==='idle'||e.st==='walk')){e.pendingWhistle=false;e.st='whistle';e.t=0;sfx('whistle');emit('whistle');F.story.push('whistle');
  setTimeout(function(){if(!F||!F.boss)return;spawn('bruno',1);spawn('rafa',-1)},700);return}
 var dx=p.x-e.x,dy=p.y-e.y,adx=Math.abs(dx);
 if(e.st==='hug'){if(p.st!=='held'){e.st='idle';e.t=0;e.cd=1.4;return}e.sq=(e.sq||0)+dt;if(e.sq>0.6){e.sq=0;p.hp=Math.max(0,p.hp-4);sfx('thud');p.flash=0.1;if(p.hp<=0){p.st='air';p.vx=-e.face*80;p.vz=120;p.z=2;e.st='idle';e.cd=2}}
  p.x=e.x+e.face*16;p.y=e.y;return}
 if(e.st==='wind'||e.st==='atk'){attackUpdate(e,dt,dx,dy);return}
 /* Level 4 duo: ranged openers (Manny's shoulder charge, Aces' flying kick) */
 if((e.type==='manny'||e.type==='aces')&&e.st!=='enter'&&e.cd<=0&&tokens()<2&&p.st!=='down'&&p.st!=='air'&&p.st!=='held'&&F.st==='play'&&Math.abs(dy)<8){var lo=e.type==='manny'?54:46,hi=e.type==='manny'?124:94;
  if(adx>lo&&adx<hi&&Math.random()<dt*(e.enraged?3.2:1.6)){e.st='wind';e.t=0;e.atk=e.type==='manny'?'charge':'flykick';e.hitDone=false;e.hit2=false;e.quaked=false;e.face=dx>0?1:-1;if(e.type==='manny'){F.stats.charges++;sfx('strain',0.7);pop(e.x,e.y-112,'!','#ff5a5a')}else{F.stats.flykicks++;sfx('whiff')}return}}
 if(e.st==='enter'){e.x+=e.face*T.spd*1.2*dt;if(e.x>F.cam+16&&e.x<F.cam+W-16){e.st='idle';e.t=0}return}
 /* approach / circle */
 e.cd-=dt;if(adx>4)e.face=dx>0?1:-1;
 var maxTok=F.wave===0?1:2,want=e.cd<=0&&tokens()<maxTok&&p.st!=='down'&&p.st!=='air'&&p.st!=='held',side=e.x<p.x?-1:1;
 var tx=p.x+side*(want?T.reach-6:58+((e.id*40)|0)),ty=p.y+(want?0:(e.id-0.5)*30);
 var mx=tx-e.x,my=ty-e.y,sp=T.spd*(want?1:0.7)*(e.enraged?1.3:1);
 if(!want&&adx<70&&Math.abs(dy)<26){mx=0;my=Math.abs(dy)>14?my:0}
 if(Math.abs(mx)>3||Math.abs(my)>2){e.x+=Math.sign(mx)*Math.min(Math.abs(mx),sp*dt);e.y+=Math.sign(my)*Math.min(Math.abs(my),sp*0.7*dt);e.st='walk'}else e.st='idle';
 clampLane(e);if(e.type==='jefe')e.y=Math.max(JEFE_YMIN,e.y);e.x=Math.max(F.cam-30,Math.min(F.cam+W+30,e.x));
 if(want&&adx<T.reach+4&&Math.abs(dy)<8){e.st='wind';e.t=0;e.atk=e.type==='jefe'?(Math.random()<0.55?'hook':'twirl'):e.type==='rafa'?'punch':e.type==='bruno'?'hug':e.type==='manny'?'stomp':e.type==='aces'?'jab2':'slam';e.hitDone=false;e.hit2=false;e.quaked=false;if(e.atk==='stomp')F.stats.stomps++;e.face=dx>0?1:-1;if(e.type==='tito')sfx('strain',0.6)}
}
var EATK={punch:{w:0.28,a:0.22,d:8,r:34},counter:{w:0.12,a:0.22,d:9,r:36},hug:{w:0.45,a:0.3,d:0,r:30},slam:{w:0.62,a:0.38,d:14,r:38,down:1},hook:{w:0.38,a:0.3,d:9,r:56,trip:1},twirl:{w:0.3,a:0.7,d:11,r:54,down:1},
 charge:{w:0.5,a:0.62,d:12,r:30,down:1,rush:175},stomp:{w:0.55,a:0.5,d:10,r:50,down:1,quake:1},jab2:{w:0.16,a:0.4,d:5,r:32,two:1},flykick:{w:0.22,a:0.55,d:11,r:30,down:1,leap:165}};
function attackUpdate(e,dt,dx,dy){var A=EATK[e.atk],p=F.player,T=TYPES[e.type];
 if(e.st==='wind'){if(e.atk==='hug')e.x+=e.face*30*dt;if(e.t>=A.w){e.st='atk';e.t=0;sfx(e.atk==='twirl'?'spin':'whiff')}return}
 if(A.rush||A.leap){e.x+=e.face*(A.rush||A.leap)*dt;e.x=Math.max(F.cam+8,Math.min(F.cam+W-8,e.x));if(A.leap)e.z=Math.sin(Math.min(1,e.t/A.a)*Math.PI)*22;if(A.rush&&Math.random()<dt*14)dust(e.x-e.face*12,e.y)}
 if(A.quake){if(!e.quaked&&e.t>=0.05){e.quaked=true;e.hitDone=true;F.fx.push({k:'ring',x:e.x,y:e.y,t:0,life:0.5,big:false});F.shakeT=Math.max(F.shakeT,0.35);sfx('thud');dust(e.x-14,e.y);dust(e.x+14,e.y);
   if(Math.abs(p.x-e.x)<A.r&&Math.abs(p.y-e.y)<16&&p.z<4&&p.inv<=0&&p.st!=='down'&&p.st!=='air'&&p.st!=='getup'&&p.st!=='held')hurtPlayer(p,A.d,e,true)}
  if(e.t>=A.a){e.st='idle';e.t=0;e.cd=rnd(T.cd[0],T.cd[1])*(e.enraged?0.6:1)}return}
 if(A.two&&e.hitDone&&!e.hit2&&e.t>=0.2){e.hit2=true;e.hitDone=false}
 if(!e.hitDone&&e.t>=0.05){var hdx=(p.x-e.x)*e.face;
  if(hdx>-4&&hdx<A.r&&Math.abs(p.y-e.y)<10&&p.z<24&&p.inv<=0&&(p.st!=='down'&&p.st!=='air'&&p.st!=='getup'&&p.st!=='held')){e.hitDone=true;
   if(e.atk==='hug'){p.st='held';p.t=0;p.mash=0;e.st='hug';e.t=0;e.sq=0;F.stats.hugs++;pop(p.x,p.y-95,'MASH TO ESCAPE!','#ffd23a');emit('hug');sfx('thump',0.6);return}
   hurtPlayer(p,A.d,e,A.down||A.trip);if(A.trip){F.stats.trips++;pop(p.x,p.y-90,'TRIPPED!','#d9b3ff');e.atk='twirl';e.st='atk';e.t=0;e.hitDone=true;e.twirlFollow=true;sfx('spin')}}
  if(e.atk==='twirl'&&e.t>0.35)e.hitDone=e.hitDone||false}
 if(e.atk==='twirl'&&e.twirlFollow&&e.t>0.4&&!e.follow2){e.follow2=true;if(p.st==='down'&&Math.abs(p.x-e.x)<58){p.hp=Math.max(1,p.hp-6);p.flash=0.12;spark(p.x,p.y-20,false);sfx('punch',0.8)}}
 if(e.t>=A.a){e.st='idle';e.t=0;e.z=0;e.twirlFollow=false;e.follow2=false;e.cd=rnd(T.cd[0],T.cd[1])*(e.enraged?0.6:1)}
}
function hurtPlayer(p,d,src,down){if(p.inv>0)return;p.hp=Math.max(0,p.hp-d);p.flash=0.16;spark(p.x+(src.x<p.x?-6:6),p.y-66,down);sfx('punch',down?1.2:0.9);p.combo=0;p.grab=null;
 if(down||p.hp<=0){p.st='air';p.t=0;p.vx=(p.x>=src.x?1:-1)*90;p.vz=120;p.z=2;p.face=p.x>=src.x?-1:1}else{p.st='hurt';p.t=0;p.vx=(p.x>=src.x?1:-1)*50}
 emit('hurt',p.hp)}

/* ---------- flow ---------- */
function waveTick(dt){var p=F.player;
 if(F.lock==null){
  var tgt=Math.max(F.cam,Math.min(LEN-W,p.x-W*0.42));F.cam+=(tgt-F.cam)*Math.min(1,dt*6);if(Math.abs(tgt-F.cam)<0.5)F.cam=tgt;
  var nw=F.wave+1;
  if(nw<F.waves.length&&F.cam>=Math.min(F.waves[nw].cam,LEN-W-60)){F.wave=nw;F.lock=F.cam;F.waveQ=F.waves[nw].list.slice();F.waveMax=F.waves[nw].max||3;F.spawnT=0.2;F.go=false;emit('wave',nw+1);F.story.push('wave'+(nw+1))}
  else if(nw>=F.waves.length&&!F.boss&&!F.duo&&F.cam>=LEN-W-0.5){if(F.stage==='airfield')duoStart(false);else bossStart(false)}
 }else{
  F.spawnT-=dt;var onScr=F.enemies.filter(alive).length;
  if(F.waveQ.length&&F.spawnT<=0&&onScr<F.waveMax){var t=F.waveQ.shift();spawn(t,(F.waveQ.length%2)?-1:1);F.spawnT=1.3}
  if(!F.waveQ.length&&!F.boss&&!F.duo&&onScr===0){F.lock=null;F.go=true;F.goT=0;F.goCam=F.cam;emit('clear',F.wave+1);F.story.push('clear'+(F.wave+1));sfx('chime')}
 }
 if(F.go){F.goT+=dt;if(F.goT>4||(F.goT>1.5&&F.cam>F.goCam+80))F.go=false}
}
function bossStart(retry){F.lock=LEN-W;F.cam=LEN-W;var b=ent('jefe',F.cam+W+20,180,-1);b.st='enter';F.enemies.push(b);F.boss=b;F.story.push(retry?'boss-retry':'boss');
 if(!retry){hold(true);setTimeout(function(){if(F&&F.boss===b)emit('boss')},900);b.introWalk=true}}
/* Level 4: Big Manny + Aces walk out of the hangar together */
function duoStart(retry){F.lock=LEN-W;F.cam=LEN-W;F.go=false;var a=ent('aces',F.cam+W+18,176,-1),m=ent('manny',F.cam+W+44,200,-1);
 [a,m].forEach(function(e){e.st='enter';e.cd=1.0+Math.random()*0.8});F.enemies.push(a,m);F.duo=[a,m];F.story.push(retry?'duo-retry':'duo');
 if(!retry){a.introWalk=m.introWalk=true;hold(true);setTimeout(function(){if(F&&F.duo&&F.duo[0]===a)emit('duo')},900)}}
function duoKO(e){F.story.push('ko-'+e.type);var left=F.duo.filter(function(o){return o.hp>0});
 if(left.length){var o=left[0];o.enraged=true;o.cd=Math.min(o.cd,0.6);pop(o.x,o.y-104,'ENRAGED!','#ff5a5a');emit('duoOne',{down:e.type,left:o.type})}
 else{F.story.push('duoDown');F.st='bossdown';F.bdT=0;F.player.st='idle';emit('duoDown')}}
/* after the duo: Richie walks to the plane's stairs and climbs aboard */
function board(){F.st='board';F.story.push('board');var p=F.player;p.st='auto';p.t=0;p.z=0;F.boarding=false;F.boardT=0;p.boardA=1}
function bossDefeated(b){F.story.push('bossDown');F.enemies.forEach(function(e){if(e!==b&&alive(e)){e.hp=0;damage(e,0,F.player,true)}});
 F.car.dmg=true;F.st='bossdown';F.bdT=0;F.player.st='idle';emit('bossDown')}
function cutscene(){F.st='cut';F.story.push('cutscene');F.player.st='idle'}
function cutDone(){F.story.push('cutDone');F.st='done';return summary()}
function ending(){F.st='ending';F.story.push('walk');var p=F.player;p.st='auto';p.t=0;F.endT=0}
function driveOff(){F.st='drive';F.story.push('drive');F.player.st='incar';F.car.richieIn=true;F.car.vx=0;F.driveT=0;sfx('clunk');emit('drive')}

/* ---------- auto fight ---------- */
function autoTick(dt){var p=F.player;if(!p||F.st!=='play')return;
 if(p.st==='held'){if(Math.random()<dt*14)press('atk');move(0,0);return}
 if(p.st!=='idle'&&p.st!=='walk'){move(0,0);return}
 var tx=null,ty=null,act=null,es=F.enemies.filter(function(e){return active(e)&&e.st!=='enter'||e.st==='enter'&&e.x>F.cam&&e.x<F.cam+W});
 var food=F.items.filter(function(i){return !i.taken&&(i.k==='empanada'&&p.hp<75||i.k==='watch'||i.k==='cane'&&!p.weapon)&&i.x>F.cam&&i.x<F.cam+W})[0];
 var br=F.breaks.filter(function(b){return b.st==='ok'&&b.x>F.cam-10&&b.x<F.cam+W+10})[0];
 if(food&&(p.hp<45||!es.length||Math.abs(food.x-p.x)<50)){tx=food.x;ty=food.y}
 else if(es.length){es.sort(function(a,b){return Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*2-Math.abs(b.x-p.x)-Math.abs(b.y-p.y)*2});var e=es[0],side=e.x>p.x?-1:1;
  var close=es.filter(function(o){return Math.abs(o.x-p.x)<40&&Math.abs(o.y-p.y)<12}).length;
  /* Level 4: sidestep Manny's charge / Aces' flying kick, jump Manny's stomp */
  var lunge=es.filter(function(o){return o.st==='wind'&&(o.atk==='charge'||o.atk==='flykick')&&Math.abs(o.y-p.y)<12&&Math.abs(o.x-p.x)<140})[0];if(lunge&&Math.random()<dt*9){move(0,(p.y<(YMIN+YMAX)/2?1:-1));return}
  var qk=es.filter(function(o){return o.atk==='stomp'&&o.st==='wind'&&o.t>0.2&&Math.abs(o.x-p.x)<62&&Math.abs(o.y-p.y)<18})[0];if(qk&&Math.random()<dt*12){press('jump');return}
  if(F.rage>=RAGE_MAX&&(close>=2||close>=1&&(e.type==='jefe'||F.duo||p.hp<40))&&Math.random()<dt*6){press('special');return}
  if(close>=3&&p.hp>60&&Math.random()<dt*1.5){press('special');return}
  var danger=(e.st==='wind'||e.st==='atk')&&Math.abs(e.y-p.y)<10&&Math.abs(e.x-p.x)<42;
  if(danger&&e.type!=='rafa'&&Math.random()<dt*6){move(0,(p.y<(YMIN+YMAX)/2?1:-1));return}
  var hx=(e.x-p.x)*(e.x>p.x?1:-1);if(hx>6&&hx<30&&Math.abs(e.y-p.y)<7&&e.st!=='enter'){p.face=e.x>p.x?1:-1;if(e.type==='rafa'&&e.st==='block'){if(Math.random()<dt*6)press('kick')}else if(Math.random()<dt*9)press(e.type==='rafa'||e.type==='aces'||p.combo===2&&p.comboT>0&&Math.random()<0.6?'kick':'atk');move(0,0);return}
  tx=e.x+side*24;ty=e.y;if(Math.abs(p.x-tx)<8&&Math.abs(p.y-ty)<4){p.face=e.x>p.x?1:-1;if(e.type==='rafa'&&e.st==='block'){if(Math.random()<dt*6)press('kick')}else if(Math.random()<dt*9)press(e.type==='rafa'||e.type==='aces'||p.combo===2&&p.comboT>0&&Math.random()<0.6?'kick':'atk');move(0,0);return}}
 else if(br){tx=br.x-22;ty=br.y;if(Math.abs(p.x-tx)<6&&Math.abs(p.y-ty)<4){p.face=1;press('atk');move(0,0);return}}
 else if(F.lock==null){tx=p.x+60;ty=(YMIN+YMAX)/2}
 if(tx==null){move(0,0);return}
 var mx=tx-p.x,my=ty-p.y;move(Math.abs(mx)>3?Math.sign(mx)*Math.min(1,Math.abs(mx)/20+0.3):0,Math.abs(my)>2?Math.sign(my)*Math.min(1,Math.abs(my)/10+0.3):0);
 if(p.jumpT)p.jumpT-=dt;
}

/* ---------- update ---------- */
var rain=[];for(var i=0;i<70;i++)rain.push({x:Math.random()*520,y:Math.random()*225,s:180+Math.random()*120});
function update(dt){if(!F)return;var sc=1;if(F.slowT>0){F.slowT-=dt;sc=0.3}F.shakeT=Math.max(0,F.shakeT-dt);F.flashT=Math.max(0,F.flashT-dt);for(var i=0;i<SPEED;i++)step(dt*sc)}
function step(dt){F.time+=dt;
 rain.forEach(function(r){r.y+=r.s*dt;r.x-=r.s*0.18*dt;if(r.y>H){r.y=-10;r.x=Math.random()*(W+60)}});
 F.fx=F.fx.filter(function(f){f.t+=dt;return f.t<f.life});F.pops=F.pops.filter(function(f){f.t+=dt;return f.t<0.9});
 F.breaks.forEach(function(b){if(b.st==='broke'){b.t+=dt;if(b.t>1.2)b.st='gone'}});
 if(F.ehud){F.ehud.t-=dt;if(F.ehud.t<=0)F.ehud=null}
 var p=F.player;p.flash=Math.max(0,(p.flash||0)-dt);
 if(F.st==='hold'){if(F.boss&&F.boss.introWalk){var b=F.boss;b.x-=40*dt;b.st='walk';b.t+=dt;if(b.x<=F.cam+W-70){b.x=F.cam+W-70;b.st='idle';b.introWalk=false}}
  if(F.duo)F.duo.forEach(function(e,i){if(!e.introWalk)return;var stop=F.cam+W-(i?84:132);e.x-=46*dt;e.st='walk';e.t+=dt;if(e.x<=stop){e.x=stop;e.st='idle';e.introWalk=false}});return}
 if(F.st==='intro'){playerUpdate(p,dt);if(p.st!=='walkin'){F.st='ready'}return}
 if(F.st==='ready')return;
 if(F.st==='bossdown'){F.bdT+=dt;F.enemies.forEach(function(e){enemyUpdate(e,dt)});F.enemies=F.enemies.filter(function(e){return e.st!=='gone'});if(p.st==='air'||p.st==='down'||p.st==='getup')fall(p,dt);return}
 if(F.st==='ending'){F.endT+=dt;var tx=F.car.x-150,ty=YMIN+6;var mx=tx-p.x,my=ty-p.y;
  if(Math.abs(mx)>2||Math.abs(my)>2){p.x+=Math.sign(mx)*Math.min(Math.abs(mx),48*dt);p.y+=Math.sign(my)*Math.min(Math.abs(my),30*dt);p.face=mx>=0?1:-1;p.walkT=(p.walkT||0)+dt}
  else if(!F.seen){F.seen=true;p.face=1;F.story.push('damage');sfx('warn');pop(p.x,p.y-96,'!?','#ffd23a');F.seenT=0}
  if(F.seen){F.seenT+=dt;if(F.seenT>1.1&&!F.seenEmitted){F.seenEmitted=true;emit('carSeen')}}
  F.enemies.forEach(function(e){enemyUpdate(e,dt)});F.enemies=F.enemies.filter(function(e){return e.st!=='gone'});return}
 if(F.st==='drive'){F.driveT+=dt;if(F.driveT>0.6){F.car.vx=Math.min(260,F.car.vx+220*dt);F.car.x+=F.car.vx*dt;if(Math.random()<dt*20)dust(F.car.x-110,CAR_Y)}
  if(F.car.x-110>F.cam+W+10&&!F.car.gone){F.car.gone=true;F.story.push('gone');emit('finish',summary())}return}
 if(F.st==='board'){F.endT+=dt;var bx=PLANE_X-F.cam>W-14?F.cam+W-14:PLANE_X,by=YMIN+2,bmx=bx-p.x,bmy=by-p.y;
  if(!F.boarding){if(Math.abs(bmx)>2||Math.abs(bmy)>2){p.x+=Math.sign(bmx)*Math.min(Math.abs(bmx),52*dt);p.y+=Math.sign(bmy)*Math.min(Math.abs(bmy),34*dt);p.face=bmx>=0?1:-1}else{F.boarding=true;F.boardT=0;p.face=1;F.story.push('stairs');sfx('clunk')}}
  else{F.boardT+=dt;p.y-=26*dt;p.boardA=Math.max(0,1-F.boardT/0.9);if(F.boardT>1.0&&!F.boarded){F.boarded=true;F.st='boarded';F.story.push('boarded');emit('boarded',summary())}}
  F.enemies.forEach(function(e){enemyUpdate(e,dt)});F.enemies=F.enemies.filter(function(e){return e.st!=='gone'});return}
 if(F.st!=='play')return;
 if(AUTO)autoTick(dt);
 playerUpdate(p,dt);
 F.enemies.forEach(function(e){enemyUpdate(e,dt)});F.enemies=F.enemies.filter(function(e){return e.st!=='gone'});
 waveTick(dt);
}
function summary(){return {score:F.score,time:F.time,kos:F.stats.kos,lives:F.lives,stats:F.stats}}
function go(){if(F&&(F.st==='ready'||F.st==='intro')){F.st='play';F.player.st='idle';if(F.stage==='airfield'){F.go=true;F.goT=0;F.goCam=F.cam}}}

/* ---------- render ---------- */
var BGC={};
function bgPanel(k){if(BGC[k])return BGC[k];var c=document.createElement('canvas');c.width=800;c.height=450;var g=c.getContext('2d');g.scale(2,2);
 var sk=g.createLinearGradient(0,0,0,150);sk.addColorStop(0,'#0a0618');sk.addColorStop(1,'#2a0f3e');g.fillStyle=sk;g.fillRect(0,0,400,150);
 for(var i=0;i<14;i++){g.fillStyle='#160a28';var bw=20+(i*37)%30,bh=40+(i*53)%60;g.fillRect(i*30,140-bh,bw,bh);g.fillStyle='rgba(255,210,120,.5)';for(var j=0;j<4;j++)g.fillRect(i*30+4+(j%2)*8,140-bh+6+j*9,3,3)}
 var cols=k==='a'?['#c9709c','#3f8c8c']:['#3f8c8c','#a95c8c'];
 g.fillStyle=cols[0];g.fillRect(0,30,150,115);g.fillStyle=cols[1];g.fillRect(250,20,150,125);
 g.fillStyle='#ff3ad8';g.fillRect(0,70,150,3);g.fillStyle='#29d6ff';g.fillRect(250,60,150,3);
 g.fillStyle='#24142e';[[20,90],[70,90],[270,80],[330,80]].forEach(function(w){g.fillRect(w[0],w[1],30,24)});g.fillStyle='#2b1d3a';g.fillRect(180,60,40,85);
 var fl=g.createLinearGradient(0,142,0,225);fl.addColorStop(0,'#2a1a32');fl.addColorStop(1,'#0c0814');g.fillStyle=fl;g.fillRect(0,142,400,83);
 g.fillStyle='#4a3040';g.fillRect(0,142,400,4);
 for(i=0;i<9;i++){g.fillStyle=i%2?'rgba(255,58,216,.22)':'rgba(41,214,255,.2)';g.fillRect(20+i*45,160+(i*17)%50,22,3)}
 BGC[k]=c;return c}
/* canvas fallback for the airfield (panel a: open tarmac + city, panel b: neon hangar with the plane) */
function bgPanel4(k){var key='4'+k;if(BGC[key])return BGC[key];var c=document.createElement('canvas');c.width=800;c.height=450;var g=c.getContext('2d');g.scale(2,2);
 var sk=g.createLinearGradient(0,0,0,140);sk.addColorStop(0,'#060418');sk.addColorStop(1,'#1c0c34');g.fillStyle=sk;g.fillRect(0,0,400,145);
 for(var i=0;i<16;i++){var bw=14+(i*29)%22,bh=20+(i*41)%40;g.fillStyle='#120a24';g.fillRect(i*26,128-bh,bw,bh);g.fillStyle='rgba(255,210,120,.45)';g.fillRect(i*26+4,128-bh+5,2,2)}
 var fl=g.createLinearGradient(0,128,0,225);fl.addColorStop(0,'#241a30');fl.addColorStop(1,'#0a0712');g.fillStyle=fl;g.fillRect(0,128,400,97);
 g.fillStyle='#d9a431';for(i=0;i<6;i++)g.fillRect(-40+i*90,200-i*8,60,3);
 if(k==='b'){g.fillStyle='#2a2036';g.fillRect(200,40,200,100);g.fillStyle='#ffcf8a';g.fillRect(226,62,160,78);g.fillStyle='#ff3ad8';g.fillRect(200,38,200,3);g.fillStyle='#29d6ff';g.fillRect(222,58,168,2);
  g.fillStyle='#f2f2f6';g.beginPath();g.ellipse(300,112,70,10,0,0,Math.PI*2);g.fill();g.fillRect(250,100,110,4);g.fillStyle='#2c5bd6';g.fillRect(240,113,110,2);g.fillStyle='#333';g.fillRect(268,112,4,22);g.fillRect(266,132,16,3)}
 BGC[key]=c;return c}
function img(k){return SPR[k]}
function white(k){if(WHITE[k])return WHITE[k];var im=SPR[k];if(!im)return null;var c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;var g=c.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);WHITE[k]=c;return c}
function drawSpr(g,k,x,y,flip,flash,alpha){var im=img(k);if(!im)return false;var m=META[k]||[im.naturalWidth,im.naturalHeight,im.naturalWidth/2],w=im.naturalWidth/2,h=im.naturalHeight/2,ax=m[2]/2;
 g.save();if(alpha!=null)g.globalAlpha=alpha;g.translate(Math.round(x),Math.round(y));if(flip)g.scale(-1,1);g.drawImage(im,-ax,-h,w,h);if(flash){var wc=white(k);if(wc){g.globalAlpha=Math.min(1,flash*7)*(alpha==null?1:alpha);g.drawImage(wc,-ax,-h,w,h)}}g.restore();return true}
function frameOf(e){var t=e.type,s=e.st;
 if(t==='richie'){if(s==='walk'||s==='walkin'||(s==='auto'&&F.st==='ending'&&!F.seen)||(s==='auto'&&F.st==='board'))return 'l3-r-walk-'+(Math.floor(F.time*8)%4);
  if(s==='atk'){var a=e.atk;return a==='jab'||a==='jab2'?'l3-r-jab':a==='hook'||a==='cane'?'l3-r-hook':a==='kick'?(SPR['l3-r-jkick']?'l3-r-jkick':'l3-r-kick'):a==='fkick'?(e.t<0.08?'l3-r-chamber':'l3-r-fkick'):a==='round'||a==='round2'?(e.t<0.07?'l3-r-chamber':'l3-r-round'):a==='heel'?(e.t<0.12?'l3-r-round':'l3-r-heel'):a==='rage'?(e.t<0.14?'l3-r-chamber':['l3-r-round','l3-r-heel','l3-r-spin','l3-r-jkick'][Math.floor(e.t*16)%4]):a==='spin'?'l3-r-spin':a==='knee'?'l3-r-grab':a==='throw'?'l3-r-throw':'l3-r-guard'}
  if(s==='jump')return 'l3-r-jump';if(s==='grab')return 'l3-r-grab';if(s==='hurt'||s==='held')return 'l3-r-hurt';if(s==='air')return e.vz>0?'l3-r-hurt':'l3-r-down';if(s==='down')return 'l3-r-down';if(s==='getup')return 'l3-r-jump';return 'l3-r-guard'}
 var pre=(t==='manny'||t==='aces'?'l4-':'l3-')+t+'-';
 if(s==='air')return pre+(e.vz>40?'hurt':'down');if(s==='down'||s==='dead')return pre+'down';if(s==='getup')return pre+'hurt';if(s==='hurt'||s==='grabbed')return t==='jefe'?pre+'idle':pre+'hurt';
 if(s==='walk'||s==='enter')return pre+(Math.floor(F.time*5+e.id*4)%2?'walk':'idle');
 if(t==='jefe'){if(s==='whistle')return pre+'whistle';if(s==='wind'||s==='atk')return pre+(e.atk==='hook'&&!(s==='atk'&&e.twirlFollow)?'hook':'twirl');return pre+'idle'}
 if(t==='bruno'&&(s==='wind'||s==='atk'||s==='hug'))return pre+'hug';
 if(t==='manny'&&(s==='wind'||s==='atk'))return pre+(e.atk==='stomp'&&s==='wind'?'stomp':'charge');
 if(t==='aces'){if(s==='hop')return pre+'walk';if(s==='wind'||s==='atk')return pre+(s==='wind'?'idle':e.atk==='flykick'?'fly':'jab')}
 if(t==='tito'&&(s==='wind'||s==='atk'))return pre+(s==='wind'?'up':'slam');
 if(t==='rafa'){if(s==='block')return pre+'block';if(s==='wind'||s==='atk')return pre+(s==='wind'&&e.atk!=='counter'?'block':'punch')}
 return pre+'idle'}
/* canvas fallback figure */
var COL={richie:{skin:'#c98a5a',top:'#f4f4f4',leg:'#1c1c24',hair:'#a8a8b0',h:86},bruno:{skin:'#b8784a',top:'#e8dcc0',leg:'#e0d2b4',hair:'#1a1410',h:90,wide:1.25},tito:{skin:'#b07448',top:'#e8dcc0',leg:'#e0d2b4',hair:'#2a2420',h:91},
 rafa:{skin:'#b87a4c',top:'#e8dcc0',leg:'#e0d2b4',hair:'#141010',h:88},jefe:{skin:'#c99070',top:'#b593d9',leg:'#a983cf',hair:'#d8d8de',h:119},
 manny:{skin:'#a86a40',top:'#8fe0bf',leg:'#7fd3b0',hair:'#a86a40',h:100,wide:1.4},aces:{skin:'#c08050',top:'#f6b48f',leg:'#efa684',hair:'#7a3a1a',h:88}};
function drawFig(g,e,x,y,flip,flash,alpha){var c=COL[e.type],s=e.st,h=c.h,w=(c.wide||1)*h*0.26;g.save();g.translate(Math.round(x),Math.round(y));if(flip)g.scale(-1,1);if(alpha!=null)g.globalAlpha=alpha;
 var base=e.type==='richie'?1:-1;g.scale(base,1);var fl=flash>0,F2=function(col){return fl?'#fff':col};
 if(s==='down'||s==='dead'||(s==='air'&&e.vz<=40)){g.fillStyle=F2(c.leg);g.fillRect(-h*0.5,-w*0.5,h*0.45,w*0.5);g.fillStyle=F2(c.top);g.fillRect(-h*0.05,-w*0.6,h*0.38,w*0.6);g.fillStyle=F2(c.skin);g.fillRect(h*0.33,-w*0.55,w*0.5,w*0.5);g.restore();return}
 var lean=(s==='hurt'||s==='held'||s==='air')?-6:0,legH=h*0.45,bodyH=h*0.36,head=h*0.17;
 var stride=(s==='walk'||s==='walkin'||s==='enter'||s==='auto')?Math.sin(F.time*14)*w*0.4:0;
 g.fillStyle=F2(c.leg);g.fillRect(-w*0.45+stride,-legH,w*0.4,legH);g.fillRect(w*0.05-stride,-legH,w*0.4,legH);
 if(s==='atk'&&(e.atk==='kick'||e.atk==='fkick')){g.fillRect(0,-legH,legH*1.15,w*0.38)}
 else if(s==='atk'&&(e.atk==='round'||e.atk==='round2'||e.atk==='heel')){g.fillRect(0,-legH-bodyH*0.55,legH*1.1,w*0.38)}
 else if(s==='atk'&&e.atk==='rage'){g.fillRect(-legH*0.9,-legH-bodyH*0.3,legH*1.8,w*0.36)}
 g.translate(lean,0);g.fillStyle=F2(c.top);g.fillRect(-w*0.5,-legH-bodyH,w,bodyH);
 g.fillStyle=F2(c.skin);g.fillRect(-head*0.5,-legH-bodyH-head,head,head);g.fillStyle=F2(c.hair);g.fillRect(-head*0.5,-legH-bodyH-head,head,head*0.32);
 var ext=(s==='atk'||(s==='wind'&&e.type!=='tito'))?h*0.32:h*0.14,armY=-legH-bodyH*0.8;g.fillStyle=F2(e.type==='richie'?c.skin:c.top);
 if(s==='wind'&&e.type==='tito'){g.fillRect(-w*0.2,armY-h*0.3,w*0.4,h*0.3)}else{g.fillRect(w*0.3,armY,ext,w*0.3);g.fillStyle=F2(c.skin);g.fillRect(w*0.3+ext-4,armY-1,6,w*0.32)}
 if(e.type==='jefe'){g.fillStyle='#111';g.fillRect(w*0.55,-legH,2,legH);g.fillStyle='#ffd23a';g.fillRect(w*0.45,-legH-3,6,3)}
 g.restore()}
function drawEnt(g,e,cx){var x=e.x-cx,y=e.y-e.z,flip;
 if(x<-120||x>W+120)return;
 if(e.st==='incar')return;
 /* shadow */
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(e.x-cx,e.y,e.type==='jefe'?24:e.type==='manny'?22:18,e.type==='jefe'||e.type==='manny'?5:4,0,0,Math.PI*2);g.fill();
 var alpha=e===F.player&&F.boarding?e.boardA:e.st==='dead'&&e.t>0.6?(Math.floor(e.t*14)%2?0.15:1):(e.inv>0&&e===F.player&&Math.floor(F.time*16)%2?0.45:null);
 var k=frameOf(e),base=e.type==='richie'?1:-1;flip=e.face!==base;
 if(e.type==='richie'&&e.st==='atk'&&(e.atk==='spin'||e.atk==='rage'&&e.t>=0.14))flip=Math.floor(e.t*16)%2?!flip:flip;
 if(e.type==='richie'&&e.st==='atk'&&e.atk==='heel'&&e.t<0.12)flip=!flip;
 if(e.type==='richie'&&e.st==='atk'&&e.atk==='rage'){g.save();g.globalCompositeOperation='lighter';var ag=Math.min(1,e.t*5)*(1-e.t/1.0);g.fillStyle='rgba(255,58,216,'+(0.22*ag)+')';g.beginPath();g.ellipse(x,y-44,34,52,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(41,214,255,'+(0.16*ag)+')';g.beginPath();g.ellipse(x,y-44,22,40,0,0,Math.PI*2);g.fill();g.restore()}
 var shake=e.st==='hurt'||e.st==='held'?Math.sin(F.time*80)*1.5:0;
 if(!(spriteMode()&&drawSpr(g,k,x+shake,y,flip,e.flash,alpha)))drawFig(g,e,x+shake,y,flip,e.flash,alpha);
 if(e===F.player&&e.weapon>0&&(e.st==='idle'||e.st==='walk'||e.st==='atk'&&e.atk==='cane')){var sw=e.st==='atk'?Math.min(1,e.t/0.15):0;g.save();g.translate(x+e.face*14,y-46);g.rotate(e.face*(-0.6+sw*2.0));
  if(img('l3-cane'))g.drawImage(img('l3-cane'),-4,-36,17,40);else{g.fillStyle='#111';g.fillRect(-1,-34,3,36);g.fillStyle='#ffd23a';g.fillRect(-3,-37,8,4)}g.restore()}
 if(e.st==='down'&&e!==F.player&&e.hp>0||e.st==='getup'){g.fillStyle='#ffd23a';for(var i=0;i<3;i++){var a=F.time*6+i*2.1;g.fillRect(x+Math.cos(a)*10-1,y-24+Math.sin(a)*3-1,3,3)}}
}
function drawCar(g,cx){var c=F.car,x=c.x-cx,y=CAR_Y;if(x<-260||x>W+260)return;var k=c.dmg?'l3-car-dmg':'l3-car';
 g.fillStyle='rgba(41,214,255,.18)';g.beginPath();g.ellipse(x,y+1,110,6,0,0,Math.PI*2);g.fill();
 if(spriteMode()&&img(k)){g.drawImage(img(k),Math.round(x-110),Math.round(y-67),220,67)}
 else{g.fillStyle='#8d939e';g.beginPath();g.moveTo(x-104,y-14);g.lineTo(x-100,y-34);g.lineTo(x-50,y-38);g.lineTo(x-20,y-58);g.lineTo(x+40,y-58);g.lineTo(x+80,y-38);g.lineTo(x+104,y-32);g.lineTo(x+106,y-14);g.closePath();g.fill();
  g.fillStyle='#2a3450';g.fillRect(x-12,y-54,30,16);g.fillRect(x+22,y-54,26,16);g.fillStyle='#29d6ff';g.fillRect(x-90,y-6,180,2);
  g.fillStyle='#111';[[-62],[64]].forEach(function(w){g.beginPath();g.arc(x+w[0],y-12,12,0,Math.PI*2);g.fill()});g.fillStyle='#777';[[-62],[64]].forEach(function(w){g.beginPath();g.arc(x+w[0],y-12,6,0,Math.PI*2);g.fill()});
  if(c.dmg){g.strokeStyle='#fff';g.lineWidth=1;g.beginPath();g.moveTo(x+30,y-46);g.lineTo(x+38,y-52);g.moveTo(x+30,y-46);g.lineTo(x+24,y-40);g.moveTo(x+30,y-46);g.lineTo(x+40,y-42);g.stroke();g.fillStyle='#555';g.fillRect(x-40,y-30,14,4);g.fillRect(x+4,y-26,18,3)}}
 if(c.richieIn){g.fillStyle='#c98a5a';g.fillRect(x+6,y-52,7,8);g.fillStyle='#a8a8b0';g.fillRect(x+6,y-54,7,3)}
 if(F.st==='ending'&&F.seen){var bl=Math.floor(F.time*6)%2;g.strokeStyle=bl?'#ffd23a':'#fff';g.lineWidth=1.5;[[x-34,y-30],[x+30,y-46],[x+8,y-24]].forEach(function(d){g.beginPath();g.arc(d[0],d[1],7+bl*2,0,Math.PI*2);g.stroke()})}}
function render(g,w,t){W=w;if(!F)return;var sk=F.shakeT>0?Math.min(1,F.shakeT/0.3)*3:0,sx=sk?(Math.random()*2-1)*sk:0,sy=sk?(Math.random()*2-1)*sk*0.7:0;g.setTransform(2,0,0,2,sx*2,sy*2);g.imageSmoothingEnabled=false;var cx=Math.round(F.cam);
 /* background panels a,b,a(flip),b(flip) */
 var sm=spriteMode(),A4=F.stage==='airfield';for(var i=Math.floor(cx/400);i<=Math.floor((cx+w)/400);i++){var k=i%2?'b':'a',fl=A4?i%2===0:(i>>1)%2===1,x=i*400-cx,im=A4?(img('l4-bg-'+k)||bgPanel4(k)):sm&&img('l3-bg-'+k)?img('l3-bg-'+k):bgPanel(k);
  g.save();if(fl){g.translate(x+400,0);g.scale(-1,1);g.drawImage(im,0,0,400,225)}else g.drawImage(im,x,0,400,225);g.restore()}
 if(!A4)drawCar(g,cx);
 var list=[];F.breaks.forEach(function(b){if(b.st!=='gone')list.push({y:b.y,b:b})});F.items.forEach(function(it){if(!it.taken)list.push({y:it.y-1,it:it})});
 F.enemies.concat([F.player]).forEach(function(e){list.push({y:e.y,e:e})});list.sort(function(a,b){return a.y-b.y});
 list.forEach(function(o){if(o.e)drawEnt(g,o.e,cx);else if(o.b){var b=o.b,bx=b.x-cx;if(bx<-60||bx>w+60)return;
   g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(bx,b.y,16,4,0,0,Math.PI*2);g.fill();
   if(b.st==='ok'){if(!(sm&&drawSpr(g,'l3-'+b.k,bx,b.y,false))){g.fillStyle=b.k==='bin'?'#8a8f98':'#8a5a2a';g.fillRect(bx-16,b.y-(b.k==='bin'?50:44),32,b.k==='bin'?50:44);g.strokeStyle='#3a2a1a';g.strokeRect(bx-16,b.y-44,32,44)}}
   else{var a=b.t>0.7?(Math.floor(b.t*14)%2?0.2:1):1;if(!(sm&&drawSpr(g,'l3-planks',bx,b.y,false,0,a))){g.globalAlpha=a;g.fillStyle='#7a5028';g.fillRect(bx-14,b.y-8,28,6);g.fillRect(bx-8,b.y-14,6,12);g.globalAlpha=1}}}
  else{var it=o.it,ix=it.x-cx,bob=Math.sin(F.time*5+it.x)*1.5;if(ix<-40||ix>w+40)return;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(ix,it.y,10,3,0,0,Math.PI*2);g.fill();
   var key='l3-'+it.k;if(it.k==='cane'&&sm&&img(key)){g.save();g.translate(ix,it.y-4+bob);g.rotate(Math.PI/2);g.drawImage(img(key),-20,-9,17,40);g.restore()}
   else if(!(sm&&drawSpr(g,key,ix,it.y+bob,false))){g.fillStyle=it.k==='empanada'?'#e8a040':it.k==='watch'?'#ffd23a':'#222';g.fillRect(ix-9,it.y-10+bob,18,8);if(it.k==='cane'){g.fillStyle='#ffd23a';g.fillRect(ix+8,it.y-12+bob,5,5)}}
   if(Math.floor(F.time*3)%2){g.fillStyle='#fff';g.fillRect(ix+8,it.y-22+bob,2,2)}}});
 /* fx */
 F.fx.forEach(function(f){var x=f.x-cx,k=f.t/f.life;if(f.k==='spark'){var r=(f.big?16:10)*(0.5+k);g.strokeStyle=k<0.5?'#fff':'#ffd23a';g.lineWidth=f.big?2.5:1.5;g.beginPath();for(var i=0;i<8;i++){var a=i*Math.PI/4+0.3;g.moveTo(x+Math.cos(a)*r*0.3,f.y+Math.sin(a)*r*0.3);g.lineTo(x+Math.cos(a)*r,f.y+Math.sin(a)*r)}g.stroke();if(k<0.4){g.fillStyle='#fff';g.fillRect(x-3,f.y-3,6,6)}}
  else if(f.k==='ring'){var rr=12+k*(f.big?110:80);g.save();g.globalAlpha=Math.max(0,1-k);g.lineWidth=f.big?4:3;g.strokeStyle='#ff3ad8';g.shadowColor='#ff3ad8';g.shadowBlur=10;g.beginPath();g.ellipse(x,f.y-4,rr,rr*0.32,0,0,Math.PI*2);g.stroke();
   g.strokeStyle='#29d6ff';g.shadowColor='#29d6ff';g.lineWidth=2;g.beginPath();g.ellipse(x,f.y-4,rr*0.72,rr*0.23,0,0,Math.PI*2);g.stroke();g.restore()}
  else{g.fillStyle='rgba(220,200,230,'+(0.5*(1-k))+')';g.beginPath();g.arc(x,f.y-4-k*8,4+k*10,0,Math.PI*2);g.fill()}});
 g.font='900 italic 11px "Arial Black",Impact,sans-serif';g.textAlign='center';
 F.pops.forEach(function(p){var y=p.y-p.t*26;g.globalAlpha=Math.max(0,1-p.t/0.9);g.fillStyle='#0a0420';g.fillText(p.txt,p.x-cx+1,y+1);g.fillStyle=p.c;g.fillText(p.txt,p.x-cx,y);g.globalAlpha=1});
 /* rain */
 if(!A4){g.strokeStyle='rgba(180,200,255,.35)';g.lineWidth=0.8;g.beginPath();rain.forEach(function(r){var x=((r.x%(w+40))+w+40)%(w+40)-20;g.moveTo(x,r.y);g.lineTo(x-2,r.y+7)});g.stroke()}
 if(F.flashT>0){g.fillStyle='rgba(255,235,255,'+(0.75*F.flashT/0.2)+')';g.fillRect(-10,-10,w+20,245)}
 if(F.slowT>0){g.fillStyle='rgba(255,58,216,.12)';g.fillRect(-10,-10,w+20,245)}
 var vg=g.createLinearGradient(0,0,0,225);vg.addColorStop(0,'rgba(10,4,24,.25)');vg.addColorStop(0.3,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(10,4,24,.3)');g.fillStyle=vg;g.fillRect(0,0,w,225);
}
function portrait(cv,who){var g=cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);var im=SPR[who==='manny'||who==='aces'?'l4-'+who+'-portrait':'l3-jefe-portrait'];
 var gr=g.createLinearGradient(0,0,0,cv.height);gr.addColorStop(0,'#3a1a58');gr.addColorStop(1,'#0a0618');g.fillStyle=gr;g.fillRect(0,0,cv.width,cv.height);
 if(im){g.imageSmoothingEnabled=true;g.drawImage(im,0,0,cv.width,cv.height);return}
 var k=cv.width/24;g.setTransform(k,0,0,k,0,0);if(who==='manny'||who==='aces'){var C=COL[who];g.fillStyle=C.top;g.fillRect(3,18,18,6);g.fillStyle=C.skin;g.fillRect(7,6,10,12);g.fillStyle=C.hair;g.fillRect(7,4,10,who==='manny'?2:4);g.fillStyle='#111';if(who==='aces')g.fillRect(8,10,8,2);else{g.fillRect(9,10,2,1);g.fillRect(13,10,2,1)}g.fillRect(9,15,6,1);return}g.fillStyle='#b593d9';g.fillRect(3,18,18,6);g.fillStyle='#111';g.fillRect(10,18,4,6);g.fillStyle='#c99070';g.fillRect(7,6,10,12);g.fillStyle='#d8d8de';g.fillRect(7,4,10,4);g.fillStyle='#222';g.fillRect(9,14,6,1);g.fillRect(9,10,2,1);g.fillRect(13,10,2,1)}
function figH(e){var k=frameOf(e),m=SPR[k]&&META[k];return m?m[1]/2:COL[e.type].h}
function snap(){if(!F)return null;var p=F.player,b=F.boss;
 return {stage:F.stage,boarding:!!F.boarding,duo:F.duo?F.duo.map(function(e){return {type:e.type,name:TYPES[e.type].name,hp:e.hp,max:e.max,st:e.st,enraged:!!e.enraged}}):null,st:F.st,time:F.time,cam:F.cam,lock:F.lock,wave:F.wave+1,waves:F.waves.length,go:F.go,score:F.score,lives:F.lives,auto:AUTO,rage:F.rage,rageMax:RAGE_MAX,fxNow:{slow:F.slowT>0,shake:F.shakeT>0,flash:F.flashT>0,rings:F.fx.filter(function(f){return f.k==='ring'}).length},story:F.story.slice(),
  player:{x:p.x,y:p.y,z:p.z,hp:p.hp,st:p.st,face:p.face,weapon:p.weapon,atk:p.atk,inv:p.inv,t:p.t,frame:frameOf(p),h:figH(p)},
  enemies:F.enemies.map(function(e){return {type:e.type,hp:e.hp,max:e.max,st:e.st,x:e.x,y:e.y,z:e.z,flash:e.flash,vx:e.vx,h:figH(e),frame:frameOf(e)}}),
  boss:b?{hp:b.hp,max:b.max,st:b.st,half:F.bossHalf}:null,items:F.items.filter(function(i){return !i.taken}).map(function(i){return {k:i.k,x:i.x,y:i.y}}),
  breaks:F.breaks.filter(function(b){return b.st==='ok'}).length,car:{dmg:F.car.dmg,x:F.car.x,gone:F.car.gone,richieIn:F.car.richieIn},ehud:F.ehud?{name:TYPES[F.ehud.e.type].name,hp:F.ehud.e.hp,max:F.ehud.e.max}:null,
  stats:JSON.parse(JSON.stringify(F.stats)),LEN:LEN,W:W,sprites:spriteMode()}}
var dev={rage:function(n){F.rage=n},speed:function(k){SPEED=Math.max(1,k|0)},hp:function(n){F.player.hp=n},lives:function(n){F.lives=n},
 duoHp:function(n){if(F.duo)F.duo.forEach(function(e){e.hp=Math.min(e.hp,n)})},
 toBoss:function(){F.wave=F.waves.length-1;F.lock=null;F.enemies=[];F.waveQ=[];F.player.x=LEN-W*0.5;F.cam=LEN-W-1;F.st='play'},
 toWave:function(n){F.wave=n-2;F.lock=null;F.enemies=[];F.waveQ=[];F.cam=F.waves[n-1].cam-2;F.player.x=F.cam+W*0.42;F.st='play'},
 spawn:function(t,dx){var e=ent(t,F.player.x+(dx||40),F.player.y,dx<0?1:-1);e.cd=99;F.enemies.push(e);return F.enemies.length-1},
 item:function(k,dx){F.items.push({k:k,x:F.player.x+(dx||0),y:F.player.y,t:0})},
 bossHp:function(n){if(F.boss)F.boss.hp=n},clearWave:function(){F.waveQ=[];F.enemies.forEach(function(e){if(e.type!=='jefe')e.st='gone'})},
 freeze:function(i,on){if(F.enemies[i])F.enemies[i].cd=on?99:0.5},place:function(x,y){F.player.x=x;if(y)F.player.y=y}};
window.RosadoFight={start:start,update:update,render:render,move:move,press:press,hold:hold,go:go,ending:ending,driveOff:driveOff,board:board,stage:function(){return STAGE},cutscene:cutscene,cutDone:cutDone,summary:function(){return F?summary():null},META:META,retryWave:retryWave,setAuto:setAuto,auto:function(){return AUTO},
 on:on,snap:snap,portrait:portrait,loadSprites:loadSprites,spriteMode:spriteMode,sprites:SPR,SLOTS:SLOTS,dev:dev,state:function(){return F},LEN:LEN,TYPES:TYPES,WAVES:WAVES};
})();
