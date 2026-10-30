/* Rosado Nights · v0.4.0 · js/plane.js
   Level 4 ending: Richie takes off in the little twin-prop plane from the airfield runway and flies over Miami
   toward the hilltop mansion. ~10 s, no input needed; emits 'done' when the NEXT card should show.
   Art (optional): assets/l4-fly-bg.webp (960x540 city + runway), assets/l4-plane.webp (440x156, faces right).
   API (window.RosadoPlane): start(), update(dt), render(g,W,t), on(evt,fn), snap(), loadSprites(map,cb), spriteMode(), SLOTS, dev.skip(). No network. */
(function(){
"use strict";
var H=225,SLOTS=['l4-fly-bg','l4-plane'],SPR={},P=null,EV={};
var SFX=window.RosadoSFX||{};function sfx(n,a,b){if(SFX[n])SFX[n](a,b)}
function emit(n,a){(EV[n]||[]).forEach(function(f){try{f(a)}catch(e){}})}
function on(n,f){(EV[n]=EV[n]||[]).push(f)}
function clamp(v,a,b){return v<a?a:v>b?b:v}function lerp(a,b,t){return a+(b-a)*t}function ease(t){t=clamp(t,0,1);return t*t*(3-2*t)}
function loadSprites(map,cb){return Promise.all(Object.keys(map||{}).filter(function(k){return SLOTS.indexOf(k)>=0}).map(function(k){return new Promise(function(res){var im=new Image();
 im.onload=function(){SPR[k]=im;if(cb)cb(k);res(true)};im.onerror=function(){delete SPR[k];res(false)};im.src=map[k]})}))}
function spriteMode(){return !!(SPR['l4-fly-bg']&&SPR['l4-plane'])}
var T_ROLL=1.1,T_LIFT=3.3,T_CLIMB=5.2,T_DONE=9.6;
function start(){P={t:0,done:false,phase:'spool',x:0,y:0,s:1,rot:0,cam:0,stars:[]};for(var i=0;i<40;i++)P.stars.push({x:Math.random(),y:Math.random()*0.45,b:Math.random()});sfx('clunk')}
function update(dt){if(!P)return;P.t+=dt;var t=P.t;
 P.phase=t<T_ROLL?'spool':t<T_LIFT?'roll':t<T_CLIMB?'lift':P.done?'cruise':'climb';
 if(t>=T_DONE&&!P.done){P.done=true;P.phase='cruise';emit('done')}}
/* plane position in 0..1 screen units */
function path(t){var x,y,s,r;
 if(t<T_ROLL){x=0.16;y=0;s=1;r=0}
 else if(t<T_LIFT){var k=(t-T_ROLL)/(T_LIFT-T_ROLL);x=0.16+0.30*k*k;y=0;s=1;r=0}
 else if(t<T_CLIMB){var k2=(t-T_LIFT)/(T_CLIMB-T_LIFT);x=0.46+0.10*k2;y=0.28*k2*k2;s=1-0.15*k2;r=-0.16*Math.sin(Math.PI*Math.min(1,k2*1.4))}
 else{var k3=clamp((t-T_CLIMB)/6,0,1),e=ease(k3);x=0.56+0.08*e;y=0.28+0.22*e;s=0.85-0.35*e;r=-0.04+Math.sin(t*1.7)*0.02}
 return {x:x,y:y,s:s,r:r}}
function render(g,W,t){if(!P)return;var bg=SPR['l4-fly-bg'],pl=SPR['l4-plane'],k=P.t;
 /* camera: start on the left of the picture, pan toward the hilltop mansion on the right */
 var pan=ease(k/9);
 if(bg){var sc=Math.max(W/bg.width,H/bg.height),bw=bg.width*sc,bh=bg.height*sc,ox=-(bw-W)*lerp(0.15,1,pan),oy=H-bh;g.imageSmoothingEnabled=true;g.drawImage(bg,ox,oy,bw,bh);g.imageSmoothingEnabled=false}
 else{var gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0a0420');gr.addColorStop(0.7,'#3a1450');gr.addColorStop(1,'#120818');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.fillStyle='#fff';P.stars.forEach(function(s){g.globalAlpha=0.4+0.6*s.b;g.fillRect(s.x*W,s.y*H,1,1)});g.globalAlpha=1;
  g.fillStyle='#ff6fb5';g.beginPath();g.arc(W*0.8,H*0.2,18,0,Math.PI*2);g.fill();
  for(var i=0;i<14;i++){var bx=i*W/14,bh2=30+((i*37)%50);g.fillStyle=i%3?'#24123a':'#2c1848';g.fillRect(bx,H*0.86-bh2,W/14-2,bh2)}
  g.fillStyle='#3a2a2a';g.beginPath();g.moveTo(W*0.62,H*0.86);g.lineTo(W*0.82,H*0.62);g.lineTo(W,H*0.66);g.lineTo(W,H*0.86);g.fill();g.fillStyle='#ffcf8a';g.fillRect(W*0.8,H*0.6,30,10);
  g.fillStyle='#141018';g.fillRect(0,H*0.88,W,H*0.12);g.fillStyle='#ffd23a';for(var j=0;j<8;j++)g.fillRect(j*W/8+((-k*60)%(W/8)),H*0.94,W/16,1.5)}
 /* runway lights rushing past during the roll */
 if(k<T_CLIMB){g.globalCompositeOperation='lighter';for(var m=0;m<10;m++){var lx=((m*W/9)-(k>T_ROLL?(k-T_ROLL)*(k-T_ROLL)*60:0))%W;if(lx<0)lx+=W;g.fillStyle='rgba(255,210,120,0.7)';g.fillRect(lx,H*0.985,2,2)}g.globalCompositeOperation='source-over'}
 var q=path(k),pw=Math.min(170,W*0.42)*q.s,px=W*q.x,ground=H*0.975,py=ground-q.y*H;
 /* shadow on the runway */
 if(q.y<0.2){g.fillStyle='rgba(0,0,0,'+(0.35*(1-q.y/0.2))+')';g.beginPath();g.ellipse(px,ground-1,pw*0.4*(1-q.y),3,0,0,Math.PI*2);g.fill()}
 var wob=P.phase==='spool'||P.phase==='roll'?Math.sin(k*40)*0.4:0,ph;
 g.save();g.translate(px,py-pw*0.18+wob);g.rotate(q.r);
 if(pl){ph=pw*pl.height/pl.width;g.drawImage(pl,-pw/2,-ph/2,pw,ph)}
 else{ph=pw*0.36;g.fillStyle='#e8e8ee';g.beginPath();g.ellipse(0,0,pw*0.45,ph*0.22,0,0,Math.PI*2);g.fill();g.fillStyle='#d6d6de';g.fillRect(-pw*0.3,-ph*0.42,pw*0.5,ph*0.12);g.fillRect(-pw*0.48,-ph*0.5,pw*0.08,ph*0.4);
  g.fillStyle='#2a4aa0';g.fillRect(-pw*0.4,ph*0.02,pw*0.8,2);g.fillStyle='#28a8ff';g.fillRect(pw*0.12,-ph*0.16,pw*0.16,ph*0.14);g.fillStyle='#8a5a3a';g.fillRect(pw*0.14,-ph*0.14,pw*0.06,ph*0.1)}
 /* spinning props (blur discs over both engines) */
 g.globalCompositeOperation='lighter';var spin=k<T_ROLL?0.25+0.6*(k/T_ROLL):0.85;
 [[-0.11,-0.33],[0.25,-0.22]].forEach(function(e){g.globalAlpha=0.18*spin+0.06*Math.sin(k*90);g.fillStyle='#dfe8ff';g.beginPath();g.ellipse(pw*e[0],ph*e[1],pw*0.025,ph*0.22,0.2,0,Math.PI*2);g.fill()});
 /* nav lights */
 g.globalAlpha=Math.floor(k*2)%2?1:0.35;g.fillStyle='#ff3040';g.fillRect(-pw*0.47,-ph*0.48,2,2);g.fillStyle='#30ff80';g.fillRect(pw*0.4,-ph*0.12,2,2);g.globalAlpha=1;g.globalCompositeOperation='source-over';
 g.restore();
 /* engine exhaust glow + speed lines on the roll */
 if(P.phase==='roll'||P.phase==='lift'){g.strokeStyle='rgba(255,255,255,0.35)';g.lineWidth=1;for(var n=0;n<5;n++){var yy=py-pw*0.25+n*5,len=12+n*4;g.beginPath();g.moveTo(px-pw*0.55-n*6,yy);g.lineTo(px-pw*0.55-n*6-len,yy);g.stroke()}}
 /* fade in from the fight */
 if(k<0.5){g.fillStyle='rgba(0,0,0,'+(1-k/0.5)+')';g.fillRect(0,0,W,H)}}
function snap(){if(!P)return null;var q=path(P.t);return {t:P.t,phase:P.phase,done:P.done,x:q.x,y:q.y,s:q.s,airborne:q.y>0.01,sprites:spriteMode()}}
window.RosadoPlane={SLOTS:SLOTS,start:start,update:update,render:render,on:on,snap:snap,loadSprites:loadSprites,spriteMode:spriteMode,T_DONE:T_DONE,
 dev:{skip:function(){if(P)P.t=Math.max(P.t,T_DONE-0.05)}}};
})();
