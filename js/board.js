/* =========================================================
   LEADERBOARD
   The server keeps each player's first finished Daily Prowl of the day.
   A player is a random id this browser made up (see playerId in api.js)
   plus an optional name, the same one Tiger Tailgate uses.
   ========================================================= */
const BOARD={data:null, tab:"today", at:0};
const ordinal=n=>{ const s=["th","st","nd","rd"], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
const meters=pts=>`${fmt(pts*M_PER_PT)} m`;

async function loadBoard(force){
  if(!force && BOARD.data && Date.now()-BOARD.at<15000) return BOARD.data;
  await ensurePlayer();
  const b=await api("board?player="+encodeURIComponent(playerId()||""));
  if(b && !b.error){ BOARD.data=b; BOARD.at=Date.now(); syncName(b); }
  return BOARD.data;
}
/* One name for the leaderboard and Tiger Tailgate. The server's copy wins (an admin may have renamed you);
   a name you only ever typed into Tailgate gets sent to the board once. */
function syncName(b){
  const pr=loadPrefs();
  if(b.name && b.name!==pr.name) savePrefs({...pr,name:b.name});
  else if(!b.name && pr.name && !BOARD.synced){ BOARD.synced=true; saveBoardName(pr.name); }
}
/* Names follow the same rules as the casino game (checked on the server): 2-20 letters, numbers
   and . _ ' -, nothing rude, nobody else's. Only a name the server accepted is remembered. */
async function saveBoardName(name){
  const r=await apiAs("board/name",{name});
  if(r && r.ok){ const pr=loadPrefs(); savePrefs({...pr,name:r.name}); if(BOARD.data) BOARD.data.name=r.name; }
  return r;
}
const nameResult=(r,ok)=>!r||r.error==="offline"||(!r.ok&&!r.message) ? OFFLINE_MSG : r.ok ? ok(r.name) : r.message;

/* The line under the title screen's Leaderboard button: how you did last time, or today so far. */
async function renderLbLine(){
  const b=await loadBoard(); if(!b) return;
  const last=b.last, today=b.today;
  $("lbline").textContent =
    today&&today.me ? `Today: ${ordinal(today.me.rank)} of ${today.players} so far`
    : last&&last.me ? `Daily #${last.number}: you were ${ordinal(last.me.rank)} of ${last.players}`
    : today ? `${today.players} prowler${today.players===1?"":"s"} so far today`
    : "Today's farthest prowls";
}

function histHTML(day,score){
  const top=Math.max(...day.hist,1), mine=score==null?-1:Math.min(9,Math.floor(score*10/(day.max+1)));
  return `<div class="lbhist" aria-hidden="true">${day.hist.map((n,i)=>`<i class="${i===mine?"me":""}" style="--h:${Math.max(n?8:0,Math.round(100*n/top))}%"></i>`).join("")}</div>
    <div class="lbaxis" aria-hidden="true"><span>0 m</span><span>${meters(day.max)}</span></div>`;
}
function topHTML(rows,unit,me){
  if(!rows.length) return `<p class="mute">Nobody yet.</p>`;
  // Equal scores share a place (3, 3, 5); the earlier finish is listed first.
  const place=i=>{ let k=i; while(k>0 && rows[k-1].score===rows[i].score) k--; return k+1; };
  const row=(r,rk)=>`<li class="${r.me?"me":""}"><span class="rk p${rk}">${rk}</span>
    <span class="nm">${r.name?esc(r.name):'<span class="anon">Anonymous cub</span>'}${r.me?' <b class="you">you</b>':""}</span>
    <span class="sc">${meters(r.score)}${unit&&r.days?`<small>${r.days} Dail${r.days===1?"y":"ies"}</small>`:""}</span></li>`;
  // Not in the top ten? Your own place goes underneath.
  const mine = me && !rows.some(r=>r.me)
    ? `<li class="gap" aria-hidden="true"><span>…</span></li>${row({me:true,name:(BOARD.data&&BOARD.data.name)||loadPrefs().name||"",score:me.score,days:me.days},me.rank)}` : "";
  return `<ol class="lbl">${rows.map((r,i)=>row(r,place(i))).join("")}${mine}</ol>`;
}
function dayHTML(day,empty,label){
  if(!day) return `<p class="mute">${empty}</p>`;
  const me=day.me;
  return `<div class="lbhead"><b>Daily Prowl #${day.number}</b><span>${day.players} player${day.players===1?"":"s"}${label?` · ${label}`:""}</span></div>
    ${me?`<p class="lbme">You: <b>${ordinal(me.rank)}</b> with ${meters(me.score)}${me.beat!=null?` · farther than ${me.beat}% of players`:""}</p>`:""}
    ${histHTML(day,me?me.score:null)}
    ${topHTML(day.top,false,me&&{score:me.score,rank:me.rank})}`;
}
function renderBoard(){
  const b=BOARD.data, t=BOARD.tab;
  document.querySelectorAll(".lbtabs button").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.lb===t)));
  if(!b){ $("lbbody").innerHTML=`<p class="mute">${OFFLINE_MSG}</p>`; return; }
  if(t==="today") $("lbbody").innerHTML=dayHTML(b.today, CATALOG&&!CATALOG.prompts?"There's no Daily today.":"Nobody has finished today's Daily yet. Be first.", "so far");
  else if(t==="last") $("lbbody").innerHTML=dayHTML(b.last,"No earlier Dailies yet.","final");
  else {
    const a=b.allTime, me=a.me;
    $("lbbody").innerHTML=`<div class="lbhead"><b>Best single Daily</b><span>${a.players} player${a.players===1?"":"s"} all time</span></div>
      ${me?`<p class="lbme">Your best: <b>${meters(me.best)}</b> · ${ordinal(me.rank)} of ${a.players} · ${me.days} Dail${me.days===1?"y":"ies"} played</p>`:""}
      ${topHTML(a.top,true,me&&{score:me.best,rank:me.rank,days:me.days})}`;
  }
}
async function openBoard(tab){
  BOARD.tab=tab||"today";
  show("board");
  $("lbname").value=loadPrefs().name||""; lbNameReset(); $("lbnamemsg").textContent="Only your Daily Prowl scores go on the board. Same name as Tiger Tailgate. It saves as you type.";
  $("lbbody").innerHTML=`<p class="mute">Loading…</p>`;
  await loadBoard(true); renderBoard();
}

