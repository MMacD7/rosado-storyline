/* Rosado Nights · Level 6 "Escobar" (v0.6.0) · the FINAL level
   Stages: 'stairs'  brawl up the grand staircase (guard waves, the chief barking orders from the landing, KICK the railings to drop the chandeliers,
                     pickups: pool cue, fire extinguisher, chandelier arm). At the top Escobar fires his gold shotgun, misses, the aquarium shatters
                     and the fight goes on knee-deep with cartoon sharks that bump and tumble guards (they never bite).
           'climb'   up the outside wall in the storm, dodging falling roof tiles
           'roof'    one-on-one with Escobar under the helicopter spotlight; rotor wash pushes Richie to the edge; RAGE = 3-hit cinematic combo;
                     the last hit launches Escobar off the roof into the pool. The chief gets away in the helicopter.
           'bay'     jet-ski chase of Escobar's speedboat across the neon bay: yacht wakes are jumps, fireworks overhead, ramp off the yacht onto his deck
           'deck'    final deck brawl: Escobar is knocked out
           'finale'  the chief's seaplane: Richie grabs the tail, gets shaken off, drops into the bay -> sunrise, the chief's gold badge -> emit('end')
   Cartoon only: knocked-out guards lie down with stars and a snore. Nothing graphic. Canvas fallback art when images fail.
   Juice: slow-mo on finishers with a white flash, hit-stop freeze frames, screen shake, comic impact bursts, 3-4 layer parallax, real lighting.
   API (window.RosadoEscobar): start(stage,keep), go(), resume(), update(dt), render(g,W,t) (2x buffer), move(x,y), press(k), setAuto(b), auto(), on(evt,fn),
        snap(), portrait(cv,who), loadSprites(map,cb), spriteMode(), stage(), SLOTS, META, CFG, dev.* (tests). No network. */
