/* Daltrillion admin portal. Admins sign in with Google (Firebase Auth); every /admin/api call carries the ID token. */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TIER_NAMES = { C: "Cub", T: "Paper Tiger", P: "Prowler", R: "Rare Stripe", D: "Deep Jungle", W: "White Tiger" };
const TIERS = ["C", "T", "P", "R", "D", "W"];
const STATUS_HELP = {
  draft: "Not scheduled. Hidden from players.",
  scheduled: "Scheduled for a future Daily. Hidden until then.",
  live: "In today's Daily.",
  retired: "Played in a past Daily. Available in Practice and Tiger Tailgate.",
  rerun: "Ran before and is scheduled again, so it's hidden from Practice and Tailgate until then.",
  practice: "Practice filler: in Practice and Tailgate until there are enough real past questions. Never in a Daily unless you schedule it.",
};
const THEME_NAMES = { dalton: "Dalton", school: "School & NYC", general: "General" };
const themeTag = (t) => `<span class="th th-${t || "general"}">${THEME_NAMES[t] || "General"}</span>`;
const tierChip = (t) => `<b class="t t-${t}" title="${TIER_NAMES[t] || ""}">${t}</b>`;
const pill = (s) => `<span class="pill s-${s}" title="${esc(STATUS_HELP[s])}">${s}</span>`;
const fmtDay = (d) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const when = (ms) => (ms ? new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

// Served by the game server itself, API calls are same-origin. The hosted copy (Firebase Hosting) is told where the server is.
const API = (window.DALTRILLION_SERVER || "").replace(/\/$/, "") + "/admin/api/";
const S = { me: null, list: [], filter: "all", search: "", cur: null, dirty: false, from: null };

/* ---------------- sign-in ---------------- */
const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/12.6.0";
const AUTH = { auth: null, lib: null, user: null };

async function initFirebase(config) {
  const [{ initializeApp }, lib] = await Promise.all([import(`${FIREBASE_SDK}/firebase-app.js`), import(`${FIREBASE_SDK}/firebase-auth.js`)]);
  AUTH.lib = lib;
  AUTH.auth = lib.getAuth(initializeApp(config));
  await new Promise((done) => { const off = lib.onAuthStateChanged(AUTH.auth, (u) => { AUTH.user = u; off(); done(); }); });
}
async function signIn() {
  $("gateerr").textContent = "";
  const { GoogleAuthProvider, signInWithPopup, signOut } = AUTH.lib;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    if (AUTH.user) await signOut(AUTH.auth);
    AUTH.user = (await signInWithPopup(AUTH.auth, provider)).user;
    showGate("loading:Signing you in…");
  } catch (e) {
    const code = e && e.code || "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    $("gateerr").textContent = code === "auth/unauthorized-domain"
      ? `Sign-in isn't allowed from ${location.hostname} yet. Add it under Firebase → Authentication → Settings → Authorized domains.`
      : code === "auth/popup-blocked" ? "Your browser blocked the sign-in window. Allow pop-ups for this page and try again."
      : "Couldn't sign in" + (e && e.message ? `: ${e.message}` : ".");
    return;
  }
  enter();
}
$("gsignin").addEventListener("click", signIn);
$("signout").addEventListener("click", async () => {
  if (!leaveOk()) return;
  S.dirty = false;
  if (AUTH.auth) await AUTH.lib.signOut(AUTH.auth);
  location.reload();
});

/* ---------------- server ---------------- */
async function call(method, path, body) {
  const headers = body ? { "content-type": "application/json" } : {};
  if (AUTH.user) headers.Authorization = "Bearer " + await AUTH.user.getIdToken();
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 || res.status === 403) {
    const d = await res.json().catch(() => ({}));
    showGate(res.status === 403 ? "notadmin" : "signin", d.email);
    throw new Error("unauthorized");
  }
  let data; try { data = await res.json(); } catch { data = { error: "server", message: "The server sent something unexpected." }; }
  return data;
}
const get = (p) => call("GET", p), post = (p, b) => call("POST", p, b || {});
function showGate(kind, email) {
  document.body.classList.add("gated");
  $("gate").hidden = false;
  document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
  // "loading:<message>" shows the loading screen (no sign-in button) with that message.
  const loading = String(kind).startsWith("loading");
  $("gateload").hidden = !loading;
  $("gatetitle").textContent = loading ? "Daltrillion admin" : "Admins only";
  if (loading) { $("gatemsg").textContent = String(kind).slice(8) || "Loading…"; $("gsignin").hidden = true; $("gateerr").textContent = ""; return; }
  const msg = {
    signin: "Sign in with your Google account to manage questions.",
    notadmin: `${email || "That account"} isn't an admin. Sign in with an admin account.`,
    setup: "Google sign-in isn't set up on this server yet (FIREBASE_PROJECT_ID in server/wrangler.toml).",
    offline: "Couldn't reach the game server or Google sign-in. Check your connection and reload.",
  }[kind] || kind;
  $("gatemsg").textContent = msg;
  $("gsignin").hidden = !(kind === "signin" || kind === "notadmin") || !AUTH.auth;
  $("gsignin").lastChild.textContent = kind === "notadmin" ? " Use a different account" : " Sign in with Google";
}

/* ---------------- views ---------------- */
function showView(name, loaded = false) {
  if (name !== "questions" && !leaveOk()) return;
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === name)));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + name));
  if (name === "questions" && !loaded) loadList();
  if (name === "schedule") loadSchedule();
  if (name === "activity") loadLog();
  if (name === "players") loadPlayers();
  if (name === "overview") loadOverview();
  history.replaceState(null, "", "#" + name);
}
document.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-view]"); if (b) showView(b.dataset.view); });
function leaveOk() { return !S.dirty || confirm("You have unsaved changes to this question. Leave without saving?"); }
addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

