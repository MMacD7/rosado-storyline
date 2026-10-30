/* Rosado Nights sound effects (v0.3.1)
   Original WebAudio SFX, generated live. Own AudioContext so the effects keep working
   when the theme music is switched off (RosadoTheme.pause() suspends the music context).
   API: RosadoSFX.unlock() (call inside a tap), .clank(), .strain(level), .thump(power), .whiff(),
        .sting(), .blip(), .combo(n), .rack(), .fanfare(), .tick(), .setPaused(bool)
   Level 1 (drive): .engine(level,boost) (continuous electric hum, 0 = off), .crash(v), .bump(), .puff(), .boost(), .chime(), .pickup(), .squelch(), .warn(), .clunk()
   Level 2 story (v0.2.1): .clang() (off-screen metal bin crash in the alley), .clangs() (call count, for tests)
   Level 3 fight (v0.3.0): .punch(v), .thud(), .spin(), .block(), .ko(), .whistle(), .fight(on) (music loop), .fightOn()
   v0.3.1: .kwhoosh(), .rage(), .rageHit(v), .fightMode('street'|'boss'), .fightBpm() (new STREET RAGE loop, 160/172 BPM) */
(function(){
"use strict";
var ctx=null,out=null,nb=null,paused=false;
function unlock(){
 if(ctx){if(!paused&&ctx.state!=='running')ctx.resume();return true}
 var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 try{ctx=new AC()}catch(e){return false}
 var comp=ctx.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=8;comp.attack.value=0.002;comp.release.value=0.12;
 out=ctx.createGain();out.gain.value=0.9;out.connect(comp);comp.connect(ctx.destination);
 nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);var d=nb.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 var sb=ctx.createBufferSource();sb.buffer=ctx.createBuffer(1,1,22050);sb.connect(ctx.destination);sb.start(0);
 window.__rosadoSfxCtx=ctx;return true;
}
function ok(){return ctx&&!paused}
function G(v){var g=ctx.createGain();g.gain.value=v;return g}
function F(type,f,q){var b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q!=null)b.Q.value=q;return b}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec)}
function noise(t,dur){var s=ctx.createBufferSource();s.buffer=nb;s.start(t,Math.random()*0.5);s.stop(t+dur);return s}
function osc(type,f,t,dur){var o=ctx.createOscillator();o.type=type;o.frequency.value=f;o.start(t);o.stop(t+dur);return o}
function chain(){for(var i=0;i<arguments.length-1;i++)arguments[i].connect(arguments[i+1]);return arguments[arguments.length-1]}
function now(){return ctx.currentTime+0.005}

/* heavy iron clank: inharmonic metal partials + a gritty noise hit */
function clank(v){if(!ok())return;v=v||1;var t=now();
 [[210,0.5],[523,0.35],[1307,0.22],[2141,0.14],[3380,0.08]].forEach(function(p){var o=osc('sine',p[0]*(0.98+Math.random()*0.04),t,0.9),g=G(0);env(g,t,0.002,p[1]*v,0.25+0.4*Math.random());chain(o,g,out)});
 var n=noise(t,0.12),ng=G(0);env(ng,t,0.001,0.5*v,0.08);chain(n,F('bandpass',2600,1.4),ng,out);
 var k=osc('triangle',120,t,0.2),kg=G(0);k.frequency.exponentialRampToValueAtTime(55,t+0.15);env(kg,t,0.002,0.6*v,0.15);chain(k,kg,out);
}
/* strain whoosh: short filtered-noise push that climbs with the bar height (no voice) */
function strain(level){if(!ok())return;var t=now(),l=Math.max(0,Math.min(1,level||0));
 var n=noise(t,0.2),bp=F('bandpass',300+l*900,2.5),g=G(0);bp.frequency.setValueAtTime(260+l*700,t);bp.frequency.exponentialRampToValueAtTime(700+l*1800,t+0.14);
 env(g,t,0.01,0.32,0.15);chain(n,bp,g,out);
 var o=osc('sawtooth',55+l*40,t,0.16),lp=F('lowpass',400),og=G(0);o.frequency.exponentialRampToValueAtTime(70+l*60,t+0.12);env(og,t,0.005,0.16,0.12);chain(o,lp,og,out);
}
/* heavy-bag thump: deep body + leather slap */
function thump(power){if(!ok())return;var t=now(),p=power||1;
 var o=osc('sine',110,t,0.5),g=G(0);o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+0.25);env(g,t,0.003,0.9*p,0.3);chain(o,g,out);
 var n=noise(t,0.15),ng=G(0);env(ng,t,0.001,0.7*p,0.09);chain(n,F('lowpass',1800+p*800),ng,out);
 var s=noise(t,0.05),sg=G(0);env(sg,t,0.001,0.35*p,0.03);chain(s,F('highpass',2500),sg,out);
}
function whiff(){if(!ok())return;var t=now(),n=noise(t,0.22),bp=F('bandpass',1800,1.2),g=G(0);
 bp.frequency.setValueAtTime(2600,t);bp.frequency.exponentialRampToValueAtTime(500,t+0.2);env(g,t,0.02,0.3,0.18);chain(n,bp,g,out)}
