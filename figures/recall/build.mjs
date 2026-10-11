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
const PLATE = { x: -158, y: -104, w: 316, d: 208, r: 14 };
const PLATE_H = 13;
const FOOT_H = 6;

const MAG_K = { x: -104, y: -44, w: 46, d: 42, r: 4 };
const MAG_V = { x: 58, y: -44, w: 46, d: 42, r: 4 };
const MAG_FLOOR = 58;
const MAG_TOP = 96;
const WALL = 4;

const DRUM = [-8, -23];
const DRUM_R = 27;
const DRUM_Z0 = 30;
const DRUM_Z1 = 58;
const HUB_R = 6;

const RAIL = { x: 24, y: -36, w: 150, d: 26, r: 2 };
const RAIL_Z = 20;
const RAIL_H = 5;
const SLOTS = M.FUSED.length;
const SLOT_STEP = 20;
const SLOT_X0 = RAIL.x + 6;
const SLOT_XS = Array.from({ length: SLOTS }, (_, index) => SLOT_X0 + index * SLOT_STEP);
const SLIP = { w: 13, d: 20, r: 1.2 };
const SLIP_H = 3;
const SLIP_TOP = RAIL_Z + RAIL_H + SLIP_H;
const CARRIAGE_Z = SLIP_TOP + 5;

const DIAL = [-124, 56];
const DIAL_R = 21;
const DIAL_Z = 46;
const DIAL_H = 11;
const DIAL_TOP = DIAL_Z + DIAL_H;

const POST = [128, -80];
const POST_TOP = 74;
const BOARD = { x: 150, y: -86, w: 4, d: 46, r: 1 };
const BOARD_Z0 = 22;
const BOARD_Z1 = 64;
const CARD = { x: 146, y: -70, w: 2, d: 26, r: 0.6 };

const SPRING = [0, 0];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(MAG_K, MAG_FLOOR, MAG_TOP + 2),
    ...k.boxCorners(MAG_V, MAG_FLOOR, MAG_TOP + 2),
    ...k.boxCorners(RAIL, RAIL_Z, RAIL_Z + RAIL_H),
    [DRUM[0], DRUM[1], DRUM_Z1 + 2],
    [DIAL[0], DIAL[1], DIAL_TOP + 12],
    [POST[0], POST[1], POST_TOP + 2],
    [BOARD.x + BOARD.w, BOARD.y, BOARD_Z1],
    [BOARD.x, BOARD.y + BOARD.d, BOARD_Z1],
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

  const strip = { x: -146, y: PLATE.y + PLATE.d - 18, w: 292, d: 9, r: 1 };
  out.push(S(slab(strip, 0, 0.7, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 5, strip.y + 1, 0.7, [2.2, 4.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2.6, strip.y + 4.5, 0.7]), at([strip.x + strip.w - 2.6, strip.y + 4.5, 0.7])], { size: 0.45 }));

  const label = { x: PLATE.x + 16, y: PLATE.y + 14, w: 34, d: 86, r: 2 };
  out.push(S(slab(label, 0, 1, 3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(label, 2), 1, P), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 8.5, label.y + label.d - 8], 1, P, "y"), "RANK FUSE", { size: 5.2, tone: "lo" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([label.x + 4 + row * 3, label.y + 10], [label.x + 4 + row * 3, label.y + (row < 2 ? 34 : 42)], 1, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + label.w / 2, label.y + 4, 1]), at([label.x + label.w / 2, label.y + label.d - 4, 1])], { size: 0.45 }));
  return out;
}

