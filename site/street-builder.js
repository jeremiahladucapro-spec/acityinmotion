// A City in Motion — Redesign Your Street (3D)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ------------------------------------------------------------------ content
const CORRIDORS = {
  downtown:    { name: 'Downtown main street',     budget: 60, car: 2, transit: 1,
    note: 'People arrive on foot and by transit here. Wide sidewalks and bus priority matter more than moving cars quickly.' },
  residential: { name: 'Neighborhood residential', budget: 40, car: 2, transit: 0,
    note: 'Kids, driveways and parked cars. Narrow lanes and trees do more to slow drivers here than any sign.' },
  arterial:    { name: 'Urban arterial',           budget: 80, car: 4, transit: 1,
    note: 'This is where most severe crashes happen in most cities. Crossing distance and speed are the whole fight.' },
  industrial:  { name: 'Industrial corridor',      budget: 70, car: 2, transit: 0,
    note: 'Trucks and long blocks. Separating people from heavy vehicles matters more here than anywhere.' },
};

// code is used in share links, so never change an existing one
const P = {
  sidewalk:   { code: 'sw', n: 'Sidewalk',              ft: 6,  min: 4, max: 16, c: '#E3DDCF', cat: 'walk',    raised: true,
    desc: 'The walking zone. It needs room for two people to pass, or for someone in a wheelchair to pass someone with a stroller.' },
  trees:      { code: 'tr', n: 'Trees and planting',    ft: 5,  min: 3, max: 8,  c: '#9CCBA8', cat: 'buffer',  raised: true,
    desc: 'A planted strip between people walking and moving cars. It adds shade and makes the street feel narrower, which tends to slow drivers.' },
  utilities:  { code: 'ut', n: 'Lighting and utilities', ft: 4, min: 3, max: 6,  c: '#CFCABE', cat: 'util',    raised: true,
    desc: 'Streetlights, poles and signs grouped in one strip, out of the walking path. Good lighting helps drivers see people crossing at night.' },
  shelter:    { code: 'sh', n: 'Bus shelter',            ft: 8,  min: 6, max: 10, c: '#D8CEEA', cat: 'stop',    raised: true,
    desc: 'A covered place to wait for the bus, with a bench. Riders wait out of the walking path.' },
  bikeshare:  { code: 'bs', n: 'Bike share dock',        ft: 6,  min: 5, max: 8,  c: '#B9CBD6', cat: 'micro',   raised: true,
    desc: 'Bikes people can rent for short trips, docked in the furniture zone so they stay off the sidewalk.' },
  scooter:    { code: 'sc', n: 'Scooter corral',         ft: 5,  min: 4, max: 7,  c: '#C6D3DA', cat: 'micro',   raised: true,
    desc: 'A marked place to park scooters, so they are not left lying across the sidewalk.' },
  protbike:   { code: 'pb', n: 'Protected bike lane',    ft: 8,  min: 6, max: 10, c: '#5E9E76', cat: 'bike',    dir: true,
    desc: 'A bike lane separated from moving traffic by a painted buffer and posts. Separation is what changes who feels safe riding.' },
  bike:       { code: 'bk', n: 'Painted bike lane',      ft: 5,  min: 4, max: 7,  c: '#9DBFA9', cat: 'bike',    dir: true,
    desc: 'A bike lane marked only with paint. Better than nothing, but paint does not stop a car from drifting or parking in it.' },
  parking:    { code: 'pk', n: 'Parking lane',           ft: 8,  min: 7, max: 9,  c: '#8E93A0', cat: 'park',
    desc: 'Curbside parking. It buffers the sidewalk from traffic, and it uses space that could go to people walking, biking or waiting for a bus.' },
  lane:       { code: 'ln', n: 'Travel lane',            ft: 11, min: 9, max: 13, c: '#727888', cat: 'car',     dir: true,
    desc: 'A general travel lane. At 12 feet or wider it reads like a highway lane, and drivers speed up to match.' },
  narrowlane: { code: 'nl', n: 'Narrow travel lane',     ft: 9,  min: 9, max: 10, c: '#7D8392', cat: 'car',     dir: true,
    desc: 'A travel lane about 9 to 10 feet wide. Narrower lanes nudge drivers to slow down, at almost no cost.' },
  bus:        { code: 'bu', n: 'Bus lane',               ft: 11, min: 10, max: 12, c: '#C4584F', cat: 'transit', dir: true,
    desc: 'A lane reserved for buses, so riders are not stuck in the same traffic as everyone else.' },
  median:     { code: 'md', n: 'Median refuge',          ft: 6,  min: 4, max: 12, c: '#8FB07A', cat: 'buffer',  raised: true,
    desc: 'A raised island in the middle of the street. People crossing get a place to wait partway, and opposing traffic is separated.' },
};
const BY_CODE = Object.fromEntries(Object.entries(P).map(([k, v]) => [v.code, k]));
const GROUPS = [
  ['For people walking', ['sidewalk', 'trees', 'utilities', 'shelter']],
  ['Bikes and scooters', ['protbike', 'bike', 'bikeshare', 'scooter']],
  ['Cars and buses', ['lane', 'narrowlane', 'bus', 'parking']],
  ['In the middle', ['median']],
];
const EXAMPLES = {
  downtown:    [['sidewalk', 10, 1], ['trees', 5, 1], ['protbike', 7, -1], ['bus', 11, -1], ['narrowlane', 10, 1], ['protbike', 7, 1], ['utilities', 4, 1], ['sidewalk', 6, 1]],
  residential: [['sidewalk', 6, 1], ['trees', 4, 1], ['parking', 8, 1], ['narrowlane', 9, -1], ['narrowlane', 9, 1], ['trees', 4, 1]],
  arterial:    [['sidewalk', 8, 1], ['trees', 5, 1], ['protbike', 8, -1], ['narrowlane', 10, -1], ['narrowlane', 10, -1], ['median', 6, 1], ['narrowlane', 10, 1], ['protbike', 8, 1], ['sidewalk', 5, 1]],
  industrial:  [['sidewalk', 8, 1], ['utilities', 4, 1], ['protbike', 8, -1], ['lane', 11, -1], ['median', 6, 1], ['lane', 11, 1], ['trees', 6, 1], ['sidewalk', 8, 1]],
};

// ------------------------------------------------------------------ state
const state = { c: 'downtown', s: [], sel: null, view: 'orbit' };
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function encode() {
  return 'c=' + state.c + '&s=' + state.s.map(x => P[x.k].code + x.ft + (P[x.k].dir ? (x.dir === 1 ? 'n' : 's') : '')).join(',');
}
function decode(hash) {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const c = q.get('c'); const s = q.get('s');
  if (!c || !CORRIDORS[c]) return false;
  const out = [];
  for (const tok of (s || '').split(',').filter(Boolean)) {
    const m = tok.match(/^([a-z]{2})(\d{1,2})([ns]?)$/);
    if (!m || !BY_CODE[m[1]]) continue;
    const k = BY_CODE[m[1]], p = P[k];
    out.push({ k, ft: Math.max(p.min, Math.min(p.max, +m[2])), dir: m[3] === 's' ? -1 : 1 });
    if (out.length >= 24) break;
  }
  state.c = c; state.s = out; return true;
}
function loadExample() { state.s = EXAMPLES[state.c].map(([k, ft, dir]) => ({ k, ft, dir })); state.sel = null; }

