/* =========================================================
   CELEBRATE: the winner leaps over everyone and dunks
   ========================================================= */
const CEL={raf:0,t0:0,until:0,conf:[]};
function sprite2x(g,skin,x,y,now,still){ g.save(); g.translate(Math.round(x),Math.round(y)); g.scale(2,2); drawAnimal(g,skin,0,0,now,{still}); g.restore(); }
function playCelebration(winner,losers){
  const box=$("cel"), cv=$("celcv"), g=cv.getContext("2d");
  const H=150, W=Math.max(200,Math.round(H*innerWidth/Math.max(1,innerHeight)));
  cv.width=W; cv.height=H;
  box.hidden=false; $("celdunk").hidden=true; $("celwin").dataset.wavy=""; $("celwin").innerHTML="";
  cancelAnimationFrame(CEL.raf); CEL.t0=performance.now(); CEL.conf=[];
  const floor=Math.round(H*.8), hoopX=W-30, rimY=Math.round(H*.36);
  const startX=Math.round(W*.16), lineL=Math.round(W*.32), lineR=hoopX-46;
  const lx=losers.map((l,i)=>({...l,x:losers.length>1? lineL+(lineR-lineL)*i/(losers.length-1) : (lineL+lineR)/2}));
  const peak=floor-28-60;
  let dunked=false, named=false;
  const court=(now,shake)=>{
    // stands + crowd
    g.fillStyle="#0A1A3F"; g.fillRect(0,0,W,floor);
    for(let r=0;r<5;r++){ g.fillStyle=r%2?"#12285C":"#0F2350"; g.fillRect(0,14+r*10,W,10);
      for(let x=2+(r%2)*3;x<W;x+=6){ const hop=((now/180+x+r)|0)%7===0?-1:0; g.fillStyle=["#F26A1B","#FBFBF8","#1F5FD6","#A9C6FF","#FFD84D"][(x+r)%5]; g.fillRect(x,16+r*10+hop,3,3); } }
    g.fillStyle="#F26A1B"; g.fillRect(0,64,W,3); g.fillStyle="#0B0B0D"; g.fillRect(0,67,W,1);
    // floor planks
    g.fillStyle="#C98A4B"; g.fillRect(0,floor-24,W,H);
    g.fillStyle="#B57638"; for(let y=floor-24;y<H;y+=4) g.fillRect(0,y,W,1);
    g.fillStyle="#D99A5A"; for(let i=0;i<W;i+=17) g.fillRect(i,floor-24+((i/17|0)%6)*4,8,1);
    // court lines + paint
    g.fillStyle="#1F5FD6"; g.fillRect(hoopX-40,floor-22,40,22); g.fillStyle="#FBFBF8"; g.fillRect(hoopX-40,floor-22,1,22); g.fillRect(hoopX-40,floor-22,40,1);
    g.fillStyle="#FBFBF8"; for(let a=0;a<Math.PI;a+=.02){ g.fillRect(Math.round(hoopX-40-Math.sin(a)*14),Math.round(floor-11+Math.cos(a)*10),1,1); }
    g.fillRect(Math.round(W*.45),floor-24,1,24);
    // hoop
    g.fillStyle="#2A2F3D"; g.fillRect(hoopX+12,rimY-14,4,floor-rimY+14); g.fillStyle="#0B0B0D"; g.fillRect(hoopX+16,rimY-14,1,floor-rimY+14);
    g.fillStyle="#0B0B0D"; g.fillRect(hoopX+2,rimY-22,12,20); g.fillStyle="#FBFBF8"; g.fillRect(hoopX+3,rimY-21,10,18);
    g.fillStyle="#F26A1B"; g.fillRect(hoopX+5,rimY-12,6,6); g.fillStyle="#FBFBF8"; g.fillRect(hoopX+6,rimY-11,4,4);
    const ry=rimY+(shake?((now/40|0)%2?2:0):0);
    g.fillStyle="#F26A1B"; g.fillRect(hoopX-12,ry,14,2);
    g.fillStyle="#FBFBF8"; for(let i=0;i<6;i++){ const sw=shake?((now/60+i)|0)%2:0; g.fillRect(hoopX-11+i*2+sw,ry+2+i%2,1,7-i%3); }
    g.fillRect(hoopX-11,ry+8,12,1);
  };
  const ball=(x,y)=>{ g.fillStyle="#0B0B0D"; disc(g,x,y,4); g.fillStyle="#F26A1B"; disc(g,x,y,3); g.fillStyle="#0B0B0D"; g.fillRect(x-3,y,7,1); g.fillRect(x,y-3,1,7); };
  const frame=now=>{
    const t=(now-CEL.t0)/1000;
    let wx, wy, held=true, shake=false, still=false;
    if(t<1.3){ wx=-30+(startX+30)*(t/1.3); wy=floor-28; }
    else if(t<1.6){ wx=startX; wy=floor-26; still=true; }
    else if(t<3.1){ const u=(t-1.6)/1.5; wx=startX+(hoopX-14-startX)*u; wy=(floor-28)+(rimY-26-(floor-28))*u-4*(floor-28-peak)*u*(1-u); }
    else if(t<3.6){ wx=hoopX-14; wy=rimY-24+(t-3.1)*20; held=false; shake=true; if(!dunked){ dunked=true; sfx("dunk"); setTimeout(()=>sfx("win"),250); $("celdunk").hidden=false; enter($("celdunk")); for(let i=0;i<120;i++) CEL.conf.push({x:hoopX-6,y:rimY,vx:(Math.random()-.6)*3,vy:-Math.random()*3-1,c:["#F26A1B","#FF9A4D","#FBFBF8","#1F5FD6","#A9C6FF","#FFD84D"][i%6]}); } }
    else if(t<4.0){ wx=hoopX-14; wy=rimY-14+(t-3.6)*((floor-28)-(rimY-14))/.4; held=false; shake=true; }
    else { wx=hoopX-14-Math.min(30,(t-4)*40); wy=floor-28-Math.abs(Math.sin(t*6))*6; held=false; if(!named){ named=true; wavy($("celwin"),`${winner.name} wins!`); } }
    court(now,shake);
    lx.forEach(l=>{ const duck=t>1.6&&t<3.1&&Math.abs((wx+14)-(l.x+14))<16 ? 4 : 0; sprite2x(g,l.skin,l.x,floor-28+duck,now,true);
      g.fillStyle="rgba(0,0,0,.25)"; ell(g,l.x+14,floor+1,11,2); });
    g.fillStyle="rgba(0,0,0,.3)"; ell(g,wx+14,floor+1,11,2);
    if(t>3.6) ball(hoopX-5, Math.min(floor-4, rimY+8+(t-3.6)*120));
    sprite2x(g,winner.skin,wx,wy,now,still);
    if(held) ball(Math.round(wx+26),Math.round(wy+4));
    if(t>3.1){ CEL.conf.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=.06; g.fillStyle=p.c; g.fillRect(Math.round(p.x),Math.round(p.y),2,2); });
      if(t>4 && CEL.conf.length<400 && Math.random()<.5) for(let i=0;i<6;i++) CEL.conf.push({x:Math.random()*W,y:-4,vx:(Math.random()-.5),vy:Math.random(),c:["#F26A1B","#FBFBF8","#1F5FD6","#FFD84D"][i%4]}); }
    if(t<8.5) CEL.raf=requestAnimationFrame(frame); else closeCelebration();
  };
  if(reduced){ court(performance.now(),false); sprite2x(g,winner.skin,hoopX-14,rimY-14,0,true); wavy($("celwin"),`${winner.name} wins!`); setTimeout(closeCelebration,3500); return; }
  CEL.raf=requestAnimationFrame(frame);
}
function closeCelebration(){ cancelAnimationFrame(CEL.raf); $("cel").hidden=true; }