// ---- magazine ------------------------------------------------------------
function magazine(plan, tag) {
  const out = [];
  const walls = [
    { x: plan.x, y: plan.y, w: plan.w, d: WALL, r: 1 },
    { x: plan.x, y: plan.y + plan.d - WALL, w: plan.w, d: WALL, r: 1 },
    { x: plan.x, y: plan.y, w: WALL, d: plan.d, r: 1 },
    { x: plan.x + plan.w - WALL, y: plan.y, w: WALL, d: plan.d, r: 1 },
  ];
  out.push(S(slab(plan, MAG_FLOOR, 5, 6, 0.8), { tone: "mid" }));
  for (const wall of walls) out.push(S(slab(wall, MAG_FLOOR, MAG_TOP - MAG_FLOOR, 3, 0.5), { tone: "mid" }));
  const inner = k.insetPlan(plan, WALL);
  for (const [x, y] of k.corners(plan, 7)) out.push(D([at([x, y, MAG_TOP])], { size: 0.42, tone: "lo" }));

  // the ranked stack: one slip per candidate, the best on top
  const stack = { x: inner.x + 1, y: inner.y + 1, w: inner.w - 2, d: inner.d - 2, r: 1 };
  const count = Math.min(SLOTS, 6);
  for (let index = 0; index < count; index++) {
    out.push(S(slab(stack, MAG_FLOOR + 5 + index * 2.1, 1.6, 4), { tone: index === 0 ? "hi" : "lo" }));
  }
  const stackTop = MAG_FLOOR + 5 + count * 2.1;
  // follower plate and its horizontal spring against the back wall
  out.push(S(slab(k.insetPlan(inner, 0.6), stackTop, 2.4, 4, 0.5), { tone: "mid" }));
  const springY0 = inner.y;
  const springY1 = inner.y + (inner.d - stack.d) + 3;
  const cx = plan.x + plan.w / 2;
  const spring = k.coil(springY0, springY1, [cx, stackTop + 1.2], 2.6, 6, "y", P);
  out.push(L(spring.back, { tone: "lo" }));
  out.push(S(cyl(cx, inner.y + inner.d - 2, 1.6, stackTop, 1.2), { tone: "mid" }));
  out.push(L(spring.front, { tone: "hi" }));
  // exit throat down into the drum
  out.push(S(slab({ x: cx - 7, y: inner.y + 2, w: 14, d: 14, r: 1.4 }, MAG_FLOOR - 10, 10, 4, 0.4), { tone: "mid" }));
  out.push(D([at([cx - 7, inner.y + 4, MAG_FLOOR - 10]), at([cx + 7, inner.y + 4, MAG_FLOOR - 10])], { size: 0.4 }));
  // a bracket down to the base
  out.push(S(slab({ x: plan.x + 4, y: plan.y + 4, w: 8, d: 8, r: 1 }, 13, MAG_FLOOR - 13, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: plan.x + plan.w - 12, y: plan.y + 4, w: 8, d: 8, r: 1 }, 13, MAG_FLOOR - 13, 3, 0.4), { tone: "mid" }));
  out.push(D([at([plan.x + 8, plan.y + 8, MAG_FLOOR]), at([plan.x + plan.w - 8, plan.y + 8, MAG_FLOOR])], { size: 0.42 }));
  void tag;
  return out.join("");
}