// ------------------------------------------------------------------ scoring
function judge() {
  const C = CORRIDORS[state.c], S = state.s, tot = used();
  const cnt = (cat) => S.filter(x => P[x.k].cat === cat).length;
  const notes = []; let sc = 0;
  const sw = S.filter(x => x.k === 'sidewalk');
  if (sw.length >= 2) {
    sc += 20;
    notes.push(sw.some(x => x.ft < 6)
      ? ['good', 'Sidewalks on both sides, though one is under 6 feet. That is tight for two people to pass, or for a wheelchair.']
      : ['good', 'Sidewalks on both sides, with real width. That is the baseline every street owes people walking.']);
  } else if (sw.length === 1) { sc += 7; notes.push(['bad', 'Only one sidewalk. Everyone on the other side walks in the roadway or crosses twice.']); }
  else notes.push(['bad', 'No sidewalk. Whatever else this street does well, it is not walkable.']);

  if (S.some(x => x.k === 'protbike')) { sc += 20; notes.push(['good', 'A protected bike lane. Physical separation changes who actually feels safe riding.']); }
  else if (S.some(x => x.k === 'bike')) { sc += 9; notes.push(['tip', 'A painted bike lane. Better than nothing, but paint does not stop a car.']); }
  else notes.push(['tip', 'No bike lane. People on bikes ride on the sidewalk or in the travel lane, and both create conflict.']);

  const cars = cnt('car');
  if (!cars) { sc += 6; notes.push(['tip', 'No travel lanes. Bold, but fire trucks and deliveries still need a way through.']); }
  else if (cars <= C.car) { sc += 20; notes.push(['good', `${cars} travel lane${cars > 1 ? 's' : ''}. Right for this street: shorter crossings and lower speeds.`]); }
  else notes.push(['bad', `${cars} travel lanes on a ${C.name.toLowerCase()}. Every extra lane lengthens the crossing and invites faster driving.`]);

  const carLanes = S.filter(x => P[x.k].cat === 'car');
  if (carLanes.length >= 2) {
    const north = carLanes.filter(x => x.dir === 1).length;
    if (north === 0 || north === carLanes.length) notes.push(['tip', 'Every travel lane runs the same way, so this is a one-way street. One-way streets usually move traffic faster, the opposite of what most neighborhood streets want.']);
    else { sc += 6; notes.push(['good', 'Two-way traffic. Opposing traffic keeps speeds down on its own.']); }
  }
  const wide = S.filter(x => P[x.k].cat === 'car' && x.ft >= 12).length;
  if (wide) notes.push(['bad', `${wide} lane${wide > 1 ? 's are' : ' is'} 12 feet or wider. Wide lanes read as highway, and drivers respond accordingly.`]);
  else if (cars) { sc += 7; notes.push(['good', 'Lanes kept narrow. It is the cheapest speed-management tool there is.']); }

  if (cnt('buffer')) { sc += 9; notes.push(['good', 'Trees or a median. Both narrow the view down the street and slow drivers without a sign.']); }
  if (cnt('micro')) { sc += 6; notes.push(['good', 'Bike share or scooter parking off the sidewalk, so the walking path stays clear.']); }
  if (cnt('util')) { sc += 6; notes.push(['good', 'A lighting zone. Lighting is one of the most cost-effective pedestrian safety measures there is.']); }
  if (cnt('transit')) {
    if (C.transit) { sc += 9; notes.push(['good', 'A bus lane. It moves more people per foot of pavement than anything else here.']); }
    else notes.push(['tip', 'A bus lane is unusual on this kind of street. Check whether a bus route actually runs here.']);
  } else if (C.transit) notes.push(['tip', 'No bus priority on a street that likely carries a bus route.']);
  if (cnt('transit') && !S.some(x => x.k === 'shelter')) notes.push(['tip', 'Bus riders need somewhere to wait. Try adding a bus shelter.']);

  if (tot > C.budget) { sc = Math.max(sc - 18, 0); notes.push(['bad', `You are ${tot - C.budget} feet over the right-of-way. This is where a real project gets sent back, and the sidewalk is usually what gets cut.`]); }
  else if (S.length && tot < C.budget - 8) notes.push(['tip', `${C.budget - tot} feet are not assigned to anything. Leftover space quietly becomes wider lanes.`]);

  sc = Math.max(0, Math.min(100, sc));
  let tag;
  if (sc >= 80) tag = ['Vision Zero aligned', '#E4EEEA', '#2F6D5C'];
  else if (sc >= 55) tag = ['Getting there', '#EEE8F6', '#5F4E86'];
  else if (sc >= 30) tag = ['Car-first', '#F5EDE3', '#8A5900'];
  else tag = ['Unsafe by design', '#F7E7E7', '#A33F3F'];
  return { sc, tag, notes };
}
const used = () => state.s.reduce((a, x) => a + x.ft, 0);

// ------------------------------------------------------------------ 3D setup
const HEX = {
  navy: '#2B3550', navy2: '#3A4568', cream: '#F5F1E8', walk: '#E3DDCF', walkSide: '#C9C1AE', lav: '#B8A6D9', lavDk: '#5F4E86',
  slate: '#6B7280', grey: '#C3C9D6', greyDk: '#9AA3B5', blue: '#5C86BE', blueDk: '#47699A', red: '#C4584F', amber: '#DFA741',
  green: '#5E9E76', grass: '#9CCBA8', canopy: '#5E9E76', canopy2: '#7DB38F', trunk: '#7A6A5A', white: '#FFFFFF', skin: '#E8C9A8',
  asphalt: '#5B6379', parkAsphalt: '#666E84', ground: '#EAE3D2', yellow: '#E8C36A', sky: '#DCE0EC',
  bldg: ['#F5F1E8', '#E9E3F5', '#D8CEEA', '#FFFFFF', '#E3DDCF'],
};
const col = (h) => new THREE.Color(h);
const CURB = 0.6, L = 300, ZA = -L / 2, ZB = L / 2;

const stage = $('stage'), canvas = $('c');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); }
catch (e) { stage.insertAdjacentHTML('beforeend', '<div class="webgl-fail"><p>The 3D view needs WebGL, which this browser has turned off. The strip, the buttons and the score below still work.</p></div>'); }
if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(col(HEX.navy), 1); }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 4000);
const controls = renderer ? new OrbitControls(camera, canvas) : null;
if (controls) { controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true; }