(function(){
"use strict";
var H=225;
var META={"l6-r-guard":[108,200,53.5],"l6-r-walk-0":[108,199,53.5],"l6-r-walk-1":[101,198,50.0],"l6-r-jab":[128,198,51.0],"l6-r-cross":[133,197,51.0],"l6-r-upper":[106,235,52.5],"l6-r-hkick":[136,185,51.0],"l6-r-fkick":[143,133,71.5],"l6-r-heel":[116,165,54.0],"l6-r-hurt":[100,173,50.5],"l6-r-down":[155,50,77.5],"l6-r-club":[134,245,69.0],"l6-r-spray":[159,190,69.0],"l6-r-cue":[156,188,63.0],"l6-r-ski":[177,144,88.5],"l6-r-skijump":[160,162,80.0],"l6-r-climb-0":[97,230,48.5],"l6-r-climb-1":[87,236,43.5],"l6-r-hang":[64,228,32.0],"l6-esc-idle":[90,212,44.5],"l6-esc-walk":[96,208,47.5],"l6-esc-punch":[133,208,80.0],"l6-esc-fire":[157,206,105.0],"l6-esc-hurt":[127,176,43.0],"l6-esc-down":[163,66,81.5],"l6-tank-idle":[129,236,64.0],"l6-tank-walk":[129,233,64.0],"l6-tank-wind":[134,238,66.5],"l6-tank-punch":[182,225,112.0],"l6-tank-hurt":[131,205,72.0],"l6-tank-down":[180,77,90.0],"l6-chief-point":[107,190,49.5],"l6-chief-cross":[101,191,51.0],"l6-chief-wave":[108,188,58.0],"l6-badge":[33,44,16.5],"l6-chandelier":[132,150,66.0],"l6-shark-0":[111,74,55.5],"l6-shark-1":[77,84,38.5],"l6-ext":[27,52,13.5],"l6-arm":[53,56,26.5],"l6-cue":[231,12,115.5],"l6-tile":[38,34,19.0],"l6-rail1":[94,60,47.0],"l6-heli":[300,117,150.0],"l6-seaplane":[250,95,125.0],"l6-boat":[300,63,150.0],"l6-yacht":[460,207,230.0],"l6-rail":[812,96,406.0],"l5-guard-walk-0":[129,180,48.5],"l5-guard-walk-1":[133,179,52.0],"l5-guard-run":[126,194,49.0],"l5-guard-punch":[156,167,53.5],"l5-guard-down":[173,59,86.5]};
var BGS=['l6-tank-portrait','l6-hall-far','l6-roof','l6-bay-far','l6-sunrise','l6-wall','l6-chief-portrait','l6-esc-portrait','l5-guard-portrait'];
var SLOTS=Object.keys(META).concat(BGS);
var CORE=['l6-r-guard','l6-esc-idle','l6-hall-far','l5-guard-walk-0','l6-r-ski','l6-roof'];
var STAGES=['stairs','climb','roof','bay','deck','finale'];
var SPR={},EV={},M=null,IN={x:0,y:0},AUTO=false,SPEED=1,W=400;
var SFX=window.RosadoSFX||{};function sfx(n,a,b){if(SFX[n])try{SFX[n](a,b)}catch(e){}}
function on(n,f){(EV[n]=EV[n]||[]).push(f)}function emit(n,a){(EV[n]||[]).forEach(function(f){try{f(a)}catch(e){}})}
function clamp(v,a,b){return v<a?a:v>b?b:v}function lerp(a,b,t){return a+(b-a)*t}function sgn(v){return v<0?-1:v>0?1:0}function rnd(a,b){return a+Math.random()*(b-a)}
function loadSprites(map,cb){var ks=Object.keys(map||{}).filter(function(k){return SLOTS.indexOf(k)>=0}),n=ks.length;if(!n){if(cb)cb();return}
 ks.forEach(function(k){var im=new Image();im.onload=function(){SPR[k]=im;if(--n===0&&cb)cb()};im.onerror=function(){delete SPR[k];if(--n===0&&cb)cb()};im.src=map[k]})}
function spriteMode(){for(var i=0;i<CORE.length;i++)if(!SPR[CORE[i]])return false;return true}

/* ---------- tuning ---------- */
var CFG={hp:100,lives:3,spd:80,spdY:46,flood:0.72,jumpV:235,grav:720,combo:0.42,rageMax:100,
 /* attacks: dur, active window [a,b], reach, dmg, heavy (knockdown), burst word */
 A:{jab:{d:0.22,a:0.06,b:0.13,r:40,dmg:8,w:'POW!'},cross:{d:0.26,a:0.08,b:0.16,r:44,dmg:10,w:'WHAM!'},upper:{d:0.42,a:0.1,b:0.2,r:40,dmg:16,heavy:1,w:'KA-POW!'},
  hkick:{d:0.38,a:0.1,b:0.22,r:56,dmg:14,heavy:1,w:'CRACK!'},heel:{d:0.46,a:0.1,b:0.3,r:52,dmg:16,heavy:1,both:1,w:'WHACK!'},fkick:{d:0.5,a:0.02,b:0.45,r:52,dmg:18,heavy:1,w:'BOOM!'},
  club:{d:0.44,a:0.12,b:0.24,r:64,dmg:30,heavy:1,all:1,w:'CLANG!'},cue:{d:0.34,a:0.08,b:0.18,r:96,dmg:18,heavy:1,w:'THWACK!'},spray:{d:0.5,a:0.08,b:0.4,r:92,dmg:0,stun:2.6,all:1,w:'FWOOSH!'}},
 USES:{cue:5,ext:3,arm:4},WNAME:{cue:'POOL CUE',ext:'FIRE EXTINGUISHER',arm:'CHANDELIER ARM'},
 guard:{hp:34,spd:54,dmg:7,wind:0.38,cd:1.1,reach:34},
 tank:{hp:120,spd:40,dmg:14,wind:0.62,cd:1.5,reach:46},
 esc:{hp:{roof:260,deck:200},spd:58,dmg:10,wind:0.34,cd:0.9,reach:38,fireAim:0.8,fireCd:4.2,fireDmg:12},
 stairs:{len:1560,ymin:168,ymax:214,s0:420,s1:1000,rise:72,waves:[{x:0,n:3},{x:600,n:3},{x:1020,n:3}],flood:{n:4},topX:1180,escX:1470,chiefX:1330,
  chand:[{x:300,rail:250},{x:780,rail:720},{x:1240,rail:1190}],pick:[{k:'cue',x:170,y:200},{k:'ext',x:700,y:182},{k:'cue',x:1300,y:206}]},
 climb:{len:1150,spd:62,lunge:34,tile:{every:1.05,warn:0.75,v:230,dmg:12}},
 roof:{ymin:176,ymax:214,wash:{every:5.5,dur:2.2,push:46},edgeU:262},
 bay:{len:4600,spd:150,boost:95,ymin:150,ymax:212,gap0:260,wakes:[700,1450,2150,2900,3600],obs:[[380,170],[560,200],[900,160],[1100,196],[1300,176],[1650,206],[1800,160],[2000,186],[2350,166],[2500,204],[2700,178],[3050,158],[3250,196],[3400,172],[3800,190],[3950,162],[4150,204]],airPts:250,flipPts:500},
 deck:{ymin:176,ymax:214,guards:2},
 pts:{ko:300,fin:200,chand:500,shark:250,rage:400,esc:3000,climb:1000,bay:1500}};
var GT={guard:{name:'GUARD'},esc:{name:'ESCOBAR'}};

/* ---------- state ---------- */
function copy(o){var c={};for(var k in o)c[k]=o[k];return c}
function freshStats(){return {kos:0,chand:0,sharks:0,weapons:0,rages:0,airs:0,flips:0,crashes:0,retries:0,time:0,maxCombo:0,tiles:0,hits:0}}
/* keep: true = carry score/stats/lives into the next stage; 2 = RESTART this stage (score back to where it began) */
function start(stage,keep){var sc=keep&&M?(keep===2?M.score0:M.score):0,st=keep&&M?(keep===2?copy(M.stats0):M.stats):freshStats();
 if(keep===2){st.retries++;st.time=M.stats.time}
 M={stage:stage||'stairs',st:'ready',t:0,score:sc,score0:sc,stats:st,stats0:copy(st),pops:[],fx:[],bursts:[],parts:[],shake:0,wflash:0,rflash:0,stop:0,slow:0,slowK:0.25,
  rage:keep&&M?M.rage:0,lives:CFG.lives,hp:CFG.hp,cine:'',ct:0,wait:false,fade:0,letter:0,zoom:1,zx:0,zy:0,bolt:null,boltT:rnd(3,6)};
 ({stairs:initStairs,climb:initClimb,roof:initRoof,bay:initBay,deck:initDeck,finale:initFinale})[M.stage]();IN={x:0,y:0}}
function go(){if(M&&M.st==='ready')M.st='run'}
function resume(){if(M)M.wait=false}
function add(n){M.score=Math.max(0,M.score+n)}
function pop(x,y,txt,c){M.pops.push({x:x,y:y,txt:txt,c:c||'#ffd23a',t:0})}
function burst(x,y,w,big,c){M.bursts.push({x:x,y:y,w:w,t:0,big:big?1.5:1,c:c||(Math.random()<0.5?'#ffd23a':'#7dfcff'),rot:rnd(-0.25,0.25),n:big?14:11})}
function hitstop(s){M.stop=Math.max(M.stop,s)}
function slowmo(s,k){M.slow=Math.max(M.slow,s);M.slowK=k||0.25;emit('slowmo',s)}
function flash(v){M.wflash=Math.max(M.wflash,v||1)}
function shake(v){M.shake=Math.max(M.shake,v)}
function player(x,y){return {x:x,y:y,z:0,vz:0,face:1,act:'',at:0,chain:0,chainT:0,hurtT:0,inv:0,downT:0,walk:0,moving:false,weapon:null,uses:0,hang:0,kb:0,hit:{}}}
function guard(x,y,o){var e={type:'guard',x:x,y:y,z:0,vz:0,vx:0,face:-1,hp:CFG.guard.hp,max:CFG.guard.hp,st:'walk',t:0,cd:rnd(0.4,1.2),walk:0,stun:0,windT:0,koT:0,id:(M.eid=(M.eid||0)+1)};if(o)for(var k in o)e[k]=o[k];return e}
function escobar(x,y,hp){return {type:'esc',x:x,y:y,z:0,vz:0,vx:0,face:-1,hp:hp,max:hp,st:'walk',t:0,cd:1,walk:0,stun:0,windT:0,koT:0,fireT:0,fireCd:2.5,aimY:0,id:99}}
/* ---------- stage init ---------- */
var ST=CFG.stairs;
function elev(x){if(M.stage!=='stairs')return 0;if(x<ST.s0)return 0;if(x>=ST.s1)return ST.rise;var n=Math.floor((x-ST.s0)/18),N=Math.ceil((ST.s1-ST.s0)/18);return Math.round(ST.rise*Math.min(1,(n+1)/N))}
function initStairs(){M.p=player(60,196);M.foes=[];M.wave=-1;M.waves=[{tx:0,tank:1},{tx:440,n:3},{tx:780,n:3},{tx:1060,n:3},{tx:9e9,n:CFG.stairs.flood.n,flood:1}];M.lock=null;M.cam=0;M.camY=0;M.top=false;M.flood={on:false,front:0,L:0,t:0};M.sharks=[];M.sharkT=1.5;
 M.chand=ST.chand.map(function(c){return {x:c.x,rail:c.rail,st:'hang',t:0,sw:Math.random()*6}});M.picks=ST.pick.map(function(p){return {k:p.k,x:p.x,y:p.y,taken:false}});
 M.chief={x:ST.chiefX,said:0,t:2,line:''};M.esc={x:ST.escX,st:'idle',t:0};M.aqua={st:'ok',t:0};M.go=false;M.rain=[];for(var i=0;i<60;i++)M.rain.push({x:Math.random(),y:Math.random(),s:rnd(0.6,1)})}
function initClimb(){M.c={h:0,x:W/2,climbT:0,tiles:[],tileT:1.4,hurtT:0,inv:0,slip:0,lungeCd:0,rain:[]};for(var i=0;i<80;i++)M.c.rain.push({x:Math.random(),y:Math.random(),s:rnd(0.6,1.2)})}
function initRoof(){M.p=player(70,198);M.foes=[escobar(250,196,CFG.esc.hp.roof)];M.boss=M.foes[0];M.r={edge:262,x0:14,wash:0,washT:3,washOn:false,heli:{x:300,y:44,ph:0,away:0},spot:{x:120,y:196},launched:false,splash:0,cine:'',combo:null};M.cam=0;M.camY=0}
function initBay(){var B=CFG.bay;M.b={d:0,y:184,z:0,vz:0,gap:B.gap0,meter:0.6,boost:0,jumpCd:0,air:0,flip:0,wipe:0,hurtT:0,spray:[],works:[],workT:0.5,obs:B.obs.map(function(o){return {x:o[0],y:o[1],hit:false}}),wakes:B.wakes.map(function(x){return {x:x,used:false}}),
 final:false,finT:0,ramp:B.len+260,trick:false}}
function initDeck(){M.p=player(60,198);M.foes=[];for(var i=0;i<CFG.deck.guards;i++)M.foes.push(guard(W+30+i*40,182+i*22,{face:-1}));M.boss=null;M.d={phase:'guards',t:0,scroll:0,picks:[{k:'ext',x:W*0.45,y:206,taken:false}]};M.picks=M.d.picks;M.cam=0;M.camY=0}
function initFinale(){M.f={t:0,ph:'plane',px:0,badge:false};M.st='run'}

/* ---------- update ---------- */
function update(dt){if(!M)return;for(var i=0;i<SPEED;i++)step(dt)}
function step(rdt){var dt=rdt;
 M.t+=rdt;M.wflash=Math.max(0,M.wflash-rdt*2.6);M.rflash=Math.max(0,M.rflash-rdt*2);M.shake=Math.max(0,M.shake-rdt);
 M.bursts=M.bursts.filter(function(b){b.t+=rdt;return b.t<0.55});M.pops=M.pops.filter(function(p){p.t+=rdt;return p.t<1.2});
 if(M.stop>0){M.stop-=rdt;return}
 if(M.slow>0){M.slow-=rdt;dt*=M.slowK;M.letter=Math.min(1,M.letter+rdt*5)}else M.letter=Math.max(0,M.letter-rdt*4);
 M.parts=M.parts.filter(function(p){p.vy+=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.t+=dt;return p.t<p.life});
 M.fx=M.fx.filter(function(f){f.t+=dt;return f.t<f.life});
 if(M.st==='run')M.stats.time+=rdt;
 /* lightning (roof + climb + the rain outside the foyer windows) */
 M.boltT-=rdt;if(M.boltT<=0){M.boltT=rnd(4,8);M.bolt={t:0,x:rnd(0.15,0.85),seg:boltPath()};M.rflash=0.9;sfx('thud')}if(M.bolt){M.bolt.t+=rdt;if(M.bolt.t>0.35)M.bolt=null}
 if(M.wait)return;
 if(M.stage==='stairs'||M.stage==='roof'||M.stage==='deck')stepBrawl(dt);else if(M.stage==='climb')stepClimb(dt);else if(M.stage==='bay')stepBay(dt);else stepFinale(dt)}
function boltPath(){var s=[],x=0,y=0;for(var i=0;i<7;i++){x+=rnd(-0.03,0.03);y+=rnd(0.05,0.09);s.push([x,y])}return s}
function part(x,y,vx,vy,life,c,s,g,k){M.parts.push({x:x,y:y,vx:vx,vy:vy,life:life,c:c,s:s||1.5,g:g||0,t:0,k:k||''})}
function splashAt(x,y,n,big){y-=elev(x);for(var i=0;i<(n||10);i++)part(x+rnd(-6,6),y,rnd(-70,70)*(big?1.6:1),rnd(-150,-60)*(big?1.5:1),rnd(0.4,0.8),i%3?'rgba(160,240,255,.9)':'#fff',rnd(1.2,2.6),380,'drop')}

/* ---------- brawl (stairs / roof / deck) ---------- */
function bounds(){if(M.stage==='stairs'){var L=M.lock;return {x0:L?L.x0+8:8,x1:L?L.x1-8:ST.len-8,y0:ST.ymin,y1:ST.ymax}}
 if(M.stage==='roof')return {x0:M.r.x0,x1:M.r.edge+30,y0:CFG.roof.ymin,y1:CFG.roof.ymax};return {x0:16,x1:W-16,y0:CFG.deck.ymin,y1:CFG.deck.ymax}}
function wet(){return M.stage==='stairs'&&M.flood.on&&M.flood.L>4}
function alive(){return M.foes.filter(function(e){return e.st!=='ko'})}
function stepBrawl(dt){var p=M.p,run=M.st==='run',B=bounds();
 if(M.cine==='combo')stepCombo(dt);
 var M0=M;if(M.stage==='stairs')stairsFlow(dt);else if(M.stage==='roof')roofFlow(dt);else deckFlow(dt);if(M!==M0)return;
 if(M.st==='lose'){M.loseT-=dt;if(M.loseT<=0){M.st='ready';emit('lose',M.stage)}return}
 /* player */
 var mx=IN.x,my=IN.y;if(AUTO&&run){var a=autoFight();mx=a.x;my=a.y}
 if(!run||M.cine){mx=0;my=0}
 if(p.hurtT>0)p.hurtT-=dt;if(p.inv>0)p.inv-=dt;if(p.chainT>0)p.chainT-=dt;else p.chain=0;
 if(p.downT>0){p.downT-=dt;if(p.downT<=0){if(M.hp<=0)lifeLost();p.inv=1}mx=my=0}
 if(p.hang>0){p.hang-=dt;mx=my=0;if(p.hang<=0){p.x=M.r.edge-26;p.inv=1;emit('climbBack')}}
 var busy=p.act&&p.act!=='fkick';
 if(p.act){p.at+=dt;var A=CFG.A[p.act];if(p.at>=A.a&&p.at<=A.b)hitCheck(p,A);if(p.at>=A.d&&!(p.act==='fkick'&&p.z>0)){p.act='';p.hit={}}}
 var sp=CFG.spd*(wet()?CFG.flood:1)*(p.hurtT>0?0.3:1)*(busy&&p.z<=0?0.15:1);
 p.moving=Math.abs(mx)>0.15||Math.abs(my)>0.15;if(Math.abs(mx)>0.2&&!busy)p.face=sgn(mx);
 p.x+=mx*sp*dt+p.kb*dt;p.kb*=Math.pow(0.02,dt);p.y=clamp(p.y+my*CFG.spdY*(wet()?CFG.flood:1)*dt,B.y0,B.y1);
 if(M.stage==='roof'&&M.r.washOn&&p.hang<=0&&p.downT<=0){p.x+=CFG.roof.wash.push*dt}
 if(M.stage==='roof'&&p.x>M.r.edge+6&&p.hang<=0&&!M.r.launched){p.hang=1.3;p.x=M.r.edge+8;p.act='';hurt(10,0,true);sfx('warn');emit('hang')}
 p.x=clamp(p.x,B.x0,M.stage==='roof'?M.r.edge+10:B.x1);
 if(p.moving){p.walk+=sp*dt;if(wet()&&Math.random()<dt*10)splashAt(p.x+rnd(-8,8),p.y,2)}
 if(p.z>0||p.vz>0){p.vz-=CFG.grav*dt;p.z=Math.max(0,p.z+p.vz*dt);if(p.z===0){p.vz=0;if(p.act==='fkick'){p.act='';p.hit={}}if(wet())splashAt(p.x,p.y,8)}}
 /* pickups: walk over a glowing item to grab it */
 (M.picks||[]).forEach(function(k){if(!k.taken&&run&&!p.weapon&&p.z<8&&Math.abs(k.x-p.x)<18&&Math.abs(k.y-p.y)<12){k.taken=true;p.weapon=k.k;p.uses=CFG.USES[k.k];sfx('pickup');pop(p.x,p.y-elev(p.x)-112,CFG.WNAME[k.k]+'!','#7dfcff');emit('pickup',{k:k.k,uses:p.uses})}});
 /* foes */
 var attackers=M.foes.filter(function(e){return e.st==='wind'||e.st==='atk'}).length;
 M.foes.forEach(function(e){stepFoe(e,dt,attackers);if(e.st==='wind'&&e.t===0)attackers++});
 M.foes=M.foes.filter(function(e){return !(e.st==='ko'&&e.koT>3.2&&e.type==='guard')});
 /* sharks */
 if(M.stage==='stairs'&&M.flood.on)stepSharks(dt);
 /* camera */
 if(M.stage==='stairs'){var tc=clamp(p.x-W*0.4,0,ST.len-W);if(M.lock)tc=clamp(tc,M.lock.x0,M.lock.x1-W);M.cam+=(tc-M.cam)*Math.min(1,dt*6);M.camY+=(elev(M.cam+W*0.45)*0.95-M.camY)*Math.min(1,dt*4)}}
function hitCheck(p,A){var any=false,w=p.act==='club'||p.act==='cue'||p.act==='spray';
 if(p.act==='spray'&&!p.sprayed){p.sprayed=true;for(var i=0;i<26;i++)part(p.x+p.face*30,p.y-elev(p.x)-62,p.face*rnd(60,200),rnd(-30,30),rnd(0.5,1.1),'rgba(240,248,255,.85)',rnd(3,7),-20,'cloud')}
 M.foes.forEach(function(e){if(e.st==='ko'||p.hit[e.id])return;var dx=(e.x-p.x)*p.face;if(A.both)dx=Math.abs(e.x-p.x);var dy=Math.abs(e.y-p.y);
  if(dx>-8&&dx<A.r+(e.type==='tank'?10:0)&&dy<(A.all?20:14)&&Math.abs((e.z||0)-p.z)<40){p.hit[e.id]=1;any=true;
   if(A.stun){e.stun=e.type==='guard'?A.stun:1.2;e.st='stun';e.t=0;burst(e.x,e.y-70-elev(e.x),A.w,false,'#e8f4ff');add(50);return}
   hitFoe(e,A.dmg,A.heavy,p.face,A.w,p.act)}});
 if(any){M.stats.hits++;if(w&&!p.wcount){p.wcount=1}var c=p.chain;M.stats.maxCombo=Math.max(M.stats.maxCombo,c)}}
function hitFoe(e,dmg,heavy,dir,word,act){var boss=e.type!=='guard';
 if(boss&&e.st==='fire'&&e.t<CFG.esc.fireAim)e.fireCd=Math.max(e.fireCd,1.5);
 e.hp-=dmg;M.rage=Math.min(CFG.rageMax,M.rage+(boss?5:7));var ex=e.x,ey=e.y-elev(e.x)-(e.type==='tank'?80:66);
 hitstop(heavy?0.085:0.05);shake(heavy?0.3:0.16);burst(ex+dir*6,ey,word||'POW!',heavy);sfx(heavy?'thud':'punch',heavy?1.3:1);
 if(wet())splashAt(e.x,e.y,8);
 if(e.hp<=0){if(e.type==='esc'&&M.stage==='roof'){e.hp=0;launch(e)}else ko(e,dir,act);return}
 if(heavy&&!(e.type==='tank'&&dmg<16)){e.st='knock';e.t=0;e.vx=dir*120;e.vz=150;e.face=-dir}else{e.st='hurt';e.t=0;e.vx=dir*(boss?40:70);e.face=-dir}
 if(e.windT)e.windT=0}
function ko(e,dir,act){var last=alive().length===1;e.st='ko';e.koT=0;e.t=0;e.vx=dir*170;e.vz=220;e.face=-dir;M.stats.kos++;add(CFG.pts.ko+(e.type==='tank'?1200:0));
 if(act==='club'||act==='cue')M.stats.weapons++;
 pop(e.x,e.y-elev(e.x)-110,e.type==='tank'?'TANK DOWN! +1500':'K.O. +'+CFG.pts.ko);sfx('ko');
 if(e.type==='esc'){slowmo(1.2,0.2);flash(1);add(CFG.pts.esc);burst(e.x,e.y-90,'K.O.!',true,'#fff');emit('escDown',M.stage);return}
 if(last||e.type==='tank'){slowmo(0.9);flash(1);add(CFG.pts.fin);burst(e.x,e.y-elev(e.x)-80,'K.O.!',true,'#fff');emit('finisher')}
 emit('ko',{type:e.type,left:alive().length})}
function hurt(dmg,dir,soft){var p=M.p;if(p.inv>0||p.downT>0||M.st!=='run')return false;M.hp-=dmg;M.rage=Math.min(CFG.rageMax,M.rage+9);p.hurtT=0.35;p.inv=0.7;p.act='';p.kb=dir*90;shake(0.25);sfx('punch');
 if(M.hp<=0){M.hp=0;p.downT=1.6;sfx('thud');emit('down',M.lives)}emit('hurt',M.hp);return true}
function lifeLost(){M.lives--;if(M.lives<0){M.st='lose';M.loseT=0.6;M.lives=0;return}M.hp=CFG.hp;emit('life',M.lives)}
function stepFoe(e,dt,attackers){var p=M.p,run=M.st==='run'&&!M.cine,G=e.type==='guard'?CFG.guard:e.type==='tank'?CFG.tank:CFG.esc;e.t+=dt;
 if(e.z>0||e.vz>0){e.vz-=CFG.grav*dt;e.z=Math.max(0,e.z+e.vz*dt);if(e.z===0){e.vz=0;if(wet())splashAt(e.x,e.y,6)}}
 e.x+=e.vx*dt;e.vx*=Math.pow(0.05,dt);
 if(e.st==='ko'){e.koT+=dt;return}
 var B=bounds();e.y=clamp(e.y,B.y0,B.y1);if(M.stage!=='stairs'||!M.lock)e.x=clamp(e.x,B.x0-60,B.x1+60);
 if(M.stage==='roof'&&M.r.washOn)e.x+=CFG.roof.wash.push*0.5*dt;
 if(M.stage==='roof'&&e.type==='esc'&&e.x>M.r.edge-6)e.x=M.r.edge-6;
 if(e.st==='hurt'){if(e.t>0.32){e.st='walk';e.t=0}return}
 if(e.st==='knock'){if(e.t>(e.type==='guard'?0.95:0.7)&&e.z===0){e.st='walk';e.t=0;e.cd=0.6}return}
 if(e.st==='stun'){e.stun-=dt;if(e.stun<=0){e.st='walk';e.t=0}return}
 if(!run){if(e.st==='wind'||e.st==='atk'||e.st==='fire'){e.st='walk';e.t=0}return}
 var dx=p.x-e.x,dy=p.y-e.y,adx=Math.abs(dx);e.face=sgn(dx)||e.face;e.cd-=dt;
 if(e.type==='esc'){e.fireCd-=dt;
  if(e.st==='fire'){if(e.t<CFG.esc.fireAim){e.aimY=e.y;return}if(!e.fired){e.fired=true;blam(e)}if(e.t>CFG.esc.fireAim+0.45){e.st='walk';e.t=0;e.fired=false;e.fireCd=CFG.esc.fireCd}return}
  if(e.fireCd<=0&&adx>90&&adx<260&&p.downT<=0&&p.hang<=0){e.st='fire';e.t=0;e.fired=false;sfx('warn');emit('aim');return}}
 if(e.st==='wind'){if(e.t>=G.wind){e.st='atk';e.t=0;if(adx<G.reach+8&&Math.abs(dy)<12&&p.z<20){if(hurt(G.dmg,e.face)){burst(p.x,p.y-elev(p.x)-70,e.type==='tank'?'BOOM!':'OOF!',e.type==='tank','#ff6a8a')}}}return}
 if(e.st==='atk'){if(e.t>0.28){e.st='walk';e.t=0;e.cd=G.cd*rnd(0.8,1.3)}return}
 /* approach: only two guards press in at once, the rest circle at a distance */
 var want=e.type!=='guard'||attackers<2||e.cd<-1.5?G.reach-6:74,tx=p.x-sgn(dx||1)*want,ty=p.y+(e.type==='guard'&&want>40?(e.id%2?-14:14):0);
 var mvx=tx-e.x,mvy=ty-e.y;if(Math.abs(mvx)>4){e.x+=sgn(mvx)*G.spd*(wet()?CFG.flood:1)*dt;e.walk+=G.spd*dt}if(Math.abs(mvy)>3){e.y+=sgn(mvy)*G.spd*0.55*dt;e.walk+=20*dt}
 if(adx<G.reach+4&&Math.abs(dy)<10&&e.cd<=0&&p.downT<=0&&p.hang<=0&&(e.type!=='guard'||attackers<2)){e.st='wind';e.t=0}}
function blam(e){var p=M.p,hitP=Math.abs(p.y-e.y)<12&&(p.x-e.x)*e.face>0&&p.z<30&&p.downT<=0;M.fx.push({k:'blam',x:e.x+e.face*48,y:e.y-elev(e.x)-62,dir:e.face,t:0,life:0.4});shake(0.4);flash(0.5);sfx('crash');
 burst(e.x+e.face*60,e.y-elev(e.x)-70,'BLAM!',true,'#ffd23a');
 if(hitP){if(hurt(CFG.esc.fireDmg,e.face)){M.p.downT=0.9;M.p.vz=0;M.p.kb=e.face*140}}else emit('dodged')}

/* ---------- player input ---------- */
function attack(kind){var p=M.p;if(!p||M.st!=='run'||M.cine||p.downT>0||p.hang>0||p.hurtT>0.15)return false;
 if(kind==='atk'&&p.weapon){if(p.act)return false;var wk=p.weapon==='arm'?'club':p.weapon==='ext'?'spray':'cue';act(p,wk);p.uses--;p.sprayed=false;sfx(wk==='spray'?'puff':'kwhoosh');
  if(p.uses<=0){var w=p.weapon;p.weapon=null;emit('weaponGone',w);pop(p.x,p.y-elev(p.x)-112,w==='ext'?'EMPTY!':w==='cue'?'CUE SNAPPED!':'ARM BROKE!','#ff9ad8')}emit('weapon',{k:p.weapon,uses:p.uses});return true}
 if(p.z>0){if(kind==='kick'&&p.act!=='fkick'){act(p,'fkick');sfx('kwhoosh');return true}return false}
 if(p.act&&p.at<CFG.A[p.act].d*0.6)return false;
 if(kind==='atk'){var seq=['jab','cross','upper'],k=seq[p.chain%3];p.chain=p.chainT>0?p.chain+1:1;if(p.chain===1)k='jab';else k=seq[(p.chain-1)%3];p.chainT=CFG.combo+CFG.A[k].d;act(p,k);sfx('whiff');return true}
 if(kind==='kick'){var k2=p.chain>=3&&p.chainT>0?'heel':'hkick';p.chain=0;act(p,k2);sfx('kwhoosh');railKick();return true}
 return false}
function act(p,k){p.act=k;p.at=0;p.hit={}}
function jump(){var p=M.p;if(!p||M.st!=='run'||M.cine||p.z>0||p.downT>0||p.hang>0||p.act)return false;p.vz=CFG.jumpV*(wet()?0.85:1);p.z=0.1;sfx('whiff');if(wet())splashAt(p.x,p.y,8);return true}
function railKick(){if(M.stage!=='stairs')return;var p=M.p;M.chand.forEach(function(c){if(c.st!=='hang')return;if(Math.abs(p.x-c.rail)<44&&p.y<ST.ymin+24){c.st='fall';c.t=0;sfx('clang');burst(c.rail,ST.ymin-elev(c.rail)-30,'CRACK!',true,'#ffd23a');shake(0.3);emit('chandelier',c.x)}})}
function rage(){var p=M.p;if(!p||M.st!=='run'||M.cine||M.rage<CFG.rageMax||p.downT>0||p.hang>0)return false;M.rage=0;M.stats.rages++;flash(1);slowmo(0.6,0.3);sfx('rage');emit('rage',M.stage);
 if(M.stage==='roof'||M.stage==='deck'&&M.boss&&M.boss.st!=='ko'&&Math.abs(M.boss.x-p.x)<200){rageCombo();return true}
 /* brawl RAGE: a shockwave spin that knocks down everyone close */
 act(p,'heel');var n=0;M.foes.forEach(function(e){if(e.st!=='ko'&&Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<30){n++;hitFoe(e,26,true,sgn(e.x-p.x)||1,'RAGE!')}});
 M.fx.push({k:'ring',x:p.x,y:p.y-elev(p.x),t:0,life:0.5});add(CFG.pts.rage);return true}
/* RICHIE RAGE vs Escobar: a 3-hit cinematic combo, letterboxed, slow-mo and zoomed in. The 3rd hit launches him if it's the last of his health */
function rageCombo(){var p=M.p,e=M.boss;M.cine='combo';M.ct=0;M.combo={i:0,t:0};p.x=clamp(e.x-38*(sgn(e.x-p.x)||1),bounds().x0,M.stage==='roof'?M.r.edge-40:W-30);p.y=e.y;p.face=sgn(e.x-p.x)||1;e.st='hurt';e.t=0;emit('combo',0)}
function stepCombo(dt){var c=M.combo,p=M.p,e=M.boss;c.t+=dt;M.zoom=lerp(M.zoom,1.35,Math.min(1,dt*6));M.zx=(p.x+e.x)/2;M.zy=p.y-60;M.slow=Math.max(M.slow,0.2);
 var K=[['jab',8,'POW!'],['hkick',8,'CRACK!'],['upper',0,'KA-POW!']];
 if(c.i<3&&c.t>=0.32){var k=K[c.i];act(p,k[0]);var last=c.i===2,dmg=last?Math.max(28,Math.min(e.hp,46)):16;e.hp-=dmg;e.st='hurt';e.t=0;hitstop(0.14);shake(0.45);flash(last?1:0.6);
  burst(e.x,e.y-80,k[2],true,c.i===1?'#7dfcff':'#ffd23a');sfx('rageHit',1+c.i*0.3);pop(e.x,e.y-120,'+'+(150*(c.i+1)),'#ffd23a');add(150*(c.i+1));emit('combo',c.i+1);c.i++;c.t=0;
  if(last){M.cine='';M.zoom=1;if(e.hp<=0){e.hp=0;if(M.stage==='roof')launch(e);else ko(e,p.face,'rage')}else{e.st='knock';e.t=0;e.vx=p.face*160;e.vz=200}}}}
/* ---------- stage flows ---------- */
function finishStage(next,evt){if(M.st==='next')return;M.st='next';M.nextT=1.5;M.nextS=next;emit(evt||'cleared',{stage:M.stage,next:next})}
function stepNext(dt){if(M.st==='next'){M.nextT-=dt;M.fade=Math.min(1,M.fade+dt*1.2);if(M.nextT<=0){var n=M.nextS;start(n,true);emit('stage',n)}return true}return false}
function tank(x,y){var e=guard(x,y,{type:'tank',hp:CFG.tank.hp,max:CFG.tank.hp,id:77});return e}
function startWave(i){var w=M.waves[i],p=M.p;M.wave=i;M.go=false;
 var x0=w.flood?ST.len-W:clamp(p.x-W*0.3,0,ST.len-W);M.lock={x0:x0,x1:x0+W};
 if(w.tank){M.foes.push(tank(x0+W*0.78,196));M.boss=null;emit('tank');return}
 for(var j=0;j<w.n;j++){var right=j%2===0||w.flood,x=right?x0+W+24+j*34:x0-24-j*30;M.foes.push(guard(x,rnd(ST.ymin+6,ST.ymax-4),{face:right?-1:1,cd:rnd(0.6,1.6)}))}
 emit('wave',{i:i,n:w.n,flood:!!w.flood})}
function stairsFlow(dt){var p=M.p;if(stepNext(dt))return;if(M.go)M.goT=(M.goT||0)+dt;
 /* chandeliers */
 M.chand.forEach(function(c){c.sw+=dt;if(c.st==='fall'){c.t+=dt;if(c.t>=0.48){c.st='down';c.t=0;crash(c)}}});
 /* chief barking orders from the landing */
 var ch=M.chief;ch.t-=dt;if(ch.said>0)ch.said-=dt;var onScr=ch.x-M.cam>-40&&ch.x-M.cam<W+40;
 if(ch.t<=0&&onScr&&M.st==='run'&&!ch.gone&&!M.cine){var L=['GET HIM!','FLANK HIM, BOYS!','WHAT AM I PAYING YOU FOR?','TAKE HIM DOWN!','HE\u2019S ONE OLD MAN!'];ch.line=L[(M.chief.n=(M.chief.n||0)+1)%L.length];ch.said=2.2;ch.t=4.2;emit('order',ch.line)}
 if(M.flood.on)stepFlood(dt);
 if(M.cine==='shotgun'){topCine(dt);return}
 if(M.st!=='run')return;
 if(M.wave<0){startWave(0);return}
 var cur=M.waves[M.wave];
 if(!cur.done){if(!alive().length){cur.done=true;M.lock=null;emit('clear',M.wave);if(cur.flood)finishStage('climb','stairsDone');else{M.go=true;M.goT=0}}return}
 var nx=M.wave+1;if(nx>=M.waves.length)return;var w=M.waves[nx];
 if(!w.flood&&p.x>=w.tx)startWave(nx);
 else if(w.flood&&!M.top&&p.x>=ST.topX){M.top=true;M.go=false;M.cine='shotgun';M.ct=0;M.lock={x0:ST.len-W,x1:ST.len};p.act='';emit('escTop')}}
function crash(c){var y=196,n=0;shake(0.6);flash(0.9);slowmo(0.8,0.25);sfx('crash');burst(c.x,y-elev(c.x)-30,'CRASH!',true,'#ffd23a');M.stats.chand++;
 for(var i=0;i<30;i++)part(c.x+rnd(-30,30),y-elev(c.x)-10,rnd(-160,160),rnd(-220,-40),rnd(0.5,1.1),i%3?'rgba(220,250,255,.95)':'#ffd23a',rnd(1,2.4),520,'shard');
 M.foes.forEach(function(e){if(e.st!=='ko'&&Math.abs(e.x-c.x)<60){n++;if(e.type==='tank')hitFoe(e,40,true,sgn(e.x-c.x)||1,'CRASH!');else{add(CFG.pts.chand);ko(e,sgn(e.x-c.x)||1,'chand')}}});
 if(n)pop(c.x,y-elev(c.x)-120,n>1?'CHANDELIER x'+n+'!':'CHANDELIER K.O.!','#ffd23a');
 M.picks.push({k:'arm',x:c.x+20,y:204,taken:false});emit('crash',n)}
/* the top of the stairs: Escobar's gold shotgun misses, the aquarium goes, the hall floods */
function topCine(dt){var e=M.esc;M.ct+=dt;var t=M.ct;
 if(!M.cs0){M.cs0=1;e.st='talk';M.wait=true;emit('talk','escTop');return}
 if(t<1){e.st='aim';return}
 if(!M.cs1){M.cs1=1;e.st='fire';slowmo(1.6,0.18);flash(0.7);shake(0.5);sfx('crash');burst(e.x-40,ST.ymin-ST.rise-64,'BLAM!',true,'#ffd23a');M.fx.push({k:'pellets',x:e.x-44,y:ST.ymin-ST.rise-64,tx:M.p.x,ty:M.p.y-elev(M.p.x)-70,t:0,life:0.9});M.p.dodge=1.2;emit('dodge')}
 if(M.p.dodge>0)M.p.dodge-=dt;
 if(t>1.5&&M.aqua.st==='ok'){M.aqua.st='crack';M.aqua.t=0;sfx('clang');burst(ST.escX-120,60,'KRAK!',false,'#7dfcff')}
 if(t>2.3&&M.aqua.st==='crack'){M.aqua.st='burst';M.aqua.t=0;flash(1);shake(0.8);sfx('crash');burst(ST.escX-150,80,'SPLOOSH!',true,'#7dfcff');M.chief.gone=true;M.flood.on=true;M.flood.front=ST.escX-40;M.flood.t=0;emit('flood')}
 if(t>2.6)e.st='run';
 if(t>3.8&&!M.cs2){M.cs2=1;M.wait=true;emit('talk','flood')}
 if(t>3.9){M.cine='';startWave(M.waves.length-1)}}
function stepFlood(dt){var F=M.flood;F.t+=dt;var prev=F.front;F.front-=260*dt;F.L=Math.min(15,F.L+dt*9);
 M.foes.concat([M.p]).forEach(function(e){if(e.x<prev&&e.x>=F.front-10&&!e.swept){e.swept=1;if(e===M.p){e.kb=-80;splashAt(e.x,e.y,12)}else if(e.st!=='ko'){e.st='knock';e.t=0;e.vx=-110;e.vz=140;splashAt(e.x,e.y,12)}}});
 if(M.esc.st==='run')M.esc.x+=120*dt}
function stepSharks(dt){M.sharkT-=dt;var L=M.lock||{x0:M.cam,x1:M.cam+W};
 if(M.sharkT<=0&&M.sharks.length<3&&M.flood.front<L.x1-60){M.sharkT=rnd(2,3.4);var r=Math.random()<0.5;M.sharks.push({x:r?L.x1+60:L.x0-60,y:rnd(ST.ymin+4,ST.ymax),dir:r?-1:1,v:rnd(95,130),tum:0,bob:Math.random()*6})}
 M.sharks.forEach(function(s){s.x+=s.dir*s.v*dt;s.bob+=dt;if(s.tum>0)s.tum-=dt;if(Math.random()<dt*6)splashAt(s.x-s.dir*20,s.y,1);
  M.foes.forEach(function(e){if(e.st==='ko'||e.z>12||Math.abs(e.x-s.x)>26||Math.abs(e.y-s.y)>10)return;s.tum=0.5;M.stats.sharks++;add(CFG.pts.shark);burst(e.x,e.y-elev(e.x)-70,'BONK!',true,'#7dfcff');pop(e.x,e.y-elev(e.x)-110,'SHARK ASSIST +250','#7dfcff');
   if(e.type==='tank')hitFoe(e,30,true,s.dir,'BONK!');else ko(e,s.dir,'shark');emit('shark',e.type)});
  var p=M.p;if(p.inv<=0&&p.z<12&&Math.abs(p.x-s.x)<24&&Math.abs(p.y-s.y)<9&&p.downT<=0){p.kb=s.dir*150;p.inv=0.8;s.tum=0.5;burst(p.x,p.y-elev(p.x)-60,'BUMP!',false,'#7dfcff');splashAt(p.x,p.y,10);sfx('bump');emit('sharkBump')}});
 M.sharks=M.sharks.filter(function(s){return s.x>L.x0-120&&s.x<L.x1+120})}
/* roof */
function roofFlow(dt){var r=M.r,p=M.p,h=r.heli;if(stepNext(dt))return;h.ph+=dt;
 if(!h.away){var tx=clamp(p.x+70,80,r.edge+40);h.x+=(tx-h.x)*Math.min(1,dt*0.5);h.y=38+Math.sin(h.ph*1.7)*4}else{h.away+=dt;h.x-=90*dt;h.y-=40*dt}
 var sx=p.x+Math.sin(M.t*0.9)*26,sy=p.y;r.spot.x+=(sx-r.spot.x)*Math.min(1,dt*2.2);r.spot.y+=(sy-r.spot.y)*Math.min(1,dt*2.2);
 if(M.st==='run'&&!r.launched){r.washT-=dt;if(r.washT<=0){r.washOn=!r.washOn;r.washT=r.washOn?CFG.roof.wash.dur:CFG.roof.wash.every*rnd(0.8,1.2);if(r.washOn){sfx('kwhoosh');emit('wash')}}}else r.washOn=false;
 if(r.washOn&&Math.random()<dt*40)part(rnd(0,W),rnd(150,215),rnd(140,260),rnd(-20,20),rnd(0.4,0.8),Math.random()<0.5?'rgba(255,255,255,.5)':'rgba(255,190,150,.6)',rnd(1,2),0,'debris');
 if(M.cine==='launch')launchCine(dt)}
function launch(e){M.cine='launch';M.ct=0;e.st='fly';M.r.launched=true;M.r.from={x:e.x,y:e.y};slowmo(1.2,0.25);flash(1);shake(0.6);sfx('rageHit',1.6);burst(e.x,e.y-90,'KA-POW!',true,'#ffd23a');add(CFG.pts.esc);emit('launch')}
function launchCine(dt){var r=M.r,e=M.boss;M.ct+=dt;var t=M.ct,k=clamp(t/1.6,0,1),P=r.pool||{x:W*0.8,y:200};
 e.fx=lerp(r.from.x,P.x,k);e.fy=lerp(r.from.y-90,P.y,k)-Math.sin(k*Math.PI)*70;e.fs=lerp(1,0.32,k);e.frot=k*7;
 if(t>=1.6&&!r.splash){r.splash=0.01;shake(0.7);flash(0.6);sfx('crash');burst(P.x,P.y-30,'SPLASH!',true,'#7dfcff');for(var i=0;i<40;i++)part(P.x+rnd(-10,10),P.y,rnd(-90,90),rnd(-260,-90),rnd(0.6,1.3),i%2?'rgba(140,240,255,.95)':'#fff',rnd(1.2,3),420,'drop');emit('splash')}
 if(r.splash)r.splash+=dt;
 if(t>2.8&&!r.c1){r.c1=1;M.wait=true;emit('talk','splash')}
 if(t>2.9&&!r.c2){r.c2=1;r.ladder=0.01;emit('chiefEscape')}
 if(r.ladder){r.ladder+=dt;if(r.ladder>2.4&&!M.r.heli.away){M.r.heli.away=0.01;sfx('kwhoosh')}}
 if(t>7.4&&!r.c3){r.c3=1;M.wait=true;emit('talk','chiefGone')}
 if(t>7.5){M.cine='';finishStage('bay','roofDone')}}
/* deck */
function deckFlow(dt){var d=M.d;if(stepNext(dt))return;d.scroll+=180*dt;
 if(Math.random()<dt*20)part(rnd(-10,W*0.3),rnd(214,226),rnd(-260,-160),rnd(-40,0),rnd(0.3,0.6),'rgba(220,250,255,.7)',rnd(1,2.5),200,'drop');
 if(M.st!=='run')return;
 if(d.phase==='guards'&&!alive().length){d.phase='boss';M.boss=escobar(W+40,196,CFG.esc.hp.deck);M.boss.fireCd=3;M.foes.push(M.boss);M.wait=true;emit('talk','escDeck')}
 if(d.phase==='boss'&&M.boss.st==='ko'&&!d.koT){d.koT=0.01;M.stats.escKO=1}
 if(d.koT){d.koT+=dt;if(d.koT>2.2)finishStage('finale','deckDone')}}
/* ---------- climb ---------- */
function stepClimb(dt){var c=M.c,CL=CFG.climb,run=M.st==='run';if(stepNext(dt))return;
 if(M.st==='lose'){M.loseT-=dt;if(M.loseT<=0){M.st='ready';emit('lose','climb')}return}
 var up=run?(AUTO?1:clamp(-IN.y,0,1)):0,mx=run?(AUTO?autoClimb():IN.x):0;
 if(c.hurtT>0)c.hurtT-=dt;if(c.inv>0)c.inv-=dt;if(c.lungeCd>0)c.lungeCd-=dt;
 if(c.slip>0){c.slip-=dt;c.h=Math.max(0,c.h-110*dt);up=0}
 if(c.lunge>0){c.lunge-=dt;c.h+=CL.lunge/0.25*dt}
 c.h=Math.min(CL.len,c.h+up*CL.spd*dt);if(up>0.1)c.climbT+=dt*up;
 c.x=clamp(c.x+mx*78*dt,W*0.24,W*0.76);
 c.rain.forEach(function(r){r.y+=dt*1.6*r.s;if(r.y>1)r.y-=1});
 if(run){c.tileT-=dt;if(c.tileT<=0&&c.h<CL.len-60){c.tileT=CL.tile.every*rnd(0.7,1.2);var tx=Math.random()<0.55?c.x+rnd(-10,10):rnd(W*0.26,W*0.74);c.tiles.push({x:clamp(tx,W*0.24,W*0.76),y:-24,warn:CL.tile.warn,r:Math.random()*6,vr:rnd(-8,8)});sfx('warn')}}
 var ry=H*0.6;
 c.tiles.forEach(function(t){if(t.warn>0){t.warn-=dt;return}t.y+=CL.tile.v*dt;t.r+=t.vr*dt;
  if(!t.hit&&c.inv<=0&&Math.abs(t.x-c.x)<17&&t.y>ry-104&&t.y<ry-20){t.hit=true;M.hp-=CL.tile.dmg;c.hurtT=0.4;c.inv=0.8;c.slip=0.45;M.stats.tiles++;shake(0.3);sfx('thud');burst(c.x,ry-90,'BONK!',false,'#ff9a6a');emit('tile',M.hp);
   for(var i=0;i<10;i++)part(t.x,t.y,rnd(-90,90),rnd(-120,20),rnd(0.4,0.8),'#d8704a',rnd(1.5,3),500,'shard');
   if(M.hp<=0){M.lives--;M.hp=CFG.hp;c.slip=1.4;emit('down',M.lives);if(M.lives<0){M.lives=0;M.st='lose';M.loseT=1.2}}}});
 c.tiles=c.tiles.filter(function(t){return t.y<H+40&&!t.hit});
 if(c.h>=CL.len&&run){add(CFG.pts.climb);pop(W/2,60,'ROOF! +'+CFG.pts.climb);finishStage('roof','climbDone')}}
function autoClimb(){var c=M.c,d=0;c.tiles.forEach(function(t){if(Math.abs(t.x-c.x)<30)d=t.x>c.x?-1:t.x<c.x?1:(c.x>W/2?-1:1)});if(d===0){var cx=W/2;d=Math.abs(cx-c.x)>14?sgn(cx-c.x)*0.5:0}
 if(c.lungeCd<=0&&!c.tiles.some(function(t){return Math.abs(t.x-c.x)<34}))press('jump');return d}
/* ---------- bay ---------- */
var PXF=0.3;
function stepBay(dt){var b=M.b,B=CFG.bay,run=M.st==='run';if(stepNext(dt))return;
 if(M.st==='lose'){M.loseT-=dt;if(M.loseT<=0){M.st='ready';emit('lose','bay')}return}
 b.workT-=dt;if(b.workT<=0){b.workT=rnd(0.5,1.1);b.works.push({x:rnd(0.08,0.92)*W,y:H*0.5,vy:-rnd(110,150),fuse:rnd(0.7,1.1),c:['#ff3ad8','#29d6ff','#ffd23a','#9dff6a','#ff6a4a'][Math.floor(Math.random()*5)],t:0})}
 b.works.forEach(function(f){f.t+=dt;if(!f.done){f.y+=f.vy*dt;if(f.t>=f.fuse){f.done=true;for(var i=0;i<34;i++){var a=i/34*Math.PI*2,v=rnd(40,80);part(f.x,f.y,Math.cos(a)*v,Math.sin(a)*v,rnd(0.9,1.5),f.c,rnd(1,1.8),30,'fw')}if(Math.random()<0.4)sfx('puff')}}});
 b.works=b.works.filter(function(f){return !f.done});
 if(!run&&!b.final)return;
 if(b.hurtT>0)b.hurtT-=dt;if(b.jumpCd>0)b.jumpCd-=dt;if(b.trickT>0)b.trickT-=dt;
 var my=IN.y;if(AUTO&&run)my=autoRide();if(b.final)my=clamp((186-b.y)/10,-1,1);
 b.y=clamp(b.y+my*72*dt,B.ymin,B.ymax);
 var spd=B.spd+(b.boost>0?B.boost:0)-(b.hurtT>0?70:0);if(b.boost>0)b.boost-=dt;b.meter=Math.min(1,b.meter+0.07*dt);
 var bs=B.spd+16+(b.gap>300?-45:b.gap<70?40:0);if(b.final)bs=B.spd+20;
 var pd=b.d;b.d+=spd*dt;b.gap=clamp(b.gap+(bs-spd)*dt,30,380);
 if(b.z>0||b.vz>0){b.vz-=560*dt;b.z=Math.max(0,b.z+b.vz*dt);if(b.flip>0)b.flip=Math.min(1,b.flip+dt*1.3);if(b.z===0){b.vz=0;b.flip=0;splashAt(W*PXF,b.y,12)}}
 if(Math.random()<dt*(b.z>0?6:40))part(W*PXF-30,b.y-4,rnd(-200,-90),rnd(-70,-20),rnd(0.3,0.7),Math.random()<0.5?'rgba(220,250,255,.85)':'rgba(120,230,255,.7)',rnd(1.2,2.8),300,'drop');
 b.wakes.forEach(function(w){if(!w.used&&pd<w.x&&b.d>=w.x&&b.z<40){w.used=true;b.vz=300;b.z=Math.max(b.z,0.1);b.z=0.1;M.stats.airs++;add(B.airPts);b.meter=Math.min(1,b.meter+0.3);var fl=b.trickT>0;
   if(fl){b.flip=0.01;M.stats.flips++;add(B.flipPts);burst(W*PXF,b.y-80,'FLIP!',true,'#ff3ad8');pop(W*PXF,b.y-110,'FLIP +'+(B.airPts+B.flipPts))}else{burst(W*PXF,b.y-80,'BIG AIR!',true,'#7dfcff');pop(W*PXF,b.y-110,'AIR +'+B.airPts)}
   slowmo(0.45,0.35);sfx('boost');emit('air',fl)}});
 b.obs.forEach(function(o){if(o.hit||Math.abs(o.x-b.d)>14||Math.abs(o.y-b.y)>10||b.z>8||b.final)return;o.hit=true;M.hp-=10;b.hurtT=0.8;M.stats.crashes++;shake(0.4);sfx('crash');splashAt(W*PXF,b.y,16,true);burst(W*PXF+10,b.y-60,'SPLASH!',true,'#7dfcff');emit('crash');
  if(M.hp<=0){M.lives--;M.hp=CFG.hp;emit('down',M.lives);if(M.lives<0){M.lives=0;M.st='lose';M.loseT=1}}});
 if(!b.final&&b.d>=B.len){b.final=true;emit('ramp')}
 if(b.final&&!b.leap&&b.d>=b.ramp){b.leap=true;b.vz=360;b.z=0.1;slowmo(1.4,0.22);flash(0.8);burst(W*PXF,b.y-90,'GERONIMO!',true,'#ffd23a');sfx('kwhoosh');emit('leap')}
 if(b.leap){b.finT+=dt;if(b.finT>1.2){add(CFG.pts.bay);finishStage('deck','bayDone')}}}
function autoRide(){var b=M.b,thr=null;b.obs.forEach(function(o){var ahead=o.x-b.d;if(!o.hit&&ahead>-4&&ahead<150&&Math.abs(o.y-b.y)<18&&(!thr||ahead<thr.a))thr={a:ahead,o:o}});
 var nextW=b.wakes.filter(function(w){return !w.used&&w.x-b.d>0&&w.x-b.d<14})[0];if(nextW&&b.z===0)press('jump');
 if(b.meter>=0.5&&b.boost<=0&&b.gap>90)press('boost');
 if(!thr)return clamp((184-b.y)/30,-0.4,0.4);
 if(thr.a<26&&b.z===0&&b.jumpCd<=0){press('jump');return 0}
 var up=thr.o.y-CFG.bay.ymin,dn=CFG.bay.ymax-thr.o.y;return thr.o.y>b.y?(up>22?-1:1):(dn>22?1:-1)}
/* ---------- finale ---------- */
function stepFinale(dt){var f=M.f;f.t+=dt;var t=f.t;
 if(f.ph==='plane'){var X0=W*0.76;if(t<2){f.px=lerp(W+150,X0,1-Math.pow(1-t/2,2));f.py=200}else if(t<3.3){f.px=X0;f.py=200}else if(t<6.4){f.px=X0+(t-3.3)*12;f.py=200-(t-3.3)*22}else{f.px=X0+37+(t-6.4)*(t-6.4)*90+(t-6.4)*20;f.py=132-(t-6.4)*40}
  f.tx=f.px-50;f.ty=f.py-22;f.shake=t>5.2&&t<6.4;
  if(t>1.2&&!f.c1){f.c1=1;M.wait=true;emit('talk','chiefPlane')}
  if(t>2.8&&!f.c2){f.c2=1;sfx('kwhoosh');emit('grab')}
  if(t>5.2&&!f.c3){f.c3=1;shake(0.5);burst(f.tx,f.ty+20,'WHOA!',true,'#ff9ad8');emit('shaken')}
  if(t>6.4&&!f.c4){f.c4=1;f.fall=0.01;f.fx=f.tx;f.fy=f.ty}
  if(f.fall){f.fall+=dt;if(f.fall>0.9&&!f.sp){f.sp=1;splashAt(f.fx,212,30,true);shake(0.5);sfx('crash');burst(f.fx,176,'SPLASH!',true,'#7dfcff');emit('drop')}}
  if(t>7.6)M.fade=Math.min(1,(t-7.6)/0.8);
  if(t>8.4){f.ph='sunrise';f.t=0;M.fade=1}return}
 M.fade=Math.max(0,1-t/1);
 if(t>2.4&&!f.badge){f.badge=true;sfx('chime');burst(W*0.42,140,'!',false,'#ffd23a');emit('badge')}
 if(t>3.4&&!f.c5){f.c5=1;M.wait=true;emit('talk','badge')}
 if(t>3.6&&!f.c6){f.c6=1;M.st='done';emit('end',stats())}}
function stats(){var s=M.stats;return {score:M.score,kos:s.kos,chand:s.chand,sharks:s.sharks,weapons:s.weapons,rages:s.rages,airs:s.airs,flips:s.flips,crashes:s.crashes,tiles:s.tiles,retries:s.retries,time:s.time,maxCombo:s.maxCombo,lives:M.lives}}
/* ---------- AUTO (auto fight / auto climb / auto ride) ---------- */
function autoFight(){var p=M.p,a={x:0,y:0},B=bounds();if(p.act||p.downT>0||p.hang>0)return a;
 if(M.rage>=CFG.rageMax&&alive().length&&(M.stage!=='stairs'||alive().length>1||alive()[0].type==='tank')){var bb=M.boss;if(!bb||Math.abs(bb.x-p.x)<200)if(rage())return a}
 if(M.stage==='roof'&&p.x>M.r.edge-60&&(M.r.washOn||M.r.washT<0.6))return {x:-1,y:0};
 var fs=alive(),t=null,bd=1e9;fs.forEach(function(e){var d=Math.abs(e.x-p.x)+Math.abs(e.y-p.y)*2;if(d<bd){bd=d;t=e}});
 if(!t){if(M.stage==='stairs'&&M.go&&!M.cine){var k=nearPick(160);if(k)return toward(k.x,k.y,4);return {x:1,y:clamp(((ST.ymin+ST.ymax)/2-p.y)/10,-1,1)}}return a}
 /* drop a chandelier on a crowd */
 if(M.stage==='stairs'){var c=M.chand.filter(function(c){return c.st==='hang'&&fs.filter(function(e){return Math.abs(e.x-c.x)<60}).length>=2&&c.rail>B.x0&&c.rail<B.x1})[0];
  if(c){if(Math.abs(p.x-c.rail)<30&&p.y<ST.ymin+20){p.face=sgn(c.x-p.x)||1;press('kick');return a}return toward(c.rail,ST.ymin+4,3)}
  if(!p.weapon){var k2=nearPick(90);if(k2&&bd>70)return toward(k2.x,k2.y,4)}}
 /* Escobar is aiming: step out of his lane */
 if(t.type==='esc'&&t.st==='fire'&&t.t<CFG.esc.fireAim+0.05&&Math.abs(p.y-t.y)<16){a.y=t.y>(B.y0+B.y1)/2?-1:1;if(p.y<=B.y0+2)a.y=1;if(p.y>=B.y1-2)a.y=-1;return a}
 var want=p.weapon==='cue'?66:p.weapon==='ext'?56:p.weapon==='arm'?44:t.type==='tank'?40:30,dx=t.x-p.x,dy=t.y-p.y;
 if(Math.abs(dy)>4)a.y=clamp(dy/8,-1,1);
 if(Math.abs(dx)>want)a.x=sgn(dx);else if(Math.abs(dx)<12)a.x=-sgn(dx||1)*0.7;
 if(M.stage==='roof'&&a.x>0&&p.x>M.r.edge-50)a.x=0;
 if(Math.abs(dx)<=want+8&&Math.abs(dy)<9){p.face=sgn(dx)||p.face;M.autoN=(M.autoN||0)+1;if(!p.weapon&&M.autoN%4===0)press('kick');else press('atk')}
 return a}
function nearPick(r){var p=M.p,B=bounds();return (M.picks||[]).filter(function(k){return !k.taken&&Math.abs(k.x-p.x)<r&&k.x>B.x0&&k.x<B.x1})[0]}
function toward(x,y,tol){var p=M.p;return {x:Math.abs(x-p.x)>tol?sgn(x-p.x):0,y:Math.abs(y-p.y)>3?clamp((y-p.y)/8,-1,1):0}}
/* ---------- input ---------- */
function move(x,y){IN.x=clamp(x||0,-1,1);IN.y=clamp(y||0,-1,1)}
function press(k){if(!M)return false;var s=M.stage;
 if(k==='rage')return s==='stairs'||s==='roof'||s==='deck'?rage():false;
 if(s==='climb'){if(k==='jump'&&M.st==='run'){var c=M.c;if(c.lungeCd>0||c.slip>0)return false;c.lunge=0.25;c.lungeCd=1.1;sfx('whiff');emit('lunge');return true}return false}
 if(s==='bay'){var b=M.b;if(M.st!=='run'||b.final)return false;
  if(k==='jump'||k==='atk'){if(b.z>0||b.jumpCd>0)return false;b.vz=200;b.z=0.1;b.jumpCd=0.55;b.trickT=0.45;sfx('whiff');return true}
  if(k==='boost'||k==='kick'){if(b.meter<0.5||b.boost>0)return false;b.meter-=0.5;b.boost=1.6;sfx('boost');burst(W*PXF-30,b.y-40,'BOOST!',false,'#29d6ff');emit('boost');return true}return false}
 if(s==='finale')return false;
 if(k==='jump')return jump();return attack(k)}
function setAuto(b){AUTO=!!b;emit('auto',AUTO)}

/* ---------- render ---------- */
var SF={r:1,esc:-1,tank:-1,chief:-1,guard:1,heli:-1,seaplane:-1,boat:1,yacht:1,shark:-1};
function drawSpr(g,k,x,y,face,base,sc,rot,al){var im=SPR[k],m=META[k];if(!im||!m)return false;sc=sc||1;var w=m[0]/2*sc,h=m[1]/2*sc,ax=m[2]/2*sc,fl=(face||base||1)!==(base||1);
 g.save();g.translate(x,y);if(rot)g.rotate(rot);if(fl)g.scale(-1,1);if(al!=null)g.globalAlpha*=al;g.drawImage(im,-ax,-h,w,h);g.restore();return true}
function cover(g,k,ox,oy,sc){var im=SPR[k];if(!im)return false;g.drawImage(im,ox,oy,im.width/2*sc,im.height/2*sc);return true}
function fig(g,x,y,h,c,face){g.fillStyle=c;g.fillRect(x-h*0.13,y-h*0.78,h*0.26,h*0.5);g.fillStyle='#222';g.fillRect(x-h*0.12,y-h*0.3,h*0.24,h*0.3);g.fillStyle='#d9a37a';g.beginPath();g.arc(x,y-h*0.88,h*0.11,0,7);g.fill()}
function shadow(g,x,y,r,a){g.fillStyle='rgba(0,0,0,'+(a||0.35)+')';g.beginPath();g.ellipse(x,y,r,r*0.28,0,0,7);g.fill()}
function richieKey(p){if(p.hang>0)return 'l6-r-hang';if(p.downT>0)return 'l6-r-down';if(p.hurtT>0||p.dodge>0)return 'l6-r-hurt';
 if(p.act){var m={jab:'jab',cross:'cross',upper:'upper',hkick:'hkick',heel:'heel',fkick:'fkick',club:'club',spray:'spray',cue:'cue'};return 'l6-r-'+m[p.act]}
 if(p.z>0)return 'l6-r-walk-1';if(p.moving)return 'l6-r-walk-'+(Math.floor(p.walk/14)%2);return 'l6-r-guard'}
function foeKey(e){var t=e.type;if(t==='guard'){if(e.st==='ko')return 'l5-guard-down';if(e.st==='atk'||e.st==='wind'&&e.t>0.2)return 'l5-guard-punch';if(e.st==='knock'&&e.z>0)return 'l5-guard-run';return 'l5-guard-walk-'+(Math.floor(e.walk/12)%2)}
 var pre=t==='tank'?'l6-tank-':'l6-esc-';if(e.st==='ko')return pre+'down';if(e.st==='hurt'||e.st==='knock'||e.st==='stun'||e.st==='fly')return pre+'hurt';
 if(t==='esc'&&e.st==='fire')return pre+'fire';if(e.st==='atk')return pre+'punch';if(e.st==='wind')return t==='tank'?pre+'wind':pre+'punch';
 return Math.floor(e.walk/14)%2&&e.walk>0?pre+'walk':pre+'idle'}
function stars(g,x,y,t){for(var i=0;i<3;i++){var a=t*4+i*2.1;g.fillStyle=i%2?'#ffd23a':'#fff';g.font='bold 9px monospace';g.textAlign='center';g.fillText('\u2605',x+Math.cos(a)*12,y+Math.sin(a)*4)}}
/* draw a brawler; sx,sy = screen feet */
function drawBody(g,e,sx,sy,isP){var z=e.z||0,base,k;
 shadow(g,sx,sy,e.type==='tank'?26:18,0.35);
 if(isP){k=richieKey(e);base=SF.r;
  if(M.slow>0&&e.act){g.save();g.globalCompositeOperation='lighter';for(var i=2;i>=1;i--)drawSpr(g,k,sx-e.face*i*7,sy-z,e.face,base,1,0,0.18);g.restore()}
  if(e.inv>0&&e.downT<=0&&Math.floor(M.t*16)%2)g.globalAlpha=0.55;
  if(!drawSpr(g,k,sx,sy-z,e.face,base))fig(g,sx,sy-z,100,'#f4f4f4');g.globalAlpha=1;
  if(e.weapon&&!e.act){var wk='l6-'+e.weapon;g.save();if(e.weapon==='cue')drawSpr(g,wk,sx+e.face*14,sy-z-52,e.face,1,0.55,-e.face*0.9);else drawSpr(g,wk,sx+e.face*20,sy-z-46,e.face,1,0.8);g.restore()}
  return}
 k=foeKey(e);base=e.type==='guard'?SF.guard:SF[e.type];var rot=0;if(e.st==='knock'&&e.type==='guard'&&e.z>0)rot=-e.face*0.5;
 var face=e.st==='ko'&&e.type==='guard'?-e.face:e.face;
 if(e.st==='stun'){g.save();g.filter='brightness(1.35) saturate(0.4)'}
 if(!drawSpr(g,k,sx,sy-z,face,base,1,rot))fig(g,sx,sy-z,e.type==='tank'?118:90,e.type==='esc'?'#f2f2f2':'#222');
 if(e.st==='stun')g.restore();
 var top=sy-z-(e.type==='tank'?122:e.type==='esc'?110:96);
 if(e.st==='ko'){stars(g,sx,sy-26,M.t);if(Math.floor(M.t*2)%2){g.fillStyle='#fff';g.font='bold 8px monospace';g.fillText('z',sx+18,sy-36-(M.t*8%10))}}
 else if(e.st==='stun'){stars(g,sx,top+4,M.t);g.fillStyle='#fff';g.font='bold 10px monospace';g.textAlign='center';g.fillText('?!',sx,top-6)}
 else if(e.st==='wind'||e.type==='esc'&&e.st==='fire'&&e.t<CFG.esc.fireAim){g.fillStyle=Math.floor(M.t*10)%2?'#ff3a5a':'#ffd23a';g.font='bold 13px monospace';g.textAlign='center';g.fillText('!',sx,top)}
 if(e.type!=='guard'&&e.st!=='ko'&&e.hp<e.max){g.fillStyle='rgba(0,0,0,.5)';g.fillRect(sx-18,top+6,36,3);g.fillStyle=e.type==='tank'?'#ff9a3a':'#ffd23a';g.fillRect(sx-18,top+6,36*Math.max(0,e.hp)/e.max,3)}}
function water(g,x0,x1,y,L,t,a){/* knee-deep water sheet with a moving highlight */
 var gr=g.createLinearGradient(0,y-L,0,y+20);gr.addColorStop(0,'rgba(90,230,255,'+(0.5*a)+')');gr.addColorStop(1,'rgba(20,120,190,'+(0.75*a)+')');g.fillStyle=gr;g.fillRect(x0,y-L,x1-x0,H-(y-L));
 g.strokeStyle='rgba(220,255,255,'+(0.8*a)+')';g.lineWidth=1.2;g.beginPath();for(var x=x0;x<=x1;x+=6){var yy=y-L+Math.sin(x*0.08+t*5)*1.5;x===x0?g.moveTo(x,yy):g.lineTo(x,yy)}g.stroke()}
function rain(g,list,a,ang,len,x0,x1,y0,y1){g.strokeStyle='rgba(200,220,255,'+a+')';g.lineWidth=0.7;g.beginPath();list.forEach(function(r){var x=x0+r.x*(x1-x0),y=y0+((r.y+M.t*1.4*r.s)%1)*(y1-y0);g.moveTo(x,y);g.lineTo(x-ang*len,y+len)});g.stroke()}
function bolt(g,x0,y0,h){if(!M.bolt)return;var b=M.bolt,x=x0+b.x*W;g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(220,230,255,'+(1-b.t/0.35)+')';g.lineWidth=2;g.shadowColor='#9ab8ff';g.shadowBlur=12;g.beginPath();g.moveTo(x,y0);b.seg.forEach(function(s){g.lineTo(x+s[0]*W,y0+s[1]*h)});g.stroke();g.restore()}
function vignette(g,a){var gr=g.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,W*0.7);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,10,'+a+')');g.fillStyle=gr;g.fillRect(0,0,W,H)}

function renderStairs(g){var cam=M.cam,cy=M.camY,im=SPR['l6-hall-far'];
 /* layer 1: the hall (rain windows, white pillars, the curved aquarium) */
 var k=1.32,lw=400*k,lh=225*k,fx=-(cam/(ST.len-W))*(lw-W)*1,fy=-34+cy*0.42;M.aq={x:fx+0.66*lw,y:fy+0.03*lh,w:0.3*lw,h:0.3*lh};
 if(im)g.drawImage(im,fx,fy,lw,lh);else{g.fillStyle='#2a1838';g.fillRect(0,0,W,H)}
 /* lightning through the windows + rain outside */
 g.save();g.beginPath();g.rect(fx,fy,lw*0.55,lh*0.6);g.clip();rain(g,M.rain,0.25,0.25,9,fx,fx+lw*0.55,fy,fy+lh*0.6);if(M.rflash>0){g.fillStyle='rgba(210,220,255,'+(M.rflash*0.45)+')';g.fillRect(fx,fy,lw*0.55,lh*0.6)}g.restore();
 /* aquarium glow, cracks, the burst */
 var A=M.aq,acx=A.x+A.w/2,acy=A.y+A.h/2;g.save();g.globalCompositeOperation='lighter';var gl=g.createRadialGradient(acx,acy,4,acx,acy,A.w*0.8);gl.addColorStop(0,'rgba(60,200,255,'+(M.aqua.st==='burst'?0.08:0.22+Math.sin(M.t*2)*0.05)+')');gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(acx-A.w,acy-A.w,A.w*2,A.w*2);g.restore();
 if(M.aqua.st!=='ok'){M.aqua.t+=1/60;g.save();g.beginPath();g.ellipse(acx,acy,A.w*0.5,A.h*0.5,0,0,7);g.clip();
  if(M.aqua.st==='burst'){var dk=Math.min(0.5,M.flood.t*0.25);g.fillStyle='rgba(8,16,36,'+dk+')';g.fillRect(A.x,A.y+A.h*(1-Math.min(1,M.flood.t/2.5)),A.w,A.h)}
  g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1;g.beginPath();var cx2=A.x+A.w*0.4,cy2=A.y+A.h*0.6;for(var i=0;i<10;i++){var a=i*0.63+0.2,l1=A.w*(0.18+((i*37)%10)/30);g.moveTo(cx2,cy2);var mx=cx2+Math.cos(a)*l1*0.5+((i%3)-1)*3,my=cy2+Math.sin(a)*l1*0.35;g.lineTo(mx,my);g.lineTo(cx2+Math.cos(a+0.1)*l1,cy2+Math.sin(a+0.1)*l1*0.7)}g.stroke();g.restore()}
 if(M.aqua.st==='burst'){var ft=M.flood.t;if(ft<3.2){var k3=1-ft/3.2,ww=A.w*0.42*k3+6,tx0=A.x+A.w*0.4,ty0=A.y+A.h*0.62,by=ST.ymin-ST.rise+cy;
   var col=g.createLinearGradient(0,ty0,0,by+40);col.addColorStop(0,'rgba(150,240,255,.85)');col.addColorStop(1,'rgba(40,160,230,.75)');g.fillStyle=col;g.beginPath();g.moveTo(tx0-ww*0.3,ty0);
   for(var yy=ty0;yy<=by+40;yy+=6)g.lineTo(tx0-ww*0.5-(yy-ty0)*0.25+Math.sin(yy*0.2+M.t*14)*2,yy);for(var yy2=by+40;yy2>=ty0;yy2-=6)g.lineTo(tx0+ww*0.5+(yy2-ty0)*0.12+Math.sin(yy2*0.25+M.t*12)*2,yy2);g.closePath();g.fill();
   g.fillStyle='rgba(255,255,255,.75)';for(var j=0;j<10;j++){var fy=ty0+((j*23+M.t*260)%(by+40-ty0));g.fillRect(tx0-ww*0.4+((j*53)%10)/10*ww*0.8,fy,2,7)}
   g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(tx0,by+38,ww*0.9,6,0,0,7);g.fill()}}
 /* layer 2: the marble staircase */
 var x0=Math.floor(cam/18)*18,pe=-1;for(var x=x0;x<cam+W+18;x+=18){var e=elev(x+1),top=ST.ymin-10-e+cy,sx=x-cam;
  var gr=g.createLinearGradient(0,top,0,top+60);gr.addColorStop(0,'#f2eef6');gr.addColorStop(1,'#9c90b4');g.fillStyle=gr;g.fillRect(sx,top,19,ST.ymax+12-ST.ymin);
  g.fillStyle='#3a2c4c';g.fillRect(sx,top+(ST.ymax+12-ST.ymin),19,H);g.fillStyle='rgba(255,60,200,.35)';g.fillRect(sx,top+(ST.ymax+12-ST.ymin),19,2);
  if(pe>=0&&e!==pe){g.fillStyle='rgba(60,40,80,.55)';g.fillRect(sx-1,top,2,ST.ymax+12-ST.ymin);g.fillStyle='rgba(255,255,255,.8)';g.fillRect(sx,top,19,1)}pe=e}
 /* neon floor reflections */
 g.save();g.globalCompositeOperation='lighter';[[0.2,'rgba(255,58,216,.10)'],[0.7,'rgba(41,214,255,.10)']].forEach(function(r,i){var rx=((r[0]*ST.len-cam*1)%(W+200))-100;g.fillStyle=r[1];g.fillRect(rx,ST.ymin-elev(rx+cam)+cy-6,60,60)});g.restore();
 /* the chief + Escobar on the landing (behind the rail) */
 var ch=M.chief;if(!ch.gone){var csx=ch.x-cam,csy=ST.ymin-14-ST.rise+cy;drawSpr(g,ch.said>0?'l6-chief-point':'l6-chief-cross',csx,csy,-1,SF.chief,0.92);if(ch.said>0)bubble(g,csx-10,csy-100,ch.line)}
 var es=M.esc;if(es.st!=='gone'){var esx=es.x-cam,esy=ST.ymin-12-ST.rise+cy,ek=es.st==='aim'||es.st==='fire'?'l6-esc-fire':es.st==='run'?'l6-esc-walk':'l6-esc-idle';if(esx<W+80)drawSpr(g,ek,esx,esy,es.st==='run'?1:-1,SF.esc)}
 /* wrought-iron rail + white posts along the back edge */
 var rim=SPR['l6-rail'];if(rim){var rw=406;for(var x2=Math.floor(cam/8)*8;x2<cam+W+8;x2+=8){var by=ST.ymin-6-elev(x2+1)+cy,srcX=((x2%rw)+rw)%rw*2;g.drawImage(rim,srcX,0,16,96,x2-cam,by-48,8.5,48)}}
 /* rail kick hints */
 M.chand.forEach(function(c){if(c.st!=='hang')return;var rx=c.rail-cam,ry=ST.ymin-elev(c.rail)+cy-40;if(rx<-20||rx>W+20)return;var near=Math.abs(M.p.x-c.rail)<60;g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,210,58,'+(near?0.35+Math.sin(M.t*8)*0.15:0.12)+')';g.beginPath();g.ellipse(rx,ry+20,16,22,0,0,7);g.fill();g.restore();
  if(near){g.font='bold 9px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#1a0830';g.strokeText('KICK!',rx,ry-6-Math.abs(Math.sin(M.t*6))*3);g.fillStyle='#ffd23a';g.fillText('KICK!',rx,ry-6-Math.abs(Math.sin(M.t*6))*3)}});
 /* chandeliers (hanging / falling / smashed) */
 M.chand.forEach(function(c){var sx=c.x-cam;if(sx<-80||sx>W+80)return;var hy=92-elev(c.x)*0.7+cy*0.7,floorY=200-elev(c.x)+cy;
  if(c.st==='hang'){g.strokeStyle='#8a7440';g.lineWidth=1;g.beginPath();g.moveTo(sx,-4);g.lineTo(sx+Math.sin(c.sw)*2,hy-70);g.stroke();drawSpr(g,'l6-chandelier',sx+Math.sin(c.sw)*2,hy,1,1,0.85,Math.sin(c.sw)*0.03);
   g.save();g.globalCompositeOperation='lighter';var l=g.createRadialGradient(sx,hy-30,2,sx,hy-30,60);l.addColorStop(0,'rgba(255,220,140,.35)');l.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=l;g.fillRect(sx-60,hy-90,120,120);g.restore()}
  else if(c.st==='fall'){var k2=c.t/0.48,yy=lerp(hy,floorY,k2*k2);shadow(g,sx,floorY,30*k2+8,0.5);drawSpr(g,'l6-chandelier',sx,yy,1,1,0.85,0.2*k2)}
  else drawSpr(g,'l6-chandelier',sx,floorY+4,1,1,0.85,0.5,0.85)});
 /* pickups */
 (M.picks||[]).forEach(function(k){if(k.taken)return;var sx=k.x-cam,sy=k.y-elev(k.x)+cy;pickup(g,k,sx,sy)});
 var F=M.flood;if(F.on){var fs0=F.front-cam;g.save();for(var x4=Math.max(fs0,Math.floor(cam/18)*18-cam);x4<W;x4+=18){var e4=elev(x4+cam+1),ty4=ST.ymin-10-e4+cy;var wg=g.createLinearGradient(0,ty4,0,ty4+70);wg.addColorStop(0,'rgba(110,230,255,.42)');wg.addColorStop(1,'rgba(20,110,190,.55)');g.fillStyle=wg;g.fillRect(x4,ty4+3,18.5,H)}
  g.strokeStyle='rgba(230,255,255,.55)';g.lineWidth=1;g.beginPath();for(var k5=0;k5<14;k5++){var rx5=((k5*71+M.t*30)%(W+40))-20;if(rx5<fs0)continue;var ry5=ST.ymin+8+((k5*29)%46)-elev(rx5+cam)+cy;g.moveTo(rx5,ry5);g.lineTo(rx5+10,ry5)}g.stroke();g.restore()}
 /* the fighters, sorted by depth */
 var ents=M.foes.map(function(e){return [e,0]}).concat([[M.p,1]]).concat(M.sharks.map(function(s){return [s,2]}));ents.sort(function(a,b){return a[0].y-b[0].y});
 ents.forEach(function(it){var e=it[0],sx=e.x-cam,sy=e.y-elev(e.x)+cy;
  if(it[1]===2){var bob=Math.sin(e.bob*6)*2,rot=e.tum>0?e.tum*8:0;drawSpr(g,e.tum>0?'l6-shark-1':'l6-shark-0',sx,sy+10+bob,e.dir,SF.shark,0.75,rot);g.fillStyle='rgba(90,210,250,.55)';g.beginPath();g.ellipse(sx,sy+4,30,6,0,0,7);g.fill();return}
  drawBody(g,e,sx,sy,it[1]===1);
  if(F.on&&e.x>F.front&&(e.z||0)<F.L){var L=F.L-(e.z||0),hw=e.type==='tank'?30:22;g.fillStyle='rgba(70,200,245,.62)';g.beginPath();g.moveTo(sx-hw,sy+3);g.lineTo(sx-hw,sy-L);g.quadraticCurveTo(sx,sy-L-3,sx+hw,sy-L);g.lineTo(sx+hw,sy+3);g.closePath();g.fill();
   g.strokeStyle='rgba(235,255,255,.85)';g.lineWidth=1.2;g.beginPath();g.ellipse(sx,sy-L,hw+2+Math.sin(M.t*6)*1.5,3,0,0,7);g.stroke()}});
 /* the flood: water sheet, front wave crest */
 if(F.on){var fs=F.front-cam;
  if(fs>-40&&fs<W+40&&F.t<6){var ch2=Math.max(8,60-F.t*14),fy2=ST.ymax+8-elev(F.front)+cy;g.fillStyle='rgba(120,235,255,.85)';g.beginPath();g.moveTo(fs-6,fy2);g.quadraticCurveTo(fs-14,fy2-ch2,fs+12,fy2-ch2-6);g.quadraticCurveTo(fs+30,fy2-ch2,fs+50,fy2);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(fs+4,fy2-ch2+2,5,0,7);g.arc(fs+14,fy2-ch2-4,4,0,7);g.fill();if(Math.random()<0.6)part(F.front+rnd(-4,20),ST.ymax-elev(F.front)-ch2,rnd(-120,-20),rnd(-120,-30),0.6,'#fff',2,380,'drop')}}
 /* layer 4: foreground pillars (1.4x parallax) */
 for(var px=260;px<ST.len*1.4+W;px+=640){var fx2=px-cam*1.4;if(fx2<-40||fx2>W+40)continue;var near=Math.abs(fx2+11-(M.p.x-cam))<60,al=near?0.32:0.85;g.save();g.globalAlpha=al;var pg=g.createLinearGradient(fx2,0,fx2+22,0);pg.addColorStop(0,'#140a1e');pg.addColorStop(0.45,'#46325a');pg.addColorStop(1,'#0f0819');g.fillStyle=pg;g.fillRect(fx2,0,22,H);g.fillStyle='rgba(255,58,216,.5)';g.fillRect(fx2+20,0,2,H);g.restore()}
 /* GO -> */
 if(M.go&&!M.cine&&Math.floor(M.t*3)%2){g.font='bold 14px monospace';g.textAlign='right';g.lineWidth=4;g.strokeStyle='#1a0830';g.strokeText('GO \u25B6',W-14,60);g.fillStyle='#ffd23a';g.fillText('GO \u25B6',W-14,60)}
 vignette(g,0.55)}
function pickup(g,k,sx,sy){var b=Math.sin(M.t*4+k.x)*2;g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(125,252,255,'+(0.22+Math.sin(M.t*6)*0.1)+')';g.beginPath();g.ellipse(sx,sy,16,5,0,0,7);g.fill();g.restore();
 if(k.k==='cue')drawSpr(g,'l6-cue',sx,sy-6+b,1,1,0.4,-0.25);else drawSpr(g,'l6-'+k.k,sx,sy-2+b,1,1,0.9);
 g.font='bold 7px monospace';g.textAlign='center';g.fillStyle='#7dfcff';g.fillText('GRAB',sx,sy-30+b)}
function bubble(g,x,y,txt){g.font='bold 8px monospace';var w=g.measureText(txt).width+10;x=clamp(x,w/2+2,W-w/2-2);g.fillStyle='#fff';g.strokeStyle='#1a0830';g.lineWidth=1.5;g.beginPath();g.rect(x-w/2,y-10,w,14);g.fill();g.stroke();g.beginPath();g.moveTo(x-3,y+4);g.lineTo(x+4,y+10);g.lineTo(x+5,y+4);g.fill();g.fillStyle='#1a0830';g.textAlign='center';g.fillText(txt,x,y)}

function renderClimb(g){var c=M.c,CL=CFG.climb,ry=H*0.6;
 /* layer 1: the stormy city behind */
 var bi=SPR['l6-bay-far'];if(bi){var s=Math.max(W/400,H/225)*1.1;g.drawImage(bi,(W-400*s)/2,-40+c.h*0.03,400*s,225*s)}else{g.fillStyle='#120a24';g.fillRect(0,0,W,H)}
 g.fillStyle='rgba(10,5,30,.45)';g.fillRect(0,0,W,H);bolt(g,0,0,H*0.7);if(M.rflash>0){g.fillStyle='rgba(200,210,255,'+M.rflash*0.35+')';g.fillRect(0,0,W,H)}
 /* layer 2: the mansion wall (scrolls with the climb): ground floor, repeating two-floor tiles, the roof cap at the top */
 var ww=Math.min(W*0.62,240),wx=(W-ww)/2,wi=SPR['l6-wall'],k=ww/450,base=ry+c.h,tH=284*k,capTop=ry+c.h-CL.len-110-135*k,capBot=capTop+168*k;
 if(wi){g.drawImage(wi,0,452,450,348,wx,base-348*k,ww,348*k);for(var y=base-348*k-tH;y+tH>capBot-1&&y>-tH-400;y-=tH){if(y>H)continue;var cut=Math.max(0,capBot-y);g.drawImage(wi,0,168+cut/k,450,284-cut/k,wx,y+cut,ww,tH-cut)}if(capBot>-5)g.drawImage(wi,0,0,450,168,wx,capTop,ww,168*k)}
 else{g.fillStyle='#e8d8c8';g.fillRect(wx,Math.max(0,capBot),ww,H)}
 var sh=g.createLinearGradient(wx,0,wx+ww,0);sh.addColorStop(0,'rgba(0,0,0,.55)');sh.addColorStop(0.2,'rgba(0,0,0,0)');sh.addColorStop(0.8,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=sh;g.fillRect(wx,Math.max(0,capBot),ww,H);
 g.save();g.globalCompositeOperation='lighter';var up=g.createLinearGradient(0,H,0,0);up.addColorStop(0,'rgba(255,58,216,.22)');up.addColorStop(0.5,'rgba(41,214,255,.05)');up.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=up;g.fillRect(wx,0,ww,H);g.restore();
 /* falling tiles */
 c.tiles.forEach(function(t){if(t.warn>0){var a=0.5+Math.sin(M.t*20)*0.5;g.fillStyle='rgba(255,58,90,'+(0.25*a)+')';g.fillRect(t.x-12,0,24,ry);g.font='bold 14px monospace';g.textAlign='center';g.fillStyle='rgba(255,210,58,'+(0.5+a*0.5)+')';g.fillText('!',t.x,16);return}
  if(!drawSpr(g,'l6-tile',t.x,t.y+8,1,1,1,t.r)){g.fillStyle='#d8704a';g.fillRect(t.x-9,t.y-8,18,16)}});
 /* Richie on the wall */
 var k=c.hurtT>0?'l6-r-hurt':'l6-r-climb-'+(Math.floor(c.climbT*3)%2),jx=c.hurtT>0?Math.sin(M.t*60)*2:0;
 if(c.inv>0&&Math.floor(M.t*16)%2)g.globalAlpha=0.6;if(!drawSpr(g,k,c.x+jx,ry,1,1))fig(g,c.x,ry,110,'#fff');g.globalAlpha=1;
 /* layer 3/4: rain sheets at two speeds */
 rain(g,c.rain.slice(0,40),0.35,0.3,10,0,W,0,H);rain(g,c.rain.slice(40),0.55,0.35,18,0,W,0,H);
 /* height meter */
 var p=c.h/CL.len;g.fillStyle='rgba(0,0,0,.5)';g.fillRect(W-14,30,6,H-60);g.fillStyle='#ffd23a';g.fillRect(W-14,30+(H-60)*(1-p),6,(H-60)*p);g.font='bold 7px monospace';g.textAlign='center';g.fillStyle='#fff';g.fillText('ROOF',W-11,26);
 vignette(g,0.6)}

function renderRoof(g){var r=M.r,p=M.p,im=SPR['l6-roof'],sc=Math.max(W/400,1),bw=400*sc,bh=225*sc,ox=clamp(W*0.9-300*sc,W-bw,0),oy=H-bh,sway=-(p.x-W/2)*0.03;
 r.edge=ox+CFG.roof.edgeU*sc;r.x0=Math.max(14,ox+10);r.pool={x:ox+316*sc,y:oy+200*sc};
 if(im){/* layer 1 sky + skyline (slight parallax), layer 2 the roof */g.drawImage(im,0,0,800,250,ox+sway-6,oy-4,bw+12,125*sc+4);g.drawImage(im,0,250,800,200,ox,oy+125*sc,bw,100*sc)}else{g.fillStyle='#1a0c30';g.fillRect(0,0,W,H)}
 bolt(g,0,0,H*0.45);if(M.rflash>0){g.fillStyle='rgba(200,210,255,'+M.rflash*0.4+')';g.fillRect(0,0,W,H)}
 /* the pool splash */
 if(r.splash){var st=r.splash,P=r.pool;g.save();g.globalCompositeOperation='lighter';for(var i=0;i<3;i++){var rr=(st*40+i*10)%60;g.strokeStyle='rgba(180,250,255,'+Math.max(0,0.8-rr/60)+')';g.lineWidth=2;g.beginPath();g.ellipse(P.x,P.y,rr,rr*0.3,0,0,7);g.stroke()}
  if(st<1.2){var ch=Math.sin(Math.min(1,st/1.2)*Math.PI)*70;var gr=g.createLinearGradient(0,P.y-ch,0,P.y);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(90,220,255,.7)');g.fillStyle=gr;g.beginPath();g.moveTo(P.x-16,P.y);g.quadraticCurveTo(P.x-10,P.y-ch,P.x,P.y-ch-6);g.quadraticCurveTo(P.x+10,P.y-ch,P.x+16,P.y);g.fill()}g.restore()}
 /* edge danger glow */
 if(p.x>r.edge-40&&!r.launched){g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,40,80,'+(0.15+Math.sin(M.t*10)*0.1)+')';g.fillRect(r.edge-10,CFG.roof.ymin-10,30,50);g.restore()}
 /* fighters */
 var ents=M.foes.map(function(e){return [e,0]}).concat([[p,1]]);ents.sort(function(a,b){return a[0].y-b[0].y});
 ents.forEach(function(it){var e=it[0];if(e.st==='fly'){drawSpr(g,'l6-esc-hurt',e.fx,e.fy+50*e.fs,1,SF.esc,e.fs,e.frot);return}
  if(it[1]===1&&e.hang>0){drawSpr(g,'l6-r-hang',e.x,CFG.roof.ymin+96,1,1);return}drawBody(g,e,e.x,e.y,it[1]===1)});
 /* the chief on the ladder */
 var h=r.heli;if(r.ladder&&!h.away){var lk=Math.min(1,r.ladder/2.2),lx=h.x-14,ly=lerp(196,h.y+56,lk);g.strokeStyle='#ccc';g.lineWidth=1;g.beginPath();g.moveTo(lx-4,h.y+20);g.lineTo(lx-4,200);g.moveTo(lx+4,h.y+20);g.lineTo(lx+4,200);g.stroke();drawSpr(g,'l6-chief-wave',lx,ly,-1,SF.chief,0.7)}
 /* the darkness + the sweeping spotlight */
 var sx=r.spot.x,sy=r.spot.y-40,dk=g.createRadialGradient(sx,sy,18,sx,sy,95);dk.addColorStop(0,'rgba(0,0,15,0)');dk.addColorStop(1,'rgba(0,0,15,.5)');g.fillStyle=dk;g.fillRect(0,0,W,H);
 g.save();g.globalCompositeOperation='lighter';var cone=g.createLinearGradient(h.x,h.y,sx,r.spot.y);cone.addColorStop(0,'rgba(255,250,220,.35)');cone.addColorStop(1,'rgba(255,250,220,.08)');g.fillStyle=cone;g.beginPath();g.moveTo(h.x-18,h.y+20);g.lineTo(h.x-10,h.y+22);g.lineTo(sx+46,r.spot.y+6);g.lineTo(sx-46,r.spot.y+6);g.closePath();g.fill();
 var pool=g.createRadialGradient(sx,r.spot.y,2,sx,r.spot.y,48);pool.addColorStop(0,'rgba(255,250,220,.35)');pool.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=pool;g.beginPath();g.ellipse(sx,r.spot.y,48,14,0,0,7);g.fill();g.restore();
 /* layer 3: the helicopter */
 var hs=h.away?Math.max(0.3,1-h.away*0.25):1;drawSpr(g,'l6-heli',h.x,h.y+58*hs,-1,SF.heli,hs*0.8,Math.sin(h.ph*1.3)*0.04);g.strokeStyle='rgba(255,255,255,'+(0.3+Math.random()*0.3)+')';g.lineWidth=1;g.beginPath();g.ellipse(h.x,h.y+2,60*hs,3*hs,0,0,7);g.stroke();
 if(h.away&&h.away>0.3&&Math.floor(M.t*3)%2)bubble(g,h.x,h.y-8,'SO LONG, RICHIE!');
 /* layer 4: rotor wash streaks + rain */
 if(r.washOn){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1;g.beginPath();for(var j=0;j<14;j++){var yy=150+((j*37+M.t*90)%70),xx=((j*91+M.t*420)%(W+80))-40;g.moveTo(xx,yy);g.lineTo(xx+30,yy)}g.stroke();g.restore();
  g.font='bold 10px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#1a0830';g.strokeText('ROTOR WASH \u25B6\u25B6',W/2,70);g.fillStyle='#ff9ad8';g.fillText('ROTOR WASH \u25B6\u25B6',W/2,70)}
 if(!M.rr){M.rr=[];for(var q=0;q<50;q++)M.rr.push({x:Math.random(),y:Math.random(),s:rnd(0.7,1.2)})}rain(g,M.rr,0.4,0.3,12,0,W,0,H);vignette(g,0.5)}

function bayBg(g,d){var im=SPR['l6-bay-far'],top=132,bw=Math.max(W,400*1.15);
 if(im){/* layer 1: sky (static); layer 2: skyline (slow, tiled) */g.drawImage(im,0,0,800,140,(W-bw)/2,0,bw,top-62);var off=(-(d*0.04)%bw+bw)%bw;for(var i=-1;i<2;i++)g.drawImage(im,0,140,800,146,off+i*bw-0.5,top-63,bw+1,64)}else{g.fillStyle='#1a0c30';g.fillRect(0,0,W,H)}
/* layer 3: the water, streaking past */var wg=g.createLinearGradient(0,top,0,H);wg.addColorStop(0,'#2a1050');wg.addColorStop(0.4,'#14205a');wg.addColorStop(1,'#061430');g.fillStyle=wg;g.fillRect(0,top-1,W,H-top+1);
 g.save();g.globalCompositeOperation='lighter';[['rgba(255,58,216,.22)',0.15],['rgba(41,214,255,.18)',0.55],['rgba(255,210,58,.14)',0.85]].forEach(function(c){var x=c[1]*W;for(var yy=top;yy<H;yy+=4){g.fillStyle=c[0];g.fillRect(x+Math.sin(yy*0.3+M.t*3)*4-6,yy,12+Math.sin(yy)*4,1.5)}});
 g.strokeStyle='rgba(200,230,255,.25)';g.lineWidth=1;g.beginPath();for(var j=0;j<26;j++){var yy2=top+((j*13.7)%(H-top)),sp=0.4+(yy2-top)/(H-top)*1.6,xx=((-(d*sp)-j*57)%(W+60)+W+60)%(W+60)-30;g.moveTo(xx,yy2);g.lineTo(xx+12+sp*10,yy2)}g.stroke();g.restore();return top}
function fireworks(g,list){g.save();g.globalCompositeOperation='lighter';list.forEach(function(f){g.fillStyle=f.c;g.fillRect(f.x-1,f.y,2,6)});M.parts.forEach(function(p){if(p.k!=='fw')return;var a=1-p.t/p.life;g.fillStyle=p.c;g.globalAlpha=a;g.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)});g.globalAlpha=1;g.restore()}
function renderBay(g){var b=M.b,B=CFG.bay,PX=W*PXF,top=bayBg(g,b.d);fireworks(g,b.works);
 /* the final yacht: ramp */
 if(b.final||b.ramp-b.d<W){var yx=PX+(b.ramp-b.d)+90;drawSpr(g,'l6-yacht',yx,178,1,1,0.9)}
 /* yacht wakes (jumps): a yacht crossing up top, its foamy wake across the lanes */
 b.wakes.forEach(function(w){var x=PX+(w.x-b.d);if(x<-120||x>W+160)return;drawSpr(g,'l6-yacht',x+70,B.ymin-2,1,1,0.34);g.save();g.globalCompositeOperation='lighter';for(var k=0;k<3;k++){g.strokeStyle='rgba(230,250,255,'+(0.55-k*0.15)+')';g.lineWidth=3-k;g.beginPath();g.moveTo(x+40+k*6,B.ymin);g.quadraticCurveTo(x+k*6-6,(B.ymin+B.ymax)/2,x-20+k*6,B.ymax+8);g.stroke()}g.restore();
  if(!w.used&&x>PX&&x<W){g.font='bold 7px monospace';g.textAlign='center';g.fillStyle='#7dfcff';g.fillText('JUMP',x+10,B.ymax+18)}});
 /* obstacles: buoys + floating crates */
 var ents=[];b.obs.forEach(function(o,i){var x=PX+(o.x-b.d);if(x<-20||x>W+20||o.hit)return;ents.push({y:o.y,f:function(){var bob=Math.sin(M.t*3+i)*1.5;shadow(g,x,o.y+2,9,0.3);if(i%2){g.fillStyle='#ff3a5a';g.fillRect(x-5,o.y-18+bob,10,18);g.fillStyle='#fff';g.fillRect(x-5,o.y-12+bob,10,4);g.fillStyle='#ffd23a';g.beginPath();g.arc(x,o.y-20+bob,2,0,7);g.fill()}else{g.fillStyle='#8a5a32';g.fillRect(x-9,o.y-14+bob,18,14);g.strokeStyle='#5a3a1a';g.strokeRect(x-9,o.y-14+bob,18,14);g.beginPath();g.moveTo(x-9,o.y-14+bob);g.lineTo(x+9,o.y+bob);g.stroke()}}})});
 /* Escobar's speedboat */
 var bx=Math.min(W-60,PX+90+b.gap*0.6),byy=176+Math.sin(M.t*1.3)*6;if(!b.leap)ents.push({y:176,f:function(){shadow(g,bx,byy+6,50,0.3);drawSpr(g,'l6-esc-walk',bx+12,byy-4,-1,SF.esc,0.34);drawSpr(g,'l6-boat',bx,byy+8,1,1,0.75,Math.sin(M.t*6)*0.02);g.fillStyle='rgba(230,250,255,.75)';for(var j=0;j<8;j++)g.fillRect(bx-60-Math.random()*40,byy+2+Math.random()*8,6,2)}});
 /* Richie on the jet ski */
 ents.push({y:b.y,f:function(){shadow(g,PX,b.y,22,0.35*(1-Math.min(1,b.z/80)));var k=b.z>0?'l6-r-skijump':'l6-r-ski';var rot=b.flip>0?-b.flip*Math.PI*2:b.z>0?-0.12:Math.sin(M.t*8)*0.02;if(b.hurtT>0&&Math.floor(M.t*16)%2)g.globalAlpha=0.6;drawSpr(g,k,PX,b.y-b.z,1,1,0.75,rot);g.globalAlpha=1;if(b.boost>0){g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(41,214,255,.5)';g.beginPath();g.moveTo(PX-30,b.y-b.z-12);g.lineTo(PX-70-Math.random()*20,b.y-b.z-6);g.lineTo(PX-30,b.y-b.z);g.fill();g.restore()}}});
 ents.sort(function(a,c){return a.y-c.y});ents.forEach(function(e){e.f()});
 /* distance */
 var pr=Math.min(1,b.d/B.len);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(W*0.3,H-10,W*0.4,4);g.fillStyle='#ff3ad8';g.fillRect(W*0.3,H-10,W*0.4*pr,4);
 vignette(g,0.45)}
function deckFloor(g){var d=M.d||{scroll:0};g.fillStyle='#e8e0ea';g.beginPath();g.moveTo(-10,166);g.lineTo(W+10,160);g.lineTo(W+10,224);g.lineTo(-10,226);g.fill();g.strokeStyle='rgba(120,100,130,.35)';g.lineWidth=1;g.beginPath();for(var y=170;y<224;y+=7){g.moveTo(0,y);g.lineTo(W,y-3)}g.stroke();
 g.fillStyle='#c0306a';g.fillRect(-10,219,W+20,6);g.strokeStyle='#cfd6e6';g.lineWidth=1.5;g.beginPath();g.moveTo(0,140);g.lineTo(W,134);for(var x=10;x<W;x+=40){g.moveTo(x,166-x*0.015);g.lineTo(x,140-x*0.015)}g.stroke()}
function renderDeck(g){var d=M.d;bayBg(g,d.scroll);fireworks(g,M.dworks||[]);deckFloor(g);
 (M.picks||[]).forEach(function(k){if(!k.taken)pickup(g,k,k.x,k.y)});
 var ents=M.foes.map(function(e){return [e,0]}).concat([[M.p,1]]);ents.sort(function(a,b){return a[0].y-b[0].y});ents.forEach(function(it){drawBody(g,it[0],it[0].x,it[0].y,it[1]===1)});
 var sx=W*0.75+Math.sin(M.t*0.7)*W*0.2;g.save();g.globalCompositeOperation='lighter';var l=g.createRadialGradient(sx,40,2,sx,40,140);l.addColorStop(0,'rgba(255,58,216,.12)');l.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=l;g.fillRect(0,0,W,H);g.restore();vignette(g,0.5)}
function renderFinale(g){var f=M.f;
 if(f.ph==='plane'){var t=f.t;bayBg(g,M.t*60*Math.max(0.2,1-t/6));
  /* the stern of Escobar's boat on the left, open water on the right */
  var de=W*0.5;g.fillStyle='#e8e0ea';g.beginPath();g.moveTo(-10,166);g.lineTo(de,163);g.lineTo(de+14,224);g.lineTo(-10,226);g.fill();g.fillStyle='#c0306a';g.fillRect(-10,219,de+24,6);g.strokeStyle='#cfd6e6';g.lineWidth=1.5;g.beginPath();g.moveTo(0,140);g.lineTo(de-6,137);g.stroke();
  drawSpr(g,'l6-esc-down',W*0.26,206,-1,SF.esc);stars(g,W*0.26,186,M.t);
  var px=f.px,py=f.py,wob=f.shake?Math.sin(t*16)*0.12:0;shadow(g,px,206,50,0.25*Math.max(0,1-(206-py)/80));drawSpr(g,'l6-seaplane',px,py,1,SF.seaplane,0.9,wob);drawSpr(g,'l6-chief-wave',px+30,py-26,1,SF.chief,0.28,wob);
  var tx=f.tx,ty=f.ty;
  if(t<2)drawSpr(g,'l6-r-guard',W*0.16,204,1,1);else if(t<2.8){var k1=(t-2)/0.8;drawSpr(g,'l6-r-walk-'+(Math.floor(t*8)%2),lerp(W*0.16,de-10,k1),204,1,1)}
  else if(t<3.3){var k=(t-2.8)/0.5;drawSpr(g,'l6-r-fkick',lerp(de-10,tx,k),lerp(204,ty+110,k)-Math.sin(k*Math.PI)*36,1,1)}
  else if(!f.fall)drawSpr(g,'l6-r-hang',tx,ty+112,1,1,1,Math.sin(t*(f.shake?16:4))*(f.shake?0.3:0.08));
  else{var fk=Math.min(1,f.fall/0.9);if(!f.sp)drawSpr(g,'l6-r-hurt',f.fx,lerp(f.fy+100,236,fk*fk),1,1,1,fk*3)}
  if(t>1.2&&t<3)bubble(g,px,py-60,'TOO SLOW, RICHIE!');
  g.fillStyle='rgba(0,0,0,'+M.fade+')';g.fillRect(0,0,W,H);return}
 var im=SPR['l6-sunrise'],s=Math.max(W/400,H/225);if(im)g.drawImage(im,(W-400*s)/2,(H-225*s)/2,400*s,225*s);else{var gg=g.createLinearGradient(0,0,0,H);gg.addColorStop(0,'#ff8a5a');gg.addColorStop(1,'#3a2a6a');g.fillStyle=gg;g.fillRect(0,0,W,H)}
 var t=f.t,wl=196;/* the seaplane, a speck flying into the sun */var k2=Math.min(1,t/5);drawSpr(g,'l6-seaplane',lerp(W*0.72,W*0.52,k2),lerp(H*0.36,H*0.3,k2),-1,SF.seaplane,lerp(0.22,0.05,k2),0,1-k2*0.6);
 g.save();g.globalCompositeOperation='lighter';for(var y=wl;y<H;y+=3){g.fillStyle='rgba(255,200,120,'+(0.14*(1-(y-wl)/(H-wl)))+')';g.fillRect(W/2-30+Math.sin(y+M.t*2)*8,y,60,1.2)}g.restore();
 var rx=W*0.42,bob=Math.sin(M.t*1.6)*1.5;g.save();g.beginPath();g.rect(0,0,W,wl+bob+2);g.clip();drawSpr(g,f.badge?'l6-r-upper':'l6-r-guard',rx,wl+bob+(f.badge?118:96),1,1);g.restore();
 var wg=g.createLinearGradient(0,wl,0,H);wg.addColorStop(0,'rgba(60,40,90,.7)');wg.addColorStop(1,'rgba(20,10,40,.9)');g.fillStyle=wg;g.fillRect(0,wl+bob+2,W,H);g.strokeStyle='rgba(255,220,180,.6)';g.beginPath();g.ellipse(rx,wl+bob+2,24,4,0,0,7);g.stroke();
 if(!f.badge)drawSpr(g,'l6-badge',W*0.52,wl+3+Math.sin(M.t*2)*2,1,1,0.6);else{var bx=rx-12,by=wl+bob-(118-6)+6;drawSpr(g,'l6-badge',bx,by+22,1,1,0.6);g.save();g.globalCompositeOperation='lighter';var gl=g.createRadialGradient(bx,by+10,1,bx,by+10,18);gl.addColorStop(0,'rgba(255,230,120,.8)');gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(bx-20,by-10,40,40);g.restore()}
 if(f.badge){g.fillStyle='#ffd23a';g.font='bold 10px monospace';g.textAlign='center';var gl2=Math.sin(M.t*5)*0.5+0.5;g.globalAlpha=gl2;g.fillText('\u2726',rx-4,wl-130);g.globalAlpha=1}
 g.fillStyle='rgba(0,0,0,'+M.fade+')';g.fillRect(0,0,W,H)}

function drawFx(g,ox,oy){/* particles (world-ish coords: x - cam, y + camY) */
 M.parts.forEach(function(p){if(p.k==='fw')return;var a=1-p.t/p.life,x=p.x-ox,y=p.y+oy;g.globalAlpha=Math.max(0,a);g.fillStyle=p.c;if(p.k==='cloud'){g.beginPath();g.arc(x,y,p.s*(1+p.t*2),0,7);g.fill()}else g.fillRect(x-p.s/2,y-p.s/2,p.s,p.s)});g.globalAlpha=1;
 M.fx.forEach(function(f){var a=1-f.t/f.life;if(f.k==='blam'||f.k==='pellets'){g.save();g.globalCompositeOperation='lighter';var x=f.x-ox,y=f.y+oy,tx=f.k==='pellets'?f.tx-ox:x+f.dir*W,ty=f.k==='pellets'?f.ty+oy-30:y;g.strokeStyle='rgba(255,220,120,'+a+')';g.lineWidth=2;for(var i=-2;i<=2;i++){g.beginPath();g.moveTo(x,y);g.lineTo(tx,ty+i*10);g.stroke()}var gl=g.createRadialGradient(x,y,1,x,y,30);gl.addColorStop(0,'rgba(255,240,180,'+a+')');gl.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gl;g.fillRect(x-30,y-30,60,60);g.restore()}
  else if(f.k==='ring'){g.strokeStyle='rgba(255,210,58,'+a+')';g.lineWidth=4*a;g.beginPath();g.ellipse(f.x-ox,f.y+oy,20+f.t*220,(20+f.t*220)*0.3,0,0,7);g.stroke()}});
 /* comic impact bursts */
 M.bursts.forEach(function(b){var t=b.t,s=(t<0.08?t/0.08*1.25:1.25-0.25*Math.min(1,(t-0.08)/0.1))*b.big,a=t>0.4?1-(t-0.4)/0.15:1,x=b.x-ox,y=b.y+oy;g.save();g.globalAlpha=Math.max(0,a);g.translate(x,y);g.rotate(b.rot);g.scale(s,s);
  g.beginPath();for(var i=0;i<b.n*2;i++){var r=i%2?10:19,an=i/(b.n*2)*Math.PI*2;g.lineTo(Math.cos(an)*r*1.4,Math.sin(an)*r)}g.closePath();g.fillStyle=b.c;g.fill();g.lineWidth=2;g.strokeStyle='#1a0830';g.stroke();
  g.font='bold 10px monospace';g.textAlign='center';g.textBaseline='middle';g.lineWidth=3;g.strokeStyle='#fff';g.strokeText(b.w,0,1);g.fillStyle='#1a0830';g.fillText(b.w,0,1);g.restore()});g.textBaseline='alphabetic';
 /* floating score text: bigger, outlined (v0.6.0 nit fix) */
 M.pops.forEach(function(p){var a=p.t>0.9?1-(p.t-0.9)/0.3:1,x=p.x-ox,y=p.y+oy-p.t*26,s=p.t<0.1?0.6+p.t*4:1;g.save();g.globalAlpha=Math.max(0,a);g.translate(x,y);g.scale(s,s);g.font='bold 12px monospace';g.textAlign='center';g.lineJoin='round';g.lineWidth=4;g.strokeStyle='#1a0830';g.strokeText(p.txt,0,0);g.fillStyle=p.c;g.fillText(p.txt,0,0);g.restore()})}
function render(g,w,t){if(!M)return;W=w||W;var sk=M.shake>0?M.shake*6:0,ox=sk?rnd(-sk,sk):0,oy=sk?rnd(-sk,sk):0;
 g.setTransform(2,0,0,2,ox*2,oy*2);g.clearRect(-20,-20,W+40,H+40);
 var s=M.stage,cam=s==='stairs'?M.cam:0,cy=s==='stairs'?M.camY:0;
 if(M.zoom>1.01){var zx=M.zx-cam,zy=M.zy+cy;g.translate(zx,zy);g.scale(M.zoom,M.zoom);g.translate(-zx,-zy)}
 if(M.cine!=='combo')M.zoom=Math.max(1,M.zoom-0.04);
 if(s==='stairs')renderStairs(g);else if(s==='climb')renderClimb(g);else if(s==='roof')renderRoof(g);else if(s==='bay')renderBay(g);else if(s==='deck')renderDeck(g);else renderFinale(g);
 drawFx(g,cam,cy);
 g.setTransform(2,0,0,2,0,0);
 if(M.letter>0){var lb=20*M.letter;g.fillStyle='#000';g.fillRect(0,0,W,lb);g.fillRect(0,H-lb,W,lb)}
 if(M.wflash>0){g.fillStyle='rgba(255,255,255,'+Math.min(0.85,M.wflash*0.85)+')';g.fillRect(0,0,W,H)}
 if(M.stage!=='finale'&&M.fade>0){g.fillStyle='rgba(0,0,0,'+M.fade+')';g.fillRect(0,0,W,H)}
 if(M.t<0.4&&M.stage!=='stairs'){g.fillStyle='rgba(0,0,0,'+(1-M.t/0.4)+')';g.fillRect(0,0,W,H)}}
/* deck fireworks too */
var _deckFlow=deckFlow;deckFlow=function(dt){M.dworks=M.dworks||[];M.dworkT=(M.dworkT||0)-dt;if(M.dworkT<=0){M.dworkT=rnd(0.6,1.2);M.dworks.push({x:rnd(0.1,0.9)*W,y:H*0.45,vy:-rnd(100,140),fuse:rnd(0.6,0.9),c:['#ff3ad8','#29d6ff','#ffd23a'][Math.floor(Math.random()*3)],t:0})}
 M.dworks.forEach(function(f){f.t+=dt;if(!f.done){f.y+=f.vy*dt;if(f.t>=f.fuse){f.done=true;for(var i=0;i<28;i++){var a=i/28*Math.PI*2,v=rnd(40,75);part(f.x,f.y,Math.cos(a)*v,Math.sin(a)*v,rnd(0.9,1.4),f.c,rnd(1,1.8),30,'fw')}}}});M.dworks=M.dworks.filter(function(f){return !f.done});_deckFlow(dt)};

/* ---------- snapshot + API ---------- */
function snap(){if(!M)return null;var p=M.p||{},o={stage:M.stage,st:M.st,cine:M.cine,wait:M.wait,score:M.score,hp:Math.max(0,Math.round(M.hp)),lives:M.lives,rage:Math.round(M.rage),auto:AUTO,slow:M.slow>0,letter:M.letter,
 weapon:p.weapon||null,uses:p.uses||0,x:Math.round(p.x||0),y:Math.round(p.y||0),stats:copy(M.stats),foes:M.foes?alive().length:0,boss:M.boss?{hp:Math.max(0,Math.round(M.boss.hp)),max:M.boss.max,st:M.boss.st}:null};
 if(M.stage==='stairs'){o.wave=M.wave;o.waves=M.waves.length;o.flood=M.flood.on;o.floodL=M.flood.L;o.sharks=M.sharks.length;o.aqua=M.aqua.st;o.chand=M.chand.map(function(c){return c.st});o.tank=M.foes.filter(function(e){return e.type==='tank'}).map(function(e){return {hp:e.hp,st:e.st}})[0]||null;o.go=M.go;o.top=M.top}
 if(M.picks)o.picks=M.picks.filter(function(k){return !k.taken}).map(function(k){return k.k+'@'+Math.round(k.x)});
 if(M.foes)o.stun=M.foes.filter(function(e){return e.st==='stun'}).length;
 if(M.stage==='climb'){o.h=Math.round(M.c.h);o.len=CFG.climb.len;o.tiles=M.c.tiles.length}
 if(M.stage==='roof'){o.wash=M.r.washOn;o.launched=M.r.launched;o.splash=!!M.r.splash;o.hang=p.hang>0;o.heliAway=!!M.r.heli.away}
 if(M.stage==='bay'){var b=M.b;o.d=Math.round(b.d);o.len=CFG.bay.len;o.gap=Math.round(b.gap);o.meter=+b.meter.toFixed(2);o.z=Math.round(b.z);o.final=b.final;o.leap=!!b.leap;o.by=Math.round(b.y)}
 if(M.stage==='deck'){o.phase=M.d.phase}
 if(M.stage==='finale'){o.ph=M.f.ph;o.badge=M.f.badge}
 return o}
function portrait(cv,who){var k={chief:'l6-chief-portrait',esc:'l6-esc-portrait',tank:'l6-tank-portrait',guard:'l5-guard-portrait'}[who],im=SPR[k];if(!cv||!im)return false;var g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);g.drawImage(im,0,0,cv.width,cv.height);return true}
var dev={state:function(){return M},weak:function(){(M.foes||[]).forEach(function(e){if(e.st!=='ko')e.hp=1})},rage:function(){M.rage=CFG.rageMax},give:function(k){M.p.weapon=k;M.p.uses=CFG.USES[k];emit('pickup',{k:k,uses:M.p.uses})},
 tp:function(x,y){M.p.x=x;if(y!=null)M.p.y=y},climbTo:function(h){M.c.h=h},rideTo:function(d){M.b.d=d},speed:function(n){SPEED=Math.max(1,n|0)},hurt:function(n){M.hp=n},
 near:function(){var p=M.p,e=alive()[0];if(e){p.x=e.x-30*(sgn(e.x-p.x)||1);p.y=e.y}}};
window.RosadoEscobar={start:start,go:go,resume:resume,update:update,render:render,move:move,press:press,setAuto:setAuto,auto:function(){return AUTO},on:on,snap:snap,portrait:portrait,loadSprites:loadSprites,spriteMode:spriteMode,
 stage:function(){return M?M.stage:null},STAGES:STAGES,SLOTS:SLOTS,META:META,CFG:CFG,dev:dev};
})();
