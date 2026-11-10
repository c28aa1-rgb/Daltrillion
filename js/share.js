/* =========================================================
   SHARE YOUR SCORE
   After a Daily, "Share your score" draws a score card picture from the score
   the board recorded (the server's /api/share, so it can't be made up) and
   fills in an email in the player's own Gmail or mail app: who it's to, their
   message, their score and a link to the game. A pre-filled email can only
   carry text, so the picture goes on the clipboard as the email opens and one
   paste drops it in; where the browser can share files (phones, iPads,
   Chromebooks, Safari) "Share" attaches it directly. Nothing is sent from
   here and no address is stored.
   ========================================================= */
const SHARE={answers:null, info:null, png:null};
const CARD_COLORS={W:"#FBFBF8",D:"#F26A1B",R:"#1F5FD6",P:"#A9C6FF",T:"#EEEAE1",C:"#8E96A8",X:"#2A2F3D"};
const SHARE_BASE=location.origin+location.pathname.replace(/index\.html$/,"");
const EMAILS=/^\s*[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+(\s*[,;]\s*[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+)*\s*$/;

/* The score card picture: 1200 x 630, drawn in the game's pixel style. */
async function drawShareCard(c){
  try{ await Promise.all(['64px "Jersey 10"','24px "Silkscreen"','24px "Pixelify Sans"'].map(f=>document.fonts.load(f))); }catch(e){}
  const W=1200,H=630, x=c.getContext("2d"); c.width=W; c.height=H; x.imageSmoothingEnabled=false;
  const m=c.score*M_PER_PT, zone=ZONES[zoneIndex(m)][1];
  x.fillStyle="#0A1A3F"; x.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=6){ x.fillStyle="rgba(0,0,0,.08)"; x.fillRect(0,y,W,2); }
  x.fillStyle="#25458C"; x.fillRect(24,24,W-48,8); x.fillRect(24,H-32,W-48,8); x.fillRect(24,24,8,H-48); x.fillRect(W-32,24,8,H-48);
  // Ivan and the wordmark
  x.drawImage(skinCanvas(0),56,60,140,154);
  x.fillStyle="#FBFBF8"; x.font='108px "Jersey 10", Impact, sans-serif'; x.textBaseline="alphabetic"; x.fillText("DALTRILLION",216,160);
  x.fillStyle="#93A4C8"; x.font='26px "Silkscreen", monospace'; x.fillText(`DAILY PROWL #${c.number}`,222,206);
  if(c.name){ x.textAlign="right"; x.fillStyle="#FF9A4D"; x.fillText(c.name.toUpperCase(),W-72,206); x.textAlign="left"; }
  // one bar per prompt, as tall as it scored
  const tiers=[...(c.tiers||"")], bx=72, bw=W-144, by=470, bh=200, n=Math.max(tiers.length,1), gap=14, w=(bw-gap*(n-1))/n;
  tiers.forEach((t,k)=>{
    const h=Math.max(16,Math.round(bh*TIERS[t].pts/100)), left=bx+k*(w+gap);
    x.fillStyle="#000"; x.fillRect(left-4,by-h-4,w+8,h+8);
    x.fillStyle=CARD_COLORS[t]; x.fillRect(left,by-h,w,h);
    x.fillStyle="rgba(255,255,255,.25)"; x.fillRect(left,by-h,w,8);
  });
  x.fillStyle="#25458C"; x.fillRect(bx,by+12,bw,8);
  // the distance, how far that is, and the place
  x.fillStyle="#F26A1B"; x.font='96px "Jersey 10", Impact, sans-serif'; x.fillText(`${fmt(m)} M`,72,by+112);
  x.fillStyle="#93A4C8"; x.font='26px "Silkscreen", monospace';
  x.textAlign="right"; x.fillText(`REACHED ${zone.toUpperCase()}`,W-72,by+70);
  if(c.rank){ x.fillStyle="#FBFBF8"; x.fillText(`${ordinal(c.rank).toUpperCase()} OF ${c.players} PLAYER${c.players===1?"":"S"}`,W-72,by+110); }
  x.textAlign="left";
  return c;
}
function shareMessageText(){
  const i=SHARE.info, m=i.score*M_PER_PT, zone=ZONES[zoneIndex(m)][1];
  return `I prowled ${fmt(m)} m on Daltrillion Daily Prowl #${i.number} (reached ${zone}, ${ordinal(i.rank)} of ${i.players} so far).`+
    `\n\nPlay today's prompts: ${SHARE_BASE}\n\nDaltrillion is the Dalton rare-answer game: name the answer nobody else thinks of.`;
}
function shareSubject(){ return `Can you beat ${fmt(SHARE.info.score*M_PER_PT)} m in Daltrillion?`; }
function shareBody(){ const note=$("sh-msg").value.trim(); return (note?note+"\n\n":"")+shareMessageText(); }
function shareTo(){ return $("sh-to").value.split(/[,;]/).map(s=>s.trim()).filter(Boolean).join(","); }
const say=t=>{ $("sh-msgline").textContent=t; };
function shareCheck(){
  if(!EMAILS.test($("sh-to").value)){ say("Type an email address first (or a few, separated by commas)."); $("sh-to").focus(); return false; }
  return true;
}
const shareFile=()=>SHARE.png && new File([SHARE.png],"daltrillion-score.png",{type:"image/png"});
const canShareFile=()=>{ try{ const f=shareFile(); return !!(f && navigator.canShare && navigator.canShare({files:[f]})); }catch(e){ return false; } };

/* Put the score card on the clipboard (inside the click, before the email opens). */
async function copyCard(){
  try{ if(!SHARE.png) return false; await navigator.clipboard.write([new ClipboardItem({"image/png":SHARE.png})]); return true; }catch(e){ return false; }
}
function saveCard(){
  const a=document.createElement("a"); a.download="daltrillion-score.png"; a.href=$("sh-card").querySelector("canvas").toDataURL("image/png"); a.click();
}

async function openShare(){
  const box=$("sharebox"); box.hidden=false; say("Making your score card…");
  $("sh-card").innerHTML=""; $("sh-actions").hidden=true;
  const tiers=(SHARE.answers||[]).map(a=>a.tier).join("");
  const r=await api("share",{player:playerId(),tiers});
  if(!r||r.error){ say(r&&r.message ? r.message : OFFLINE_MSG); return; }
  const info=await api("share?id="+encodeURIComponent(r.id));
  if(!info||info.error){ say(OFFLINE_MSG); return; }
  SHARE.info=info;
  const c=document.createElement("canvas"); Object.assign(c,info); await drawShareCard(c);
  SHARE.png=await new Promise(res=>c.toBlob(res,"image/png"));
  c.setAttribute("role","img"); c.setAttribute("aria-label",`Score card: ${fmt(info.score*M_PER_PT)} meters on Daily Prowl #${info.number}`);
  $("sh-card").append(c); $("sh-actions").hidden=false;
  $("sh-native").hidden=!canShareFile();
  say("Opens an email from your own account with everything filled in, and copies your score card so you can paste it in.");
  $("sh-to").focus();
}
function closeShare(){ $("sharebox").hidden=true; }

$("sharebtn").addEventListener("click",openShare);
$("sh-close").addEventListener("click",closeShare);
$("sharebox").addEventListener("click",e=>{ if(e.target.id==="sharebox") closeShare(); });
addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("sharebox").hidden) closeShare(); });
async function sendEmail(url, newTab){
  if(!shareCheck()) return;
  const copied=await copyCard();
  if(newTab) open(url,"_blank","noopener"); else location.href=url;
  say(copied ? "Your score card is copied. Click in the email and press Ctrl/⌘ + V to drop it in, then send."
             : "Your browser wouldn't copy the picture. Use Save picture and attach it to the email.");
  sfx("copy");
}
$("sh-gmail").addEventListener("click",()=>sendEmail("https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(shareTo())+"&su="+encodeURIComponent(shareSubject())+"&body="+encodeURIComponent(shareBody()), true));
$("sh-mail").addEventListener("click",()=>sendEmail("mailto:"+encodeURIComponent(shareTo()).replace(/%2C/g,",")+"?subject="+encodeURIComponent(shareSubject())+"&body="+encodeURIComponent(shareBody()), false));
$("sh-native").addEventListener("click",async()=>{
  try{ await navigator.share({files:[shareFile()], title:shareSubject(), text:shareBody()}); }catch(e){ if(e&&e.name!=="AbortError") say("Sharing didn't work here. Try Send with Gmail."); }
});
$("sh-img").addEventListener("click",async()=>{
  if(await copyCard()){ say("Picture copied. Paste it anywhere with Ctrl/⌘ + V."); sfx("copy"); }
  else { saveCard(); say("Saved the picture. Attach it to the email."); }
});
$("sh-save").addEventListener("click",()=>{ saveCard(); say("Saved daltrillion-score.png."); });