const LH = new THREE.Vector3(0.55, 0, 0.83).normalize();
const L3 = new THREE.Vector3(0.45, 1.0, 0.6).normalize();
class Builder {
  constructor() { this.p = []; this.c = []; }
  get empty() { return this.p.length === 0; }
  tri(a, b, c, k) { this.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) this.c.push(k.r, k.g, k.b); }
  prism(pts, y0, y1, top, side) {
    const t = col(top), s = col(side || top);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts.map(p => new THREE.Vector2(p[0], p[1])), []))
      this.tri([pts[i][0], y1, pts[i][1]], [pts[j][0], y1, pts[j][1]], [pts[k][0], y1, pts[k][1]], t);
    if (y1 - y0 < 1e-6) return;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      let nx = b[1] - a[1], nz = -(b[0] - a[0]);
      if (nx * ((a[0] + b[0]) / 2 - cx) + nz * ((a[1] + b[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
      const len = Math.hypot(nx, nz) || 1;
      const sc = s.clone().multiplyScalar(0.62 + 0.3 * Math.max(0, (nx * LH.x + nz * LH.z) / len));
      this.tri([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], sc);
      this.tri([a[0], y0, a[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], sc);
    }
  }
  box(x0, x1, z0, z1, y0, y1, top, side) { this.prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1, top, side); }
  geo(g, m, hex, amb = 0.62) {
    const G = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); G.computeVertexNormals();
    const Pp = G.attributes.position.array, N = G.attributes.normal.array, c = col(hex);
    for (let i = 0; i < Pp.length; i += 9) {
      const n = new THREE.Vector3(N[i], N[i + 1], N[i + 2]);
      const k = c.clone().multiplyScalar(n.y > 0.97 ? 1 : amb + (1 - amb) * Math.max(0, n.dot(L3)));
      this.tri([Pp[i], Pp[i + 1], Pp[i + 2]], [Pp[i + 3], Pp[i + 4], Pp[i + 5]], [Pp[i + 6], Pp[i + 7], Pp[i + 8]], k);
    }
  }
  mesh(opts = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, ...opts }));
  }
}
const edgeMat = new THREE.LineBasicMaterial({ color: col('#262A3D'), transparent: true, opacity: 0.22 });
const outline = (m, a = 30) => { m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, a), edgeMat)); return m; };
const octa = (x, z, r, n = 8) => { const p = []; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; p.push([x + r * Math.cos(a), z + r * Math.sin(a)]); } return p; };
const PAINT = (f = -1) => ({ polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: 4 * f });

// deterministic randomness so buildings do not jump around on every edit
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ actor prototypes (feet; models face +x)
function carProto(hex) {
  const b = new Builder();
  b.box(-7.5, 7.5, -3, 3, 1.1, 3.6, hex); b.box(-3.8, 3.4, -2.7, 2.7, 3.6, 5.6, HEX.navy, HEX.navy2);
  const w = new THREE.CylinderGeometry(1.2, 1.2, 0.7, 10).rotateX(Math.PI / 2);
  for (const x of [-4.8, 4.8]) for (const s of [-1, 1]) b.geo(w, new THREE.Matrix4().makeTranslation(x, 1.2, s * 2.8), HEX.navy, 0.8);
  return b.mesh();
}
function busProto() {
  const b = new Builder(), Lb = 40, W = 8.4;
  b.box(-Lb / 2, Lb / 2, -W / 2, W / 2, 1.4, 10.4, HEX.blueDk, HEX.blue);
  for (const s of [-1, 1]) { b.box(-Lb / 2 + 2, Lb / 2 - 4, s * W / 2 - 0.05, s * W / 2 + 0.05, 5.4, 9, HEX.navy); b.box(-Lb / 2, Lb / 2, s * W / 2 - 0.05, s * W / 2 + 0.05, 3.4, 4.3, HEX.lav); }
  b.box(Lb / 2 - 0.05, Lb / 2 + 0.05, -W / 2 + 0.6, W / 2 - 0.6, 4.8, 9.4, HEX.navy);
  const w = new THREE.CylinderGeometry(1.8, 1.8, 1, 12).rotateX(Math.PI / 2);
  for (const x of [-Lb / 2 + 7, Lb / 2 - 8]) for (const s of [-1, 1]) b.geo(w, new THREE.Matrix4().makeTranslation(x, 1.8, s * (W / 2 - 0.2)), HEX.navy, 0.8);
  return b.mesh();
}
function personProto(hex) {
  const b = new Builder();
  b.geo(new THREE.CylinderGeometry(0.8, 0.95, 4.1, 8), new THREE.Matrix4().makeTranslation(0, 2.05, 0), hex, 0.7);
  b.geo(new THREE.IcosahedronGeometry(0.75, 1), new THREE.Matrix4().makeTranslation(0, 4.9, 0), HEX.skin, 0.75);
  return b.mesh();
}
function riderProto(hex) {
  const b = new Builder(), w = new THREE.TorusGeometry(1.1, 0.18, 6, 14);
  for (const x of [-1.8, 1.8]) b.geo(w, new THREE.Matrix4().makeTranslation(x, 1.2, 0), HEX.navy, 0.8);
  b.box(-1.8, 1.8, -0.12, 0.12, 1.8, 2.05, HEX.navy2);
  b.geo(new THREE.CylinderGeometry(0.7, 0.85, 2.6, 8), new THREE.Matrix4().makeTranslation(0.2, 3.6, 0), hex, 0.7);
  b.geo(new THREE.IcosahedronGeometry(0.7, 1), new THREE.Matrix4().makeTranslation(0.4, 5.5, 0), HEX.skin, 0.75);
  return b.mesh();
}
const PROTO = {
  cars: [HEX.lav, HEX.grey, HEX.blueDk, HEX.white, HEX.greyDk, HEX.red].map(carProto),
  bus: busProto(),
  people: [HEX.navy2, HEX.lavDk, HEX.blue, HEX.red, HEX.navy].map(personProto),
  riders: [HEX.blue, HEX.lavDk, HEX.red, HEX.navy2].map(riderProto),
};
for (const v of Object.values(PROTO)) for (const m of [].concat(v)) m.userData.shared = true;

