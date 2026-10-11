import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import { kitScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 780;
const HEIGHT = 640;
const AZIMUTH = 42;
const ELEVATION = 36;

// ---- plans ---------------------------------------------------------------
const PLATE = { x: -170, y: -114, w: 340, d: 228, r: 14 };
const PLATE_H = 13;
const FOOT_H = 6;

const HOP = { x: -158, y: -34, w: 40, d: 70, r: 4 };
const HOP_FLOOR = 14;
const HOP_TOP = 78;
const WALL = 3.5;

const RAIL_IN = { x: -150, y: -11, w: 120, d: 20, r: 2 };
const RAIL_Z = 14;
const RAIL_H = 4;

const GUARD = [-96, 0];
const GUARD_R = 17;

const PX = -36;
const COL_Y = -6;
const ANVIL = { x: PX - 24, y: -15, w: 48, d: 24, r: 2 };
const RAM_Y = -15;
const RAM_D = 22;
const RAM_TOP_UP = 60;
const RAM_TOP_DOWN = 34;
const CROSS_Z = 66;

const RIBBON = { x: -8, y: -7, w: 72, d: 15, r: 1 };
const RIBBON_Z = RAIL_Z + RAIL_H;

const BIN_K = { x: 82, y: -58, w: 58, d: 46, r: 3 };
const BIN_V = { x: 82, y: 4, w: 58, d: 46, r: 3 };
const BIN_Z = 14;
const BIN_H = 30;

const CAR = [4, 84];
const CAR_R = 45;
const CAR_Z = 14;
const CAR_H = 7;

const REJECT = { x: -150, y: 74, w: 42, d: 38, r: 3 };

const CARD = { w: 30, d: 50, r: 1.4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(HOP, HOP_FLOOR, HOP_TOP),
    ...k.boxCorners(BIN_K, BIN_Z, BIN_Z + BIN_H),
    ...k.boxCorners(BIN_V, BIN_Z, BIN_Z + BIN_H),
    [PX - 30, COL_Y, CROSS_Z + 8],
    [PX + 30, COL_Y, CROSS_Z + 8],
    [GUARD[0], GUARD[1], 30],
    [CAR[0], CAR[1] - CAR_R, CAR_Z + 42],
    [CAR[0], CAR[1] + CAR_R, CAR_Z + CAR_H],
    [REJECT.x + REJECT.w, REJECT.y + REJECT.d, RAIL_Z + RAIL_H],
  ],
  WIDTH,
  HEIGHT,
  { pad: 56, azimuth: AZIMUTH, elevation: ELEVATION },
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
  for (const [x, y] of byDepth(k.corners(PLATE, 28))) {
    out.push(S(cyl(x, y, 8, -PLATE_H - FOOT_H, 1.6), { tone: "lo" }));
    out.push(S(cyl(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6), { tone: "mid" }));
  }
  out.push(S(slab(PLATE, -PLATE_H, PLATE_H, 10, 1.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 13);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: -150, y: PLATE.y + PLATE.d - 18, w: 300, d: 9, r: 1 };
  out.push(S(slab(strip, 0, 0.7, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 5, strip.x + strip.w - 5, 5, 5, strip.y + 1, 0.7, [2.2, 4.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2.6, strip.y + 4.5, 0.7]), at([strip.x + strip.w - 2.6, strip.y + 4.5, 0.7])], { size: 0.45 }));

  const label = { x: PLATE.x + 16, y: PLATE.y + 14, w: 32, d: 82, r: 2 };
  out.push(S(slab(label, 0, 1, 3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(label, 2), 1, P), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 8, label.y + label.d - 8], 1, P, "y"), "QUAD INTAKE", { size: 4.8, tone: "lo" }));
  out.push(L([0, 1, 2].map((row) => k.lineOnTop([label.x + 4 + row * 3, label.y + 10], [label.x + 4 + row * 3, label.y + (row < 2 ? 34 : 42)], 1, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + label.w / 2, label.y + 4, 1]), at([label.x + label.w / 2, label.y + label.d - 4, 1])], { size: 0.45 }));
  return out.join("");
}

