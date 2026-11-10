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
/* This browser's leaderboard id: random, made here, never shown to anyone. */
function playerId(){
  try{ let id=localStorage.getItem("daltrillion-player");
    if(!/^[0-9a-f-]{36}$/.test(id||"")){ id=crypto.randomUUID(); localStorage.setItem("daltrillion-player",id); }
    return id; }catch(e){ return null; }
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
    try{ ws=new WebSocket(SERVER.replace(/^http/,"ws")+"/ws/"+code+(asHost?"?mode=host":"")); }
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
