/* ---------- events ---------- */
$("form").addEventListener("submit",e=>{ e.preventDefault(); submit(false); });
$("dym").addEventListener("click",()=>{ if(game&&game.suggestion) submit(false,game.suggestion); });
$("r-next").addEventListener("click",advance);
$("prac").addEventListener("click",()=>startGame("practice"));
$("again").addEventListener("click",()=>startGame("practice"));
$("devreplay").addEventListener("click",devReplay);
$("devpreview").addEventListener("click",e=>{ const b=e.target.closest("button[data-preview]"); if(b) previewReveal(b.dataset.preview); });
$("quit").addEventListener("click",()=>{ cancelAnimationFrame(timerRaf); game=null; renderIntro(); });
$("copy").addEventListener("click",()=>{
  const txt=$("share-text").textContent;
  const ok=()=>{ $("copied").textContent="Copied. Paste it in the group chat."; $("copied").hidden=false; sfx("copy"); };
  const fb=()=>{ $("share-text").hidden=false; const r=document.createRange(); r.selectNodeContents($("share-text")); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(r);
    $("copied").textContent="Selected. Press Ctrl/⌘ + C to copy."; $("copied").hidden=false; };
  try{ navigator.clipboard.writeText(txt).then(ok,fb); }catch(e){ fb(); }
});
addEventListener("resize",()=>{ sceneResize(); if(SC.tg) drawTailgate(performance.now()); else drawScene(performance.now()); });

sceneResize(); renderStatic(); renderIntro(); loadCatalog();
{ const t=new URLSearchParams(location.search).get("preview"); if(IS_LOCAL && t) previewReveal(t.toUpperCase()); }
if(reduced) drawScene(performance.now()); else requestAnimationFrame(sceneLoop);