// ---- input: hopper, cards, guard ratchet ---------------------------------
function hopper() {
  const out = [];
  const walls = [
    { x: HOP.x, y: HOP.y, w: HOP.w, d: WALL, r: 1 },
    { x: HOP.x, y: HOP.y + HOP.d - WALL, w: HOP.w, d: WALL, r: 1 },
    { x: HOP.x, y: HOP.y, w: WALL, d: HOP.d, r: 1 },
    { x: HOP.x + HOP.w - WALL, y: HOP.y, w: WALL, d: HOP.d, r: 1 },
  ];
  out.push(S(slab(HOP, HOP_FLOOR, 5, 6, 0.8), { tone: "mid" }));
  for (const wall of walls) out.push(S(slab(wall, HOP_FLOOR, HOP_TOP - HOP_FLOOR, 3, 0.5), { tone: "mid" }));
  const inner = k.insetPlan(HOP, WALL);
  const stack = { x: HOP.x + (HOP.w - CARD.w) / 2, y: HOP.y + (HOP.d - CARD.d) / 2, w: CARD.w, d: CARD.d, r: CARD.r };
  for (let index = 0; index < 5; index++) {
    out.push(S(slab(stack, HOP_FLOOR + 5 + index * 2.4, 1.5, 3, 0.3), { tone: index === 4 ? "hi" : "lo" }));
    out.push(L(k.planOutline(k.insetPlan(stack, 3), HOP_FLOOR + 6.5 + index * 2.4, P, 3), { tone: "faint" }));
  }
  out.push(D([at([stack.x + 2, stack.y + 2, HOP_FLOOR + 6.5]), at([stack.x + stack.w - 2, stack.y + stack.d - 2, HOP_FLOOR + 6.5])], { size: 0.35, tone: "lo" }));
  out.push(S(cyl(HOP.x + HOP.w / 2, HOP.y + HOP.d - WALL, 1.8, HOP_FLOOR + 5, 1.4), { tone: "mid" }));
  void inner;
  out.push(S(slab({ x: RAIL_IN.x - 4, y: HOP.y + HOP.d / 2 - 10, w: 10, d: 20, r: 1.4 }, HOP_FLOOR - 9, 9, 3, 0.4), { tone: "mid" }));
  out.push(D([at([RAIL_IN.x, HOP.y + HOP.d / 2 - 10, HOP_FLOOR - 9]), at([RAIL_IN.x, HOP.y + HOP.d / 2 + 10, HOP_FLOOR - 9])], { size: 0.4 }));
  return out.join("");
}

function infeedRail() {
  const out = [];
  out.push(S(slab(RAIL_IN, RAIL_Z, RAIL_H, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(RAIL_IN, 3), RAIL_Z + RAIL_H, P, 3), { tone: "faint" }));
  out.push(S(slab({ x: RAIL_IN.x - 4, y: RAIL_IN.y + 2, w: 8, d: RAIL_IN.d - 4, r: 1 }, RAIL_Z, RAIL_H + 2, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: RAIL_IN.x + RAIL_IN.w - 4, y: RAIL_IN.y + 2, w: 8, d: RAIL_IN.d - 4, r: 1 }, RAIL_Z, RAIL_H + 2, 3, 0.4), { tone: "mid" }));
  out.push(D([at([RAIL_IN.x + 4, RAIL_IN.y + RAIL_IN.d / 2, RAIL_Z + RAIL_H]), at([RAIL_IN.x + RAIL_IN.w - 4, RAIL_IN.y + RAIL_IN.d / 2, RAIL_Z + RAIL_H])], { size: 0.4 }));
  return out.join("");
}

function guard() {
  const out = [];
  const [x, y] = GUARD;
  out.push(S(cyl(x, y, GUARD_R, RAIL_Z, 9, 48, 0.8), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(x, y, GUARD_R, RAIL_Z + 2, RAIL_Z + 7, 60, P, 0.4), { tone: "faint" }));
  out.push(S(cyl(x, y, GUARD_R + 1.4, RAIL_Z + 9, 2, 48, 0.4), { tone: "hi" }));
  // ratchet teeth around the rim
  for (let index = 0; index < 18; index++) {
    const angle = (index / 18) * Math.PI * 2;
    const tx = x + Math.cos(angle) * (GUARD_R - 1);
    const ty = y + Math.sin(angle) * (GUARD_R - 1);
    out.push(S(slab({ x: tx - 1.2, y: ty - 1.2, w: 2.4, d: 2.4, r: 0.4 }, RAIL_Z + 9, 3, 2), { tone: "lo" }));
  }
  out.push(S(cyl(x, y, 8, RAIL_Z + 9, 3, 32, 0.5), { tone: "mid" }));
  out.push(L(k.ring(x, y, 6.4, RAIL_Z + 12, P, 32), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 5.4], RAIL_Z + 12, P, "x"), M.HASH.slice(0, 4), { size: 2.6, tone: "hi", anchor: "middle" }));
  // pawl resting on a tooth
  out.push(S(slab({ x: x - 2, y: y - GUARD_R - 12, w: 4, d: 14, r: 1 }, RAIL_Z + 11, 2.6, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x - 2.4, y: y - GUARD_R - 3, w: 4.8, d: 5, r: 0.8 }, RAIL_Z + 9, 3.4, 3, 0.4), { tone: "hi" }));
  out.push(S(cyl(x, y - GUARD_R - 12, 2.2, RAIL_Z, 11, 20), { tone: "mid" }));
  out.push(D([at([x, y - GUARD_R - 12, RAIL_Z + 11.6])], { size: 0.45 }));
  return out.join("");
}