/* ---------------- question list ---------------- */
async function loadList() {
  const data = await get("questions");
  if (!Array.isArray(data)) return;
  S.list = data;
  renderFilters();
  renderList();
}
function renderFilters() {
  const counts = { all: S.list.length };
  for (const q of S.list) counts[q.status] = (counts[q.status] || 0) + 1;
  $("qfilters").innerHTML = ["all", "draft", "practice", "scheduled", "live", "retired", "rerun"].filter((f) => f === "all" || counts[f])
    .map((f) => `<button type="button" data-f="${f}" aria-pressed="${S.filter === f}">${f} ${counts[f] || 0}</button>`).join("");
}
/* The list is grouped: what's coming up (soonest first), unscheduled drafts, old Dailies, practice filler. */
const GROUPS = [
  { title: "Scheduled", has: (q) => ["live", "scheduled", "rerun"].includes(q.status),
    sort: (a, b) => nextDayOf(a).localeCompare(nextDayOf(b)) || a.label.localeCompare(b.label) },
  { title: "Not scheduled", has: (q) => q.status === "draft" },
  { title: "Old Dailies", has: (q) => q.status === "retired",
    sort: (a, b) => lastDayOf(b).localeCompare(lastDayOf(a)) || a.label.localeCompare(b.label) },
  { title: "Practice", has: (q) => q.status === "practice" },
];
const todayKeyAdmin = () => (S.me && S.me.today) || "";
const nextDayOf = (q) => (q.days || []).find((d) => d >= todayKeyAdmin()) || "9999";
const lastDayOf = (q) => (q.days || []).filter((d) => d < todayKeyAdmin()).slice(-1)[0] || "";
function listRow(q) {
  const tl = q.kind === "timeline", total = q.answers || 1;
  const bars = TIERS.map((t) => `<i class="t-${t}" style="width:${(100 * (q.tiers[t] || 0)) / total}%" title="${TIER_NAMES[t]}: ${q.tiers[t] || 0}"></i>`).join("");
  const when = ["live", "scheduled", "rerun"].includes(q.status) ? `<span>${fmtDay(nextDayOf(q))}</span>` : q.status === "retired" && lastDayOf(q) ? `<span>ran ${fmtDay(lastDayOf(q))}</span>` : "";
  return `<li data-id="${esc(q.id)}" aria-current="${S.cur && S.cur.id === q.id}">
    <div class="l1"><span>${esc(q.label)}</span>${pill(q.status)}</div>
    <div class="l2">${themeTag(q.theme)}${tl ? `<span class="th th-timeline">Timeline</span>` : `<span>${q.answers} answers</span><span class="bars">${bars}</span>`}${when}${q.problems ? `<span class="flag">${q.problems} issue${q.problems > 1 ? "s" : ""}</span>` : ""}${q.players ? `<span>${q.players} plays</span>` : ""}</div>
  </li>`;
}
function renderList() {
  const s = S.search.toLowerCase();
  const rows = S.list.filter((q) => (S.filter === "all" || q.status === S.filter) && (!s || (q.label + " " + q.prompt + " " + q.id).toLowerCase().includes(s)));
  $("qitems").innerHTML = GROUPS.map((g) => {
    const mine = rows.filter(g.has).sort(g.sort || ((a, b) => a.label.localeCompare(b.label)));
    return mine.length ? `<li class="qgroup">${g.title} <span>${mine.length}</span></li>${mine.map(listRow).join("")}` : "";
  }).join("") || `<li class="mute">No questions match.</li>`;
}
$("qitems").addEventListener("click", (e) => { const li = e.target.closest("li[data-id]"); if (li && leaveOk()) openQuestion(li.dataset.id); });
$("qfilters").addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (!b) return; S.filter = b.dataset.f; renderFilters(); renderList(); });
$("qsearch").addEventListener("input", (e) => { S.search = e.target.value.trim(); renderList(); });
$("qnew").addEventListener("click", () => { if (leaveOk()) openQuestion(null); });

/* ---------------- editor ---------------- */
const F = (name) => $("qform").elements[name];
const FIELDS = ["label", "prompt", "note", "theme", "kind", "source", "items"];
const isTimeline = () => F("kind").value === "timeline";
/** The form as the server wants it. */
const formData = () => {
  // The year has its own field; the answer list stays as it is, so switching kinds never loses answers.
  return { ...Object.fromEntries(FIELDS.map((n) => [n, F(n).value])), practice: F("practice").checked, fact: F("fact").value, year: F("year").value.trim() };
};
/** Show the answer boxes, or the Year and Fact fields for a timeline question. */
function showKind() {
  const tl = isTimeline();
  $("tlfields").hidden = !tl;
  document.querySelector(".answers").hidden = tl;
  document.querySelector(".legend").hidden = tl;
  $("tryin").placeholder = tl ? "1919\n1925\n1950" : "tikka\npancake\ncole slaw";
  document.querySelector("#tryin").closest(".card").querySelector("h3").textContent = tl ? "Try years" : "Try guesses";
}