/* the "NEW RECORD" sting: big hit + rising E-major arpeggio + bright held chord (no crowd) */
function sting(){if(!ok())return;var t=now();clank(0.6);thump(1.4);
 [64,68,71,76,80,83,88].forEach(function(m,i){var f=440*Math.pow(2,(m-69)/12),tt=t+i*0.07;
  ['square','sawtooth'].forEach(function(ty,j){var o=osc(ty,f*(j?1.004:1),tt,0.5),g=G(0),lp=F('lowpass',3500);env(g,tt,0.005,0.12,0.35);chain(o,lp,g,out)})});
 var ct=t+0.5;[76,80,83,88].forEach(function(m){var f=440*Math.pow(2,(m-69)/12);[-8,8].forEach(function(dt){var o=osc('sawtooth',f,ct,1.8),g=G(0),lp=F('lowpass',2800);o.detune.value=dt;env(g,ct,0.02,0.07,1.6);chain(o,lp,g,out)})});
 var n=noise(ct,1.5),ng=G(0);env(ng,ct,0.003,0.18,1.3);chain(n,F('highpass',6000),ng,out);
}
function blip(){if(!ok())return;var t=now(),o=osc('square',880,t,0.06),g=G(0);o.frequency.setValueAtTime(1320,t+0.025);env(g,t,0.002,0.08,0.05);chain(o,F('lowpass',3000),g,out)}
function tick(){if(!ok())return;var t=now(),o=osc('square',1600,t,0.04),g=G(0);env(g,t,0.001,0.06,0.03);chain(o,g,out)}
function combo(n){if(!ok())return;var t=now(),m=72+Math.min(12,n||0),f=440*Math.pow(2,(m-69)/12);
 var o=osc('square',f,t,0.15),g=G(0);o.frequency.setValueAtTime(f*1.5,t+0.05);env(g,t,0.003,0.08,0.12);chain(o,F('lowpass',4000),g,out)}
function rack(){if(!ok())return;clank(0.8);var t=now()+0.12;var o=osc('sine',180,t,0.4),g=G(0);env(g,t,0.003,0.3,0.3);chain(o,g,out)}
function fanfare(){if(!ok())return;var t=now();
 [[64,0],[71,0.14],[76,0.28],[79,0.42],[83,0.56],[88,0.75]].forEach(function(p){var f=440*Math.pow(2,(p[0]-69)/12),tt=t+p[1];
  var o=osc('square',f,tt,0.7),o2=osc('sawtooth',f*1.005,tt,0.7),g=G(0),lp=F('lowpass',3200);env(g,tt,0.01,0.1,p[1]>0.7?1.2:0.3);o.connect(lp);o2.connect(lp);chain(lp,g,out)});
 thump(1.2);
}

