/* =========================================================
   SETUP
   ========================================================= */
function renderSetup(){
  const pr=loadPrefs(); adminUnlocked=!!pr.admin; pSkin=Math.min(pr.skin|0, adminUnlocked?ADMIN_SKIN:ADMIN_SKIN-1); $("pname").value=pr.name||""; $("skincode").value=""; $("skinmsg").textContent="";
  drawSkins(); $("ptitle").dataset.wavy=""; wavy($("ptitle"),"Tiger Tailgate"); enter(document.querySelector("#psetup .panelw"));
  $("pnote").textContent="Friends open this same page and enter your code.";
  perr(""); show("psetup");
}
function drawSkins(){
  const box=$("cubs"); box.innerHTML="";
  SKINS.forEach((sk,i)=>{ if(sk.secret && !adminUnlocked) return;
    const b=document.createElement("button"); b.type="button"; b.className="cub"+(sk.secret?" secret":""); b.setAttribute("aria-pressed",String(i===pSkin)); b.setAttribute("aria-label",sk.name); b.title=sk.name;
    b.style.setProperty("--k",i); b.appendChild(skinCanvas(i)); const l=document.createElement("span"); l.textContent=sk.name; b.appendChild(l);
    b.onclick=()=>{ pSkin=i; [...box.children].forEach(x=>x.setAttribute("aria-pressed",String(x===b))); }; box.appendChild(b); });
}
function tryCode(){
  const v=$("skincode").value.trim().toUpperCase();
  if(v==="ADMIN"){ adminUnlocked=true; pSkin=ADMIN_SKIN; const pr=loadPrefs(); savePrefs({...pr,admin:1}); drawSkins(); $("skinmsg").textContent="Secret skin unlocked: Golden Ivan"; }
  else $("skinmsg").textContent = v ? "That code doesn't unlock anything." : "";
  $("skincode").value="";
}
const myName=()=>clip($("pname").value.trim(),16);

async function enterParty(code, asHost){
  const name=myName(); if(!name){ perr("Pick a name first."); $("pname").focus(); return; }
  const pr=loadPrefs(); savePrefs({...pr,name,skin:pSkin});
  perr("Connecting…");
  let conn;
  try{ conn=await connectRoom(code,asHost); }
  catch(e){
    const c=e&&e.code;
    perr(c==="taken" ? "That code is in use. Try hosting again for a new code."
      : c==="not_found" ? `No tailgate with code ${code}. Check the code with your host.`
      : c==="full" ? "That tailgate is full."
      : "Couldn't reach the Daltrillion server. Check your connection and try again.");
    return;
  }
  perr("");
  party={ws:conn.ws, code, me:conn.welcome.id, catalog:conn.welcome.catalog||[], st:null, pending:null, key:"", since:Date.now(),
    presence:{}, missSeen:{}, chat:[], emoteAt:{}, emoteT:0, celT:0, typingT:0, suggestion:null, ping:0};
  conn.ws.addEventListener("message",onServerMessage);
  conn.ws.addEventListener("close",onServerClose);
  party.ping=setInterval(()=>sendRoom({t:"ping"}),25000);
  sendRoom({t:"hello",name,skin:pSkin});
  sys(`You ${asHost?"started":"joined"} tailgate ${code}.`);
  render(true);
}

/* =========================================================
   TALKING TO THE ROOM
   The server runs the game: turns, the clock, lives, and whether an
   answer counts. This page sends what the player does and draws what
   the server says happened.
   ========================================================= */
