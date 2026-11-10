/* =========================================================
   TAILGATE SCENE: a jungle clearing at night, rocks in a circle
   ========================================================= */
const TG={bg:null,bgKey:"",pos:[],center:{x:0,y:0},bell:{x:0,y:0},ringAt:0,chatW:0,lionA:Math.PI/2};
const turnMs=()=>{ const s=party&&party.st&&party.st.turnSec; return (s>=2&&s<=30?s:6)*1000; };
function ell(ctx,cx,cy,rx,ry){ for(let dy=-ry;dy<=ry;dy++){ const w=Math.round(rx*Math.sqrt(Math.max(0,1-(dy*dy)/(ry*ry)))); ctx.fillRect(Math.round(cx-w),Math.round(cy+dy),2*w+1,1); } }
function tgGeometry(){
  const s=SC.scale, W=SC.W, H=SC.H;
  const chatCss = innerWidth>=900 && !$("tgchat").classList.contains("off") ? 320 : 0;
  TG.chatW=chatCss;
  const aw=(innerWidth-chatCss)/s;
  const cx=aw/2;
  let cy=H*.63, rx=Math.min(aw*.42, 175), ry=Math.min(H*.23, 64);
  // Keep the circle between the question card and the answer box, so nobody's name or lives hide behind
  // them: room above the top rocks for an animal, below the bottom ones for its name and hearts.
  const dock=$("tgdock"), card=$("tgprompt");
  if(dock && !dock.hidden){
    const top=(card && !card.hidden ? card.getBoundingClientRect().bottom : 0)/s + 46/s;
    const bottom=dock.getBoundingClientRect().top/s - 46/s;
    if(bottom>top){
      ry=Math.max(18, Math.min(ry, (bottom-top)/2));
      cy=Math.min(Math.max(cy, top+ry), bottom-ry);
    }
  }
  return {cx,cy,rx,ry,W,H,s};
}
function buildTgBg(){
  const {W,H,cx,cy,rx,ry}=tgGeometry();
  const key=[W,H,Math.round(cx),Math.round(cy),Math.round(ry)].join(","); if(TG.bgKey===key && TG.bg) return; TG.bgKey=key;
  const c=document.createElement("canvas"); c.width=W; c.height=H; const g=c.getContext("2d");
  g.fillStyle="#08170F"; g.fillRect(0,0,W,H);
  // distant canopy bands
  g.fillStyle="#0C2216"; for(let i=0;i<W/14+2;i++){ const x=i*14+hash(i,40)*8; disc(g,x,H*.18+hash(i,41)*10,10+hash(i,42)*8); }
  g.fillStyle="#0F2A1C"; g.fillRect(0,H*.22,W,H);
  // clearing
  g.fillStyle="#183A27"; ell(g,cx,cy,rx*1.45,ry*1.75);
  g.fillStyle="#1F4630"; ell(g,cx,cy,rx*1.3,ry*1.55);
  for(let i=0;i<600;i++){ const a=hash(i,43)*Math.PI*2, r=Math.sqrt(hash(i,44)); const x=cx+Math.cos(a)*r*rx*1.3, y=cy+Math.sin(a)*r*ry*1.55;
    g.fillStyle=hash(i,45)<.5?"#28583B":"#173A27"; g.fillRect(Math.round(x),Math.round(y),1,1); }
  g.fillStyle="#4A3B2C"; ell(g,cx,cy+3,26,7); g.fillStyle="#5C4A37"; ell(g,cx,cy+2,23,6);  // stump the lion sits on
  g.fillStyle="#3A2D21"; for(let k=-10;k<=10;k+=4) g.fillRect(Math.round(cx+k),Math.round(cy+2),1,1);
  // jungle border: trunks, big leaves, ferns
  for(let i=0;i<10;i++){ const x=Math.round(hash(i,46)<.5? hash(i,47)*W*.14 : W-hash(i,47)*W*.14); const tw=4+Math.round(hash(i,48)*5);
    g.fillStyle="#1D160F"; g.fillRect(x,Math.round(H*.12),tw,H); g.fillStyle="#2A2118"; g.fillRect(x+1,Math.round(H*.12),1,H); }
  const leaf=(x,y,r,col)=>{ g.fillStyle=col; disc(g,x,y,r); disc(g,x+r*.7,y+2,r*.7); disc(g,x-r*.7,y+3,r*.6); };
  for(let i=0;i<38;i++){ const side=i%4; let x,y; const r=6+hash(i,50)*10;
    if(side===0){ x=hash(i,51)*W; y=H*.1+hash(i,52)*H*.12; } else if(side===1){ x=hash(i,51)*W*.12; y=H*.2+hash(i,52)*H*.8; }
    else if(side===2){ x=W-hash(i,51)*W*.12; y=H*.2+hash(i,52)*H*.8; } else { x=hash(i,51)*W; y=H-hash(i,52)*H*.08; }
    leaf(x,y,r,hash(i,53)<.5?"#123A26":"#185033"); }
  g.fillStyle="#0A2216"; for(let i=0;i<W;i+=3){ const h=3+Math.round(hash(i,54)*7); g.fillRect(i,H-h,1,h); g.fillRect(i+1,H-h+2,1,h-2); }
  // hanging vines
  g.fillStyle="#1E5A38"; for(let i=0;i<14;i++){ const x=Math.round(hash(i,55)*W), l=Math.round(H*(.12+hash(i,56)*.25)); for(let y=0;y<l;y++) g.fillRect(x+((y/5|0)%2),y,1,1); disc(g,x,l,1); }
  TG.bg=c;
}
function drawRock(ctx,cx,cy,seed,lit,now){
  const w=13+Math.round(hash(seed,60)*3), h=5;
  if(lit){ const pulse=((now/220)|0)%2; ctx.fillStyle=pulse?"#FF9A4D":"#F26A1B"; ell(ctx,cx,cy+1,w+3,h+3); }
  ctx.fillStyle="#141B2A"; ell(ctx,cx,cy+2,w,h);
  ctx.fillStyle="#2B3650"; ell(ctx,cx,cy,w,h-1);
  ctx.fillStyle="#3E4C6C"; ell(ctx,cx-2,cy-2,w-5,h-3);
  if(hash(seed,61)<.6){ ctx.fillStyle="#3FA65A"; for(let i=0;i<7;i++) ctx.fillRect(Math.round(cx-w+3+hash(seed*9+i,62)*w*1.6),Math.round(cy-2+hash(seed*9+i,63)*3),1,1); }
  if(hash(seed,64)<.35){ ctx.fillStyle="#2C7A45"; ctx.fillRect(cx+w-4,cy-4,1,3); ctx.fillRect(cx+w-3,cy-5,1,3); ctx.fillRect(cx+w-2,cy-3,1,2); }
}
/* original pixel lion, sitting on the stump: m mane · f face · b body · w muzzle */
const LION=["......kkkkkkkk......","....kkmmmmmmmmkk....","...kmmmmmmmmmmmmk...","..kmmmkkkkkkkkmmmk..","..kmmkffffffffkmmk..",".kmmkffeffffeffkmmk.",".kmmkffffffffffkmmk.",".kmmkfffwkkwfffkmmk.","..kmmkffwwwwffkmmk..","..kmmmkffkkffkmmmk..","...kmmmkkkkkkmmmk...","....kkmbbbbbbmkk....","....kbbbbbbbbbbk....","...kbbbbbbbbbbbbk...","...kbbwwbbbbwwbbk...","...kkkkkkkkkkkkkk..."];
function drawLion(ctx,cx,cy,now,ang,pointing,timeUp){
  const Z=2, x0=Math.round(cx-10*Z), y0=Math.round(cy-17*Z), bob=((now/700)|0)%2;
  const C={k:"#0B0B0D",m:timeUp&&((now/120|0)%2)?"#E2403A":"#A9461A",f:"#F2A44A",b:"#E8973A",w:"#FBEBD0",e:"#0B0B0D"};
  ctx.fillStyle="rgba(0,0,0,.35)"; ell(ctx,cx,cy+1,22,5);
  // tail
  ctx.fillStyle="#E8973A"; for(let i=0;i<12;i++) ctx.fillRect(x0+34+i,y0+26-Math.round(Math.sin(now/400+i*.4)*2),2,2); ctx.fillStyle="#A9461A"; ctx.fillRect(x0+45,y0+23,4,4);
  LION.forEach((row,r)=>{ for(let c=0;c<row.length;c++){ const ch=row[c]; if(ch==="."||!C[ch]) continue; ctx.fillStyle=C[ch]; ctx.fillRect(x0+c*Z,y0+r*Z+(r<11?bob*Z:0),Z,Z); } });
  if(!pointing) return;
  // pointing arm: a thick pixel line from the shoulder toward the player, ending in a big paw
  const sx=cx+Math.cos(ang)*8, sy=cy-12+Math.sin(ang)*4, len=30;
  for(let i=0;i<=len;i++){ const px=Math.round(sx+Math.cos(ang)*i), py=Math.round(sy+Math.sin(ang)*i*.85);
    ctx.fillStyle="#0B0B0D"; ctx.fillRect(px-2,py-2,6,6); }
  for(let i=0;i<=len;i++){ const px=Math.round(sx+Math.cos(ang)*i), py=Math.round(sy+Math.sin(ang)*i*.85);
    ctx.fillStyle="#E8973A"; ctx.fillRect(px-1,py-1,4,4); }
  const ex=Math.round(sx+Math.cos(ang)*(len+3)), ey=Math.round(sy+Math.sin(ang)*(len+3)*.85);
  ctx.fillStyle="#0B0B0D"; disc(ctx,ex,ey,5); ctx.fillStyle="#FBEBD0"; disc(ctx,ex,ey,4);
  ctx.fillStyle="#A9461A"; [[-2,-2],[0,-3],[2,-2]].forEach(([dx,dy])=>ctx.fillRect(ex+dx,ey+dy,1,1));
}
const BIG_BELL=[".....k.....","....kkk....","...koowk...","..kooowwk..","..koooowk..",".koooooook.",".koooooook.","kooooooooook".slice(0,11),"kkkkkkkkkkk","....kkk....","....kok...."];
function drawBigBell(ctx,x,y,now,ringing){
  const sh=ringing?Math.round(Math.sin(now/28)*2):Math.round(Math.sin(now/260)*.6);
  const C={k:"#0B0B0D",o:ringing&&((now/80|0)%2)?"#FFFFFF":"#FF9A4D",w:"#FFE1B8"};
  ctx.fillStyle="rgba(255,154,77,.18)"; disc(ctx,x+5,y+6,ringing?13:9);
  BIG_BELL.forEach((row,r)=>{ for(let c=0;c<row.length;c++){ const ch=row[c]; if(ch==="."||!C[ch]) continue; ctx.fillStyle=C[ch]; ctx.fillRect(x+c+sh,y+r,1,1); } });
  if(ringing){ ctx.fillStyle=((now/90)|0)%2?"#FF9A4D":"#FBFBF8";
    [[-5,2],[-7,5],[-5,8],[15,2],[17,5],[15,8],[5,-4]].forEach(([dx,dy])=>ctx.fillRect(x+dx+sh,y+dy,2,1)); }
}
function drawTailgate(now){
  const {ctx,W,H}=SC; if(!W) return;
  buildTgBg(); ctx.drawImage(TG.bg,0,0);
  // tailgate string lights
  for(let k=0;k<2;k++){ const y0=4+k*9, sag=8+k*3;
    for(let x=0;x<W;x++){ const t=x/W; const y=Math.round(y0+Math.sin(t*Math.PI)*sag); ctx.fillStyle="#1B2235"; ctx.fillRect(x,y,1,1);
      if(x%9===4){ const on=((now/500+x+k)|0)%5!==0; ctx.fillStyle=on?(x%27===4?"#FBFBF8":x%27===13?"#A9C6FF":"#FF9A4D"):"#5A3A22"; ctx.fillRect(x,y+1,2,2); } } }
  const st=party&&party.st; if(!st){ return; }
  const g=tgGeometry(); TG.center={x:g.cx,y:g.cy};
  const seats=TG.pos;
  // the lion's paw swings toward whoever's turn it is
  const target=seats.find(p=>p.id===(st.phase==="pop"&&st.pop?st.pop.id:st.holder));
  if(target){ const a=Math.atan2(target.y-8-(g.cy-12),target.x-g.cx); let d=a-TG.lionA; d=Math.atan2(Math.sin(d),Math.cos(d)); TG.lionA+=d*.14; }
  const order=seats.slice().sort((a,b)=>a.y-b.y);
  const timeUp=TG.ringAt && now-TG.ringAt<1800;
  let lionDrawn=false;
  const lion=()=>{ drawLion(ctx,g.cx,g.cy,now,TG.lionA,!!target&&st.phase!=="lobby"&&st.phase!=="final",timeUp); lionDrawn=true; };
  for(const p of order){
    if(!lionDrawn && p.y>g.cy) lion();
    drawRock(ctx,Math.round(p.x),Math.round(p.y),p.seed,p.lit,now);
    if(p.show){ if(p.win){ ctx.fillStyle="rgba(255,216,77,.25)"; disc(ctx,p.x,p.y-8,12); } drawAnimal(ctx,p.skin,Math.round(p.x-7),Math.round(p.y-16),now,{phase:p.seed}); }
  }
  if(!lionDrawn) lion();
  // fireflies
  for(let i=0;i<14;i++){ const fx=(hash(i,70)*W+now/120*hash(i,71))%W, fy=H*.25+hash(i,72)*H*.65+Math.sin(now/800+i)*3;
    ctx.fillStyle=((now/300+i)|0)%3===0?"#FFD84D":"#FF9A4D"; ctx.fillRect(Math.round(fx),Math.round(fy),1,1); }
}