/* ---------- Level 1 drive ---------- */
/* electric-car hum: low motor tone + rising whine + soft road/rain hiss. engine(0) fades it out. */
var eng=null;
function engine(v,boost){
 if(!ctx)return;var t=ctx.currentTime;v=Math.max(0,Math.min(1.4,v||0));
 if(!eng){if(!v)return;
  eng={o1:ctx.createOscillator(),o2:ctx.createOscillator(),o3:ctx.createOscillator(),lp:F('lowpass',400,1.5),g:G(0),wg:G(0),n:ctx.createBufferSource(),ng:G(0),nf:F('bandpass',900,0.7)};
  eng.o1.type='sawtooth';eng.o2.type='triangle';eng.o3.type='sine';eng.o1.frequency.value=50;eng.o2.frequency.value=101;eng.o3.frequency.value=420;
  eng.o1.connect(eng.lp);eng.o2.connect(eng.lp);chain(eng.lp,eng.g,out);chain(eng.o3,eng.wg,out);
  eng.n.buffer=nb;eng.n.loop=true;chain(eng.n,eng.nf,eng.ng,out);
  [eng.o1,eng.o2,eng.o3,eng.n].forEach(function(o){o.start(t)});
 }
 var f=46+v*52+(boost?22:0);
 eng.o1.frequency.setTargetAtTime(f,t,0.12);eng.o2.frequency.setTargetAtTime(f*2.01,t,0.12);eng.o3.frequency.setTargetAtTime(300+v*520+(boost?380:0),t,0.15);
 eng.lp.frequency.setTargetAtTime(260+v*520+(boost?600:0),t,0.12);
 eng.g.gain.setTargetAtTime(v?0.10+(boost?0.05:0):0,t,0.12);eng.wg.gain.setTargetAtTime(v?0.012+v*0.012+(boost?0.02:0):0,t,0.15);
 eng.ng.gain.setTargetAtTime(v?0.035+v*0.03:0,t,0.2);
}
/* cartoon crash: crunchy noise + low thud + light metal ping */
function crash(v){if(!ok())return;v=v||1;var t=now();
 var n=noise(t,0.45),ng=G(0),lp=F('lowpass',2400);lp.frequency.setValueAtTime(3000,t);lp.frequency.exponentialRampToValueAtTime(400,t+0.4);env(ng,t,0.002,0.7*v,0.38);chain(n,lp,ng,out);
 var k=osc('sine',140,t,0.4),kg=G(0);k.frequency.exponentialRampToValueAtTime(40,t+0.3);env(kg,t,0.002,0.8*v,0.3);chain(k,kg,out);
 [[620,0.12],[1450,0.07]].forEach(function(p){var o=osc('square',p[0],t+0.03,0.3),g=G(0);env(g,t+0.03,0.002,p[1]*v,0.2);chain(o,F('lowpass',3000),g,out)});
}
/* bike bumped off: springy cartoon "boing" */
function bump(){if(!ok())return;var t=now();
 var o=osc('triangle',220,t,0.5),g=G(0),vib=osc('sine',18,t,0.5),vg=G(30);o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(760,t+0.16);o.frequency.exponentialRampToValueAtTime(480,t+0.45);
 vib.connect(vg);vg.connect(o.frequency);env(g,t,0.004,0.28,0.42);chain(o,g,out);
 var k=osc('sine',120,t,0.18),kg=G(0);k.frequency.exponentialRampToValueAtTime(60,t+0.12);env(kg,t,0.002,0.5,0.12);chain(k,kg,out);
}
/* smoke puff */
function puff(){if(!ok())return;var t=now(),n=noise(t,0.5),bp=F('bandpass',1200,0.8),g=G(0);bp.frequency.setValueAtTime(1800,t);bp.frequency.exponentialRampToValueAtTime(300,t+0.45);env(g,t,0.01,0.35,0.42);chain(n,bp,g,out)}
/* N2O boost: rising whoosh + bright sweep */
function boost(){if(!ok())return;var t=now();
 var n=noise(t,1.1),bp=F('bandpass',400,1.1),g=G(0);bp.frequency.setValueAtTime(300,t);bp.frequency.exponentialRampToValueAtTime(3800,t+0.7);env(g,t,0.05,0.5,0.95);chain(n,bp,g,out);
 var o=osc('sawtooth',180,t,0.9),og=G(0),lp=F('lowpass',2400);o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(900,t+0.6);env(og,t,0.02,0.09,0.8);chain(o,lp,og,out);
}
/* checkpoint chime */
function chime(){if(!ok())return;var t=now();[76,83,88].forEach(function(m,i){var f=440*Math.pow(2,(m-69)/12),tt=t+i*0.09,o=osc('square',f,tt,0.4),g=G(0);env(g,tt,0.004,0.09,0.32);chain(o,F('lowpass',4200),g,out)})}
/* nitro pickup */
function pickup(){if(!ok())return;var t=now();[72,79,84,91].forEach(function(m,i){var f=440*Math.pow(2,(m-69)/12),tt=t+i*0.045,o=osc('square',f,tt,0.12),g=G(0);env(g,tt,0.002,0.08,0.09);chain(o,g,out)})}
/* oil slick: wobbly slide */
function squelch(){if(!ok())return;var t=now();
 var o=osc('sine',300,t,0.7),g=G(0),vib=osc('sine',9,t,0.7),vg=G(60);o.frequency.setValueAtTime(320,t);o.frequency.exponentialRampToValueAtTime(110,t+0.6);vib.connect(vg);vg.connect(o.frequency);env(g,t,0.01,0.3,0.6);chain(o,g,out);
 var n=noise(t,0.6),ng=G(0);env(ng,t,0.01,0.2,0.5);chain(n,F('lowpass',700),ng,out);
}
/* biker about to swerve: two quick beeps */
function warn(){if(!ok())return;var t=now();[0,0.12].forEach(function(d){var o=osc('square',990,t+d,0.07),g=G(0);env(g,t+d,0.002,0.05,0.05);chain(o,g,out)})}
/* van hatch drops something */
function clunk(){if(!ok())return;var t=now(),o=osc('square',90,t,0.2),g=G(0);o.frequency.exponentialRampToValueAtTime(50,t+0.15);env(g,t,0.002,0.25,0.15);chain(o,F('lowpass',600),g,out)}
/* off-screen alley crash: a metal bin tips over, bounces, and its lid rattles to a stop (muffled = far away) */
var nClang=0;
function clang(){nClang++;if(!ok())return;var t=now(),lp=F('lowpass',2400),bus=G(0.9);chain(lp,bus,out);
 [[0,1],[0.16,0.7],[0.27,0.5]].forEach(function(h){var tt=t+h[0],v=h[1];
  [[180,0.45],[431,0.32],[977,0.2],[1622,0.12],[2410,0.07]].forEach(function(p){var o=osc('square',p[0]*(0.96+Math.random()*0.08),tt,0.7),g=G(0);env(g,tt,0.002,p[1]*v*0.35,0.18+0.3*Math.random());chain(o,g,lp)});
  var n=noise(tt,0.25),ng=G(0);env(ng,tt,0.001,0.6*v,0.16);chain(n,F('bandpass',1500,0.9),ng,lp)});
 for(var i=0;i<7;i++){var tt=t+0.42+i*0.07*(1-i*0.08),o=osc('triangle',700+Math.random()*300,tt,0.06),g=G(0);env(g,tt,0.001,0.1*(1-i/8),0.04);chain(o,g,lp)}
 var k=osc('sine',90,t,0.3),kg=G(0);k.frequency.exponentialRampToValueAtTime(45,t+0.25);env(kg,t,0.002,0.4,0.25);chain(k,kg,lp);
}

