/* Rosado Nights · Level 5 "Escobar's Mansion" (v0.5.0)
   Three stages: 'fly'     neon rings over the bay at night (Pilotwings style), then JUMP over the hilltop mansion
                 'chute'   steer the parachute against the wind onto the glowing lawn target while searchlights sweep
                 'stealth' sneak across the grounds, silenced-pistol knockouts on the dark-suited guards, reach the front door
   Cartoon only: knocked-out guards just lie down with stars and a snore, nothing graphic. Canvas fallback art when images fail.
   API (window.RosadoMansion): start(stage,keepScore), go(), update(dt), render(g,W,t) (g is a 2x buffer), move(x,y),
        press('boost'|'jump'|'shoot'|'sneak'), hold(b), setAuto(b), auto(), on(evt,fn), snap(), portrait(cv),
        loadSprites(map,cb), spriteMode(), SLOTS, META, FLY, CH, ST, dev.* (tests). No network. */
(function(){
"use strict";
var H=225;
var META={"l5-r-sneak-0":[98,160,48.5],"l5-r-sneak-1":[103,149,51.0],"l5-r-crouch-aim":[128,147,47.0],"l5-r-aim":[112,172,45.0],"l5-guard-walk-0":[129,180,48.5],"l5-guard-walk-1":[133,179,52.0],"l5-guard-run":[126,194,49.0],"l5-guard-punch":[156,167,53.5],"l5-guard-down":[173,59,86.5],"l5-chute-c":[117,200,58.5],"l5-chute-l":[144,189,72.0],"l5-chute-land":[115,118,57.5],"l5-hedge":[121,107,60.0],"l5-urn":[78,120,41.0],"l5-ammo":[38,34,20.5],"l5-pillar":[93,140,46.0]};
var SLOTS=Object.keys(META).concat(['l5-chute-bg','l5-grounds-a','l5-grounds-b','l5-guard-portrait','l4-fly-bg','l4-plane']);
var CORE=['l4-plane','l5-chute-c','l5-chute-bg','l5-grounds-a','l5-r-sneak-0','l5-guard-walk-0'];
var SPR={},EV={},M=null,IN={x:0,y:0},AUTO=false,SPEED=1,W=400;
var SFX=window.RosadoSFX||{};function sfx(n,a,b){if(SFX[n])try{SFX[n](a,b)}catch(e){}}
function on(n,f){(EV[n]=EV[n]||[]).push(f)}function emit(n,a){(EV[n]||[]).forEach(function(f){try{f(a)}catch(e){}})}
function clamp(v,a,b){return v<a?a:v>b?b:v}function lerp(a,b,t){return a+(b-a)*t}function sgn(v){return v<0?-1:v>0?1:0}
function loadSprites(map,cb){var ks=Object.keys(map||{}).filter(function(k){return SLOTS.indexOf(k)>=0}),n=ks.length;if(!n){if(cb)cb();return}
 ks.forEach(function(k){var im=new Image();im.onload=function(){SPR[k]=im;if(--n===0&&cb)cb()};im.onerror=function(){delete SPR[k];if(--n===0&&cb)cb()};im.src=map[k]})}
function spriteMode(){for(var i=0;i<CORE.length;i++)if(!SPR[CORE[i]])return false;return true}

/* ---------- tuning ---------- */
/* fly: rings every `gap` px of travel; plane screen x fixed; y 26..188 (logical). Missed ring = -50, never a fail */
var FLY={n:16,gap:230,x0:340,ys:[118,96,76,92,128,158,150,118,84,58,70,104,140,166,132,104],hit:18,perf:6,spd:92,boost:72,climb:112,regen:0.07,cost:0.34,bT:1.4,tail:430,ymin:26,ymax:188,pts:100,bonus:50,miss:50,jumpAuto:5};
/* chute: physics in background-image pixels (800x450); ground at gy; target at tx */
var CH={x0:610,y0:130,gy:405,tx:300,perf:16,ok:44,vy:12.5,vyUp:8,vyDn:20,steer:74,wind:44,spot:150,tries:2,xmin:150,xmax:650,half:0.075,len:560,
 beams:[{x:468,y:178,a:-2.05,amp:0.55,w:0.45,ph:0},{x:702,y:192,a:-1.95,amp:0.5,w:0.37,ph:2}],perfPts:1000,okPts:500,closePts:100};
/* stealth: world x 0..len, walk band ymin..ymax; guards [x,x1,x2,y]; hedges are cover when crouched just behind them */
var ST={len:1600,ymin:166,ymax:214,spd:68,spdC:38,spdY:40,ammo:6,box:3,range:230,cone:118,coneW:0.2,door:1497,doorY:178,hp:100,lives:3,dmg:14,
 guards:[[300,240,400,200],[560,500,700,176],[820,760,960,206],[1010,960,1120,180],[1240,1180,1340,202],[1430,1384,1466,174]],
 covers:[[196,186],[470,206],[688,182],[900,198],[1100,206],[1296,186]],decor:[['urn',118,166],['pillar',762,166],['urn',1040,166]],
 boxes:[[380,210],[770,172],[1180,192]],ko:300,silent:200};

/* ---------- state ---------- */
function copy(o){var c={};for(var k in o)c[k]=o[k];return c}
/* keep: true = carry score + stats into the next stage; 2 = RESTART this stage (score + stats back to where the stage began) */
function start(stage,keep){var sc=keep&&M?(keep===2?M.score0:M.score):0,stats=keep&&M?(keep===2?copy(M.stats0):M.stats):{rings:0,ringsN:FLY.n,perfRings:0,land:'',spotted:0,kos:0,silent:0,shots:0,detected:0,retries:0,time:0};
 if(keep===2){stats.retries++;stats.time=M.stats.time}
 M={stage:stage||'fly',st:'ready',t:0,score:sc,score0:sc,stats:stats,stats0:copy(stats),pops:[],fx:[],flash:0,shake:0};
 if(M.stage==='fly')initFly();else if(M.stage==='chute')initChute();else initStealth();
 IN={x:0,y:0}}
function go(){if(M&&M.st==='ready')M.st='run'}
function pop(x,y,txt,c){M.pops.push({x:x,y:y,txt:txt,c:c||'#fff',t:0})}
function add(n){M.score=Math.max(0,M.score+n)}
function initFly(){var r=[];for(var i=0;i<FLY.n;i++)r.push({x:FLY.x0+i*FLY.gap,y:FLY.ys[i%FLY.ys.length],st:'',t:0});
 M.f={s:0,y:120,vy:0,boost:0,meter:1,rings:r,next:0,len:FLY.x0+(FLY.n-1)*FLY.gap+FLY.tail,over:false,overT:0,jumped:false,jumpT:0,stars:[]};
 for(var j=0;j<40;j++)M.f.stars.push({x:Math.random(),y:Math.random()*0.5,b:Math.random()})}
function initChute(){M.c={x:CH.x0,y:CH.y0,vx:0,steer:0,wind:-18,windT:3,windTo:-18,landed:false,landT:0,result:'',tries:(M.c?M.c.tries:0),inBeam:[false,false],spotT:0,streaks:[]};
 for(var i=0;i<18;i++)M.c.streaks.push({x:Math.random(),y:Math.random()})}
function initStealth(){M.s={p:{x:40,y:192,face:1,crouch:false,hp:ST.hp,walk:0,aimT:0,cd:0,hurtT:0,inv:0,hidden:false,moving:false},lives:ST.lives,ammo:ST.ammo,meter:0,alert:false,cam:0,
 guards:ST.guards.map(function(g,i){return {i:i,x:g[0],x1:g[1],x2:g[2],y:g[3],hx:g[0],face:i%2?-1:1,st:'patrol',t:0,walk:0,cd:0.6,punchT:0,sees:false,home:g.slice()}}),
 boxes:ST.boxes.map(function(b){return {x:b[0],y:b[1],taken:false}}),check:40,clear:false,doorT:0,done:false,respawnT:0,lostT:0}}

/* ---------- update ---------- */
function update(dt){if(!M)return;for(var i=0;i<SPEED;i++)step(dt)}
function step(dt){M.t+=dt;M.flash=Math.max(0,M.flash-dt*2);M.shake=Math.max(0,M.shake-dt);
 M.pops=M.pops.filter(function(p){p.t+=dt;return p.t<1});M.fx=M.fx.filter(function(f){f.t+=dt;return f.t<f.life});
 if(M.st==='run'||M.st==='end')M.stats.time+=M.st==='run'?dt:0;
 if(M.stage==='fly')stepFly(dt);else if(M.stage==='chute')stepChute(dt);else stepStealth(dt)}

/* fly */
function stepFly(dt){var f=M.f,run=M.st==='run';
 if(f.jumped){f.jumpT+=dt;f.s+=40*dt;if(f.jumpT>1.6&&M.st!=='next'){M.st='next';start('chute',true);emit('stage','chute')}return}
 var my=IN.y;if(AUTO&&run&&!f.over){var r=f.rings[f.next];my=r?clamp((r.y-f.y)/14,-1,1):0;if(f.meter>0.95&&f.boost<=0&&r&&r.x-f.s>120)press('boost')}
 var tv=run?my*FLY.climb:0;f.vy+=(tv-f.vy)*Math.min(1,dt*5);f.y=clamp(f.y+f.vy*dt,FLY.ymin,FLY.ymax);
 f.meter=Math.min(1,f.meter+FLY.regen*dt);if(f.boost>0)f.boost-=dt;
 if(!run)return;
 var sp=f.over?42:FLY.spd+(f.boost>0?FLY.boost:0),ps=f.s;f.s+=sp*dt;
 for(var i=f.next;i<f.rings.length;i++){var r2=f.rings[i];if(r2.x>f.s)break;if(r2.x>ps||i===f.next){var dy=Math.abs(f.y-r2.y);
   if(dy<FLY.hit){var pf=dy<FLY.perf;r2.st='hit';add(FLY.pts+(pf?FLY.bonus:0));M.stats.rings++;if(pf)M.stats.perfRings++;pop(W*0.28+30,r2.y-26,pf?'PERFECT +150':'+100',pf?'#ffd23a':'#7dfcff');sfx('chime');emit('ring',{hit:true,perf:pf,i:i})}
   else{r2.st='miss';add(-FLY.miss);pop(W*0.28+30,r2.y-26,'MISSED -50','#ff6a8a');sfx('whiff');emit('ring',{hit:false,i:i})}
   r2.t=0;f.next=i+1}}
 f.rings.forEach(function(r){r.t+=dt});
 if(!f.over&&f.s>=f.len){f.over=true;f.overT=0;emit('jumpReady')}
 if(f.over){f.overT+=dt;if(f.overT>(AUTO?1.4:FLY.jumpAuto))jump()}}
function jump(){var f=M.f;if(!f||!f.over||f.jumped)return false;f.jumped=true;f.jumpT=0;sfx('kwhoosh');emit('jump');return true}

/* chute */
function beamAng(b){return b.a+b.amp*Math.sin(M.t*b.w+b.ph)}
function inBeam(b,x,y){if(b.off)return false;var dx=x-b.x,dy=y-b.y,d=Math.hypot(dx,dy);if(d>CH.len||d<10)return false;var a=Math.atan2(dy,dx),da=Math.abs(((a-beamAng(b))+Math.PI*3)%(Math.PI*2)-Math.PI);return da<CH.half}
function stepChute(dt){var c=M.c,run=M.st==='run';
 c.streaks.forEach(function(s){s.x+=(c.wind/800)*dt*3;if(s.x<0)s.x+=1;if(s.x>1)s.x-=1});
 if(c.landed){c.landT+=dt;if(c.result==='miss'&&c.landT>1.8){var tr=c.tries;initChute();c.tries=tr;emit('retry',tr)}
  else if(c.result!=='miss'&&c.landT>1.6&&M.st!=='next'){M.st='next';start('stealth',true);emit('stage','stealth')}return}
 if(!run)return;
 c.windT-=dt;if(c.windT<=0){c.windT=3+Math.random()*3;c.windTo=(Math.random()*2-1)*CH.wind;if(Math.abs(c.windTo)<14)c.windTo=sgn(c.windTo||1)*14;emit('gust',c.windTo)}
 c.wind+=(c.windTo-c.wind)*Math.min(1,dt*0.8);
 var sx=IN.x,sy=IN.y;if(AUTO)autoChute();if(AUTO){sx=c.ax;sy=c.ay}
 c.steer+=(clamp(sx,-1,1)-c.steer)*Math.min(1,dt*6);
 var vy=sy<-0.3?CH.vyUp:sy>0.3?CH.vyDn:CH.vy;c.vx=c.steer*CH.steer+c.wind;
 c.x=clamp(c.x+c.vx*dt,CH.xmin,CH.xmax);c.y+=vy*dt;
 var bx=c.x,by=c.y-60;CH.beams.forEach(function(b,i){var hit=inBeam(b,bx,by);if(hit&&!c.inBeam[i]){add(-CH.spot);M.stats.spotted++;M.flash=1;c.spotT=1;sfx('warn');pop(0,0,'SPOTTED! -150','#ff4a6a');emit('spotted',i)}c.inBeam[i]=hit});
 c.spotT=Math.max(0,c.spotT-dt);
 if(c.y>=CH.gy){c.y=CH.gy;c.landed=true;c.landT=0;var d=Math.abs(c.x-CH.tx);
  if(d<CH.perf){c.result='perfect';add(CH.perfPts);sfx('fanfare')}
  else if(d<CH.ok){c.result='ok';add(CH.okPts);sfx('chime')}
  else if(c.tries>=CH.tries){c.result='close';add(CH.closePts);sfx('chime')}
  else{c.result='miss';c.tries++;M.stats.retries++;sfx('thud')}
  if(c.result!=='miss')M.stats.land=c.result;
  emit('landed',{result:c.result,d:d,tries:c.tries})}}
function autoChute(){var c=M.c,left=Math.max(0.6,(CH.gy-c.y)/CH.vy),want=(CH.tx-c.x)/left;c.ax=clamp((want-c.wind)/CH.steer,-1,1);c.ay=0;
 /* dodge a beam that is about to sweep over us: speed up or slow down the drop */
 var ahead=false;CH.beams.forEach(function(b){if(inBeam(b,c.x,c.y-60+CH.vy*0.6)||inBeam(b,c.x+c.vx*0.6,c.y-60))ahead=true});
 if(ahead)c.ay=c.y>CH.gy*0.5?1:-1;
 if(Math.abs(CH.tx-c.x)<6&&left<4)c.ax=clamp(-c.wind/CH.steer,-1,1)}

/* stealth */
function guardsUp(){return M.s.guards.filter(function(g){return g.st!=='down'})}
function hiddenAt(p){if(!p.crouch)return false;for(var i=0;i<ST.covers.length;i++){var h=ST.covers[i];if(Math.abs(p.x-h[0])<26&&p.y<h[1]&&p.y>h[1]-20)return true}return false}
function sees(g,p){if(g.st==='down')return 0;var dx=(p.x-g.x)*g.face,dy=Math.abs(p.y-g.y);
 if(dx>4&&dx<ST.cone&&dy<5+dx*ST.coneW)return (1.3-dx/ST.cone)*(p.crouch?0.4:1);
 if(!p.crouch&&dx>-22&&dx<=4&&dy<10)return 0.6; /* footsteps right behind him */
 return 0}
function stepStealth(dt){var s=M.s,p=s.p,run=M.st==='run';
 s.guards.forEach(function(g){g.t+=dt;if(g.punchT>0)g.punchT-=dt});
 if(s.respawnT>0){s.respawnT-=dt;if(s.respawnT<=0)respawn();return}
 if(s.done){s.doorT+=dt;return}
 var mx=IN.x,my=IN.y;if(AUTO&&run){var a=autoSneak();mx=a.x;my=a.y}
 if(!run){mx=0;my=0}
 if(p.hurtT>0)p.hurtT-=dt;if(p.inv>0)p.inv-=dt;if(p.aimT>0)p.aimT-=dt;if(p.cd>0)p.cd-=dt;
 if(p.hurtT>0){mx*=0.2;my*=0.2}
 var spd=p.crouch?ST.spdC:ST.spd;p.moving=Math.abs(mx)>0.15||Math.abs(my)>0.15;
 if(Math.abs(mx)>0.2&&!AUTO)p.face=sgn(mx);
 p.x=clamp(p.x+mx*spd*dt,16,ST.len-16);p.y=clamp(p.y+my*ST.spdY*dt,ST.ymin,ST.ymax);if(p.moving)p.walk+=Math.hypot(mx*spd,my*ST.spdY)*dt;
 s.cam=clamp(p.x-W*0.4,0,ST.len-W);
 p.hidden=hiddenAt(p);
 /* pickups */
 s.boxes.forEach(function(b){if(!b.taken&&Math.abs(b.x-p.x)<16&&Math.abs(b.y-p.y)<12){b.taken=true;s.ammo+=ST.box;sfx('pickup');pop(b.x,b.y-30,'AMMO +'+ST.box,'#7dfcff');emit('ammo',s.ammo)}});
 if(run&&s.ammo<=0&&guardsUp().length&&!s.boxes.some(function(b){return !b.taken})){var bx=clamp(p.x+p.face*60,30,ST.len-30);s.boxes.push({x:bx,y:p.y,taken:false,drop:true});emit('ammodrop')}
 /* guards */
 var seen=0;s.guards.forEach(function(g){if(g.st==='down')return;g.sees=false;
  if(g.st==='alert'){var dx=p.x-g.x,dy=p.y-g.y;g.face=sgn(dx)||g.face;
   if(Math.abs(dx)>24||Math.abs(dy)>7){var d=Math.hypot(dx,dy)||1;g.x+=dx/d*58*dt;g.y=clamp(g.y+dy/d*40*dt,ST.ymin,ST.ymax);g.walk+=58*dt}
   g.cd-=dt;if(g.cd<=0&&Math.abs(dx)<30&&Math.abs(dy)<10&&run){g.cd=1.2;g.punchT=0.3;g.hitAt=M.t+0.18}
   if(g.hitAt&&M.t>=g.hitAt){g.hitAt=0;if(Math.abs(p.x-g.x)<34&&Math.abs(p.y-g.y)<12&&p.inv<=0&&run){p.hp-=ST.dmg;p.hurtT=0.35;p.inv=0.6;p.x=clamp(p.x+g.face*10,16,ST.len-16);M.shake=0.25;sfx('punch');emit('hurt',p.hp);if(p.hp<=0)lifeLost()}}
   g.sees=!p.hidden;return}
  /* patrol */
  if(g.st==='patrol'){g.x+=g.face*22*dt;g.walk+=22*dt;if(g.face>0&&g.x>=g.x2||g.face<0&&g.x<=g.x1){g.x=clamp(g.x,g.x1,g.x2);g.st='look';g.t=0}}
  else if(g.st==='look'&&g.t>1.6){g.face=-g.face;g.st='patrol';g.t=0}
  var r=p.hidden||!run?0:sees(g,p);if(r>0){g.sees=true;seen=Math.max(seen,r)}});
 if(!run)return;
 if(s.alert){if(p.hidden||!guardsUp().some(function(g){return g.st==='alert'})){s.meter=Math.max(0,s.meter-0.35*dt);if(s.meter<=0)calm()}else s.meter=1}
 else if(seen>0){s.meter=Math.min(1,s.meter+seen*0.9*dt*(p.moving?1.15:1));if(s.meter>=1)alarm()}
 else s.meter=Math.max(0,s.meter-0.3*dt);
 /* door */
 if(s.clear&&p.x>ST.door-26&&p.y<ST.doorY+8){s.done=true;s.doorT=0;sfx('fanfare');emit('door',stats())}}
function alarm(){var s=M.s;s.alert=true;s.meter=1;M.stats.detected++;sfx('warn');M.flash=0.8;
 s.guards.forEach(function(g){if(g.st!=='down'&&Math.abs(g.x-s.p.x)<380){g.st='alert';g.cd=0.8}});emit('detected')}
function calm(){var s=M.s;s.alert=false;s.meter=0;s.guards.forEach(function(g){if(g.st==='alert'){g.st='patrol';g.x1=clamp(g.x-70,20,ST.len-40);g.x2=g.x1+140;g.face=-sgn(s.p.x-g.x)||1}});emit('lost')}
function lifeLost(){var s=M.s;s.lives--;s.respawnT=1.4;sfx('thud');emit('down',s.lives)}
function respawn(){var s=M.s,p=s.p;if(s.lives<=0){s.lives=ST.lives;M.stats.retries++;emit('retry')}
 p.x=s.check;p.y=192;p.hp=ST.hp;p.hurtT=0;p.inv=1;p.crouch=true;s.alert=false;s.meter=0;
 s.guards.forEach(function(g){if(g.st!=='down'){g.st='patrol';g.x=g.home[0];g.x1=g.home[1];g.x2=g.home[2];g.y=g.home[3];g.hitAt=0}});emit('respawn')}
function shoot(){var s=M.s,p=s.p;if(!s||M.st!=='run'||s.done||s.respawnT>0||p.cd>0)return false;
 if(s.ammo<=0){p.cd=0.3;sfx('whiff');pop(p.x,p.y-90,'NO AMMO','#ff6a8a');emit('empty');return false}
 s.ammo--;p.aimT=0.35;p.cd=0.45;M.stats.shots++;sfx('puff');
 var my=p.y,mxp=p.x+p.face*(p.crouch?34:32),myp=p.y-(p.crouch?50:60),best=null,bd=1e9;
 s.guards.forEach(function(g){if(g.st==='down')return;var dx=(g.x-p.x)*p.face;if(dx>0&&dx<ST.range&&Math.abs(g.y-my)<14&&dx<bd){bd=dx;best=g}});
 var ex=best?best.x:p.x+p.face*ST.range;M.fx.push({k:'shot',x1:mxp,y1:myp,x2:ex,y2:best?best.y-56:myp,t:0,life:0.16});M.fx.push({k:'puff',x:mxp,y:myp,t:0,life:0.25});
 if(best){var silent=!s.alert&&best.st!=='alert';best.st='down';best.t=0;best.hitAt=0;M.stats.kos++;if(silent)M.stats.silent++;add(ST.ko+(silent?ST.silent:0));s.check=Math.max(s.check,best.x-40);
  sfx('thud');pop(best.x,best.y-70,silent?'SILENT K.O. +500':'K.O. +300',silent?'#ffd23a':'#fff');emit('ko',{silent:silent,i:best.i,left:guardsUp().length});
  if(!guardsUp().length){s.clear=true;s.alert=false;s.meter=0;emit('clear')}}
 else{s.guards.forEach(function(g){if(g.st!=='down'&&g.st!=='alert'&&Math.abs(g.x-p.x)<140){g.face=sgn(p.x-g.x)||g.face;g.st='look';g.t=0}});s.meter=Math.min(0.95,s.meter+0.25)}
 return true}
function autoSneak(){var s=M.s,p=s.p,o={x:0,y:0},up=guardsUp();
 if(!up.length){p.crouch=false;o.x=sgn(ST.door-p.x);o.y=p.y>ST.doorY?-1:0;return o}
 if(s.ammo<=0){var bs=s.boxes.filter(function(b){return !b.taken}).sort(function(a,b){return Math.abs(a.x-p.x)-Math.abs(b.x-p.x)})[0];if(bs){p.crouch=false;o.x=clamp((bs.x-p.x)/10,-1,1);o.y=clamp((bs.y-p.y)/6,-1,1)}return o}
 var g=up.sort(function(a,b){return Math.abs(a.x-p.x)-Math.abs(b.x-p.x)})[0],dx=g.x-p.x,dy=g.y-p.y;
 p.crouch=!s.alert;if(Math.abs(dx)>4)p.face=sgn(dx);
 o.y=Math.abs(dy)>3?clamp(dy/8,-1,1):0;
 var want=s.alert?90:165;if(Math.abs(dx)>want)o.x=sgn(dx);else if(Math.abs(dx)<60)o.x=-sgn(dx)*0.7;
 if(Math.abs(dy)<10&&Math.abs(dx)<ST.range-25&&p.cd<=0)shoot();
 return o}
function stats(){return {score:M.score,rings:M.stats.rings,ringsN:FLY.n,perfRings:M.stats.perfRings,land:M.stats.land,spotted:M.stats.spotted,kos:M.stats.kos,silent:M.stats.silent,shots:M.stats.shots,detected:M.stats.detected,retries:M.stats.retries,time:M.stats.time,lives:M.s?M.s.lives:ST.lives}}

/* ---------- input ---------- */
function move(x,y){IN.x=clamp(x||0,-1,1);IN.y=clamp(y||0,-1,1)}
function press(k){if(!M)return false;
 if(M.stage==='fly'){var f=M.f;if(f.over&&(k==='jump'||k==='boost'))return jump();if(k==='boost'&&M.st==='run'&&f.boost<=0&&f.meter>=FLY.cost){f.boost=FLY.bT;f.meter-=FLY.cost;sfx('boost');emit('boost');return true}return false}
 if(M.stage==='stealth'){if(k==='shoot')return shoot();if(k==='sneak'){M.s.p.crouch=!M.s.p.crouch;emit('sneak',M.s.p.crouch);return true}}
 return false}
function setAuto(on){AUTO=!!on}

/* ---------- render ---------- */
function img(k){return SPR[k]||(window.RosadoFight&&window.RosadoFight.sprites&&window.RosadoFight.sprites[k])}
function meta(k){return META[k]||(window.RosadoFight&&window.RosadoFight.META&&window.RosadoFight.META[k])}
function drawSpr(g,k,x,y,flip,alpha,s){var im=img(k);if(!im)return false;var m=meta(k)||[im.naturalWidth,im.naturalHeight,im.naturalWidth/2];s=s||1;var w=im.naturalWidth/2*s,h=im.naturalHeight/2*s,ax=m[2]/2*s;
 g.save();if(alpha!=null)g.globalAlpha=alpha;g.translate(Math.round(x),Math.round(y));if(flip)g.scale(-1,1);g.drawImage(im,-ax,-h,w,h);g.restore();return true}
function cover(g,im,alignY){var sc=Math.max(W/im.width,H/im.height),bw=im.width*sc,bh=im.height*sc,ox=(W-bw)/2,oy=(H-bh)*(alignY==null?1:alignY);g.drawImage(im,ox,oy,bw,bh);return {sc:sc,ox:ox,oy:oy}}
function render(g,w,t){W=w;if(!M)return;var sk=M.shake>0?(Math.random()*2-1)*3*M.shake/0.25:0;g.setTransform(2,0,0,2,sk*2,0);g.imageSmoothingEnabled=false;
 if(M.stage==='fly')renderFly(g);else if(M.stage==='chute')renderChute(g);else renderStealth(g);
 g.font='bold 9px monospace';g.textAlign='center';
 M.pops.forEach(function(p){var x=M.stage==='stealth'?p.x-M.s.cam:p.x||W/2,y=(p.y||70)-p.t*24;g.globalAlpha=Math.max(0,1-p.t);g.fillStyle='#0a0420';g.fillText(p.txt,x+1,y+1);g.fillStyle=p.c;g.fillText(p.txt,x,y);g.globalAlpha=1});
 if(M.flash>0){g.fillStyle='rgba(255,40,80,'+(M.flash*0.22)+')';g.fillRect(0,0,W,H)}
 if(M.t<0.5){g.fillStyle='rgba(0,0,0,'+(1-M.t/0.5)+')';g.fillRect(0,0,W,H)}
 g.setTransform(1,0,0,1,0,0)}
function skyFallback(g,k){var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0a0420');gr.addColorStop(0.7,'#3a1450');gr.addColorStop(1,'#120818');g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.fillStyle='#ff6fb5';g.beginPath();g.arc(W*0.8,H*0.18,16,0,Math.PI*2);g.fill();
 for(var i=0;i<16;i++){var bx=((i*W/14)-(k||0)*0.2)%(W+40),bh=30+((i*37)%50);if(bx<-30)bx+=W+40;g.fillStyle=i%3?'#24123a':'#2c1848';g.fillRect(bx,H*0.82-bh,W/14-2,bh);g.fillStyle='#ffcf8a';g.fillRect(bx+4,H*0.82-bh+6,2,2)}
 g.fillStyle='#120a2a';g.fillRect(0,H*0.82,W,H*0.18)}
function renderFly(g){var f=M.f,bg=SPR['l4-fly-bg'],pan=clamp(f.s/f.len,0,1),yn=(f.y-FLY.ymin)/(FLY.ymax-FLY.ymin);
 if(bg){var sc=Math.max(W/bg.width,H/bg.height)*1.3,bw=bg.width*sc,bh=bg.height*sc,ox=-(bw-W)*lerp(0.02,1,pan),oy=(H-bh)*(0.5+0.5*yn);g.imageSmoothingEnabled=true;g.drawImage(bg,ox,oy,bw,bh);g.imageSmoothingEnabled=false}
 else skyFallback(g,f.s);
 /* water sparkles rushing under the plane */
 g.globalCompositeOperation='lighter';for(var i=0;i<24;i++){var lx=((i*61)-f.s*(1.2+(i%3)*0.3))%(W+20);if(lx<-10)lx+=W+20;g.fillStyle=i%2?'rgba(255,80,200,.5)':'rgba(80,220,255,.45)';g.fillRect(lx,H-8-(i%4)*3,6+(i%3)*3,1)}g.globalCompositeOperation='source-over';
 var PX=W*0.28;
 /* rings: left half behind the plane, right half in front */
 function ring(r,half){var x=r.x-f.s+PX;if(x<-30||x>W+30)return;var nxt=f.rings[f.next]===r,pulse=0.6+0.4*Math.sin(M.t*6),c=r.st==='hit'?'255,210,58':r.st==='miss'?'140,120,160':nxt?'255,70,200':'80,220,255',a=r.st?Math.max(0,1-r.t*1.2):nxt?1:0.75;if(a<=0)return;
  g.save();g.globalAlpha=a;g.lineWidth=nxt?3:2;g.strokeStyle='rgba('+c+','+(nxt?pulse:0.85)+')';g.shadowColor='rgba('+c+',1)';g.shadowBlur=6;g.beginPath();g.ellipse(x,r.y,8,24,0,half?-Math.PI/2:Math.PI/2,half?Math.PI/2:Math.PI*1.5);g.stroke();
  g.lineWidth=1;g.strokeStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(x,r.y,6,22,0,half?-Math.PI/2:Math.PI/2,half?Math.PI/2:Math.PI*1.5);g.stroke();g.restore();
  if(nxt&&!half){g.fillStyle='rgba(255,255,255,'+pulse+')';g.beginPath();g.moveTo(x+14,r.y);g.lineTo(x+20,r.y-4);g.lineTo(x+20,r.y+4);g.fill()}}
 f.rings.forEach(function(r){ring(r,false)});
 /* plane */
 var pl=SPR['l4-plane'],pw=Math.min(118,W*0.3),ph=pl?pw*pl.height/pl.width:pw*0.36,py=f.y,rot=clamp(f.vy/320,-0.3,0.3);
 if(f.jumped)py=f.y-f.jumpT*6;
 g.save();g.translate(PX,py);g.rotate(rot);
 if(pl)g.drawImage(pl,-pw/2,-ph/2,pw,ph);else{g.fillStyle='#e8e8ee';g.beginPath();g.ellipse(0,0,pw*0.45,ph*0.22,0,0,Math.PI*2);g.fill();g.fillStyle='#d6d6de';g.fillRect(-pw*0.3,-ph*0.42,pw*0.5,ph*0.12);g.fillStyle='#28a8ff';g.fillRect(pw*0.12,-ph*0.16,pw*0.16,ph*0.14)}
 g.globalCompositeOperation='lighter';[[-0.11,-0.33],[0.25,-0.22]].forEach(function(e){g.globalAlpha=0.22+0.06*Math.sin(M.t*90);g.fillStyle='#dfe8ff';g.beginPath();g.ellipse(pw*e[0],ph*e[1],pw*0.025,ph*0.22,0.2,0,Math.PI*2);g.fill()});
 g.globalAlpha=Math.floor(M.t*2)%2?1:0.35;g.fillStyle='#ff3040';g.fillRect(-pw*0.47,-ph*0.48,2,2);g.fillStyle='#30ff80';g.fillRect(pw*0.4,-ph*0.12,2,2);g.globalAlpha=1;
 if(f.boost>0){for(var n=0;n<6;n++){g.fillStyle=n%2?'rgba(255,120,220,.55)':'rgba(120,230,255,.55)';g.fillRect(-pw*0.5-10-n*7-Math.random()*4,-ph*0.3+n*4,8+n*2,1)}}
 g.globalCompositeOperation='source-over';g.restore();
 f.rings.forEach(function(r){ring(r,true)});
 /* jump: Richie drops out and the canopy pops open */
 if(f.jumped){var k=f.jumpT,jx=PX+10+k*8,jy=py+10+k*k*34,s=0.2+Math.min(0.15,k*0.12);if(!drawSpr(g,k>0.5?'l5-chute-c':'l5-chute-land',jx,jy,false,1,s)){g.fillStyle='#fff';g.fillRect(jx-2,jy-10,4,10)}
  if(k>1.1){g.fillStyle='rgba(0,0,0,'+clamp((k-1.1)/0.5,0,1)+')';g.fillRect(0,0,W,H)}}
 else if(f.over){/* jump marker: a pulsing down-arrow over the mansion lawn */var bl=0.5+0.5*Math.sin(M.t*8),ax=W*0.8,ay=H*0.5+bl*4;g.fillStyle='rgba(255,74,216,'+(0.6+0.4*bl)+')';g.beginPath();g.moveTo(ax-7,ay-8);g.lineTo(ax+7,ay-8);g.lineTo(ax,ay);g.fill()}}
function renderChute(g){var c=M.c,bg=SPR['l5-chute-bg'],L;
 if(bg)L=cover(g,bg,1);else{var sc=Math.max(W/800,H/450);L={sc:sc,ox:(W-800*sc)/2,oy:H-450*sc};skyFallback(g,0);g.fillStyle='#1d3a1d';g.fillRect(0,L.oy+330*L.sc,W,H);g.fillStyle='#e8c8e8';g.fillRect(L.ox+380*L.sc,L.oy+130*L.sc,400*L.sc,170*L.sc);g.fillStyle='#29d6ff';g.fillRect(L.ox+250*L.sc,L.oy+320*L.sc,420*L.sc,20*L.sc)}
 var X=function(x){return L.ox+x*L.sc},Y=function(y){return L.oy+y*L.sc};
 /* target ring on the lawn */
 var tx=X(CH.tx),ty=Y(CH.gy),pu=0.6+0.4*Math.sin(M.t*5);g.save();g.shadowColor='#7dfcff';g.shadowBlur=8;g.lineWidth=2;g.strokeStyle='rgba(125,252,255,'+pu+')';g.beginPath();g.ellipse(tx,ty,CH.ok*L.sc,CH.ok*L.sc*0.28,0,0,Math.PI*2);g.stroke();
 g.strokeStyle='rgba(255,80,210,'+pu+')';g.beginPath();g.ellipse(tx,ty,CH.perf*L.sc,CH.perf*L.sc*0.28,0,0,Math.PI*2);g.stroke();g.restore();
 g.fillStyle='rgba(125,252,255,.18)';g.beginPath();g.ellipse(tx,ty,CH.ok*L.sc,CH.ok*L.sc*0.28,0,0,Math.PI*2);g.fill();
 /* searchlights */
 g.globalCompositeOperation='lighter';CH.beams.forEach(function(b,i){if(b.off)return;var a=beamAng(b),len=CH.len*L.sc,ox=X(b.x),oy=Y(b.y),gr=g.createRadialGradient(ox,oy,2,ox,oy,len);var hot=c.inBeam[i];gr.addColorStop(0,hot?'rgba(255,120,140,.55)':'rgba(255,250,200,.5)');gr.addColorStop(1,'rgba(255,250,200,0)');g.fillStyle=gr;
  g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+Math.cos(a-CH.half)*len,oy+Math.sin(a-CH.half)*len);g.lineTo(ox+Math.cos(a+CH.half)*len,oy+Math.sin(a+CH.half)*len);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,230,.9)';g.beginPath();g.arc(ox,oy,2.5,0,Math.PI*2);g.fill()});
 /* wind streaks */
 c.streaks.forEach(function(s){var x=s.x*W,y=s.y*H*0.8,l=Math.abs(c.wind)*0.25+2;g.fillStyle='rgba(255,255,255,.18)';g.fillRect(c.wind<0?x:x-l,y,l,1)});
 g.globalCompositeOperation='source-over';
 /* Richie */
 var rx=X(c.x),ry=Y(c.y),pr=clamp((c.y-CH.y0)/(CH.gy-CH.y0),0,1),s=lerp(0.55,1,pr);
 g.fillStyle='rgba(0,0,0,'+(0.15+0.3*pr)+')';g.beginPath();g.ellipse(rx,ty,10*s+4,3,0,0,Math.PI*2);g.fill();
 if(c.landed){if(!drawSpr(g,'l5-chute-land',rx,ry,c.x<CH.tx,1,1)){g.fillStyle='#fff';g.fillRect(rx-4,ry-40,8,40)}
  if(c.result==='miss'){g.font='bold 12px monospace';g.textAlign='center';g.fillStyle='#ff6a8a';g.fillText('MISSED THE TARGET!',W/2,H*0.3)}}
 else{var st=c.steer,k=Math.abs(st)>0.35?'l5-chute-l':'l5-chute-c',fl=st<-0.35;if(!drawSpr(g,k,rx,ry,fl,1,s)){g.fillStyle='#2a3a6a';g.beginPath();g.arc(rx,ry-80*s,30*s,Math.PI,0);g.fill();g.strokeStyle='#ff7ad8';g.beginPath();g.moveTo(rx-28*s,ry-80*s);g.lineTo(rx,ry-36*s);g.lineTo(rx+28*s,ry-80*s);g.stroke();g.fillStyle='#fff';g.fillRect(rx-4*s,ry-36*s,8*s,36*s)}
  if(c.spotT>0){g.strokeStyle='rgba(255,60,90,'+c.spotT+')';g.lineWidth=2;g.strokeRect(rx-22*s,ry-100*s,44*s,100*s);g.lineWidth=1}}}
function renderStealth(g){var s=M.s,cx=Math.round(s.cam),i;
 for(i=Math.floor(cx/400);i<=Math.floor((cx+W)/400);i++){if(i<0||i>3)continue;var k=i===3?'b':'a',fl=i===1,x=i*400-cx,im=SPR['l5-grounds-'+k];
  if(im){g.save();if(fl){g.translate(x+400,0);g.scale(-1,1);g.drawImage(im,0,0,400,225)}else g.drawImage(im,x,0,400,225);g.restore()}
  else{g.fillStyle='#160c2c';g.fillRect(x,0,400,225);g.fillStyle='#d8b8d8';g.fillRect(x+170,40,230,100);g.fillStyle='#3a6a3a';g.fillRect(x,120,400,52);g.fillStyle='#8a6a7a';g.fillRect(x,172,400,22);g.fillStyle='#1d3a1d';g.fillRect(x,194,400,31);if(k==='b'){g.fillStyle='#6a3a1a';g.fillRect(x+287,100,22,32)}}}
 /* front door glow once the grounds are clear */
 if(s.clear){var dx=ST.door-cx-10,pu=0.5+0.5*Math.sin(M.t*5);g.save();g.shadowColor='#ffd23a';g.shadowBlur=10;g.strokeStyle='rgba(255,210,58,'+pu+')';g.lineWidth=2;g.strokeRect(dx,100,22,33);g.restore();
  g.font='bold 10px monospace';g.textAlign='center';g.fillStyle='#ffd23a';g.fillText('DOOR \u25BC',dx+11,92-pu*3)}
 /* flashlight cones */
 g.globalCompositeOperation='lighter';s.guards.forEach(function(gd){if(gd.st==='down')return;var gx=gd.x-cx,L=ST.cone,f=gd.face,al=gd.st==='alert',ex=gx+f*L,gr=g.createLinearGradient(gx,0,ex,0);
  gr.addColorStop(0,al?'rgba(255,90,110,.42)':gd.sees?'rgba(255,200,90,.5)':'rgba(255,240,170,.34)');gr.addColorStop(1,'rgba(255,240,170,0)');g.fillStyle=gr;
  g.beginPath();g.moveTo(gx+f*8,gd.y-3);g.lineTo(ex,gd.y-5-L*ST.coneW);g.lineTo(ex,gd.y+5+L*ST.coneW);g.lineTo(gx+f*8,gd.y+3);g.closePath();g.fill();
  g.fillStyle='rgba(255,240,170,.12)';g.beginPath();g.moveTo(gx+f*18,gd.y-62);g.lineTo(gx+f*L*0.7,gd.y-12);g.lineTo(gx+f*L*0.7,gd.y+8);g.closePath();g.fill()});
 g.globalCompositeOperation='source-over';
 var list=[];ST.decor.forEach(function(d){list.push({y:d[2],d:d})});ST.covers.forEach(function(h){list.push({y:h[1],h:h})});s.boxes.forEach(function(b){if(!b.taken)list.push({y:b.y-1,b:b})});
 s.guards.forEach(function(gd){list.push({y:gd.y,g:gd})});list.push({y:s.p.y,p:s.p});list.sort(function(a,b){return a.y-b.y});
 list.forEach(function(o){var x;if(o.d){x=o.d[1]-cx;if(x<-40||x>W+40)return;if(!drawSpr(g,'l5-'+o.d[0],x,o.d[2])){g.fillStyle='#e8d8e8';g.fillRect(x-12,o.d[2]-50,24,50)}}
  else if(o.h){x=o.h[0]-cx;if(x<-50||x>W+50)return;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,o.h[1],28,5,0,0,Math.PI*2);g.fill();if(!drawSpr(g,'l5-hedge',x,o.h[1]+2)){g.fillStyle='#2f5a2a';g.fillRect(x-28,o.h[1]-50,56,52)}}
  else if(o.b){var b=o.b;x=b.x-cx;if(x<-30||x>W+30)return;var bob=Math.sin(M.t*4+b.x)*1.5;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,b.y,10,3,0,0,Math.PI*2);g.fill();
   g.save();g.shadowColor='#7dfcff';g.shadowBlur=6+3*Math.sin(M.t*5);if(!drawSpr(g,'l5-ammo',x,b.y-2+bob)){g.fillStyle='#2a2a3a';g.fillRect(x-9,b.y-16+bob,18,14);g.fillStyle='#ff4ad8';g.fillRect(x-9,b.y-11+bob,18,2)}g.restore()}
  else if(o.g)drawGuard(g,o.g,cx);else drawRichie(g,o.p,cx)});
 M.fx.forEach(function(f){if(f.k==='shot'){g.globalCompositeOperation='lighter';g.strokeStyle='rgba(160,240,255,'+(1-f.t/f.life)+')';g.lineWidth=1;g.beginPath();g.moveTo(f.x1-cx,f.y1);g.lineTo(f.x2-cx,f.y2);g.stroke();g.globalCompositeOperation='source-over'}
  else{var r=3+f.t*20;g.fillStyle='rgba(230,230,255,'+(0.6*(1-f.t/f.life))+')';g.beginPath();g.arc(f.x-cx,f.y,r,0,Math.PI*2);g.fill()}});
 if(s.respawnT>0){g.fillStyle='rgba(0,0,0,'+clamp(1-Math.abs(s.respawnT-0.7)/0.7,0,1)+')';g.fillRect(0,0,W,H)}
 if(s.done){g.fillStyle='rgba(255,240,200,'+clamp(s.doorT/1.2,0,0.9)+')';g.fillRect(0,0,W,H)}}