// ------------------------------------------------------------------ build the street
let world = null;
const pickables = [];
const movers = [];           // { obj, x, z0, vz }
const segX = [];             // [x0, x1, top] per segment
let geomEdges = { left: 0, right: 0 };
const hlMat = new THREE.MeshBasicMaterial({ color: col(HEX.amber), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const hlEdge = new THREE.LineBasicMaterial({ color: col(HEX.amber) });
let hl = null;

function disposeTree(o) { o.traverse(n => { if (n.geometry && !n.userData.shared) n.geometry.dispose(); }); }

function tree(b, x, z, base, r) {
  b.prism(octa(x, z, r * 0.12), base, base + r * 1.1, HEX.trunk);
  b.geo(new THREE.IcosahedronGeometry(r, 1), new THREE.Matrix4().makeTranslation(x, base + r * 1.75, z).multiply(new THREE.Matrix4().makeScale(1, 0.9, 1)), (Math.round(z) % 2) ? HEX.canopy : HEX.canopy2, 0.66);
}
function arrow(pb, cx, z, dir) {
  const s = -dir, hw = 0.35, hh = 1.2;
  pb.prism([[cx - hw, z - s * 4], [cx + hw, z - s * 4], [cx + hw, z + s * 2], [cx + hh, z + s * 2], [cx, z + s * 5], [cx - hh, z + s * 2], [cx - hw, z + s * 2]], 0.02, 0.02, HEX.white);
}
function addMover(proto, x, y, z0, speed, dir, shared = true) {
  const m = proto.clone(); m.position.set(x, y, z0); m.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  world.add(m); movers.push({ obj: m, z0, vz: -dir * speed });
}
function addStatic(proto, x, y, z, rotY = 0) {
  const m = proto.clone(); m.position.set(x, y, z); m.rotation.y = rotY; world.add(m); return m;
}

function buildWorld() {
  if (world) { disposeTree(world); scene.remove(world); }
  world = new THREE.Group(); scene.add(world);
  pickables.length = 0; movers.length = 0; segX.length = 0; hl = null;
  const S = state.s, C = CORRIDORS[state.c], W = used(), R = rng(Object.keys(CORRIDORS).indexOf(state.c) * 7919 + 17);
  const half = W / 2, rowHalf = C.budget / 2;
  const edge = Math.max(half, rowHalf);
  const slabHalf = edge + 70;
  geomEdges = { left: -half, right: half };

  // base slab and ground
  { const b = new Builder();
    b.box(-slabHalf, slabHalf, ZA, ZB, -5, -0.06, HEX.slate, HEX.lavDk);
    for (const s of [-1, 1]) {
      const a = s < 0 ? -slabHalf : half, c = s < 0 ? -half : slabHalf;
      if (c - a > 0.01) b.box(a, c, ZA, ZB, -0.06, 0, HEX.ground, HEX.walkSide);
    }
    world.add(b.mesh()); }

  // right-of-way lines
  { const pb = new Builder(), over = W > C.budget;
    for (const s of [-1, 1]) for (let z = ZA + 2; z < ZB - 4; z += 10) {
      const x = s * rowHalf, y = over ? CURB + 0.08 : 0.03;
      pb.box(x - 0.3, x + 0.3, z, z + 5, y, y, over ? HEX.red : HEX.lavDk);
    }
    world.add(pb.mesh(PAINT(-2))); }

  // segments
  let x = -half;
  S.forEach((seg, i) => {
    const p = P[seg.k], x0 = x, x1 = x + seg.ft, cx = (x0 + x1) / 2, w = seg.ft; x = x1;
    const b = new Builder(), pb = new Builder();
    const top = p.raised ? CURB : 0;
    segX.push([x0, x1, top]);
    const leftN = S[i - 1] ? P[S[i - 1].k].cat : null, rightN = S[i + 1] ? P[S[i + 1].k].cat : null;
    const traffic = (c) => c === 'car' || c === 'transit' || c === 'park';

    if (p.raised && seg.k !== 'median' && seg.k !== 'trees') b.box(x0, x1, ZA, ZB, 0, CURB, seg.k === 'sidewalk' ? HEX.walk : '#DED7C6', HEX.walkSide);
    if (!p.raised) b.box(x0, x1, ZA, ZB, 0, 0, seg.k === 'parking' ? HEX.parkAsphalt : HEX.asphalt);

    switch (seg.k) {
      case 'sidewalk': {
        for (let z = ZA + 5; z < ZB; z += 5) pb.box(x0 + 0.2, x1 - 0.2, z - 0.05, z + 0.05, CURB + 0.01, CURB + 0.01, HEX.walkSide);
        const n = Math.max(2, Math.round(w / 3));
        for (let k = 0; k < n; k++) {
          const px = x0 + (k + 0.5) * w / n, dir = k % 2 ? 1 : -1;
          addMover(PROTO.people[(i + k) % PROTO.people.length], px, CURB, ZA + ((k * 97 + i * 41) % L), 4.2 + (k % 3) * 0.5, dir);
        }
        break;
      }
      case 'trees': {
        b.box(x0, x1, ZA, ZB, 0, CURB, HEX.grass, HEX.walkSide);
        const r = Math.max(3.5, Math.min(8, w * 1.1));
        for (let z = ZA + 12; z < ZB - 6; z += 28) tree(b, cx, z, CURB, r);
        break;
      }
      case 'utilities': {
        const toC = cx < 0 ? 1 : -1;
        for (let z = ZA + 20; z < ZB; z += 55) {
          b.prism(octa(cx, z, 0.35), CURB, CURB + 22, HEX.navy2);
          const lx = cx + toC * 5;
          b.box(Math.min(cx, lx) - 0.2, Math.max(cx, lx) + 0.2, z - 0.2, z + 0.2, CURB + 21.4, CURB + 22, HEX.navy2);
          b.box(lx - 1, lx + 1, z - 0.6, z + 0.6, CURB + 20.8, CURB + 21.4, HEX.lav);
        }
        for (let z = ZA + 45; z < ZB; z += 55) b.box(cx - 0.8, cx + 0.8, z - 0.8, z + 0.8, CURB, CURB + 3.5, HEX.greyDk);
        break;
      }
      case 'shelter': {
        const back = cx < 0 ? x0 + 0.6 : x1 - 0.6, fr = cx < 0 ? x1 - 1.2 : x0 + 1.2;
        for (const zc of [-40, 60]) {
          b.box(Math.min(back, back + (cx < 0 ? 0.4 : -0.4)), Math.max(back, back + (cx < 0 ? 0.4 : -0.4)), zc - 8, zc + 8, CURB, CURB + 8.5, HEX.navy2);
          for (const zz of [zc - 7.6, zc + 7.2]) b.box(Math.min(back, fr), Math.max(back, fr), zz, zz + 0.4, CURB + 8.3, CURB + 8.5, HEX.navy2);
          b.box(Math.min(back, fr) - 0.6, Math.max(back, fr) + 0.6, zc - 8.6, zc + 8.6, CURB + 8.5, CURB + 9.2, HEX.lav, HEX.lavDk);
          for (const zz of [zc - 8, zc + 7.6]) b.box(fr - 0.2, fr + 0.2, zz, zz + 0.4, CURB, CURB + 8.5, HEX.navy);
          const bx = back + (cx < 0 ? 1.2 : -1.2);
          b.box(bx - 0.8, bx + 0.8, zc - 5, zc + 5, CURB + 1.4, CURB + 1.8, HEX.blueDk);
          addStatic(PROTO.people[(i + 1) % 5], bx + (cx < 0 ? 2 : -2), CURB, zc + 2);
          addStatic(PROTO.people[(i + 3) % 5], bx + (cx < 0 ? 2.5 : -2.5), CURB, zc - 3);
        }
        break;
      }
      case 'bikeshare': {
        for (const zc of [-50, 30]) {
          b.box(cx - 0.3, cx + 0.3, zc - 14, zc + 14, CURB, CURB + 0.4, HEX.navy2);
          b.box(cx - 0.8, cx + 0.8, zc - 17, zc - 15.4, CURB, CURB + 5.5, HEX.lavDk);
        }
        for (const zc of [-50, 30]) for (let z = zc - 12; z <= zc + 12; z += 4) {
          const w2 = new THREE.TorusGeometry(1.1, 0.18, 6, 14).rotateY(Math.PI / 2);
          for (const dx of [-1.8, 1.8]) b.geo(w2, new THREE.Matrix4().makeTranslation(cx + dx, CURB + 1.2, z), HEX.navy, 0.8);
          b.box(cx - 1.8, cx + 1.8, z - 0.12, z + 0.12, CURB + 1.8, CURB + 2.05, HEX.lav);
        }
        break;
      }
      case 'scooter': {
        for (const zc of [-10, 80]) {
          for (const [a0, a1, c0, c1] of [[x0 + 0.5, x1 - 0.5, zc - 10, zc - 9.7], [x0 + 0.5, x1 - 0.5, zc + 9.7, zc + 10], [x0 + 0.5, x0 + 0.8, zc - 10, zc + 10], [x1 - 0.8, x1 - 0.5, zc - 10, zc + 10]])
            pb.box(a0, a1, c0, c1, CURB + 0.01, CURB + 0.01, HEX.white);
          for (let z = zc - 7; z <= zc + 7; z += 3.5) {
            b.box(cx - 0.3, cx + 0.3, z - 1.6, z + 1.6, CURB + 0.4, CURB + 0.6, HEX.lavDk);
            b.box(cx - 0.12, cx + 0.12, z + 1.3, z + 1.55, CURB + 0.6, CURB + 3.6, HEX.lavDk);
            const w2 = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8).rotateZ(Math.PI / 2);
            for (const dz of [-1.5, 1.5]) b.geo(w2, new THREE.Matrix4().makeTranslation(cx, CURB + 0.4, z + dz), HEX.navy, 0.8);
          }
        }
        break;
      }
      case 'protbike': case 'bike': {
        const prot = seg.k === 'protbike';
        let bufL = 0, bufR = 0;
        if (prot) {
          const bw = Math.min(2.5, w * 0.3);
          if (traffic(leftN) && !traffic(rightN)) bufL = bw;
          else if (traffic(rightN) && !traffic(leftN)) bufR = bw;
          else if (cx < 0) bufR = bw; else bufL = bw;
        }
        const g0 = x0 + bufL, g1 = x1 - bufR;
        pb.box(g0 + 0.15, g1 - 0.15, ZA, ZB, 0.01, 0.01, HEX.green);
        const bufX = bufL ? [x0, x0 + bufL] : bufR ? [x1 - bufR, x1] : null;
        if (bufX) {
          for (const e of bufX) pb.box(e - 0.12, e + 0.12, ZA, ZB, 0.015, 0.015, HEX.white);
          for (let z = ZA + 3; z < ZB; z += 8) { pb.prism([[bufX[0], z], [bufX[0], z + 0.6], [bufX[1], z + 2.2], [bufX[1], z + 1.6]], 0.015, 0.015, HEX.white); }
          const px = (bufX[0] + bufX[1]) / 2;
          for (let z = ZA + 6; z < ZB; z += 10) b.prism(octa(px, z, 0.28), 0, 3.2, HEX.white, HEX.grey);
        } else {
          const side = traffic(rightN) || (!traffic(leftN) && cx < 0) ? x1 : x0;
          pb.box(side - 0.25, side + 0.25, ZA, ZB, 0.015, 0.015, HEX.white);
        }
        // bike symbols
        for (let z = ZA + 30; z < ZB; z += 90) {
          const bx = (g0 + g1) / 2;
          pb.prism(octa(bx, z - 1.2, 0.8, 10), 0.02, 0.02, HEX.white); pb.prism(octa(bx, z + 1.2, 0.8, 10), 0.02, 0.02, HEX.white);
          arrow(pb, bx, z + (seg.dir === 1 ? -7 : 7), seg.dir);
        }
        for (let k = 0; k < 3; k++) addMover(PROTO.riders[(i + k) % PROTO.riders.length], (g0 + g1) / 2, 0, ZA + ((k * 101 + i * 37) % L), 13 + k, seg.dir);
        break;
      }
      case 'parking': {
        const curbSide = traffic(leftN) ? x1 : x0, laneSide = curbSide === x1 ? x0 : x1;
        pb.box(laneSide - 0.15, laneSide + 0.15, ZA, ZB, 0.015, 0.015, HEX.white);
        for (let z = ZA + 2, k = 0; z < ZB - 20; z += 22, k++) {
          pb.box(Math.min(laneSide, laneSide + (laneSide < curbSide ? 1.5 : -1.5)), Math.max(laneSide, laneSide + (laneSide < curbSide ? 1.5 : -1.5)), z - 0.12, z + 0.12, 0.015, 0.015, HEX.white);
          if ((k + i) % 4 !== 2) addStatic(PROTO.cars[(k + i) % PROTO.cars.length], cx, 0, z + 11, (k % 2) ? Math.PI / 2 : -Math.PI / 2);
        }
        break;
      }
      case 'lane': case 'narrowlane': {
        for (let z = ZA + 40; z < ZB; z += 75) arrow(pb, cx, z, seg.dir);
        const speed = seg.k === 'lane' ? 44 : 32;
        for (let k = 0; k < 3; k++) addMover(PROTO.cars[(i * 2 + k) % PROTO.cars.length], cx, 0, ZA + ((k * 100 + i * 53) % L), speed, seg.dir);
        break;
      }
      case 'bus': {
        pb.box(x0 + 0.2, x1 - 0.2, ZA, ZB, 0.01, 0.01, HEX.red);
        for (let z = ZA + 25; z < ZB; z += 70) {
          for (const d of [0, 3]) pb.box(cx - w * 0.3, cx + w * 0.3, z + d, z + d + 0.9, 0.02, 0.02, HEX.white);
          arrow(pb, cx, z + (seg.dir === 1 ? -9 : 12), seg.dir);
        }
        addMover(PROTO.bus, cx, 0, ZA + ((i * 71) % L), 26, seg.dir);
        break;
      }
      case 'median': {
        b.box(x0 + 0.3, x1 - 0.3, ZA, ZB, 0, CURB, HEX.grass, HEX.grey);
        if (w >= 5) for (let z = ZA + 20; z < ZB - 6; z += 36) tree(b, cx, z, CURB, Math.min(6, w * 0.7));
        else for (let z = ZA + 8; z < ZB; z += 12) b.geo(new THREE.IcosahedronGeometry(1.2, 0), new THREE.Matrix4().makeTranslation(cx, CURB + 1, z), HEX.canopy, 0.7);
        break;
      }
    }
    for (const [bb, opts] of [[b, {}], [pb, PAINT(-1)]]) {
      if (bb.empty) continue;
      const m = bb.mesh(opts); m.userData.idx = i;
      if (bb === b && p.raised) outline(m, 35);
      world.add(m); pickables.push(m);
    }
  });

  // lane lines between road segments
  { const pb = new Builder(); let xx = -half;
    for (let i = 0; i < S.length - 1; i++) {
      xx += S[i].ft;
      const a = S[i], c = S[i + 1], ca = P[a.k].cat, cc = P[c.k].cat;
      const road = (k) => k === 'car' || k === 'transit';
      if (!road(ca) || !road(cc)) continue;
      if (a.dir === c.dir) for (let z = ZA; z < ZB; z += 30) pb.box(xx - 0.2, xx + 0.2, z, z + 10, 0.02, 0.02, HEX.white);
      else for (const o of [-0.45, 0.45]) pb.box(xx + o - 0.17, xx + o + 0.17, ZA, ZB, 0.02, 0.02, HEX.yellow);
    }
    if (!pb.empty) world.add(pb.mesh(PAINT(-2))); }

  // buildings
  const H = { downtown: [30, 85, 26, 42, 2], residential: [16, 26, 24, 34, 16], arterial: [14, 40, 30, 55, 14], industrial: [18, 30, 60, 95, 10] }[state.c];
  for (const s of [-1, 1]) {
    const face = s * (edge + (state.c === 'residential' ? 18 : 8));
    let z = ZA + 4;
    while (z < ZB - 12) {
      const len = Math.min(H[2] + R() * (H[3] - H[2]), ZB - 4 - z); if (len < 12) break;
      const h = (H[0] + R() * (H[1] - H[0])) * (s > 0 ? 0.6 : 1), depth = 36 + R() * 22, cidx = Math.floor(R() * HEX.bldg.length);
      const xa = s < 0 ? face - depth : face, xb = s < 0 ? face : face + depth;
      const b = new Builder(); b.box(xa, xb, z, z + len, 0, h, HEX.bldg[cidx]);
      const win = new Builder(), fx = face;
      for (let y = 3; y < h - 3; y += 10) for (let wz = z + 3; wz + 4 < z + len - 2; wz += 7) {
        win.box(Math.min(fx, fx - s * 0.15), Math.max(fx, fx - s * 0.15), wz, wz + 4, y, y + 5, HEX.navy2);
      }
      const m = outline(b.mesh()); if (!win.empty) m.add(win.mesh()); world.add(m);
      if (state.c === 'residential' || state.c === 'arterial') {
        const tb = new Builder(); if (R() > 0.4) tree(tb, face - s * 6, z + len / 2, 0, 6); if (!tb.empty) world.add(tb.mesh());
      }
      z += len + H[4] * R();
    }
  }

  // selection highlight
  if (state.sel !== null && segX[state.sel]) {
    const [x0, x1, top] = segX[state.sel];
    const g = new THREE.BoxGeometry(x1 - x0, top + 1.2, L).translate((x0 + x1) / 2, (top + 1.2) / 2, 0);
    hl = new THREE.Mesh(g, hlMat); hl.renderOrder = 5; hl.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), hlEdge)); world.add(hl);
  }
  $('empty-msg').hidden = S.length > 0;
  updateViewButtons();
  if (state.view === 'walk' || state.view === 'drive') { if (!eyeAnchor(state.view)) setView('orbit', true); else resetEye(); }
}

