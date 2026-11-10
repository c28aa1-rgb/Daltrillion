/* ---------- date, storage ---------- */
const LAUNCH = new Date(2026,10,5);
function todayKey(d=new Date()){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function dayNumber(){ const t=new Date(); t.setHours(0,0,0,0); return Math.max(1,Math.round((t-LAUNCH)/864e5)+1); }
const SKEY="ivans-prowl-v1";
function load(){ try{ return JSON.parse(localStorage.getItem(SKEY))||{}; }catch(e){ return {}; } }
function save(s){ try{ localStorage.setItem(SKEY,JSON.stringify(s)); }catch(e){} }
/* Players arriving from another address of the game (daltrillion.web.app forwards to GitHub Pages) bring
   their saved game along in the link's #carry= (packed by the forwarding page; a # part never reaches any
   server). If the carried save is newer (a later last Daily), it replaces this one; otherwise it only fills
   in what this address doesn't have yet. */
const CARRY_KEYS=["daltrillion-player","daltrillion-tailgate",SKEY];
(function carryOver(){
  const m=location.hash.match(/^#carry=([A-Za-z0-9_-]{1,40000})$/); if(!m) return;
  try{
    const got=JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g,"+").replace(/_/g,"/")))));
    const ok=(k,v)=>typeof v==="string" && (k==="daltrillion-player" ? /^[0-9a-f-]{36}$/.test(v) : (()=>{ try{ return typeof JSON.parse(v)==="object"; }catch(e){ return false; } })());
    const lastOf=v=>{ try{ return (JSON.parse(v)||{}).lastDate||""; }catch(e){ return ""; } };
    const newer=ok(SKEY,got[SKEY]) && lastOf(got[SKEY]) > lastOf(localStorage.getItem(SKEY)||"{}");
    for(const k of CARRY_KEYS){
      const v=got&&got[k]; if(!ok(k,v)) continue;
      if(newer || localStorage.getItem(k)===null) localStorage.setItem(k,v);
    }
  }catch(e){}
  history.replaceState(null,"",location.pathname+location.search);
})();

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=n=>n.toLocaleString("en-US");
const zoneIndex=m=>{ let z=0; ZONES.forEach(([at],i)=>{ if(m>=at) z=i; }); return z; };
const chip=(t,extra="")=>`<span class="chip t-${t}">${TIERS[t].name}${extra}</span>`;
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const ZONE_M = MAX_M/5;