function sendRoom(m){ if(party && party.ws.readyState===1) party.ws.send(JSON.stringify(m)); }
const isOwner=()=>!!(party&&party.st&&party.st.owner===party.me);
function onServerMessage(ev){
  if(!party) return;
  let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
  if(m.t==="state") onState(m.st);
  else if(m.t==="result") onResult(m);
  else if(m.t==="typing"){ party.presence[m.id]={typing:clip(m.text,40)}; renderLabels(); }
  else if(m.t==="miss"){ party.presence[m.id]={}; party.missSeen[m.id]={t:clip(m.text,40),at:performance.now()}; renderLabels(); setTimeout(renderLabels,2700); }
  else if(m.t==="chat") onChat(m);
  else if(m.t==="error" && m.code==="full") endParty("That tailgate is full.");
}
function onServerClose(){ if(party) endParty("Lost connection to the tailgate."); }
function logDiffs(prev,st){
  if(!prev) return;
  const was=new Set(Object.keys(prev.pl||{}).filter(id=>!prev.pl[id].gone)), now=new Set(Object.keys(st.pl).filter(id=>!st.pl[id].gone));
  for(const id of now) if(!was.has(id) && id!==party.me) sys(`${st.pl[id].n} joined`);
  for(const id of was) if(!now.has(id) && prev.pl[id]) sys(`${prev.pl[id].n} left`);
  if(st.owner!==prev.owner && st.owner===party.me && st.phase==="lobby") sys("You're the host now.");
  if(st.phase==="ready" && prev.phase!=="ready" && st.catInfo) sys(`Category ${st.catNo}: ${st.catInfo.label}`);
  if(st.last && (!prev.last || prev.last.n!==st.last.n || prev.last.by!==st.last.by) && st.last.by!==party.me) sfx("pass");
  if(st.pop && (!prev.pop || prev.pop.at!==st.pop.at)) sfx(st.pop.out?"out":"ring");
  if(st.phase==="final" && prev.phase!=="final") sfx(st.winner===party.me?"win":"results",2);
  if(st.pop && (!prev.pop || prev.pop.at!==st.pop.at)) sys(st.pop.out ? `⏱ ${st.pl[st.pop.id].n} ran out of time. They're out!` : `⏱ ${st.pl[st.pop.id].n} ran out of time and lost a life`);
  if(st.phase==="final" && prev.phase!=="final") sys(st.winner ? `🏆 ${st.pl[st.winner].n} won` : "Nobody survived");
}
function onState(d){
  if(!party || !d || typeof d!=="object") return;
  const prev=party.st; party.st=d;
  if(!prev || prev.seq!==d.seq) party.presence={};   // a new turn: nobody is typing yet
  if(d.phase==="play"||d.phase==="ready"){ const nd=performance.now()+(d.left|0); if(!prev||prev.seq!==d.seq||prev.phase!==d.phase||Math.abs(nd-(party.deadline||0))>700) party.deadline=nd; }
  logDiffs(prev,d); render();
}
function setTyping(v){
  if(!party) return; clearTimeout(party.typingTO);
  const now=Date.now(), go=()=>{ if(!party) return; party.typingT=Date.now(); sendRoom({t:"typing",text:v?clip(v,40):""}); };
  if(now-party.typingT<90 && v){ party.typingTO=setTimeout(go,100); return; }
  go();
}
/* Send what was typed; the server decides. take=true accepts the server's own "Did you mean". */
function tgSubmit(take){
  const st=party&&party.st; if(!st||st.phase!=="play"||st.holder!==party.me) return;
  if(party.pending && party.pending.seq===st.seq) return;
  const input=$("tginput").value.trim();
  if(!take && party.suggestion && input===party.suggestion.typed) take=true;
  if(!take && !input) return;
  party.pending={seq:st.seq,at:Date.now()};
  sendRoom({t:"answer",seq:st.seq,text:take?"":input,take:!!take});
  $("tgsend").disabled=true;
}
function onResult(m){
  if(!party || !party.pending || m.seq!==party.pending.seq) return;
  party.pending=null; $("tgsend").disabled=false;
  if(m.stale) return;
  if(m.ok){
    sfx("tier",m.tier); setTyping("");
    $("tginput").disabled=true; $("tgsend").disabled=true; $("tgdym").hidden=true; party.suggestion=null;
    $("tgmsg").textContent=m.fixed?`Autocorrected to ${m.name}. Passing…`:"Passing…";
    return;
  }
  const text = m.used ? `${m.used} was already said. Another!`
    : m.need ? `There's more than one ${m.need} in this grade. Add their last initial, like “${m.need} J”.`
    : m.needFull ? `“${m.needFull}” could be ${(m.opts||[]).join(" or ")}. Type the full first name.`
    : m.near ? "So close." : "Not on the list. Quick, another!";
  $("tgmsg").textContent=text; sfx(m.near?"near":"miss");
  party.suggestion=m.near?{typed:m.input,name:m.near}:null;
  if(m.near){ $("tgdym").innerHTML=`Did you mean <b>${esc(m.near)}</b>? <span class="mute small">press Enter</span>`; $("tgdym").hidden=false; } else $("tgdym").hidden=true;
  const f=$("tgdock"); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); $("tginput").select();
}