// ------------------------------------------------------------------ camera views
const DEG = THREE.MathUtils.degToRad;
function fitDist(widthNeeded, depthNeeded) {
  const vt = Math.tan(DEG(camera.fov / 2)), ht = vt * camera.aspect;
  return Math.max(widthNeeded / 2 / ht, depthNeeded / 2 / vt);
}
function orbitPose() {
  const C = CORRIDORS[state.c], span = Math.max(used(), C.budget) + 60;
  const d = Math.max(300, fitDist(span * 1.35, span));
  const az = DEG(15), el = DEG(50), t = new THREE.Vector3(0, 0, -15);
  return { target: t, pos: new THREE.Vector3(t.x + d * Math.sin(az) * Math.cos(el), t.y + d * Math.sin(el), t.z + d * Math.cos(az) * Math.cos(el)) };
}
function sectionPose() {
  const C = CORRIDORS[state.c], span = Math.max(used(), C.budget) + 34;
  const d = fitDist(span, 40);
  return { target: new THREE.Vector3(0, 17, ZB - 90), pos: new THREE.Vector3(0, 9, ZB + d - 25) };
}
let eye = null; // { x, y, z, vz }
function eyeAnchor(mode) {
  const S = state.s; let x = null, y = 0, speed = 0, dir = 1;
  if (mode === 'walk') {
    let xx = -used() / 2;
    for (const seg of S) { if (seg.k === 'sidewalk' && x === null) x = xx + seg.ft * 0.35; xx += seg.ft; }
    if (x === null) return null;
    y = CURB + 5.4; speed = 4.5; dir = 1;
  } else {
    let xx = -used() / 2;
    for (const seg of S) { if (P[seg.k].cat === 'car' && x === null) { x = xx + seg.ft / 2; dir = seg.dir; speed = seg.k === 'lane' ? 44 : 32; } xx += seg.ft; }
    if (x === null) return null;
    y = 4.2;
  }
  return { x, y, vz: -dir * speed, dir };
}
function resetEye() {
  const a = eyeAnchor(state.view); if (!a) return;
  eye = { ...a, z: state.view === 'drive' ? (a.dir === 1 ? ZB - 10 : ZA + 10) + a.vz * 0 : ZB - 30 };
  if (state.view === 'drive') { // sit in the gap between the cars in this lane
    const lane = movers.filter(m => Math.abs(m.obj.position.x - a.x) < 0.5);
    if (lane.length) { eye.phase = lane[0].z0 + 50; }
  }
  const look = new THREE.Vector3(0, -0.02, Math.sign(a.vz || -1));
  camera.position.set(eye.x, eye.y, eye.z);
  controls.target.copy(camera.position).add(look.multiplyScalar(0.5));
  controls.update();
}
let fly = null;
function setView(v, instant = false) {
  state.view = v;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === v ? 'true' : 'false'));
  if (!controls) return;
  const eyeMode = v === 'walk' || v === 'drive';
  controls.enableZoom = !eyeMode; controls.enablePan = !eyeMode;
  controls.rotateSpeed = eyeMode ? -0.35 : 1;
  controls.minDistance = eyeMode ? 0 : 40; controls.maxDistance = eyeMode ? 1 : 1400;
  controls.maxPolarAngle = eyeMode ? Math.PI : DEG(86);
  scene.fog = eyeMode ? new THREE.Fog(col(HEX.sky), 90, 260) : null;
  renderer && renderer.setClearColor(col(eyeMode ? HEX.sky : HEX.navy), 1);
  $('hint').textContent = eyeMode
    ? (v === 'walk' ? 'Walking on the first sidewalk · drag to look around' : 'Driving in the first travel lane · drag to look around')
    : 'Drag to turn · pinch or scroll to zoom · tap any piece to change it';
  fly = null;
  if (eyeMode) { resetEye(); return; }
  eye = null;
  const to = v === 'section' ? sectionPose() : orbitPose();
  if (instant || reduceMotion) { camera.position.copy(to.pos); controls.target.copy(to.target); controls.update(); return; }
  fly = { t0: performance.now(), dur: 900, fromP: camera.position.clone(), fromT: controls.target.clone(), to };
}
function updateViewButtons() {
  const walk = document.querySelector('[data-view="walk"]'), drive = document.querySelector('[data-view="drive"]');
  walk.disabled = !state.s.some(x => x.k === 'sidewalk');
  drive.disabled = !state.s.some(x => P[x.k].cat === 'car');
  walk.title = walk.disabled ? 'Add a sidewalk to walk it' : '';
  drive.title = drive.disabled ? 'Add a travel lane to drive it' : '';
}