// ---- press ---------------------------------------------------------------
function press() {
  const out = [];
  const colL = { x: PX - 24, y: COL_Y, w: 10, d: 12, r: 2 };
  const colR = { x: PX + 14, y: COL_Y, w: 10, d: 12, r: 2 };
  for (const col of [colL, colR]) {
    out.push(S(slab(col, RAIL_Z, CROSS_Z - RAIL_Z, 4, 0.5), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(col, 2.5), CROSS_Z, P, 3), { tone: "faint" }));
    out.push(D([at([col.x + 2, col.y + 2, CROSS_Z]), at([col.x + col.w - 2, col.y + col.d - 2, CROSS_Z])], { size: 0.4 }));
  }
  out.push(S(slab({ x: PX - 30, y: COL_Y - 6, w: 60, d: 24, r: 3 }, CROSS_Z, 8, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: PX - 30, y: COL_Y - 6, w: 60, d: 24, r: 3 }, 3), CROSS_Z + 8, P, 3), { tone: "faint" }));
  // a handwheel on top of the crosshead
  out.push(S(cyl(PX, COL_Y + 6, 9, CROSS_Z + 8, 3, 36, 0.5), { tone: "mid" }));
  out.push(L(k.knurl(PX, COL_Y + 6, 9, CROSS_Z + 8, CROSS_Z + 11, 40, P), { tone: "lo" }));
  out.push(S(cyl(PX, COL_Y + 6, 3, CROSS_Z + 8, 5, 20, 0.5), { tone: "mid" }));
  out.push(D([at([PX, COL_Y + 6, CROSS_Z + 13])], { size: 0.5 }));
  // the anvil / die bed the card is flattened on
  out.push(S(slab(ANVIL, RAIL_Z, RAIL_H, 4, 0.5), { tone: "mid" }));
  out.push(L(k.faceTextSvg(k.topMatrix([PX, ANVIL.y + 6], RAIL_Z + RAIL_H, P, "x"), "fts_value", { size: 3, tone: "lo", anchor: "middle" })));
  return out.join("");
}

function ram() {
  const out = [];
  const body = { x: PX - 15, y: RAM_Y, w: 30, d: RAM_D, r: 2 };
  out.push(S(slab({ x: PX - 4, y: RAM_Y + RAM_D / 2 - 3, w: 8, d: 6, r: 1 }, RAM_TOP_DOWN + 9, CROSS_Z - RAM_TOP_DOWN - 9, 3, 0.4), { tone: "mid" }));
  out.push(S(slab(body, RAM_TOP_DOWN, 9, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(body, 2.5), RAM_TOP_DOWN + 9, P, 3), { tone: "faint" }));
  out.push(D(k.corners(body, 4).map(([x, y]) => at([x, y, RAM_TOP_DOWN + 9])), { size: 0.4 }));
  out.push(S(slab({ x: PX - 12, y: RAM_Y + 4, w: 24, d: RAM_D - 8, r: 1 }, RAM_TOP_DOWN - 3, 3, 3, 0.4), { tone: "mid" }));
  out.push(L(k.faceTextSvg(k.topMatrix([PX, RAM_Y + RAM_D - 5], RAM_TOP_DOWN + 9, P, "x"), "press", { size: 2.8, tone: "lo", anchor: "middle" })));
  return out.join("");
}