/* ---------- Level 3 fight (v0.3.0) ---------- */
/* punch hit: short punchy body thump + snap */
function punch(v){if(!ok())return;v=v||1;var t=now();
 var o=osc('sine',160,t,0.25),g=G(0);o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(55,t+0.14);env(g,t,0.002,0.75*v,0.16);chain(o,g,out);
 var n=noise(t,0.09),ng=G(0);env(ng,t,0.001,0.55*v,0.06);chain(n,F('bandpass',1400+v*600,0.9),ng,out);
 var s=noise(t,0.03),sg=G(0);env(sg,t,0.001,0.3*v,0.02);chain(s,F('highpass',3500),sg,out)}
function thud(){if(!ok())return;var t=now(),o=osc('sine',90,t,0.3),g=G(0);o.frequency.exponentialRampToValueAtTime(38,t+0.22);env(g,t,0.003,0.7,0.24);chain(o,g,out);
 var n=noise(t,0.2),ng=G(0);env(ng,t,0.002,0.35,0.16);chain(n,F('lowpass',600),ng,out)}
/* spinning back-fist / cane twirl: double whoosh */
function spin(){if(!ok())return;var t=now();[0,0.16].forEach(function(d){var n=noise(t+d,0.2),bp=F('bandpass',900,1.5),g=G(0);bp.frequency.setValueAtTime(600,t+d);bp.frequency.exponentialRampToValueAtTime(2800,t+d+0.15);env(g,t+d,0.02,0.32,0.16);chain(n,bp,g,out)})}
function block(){if(!ok())return;var t=now(),o=osc('square',520,t,0.08),g=G(0);env(g,t,0.001,0.12,0.06);chain(o,F('bandpass',900,2),g,out);var n=noise(t,0.05),ng=G(0);env(ng,t,0.001,0.25,0.04);chain(n,F('highpass',1800),ng,out)}
/* KO: big hit + falling cartoon tone */
function ko(){if(!ok())return;punch(1.4);var t=now()+0.05,o=osc('square',660,t,0.6),g=G(0);o.frequency.exponentialRampToValueAtTime(110,t+0.5);env(g,t,0.005,0.08,0.5);chain(o,F('lowpass',2400),g,out)}
/* El Jefe's whistle: two rising sine chirps */
function whistle(){if(!ok())return;var t=now();[[0,1900,2600],[0.28,2000,3000]].forEach(function(w){var o=osc('sine',w[1],t+w[0],0.24),g=G(0);o.frequency.setValueAtTime(w[1],t+w[0]);o.frequency.exponentialRampToValueAtTime(w[2],t+w[0]+0.18);env(g,t+w[0],0.02,0.16,0.2);chain(o,g,out)})}
/* v0.3.1 kicks + RICHIE RAGE */
function kwhoosh(){if(!ok())return;var t=now(),n=noise(t,0.24),bp=F('bandpass',700,1.1),g=G(0);bp.frequency.setValueAtTime(420,t);bp.frequency.exponentialRampToValueAtTime(1600,t+0.16);env(g,t,0.015,0.38,0.18);chain(n,bp,g,out)}
function rage(){if(!ok())return;var t=now();
 /* rising scream sweep + sub drop + distorted power chord */
 var n=noise(t,0.5),bp=F('bandpass',300,2),g=G(0);bp.frequency.setValueAtTime(300,t);bp.frequency.exponentialRampToValueAtTime(5000,t+0.35);env(g,t,0.05,0.5,0.4);chain(n,bp,g,out);
 var o=osc('sine',120,t,0.9),og=G(0);o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(30,t+0.8);env(og,t,0.005,1.0,0.8);chain(o,og,out);
 var ws=ctx.createWaveShaper();ws.curve=dcurve(9);var lp=F('lowpass',3800),cg=G(0);env(cg,t,0.004,0.22,0.9);chain(ws,lp,cg,out);
 [40,47,52].forEach(function(m){[-12,12].forEach(function(d){var q=osc('sawtooth',440*Math.pow(2,(m-69)/12),t,1.0);q.detune.value=d;q.connect(ws)})})}