/* ---------- chat ---------- */
function sys(text){ addChat({sys:1,text}); }
function addChat(m){ if(!party) return; party.chat.push(m); if(party.chat.length>120) party.chat.shift(); renderChat(); }
function onChat(m){
  if(!party) return;
  const from=m.from, pl=party.st&&party.st.pl[from];
  const who=clip((pl&&pl.n)||"Someone",16);
  if(m.cel){ const st=party.st; if(st && st.phase==="final" && st.winner===from) startCelebration(); return; }
  if(typeof m.emote==="string" && EMOTE_IDS.has(m.emote)){
    party.emoteAt[from]={e:m.emote,at:performance.now()}; sfx("pop"); addChat({who,me:from===party.me,emote:m.emote});
    renderLabels(); setTimeout(renderLabels,2900); return; }
  if(typeof m.text==="string"){ if(from!==party.me) sfx("chat"); addChat({who, me:from===party.me, text:clip(m.text,140)}); }
}
function startCelebration(){
  const st=party.st, w=st.pl[st.winner]; if(!w) return;
  const losers=(st.seat||[]).filter(id=>id!==st.winner && st.pl[id]).map(id=>({skin:st.pl[id].k|0,name:st.pl[id].n}));
  playCelebration({skin:w.k|0,name:w.n},losers);
}
function renderChat(){
  const box=$("tglog"); const atBottom=box.scrollTop+box.clientHeight>=box.scrollHeight-20;
  box.innerHTML=party.chat.map(m=>m.sys?`<p class="sys">▸ ${esc(m.text)}</p>`:m.emote?`<p><b class="${m.me?"me":""}">${esc(m.who)}</b> ${emoCanvas(m.emote)}</p>`:`<p><b class="${m.me?"me":""}">${esc(m.who)}</b> ${esc(m.text)}</p>`).join("");
  drawEmotes();
  if(atBottom) box.scrollTop=box.scrollHeight;
}
function renderChatPlayers(){
  if(!party) return; const st=party.st;
  const list = st ? Object.keys(st.pl).filter(id=>!st.pl[id].gone).map(id=>({n:st.pl[id].n,k:st.pl[id].k,host:id===st.owner,me:id===party.me,spec:st.pl[id].spec})) : [];
  $("tgpcount").textContent=list.length;
  $("tgplist").innerHTML=list.map(p=>`<li>${esc(p.n)} <span class="mute">${(SKINS[p.k]||SKINS[0]).name}${p.host?" · host":""}${p.spec?" · watching":""}${p.me?" · you":""}</span></li>`).join("");
}

/* =========================================================
   RENDER
   ========================================================= */