function drawGuard(g,gd,cx){var x=gd.x-cx;if(x<-60||x>W+60)return;var fl=gd.face<0;
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,gd.y,gd.st==='down'?30:14,4,0,0,Math.PI*2);g.fill();
 if(gd.st==='down'){if(!drawSpr(g,'l5-guard-down',x,gd.y+2,fl)){g.fillStyle='#141420';g.fillRect(x-30,gd.y-12,60,12);g.fillStyle='#e0b090';g.fillRect(x+(fl?-34:24),gd.y-12,10,10)}
  /* cartoon stars + snore */
  for(var i=0;i<3;i++){var a=M.t*3+i*2.1,sx=x+(fl?20:-20)+Math.cos(a)*10,sy=gd.y-26+Math.sin(a)*3;g.fillStyle=i%2?'#ffd23a':'#fff';g.fillRect(sx-1,sy-1,3,3)}
  g.font='bold 8px monospace';g.textAlign='center';g.fillStyle='rgba(200,230,255,'+(0.5+0.5*Math.sin(M.t*2))+')';g.fillText('Zzz',x+(fl?30:-30),gd.y-36-((M.t*8)%6));return}
 var k=gd.st==='alert'?(gd.punchT>0?'l5-guard-punch':'l5-guard-run'):gd.st==='look'?'l5-guard-walk-0':'l5-guard-walk-'+(Math.floor(gd.walk/14)%2);
 if(!drawSpr(g,k,x,gd.y,fl)){g.fillStyle='#14141e';g.fillRect(x-10,gd.y-84,20,84);g.fillStyle='#e0b090';g.fillRect(x-6,gd.y-96,12,12);g.fillStyle='#000';g.fillRect(x-6,gd.y-92,12,3)}
 var mark=gd.st==='alert'?'!':gd.sees&&M.s.meter>0.15?'?':'';if(mark){g.font='bold 14px monospace';g.textAlign='center';g.fillStyle='#0a0420';g.fillText(mark,x+1,gd.y-98);g.fillStyle=mark==='!'?'#ff4a6a':'#ffd23a';g.fillText(mark,x,gd.y-99)}}