// ---- output ribbon and the two index bins --------------------------------
function ribbon() {
  const out = [];
  out.push(S(slab(RIBBON, RAIL_Z + RAIL_H, 1.6, 4, 0.3), { tone: "hi" }));
  const rows = 3;
  for (let row = 0; row < rows; row++) {
    const y = RIBBON.y + 3 + row * 4;
    out.push(L(k.lineOnTop([RIBBON.x + 3, y], [RIBBON.x + RIBBON.w - 3, y], RIBBON_Z + 1.6, P), { tone: "faint", free: true }));
  }
  out.push(D([at([RIBBON.x + 2, RIBBON.y + 2, RIBBON_Z + 1.6]), at([RIBBON.x + RIBBON.w - 2, RIBBON.y + RIBBON.d - 2, RIBBON_Z + 1.6])], { size: 0.4, tone: "lo" }));
  // the diverter that sends the ribbon to each index
  out.push(S(slab({ x: RIBBON.x + RIBBON.w - 6, y: -24, w: 12, d: 42, r: 2 }, RAIL_Z + RAIL_H, 4, 3, 0.4), { tone: "mid" }));
  out.push(S(cyl(RIBBON.x + RIBBON.w, -3, 3, RAIL_Z + RAIL_H, 7, 24, 0.5), { tone: "mid" }));
  out.push(D([at([RIBBON.x + RIBBON.w, -3, RAIL_Z + RAIL_H + 7])], { size: 0.5 }));
  return out.join("");
}

function bin(plan, tag) {
  const out = [];
  out.push(S(slab(plan, BIN_Z, BIN_H, 5, 0.6), { tone: "mid" }));
  out.push(S(slab(k.insetPlan(plan, 4), BIN_Z + BIN_H, 1.2, 4, 0.3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 4), BIN_Z + BIN_H + 1.2, P, 3), { tone: "faint" }));
  for (const [x, y] of k.corners(plan, 7)) out.push(D([at([x, y, BIN_Z + BIN_H])], { size: 0.42, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, plan.y + plan.d - 8], BIN_Z + BIN_H + 1.2, P, "x"), tag, { size: 3.2, tone: "lo", anchor: "middle" }));
  if (tag === "fts5") {
    for (let index = 0; index < 3; index++) out.push(S(slab({ x: plan.x + 6 + index * 3, y: plan.y + 8, w: 2.4, d: plan.d - 16, r: 0.4 }, BIN_Z + BIN_H + 1.2, 6, 2), { tone: index === 0 ? "hi" : "lo" }));
  } else {
    const cx = plan.x + plan.w / 2;
    const cy = plan.y + plan.d / 2;
    out.push(S(cyl(cx, cy, 15, BIN_Z + BIN_H + 1.2, 3, 40, 0.4), { tone: "mid" }));
    out.push(S(cyl(cx, cy, 15, BIN_Z + BIN_H + 9, 3, 40, 0.4), { tone: "mid" }));
    out.push(S(cyl(cx, cy, 6, BIN_Z + BIN_H + 1.2, 11, 24, 0.4), { tone: "hi" }));
    out.push(L(k.knurl(cx, cy, 6, BIN_Z + BIN_H + 1.2, BIN_Z + BIN_H + 12, 28, P), { tone: "faint" }));
    out.push(D([at([cx, cy, BIN_Z + BIN_H + 12])], { size: 0.45 }));
  }
  return out.join("");
}

// ---- the six-station hexastore carousel ----------------------------------
function carousel() {
  const out = [];
  const [x, y] = CAR;
  out.push(S(cyl(x, y, CAR_R, CAR_Z, CAR_H, 72, 0.8), { tone: "mid", crease: "lo" }));
  out.push(L(k.sideArc(x, y, CAR_R, CAR_Z + 1.6, P, 44), { tone: "lo" }));
  out.push(L(k.knurl(x, y, CAR_R, CAR_Z + 1.4, CAR_Z + CAR_H - 1, 90, P, 0.3), { tone: "faint" }));
  out.push(S(cyl(x, y, CAR_R + 1.4, CAR_Z + CAR_H, 2, 72, 0.4), { tone: "hi" }));
  out.push(S(cyl(x, y, 8, CAR_Z + CAR_H, 7, 28, 0.6), { tone: "mid" }));
  out.push(L(k.ring(x, y, 8, CAR_Z + CAR_H + 2, P, 32), { tone: "faint" }));
  out.push(S(cyl(x, y, 3, CAR_Z + CAR_H + 7, 4, 16, 0.5), { tone: "hi" }));
  out.push(D([at([x, y, CAR_Z + CAR_H + 11])], { size: 0.5 }));
  // six stations: a divider and a seat each
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const midX = x + dirX * (CAR_R * 0.55);
    const midY = y + dirY * (CAR_R * 0.55);
    out.push(S(slab({ x: midX - 1.4, y: midY - 1.4, w: 2.8, d: 2.8, r: 0.5 }, CAR_Z + CAR_H + 2, 2.4, 2), { tone: "lo" }));
    const seatX = x + dirX * (CAR_R - 12);
    const seatY = y + dirY * (CAR_R - 12);
    out.push(S(slab({ x: seatX - 7, y: seatY - 7, w: 14, d: 14, r: 1 }, CAR_Z + CAR_H + 2, 2, 3, 0.3), { tone: "lo" }));
    out.push(L(k.lineOnTop([x + dirX * 8, y + dirY * 8], [x + dirX * (CAR_R + 1.4), y + dirY * (CAR_R + 1.4)], CAR_Z + CAR_H + 2, P), { tone: "faint" }));
    out.push(k.faceTextSvg(k.topMatrix([seatX, seatY], CAR_Z + CAR_H + 4, P, "x"), M.PERMUTATIONS[index], { size: 2.6, tone: "mid", anchor: "middle" }));
  }
  return out.join("");
}

