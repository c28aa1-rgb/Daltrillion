/* =========================================================
   PIXEL JUNGLE SCENE
   ========================================================= */
const SC={cv:$("scene"),ctx:null,W:0,H:0,scale:3,camM:0,fromM:0,toM:0,t0:0,dur:0,moving:false,last:0,img:null,mode:"intro",bubble:null};
SC.ctx=SC.cv.getContext("2d");
const PXM=.55;  // world pixels per meter

const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const css=c=>`rgb(${c[0]},${c[1]},${c[2]})`;
const PAL=[ // Tall Grass, Bamboo Thicket, Mangrove, Deep Canopy, Ivan's Den
  {top:"#6FA8FF",bot:"#D6E6FF",far:"#4B86D4",mid:"#2C64AE",near:"#1B4C8E",ground:"#143A6E",lip:"#2E6BC0",water:"#2B66B8",sun:1,stars:0},
  {top:"#4F86E0",bot:"#B7CFFF",far:"#3A72C0",mid:"#2A5FA6",near:"#18457F",ground:"#11335F",lip:"#2A5FA6",water:"#285FAE",sun:.7,stars:0},
  {top:"#3A63B8",bot:"#F2A36B",far:"#2D5AA2",mid:"#214A8A",near:"#143769",ground:"#0E2A52",lip:"#2A5694",water:"#1E4C92",sun:.35,stars:0},
  {top:"#0F2558",bot:"#2C4F96",far:"#1C3C78",mid:"#142E62",near:"#0D224B",ground:"#0A1B3C",lip:"#1C3C78",water:"#163470",sun:0,stars:.5},
  {top:"#050B22",bot:"#14275A",far:"#102350",mid:"#0B1A40",near:"#081432",ground:"#060F28",lip:"#14275A",water:"#0E2050",sun:0,stars:1}
].map(p=>({...p,top:hex(p.top),bot:hex(p.bot),far:hex(p.far),mid:hex(p.mid),near:hex(p.near),ground:hex(p.ground),lip:hex(p.lip),water:hex(p.water)}));

function palAt(m){
  const zf=Math.max(0,Math.min(4.999,m/ZONE_M)); const i=Math.floor(zf); const fr=zf-i;
  const j=Math.min(4,i+1); let t=i<4?Math.max(0,(fr-.55)/.45):0; t=t*t*(3-2*t);
  const a=PAL[i],b=PAL[j]; const o={};
  for(const k of Object.keys(a)) o[k]=Array.isArray(a[k])?era(mix(a[k],b[k],t)):a[k]+(b[k]-a[k])*t;
  return o;
}

/* =========================================================
   TIMELINE TUESDAY LOOK: an old archive photo. The jungle fades to warm sepia,
   fireflies become drifting dust motes, the corners darken and a faint film grain
   flickers. Ivan keeps his colours, as if he's stepping through history.
   SC.eraT is where we're heading (0 or 1); SC.eraK eases toward it so it fades in and out.
   ========================================================= */
SC.eraK=0; SC.eraT=0;
function setEra(on){ SC.eraT=on?1:0; if(reduced) { SC.eraK=SC.eraT; drawScene(performance.now()); } }
/** A colour as it looks in the archive photo, by how far into the look we are. */
function era(c){
  const k=SC.eraK; if(k<=0) return c;
  const [r,g,b]=c, l=.3*r+.59*g+.11*b;
  const s=[Math.min(255,l*1.07+28), Math.min(255,l*.92+14), Math.min(255,l*.7)];   // sepia, warmed
  return c.map((v,i)=>Math.round(v+(s[i]-v)*k*.7));
}
const hash=(i,s)=>{ let x=Math.sin(i*127.1+s*311.7)*43758.5453; return x-Math.floor(x); };

function sceneResize(){
  const iw=Math.max(1,innerWidth||document.documentElement.clientWidth||800), ih=Math.max(1,innerHeight||document.documentElement.clientHeight||600);
  let s=Math.max(2,Math.round(ih/200));
  if(iw/s<130) s=Math.max(2,Math.floor(iw/130));
  SC.scale=s; SC.W=Math.max(1,Math.ceil(iw/s)); SC.H=Math.max(1,Math.ceil(ih/s));
  SC.cv.width=SC.W; SC.cv.height=SC.H;
  SC.img=SC.ctx.createImageData(SC.W,SC.H);
}

