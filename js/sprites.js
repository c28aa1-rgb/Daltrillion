/* =========================================================
   JUNGLE ANIMALS (original pixel sprites, 14 x 14)
   k ink · w white · e eye · a main · b second · c accent · y crown
   ========================================================= */
const TIGER_FACE=["..kk......kk..",".kaak....kaak.",".kaaakkkkaaak.","kaakaakkaakaak","kaaaaaaaaaaaak","kakeaaaaaaekak","kaaaawwwwaaaak","kakaawkkwaakak",".kaaawwwwaaak.","..kkaaaaaakk..",".kaaaaaaaaaak.","kaakaaaaaakaak","kaawwaaaawwaak",".kkkkkkkkkkkk."];
const SKINS=[
  {id:"tiger",   name:"Tiger",    pal:{a:"#F26A1B"}, rows:TIGER_FACE},
  {id:"jaguar",  name:"Jaguar",   pal:{a:"#E8A23A"}, rows:["..kk......kk..",".kaak....kaak.",".kaaakkkkaaak.","kaaakaaaakaaak","kaaaaaakaaaaak","kaaeaaaaaaeaak","kakaawwwwaakak","kaaaawkkwaaaak",".kaaawwwwaaak.","..kkaaaaaakk..",".kakaaaakaaak.","kaaaakaaaaakak","kaawwaaaawwaak",".kkkkkkkkkkkk."]},
  {id:"toucan",  name:"Toucan",   pal:{a:"#2A2F3D",c:"#FF9A4D"}, rows:["...kkkkk......","..kaaaaak.....",".kaawwwakkkk..",".kawekwkccccck",".kawwwwkcccck.",".kaawwwakkkk..",".kaaawwaak....","kaaaawwaaak...","kaaaawwaaak...","kaaaawwaaak...",".kaaaaaaak....","..kaaaaak.....","...kc.kc......","..kcc.kcc....."]},
  {id:"macaw",   name:"Macaw",    pal:{a:"#E2403A",b:"#2D6BFF",c:"#FFC94D"}, rows:["....kkkkk.....","...kaaaaak....","..kaaaaaaak...","..kawwekaak...","..kawwwkkkk...","..kaaakwwk....","..kaaaakwk....",".kaaaaaak.....",".kccccccak....",".kbbbbbbak....","..kbbbbak.....","..kakakk......","...kbk........","...kbk........"]},
  {id:"monkey",  name:"Monkey",   pal:{a:"#8B5A2B",b:"#E8C39E"}, rows:["....kkkkkk....","...kaaaaaak...",".kkaaaaaaaakk.","kbkabbbbbbakbk","kbkbbbbbbbbkbk",".kkbebbbbebkk.","..kbbbbbbbbk..","..kbbkbbkbbk..","...kbbbbbbk...","..kkaaaaaakk..",".kaaabbbbaaak.","kaakabbbbakaak","kaaaaaaaaaaaak",".kkkkkkkkkkkk."]},
  {id:"sloth",   name:"Sloth",    pal:{a:"#8E7B66",b:"#E9DCC5"}, rows:["....kkkkkk....","..kkaaaaaakk..",".kaaaaaaaaaak.","kaabbbbbbbbaak","kabkkbbbbkkbak","kabkekbbkekbak","kabbkkbbkkbbak","kaabbbkkbbbaak",".kaabbbbbbaak.","..kkaaaaaakk..",".kaaaaaaaaaak.","kkaaaaaaaaaakk","kwkaaaaaaaakwk",".kkkkkkkkkkkk."]},
  {id:"frog",    name:"Dart Frog",pal:{a:"#2D6BFF"}, rows:["..kkk....kkk..",".kwewk..kwewk.",".kwwwkkkkwwwk.","kaaaaaaaaaaaak","kaakaaaaaakaak","kaaaaaaaaaaaak","kaakkkkkkkkaak",".kaaaaaaaaaak.","..kaakaaakaak.",".kaaaaaaaaaak.","kaakaaaaaakaak","kaaaaaaaaaaaak","kaakk....kkaak","kkkk......kkkk"]},
  {id:"snake",   name:"Tree Snake",pal:{a:"#3FA65A",b:"#FFC94D",c:"#E2403A"}, rows:["..............","....kkkk......","...kaaaak.....","..kaeaeaak....","..kaaaaaak....","...kaaaak.....","....kaak..c...","..kkaaakkkc...",".kaaaaaaaak...","kaabaabaaaak..","kaaaaaaaaaaak.",".kaabaabaaabak","..kaaaaaaaaak.","...kkkkkkkkk.."]},
  // Secret skins: unlocked by a code typed in the Tiger Tailgate setup. The server checks the code (SKIN_CODES in
  // server/src/game/config.js), so the codes aren't in this file. New skins go at the end so nobody's saved choice moves.
  {id:"ivan",    name:"Golden Ivan",pal:{a:"#FFC94D"}, rows:TIGER_FACE, secret:true},
  {id:"dalton",  name:"Dalton Blue Tiger",pal:{a:"#1F5FD6",b:"#F26A1B",c:"#0A1A3F"}, secret:true,
    rows:["..kk......kk..",".kbak....kabk.",".kaaakkkkaaak.","kaabaabbaabaak","kaaaaaaaaaaaak","kbaeaaaaaaeabk","kbaaawwwwaaabk","kaaaawkkwaaaak",".kaaawwwwaaak.","..kkaaaaaakk..",".kcccwwwcccck.","kccccwccwcccck","kccccwwwccccck",".kkkkkkkkkkkk."]}
];

