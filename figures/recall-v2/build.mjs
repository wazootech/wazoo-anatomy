import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 760;
const HEIGHT = 620;
const AZIMUTH = 40;
const ELEVATION = 38;

// ---- plans ---------------------------------------------------------------
const PLATE = { x: -150, y: -100, w: 300, d: 210, r: 14 };
const PLATE_H = 13;
const FOOT_H = 6;

const TK = [-90, -30]; // keyword ranking totem
const TV = [90, -30]; // meaning ranking totem
const POLE_R = 10;
const POLE_H = 150;
const rankZ = (rank) => 130 - (rank - 1) * 16; // rank 1 rides highest
const midZ = (item) => (rankZ(item.keywordRank) + rankZ(item.vectorRank)) / 2;

const RING_R = 15;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [TK[0], TK[1], POLE_H + 4],
    [TV[0], TV[1], POLE_H + 4],
    [0, -30, midZ(M.WINNER) + RING_R],
    [-90, -30, rankZ(1)],
    [90, -30, rankZ(7)],
  ],
  WIDTH,
  HEIGHT,
  { pad: 58, azimuth: AZIMUTH, elevation: ELEVATION },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 8, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const cyl = (x, y, r, z, h, steps = 28, bevel = 0) => k.cylinder(x, y, r, z, h, P, steps, bevel);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---- base ----------------------------------------------------------------
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 26))) {
    out.push(S(cyl(x, y, 8, -PLATE_H - FOOT_H, 1.6), { tone: "lo" }));
    out.push(S(cyl(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6), { tone: "mid" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 10, 1.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 13);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // the one tiny engraved label
  const label = { x: PLATE.x + 16, y: PLATE.y + 14, w: 30, d: 56, r: 2 };
  out.push(S(slab(label, 0, 1, 3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(label, 2), 1, P), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 15, label.y + label.d - 8], 1, P, "y"), "FUSE", { size: 5.2, tone: "lo" }));
  return out.join("");
}

