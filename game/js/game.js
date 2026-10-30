/* Rosado Nights · v0.6.1
   Level 6 "Escobar" (v0.6.0, js/escobar.js), the FINAL level: Mike's showdown video -> title slams -> Phase 1 the grand staircase brawl
   (TANK at the foot of the stairs, guard waves, chandeliers, pickups, the aquarium flood with cartoon sharks) -> the wall climb -> Phase 2 the rooftop
   duel under the helicopter spotlight -> Phase 3 the jet-ski chase across the bay, the deck brawl -> the chief's helicopter hovers over the boat
   (v0.6.1: she stays aboard, no seaplane) -> the optional ending video (assets/cutscene-ending.mp4, skipped when missing) -> the ending card.
   Reached from the Level 5 complete card (CONTINUE TO LEVEL 6) or game/?start=escobar.
   Level 5 "Escobar's Mansion" (v0.5.0, js/mansion.js): fly through neon rings -> parachute onto the lawn target -> sneak past the guards to the front door.
   Reached from the Level 4 complete card (CONTINUE TO LEVEL 5) or game/?start=mansion.
   Level 4 "The Airfield" (v0.4.0): chase (drive.js chase mode) -> airfield fight (fight.js 'airfield' stage, Big Manny + Aces) -> plane ending (js/plane.js).
   Reached from the Level 3 complete card (CONTINUE TO LEVEL 4) or game/?start=airfield.
   Level 3 "The Alley" (js/fight.js): side-scrolling street brawl vs El Jefe Esteban Lavanda; only reachable from the Level 2 complete card.
   Level 1 "Causeway Chase": drive Richie across the rainy neon bridge to Shred Zeppelin (js/drive.js).
   Level 2 "Reps for Jesus" (the gym):
   Phase 1: bench press 400 lbs × 3 (tap PUSH fast; each rep needs more taps; v0.6.0: rep 3 is as fair as rep 2 on touch).
   Phase 2: heavy bag timing (tap PUNCH while the marker is in the pink zone; 12 good hits before time runs out).
   No network, no tracking. localStorage only keeps level-1-done + best combo / best bag time. */
