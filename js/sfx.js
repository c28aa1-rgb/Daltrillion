/* =========================================================
   SOUND EFFECTS: tiny chiptune synth on Web Audio, no files to load.
   sfx("name") anywhere. Always on (there's no mute button).
   Browsers only allow audio after the player clicks or types, so the
   audio context starts on the first interaction.
   ========================================================= */
const SFX = { ctx: null, master: null, on: true, noise: null };

function sfxInit() {
  if (SFX.ctx) { if (SFX.ctx.state === "suspended") SFX.ctx.resume(); return SFX.ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = .32;
  // a gentle low-pass keeps square waves from sounding harsh
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200;
  master.connect(lp).connect(ctx.destination);
  const buf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  Object.assign(SFX, { ctx, master, noise: buf });
  return ctx;
}
["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, sfxInit, { capture: true, passive: true }));

/* one note: freq Hz, dur s, at = delay s; slide = end freq */
function blip(freq, dur, { type = "square", vol = .5, at = 0, slide = 0, attack = .005 } = {}) {
  const ctx = SFX.ctx, t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(SFX.master); o.start(t); o.stop(t + dur + .02);
}
function hiss(dur, { vol = .4, at = 0, freq = 900 } = {}) {
  const ctx = SFX.ctx, t = ctx.currentTime + at;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = SFX.noise; f.type = "bandpass"; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(SFX.master); s.start(t); s.stop(t + dur);
}
const arp = (notes, step, opts) => notes.forEach((f, i) => blip(f, step * 1.6, { ...opts, at: i * step }));

// C-major-ish ladder so every tier sounds like a step up from the one below
const NOTE = { C4: 262, E4: 330, G4: 392, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, E6: 1319, G6: 1568, C7: 2093 };
const TIER_SONG = {
  C: [NOTE.C5],
  T: [NOTE.C5, NOTE.D5],
  P: [NOTE.C5, NOTE.E5, NOTE.G5],
  S: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6],
  R: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6],
  D: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6],
  W: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7],
};

const SOUNDS = {
  click:   () => blip(880, .04, { vol: .18, slide: 1100 }),
  miss:    () => { blip(196, .12, { vol: .35, slide: 147 }); blip(147, .16, { vol: .3, at: .1, slide: 98 }); },
  near:    () => { blip(392, .08, { vol: .28 }); blip(370, .12, { vol: .24, at: .08 }); },
  tick:    () => blip(1200, .03, { vol: .16, type: "triangle" }),
  tickHi:  () => blip(1600, .04, { vol: .22, type: "triangle" }),
  timeout: () => { hiss(.25, { vol: .35, freq: 300 }); blip(110, .4, { vol: .4, slide: 55 }); },
  next:    () => blip(523, .06, { vol: .14, type: "triangle", slide: 784 }),
  // a correct answer: the rarer the tier, the longer the climb up the scale
  tier: (t) => {
    const song = TIER_SONG[t] || TIER_SONG.C, step = t === "W" ? .075 : .06;
    arp(song, step, { vol: .28 });
    if (t === "W" || t === "D") arp(song.map(f => f * 2), step, { vol: .1, type: "triangle", at: .02 });
    if (t === "W") { for (let i = 0; i < 6; i++) blip(2600 + i * 180, .05, { vol: .08, type: "triangle", at: .5 + i * .05 }); }
  },
  results: (zone = 0) => { const s = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].slice(0, 2 + zone); arp(s, .09, { vol: .24, type: "triangle" }); arp(s.map(f => f / 2), .09, { vol: .16 }); },
  copy:    () => { blip(1047, .05, { vol: .18 }); blip(1568, .08, { vol: .16, at: .05 }); },
  // Tailgate
  turn:    () => { blip(1047, .07, { vol: .28 }); blip(1047, .07, { vol: .28, at: .11 }); blip(1568, .12, { vol: .3, at: .22 }); },
  pass:    () => blip(784, .07, { vol: .16, type: "triangle", slide: 1047 }),
  ring:    () => { [0, .14, .28].forEach(at => { blip(1319, .5, { vol: .22, type: "triangle", at }); blip(1976, .35, { vol: .08, type: "sine", at }); }); },
  out:     () => { blip(392, .14, { vol: .3 }); blip(330, .14, { vol: .3, at: .14 }); blip(262, .3, { vol: .3, at: .28, slide: 196 }); },
  ready:   () => blip(659, .06, { vol: .2, type: "triangle" }),
  go:      () => blip(1319, .18, { vol: .3, type: "triangle" }),
  win:     () => { arp([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6], .09, { vol: .28 }); arp([NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5], .18, { vol: .18, type: "triangle" }); },
  chat:    () => blip(1175, .035, { vol: .1, type: "sine" }),
  pop:     () => blip(500, .06, { vol: .18, slide: 900 }),
  dunk:    () => { hiss(.18, { vol: .4, freq: 1800 }); blip(180, .25, { vol: .4, slide: 60, at: .02 }); },
};

function sfx(name, arg) {
  if (!SFX.on || !SOUNDS[name]) return;
  if (!sfxInit() || SFX.ctx.state !== "running") return;
  try { SOUNDS[name](arg); } catch (e) {}
}

document.addEventListener("click", e => {
  // every chunky button clicks
  if (e.target.closest(".pxbtn, .mode, .cub, .seg button, .dym, .see, .link-btn")) sfx("click");
});