async function openQuestion(id) {
  let q = { id: null, version: 0, label: "", prompt: "", note: "", theme: "general", practice: false, kind: "list", source: "", items: "", status: "draft", days: [] };
  if (id) {
    q = await get("question?id=" + encodeURIComponent(id));
    if (q.error) { alert("That question doesn't exist anymore."); return loadList(); }
  }
  S.cur = q; S.dirty = false;
  for (const n of FIELDS) F(n).value = q[n] || (n === "kind" ? "list" : n === "theme" ? "general" : "");
  F("practice").checked = !!q.practice;
  F("fact").value = q.fact || "";
  F("year").value = q.year ?? "";
  showKind();
  setMode(A.mode);
  $("qempty").hidden = true; $("qform").hidden = false;
  $("qstatus").outerHTML = `<span class="pill s-${q.status}" id="qstatus" title="${esc(STATUS_HELP[q.status])}">${id ? q.status : "new"}</span>`;
  $("qdays").textContent = q.days && q.days.length ? "Daily on " + q.days.map(fmtDay).join(", ") : id ? STATUS_HELP.draft : "";
  $("del").hidden = !id;
  $("playtest").hidden = !id;
  $("savemsg").textContent = ""; $("tryout").innerHTML = "";
  setPane("edit");
  renderList();
  runCheck();
  if (!id) F("label").focus();
}
$("qform").addEventListener("input", (e) => { if (e.target.matches("#tryin")) return; S.dirty = true; $("savemsg").textContent = ""; });
F("items").addEventListener("input", () => { clearTimeout(S.checkT); S.checkT = setTimeout(runCheck, 350); });
F("kind").addEventListener("change", () => {
  showKind();
  if (isTimeline() && !S.cur.id && F("theme").value === "general") F("theme").value = "dalton";   // Timeline Tuesday is Dalton history
  runCheck();
});
for (const n of ["year", "fact"]) F(n).addEventListener("input", () => { clearTimeout(S.checkT); S.checkT = setTimeout(runCheck, 350); });

async function runCheck() {
  const d = formData();
  if (d.kind === "timeline" ? !d.year : !d.items.trim()) { $("checkbody").innerHTML = `<span class="mute">${d.kind === "timeline" ? "Add the year to check it." : "Add answers to check them."}</span>`; return; }
  const c = await post("question/check", { kind: d.kind, items: d.items, fact: d.fact, year: d.year, prompt: d.prompt, note: d.note });
  if (c.error) return;
  if (d.kind === "timeline") {
    const t = c.timeline, b = t && t.bands;
    $("checkbody").innerHTML = `
      ${b ? `<div>Year <b>${t.year}</b></div><ul class="bands">
        <li>${tierChip("W")} exact</li><li>${tierChip("D")} within ${b.close} year${b.close > 1 ? "s" : ""}</li>
        <li>${tierChip("R")} within ${b.near}</li><li>${tierChip("P")} within ${b.rough}</li><li>${tierChip("C")} any other year</li></ul>` : ""}
      ${c.errors.length ? `<b class="flag">Fix before saving</b><ul class="errs">${c.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${c.warnings.length ? `<b style="color:var(--warn)">Heads up</b><ul class="warns">${c.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
      ${!c.errors.length && !c.warnings.length ? `<div style="color:var(--good)">Looks good.</div>` : ""}`;
    return;
  }

  $("checkbody").innerHTML = `
    <div><b>${c.total}</b> answers</div>
    <div class="tiercount">${TIERS.map((t) => `<span>${tierChip(t)} ${c.tiers[t] || 0}</span>`).join("")}</div>
    ${c.errors.length ? `<b class="flag">Fix before saving</b><ul class="errs">${c.errors.slice(0, 20).map((e) => `<li>${esc(where(e))}</li>`).join("")}</ul>` : ""}
    ${c.warnings.length ? `<b style="color:var(--warn)">Heads up</b><ul class="warns">${c.warnings.map((w) => `<li>${esc(where(w))}</li>`).join("")}</ul>` : ""}
    ${!c.errors.length && !c.warnings.length ? `<div style="color:var(--good)">Looks good.</div>` : ""}`;
}

$("trybtn").addEventListener("click", async () => {
  const guesses = $("tryin").value.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!guesses.length) return;
  const d = formData();
  const res = await post("question/test", { kind: d.kind, items: d.items, year: d.year, prompt: d.prompt, note: d.note, guesses });
  if (!Array.isArray(res)) return;
  if (d.kind === "timeline") {
    $("tryout").innerHTML = res.map((r) => `<li><b>${esc(r.guess)}</b> → ${r.tier ? `${tierChip(r.tier)} ${r.off ? `${r.off} off` : "exact"}` : `<span class="flag">not a year</span>`}</li>`).join("");
    return;
  }
  $("tryout").innerHTML = res.map((r) => `<li><b>${esc(r.guess)}</b> → ${r.name
    ? `${esc(r.name)} ${tierChip(r.tier)}${r.fixed ? ` <span class="mute">(autocorrected)</span>` : ""}`
    : `<span class="flag">not on the list</span>${r.near ? ` <span class="mute">· would suggest “${esc(r.near)}”</span>` : ""}`}</li>`).join("");
});

$("qform").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("save").disabled = true;
  const r = await post("question", { ...formData(), id: S.cur.id, version: S.cur.version });
  $("save").disabled = false;
  if (r.ok) {
    S.dirty = false;
    $("savemsg").className = "msg ok"; $("savemsg").textContent = "Saved.";
    await loadList(); await openQuestion(r.id);
    $("savemsg").className = "msg ok"; $("savemsg").textContent = "Saved.";
  } else {
    $("savemsg").className = "msg err"; $("savemsg").textContent = r.message || "Couldn't save.";
    if (r.check) runCheck();
  }
});

/* Play test: just this question, in the real game, as a test run (great for timeline questions). */
$("playtest").addEventListener("click", async () => {
  if (!S.cur || !S.cur.id) return;
  if (S.dirty) { alert("Save your changes first, then play the test."); return; }
  const win = window.open("about:blank", "_blank");   // opened during the click, so it isn't blocked
  const r = await post("try", { ids: [S.cur.id] });
  if (!r.ok) { if (win) win.close(); alert(r.message || "Couldn't start a test run."); return; }
  const url = new URL("../", location.href);
  url.searchParams.set("try", r.ticket); url.searchParams.set("what", S.cur.label);
  if (win) win.location = url.toString(); else location.href = url.toString();
});