function drawRichie(g,p,cx){var x=p.x-cx,y=p.y,fl=p.face<0,al=p.hidden?0.55:p.inv>0&&Math.floor(M.t*12)%2?0.5:1;
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,y,14,4,0,0,Math.PI*2);g.fill();
 if(M.s.respawnT>0&&M.s.respawnT>0.7){if(drawSpr(g,'l3-r-down',x,y,fl,1))return}
 var k=p.hurtT>0?'l3-r-hurt':p.aimT>0?(p.crouch?'l5-r-crouch-aim':'l5-r-aim'):p.crouch?'l5-r-sneak-'+(p.moving?Math.floor(p.walk/14)%2:0):p.moving?'l3-r-walk-'+(Math.floor(p.walk/12)%4):'l3-r-walk-0';
 if(!img(k))k=p.crouch?'l5-r-sneak-0':'l5-r-aim';
 if(!drawSpr(g,k,x,y,fl,al)){var h=p.crouch?62:84;g.globalAlpha=al;g.fillStyle='#16161c';g.fillRect(x-7,y-h*0.5,14,h*0.5);g.fillStyle='#f4f4f4';g.fillRect(x-8,y-h*0.85,16,h*0.36);g.fillStyle='#d09060';g.fillRect(x-5,y-h,10,h*0.16);g.fillStyle='#bbb';g.fillRect(x-5,y-h-2,10,3);g.globalAlpha=1}
 if(p.hidden){g.font='bold 7px monospace';g.textAlign='center';g.fillStyle='#7dfcff';g.fillText('HIDDEN',x,y-(p.crouch?80:92))}}