const BASE_PAL={k:"#0B0B0D",w:"#FBFBF8",e:"#0B0B0D",y:"#FFD84D"};
function drawAnimal(ctx,skin,x,y,now,opts={}){
  const s=SKINS[skin]||SKINS[0]; const pal={...BASE_PAL,...s.pal};
  const bob=opts.still?0:(((now/600+(opts.phase||0))|0)%2);
  s.rows.forEach((row,r)=>{ for(let c=0;c<row.length;c++){ const ch=row[c]; if(ch===".") continue; const col=pal[ch]; if(!col) continue; ctx.fillStyle=col; ctx.fillRect(x+c,y+r+(r<9?bob:0),1,1); } });
  if(s.id==="ivan"){ // crown + sparkles
    ctx.fillStyle="#FFD84D"; ctx.fillRect(x+4,y-3+bob,6,2); ctx.fillRect(x+4,y-5+bob,1,2); ctx.fillRect(x+6,y-6+bob,2,3); ctx.fillRect(x+9,y-5+bob,1,2);
    ctx.fillStyle="#E2403A"; ctx.fillRect(x+6,y-3+bob,2,1);
    const t=(now/250|0)%6; ctx.fillStyle="#FFFFFF"; [[-2,2],[15,5],[-1,11],[15,12],[3,-7],[11,-6]].forEach(([dx,dy],i)=>{ if((i+t)%3===0) ctx.fillRect(x+dx,y+dy,1,1); });
  }
}
function skinCanvas(i){ const c=document.createElement("canvas"); c.width=20; c.height=22; drawAnimal(c.getContext("2d"),i,3,6,0,{still:true}); return c; }

/* =========================================================
   EMOTES: original 16x16 animated pixel reactions
   ========================================================= */