$("del").addEventListener("click", async () => {
  if (!S.cur || !S.cur.id || !confirm(`Delete “${S.cur.label}”? This can't be undone.`)) return;
  const r = await post("question/delete", { id: S.cur.id });
  if (r.ok) { S.dirty = false; S.cur = null; $("qform").hidden = true; $("qempty").hidden = false; loadList(); }
  else { $("savemsg").className = "msg err"; $("savemsg").textContent = r.message || "Couldn't delete."; }
});

/* ---------------- answers by tier ----------------
   The saved format is the text list (Name|tier|alias;alias@Role). The tier boxes edit that same
   text: every keystroke rewrites the hidden textarea, and switching back to the boxes re-reads it. */
const TIER_HELP = { C: "what most people say", T: "sounds rare, but everyone says it", P: "common", R: "less common", D: "a deep cut", W: "almost nobody" };
const TIER_PTS = { C: 10, T: 15, P: 30, R: 60, D: 85, W: 100 };
const BOXES = ["", ...TIERS];   // "" = no tier yet (only shown when something's in it)
const A = { mode: "tiers", map: [] };
try { if (localStorage.getItem("dt-amode") === "text") A.mode = "text"; } catch {}

$("tierboxes").innerHTML = BOXES.map((t) => `<div class="tierbox${t ? "" : " notier"}" data-box="${t}"${t ? "" : " hidden"}>
  <label for="box-${t || "none"}">${t ? `${tierChip(t)} ${TIER_NAMES[t]} <small>${TIER_PTS[t]} pts · ${TIER_HELP[t]}</small>` : `No tier yet <small>move these into a tier box</small>`}<span class="n" data-n="${t}"></span></label>
  <textarea id="box-${t || "none"}" data-box="${t}" rows="${t === "C" || t === "P" || t === "R" ? 7 : 5}" spellcheck="false" placeholder="${t ? { C: "Manhattan\nBrooklyn", T: "", P: "Queens", R: "The Bronx | bronx", D: "Staten Island | si", W: "Roosevelt Island" }[t] : ""}"></textarea>
</div>`).join("");
const box = (t) => $("tierboxes").querySelector(`textarea[data-box="${t}"]`);

/** Text list → one block of lines per tier. */
function boxesFromText(text) {
  const out = Object.fromEntries(BOXES.map((t) => [t, []]));
  for (const line of String(text || "").split("\n")) {
    if (!line.trim()) continue;
    const [name = "", tier = "", ...more] = line.split("|");
    const rest = more.join("|").trim(), t = tier.trim().toUpperCase();
    out[TIERS.includes(t) ? t : ""].push(rest ? `${name.trim()} | ${rest}` : name.trim());
  }
  return out;
}
/** Tier boxes → text list. Also remembers which box line each text line came from, for error messages. */
function textFromBoxes() {
  const lines = []; A.map = [];
  for (const t of BOXES) {
    box(t).value.split("\n").forEach((l, i) => {
      if (!l.trim()) return;
      const cut = l.indexOf("|");
      const name = (cut < 0 ? l : l.slice(0, cut)).trim(), rest = cut < 0 ? "" : l.slice(cut + 1).trim();
      lines.push(`${name}|${t}|${rest}`); A.map.push({ t, line: i + 1 });
    });
  }
  return lines.join("\n");
}
function loadBoxes(text) {
  const b = boxesFromText(text);
  for (const t of BOXES) box(t).value = b[t].join("\n");
  textFromBoxes(); updateCounts();
}
function updateCounts() {
  let total = 0;
  for (const t of BOXES) {
    const n = box(t).value.split("\n").filter((l) => l.trim()).length;
    total += n;
    $("tierboxes").querySelector(`[data-n="${t}"]`).textContent = n || "";
    if (!t) box(t).closest(".tierbox").hidden = !n;
  }
  $("acount").textContent = total ? String(total) : "";
}
function setMode(mode) {
  if (mode === "tiers") loadBoxes(F("items").value);
  A.mode = mode;
  try { localStorage.setItem("dt-amode", mode); } catch {}
  document.querySelectorAll(".amode button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.amode === mode)));
  $("atiers-wrap").hidden = mode !== "tiers"; $("atext-wrap").hidden = mode !== "text";
}
document.querySelector(".amode").addEventListener("click", (e) => { const b = e.target.closest("button[data-amode]"); if (b) setMode(b.dataset.amode); });
$("tierboxes").addEventListener("input", () => {
  F("items").value = textFromBoxes();
  clearTimeout(S.checkT); S.checkT = setTimeout(runCheck, 350);
  updateCounts();
});
/** In the tier view, "Line 7: ..." means nothing to the reader, so say which box and line. */
function where(err) {
  if (A.mode !== "tiers") return err;
  return err.replace(/^Line (\d+):/, (m, n) => {
    const at = A.map[+n - 1];
    return at ? `${at.t ? TIER_NAMES[at.t] : "No tier yet"}, line ${at.line}:` : m;
  });
}

/* ---------------- stats ---------------- */
function setPane(name) {
  document.querySelectorAll(".etabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.pane === name)));
  $("pane-edit").hidden = name !== "edit"; $("pane-stats").hidden = name !== "stats";
  if (name === "stats") loadStats();
}
document.querySelector(".etabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-pane]"); if (!b) return;
  if (b.dataset.pane === "stats" && S.dirty && !confirm("Stats use the saved version. Switch without saving your edits?")) return;
  setPane(b.dataset.pane);
});