function disc(ctx,cx,cy,r){ for(let dy=-r;dy<=r;dy++){ const w=Math.floor(Math.sqrt(r*r-dy*dy)); ctx.fillRect(Math.round(cx-w),Math.round(cy+dy),2*w+1,1); } }

/* original pixel tiger, facing right. o orange, k ink, w white, e eye */
const TIGER_BASE=[
"..................o..o..",
"k.................oooooo",
"ko................okoeoo",
".ko..oooooooooooooooooww",
"..ooooooooooooooooooowwk",
"...oooooooooooooooooowww.",
"....oooooooooooooooowww..",
"....owwwwwwwwwwwwwoo....",
];
const LEGS=[
["....oo.oo......oo.oo....","....ww.ww......ww.ww...."],
["...oo...oo....oo...oo...","...ww...ww....ww...ww..."],
[".....oo.oo....oo.oo.....",".....ww.ww....ww.ww....."]
];
function tigerRows(frame){ return [...TIGER_BASE,...LEGS[frame]]; }
const CUBS=[{o:"#F26A1B",k:"#0B0B0D",w:"#FBFBF8",e:"#0B0B0D",name:"Orange"},{o:"#2D6BFF",k:"#0B0B0D",w:"#FBFBF8",e:"#0B0B0D",name:"Blue"},
  {o:"#FBFBF8",k:"#0B0B0D",w:"#C9D6F0",e:"#0B0B0D",name:"White"},{o:"#2A2F3D",k:"#F26A1B",w:"#FBFBF8",e:"#FF9A4D",name:"Black"}];
function drawTiger(ctx,x,y,frame,bob,pal){
  const rows=tigerRows(frame);
  const C=pal||CUBS[0];
  for(let r=0;r<rows.length;r++){
    const row=rows[r];
    for(let c=0;c<row.length;c++){
      let ch=row[c]; if(ch===".") continue;
      if(ch==="o" && r>=3 && r<=6 && c>=5 && c<=17 && (c+r)%5===0) ch="k";
      ctx.fillStyle=C[ch];
      ctx.fillRect(x+c,y+r+(r<8?bob:0),1,1);
    }
  }
  // outline shadow under feet
  ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(x+3,y+rows.length,18,1);
}