const GLYPH={ // 5x7 pixel letters
  W:["10001","10001","10001","10101","10101","11011","10001"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  G:["01110","10001","10000","10111","10001","10001","01111"],
  6:["00110","01000","10000","11110","10001","10001","01110"],
  7:["11111","00001","00010","00100","01000","01000","01000"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  K:["10001","10010","10100","11000","10100","10010","10001"]
};
function glyph(g,ch,x,y,col,shadow){ const rows=GLYPH[ch]; if(!rows) return;
  rows.forEach((r,j)=>{ for(let i=0;i<5;i++) if(r[i]==="1"){ if(shadow){ g.fillStyle=shadow; g.fillRect(x+i+1,y+j+1,1,1); } g.fillStyle=col; g.fillRect(x+i,y+j,1,1); } }); }
function face(g,col,edge){ g.fillStyle=edge; ell(g,8,8,7,7); g.fillStyle=col; ell(g,8,8,6,6); }
const EMOTES=[
 {id:"skull",name:"Dead 💀",draw(g,f){ const jaw=f%2;
   g.fillStyle="#0B0B0D"; ell(g,8,7,6,6); g.fillStyle="#FBFBF8"; ell(g,8,7,5,5);
   g.fillStyle="#0B0B0D"; g.fillRect(4,6,3,3); g.fillRect(9,6,3,3); g.fillRect(7,9,2,1);
   g.fillStyle="#FBFBF8"; g.fillRect(5,12+jaw,6,2); g.fillStyle="#0B0B0D"; g.fillRect(6,12+jaw,1,2); g.fillRect(8,12+jaw,1,2); g.fillRect(10,12+jaw,1,1);
   g.fillStyle="#7FC8FF"; g.fillRect(3,9+f%3,1,2); g.fillRect(12,9+(f+1)%3,1,2); }},
 {id:"crylaugh",name:"Crying laughing",draw(g,f){ face(g,"#FFD84D","#0B0B0D");
   g.fillStyle="#0B0B0D"; g.fillRect(4,6,1,1); g.fillRect(5,5,2,1); g.fillRect(7,6,1,1); g.fillRect(9,6,1,1); g.fillRect(10,5,2,1); g.fillRect(12,6,1,1);
   g.fillStyle="#0B0B0D"; g.fillRect(5,9,7,1); g.fillStyle="#E2403A"; g.fillRect(6,10,5,2); g.fillStyle="#FBFBF8"; g.fillRect(6,10,5,1);
   g.fillStyle="#5BB8FF"; const d=f%4; g.fillRect(2,7+d,2,2); g.fillRect(13,7+((d+2)%4),2,2); }},
 {id:"fire",name:"Fire",draw(g,f){ const o=[0,1,0,-1][f%4];
   g.fillStyle="#E2403A"; ell(g,8,11,6,4); g.fillRect(3+o,6,3,6); g.fillRect(7,2-o,3,8); g.fillRect(11-o,5,3,7);
   g.fillStyle="#FF9A4D"; ell(g,8,12,4,3); g.fillRect(5,8+o,2,4); g.fillRect(8,5,2,6); g.fillRect(10,8-o,2,4);
   g.fillStyle="#FFD84D"; ell(g,8,12,2,2); g.fillRect(8,9+o,1,3); }},
 {id:"clown",name:"Clown",draw(g,f){ face(g,"#FBFBF8","#0B0B0D");
   g.fillStyle="#2D6BFF"; g.fillRect(0,4,3,4); g.fillRect(13,4,3,4); g.fillStyle="#3FA65A"; g.fillRect(1,2,2,3); g.fillRect(13,2,2,3);
   g.fillStyle="#0B0B0D"; g.fillRect(5,6,2,2); g.fillRect(9,6,2,2); g.fillStyle="#2D6BFF"; g.fillRect(5,5,2,1); g.fillRect(9,5,2,1);
   g.fillStyle="#E2403A"; const r=f%2?2:1; ell(g,8,9,r,r); g.fillRect(5,12,6,1); g.fillRect(4,11,1,1); g.fillRect(11,11,1,1); }},
 {id:"W",name:"Big W",draw(g,f){ const b=[0,-1,-2,-1][f%4]; g.fillStyle="#123A26"; g.fillRect(1,2,14,13);
   g.save(); g.translate(3,4+b); g.scale(2,1.5); glyph(g,"W",0,0,"#5BE38A","#0B0B0D"); g.restore(); }},
 {id:"L",name:"Take the L",draw(g,f){ const s=[0,1,0,-1][f%4]; g.fillStyle="#3A1212"; g.fillRect(1,2,14,13);
   g.save(); g.translate(4+s,4); g.scale(2,1.5); glyph(g,"L",0,0,"#FF5A5A","#0B0B0D"); g.restore(); }},
 {id:"gg",name:"GG",draw(g,f){ g.fillStyle="#0A1A3F"; g.fillRect(0,3,16,10);
   glyph(g,"G",2,4,f%2?"#FF9A4D":"#FBFBF8","#0B0B0D"); glyph(g,"G",9,4,f%2?"#FBFBF8":"#FF9A4D","#0B0B0D"); }},
 {id:"sideeye",name:"Side-eye",draw(g,f){ const p=[0,0,2,2][f%4];
   g.fillStyle="#0B0B0D"; g.fillRect(1,5,6,6); g.fillRect(9,5,6,6); g.fillStyle="#FBFBF8"; g.fillRect(2,6,4,4); g.fillRect(10,6,4,4);
   g.fillStyle="#0B0B0D"; g.fillRect(2+p,7,2,2); g.fillRect(10+p,7,2,2); g.fillStyle="#0B0B0D"; g.fillRect(1,3,6,1); g.fillRect(9,4,6,1); }},
 {id:"mindblown",name:"Mind blown",draw(g,f){ face(g,"#FFD84D","#0B0B0D"); g.fillStyle="#08170F"; g.fillRect(0,0,16,5);
   g.fillStyle="#0B0B0D"; g.fillRect(5,9,2,2); g.fillRect(9,9,2,2); g.fillRect(7,12,2,2);
   const r=1+f%4; g.fillStyle="#FF9A4D"; ell(g,8,2,r+1,Math.max(1,r-1)); g.fillStyle="#FFD84D"; ell(g,8,2,Math.max(1,r-1),1);
   g.fillStyle="#FBFBF8"; if(f%2){ g.fillRect(2,1,1,1); g.fillRect(13,0,1,1); g.fillRect(4,3,1,1);} else { g.fillRect(12,3,1,1); g.fillRect(3,0,1,1); } }},
 {id:"sweat",name:"Nervous",draw(g,f){ face(g,"#FFD84D","#0B0B0D");
   g.fillStyle="#0B0B0D"; g.fillRect(5,7,2,2); g.fillRect(9,7,2,2); g.fillRect(6,11,1,1); g.fillRect(7,12,3,1); g.fillRect(10,11,1,1);
   g.fillStyle="#5BB8FF"; const y=2+(f%4)*2; g.fillRect(12,y,2,2); g.fillRect(12,y-1,1,1); }},
 {id:"67",name:"6 7",draw(g,f){ const a=f%2?-2:0, b=f%2?0:-2; g.fillStyle="#0A1A3F"; g.fillRect(0,2,16,13);
   glyph(g,"6",2,5+a,"#FF9A4D","#0B0B0D"); glyph(g,"7",9,5+b,"#A9C6FF","#0B0B0D"); }},
 {id:"roar",name:"Tiger roar",draw(g,f){ drawAnimal(g,0,1,1,0,{still:true}); if(f%2){ g.fillStyle="#E2403A"; g.fillRect(6,8,3,2); g.fillStyle="#FBFBF8"; g.fillRect(6,8,1,1); g.fillRect(8,8,1,1); }
   g.fillStyle="#FF9A4D"; if(f%2){ g.fillRect(15,4,1,1); g.fillRect(15,7,1,1); g.fillRect(0,5,1,1); } }}
];
const EMOTE_IDS=new Set(EMOTES.map(e=>e.id));
let emoFrame=0;
function drawEmotes(){
  emoFrame++;
  document.querySelectorAll("canvas.emo").forEach(cv=>{
    const e=EMOTES.find(x=>x.id===cv.dataset.e); if(!e) return;
    const g=cv.getContext("2d"); g.clearRect(0,0,16,16); e.draw(g,emoFrame);
  });
}
setInterval(drawEmotes,170);
const emoCanvas=id=>`<canvas class="emo" width="16" height="16" data-e="${id}" aria-label="${esc((EMOTES.find(e=>e.id===id)||{}).name||"")}"></canvas>`;