function portrait(cv){var c=cv.getContext('2d'),w=cv.width,h=cv.height,im=SPR['l5-guard-portrait'];c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;
 if(im)c.drawImage(im,0,0,w,h);else{c.fillStyle='#14141e';c.fillRect(w*0.2,h*0.55,w*0.6,h*0.45);c.fillStyle='#e0b090';c.fillRect(w*0.32,h*0.18,w*0.36,h*0.4);c.fillStyle='#000';c.fillRect(w*0.32,h*0.3,w*0.36,h*0.08)}}

/* ---------- snapshot (tests) ---------- */
function snap(){if(!M)return null;var o={stage:M.stage,st:M.st,t:M.t,score:M.score,auto:AUTO,stats:stats(),sprites:spriteMode()};
 if(M.f&&M.stage==='fly'){var f=M.f,r=f.rings[f.next];o.fly={s:f.s,len:f.len,y:f.y,alt:Math.round((FLY.ymax+12-f.y)/(FLY.ymax-FLY.ymin)*900+240),meter:f.meter,boost:f.boost,next:f.next,ring:r?{x:r.x,y:r.y,dx:r.x-f.s}:null,hit:f.rings.filter(function(r){return r.st==='hit'}).length,miss:f.rings.filter(function(r){return r.st==='miss'}).length,n:f.rings.length,over:f.over,jumped:f.jumped}}
 if(M.c&&M.stage==='chute'){var c=M.c;o.chute={x:c.x,y:c.y,tx:CH.tx,dx:c.x-CH.tx,ft:Math.max(0,Math.round((CH.gy-c.y)/(CH.gy-CH.y0)*450)),wind:c.wind,steer:c.steer,landed:c.landed,result:c.result,tries:c.tries,inBeam:c.inBeam.slice(),beams:CH.beams.map(function(b){return {x:b.x,y:b.y,a:beamAng(b)}}),gy:CH.gy,ok:CH.ok,perf:CH.perf}}
 if(M.s&&M.stage==='stealth'){var s=M.s,p=s.p;o.stealth={p:{x:p.x,y:p.y,face:p.face,crouch:p.crouch,hp:p.hp,hidden:p.hidden,aim:p.aimT>0},lives:s.lives,ammo:s.ammo,meter:s.meter,alert:s.alert,cam:s.cam,clear:s.clear,done:s.done,
  guards:s.guards.map(function(g){return {x:g.x,y:g.y,st:g.st,face:g.face,sees:g.sees}}),up:guardsUp().length,boxes:s.boxes.filter(function(b){return !b.taken}).map(function(b){return {x:b.x,y:b.y}}),door:ST.door,respawn:s.respawnT>0}}
 return o}