/* ---------- seats + labels (DOM over the canvas) ---------- */
function seatIds(){ const st=party.st; return (st.seat||[]).filter(id=>st.pl[id] && !st.pl[id].gone || (st.phase!=="lobby" && st.pl[id])); }
function layoutSeats(){
  if(!party||!party.st) return;
  const st=party.st, g=tgGeometry(), ids=seatIds(), n=Math.max(ids.length,1);
  const winner=st.phase==="final"?st.winner:null;
  TG.pos=ids.map((id,i)=>{ const a=-Math.PI/2+Math.PI/n+2*Math.PI*i/n; const p=st.pl[id];
    return {id,x:g.cx+g.rx*Math.cos(a),y:g.cy+g.ry*Math.sin(a),seed:(i*7+3),skin:p.k|0,
      show:!p.out||st.phase==="lobby", lit:(st.phase==="play"&&id===st.holder)||(st.phase==="pop"&&st.pop&&st.pop.id===id), win:id===winner}; });
  if(!TG.bell.x){ TG.bell.x=g.cx; TG.bell.y=g.cy; }
  renderLabels();
}
function presenceOf(id){ return (party.presence&&party.presence[id])||{}; }
function renderLabels(){
  if(!party||!party.st){ $("tglabels").innerHTML=""; return; }
  const st=party.st, s=SC.scale, now=performance.now();
  $("tglabels").innerHTML=TG.pos.map(p=>{
    const pl=st.pl[p.id]; const pr=presenceOf(p.id);
    let bubble="", above="";
    if(st.phase==="play" && p.id===st.holder && pr.typing){ above=`<div class="tb typing">${esc(pr.typing)}<i>▌</i></div>`; }
    else if(st.phase==="play" && p.id===st.holder && party.missSeen[p.id] && now-party.missSeen[p.id].at<2600){ above=`<div class="tb miss">${esc(party.missSeen[p.id].t)}</div>`; }
    else if(st.phase==="play" && p.id===st.holder){ above=`<div class="tb typing thinking">…</div>`; }
    if(st.lastBy && st.lastBy[p.id]){ const a=st.lastBy[p.id]; bubble=`<div class="tb ans t${a.t}"><span>${esc(a.n)}</span><small>${TIERS[a.t].name} · +${TIERS[a.t].pts}</small></div>`; }
    const hearts = st.phase==="lobby" ? "" : `<span class="th">${"♥".repeat(Math.max(0,pl.h))}<i>${"♥".repeat(Math.max(0,st.hearts-pl.h))}</i></span>`;
    const cls=[ "tl", p.id===party.me?"me":"", pl.out&&st.phase!=="lobby"?"out":"", p.id===st.holder&&st.phase==="play"?"up":"", p.win?"win":"" ].join(" ");
    const em=party.emoteAt&&party.emoteAt[p.id]; const emo = em && now-em.at<2800 ? `<div class="temo" style="left:${p.x*s}px;top:${(p.y-(above?34:19))*s}px">${emoCanvas(em.e)}</div>` : "";
    return emo+(above?`<div class="tabove" style="left:${p.x*s}px;top:${(p.y-19)*s}px">${above}</div>`:"")+`<div class="${cls}" style="left:${p.x*s}px;top:${(p.y+6)*s}px"><span class="tn">${esc(pl.n)}</span>${hearts}${bubble}</div>`;
  }).join("");
  drawEmotes();
}