// ------------------------------------------------------------------ UI
function swatch(k) { return `<span class="sw" style="background:${P[k].c}"></span>`; }
function buildStatic() {
  $('corridors').innerHTML = Object.entries(CORRIDORS).map(([k, c]) =>
    `<button class="cbtn" type="button" data-c="${k}" aria-pressed="false">${c.name}<small>${c.budget} ft right-of-way</small></button>`).join('');
  $('corridors').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; state.c = b.dataset.c; render(true); setView(state.view === 'section' ? 'section' : 'orbit'); });
  $('palette').innerHTML = GROUPS.map(([g, ks]) => `<div class="pgroup"><h3>${g}</h3><div class="pgrid">${ks.map(k =>
    `<button class="pbtn" type="button" data-add="${k}">${swatch(k)}<span>${P[k].n}</span><span class="ft">${P[k].ft}′</span></button>`).join('')}</div></div>`).join('');
  $('palette').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    const k = b.dataset.add, at = state.sel === null ? state.s.length : state.sel + 1;
    state.s.splice(at, 0, { k, ft: P[k].ft, dir: 1 });
    state.sel = at; render(true);
    toast(`Added ${P[k].n.toLowerCase()}`);
  });
  $('strip').addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (!t) return; select(+t.dataset.i === state.sel ? null : +t.dataset.i); });
  $('selected').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || state.sel === null) return;
    const i = state.sel, seg = state.s[i], p = P[seg.k];
    switch (b.dataset.act) {
      case 'minus': seg.ft = Math.max(p.min, seg.ft - 1); break;
      case 'plus': seg.ft = Math.min(p.max, seg.ft + 1); break;
      case 'left': if (i > 0) { state.s.splice(i - 1, 0, state.s.splice(i, 1)[0]); state.sel = i - 1; } break;
      case 'right': if (i < state.s.length - 1) { state.s.splice(i + 1, 0, state.s.splice(i, 1)[0]); state.sel = i + 1; } break;
      case 'flip': seg.dir = -seg.dir; break;
      case 'copy': state.s.splice(i + 1, 0, { ...seg }); state.sel = i + 1; break;
      case 'remove': state.s.splice(i, 1); state.sel = state.s.length ? Math.min(i, state.s.length - 1) : null; if (!state.s.length) state.sel = null; break;
      case 'done': state.sel = null; break;
    }
    render(true);
  });
  $('btn-example').addEventListener('click', () => { loadExample(); render(true); setView('orbit'); });
  $('btn-clear').addEventListener('click', () => { state.s = []; state.sel = null; render(true); setView('orbit'); });
  document.querySelector('.views').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b && !b.disabled) setView(b.dataset.view); });
  $('btn-save').addEventListener('click', saveImage);
  $('btn-share').addEventListener('click', share);
}
function select(i) { state.sel = i; render(true); }