// ---- ranking totem -------------------------------------------------------
function pole([tx, ty]) {
  const out = [];
  out.push(S(cyl(tx, ty, POLE_R + 3, 0, 6), { tone: "mid" }));
  out.push(S(cyl(tx, ty, POLE_R, 0, POLE_H, 40, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(tx, ty, POLE_R, 132, 146, 40, P), { tone: "faint" }));
  out.push(L(k.sideArc(tx, ty, POLE_R, 20, P, 28), { tone: "lo" }));
  out.push(S(cyl(tx, ty, POLE_R + 1.5, POLE_H, 3.5, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(D([at([tx, ty, POLE_H + 3.5])], { size: 0.5 }));
  // seven rank ticks on the front face: rank 1 rides highest
  for (let rank = 1; rank <= 7; rank++) {
    const z = rankZ(rank);
    out.push(S(slab({ x: tx - 14, y: ty + POLE_R - 2, w: 28, d: 3.5, r: 0.5 }, z - 0.8, 1.6, 3, 0.3), { tone: "lo" }));
  }
  return out.join("");
}

// ---- threads ---------------------------------------------------------------
function threadD(item) {
  return k.pathOf([at([TK[0], TK[1], rankZ(item.keywordRank)]), at([TV[0], TV[1], rankZ(item.vectorRank)])]);
}

function threadEl(item, i) {
  const d = threadD(item);
  const lit = i === 0;
  return (
    `<path data-part="thread" data-i="${i}" class="iso-line thread" data-tone="${lit ? "lit" : "mid"}" d="${d}" style="stroke-width:2"/>` +
    `<path data-part="thread-hit" data-i="${i}" d="${d}" style="stroke:rgba(0,0,0,0);stroke-width:16;fill:none;pointer-events:stroke;cursor:pointer"/>`
  );
}

// ---- the ring --------------------------------------------------------------
// A brass ring drawn at local z = 0; the group transform glides it to the
// crowned candidate's middle height, where the thread passes through it.
function ringEl() {
  return `<path class="iso-line" data-tone="hi" d="${k.ring(0, TK[1], RING_R, 0, P, 48)}" style="stroke-width:4.5"/>`;
}

// ---- assemble ------------------------------------------------------------
const MID0 = midZ(M.WINNER);
const body = [
  base(),
  pole(TK),
  pole(TV),
  ...M.FUSED.map((item, i) => (i === 0 ? "" : threadEl(item, i))),
  threadEl(M.WINNER, 0),
  `<g data-part="ring" transform="${k.translateAlong(P, [0, 0, MID0])}">${ringEl()}</g>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Two ranking totems linked by crossing threads. Touch a thread to slide the brass ring to that candidate's middle height and read its two ranks and fused score.",
  body,
});

const DATA = {
  P,
  mids: M.FUSED.map((item) => midZ(item)),
  readouts: M.FUSED.map((item) => M.READOUT(item)),
  top: M.FUSED.length - 1,
};

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const ringG = svg.querySelector('[data-part="ring"]');
const threads = [...svg.querySelectorAll('[data-part="thread"]')];
const hits = [...svg.querySelectorAll('[data-part="thread-hit"]')];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let index = 0, ringZ = D.mids[0], targetZ = D.mids[0], frame = 0, last = 0, clock = 0, touring = true, visible = false, idle = 0;
function draw() {
  ringG.setAttribute("transform", translateAlong(P, [0, 0, ringZ]));
  threads.forEach((t, j) => t.setAttribute("data-tone", j === index ? "lit" : "mid"));
  const text = D.readouts[index];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(index + 1));
  stage.setAttribute("aria-valuetext", text);
}
function ping(to) {
  index = clamp(to, 0, D.top);
  targetZ = D.mids[index];
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  if (still.matches) ringZ = targetZ;
  draw();
  run();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    const step = Math.floor(clock / 1.6) % (D.top + 1);
    if (step !== index) { index = step; targetZ = D.mids[index]; }
  }
  ringZ = still.matches ? targetZ : ringZ + (targetZ - ringZ) * (1 - Math.exp(-dt / 0.26));
  if (Math.abs(targetZ - ringZ) < 0.05) ringZ = targetZ;
  draw();
  const settled = !touring && ringZ === targetZ;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
hits.forEach((h, j) => h.addEventListener("pointerenter", () => ping(j)));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); ping(index + 1); }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); ping(index - 1); }
  if (event.key === "Home") { event.preventDefault(); ping(0); }
  if (event.key === "End") { event.preventDefault(); ping(D.top); }
});
draw();
`;

const CARD_HTML = k.plateHtml({
  fig: "Fig 1b",
  title: "Recall by agreement",
  hint: "Touch a thread · arrow keys move the ring",
  readout: M.READOUT(M.WINNER),
  keys: [
    { mark: "lit", label: "The ring crowns the candidate with the best combined height" },
    { mark: "raised", label: "Two ranking totems — keyword search, meaning search" },
    { mark: "flat", label: "Threads cross where the two lists disagree" },
  ],
  caption:
    "Keyword search and meaning search rank the same seven chunks and disagree at the top: the keyword totem leads with \u201cFrance \u00b7 capital \u00b7 Paris\u201d while the meaning totem leads with \u201cParis \u00b7 crosses \u00b7 the Seine\u201d \u2014 the threads cross. Worlds fuses the two lists by reciprocal rank fusion \u2014 a chunk at rank r in a list contributes 1/(60 + r) \u2014 and the candidate both lists vouch for wins: \u201cFrance \u00b7 capital \u00b7 Paris\u201d at 1/61 + 1/62 = 0.0325 edges out the vector-only favorite at 0.0323. Touch any thread to slide the ring to that candidate's middle height and read its two ranks and fused score.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Crossing threads: two rankings linked by threads; touch a thread to crown a candidate" aria-valuemin="1" aria-valuemax="${M.FUSED.length}" aria-valuenow="1">${svg}</div>`,
});

const css = readFileSync(join(HERE, "recall-v2.css"), "utf8");
const page = k.pageHtml({ title: "Recall by agreement", theme, body: `<style>${css}</style>${CARD_HTML}`, script: kitScript() + live, width: 800 });
const name = theme === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `winner ${M.WINNER.id}`);