// ---- reject tray for duplicated quads ------------------------------------
function reject() {
  const out = [];
  out.push(S(slab(REJECT, RAIL_Z, RAIL_H, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(REJECT, 3), RAIL_Z + RAIL_H, P, 3), { tone: "faint" }));
  const walls = [
    { x: REJECT.x, y: REJECT.y + REJECT.d - 2.4, w: REJECT.w, d: 2.4, r: 0.6 },
    { x: REJECT.x, y: REJECT.y, w: 2.4, d: REJECT.d, r: 0.6 },
    { x: REJECT.x + REJECT.w - 2.4, y: REJECT.y, w: 2.4, d: REJECT.d, r: 0.6 },
  ];
  for (const wall of walls) out.push(S(slab(wall, RAIL_Z + RAIL_H, 8, 2, 0.3), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([REJECT.x + REJECT.w / 2, REJECT.y + 7], RAIL_Z + RAIL_H, P, "x"), "duplicate", { size: 2.8, tone: "lo", anchor: "middle" }));
  out.push(D([at([REJECT.x + 5, REJECT.y + 5, RAIL_Z + RAIL_H]), at([REJECT.x + REJECT.w - 5, REJECT.y + 5, RAIL_Z + RAIL_H])], { size: 0.4 }));
  return out.join("");
}

// ---- the travelling card -------------------------------------------------
function card() {
  const out = [];
  const plan = { x: -CARD.w / 2, y: -CARD.d / 2, w: CARD.w, d: CARD.d, r: CARD.r };
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 3), RAIL_Z + RAIL_H + 1, 0.1, P)}"/>`);
  out.push(S(slab(plan, RAIL_Z + RAIL_H + 1, 2.2, 3, 0.3), { tone: "hi" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), RAIL_Z + RAIL_H + 3.2, P, 3), { tone: "faint" }));
  for (let row = 0; row < 3; row++) {
    out.push(L(k.lineOnTop([plan.x + 4, plan.y + 10 + row * 6], [plan.x + plan.w - 4, plan.y + 10 + row * 6], RAIL_Z + RAIL_H + 3.2, P), { tone: "faint", free: true }));
  }
  out.push(D([at([plan.x + 3, plan.y + 3, RAIL_Z + RAIL_H + 3.2]), at([plan.x + plan.w - 3, plan.y + plan.d - 3, RAIL_Z + RAIL_H + 3.2])], { size: 0.4, tone: "lo" }));
  return out.join("");
}

// ---- assemble ------------------------------------------------------------
const STATIONS = [
  [-120, 0, RAIL_Z + RAIL_H],
  [GUARD[0] + 6, 0, RAIL_Z + RAIL_H],
  [PX + 6, -2, RAM_TOP_UP - 4],
  [RIBBON.x + 20, -1, RIBBON_Z],
  [62, -20, RAIL_Z + RAIL_H],
];