function drawScene(now){
  const {ctx,W,H}=SC; if(!W) return;
  const m=SC.camM, P=palAt(m);
  const camW=m*PXM;
  const gy=Math.round(H*.78);
  const tigerX=Math.round(W*.28)-12;

  /* sky, dithered bands */
  const d=SC.img.data; const steps=9;
  for(let y=0;y<gy;y++){
    const f=y/gy*steps; const b=Math.floor(f); const fr=f-b;
    const c1=mix(P.top,P.bot,b/steps), c2=mix(P.top,P.bot,Math.min(1,(b+1)/steps));
    for(let x=0;x<W;x++){
      const useNext = fr>.66 ? ((x+y)&1)===0 : (fr>.33 ? ((x&1)===0 && (y&1)===0) : false);
      const c=useNext?c2:c1; const k=(y*W+x)*4; d[k]=c[0];d[k+1]=c[1];d[k+2]=c[2];d[k+3]=255;
    }
  }
  ctx.putImageData(SC.img,0,0);

  /* stars */
  if(P.stars>0){
    for(let i=0;i<70;i++){ if(hash(i,9)>P.stars) continue;
      const sx=Math.floor(hash(i,1)*W), sy=Math.floor(hash(i,2)*gy*.6);
      const tw=((now/600+i)|0)%7===0; ctx.fillStyle=tw?"#A9C6FF":"#FBFBF8"; ctx.fillRect(sx,sy,1,1); }
  }
  /* sun sinks, moon rises */
  if(P.sun>.02){
    ctx.fillStyle=css(mix([255,154,77],[242,106,27],1-P.sun));
    disc(ctx,W*.78,gy*.18+(1-P.sun)*gy*.55,9);
  }
  if(P.stars>.2){ ctx.fillStyle="#FBFBF8"; disc(ctx,W*.8,gy*.2,6); ctx.fillStyle=css(P.top); disc(ctx,W*.8+3,gy*.2-2,5); }

  /* far canopy (parallax .25) */
  ctx.fillStyle=css(P.far);
  const fx=camW*.25, fw=22;
  for(let i=Math.floor(fx/fw)-2;i<Math.ceil((fx+W)/fw)+2;i++){
    const x=i*fw-fx, h=Math.round(gy*.32+hash(i,3)*gy*.22), r=8+Math.floor(hash(i,4)*7);
    disc(ctx,x,gy-h,r); disc(ctx,x+r*.8,gy-h+4,r-2); ctx.fillRect(Math.round(x-r),gy-h,Math.round(r*2.6),h);
  }
  /* mid trees (parallax .55) */
  ctx.fillStyle=css(P.mid);
  const mx=camW*.55, mw=34;
  for(let i=Math.floor(mx/mw)-2;i<Math.ceil((mx+W)/mw)+2;i++){
    if(hash(i,5)<.25) continue;
    const x=Math.round(i*mw-mx+hash(i,6)*12), h=Math.round(gy*.5+hash(i,7)*gy*.25);
    const tw=2+Math.floor(hash(i,8)*2);
    ctx.fillRect(x,gy-h,tw,h);
    const r=7+Math.floor(hash(i,10)*6);
    disc(ctx,x+1,gy-h,r); disc(ctx,x-r*.6,gy-h+5,r-3); disc(ctx,x+r*.7,gy-h+4,r-2);
  }

  /* near layer: zone props at world scale (parallax 1) */
  const nw=9;
  for(let i=Math.floor(camW/nw)-3;i<Math.ceil((camW+W)/nw)+3;i++){
    const wx=i*nw; const x=Math.round(wx-camW);
    const meters=(wx-tigerX)/PXM; const z=Math.max(0,Math.min(4,Math.floor(meters/ZONE_M)));
    const r1=hash(i,11), r2=hash(i,12), r3=hash(i,13);
    ctx.fillStyle=css(P.near);
    if(z===0){ // tall grass + lone trees
      const h=4+Math.floor(r1*9); ctx.fillRect(x,gy-h,1,h); ctx.fillRect(x+2,gy-h+3,1,h-3); ctx.fillRect(x+4,gy-h+1,1,h-1);
      if(r2<.08){ const th=Math.round(gy*.55); ctx.fillRect(x,gy-th,3,th); disc(ctx,x+1,gy-th,10); disc(ctx,x-7,gy-th+6,7); disc(ctx,x+9,gy-th+5,7); }
      if(r3<.12){ ctx.fillStyle="#F26A1B"; ctx.fillRect(x+2,gy-h-1,1,1); }
    }else if(z===1){ // bamboo
      if(r1<.55){ const h=Math.round(gy*(.45+r2*.5)); ctx.fillRect(x,gy-h,2,h);
        ctx.fillStyle=css(P.lip); for(let y=gy-h+6;y<gy;y+=8) ctx.fillRect(x,y,2,1);
        ctx.fillStyle=css(P.near); for(let y=gy-h+3;y<gy-6;y+=12){ ctx.fillRect(x+2,y,4,1); ctx.fillRect(x-3,y+5,3,1);} }
      else { const h=3+Math.floor(r3*5); ctx.fillRect(x+3,gy-h,1,h); }
    }else if(z===2){ // mangrove: water + arched roots
      ctx.fillStyle=css(P.water); ctx.fillRect(x,gy-1,nw,4);
      ctx.fillStyle=css(P.lip); if(((now/400|0)+i)%5===0) ctx.fillRect(x+2,gy,3,1);
      ctx.fillStyle=css(P.near);
      if(r1<.3){ const h=Math.round(gy*(.35+r2*.3)); ctx.fillRect(x+3,gy-h,3,h-6);
        for(let k=-1;k<=1;k++){ ctx.fillRect(x+4+k*4,gy-6+Math.abs(k),1,6-Math.abs(k)); ctx.fillRect(x+4+k*2,gy-7,1,1); }
        disc(ctx,x+4,gy-h,9); disc(ctx,x-4,gy-h+5,6); }
    }else if(z===3){ // deep canopy: big trunks + hanging vines
      if(r1<.22){ const tw=5+Math.floor(r2*4); ctx.fillRect(x,0,tw,gy); ctx.fillStyle=css(P.lip); ctx.fillRect(x+1,0,1,gy); ctx.fillStyle=css(P.near); }
      if(r3<.5){ const vl=Math.round(gy*(.15+r2*.45)); for(let y=0;y<vl;y++) ctx.fillRect(x+4+((y/6|0)%2),y,1,1); disc(ctx,x+4,vl,1); }
      const h=2+Math.floor(r2*5); ctx.fillRect(x+1,gy-h,2,h);
    }else{ // den: rocks, cave mouth near the end
      if(r1<.35){ const rr=2+Math.floor(r2*4); disc(ctx,x+4,gy-rr+1,rr); }
      if(meters>MAX_M-260 && meters<MAX_M-200 && r3<2){ ctx.fillStyle="#04081A"; disc(ctx,x+20,gy-2,22); ctx.fillStyle=css(P.near); }
      if(r3<.06){ ctx.fillStyle=((now/700+i)|0)%4? "#F26A1B":"#FF9A4D"; ctx.fillRect(x+3,gy-14,1,1); ctx.fillRect(x+6,gy-14,1,1); }
    }
  }

  /* ground */
  ctx.fillStyle=css(P.ground); ctx.fillRect(0,gy,W,H-gy);
  ctx.fillStyle=css(P.lip);
  for(let x=0;x<W;x++){ if(((x+Math.floor(camW))&3)===0) ctx.fillRect(x,gy,1,1); }
  for(let x=0;x<W;x+=1){ const wx=x+Math.floor(camW); if(hash(wx,14)<.05) ctx.fillRect(x,gy+2+Math.floor(hash(wx,15)*(H-gy-4)),1,1); }

  /* zone posts with orange flags */
  for(let zi=1;zi<5;zi++){
    const px=Math.round(zi*ZONE_M*PXM-camW+tigerX+24);
    if(px<-10||px>W+10) continue;
    ctx.fillStyle="#0B0B0D"; ctx.fillRect(px,gy-22,2,22);
    ctx.fillStyle="#F26A1B"; ctx.fillRect(px+2,gy-22,7,4); ctx.fillRect(px+2,gy-18,5,1);
  }

  /* Ivan, or the party's cubs */
  if(SC.racers && SC.racers.length){
    const html=[];
    SC.racers.forEach((r,i)=>{
      const tx=r.target; r.cur += (tx-r.cur)*Math.min(1,.06*(reduced?100:1)); if(Math.abs(tx-r.cur)<.002) r.cur=tx;
      const run=Math.abs(tx-r.cur)>.003;
      const x=Math.round(W*.06 + r.cur*W*.72), y=gy-10+(i%4)*4+Math.floor(i/4);
      const fr=run?1+((now/110+i)|0)%2:0, bb=run?((now/110|0)%2):((now/700+i)|0)%2;
      drawTiger(ctx,x,y,r.out?0:fr,r.out?0:bb,r.out?CUB_OUT:CUBS[r.color%4]);
      if(r.bell) drawBell(ctx,x+25,y-2,now,SC.ringAt&&now-SC.ringAt<1600);
      html.push(`<span class="${r.me?"me":""}" style="left:${(x+12)*SC.scale}px;top:${(y+12)*SC.scale}px">${esc(r.name)}${r.hearts!=null?` <span class="hearts">${"♥".repeat(Math.max(0,r.hearts))}<i>${"♥".repeat(Math.max(0,(r.max||0)-r.hearts))}</i></span>`:""}</span>`);
    });
    const h=html.join(""); if(h!==SC.lastLabels){ $("labels").innerHTML=h; SC.lastLabels=h; }
  } else drawIvan(ctx,now,tigerX,gy);

  /* fireflies (dust motes on Timeline Tuesday: paler, slower, drifting up) */
  const nf=6+Math.round(m/ZONE_M*4)+Math.round(SC.eraK*10);
  for(let i=0;i<nf;i++){
    const dusty=SC.eraK>.5;
    const fx2=(hash(i,20)*W + now/(dusty?260:90)*hash(i,21)) % W;
    const fy=dusty ? gy-((now/120*hash(i,23)+hash(i,22)*gy)%gy) : gy*.35+hash(i,22)*gy*.6+Math.sin(now/700+i)*4;
    ctx.fillStyle=dusty ? (((now/500+i)|0)%3===0?"#F6EBCB":"#D8C39A") : ((now/300+i)|0)%3===0?"#FF9A4D":"#F26A1B";
    ctx.fillRect(Math.round(fx2),Math.round(fy),1,1);
  }

  /* foreground fern tufts (parallax 1.5) */
  ctx.fillStyle=css(era(hex("#06102A")));
  const gx=camW*1.5, gw=14;
  for(let i=Math.floor(gx/gw)-1;i<Math.ceil((gx+W)/gw)+1;i++){
    const x=Math.round(i*gw-gx); const h=3+Math.floor(hash(i,30)*6);
    ctx.fillRect(x,H-h,1,h); ctx.fillRect(x+1,H-h+2,2,1); ctx.fillRect(x-2,H-h+3,2,1); ctx.fillRect(x+2,H-h+1,1,h-1);
  }

  /* Timeline Tuesday: darker corners and a faint flicker of film grain */
  if(SC.eraK>0){
    const k=SC.eraK, v=ctx.createRadialGradient(W/2,H*.45,Math.min(W,H)*.35,W/2,H*.45,Math.max(W,H)*.75);
    v.addColorStop(0,"rgba(40,24,8,0)"); v.addColorStop(1,`rgba(40,24,8,${.35*k})`);
    ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
    if(!reduced){ ctx.fillStyle=`rgba(255,244,214,${.14*k})`;
      for(let i=0;i<Math.round(W*H/900);i++) ctx.fillRect((Math.random()*W)|0,(Math.random()*H)|0,1,1);
      if(Math.random()<.04){ ctx.fillStyle=`rgba(255,244,214,${.1*k})`; ctx.fillRect((Math.random()*W)|0,0,1,H); } }   // the odd scratch
  }
}