const P=id=>(party.st&&party.st.pl[id])||{n:"Someone",k:0,h:0};
function render(force){
  if(!party) return; const st=party.st;
  showTailgate(true);
  $("tgcode").textContent=party.code; wavy($("tgcodebig"),party.code);
  renderChatPlayers();
  if(!st){
    $("tglobby").hidden=false; $("tgprompt").hidden=true; $("tgfinal").hidden=true; $("tgdock").hidden=true;
    $("tghostctl").hidden=true; $("tgwait").hidden=false;
    $("tgwait").textContent = "Joining the tailgate…";
    $("tgcat").textContent=""; $("tgstand").textContent="–";
    TG.pos=[]; renderLabels(); return;
  }
  const key=st.phase+":"+st.catNo+":"+st.seq; const fresh=force||key!==party.key; party.key=key;
  const alive=st.alive.length, total=(st.seat||[]).filter(id=>st.pl[id]).length;
  $("tgcat").textContent = st.phase==="lobby" ? "Lobby" : st.phase==="final" ? "Game over" : `Category ${st.catNo}`;
  $("tgstand").textContent = st.phase==="lobby" ? `${total}` : `${alive}/${total}`;
  $("tgstandlbl").textContent = st.phase==="lobby" ? "Players" : "Standing";
  layoutSeats();
  $("tglobby").hidden = st.phase!=="lobby";
  $("tgprompt").hidden = !(st.phase==="play"||st.phase==="pop"||st.phase==="ready");
  $("tgready").hidden = st.phase!=="ready";
  $("tgfinal").hidden = st.phase!=="final";
  $("tgdock").hidden = st.phase==="lobby" || st.phase==="final";
  $("tgring").hidden = st.phase!=="pop";
  if(st.phase==="lobby"){
    const h=isOwner(); $("tghostctl").hidden=!h; $("tgwait").hidden=h; $("tgwait").textContent="Waiting for the host to start…";
    [...$("tgseg").children].forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.n===st.hearts)));
    [...$("tgtimeseg").children].forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.s===(st.turnSec||6))));
    renderCatPicker();
    const n=(st.seat||[]).filter(id=>st.pl[id]&&!st.pl[id].gone).length;
    $("tgstart").disabled=n<2;
    $("tgstarthint").textContent = !(st.cats&&st.cats.length) ? "Pick at least one category." : n>=2 ? `${n} animals on the rocks. ${(st.turnSec||6)} seconds a turn.` : "Share the code. You need at least 2 players.";
    if(!(st.cats&&st.cats.length)) $("tgstart").disabled=true;
    return;
  }
  if(st.phase==="play"||st.phase==="pop"||st.phase==="ready"){
    const cat=st.catInfo||{label:"",prompt:""};
    if(st.phase==="ready"){ $("tgreadywho").textContent=st.holder===party.me?"You go":`${P(st.holder).n} goes`; if(party.readyKey!==st.catNo){ party.readyKey=st.catNo; enter($("tgready")); } }
    if($("tgcatlbl").textContent!==`Category ${st.catNo} · ${cat.label}`){ enter($("tgprompt")); enter($("tgcatlbl")); }
    $("tgcatlbl").textContent=`Category ${st.catNo} · ${cat.label}`;
    $("tgdock").classList.toggle("yours", st.phase==="play"&&st.holder===party.me);
    $("tgq").textContent=cat.prompt;
    $("tglast").innerHTML = st.last ? `${esc(P(st.last.by).n)} passed with <b>${esc(st.last.n)}</b> ${chip(st.last.t)}` : `▾ any answer passes · ${(st.turnSec||6)} seconds each · no repeats ▾`;
    $("tgused").innerHTML = st.used.length ? `<span class="flabel">Already said</span> ${st.used.map(n=>`<span>${esc(n)}</span>`).join(" · ")}` : "";
    const me=st.pl[party.me]; const mine=st.phase==="play"&&st.holder===party.me;
    $("tghearts").textContent = me ? `♥${me.h}` : "♥–";
    if(fresh){
      party.pending=null; $("tgdym").hidden=true; party.suggestion=null;
      $("tginput").value=""; setTyping("");
      if(mine){ sfx("turn"); $("tginput").disabled=false; $("tgsend").disabled=false; $("tginput").placeholder=`your turn! ${(st.turnSec||6)} seconds, everyone sees you typing…`; $("tgmsg").textContent="The lion's pointing at you. Answer fast!"; $("tginput").focus(); }
      else {
        $("tginput").disabled=true; $("tgsend").disabled=true;
        const spec=!me||me.spec, out=me&&me.out;
        $("tginput").placeholder = st.phase==="ready" ? "get ready… the clock hasn't started" : st.phase==="pop" ? "time's up…" : spec ? "you're in next game · watching…" : out ? "you're out · watching…" : `${P(st.holder).n} is up…`;
        $("tgmsg").textContent = st.phase==="pop" ? "" : st.phase==="ready" ? (st.holder===party.me?"▸ You go first. Get ready!":`▸ ${P(st.holder).n} goes first`) : `▸ ${P(st.holder).n} is up`;
      }
    }
    if(st.phase==="pop" && st.pop){
      const p=P(st.pop.id);
      $("tgringtext").textContent = st.pop.out ? `${p.n} is out!` : `${p.n} loses a life`;
      if(party.lastShake!==st.pop.at){ party.lastShake=st.pop.at; enter($("tgring")); $("tgring").style.animation="none"; void $("tgring").offsetWidth; $("tgring").style.animation=""; }
      if(party.lastRingSeen!==st.pop.at){ party.lastRingSeen=st.pop.at; TG.ringAt=performance.now(); }
    }
    return;
  }
  if(st.phase==="final"){
    const iWon=st.winner===party.me;
    const wt = st.winner ? (iWon ? "You win" : `${P(st.winner).n} wins`) : "Nobody survived";
    if($("tgwin").dataset.wavy!==wt){ wavy($("tgwin"),wt, iWon?3:0); enter($("tgfinal")); if(st.winner) confetti(); }
    $("tgwinsub").textContent = "last animal standing";
    const h=isOwner(); $("tgagain").hidden=!h; $("tgagainwait").hidden=h;
    $("tgcel").hidden=!iWon;
    renderLabels();
  }
}
/* The room picks boxes, not single questions: any of the four grades, and any of the three themes.
   Each new category is drawn from everything the ticked boxes cover. */