function render(rebuild) {
  const C = CORRIDORS[state.c], tot = used(), over = tot > C.budget;
  document.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === state.c ? 'true' : 'false'));
  $('corr-note').textContent = C.note;
  $('corr-label').textContent = C.name;
  $('ft-readout').innerHTML = over ? `<span class="over">${tot} / ${C.budget} ft · ${tot - C.budget} ft over</span>` : `${tot} / ${C.budget} ft`;
  $('meter-fill').style.width = Math.min(100, tot / C.budget * 100) + '%';
  $('meter-fill').classList.toggle('over', over);

  $('strip').innerHTML = state.s.length ? state.s.map((x, i) => {
    const p = P[x.k], d = p.dir ? (x.dir === 1 ? '↑' : '↓') : '';
    return `<button class="tile" type="button" data-i="${i}" style="--ft:${x.ft};background:${p.c}" aria-pressed="${state.sel === i}" aria-label="${p.n}, ${x.ft} feet${p.dir ? (x.dir === 1 ? ', heading away' : ', heading toward you') : ''}">
      <span class="tf">${x.ft}′</span>${d ? `<span class="td" aria-hidden="true">${d}</span>` : ''}<span class="tn">${p.n}</span></button>`;
  }).join('') : '<div class="strip-empty">Nothing here yet. Tap a piece on the right to add it.</div>';
  if (state.sel !== null) { const t = $('strip').querySelector(`[data-i="${state.sel}"]`); t && t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }

  const sel = state.sel !== null ? state.s[state.sel] : null;
  if (!sel) {
    $('selected').innerHTML = `<div class="label"><span>Change a piece</span><span class="step">Step 3</span></div>
      <p class="sel-empty">${state.s.length ? 'Tap any piece of the street, in the 3D view or in the strip, to make it wider or narrower, move it, flip its direction or remove it.' : 'Add a piece first, then tap it to change it.'}</p>`;
    $('pnote').textContent = 'Tap to add it to the right-hand edge of the street.';
  } else {
    const p = P[sel.k], i = state.sel;
    $('selected').innerHTML = `<div class="label"><span>Selected · piece ${i + 1} of ${state.s.length}</span><span class="step">Step 3</span></div>
      <div class="sel-head">${swatch(sel.k)}<h2>${p.n}</h2></div>
      <p class="sel-desc">${p.desc}</p>
      <div class="width-row">
        <button class="abtn round" type="button" data-act="minus" aria-label="Narrower" ${sel.ft <= p.min ? 'disabled' : ''}>−</button>
        <span class="wval" aria-live="polite">${sel.ft}′</span>
        <button class="abtn round" type="button" data-act="plus" aria-label="Wider" ${sel.ft >= p.max ? 'disabled' : ''}>+</button>
        <span class="wrange">${p.min}–${p.max} ft</span>
      </div>
      <div class="act-grid">
        <button class="abtn" type="button" data-act="left" ${i === 0 ? 'disabled' : ''}>← Move left</button>
        <button class="abtn" type="button" data-act="right" ${i === state.s.length - 1 ? 'disabled' : ''}>Move right →</button>
        ${p.dir ? `<button class="abtn" type="button" data-act="flip">Flip direction ${sel.dir === 1 ? '↑' : '↓'}</button>` : ''}
        <button class="abtn" type="button" data-act="copy">Duplicate</button>
        <button class="abtn danger" type="button" data-act="remove">Remove</button>
        <button class="abtn dark" type="button" data-act="done">Done</button>
      </div>`;
    $('pnote').textContent = `Tap to add it just to the right of the ${p.n.toLowerCase()}.`;
  }

  const J = judge();
  $('score').innerHTML = state.s.length ? `<div class="score-top"><span class="score-num">${J.sc}</span><span class="score-of">/ 100 safety score</span>
      <span class="score-tag" style="background:${J.tag[1]};color:${J.tag[2]}">${J.tag[0]}</span></div>
      <ul class="notes">${J.notes.map(([t, s]) => `<li class="note ${t}"><span class="ic">${t === 'good' ? '✓' : t === 'bad' ? '!' : '→'}</span><span>${s}</span></li>`).join('')}</ul>`
    : '<p class="sel-empty">Add a few pieces and the score appears here.</p>';

  try { history.replaceState(null, '', '#' + encode()); } catch (e) {}
  if (rebuild && renderer) buildWorld();
}

