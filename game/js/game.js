/* Rosado Nights · v0.3.2
   Level 3 "The Alley" (js/fight.js): side-scrolling street brawl vs El Jefe Esteban Lavanda; only reachable from the Level 2 complete card.
   Level 1 "Causeway Chase": drive Richie across the rainy neon bridge to Shred Zeppelin (js/drive.js).
   Level 2 "Reps for Jesus" (the gym):
   Phase 1: bench press 400 lbs × 3 (tap PUSH fast; each rep needs more taps and the bar sinks faster).
   Phase 2: heavy bag timing (tap PUNCH while the marker is in the pink zone; 12 good hits before time runs out).
   No network, no tracking. localStorage only keeps level-1-done + best combo / best bag time. */
(function(){
"use strict";
var VERSION='0.3.2';
var T=window.RosadoTheme,SFX=window.RosadoSFX,ART=window.RosadoArt,DRIVE=window.RosadoDrive,FIGHT=window.RosadoFight;
var $=function(id){return document.getElementById(id)};
var app=$('app'),cv=$('scene'),g=cv.getContext('2d'),buf=document.createElement('canvas'),bg=null,bgW=0;
var LH=ART.H;
/* Optional art: put images in game/assets/ and list them here to replace the canvas art (slot boxes are documented in art.js).
   Leave a slot out (or let the file fail to load) and the built-in canvas art is used. Example:
   var SPRITES={'bg':'assets/gym-bg.webp?v=0.1.0','apollo-spot':'assets/apollo-spot.webp?v=0.1.0','richie-bench-down':'assets/richie-bench-down.webp?v=0.1.0'}; */
var AV='?v=0.3.2',SPRITES={bg:'assets/gym-bg.webp'+AV,bag:'assets/bag.webp'+AV,'bench-empty':'assets/bench-empty.webp'+AV,
 'richie-idle':'assets/richie-idle.webp'+AV,'apollo-cross':'assets/apollo-cross.webp'+AV,
 'richie-portrait':'assets/richie-portrait.webp'+AV,'apollo-portrait':'assets/apollo-portrait.webp'+AV};
/* multi-frame sprites (v0.2.1): bench press 0-2, Apollo spot/cheer, boxing guard/guard-low/jab/cross, walk cycle */
[['richie-press',3],['apollo-spot',2],['apollo-cheer',2],['richie-box',4],['richie-walk',4]].forEach(function(f){for(var i=0;i<f[1];i++)SPRITES[f[0]+'-'+i]='assets/'+f[0]+'-'+i+'.webp'+AV});
var DSPRITES={car:'assets/drive-car.webp'+AV,biker:'assets/drive-biker.webp'+AV,'biker-lean':'assets/drive-biker-lean.webp'+AV,van:'assets/drive-van.webp'+AV,
 oil:'assets/drive-oil.webp'+AV,spikes:'assets/drive-spikes.webp'+AV,nitro:'assets/drive-nitro.webp'+AV,sky:'assets/drive-sky.webp'+AV,gym:'assets/drive-gym.webp'+AV,'biker-portrait':'assets/biker-portrait.webp'+AV};

var FSPRITES={};FIGHT.SLOTS.forEach(function(k){FSPRITES[k]='assets/'+k+'.webp'+AV});

/* ---------- difficulty ---------- */
/* taps: taps needed with no drain; drain: bar sink per second while tapping; idle: extra sink multiplier after IDLE seconds without a tap */
var REPS=[{taps:8,drain:0.12},{taps:11,drain:0.20},{taps:14,drain:0.28}],IDLE=0.35,IDLE_MULT=2.5;
var BAG={target:12,time:45,every:3,
 speed:[0.75,0.95,1.2,1.45],   /* marker sweeps per second across the track */
 zone:[0.13,0.115,0.10,0.09],  /* half-width of the pink zone (track = 1) */
 center:[0.5,0.6,0.42,0.55],perfect:0.035,cdGood:0.18,cdMiss:0.45};

/* ---------- state ---------- */
var S,musicOn=true,paused=false,started=false,last=0,clock=0,level=1,dsnap=null;
function fresh(){return {phase:'intro',rep:0,h:0,hDisp:0,peak:0,lastTap:-9,taps:0,tapsPerRep:[],timer:0,
 hits:0,combo:0,bestCombo:0,misses:0,perfects:0,timeLeft:BAG.time,m:0,cd:0,punchT:-1,bagAng:0,bagVel:0,bagFlash:0,bagSquash:0,
 parts:[],shake:0,shout:'',shoutT:0,apolloExpr:'smile',richieExpr:'calm',apolloArms:'cross',fistT:0,bagStart:0,record:false,lastPunch:-9,punchSide:0,flash:0,exitX:null,walking:false,story:[]}}
S=fresh();
var store={get:function(){try{return JSON.parse(localStorage.getItem('rosadoNights.l1')||'{}')||{}}catch(e){return {}}},
 set:function(o){try{var c=store.get();for(var k in o)c[k]=o[k];localStorage.setItem('rosadoNights.l1',JSON.stringify(c))}catch(e){}}};

/* ---------- layout ---------- */
var W=400,scale=1,ox=0,oy=0,dpr=1;
function resize(){
 var v=$('view'),cw=v.clientWidth,ch=v.clientHeight;if(!cw||!ch)return;
 dpr=Math.min(window.devicePixelRatio||1,2);
 W=Math.max(ch>cw*0.9?260:300,Math.min(500,Math.round(cw/ch*LH)));
 scale=Math.min(cw/W,ch/LH);ox=(cw-W*scale)/2;oy=(ch-LH*scale)/2;
 cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
 var bs=level===3?2:1;if(W!==bgW){bg=ART.makeBg(W);bgW=W}if(buf.width!==W*bs||buf.height!==LH*bs){buf.width=W*bs;buf.height=LH*bs}
 render();
}

/* ---------- UI helpers ---------- */
function setMode(m){app.dataset.mode=m||''}
function hud(on){app.dataset.hud=on?'1':'0'}
function ctl(on){app.dataset.ctl=on?'1':'0'}
function shout(txt,dur){var el=$('shout');if(S.shout===txt&&S.shoutT>0){S.shoutT=dur||1.2;return}S.shout=txt;S.shoutT=dur||1.2;if(txt!=='RAGE!')el.classList.remove('rage');el.textContent=txt;el.classList.add('on')}
function bump(id){var el=$(id);if(!el)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
function pop(txt,cls){var el=$('pop');el.className='';void el.offsetWidth;el.textContent=txt;el.className=cls+' go'}
function updHud(){
 $('rep').textContent='REP '+Math.min(S.rep+1,3)+'/3';
 $('hits').textContent='HITS '+S.hits+'/'+BAG.target;
 $('time').textContent='TIME '+Math.ceil(Math.max(0,S.timeLeft));
 $('combo').textContent='COMBO x'+S.combo;
}

/* ---------- dialogue ---------- */
var DQ=null;
function talk(lines,done){
 DQ={lines:lines,i:-1,done:done,typed:0,full:'',shownAt:0};ctl(false);$('dialog').hidden=false;nextLine();
}
function nextLine(){
 DQ.i++;if(DQ.i>=DQ.lines.length){var d=DQ.done;DQ=null;$('dialog').hidden=true;if(d)d();return}
 var L=DQ.lines[DQ.i],who=$('who');who.textContent=L.who==='richie'?'RICHIE':L.who==='biker'?'BIKER GANG':L.who==='jefe'?'EL JEFE':'FLEXECUTIONER';who.className='who '+L.who;
 if(L.on)L.on();
 face(L.who,L.expr||'smile');DQ.full=L.text;DQ.typed=0;DQ.shownAt=clock;$('line').textContent='';
 if(L.who==='apollo')S.apolloExpr=L.expr||'smile';
}
function face(who,expr){if(who==='biker')DRIVE.portrait($('face'));else if(who==='jefe')FIGHT.portrait($('face'));else ART.portrait($('face'),who,expr)}
function tapDialog(){
 if(!DQ||paused)return;if(clock-DQ.shownAt<0.25)return;
 if(DQ.typed<DQ.full.length){DQ.typed=DQ.full.length;$('line').textContent=DQ.full;return}
 SFX.blip();nextLine();
}
function typeTick(dt){if(!DQ||DQ.typed>=DQ.full.length)return;var n=Math.min(DQ.full.length,DQ.typed+dt*48);if(Math.floor(n)!==Math.floor(DQ.typed))$('line').textContent=DQ.full.slice(0,Math.floor(n));DQ.typed=n;if(n>=DQ.full.length)$('line').textContent=DQ.full}

var J=function(t){return {who:'jefe',text:t,expr:'smile'}};
var A=function(t,e){return {who:'apollo',text:t,expr:e||'smile'}},Rc=function(t,e){return {who:'richie',text:t,expr:e||'smile'}},Bk=function(t,f){return {who:'biker',text:t,on:f}};
var DLINES={
 intro:[Rc('Gotta get to Shred Zeppelin. Big lift tonight.','calm'),
  Bk('There he is! Get him!',function(){DRIVE.spawnIntro()}),
  Rc('Not tonight, fellas. Hold on tight!','strain'),
  Rc('Tap \u25C0 \u25B6 to switch lanes. Swerve into the bikers to bump them off. Tap BOOST to zoom!','smile')],
 wreck:[Rc('Whoa! That was close. Back to the checkpoint. Let\u2019s go again!','smile')],
 arrive:[Rc('Made it to Shred Zeppelin! Those bikers couldn\u2019t keep up.','smile'),Rc('Now let\u2019s go lift something heavy.','calm')]
};
var LINES={
 intro:[A('Time to smash that record before you go back on the streets!','cheer'),
  Rc('400 pounds. Three reps. Here at Shred Zeppelin. Let\u2019s do this.','calm'),
  A('I\u2019m right behind you. Tap PUSH fast to drive the bar up. If you stop, it sinks!')],
 between:[[A('That\u2019s one! Strong and steady. Two more!','cheer')],[A('One more! Push! This one\u2019s for the record!','cheer')]],
 record:[A('NEW RECORD! 400 pounds, three times!','cheer'),Rc('Thanks for the spot, brother.','smile'),
  A('Now the heavy bag. Tap PUNCH when the marker is in the pink zone. 12 good hits!')],
 timeout:[A('Time! So close. Shake it off and go again!','smile')],
 bagDone:[A('That\u2019s the Richie I know! Fast hands, strong heart.','cheer')],
 alley:[Rc('I hear something in the alley.','calm'),Rc('The streets need me. Let\u2019s go.','calm')]
};
var FLINES={
 start:[Rc('Somebody\u2019s making noise in my alley.','calm'),Rc('Joystick to walk. ATTACK for a combo, JUMP + ATTACK to kick, SPECIAL to spin. Let\u2019s clean up this street!','smile')],
 boss:[J('You walked into the wrong alley, old man.'),Rc('Old? I just benched 400. Let\u2019s dance, Lavanda.','calm')],
 bossDown:[J('My suit! This is linen!'),Rc('Should\u2019ve worn something stretchy.','smile')],
 car:[Rc('Hey! My car!','strain'),Rc('They scratched my car... Escobar\u2019s a dead man.','strain'),Rc('Time to pay Escobar a visit.','calm')],
 lose:[Rc('Oof! Shake it off, Richie. Let\u2019s go again!','smile')]
};

/* ---------- flow ---------- */
function begin(lv){
 SFX.unlock();if(musicOn&&T&&T.supported)T.play();
 started=true;$('intro').hidden=true;if(lv===2)startLevel();else startDrive();
}
function setLevel(lv){var was=level;level=lv;app.dataset.level=String(lv);document.title=lv===1?'Rosado Nights \u00B7 Level 1: Causeway Chase':lv===3?'Rosado Nights \u00B7 Level 3: The Alley':'Rosado Nights \u00B7 Level 2: Reps for Jesus \u00B7 Shred Zeppelin';
 var a=$('scene');a.setAttribute('aria-label',lv===1?'Causeway Chase: Richie drives to Shred Zeppelin':lv===3?'The Alley: Richie fights El Jefe\u2019s bodyguards':'Shred Zeppelin: Richie and Flexecutioner');
 if(lv!==3){if(typeof CUT==='object'&&CUT&&CUT.on){CUT.done=true;cutClose()}fctl(false);setAuto(false);$('bossbar').hidden=true;$('goArrow').hidden=true}if(was!==lv)resize()}
function cards(){['done','done1','done3','intro3'].forEach(function(id){$(id).hidden=true})}
/* ---------- level 1: the drive ---------- */
function startDrive(){
 setLevel(1);S=fresh();S.phase='drive';cards();$('record').hidden=true;setMode('');hud(true);dctl(false);DRIVE.intro();setSelf(false);
 talk(DLINES.intro,function(){DRIVE.go();dctl(true);shout('GO! GO! GO!',1.2)});
}
function dctl(on){app.dataset.dctl=on?'1':'0'}
DRIVE.on('hit',function(k){shout(k==='oil'?'SLIPPERY!':k==='spikes'?'OUCH! SPIKES!':'HEY! WATCH IT!',0.9)});
DRIVE.on('bump',function(n){shout(['BUMPED!','SEE YA!','BOING!','SPIN OUT!','BYE BYE!'][n%5],0.9)});
DRIVE.on('checkpoint',function(){shout('CHECKPOINT!',1.3)});
DRIVE.on('van',function(){shout('ARMORED VAN AHEAD!',1.5)});
DRIVE.on('boost',function(){shout('N2O BOOST!',0.8)});
DRIVE.on('nitro',function(){shout('+N2O',0.6)});
DRIVE.on('smash',function(){shout('SMASHED IT!',0.7)});
DRIVE.on('wrecking',function(){dctl(false);shout('WHOA!',1.2)});
DRIVE.on('wreck',function(){if(DRIVE.self())setTimeout(function(){if(DQ&&DRIVE.self()&&!paused){DQ.typed=DQ.full.length;nextLine()}},1800);talk(DLINES.wreck,function(){DRIVE.retry();dctl(true);shout('FROM THE CHECKPOINT!',1.3)})});
DRIVE.on('arrive',function(){dctl(false);shout('SHRED ZEPPELIN AHEAD!',1.6)});
DRIVE.on('finish',function(st){SFX.fanfare();store.set({l1done:true});talk(DLINES.arrive,function(){showDone1(st)})});
function showDone1(st){
 S.phase='done1';hud(false);SFX.engine(0);
 $('stats1').innerHTML='Bikers bumped: <b>'+st.bumps+'</b> \u00B7 Oil &amp; spikes dodged: <b>'+st.dodged+'</b><br>Time: <b>'+st.time.toFixed(1)+'s</b> \u00B7 Health left: <b>'+Math.round(DRIVE.snap().health)+'%</b>'+(st.retries?' \u00B7 retries: '+st.retries:'');
 $('done1').hidden=false;
}
var dh={};function setTxt(id,v){if(dh[id]!==v){dh[id]=v;$(id).textContent=v}}function setW(id,v){v=Math.round(v*1000)/10;if(dh[id]!==v){dh[id]=v;$(id).style.width=v+'%'}}
function driveHud(){var d=DRIVE.snap();dsnap=d;
 var seg=Math.ceil(d.health/10);if(dh.seg!==seg){dh.seg=seg;var c=$('hpbar').children;for(var i=0;i<c.length;i++)c[i].className=i<seg?(seg<=3?'on low':'on'):''}
 setTxt('dist',(d.dist/1000).toFixed(2));setW('distFill',1-d.dist/DRIVE.CFG.dist);
 setTxt('kmh',String(Math.round(d.kmh)));setTxt('gear',String(Math.max(1,Math.min(6,Math.floor(d.kmh/38)+1))));setW('n2oFill',d.meter);
 var rdy=d.meter>=DRIVE.CFG.boostMin&&d.boost<=0&&d.st==='run';if(dh.rdy!==rdy){dh.rdy=rdy;$('boost').classList.toggle('off',!rdy)}
 if(dh.on!==(d.boost>0)){dh.on=d.boost>0;app.classList.toggle('boosting',dh.on)}
}
/* ---------- level 3: the alley ---------- */
function fctl(on){app.dataset.fctl=on?'1':'0';if(!on){FIGHT.move(0,0);stickReset();keys={}}}
function showIntro3(){SFX.unlock();$('intro').hidden=true;setLevel(3);S=fresh();S.phase='intro3';cards();hud(false);setMode('');app.classList.remove('boosting');SFX.engine(0);FIGHT.start();FIGHT.hold(false);
 $('intro3').hidden=false;themeOn()}
/* v0.3.2: the alley plays the usual Rosado Nights theme (same song as the menu, Level 1 and Level 2), boss and ending included */
function themeOn(){if(musicOn&&T&&T.supported)T.play()}
function startFight(){SFX.unlock();$('intro').hidden=true;started=true;setLevel(3);S=fresh();S.phase='fight';cards();hud(true);setMode('');SFX.engine(0);FIGHT.start();dh={};
 themeOn();ART.portrait($('fface'),'richie','calm');FIGHT.portrait($('bface'));$('bossbar').hidden=true;
 setTimeout(function(){if(level===3&&S.phase==='fight'&&FIGHT.snap().st==='ready'||level===3&&S.phase==='fight'&&FIGHT.snap().st==='intro')talk(FLINES.start,function(){FIGHT.go();fctl(true);shout('FIGHT!',1.2)})},1300)}
function autoTalk(){if(!FIGHT.auto())return;setTimeout(function(){if(DQ&&level===3&&FIGHT.auto()&&!paused){DQ.typed=DQ.full.length;$('line').textContent=DQ.full;SFX.blip();nextLine();autoTalk()}else if(DQ&&level===3&&FIGHT.auto())autoTalk()},1700)}
function ftalk(lines,done){talk(lines,done);autoTalk()}
FIGHT.on('wave',function(n){shout('WAVE '+n+'!',1.2)});
var rageTO=null;FIGHT.on('rage',function(){shout('RAGE!',1);var el=$('shout');el.classList.remove('rage');void el.offsetWidth;el.classList.add('rage');clearTimeout(rageTO);rageTO=setTimeout(function(){el.classList.remove('rage')},1000)});
FIGHT.on('clear',function(n){shout(n<FIGHT.WAVES.length?'CLEAR! GO \u2192':'CLEAR! GO \u2192',1.2)});
FIGHT.on('boss',function(){fctl(false);$('bossbar').hidden=false;ftalk(FLINES.boss,function(){FIGHT.hold(false);fctl(true);shout('BOSS FIGHT!',1.3)})});
FIGHT.on('whistle',function(){shout('FWEET! BOYS, GET HIM!',1.6)});
FIGHT.on('hug',function(){shout('BEAR HUG! MASH ATTACK!',1.2)});
FIGHT.on('pickup',function(k){shout(k==='empanada'?'EMPANADAS! +HEALTH':k==='watch'?'GOLD WATCH! +1000':'GOLD CANE!',1)});
FIGHT.on('life',function(n){shout('BACK ON YOUR FEET!',1.2)});
FIGHT.on('lose',function(){fctl(false);ftalk(FLINES.lose,function(){FIGHT.retryWave();fctl(true);shout('TRY AGAIN!',1.2)})});
FIGHT.on('bossDown',function(){fctl(false);SFX.fanfare();shout('K.O.!',1.6);setTimeout(function(){if(level!==3)return;ftalk(FLINES.bossDown,function(){$('bossbar').hidden=true;playCut()})},1600)});
FIGHT.on('carSeen',function(){ftalk(FLINES.car,function(){FIGHT.driveOff();SFX.engine(0.5);shout('NEXT: LEVEL 4 \u00B7 THE AIRFIELD',2)})});
FIGHT.on('finish',function(st){SFX.engine(0);showDone3(st)});
/* v0.3.2: Mike's Level 3 -> Level 4 cutscene video. It replaces the in-game car ending after El Jefe's KO;
   that in-game ending stays only as the fallback when the video can't load or play. Game music pauses while it plays. */
var CUT={on:false,src:'assets/cutscene-escobar.mp4'+AV,state:'off',music:false,timer:null,done:false,fallback:false,how:''};
function playCut(){var v=$('cutv');CUT.on=true;CUT.done=false;CUT.fallback=false;CUT.how='';CUT.state='loading';S.phase='cut';FIGHT.cutscene();fctl(false);hud(false);$('bossbar').hidden=true;$('goArrow').hidden=true;
 CUT.music=!!(T&&T.isPlaying());if(CUT.music)T.pause();
 $('cut').hidden=false;$('cutTap').hidden=true;app.classList.add('cutting');
 v.onended=function(){endCut('ended')};v.onerror=function(){cutFail('error')};v.onplaying=function(){CUT.state='playing';$('cutTap').hidden=true;clearTimeout(CUT.timer)};
 v.muted=false;v.src=CUT.src;try{v.load()}catch(e){}cutPlay();
 clearTimeout(CUT.timer);CUT.timer=setTimeout(function(){if(CUT.on&&CUT.state==='loading')cutFail('timeout')},12000)}
function cutPlay(){var v=$('cutv'),pr=null;try{pr=v.play()}catch(e){}
 if(pr&&pr.catch)pr.catch(function(err){if(!CUT.on||CUT.done)return;
  if(err&&err.name==='NotAllowedError'){CUT.state='tap';$('cutTap').hidden=false;clearTimeout(CUT.timer);
   /* AUTO FIGHT with nobody tapping: move on to the complete card */
   if(FIGHT.auto())CUT.timer=setTimeout(function(){if(CUT.on&&CUT.state==='tap')endCut('auto')},8000)}
  else if(!err||err.name!=='AbortError')cutFail('play')})}
function cutClose(){clearTimeout(CUT.timer);CUT.on=false;var v=$('cutv');v.onended=v.onerror=v.onplaying=null;try{v.pause()}catch(e){}v.removeAttribute('src');try{v.load()}catch(e){}
 $('cut').hidden=true;$('cutTap').hidden=true;app.classList.remove('cutting');if(musicOn&&T&&T.supported)T.play()}
function endCut(how){if(!CUT.on||CUT.done)return;CUT.done=true;CUT.how=how;CUT.state='off';cutClose();showDone3(FIGHT.cutDone())}
function cutFail(why){if(!CUT.on||CUT.done)return;CUT.done=true;CUT.fallback=true;CUT.how='fallback:'+why;CUT.state='off';cutClose();S.phase='fight';hud(true);FIGHT.ending()}
$('cutSkip').addEventListener('click',function(e){e.preventDefault();endCut('skip')});
$('cutTap').addEventListener('click',function(e){e.preventDefault();CUT.state='loading';$('cutTap').hidden=true;cutPlay()});
function showDone3(st){S.phase='done3';S.shoutT=0;$('shout').classList.remove('on');hud(false);fctl(false);setAuto(false);$('bossbar').hidden=true;$('goArrow').hidden=true;confetti(60);
 var b=store.get(),best=Math.max(b.l3best||0,st.score);store.set({l3done:true,l3best:best});
 $('stats3').innerHTML='Score: <b>'+st.score+'</b> \u00B7 Bodyguards down: <b>'+st.kos+'</b><br>Time: <b>'+st.time.toFixed(1)+'s</b> \u00B7 Lives left: <b>'+st.lives+'</b>'+(st.stats.retries?' \u00B7 retries: '+st.stats.retries:'')+'<br><small>Your best: '+best+'</small>';
 $('done3').hidden=false;var c=$('done3').querySelector('.cardin');if(c){c.classList.remove('burst');void c.offsetWidth;c.classList.add('burst')}}
function fightHud(){var f=FIGHT.snap();if(!f)return;
 var rg=f.rage/f.rageMax;setW('fragei',rg);var full=rg>=1;if(dh.rfull!==full){dh.rfull=full;$('frage').classList.toggle('full',full);$('fSpec').classList.toggle('ready',full)}
 setW('fhpi',Math.max(0,f.player.hp)/100);var low=f.player.hp<=30;if(dh.low!==low){dh.low=low;$('fhp').classList.toggle('low',low)}
 setTxt('lives','\u00D7'+f.lives);setTxt('score',('000000'+f.score).slice(-6));
 var wt=f.boss?(f.boss.hp>0?'BOSS':''):f.wave>0?'WAVE '+Math.min(f.wave,f.waves)+'/'+f.waves:'';setTxt('wtag',wt);
 var eb=f.ehud&&!(f.boss&&f.ehud.name===FIGHT.TYPES.jefe.name);if(dh.eb!==eb){dh.eb=eb;$('ebar').hidden=!eb}if(eb){setTxt('ename',f.ehud.name);setW('ehp',f.ehud.hp/f.ehud.max)}
 if(f.boss){setW('bhp',f.boss.hp/f.boss.max)}
 var go=!!f.go;if(dh.go!==go){dh.go=go;$('goArrow').hidden=!go}}
function setAuto(on){FIGHT.setAuto(on);var b=$('autoBtn');b.setAttribute('aria-pressed',on?'true':'false');$('autoState').textContent=on?'ON':'OFF';app.classList.toggle('autofight',!!on);$('autoInd').hidden=!on;if(on&&DQ&&level===3)autoTalk()}
function toggleAuto(){if(paused||level!==3)return;SFX.unlock();SFX.blip();var on=!FIGHT.auto();setAuto(on);shout(on?'AUTO FIGHT ON':'AUTO FIGHT OFF',0.9)}
function manual(){if(FIGHT.auto()){setAuto(false);shout('AUTO FIGHT OFF',0.9)}}
function fpress(k){if(paused||level!==3||app.dataset.fctl!=='1')return;SFX.unlock();manual();FIGHT.press(k)}
/* virtual joystick + held keys */
var stickId=null,stickV={x:0,y:0},keys={};
function stickReset(){stickId=null;stickV={x:0,y:0};var k=$('knob');if(k)k.style.transform=''}
function applyMove(){var kx=(keys.r?1:0)-(keys.l?1:0),ky=(keys.d?1:0)-(keys.u?1:0),x=stickV.x||kx,y=stickV.y||ky;
 if(Math.abs(x)>0.3||Math.abs(y)>0.3)manual();if(!FIGHT.auto())FIGHT.move(x,y)}
function stickAt(e){var st=$('stick'),r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2,dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R,m=Math.hypot(dx,dy);
 if(m>1){dx/=m;dy/=m}stickV={x:Math.abs(dx)<0.2?0:dx,y:Math.abs(dy)<0.25?0:dy};$('knob').style.transform='translate('+(dx*R*0.55)+'px,'+(dy*R*0.55)+'px)';applyMove()}

/* ---------- level 2: the gym ---------- */
function startLevel(){
 setLevel(2);dctl(false);SFX.engine(0);setSelf(false);cards();app.classList.remove('boosting');
 S=fresh();S.phase='talk';$('record').hidden=true;setMode('press');hud(true);updHud();
 talk(LINES.intro,startRep);
}
function startRep(){S.pressStarted=true;S.phase='press';S.h=0;S.peak=0;S.taps=0;S.lastTap=clock;setMode('press');updHud();ctl(true);$('action').textContent='PUSH!';shout('TAP FAST!',1.2)}
function repDone(){
 S.tapsPerRep.push(S.taps);S.phase='lockout';S.timer=0;ctl(false);SFX.clank(1);S.shake=1.2;shout('REP '+(S.rep+1)+'!',1);bump('rep')}
function afterLower(){
 S.rep++;
 if(S.rep<3){S.phase='talk';updHud();talk(LINES.between[S.rep-1],startRep)}
 else{S.phase='record';S.timer=0;S.record=true;$('record').hidden=false;SFX.rack();setTimeout(function(){if(S.phase==='record')SFX.sting()},180);confetti(70);S.apolloExpr='cheer';S.flash=1;S.shake=1.6;bump('record')}
}
function startBag(){
 S.phase='bag';S.hits=0;S.combo=0;S.misses=0;S.perfects=0;S.timeLeft=BAG.time;S.m=0;S.cd=0;S.bagStart=clock;S.apolloArms='cross';S.richieExpr='calm';
 setMode('bag');updHud();ctl(true);$('action').textContent='PUNCH!';shout('12 GOOD HITS!',1.4);
}
function bagLevel(){return Math.min(BAG.speed.length-1,Math.floor(S.hits/BAG.every))}
function bagDone(){
 S.phase='bagEnd';ctl(false);S.apolloArms='fist';S.apolloExpr='cheer';SFX.fanfare();confetti(40);
 var used=BAG.time-S.timeLeft,b=store.get(),o={bestCombo:Math.max(b.bestCombo||0,S.bestCombo),bestBagTime:b.bestBagTime?Math.min(b.bestBagTime,used):used,record:'400 LBS x 3'};
 store.set(o);S.result={used:used,best:o};
 setTimeout(function(){if(S.phase==='bagEnd')talk(LINES.bagDone,alleyNoise)},900);
}
/* story beat (v0.2.1): a crash in the alley, Richie turns, then walks off to the right -> Level 3 teaser */
function alleyNoise(){S.phase='noise';S.timer=0;S.story.push('noise');S.apolloArms='cross';S.apolloExpr='smile';SFX.clang();S.shake=1.4;shout('CLANG! CRASH!',1.1)}
function alleyTurn(){S.phase='turn';S.story.push('turn');S.exitX=EXIT0;S.walking=false;talk(LINES.alley,alleyExit)}
function alleyExit(){S.phase='exit';S.timer=0;S.walking=true;S.story.push('exit');shout('TO THE ALLEY →',1.6)}
var EXIT0=640,EXIT_SPEED=300;
function showDone(){
 S.phase='done';S.walking=false;S.story.push('done');confetti(90);hud(false);setMode('');var r=S.result;
 $('stats').innerHTML='Bench press: <b>400 LBS × 3</b> · NEW RECORD<br>Heavy bag: <b>'+S.hits+' hits</b> in '+r.used.toFixed(1)+'s · best combo <b>x'+S.bestCombo+'</b> ('+S.perfects+' perfect)<br><small>Your best: combo x'+r.best.bestCombo+' · fastest bag '+r.best.bestBagTime.toFixed(1)+'s</small>';
 $('done').hidden=false;var c=$('done').querySelector('.cardin');if(c){c.classList.remove('burst');void c.offsetWidth;c.classList.add('burst')}
}

/* ---------- actions ---------- */
function action(){
 if(paused)return;SFX.unlock();
 if(S.phase==='press'){
  var c=REPS[S.rep];S.h=Math.min(1,S.h+1/c.taps);S.taps++;S.lastTap=clock;S.peak=Math.max(S.peak,S.h);
  SFX.strain(S.h);S.shake=Math.max(S.shake,0.35+S.rep*0.25);
  if(S.h>=1)repDone();else if(S.h>0.72)shout('LOCK IT OUT!',0.8);else if(S.rep===2&&S.h>0.4)shout('ONE MORE! PUSH!',0.8);
  pressBtn();
 }else if(S.phase==='bag'){
  if(S.cd>0)return;var L=bagLevel(),now=performance.now()/1000,pos=markerPos(S.m+BAG.speed[L]*Math.min(0.05,Math.max(0,now-last/1000))),d=Math.abs(pos-BAG.center[L]);
  S.punchT=0;S.lastPunch=clock;S.punchSide=1-S.punchSide;pressBtn();
  if(d<=BAG.perfect||d<=BAG.zone[L]){
   var perf=d<=BAG.perfect;S.hits++;S.combo++;S.bestCombo=Math.max(S.bestCombo,S.combo);if(perf)S.perfects++;
   S.cd=BAG.cdGood;S.bagVel-=perf?2.6:1.8;S.bagFlash=1;S.bagSquash=1;S.shake=perf?1.7:0.6;bump('combo');bump('hits');
   setTimeout(function(){SFX.thump(perf?1.3:1);if(S.combo>1&&S.combo%5===0)SFX.combo(S.combo/5)},40);
   pop(perf?'PERFECT!':'GOOD!',perf?'perfect':'good');impact(perf);
   if(S.combo>=3){S.apolloArms='fist';S.fistT=0.8}
   if(S.hits>=BAG.target){updHud();bagDone();return}
   if(S.hits%BAG.every===0)shout('FASTER!',1);else if(S.combo>=3)shout('COMBO x'+S.combo+'!',0.8);
  }else{S.combo=0;S.misses++;S.cd=BAG.cdMiss;SFX.whiff();pop('MISS','miss')}
  updHud();
 }
}
function pressBtn(){var b=$('action');b.classList.add('hit');clearTimeout(pressBtn.t);pressBtn.t=setTimeout(function(){b.classList.remove('hit')},70)}
function markerPos(m){m=m%2;return m<1?m:2-m}

/* ---------- particles ---------- */
function sweat(){var a=ART.anchors(W,S.hDisp,clock).head;S.parts.push({x:a[0]+(Math.random()*10-4),y:a[1]-6,vx:(Math.random()-0.5)*16,vy:-18-Math.random()*16,life:0.9,c:'#bfeaff',s:1.2,tall:1.6,grav:120})}
function impact(perf){var an=ART.anchors(W,0,clock),x=an.impact?an.impact[0]:an.bagX+18+Math.sin(S.bagAng)*80,y=an.impact?an.impact[1]:112,i,a;
 for(i=0;i<(perf?16:9);i++){a=Math.random()*Math.PI-Math.PI/2;S.parts.push({x:x,y:y+Math.random()*10-5,vx:Math.cos(a)*90+30,vy:Math.sin(a)*90,life:0.35,c:perf?'#ffd23a':'#ffffff',s:1.6,grav:0})}
 for(i=0;i<(perf?6:3);i++)S.parts.push({x:x+Math.random()*6-3,y:y+Math.random()*30-15,vx:12+Math.random()*24,vy:-6-Math.random()*12,life:0.6,c:'rgba(230,210,235,.55)',s:3,grav:-10});
 if(perf)for(i=0;i<5;i++)S.parts.push({x:x,y:y,vx:60+Math.random()*80,vy:(Math.random()-0.5)*90,life:0.22,c:'#29d6ff',s:1,tall:0.6,grav:0})}
function confetti(n){var C=['#ff3ad8','#29d6ff','#ffd23a','#ffffff'];for(var i=0;i<n;i++)S.parts.push({x:Math.random()*W,y:-5-Math.random()*40,vx:(Math.random()-0.5)*30,vy:30+Math.random()*40,life:2.6,c:C[i%4],s:2,grav:20})}

/* ---------- update ---------- */
function update(dt){
 clock+=dt;typeTick(dt);
 if(S.shoutT>0){S.shoutT-=dt;if(S.shoutT<=0)$('shout').classList.remove('on')}
 if(level===3){FIGHT.update(dt);fightHud();return}
 if(level===1){DRIVE.update(dt);driveHud();var d=dsnap;SFX.engine(S.phase==='drive'&&d.st!=='done'?Math.max(0.05,d.kmh/200):0,d.boost>0);return}
 if(S.phase==='press'){
  var c=REPS[S.rep],idle=clock-S.lastTap>IDLE,dr=c.drain*(idle?IDLE_MULT:1);
  S.h=Math.max(0,S.h-dr*dt);
  if(idle&&S.peak>0.25&&S.h<S.peak-0.15)shout('DON\u2019T STOP! PUSH!',0.9);
  S.richieExpr=S.h>0.03?'strain':'calm';S.apolloExpr='cheer';
  if(!idle&&Math.random()<dt*(1.5+S.rep*2.5)*(0.4+S.h))sweat();
  app.classList.toggle('strain',!idle);
 }else app.classList.remove('strain');
 if(S.phase==='lockout'){S.timer+=dt;S.h=1;if(S.timer>0.55){if(S.rep===2){afterLower()}else{S.phase='lower';S.timer=0}}}
 else if(S.phase==='lower'){S.timer+=dt;S.h=Math.max(0,1-S.timer/0.9);S.richieExpr='calm';if(S.timer>=0.9){S.h=0;afterLower()}}
 else if(S.phase==='record'){S.timer+=dt;S.h=1;S.richieExpr='smile';if(S.timer>2.8){S.phase='talk';$('record').hidden=true;talk(LINES.record,startBag)}}
 if(S.phase==='noise'){S.timer+=dt;if(S.timer>1.15)alleyTurn()}
 else if(S.phase==='exit'){S.timer+=dt;S.exitX+=EXIT_SPEED*dt;var an=ART.anchors(W,0,clock);
  if(an.toBg?S.exitX-70>an.toBg(W+6)||S.timer>6:S.timer>2.4){showDone()}}
 S.flash=Math.max(0,S.flash-dt*1.6);
 if(S.phase==='bag'){
  var L=bagLevel();S.m=(S.m+BAG.speed[L]*dt)%2;S.cd=Math.max(0,S.cd-dt);
  var prev=Math.ceil(S.timeLeft);S.timeLeft-=dt;if(Math.ceil(S.timeLeft)!==prev){updHud();if(S.timeLeft<=10&&S.timeLeft>0)SFX.tick()}
  if(S.timeLeft<=0){S.timeLeft=0;S.phase='talk';ctl(false);updHud();talk(LINES.timeout,startBag)}
  var z=BAG.zone[L],cc=BAG.center[L];$('zone').style.left=((cc-z)*100)+'%';$('zone').style.width=(z*200)+'%';
  $('perfect').style.left=((cc-BAG.perfect)*100)+'%';$('perfect').style.width=(BAG.perfect*200)+'%';
  $('marker').style.left=(markerPos(S.m)*100)+'%';
  if(S.fistT>0){S.fistT-=dt;if(S.fistT<=0)S.apolloArms='cross'}
  S.richieExpr=S.punchT>=0?'strain':'calm';
 }
 /* display smoothing */
 S.hDisp+=(S.h-S.hDisp)*Math.min(1,dt*18);
 $('meterFill').style.width=(S.h*100)+'%';
 /* bag physics */
 S.bagVel+=(-20*S.bagAng-1.3*S.bagVel)*dt;S.bagAng+=S.bagVel*dt;S.bagAng=Math.max(-0.6,Math.min(0.6,S.bagAng));
 if(S.phase!=='bag'&&S.phase!=='bagEnd')S.bagAng+=Math.sin(clock*0.9)*0.0004;
 S.bagFlash=Math.max(0,S.bagFlash-dt*6);S.bagSquash=Math.max(0,S.bagSquash-dt*8);
 if(S.punchT>=0){S.punchT+=dt;if(S.punchT>0.22)S.punchT=-1}
 S.shake=Math.max(0,S.shake-dt*3);
 for(var i=S.parts.length-1;i>=0;i--){var p=S.parts[i];p.vy+=(p.grav||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)S.parts.splice(i,1)}
}

/* ---------- render ---------- */
var flickT=0;
function render(){
 if(!bg)return;var b=buf.getContext('2d');
 if(level===3){b.setTransform(1,0,0,1,0,0);b.fillStyle='#07040d';b.fillRect(0,0,buf.width,buf.height);FIGHT.render(b,W,clock);b.setTransform(1,0,0,1,0,0);blit();return}
 if(level===1){b.imageSmoothingEnabled=false;b.fillStyle='#07040d';b.fillRect(0,0,W,LH);DRIVE.render(b,W,clock,T&&T.isPlaying()?T.level():0);blit();return}
 var strain=S.phase==='press'&&clock-S.lastTap<IDLE?1:0,amp=S.shake*(1+S.rep*0.5);
 flickT=(Math.sin(clock*7.3)+Math.sin(clock*2.1))>1.85;
 var bagPh=S.phase==='bag'||S.phase==='bagEnd'||S.phase==='noise'||(S.phase==='talk'&&S.tapsPerRep.length===3),exitPh=S.phase==='turn'||S.phase==='exit'||S.phase==='done';
 var lay=exitPh?'exit':bagPh?'bag':(!S.pressStarted&&(S.phase==='intro'||S.phase==='talk'))?'stand':'press';
 var ap=S.phase==='lockout'||S.phase==='record'?'cheer':strain&&S.shoutT>0?'shout':'spot';
 ART.drawScene(b,bg,{layout:lay,t:clock,phase:bagPh||exitPh?'bag':'press',
  barH:S.hDisp,lowering:S.phase==='lower',rep:S.rep,dip:strain?Math.sin(clock*55)*0.8*(1+S.rep):0,strain:strain,richieExpr:S.richieExpr,apolloExpr:S.apolloExpr,apolloArms:S.apolloArms,apolloPose:ap,
  bagAng:S.bagAng,bagFlash:S.bagFlash,bagSquash:S.bagSquash,punch:S.punchT>=0?Math.sin(Math.PI*Math.min(1,S.punchT/0.22)):0,sincePunch:clock-S.lastPunch,punchSide:S.punchSide,
  exitX:S.phase==='done'?99999:S.exitX,walking:S.walking,flash:S.flash,
  parts:S.parts,shakeX:(Math.random()-0.5)*amp*2,shakeY:(Math.random()-0.5)*amp*1.5,flicker:flickT,pulse:T&&T.isPlaying()?T.level():0});
 blit();
}
function blit(){
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#07040d';g.fillRect(0,0,cv.width,cv.height);g.imageSmoothingEnabled=false;
 g.drawImage(buf,Math.round(ox*dpr),Math.round(oy*dpr),Math.round(W*scale*dpr),Math.round(LH*scale*dpr));
}
function loop(ts){
 var dt=Math.min(0.05,Math.max(0,(ts-last)/1000));last=ts;
 if(!paused)update(dt);render();requestAnimationFrame(loop);
}

/* ---------- pause ---------- */
function setPaused(p){
 if(p===paused)return;paused=p;$('pause').hidden=!p;
 if(p){if(T&&T.isPlaying())T.pause();SFX.setPaused(true);if(level!==3)SFX.engine(0)}
 else{SFX.setPaused(false);if(musicOn&&T&&T.supported)T.play();S.lastTap=clock}
}
function musicUI(){var m=$('music');m.textContent=musicOn?'\u266B MUSIC: ON':'\u266B MUSIC: OFF';m.setAttribute('aria-pressed',musicOn?'true':'false')}

/* ---------- wiring ---------- */
$('start').addEventListener('click',function(){begin(1)});
$('startL2').addEventListener('click',function(){begin(2)});
$('next2').addEventListener('click',function(){SFX.unlock();if(musicOn&&T&&T.supported&&!T.isPlaying())T.play();startLevel()});
$('again1').addEventListener('click',function(){SFX.unlock();if(musicOn&&T&&T.supported&&!T.isPlaying())T.play();startDrive()});
$('toL1').addEventListener('click',function(){SFX.unlock();if(musicOn&&T&&T.supported&&!T.isPlaying())T.play();startDrive()});
function canPause(){return started&&S.phase!=='cut'&&S.phase!=='done'&&S.phase!=='done1'&&S.phase!=='done3'&&S.phase!=='intro3'}
function dsteer(dir){if(paused||level!==1||app.dataset.dctl!=='1')return;SFX.unlock();if(DRIVE.self()){setSelf(false);shout('SELF DRIVE OFF',0.9)}if(DRIVE.steer(dir))SFX.blip()}
function setSelf(on){DRIVE.setSelf(on);var b=$('selfBtn');b.setAttribute('aria-pressed',on?'true':'false');$('selfState').textContent=on?'ON':'OFF';app.classList.toggle('selfdrive',!!on);$('selfInd').hidden=!on}
function toggleSelf(){if(paused||level!==1||app.dataset.dctl!=='1')return;SFX.unlock();SFX.blip();var on=!DRIVE.self();setSelf(on);shout(on?'SELF DRIVE ON':'SELF DRIVE OFF',0.9)}
function dboost(){if(paused||level!==1||app.dataset.dctl!=='1')return;SFX.unlock();DRIVE.boost()}
[['left',function(){dsteer(-1)}],['right',function(){dsteer(1)}],['boost',dboost],['selfBtn',toggleSelf]].forEach(function(b){var el=$(b[0]);
 el.addEventListener('pointerdown',function(e){e.preventDefault();el.classList.add('hit');setTimeout(function(){el.classList.remove('hit')},90);b[1]()});
 el.addEventListener('click',function(e){e.preventDefault()});el.addEventListener('contextmenu',function(e){e.preventDefault()})});
/* swipe on the road to change lanes */
var sw=null;$('view').addEventListener('pointerdown',function(e){if(level===1)sw={x:e.clientX,y:e.clientY,t:performance.now(),done:false}});
$('view').addEventListener('pointermove',function(e){if(!sw||sw.done)return;var dx=e.clientX-sw.x;if(Math.abs(dx)>28&&Math.abs(dx)>Math.abs(e.clientY-sw.y)){sw.done=true;dsteer(dx<0?-1:1)}});
window.addEventListener('pointerup',function(){sw=null});window.addEventListener('pointercancel',function(){sw=null});
var act=$('action');
act.addEventListener('pointerdown',function(e){e.preventDefault();action()});
act.addEventListener('click',function(e){e.preventDefault()});
act.addEventListener('contextmenu',function(e){e.preventDefault()});
$('dialog').addEventListener('click',tapDialog);
$('pauseBtn').addEventListener('click',function(){if(canPause())setPaused(true)});
$('resume').addEventListener('click',function(){setPaused(false)});
$('restart').addEventListener('click',function(){setPaused(false);DQ=null;$('dialog').hidden=true;if(level===1)startDrive();else if(level===3)startFight();else startLevel()});
$('music').addEventListener('click',function(){musicOn=!musicOn;musicUI()});
$('again').addEventListener('click',function(){SFX.unlock();if(musicOn&&T&&T.supported&&!T.isPlaying())T.play();startLevel()});
$('next3').addEventListener('click',function(){started=true;showIntro3()});
$('start3').addEventListener('click',function(){startFight()});
$('again3').addEventListener('click',function(){startFight()});
$('toL1b').addEventListener('click',function(){SFX.unlock();if(musicOn&&T&&T.supported&&!T.isPlaying())T.play();startDrive()});
[['fAtk','atk'],['fKick','kick'],['fJump','jump'],['fSpec','special']].forEach(function(b){var el=$(b[0]);
 el.addEventListener('pointerdown',function(e){e.preventDefault();el.classList.add('hit');setTimeout(function(){el.classList.remove('hit')},90);fpress(b[1])});
 el.addEventListener('click',function(e){e.preventDefault()});el.addEventListener('contextmenu',function(e){e.preventDefault()})});
$('autoBtn').addEventListener('pointerdown',function(e){e.preventDefault();toggleAuto()});$('autoBtn').addEventListener('click',function(e){e.preventDefault()});
var stk=$('stick');
stk.addEventListener('pointerdown',function(e){if(paused||level!==3||app.dataset.fctl!=='1')return;e.preventDefault();stickId=e.pointerId;try{stk.setPointerCapture(e.pointerId)}catch(x){}SFX.unlock();stickAt(e)});
stk.addEventListener('pointermove',function(e){if(e.pointerId!==stickId)return;e.preventDefault();stickAt(e)});
['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){stk.addEventListener(ev,function(e){if(e.pointerId!==stickId)return;stickReset();applyMove()})});
stk.addEventListener('contextmenu',function(e){e.preventDefault()});
var KMAP={ArrowLeft:'l',a:'l',A:'l',ArrowRight:'r',d:'r',D:'r',ArrowUp:'u',w:'u',W:'u',ArrowDown:'d',s:'d',S:'d'};
document.addEventListener('keydown',function(e){if(level!==3||app.dataset.fctl!=='1'||paused||DQ)return;
 if(KMAP[e.key]){e.preventDefault();keys[KMAP[e.key]]=true;applyMove();return}
 if(e.repeat)return;var k=e.key.toLowerCase();
 if(k==='j'||k==='z'||k===' '||k==='enter'){e.preventDefault();e.stopImmediatePropagation();fpress('atk')}else if(k==='k'||k==='x'){e.preventDefault();fpress('jump')}else if(k==='i'||k==='v'){e.preventDefault();fpress('kick')}else if(k==='l'||k==='c'||k==='shift'){e.preventDefault();fpress('special')}},true);
document.addEventListener('keyup',function(e){if(KMAP[e.key]){keys[KMAP[e.key]]=false;if(level===3)applyMove()}});
document.addEventListener('keydown',function(e){
 if(e.repeat)return;
 if(level===1&&app.dataset.dctl==='1'&&!paused&&!DQ){
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){e.preventDefault();dsteer(-1);return}
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){e.preventDefault();dsteer(1);return}
  if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='Enter'){e.preventDefault();dboost();return}}
 if(e.key===' '||e.key==='Enter'){if(app.dataset.ctl==='1'&&!paused){e.preventDefault();action()}else if(DQ&&!paused){e.preventDefault();tapDialog()}}
 else if(e.key==='Escape'||e.key==='p'){if(CUT.on)endCut('skip');else if(canPause())setPaused(!paused)}
});
document.addEventListener('visibilitychange',function(){if(document.hidden&&canPause())setPaused(true)});
document.addEventListener('gesturestart',function(e){e.preventDefault()});
window.addEventListener('resize',resize);window.addEventListener('orientationchange',function(){setTimeout(resize,150)});
if(!T||!T.supported){musicOn=false}
musicUI();hud(false);ctl(false);dctl(false);fctl(false);setLevel(1);resize();if(store.get().l1done)$('startL2').classList.add('unlocked');
ART.loadSprites(SPRITES,function(){bgW=0;resize();if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr)});
DRIVE.loadSprites(DSPRITES,function(){if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr)});
FIGHT.loadSprites(FSPRITES,function(){if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr);FIGHT.portrait($('bface'))});
/* the menu's LEVEL 3 box opens game/?start=alley -> straight to the Level 3 intro card (the only entry param) */
try{if(new URLSearchParams(location.search).get('start')==='alley'){started=true;showIntro3()}}catch(e){}
requestAnimationFrame(function(ts){last=ts;loop(ts)});