function rageHit(v){if(!ok())return;v=v||1;punch(1.3*v);var t=now(),o=osc('sine',70,t,0.5),g=G(0);o.frequency.exponentialRampToValueAtTime(28,t+0.4);env(g,t,0.002,0.9*Math.min(1.2,v),0.42);chain(o,g,out);
 var n=noise(t,0.6),ng=G(0);env(ng,t,0.002,0.35*v,0.55);chain(n,F('highpass',2500),ng,out)}
function dcurve(k){var n=1024,c=new Float32Array(n),d=Math.tanh(k);for(var i=0;i<n;i++){var x=i/(n-1)*2-1;c[i]=Math.tanh(k*x)/d}return c}
/* fight loop v0.3.1 "STREET RAGE": original composition, metal-edged synthwave. E minor, Em - C - D - B, 160 BPM.
   Double-time drums (kick on every 8th, snare on 2 & 4, snare rolls), distorted palm-muted 16th bass chug + power-chord gallop,
   16th square arpeggios, heavy distorted lead on the B phrase. BOSS variation: up a whole step to F# minor, 172 BPM, 16th double-kick,
   32nd hat rolls, crash every 2 bars, lead + octave-down double + harmony layer all the time. Mode changes land on the next bar.
   Scheduled ahead on this context's clock, so it freezes with setPaused(true). fight(on), fightOn(), fightMode('street'|'boss'). */