// ------------------------------------------------------------------ picking
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; $('hint').style.opacity = '0'; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !renderer) return;
  if (state.view === 'walk' || state.view === 'drive') return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  select(hit ? hit.object.userData.idx : null);
});

// ------------------------------------------------------------------ save image and share
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); }
async function saveImage() {
  if (!renderer) { toast('Saving needs the 3D view'); return; }
  try { await document.fonts.ready; } catch (e) {}
  const W = 1600, H = 1000, IH = 700;
  const prev = { size: renderer.getSize(new THREE.Vector2()), pr: renderer.getPixelRatio(), aspect: camera.aspect, pos: camera.position.clone(), tgt: controls.target.clone(), sel: state.sel, view: state.view };
  if (hl) hl.visible = false;
  renderer.setPixelRatio(1); renderer.setSize(W, IH, false); camera.aspect = W / IH; camera.updateProjectionMatrix();
  if (state.view !== 'walk' && state.view !== 'drive' && state.view !== 'section') { const p = orbitPose(); camera.position.copy(p.pos); camera.lookAt(p.target); }
  renderer.render(scene, camera);
  const shot = renderer.domElement.toDataURL('image/png');
  renderer.setPixelRatio(prev.pr); renderer.setSize(prev.size.x, prev.size.y, false); camera.aspect = prev.aspect; camera.updateProjectionMatrix();
  camera.position.copy(prev.pos); controls.target.copy(prev.tgt); controls.update(); if (hl) hl.visible = true;
  const img = new Image(); img.src = shot; await img.decode();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = HEX.cream; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, IH);
  const C = CORRIDORS[state.c], J = judge(), tot = used();
  // title chip on the render
  g.fillStyle = 'rgba(38,42,61,.82)'; roundRect(g, 32, 32, 560, 116, 18); g.fill();
  g.fillStyle = HEX.lav; g.font = '500 17px "IBM Plex Mono", monospace'; g.fillText('MY STREET · A CITY IN MOTION', 58, 70);
  g.fillStyle = HEX.cream; g.font = 'italic 700 40px "Playfair Display", Georgia, serif'; g.fillText(C.name, 58, 122);
  // score badge
  g.fillStyle = HEX.cream; roundRect(g, W - 300, 32, 268, 116, 18); g.fill();
  g.fillStyle = '#262A3D'; g.font = '700 58px "Playfair Display", Georgia, serif'; g.fillText(String(J.sc), W - 276, 108);
  g.font = '500 16px "IBM Plex Mono", monospace'; g.fillStyle = '#6B7280'; g.font = '700 58px "Playfair Display", Georgia, serif'; const nw = g.measureText(String(J.sc)).width; g.font = '500 16px "IBM Plex Mono", monospace'; g.fillText('/ 100', W - 276 + nw + 10, 104);
  g.fillStyle = J.tag[2]; g.font = '600 18px Inter, sans-serif'; g.fillText(J.tag[0], W - 276, 134);
  // cross-section strip
  const x0 = 48, x1 = W - 48, y0 = IH + 44, sh = 118, sc = (x1 - x0) / Math.max(tot, 1);
  g.fillStyle = '#6B7280'; g.font = '500 16px "IBM Plex Mono", monospace';
  g.fillText(`CROSS-SECTION · ${tot} FT USED OF ${C.budget} FT${tot > C.budget ? ' · OVER' : ''}`, x0, IH + 30);
  let xx = x0;
  state.s.forEach(seg => {
    const p = P[seg.k], w = seg.ft * sc;
    g.fillStyle = p.c; g.fillRect(xx + 1, y0, w - 2, sh);
    g.fillStyle = 'rgba(38,42,61,.82)'; g.fillRect(xx + 1, y0 + sh - 34, w - 2, 34);
    g.save(); g.beginPath(); g.rect(xx + 1, y0, w - 2, sh); g.clip();
    g.fillStyle = '#262A3D'; g.font = '600 20px Inter, sans-serif'; g.textAlign = 'center';
    g.fillText(seg.ft + '′' + (p.dir ? (seg.dir === 1 ? ' ↑' : ' ↓') : ''), xx + w / 2, y0 + 34);
    g.fillStyle = HEX.cream; g.font = '600 14px Inter, sans-serif';
    const label = w > 150 ? p.n : w > 70 ? p.n.split(' ')[0] : '';
    g.fillText(label, xx + w / 2, y0 + sh - 12); g.restore(); g.textAlign = 'left';
    xx += w;
  });
  g.fillStyle = '#5F4E86'; g.font = '600 18px Inter, sans-serif'; g.fillText('Build your own at acityinmotion.com/street-builder', x0, H - 26);
  const a = document.createElement('a'); a.download = `my-street-${state.c}.png`; a.href = cv.toDataURL('image/png');
  document.body.appendChild(a); a.click(); a.remove();
  toast('Image saved');
  if (window.plausible) plausible('Street builder: save image');
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
async function share() {
  const url = location.href.split('#')[0] + '#' + encode();
  const J = judge();
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: 'My street redesign', text: `I redesigned a ${CORRIDORS[state.c].name.toLowerCase()}. Safety score: ${J.sc}/100.`, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Link copied'); }
  catch (e) { window.prompt('Copy this link to share your street:', url); }
  if (window.plausible) plausible('Street builder: share');
}

// ------------------------------------------------------------------ resize + loop
function resize() {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 44 : 30; camera.updateProjectionMatrix();
}
let lastAspect = 0;
new ResizeObserver(() => { resize(); if (Math.abs(camera.aspect - lastAspect) > 0.05) { lastAspect = camera.aspect; if (state.view === 'orbit' || state.view === 'section') setView(state.view, true); } }).observe(stage);

const T0 = performance.now();
const wrapZ = (z) => ((z - ZA) % L + L) % L + ZA;
function loop() {
  requestAnimationFrame(loop);
  if (!renderer) return;
  const t = reduceMotion ? 0 : (performance.now() - T0) / 1000;
  for (const m of movers) m.obj.position.z = wrapZ(m.z0 + m.vz * t);
  if (fly) {
    const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(fly.fromP, fly.to.pos, e); controls.target.lerpVectors(fly.fromT, fly.to.target, e);
    if (k >= 1) fly = null;
  }
  if (eye && controls) {
    controls.update();
    const off = camera.position.clone().sub(controls.target);
    let z;
    if (state.view === 'drive' && eye.phase !== undefined) z = wrapZ(eye.phase + eye.vz * t);
    else z = wrapZ(eye.z + eye.vz * t);
    const tgt = new THREE.Vector3(eye.x, eye.y, z).sub(off);
    // keep the look target just ahead of the eye; the offset carries the user's head turn
    controls.target.copy(tgt); camera.position.copy(tgt).add(off);
  } else if (controls) controls.update();
  if (hl) hlMat.opacity = 0.22 + 0.12 * Math.sin(performance.now() / 300);
  renderer.render(scene, camera);
}

// ------------------------------------------------------------------ start
buildStatic();
if (!decode(location.hash)) loadExample();
resize(); lastAspect = camera.aspect;
render(true);
setView('orbit', true);
requestAnimationFrame(loop);
window.__street = { state, render, setView, saveImage, encode, camera, controls, orbitPose };