const CUB_OUT={o:"#59607A",k:"#3B4156",w:"#8E96A8",e:"#0B0B0D"};
const BELL=["...k...","..kkk..",".koowk.",".kooook","kooooook".slice(0,7),"kkkkkkk","...k..."];
function drawBell(ctx,x,y,now,ringing){
  const sh=ringing?Math.round(Math.sin(now/30)*2):Math.round(Math.sin(now/180));
  const C={k:"#0B0B0D",o:ringing?"#FFFFFF":"#FF9A4D",w:"#FBFBF8"};
  BELL.forEach((row,r)=>{ for(let c=0;c<row.length;c++){ const ch=row[c]; if(ch==="."||!C[ch]) continue; ctx.fillStyle=C[ch]; ctx.fillRect(x+c+sh,y+r,1,1); } });
  if(ringing){ ctx.fillStyle=((now/90)|0)%2?"#FF9A4D":"#FBFBF8";
    [[-3,1],[-4,3],[9,1],[10,3],[-3,5],[9,5]].forEach(([dx,dy])=>ctx.fillRect(x+dx+sh,y+dy,2,1)); }
}
function setRacers(list){
  if(!list){ SC.racers=null; if(SC.lastLabels){ $("labels").innerHTML=""; SC.lastLabels=""; } return; }
  const old=new Map((SC.racers||[]).map(r=>[r.id,r]));
  SC.racers=list.map(r=>({...r, cur: old.has(r.id)?old.get(r.id).cur:0}));
}
function sceneLoop(now){
  if(SC.moving){
    const k=Math.max(0,Math.min(1,(now-SC.t0)/SC.dur));
    // The sprint sets off hard and eases in to land; the rest keep the gentle in-out.
    const e=SC.fx&&SC.fx.tier==="W" ? 1-Math.pow(1-k,3) : k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    SC.camM=SC.fromM+(SC.toM-SC.fromM)*e;
    if(k>=1){ SC.moving=false; SC.camM=SC.toM; }
  }
  if(SC.tg){ if(now-SC.last>32){ drawTailgate(now); SC.last=now; } }
  // Ease into (or out of) the Timeline Tuesday look over about a second.
  if(SC.eraK!==SC.eraT){ SC.eraK+= (SC.eraT>SC.eraK?1:-1)*Math.min(Math.abs(SC.eraT-SC.eraK),.035); }
  else if(now-SC.last>32 || SC.moving || SC.racers || SC.fx || SC.parts.length || SC.eraK>0){ drawScene(now); SC.last=now; }
  if(SC.eraK!==SC.eraT && now-SC.last>16){ drawScene(now); SC.last=now; }
  if(!reduced) requestAnimationFrame(sceneLoop);
}
/* Ivan moves to m meters. `tier` picks his move (see MOVES): the rarer the answer, the bigger it is. */
function prowlTo(m,tier){
  SC.fx=null; SC.cv.style.transform="";
  if(reduced){ SC.camM=m; drawScene(performance.now()); return; }
  const mv=tier && MOVES[tier] || null, now=performance.now();
  SC.fromM=SC.camM; SC.toM=m; SC.t0=now+(mv?mv.wind+(mv.hold||0):0);
  SC.dur=Math.min(2600,700+Math.abs(m-SC.camM)*2.2)*(mv&&mv.pace||1); SC.moving=m!==SC.camM;
  if(mv) SC.fx={tier, mv, start:now, took:new Set(), landed:new Set(), ended:false, shakes:[], hist:[], lastCam:SC.camM, glowUntil:0, flashAt:0};
}