var FT={on:false,step:0,next:0,timer:null,bus:null,drv:null,mode:'street',want:'street',bpm:160};
var PROG=[[40,[64,67,71]],[36,[64,67,72]],[38,[62,66,69]],[35,[63,66,71]]];
var LEAD=[76,79,83,79,81,79,78,76, 79,0,76,79,84,83,79,76, 78,0,74,78,81,79,78,74, 75,78,83,78,87,86,83,0];
var HARM=[71,76,79,76,78,76,74,71, 76,0,72,76,79,79,76,72, 74,0,69,74,78,76,74,69, 71,75,78,75,83,81,78,0];
var GALLOP=[1,0,0,1,0,0,1,0,0,0,1,0,1,0,1,1];
function six(){return 60/FT.bpm/4}
function mf(m){return 440*Math.pow(2,(m-69)/12)}
function fkick(t,b,v){var k=osc('sine',160,t,0.28),kg=G(0);k.frequency.setValueAtTime(170,t);k.frequency.exponentialRampToValueAtTime(40,t+0.1);env(kg,t,0.001,0.95*v,0.18);chain(k,kg,b);
 var c=noise(t,0.02),cg=G(0);env(cg,t,0.001,0.35*v,0.012);chain(c,F('highpass',3000),cg,b)}