const catIds=g=>party.catalog.filter(c=>c.group===g).map(c=>c.id);
const catLabel=id=>(party.catalog.find(c=>c.id===id)||{label:id}).label;
function catSummary(ids){
  if(!ids.length) return "Nothing picked";
  const GR=catIds("grades"), TH=catIds("themes");
  const gr=ids.filter(c=>GR.includes(c)), th=ids.filter(c=>TH.includes(c));
  const parts=[];
  if(th.length) parts.push(th.map(catLabel).join(" + "));
  if(gr.length) parts.push(gr.length===GR.length?"all grades":gr.map(g=>catLabel(g).split(" ")[0]).join(", "));
  return parts.join(" · ");
}
function renderCatPicker(){
  const st=party.st, ids=st.cats||[], h=isOwner();
  $("catsum").textContent=catSummary(ids);
  $("tgcatsview").hidden=h; if(!h) $("tgcatsview").textContent="Categories: "+catSummary(ids);
  if(!h) return;
  const row=c=>{
    const empty=c.group==="themes" && !c.count;
    // Questions join Tailgate the day after their Daily (so nobody sees them early). Until then a theme can be empty.
    const sub=c.group==="themes" ? (empty?"unlocks after its first Daily":`${c.count} question${c.count===1?"":"s"}`) : "classmates' names";
    return `<label class="${empty?"off":""}"><input type="checkbox" data-c="${c.id}" ${ids.includes(c.id)?"checked":""} ${empty?"disabled":""}><span>${esc(c.label)}</span><small>${sub}</small></label>`;
  };
  const group=(g,title)=>{ const rows=party.catalog.filter(c=>c.group===g); return rows.length?`<div class="grp">${title} <button type="button" data-all="${g}">all</button></div>${rows.map(row).join("")}`:""; };
  const html=group("themes","Questions")+group("grades","Grades");
  const sig=ids.join(",")+"|"+party.catalog.map(c=>c.count).join(",");
  if($("catmenu").dataset.sig!==sig){ $("catmenu").innerHTML=html; $("catmenu").dataset.sig=sig; }
}
function tgTick(){
  if(!party||!party.st){ return; }
  const st=party.st, show=st.phase==="play"||st.phase==="ready";
  $("tgclock").hidden=!show; $("tgbar").hidden=!show;
  if(show){
    const left=Math.max(0,(party.deadline||0)-performance.now()), sec=Math.ceil(left/1000), frac=Math.min(1,left/(st.phase==="ready"?5000:turnMs()));
    if(st.phase==="ready"){ $("tgreadyn").textContent=sec; if(party.readySec!==sec){ party.readySec=sec; if(sec>0) sfx("ready"); } }
    else party.readySec=null;
    $("tgclock").querySelector("span").textContent = st.phase==="ready" ? "until start" : "sec left";
    if($("tgsecs").textContent!==String(sec)) $("tgsecs").textContent=sec;
    $("tgclock").classList.toggle("low",sec<=2); $("tgbar").classList.toggle("low",sec<=2);
    $("tgbarfill").style.transform=`scaleX(${frac})`;
    $("tghearts").style.setProperty("--tgp",frac.toFixed(3)); $("tghearts").style.setProperty("--tgc",sec<=2?"#FF5A5A":"#FF9A4D");
  } else { $("tghearts").style.setProperty("--tgp","0"); }
}
setInterval(tgTick,100);
function showTailgate(on){
  if(on && $("tg").hidden && innerWidth<900){ $("tgchat").classList.add("off"); $("tg").classList.add("nochat"); $("tgchattoggle").setAttribute("aria-pressed","false"); }
  $("tg").hidden=!on; $("ui").hidden=on;
  SC.tg=on;
  if(!on){ $("tglabels").innerHTML=""; }
}
function endParty(msg){
  if(!party) return; const p=party; party=null;
  clearInterval(p.ping); clearTimeout(p.typingTO);
  try{ p.ws.close(1000,"left"); }catch(e){}
  showTailgate(false); TG.pos=[];
  if(msg){ renderSetup(); perr(msg); } else renderIntro();
}