/* Results card after a Daily: where you placed today, and a way to put your name on it. */
async function renderBoardCard(){
  const box=$("res-board"); box.hidden=true;
  const b=await loadBoard(true);
  if(!b||!b.today||!b.today.me||$("results").hidden) return;
  const d=b.today, me=d.me, named=loadPrefs().name||"";
  box.innerHTML=`<div class="lbcard-top"><div class="lbrank"><b>${ordinal(me.rank)}</b><span>of ${d.players} today so far</span></div>
      <p>${me.beat!=null?`You prowled farther than <b>${me.beat}%</b> of today's players.`:"You're the first one done today."}</p></div>
    ${histHTML(d,me.score)}
    <form class="lbrow" id="rbname" autocomplete="off">
      <input class="ex-search" id="rbnamein" maxlength="20" minlength="2" placeholder="Your name on the board" value="${esc(named)}" spellcheck="false" aria-label="Your name on the board">
      <button class="pxbtn navy small" type="button" id="rbopen">Leaderboard</button>
    </form>
    <p class="mute small" id="rbmsg" style="margin:0">${named?`On the board as ${esc(named)}.`:"Without a name you show up as Anonymous cub. It saves as you type."}</p>`;
  box.hidden=false;
  autoName($("rbnamein"),$("rbmsg"),n=>n?`On the board as ${n}.`:"You'll show up as Anonymous cub.")();
}

$("lbopen").addEventListener("click",()=>openBoard(BOARD.data&&!BOARD.data.today&&BOARD.data.last?"last":"today"));
document.querySelector(".lbtabs").addEventListener("click",e=>{ const b=e.target.closest("button[data-lb]"); if(!b) return; BOARD.tab=b.dataset.lb; renderBoard(); });
/* Names save themselves: a moment after you stop typing, when you leave the box, or on Enter. */
function autoName(input, msg, done){
  let timer=0, last=null;
  const go=async()=>{ clearTimeout(timer); const v=input.value.trim(); if(v===last) return; last=v;
    msg.textContent="Saving…"; const r=await saveBoardName(v);
    msg.textContent=nameResult(r,done); if(r&&r.ok){ input.value=r.name; last=r.name; } else last=null; };
  input.addEventListener("input",()=>{ clearTimeout(timer); timer=setTimeout(go,900); });
  input.addEventListener("change",go);
  input.form.addEventListener("submit",e=>{ e.preventDefault(); go(); });
  return ()=>{ last=input.value.trim(); };   // call after filling the box in, so it isn't re-saved
}
const lbNameReset=autoName($("lbname"),$("lbnamemsg"),n=>n?`Saved. You're on the board as ${n}.`:"Saved. You'll show up as Anonymous cub.");
$("res-board").addEventListener("click",e=>{ if(e.target.id==="rbopen") openBoard("today"); });

/* Keep the leaderboard fresh without reloading: every 5 minutes while the page is on screen, and
   straight away when you come back to the tab. */
function refreshBoardViews(){
  if(document.hidden) return;
  if(!$("intro").hidden){ BOARD.at=0; renderLbLine(); }
  else if(!$("board").hidden) loadBoard(true).then(renderBoard);
}
setInterval(refreshBoardViews, 5*60*1000);
document.addEventListener("visibilitychange", refreshBoardViews);
