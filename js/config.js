/* ---------- tiers ---------- */
/* bar: block character for the copied result, taller for rarer answers (no emoji, pastes anywhere) */
const TIERS = {
  W:{name:"White Tiger", pts:100, bar:"█", blurb:"Almost nobody finds this one."},
  D:{name:"Deep Jungle", pts:85,  bar:"▇", blurb:"A true deep cut."},
  R:{name:"Rare Stripe", pts:60,  bar:"▆", blurb:"Less common. Nice find."},
  P:{name:"Prowler",     pts:30,  bar:"▄", blurb:"Solid, but plenty of people got here."},
  T:{name:"Paper Tiger", pts:15,  bar:"▃", blurb:"Sounds obscure. Everyone thinks of it."},
  C:{name:"Cub",         pts:10,  bar:"▂", blurb:"The answer everyone blurts out."},
  X:{name:"Lost the Scent", pts:0, bar:"▁", blurb:"The clock ran out before a valid answer."},
  S:{name:"Classmate", pts:50, bar:"▅", blurb:"Every classmate counts the same."}
};
const TIER_ORDER = ["W","D","R","P","T","C"];
const ZONES = [[0,"Tall Grass"],[720,"Bamboo Thicket"],[1440,"Mangrove"],[2160,"Deep Canopy"],[2880,"Ivan's Den"]];
const M_PER_PT = 4, SECONDS = 25, MAX_M = 3600;