/* ---------- events ---------- */
$("party").addEventListener("click",renderSetup);
$("pback").addEventListener("click",renderIntro);
$("phost").addEventListener("click",()=>{ let c=""; for(let i=0;i<4;i++) c+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]; enterParty(c,true); });
$("pjoin-form").addEventListener("submit",e=>{ e.preventDefault(); const c=$("pcode").value.toUpperCase().replace(/[^A-Z]/g,""); if(c.length!==4){ perr("Tailgate codes are 4 letters."); return; } enterParty(c,false); });
$("skinform").addEventListener("submit",e=>{ e.preventDefault(); tryCode(); });
$("tgseg").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b||!isOwner()) return; sendRoom({t:"settings",hearts:+b.dataset.n}); });
$("tgstart").addEventListener("click",()=>sendRoom({t:"start"}));
$("tgtimeseg").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b||!isOwner()) return; sendRoom({t:"settings",turnSec:+b.dataset.s}); });
$("catmenu").addEventListener("change",e=>{ const c=e.target.dataset&&e.target.dataset.c; if(!c||!isOwner()) return; const set=new Set(party.st.cats||[]);
  if(e.target.checked) set.add(c); else set.delete(c); sendRoom({t:"settings",cats:[...set]}); });
$("catmenu").addEventListener("click",e=>{ const b=e.target.closest("button[data-all]"); if(!b||!isOwner()) return;
  const grp=party.catalog.filter(c=>c.group===b.dataset.all && (c.group!=="themes"||c.count)).map(c=>c.id);
  const set=new Set(party.st.cats||[]); const allOn=grp.every(c=>set.has(c)); grp.forEach(c=>allOn?set.delete(c):set.add(c)); sendRoom({t:"settings",cats:[...set]}); });
document.addEventListener("click",e=>{ const d=$("catpick"); if(d.open && !e.composedPath().includes(d)) d.open=false; });
$("tgagain").addEventListener("click",()=>sendRoom({t:"again"}));
[$("tgleave"),$("tgleave2"),$("tgleave3")].forEach(b=>b&&b.addEventListener("click",()=>endParty()));
$("tgcopy").addEventListener("click",()=>{ const t=party?party.code:""; const ok=()=>$("tgcopied").textContent="Copied."; try{ navigator.clipboard.writeText(t).then(ok,()=>$("tgcopied").textContent="Select the code and copy it."); }catch(e){ $("tgcopied").textContent="Select the code and copy it."; } });
$("tgform").addEventListener("submit",e=>{ e.preventDefault(); tgSubmit(); });
$("tginput").addEventListener("input",e=>{ const st=party&&party.st; if(st&&st.phase==="play"&&st.holder===party.me) setTyping(e.target.value); });
$("tgdym").addEventListener("click",()=>{ if(party&&party.suggestion) tgSubmit(true); });
$("emogrid").innerHTML=EMOTES.map(e=>`<button type="button" data-e="${e.id}" title="${esc(e.name)}" aria-label="${esc(e.name)}">${emoCanvas(e.id)}</button>`).join("");
$("emobtn").addEventListener("click",()=>{ const g=$("emogrid"); g.hidden=!g.hidden; $("emobtn").setAttribute("aria-expanded",String(!g.hidden)); drawEmotes(); });
$("emogrid").addEventListener("click",e=>{ const b=e.target.closest("button[data-e]"); if(!b||!party) return;
  if(Date.now()-party.emoteT<1200) return; party.emoteT=Date.now();
  sendRoom({t:"emote",e:b.dataset.e}); $("emogrid").hidden=true; $("emobtn").setAttribute("aria-expanded","false"); });
$("tgcel").addEventListener("click",()=>{ if(!party||Date.now()-party.celT<9000) return; party.celT=Date.now(); sendRoom({t:"cel"}); });
$("celskip").addEventListener("click",closeCelebration);
$("tgchatform").addEventListener("submit",e=>{ e.preventDefault(); const v=clip($("tgchatin").value.trim(),140); if(!v||!party) return; sendRoom({t:"chat",text:v}); $("tgchatin").value=""; });
$("tgchattoggle").addEventListener("click",()=>{ const c=$("tgchat"); c.classList.toggle("off"); $("tg").classList.toggle("nochat",c.classList.contains("off")); $("tgchattoggle").setAttribute("aria-pressed",String(!c.classList.contains("off"))); TG.bgKey=""; layoutSeats(); });
addEventListener("resize",()=>{ if(party){ TG.bgKey=""; layoutSeats(); } });