var dev={speed:function(k){SPEED=Math.max(1,k|0)},
 flyTo:function(i){var f=M.f;i=Math.min(i,f.rings.length);for(var j=f.next;j<i;j++){f.rings[j].st='miss';f.rings[j].t=9}f.next=i;var r=f.rings[i];f.s=r?r.x-60:f.len-4;if(r){f.y=r.y;f.vy=0}},
 flyY:function(y){M.f.y=y;M.f.vy=0},meter:function(v){if(M.f&&M.stage==='fly')M.f.meter=v;else if(M.s)M.s.meter=v},
 chute:function(x,y){if(x!=null)M.c.x=x;if(y!=null)M.c.y=y},wind:function(w){M.c.wind=M.c.windTo=w;M.c.windT=99},beams:function(on){CH.beams.forEach(function(b){b.off=!on})},
 place:function(x,y){var p=M.s.p;p.x=x;if(y!=null)p.y=y;M.s.cam=clamp(p.x-W*0.4,0,ST.len-W)},ammo:function(n){M.s.ammo=n},hp:function(n){M.s.p.hp=n},
 guard:function(i,o){var g=M.s.guards[i];for(var k in o)g[k]=o[k]},koAll:function(){M.s.guards.forEach(function(g){g.st='down'});M.s.clear=true;M.s.alert=false;emit('clear')},
 alarm:function(){alarm()},state:function(){return M}};
window.RosadoMansion={SLOTS:SLOTS,META:META,FLY:FLY,CH:CH,ST:ST,start:start,go:go,update:update,render:render,move:move,press:press,hold:function(){},setAuto:setAuto,auto:function(){return AUTO},
 on:on,snap:snap,portrait:portrait,loadSprites:loadSprites,spriteMode:spriteMode,dev:dev,stage:function(){return M?M.stage:''}};
})();