function fsnare(t,b,v){var n=noise(t,0.22),ng=G(0);env(ng,t,0.001,0.55*v,0.15);chain(n,F('bandpass',2100,0.6),ng,b);var so=osc('triangle',210,t,0.12),sg=G(0);so.frequency.exponentialRampToValueAtTime(150,t+0.08);env(sg,t,0.001,0.4*v,0.09);chain(so,sg,b)}
function fhat(t,b,v){var h=noise(t,0.04),hg=G(0);env(hg,t,0.001,v,0.025);chain(h,F('highpass',8000),hg,b)}
function fstep(t,i){
 if(i%16===0&&FT.want!==FT.mode){FT.mode=FT.want;FT.bpm=FT.mode==='boss'?172:160}
 var boss=FT.mode==='boss',tr=boss?2:0,bar=Math.floor(i/16)%4,s=i%16,ch=PROG[bar],b=FT.bus,d=FT.drv,S=six(),phB=boss||Math.floor(i/64)%2===1;
 /* drums */
 var dbl=boss&&bar>=2;
 if(s===4||s===12)fsnare(t,b,1);else if(dbl||s%2===0)fkick(t,b,s%4===0?1:0.75);
 if(bar===3&&s>=13)fsnare(t,b,0.55+0.15*(s-13));
 if(boss&&bar===1&&s===15)fsnare(t,b,0.5);
 fhat(t,b,s%2===0?0.09:0.05);if(boss&&s%2===1)fhat(t+S/2,b,0.04);
 if(i%(boss?32:64)===0){var cr=noise(t,1.2),crg=G(0);env(crg,t,0.002,0.28,1.1);chain(cr,F('highpass',5000),crg,b)}
 /* distorted bass chug (palm-muted 16ths, accents ring longer) */
 var root=ch[0]+tr,acc=GALLOP[s],bo=osc('sawtooth',mf(root),t,S*(acc?1.6:0.6)),bo2=osc('square',mf(root-12),t,S*(acc?1.6:0.6)),bg=G(0);bo.detune.value=-8;
 env(bg,t,0.002,acc?0.34:0.2,acc?S*1.4:S*0.45);bo.connect(bg);bo2.connect(bg);chain(bg,F('lowpass',acc?1500:700,2),d);
 /* power chord gallop on accents (root, fifth, octave) */
 if(acc){[0,7,12].forEach(function(iv,j){var o=osc('sawtooth',mf(root+12+iv),t,S*1.5),g=G(0);o.detune.value=j*5-5;env(g,t,0.002,0.09,S*1.3);chain(o,g,d)})}
 /* 16th arpeggio (clean, cuts through) */
 var arp=ch[1],an=arp[[0,1,2,1][s%4]]+tr+12+(s>=8?12:0),ao=osc('square',mf(an),t,S*0.9),ag=G(0);env(ag,t,0.002,boss?0.05:0.04,S*0.75);chain(ao,F('lowpass',boss?4200:3200),ag,b);
 /* heavy lead (8th notes, ties when 0) */
 if(phB&&s%2===0){var li=((i%64)/2)|0,lm=LEAD[li];if(lm){var dur=S*(LEAD[li+1]===0?3.6:1.8);
   [[0,'sawtooth',0.075,0],[7,'square',0.03,0]].forEach(function(L){var o=osc(L[1],mf(lm+tr+L[3])*(L[0]?1.004:1),t,dur),g=G(0);env(g,t,0.004,L[2],dur*0.9);chain(o,g,d)});
   if(boss){var o2=osc('sawtooth',mf(lm+tr-12),t,dur),g2=G(0);env(g2,t,0.004,0.05,dur*0.9);chain(o2,g2,d);
    var hm=HARM[li];if(hm){var o3=osc('square',mf(hm+tr),t,dur),g3=G(0);env(g3,t,0.004,0.03,dur*0.9);chain(o3,F('lowpass',3600),g3,b)}}}}
}
function fsched(){if(!FT.on||!ctx)return;if(!paused){var ahead=ctx.currentTime+0.25;if(FT.next<ctx.currentTime)FT.next=ctx.currentTime+0.05;while(FT.next<ahead){fstep(FT.next,FT.step);FT.step++;FT.next+=six()}}FT.timer=setTimeout(fsched,80)}
function fight(on){on=!!on;if(on===FT.on)return;FT.on=on;
 if(on){if(!ctx){FT.on=false;return}if(!FT.bus){FT.bus=G(0.6);FT.bus.connect(out);var ws=ctx.createWaveShaper();ws.curve=dcurve(6);ws.oversample='2x';var cab=F('lowpass',4200),dg=G(0.5);chain(ws,cab,dg,FT.bus);FT.drv=ws}
  FT.bus.gain.setTargetAtTime(0.6,ctx.currentTime,0.05);FT.step=0;FT.mode=FT.want;FT.bpm=FT.mode==='boss'?172:160;FT.next=ctx.currentTime+0.08;fsched()}
 else{clearTimeout(FT.timer);if(FT.bus&&ctx)FT.bus.gain.setTargetAtTime(0,ctx.currentTime,0.05)}}
function fightMode(m){if(m==='boss'||m==='street')FT.want=m;return FT.mode}
function setPaused(p){paused=!!p;if(!ctx)return;if(paused)ctx.suspend();else ctx.resume()}
window.RosadoSFX={unlock:unlock,clank:clank,strain:strain,thump:thump,whiff:whiff,sting:sting,blip:blip,tick:tick,combo:combo,rack:rack,fanfare:fanfare,setPaused:setPaused,
 engine:engine,crash:crash,bump:bump,puff:puff,boost:boost,chime:chime,pickup:pickup,squelch:squelch,warn:warn,clunk:clunk,clang:clang,clangs:function(){return nClang},
 punch:punch,thud:thud,spin:spin,block:block,ko:ko,whistle:whistle,kwhoosh:kwhoosh,rage:rage,rageHit:rageHit,fightMode:fightMode,fightBpm:function(){return FT.bpm},fight:fight,fightOn:function(){return FT.on&&!paused&&!!ctx&&ctx.state==='running'}};
})();
