/* =========================================================
   SERVER CONNECTION
   Answer lists, rarity and the daily schedule live on the server;
   this page only ever asks it questions. SERVER can point a copy of
   the game hosted elsewhere at the real server (that server must list
   this page's origin in ALLOWED_ORIGINS).
   ========================================================= */
const SERVER = (window.DALTRILLION_SERVER || location.origin).replace(/\/$/, "");
const PSTORE="daltrillion-tailgate";
const clip=(v,n)=>[...String(v==null?"":v)].filter(ch=>{ const c=ch.codePointAt(0); return c>31 && !(c>=0x200B&&c<=0x200F) && !(c>=0x2028&&c<=0x202E); }).join("").slice(0,n);
const CODE_CHARS="ABCDEFGHJKLMNPQRSTUVWXYZ";
let party=null, pSkin=0;
function perr(msg){ $("perr").textContent=msg; $("perr").hidden=!msg; }
/* This browser's player id and its pass. The server hands both out (see /api/player) and checks the pass on
   anything that counts per player: rounds, leaderboard names, shares, skin codes, Tailgate rooms. The id is
   never shown to anyone. Kept in memory too, for browsers that won't save anything. */
const PLAYER_KEY="daltrillion-player", PASS_KEY="daltrillion-pass", ME={id:null, pass:""};
function playerId(){ try{ const id=localStorage.getItem(PLAYER_KEY); if(/^[0-9a-f-]{36}$/.test(id||"")) return id; }catch(e){} return ME.id; }
function playerPass(){ try{ const p=localStorage.getItem(PASS_KEY); if(p) return p; }catch(e){} return ME.pass; }
let playerAsk=null;
/** Make sure this browser has a player id with a pass. true, or the server's {error, message}. `fresh` asks again. */
function ensurePlayer(fresh){
  if(!fresh && playerId() && playerPass()) return Promise.resolve(true);
  return playerAsk || (playerAsk=(async()=>{
    const r=await api("player",{player:playerId()||"", pass:fresh?"":playerPass()});
    playerAsk=null;
    if(!(r && r.player && r.pass)) return r||{error:"offline"};
    ME.id=r.player; ME.pass=r.pass;
    try{ localStorage.setItem(PLAYER_KEY,r.player); localStorage.setItem(PASS_KEY,r.pass); }catch(e){}
    return true;
  })());
}
/** POST as this player (adds the id and pass). If the server doesn't take the pass, gets it again and retries once. */
async function apiAs(path, body={}){
  let ok=await ensurePlayer();
  if(ok!==true) return ok;
  let r=await api(path,{...body, player:playerId(), pass:playerPass()});
  if(r && r.error==="bad_pass"){
    ok=await ensurePlayer(true);
    if(ok!==true) return ok;
    r=await api(path,{...body, player:playerId(), pass:playerPass()});
  }
  return r;
}
function loadPrefs(){ try{ return JSON.parse(localStorage.getItem(PSTORE))||{}; }catch(e){ return {}; } }
function savePrefs(o){ try{ localStorage.setItem(PSTORE,JSON.stringify(o)); }catch(e){} }

/* POST /api/... and return the JSON, or {error} if the server can't be reached. */
async function api(path, body){
  try{
    const r=await fetch(SERVER+"/api/"+path, body===undefined ? {} : {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)});
    return await r.json();
  }catch(e){ return {error:"offline"}; }
}
// A copy published before its server exists (see tools/build-pages.mjs) says so instead of erroring.
const OFFLINE_MSG=window.DALTRILLION_OPENING_SOON ? "Daltrillion isn't open yet. Check back soon." : "Can't reach the Daltrillion server. Check your connection and try again.";

/* Open a Tailgate room socket. Resolves with {ws, welcome} or rejects with {code}. */
function connectRoom(code, asHost){
  return new Promise((resolve,reject)=>{
    let ws, settled=false;
    const q=new URLSearchParams({player:playerId()||"", pass:playerPass()}); if(asHost) q.set("mode","host");
    try{ ws=new WebSocket(SERVER.replace(/^http/,"ws")+"/ws/"+code+"?"+q); }
    catch(e){ reject({code:"offline"}); return; }
    const fail=c=>{ if(!settled){ settled=true; reject({code:c}); try{ ws.close(); }catch(e){} } };
    const timer=setTimeout(()=>fail("timeout"),10000);
    ws.addEventListener("message",ev=>{
      if(settled) return;
      let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
      if(m.t==="error"){ clearTimeout(timer); fail(m.code); }
      else if(m.t==="welcome"){ clearTimeout(timer); settled=true; resolve({ws,welcome:m}); }
    });
    ws.addEventListener("error",()=>{ clearTimeout(timer); fail("offline"); });
    ws.addEventListener("close",()=>{ clearTimeout(timer); fail("offline"); });
  });
}