/* =========================================================
   IVAN'S MOVES, one per tier. Each is a little story: wind-up (anticipation),
   the move itself, then a landing that settles (follow-through), told in three
   layers: Ivan (primary), dust / leaves / paper / sparks and afterimages
   (secondary), and the whole scene shaking or flashing (ambient).
   Durations are ms. wind = crouch before he moves; pace scales the run;
   gait = ms per leg frame (smaller = faster legs); leaps happen at a fraction
   of the run; land fires when the last leap (or the run) ends.
   ========================================================= */
const MOVES={
  X:{wind:0, sag:1200, droop:{n:4,color:"#8E96A8"}},
  C:{wind:0, gait:110, end:{dust:3}},
  // Paper Tiger is a fake-out: the White Tiger's charge-up, a held beat where it fizzles out (sparks
  // turn to ash, Ivan deflates), then a slow, sheepish trot to the same short distance.
  T:{wind:780, shiver:2, gather:true, hold:420, fizzle:true, pace:1.3, gait:150, end:{dust:1, hop:{h:2,dur:260}, paper:10}},
  P:{wind:110, gait:80, trail:"dust", end:{dust:6}},
  R:{wind:240, gait:68, trail:"dust", leaps:[{at:.38,dur:430,h:8}], land:{dust:10, shake:2, ms:180}},
  D:{wind:380, shiver:1, gait:56, trail:"dust", ghosts:"#F26A1B", leaps:[{at:.22,dur:680,h:17}], takeoff:{leaves:10}, land:{leaves:16, dust:10, shake:3, ms:280}},
  W:{wind:780, shiver:2, gather:true, pace:.85, gait:40, trail:"spark", ghosts:"#FBFBF8", lines:true, runShake:1.2,
     leaps:[{at:.15,dur:380,h:9},{at:.55,dur:560,h:20}], takeoff:{sparks:8}, land:{sparks:34, flash:true, shake:5, ms:480}, glow:1800},
};
SC.parts=[];
const DUST=["#C9A877","#9E8460","#E2CC9A"], LEAF=["#3FA65A","#2E7D44","#8BCB5A","#1F5E33"], SPARK=["#FBFBF8","#FFD84D","#FF9A4D","#A9C6FF"];
const pick=a=>a[(Math.random()*a.length)|0];
function puff(kind,n,x,y){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI, sp=kind==="spark"?0.06+Math.random()*0.12:0.02+Math.random()*0.05;
    if(kind==="dust") SC.parts.push({x:x+Math.random()*6-3,y,vx:-(0.01+Math.random()*0.04)*(Math.random()<.7?1:-1),vy:-0.01-Math.random()*0.025,g:0.00004,life:500+Math.random()*400,c:pick(DUST),w:1,h:1});
    else if(kind==="leaf") SC.parts.push({x:x+Math.random()*10-5,y:y-Math.random()*4,vx:Math.cos(a)*sp*1.4,vy:-Math.sin(a)*sp*1.8,g:0.00012,life:900+Math.random()*600,c:pick(LEAF),w:2,h:1,sway:Math.random()*6});
    else if(kind==="spark") SC.parts.push({x,y:y-6,vx:Math.cos(a*2)*sp,vy:-Math.abs(Math.sin(a*2))*sp-0.02,g:0.00008,life:600+Math.random()*700,c:pick(SPARK),w:1,h:1,twinkle:true});
    else if(kind==="paper") SC.parts.push({x:x+Math.random()*20-4,y:y-24-Math.random()*10,vx:0,vy:0.012+Math.random()*0.01,g:0,life:1400+Math.random()*500,c:Math.random()<.5?"#FBFBF8":"#EEEAE1",w:2,h:1,sway:Math.random()*6});
    else if(kind==="droop") SC.parts.push({x:x+8+Math.random()*8,y:y-14,vx:0,vy:0.008,g:0,life:900,c:"#8E96A8",w:1,h:1});
  }
}
function shake(px,ms,now){ if(SC.fx) SC.fx.shakes.push({px,ms,at:now}); }