const body = [
  base(),
  hopper(),
  infeedRail(),
  guard(),
  press(),
  `<g data-part="ram">${ram()}</g>`,
  ribbon(),
  bin(BIN_K, "fts5"),
  bin(BIN_V, "vector"),
  carousel(),
  reject(),
  `<g data-part="card" transform="${k.translateAlong(P, STATIONS[0])}">${card()}</g>`,
  `<circle data-part="station" class="iso-line" data-tone="lit" cx="0" cy="0" r="0" stroke-width="1.4"/>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench machine called a quad intake. Quad cards slide from a hopper past a toothed guard wheel that carries a content hash; the guard compares the hash and lets a new quad through while a duplicate is turned aside into a reject tray. The press flattens the quad into an fts value ribbon, which a diverter feeds to two index bins, one full-text and one vector, and the quad is filed on a six-station turntable, one station per ordering of subject, predicate and object.",
  body,
});

const SEATS = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * Math.PI * 2;
  return at([CAR[0] + Math.cos(angle) * (CAR_R - 12), CAR[1] + Math.sin(angle) * (CAR_R - 12), CAR_Z + CAR_H + 6]);
});

const DATA = {
  P,
  stations: STATIONS,
  seats: SEATS,
  steps: M.STEPS.map((step) => M.READOUT(step)),
  ramUp: RAM_TOP_UP,
  ramDown: RAM_TOP_DOWN,
  top: M.STEPS.length - 1,
};

const live = `
const D = ${JSON.stringify(DATA)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const card = svg.querySelector('[data-part="card"]');
const ram = svg.querySelector('[data-part="ram"]');
const station = svg.querySelector('[data-part="station"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let index = 0, cx = D.stations[0][0], cy = D.stations[0][1], cz = D.stations[0][2];
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idle = 0;
const stationOf = (i) => D.stations[Math.min(i, D.stations.length - 1)];
function draw() {
  card.setAttribute("transform", translateAlong(D.P, [cx, cy, cz]));
  const lift = index >= 2 ? 0 : D.ramUp - D.ramDown;
  ram.setAttribute("transform", translateAlong(D.P, [0, 0, lift]));
  const seat = D.seats[index % 6];
  station.setAttribute("cx", seat[0]);
  station.setAttribute("cy", seat[1]);
  station.setAttribute("r", index >= 4 ? 4.5 : 3);
  const text = D.steps[index];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(index + 1));
  stage.setAttribute("aria-valuetext", text);
}
function ping(to) {
  index = clamp(to, 0, D.top);
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600);
  run();
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; index = Math.floor(clock / 1.7) % (D.top + 1); }
  const to = stationOf(index);
  const rate = still.matches ? 1 : 1 - Math.exp(-dt / 0.28);
  cx += (to[0] - cx) * rate; cy += (to[1] - cy) * rate; cz += (to[2] - cz) * rate;
  if (Math.abs(to[0] - cx) < 0.05) cx = to[0];
  if (Math.abs(to[1] - cy) < 0.05) cy = to[1];
  if (Math.abs(to[2] - cz) < 0.05) cz = to[2];
  draw();
  const settled = !touring && cx === to[0] && cy === to[1] && cz === to[2];
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
  fig: "Fig 2",
  title: "Quad intake",
  hint: "Move across the bench · arrow keys step the intake",
  readout: M.READOUT(M.STEPS[0]),
  keys: [
    { mark: "raised", label: "The hopper of quads and the guard wheel that carries the content hash" },
    { mark: "flat", label: "The press that flattens a quad into its searchable fts_value" },
    { mark: "lit", label: "A new quad: pressed, fed to both indexes, and filed on the hexastore" },
  ],
  caption:
    "One quad enters the intake. Because its literal is a textual string, it earns a search chunk; a quad whose literal is a number is written to the hexastore but produces no chunk at all. An idempotency guard hashes the quad first and lets a new one through while turning a duplicate aside into the reject tray, so nothing is embedded or written twice. The guard passes an fts_value — the subject name, the predicate phrase, the literal and any label aliases (\u201cFrance \u00b7 capital \u00b7 Paris \u00b7 French Republic\u201d) \u2014 to a full-text index and to a vector index together. The same quad is filed on a six-station turntable, one station for each ordering of subject, predicate and object: the persistent hexastore that SPARQL reads.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Quad intake: arrow keys step a quad through the textual filter, the idempotency guard, the press and the hexastore" aria-valuemin="1" aria-valuemax="${M.STEPS.length}" aria-valuenow="1">${svg}</div>`,
});

const css = readFileSync(join(HERE, "ingestion.css"), "utf8");
const page = k.pageHtml({ title: "Quad intake", theme, body: `<style>${css}</style>${CARD_HTML}`, script: kitScript() + live, width: 820 });
const name = theme === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `hash ${M.HASH}`);