// ---- fuse drum -----------------------------------------------------------
function drum() {
  const out = [];
  const [x, y] = DRUM;
  out.push(S(cyl(x, y, HUB_R + 5, 13, DRUM_Z0 - 13), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, HUB_R + 5, 24, P, 24), { tone: "faint" }));
  out.push(S(cyl(x, y, DRUM_R, DRUM_Z0, DRUM_Z1 - DRUM_Z0, 64, 0.8), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(x, y, DRUM_R, DRUM_Z0 + 4, DRUM_Z1 - 4, 72, P), { tone: "faint" }));
  out.push(L(k.sideArc(x, y, DRUM_R, DRUM_Z0 + 4, P, 40), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DRUM_R, DRUM_Z1 - 4, P, 40), { tone: "lo" }));
  // top plate with the slot ring
  out.push(S(cyl(x, y, DRUM_R + 1.6, DRUM_Z1, 3, 64, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, y, DRUM_R - 2, DRUM_Z1 + 3, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DRUM_R - 3, SLOTS, 1, DRUM_Z1 + 3, [1.4, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(S(cyl(x, y, HUB_R, DRUM_Z1, 5, 24, 0.6), { tone: "mid" }));
  out.push(L(k.ring(x, y, 2, DRUM_Z1 + 5, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + DRUM_R - 6], DRUM_Z1 + 3.2, P, "x"), `${M.K_LABEL}`, { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

// ---- output rail, slips and carriage ------------------------------------
function rail() {
  const out = [];
  out.push(S(slab(RAIL, RAIL_Z, RAIL_H, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(RAIL, 3), RAIL_Z + RAIL_H, P, 3), { tone: "faint" }));
  for (const x of SLOT_XS) {
    out.push(L(k.lineOnTop([x, RAIL.y + 1], [x, RAIL.y + RAIL.d - 1], RAIL_Z + RAIL_H, P), { tone: "faint" }));
  }
  out.push(D([at([RAIL.x + 4, RAIL.y + RAIL.d / 2, RAIL_Z + RAIL_H]), at([RAIL.x + RAIL.w - 4, RAIL.y + RAIL.d / 2, RAIL_Z + RAIL_H])], { size: 0.4 }));
  out.push(S(slab({ x: RAIL.x - 6, y: RAIL.y + 2, w: 8, d: RAIL.d - 4, r: 1 }, RAIL_Z, RAIL_H + 3, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: RAIL.x + RAIL.w - 2, y: RAIL.y + 2, w: 8, d: RAIL.d - 4, r: 1 }, RAIL_Z, RAIL_H + 3, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

function slips() {
  const out = [];
  M.FUSED.forEach((item, index) => {
    const plan = { x: SLOT_XS[index] - SLIP.w / 2, y: RAIL.y + RAIL.d / 2 - SLIP.d / 2, w: SLIP.w, d: SLIP.d, r: SLIP.r };
    out.push(S(slab(plan, RAIL_Z + RAIL_H, SLIP_H, 3, 0.4), { tone: index === 0 ? "hi" : "lo" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2), RAIL_Z + RAIL_H + SLIP_H, P, 3), { tone: "faint" }));
    out.push(D([at([plan.x + 2, plan.y + 2, RAIL_Z + RAIL_H + SLIP_H]), at([plan.x + plan.w - 2, plan.y + plan.d - 2, RAIL_Z + RAIL_H + SLIP_H])], { size: 0.35, tone: "lo" }));
  });
  return out.join("");
}

function carriage() {
  const out = [];
  const plan = { x: -11, y: RAIL.y - 2, w: 22, d: RAIL.d + 4, r: 3 };
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 3), SLIP_TOP + 1, 0.1, P)}"/>`);
  out.push(S(slab(plan, CARRIAGE_Z, 6, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), CARRIAGE_Z + 6, P, 3), { tone: "faint" }));
  out.push(D(k.corners(plan, 4).map(([x, y]) => at([x, y, CARRIAGE_Z + 6])), { size: 0.4 }));
  // a needle that drops from the carriage onto the slip beneath it
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="end" d="${k.segment([0, RAIL.y + RAIL.d / 2, CARRIAGE_Z], [0, RAIL.y + RAIL.d / 2, SLIP_TOP], P)}" style="stroke-width:1"/>`);
  out.push(D([at([0, RAIL.y + RAIL.d / 2, CARRIAGE_Z])], { size: 0.6, tone: "hi" }));
  // a knurled knob on the back of the carriage, to hand-crank it along the rail
  out.push(S(cyl(0, RAIL.y + RAIL.d + 2, 3.4, CARRIAGE_Z + 1, 5, 24), { tone: "mid" }));
  out.push(L(k.knurl(0, RAIL.y + RAIL.d + 2, 3.4, CARRIAGE_Z + 1, CARRIAGE_Z + 6, 24, P), { tone: "lo" }));
  return out.join("");
}

// ---- dial gauge ----------------------------------------------------------
function dial() {
  const out = [];
  const [x, y] = DIAL;
  out.push(S(cyl(x, y, 2.8, 13, DIAL_Z - 13), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 2.8, 34, P, 12), { tone: "lo" }));
  out.push(S(cyl(x, y, DIAL_R, DIAL_Z, DIAL_H, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, 50, 5, DIAL_TOP, [1.3, 2.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(S(slab({ x: x - 2.6, y: y - DIAL_R - 4.4, w: 5.2, d: 4, r: 1.2 }, DIAL_Z + 2, 5, 3, 0.4), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 9], DIAL_TOP, P, "x"), "rrf", { size: 3, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const dialNeedle = (share) => {
  const angle = (-135 + 270 * share) * (Math.PI / 180);
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3, y + Math.cos(angle) * 3], [x + Math.sin(angle) * (DIAL_R - 2.2), y - Math.cos(angle) * (DIAL_R - 2.2)], DIAL_TOP + 0.2, P);
};

// ---- eyelet post and the traversal thread --------------------------------
function traversal() {
  const out = [];
  out.push(S(slab({ x: POST[0] - 6, y: POST[1] - 6, w: 12, d: 12, r: 2 }, 13, POST_TOP - 13, 4, 0.5), { tone: "mid" }));
  for (const z of [30, 50]) out.push(S(slab({ x: POST[0] - 7, y: POST[1] - 7, w: 14, d: 14, r: 2 }, z, 2, 3, 0.4), { tone: "mid" }));
  out.push(S(cyl(POST[0], POST[1], 7, POST_TOP, 2.4), { tone: "mid" }));
  out.push(D([at([POST[0], POST[1], POST_TOP])], { size: 0.5 }));
  // two eyelet rings the thread runs through (one per hop)
  for (const z of [POST_TOP - 8, POST_TOP - 22]) {
    out.push(S(cyl(POST[0], POST[1] - 9, 3, z, 1.6, 20), { tone: "mid" }));
    out.push(L(k.ring(POST[0], POST[1] - 9, 2, z + 1.6, P, 16), { tone: "faint" }));
  }
  // the answer board and its clipped card
  out.push(S(slab(BOARD, BOARD_Z0, BOARD_Z1 - BOARD_Z0, 3, 0.5), { tone: "mid" }));
  out.push(S(slab(CARD, BOARD_Z0 + 6, 34, 3, 0.4), { tone: "hi" }));
  out.push(L(k.planOutline(CARD, BOARD_Z0 + 40, P, 3), { tone: "faint" }));
  // a clip holding the card on top
  out.push(S(slab({ x: BOARD.x - 3, y: BOARD.y + 6, w: 5, d: 16, r: 1 }, BOARD_Z1 - 4, 6, 3, 0.5), { tone: "mid" }));
  return out.join("");
}

// ---- assemble ------------------------------------------------------------
const queueY = RAIL.y + RAIL.d / 2;
const threadPoints = [
  [SLOT_XS[0], queueY, RAIL_Z + RAIL_H + SLIP_H + 1],
  [SLOT_XS[0] + 20, POST[1] - 9, POST_TOP - 8],
  [POST[0], POST[1] - 9, POST_TOP - 8],
  [POST[0], POST[1] - 9, POST_TOP - 22],
  [BOARD.x, BOARD.y + 12, BOARD_Z0 + 22],
];

const body = [
  base(),
  magazine(MAG_K, "keyword"),
  magazine(MAG_V, "vector"),
  drum(),
  rail(),
  slips(),
  `<g data-part="carriage" transform="${k.translateAlong(P, [SLOT_XS[0], 0, 0])}">${carriage()}</g>`,
  dial(),
  traversal(),
  `<path data-part="dial-needle" class="iso-line" data-tone="lit" data-free="start" d="${dialNeedle(0.5)}" style="stroke-width:1.1"/>`,
  `<g data-part="thread" class="iso-line" data-tone="hi" opacity="0.28"><path d="${k.pathOf(threadPoints.map(at))}"/></g>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench instrument called a rank fuse. Two tall magazines hold the keyword ranking and the vector ranking of the same candidates; each feeds down into a slotted drum that interleaves them by reciprocal rank. The fused order drops onto a rail as a queue of slips, best first. A carriage with a needle slides along the rail, and a dial reads the fused score. From the top slip a thread runs through two eyelets to an answer card clipped on a board at the back.",
  body,
});

const DATA = {
  P,
  slotXs: SLOT_XS,
  dial: DIAL,
  dialR: DIAL_R,
  dialTop: DIAL_TOP,
  railZ: RAIL_Z,
  queueY,
  scores: M.FUSED.map((item) => item.score),
  readouts: M.FUSED.map((item) => M.READOUT(item)),
  top: M.FUSED.length - 1,
};

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P, DIAL = D.dial, DIAL_R = D.dialR, DIAL_TOP = D.dialTop;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const needle = svg.querySelector('[data-part="dial-needle"]');
const thread = svg.querySelector('[data-part="thread"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dialNeedle = ${dialNeedle.toString().replace("k.lineOnTop", "lineOnTop")};
const lo = Math.min(...D.scores), hi = Math.max(...D.scores);
const shareOf = (s) => (hi === lo ? 0.5 : (s - lo) / (hi - lo));
let index = 0, x = D.slotXs[0], target = x, frame = 0, last = 0, clock = 0, touring = true, visible = false, idle = 0;
function draw() {
  carriage.setAttribute("transform", translateAlong(D.P, [x, 0, 0]));
  const score = D.scores[index];
  needle.setAttribute("d", dialNeedle(0.12 + 0.76 * shareOf(score)));
  thread.setAttribute("opacity", index === 0 ? "1" : "0.22");
  const text = D.readouts[index];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(index + 1));
  stage.setAttribute("aria-valuetext", text);
}
function ping(to) {
  index = clamp(to, 0, D.top);
  target = D.slotXs[index];
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    const step = Math.floor(clock / 1.6) % (D.top + 1);
    index = step;
    target = D.slotXs[step];
  }
  x = still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / 0.26));
  if (Math.abs(target - x) < 0.05) x = target;
  draw();
  const settled = !touring && x === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  ping(Math.round(share * D.top));
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); ping(index + 1); }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); ping(index - 1); }
  if (event.key === "Home") { event.preventDefault(); ping(0); }
  if (event.key === "End") { event.preventDefault(); ping(D.top); }
});
draw();
`;

const CARD_HTML = k.plateHtml({
  fig: "Fig 1",
  title: "Hybrid recall",
  hint: "Move across the rail · arrow keys park the carriage",
  readout: M.READOUT(M.WINNER),
  keys: [
    { mark: "lit", label: "The winning slip and the needle that names it" },
    { mark: "raised", label: "Two magazines: keyword FTS5 and vector cosine, each ranked" },
    { mark: "flat", label: "The rail: the two rankings fused by reciprocal rank" },
  ],
  caption:
    "Two retrievers rank the same candidate chunks. Keyword search scores BM25 over each chunk's fts_value; vector search scores cosine over the chunk embedding. Worlds fuses the two lists by Reciprocal Rank Fusion: a chunk that appears at rank r in a list contributes 1/(k + r), with k = 60. Here the chunk \u201cFrance \u00b7 capital \u00b7 Paris\u201d wins on 1/61 + 1/62 = 0.0325, because it ranks well in both lists, and edges out the chunk that tops only the vector list. The winning chunk names its subject (France); exact SPARQL then traverses the predicate (capital) to the literal (Paris), the thread running through the two eyelets to the answer card. Scores are shown on each list's own scale; the World's API normalises each rank to k/(k + rank).",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Hybrid recall: park the carriage on any fused candidate to read its keyword rank, vector rank and fused score" aria-valuemin="1" aria-valuemax="${M.FUSED.length}" aria-valuenow="1">${svg}</div>`,
});

const css = readFileSync(join(HERE, "recall.css"), "utf8");
const page = k.pageHtml({ title: "Hybrid recall", theme, body: `<style>${css}</style>${CARD_HTML}`, script: kitScript() + live, width: 800 });
const name = theme === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `winner ${M.WINNER.id}`);