/* Ivan, with whatever move he's in the middle of. */
function drawIvan(ctx,now,tigerX,gy){
  const fx=SC.fx, mv=fx&&fx.mv, baseY=gy-10;
  let frame=0,bob=0,dy=0,dx=0,squash=0;
  const windEnd=fx?fx.start+mv.wind:0;
  const winding=fx && now<windEnd, holding=fx && !winding && now<SC.t0, running=SC.moving && now>=SC.t0;
  if(running){ const g=mv&&mv.gait||110; frame=1+((now/g|0)%2); bob=((now/g|0)%2); }
  else if(winding){
    // Wind-up: crouch low, and for the big ones shiver with the effort.
    squash=1; const k=(now-fx.start)/Math.max(1,SC.t0-fx.start);
    if(mv.shiver) dx=((now/34|0)%2?1:-1)*(k>.35||mv.shiver>1?1:0);
    if(mv.shiver>1 && k>.6) dy=((now/50|0)%2);
    // Energy gathering in: sparks drift in toward Ivan, more of them as the wind-up builds.
    if(mv.gather) for(let n=0;n<1+Math.round(k*2);n++){ const a=Math.random()*Math.PI*2, r=14+Math.random()*10;
      SC.parts.push({x:tigerX+12+Math.cos(a)*r,y:baseY+4+Math.sin(a)*r*.55,vx:-Math.cos(a)*0.035,vy:-Math.sin(a)*0.019,g:0,life:420,c:pick(SPARK),w:Math.random()<.3?2:1,h:1,twinkle:Math.random()<.5}); }
  } else if(holding){
    // The beat after the wind-up. For the Paper Tiger it fizzles: the gathered sparks dim to ash and
    // drop, there's a little "pff", and Ivan sags for a moment before he trots off.
    if(mv.fizzle && !fx.fizzled){
      fx.fizzled=true;
      for(const p of SC.parts) if(p.twinkle){ p.twinkle=false; p.c=Math.random()<.5?"#8E96A8":"#5D6486"; p.vx*=.15; p.vy=.006; p.g=.00012; p.life=Math.min(p.life,700)+200; }
      puff("dust",3,tigerX+12,gy); puff("droop",3,tigerX,gy);
    }
    squash=now-windEnd<160?1:0;
  } else bob=((now/700|0)%2);

  if(fx){
    // Leaps: an arc, legs stretched, with a takeoff burst and a landing.
    const leaps=mv.leaps||[];
    leaps.forEach((L,i)=>{
      const t0=SC.t0+L.at*SC.dur, u=(now-t0)/L.dur;
      if(u>=0 && u<=1){
        dy=-Math.round(Math.sin(u*Math.PI)*L.h); frame=u<.5?1:2; bob=0;
        if(!fx.took.has(i)){ fx.took.add(i); if(mv.takeoff){ if(mv.takeoff.leaves) puff("leaf",mv.takeoff.leaves,tigerX+6,gy); if(mv.takeoff.sparks) puff("spark",mv.takeoff.sparks,tigerX+6,gy); } puff("dust",4,tigerX+4,gy); }
      } else if(u>1 && !fx.landed.has(i)){
        fx.landed.add(i); squash=1;
        const last=i===leaps.length-1, land=mv.land||{};
        puff("dust",last?(land.dust||5):4,tigerX+10,gy);
        if(last){ if(land.leaves) puff("leaf",land.leaves,tigerX+12,gy); if(land.sparks) puff("spark",land.sparks,tigerX+12,gy);
          if(land.shake) shake(land.shake,land.ms,now); if(land.flash) fx.flashAt=now; if(mv.glow) fx.glowUntil=now+mv.glow; }
      } else if(u>1 && now-(t0+L.dur)<90) squash=1;   // a beat of squash on landing
    });
    // Trail while running: dust kicked up, or sparks for the White Tiger.
    if(running && mv.trail && Math.random()<(mv.trail==="spark"?.6:.35)) puff(mv.trail==="spark"?"spark":"dust",1,tigerX+2,gy);
    // End of the run: a settle, and the little extras.
    if(!SC.moving && !winding && !holding && !fx.ended && now>=SC.t0){
      fx.ended=true; const e=mv.end||{};
      if(e.dust) puff("dust",e.dust,tigerX+8,gy);
      if(e.paper) puff("paper",e.paper,tigerX,gy);
      if(e.hop) fx.hopAt=now;
      if(!mv.leaps && mv.land) { const land=mv.land; if(land.shake) shake(land.shake,land.ms,now); }
      if(mv.sag) fx.sagUntil=now+mv.sag;
      if(mv.droop) puff("droop",mv.droop.n,tigerX,gy);
    }
    if(fx.hopAt){ const u=(now-fx.hopAt)/mv.end.hop.dur; if(u<1) dy=-Math.round(Math.sin(u*Math.PI)*mv.end.hop.h); }
    if(fx.sagUntil && now<fx.sagUntil){ squash=1; bob=0; }
  }

  // Afterimages: where Ivan just was, fading out behind him.
  const v=Math.abs(SC.camM-(fx?fx.lastCam:SC.camM))*PXM;
  if(fx){ fx.hist.push(dy); if(fx.hist.length>12) fx.hist.shift(); fx.lastCam=SC.camM; }
  if(fx && mv.ghosts && (running || dy<0)){
    const gap=Math.max(3,Math.min(9,v*2.2)), pal={...CUBS[0], o:mv.ghosts, k:mv.ghosts, w:mv.ghosts, e:mv.ghosts};
    for(let i=3;i>=1;i--){ ctx.globalAlpha=.12*(4-i); drawTiger(ctx,tigerX+dx-Math.round(gap*i),baseY+(fx.hist[fx.hist.length-1-i*2]||0),frame,0,pal); }
    ctx.globalAlpha=1;
  }
  // Speed lines for the sprint.
  if(fx && mv.lines && running) for(let i=0;i<3;i++){ const y=baseY-6+((Math.random()*26)|0), len=6+((Math.random()*16)|0), x=tigerX-10-((Math.random()*SC.W*.3)|0);
    ctx.fillStyle=i%2?"rgba(251,251,248,.55)":"rgba(255,216,77,.45)"; ctx.fillRect(x,y,len,1); }
  // Glow after the White Tiger lands: a flickering bright outline.
  if(fx && now<fx.glowUntil){ const a=(fx.glowUntil-now)/mv.glow*(((now/90)|0)%2?.9:.55), pal={...CUBS[0],o:"#FFD84D",k:"#FFD84D",w:"#FFD84D",e:"#FFD84D"};
    ctx.globalAlpha=a; for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]]) drawTiger(ctx,tigerX+dx+ox,baseY+dy+oy,frame,bob,pal); ctx.globalAlpha=1; }

  drawTiger(ctx,tigerX+dx,baseY+dy+squash,frame,squash?0:bob);

  // Particles (they stay put in the world, so they drift back as the camera moves on).
  const dt=Math.min(50,now-(SC.lastFx||now)); SC.lastFx=now;
  const camShift=(SC.camM-(SC.lastPartCam??SC.camM))*PXM; SC.lastPartCam=SC.camM;
  SC.parts=SC.parts.filter(p=>(p.life-=dt)>0);
  for(const p of SC.parts){
    p.vy+=p.g*dt; p.x+=p.vx*dt-camShift+(p.sway?Math.sin((now/180)+p.sway)*0.15:0); p.y+=p.vy*dt;
    if(p.twinkle && ((now/70+p.x)|0)%3===0) continue;
    ctx.globalAlpha=Math.min(1,p.life/300); ctx.fillStyle=p.c; ctx.fillRect(Math.round(p.x),Math.round(p.y),p.w,p.h);
  }
  ctx.globalAlpha=1;

  // Flash on the big landing.
  if(fx && fx.flashAt){ const u=(now-fx.flashAt)/420; if(u<1){ ctx.fillStyle=`rgba(255,250,230,${(1-u)*(1-u)*.85})`; ctx.fillRect(0,0,SC.W,SC.H); } }

  // Shake the whole scene: landing jolts (decaying) plus a steady rumble while the White Tiger sprints.
  if(fx){
    let amp=running&&mv.runShake?mv.runShake:0;
    fx.shakes=fx.shakes.filter(s=>now-s.at<s.ms);
    for(const s of fx.shakes){ const k=1-(now-s.at)/s.ms; amp=Math.max(amp,s.px*k*k); }
    const t=amp>.3?`translate(${Math.round((Math.random()*2-1)*amp*SC.scale)}px,${Math.round((Math.random()*2-1)*amp*SC.scale*.6)}px) scale(1.02)`:"";
    if(SC.cv.style.transform!==t) SC.cv.style.transform=t;
    if(fx.ended && !fx.shakes.length && now>fx.glowUntil && (!fx.flashAt||now-fx.flashAt>500) && !SC.parts.length && (!fx.sagUntil||now>fx.sagUntil) && (!fx.hopAt||now-fx.hopAt>400)) SC.fx=null;
  }
}