async function loadStats() {
  const box = $("statsbody");
  if (!S.cur || !S.cur.id) { box.innerHTML = `<p class="mute">Save the question first.</p>`; return; }
  const s = await get("stats?id=" + encodeURIComponent(S.cur.id));
  if (s.error) { box.innerHTML = `<p class="mute">No stats.</p>`; return; }
  if (!s.players) { box.innerHTML = `<p class="mute">No Daily plays yet. Stats come only from the Daily, the first time players see a question. Practice and Tailgate don't count.</p>`; return; }
  if (s.kind === "timeline") {
    box.innerHTML = `
      <div class="statline"><span><b>${s.players}</b>players</span><span><b>${s.exact}</b>got the exact year</span><span><b>${s.averageOff ?? "—"}</b>years off on average</span><span><b>${s.timeouts}</b>ran out of time</span></div>
      <p class="mute">The answer was <b>${s.year}</b>. What players guessed:</p>
      <table class="tbl"><thead><tr><th>Year guessed</th><th>Players</th><th>Off by</th><th>Scored</th></tr></thead><tbody>
      ${s.guesses.map((g) => `<tr><td>${g.year}</td><td>${g.n}</td><td>${g.off || "exact"}</td><td>${tierChip(g.tier)}</td></tr>`).join("")}</tbody></table>`;
    return;
  }
  const enough = s.players >= s.minPlayers;
  const rows = s.answers.map((a) => {
    const sug = a.suggested || a.tier, diff = enough && sug !== a.tier;
    return `<tr class="${diff ? "diff" : ""}" data-name="${esc(a.name)}">
      <td>${esc(a.name)}</td><td>${tierChip(a.tier)}</td><td>${a.n}</td>
      <td><span class="share" style="width:${Math.min(120, a.share * 300)}px"></span>${(a.share * 100).toFixed(1)}%</td>
      <td>${enough ? `<select data-k="tier">${TIERS.map((t) => `<option value="${t}" ${t === sug ? "selected" : ""}>${t} · ${TIER_NAMES[t]}</option>`).join("")}</select>` : `<span class="mute">—</span>`}</td>
    </tr>`;
  }).join("");
  const misses = s.misses.map((m) => `<tr><td>${esc(m.sample)}</td><td>${m.n}</td>
    <td><select data-k="mt">${TIERS.map((t) => `<option value="${t}" ${t === "R" ? "selected" : ""}>${t}</option>`).join("")}</select>
    <button type="button" class="btn small" data-add="${esc(m.sample)}">Add as answer</button></td></tr>`).join("");
  box.innerHTML = `
    <div class="statline"><span><b>${s.players}</b>players</span><span><b>${s.timeouts}</b>ran out of time</span><span><b>${s.days.length}</b>Daily${s.days.length > 1 ? "s" : ""}</span></div>
    <p class="mute">${enough
      ? "Rows in yellow are answers whose real share of players suggests a different tier. Adjust if you like, then apply."
      : `Tier suggestions start at ${s.minPlayers} players.`}</p>
    <table class="tbl"><thead><tr><th>Answer</th><th>Tier</th><th>Picks</th><th>Share of players</th><th>Suggested</th></tr></thead><tbody>${rows}</tbody></table>
    ${enough ? `<div class="actions"><button type="button" class="btn primary" id="applytiers">Apply tier changes</button><span id="tiermsg" class="msg"></span></div>` : ""}
    <h3 style="margin-top:20px">Tried but not on the list</h3>
    <p class="mute">What players typed that didn't count. If it should have, add it (it'll count from the next round on).</p>
    ${misses ? `<table class="tbl"><thead><tr><th>Typed</th><th>Times</th><th></th></tr></thead><tbody>${misses}</tbody></table><span id="addmsg" class="msg"></span>` : `<p class="mute">Nothing yet.</p>`}`;
}
$("statsbody").addEventListener("click", async (e) => {
  if (e.target.id === "applytiers") {
    const changes = [...$("statsbody").querySelectorAll("tr[data-name]")].map((tr) => ({ name: tr.dataset.name, tier: tr.querySelector("select")?.value })).filter((c) => c.tier);
    const r = await post("stats/tiers", { id: S.cur.id, changes, version: S.cur.version });
    if (r.ok) { S.cur.version = r.version; await refreshCurrent(); $("tiermsg").className = "msg ok"; $("tiermsg").textContent = r.changed ? `Updated ${r.changed} tier${r.changed > 1 ? "s" : ""}.` : "Nothing to change."; }
    else { $("tiermsg").className = "msg err"; $("tiermsg").textContent = r.message || "Couldn't apply."; }
  }
  const add = e.target.closest("button[data-add]");
  if (add) {
    const tier = add.parentElement.querySelector("select").value;
    // What a player typed becomes the answer's name only: | ; @ and line breaks mean something in an answer line.
    const name = add.dataset.add.replace(/[|;@\r\n\t]/g, " ").replace(/\s+/g, " ").trim();
    if (!name) { $("addmsg").className = "msg err"; $("addmsg").textContent = "Nothing left to add once | ; @ are removed."; return; }
    const r = await post("stats/add", { id: S.cur.id, line: `${name}|${tier}|`, version: S.cur.version });
    if (r.ok) { S.cur.version = r.version; add.textContent = "Added"; add.disabled = true; await refreshCurrent(true); }
    else { $("addmsg").className = "msg err"; $("addmsg").textContent = r.message || "Couldn't add."; }
  }
});
async function refreshCurrent(keepPane) {
  const q = await get("question?id=" + encodeURIComponent(S.cur.id));
  if (q.error) return;
  S.cur = q; F("items").value = q.items; S.dirty = false;
  if (A.mode === "tiers") loadBoxes(q.items);
  loadList(); runCheck();
  if (!keepPane) loadStats();
}

