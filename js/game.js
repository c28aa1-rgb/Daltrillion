/* =========================================================
   UI
   ========================================================= */
const SCALE_ORDER=["C","T","P","R","D","W"];
let game=null, timerRaf=0, deadline=0, distShown=0, distRaf=0;

function wavy(el,text,alt=0){
  if(!el) return; if(el.dataset.wavy===text) return; el.dataset.wavy=text;
  el.classList.add("wavy"); el.setAttribute("aria-label",text);
  el.innerHTML=[...text].map((c,i)=>c===" "?'<span class="sp" aria-hidden="true"> </span>':`<span class="ch${i<alt?" alt":""}" style="--i:${i}" aria-hidden="true">${esc(c)}</span>`).join("");
}
function enter(el){ if(!el) return; el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
function countUp(el,to,suffix){
  const t0=performance.now(), dur=reduced?0:1100;
  const step=now=>{ const k=dur?Math.min(1,(now-t0)/dur):1, v=Math.round(to*(1-Math.pow(1-k,3)));
    el.innerHTML=`${fmt(v)}<small>${suffix}</small>`; if(k<1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function confetti(){
  if(reduced) return; const box=$("confetti"); box.innerHTML="";
  const cols=["#F26A1B","#FF9A4D","#FBFBF8","#1F5FD6","#A9C6FF","#FFD84D"];
  for(let i=0;i<70;i++){ const e=document.createElement("i"); e.style.left=(Math.random()*100)+"vw"; e.style.background=cols[i%cols.length];
    e.style.animationDuration=(1.8+Math.random()*1.8)+"s"; e.style.animationDelay=(Math.random()*.8)+"s"; box.appendChild(e); }
  setTimeout(()=>{ box.innerHTML=""; },4200);
}
function buildTitle(){
  const t=$("title"), word="Daltrillion";
  t.innerHTML=[...word].map((c,i)=>`<span class="ch${i<3?" dal":""}" style="--i:${i}" aria-hidden="true">${c}</span>`).join("");
}
function drawIcons(){
  document.querySelectorAll(".micon").forEach(cv=>{
    const g=cv.getContext("2d"); g.clearRect(0,0,cv.width,cv.height);
    const k=cv.dataset.icon;
    if(k==="daily"){ // a calendar page with a paw print
      g.fillStyle="#0B0B0D"; g.fillRect(3,3,16,15); g.fillStyle="#FBFBF8"; g.fillRect(4,6,14,11);
      g.fillStyle="#1F5FD6"; g.fillRect(4,4,14,3); g.fillStyle="#0B0B0D"; g.fillRect(7,2,1,3); g.fillRect(14,2,1,3);
      g.fillStyle="#F26A1B"; g.fillRect(10,11,3,3); g.fillRect(8,9,1,1); g.fillRect(10,8,1,1); g.fillRect(12,8,1,1); g.fillRect(14,9,1,1);
    } else if(k==="board"){ // a three-step podium with a star over first place
      g.fillStyle="#0B0B0D"; g.fillRect(1,9,21,10);
      g.fillStyle="#A9C6FF"; g.fillRect(2,12,6,6); g.fillStyle="#FFD84D"; g.fillRect(8,9,7,9); g.fillStyle="#F26A1B"; g.fillRect(15,13,6,5);
      g.fillStyle="#0B0B0D"; g.fillRect(11,11,1,4); g.fillRect(4,14,2,1); g.fillRect(17,15,2,1);
      g.fillStyle="#FBFBF8"; g.fillRect(11,2,1,5); g.fillRect(9,4,5,1); g.fillRect(10,3,3,3);
    } else if(k==="practice"){ drawAnimal(g,0,4,3,0,{still:true}); }
    else if(k==="tailgate"){ // the lion's face
      const C={k:"#0B0B0D",m:"#A9461A",f:"#F2A44A",b:"#E8973A",w:"#FBEBD0",e:"#0B0B0D"};
      LION.slice(0,11).forEach((row,r)=>{ for(let c=0;c<row.length;c++){ const ch=row[c]; if(ch==="."||!C[ch]) continue; g.fillStyle=C[ch]; g.fillRect(1+c,4+r,1,1); } });
      g.fillStyle="#FF9A4D"; g.fillRect(1,1,2,2); g.fillStyle="#FBFBF8"; g.fillRect(19,2,2,2);
    }
  });
}
let CATALOG=null;   // {day, prompts, tailgate:[{id,label,group}]} from the server: labels and counts only
async function loadCatalog(){
  const c=await api("catalog");
  if(c && !c.error){ CATALOG=c; $("sub").textContent=TRY?"Test run · not counted anywhere":c.day?`Daily Prowl #${c.day} · ${c.special==="timeline"?"Timeline Tuesday":"The Dalton rare-answer game"}`:"The Dalton rare-answer game"; if(!$("intro").hidden) renderIntro(); }
  renderLbLine();
  return CATALOG;
}
function renderStatic(){
  buildTitle(); drawIcons();
  $("sub").textContent="The Dalton rare-answer game";
  $("tiers").innerHTML=SCALE_ORDER.map(t=>`<span class="chip t-${t}" title="${esc(TIERS[t].blurb)}">${TIERS[t].name}<span>${TIERS[t].pts}</span></span>`).join("");
  $("segs").innerHTML=Array.from({length:SECONDS},()=>"<i></i>").join("");
}
function show(which){
  for(const id of ["intro","play","results","psetup","board"]) $(id).hidden = id!==which;
  if(which==="psetup") setEra(false);   // the party jungle stays its usual self
  const inParty=false;
  $("brand").hidden = which==="intro";
  $("trail").hidden = which!=="play";
  $("phud").hidden = true;
  $("quit").hidden = which==="intro" || which==="psetup";
  if(which!=="results") $("res-board").hidden=true;
  $("quit").textContent = which==="play" ? "Quit" : "Home";
  $("dock").hidden = which!=="play";
  $("fine").hidden = which!=="intro";
  if(!inParty) setRacers(null);
  $("ui").scrollTop=0;
}
/* Testing on your own computer: replay today's Daily as often as you like. Never shown on the real site.
   (The leaderboard still only keeps your first finish of the day.) */
const IS_LOCAL=["localhost","127.0.0.1"].includes(location.hostname);
/* An admin's test run of some day's Daily: the admin Schedule's Play button opens ?try=<ticket>&day=YYYY-MM-DD.
   Same questions and rules; nothing is saved, counted or put on the leaderboard. */
const TRY=(()=>{ const p=new URLSearchParams(location.search), t=p.get("try"); return /^[0-9a-f]{32}$/.test(t||"") ? {ticket:t, day:/^\d{4}-\d{2}-\d{2}$/.test(p.get("day")||"")?p.get("day"):"", what:clip(p.get("what")||"",60)} : null; })();
function devReplay(){ const s=load(); delete s.daily; save(s); startGame("daily"); }
/* localhost only: see the reveal for any tier without playing ("Preview reveals" on the title screen, or ?preview=W). */
const PREVIEW_ANSWER={W:"Underwater Robotics",D:"Model UN",R:"Chess Club",P:"Debate",T:"Mock Trial",C:"Robotics"};
function previewReveal(t){
  if(!TIERS[t]) return;
  cancelAnimationFrame(timerRaf);
  game={mode:"practice", round:null, day:null, total:7, preview:true, answers:[], misses:[], suggestion:null, busy:false,
    prompt:{i:2, total:7, label:"Clubs (preview)", prompt:"Name a Dalton club.", note:"", kind:"list"}};
  distShown=0; $("dist").textContent="0 M";
  show("play"); prowlTo(0);
  $("plaque").hidden=true; $("dock").hidden=true;
  const name=PREVIEW_ANSWER[t];
  showReveal(t==="X" ? {cat:"preview", label:"Clubs", input:"", name:null, role:"", tier:"X", fixed:false, misses:2}
    : {cat:"preview", label:"Clubs", input:name.toLowerCase(), name, role:"", tier:t, fixed:false, misses:0});
}
function renderIntro(){
  const s=load(); const done=s.daily && s.daily.date===todayKey();
  $("devreplay").hidden=!(IS_LOCAL && done);
  $("devpreview").hidden=!IS_LOCAL;
  setEra(!!(CATALOG && CATALOG.special==="timeline" && !TRY));
  $("start-label").textContent = done ? "Today's Prowl" : "Daily Prowl";
  $("start-desc").textContent = done ? `Done for today · see your ${fmt(((s.daily.answers||[]).reduce((a,x)=>a+TIERS[x.tier].pts,0))*M_PER_PT)} m prowl`
    : CATALOG && !CATALOG.prompts ? `No Daily today${CATALOG.next?` · next one ${nextDay(CATALOG.next)}`:" · check back soon"}`
    : CATALOG && CATALOG.special==="timeline" ? `Timeline Tuesday · guess the year of ${CATALOG.prompts} moments in Dalton history`
    : `${CATALOG?CATALOG.prompts+" prompts":"Today's prompts"} · one shot per day`;
  $("prac-desc").textContent = CATALOG && !CATALOG.practice ? "Opens once Daily questions retire" : "Random questions, as many rounds as you want";
  $("start").onclick = done ? ()=>showResults(s.daily.answers,"daily",s.daily.round,s.daily.day) : ()=>startGame("daily");
  if(TRY){
    $("start-label").textContent="Test run";
    $("start-desc").textContent = TRY.what ? `${TRY.what} · not counted anywhere`
      : `The Daily for ${TRY.day?new Date(TRY.day+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}):"another day"} · not counted anywhere`;
    $("start").onclick=()=>startGame("try");
  }
  show("intro"); prowlTo(0);
}
/* "Monday" for the next few days, "Mon, Nov 16" further out. */
function nextDay(key){
  const d=new Date(key+"T12:00:00"), days=Math.round((d-new Date(todayKey()+"T12:00:00"))/864e5);
  return days===1 ? "tomorrow" : days<=6 ? d.toLocaleDateString("en-US",{weekday:"long"}) : d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}
/* "There's no Daily Prowl today. The next one is Monday." when one is scheduled. */
function noDailyMsg(){
  const n=CATALOG&&CATALOG.next, when=n&&nextDay(n);
  return n ? `There's no Daily Prowl today. The next one is ${when}.` : "There's no Daily Prowl today. Check back soon.";
}
const totalPts=ans=>ans.reduce((s,a)=>s+TIERS[a.tier].pts,0);
function setDist(m){
  cancelAnimationFrame(distRaf);
  const from=distShown,t0=performance.now();
  const step=now=>{ const k=reduced?1:Math.min(1,(now-t0)/900); const v=Math.round(from+(m-from)*(1-Math.pow(1-k,3)));
    $("dist").textContent=`${fmt(v)} M`; if(k<1) distRaf=requestAnimationFrame(step); else distShown=m; };
  distRaf=requestAnimationFrame(step);
}
function nodesHTML(total,answers,cur){
  return Array.from({length:total},(_,k)=>{ const a=answers[k]; return `<span class="node ${a?"t-"+a.tier:(k===cur?"now":"")}"></span>`; }).join("");
}
/* Practice remembers which questions this browser has already played, so new rounds skip them until
   the whole pool has come up (the server then says `reset` and the list starts over). */
const SEEN_KEY="daltrillion-practice-seen";
function practiceSeen(){ try{ const v=JSON.parse(localStorage.getItem(SEEN_KEY)); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
function markSeen(id){ if(!id) return; try{ const v=practiceSeen().filter(x=>x!==id); v.push(id); localStorage.setItem(SEEN_KEY,JSON.stringify(v.slice(-400))); }catch(e){} }
/* Solo rounds run on the server: it picks the prompts, keeps the clock and judges every guess.
   This page only knows the prompt it's on and what each guess turned out to be. */
async function startGame(mode){
  if(game && game.busy) return;
  introError("");
  const r=await api("round/start",mode==="try"?{mode:"daily",try:TRY&&TRY.ticket}:mode==="daily"?{mode,player:playerId()}:{mode,seen:practiceSeen()});
  if(r.error==="try_expired"){ introError("This test link has expired. Open it again from the admin Schedule."); return; }
  if(r.error==="no_daily"){ await loadCatalog(); introError(noDailyMsg()); return; }
  if(r.error==="no_practice"){ introError("Practice opens once the first Daily questions retire."); return; }
  if(r.error||!r.prompt){ introError(OFFLINE_MSG); return; }
  if(r.mode==="practice" && r.reset){ try{ localStorage.setItem(SEEN_KEY,"[]"); }catch(e){} }
  game={mode:r.mode, round:r.round, day:r.day, total:r.prompt.total, prompt:r.prompt, answers:[], misses:[], suggestion:null, busy:false};
  distShown=0; $("dist").textContent="0 M";
  show("play"); prowlTo(0); nextPrompt();
}
/* A short message under the title screen's buttons ("There's no Daily Prowl today…"). It fades away after a few seconds. */
let introErrT=0;
function introError(msg){
  const e=$("introerr"); if(!e) return;
  clearTimeout(introErrT);
  e.classList.remove("fade"); e.textContent=msg; e.hidden=!msg;
  if(msg) introErrT=setTimeout(()=>{ e.classList.add("fade"); introErrT=setTimeout(()=>{ e.hidden=true; e.classList.remove("fade"); },400); },5000);
}
function nextPrompt(){
  const p=game.prompt;
  if(game.mode==="practice") markSeen(p.cat);
  game.misses=[]; game.suggestion=null;
  $("nodes").innerHTML=nodesHTML(game.total,game.answers,p.i);
  $("cat").textContent=`${p.label} · ${p.i+1} of ${p.total}`;
  $("prompt").textContent=p.prompt;
  $("note").textContent=p.note||"";
  $("nope").textContent=""; $("dym").hidden=true; $("misses").innerHTML="";
  enter($("plaque")); enter($("dock"));
  $("plaque").hidden=false; $("reveal").hidden=true; $("dock").hidden=false; $("bellinfo").hidden=true; $("ring").hidden=true; $("clock").hidden=false;
  // Timeline questions (Timeline Tuesday): one guess at the year, the closer the better.
  const tl=p.kind==="timeline";
  setEra(tl);
  $("hint").textContent = tl ? "▸ one guess: the closer the year, the farther Ivan prowls" : "▸ the rarer the answer, the farther Ivan prowls";
  $("answer").placeholder = tl ? "type a year…" : "type an answer…";
  $("answer").inputMode = tl ? "numeric" : "text"; $("answer").maxLength = tl ? 4 : 80;
  $("answer").value=""; $("answer").disabled=false; $("pounce").disabled=false;
  $("answer").focus();
  deadline=performance.now()+(p.seconds||SECONDS)*1000;
  sfx("next");
  cancelAnimationFrame(timerRaf); tick();
}
function tick(){
  const left=Math.max(0,deadline-performance.now());
  const s=Math.ceil(left/1000);
  if($("secs").textContent!==String(s)){
    $("secs").textContent=s;
    if(s>0 && s<=5) sfx(s<=3?"tickHi":"tick");
    const segs=$("segs").children; for(let i=0;i<segs.length;i++) segs[i].classList.toggle("off",i>=s);
    $("clock").classList.toggle("low",s<=5);
  }
  // Time's up. If a guess is still on its way to the server, let it land first.
  if(left<=0 && !(game&&game.busy)){ submit(true); return; }
  timerRaf=requestAnimationFrame(tick);
}
async function submit(timeout,forced){
  if(!game || game.busy || $("answer").disabled) return;
  // Pressing Enter again on the same text takes the "Did you mean" suggestion.
  if(!forced && game.suggestion && $("answer").value.trim()===game.suggestion.typed) forced=game.suggestion;
  const input=forced?forced.typed:$("answer").value.trim();
  if(!timeout && !input) return;
  const g=game; g.busy=true; $("pounce").disabled=true;
  const res = timeout ? await api("round/timeout",{round:g.round}) : await api("round/guess",{round:g.round, text:input, take:!!forced});
  g.busy=false;
  if(game!==g) return;            // quit while the server was answering
  $("pounce").disabled=false;
  if(res.error){
    if(res.error==="too_many"){ $("nope").textContent="▸ That's a lot of guesses. Wait for the clock."; return; }
    $("nope").textContent = res.error==="expired" ? "▸ This round expired. Head home and start a new one." : "▸ "+OFFLINE_MSG;
    if(timeout) setTimeout(()=>{ if(game===g) submit(true); },1500);   // keep trying to close out the prompt
    return;
  }
  if(!res.ok && res.notYear){ $("nope").textContent="▸ Type a year, like 1965."; $("answer").select(); return; }
  if(!res.ok){
    const key=input.toLowerCase();
    if(!g.misses.includes(key)) g.misses.push(key);
    $("misses").innerHTML=g.misses.map(m=>`<s>${esc(m)}</s>`).join("");
    const near=res.near||null;
    g.suggestion=near?{typed:input,name:near}:null;
    $("nope").textContent = near ? "▸ So close." : "▸ Not on the list. Keep guessing.";
    sfx(near?"near":"miss");
    if(near){ $("dym").innerHTML=`Did you mean <b>${esc(near)}</b>? <span class="mute small">press Enter</span>`; $("dym").hidden=false; } else $("dym").hidden=true;
    const f=$("dock"); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
    $("answer").select();
    return;
  }

  showReveal(res.answer);
}
/* The tier reveal after an answer counts (or time runs out). */
function showReveal(a){
  const g=game;
  cancelAnimationFrame(timerRaf);
  const tier=a.tier, p=g.prompt;
  g.answers.push(a);
  $("answer").disabled=true; $("pounce").disabled=true;
  const m=totalPts(g.answers)*M_PER_PT;
  $("nodes").innerHTML=nodesHTML(g.total,g.answers,-1);
  prowlTo(m,tier);
  // The distance counter waits for Ivan's wind-up, so a Paper Tiger's big build-up doesn't give itself away.
  const mv=MOVES[tier], waitMs=reduced||!mv?0:mv.wind+(mv.hold||0);
  if(waitMs) setTimeout(()=>{ if(game===g) setDist(m); },waitMs); else setDist(m);

  const pts=TIERS[tier].pts;
  sfx(a.name?"tier":"timeout", tier);
  $("banner").className="banner t-"+tier;
  const rt=$("r-tier"); rt.dataset.wavy=""; wavy(rt,TIERS[tier].name); enter($("reveal"));
  $("r-pts").textContent = `+${pts}`;
  $("r-count").textContent=`${p.label} · ${p.i+1} of ${p.total}`;
  const misses=a.misses;
  $("r-match").innerHTML = a.kind==="timeline"
    ? (a.guessYear!=null ? `You said ${a.guessYear}. It was <b>${a.year}</b>${a.off?` · ${a.off} year${a.off>1?"s":""} off`:" · exactly right"}.` : `Time ran out. It was <b>${a.year}</b>.`)
    : a.name
    ? `“${esc(a.input)}” ${a.fixed?"autocorrected to":"counted as"} <b>${esc(a.name)}</b>${a.role?` <span class="mute">· ${esc(a.role)}</span>`:""}`
    : (misses ? `Time ran out after ${misses} wrong guess${misses>1?"es":""}.` : "Time ran out.");
  $("r-blurb").textContent = a.kind==="timeline" && a.fact ? a.fact : TIERS[tier].blurb;
  $("r-dist").textContent = pts ? `Ivan prowls ${fmt(pts*M_PER_PT)} m to ${fmt(m)} m · ${ZONES[zoneIndex(m)][1]}` : `Ivan holds at ${fmt(m)} m.`;
  $("r-next").textContent = g.preview ? "Back ▸" : p.i===p.total-1 ? "See my prowl ▸" : "Next prompt ▸";
  $("plaque").hidden=true; $("dock").hidden=true; $("reveal").hidden=false;
  $("r-next").focus();
}
async function advance(){
  if(game && game.preview){ game=null; renderIntro(); return; }
  if(!game || game.busy) return;
  const g=game; g.busy=true; $("r-next").disabled=true;
  const r=await api("round/next",{round:g.round});
  g.busy=false; $("r-next").disabled=false;
  if(game!==g) return;
  if(r.prompt){ g.prompt=r.prompt; nextPrompt(); return; }
  if(r.done){ finish(r.summary); return; }
  $("r-dist").textContent = r.error==="expired" ? "This round expired. Head home and start a new one." : OFFLINE_MSG;
}
function finish(summary){
  const g=game, answers=summary.answers;
  if(g.mode==="daily"){
    const s=load(), tk=todayKey(); const y=new Date(); y.setDate(y.getDate()-1);
    const pts=totalPts(answers);
    s.streak = s.lastDate===todayKey(y) ? (s.streak||0)+1 : (s.lastDate===tk ? (s.streak||1) : 1);
    s.lastDate=tk; s.best=Math.max(s.best||0,pts); s.played=(s.played||0)+1;
    s.daily={date:tk,day:summary.day,round:g.round,answers}; save(s);
  }
  game=null;
  showResults(answers,g.mode,g.round,summary.day);
  // Carry over a name from Tiger Tailgate so the leaderboard shows it.
  if(g.mode==="daily"){ const nm=loadPrefs().name; if(nm && !(BOARD.data && BOARD.data.name===nm)) saveBoardName(nm).then(renderBoardCard); }
}
function showResults(answers,mode,round,day){
  const dayNo=day||dayNumber();
  show("results");
  $("replay").hidden=!((IS_LOCAL && mode==="daily") || mode==="try");
  $("replay").textContent = mode==="try" ? "Run it again" : "Replay (localhost)";
  $("replay").onclick = mode==="try" ? ()=>startGame("try") : devReplay;
  const pts=totalPts(answers), m=pts*M_PER_PT, s=load(), zi=zoneIndex(m);
  setEra(answers.length>0 && answers.every(a=>a.kind==="timeline"));
  prowlTo(m);
  $("res-label").textContent = mode==="try" ? (TRY&&TRY.what ? "Test run · complete" : `Test run · Daily Prowl #${dayNo}`) : mode==="daily" ? `Daily Prowl #${dayNo} · complete` : "Practice round · complete";
  countUp($("res-m"),m,"M");
  sfx("results",zi);
  $("res-zone").dataset.wavy=""; wavy($("res-zone"),`Reached ${ZONES[zi][1]}`,7);
  enter(document.querySelector("#results .res"));
  if(mode==="daily") renderBoardCard();
  SHARE.answers=answers; $("sharebtn").hidden=mode!=="daily";
  $("stats").innerHTML=`<span>${pts} of ${answers.length*100} pts</span><span>Streak <b>${s.streak||0}</b></span><span>Best <b>${fmt((s.best||0)*M_PER_PT)} m</b></span><span>Daily prowls <b>${s.played||0}</b></span>`;
  $("res-nodes").innerHTML=answers.map(a=>`<span class="node t-${a.tier}"></span>`).join("");
  // Copied text: a block-character skyline, one bar per prompt. On screen: the same thing as pixel bars.
  const label=mode==="daily"?`Daily #${dayNo}`:mode==="try"?"Test run":"Practice";
  $("share-text").textContent=`Daltrillion · ${label}\n${answers.map(a=>TIERS[a.tier].bar).join("")}\n${fmt(m)} m · ${ZONES[zi][1]}`;
  $("share-text").hidden=true;
  const card=$("share-card");
  card.innerHTML=`<div class="sc-head"><span class="sc-title">Daltrillion</span><span class="sc-tag">${label}</span></div>
    <div class="sc-bars">${answers.map((a,k)=>`<i class="t-${a.tier}" style="--h:${Math.max(6,TIERS[a.tier].pts)}%;--k:${k}" title="${k+1}. ${esc(TIERS[a.tier].name)}"></i>`).join("")}</div>
    <div class="sc-foot"><b>${fmt(m)} m</b><span>${esc(ZONES[zi][1])}</span></div>`;
  card.querySelector(".sc-head").prepend(skinCanvas(0));
  card.setAttribute("aria-label",`${label}: ${fmt(m)} meters, reached ${ZONES[zi][1]}`);
  $("copied").hidden=true;
  $("rows").innerHTML=answers.map((a,k)=>{
    return `<div class="row enter" style="--r:${k}">
      <div class="row-main">
        <span class="n">${k+1}</span>
        <div style="min-width:0">
          <div class="q">${esc(a.label||a.cat)}</div>
          <div class="a">${a.input?esc(a.input):"No answer"}</div>
          <div class="c">${a.kind==="timeline" ? (a.guessYear!=null?`It was ${a.year}${a.off?` · ${a.off} off`:" · exact"}`:`Out of time · it was ${a.year}`)
            : `${a.name?`${a.fixed?"Autocorrected to":"Counted as"} ${esc(a.name)}`:(a.input?"Not on the list":"Out of time")}${a.misses?` · ${a.misses} miss${a.misses>1?"es":""} first`:""}`}</div>
        </div>
        <div class="row-r">${chip(a.tier)}<span class="p">+${TIERS[a.tier].pts}</span></div>
      </div>
    </div>`;
  }).join("");
}