(function(){
"use strict";
var VERSION='0.6.1';
var T=window.RosadoTheme,SFX=window.RosadoSFX,ART=window.RosadoArt,DRIVE=window.RosadoDrive,FIGHT=window.RosadoFight,PLANE=window.RosadoPlane,MAN=window.RosadoMansion,ESC=window.RosadoEscobar;
var $=function(id){return document.getElementById(id)};
var app=$('app'),cv=$('scene'),g=cv.getContext('2d'),buf=document.createElement('canvas'),bg=null,bgW=0;
var LH=ART.H;
/* Optional art: put images in game/assets/ and list them here to replace the canvas art (slot boxes are documented in art.js).
   Leave a slot out (or let the file fail to load) and the built-in canvas art is used. Example:
   var SPRITES={'bg':'assets/gym-bg.webp?v=0.1.0','apollo-spot':'assets/apollo-spot.webp?v=0.1.0','richie-bench-down':'assets/richie-bench-down.webp?v=0.1.0'}; */
var AV='?v=0.6.1',SPRITES={bg:'assets/gym-bg.webp'+AV,bag:'assets/bag.webp'+AV,'bench-empty':'assets/bench-empty.webp'+AV,
 'richie-idle':'assets/richie-idle.webp'+AV,'apollo-cross':'assets/apollo-cross.webp'+AV,
 'richie-portrait':'assets/richie-portrait.webp'+AV,'apollo-portrait':'assets/apollo-portrait.webp'+AV};
/* multi-frame sprites (v0.2.1): bench press 0-2, Apollo spot/cheer, boxing guard/guard-low/jab/cross, walk cycle */
[['richie-press',3],['apollo-spot',2],['apollo-cheer',2],['richie-box',4],['richie-walk',4]].forEach(function(f){for(var i=0;i<f[1];i++)SPRITES[f[0]+'-'+i]='assets/'+f[0]+'-'+i+'.webp'+AV});
var DSPRITES={car:'assets/drive-car.webp'+AV,biker:'assets/drive-biker.webp'+AV,'biker-lean':'assets/drive-biker-lean.webp'+AV,van:'assets/drive-van.webp'+AV,
 oil:'assets/drive-oil.webp'+AV,spikes:'assets/drive-spikes.webp'+AV,nitro:'assets/drive-nitro.webp'+AV,sky:'assets/drive-sky.webp'+AV,gym:'assets/drive-gym.webp'+AV,'biker-portrait':'assets/biker-portrait.webp'+AV,
 supercar:'assets/drive-supercar.webp'+AV,'traffic-0':'assets/drive-traffic-0.webp'+AV,'traffic-1':'assets/drive-traffic-1.webp'+AV,'traffic-2':'assets/drive-traffic-2.webp'+AV,sky4:'assets/drive-sky4.webp'+AV,air:'assets/l4-bg-b.webp'+AV};
var PSPRITES={};PLANE.SLOTS.forEach(function(k){PSPRITES[k]='assets/'+k+'.webp'+AV});

var MSPRITES={};MAN.SLOTS.forEach(function(k){MSPRITES[k]='assets/'+k+'.webp'+AV});
var ESPRITES={};ESC.SLOTS.forEach(function(k){ESPRITES[k]='assets/'+k+'.webp'+AV});
var FSPRITES={};FIGHT.SLOTS.forEach(function(k){FSPRITES[k]='assets/'+k+'.webp'+AV});

/* ---------- difficulty ---------- */
/* taps: taps needed with no drain; drain: bar sink per second while tapping; idle: extra sink multiplier after IDLE seconds without a tap */
/* v0.6.0 fairness fix: rep 3 used to be {taps:14,drain:0.28} with IDLE 0.35 s / x2.5. The bar only rises while taps/s > taps x drain,
   so rep 3 needed 3.9 taps/s just to break even (reps 1 and 2: 0.96 and 2.2), and on touch any gap over 0.35 s sank it 2.5x faster:
   at a steady 4 taps/s rep 3 could not be finished. Now rep 3 breaks even at 2.2 taps/s like rep 2 (still the most taps), and the idle grace is 0.45 s / x2. */
var REPS=[{taps:8,drain:0.12},{taps:11,drain:0.20},{taps:13,drain:0.17}],IDLE=0.45,IDLE_MULT=2.0;
var BAG={target:12,time:45,every:3,
 speed:[0.75,0.95,1.2,1.45],   /* marker sweeps per second across the track */
 zone:[0.13,0.115,0.10,0.09],  /* half-width of the pink zone (track = 1) */
 center:[0.5,0.6,0.42,0.55],perfect:0.035,cdGood:0.18,cdMiss:0.45};

/* ---------- state ---------- */
var S,musicOn=true,paused=false,started=false,last=0,clock=0,level=1,dsnap=null,L4='',L5='',L6='';
/* L4: '' outside Level 4, else 'intro' | 'chase' | 'fight' | 'plane' | 'done'. The engine level stays 1 (drive) / 3 (fight) / 4 (plane) so the existing controls are reused */
function setL4(ph){L4=ph||'';app.dataset.l4=L4}
/* L5: '' outside Level 5, else 'intro' | 'fly' | 'chute' | 'stealth' | 'done' (engine level 5 = js/mansion.js) */
function setL5(ph){L5=ph||'';app.dataset.l5=L5}
/* L6: '' outside Level 6, else 'intro' | 'cut' | 'slam' | 'stairs' | 'climb' | 'roof' | 'bay' | 'deck' | 'finale' | 'done' (engine level 6 = js/escobar.js) */
function setL6(ph){L6=ph||'';app.dataset.l6=L6}
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
 var bs=level===3||level===5||level===6?2:1;if(W!==bgW){bg=ART.makeBg(W);bgW=W}if(buf.width!==W*bs||buf.height!==LH*bs){buf.width=W*bs;buf.height=LH*bs}
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
 var L=DQ.lines[DQ.i],who=$('who');who.textContent=L.who==='richie'?'RICHIE':L.who==='biker'?'BIKER GANG':L.who==='jefe'?'EL JEFE':L.who==='manny'?'BIG MANNY':L.who==='aces'?'ACES':L.who==='guard'?'GUARD':L.who==='esc'?'ESCOBAR':L.who==='chief'?'THE CHIEF':L.who==='tank'?'TANK':'FLEXECUTIONER';who.className='who '+L.who;
 if(L.on)L.on();
 face(L.who,L.expr||'smile');DQ.full=L.text;DQ.typed=0;DQ.shownAt=clock;$('line').textContent='';
 if(L.who==='apollo')S.apolloExpr=L.expr||'smile';
}
function face(who,expr){if(who==='biker')DRIVE.portrait($('face'));else if(who==='jefe'||who==='manny'||who==='aces')FIGHT.portrait($('face'),who);else if(who==='guard')MAN.portrait($('face'));else if(who==='esc'||who==='chief'||who==='tank')ESC.portrait($('face'),who);else ART.portrait($('face'),who,expr)}
function tapDialog(){
 if(!DQ||paused)return;if(clock-DQ.shownAt<0.25)return;
 if(DQ.typed<DQ.full.length){DQ.typed=DQ.full.length;$('line').textContent=DQ.full;return}
 SFX.blip();nextLine();
}
function typeTick(dt){if(!DQ||DQ.typed>=DQ.full.length)return;var n=Math.min(DQ.full.length,DQ.typed+dt*48);if(Math.floor(n)!==Math.floor(DQ.typed))$('line').textContent=DQ.full.slice(0,Math.floor(n));DQ.typed=n;if(n>=DQ.full.length)$('line').textContent=DQ.full}

var Gd=function(t){return {who:'guard',text:t}};
var J=function(t){return {who:'jefe',text:t,expr:'smile'}},Mn=function(t){return {who:'manny',text:t}},Ac=function(t){return {who:'aces',text:t}};
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
/* Level 4 lines (Big Manny and Aces are original characters) */
var DLINES4={
 intro:[Rc('Wait... that yellow wedge up ahead. That\u2019s Escobar\u2019s boy.','calm'),
  Rc('Stay on his tail. Not too close, not too far.','calm'),
  Rc('Keep the DISTANCE marker in the green. \u25C0 \u25B6 to dodge traffic, BOOST to catch up. Or tap SELF DRIVE.','smile')],
 lost:[Rc('Lost him! Back to the checkpoint. He won\u2019t shake me twice.','strain')],
 wreck:[Rc('Whoa! Too much traffic. Back to the checkpoint. Let\u2019s go again!','smile')],
 arrive:[Rc('A private airfield. Escobar\u2019s got a plane waiting.','calm'),Rc('And a welcome committee by the hangar.','calm')]
};
var FLINES4={
 start:[Rc('Let\u2019s see who\u2019s guarding that plane.','calm'),Rc('Big guys can\u2019t be grabbed, and slick guys dodge punches. KICK them!','smile')],
 duo:[Mn('Nobody gets on the boss\u2019s plane, old man.'),Ac('Turn around, grandpa. The shades stay on.'),Rc('Old? I just benched 400. Let\u2019s go, fellas.','calm')],
 duoDown:[Ac('My shades... these were limited edition.'),Mn('Five more minutes, Ma...'),Rc('Nice plane. I\u2019ll take it from here.','smile')]
};

/* Level 5 lines (the guards are original characters) */
var MLINES={
 fly:[Rc('Escobar\u2019s place is up on that hill. Let\u2019s take the scenic route.','calm'),
  Rc('Joystick up and down to climb and dive through the neon rings. BOOST for speed. Or tap AUTO PILOT.','smile')],
 chute:[Rc('Geronimo!','strain'),Rc('\u25C0 \u25B6 to steer against the wind, FLARE to slow down. Land in the glowing ring and stay out of the searchlights! Or tap AUTO CHUTE.','smile')],
 stealth:[Gd('You hear something?'),Gd('Just the wind. Keep walking.'),
  Rc('Quiet now. SNEAK behind the hedges and stay out of the flashlights.','calm'),
  Rc('SHOOT knocks them out cold. Grab AMMO boxes. Clear the guards, then the front door. Or tap AUTO SNEAK.','smile')],
 door:[Rc('Knock knock, Escobar.','calm')]
};
/* ---------- flow ---------- */
function begin(lv){
 SFX.unlock();if(musicOn&&T&&T.supported)T.play();
 started=true;$('intro').hidden=true;if(lv===2)startLevel();else startDrive();
}
function setLevel(lv){var was=level;level=lv;if(lv!==5){setL5('');mctl(false);mAuto(false)}if(lv!==6){setL6('');ectl(false);eAuto(false);slamEnd(true)}app.dataset.level=String(lv);app.dataset.l4=L4;document.title=lv===6?'Rosado Nights \u00B7 Level 6: Escobar':lv===5?'Rosado Nights \u00B7 Level 5: Escobar\u2019s Mansion':L4?'Rosado Nights \u00B7 Level 4: The Airfield':lv===1?'Rosado Nights \u00B7 Level 1: Causeway Chase':lv===3?'Rosado Nights \u00B7 Level 3: The Alley':'Rosado Nights \u00B7 Level 2: Reps for Jesus \u00B7 Shred Zeppelin';
 var a=$('scene');a.setAttribute('aria-label',lv===6?'Escobar: the final showdown. Richie fights up the staircase, duels Escobar on the roof and chases him across the bay':lv===5?'Escobar\u2019s Mansion: Richie flies in, parachutes onto the lawn and sneaks past the guards':L4?'The Airfield: Richie tails the yellow supercar, fights at the hangar and flies off':lv===1?'Causeway Chase: Richie drives to Shred Zeppelin':lv===3?'The Alley: Richie fights El Jefe\u2019s bodyguards':'Shred Zeppelin: Richie and Flexecutioner');
 if(lv!==3&&lv!==6){if(typeof CUT==='object'&&CUT&&CUT.on){CUT.done=true;cutClose()}}if(lv!==3){fctl(false);setAuto(false);$('bossbar').hidden=true;$('goArrow').hidden=true}if(was!==lv)resize()}
function cards(){['done','done1','done3','intro3','intro4','done4','intro5','done5','intro6','done6'].forEach(function(id){$(id).hidden=true})}
/* ---------- level 1: the drive ---------- */
function startDrive(){
 setL4('');DRIVE.setMode('causeway');setLevel(1);S=fresh();S.phase='drive';cards();$('record').hidden=true;setMode('');hud(true);dctl(false);DRIVE.intro();setSelf(false);
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
function selfSkip(){if(DRIVE.self())setTimeout(function(){if(DQ&&DRIVE.self()&&!paused){DQ.typed=DQ.full.length;nextLine()}},1800)}
DRIVE.on('wreck',function(){selfSkip();talk(L4?DLINES4.wreck:DLINES.wreck,function(){DRIVE.retry();dctl(true);shout('FROM THE CHECKPOINT!',1.3)})});
DRIVE.on('arrive',function(){dctl(false);shout(L4?'THE AIRFIELD!':'SHRED ZEPPELIN AHEAD!',1.6)});
DRIVE.on('finish',function(st){if(L4==='chase'){S.chase4=st;SFX.chime&&SFX.chime();selfSkip();talk(DLINES4.arrive,startFight4);return}SFX.fanfare();store.set({l1done:true});talk(DLINES.arrive,function(){showDone1(st)})});
/* Level 4 chase events */
DRIVE.on('losing',function(){shout('LOSING HIM! BOOST!',1.2)});
DRIVE.on('losing2',function(){dctl(false);shout('YOU LOST HIM!',1.4)});
DRIVE.on('lost',function(){selfSkip();talk(DLINES4.lost,function(){DRIVE.retry();dctl(true);shout('FROM THE CHECKPOINT!',1.3)})});
DRIVE.on('spotted',function(){shout('TOO CLOSE! HE SPOTTED YOU!',1.3)});
DRIVE.on('surge',function(){shout('HE\u2019S SPEEDING UP!',1)});
DRIVE.on('shove',function(){shout('OUTTA THE WAY!',0.8)});
function showDone1(st){
 S.phase='done1';hud(false);SFX.engine(0);
 $('stats1').innerHTML='Bikers bumped: <b>'+st.bumps+'</b> \u00B7 Oil &amp; spikes dodged: <b>'+st.dodged+'</b><br>Time: <b>'+st.time.toFixed(1)+'s</b> \u00B7 Health left: <b>'+Math.round(DRIVE.snap().health)+'%</b>'+(st.retries?' \u00B7 retries: '+st.retries:'');
 $('done1').hidden=false;
}
var dh={};function setL(id,v){v=Math.round(v*1000)/10;if(dh['L'+id]!==v){dh['L'+id]=v;$(id).style.left=v+'%'}}function setTxt(id,v){if(dh[id]!==v){dh[id]=v;$(id).textContent=v}}function setW(id,v){v=Math.round(v*1000)/10;if(dh[id]!==v){dh[id]=v;$(id).style.width=v+'%'}}
function driveHud(){var d=DRIVE.snap();dsnap=d;
 var seg=Math.ceil(d.health/10);if(dh.seg!==seg){dh.seg=seg;var c=$('hpbar').children;for(var i=0;i<c.length;i++)c[i].className=i<seg?(seg<=3?'on low':'on'):''}
 setTxt('dist',(d.dist/1000).toFixed(2));setW('distFill',1-d.dist/DRIVE.CFG.dist);
 setTxt('kmh',String(Math.round(d.kmh)));setTxt('gear',String(Math.max(1,Math.min(6,Math.floor(d.kmh/38)+1))));setW('n2oFill',d.meter);
 var rdy=d.meter>=DRIVE.CFG.boostMin&&d.boost<=0&&d.st==='run';if(dh.rdy!==rdy){dh.rdy=rdy;$('boost').classList.toggle('off',!rdy)}
 if(dh.on!==(d.boost>0)){dh.on=d.boost>0;app.classList.toggle('boosting',dh.on)}
 if(d.mode==='chase'){var GM=160,gi=d.gapIn;setTxt('gapv',String(Math.round(d.gap)));setL('gapMark',Math.min(1,d.gap/GM));
  if(dh.gz!==gi[0]){dh.gz=gi[0];$('gapZone').style.left=(gi[0]/GM*100)+'%';$('gapZone').style.width=((gi[1]-gi[0])/GM*100)+'%'}
  var cls=d.gap<DRIVE.CFG.gapClose||d.gap>d.gapWarn?'bad':d.inRange?'ok':'warn',msg=d.gap<DRIVE.CFG.gapClose?'TOO CLOSE!':d.gap>d.gapWarn?'LOSING HIM!':d.inRange?'IN RANGE':d.gap<gi[0]?'BACK OFF':'CATCH UP';
  setTxt('gapMsg',msg);if(dh.gc!==cls){dh.gc=cls;$('gapbox').className='dbox2 gapbox '+cls}}
}
/* ---------- level 3: the alley ---------- */
function fctl(on){app.dataset.fctl=on?'1':'0';if(!on){FIGHT.move(0,0);stickReset();keys={}}}
function showIntro3(){SFX.unlock();$('intro').hidden=true;setLevel(3);S=fresh();S.phase='intro3';cards();hud(false);setMode('');app.classList.remove('boosting');SFX.engine(0);FIGHT.start();FIGHT.hold(false);
 $('intro3').hidden=false;themeOn()}
/* v0.3.2: the alley plays the usual Rosado Nights theme (same song as the menu, Level 1 and Level 2), boss and ending included */
function themeOn(){if(musicOn&&T&&T.supported)T.play()}
function startFight(){SFX.unlock();$('intro').hidden=true;started=true;setL4('');duoBar(false);setLevel(3);S=fresh();S.phase='fight';cards();hud(true);setMode('');SFX.engine(0);FIGHT.start();dh={};
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
FIGHT.on('duo',function(){if(L4!=='fight')return;fctl(false);$('bossbar').hidden=false;ftalk(FLINES4.duo,function(){FIGHT.hold(false);fctl(true);shout('TAG TEAM!',1.3)})});
FIGHT.on('duoOne',function(o){shout((o.left==='manny'?'BIG MANNY':'ACES')+' IS MAD!',1.3)});
FIGHT.on('duoDown',function(){fctl(false);SFX.fanfare();shout('DOUBLE K.O.!',1.6);setTimeout(function(){if(L4!=='fight')return;ftalk(FLINES4.duoDown,function(){$('bossbar').hidden=true;FIGHT.board();shout('TO THE PLANE \u2192',1.6)})},1600)});
FIGHT.on('boarded',function(st){if(L4!=='fight')return;S.fight4=st;startPlane()});
FIGHT.on('carSeen',function(){ftalk(FLINES.car,function(){FIGHT.driveOff();SFX.engine(0.5);shout('NEXT: LEVEL 4 \u00B7 THE AIRFIELD',2)})});
FIGHT.on('finish',function(st){SFX.engine(0);showDone3(st)});
/* v0.3.2: Mike's Level 3 -> Level 4 cutscene video. It replaces the in-game car ending after El Jefe's KO;
   that in-game ending stays only as the fallback when the video can't load or play. Game music pauses while it plays. */
var CUT={on:false,src:'assets/cutscene-escobar.mp4'+AV,state:'off',music:false,timer:null,done:false,fallback:false,how:'',kind:'l3'};
/* v0.6.0: the same player also plays Mike's showdown video (uncut) as the Level 6 intro: kind 'l6' */
var CUTS={l3:{src:'assets/cutscene-escobar.mp4'+AV,poster:'assets/cutscene-escobar-poster.webp'+AV,label:'Cutscene: Richie finds his car and heads for the airfield'},
 l6:{src:'assets/cutscene-showdown.mp4'+AV,poster:'assets/cutscene-showdown-poster.webp'+AV,label:'Cutscene: the showdown at Escobar\u2019s mansion'},
 end6:{src:'assets/cutscene-ending.mp4'+AV,poster:'',label:'Cutscene: the ending',probe:true}};
function playCut(kind){var v=$('cutv');CUT.kind=kind||'l3';var cd=CUTS[CUT.kind];CUT.src=cd.src;if(cd.poster)v.setAttribute('poster',cd.poster);else v.removeAttribute('poster');v.setAttribute('aria-label',cd.label);CUT.on=true;CUT.done=false;CUT.found=false;CUT.fallback=false;CUT.how='';CUT.state='loading';S.phase='cut';if(CUT.kind==='l3')FIGHT.cutscene();fctl(false);ectl(false);hud(false);$('bossbar').hidden=true;$('goArrow').hidden=true;
 /* an optional video (cd.probe) stays hidden, with the theme still playing, until its file answers; a missing file goes straight on */
 var reveal=function(){CUT.music=!!(T&&T.isPlaying());if(CUT.music)T.pause();$('cut').hidden=false;app.classList.add('cutting')};
 $('cutTap').hidden=true;if(cd.probe){CUT.music=false;v.onloadedmetadata=function(){if(CUT.on&&!CUT.done){CUT.found=true;reveal()}}}else{v.onloadedmetadata=null;reveal()}
 v.onended=function(){endCut('ended')};v.onerror=function(){cutFail('error')};v.onplaying=function(){CUT.state='playing';$('cutTap').hidden=true;clearTimeout(CUT.timer)};
 v.muted=false;v.src=CUT.src;try{v.load()}catch(e){}cutPlay();
 clearTimeout(CUT.timer);CUT.timer=setTimeout(function(){if(CUT.on&&CUT.state==='loading')cutFail('timeout')},cd.probe?6000:12000)}
function cutPlay(){var v=$('cutv'),pr=null;try{pr=v.play()}catch(e){}
 if(pr&&pr.catch)pr.catch(function(err){if(!CUT.on||CUT.done)return;
  if(err&&err.name==='NotAllowedError'){CUT.state='tap';$('cutTap').hidden=false;clearTimeout(CUT.timer);
   /* AUTO FIGHT with nobody tapping: move on to the complete card */
   if(CUT.kind==='l3'?FIGHT.auto():ESC.auto())CUT.timer=setTimeout(function(){if(CUT.on&&CUT.state==='tap')endCut('auto')},8000)}
  else if(!err||err.name!=='AbortError')cutFail('play')})}
function cutClose(){clearTimeout(CUT.timer);CUT.on=false;var v=$('cutv');v.onended=v.onerror=v.onplaying=v.onloadedmetadata=null;try{v.pause()}catch(e){}v.removeAttribute('src');try{v.load()}catch(e){}
 $('cut').hidden=true;$('cutTap').hidden=true;app.classList.remove('cutting');if(musicOn&&T&&T.supported&&!T.isPlaying())T.play()}
function endCut(how){if(!CUT.on||CUT.done)return;CUT.done=true;CUT.how=how;CUT.state='off';cutClose();if(CUT.kind==='end6')showDone6(S.l6);else if(CUT.kind==='l6')afterShowdown();else showDone3(FIGHT.cutDone())}
function cutFail(why){if(!CUT.on||CUT.done)return;CUT.done=true;CUT.fallback=true;CUT.how='fallback:'+why;CUT.state='off';cutClose();if(CUT.kind==='end6'){showDone6(S.l6);return}if(CUT.kind==='l6'){afterShowdown();return}S.phase='fight';hud(true);FIGHT.ending()}
$('cutSkip').addEventListener('click',function(e){e.preventDefault();endCut('skip')});
$('cutTap').addEventListener('click',function(e){e.preventDefault();CUT.state='loading';$('cutTap').hidden=true;cutPlay()});
function showDone3(st){S.phase='done3';S.shoutT=0;$('shout').classList.remove('on');hud(false);fctl(false);setAuto(false);$('bossbar').hidden=true;$('goArrow').hidden=true;confetti(60);
 var b=store.get(),best=Math.max(b.l3best||0,st.score);store.set({l3done:true,l3best:best});
 $('stats3').innerHTML='Score: <b>'+st.score+'</b> \u00B7 Bodyguards down: <b>'+st.kos+'</b><br>Time: <b>'+st.time.toFixed(1)+'s</b> \u00B7 Lives left: <b>'+st.lives+'</b>'+(st.stats.retries?' \u00B7 retries: '+st.stats.retries:'')+'<br><small>Your best: '+best+'</small>';
 $('done3').hidden=false;var c=$('done3').querySelector('.cardin');if(c){c.classList.remove('burst');void c.offsetWidth;c.classList.add('burst')}}
/* ---------- level 4: the airfield ---------- */
function duoBar(on){$('duo2').hidden=!on;$('bname').textContent=on?FIGHT.TYPES.manny.name:'EL JEFE ESTEBAN LAVANDA';FIGHT.portrait($('bface'),on?'manny':'jefe');if(on)FIGHT.portrait($('bface2'),'aces');app.classList.toggle('duo',!!on)}
function l4Reset(){SFX.unlock();$('intro').hidden=true;started=true;DQ=null;$('dialog').hidden=true;cards();setMode('');app.classList.remove('boosting');$('record').hidden=true;dh={};themeOn()}
function showIntro4(){l4Reset();setL4('intro');DRIVE.setMode('chase');setLevel(1);S=fresh();S.phase='intro4';hud(false);dctl(false);setSelf(false);SFX.engine(0);DRIVE.intro();$('intro4').hidden=false}
function startChase(){l4Reset();setL4('chase');DRIVE.setMode('chase');setLevel(1);S=fresh();S.phase='drive';S.l4T0=clock;hud(true);dctl(false);DRIVE.intro();setSelf(false);
 talk(DLINES4.intro,function(){DRIVE.go();dctl(true);shout('STAY ON HIM!',1.2)})}
function startFight4(){var keep={chase4:S.chase4,l4T0:S.l4T0};l4Reset();setL4('fight');setSelf(false);dctl(false);setLevel(3);S=fresh();S.chase4=keep.chase4;S.l4T0=keep.l4T0;S.phase='fight';hud(true);SFX.engine(0);FIGHT.start('airfield');
 ART.portrait($('fface'),'richie','calm');duoBar(true);$('bossbar').hidden=true;
 setTimeout(function(){var st=FIGHT.snap().st;if(L4==='fight'&&level===3&&S.phase==='fight'&&(st==='ready'||st==='intro'))ftalk(FLINES4.start,function(){FIGHT.go();fctl(true);shout('FIGHT!',1.2)})},1300)}
function startPlane(){var keep={chase4:S.chase4,fight4:S.fight4,l4T0:S.l4T0};setL4('plane');fctl(false);setAuto(false);setLevel(4);S=fresh();for(var k in keep)S[k]=keep[k];S.phase='plane';hud(true);SFX.engine(0);PLANE.start();themeOn();
 setTimeout(function(){if(L4==='plane')shout('WHEELS UP!',1.4)},3200)}
PLANE.on('done',function(){if(L4==='plane')showDone4()});
function showDone4(){setL4('done');S.phase='done4';S.shoutT=0;$('shout').classList.remove('on');hud(false);SFX.fanfare();
 var c=S.chase4||{stats:{}},f=S.fight4||{score:0,stats:{}},b=store.get(),best=Math.max(b.l4best||0,f.score||0);store.set({l4done:true,l4best:best});
 var cs=DRIVE.snap().stats||{};
 $('stats4').innerHTML='Chase: <b>'+(cs.time||0).toFixed(1)+'s</b> \u00B7 traffic dodged: <b>'+(cs.passed||0)+'</b>'+(cs.retries?' \u00B7 retries: '+cs.retries:'')+'<br>Fight score: <b>'+(f.score||0)+'</b> \u00B7 lives left: <b>'+(f.lives==null?3:f.lives)+'</b><br><small>Your best: '+best+'</small>';
 $('done4').hidden=false;var cc=$('done4').querySelector('.cardin');if(cc){cc.classList.remove('burst');void cc.offsetWidth;cc.classList.add('burst')}}
/* ---------- level 5: Escobar's mansion ---------- */
var AUTOLBL={fly:'AUTO PILOT',chute:'AUTO CHUTE',stealth:'AUTO SNEAK'};
function mctl(on){app.dataset.mctl=on?'1':'0';if(!on){MAN.move(0,0);mstickReset();mkeys={};mhold={}}}
function mAuto(on){MAN.setAuto(on);var b=$('mAuto');b.setAttribute('aria-pressed',on?'true':'false');$('mAutoState').textContent=on?'ON':'OFF';app.classList.toggle('autom',!!on);$('mAutoInd').hidden=!on;mLabels();if(on&&DQ&&level===5)mAutoTalk()}
function mLabels(){var l=AUTOLBL[MAN.stage()]||'AUTO';$('mAutoLbl').textContent=l;$('mAutoIndT').textContent=l+' ON'}
function toggleMAuto(){if(paused||level!==5||app.dataset.hud!=='1'||L5==='done'||L5==='intro')return;SFX.unlock();SFX.blip();var on=!MAN.auto();mAuto(on);shout(on?(AUTOLBL[MAN.stage()]||'AUTO')+' ON':(AUTOLBL[MAN.stage()]||'AUTO')+' OFF',0.9)}
function mManual(){if(MAN.auto()){mAuto(false);shout((AUTOLBL[MAN.stage()]||'AUTO')+' OFF',0.9)}}
function mAutoTalk(){if(!MAN.auto())return;setTimeout(function(){if(DQ&&level===5&&MAN.auto()&&!paused){DQ.typed=DQ.full.length;$('line').textContent=DQ.full;SFX.blip();nextLine();mAutoTalk()}else if(DQ&&level===5&&MAN.auto())mAutoTalk()},1700)}
function mtalk(lines,done){talk(lines,done);mAutoTalk()}
function l5Reset(){SFX.unlock();$('intro').hidden=true;started=true;DQ=null;$('dialog').hidden=true;cards();setL4('');setMode('');app.classList.remove('boosting');$('record').hidden=true;dh={};dctl(false);fctl(false);setSelf(false);SFX.engine(0);themeOn()}
function showIntro5(){l5Reset();setLevel(5);setL5('intro');S=fresh();S.phase='intro5';hud(false);mctl(false);MAN.start('fly');$('intro5').hidden=false}
/* stage: 'fly' (fresh run) or the current stage again (pause -> RESTART keeps the score from the start of that stage) */
function startL5(stage,restart){l5Reset();setLevel(5);stage=stage||'fly';if(restart&&MAN.snap())MAN.start(stage,2);else MAN.start(stage);S=fresh();S.phase='mansion';hud(true);mStage(stage)}
function mStage(stage){setL5(stage);mLabels();mctl(false);ART.portrait($('mface'),'richie','calm');dh={};
 mtalk(MLINES[stage],function(){MAN.go();mctl(true);shout(stage==='fly'?'FLY!':stage==='chute'?'STEER!':'SNEAK IN!',1.2)})}
MAN.on('stage',function(st){if(level!==5)return;mStage(st)});
MAN.on('ring',function(r){if(r.hit&&r.perf)shout('PERFECT!',0.6);else if(!r.hit)shout('MISSED THE RING',0.7)});
MAN.on('boost',function(){shout('BOOST!',0.6)});
MAN.on('jumpReady',function(){shout('JUMP!',2)});
MAN.on('jump',function(){mctl(false);shout('GERONIMO!',1.2)});
MAN.on('gust',function(w){if(Math.abs(w)>30)shout('WIND GUST!',0.8)});
MAN.on('spotted',function(){shout('SPOTTED! -150',0.9)});
MAN.on('landed',function(l){mctl(false);shout(l.result==='perfect'?'PERFECT LANDING!':l.result==='ok'?'ON TARGET!':l.result==='close'?'CLOSE ENOUGH!':'MISSED! TRY AGAIN',1.5)});
MAN.on('retry',function(){if(level===5){mctl(true);shout('FROM THE TOP!',1.2)}});
MAN.on('detected',function(){shout('DETECTED!',1.2)});
MAN.on('lost',function(){shout('THEY LOST YOU',1)});
MAN.on('ko',function(k){shout(k.silent?'SILENT TAKEDOWN!':'K.O.!',0.9)});
MAN.on('clear',function(){shout('ALL CLEAR! TO THE DOOR \u2192',1.8)});
MAN.on('empty',function(){shout('NO AMMO! FIND A BOX',1)});
MAN.on('ammo',function(){shout('AMMO!',0.6)});
MAN.on('ammodrop',function(){shout('AMMO DROP!',0.9)});
MAN.on('down',function(){shout('OOF! BACK TO COVER',1.3)});
MAN.on('door',function(st){if(level!==5)return;mctl(false);S.l5=st;setTimeout(function(){if(level===5&&L5==='stealth')mtalk(MLINES.door,function(){showDone5(S.l5)})},1200)});
function showDone5(st){setL5('done');S.phase='done5';S.shoutT=0;$('shout').classList.remove('on');hud(false);mctl(false);mAuto(false);SFX.fanfare();
 var b=store.get(),best=Math.max(b.l5best||0,st.score);store.set({l5done:true,l5best:best});
 var land={perfect:'PERFECT',ok:'ON TARGET',close:'CLOSE ENOUGH'}[st.land]||'\u2014';
 $('stats5').innerHTML='Rings: <b>'+st.rings+'/'+st.ringsN+'</b> \u00B7 Landing: <b>'+land+'</b><br>Guards down: <b>'+st.kos+'</b> ('+st.silent+' silent) \u00B7 detected: <b>'+st.detected+'</b><br>Score: <b>'+st.score+'</b> \u00B7 time '+st.time.toFixed(1)+'s'+(st.retries?' \u00B7 retries: '+st.retries:'')+'<br><small>Your best: '+best+'</small>';
 $('done5').hidden=false;var cc=$('done5').querySelector('.cardin');if(cc){cc.classList.remove('burst');void cc.offsetWidth;cc.classList.add('burst')}}
/* ---------- level 6: Escobar (the final level) ---------- */
var Es=function(t){return {who:'esc',text:t}},Ch=function(t){return {who:'chief',text:t}},Tk=function(t){return {who:'tank',text:t}};
/* Escobar, the chief (she) and TANK are original characters */
var ELINES={
 stairs:[Rc('Joystick to move. ATTACK for a 3-hit combo, KICK, JUMP then KICK in the air. KICK a railing to drop its chandelier. Walk over a glowing item to grab it. RAGE when the bar is full. Or tap AUTO FIGHT.','smile')],
 escTop:[Es('You made it to the top of my stairs, Rosado. Too bad it ends here.'),Rc('Nice suit. Let\u2019s see if you can aim.','calm')],
 flood:[Es('My aquarium! My beautiful sharks!'),Ch('Don\u2019t just stand there, boys. Get him!'),Rc('Knee-deep, with sharks. The sharks only bump... let them do the work!','smile')],
 climb:[Rc('He ran for the roof. Up the wall it is.','calm'),Rc('Hold the joystick UP to climb, \u25C0 \u25B6 to dodge the falling tiles, LUNGE to jump up fast. Or tap AUTO CLIMB.','smile')],
 roof:[Es('Nobody gets this far. Nobody!'),Ch('Finish him, Escobar. I\u2019ll be in the helicopter.'),Rc('That rotor wash pushes me to the edge. Fill the RAGE bar for the big combo!','calm')],
 splash:[Rc('Cannonball!','smile'),Ch('Up, up! Get me out of here!')],
 chiefGone:[Rc('She\u2019s getting away... and Escobar\u2019s running for his speedboat!','strain')],
 bay:[Rc('Good thing he left the jet ski running.','smile'),Rc('Joystick to steer around the buoys and crates. JUMP over the yacht wakes, JUMP right before a wake for a flip. BOOST to catch up. Or tap AUTO RIDE.','smile')],
 deck:[Gd('He jumped the yacht! Get him off the boat!'),Rc('Permission to come aboard.','calm')],
 escDeck:[Es('My house, my pool, my suit! You ruined everything!'),Rc('Last round, Escobar. Let\u2019s finish this.','calm')],
 chiefHover:[Ch('Escobar was always replaceable, Richie. I\u2019m not.'),Rc('Come down here and say that, Chief!','strain'),Ch('Cheers, Richie. Enjoy the swim home.')],
 lose:[Rc('Oof! Shake it off, Richie. Let\u2019s go again!','smile')]
};
var EAUTOLBL={stairs:'AUTO FIGHT',roof:'AUTO FIGHT',deck:'AUTO FIGHT',climb:'AUTO CLIMB',bay:'AUTO RIDE'};
var ESHOUT={stairs:'FIGHT!',climb:'CLIMB!',roof:'FIGHT!',bay:'RIDE!',deck:'LAST ROUND!'};
function ectl(on){app.dataset.ectl=on?'1':'0';if(!on){ESC.move(0,0);estickReset();ekeys={}}}
function eAuto(on){ESC.setAuto(on);var b=$('eAuto');b.setAttribute('aria-pressed',on?'true':'false');$('eAutoState').textContent=on?'ON':'OFF';app.classList.toggle('autoe',!!on);$('eAutoInd').hidden=!on;eLabels();if(on&&DQ&&level===6)eAutoTalk()}
function eLabels(){var l=EAUTOLBL[ESC.stage()]||'AUTO';$('eAutoLbl').textContent=l;$('eAutoIndT').textContent=l+' ON'}
function toggleEAuto(){if(paused||level!==6||app.dataset.hud!=='1'||!EAUTOLBL[L6])return;SFX.unlock();SFX.blip();var on=!ESC.auto();eAuto(on);shout((EAUTOLBL[ESC.stage()]||'AUTO')+(on?' ON':' OFF'),0.9)}
function eManual(){if(ESC.auto()){eAuto(false);shout((EAUTOLBL[ESC.stage()]||'AUTO')+' OFF',0.9)}}
function eAutoTalk(){if(!ESC.auto())return;setTimeout(function(){if(DQ&&level===6&&ESC.auto()&&!paused){DQ.typed=DQ.full.length;$('line').textContent=DQ.full;SFX.blip();nextLine();eAutoTalk()}else if(DQ&&level===6&&ESC.auto())eAutoTalk()},1700)}
function etalk(lines,done){talk(lines,done);eAutoTalk()}
/* freeze-frame title slams: the scene freezes, desaturates, and the name card slams in */
var SLAM={on:false,q:[],done:null,t:null,shown:[]};
function slams(list,done){SLAM.on=true;SLAM.q=list.slice();SLAM.done=done;app.classList.add('slamming');slamNext()}
function slamNext(){clearTimeout(SLAM.t);var c=SLAM.q.shift();if(!c){slamEnd();return}SLAM.shown.push(c[0]);var el=$('slam');el.className='slam '+(c[2]||'');$('slamA').textContent=c[0];$('slamB').textContent=c[1];el.hidden=false;void el.offsetWidth;el.classList.add('in');SFX.thud&&SFX.thud(1.4);SFX.combo&&SFX.combo();
 SLAM.t=setTimeout(slamNext,ESC.auto()?1300:1700)}
function slamEnd(silent){clearTimeout(SLAM.t);var was=SLAM.on;SLAM.on=false;$('slam').hidden=true;app.classList.remove('slamming');var d=SLAM.done;SLAM.done=null;if(was&&!silent&&d)d()}
function l6Reset(){SFX.unlock();$('intro').hidden=true;started=true;DQ=null;$('dialog').hidden=true;cards();setL4('');setMode('');app.classList.remove('boosting');$('record').hidden=true;dh={};dctl(false);fctl(false);mctl(false);setSelf(false);SFX.engine(0);themeOn()}
function showIntro6(){l6Reset();setLevel(6);setL6('intro');S=fresh();S.phase='intro6';hud(false);ectl(false);ESC.start('stairs');$('intro6').hidden=false}
/* CONTINUE TO LEVEL 6 / START: Mike's showdown video (uncut, SKIP) -> the title slams -> Phase 1 */
function startShowdown(){l6Reset();setLevel(6);setL6('cut');S=fresh();hud(false);ectl(false);ESC.start('stairs');eAuto(false);playCut('l6')}
function afterShowdown(){if(level!==6)return;setL6('slam');S.phase='slam';hud(false);
 slams([['ESCOBAR','THE KING OF MIAMI','esc'],['THE CHIEF','BOUGHT AND PAID FOR','chief'],['TANK','ESCOBAR\u2019S MUSCLE','tank']],function(){startL6('stairs')})}
function startL6(stage,restart){l6Reset();setLevel(6);stage=stage||'stairs';if(restart&&ESC.snap())ESC.start(stage,2);else ESC.start(stage);S=fresh();S.phase='escobar';hud(true);eStage(stage)}
function eStage(stage){setL6(stage);eLabels();ectl(false);ART.portrait($('eface'),'richie','calm');dh={};$('ebossbar').hidden=true;
 if(stage==='finale'){hud(true);return}
 etalk(ELINES[stage]||[],function(){ESC.go();ectl(true);shout(ESHOUT[stage]||'GO!',1.2)})}
ESC.on('stage',function(st){if(level!==6)return;eStage(st)});
ESC.on('talk',function(k){if(level!==6)return;var lines=ELINES[k];if(!lines){ESC.resume();return}etalk(lines,function(){ESC.resume()})});
ESC.on('tank',function(){if(level===6)shout('TANK!',1)});
ESC.on('wave',function(w){if(level===6)shout(w.flood?'HERE THEY COME!':'WAVE '+w.i+'!',1)});
ESC.on('clear',function(){if(level===6&&ESC.snap().go)shout('GO \u2192',1.2)});
ESC.on('pickup',function(k){if(level===6)shout({cue:'POOL CUE!',ext:'EXTINGUISHER!',arm:'CHANDELIER ARM!'}[k.k]||'GOT IT!',0.9)});
ESC.on('weaponGone',function(){if(level===6)shout('WEAPON GONE',0.8)});
ESC.on('chandelier',function(){if(level===6)shout('LOOK OUT BELOW!',1)});
ESC.on('crash',function(n){if(level===6&&n>1)shout('CHANDELIER x'+n+'!',1)});
ESC.on('flood',function(){if(level===6)shout('FLOOD!',1.4)});
ESC.on('shark',function(){if(level===6)shout('SHARK ASSIST!',0.8)});
ESC.on('finisher',function(){if(level===6)shout('K.O.!',0.9)});
ESC.on('rage',function(){if(level===6){$('shout').classList.add('rage');shout('RICHIE RAGE!',1.1)}});
ESC.on('wash',function(){if(level===6)shout('ROTOR WASH!',1)});
ESC.on('hang',function(){if(level===6)shout('HANG ON!',1)});
ESC.on('aim',function(){if(level===6)shout('HE\u2019S AIMING! MOVE!',0.9)});
ESC.on('launch',function(){if(level===6)shout('OFF THE ROOF!',1.4)});
ESC.on('splash',function(){if(level===6)shout('SPLASH!',1.2)});
ESC.on('air',function(f){if(level===6)shout(f?'FLIP!':'BIG AIR!',0.7)});
ESC.on('boost',function(){if(level===6)shout('BOOST!',0.6)});
ESC.on('leap',function(){if(level===6){ectl(false);shout('GERONIMO!',1.2)}});
ESC.on('tile',function(){if(level===6)shout('OUCH!',0.6)});
ESC.on('escDown',function(st){if(level===6&&st==='deck'){ectl(false);SFX.fanfare();shout('ESCOBAR DOWN!',2)}});
ESC.on('hover',function(){if(level===6)shout('THE CHIEF!',1.2)});
ESC.on('down',function(){if(level===6)shout('OOF!',0.9)});
ESC.on('lose',function(st){if(level!==6)return;ectl(false);etalk(ELINES.lose,function(){startL6(st,true)})});
/* v0.6.1: hold the helicopter shot, then the optional ending video (skipped cleanly while the file does not exist), then the ending card */
ESC.on('end',function(st){if(level!==6)return;S.l6=st;setTimeout(function(){if(level===6&&L6==='finale'&&!CUT.on)playCut('end6')},1800)});
function showDone6(st){setL6('done');S.phase='done6';S.shoutT=0;$('shout').classList.remove('on');hud(false);ectl(false);eAuto(false);SFX.fanfare();confetti(80);
 var b=store.get(),best=Math.max(b.l6best||0,st.score);store.set({l6done:true,l6best:best});
 $('stats6').innerHTML='Score: <b>'+st.score+'</b> \u00B7 knocked out: <b>'+st.kos+'</b> \u00B7 chandeliers: <b>'+st.chand+'</b><br>Shark assists: <b>'+st.sharks+'</b> \u00B7 big air: <b>'+st.airs+'</b> ('+st.flips+' flips) \u00B7 time '+st.time.toFixed(1)+'s'+(st.retries?' \u00B7 retries: '+st.retries:'')+'<br><small>Your best: '+best+'</small>';
 $('done6').hidden=false;var cc=$('done6').querySelector('.cardin');if(cc){cc.classList.remove('burst');void cc.offsetWidth;cc.classList.add('burst')}}
var WSHORT={cue:'POOL CUE',ext:'EXTINGUISHER',arm:'CHANDELIER ARM'};
function eHud(){var m=ESC.snap();if(!m)return;setTxt('eScore',('000000'+m.score).slice(-6));setW('eHpi',m.hp/100);setTxt('eLives','\u00D7'+m.lives);setW('eRagei',m.rage/100);
 var full=m.rage>=100;if(dh.rfull!==full){dh.rfull=full;$('eRage').classList.toggle('full',full);$('eSpec').classList.toggle('ready',full)}
 var wk=m.weapon||'';if(dh.wk!==wk||dh.wu!==m.uses){dh.wk=wk;dh.wu=m.uses;$('eWpn').classList.toggle('has',!!wk);setTxt('eWpnN',wk?WSHORT[wk]:'FISTS');setTxt('eWpnU',wk?'\u00D7'+m.uses:'');$('eAtk').textContent=wk?(wk==='ext'?'SPRAY':'SWING'):'ATTACK'}
 if(m.stage==='stairs'){setTxt('eWaveT',m.flood?'FLOOD!':m.wave<=0?'TANK':'WAVE '+Math.min(m.wave,m.waves-1)+'/'+(m.waves-2))}else if(m.stage==='roof'||m.stage==='deck')setTxt('eWaveT',m.stage==='roof'?'ROOFTOP':'THE DECK');
 if(m.stage==='climb')setW('eClimb',m.h/m.len);
 if(m.stage==='bay'){setW('eGap',1-Math.min(1,Math.max(0,(m.gap-40)/340)));setW('eBoostFill',m.meter);setW('eDist',m.d/m.len);var rdy=m.meter>=0.5;if(dh.brdy!==rdy){dh.brdy=rdy;$('eBoost').classList.toggle('off',!rdy)}}
 var bs=m.boss,tk=m.tank&&m.tank.st!=='ko'?m.tank:null,bb=!!(bs&&bs.st!=='ko'&&bs.st!=='fly'||tk);if(dh.bb!==bb){dh.bb=bb;$('ebossbar').hidden=!bb}
 if(bb){var who=tk?'tank':'esc';if(dh.bw!==who){dh.bw=who;$('ebname').textContent=tk?'TANK':'ESCOBAR';ESC.portrait($('ebface'),who)}setW('ebhp',tk?Math.max(0,tk.hp)/120:bs.hp/bs.max)}}
/* level 6 input: joystick + buttons + keys */
var estickId=null,estickV={x:0,y:0},ekeys={};
function estickReset(){estickId=null;estickV={x:0,y:0};var k=$('eknob');if(k)k.style.transform=''}
function eApply(){var kx=(ekeys.r?1:0)-(ekeys.l?1:0),ky=(ekeys.d?1:0)-(ekeys.u?1:0),x=estickV.x||kx,y=estickV.y||ky;if(Math.abs(x)>0.3||Math.abs(y)>0.3)eManual();if(!ESC.auto())ESC.move(x,y)}
function estickAt(e){var st=$('estick'),r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2,dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R,m=Math.hypot(dx,dy);
 if(m>1){dx/=m;dy/=m}estickV={x:Math.abs(dx)<0.2?0:dx,y:Math.abs(dy)<0.2?0:dy};$('eknob').style.transform='translate('+(dx*R*0.55)+'px,'+(dy*R*0.55)+'px)';eApply()}
function epress(k){if(paused||level!==6||app.dataset.ectl!=='1'||DQ)return;SFX.unlock();eManual();ESC.press(k)}
function mHud(){var m=MAN.snap();if(!m)return;
 setTxt('mScore',('000000'+m.score).slice(-6));
 if(m.fly){var f=m.fly;setTxt('mAlt',String(f.alt));setTxt('mRings',f.hit+'/'+f.n);setW('mBoostFill',f.meter);var j=f.over&&!f.jumped;if(dh.jmp!==j){dh.jmp=j;$('mBoost').textContent=j?'JUMP!':'BOOST';$('mBoost').classList.toggle('jump',j);$('mBoost').setAttribute('aria-label',j?'Jump out of the plane':'Boost')}
  var rdy=j||f.meter>=MAN.FLY.cost&&f.boost<=0;if(dh.mrdy!==rdy){dh.mrdy=rdy;$('mBoost').classList.toggle('off',!rdy)}}
 if(m.chute){var c=m.chute,w=c.wind,kt=Math.round(Math.abs(w)/3);setTxt('mHeight',String(c.ft));setTxt('mWindV',w<-1?'\u25C0 '+kt:w>1?kt+' \u25B6':'0');setL('mTgtMark',Math.max(0,Math.min(1,0.5+c.dx/300)));
  var on=Math.abs(c.dx)<c.ok;if(dh.ton!==on){dh.ton=on;$('mTgtMark').classList.toggle('on',on)}}
 if(m.stealth){var s=m.stealth;setW('mHpi',Math.max(0,s.p.hp)/100);setTxt('mLives','\u00D7'+s.lives);setTxt('mAmmo',String(s.ammo));setTxt('mGuards',String(s.up));setW('mDetFill',s.meter);
  var dc=s.alert?'alert':s.meter>0.5?'warn':s.p.hidden?'hid':'';if(dh.dc!==dc){dh.dc=dc;$('mDet').className='mbox st-only mdet '+dc}setTxt('mDetLbl',s.alert?'DETECTED!':s.p.hidden?'HIDDEN':'STEALTH');
  var cr=s.p.crouch;if(dh.cr!==cr){dh.cr=cr;$('mSneak').classList.toggle('on',cr);$('mSneak').setAttribute('aria-pressed',cr?'true':'false')}
  var lo=s.ammo===0;if(dh.lo!==lo){dh.lo=lo;$('mShoot').classList.toggle('off',lo)}}}
/* level 5 input: joystick (fly + stealth), hold buttons (chute), keys */
var mstickId=null,mstickV={x:0,y:0},mkeys={},mhold={};
function mstickReset(){mstickId=null;mstickV={x:0,y:0};var k=$('mknob');if(k)k.style.transform=''}
function mApply(){var kx=(mkeys.r?1:0)-(mkeys.l?1:0),ky=(mkeys.d?1:0)-(mkeys.u?1:0),hx=(mhold.r?1:0)-(mhold.l?1:0),x=mstickV.x||kx||hx,y=mstickV.y||ky||(mhold.f?-1:0);
 if(Math.abs(x)>0.3||Math.abs(y)>0.3)mManual();if(!MAN.auto())MAN.move(x,y)}
function mstickAt(e){var st=$('mstick'),r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2,dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R,m=Math.hypot(dx,dy);
 if(m>1){dx/=m;dy/=m}mstickV={x:Math.abs(dx)<0.2?0:dx,y:Math.abs(dy)<0.2?0:dy};$('mknob').style.transform='translate('+(dx*R*0.55)+'px,'+(dy*R*0.55)+'px)';mApply()}
function mpress(k){if(paused||level!==5||app.dataset.mctl!=='1')return;SFX.unlock();var st=MAN.stage(),jump=st==='fly'&&MAN.snap().fly.over;if(!jump)mManual();MAN.press(k)}
function fightHud(){var f=FIGHT.snap();if(!f)return;
 var rg=f.rage/f.rageMax;setW('fragei',rg);var full=rg>=1;if(dh.rfull!==full){dh.rfull=full;$('frage').classList.toggle('full',full);$('fSpec').classList.toggle('ready',full)}
 setW('fhpi',Math.max(0,f.player.hp)/100);var low=f.player.hp<=30;if(dh.low!==low){dh.low=low;$('fhp').classList.toggle('low',low)}
 setTxt('lives','\u00D7'+f.lives);setTxt('score',('000000'+f.score).slice(-6));
 var wt=f.boss?(f.boss.hp>0?'BOSS':''):f.wave>0?'WAVE '+Math.min(f.wave,f.waves)+'/'+f.waves:'';setTxt('wtag',wt);
 var eb=f.ehud&&!(f.boss&&f.ehud.name===FIGHT.TYPES.jefe.name);if(dh.eb!==eb){dh.eb=eb;$('ebar').hidden=!eb}if(eb){setTxt('ename',f.ehud.name);setW('ehp',f.ehud.hp/f.ehud.max)}
 if(f.boss){setW('bhp',f.boss.hp/f.boss.max)}
 if(f.duo){f.duo.forEach(function(e){setW(e.type==='manny'?'bhp':'bhp2',Math.max(0,e.hp)/e.max)})}
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
 if(level===6){if(!SLAM.on)ESC.update(dt);eHud();return}
 if(level===5){MAN.update(dt);mHud();return}
 if(level===4){PLANE.update(dt);return}
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
 if(level===6){b.setTransform(1,0,0,1,0,0);b.fillStyle='#07040d';b.fillRect(0,0,buf.width,buf.height);ESC.render(b,W,clock);b.setTransform(1,0,0,1,0,0);blit();return}
 if(level===5){b.setTransform(1,0,0,1,0,0);b.fillStyle='#07040d';b.fillRect(0,0,buf.width,buf.height);MAN.render(b,W,clock);b.setTransform(1,0,0,1,0,0);blit();return}
 if(level===4){b.setTransform(1,0,0,1,0,0);b.imageSmoothingEnabled=false;b.fillStyle='#07040d';b.fillRect(0,0,W,LH);PLANE.render(b,W,clock);blit();return}
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
function canPause(){return started&&S.phase!=='cut'&&S.phase!=='done'&&S.phase!=='done1'&&S.phase!=='done3'&&S.phase!=='intro3'&&S.phase!=='intro4'&&S.phase!=='done4'&&S.phase!=='intro5'&&S.phase!=='done5'&&S.phase!=='intro6'&&S.phase!=='done6'&&S.phase!=='slam'&&!SLAM.on&&!CUT.on}
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
$('restart').addEventListener('click',function(){setPaused(false);DQ=null;$('dialog').hidden=true;if(level===6&&(EAUTOLBL[L6]||L6==='finale'))startL6(L6==='finale'?'deck':ESC.stage(),true);else if(level===5&&L5&&L5!=='intro'&&L5!=='done')startL5(MAN.stage(),true);else if(L4==='fight')startFight4();else if(L4)startChase();else if(level===1)startDrive();else if(level===3)startFight();else startLevel()});
$('music').addEventListener('click',function(){musicOn=!musicOn;musicUI()});
$('again').addEventListener('click',function(){SFX.unlock();if(musicOn&&T&&T.supported&&!T.isPlaying())T.play();startLevel()});
$('next3').addEventListener('click',function(){started=true;showIntro3()});
$('start3').addEventListener('click',function(){startFight()});
$('again3').addEventListener('click',function(){startFight()});
$('next4').addEventListener('click',function(){showIntro4()});
$('start4').addEventListener('click',function(){startChase()});
$('again4').addEventListener('click',function(){startChase()});
$('next5').addEventListener('click',function(){showIntro5()});
$('next6').addEventListener('click',function(){startShowdown()});
$('start6').addEventListener('click',function(){startShowdown()});
$('again6').addEventListener('click',function(){startL6('stairs')});
$('toL1e').addEventListener('click',function(){SFX.unlock();themeOn();startDrive()});
$('slam').addEventListener('pointerdown',function(e){e.preventDefault();if(SLAM.on)slamNext()});
$('start5').addEventListener('click',function(){startL5('fly')});
$('again5').addEventListener('click',function(){startL5('fly')});
$('toL1d').addEventListener('click',function(){SFX.unlock();themeOn();startDrive()});
$('toL1c').addEventListener('click',function(){SFX.unlock();themeOn();startDrive()});
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
/* level 5 controls */
[['mBoost',function(){mpress(MAN.stage()==='fly'&&MAN.snap().fly.over?'jump':'boost')}],['mShoot',function(){mpress('shoot')}],['mSneak',function(){mpress('sneak')}]].forEach(function(b){var el=$(b[0]);
 el.addEventListener('pointerdown',function(e){e.preventDefault();el.classList.add('hit');setTimeout(function(){el.classList.remove('hit')},90);b[1]()});
 el.addEventListener('click',function(e){e.preventDefault()});el.addEventListener('contextmenu',function(e){e.preventDefault()})});
[['mL','l'],['mR','r'],['mFlare','f']].forEach(function(b){var el=$(b[0]);
 el.addEventListener('pointerdown',function(e){if(paused||level!==5||app.dataset.mctl!=='1')return;e.preventDefault();SFX.unlock();try{el.setPointerCapture(e.pointerId)}catch(x){}mhold[b[1]]=true;el.classList.add('hit');mApply()});
 ['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){el.addEventListener(ev,function(){if(!mhold[b[1]])return;mhold[b[1]]=false;el.classList.remove('hit');mApply()})});
 el.addEventListener('click',function(e){e.preventDefault()});el.addEventListener('contextmenu',function(e){e.preventDefault()})});
/* level 6 controls */
[['eAtk','atk'],['eKick','kick'],['eJump','jump'],['eSpec','rage'],['eLunge','jump'],['eHop','jump'],['eBoost','boost']].forEach(function(b){var el=$(b[0]);
 el.addEventListener('pointerdown',function(e){e.preventDefault();el.classList.add('hit');setTimeout(function(){el.classList.remove('hit')},90);epress(b[1])});
 el.addEventListener('click',function(e){e.preventDefault()});el.addEventListener('contextmenu',function(e){e.preventDefault()})});
$('eAuto').addEventListener('pointerdown',function(e){e.preventDefault();toggleEAuto()});$('eAuto').addEventListener('click',function(e){e.preventDefault()});
var estk=$('estick');
estk.addEventListener('pointerdown',function(e){if(paused||level!==6||app.dataset.ectl!=='1')return;e.preventDefault();estickId=e.pointerId;try{estk.setPointerCapture(e.pointerId)}catch(x){}SFX.unlock();estickAt(e)});
estk.addEventListener('pointermove',function(e){if(e.pointerId!==estickId)return;e.preventDefault();estickAt(e)});
['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){estk.addEventListener(ev,function(e){if(e.pointerId!==estickId)return;estickReset();eApply()})});
estk.addEventListener('contextmenu',function(e){e.preventDefault()});
document.addEventListener('keydown',function(e){if(level!==6||app.dataset.ectl!=='1'||paused||DQ)return;
 if(KMAP[e.key]){e.preventDefault();ekeys[KMAP[e.key]]=true;eApply();return}
 if(e.repeat)return;var k=e.key.toLowerCase(),st=ESC.stage();
 if(k==='j'||k==='z'||k===' '||k==='enter'){e.preventDefault();e.stopImmediatePropagation();epress(st==='bay'||st==='climb'?'jump':'atk')}else if(k==='k'||k==='x'){e.preventDefault();epress('jump')}else if(k==='i'||k==='v'){e.preventDefault();epress(st==='bay'?'boost':'kick')}else if(k==='l'||k==='c'||k==='shift'){e.preventDefault();epress(st==='bay'?'boost':'rage')}},true);
document.addEventListener('keyup',function(e){if(KMAP[e.key]&&level===6){ekeys[KMAP[e.key]]=false;eApply()}});
$('mAuto').addEventListener('pointerdown',function(e){e.preventDefault();toggleMAuto()});$('mAuto').addEventListener('click',function(e){e.preventDefault()});
var mstk=$('mstick');
mstk.addEventListener('pointerdown',function(e){if(paused||level!==5||app.dataset.mctl!=='1')return;e.preventDefault();mstickId=e.pointerId;try{mstk.setPointerCapture(e.pointerId)}catch(x){}SFX.unlock();mstickAt(e)});
mstk.addEventListener('pointermove',function(e){if(e.pointerId!==mstickId)return;e.preventDefault();mstickAt(e)});
['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){mstk.addEventListener(ev,function(e){if(e.pointerId!==mstickId)return;mstickReset();mApply()})});
mstk.addEventListener('contextmenu',function(e){e.preventDefault()});
/* KMAP is shared by levels 5 and 6 */
var KMAP={ArrowLeft:'l',a:'l',A:'l',ArrowRight:'r',d:'r',D:'r',ArrowUp:'u',w:'u',W:'u',ArrowDown:'d',s:'d',S:'d'};
document.addEventListener('keydown',function(e){if(level!==5||app.dataset.mctl!=='1'||paused||DQ)return;
 if(KMAP[e.key]){e.preventDefault();mkeys[KMAP[e.key]]=true;mApply();return}
 if(e.repeat)return;var k=e.key.toLowerCase(),st=MAN.stage();
 if(k===' '||k==='j'||k==='z'||k==='enter'){e.preventDefault();e.stopImmediatePropagation();mpress(st==='stealth'?'shoot':st==='fly'&&MAN.snap().fly.over?'jump':'boost')}
 else if(k==='c'||k==='k'||k==='x'||k==='shift'){e.preventDefault();mpress('sneak')}},true);
document.addEventListener('keyup',function(e){if(KMAP[e.key]&&level===5){mkeys[KMAP[e.key]]=false;mApply()}});
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
 else if(e.key==='Escape'||e.key==='p'){if(CUT.on)endCut('skip');else if(SLAM.on)slamNext();else if(canPause())setPaused(!paused)}
});
document.addEventListener('visibilitychange',function(){if(document.hidden&&canPause())setPaused(true)});
document.addEventListener('gesturestart',function(e){e.preventDefault()});
window.addEventListener('resize',resize);window.addEventListener('orientationchange',function(){setTimeout(resize,150)});
if(!T||!T.supported){musicOn=false}
musicUI();hud(false);ctl(false);dctl(false);fctl(false);mctl(false);ectl(false);setLevel(1);resize();if(store.get().l1done)$('startL2').classList.add('unlocked');
ART.loadSprites(SPRITES,function(){bgW=0;resize();if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr)});
DRIVE.loadSprites(DSPRITES,function(){if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr)});
FIGHT.loadSprites(FSPRITES,function(){if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr);var duo=L4==='fight';FIGHT.portrait($('bface'),duo?'manny':'jefe');if(duo)FIGHT.portrait($('bface2'),'aces')});
PLANE.loadSprites(PSPRITES);
MAN.loadSprites(MSPRITES,function(){if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr)});
ESC.loadSprites(ESPRITES,function(){if(DQ)face(DQ.lines[DQ.i].who,DQ.lines[DQ.i].expr);dh={}});
/* the menu's LEVEL 3 box opens game/?start=alley -> straight to the Level 3 intro card (the only entry param) */
/* ...the LEVEL 4 box opens game/?start=airfield -> the Level 4 intro card, the LEVEL 5 box opens game/?start=mansion -> the Level 5 intro card,
   and the LEVEL 6 box opens game/?start=escobar -> the Level 6 intro card (its START is the tap that lets the showdown video play with sound) */
try{var q=new URLSearchParams(location.search).get('start');if(q==='alley'){started=true;showIntro3()}else if(q==='airfield'){showIntro4()}else if(q==='mansion'){showIntro5()}else if(q==='escobar'){showIntro6()}}catch(e){}
requestAnimationFrame(function(ts){last=ts;loop(ts)});

/* test/debug hook (read-only snapshot, no network) */
window.__rosado={version:VERSION,REPS:REPS,BAG:BAG,IDLE:IDLE,IDLE_MULT:IDLE_MULT,
 snap:function(){var L=bagLevel();return {level:level,l4:L4,l5:L5,l6:L6,escobar:ESC.snap(),slam:{on:SLAM.on,text:SLAM.on?$('slamA').textContent:'',shown:SLAM.shown.slice()},mansion:MAN.snap(),plane:PLANE.snap(),drive:DRIVE.snap(),phase:S.phase,rep:S.rep,h:S.h,taps:S.taps,tapsPerRep:S.tapsPerRep.slice(),hits:S.hits,combo:S.combo,bestCombo:S.bestCombo,misses:S.misses,
  timeLeft:S.timeLeft,marker:markerPos(S.m),dir:(S.m%2)<1?1:-1,zone:[BAG.center[L]-BAG.zone[L],BAG.center[L]+BAG.zone[L]],speed:BAG.speed[L],cd:S.cd,paused:paused,dialog:!!DQ,line:DQ?DQ.full:'',
  musicOn:musicOn,music:!!(T&&T.isPlaying()),cut:(function(){var v=$('cutv');return {on:CUT.on,kind:CUT.kind,state:CUT.state,how:CUT.how,fallback:CUT.fallback,found:!!CUT.found,visible:!$('cut').hidden,t:v.currentTime,paused:v.paused,src:v.getAttribute('src')||'',tap:!$('cutTap').hidden}})(),fight:FIGHT.snap(),W:W,story:S.story.slice(),exitX:S.exitX,walking:S.walking,exitOff:(function(){if(S.exitX==null)return false;var an=ART.anchors(W,0,clock);return an.fromBg?an.fromBg(S.exitX-70)>W:false})(),clangs:SFX.clangs?SFX.clangs():0}},
 loadSprites:function(map){return ART.loadSprites(map,function(){bgW=0;resize()})},spriteMode:function(){return ART.spriteMode()},driveSpriteMode:function(){return DRIVE.spriteMode()},fightBox:function(i){var f=FIGHT.snap();if(!f)return null;var e=i<0?f.player:f.enemies[i];if(!e)return null;var m=FIGHT.META[e.frame],hw=m?Math.max(m[2],m[0]-m[2])/2:e.h*0.3,r=$('view').getBoundingClientRect(),X=function(x){return r.left+ox+(x-f.cam)*scale},Y=function(y){return r.top+oy+y*scale};
  return {l:X(e.x-hw),r:X(e.x+hw),t:Y(e.y-(e.z||0)-e.h),b:Y(e.y-(e.z||0)),feet:Y(e.y),scale:scale,h:e.h}},fightSpriteMode:function(){return FIGHT.spriteMode()},fdev:FIGHT.dev,
 dev:DRIVE.dev,CFG:DRIVE.CFG,pdev:PLANE.dev,mdev:MAN.dev,showDone4:function(){cards();showDone4()},mansionSpriteMode:function(){return MAN.spriteMode()},edev:ESC.dev,l6:function(st){startL6(st||'stairs')},escobarSpriteMode:function(){return ESC.spriteMode()},showDone5:function(st){l5Reset();setLevel(5);S=fresh();showDone5(st||{score:1000,rings:16,ringsN:16,land:'perfect',kos:6,silent:6,detected:0,time:100,retries:0})},showDone6:function(st){cards();showDone6(st||{score:1234,kos:20,chand:3,sharks:4,airs:5,flips:2,time:300,retries:0})},planeSpriteMode:function(){return PLANE.spriteMode()}};
})();