/* ---------------- schedule ---------------- */
async function loadSchedule() {
  if (!S.list.length) await loadList();
  const qs = S.from ? `?from=${S.from}` : "";
  const s = await get("schedule" + qs);
  if (s.error) return;
  S.from = s.from; S.sched = s;
  $("srangelbl").textContent = `${fmtDay(s.from)} – ${fmtDay(s.to)}`;
  const days = [];
  for (let d = s.from; d <= s.to; d = addDays(d, 1)) days.push(d);
  const soon = addDays(s.today, 14);
  $("days").innerHTML = days.map((d) => {
    const items = s.days[d] || [], past = d < s.today, today = d === s.today;
    const theme = (id) => (S.list.find((x) => x.id === id) || {}).theme || "general";
    const isTl = (id) => (S.list.find((x) => x.id === id) || {}).kind === "timeline";
    const chips = items.map((q) => `<span class="chip th-${theme(q.id)}" title="${THEME_NAMES[theme(q.id)]}">${esc(q.label)}${past ? "" : `<button type="button" title="Remove" data-rm="${esc(q.id)}" data-day="${d}">×</button>`}</span>`).join("");
    const tlCount = items.filter((q) => isTl(q.id)).length;
    const mix = !items.length ? "" : tlCount === items.length ? `${tlCount} timeline`
      : Object.keys(THEME_NAMES).map((t) => `${items.filter((q) => theme(q.id) === t && !isTl(q.id)).length} ${THEME_NAMES[t]}`).join(" · ") + (tlCount ? ` · ${tlCount} timeline` : "");
    return `<li class="${past ? "past" : ""} ${today ? "today" : ""} ${weekend(d) ? "weekend" : ""}">
      <div class="date">${fmtDay(d)}<small>${today ? "Today" : past ? "Past" : d}</small>${tuesday(d) ? `<small class="tlday">Timeline Tuesday</small>` : ""}${mix ? `<small class="mix">${mix}</small>` : ""}</div>
      <div class="chips">${chips || (!past && d <= soon && !weekend(d) ? `<span class="nodaily">No Daily</span>` : `<span class="mute">—</span>`)}</div>
      <div class="addcell">${items.length ? `<button type="button" class="btn small" data-try="${d}" title="Play this Daily now as a test run (not counted anywhere)">Play</button>` : ""}${past ? "" : `<button type="button" class="btn small" data-pick="${d}">+ Add a question</button><div class="picker" data-pickbox="${d}" hidden></div>`}</div>
    </li>`;
  }).join("");
}
/* Tuesdays are Timeline Tuesday: the whole Daily is timeline questions (guess the year). */
const tuesday = (key) => new Date(key + "T12:00:00Z").getUTCDay() === 2;
/* Dailies run on school days, so an empty weekend isn't a gap. */
const weekend = (key) => [0, 6].includes(new Date(key + "T12:00:00Z").getUTCDay());
function addDays(key, n) { return new Date(Date.parse(key + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10); }
async function setDay(day, ids) {
  const r = await post("schedule", { day, ids });
  if (!r.ok) alert(r.message || "Couldn't change that day.");
  await loadList(); await loadSchedule();
}
/* Adding a question to a day: a search box that starts with the newest unscheduled questions. */
function pickResults(day, term) {
  const taken = new Set((S.sched.days[day] || []).map((i) => i.id));
  const pool = S.list.filter((q) => q.answers && !taken.has(q.id));
  const fold = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const t = fold(term.trim());
  const rows = t
    ? pool.filter((q) => fold(`${q.label} ${q.prompt} ${q.id} ${THEME_NAMES[q.theme] || ""} ${q.status}`).includes(t)).slice(0, 25)
    : pool.filter((q) => q.status === "draft" || q.status === "practice").sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
        .sort((a, b) => tuesday(day) ? (b.kind === "timeline") - (a.kind === "timeline") : (a.kind === "timeline") - (b.kind === "timeline")).slice(0, 8);
  const head = t ? `${rows.length === 25 ? "First 25" : rows.length} match${rows.length === 1 ? "" : "es"}` : "Newest unscheduled · type to search everything";
  return `<p class="pickhead">${head}</p>` + (rows.map((q, i) => `<button type="button" class="pickrow${i === 0 ? " first" : ""}" data-add="${esc(q.id)}">
      ${q.kind === "timeline" ? `<span class="th th-timeline">Timeline</span>` : themeTag(q.theme)}<span class="pl">${esc(q.label)}<small>${esc(q.prompt)}</small></span>${pill(q.status)}</button>`).join("")
    || `<p class="mute small">Nothing matches.</p>`);
}
function openPicker(day) {
  document.querySelectorAll(".picker").forEach((p) => { if (p.dataset.pickbox !== day) p.hidden = true; });
  const box = $("days").querySelector(`[data-pickbox="${day}"]`);
  if (!box.hidden) { box.hidden = true; return; }
  box.innerHTML = `<input type="search" class="picksearch" placeholder="Search by name, prompt or theme…" aria-label="Search questions"><div class="pickres">${pickResults(day, "")}</div>`;
  box.hidden = false;
  box.querySelector("input").focus();
}
function addToDay(day, id) {
  const q = S.list.find((x) => x.id === id);
  if (q && (q.status === "retired" || q.status === "rerun") && !confirm(`“${q.label}” already ran in a Daily. Scheduling it again hides it from Practice and Tailgate until then. Continue?`)) return;
  setDay(day, (S.sched.days[day] || []).map((i) => i.id).concat(id));
}
$("days").addEventListener("input", (e) => {
  if (!e.target.matches(".picksearch")) return;
  const box = e.target.closest(".picker");
  box.querySelector(".pickres").innerHTML = pickResults(box.dataset.pickbox, e.target.value);
});
$("days").addEventListener("keydown", (e) => {
  if (!e.target.matches(".picksearch")) return;
  const box = e.target.closest(".picker");
  if (e.key === "Escape") { box.hidden = true; box.previousElementSibling.focus(); }
  if (e.key === "Enter") { e.preventDefault(); const first = box.querySelector(".pickrow"); if (first) addToDay(box.dataset.pickbox, first.dataset.add); }
});
$("days").addEventListener("click", async (e) => {
  // Play: a test run of that day's Daily in a new tab (same questions and rules; never counted).
  const tb = e.target.closest("button[data-try]");
  if (tb) {
    const win = window.open("about:blank", "_blank");   // opened now, while it's still a click, so it isn't blocked
    const r = await post("try", { day: tb.dataset.try });
    if (!r.ok) { if (win) win.close(); alert(r.message || "Couldn't start a test run."); return; }
    const url = new URL("../", location.href); url.searchParams.set("try", r.ticket); url.searchParams.set("day", r.day);
    if (win) win.location = url.toString(); else location.href = url.toString();
    return;
  }
  const pick = e.target.closest("button[data-pick]");
  if (pick) { openPicker(pick.dataset.pick); return; }
  const add = e.target.closest("button[data-add]");
  if (add) { addToDay(add.closest(".picker").dataset.pickbox, add.dataset.add); return; }
  const b = e.target.closest("button[data-rm]"); if (!b) return;
  const day = b.dataset.day;
  if (day === S.sched.today && !confirm("This is today's Daily. Players who already started keep their round; new players get the change. Continue?")) return;
  setDay(day, (S.sched.days[day] || []).map((i) => i.id).filter((id) => id !== b.dataset.rm));
});
$("sprev").addEventListener("click", () => { S.from = addDays(S.from, -28); loadSchedule(); });
$("snext").addEventListener("click", () => { S.from = addDays(S.from, 28); loadSchedule(); });

/* ---------------- activity ---------------- */
async function loadLog() {
  const rows = await get("log");
  if (!Array.isArray(rows)) return;
  $("logrows").innerHTML = rows.map((r) => `<tr><td>${when(r.at)}</td><td>${esc(r.who)}</td><td>${esc(r.action)}</td><td>${esc(r.detail)}</td></tr>`).join("")
    || `<tr><td colspan="4" class="mute">Nothing yet.</td></tr>`;
}

/* ---------------- overview ---------------- */
async function loadOverview() {
  await loadList();
  const col = (title, help, rows, when) => {
    const byTheme = Object.keys(THEME_NAMES).map((t) => `${rows.filter((q) => q.theme === t && q.kind !== "timeline").length} ${THEME_NAMES[t]}`).join(" · ")
      + ((n) => n ? ` · ${n} timeline` : "")(rows.filter((q) => q.kind === "timeline").length);
    return `<div class="ovcol"><h3>${title} <span>${rows.length}</span></h3><p class="mute small">${help}<br>${byTheme}</p>
      <ul>${rows.map((q) => `<li data-id="${esc(q.id)}">${q.kind === "timeline" ? `<span class="th th-timeline">Timeline</span>` : themeTag(q.theme)}<span class="ovl">${esc(q.label)}</span><span class="mute small">${when(q)}</span></li>`).join("") || `<li class="mute">None.</li>`}</ul></div>`;
  };
  const done = S.list.filter((q) => q.status === "retired").sort((a, b) => lastDayOf(b).localeCompare(lastDayOf(a)));
  const coming = S.list.filter((q) => ["live", "scheduled", "rerun"].includes(q.status)).sort((a, b) => nextDayOf(a).localeCompare(nextDayOf(b)));
  const unused = S.list.filter((q) => q.status === "draft" || q.status === "practice").sort((a, b) => a.label.localeCompare(b.label));
  $("ovcols").innerHTML =
    col("Already used", "Ran in a Daily (newest first).", done, (q) => fmtDay(lastDayOf(q))) +
    col("Scheduled", "Coming up (soonest first).", coming, (q) => fmtDay(nextDayOf(q))) +
    col("Not used yet", "Never in a Daily: drafts and practice filler.", unused, (q) => q.status === "practice" ? "practice" : "draft");
}
$("ovcols").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]"); if (!li) return;
  showView("questions"); openQuestion(li.dataset.id);
});