/* test/debug hook (read-only snapshot, no network) */
window.__rosado={version:VERSION,REPS:REPS,BAG:BAG,IDLE:IDLE,IDLE_MULT:IDLE_MULT,
 snap:function(){var L=bagLevel();return {level:level,drive:DRIVE.snap(),phase:S.phase,rep:S.rep,h:S.h,taps:S.taps,tapsPerRep:S.tapsPerRep.slice(),hits:S.hits,combo:S.combo,bestCombo:S.bestCombo,misses:S.misses,
  timeLeft:S.timeLeft,marker:markerPos(S.m),dir:(S.m%2)<1?1:-1,zone:[BAG.center[L]-BAG.zone[L],BAG.center[L]+BAG.zone[L]],speed:BAG.speed[L],cd:S.cd,paused:paused,dialog:!!DQ,line:DQ?DQ.full:'',
  musicOn:musicOn,music:!!(T&&T.isPlaying()),cut:(function(){var v=$('cutv');return {on:CUT.on,state:CUT.state,how:CUT.how,fallback:CUT.fallback,visible:!$('cut').hidden,t:v.currentTime,paused:v.paused,src:v.getAttribute('src')||'',tap:!$('cutTap').hidden}})(),fight:FIGHT.snap(),W:W,story:S.story.slice(),exitX:S.exitX,walking:S.walking,exitOff:(function(){if(S.exitX==null)return false;var an=ART.anchors(W,0,clock);return an.fromBg?an.fromBg(S.exitX-70)>W:false})(),clangs:SFX.clangs?SFX.clangs():0}},
 loadSprites:function(map){return ART.loadSprites(map,function(){bgW=0;resize()})},spriteMode:function(){return ART.spriteMode()},driveSpriteMode:function(){return DRIVE.spriteMode()},fightBox:function(i){var f=FIGHT.snap();if(!f)return null;var e=i<0?f.player:f.enemies[i];if(!e)return null;var m=FIGHT.META[e.frame],hw=m?Math.max(m[2],m[0]-m[2])/2:e.h*0.3,r=$('view').getBoundingClientRect(),X=function(x){return r.left+ox+(x-f.cam)*scale},Y=function(y){return r.top+oy+y*scale};
  return {l:X(e.x-hw),r:X(e.x+hw),t:Y(e.y-(e.z||0)-e.h),b:Y(e.y-(e.z||0)),feet:Y(e.y),scale:scale,h:e.h}},fightSpriteMode:function(){return FIGHT.spriteMode()},fdev:FIGHT.dev,
 dev:DRIVE.dev,CFG:DRIVE.CFG};
})();