/* ---------------- players ---------------- */
async function loadPlayers() {
  const rows = await get("board");
  if (!Array.isArray(rows)) return;
  const m = (pts) => `${(pts * 4).toLocaleString()} m`;
  $("playerrows").innerHTML = rows.map((r) => `<tr class="${r.hidden ? "hiddenrow" : ""}" data-player="${esc(r.player)}">
    <td><input class="pname" value="${esc(r.name)}" maxlength="20" aria-label="Name" placeholder="Anonymous cub"> ${r.hidden ? '<span class="mute">(hidden)</span>' : ""}</td>
    <td>${r.best == null ? "—" : m(r.best)}</td><td>${r.days}</td><td>${when(r.at)}</td>
    <td class="pact"><label class="check"><input type="checkbox" class="plock" ${r.locked ? "checked" : ""}> Locked</label>
      <button type="button" class="btn small" data-act="rename">Save name</button>
      <button type="button" class="btn small ${r.hidden ? "" : "danger"}" data-act="hide" data-hide="${r.hidden ? 0 : 1}">${r.hidden ? "Show name" : "Hide name"}</button>
      ${r.scores.length ? `<span class="pscore">
        <select class="pday" aria-label="Which Daily">${r.scores.map((x) => `<option value="${x.day}" data-m="${x.score * 4}">${fmtDay(x.day)}: ${m(x.score)}</option>`).join("")}</select>
        <input class="pm" type="number" min="0" max="2800" step="4" value="${r.scores[0].score * 4}" aria-label="New distance in meters"> m
        <button type="button" class="btn small" data-act="score">Change score</button></span>` : ""}
      <span class="msg"></span></td></tr>`).join("")
    || `<tr><td colspan="5" class="mute">Nobody has a name or a Daily score yet.</td></tr>`;
}
$("playerrows").addEventListener("change", (e) => {
  if (!e.target.classList.contains("pday")) return;
  const o = e.target.selectedOptions[0]; e.target.closest("tr").querySelector(".pm").value = o.dataset.m;
});
$("playerrows").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const tr = b.closest("tr"), msg = tr.querySelector(".msg"), player = tr.dataset.player;
  let r;
  if (b.dataset.act === "score") {
    const meters = Number(tr.querySelector(".pm").value), day = tr.querySelector(".pday").value;
    if (!Number.isFinite(meters) || meters < 0 || meters > 2800) { msg.className = "msg err"; msg.textContent = "Use 0 to 2,800 m."; return; }
    const pts = Math.round(meters / 4), name = tr.querySelector(".pname").value || "this player";
    if (!confirm(`Set ${name}'s score for ${fmtDay(day)} to ${(pts * 4).toLocaleString()} m? The leaderboard changes right away and it's logged in Activity.`)) return;
    r = await post("board/score", { player, day, score: pts });
  } else if (b.dataset.act === "hide") r = await post("board/hide", { player, hidden: b.dataset.hide === "1" });
  else r = await post("board/rename", { player, name: tr.querySelector(".pname").value, locked: tr.querySelector(".plock").checked });
  if (!r.ok) { msg.className = "msg err"; msg.textContent = r.message || "Couldn't change that."; return; }
  loadPlayers();
});

/* ---------------- backup ---------------- */
$("export").addEventListener("click", async () => {
  const data = await get("export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `daltrillion-questions-${S.me.today}.json` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("importfile").addEventListener("change", async (e) => { const f = e.target.files[0]; if (f) { $("importin").value = await f.text(); importPreview(); } });
$("importin").addEventListener("input", importPreview);
/** If the pasted file schedules Dailies, offer to schedule them too. */
function importPreview() {
  let days = [];
  try { const d = JSON.parse($("importin").value); days = Object.keys((d && d.schedule && !Array.isArray(d.schedule) && d.schedule) || {}).sort(); } catch {}
  $("importschedwrap").hidden = !days.length;
  if (days.length) $("importschedlbl").textContent = `Also schedule the ${days.length} Dail${days.length === 1 ? "y" : "ies"} in this file (${fmtDay(days[0])}${days.length > 1 ? ` – ${fmtDay(days[days.length - 1])}` : ""}). Adds to whatever those days already have.`;
}
$("import").addEventListener("click", async () => {
  let data;
  try { data = JSON.parse($("importin").value); } catch { $("importmsg").className = "msg err"; $("importmsg").textContent = "That isn't valid JSON."; return; }
  const list = Array.isArray(data) ? data : data.questions || (data.label ? [data] : null);
  const schedule = data && data.schedule && !Array.isArray(data.schedule) ? data.schedule : null;
  const r = await post("import", { questions: list, schedule, doSchedule: !!schedule && $("importsched").checked });
  if (r.ok) {
    $("importmsg").className = "msg ok";
    $("importmsg").textContent = `Imported ${r.created.length} question${r.created.length === 1 ? "" : "s"}`
      + (r.scheduled && r.scheduled.length ? `, scheduled ${r.scheduled.length} Dail${r.scheduled.length === 1 ? "y" : "ies"}` : "")
      + (r.skipped && r.skipped.length ? `; didn't schedule ${r.skipped.join(", ")}` : "")
      + (r.failed.length ? `; ${r.failed.length} failed: ` + r.failed.map((f) => `${f.label || "(no label)"} (${f.message})`).join("; ") : "") + ".";
    loadList();
  } else { $("importmsg").className = "msg err"; $("importmsg").textContent = r.message || "Import failed."; }
});

/* ---------------- start ---------------- */
async function enter() {
  showGate("loading:Loading questions…");
  try { S.me = await get("me"); } catch { return; }
  if (!S.me || S.me.error) return showGate(S.me && S.me.message || "signin");
  // Load the question list behind the loading screen, so the page never appears empty.
  const view = (location.hash || "#questions").slice(1).replace(/[^a-z]/g, "") || "questions";
  try { await loadList(); } catch { return; }
  document.body.classList.remove("gated");
  $("gate").hidden = true; $("gateload").hidden = true;
  $("who").textContent = S.me.email;
  $("signout").hidden = !AUTH.user;
  showView(view, view === "questions");
}
(async function start() {
  showGate("loading:Checking your sign-in…");
  if (window.DALTRILLION_OPENING_SOON) return showGate("The admin portal opens once the game server is set up.");
  // The local dev login (localhost only, server/.dev.vars) needs no Google sign-in.
  const dev = await fetch(API + "me").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (dev) return enter();
  const cfg = await fetch(API + "config").then((r) => r.json()).catch(() => null);
  if (!cfg || !cfg.firebase || !cfg.firebase.projectId) return showGate("setup");
  try { await initFirebase(cfg.firebase); } catch { return showGate("offline"); }
  if (!AUTH.user) return showGate("signin");
  enter();
})();
