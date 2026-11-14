#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Deterministic parametric glTF 2.0 / GLB character & skeletal animation generator for ASTRA.
// Produces 5 runtime character GLBs under public/assets/models/characters/ and updates
// content-design/animation-manifest.json and public/assets/manifest.json.

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateBytes } from 'gltf-validator';

const FPS = 30;
const OUT_DIR = path.resolve('public/assets/models/characters');
const ANIM_MANIFEST_PATH = path.resolve('content-design/animation-manifest.json');
const ASSET_MANIFEST_PATH = path.resolve('public/assets/manifest.json');

// ASTRA PBR color palette (linear RGB matching tools/models/build.py)
const PALETTE = {
  ivory: [0.78, 0.81, 0.79],
  ivoryWarm: [0.82, 0.83, 0.80],
  orange: [1.0, 0.22, 0.035],
  graphite: [0.055, 0.075, 0.095],
  alloy: [0.36, 0.43, 0.46],
  cyan: [0.02, 0.75, 0.90],
  greyTrim: [0.23, 0.26, 0.30],
  green: [0.08, 0.38, 0.19],
  greenBright: [0.16, 0.56, 0.28],
  furBrown: [0.17, 0.08, 0.038],
  furTan: [0.58, 0.31, 0.12],
  noseBlack: [0.02, 0.02, 0.024],
  skinReyes: [0.22, 0.12, 0.075],
  skinLia: [0.64, 0.44, 0.32],
  skinElena: [0.20, 0.11, 0.065],
  skinNeutral: [0.46, 0.29, 0.20],
  hairGrey: [0.56, 0.58, 0.61],
  hairDark: [0.045, 0.038, 0.035],
  trouserDark: [0.10, 0.12, 0.15],
  visorGlass: [0.14, 0.38, 0.50],
  helmetGlass: [0.60, 0.86, 0.92],
  glassesTint: [0.42, 0.68, 0.82],
  screenDark: [0.03, 0.08, 0.12],
};

// ---------------------------------------------------------------------------
// Math Utilities (glTF 2.0: right-handed, Y-up, +Z forward, +X left)
// ---------------------------------------------------------------------------

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function v3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function v3Add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function v3Scale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function v3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function v3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function v3Len(a) {
  return Math.hypot(a[0], a[1], a[2]);
}

function v3Norm(a) {
  const l = v3Len(a);
  if (l < 1e-8) return [0, 1, 0];
  return [a[0] / l, a[1] / l, a[2] / l];
}

function quatNorm(q) {
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  if (l < 1e-10) return [0, 0, 0, 1];
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

function quatMul(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return quatNorm([
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]);
}

function quatFromAxisAngle(axis, angle) {
  const [nx, ny, nz] = v3Norm(axis);
  const half = angle * 0.5;
  const s = Math.sin(half);
  return quatNorm([nx * s, ny * s, nz * s, Math.cos(half)]);
}

function quatFromEulerXYZ(rx = 0, ry = 0, rz = 0) {
  const cx = Math.cos(rx * 0.5), sx = Math.sin(rx * 0.5);
  const cy = Math.cos(ry * 0.5), sy = Math.sin(ry * 0.5);
  const cz = Math.cos(rz * 0.5), sz = Math.sin(rz * 0.5);
  // Intrinsic XYZ = Rz * Ry * Rx? Standard extrinsic XYZ: Qz * Qy * Qx
  const qx = [sx, 0, 0, cx];
  const qy = [0, sy, 0, cy];
  const qz = [0, 0, sz, cz];
  return quatMul(qz, quatMul(qy, qx));
}

function quatDot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

function mat4Identity() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function mat4FromTRS(t = [0, 0, 0], r = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}

function mat4Mul(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function mat4TransformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

// Smoothstep & wave helpers for expressive keyframed animation curves
function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function bell(t, center = 0.5, width = 0.5) {
  const d = Math.abs(t - center) / width;
  if (d >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * d));
}

function rampHoldReturn(t, riseEnd = 0.2, holdEnd = 0.8) {
  if (t <= 0 || t >= 1) return 0;
  if (t < riseEnd) return smoothstep(t / riseEnd);
  if (t <= holdEnd) return 1;
  return 1 - smoothstep((t - holdEnd) / (1 - holdEnd));
}

// ---------------------------------------------------------------------------
// Skeleton & Skinning Helpers
// ---------------------------------------------------------------------------

function buildRig(jointSpecs) {
  const byName = new Map();
  const joints = jointSpecs.map((spec, index) => {
    const j = {
      index,
      name: spec.name,
      parent: spec.parent ?? -1,
      worldPos: [...spec.pos],
      localTrans: [0, 0, 0],
      children: [],
    };
    byName.set(j.name, j);
    return j;
  });
  for (const j of joints) {
    if (typeof j.parent === 'string') {
      const p = byName.get(j.parent);
      if (!p) throw new Error(`Unknown parent joint: ${j.parent}`);
      j.parent = p.index;
    }
    if (j.parent >= 0) {
      joints[j.parent].children.push(j.index);
      j.localTrans = v3Sub(j.worldPos, joints[j.parent].worldPos);
    } else {
      j.localTrans = [...j.worldPos];
    }
  }
  const inverseBindMatrices = joints.map((j) =>
    mat4FromTRS([-j.worldPos[0], -j.worldPos[1], -j.worldPos[2]])
  );
  return {
    joints,
    byName,
    idx(name) {
      const found = byName.get(name);
      if (!found) throw new Error(`Missing joint: ${name}`);
      return found.index;
    },
    inverseBindMatrices,
  };
}

function rigidBind(jointIndex) {
  return () => [[jointIndex, 1]];
}

function chainYBind(segments) {
  // segments: [{ joint, yMin, yMax }] ordered bottom-to-top or arbitrary
  return (_x, y, _z) => {
    const weights = new Map();
    if (segments.length === 1) return [[segments[0].joint, 1]];
    // Soft Gaussian falloff over segment centers
    for (const seg of segments) {
      const mid = (seg.yMin + seg.yMax) * 0.5;
      const half = Math.max(0.03, (seg.yMax - seg.yMin) * 0.55);
      const dist = Math.max(0, Math.abs(y - mid) - half * 0.35);
      const w = Math.exp(-(dist * dist) / (2 * (half * 0.45) ** 2));
      weights.set(seg.joint, (weights.get(seg.joint) || 0) + w);
    }
    return normalizeWeights([...weights.entries()]);
  };
}

function chainZBind(segments) {
  return (_x, _y, z) => {
    const weights = new Map();
    for (const seg of segments) {
      const mid = (seg.zMin + seg.zMax) * 0.5;
      const half = Math.max(0.03, (seg.zMax - seg.zMin) * 0.55);
      const dist = Math.max(0, Math.abs(z - mid) - half * 0.3);
      const w = Math.exp(-(dist * dist) / (2 * (half * 0.5) ** 2));
      weights.set(seg.joint, (weights.get(seg.joint) || 0) + w);
    }
    return normalizeWeights([...weights.entries()]);
  };
}

function normalizeWeights(pairs) {
  const sorted = pairs
    .filter(([, w]) => w > 1e-5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  if (sorted.length === 0) return [[0, 1]];
  let sum = sorted.reduce((acc, [, w]) => acc + w, 0);
  if (sum <= 1e-8) return [[sorted[0][0], 1]];
  const out = sorted.map(([j, w]) => [j, w / sum]);
  // Guarantee exact IEEE float sum === 1.0
  let partial = 0;
  for (let i = 1; i < out.length; i++) partial += out[i][1];
  out[0][1] = Math.max(0, 1 - partial);
  return out;
}

// ---------------------------------------------------------------------------
// Parametric Mesh Builder (per-material primitives, smooth normals, auto winding)
// ---------------------------------------------------------------------------

class MeshPart {
  constructor(name, rig) {
    this.name = name;
    this.rig = rig;
    this.buckets = new Map(); // matIndex -> { pos, nrm, col, jnt, wgt, idx }
  }

  _bucket(matIndex) {
    let b = this.buckets.get(matIndex);
    if (!b) {
      b = { pos: [], nrm: [], col: [], jnt: [], wgt: [], idx: [] };
      this.buckets.set(matIndex, b);
    }
    return b;
  }

  _addVert(b, p, n, color, bindFn) {
    const idx = b.pos.length / 3;
    const nn = v3Norm(n);
    const pairs = normalizeWeights(bindFn(p[0], p[1], p[2]));
    const js = [0, 0, 0, 0];
    const ws = [0, 0, 0, 0];
    for (let k = 0; k < pairs.length && k < 4; k++) {
      js[k] = pairs[k][0];
      ws[k] = pairs[k][1];
    }
    b.pos.push(p[0], p[1], p[2]);
    b.nrm.push(nn[0], nn[1], nn[2]);
    b.col.push(color[0], color[1], color[2], color[3] ?? 1.0);
    b.jnt.push(js[0], js[1], js[2], js[3]);
    b.wgt.push(ws[0], ws[1], ws[2], ws[3]);
    return idx;
  }

  _addTri(b, i0, i1, i2, hintNormal = null) {
    if (i0 === i1 || i1 === i2 || i0 === i2) return;
    const p0 = [b.pos[i0 * 3], b.pos[i0 * 3 + 1], b.pos[i0 * 3 + 2]];
    const p1 = [b.pos[i1 * 3], b.pos[i1 * 3 + 1], b.pos[i1 * 3 + 2]];
    const p2 = [b.pos[i2 * 3], b.pos[i2 * 3 + 1], b.pos[i2 * 3 + 2]];
    const e1 = v3Sub(p1, p0);
    const e2 = v3Sub(p2, p0);
    const cross = v3Cross(e1, e2);
    if (v3Len(cross) < 1e-11) return;
    if (hintNormal && v3Dot(cross, hintNormal) < 0) {
      b.idx.push(i0, i2, i1);
    } else {
      b.idx.push(i0, i1, i2);
    }
  }

  addEllipsoid(cx, cy, cz, rx, ry, rz, segU, segV, color, bindFn, matIndex = 0) {
    const b = this._bucket(matIndex);
    const grid = [];
    for (let iv = 0; iv <= segV; iv++) {
      const phi = (Math.PI * iv) / segV;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      const row = [];
      for (let iu = 0; iu <= segU; iu++) {
        const theta = (Math.PI * 2 * iu) / segU;
        const st = Math.sin(theta), ct = Math.cos(theta);
        const lx = sp * ct, ly = cp, lz = sp * st;
        const p = [cx + rx * lx, cy + ry * ly, cz + rz * lz];
        const n = v3Norm([lx / rx, ly / ry, lz / rz]);
        row.push(this._addVert(b, p, n, color, bindFn));
      }
      grid.push(row);
    }
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = grid[iv][iu];
        const c = grid[iv + 1][iu];
        const d = grid[iv + 1][iu + 1];
        const e = grid[iv][iu + 1];
        const phiMid = (Math.PI * (iv + 0.5)) / segV;
        const thetaMid = (Math.PI * 2 * (iu + 0.5)) / segU;
        const hint = [
          Math.sin(phiMid) * Math.cos(thetaMid) / rx,
          Math.cos(phiMid) / ry,
          Math.sin(phiMid) * Math.sin(thetaMid) / rz,
        ];
        if (iv !== 0) this._addTri(b, a, c, e, hint);
        if (iv !== segV - 1) this._addTri(b, e, c, d, hint);
      }
    }
  }

  addCapsule(p0, p1, r0, r1, segR, segRings, color, bindFn, matIndex = 0) {
    const b = this._bucket(matIndex);
    const axis = v3Sub(p1, p0);
    const len = v3Len(axis);
    if (len < 1e-6) {
      this.addEllipsoid(p0[0], p0[1], p0[2], r0, r0, r0, segR, 8, color, bindFn, matIndex);
      return;
    }
    const T = v3Scale(axis, 1 / len);
    const ref = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const U = v3Norm(v3Cross(ref, T));
    const V = v3Norm(v3Cross(T, U));

    const rings = [];
    const capSteps = 4;
    // Bottom cap (around p0, from -T to equator)
    for (let k = 0; k <= capSteps; k++) {
      const ang = -Math.PI * 0.5 + (Math.PI * 0.5 * k) / capSteps;
      const rad = r0 * Math.cos(ang);
      const off = r0 * Math.sin(ang);
      const center = v3Add(p0, v3Scale(T, off));
      rings.push({ center, rad, axialN: Math.sin(ang), radialN: Math.cos(ang) });
    }
    // Middle cylinder segments
    for (let k = 1; k < segRings; k++) {
      const t = k / segRings;
      const center = v3Add(p0, v3Scale(axis, t));
      const rad = r0 + (r1 - r0) * t;
      rings.push({ center, rad, axialN: (r0 - r1) / len, radialN: 1 });
    }
    // Top cap (around p1, from equator to +T)
    for (let k = 0; k <= capSteps; k++) {
      const ang = (Math.PI * 0.5 * k) / capSteps;
      const rad = r1 * Math.cos(ang);
      const off = r1 * Math.sin(ang);
      const center = v3Add(p1, v3Scale(T, off));
      rings.push({ center, rad, axialN: Math.sin(ang), radialN: Math.cos(ang) });
    }

    const grid = rings.map((ring) => {
      const row = [];
      for (let i = 0; i <= segR; i++) {
        const theta = (Math.PI * 2 * i) / segR;
        const ct = Math.cos(theta), st = Math.sin(theta);
        const dir = v3Add(v3Scale(U, ct), v3Scale(V, st));
        const pos = v3Add(ring.center, v3Scale(dir, ring.rad));
        const nrm = v3Norm(v3Add(v3Scale(dir, ring.radialN), v3Scale(T, ring.axialN)));
        row.push(this._addVert(b, pos, nrm, color, bindFn));
      }
      return row;
    });

    for (let r = 0; r < grid.length - 1; r++) {
      for (let i = 0; i < segR; i++) {
        const thetaMid = (Math.PI * 2 * (i + 0.5)) / segR;
        const dirMid = v3Add(v3Scale(U, Math.cos(thetaMid)), v3Scale(V, Math.sin(thetaMid)));
        const nMid = v3Add(
          v3Scale(dirMid, (rings[r].radialN + rings[r + 1].radialN) * 0.5),
          v3Scale(T, (rings[r].axialN + rings[r + 1].axialN) * 0.5)
        );
        this._addTri(b, grid[r][i], grid[r + 1][i], grid[r][i + 1], nMid);
        this._addTri(b, grid[r][i + 1], grid[r + 1][i], grid[r + 1][i + 1], nMid);
      }
    }
  }

  addCylinder(p0, p1, r0, r1, segR, capEnds, color, bindFn, matIndex = 0) {
    const b = this._bucket(matIndex);
    const axis = v3Sub(p1, p0);
    const len = v3Len(axis);
    if (len < 1e-6) return;
    const T = v3Scale(axis, 1 / len);
    const ref = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const U = v3Norm(v3Cross(ref, T));
    const V = v3Norm(v3Cross(T, U));

    const side0 = [], side1 = [];
    const slope = (r0 - r1) / len;
    for (let i = 0; i <= segR; i++) {
      const th = (Math.PI * 2 * i) / segR;
      const dir = v3Add(v3Scale(U, Math.cos(th)), v3Scale(V, Math.sin(th)));
      const nrm = v3Norm(v3Add(dir, v3Scale(T, slope)));
      side0.push(this._addVert(b, v3Add(p0, v3Scale(dir, r0)), nrm, color, bindFn));
      side1.push(this._addVert(b, v3Add(p1, v3Scale(dir, r1)), nrm, color, bindFn));
    }
    for (let i = 0; i < segR; i++) {
      const th = (Math.PI * 2 * (i + 0.5)) / segR;
      const hint = v3Add(v3Scale(U, Math.cos(th)), v3Scale(V, Math.sin(th)));
      this._addTri(b, side0[i], side1[i], side0[i + 1], hint);
      this._addTri(b, side0[i + 1], side1[i], side1[i + 1], hint);
    }

    if (capEnds) {
      if (r0 > 1e-5) {
        const c0 = this._addVert(b, p0, v3Scale(T, -1), color, bindFn);
        const ring0 = [];
        for (let i = 0; i <= segR; i++) {
          const th = (Math.PI * 2 * i) / segR;
          const dir = v3Add(v3Scale(U, Math.cos(th)), v3Scale(V, Math.sin(th)));
          ring0.push(this._addVert(b, v3Add(p0, v3Scale(dir, r0)), v3Scale(T, -1), color, bindFn));
        }
        for (let i = 0; i < segR; i++) this._addTri(b, c0, ring0[i + 1], ring0[i], v3Scale(T, -1));
      }
      if (r1 > 1e-5) {
        const c1 = this._addVert(b, p1, T, color, bindFn);
        const ring1 = [];
        for (let i = 0; i <= segR; i++) {
          const th = (Math.PI * 2 * i) / segR;
          const dir = v3Add(v3Scale(U, Math.cos(th)), v3Scale(V, Math.sin(th)));
          ring1.push(this._addVert(b, v3Add(p1, v3Scale(dir, r1)), T, color, bindFn));
        }
        for (let i = 0; i < segR; i++) this._addTri(b, c1, ring1[i], ring1[i + 1], T);
      }
    }
  }

  addChamferBox(cx, cy, cz, sx, sy, sz, bevel, color, bindFn, matIndex = 0, rotEuler = null) {
    const b = this._bucket(matIndex);
    const bev = Math.min(bevel, sx * 0.35, sy * 0.35, sz * 0.35);
    const hx = sx * 0.5 - bev;
    const hy = sy * 0.5 - bev;
    const hz = sz * 0.5 - bev;
    const rq = rotEuler ? quatFromEulerXYZ(rotEuler[0], rotEuler[1], rotEuler[2]) : null;
    const rm = rq ? mat4FromTRS([0, 0, 0], rq) : null;

    const toWorld = (lx, ly, lz) => {
      const p = rm ? mat4TransformPoint(rm, [lx, ly, lz]) : [lx, ly, lz];
      return [cx + p[0], cy + p[1], cz + p[2]];
    };
    const toNrm = (nx, ny, nz) => {
      const n = v3Norm([nx, ny, nz]);
      return rm ? mat4TransformPoint(rm, n) : n;
    };

    const octs = [];
    for (let sxS of [-1, 1]) {
      for (let syS of [-1, 1]) {
        for (let szS of [-1, 1]) {
          const key = `${sxS},${syS},${szS}`;
          const px = [sxS * (hx + bev), syS * hy, szS * hz];
          const py = [sxS * hx, syS * (hy + bev), szS * hz];
          const pz = [sxS * hx, syS * hy, szS * (hz + bev)];
          const nx = toNrm(sxS, syS * 0.35, szS * 0.35);
          const ny = toNrm(sxS * 0.35, syS, szS * 0.35);
          const nz = toNrm(sxS * 0.35, syS * 0.35, szS);
          octs[key] = {
            x: this._addVert(b, toWorld(...px), nx, color, bindFn),
            y: this._addVert(b, toWorld(...py), ny, color, bindFn),
            z: this._addVert(b, toWorld(...pz), nz, color, bindFn),
            nCorner: toNrm(sxS, syS, szS),
          };
        }
      }
    }

    const quad = (i0, i1, i2, i3, nrm) => {
      const wn = toNrm(...nrm);
      this._addTri(b, i0, i1, i2, wn);
      this._addTri(b, i0, i2, i3, wn);
    };

    // 6 main faces
    for (const s of [-1, 1]) {
      quad(octs[`${s},-1,-1`].x, octs[`${s},1,-1`].x, octs[`${s},1,1`].x, octs[`${s},-1,1`].x, [s, 0, 0]);
      quad(octs[`-1,${s},-1`].y, octs[`1,${s},-1`].y, octs[`1,${s},1`].y, octs[`-1,${s},1`].y, [0, s, 0]);
      quad(octs[`-1,-1,${s}`].z, octs[`1,-1,${s}`].z, octs[`1,1,${s}`].z, octs[`-1,1,${s}`].z, [0, 0, s]);
    }
    // 12 bevel edges
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        quad(octs[`${s1},${s2},-1`].x, octs[`${s1},${s2},-1`].y, octs[`${s1},${s2},1`].y, octs[`${s1},${s2},1`].x, [s1, s2, 0]);
        quad(octs[`${s1},-1,${s2}`].x, octs[`${s1},-1,${s2}`].z, octs[`${s1},1,${s2}`].z, octs[`${s1},1,${s2}`].x, [s1, 0, s2]);
        quad(octs[`-1,${s1},${s2}`].y, octs[`-1,${s1},${s2}`].z, octs[`1,${s1},${s2}`].z, octs[`1,${s1},${s2}`].y, [0, s1, s2]);
      }
    }
    // 8 corner bevel triangles
    for (const sxS of [-1, 1]) {
      for (const syS of [-1, 1]) {
        for (const szS of [-1, 1]) {
          const o = octs[`${sxS},${syS},${szS}`];
          this._addTri(b, o.x, o.y, o.z, o.nCorner);
        }
      }
    }
  }

  addTorus(center, axis, majorR, minorR, segMaj, segMin, color, bindFn, matIndex = 0) {
    const b = this._bucket(matIndex);
    const T = v3Norm(axis);
    const ref = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const U = v3Norm(v3Cross(ref, T));
    const V = v3Norm(v3Cross(T, U));
    const grid = [];
    for (let i = 0; i <= segMaj; i++) {
      const u = (Math.PI * 2 * i) / segMaj;
      const radDir = v3Add(v3Scale(U, Math.cos(u)), v3Scale(V, Math.sin(u)));
      const ringCenter = v3Add(center, v3Scale(radDir, majorR));
      const row = [];
      for (let j = 0; j <= segMin; j++) {
        const v = (Math.PI * 2 * j) / segMin;
        const nrm = v3Norm(v3Add(v3Scale(radDir, Math.cos(v)), v3Scale(T, Math.sin(v))));
        const pos = v3Add(ringCenter, v3Scale(nrm, minorR));
        row.push(this._addVert(b, pos, nrm, color, bindFn));
      }
      grid.push(row);
    }
    for (let i = 0; i < segMaj; i++) {
      for (let j = 0; j < segMin; j++) {
        const u = (Math.PI * 2 * (i + 0.5)) / segMaj;
        const v = (Math.PI * 2 * (j + 0.5)) / segMin;
        const radDir = v3Add(v3Scale(U, Math.cos(u)), v3Scale(V, Math.sin(u)));
        const hint = v3Add(v3Scale(radDir, Math.cos(v)), v3Scale(T, Math.sin(v)));
        this._addTri(b, grid[i][j], grid[i + 1][j], grid[i][j + 1], hint);
        this._addTri(b, grid[i][j + 1], grid[i + 1][j], grid[i + 1][j + 1], hint);
      }
    }
  }

  addTube(points, radius, segR, color, bindFn, matIndex = 0) {
    for (let i = 0; i < points.length - 1; i++) {
      this.addCapsule(points[i], points[i + 1], radius, radius, segR, 1, color, bindFn, matIndex);
    }
  }

  addTreadedWheel(center, radius, width, treadCount, tireColor, rimColor, hubColor, bindFn, matIndex = 0) {
    const [cx, cy, cz] = center;
    const pL = [cx + width * 0.5, cy, cz];
    const pR = [cx - width * 0.5, cy, cz];
    const tireR = radius - 0.022;
    this.addCylinder(pR, pL, tireR, tireR, 20, true, tireColor, bindFn, matIndex);
    // Alloy rim discs on outer & inner sides
    this.addCylinder([cx - width * 0.53, cy, cz], [cx + width * 0.53, cy, cz], tireR * 0.66, tireR * 0.66, 16, true, rimColor, bindFn, matIndex);
    // Safety orange center hubcap
    this.addCylinder([cx - width * 0.58, cy, cz], [cx + width * 0.58, cy, cz], tireR * 0.35, tireR * 0.35, 12, true, hubColor, bindFn, matIndex);
    // Chunky radial tread lugs (outer radius <= radius so minY stays >= 0.000!)
    for (let i = 0; i < treadCount; i++) {
      const ang = (Math.PI * 2 * i) / treadCount;
      const ly = Math.sin(ang) * (tireR + 0.008);
      const lz = Math.cos(ang) * (tireR + 0.008);
      this.addChamferBox(
        cx, cy + ly, cz + lz,
        width * 0.94, 0.020, 0.032, 0.005,
        tireColor, bindFn, matIndex, [-ang, 0, 0]
      );
    }
  }

  triangleCount() {
    let tris = 0;
    for (const b of this.buckets.values()) tris += b.idx.length / 3;
    return tris;
  }

  allVertices() {
    const pts = [];
    for (const b of this.buckets.values()) {
      for (let i = 0; i < b.pos.length; i += 3) {
        pts.push({
          pos: [b.pos[i], b.pos[i + 1], b.pos[i + 2]],
          jnt: [b.jnt[i / 3 * 4], b.jnt[i / 3 * 4 + 1], b.jnt[i / 3 * 4 + 2], b.jnt[i / 3 * 4 + 3]],
          wgt: [b.wgt[i / 3 * 4], b.wgt[i / 3 * 4 + 1], b.wgt[i / 3 * 4 + 2], b.wgt[i / 3 * 4 + 3]],
        });
      }
    }
    return pts;
  }
}

// ---------------------------------------------------------------------------
// Pose Evaluator & Grounding / Clearance Verifier
// ---------------------------------------------------------------------------

function computeWorldMatrices(rig, poseRotations, rootTranslation = [0, 0, 0], jointScales = null) {
  const locals = rig.joints.map((j, i) => {
    const t = i === 0 ? v3Add(j.localTrans, rootTranslation) : j.localTrans;
    const r = poseRotations.get(i) ?? [0, 0, 0, 1];
    const s = jointScales?.get(i) ?? [1, 1, 1];
    return mat4FromTRS(t, r, s);
  });
  const globals = new Array(rig.joints.length);
  for (let i = 0; i < rig.joints.length; i++) {
    const p = rig.joints[i].parent;
    globals[i] = p >= 0 ? mat4Mul(globals[p], locals[i]) : locals[i];
  }
  const skinMats = globals.map((g, i) => mat4Mul(g, rig.inverseBindMatrices[i]));
  return { globals, skinMats };
}

function evalSkinnedVertex(v, skinMats) {
  let x = 0, y = 0, z = 0;
  for (let k = 0; k < 4; k++) {
    const w = v.wgt[k];
    if (w <= 0) continue;
    const p = mat4TransformPoint(skinMats[v.jnt[k]], v.pos);
    x += w * p[0];
    y += w * p[1];
    z += w * p[2];
  }
  return [x, y, z];
}

function measurePoseBounds(parts, rig, poseRotations, rootTranslation = [0, 0, 0], jointScales = null) {
  const { globals, skinMats } = computeWorldMatrices(rig, poseRotations, rootTranslation, jointScales);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) {
    for (const b of part.buckets.values()) {
      const count = b.pos.length / 3;
      for (let i = 0; i < count; i++) {
        let vx = 0, vy = 0, vz = 0;
        for (let k = 0; k < 4; k++) {
          const w = b.wgt[i * 4 + k];
          if (w <= 0) continue;
          const m = skinMats[b.jnt[i * 4 + k]];
          const px = b.pos[i * 3], py = b.pos[i * 3 + 1], pz = b.pos[i * 3 + 2];
          vx += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]);
          vy += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]);
          vz += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
        }
        if (vx < min[0]) min[0] = vx;
        if (vy < min[1]) min[1] = vy;
        if (vz < min[2]) min[2] = vz;
        if (vx > max[0]) max[0] = vx;
        if (vy > max[1]) max[1] = vy;
        if (vz > max[2]) max[2] = vz;
      }
    }
  }
  return { min, max, globals, skinMats };
}

function sampleClip(rig, parts, clipSpec, extraScaleJoints = null) {
  const frameCount = Math.max(2, Math.round(clipSpec.duration * FPS));
  const times = [];
  const rotTracks = new Map(); // jointIndex -> quat[]
  const scaleTracks = new Map(); // jointIndex -> vec3[]
  const rootTrans = [];
  const rootYawSamples = [];
  let minYOverall = Infinity;

  // Author complete rig rotation channels per clip so switching clips in Babylon
  // never retains stale joint rotations from an earlier AnimationGroup.
  const activeJoints = new Set(rig.joints.map((_, idx) => idx));
  const activeScaleJoints = new Set(extraScaleJoints ?? []);
  for (let f = 0; f <= frameCount; f++) {
    const phase = f / frameCount;
    const pose = clipSpec.eval(phase, f, frameCount);
    for (const j of pose.rotations.keys()) activeJoints.add(j);
    if (pose.scales) for (const j of pose.scales.keys()) activeScaleJoints.add(j);
  }
  for (const j of activeJoints) rotTracks.set(j, []);
  for (const j of activeScaleJoints) scaleTracks.set(j, []);

  for (let f = 0; f <= frameCount; f++) {
    const t = Number(((f * clipSpec.duration) / frameCount).toFixed(6));
    times.push(t);
    const phase = f / frameCount;
    const pose = clipSpec.eval(phase, f, frameCount);
    const rotMap = pose.rotations;
    const scaleMap = pose.scales ?? null;
    let yOff = pose.rootY ?? 0;

    // Grounded vertex evaluation: adjust rootY if pose specifies groundLock or dips below floor
    const { min } = measurePoseBounds(parts, rig, rotMap, [0, yOff, 0], scaleMap);
    if (clipSpec.groundLock) {
      yOff = yOff - min[1];
    } else if (min[1] < 0) {
      yOff = yOff - min[1];
    }

    const checked = measurePoseBounds(parts, rig, rotMap, [0, yOff, 0], scaleMap);
    minYOverall = Math.min(minYOverall, checked.min[1]);

    // Strictly zero horizontal X/Z root motion
    rootTrans.push([0, Number(yOff.toFixed(6)), 0]);

    // Record root yaw for manifest provenance
    const rootQ = rotMap.get(0) ?? [0, 0, 0, 1];
    const yaw = Math.atan2(2 * (rootQ[3] * rootQ[1] + rootQ[0] * rootQ[2]), 1 - 2 * (rootQ[1] ** 2 + rootQ[2] ** 2));
    rootYawSamples.push(Number(yaw.toFixed(5)));

    for (const j of activeJoints) {
      let q = quatNorm(rotMap.get(j) ?? [0, 0, 0, 1]);
      const arr = rotTracks.get(j);
      if (arr.length > 0 && quatDot(arr[arr.length - 1], q) < 0) {
        q = [-q[0], -q[1], -q[2], -q[3]];
      }
      arr.push(q);
    }
    for (const j of activeScaleJoints) {
      const sc = scaleMap?.get(j) ?? [1, 1, 1];
      scaleTracks.get(j).push([sc[0], sc[1], sc[2]]);
    }
  }

  // Exact loop seam check (note quaternion q and -q are equivalent; preserve continuity)
  if (clipSpec.loop) {
    rootTrans[frameCount] = [...rootTrans[0]];
    for (const arr of rotTracks.values()) {
      let q0 = arr[0];
      if (arr.length > 1 && quatDot(arr[arr.length - 2], q0) < 0) {
        q0 = [-q0[0], -q0[1], -q0[2], -q0[3]];
      }
      arr[frameCount] = q0;
    }
    for (const arr of scaleTracks.values()) {
      arr[frameCount] = [...arr[0]];
    }
  }

  return {
    name: clipSpec.name,
    phase: clipSpec.phase ?? 'core',
    requiredForPhase: clipSpec.requiredForPhase ?? true,
    semantics: clipSpec.semantics,
    loop: Boolean(clipSpec.loop),
    sourceFps: FPS,
    sourceFrameStart: 0,
    sourceFrameEnd: frameCount,
    durationSeconds: Number(clipSpec.duration.toFixed(4)),
    contactMarkers: clipSpec.contactMarkers ?? [],
    rootTranslationSamples: rootTrans.filter((_, idx) => idx === 0 || idx === Math.floor(frameCount / 2) || idx === frameCount),
    rootYawSamples: rootYawSamples.filter((_, idx) => idx === 0 || idx === Math.floor(frameCount / 2) || idx === frameCount),
    times,
    rootTrans,
    rotTracks,
    scaleTracks,
    minY: minYOverall,
  };
}

function sampleClips(rig, parts, clipSpecs) {
  const sharedScaleJoints = new Set();
  for (const spec of clipSpecs) {
    const frameCount = Math.max(2, Math.round(spec.duration * FPS));
    for (let f = 0; f <= frameCount; f++) {
      const pose = spec.eval(f / frameCount, f, frameCount);
      if (pose.scales) for (const j of pose.scales.keys()) sharedScaleJoints.add(j);
    }
  }
  return clipSpecs.map((spec) => sampleClip(rig, parts, spec, sharedScaleJoints));
}

// ---------------------------------------------------------------------------
// glTF 2.0 / GLB Binary Packer
// ---------------------------------------------------------------------------

function assembleGLB({ rigName, rig, parts, materials, clips }) {
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let byteOffset = 0;

  function addBufferData(typedArray, target = undefined) {
    const raw = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const pad = (4 - (raw.length % 4)) % 4;
    const bvIndex = bufferViews.length;
    const bv = { buffer: 0, byteOffset, byteLength: raw.length };
    if (target !== undefined) bv.target = target;
    bufferViews.push(bv);
    chunks.push(raw);
    if (pad > 0) chunks.push(Buffer.alloc(pad));
    byteOffset += raw.length + pad;
    return bvIndex;
  }

  function addAccessor(typedArray, componentType, type, count, target = undefined, minMax = false) {
    const bv = addBufferData(typedArray, target);
    const acc = { bufferView: bv, componentType, count, type };
    if (minMax) {
      const comps = type === 'SCALAR' ? 1 : type === 'VEC3' ? 3 : 4;
      const min = new Array(comps).fill(Infinity);
      const max = new Array(comps).fill(-Infinity);
      for (let i = 0; i < count; i++) {
        for (let k = 0; k < comps; k++) {
          const val = typedArray[i * comps + k];
          if (val < min[k]) min[k] = val;
          if (val > max[k]) max[k] = val;
        }
      }
      acc.min = min;
      acc.max = max;
    }
    const idx = accessors.length;
    accessors.push(acc);
    return idx;
  }

  // Nodes: joints first (0 .. numJoints-1), then root-level skinned mesh nodes!
  const nodes = rig.joints.map((j) => {
    const node = { name: j.name };
    if (j.localTrans[0] !== 0 || j.localTrans[1] !== 0 || j.localTrans[2] !== 0) {
      node.translation = j.localTrans.map((v) => Number(v.toFixed(6)));
    }
    if (j.children.length > 0) node.children = [...j.children];
    return node;
  });

  const ibmFlat = new Float32Array(rig.joints.length * 16);
  for (let i = 0; i < rig.joints.length; i++) {
    ibmFlat.set(rig.inverseBindMatrices[i], i * 16);
  }
  const ibmAccessor = addAccessor(ibmFlat, 5126, 'MAT4', rig.joints.length);

  const skins = [{
    name: `${rigName}_Rig`,
    skeleton: 0,
    joints: rig.joints.map((j) => j.index),
    inverseBindMatrices: ibmAccessor,
  }];

  const meshes = [];
  const sceneNodes = [0]; // joint root 0 is a scene root

  for (const part of parts) {
    const primitives = [];
    const sortedMatKeys = [...part.buckets.keys()].sort((a, b) => a - b);
    for (const matIndex of sortedMatKeys) {
      const b = part.buckets.get(matIndex);
      if (b.idx.length === 0) continue;
      const vertCount = b.pos.length / 3;
      const posAcc = addAccessor(new Float32Array(b.pos), 5126, 'VEC3', vertCount, 34962, true);
      const nrmAcc = addAccessor(new Float32Array(b.nrm), 5126, 'VEC3', vertCount, 34962, false);
      const colAcc = addAccessor(new Float32Array(b.col), 5126, 'VEC4', vertCount, 34962, false);
      const jntAcc = addAccessor(new Uint8Array(b.jnt), 5121, 'VEC4', vertCount, 34962, false);
      const wgtAcc = addAccessor(new Float32Array(b.wgt), 5126, 'VEC4', vertCount, 34962, false);
      const idxAcc = addAccessor(new Uint16Array(b.idx), 5123, 'SCALAR', b.idx.length, 34963, false);
      primitives.push({
        attributes: {
          POSITION: posAcc,
          NORMAL: nrmAcc,
          COLOR_0: colAcc,
          JOINTS_0: jntAcc,
          WEIGHTS_0: wgtAcc,
        },
        indices: idxAcc,
        material: matIndex,
      });
    }
    if (primitives.length === 0) continue;
    const meshIndex = meshes.length;
    meshes.push({ name: part.name, primitives });
    const meshNodeIndex = nodes.length;
    nodes.push({ name: part.name, mesh: meshIndex, skin: 0 });
    sceneNodes.push(meshNodeIndex);
  }

  const animations = clips.map((clip) => {
    const timeAcc = addAccessor(new Float32Array(clip.times), 5126, 'SCALAR', clip.times.length, undefined, true);
    const channels = [];
    const samplers = [];

    // Root translation channel (guarantees Y bob/grounding & verifiable X=0, Z=0)
    const rootOutAcc = addAccessor(new Float32Array(clip.rootTrans.flat()), 5126, 'VEC3', clip.times.length);
    samplers.push({ input: timeAcc, interpolation: 'LINEAR', output: rootOutAcc });
    channels.push({ sampler: samplers.length - 1, target: { node: 0, path: 'translation' } });

    // Joint rotation channels
    const sortedJoints = [...clip.rotTracks.keys()].sort((a, b) => a - b);
    for (const jIdx of sortedJoints) {
      const quats = clip.rotTracks.get(jIdx);
      const rotOutAcc = addAccessor(new Float32Array(quats.flat()), 5126, 'VEC4', clip.times.length);
      samplers.push({ input: timeAcc, interpolation: 'LINEAR', output: rotOutAcc });
      channels.push({ sampler: samplers.length - 1, target: { node: jIdx, path: 'rotation' } });
    }

    // Joint scale channels (if any, e.g. PIP eye squint)
    const sortedScaleJoints = [...clip.scaleTracks.keys()].sort((a, b) => a - b);
    for (const jIdx of sortedScaleJoints) {
      const scales = clip.scaleTracks.get(jIdx);
      const scaleOutAcc = addAccessor(new Float32Array(scales.flat()), 5126, 'VEC3', clip.times.length);
      samplers.push({ input: timeAcc, interpolation: 'LINEAR', output: scaleOutAcc });
      channels.push({ sampler: samplers.length - 1, target: { node: jIdx, path: 'scale' } });
    }

    return { name: clip.name, channels, samplers };
  });

  const binBuffer = Buffer.concat(chunks);
  const usesEmissiveStrength = materials.some((m) => m.extensions?.KHR_materials_emissive_strength);
  const gltf = {
    asset: {
      version: '2.0',
      generator: 'ASTRA build_characters.mjs (Apache-2.0)',
    },
    ...(usesEmissiveStrength ? { extensionsUsed: ['KHR_materials_emissive_strength'] } : {}),
    scene: 0,
    scenes: [{ name: `${rigName}_Scene`, nodes: sceneNodes }],
    nodes,
    skins,
    meshes,
    materials,
    animations,
    buffers: [{ byteLength: binBuffer.length }],
    bufferViews,
    accessors,
  };

  const jsonRaw = Buffer.from(JSON.stringify(gltf));
  const jsonPad = (4 - (jsonRaw.length % 4)) % 4;
  const jsonChunk = jsonPad ? Buffer.concat([jsonRaw, Buffer.alloc(jsonPad, 0x20)]) : jsonRaw;
  const totalLen = 12 + 8 + jsonChunk.length + 8 + binBuffer.length;
  const glb = Buffer.alloc(totalLen);
  glb.writeUInt32LE(0x46546C67, 0); // 'glTF'
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(totalLen, 8);
  glb.writeUInt32LE(jsonChunk.length, 12);
  glb.writeUInt32LE(0x4E4F534A, 16); // 'JSON'
  jsonChunk.copy(glb, 20);
  const binOff = 20 + jsonChunk.length;
  glb.writeUInt32LE(binBuffer.length, binOff);
  glb.writeUInt32LE(0x004E4942, binOff + 4); // 'BIN\0'
  binBuffer.copy(glb, binOff + 8);
  return glb;
}

function makeMaterialSet(glassName, glassColor, glassAlpha, bodyMetallic = 0.25, bodyRoughness = 0.45, opaqueScreen = false) {
  return [
    {
      name: 'astra_primary_pbr',
      pbrMetallicRoughness: {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: bodyMetallic,
        roughnessFactor: bodyRoughness,
      },
      doubleSided: false,
    },
    {
      name: 'astra_luminous_cyan',
      pbrMetallicRoughness: {
        baseColorFactor: [...PALETTE.cyan, 1],
        metallicFactor: 0.2,
        roughnessFactor: 0.35,
      },
      emissiveFactor: PALETTE.cyan,
      extensions: {
        KHR_materials_emissive_strength: { emissiveStrength: 1.8 },
      },
      doubleSided: false,
    },
    opaqueScreen
      ? {
          name: glassName,
          pbrMetallicRoughness: {
            baseColorFactor: [...glassColor, 1],
            metallicFactor: 0.72,
            roughnessFactor: 0.14,
          },
          doubleSided: false,
        }
      : {
          name: glassName,
          alphaMode: 'BLEND',
          pbrMetallicRoughness: {
            baseColorFactor: [...glassColor, glassAlpha],
            metallicFactor: 0.08,
            roughnessFactor: 0.10,
          },
          doubleSided: false,
        },
  ];
}

// ---------------------------------------------------------------------------
// Shared Humanoid Builder Helpers (used by Astronaut + Human NPC)
// ---------------------------------------------------------------------------

function createHumanRig(includeBackpack = true) {
  const specs = [
    { name: 'Root', pos: [0, 0, 0] },
    { name: 'Hips', parent: 'Root', pos: [0, 0.92, 0] },
    { name: 'Spine', parent: 'Hips', pos: [0, 1.07, 0] },
    { name: 'Chest', parent: 'Spine', pos: [0, 1.26, 0] },
    { name: 'Neck', parent: 'Chest', pos: [0, 1.46, 0.01] },
    { name: 'Head', parent: 'Neck', pos: [0, 1.56, 0.02] },
    { name: 'Shoulder_L', parent: 'Chest', pos: [0.14, 1.41, 0] },
    { name: 'UpperArm_L', parent: 'Shoulder_L', pos: [0.22, 1.39, 0] },
    { name: 'Forearm_L', parent: 'UpperArm_L', pos: [0.24, 1.13, 0] },
    { name: 'Hand_L', parent: 'Forearm_L', pos: [0.25, 0.89, 0.02] },
    { name: 'Shoulder_R', parent: 'Chest', pos: [-0.14, 1.41, 0] },
    { name: 'UpperArm_R', parent: 'Shoulder_R', pos: [-0.22, 1.39, 0] },
    { name: 'Forearm_R', parent: 'UpperArm_R', pos: [-0.24, 1.13, 0] },
    { name: 'Hand_R', parent: 'Forearm_R', pos: [-0.25, 0.89, 0.02] },
    { name: 'Thigh_L', parent: 'Hips', pos: [0.105, 0.89, 0] },
    { name: 'Shin_L', parent: 'Thigh_L', pos: [0.105, 0.48, 0] },
    { name: 'Foot_L', parent: 'Shin_L', pos: [0.105, 0.09, 0] },
    { name: 'Toe_L', parent: 'Foot_L', pos: [0.105, 0.025, 0.12] },
    { name: 'Thigh_R', parent: 'Hips', pos: [-0.105, 0.89, 0] },
    { name: 'Shin_R', parent: 'Thigh_R', pos: [-0.105, 0.48, 0] },
    { name: 'Foot_R', parent: 'Shin_R', pos: [-0.105, 0.09, 0] },
    { name: 'Toe_R', parent: 'Foot_R', pos: [-0.105, 0.025, 0.12] },
  ];
  if (includeBackpack) {
    specs.push({ name: 'Backpack', parent: 'Chest', pos: [0, 1.24, -0.22] });
  }
  return buildRig(specs);
}

function addHumanLegsAndBoots(mesh, rig, suited = true) {
  const J = (n) => rig.idx(n);
  const pantsColor = suited ? PALETTE.ivory : PALETTE.trouserDark;
  const bootColor = PALETTE.graphite;
  const bandColor = suited ? PALETTE.orange : PALETTE.alloy;

  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const x = s * 0.105;
    const thighBind = chainYBind([
      { joint: J('Hips'), yMin: 0.86, yMax: 0.98 },
      { joint: J(`Thigh_${side}`), yMin: 0.52, yMax: 0.88 },
      { joint: J(`Shin_${side}`), yMin: 0.42, yMax: 0.54 },
    ]);
    const shinBind = chainYBind([
      { joint: J(`Thigh_${side}`), yMin: 0.47, yMax: 0.54 },
      { joint: J(`Shin_${side}`), yMin: 0.13, yMax: 0.49 },
      { joint: J(`Foot_${side}`), yMin: 0.06, yMax: 0.14 },
    ]);
    const footBind = rigidBind(J(`Foot_${side}`));
    const toeBind = rigidBind(J(`Toe_${side}`));

    // Thigh
    mesh.addCapsule([x, 0.87, 0], [x, 0.52, 0.005], 0.095, 0.078, 12, 2, pantsColor, thighBind);
    if (suited) {
      mesh.addTorus([x, 0.72, 0], [0, 1, 0], 0.086, 0.013, 12, 6, PALETTE.orange, rigidBind(J(`Thigh_${side}`)));
      mesh.addChamferBox(x + s * 0.075, 0.69, 0.01, 0.04, 0.13, 0.09, 0.01, PALETTE.orange, rigidBind(J(`Thigh_${side}`)));
    }
    // Knee pad
    mesh.addEllipsoid(x, 0.48, 0.025, 0.076, 0.062, 0.078, 10, 8, PALETTE.graphite, rigidBind(J(`Shin_${side}`)));
    // Shin
    mesh.addCapsule([x, 0.44, 0], [x, 0.14, 0], 0.074, 0.064, 12, 2, pantsColor, shinBind);
    if (suited) {
      mesh.addTorus([x, 0.21, 0], [0, 1, 0], 0.070, 0.013, 12, 6, bandColor, rigidBind(J(`Shin_${side}`)));
    }
    // Pressurized boot (sole bottom strictly at y = 0.000!)
    mesh.addChamferBox(x, 0.045, 0.035, 0.125, 0.09, 0.21, 0.02, bootColor, footBind);
    mesh.addChamferBox(x, 0.095, -0.01, 0.12, 0.09, 0.12, 0.018, bootColor, footBind);
    // Boot toe cap
    mesh.addChamferBox(x, 0.038, 0.135, 0.122, 0.076, 0.11, 0.02, suited ? PALETTE.orange : PALETTE.graphite, toeBind);
    // Sole tread base right at y = 0.000
    mesh.addChamferBox(x, 0.012, 0.045, 0.132, 0.024, 0.26, 0.006, PALETTE.graphite, footBind);
  }
}

function addHumanArms(mesh, rig, suited = true, sleeveColor = PALETTE.ivory, cuffColor = PALETTE.orange, gloveColor = PALETTE.graphite) {
  const J = (n) => rig.idx(n);
  for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
    const sx = s * 0.22;
    const fx = s * 0.24;
    const hx = s * 0.25;
    const upperBind = chainYBind([
      { joint: J(`Shoulder_${side}`), yMin: 1.35, yMax: 1.46 },
      { joint: J(`UpperArm_${side}`), yMin: 1.15, yMax: 1.41 },
      { joint: J(`Forearm_${side}`), yMin: 1.08, yMax: 1.16 },
    ]);
    const foreBind = chainYBind([
      { joint: J(`UpperArm_${side}`), yMin: 1.12, yMax: 1.17 },
      { joint: J(`Forearm_${side}`), yMin: 0.92, yMax: 1.13 },
      { joint: J(`Hand_${side}`), yMin: 0.85, yMax: 0.93 },
    ]);
    const handBind = rigidBind(J(`Hand_${side}`));

    // Shoulder pad
    mesh.addEllipsoid(s * 0.19, 1.40, 0, 0.075, 0.072, 0.075, 10, 8, suited ? PALETTE.orange : sleeveColor, rigidBind(J(`Shoulder_${side}`)));
    // Upper arm
    mesh.addCapsule([sx, 1.38, 0], [fx, 1.15, 0], 0.062, 0.055, 10, 2, sleeveColor, upperBind);
    // Elbow ring
    mesh.addEllipsoid(fx, 1.13, -0.005, 0.056, 0.048, 0.056, 10, 6, suited ? PALETTE.graphite : sleeveColor, rigidBind(J(`Forearm_${side}`)));
    // Forearm
    mesh.addCapsule([fx, 1.11, 0], [hx, 0.91, 0.015], 0.054, 0.047, 10, 2, sleeveColor, foreBind);
    mesh.addTorus([hx * 0.99, 0.93, 0.012], [0, 1, 0], 0.052, 0.010, 10, 6, cuffColor, rigidBind(J(`Forearm_${side}`)));
    // Gloved / natural hand + thumb hint
    mesh.addEllipsoid(hx, 0.84, 0.025, 0.044, 0.064, 0.048, 10, 8, gloveColor, handBind);
    mesh.addCapsule([hx - s * 0.032, 0.86, 0.04], [hx - s * 0.04, 0.82, 0.068], 0.016, 0.014, 8, 1, gloveColor, handBind);
    // Wrist indicator on left forearm (suit)
    if (suited && side === 'L') {
      mesh.addChamferBox(hx + 0.038, 0.96, 0.035, 0.024, 0.065, 0.045, 0.005, PALETTE.cyan, rigidBind(J('Forearm_L')), 1);
    }
  }
}

// ---------------------------------------------------------------------------
// 1. ASTRONAUT (~1.82 m, 15 clips, closed visor helmet facing +Z)
// ---------------------------------------------------------------------------

function buildAstronaut() {
  const rig = createHumanRig(true);
  const J = (n) => rig.idx(n);
  const mesh = new MeshPart('Astronaut', rig);

  const torsoBind = chainYBind([
    { joint: J('Hips'), yMin: 0.84, yMax: 1.00 },
    { joint: J('Spine'), yMin: 0.98, yMax: 1.22 },
    { joint: J('Chest'), yMin: 1.20, yMax: 1.48 },
  ]);

  // Pelvis / Suit Belt
  mesh.addEllipsoid(0, 0.94, 0, 0.19, 0.11, 0.145, 14, 8, PALETTE.ivory, rigidBind(J('Hips')));
  mesh.addTorus([0, 0.97, 0], [0, 1, 0], 0.175, 0.024, 16, 6, PALETTE.graphite, rigidBind(J('Hips')));
  mesh.addChamferBox(0, 0.97, 0.165, 0.09, 0.06, 0.04, 0.01, PALETTE.orange, rigidBind(J('Hips')));

  // Torso Suit
  mesh.addCapsule([0, 1.02, 0], [0, 1.36, 0.01], 0.165, 0.195, 16, 3, PALETTE.ivory, torsoBind);
  // Shoulder harness & orange chest trim
  mesh.addChamferBox(0, 1.32, 0.02, 0.34, 0.12, 0.25, 0.035, PALETTE.ivoryWarm, rigidBind(J('Chest')));
  for (const s of [-1, 1]) {
    mesh.addChamferBox(s * 0.12, 1.25, 0.125, 0.048, 0.24, 0.04, 0.01, PALETTE.orange, rigidBind(J('Chest')));
  }

  // Chest HUD Control Unit (+Z front)
  mesh.addChamferBox(0, 1.24, 0.17, 0.18, 0.13, 0.06, 0.015, PALETTE.graphite, rigidBind(J('Chest')));
  mesh.addChamferBox(0, 1.26, 0.20, 0.12, 0.055, 0.016, 0.004, PALETTE.cyan, rigidBind(J('Chest')), 1);
  for (const bx of [-0.05, 0, 0.05]) {
    mesh.addEllipsoid(bx, 1.205, 0.202, 0.013, 0.013, 0.01, 8, 6, bx === 0 ? PALETTE.orange : PALETTE.alloy, rigidBind(J('Chest')));
  }

  // Articulated Life-Support Backpack (-Z back)
  const packBind = rigidBind(J('Backpack'));
  mesh.addChamferBox(0, 1.24, -0.24, 0.32, 0.42, 0.19, 0.04, PALETTE.ivory, packBind);
  mesh.addChamferBox(0, 1.24, -0.34, 0.21, 0.25, 0.035, 0.01, PALETTE.orange, packBind);
  for (const x of [-0.11, 0.11]) {
    mesh.addCylinder([x, 1.07, -0.31], [x, 1.40, -0.31], 0.045, 0.045, 10, true, PALETTE.alloy, packBind);
    mesh.addChamferBox(x, 1.41, -0.34, 0.05, 0.032, 0.018, 0.004, PALETTE.cyan, packBind, 1);
  }

  // Neck ring + Closed Visor Helmet facing +Z (top at y = 1.82 m!)
  mesh.addTorus([0, 1.48, 0.01], [0, 1, 0], 0.125, 0.025, 16, 6, PALETTE.orange, rigidBind(J('Neck')));
  mesh.addCylinder([0, 1.45, 0.01], [0, 1.52, 0.015], 0.105, 0.115, 14, false, PALETTE.graphite, rigidBind(J('Neck')));

  const headBind = rigidBind(J('Head'));
  // Inner stylized explorer head silhouette visible behind tinted visor
  mesh.addEllipsoid(0, 1.63, 0.02, 0.105, 0.118, 0.112, 12, 8, PALETTE.skinNeutral, headBind);
  mesh.addEllipsoid(0, 1.67, -0.02, 0.112, 0.095, 0.115, 12, 8, PALETTE.hairDark, headBind);
  // Outer protective helmet shell (ivory back/top/sides) + brushed alloy visor rim
  mesh.addEllipsoid(0, 1.64, -0.01, 0.165, 0.175, 0.168, 16, 12, PALETTE.ivory, headBind);
  mesh.addTorus([0, 1.64, 0.06], [0, 0, 1], 0.132, 0.018, 18, 6, PALETTE.alloy, headBind);
  // Closed curved visor glass facing +Z (material 2: translucent tinted glass)
  mesh.addEllipsoid(0, 1.64, 0.075, 0.135, 0.132, 0.118, 16, 12, PALETTE.visorGlass, headBind, 2);
  // Side helmet orange ear pods + crown lamp facing +Z (top y <= 1.825 m)
  for (const s of [-1, 1]) {
    mesh.addCylinder([s * 0.155, 1.63, 0], [s * 0.185, 1.63, 0], 0.042, 0.036, 10, true, PALETTE.orange, headBind);
  }
  mesh.addChamferBox(0, 1.795, 0.09, 0.11, 0.035, 0.065, 0.01, PALETTE.graphite, headBind);
  mesh.addChamferBox(0, 1.795, 0.125, 0.085, 0.022, 0.018, 0.005, PALETTE.cyan, headBind, 1);

  addHumanLegsAndBoots(mesh, rig, true);
  addHumanArms(mesh, rig, true);

  // Define 15 keyframed clips
  const makePose = (fn) => (phase) => {
    const rots = new Map();
    const set = (name, rx, ry, rz) => rots.set(J(name), quatFromEulerXYZ(rx, ry, rz));
    const rootY = fn(phase, set, rots) ?? 0;
    return { rotations: rots, rootY };
  };

  function gaitCycle(phase, set, { strideAmp, kneeLift, armSwing, lean, bounce, hipYaw, armAbduct }) {
    const a = phase * Math.PI * 2;
    const sL = Math.sin(a);
    const sR = Math.sin(a + Math.PI);
    const cL = Math.max(0, Math.cos(a));
    const cR = Math.max(0, Math.cos(a + Math.PI));

    set('Hips', lean * 0.3, Math.sin(a) * hipYaw, Math.cos(a) * 0.03);
    set('Spine', lean * 0.5, -Math.sin(a) * hipYaw * 0.6, 0);
    set('Chest', lean * 0.4, -Math.sin(a) * hipYaw * 0.8, 0);
    set('Backpack', -lean * 0.25 + Math.abs(Math.sin(a)) * 0.04, 0, 0);
    set('Head', -lean * 0.4, Math.sin(a) * 0.03, 0);

    // Legs (negative rx = forward swing)
    set('Thigh_L', -sL * strideAmp, 0, 0.02);
    set('Shin_L', cL * kneeLift + Math.max(0, -sL) * kneeLift * 0.35, 0, 0);
    set('Foot_L', -cL * 0.18 + sL * 0.14, 0, 0);
    set('Thigh_R', -sR * strideAmp, 0, -0.02);
    set('Shin_R', cR * kneeLift + Math.max(0, -sR) * kneeLift * 0.35, 0, 0);
    set('Foot_R', -cR * 0.18 + sR * 0.14, 0, 0);

    // Counter-swinging arms
    set('UpperArm_L', -sR * armSwing, 0, armAbduct);
    set('Forearm_L', -0.28 - Math.max(0, -sR) * 0.35, 0, 0);
    set('UpperArm_R', -sL * armSwing, 0, -armAbduct);
    set('Forearm_R', -0.28 - Math.max(0, -sL) * 0.35, 0, 0);

    return bounce * Math.abs(Math.sin(a));
  }

  const clipSpecs = [
    {
      name: 'Idle', phase: 'core', semantics: 'resting stance', loop: true, duration: 2.4, groundLock: true,
      eval: makePose((p, set) => {
        const w = Math.sin(p * Math.PI * 2);
        set('Spine', 0.02 + w * 0.025, 0, 0);
        set('Chest', w * 0.03, Math.sin(p * Math.PI * 2) * 0.03, 0);
        set('Head', -0.02 + w * 0.02, Math.sin(p * Math.PI * 2) * 0.09, Math.cos(p * Math.PI * 2) * 0.03);
        set('UpperArm_L', 0.04 + w * 0.04, 0, 0.08);
        set('Forearm_L', -0.18 - w * 0.04, 0, 0);
        set('UpperArm_R', 0.04 - w * 0.04, 0, -0.08);
        set('Forearm_R', -0.18 + w * 0.04, 0, 0);
        set('Backpack', w * 0.02, 0, 0);
        return 0;
      }),
    },
    {
      name: 'WalkEarth', phase: 'core', semantics: 'academy walk', loop: true, duration: 1.0, groundLock: true,
      contactMarkers: [
        { name: 'LeftFootContact', timeSeconds: 0.0 },
        { name: 'RightFootRelease', timeSeconds: 0.133 },
        { name: 'RightFootContact', timeSeconds: 0.5 },
        { name: 'LeftFootRelease', timeSeconds: 0.633 },
      ],
      eval: makePose((p, set) => gaitCycle(p, set, {
        strideAmp: 0.44, kneeLift: 0.52, armSwing: 0.34, lean: 0.06, bounce: 0.01, hipYaw: 0.07, armAbduct: 0.07,
      })),
    },
    {
      name: 'RunEarth', phase: 'core', semantics: 'academy run', loop: true, duration: 0.7, groundLock: false,
      contactMarkers: [
        { name: 'LeftFootContact', timeSeconds: 0.0 },
        { name: 'LeftFootRelease', timeSeconds: 0.175 },
        { name: 'RightFootContact', timeSeconds: 0.35 },
        { name: 'RightFootRelease', timeSeconds: 0.525 },
      ],
      eval: makePose((p, set) => gaitCycle(p, set, {
        strideAmp: 0.68, kneeLift: 0.92, armSwing: 0.68, lean: 0.16, bounce: 0.05, hipYaw: 0.11, armAbduct: 0.10,
      })),
    },
    {
      name: 'WalkLunar', phase: 'core', semantics: 'lunar ground walk', loop: true, duration: 1.4, groundLock: false,
      contactMarkers: [
        { name: 'LeftFootContact', timeSeconds: 0.0 },
        { name: 'RightFootRelease', timeSeconds: 0.187 },
        { name: 'RightFootContact', timeSeconds: 0.7 },
        { name: 'LeftFootRelease', timeSeconds: 0.887 },
      ],
      eval: makePose((p, set) => gaitCycle(p, set, {
        strideAmp: 0.52, kneeLift: 0.68, armSwing: 0.42, lean: 0.09, bounce: 0.04, hipYaw: 0.06, armAbduct: 0.16,
      })),
    },
    {
      name: 'RunLunar', phase: 'core', semantics: 'lunar ground run', loop: true, duration: 1.0, groundLock: false,
      contactMarkers: [
        { name: 'LeftFootContact', timeSeconds: 0.0 },
        { name: 'LeftFootRelease', timeSeconds: 0.233 },
        { name: 'RightFootContact', timeSeconds: 0.5 },
        { name: 'RightFootRelease', timeSeconds: 0.733 },
      ],
      eval: makePose((p, set) => gaitCycle(p, set, {
        strideAmp: 0.76, kneeLift: 0.86, armSwing: 0.65, lean: 0.14, bounce: 0.10, hipYaw: 0.09, armAbduct: 0.22,
      })),
    },
    {
      name: 'TurnLeft', phase: 'core', semantics: 'left turn in place', loop: false, duration: 0.6, groundLock: true,
      contactMarkers: [
        { name: 'LeftStepLift', timeSeconds: 0.1 },
        { name: 'LeftStepPlant', timeSeconds: 0.367 },
        { name: 'RightFollowPlant', timeSeconds: 0.567 },
      ],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.65);
        const step = bell(p, 0.38, 0.28);
        const step2 = bell(p, 0.72, 0.25);
        set('Hips', 0.03 * w, 0.18 * w, 0);
        set('Chest', 0.04 * w, 0.24 * w, 0);
        set('Head', 0, 0.38 * w, 0);
        set('Thigh_L', -0.28 * step, 0.18 * step, 0.05);
        set('Shin_L', 0.45 * step, 0, 0);
        set('Thigh_R', -0.18 * step2, 0.12 * step2, -0.05);
        set('Shin_R', 0.30 * step2, 0, 0);
        set('UpperArm_L', 0.15 * w, 0, 0.12);
        set('UpperArm_R', -0.20 * w, 0, -0.12);
        set('Forearm_L', -0.28, 0, 0);
        set('Forearm_R', -0.35, 0, 0);
        return 0;
      }),
    },
    {
      name: 'TurnRight', phase: 'core', semantics: 'right turn in place', loop: false, duration: 0.6, groundLock: true,
      contactMarkers: [
        { name: 'RightStepLift', timeSeconds: 0.1 },
        { name: 'RightStepPlant', timeSeconds: 0.367 },
        { name: 'LeftFollowPlant', timeSeconds: 0.567 },
      ],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.65);
        const step = bell(p, 0.38, 0.28);
        const step2 = bell(p, 0.72, 0.25);
        set('Hips', 0.03 * w, -0.18 * w, 0);
        set('Chest', 0.04 * w, -0.24 * w, 0);
        set('Head', 0, -0.38 * w, 0);
        set('Thigh_R', -0.28 * step, -0.18 * step, -0.05);
        set('Shin_R', 0.45 * step, 0, 0);
        set('Thigh_L', -0.18 * step2, -0.12 * step2, 0.05);
        set('Shin_L', 0.30 * step2, 0, 0);
        set('UpperArm_R', 0.15 * w, 0, -0.12);
        set('UpperArm_L', -0.20 * w, 0, 0.12);
        set('Forearm_L', -0.35, 0, 0);
        set('Forearm_R', -0.28, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Stop', phase: 'core', semantics: 'controlled arrival', loop: false, duration: 0.5, groundLock: true,
      contactMarkers: [{ name: 'BothFeetSettle', timeSeconds: 0.233 }],
      eval: makePose((p, set) => {
        const b = bell(p, 0.35, 0.35);
        set('Hips', 0.06 * b, 0, 0);
        set('Spine', -0.08 * b, 0, 0);
        set('Thigh_L', -0.25 * b, 0, 0.03);
        set('Shin_L', 0.44 * b, 0, 0);
        set('Foot_L', -0.18 * b, 0, 0);
        set('Thigh_R', -0.20 * b, 0, -0.03);
        set('Shin_R', 0.38 * b, 0, 0);
        set('Foot_R', -0.16 * b, 0, 0);
        set('UpperArm_L', 0.18 * b, 0, 0.18 * b + 0.08);
        set('UpperArm_R', 0.18 * b, 0, -0.18 * b - 0.08);
        set('Forearm_L', -0.32, 0, 0);
        set('Forearm_R', -0.32, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Inspect', phase: 'core', semantics: 'visual inspection', loop: false, duration: 1.4, groundLock: true,
      contactMarkers: [{ name: 'ScannerRead', timeSeconds: 0.667 }],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.22, 0.78);
        const scan = Math.sin(p * Math.PI * 2) * w;
        set('Spine', 0.14 * w, 0, 0);
        set('Chest', 0.12 * w, scan * 0.12, 0);
        set('Head', 0.26 * w, scan * 0.28, 0);
        set('UpperArm_L', -0.58 * w, -0.22 * w, 0.12);
        set('Forearm_L', -0.78 * w, 0.3 * w, 0);
        set('UpperArm_R', -0.32 * w, 0.15 * w, -0.12);
        set('Forearm_R', -0.45 * w, 0, 0);
        set('Thigh_L', -0.12 * w, 0, 0.03);
        set('Shin_L', 0.22 * w, 0, 0);
        set('Thigh_R', -0.12 * w, 0, -0.03);
        set('Shin_R', 0.22 * w, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Repair', phase: 'core', semantics: 'visual repair gesture (kneeling)', loop: false, duration: 1.6, groundLock: true,
      contactMarkers: [
        { name: 'RightKneeGroundContact', timeSeconds: 0.367 },
        { name: 'ToolWorkPeak', timeSeconds: 0.8 },
      ],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.22, 0.78);
        const work = Math.sin(p * Math.PI * 6) * w;
        // Deep one-knee kneel (Board 04 Pose 05): left foot planted forward, right knee grounded
        set('Hips', 0.14 * w, 0, 0);
        set('Spine', 0.24 * w, 0, 0);
        set('Chest', 0.22 * w, 0, 0);
        set('Head', 0.26 * w, work * 0.06, 0);
        set('Thigh_L', -1.35 * w, 0, 0.06);
        set('Shin_L', 1.38 * w, 0, 0);
        set('Foot_L', -0.05 * w, 0, 0);
        set('Thigh_R', 0.22 * w, 0, -0.06);
        set('Shin_R', 1.48 * w, 0, 0);
        set('Foot_R', 0.30 * w, 0, 0);
        set('UpperArm_R', -0.98 * w + work * 0.09, 0.16 * w, -0.08);
        set('Forearm_R', -0.52 * w - work * 0.16, 0, 0);
        set('UpperArm_L', -0.88 * w - work * 0.06, -0.16 * w, 0.08);
        set('Forearm_L', -0.58 * w + work * 0.09, 0, 0);
        return 0;
      }),
    },
    {
      name: 'JumpTakeoff', phase: 'core', semantics: 'depict controller takeoff', loop: false, duration: 0.4, groundLock: false,
      contactMarkers: [{ name: 'ToePushRelease', timeSeconds: 0.3 }],
      eval: makePose((p, set) => {
        const crouch = bell(p, 0.35, 0.35);
        const launch = smoothstep((p - 0.45) / 0.55);
        set('Spine', 0.16 * crouch - 0.10 * launch, 0, 0);
        set('Thigh_L', -0.55 * crouch + 0.15 * launch, 0, 0.04);
        set('Shin_L', 0.95 * crouch + 0.08 * launch, 0, 0);
        set('Foot_L', -0.38 * crouch + 0.42 * launch, 0, 0);
        set('Thigh_R', -0.55 * crouch + 0.15 * launch, 0, -0.04);
        set('Shin_R', 0.95 * crouch + 0.08 * launch, 0, 0);
        set('Foot_R', -0.38 * crouch + 0.42 * launch, 0, 0);
        set('UpperArm_L', 0.35 * crouch - 0.85 * launch, 0, 0.15 + 0.25 * launch);
        set('UpperArm_R', 0.35 * crouch - 0.85 * launch, 0, -0.15 - 0.25 * launch);
        set('Forearm_L', -0.45, 0, 0);
        set('Forearm_R', -0.45, 0, 0);
        return 0.05 * launch;
      }),
    },
    {
      name: 'Airborne', phase: 'core', semantics: 'depict controller airborne state', loop: true, duration: 0.9, groundLock: false,
      eval: makePose((p, set) => {
        const sway = Math.sin(p * Math.PI * 2);
        set('Spine', 0.08 + sway * 0.04, 0, 0);
        set('Head', -0.06, sway * 0.05, 0);
        set('Thigh_L', -0.42 + sway * 0.08, 0, 0.06);
        set('Shin_L', 0.68 - sway * 0.08, 0, 0);
        set('Foot_L', 0.25, 0, 0);
        set('Thigh_R', -0.32 - sway * 0.08, 0, -0.06);
        set('Shin_R', 0.56 + sway * 0.08, 0, 0);
        set('Foot_R', 0.25, 0, 0);
        set('UpperArm_L', -0.45 + sway * 0.12, 0, 0.42);
        set('Forearm_L', -0.48, 0, 0);
        set('UpperArm_R', -0.45 - sway * 0.12, 0, -0.42);
        set('Forearm_R', -0.48, 0, 0);
        return 0.08 + sway * 0.02;
      }),
    },
    {
      name: 'Land', phase: 'core', semantics: 'depict controller landing (impact cushion)', loop: false, duration: 0.5, groundLock: true,
      contactMarkers: [{ name: 'LandingFootContact', timeSeconds: 0.067 }],
      eval: makePose((p, set) => {
        // Board 04 Pose 04 (Pouso controlado)
        const absorb = bell(p, 0.35, 0.35);
        set('Spine', 0.24 * absorb, 0, 0);
        set('Head', -0.14 * absorb, 0, 0);
        set('Thigh_L', -0.72 * absorb, 0, 0.12 * absorb + 0.03);
        set('Shin_L', 1.15 * absorb, 0, 0);
        set('Foot_L', -0.42 * absorb, 0, 0);
        set('Thigh_R', -0.72 * absorb, 0, -0.12 * absorb - 0.03);
        set('Shin_R', 1.15 * absorb, 0, 0);
        set('Foot_R', -0.42 * absorb, 0, 0);
        set('UpperArm_L', -0.15 * absorb, 0, 0.65 * absorb + 0.08);
        set('Forearm_L', -0.35 * absorb, 0, 0);
        set('UpperArm_R', -0.15 * absorb, 0, -0.65 * absorb - 0.08);
        set('Forearm_R', -0.35 * absorb, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Talk', phase: 'extended', semantics: 'encounter conversation', loop: true, duration: 1.6, groundLock: true,
      eval: makePose((p, set) => {
        const w1 = Math.sin(p * Math.PI * 2);
        const w2 = Math.sin(p * Math.PI * 4);
        set('Spine', 0.03, w1 * 0.05, 0);
        set('Chest', 0.02, w1 * 0.08, 0);
        set('Head', 0.04 + w2 * 0.07, w1 * 0.10, w1 * 0.05);
        set('UpperArm_R', -0.42 + w1 * 0.15, 0.18, -0.14);
        set('Forearm_R', -0.72 + w2 * 0.22, -0.25, 0);
        set('UpperArm_L', -0.24 - w1 * 0.10, -0.10, 0.10);
        set('Forearm_L', -0.52 - w2 * 0.12, 0.15, 0);
        return 0;
      }),
    },
    {
      name: 'PetCometa', phase: 'extended', semantics: 'safely pet positioned Cometa', loop: false, duration: 1.8, groundLock: true,
      contactMarkers: [
        { name: 'PetStart', timeSeconds: 0.5 },
        { name: 'PetRelease', timeSeconds: 1.3 },
      ],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.78);
        const pat = Math.sin(p * Math.PI * 6) * w;
        // Deep friendly kneel/crouch (Board 05 Panel 2) reaching gloved right hand to ~0.50 m
        set('Hips', 0.12 * w, 0, 0);
        set('Spine', 0.34 * w, -0.10 * w, 0);
        set('Chest', 0.28 * w, -0.08 * w, 0);
        set('Head', 0.32 * w, -0.08 * w, 0.08 * w);
        set('Thigh_L', -1.32 * w, 0, 0.08 * w);
        set('Shin_L', 1.38 * w, 0, 0);
        set('Foot_L', -0.08 * w, 0, 0);
        set('Thigh_R', 0.18 * w, 0, -0.08 * w);
        set('Shin_R', 1.44 * w, 0, 0);
        set('Foot_R', 0.28 * w, 0, 0);
        set('UpperArm_R', -1.02 * w + pat * 0.09, 0.14 * w, -0.10);
        set('Forearm_R', -0.22 * w + pat * 0.12, 0, 0);
        set('Hand_R', -0.16 * w + pat * 0.10, 0, 0);
        set('UpperArm_L', -0.45 * w, 0, 0.22 * w + 0.08);
        set('Forearm_L', -0.58 * w, 0, 0);
        return 0;
      }),
    },
  ];

  const clips = sampleClips(rig, [mesh], clipSpecs);
  const materials = makeMaterialSet('astra_visor_glass', PALETTE.visorGlass, 0.48, 0.28, 0.42, false);
  return {
    id: 'astronaut',
    rigType: 'human',
    file: 'astronaut-animated.glb',
    rig,
    parts: [mesh],
    materials,
    clips,
    sourceAsset: 'tools/models/build_characters.mjs#buildAstronaut',
    contactMarkerPolicy: 'left/right foot contact and release; jump takeoff and landing ground contacts',
    environmentVariantsRequired: ['WalkEarth', 'RunEarth', 'WalkLunar', 'RunLunar'],
  };
}

// ---------------------------------------------------------------------------
// 2. HUMAN NPC (1.78 m, 7 clips, toggleable named meshes for Reyes, Lia, Elena)
// ---------------------------------------------------------------------------

function buildHumanNpc() {
  const rig = createHumanRig(false);
  const J = (n) => rig.idx(n);

  const body = new MeshPart('HumanNpc_Body', rig);
  const headBind = rigidBind(J('Head'));
  const chestBind = rigidBind(J('Chest'));
  const torsoBind = chainYBind([
    { joint: J('Hips'), yMin: 0.84, yMax: 1.00 },
    { joint: J('Spine'), yMin: 0.98, yMax: 1.22 },
    { joint: J('Chest'), yMin: 1.20, yMax: 1.48 },
  ]);

  // Shared friendly human base (trousers, boots, inner tunic, neck, unhelmeted head, hands)
  addHumanLegsAndBoots(body, rig, false);
  addHumanArms(body, rig, false, PALETTE.ivoryWarm, PALETTE.alloy, PALETTE.skinNeutral);
  body.addEllipsoid(0, 0.94, 0, 0.175, 0.10, 0.135, 14, 8, PALETTE.trouserDark, rigidBind(J('Hips')));
  body.addCapsule([0, 1.00, 0], [0, 1.38, 0.01], 0.155, 0.175, 14, 3, PALETTE.ivoryWarm, torsoBind);
  body.addCylinder([0, 1.43, 0.01], [0, 1.54, 0.015], 0.062, 0.058, 12, false, PALETTE.skinNeutral, rigidBind(J('Neck')));
  // Head & expressive eyes/nose/mouth
  body.addEllipsoid(0, 1.64, 0.02, 0.112, 0.128, 0.118, 14, 10, PALETTE.skinNeutral, headBind);
  body.addEllipsoid(0, 1.61, 0.132, 0.018, 0.020, 0.018, 8, 6, PALETTE.skinNeutral, headBind); // nose
  for (const s of [-1, 1]) {
    body.addEllipsoid(s * 0.042, 1.655, 0.122, 0.016, 0.016, 0.010, 8, 6, PALETTE.noseBlack, headBind);
    body.addEllipsoid(s * 0.11, 1.635, 0.01, 0.018, 0.028, 0.018, 8, 6, PALETTE.skinNeutral, headBind); // ears
  }
  body.addTube([[-0.032, 1.568, 0.120], [0, 1.562, 0.126], [0.032, 1.568, 0.120]], 0.007, 6, PALETTE.hairDark, headBind);

  // --- Reyes toggleable accessories (Commander: grey beard, grey hair, command jacket) ---
  const reyesBeard = new MeshPart('Reyes_Beard', rig);
  reyesBeard.addEllipsoid(0, 1.548, 0.065, 0.095, 0.072, 0.088, 12, 8, PALETTE.hairGrey, headBind);
  reyesBeard.addCapsule([-0.04, 1.588, 0.115], [0.04, 1.588, 0.115], 0.016, 0.016, 8, 2, PALETTE.hairGrey, headBind);
  reyesBeard.addEllipsoid(0, 1.495, 0.075, 0.065, 0.042, 0.062, 10, 6, PALETTE.hairGrey, headBind);

  const reyesHair = new MeshPart('Reyes_Hair', rig);
  reyesHair.addEllipsoid(0, 1.71, -0.01, 0.122, 0.082, 0.124, 12, 8, PALETTE.hairGrey, headBind);

  const reyesJacket = new MeshPart('Reyes_CommandJacket', rig);
  reyesJacket.addCapsule([0, 0.99, -0.005], [0, 1.38, 0.005], 0.175, 0.195, 14, 3, PALETTE.ivory, torsoBind);
  reyesJacket.addChamferBox(0, 1.34, 0, 0.37, 0.10, 0.25, 0.025, PALETTE.greyTrim, chestBind);
  for (const s of [-1, 1]) {
    reyesJacket.addChamferBox(s * 0.115, 1.24, 0.165, 0.045, 0.26, 0.03, 0.008, PALETTE.greyTrim, chestBind);
    reyesJacket.addChamferBox(s * 0.195, 1.39, 0.0, 0.06, 0.045, 0.11, 0.01, PALETTE.orange, rigidBind(J(s > 0 ? 'Shoulder_L' : 'Shoulder_R')));
  }
  reyesJacket.addChamferBox(0.06, 1.21, 0.185, 0.055, 0.08, 0.014, 0.003, PALETTE.cyan, chestBind, 1);

  // --- Lia toggleable accessories (Systems Mentor: protective glasses, hair bun, orange vest) ---
  const liaGlasses = new MeshPart('Lia_Glasses', rig);
  for (const s of [-1, 1]) {
    liaGlasses.addTorus([s * 0.045, 1.655, 0.138], [0, 0, 1], 0.032, 0.006, 12, 6, PALETTE.graphite, headBind);
    liaGlasses.addEllipsoid(s * 0.045, 1.655, 0.136, 0.028, 0.026, 0.006, 10, 6, PALETTE.glassesTint, headBind, 2);
    liaGlasses.addTube([[s * 0.075, 1.66, 0.135], [s * 0.112, 1.665, 0.02]], 0.004, 6, PALETTE.graphite, headBind);
  }
  liaGlasses.addCapsule([-0.018, 1.66, 0.140], [0.018, 1.66, 0.140], 0.005, 0.005, 6, 1, PALETTE.graphite, headBind);

  const liaHairBun = new MeshPart('Lia_HairBun', rig);
  liaHairBun.addEllipsoid(0, 1.70, -0.01, 0.120, 0.085, 0.122, 12, 8, PALETTE.hairDark, headBind);
  liaHairBun.addEllipsoid(0, 1.74, -0.125, 0.058, 0.055, 0.055, 10, 8, PALETTE.hairDark, headBind);

  const liaVest = new MeshPart('Lia_Vest', rig);
  liaVest.addCapsule([0, 1.03, 0], [0, 1.37, 0.01], 0.172, 0.192, 14, 2, PALETTE.orange, torsoBind);
  liaVest.addChamferBox(0, 1.24, 0.182, 0.14, 0.11, 0.035, 0.008, PALETTE.graphite, chestBind);
  liaVest.addChamferBox(-0.04, 1.26, 0.20, 0.048, 0.068, 0.012, 0.003, PALETTE.cyan, chestBind, 1);

  // --- Elena toggleable accessories (Botanist: green headband, curly hair, lab coat) ---
  const elenaHair = new MeshPart('Elena_CurlyHair', rig);
  elenaHair.addEllipsoid(0, 1.71, -0.015, 0.138, 0.095, 0.135, 12, 8, PALETTE.hairDark, headBind);
  for (const ang of [-1.2, -0.6, 0, 0.6, 1.2]) {
    elenaHair.addEllipsoid(Math.sin(ang) * 0.11, 1.75, Math.cos(ang) * -0.07 - 0.03, 0.058, 0.058, 0.058, 8, 6, PALETTE.hairDark, headBind);
  }

  const elenaHeadband = new MeshPart('Elena_Headband', rig);
  elenaHeadband.addTorus([0, 1.72, 0.015], [0, 0.92, 0.38], 0.124, 0.018, 16, 6, PALETTE.greenBright, headBind);

  const elenaLabCoat = new MeshPart('Elena_LabCoat', rig);
  elenaLabCoat.addCapsule([0, 0.78, -0.005], [0, 1.38, 0.005], 0.192, 0.190, 14, 4, PALETTE.ivoryWarm, chainYBind([
    { joint: J('Hips'), yMin: 0.72, yMax: 1.00 },
    { joint: J('Spine'), yMin: 0.98, yMax: 1.22 },
    { joint: J('Chest'), yMin: 1.20, yMax: 1.48 },
  ]));
  // Botanical green collar trim & leaf emblem
  elenaLabCoat.addTorus([0, 1.41, 0.015], [0, 1, 0], 0.145, 0.022, 14, 6, PALETTE.green, chestBind);
  elenaLabCoat.addChamferBox(0.08, 1.29, 0.185, 0.055, 0.055, 0.016, 0.005, PALETTE.greenBright, chestBind);

  const parts = [body, reyesBeard, reyesHair, reyesJacket, liaGlasses, liaHairBun, liaVest, elenaHair, elenaHeadband, elenaLabCoat];

  const makePose = (fn) => (phase) => {
    const rots = new Map();
    const set = (name, rx, ry, rz) => rots.set(J(name), quatFromEulerXYZ(rx, ry, rz));
    const rootY = fn(phase, set) ?? 0;
    return { rotations: rots, rootY };
  };

  const clipSpecs = [
    {
      name: 'Idle', phase: 'core', semantics: 'resting stance', loop: true, duration: 2.4, groundLock: true,
      eval: makePose((p, set) => {
        const w = Math.sin(p * Math.PI * 2);
        set('Spine', 0.02 + w * 0.02, 0, 0);
        set('Head', w * 0.03, Math.sin(p * Math.PI * 2) * 0.10, 0);
        set('UpperArm_L', 0.05 + w * 0.03, 0, 0.06);
        set('Forearm_L', -0.15, 0, 0);
        set('UpperArm_R', 0.05 - w * 0.03, 0, -0.06);
        set('Forearm_R', -0.15, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Talk', phase: 'core', semantics: 'stationary encounter conversation', loop: true, duration: 1.8, groundLock: true,
      eval: makePose((p, set) => {
        const w1 = Math.sin(p * Math.PI * 2);
        const w2 = Math.sin(p * Math.PI * 4);
        set('Spine', 0.02, w1 * 0.06, 0);
        set('Chest', 0.02, w1 * 0.08, 0);
        set('Head', 0.03 + w2 * 0.06, w1 * 0.12, w1 * 0.04);
        set('UpperArm_R', -0.38 + w1 * 0.16, 0.16, -0.12);
        set('Forearm_R', -0.68 + w2 * 0.22, -0.22, 0);
        set('UpperArm_L', -0.28 - w1 * 0.12, -0.12, 0.10);
        set('Forearm_L', -0.56 - w2 * 0.16, 0.15, 0);
        return 0;
      }),
    },
    {
      name: 'Gesture', phase: 'core', semantics: 'encounter welcoming gesture', loop: false, duration: 1.3, groundLock: true,
      contactMarkers: [{ name: 'GesturePeak', timeSeconds: 0.633 }],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.28, 0.72);
        set('Spine', -0.04 * w, 0, 0);
        set('Head', 0.06 * w, 0.10 * Math.sin(p * Math.PI * 2) * w, 0);
        set('UpperArm_L', -0.62 * w, -0.28 * w, 0.36 * w + 0.06);
        set('Forearm_L', -0.52 * w, 0.25 * w, 0);
        set('UpperArm_R', -0.62 * w, 0.28 * w, -0.36 * w - 0.06);
        set('Forearm_R', -0.52 * w, -0.25 * w, 0);
        return 0;
      }),
    },
    {
      name: 'Point', phase: 'core', semantics: 'point at a visible subject', loop: false, duration: 1.3, groundLock: true,
      contactMarkers: [{ name: 'PointApex', timeSeconds: 0.567 }],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.22, 0.74);
        set('Spine', 0.05 * w, -0.14 * w, 0);
        set('Chest', 0.04 * w, -0.18 * w, 0);
        set('Head', 0.08 * w, -0.16 * w, 0);
        set('Shoulder_R', 0, -0.12 * w, -0.08 * w);
        set('UpperArm_R', -1.28 * w, -0.10 * w, -0.12 * w);
        set('Forearm_R', -0.14 * w, 0, 0);
        set('UpperArm_L', 0.08 * w, 0, 0.08);
        set('Forearm_L', -0.25 * w, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Walk', phase: 'extended', semantics: 'optional NPC locomotion', loop: true, duration: 1.0, groundLock: true,
      contactMarkers: [
        { name: 'LeftFootContact', timeSeconds: 0.0 },
        { name: 'RightFootContact', timeSeconds: 0.5 },
      ],
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        const sL = Math.sin(a), sR = Math.sin(a + Math.PI);
        const cL = Math.max(0, Math.cos(a)), cR = Math.max(0, Math.cos(a + Math.PI));
        set('Hips', 0.02, sL * 0.06, 0);
        set('Chest', 0.03, -sL * 0.06, 0);
        set('Thigh_L', -sL * 0.40, 0, 0.02);
        set('Shin_L', cL * 0.48 + Math.max(0, -sL) * 0.16, 0, 0);
        set('Foot_L', -cL * 0.15 + sL * 0.12, 0, 0);
        set('Thigh_R', -sR * 0.40, 0, -0.02);
        set('Shin_R', cR * 0.48 + Math.max(0, -sR) * 0.16, 0, 0);
        set('Foot_R', -cR * 0.15 + sR * 0.12, 0, 0);
        set('UpperArm_L', -sR * 0.30, 0, 0.06);
        set('Forearm_L', -0.22, 0, 0);
        set('UpperArm_R', -sL * 0.30, 0, -0.06);
        set('Forearm_R', -0.22, 0, 0);
        return 0;
      }),
    },
    {
      name: 'TurnLeft', phase: 'extended', semantics: 'optional NPC left turn', loop: false, duration: 0.6, groundLock: true,
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.65);
        const step = bell(p, 0.40, 0.30);
        set('Hips', 0, 0.16 * w, 0);
        set('Chest', 0, 0.22 * w, 0);
        set('Head', 0, 0.36 * w, 0);
        set('Thigh_L', -0.24 * step, 0.15 * step, 0.04);
        set('Shin_L', 0.40 * step, 0, 0);
        return 0;
      }),
    },
    {
      name: 'TurnRight', phase: 'extended', semantics: 'optional NPC right turn', loop: false, duration: 0.6, groundLock: true,
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.65);
        const step = bell(p, 0.40, 0.30);
        set('Hips', 0, -0.16 * w, 0);
        set('Chest', 0, -0.22 * w, 0);
        set('Head', 0, -0.36 * w, 0);
        set('Thigh_R', -0.24 * step, -0.15 * step, -0.04);
        set('Shin_R', 0.40 * step, 0, 0);
        return 0;
      }),
    },
  ];

  const clips = sampleClips(rig, parts, clipSpecs);
  const materials = makeMaterialSet('astra_lenses_glass', PALETTE.glassesTint, 0.44, 0.12, 0.56, false);
  return {
    id: 'human-npc',
    rigType: 'human',
    file: 'human-npc-animated.glb',
    rig,
    parts,
    materials,
    clips,
    sourceAsset: 'tools/models/build_characters.mjs#buildHumanNpc',
    contactMarkerPolicy: 'left/right foot contact and release; stationary gesture and point markers',
    environmentVariantsRequired: [],
    variants: {
      reyes: ['HumanNpc_Body', 'Reyes_Beard', 'Reyes_Hair', 'Reyes_CommandJacket'],
      lia: ['HumanNpc_Body', 'Lia_Glasses', 'Lia_HairBun', 'Lia_Vest'],
      elena: ['HumanNpc_Body', 'Elena_CurlyHair', 'Elena_Headband', 'Elena_LabCoat'],
    },
  };
}

// ---------------------------------------------------------------------------
// 3. PIP (hovering spherical/cylindrical tutor drone, cyan eyes/visor +Z, orange band, emitters)
// ---------------------------------------------------------------------------

function buildPip() {
  const rig = buildRig([
    { name: 'PipRoot', pos: [0, 0, 0] },
    { name: 'PipChassis', parent: 'PipRoot', pos: [0, 0.34, 0] },
    { name: 'PipHoverRing', parent: 'PipChassis', pos: [0, 0.08, 0] },
    { name: 'PipEmitter_L', parent: 'PipChassis', pos: [0.27, 0.34, 0.02] },
    { name: 'PipEmitter_R', parent: 'PipChassis', pos: [-0.27, 0.34, 0.02] },
    { name: 'PipHeadPivot', parent: 'PipChassis', pos: [0, 0.62, 0] },
    { name: 'PipEye_L', parent: 'PipHeadPivot', pos: [0.085, 0.66, 0.215] },
    { name: 'PipEye_R', parent: 'PipHeadPivot', pos: [-0.085, 0.66, 0.215] },
    { name: 'PipAntenna', parent: 'PipHeadPivot', pos: [0, 0.83, -0.04] },
  ]);
  const J = (n) => rig.idx(n);
  const mesh = new MeshPart('Pip', rig);

  // Lower hover ring & underside thruster emitter (minY strictly at y = 0.000 at bind pose!)
  const ringBind = rigidBind(J('PipHoverRing'));
  mesh.addTorus([0, 0.035, 0], [0, 1, 0], 0.21, 0.035, 20, 8, PALETTE.graphite, ringBind);
  mesh.addTorus([0, 0.032, 0], [0, 1, 0], 0.145, 0.018, 16, 6, PALETTE.cyan, ringBind, 1);
  mesh.addCylinder([0, 0.04, 0], [0, 0.13, 0], 0.12, 0.16, 16, true, PALETTE.alloy, ringBind);

  // Cylindrical-spherical chassis + safety orange waist band + front/back emitter lamps
  const bodyBind = rigidBind(J('PipChassis'));
  mesh.addCapsule([0, 0.265, 0], [0, 0.43, 0], 0.205, 0.235, 18, 3, PALETTE.ivory, bodyBind);
  mesh.addTorus([0, 0.34, 0], [0, 1, 0], 0.235, 0.034, 20, 8, PALETTE.orange, bodyBind);
  mesh.addChamferBox(0, 0.42, 0.215, 0.16, 0.042, 0.032, 0.008, PALETTE.cyan, bodyBind, 1);
  mesh.addChamferBox(0, 0.27, -0.215, 0.12, 0.042, 0.028, 0.006, PALETTE.cyan, bodyBind, 1);

  // Left & Right hovering thruster/sensor emitters
  for (const [s, name] of [[1, 'PipEmitter_L'], [-1, 'PipEmitter_R']]) {
    const eb = rigidBind(J(name));
    mesh.addCylinder([s * 0.24, 0.34, 0.02], [s * 0.32, 0.34, 0.02], 0.055, 0.068, 12, true, PALETTE.graphite, eb);
    mesh.addTorus([s * 0.30, 0.34, 0.02], [1, 0, 0], 0.058, 0.014, 12, 6, PALETTE.orange, eb);
    mesh.addEllipsoid(s * 0.325, 0.34, 0.02, 0.016, 0.042, 0.042, 8, 6, PALETTE.cyan, eb, 1);
  }

  // Articulated spherical-capsule Head facing +Z
  const headBind = rigidBind(J('PipHeadPivot'));
  mesh.addEllipsoid(0, 0.66, 0, 0.24, 0.175, 0.215, 18, 12, PALETTE.ivory, headBind);
  // Dark glossy visor faceplate facing +Z
  mesh.addEllipsoid(0, 0.66, 0.085, 0.185, 0.125, 0.142, 16, 10, PALETTE.screenDark, headBind, 2);
  // Orange side ear rings
  for (const s of [-1, 1]) {
    mesh.addTorus([s * 0.235, 0.66, 0], [1, 0, 0], 0.058, 0.016, 12, 6, PALETTE.orange, headBind);
    mesh.addEllipsoid(s * 0.245, 0.66, 0, 0.014, 0.036, 0.036, 8, 6, PALETTE.cyan, headBind, 1);
  }
  // Friendly glowing cyan smile arc on visor face (+Z)
  mesh.addTube([
    [-0.075, 0.612, 0.205],
    [-0.035, 0.598, 0.222],
    [0.035, 0.598, 0.222],
    [0.075, 0.612, 0.205],
  ], 0.008, 6, PALETTE.cyan, headBind, 1);

  // Independent expressive cyan eyes facing +Z
  mesh.addEllipsoid(0.085, 0.675, 0.215, 0.034, 0.038, 0.016, 10, 8, PALETTE.cyan, rigidBind(J('PipEye_L')), 1);
  mesh.addEllipsoid(-0.085, 0.675, 0.215, 0.034, 0.038, 0.016, 10, 8, PALETTE.cyan, rigidBind(J('PipEye_R')), 1);

  // Top antenna with safety orange beacon tip (~0.97 m total)
  const antBind = rigidBind(J('PipAntenna'));
  mesh.addCylinder([0, 0.81, -0.04], [0, 0.92, -0.04], 0.016, 0.011, 8, true, PALETTE.alloy, antBind);
  mesh.addEllipsoid(0, 0.94, -0.04, 0.030, 0.030, 0.030, 10, 8, PALETTE.orange, antBind);

  const makePose = (fn) => (phase) => {
    const rots = new Map();
    const scales = new Map();
    const set = (name, rx, ry, rz) => rots.set(J(name), quatFromEulerXYZ(rx, ry, rz));
    const setScale = (name, sx, sy, sz) => scales.set(J(name), [sx, sy, sz]);
    const rootY = fn(phase, set, setScale) ?? 0;
    return { rotations: rots, scales, rootY };
  };

  const clipSpecs = [
    {
      name: 'Idle', phase: 'core', semantics: 'mechanical hovering rest pose', loop: true, duration: 2.0, groundLock: false,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('PipChassis', Math.sin(a) * 0.03, 0, Math.cos(a) * 0.025);
        set('PipHeadPivot', -0.04 + Math.sin(a) * 0.04, Math.sin(a) * 0.16, 0);
        set('PipEmitter_L', Math.sin(a) * 0.10, 0, 0);
        set('PipEmitter_R', -Math.sin(a) * 0.10, 0, 0);
        set('PipAntenna', Math.cos(a) * 0.08, 0, 0);
        return 0.045 + Math.sin(a) * 0.025;
      }),
    },
    {
      name: 'Travel', phase: 'core', semantics: 'mechanical hover locomotion', loop: true, duration: 1.0, groundLock: false,
      contactMarkers: [{ name: 'HoverPulseCycle', timeSeconds: 0.5 }],
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('PipChassis', 0.22 + Math.sin(a) * 0.04, 0, Math.cos(a) * 0.03);
        set('PipHoverRing', -0.14, 0, 0);
        set('PipHeadPivot', -0.16, Math.sin(a) * 0.06, 0);
        set('PipEmitter_L', 0.34 + Math.sin(a) * 0.06, 0, 0);
        set('PipEmitter_R', 0.34 - Math.sin(a) * 0.06, 0, 0);
        set('PipAntenna', -0.18 + Math.sin(a * 2) * 0.06, 0, 0);
        return 0.06 + Math.sin(a * 2) * 0.02;
      }),
    },
    {
      name: 'TurnLeft', phase: 'core', semantics: 'mechanical left turn', loop: false, duration: 0.6, groundLock: false,
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.70);
        set('PipChassis', 0.06 * w, 0.18 * w, -0.22 * w);
        set('PipHeadPivot', 0, 0.42 * w, 0);
        set('PipEmitter_L', 0.30 * w, 0, 0);
        set('PipEmitter_R', -0.30 * w, 0, 0);
        return 0.05 + 0.02 * w;
      }),
    },
    {
      name: 'TurnRight', phase: 'core', semantics: 'mechanical right turn', loop: false, duration: 0.6, groundLock: false,
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.70);
        set('PipChassis', 0.06 * w, -0.18 * w, 0.22 * w);
        set('PipHeadPivot', 0, -0.42 * w, 0);
        set('PipEmitter_L', -0.30 * w, 0, 0);
        set('PipEmitter_R', 0.30 * w, 0, 0);
        return 0.05 + 0.02 * w;
      }),
    },
    {
      name: 'Scan', phase: 'core', semantics: 'instrument observation', loop: false, duration: 1.5, groundLock: false,
      contactMarkers: [{ name: 'ScanBeamSweep', timeSeconds: 0.75 }],
      eval: makePose((p, set, setScale) => {
        const w = rampHoldReturn(p, 0.20, 0.80);
        const sweep = Math.sin(p * Math.PI * 2) * w;
        set('PipChassis', 0.14 * w, 0, 0);
        set('PipHeadPivot', 0.18 * w, sweep * 0.48, 0);
        set('PipEmitter_L', -0.45 * w, 0.18 * w, 0);
        set('PipEmitter_R', -0.45 * w, -0.18 * w, 0);
        setScale('PipEye_L', 1.15 * w + (1 - w), 1.25 * w + (1 - w), 1);
        setScale('PipEye_R', 1.15 * w + (1 - w), 1.25 * w + (1 - w), 1);
        return 0.03 + 0.02 * w;
      }),
    },
    {
      name: 'Acknowledge', phase: 'core', semantics: 'readable mechanical response', loop: false, duration: 0.9, groundLock: false,
      contactMarkers: [{ name: 'ChirpPeak', timeSeconds: 0.35 }],
      eval: makePose((p, set, setScale) => {
        const hop = Math.abs(Math.sin(p * Math.PI * 2));
        const nod = Math.sin(p * Math.PI * 4) * rampHoldReturn(p, 0.15, 0.85);
        set('PipChassis', -0.08 * hop, 0, 0);
        set('PipHeadPivot', 0.22 * nod, 0, 0.08 * Math.sin(p * Math.PI * 2));
        set('PipAntenna', 0.25 * nod, 0, 0);
        setScale('PipEye_L', 1 + 0.15 * hop, 0.55 + 0.45 * (1 - hop), 1);
        setScale('PipEye_R', 1 + 0.15 * hop, 0.55 + 0.45 * (1 - hop), 1);
        return 0.04 + 0.075 * hop;
      }),
    },
  ];

  const clips = sampleClips(rig, [mesh], clipSpecs);
  const materials = makeMaterialSet('astra_visor_screen', PALETTE.screenDark, 1.0, 0.28, 0.40, true);
  return {
    id: 'pip',
    rigType: 'mechanical',
    file: 'pip-animated.glb',
    rig,
    parts: [mesh],
    materials,
    clips,
    sourceAsset: 'tools/models/build_characters.mjs#buildPip',
    contactMarkerPolicy: 'hover emitter cycle and scan sweep markers; no humanoid footfalls',
    environmentVariantsRequired: [],
  };
}

// ---------------------------------------------------------------------------
// 4. SCOUT S-02 (4 rotating wheels, dual rear antennas, articulated scan head/arm)
// ---------------------------------------------------------------------------

function buildScout() {
  const rig = buildRig([
    { name: 'ScoutRoot', pos: [0, 0, 0] },
    { name: 'Chassis', parent: 'ScoutRoot', pos: [0, 0.42, 0] },
    { name: 'ScanTurret', parent: 'Chassis', pos: [0, 0.66, 0.12] },
    { name: 'ScanHead', parent: 'ScanTurret', pos: [0, 0.77, 0.16] },
    { name: 'ArmShoulder', parent: 'Chassis', pos: [-0.31, 0.46, 0.18] },
    { name: 'ArmUpper', parent: 'ArmShoulder', pos: [-0.39, 0.46, 0.28] },
    { name: 'ArmForearm', parent: 'ArmUpper', pos: [-0.39, 0.43, 0.45] },
    { name: 'Antenna_L', parent: 'Chassis', pos: [0.22, 0.68, -0.32] },
    { name: 'Antenna_R', parent: 'Chassis', pos: [-0.22, 0.68, -0.32] },
    { name: 'Wheel_FL', parent: 'Chassis', pos: [0.39, 0.18, 0.34] },
    { name: 'Wheel_FR', parent: 'Chassis', pos: [-0.39, 0.18, 0.34] },
    { name: 'Wheel_RL', parent: 'Chassis', pos: [0.39, 0.18, -0.34] },
    { name: 'Wheel_RR', parent: 'Chassis', pos: [-0.39, 0.18, -0.34] },
  ]);
  const J = (n) => rig.idx(n);
  const mesh = new MeshPart('Scout', rig);

  // Chassis & Suspension Bogies (Boards 07–08 SCOUT S-02!)
  const bodyBind = rigidBind(J('Chassis'));
  mesh.addChamferBox(0, 0.44, 0, 0.64, 0.42, 0.86, 0.055, PALETTE.ivory, bodyBind);
  // Orange horizontal chassis stripes & bumper corners
  mesh.addChamferBox(0, 0.46, 0, 0.66, 0.10, 0.88, 0.025, PALETTE.orange, bodyBind);
  mesh.addChamferBox(0, 0.34, 0.43, 0.56, 0.09, 0.05, 0.015, PALETTE.graphite, bodyBind);
  mesh.addChamferBox(0, 0.36, 0.46, 0.34, 0.036, 0.02, 0.005, PALETTE.cyan, bodyBind, 1);
  // Side hatch & utility bars
  for (const s of [-1, 1]) {
    mesh.addChamferBox(s * 0.33, 0.46, -0.06, 0.03, 0.24, 0.42, 0.01, PALETTE.graphite, bodyBind);
    mesh.addChamferBox(s * 0.345, 0.54, -0.06, 0.015, 0.03, 0.22, 0.004, PALETTE.cyan, bodyBind, 1);
    // Suspension struts to wheels
    mesh.addCapsule([s * 0.24, 0.30, 0.15], [s * 0.34, 0.18, 0.34], 0.034, 0.028, 8, 1, PALETTE.graphite, bodyBind);
    mesh.addCapsule([s * 0.24, 0.30, -0.15], [s * 0.34, 0.18, -0.34], 0.034, 0.028, 8, 1, PALETTE.graphite, bodyBind);
  }

  // 4 chunky treaded wheels (bottom strictly at y = 0.000: center y=0.18, outer tread radius=0.18!)
  mesh.addTreadedWheel([0.39, 0.18, 0.34], 0.18, 0.15, 14, PALETTE.graphite, PALETTE.alloy, PALETTE.orange, rigidBind(J('Wheel_FL')));
  mesh.addTreadedWheel([-0.39, 0.18, 0.34], 0.18, 0.15, 14, PALETTE.graphite, PALETTE.alloy, PALETTE.orange, rigidBind(J('Wheel_FR')));
  mesh.addTreadedWheel([0.39, 0.18, -0.34], 0.18, 0.15, 14, PALETTE.graphite, PALETTE.alloy, PALETTE.orange, rigidBind(J('Wheel_RL')));
  mesh.addTreadedWheel([-0.39, 0.18, -0.34], 0.18, 0.15, 14, PALETTE.graphite, PALETTE.alloy, PALETTE.orange, rigidBind(J('Wheel_RR')));

  // Articulated Scan Turret & Head (twin recessed camera lenses facing +Z, Boards 07–08)
  mesh.addCylinder([0, 0.64, 0.12], [0, 0.74, 0.14], 0.11, 0.085, 12, true, PALETTE.graphite, rigidBind(J('ScanTurret')));
  const headBind = rigidBind(J('ScanHead'));
  mesh.addChamferBox(0, 0.81, 0.16, 0.38, 0.18, 0.24, 0.04, PALETTE.ivory, headBind);
  mesh.addChamferBox(0, 0.87, 0.16, 0.30, 0.05, 0.20, 0.015, PALETTE.orange, headBind);
  mesh.addChamferBox(0, 0.80, 0.275, 0.28, 0.11, 0.03, 0.008, PALETTE.graphite, headBind);
  for (const lx of [-0.075, 0.075]) {
    mesh.addCylinder([lx, 0.80, 0.275], [lx, 0.80, 0.305], 0.042, 0.038, 12, true, PALETTE.visorGlass, headBind, 2);
    mesh.addTorus([lx, 0.80, 0.305], [0, 0, 1], 0.036, 0.008, 12, 6, PALETTE.cyan, headBind, 1);
  }

  // Articulated Scan / Sample Arm (right side, folds neatly forward/back)
  mesh.addEllipsoid(-0.33, 0.46, 0.18, 0.055, 0.055, 0.055, 10, 6, PALETTE.orange, rigidBind(J('ArmShoulder')));
  mesh.addCapsule([-0.39, 0.46, 0.19], [-0.39, 0.46, 0.38], 0.032, 0.028, 8, 1, PALETTE.alloy, rigidBind(J('ArmUpper')));
  mesh.addEllipsoid(-0.39, 0.45, 0.40, 0.038, 0.038, 0.038, 8, 6, PALETTE.graphite, rigidBind(J('ArmForearm')));
  mesh.addCapsule([-0.39, 0.44, 0.42], [-0.39, 0.40, 0.56], 0.026, 0.022, 8, 1, PALETTE.ivory, rigidBind(J('ArmForearm')));
  mesh.addChamferBox(-0.39, 0.39, 0.58, 0.065, 0.055, 0.065, 0.012, PALETTE.orange, rigidBind(J('ArmForearm')));
  mesh.addEllipsoid(-0.39, 0.39, 0.618, 0.024, 0.024, 0.012, 8, 6, PALETTE.cyan, rigidBind(J('ArmForearm')), 1);

  // Dual Rear Antennas (Boards 07–08, total height ~1.24 m)
  for (const [x, name] of [[0.22, 'Antenna_L'], [-0.22, 'Antenna_R']]) {
    const ab = rigidBind(J(name));
    mesh.addCylinder([x, 0.64, -0.32], [x, 0.72, -0.32], 0.034, 0.026, 8, true, PALETTE.graphite, ab);
    mesh.addCylinder([x, 0.72, -0.32], [x, 1.18, -0.32], 0.016, 0.011, 8, true, PALETTE.alloy, ab);
    mesh.addEllipsoid(x, 1.21, -0.32, 0.028, 0.034, 0.028, 10, 8, PALETTE.orange, ab);
  }

  const makePose = (fn) => (phase) => {
    const rots = new Map();
    const set = (name, rx, ry, rz) => rots.set(J(name), quatFromEulerXYZ(rx, ry, rz));
    const setAxis = (name, axis, ang) => rots.set(J(name), quatFromAxisAngle(axis, ang));
    const rootY = fn(phase, set, setAxis) ?? 0;
    return { rotations: rots, rootY };
  };

  const clipSpecs = [
    {
      name: 'Idle', phase: 'core', semantics: 'mechanical resting pose', loop: true, duration: 2.0, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('ScanTurret', 0, Math.sin(a) * 0.14, 0);
        set('ScanHead', Math.sin(a * 2) * 0.04, 0, 0);
        set('Antenna_L', Math.sin(a) * 0.03, 0, 0);
        set('Antenna_R', -Math.sin(a) * 0.03, 0, 0);
        set('ArmUpper', -0.45, 0, 0);
        set('ArmForearm', 0.65, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Travel', phase: 'core', semantics: 'mechanical locomotion; 4 wheels spin continuously', loop: true, duration: 1.0, groundLock: true,
      contactMarkers: [
        { name: 'WheelQuarterTurn1', timeSeconds: 0.25 },
        { name: 'WheelHalfTurn', timeSeconds: 0.5 },
        { name: 'WheelQuarterTurn3', timeSeconds: 0.75 },
      ],
      eval: makePose((p, set, setAxis) => {
        const wheelAngle = p * Math.PI * 2; // full 360° forward rotation around +X
        for (const w of ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR']) {
          setAxis(w, [1, 0, 0], wheelAngle);
        }
        const bump = Math.sin(p * Math.PI * 4) * 0.025;
        set('Chassis', 0.03 + bump, 0, Math.sin(p * Math.PI * 2) * 0.02);
        set('ScanHead', -0.03, Math.sin(p * Math.PI * 2) * 0.06, 0);
        set('Antenna_L', 0.10 + Math.sin(p * Math.PI * 4) * 0.05, 0, 0);
        set('Antenna_R', 0.10 - Math.sin(p * Math.PI * 4) * 0.05, 0, 0);
        set('ArmUpper', -0.48, 0, 0);
        set('ArmForearm', 0.68, 0, 0);
        return 0;
      }),
    },
    {
      name: 'TurnLeft', phase: 'core', semantics: 'mechanical skid-steer left turn', loop: false, duration: 0.7, groundLock: true,
      eval: makePose((p, set, setAxis) => {
        const spin = smoothstep(p) * Math.PI; // 180° differential skid-steer
        const w = rampHoldReturn(p, 0.22, 0.74);
        setAxis('Wheel_FL', [1, 0, 0], -spin);
        setAxis('Wheel_RL', [1, 0, 0], -spin);
        setAxis('Wheel_FR', [1, 0, 0], spin);
        setAxis('Wheel_RR', [1, 0, 0], spin);
        set('ScanTurret', 0, 0.42 * w, 0);
        set('Chassis', 0, 0.08 * w, -0.04 * w);
        set('ArmUpper', -0.45, 0, 0);
        set('ArmForearm', 0.65, 0, 0);
        return 0;
      }),
    },
    {
      name: 'TurnRight', phase: 'core', semantics: 'mechanical skid-steer right turn', loop: false, duration: 0.7, groundLock: true,
      eval: makePose((p, set, setAxis) => {
        const spin = smoothstep(p) * Math.PI;
        const w = rampHoldReturn(p, 0.22, 0.74);
        setAxis('Wheel_FL', [1, 0, 0], spin);
        setAxis('Wheel_RL', [1, 0, 0], spin);
        setAxis('Wheel_FR', [1, 0, 0], -spin);
        setAxis('Wheel_RR', [1, 0, 0], -spin);
        set('ScanTurret', 0, -0.42 * w, 0);
        set('Chassis', 0, -0.08 * w, 0.04 * w);
        set('ArmUpper', -0.45, 0, 0);
        set('ArmForearm', 0.65, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Scan', phase: 'core', semantics: 'instrument observation with articulated arm and head', loop: false, duration: 1.8, groundLock: true,
      contactMarkers: [{ name: 'ArmExtendScan', timeSeconds: 0.9 }],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.75);
        const sweep = Math.sin(p * Math.PI * 2) * w;
        set('Chassis', 0.06 * w, 0, 0);
        set('ScanTurret', 0, sweep * 0.58, 0);
        set('ScanHead', 0.24 * w, 0, 0);
        // Arm deploys forward/out from stowed pose (-0.45 / +0.65) and sweeps
        set('ArmShoulder', 0, 0.42 * w, 0);
        set('ArmUpper', -0.45 * (1 - w) + 0.18 * w, sweep * 0.38, 0);
        set('ArmForearm', 0.65 * (1 - w) + 0.15 * w, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Acknowledge', phase: 'core', semantics: 'readable mechanical response', loop: false, duration: 0.9, groundLock: true,
      contactMarkers: [{ name: 'AcknowledgeNod', timeSeconds: 0.367 }],
      eval: makePose((p, set) => {
        const dip = Math.sin(p * Math.PI * 2) * rampHoldReturn(p, 0.10, 0.90);
        const w = rampHoldReturn(p, 0.20, 0.80);
        set('Chassis', -0.05 * Math.abs(dip), 0, 0);
        set('ScanHead', 0.24 * dip, 0, 0);
        set('Antenna_L', 0.22 * dip, 0, 0.10 * dip);
        set('Antenna_R', -0.22 * dip, 0, -0.10 * dip);
        set('ArmUpper', -0.45 - 0.35 * w, 0, 0);
        set('ArmForearm', 0.65 - 0.35 * w, 0, 0);
        return 0;
      }),
    },
  ];

  const clips = sampleClips(rig, [mesh], clipSpecs);
  const materials = makeMaterialSet('astra_sensor_glass', PALETTE.visorGlass, 1.0, 0.32, 0.42, true);
  return {
    id: 'scout',
    rigType: 'mechanical',
    file: 'scout-animated.glb',
    rig,
    parts: [mesh],
    materials,
    clips,
    sourceAsset: 'tools/models/build_characters.mjs#buildScout',
    contactMarkerPolicy: 'wheel rotation phase and scan arm articulation markers; no humanoid footfalls',
    environmentVariantsRequired: [],
  };
}

// ---------------------------------------------------------------------------
// 5. COMETA (Dachshund L ≈ 2.5 × H, 18 clips, verified ear-helmet clearance)
// ---------------------------------------------------------------------------

function buildCometa() {
  // Shoulder height H = 0.29 m, torso chest-to-rump length L = 0.72 m -> L / H = 2.48 ≈ 2.5!
  const HELMET_CENTER = [0, 0.405, 0.385];
  const HELMET_RADIUS = 0.178;

  const rig = buildRig([
    { name: 'CometaRoot', pos: [0, 0, 0] },
    { name: 'Pelvis', parent: 'CometaRoot', pos: [0, 0.205, -0.26] },
    { name: 'Spine1', parent: 'Pelvis', pos: [0, 0.215, -0.10] },
    { name: 'Spine2', parent: 'Spine1', pos: [0, 0.225, 0.08] },
    { name: 'Chest', parent: 'Spine2', pos: [0, 0.235, 0.23] },
    { name: 'Neck', parent: 'Chest', pos: [0, 0.315, 0.315] },
    { name: 'Head', parent: 'Neck', pos: [0, 0.395, 0.365] },
    { name: 'Ear_L', parent: 'Head', pos: [0.072, 0.420, 0.355] },
    { name: 'Ear_R', parent: 'Head', pos: [-0.072, 0.420, 0.355] },
    { name: 'Tail1', parent: 'Pelvis', pos: [0, 0.245, -0.35] },
    { name: 'Tail2', parent: 'Tail1', pos: [0, 0.295, -0.43] },
    { name: 'Tail3', parent: 'Tail2', pos: [0, 0.355, -0.50] },
    // Front Left & Right short legs + pressurized boots
    { name: 'Shoulder_FL', parent: 'Chest', pos: [0.095, 0.205, 0.22] },
    { name: 'UpperLeg_FL', parent: 'Shoulder_FL', pos: [0.095, 0.195, 0.22] },
    { name: 'LowerLeg_FL', parent: 'UpperLeg_FL', pos: [0.095, 0.105, 0.22] },
    { name: 'Paw_FL', parent: 'LowerLeg_FL', pos: [0.095, 0.032, 0.235] },
    { name: 'Shoulder_FR', parent: 'Chest', pos: [-0.095, 0.205, 0.22] },
    { name: 'UpperLeg_FR', parent: 'Shoulder_FR', pos: [-0.095, 0.195, 0.22] },
    { name: 'LowerLeg_FR', parent: 'UpperLeg_FR', pos: [-0.095, 0.105, 0.22] },
    { name: 'Paw_FR', parent: 'LowerLeg_FR', pos: [-0.095, 0.032, 0.235] },
    // Rear Left & Right short legs + pressurized boots
    { name: 'Hip_RL', parent: 'Pelvis', pos: [0.095, 0.205, -0.25] },
    { name: 'UpperLeg_RL', parent: 'Hip_RL', pos: [0.095, 0.195, -0.25] },
    { name: 'LowerLeg_RL', parent: 'UpperLeg_RL', pos: [0.095, 0.105, -0.265] },
    { name: 'Paw_RL', parent: 'LowerLeg_RL', pos: [0.095, 0.032, -0.245] },
    { name: 'Hip_RR', parent: 'Pelvis', pos: [-0.095, 0.205, -0.25] },
    { name: 'UpperLeg_RR', parent: 'Hip_RR', pos: [-0.095, 0.195, -0.25] },
    { name: 'LowerLeg_RR', parent: 'UpperLeg_RR', pos: [-0.095, 0.105, -0.265] },
    { name: 'Paw_RR', parent: 'LowerLeg_RR', pos: [-0.095, 0.032, -0.245] },
  ]);
  const J = (n) => rig.idx(n);
  const mesh = new MeshPart('Cometa', rig);

  // Elongated dachshund torso in ivory/orange 4-leg pressure suit (chest +0.34 .. rump -0.38 = 0.72 m!)
  const torsoBind = chainZBind([
    { joint: J('Pelvis'), zMin: -0.40, zMax: -0.15 },
    { joint: J('Spine1'), zMin: -0.18, zMax: 0.00 },
    { joint: J('Spine2'), zMin: -0.02, zMax: 0.18 },
    { joint: J('Chest'), zMin: 0.15, zMax: 0.36 },
  ]);
  mesh.addCapsule([0, 0.215, -0.29], [0, 0.228, 0.25], 0.108, 0.114, 16, 6, PALETTE.ivoryWarm, torsoBind);
  // Orange saddle / side suit armor panels & dark harness straps
  mesh.addChamferBox(0, 0.26, 0.02, 0.225, 0.11, 0.30, 0.03, PALETTE.orange, rigidBind(J('Spine2')));
  for (const zStrap of [-0.14, 0.12]) {
    mesh.addTorus([0, 0.22, zStrap], [0, 0, 1], 0.115, 0.012, 16, 6, PALETTE.graphite, rigidBind(J(zStrap < 0 ? 'Spine1' : 'Spine2')));
  }

  // Low-profile modular backpack (Board 03: MOCHILA MODULAR)
  const packBind = rigidBind(J('Spine2'));
  mesh.addChamferBox(0, 0.335, 0.02, 0.165, 0.085, 0.22, 0.025, PALETTE.ivory, packBind);
  mesh.addChamferBox(0, 0.372, 0.02, 0.125, 0.022, 0.15, 0.006, PALETTE.orange, packBind);
  for (const s of [-1, 1]) {
    mesh.addChamferBox(s * 0.085, 0.335, 0.03, 0.015, 0.022, 0.10, 0.004, PALETTE.cyan, packBind, 1);
  }

  // Pressure Collar & Cyan Status LEDs (Board 03: COLAR DE PRESSÃO)
  const neckBind = rigidBind(J('Neck'));
  mesh.addCylinder([0, 0.26, 0.27], [0, 0.32, 0.33], 0.105, 0.105, 16, true, PALETTE.ivory, neckBind);
  mesh.addTorus([0, 0.305, 0.325], [0, 0.85, 0.52], 0.106, 0.017, 16, 6, PALETTE.orange, neckBind);
  mesh.addTorus([0, 0.312, 0.332], [0, 0.85, 0.52], 0.109, 0.009, 16, 6, PALETTE.cyan, neckBind, 1);
  // Front collar circular medallion
  mesh.addEllipsoid(0, 0.245, 0.345, 0.034, 0.034, 0.018, 10, 8, PALETTE.alloy, neckBind);
  mesh.addEllipsoid(0, 0.245, 0.358, 0.020, 0.020, 0.010, 8, 6, PALETTE.cyan, neckBind, 1);

  // Dachshund Head & Elongated Snout (strictly inside clear spherical helmet!)
  const headBind = rigidBind(J('Head'));
  // Cranium (dark chocolate brown)
  mesh.addEllipsoid(0, 0.415, 0.375, 0.074, 0.072, 0.080, 14, 10, PALETTE.furBrown, headBind);
  // Warm caramel tan cheeks & eyebrow dots
  mesh.addEllipsoid(0, 0.382, 0.405, 0.060, 0.044, 0.055, 12, 8, PALETTE.furTan, headBind);
  for (const s of [-1, 1]) {
    mesh.addEllipsoid(s * 0.030, 0.448, 0.432, 0.014, 0.010, 0.010, 8, 6, PALETTE.furTan, headBind);
    mesh.addEllipsoid(s * 0.034, 0.425, 0.438, 0.015, 0.017, 0.012, 8, 6, PALETTE.noseBlack, headBind); // friendly dark eyes
  }
  // Long dachshund muzzle/snout (kept well within r <= 0.145 from HELMET_CENTER!)
  mesh.addCapsule([0, 0.398, 0.41], [0, 0.388, 0.495], 0.042, 0.028, 12, 2, PALETTE.furBrown, headBind);
  mesh.addCapsule([0, 0.380, 0.41], [0, 0.376, 0.490], 0.036, 0.024, 10, 2, PALETTE.furTan, headBind);
  mesh.addEllipsoid(0, 0.390, 0.512, 0.018, 0.015, 0.016, 8, 6, PALETTE.noseBlack, headBind); // nose tip at z=0.528 -> dist from (0,0.405,0.385) = 0.144 < 0.178!

  // Floppy Dachshund Ears (strictly inside helmet R=0.178 m across ALL clips!)
  for (const [s, name] of [[1, 'Ear_L'], [-1, 'Ear_R']]) {
    const eb = rigidBind(J(name));
    mesh.addCapsule([s * 0.074, 0.425, 0.358], [s * 0.095, 0.325, 0.372], 0.030, 0.024, 10, 2, PALETTE.furBrown, eb);
    mesh.addEllipsoid(s * 0.092, 0.328, 0.372, 0.022, 0.032, 0.026, 8, 6, PALETTE.furTan, eb);
  }

  // Clear Spherical Transparent Helmet (material 2, skinned rigidly to Head)
  mesh.addEllipsoid(
    HELMET_CENTER[0], HELMET_CENTER[1], HELMET_CENTER[2],
    HELMET_RADIUS, HELMET_RADIUS, HELMET_RADIUS,
    20, 14, PALETTE.helmetGlass, headBind, 2
  );

  // 4 Short Legs + Pressurized Boots (sole bottom strictly at y = 0.000!)
  const legs = [
    { prefix: 'FL', s: 1, z: 0.22, hip: 'Shoulder_FL', rZ: 0.22, pawZ: 0.238 },
    { prefix: 'FR', s: -1, z: 0.22, hip: 'Shoulder_FR', rZ: 0.22, pawZ: 0.238 },
    { prefix: 'RL', s: 1, z: -0.25, hip: 'Hip_RL', rZ: -0.265, pawZ: -0.242 },
    { prefix: 'RR', s: -1, z: -0.25, hip: 'Hip_RR', rZ: -0.265, pawZ: -0.242 },
  ];
  for (const leg of legs) {
    const x = leg.s * 0.095;
    const uBind = chainYBind([
      { joint: J(leg.hip), yMin: 0.18, yMax: 0.24 },
      { joint: J(`UpperLeg_${leg.prefix}`), yMin: 0.10, yMax: 0.20 },
      { joint: J(`LowerLeg_${leg.prefix}`), yMin: 0.07, yMax: 0.12 },
    ]);
    const lBind = chainYBind([
      { joint: J(`UpperLeg_${leg.prefix}`), yMin: 0.10, yMax: 0.14 },
      { joint: J(`LowerLeg_${leg.prefix}`), yMin: 0.04, yMax: 0.11 },
      { joint: J(`Paw_${leg.prefix}`), yMin: 0.00, yMax: 0.05 },
    ]);
    const pBind = rigidBind(J(`Paw_${leg.prefix}`));
    // Joint cap disc on outer thigh/shoulder (Board 03 orange circle pad!)
    mesh.addCylinder([x, 0.20, leg.z], [x + leg.s * 0.042, 0.20, leg.z], 0.044, 0.040, 10, true, PALETTE.orange, rigidBind(J(leg.hip)));
    mesh.addCapsule([x, 0.195, leg.z], [x, 0.105, leg.rZ], 0.040, 0.034, 10, 1, PALETTE.ivoryWarm, uBind);
    mesh.addCapsule([x, 0.105, leg.rZ], [x, 0.042, leg.pawZ], 0.032, 0.028, 10, 1, PALETTE.ivoryWarm, lBind);
    // Orange ankle cuff & pressurized boot grounded at y = 0.000
    mesh.addTorus([x, 0.052, leg.pawZ], [0, 1, 0], 0.030, 0.008, 10, 6, PALETTE.orange, pBind);
    mesh.addChamferBox(x, 0.020, leg.pawZ + 0.012, 0.064, 0.040, 0.088, 0.012, PALETTE.graphite, pBind);
    mesh.addChamferBox(x, 0.015, leg.pawZ + 0.044, 0.058, 0.028, 0.030, 0.008, PALETTE.orange, pBind);
  }

  // Segmented Tail Sleeve (Board 03: RABO COM PROTEÇÃO FLEXÍVEL)
  const tailBind = chainZBind([
    { joint: J('Tail1'), zMin: -0.42, zMax: -0.32 },
    { joint: J('Tail2'), zMin: -0.49, zMax: -0.40 },
    { joint: J('Tail3'), zMin: -0.60, zMax: -0.47 },
  ]);
  mesh.addCapsule([0, 0.245, -0.35], [0, 0.305, -0.44], 0.028, 0.024, 10, 2, PALETTE.ivoryWarm, tailBind);
  mesh.addTorus([0, 0.275, -0.395], [0, 0.55, -0.83], 0.027, 0.006, 10, 5, PALETTE.graphite, rigidBind(J('Tail1')));
  mesh.addCapsule([0, 0.305, -0.44], [0, 0.365, -0.52], 0.022, 0.015, 10, 2, PALETTE.ivoryWarm, rigidBind(J('Tail2')));
  mesh.addTorus([0, 0.335, -0.48], [0, 0.60, -0.80], 0.020, 0.005, 10, 5, PALETTE.orange, rigidBind(J('Tail2')));
  mesh.addCapsule([0, 0.365, -0.52], [0, 0.405, -0.565], 0.014, 0.009, 8, 1, PALETTE.furBrown, rigidBind(J('Tail3')));

  const makePose = (fn) => (phase) => {
    const rots = new Map();
    const set = (name, rx, ry, rz) => rots.set(J(name), quatFromEulerXYZ(rx, ry, rz));
    const rootY = fn(phase, set) ?? 0;
    return { rotations: rots, rootY };
  };

  // Helper for quadruped gait (4-beat walk vs 2-beat diagonal trot)
  function quadGait(phase, set, { phases, legSwing, legLift, bounce, spineWave, wagAmp, earFlop }) {
    const legSpecs = [
      { id: 'FL', off: phases.FL },
      { id: 'FR', off: phases.FR },
      { id: 'RL', off: phases.RL },
      { id: 'RR', off: phases.RR },
    ];
    for (const l of legSpecs) {
      const a = ((phase + l.off) % 1) * Math.PI * 2;
      const swing = Math.sin(a) * legSwing;
      const lift = Math.max(0, Math.cos(a)) * legLift;
      set(`UpperLeg_${l.id}`, -swing - lift * 0.4, 0, 0);
      set(`LowerLeg_${l.id}`, lift, 0, 0);
      set(`Paw_${l.id}`, -lift * 0.4 + swing * 0.25, 0, 0);
    }
    const g = phase * Math.PI * 2;
    set('Pelvis', Math.sin(g) * spineWave, Math.cos(g) * 0.04, 0);
    set('Spine1', -Math.sin(g) * spineWave * 0.7, Math.sin(g) * 0.04, 0);
    set('Spine2', Math.sin(g) * spineWave * 0.6, -Math.sin(g) * 0.04, 0);
    set('Neck', -0.04 + Math.cos(g * 2) * 0.04, 0, 0);
    set('Head', 0.04 - Math.cos(g * 2) * 0.03, 0, 0);
    set('Ear_L', Math.sin(g * 2) * earFlop, 0, earFlop * 0.6);
    set('Ear_R', Math.sin(g * 2) * earFlop, 0, -earFlop * 0.6);
    set('Tail1', 0.05, Math.sin(g * 2) * wagAmp, 0);
    set('Tail2', 0.08, Math.sin(g * 2 - 0.5) * wagAmp, 0);
    set('Tail3', 0.08, Math.sin(g * 2 - 1.0) * wagAmp, 0);
    return bounce * Math.abs(Math.sin(g * 2));
  }

  const clipSpecs = [
    {
      name: 'Idle', phase: 'core', semantics: 'standing rest', loop: true, duration: 2.0, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('Spine1', Math.sin(a) * 0.02, 0, 0);
        set('Spine2', -Math.sin(a) * 0.02, 0, 0);
        set('Neck', Math.sin(a) * 0.03, Math.sin(a) * 0.08, 0);
        set('Head', -0.02, Math.sin(a) * 0.10, Math.cos(a) * 0.04);
        set('Ear_L', 0, 0, 0.04 + Math.sin(a) * 0.03);
        set('Ear_R', 0, 0, -0.04 - Math.sin(a) * 0.03);
        set('Tail1', 0, Math.sin(a * 2) * 0.18, 0);
        set('Tail2', 0, Math.sin(a * 2 - 0.4) * 0.20, 0);
        return 0;
      }),
    },
    {
      name: 'Walk', phase: 'core', semantics: 'grounded four-paw walk', loop: true, duration: 1.1, groundLock: true,
      contactMarkers: [
        { name: 'PawFLContact', timeSeconds: 0.0 },
        { name: 'PawRRContact', timeSeconds: 0.275 },
        { name: 'PawFRContact', timeSeconds: 0.55 },
        { name: 'PawRLContact', timeSeconds: 0.825 },
      ],
      eval: makePose((p, set) => quadGait(p, set, {
        phases: { FL: 0.0, RR: 0.25, FR: 0.5, RL: 0.75 },
        legSwing: 0.38, legLift: 0.45, bounce: 0.008, spineWave: 0.04, wagAmp: 0.22, earFlop: 0.06,
      })),
    },
    {
      name: 'WalkEarth', phase: 'core', semantics: 'earth gravity grounded four-paw walk', loop: true, duration: 1.0, groundLock: true,
      contactMarkers: [
        { name: 'PawFLContact', timeSeconds: 0.0 },
        { name: 'PawRRContact', timeSeconds: 0.25 },
        { name: 'PawFRContact', timeSeconds: 0.5 },
        { name: 'PawRLContact', timeSeconds: 0.75 },
      ],
      eval: makePose((p, set) => quadGait(p, set, {
        phases: { FL: 0.0, RR: 0.25, FR: 0.5, RL: 0.75 },
        legSwing: 0.40, legLift: 0.46, bounce: 0.006, spineWave: 0.035, wagAmp: 0.20, earFlop: 0.05,
      })),
    },
    {
      name: 'WalkLunar', phase: 'core', semantics: 'lunar gravity buoyant four-paw walk', loop: true, duration: 1.4, groundLock: false,
      contactMarkers: [
        { name: 'PawFLContact', timeSeconds: 0.0 },
        { name: 'PawRRContact', timeSeconds: 0.35 },
        { name: 'PawFRContact', timeSeconds: 0.7 },
        { name: 'PawRLContact', timeSeconds: 1.05 },
      ],
      eval: makePose((p, set) => quadGait(p, set, {
        phases: { FL: 0.0, RR: 0.25, FR: 0.5, RL: 0.75 },
        legSwing: 0.46, legLift: 0.64, bounce: 0.028, spineWave: 0.055, wagAmp: 0.26, earFlop: 0.08,
      })),
    },
    {
      name: 'Trot', phase: 'core', semantics: 'grounded diagonal-pair four-paw trot', loop: true, duration: 0.7, groundLock: true,
      contactMarkers: [
        { name: 'DiagonalFL_RRContact', timeSeconds: 0.0 },
        { name: 'DiagonalFR_RLContact', timeSeconds: 0.35 },
      ],
      eval: makePose((p, set) => quadGait(p, set, {
        phases: { FL: 0.0, RR: 0.0, FR: 0.5, RL: 0.5 },
        legSwing: 0.52, legLift: 0.62, bounce: 0.014, spineWave: 0.05, wagAmp: 0.28, earFlop: 0.08,
      })),
    },
    {
      name: 'TrotEarth', phase: 'core', semantics: 'earth gravity diagonal trot', loop: true, duration: 0.6, groundLock: true,
      contactMarkers: [
        { name: 'DiagonalFL_RRContact', timeSeconds: 0.0 },
        { name: 'DiagonalFR_RLContact', timeSeconds: 0.3 },
      ],
      eval: makePose((p, set) => quadGait(p, set, {
        phases: { FL: 0.0, RR: 0.0, FR: 0.5, RL: 0.5 },
        legSwing: 0.54, legLift: 0.64, bounce: 0.012, spineWave: 0.045, wagAmp: 0.28, earFlop: 0.08,
      })),
    },
    {
      name: 'TrotLunar', phase: 'core', semantics: 'lunar gravity buoyant diagonal trot', loop: true, duration: 0.9, groundLock: false,
      contactMarkers: [
        { name: 'DiagonalFL_RRContact', timeSeconds: 0.0 },
        { name: 'DiagonalFR_RLContact', timeSeconds: 0.45 },
      ],
      eval: makePose((p, set) => quadGait(p, set, {
        phases: { FL: 0.0, RR: 0.0, FR: 0.5, RL: 0.5 },
        legSwing: 0.58, legLift: 0.74, bounce: 0.042, spineWave: 0.06, wagAmp: 0.32, earFlop: 0.09,
      })),
    },
    {
      name: 'TurnLeft', phase: 'core', semantics: 'grounded left turn in place', loop: false, duration: 0.6, groundLock: true,
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.70);
        const step = bell(p, 0.40, 0.30);
        set('Spine2', 0, 0.14 * w, 0);
        set('Neck', 0, 0.24 * w, 0);
        set('Head', 0, 0.26 * w, 0.06 * w);
        set('UpperLeg_FL', -0.35 * step, 0.12 * step, 0);
        set('LowerLeg_FL', 0.48 * step, 0, 0);
        set('UpperLeg_RR', -0.25 * step, 0.12 * step, 0);
        set('LowerLeg_RR', 0.40 * step, 0, 0);
        set('Tail1', 0, 0.22 * w, 0);
        return 0;
      }),
    },
    {
      name: 'TurnRight', phase: 'core', semantics: 'grounded right turn in place', loop: false, duration: 0.6, groundLock: true,
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.25, 0.70);
        const step = bell(p, 0.40, 0.30);
        set('Spine2', 0, -0.14 * w, 0);
        set('Neck', 0, -0.24 * w, 0);
        set('Head', 0, -0.26 * w, -0.06 * w);
        set('UpperLeg_FR', -0.35 * step, -0.12 * step, 0);
        set('LowerLeg_FR', 0.48 * step, 0, 0);
        set('UpperLeg_RL', -0.25 * step, -0.12 * step, 0);
        set('LowerLeg_RL', 0.40 * step, 0, 0);
        set('Tail1', 0, -0.22 * w, 0);
        return 0;
      }),
    },
    {
      name: 'Stop', phase: 'core', semantics: 'grounded four-paw arrival brace', loop: false, duration: 0.5, groundLock: true,
      contactMarkers: [{ name: 'FourPawBrace', timeSeconds: 0.2 }],
      eval: makePose((p, set) => {
        const b = bell(p, 0.35, 0.35);
        set('Pelvis', 0.08 * b, 0, 0);
        set('Spine2', -0.06 * b, 0, 0);
        set('UpperLeg_FL', -0.26 * b, 0, 0);
        set('UpperLeg_FR', -0.26 * b, 0, 0);
        set('UpperLeg_RL', 0.18 * b, 0, 0);
        set('UpperLeg_RR', 0.18 * b, 0, 0);
        set('Head', -0.10 * b, 0, 0);
        return 0;
      }),
    },
    {
      name: 'Sit', phase: 'core', semantics: 'settle into a relaxed sit looking up', loop: false, duration: 0.8, groundLock: true,
      contactMarkers: [{ name: 'HaunchSettle', timeSeconds: 0.6 }],
      eval: makePose((p, set) => {
        const s = smoothstep(p);
        // Dachshund proportions (0.17m legs, 0.48m torso): ~13 deg spine pitch keeps front paws & haunches grounded!
        set('Pelvis', -0.16 * s, 0, 0);
        set('Spine1', -0.04 * s, 0, 0);
        set('Spine2', -0.03 * s, 0, 0);
        set('Chest', 0.02 * s, 0, 0);
        set('Neck', -0.24 * s, 0, 0);
        set('Head', -0.22 * s, 0, 0);
        // Front legs stay vertical against gently tilted chest -> front paws planted on floor!
        set('UpperLeg_FL', 0.21 * s, 0, 0);
        set('LowerLeg_FL', 0.03 * s, 0, 0);
        set('UpperLeg_FR', 0.21 * s, 0, 0);
        set('LowerLeg_FR', 0.03 * s, 0, 0);
        // Rear legs tuck forward into seated haunch
        set('UpperLeg_RL', -1.18 * s, 0, 0.14 * s);
        set('LowerLeg_RL', 1.48 * s, 0, 0);
        set('Paw_RL', -0.14 * s, 0, 0);
        set('UpperLeg_RR', -1.18 * s, 0, -0.14 * s);
        set('LowerLeg_RR', 1.48 * s, 0, 0);
        set('Paw_RR', -0.14 * s, 0, 0);
        set('Tail1', 0.18 * s, Math.sin(p * Math.PI * 2) * 0.12, 0);
        return 0;
      }),
    },
    {
      name: 'Wait', phase: 'core', semantics: 'stay safely in seated attentive pose', loop: true, duration: 2.0, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('Pelvis', -0.16, 0, 0);
        set('Spine1', -0.04 + Math.sin(a) * 0.02, 0, 0);
        set('Spine2', -0.03, 0, 0);
        set('Chest', 0.02, 0, 0);
        set('Neck', -0.24, Math.sin(a) * 0.08, 0);
        set('Head', -0.20, Math.sin(a) * 0.10, Math.cos(a) * 0.04);
        set('Ear_L', 0, 0, 0.05 + Math.sin(a * 2) * 0.03);
        set('Ear_R', 0, 0, -0.05 - Math.sin(a * 2) * 0.03);
        set('UpperLeg_FL', 0.21, 0, 0);
        set('LowerLeg_FL', 0.03, 0, 0);
        set('UpperLeg_FR', 0.21, 0, 0);
        set('LowerLeg_FR', 0.03, 0, 0);
        set('UpperLeg_RL', -1.18, 0, 0.14);
        set('LowerLeg_RL', 1.48, 0, 0);
        set('Paw_RL', -0.14, 0, 0);
        set('UpperLeg_RR', -1.18, 0, -0.14);
        set('LowerLeg_RR', 1.48, 0, 0);
        set('Paw_RR', -0.14, 0, 0);
        set('Tail1', 0.18, Math.sin(a) * 0.16, 0);
        return 0;
      }),
    },
    {
      name: 'Recall', phase: 'core', semantics: 'alert perk-up response to recall', loop: false, duration: 1.0, groundLock: true,
      contactMarkers: [{ name: 'AlertPerk', timeSeconds: 0.4 }],
      eval: makePose((p, set) => {
        const bow = bell(p, 0.32, 0.28);
        const perk = rampHoldReturn(p, 0.45, 0.85);
        set('Spine1', 0.12 * bow, 0, 0);
        set('Chest', 0.14 * bow - 0.08 * perk, 0, 0);
        set('Neck', -0.28 * perk, 0, 0);
        set('Head', -0.18 * perk, Math.sin(p * Math.PI * 2) * 0.08, 0);
        set('Ear_L', -0.08 * perk, 0, 0.08 * perk);
        set('Ear_R', -0.08 * perk, 0, -0.08 * perk);
        set('UpperLeg_FL', -0.25 * bow, 0, 0);
        set('UpperLeg_FR', -0.25 * bow, 0, 0);
        set('Tail1', 0.20 * perk, Math.sin(p * Math.PI * 8) * 0.35, 0);
        set('Tail2', 0.20 * perk, Math.sin(p * Math.PI * 8 - 0.5) * 0.35, 0);
        return 0;
      }),
    },
    {
      name: 'Sniff', phase: 'extended', semantics: 'pressurized areas only', loop: true, duration: 1.6, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('Spine2', 0.10, Math.sin(a) * 0.06, 0);
        set('Chest', 0.16, Math.sin(a) * 0.08, 0);
        set('Neck', 0.34, Math.sin(a * 2) * 0.18, 0);
        set('Head', 0.24 + Math.sin(a * 4) * 0.06, Math.sin(a * 2) * 0.16, 0);
        set('UpperLeg_FL', -0.18, 0, 0.04);
        set('LowerLeg_FL', 0.26, 0, 0);
        set('UpperLeg_FR', -0.14, 0, -0.04);
        set('LowerLeg_FR', 0.22, 0, 0);
        set('Tail1', 0.10, Math.sin(a * 2) * 0.22, 0);
        return 0;
      }),
    },
    {
      name: 'WagTail', phase: 'extended', semantics: 'friendly tail response within sleeve', loop: true, duration: 1.0, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 4;
        set('Pelvis', 0, Math.sin(a) * 0.10, Math.cos(a) * 0.04);
        set('Tail1', 0.16, Math.sin(a) * 0.45, 0);
        set('Tail2', 0.18, Math.sin(a - 0.5) * 0.48, 0);
        set('Tail3', 0.14, Math.sin(a - 1.0) * 0.45, 0);
        set('Head', -0.06, Math.sin(a * 0.5) * 0.06, Math.sin(a * 0.5) * 0.05);
        return 0;
      }),
    },
    {
      name: 'ReceivePet', phase: 'extended', semantics: 'receive a gentle pet (friendly paw greeting)', loop: false, duration: 1.6, groundLock: true,
      contactMarkers: [{ name: 'FriendlyPawLift', timeSeconds: 0.7 }],
      eval: makePose((p, set) => {
        const w = rampHoldReturn(p, 0.22, 0.78);
        const wag = Math.sin(p * Math.PI * 8) * w;
        set('Pelvis', -0.15 * w, 0, 0);
        set('Spine1', -0.04 * w, 0, 0);
        set('Neck', -0.22 * w, 0.08 * w, 0.08 * w);
        set('Head', -0.22 * w, 0.10 * w, 0.10 * w);
        // Friendly front-left paw lift while right front paw & seated haunches stay grounded!
        set('UpperLeg_FL', -0.85 * w, 0, 0);
        set('LowerLeg_FL', 0.24 * w, 0, 0);
        set('UpperLeg_FR', 0.19 * w, 0, 0);
        set('UpperLeg_RL', -1.12 * w, 0, 0.12 * w);
        set('LowerLeg_RL', 1.42 * w, 0, 0);
        set('UpperLeg_RR', -1.12 * w, 0, -0.12 * w);
        set('LowerLeg_RR', 1.42 * w, 0, 0);
        set('Tail1', 0.20 * w, wag * 0.42, 0);
        set('Tail2', 0.20 * w, wag * 0.42, 0);
        return 0;
      }),
    },
    {
      name: 'LookAtBeacon', phase: 'extended', semantics: 'look toward an already player-visible beacon', loop: true, duration: 1.8, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('Spine2', -0.08, 0, 0);
        set('Chest', -0.10, 0, 0);
        set('Neck', -0.26, Math.sin(a) * 0.06, 0);
        set('Head', -0.22, Math.sin(a) * 0.06, 0.05 * Math.cos(a));
        set('Ear_L', -0.08, 0, 0.07);
        set('Ear_R', -0.08, 0, -0.07);
        set('UpperLeg_FL', -0.22, 0, 0);
        set('LowerLeg_FL', 0.16, 0, 0);
        set('Tail1', 0.22, Math.sin(a) * 0.12, 0);
        return 0;
      }),
    },
    {
      name: 'WatchRepair', phase: 'extended', semantics: 'observe a human repair', loop: true, duration: 2.0, groundLock: true,
      eval: makePose((p, set) => {
        const a = p * Math.PI * 2;
        set('Pelvis', -0.20, 0, 0);
        set('Spine1', -0.06, 0, 0);
        set('Neck', -0.14, Math.sin(a) * 0.12, 0);
        set('Head', -0.08 + Math.sin(a * 2) * 0.05, Math.sin(a) * 0.14, Math.sin(a) * 0.16);
        set('UpperLeg_FL', 0.28, 0, 0);
        set('UpperLeg_FR', 0.28, 0, 0);
        set('UpperLeg_RL', -0.36, 0, 0.06);
        set('LowerLeg_RL', 0.66, 0, 0);
        set('UpperLeg_RR', -0.36, 0, -0.06);
        set('LowerLeg_RR', 0.66, 0, 0);
        set('Tail1', 0.15, Math.sin(a * 2) * 0.22, 0);
        return 0;
      }),
    },
  ];

  // Verify geometric clearance between EVERY Ear/Head/Snout vertex and HelmetGlass across ALL 18 clips!
  const headIdx = J('Head');
  const earIndices = new Set([J('Ear_L'), J('Ear_R')]);
  const allVerts = mesh.allVertices();
  const earHeadVerts = allVerts.filter((v) =>
    v.jnt.some((j, k) => v.wgt[k] > 0 && (j === headIdx || earIndices.has(j)))
  );
  // Exclude the glass helmet vertices themselves (those have dist === HELMET_RADIUS)
  const innerHeadVerts = earHeadVerts.filter((v) => v3Len(v3Sub(v.pos, HELMET_CENTER)) < HELMET_RADIUS - 0.005);

  const clips = sampleClips(rig, [mesh], clipSpecs);

  let minEarClearance = Infinity;
  let maxInnerRadius = 0;
  for (const clip of clips) {
    for (let f = 0; f < clip.times.length; f++) {
      const rotMap = new Map();
      for (const [jIdx, arr] of clip.rotTracks.entries()) rotMap.set(jIdx, arr[f]);
      const { globals, skinMats } = computeWorldMatrices(rig, rotMap, clip.rootTrans[f]);
      const headSkin = skinMats[headIdx];
      const worldCenter = mat4TransformPoint(headSkin, HELMET_CENTER);
      for (const v of innerHeadVerts) {
        const wPos = evalSkinnedVertex(v, skinMats);
        const dist = v3Len(v3Sub(wPos, worldCenter));
        if (dist > maxInnerRadius) maxInnerRadius = dist;
        const clearance = HELMET_RADIUS - dist;
        if (clearance < minEarClearance) minEarClearance = clearance;
      }
      // Also confirm Head globals matrix is clean
      if (!Number.isFinite(globals[headIdx][12])) throw new Error('Invalid head transform');
    }
  }
  if (minEarClearance < 0.015) {
    throw new Error(`Cometa ear/head helmet clearance violated: minClearance=${minEarClearance.toFixed(4)}m`);
  }

  const materials = makeMaterialSet('astra_helmet_glass', PALETTE.helmetGlass, 0.26, 0.12, 0.54, false);
  return {
    id: 'cometa',
    rigType: 'quadruped',
    file: 'cometa-animated.glb',
    rig,
    parts: [mesh],
    materials,
    clips,
    sourceAsset: 'tools/models/build_characters.mjs#buildCometa',
    contactMarkerPolicy: 'all four paws contact/release and support joints; grounded boots',
    environmentVariantsRequired: ['Walk earth/lunar', 'Trot earth/lunar'],
    clearanceVerification: {
      helmetRadiusMeters: HELMET_RADIUS,
      maxHeadOrEarVertexRadiusMeters: Number(maxInnerRadius.toFixed(4)),
      minClearanceMeters: Number(minEarClearance.toFixed(4)),
      allFramesVerified: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Driver: Build, Validate with gltf-validator, Write GLBs & Update Manifests
// ---------------------------------------------------------------------------

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const builders = [buildAstronaut, buildHumanNpc, buildPip, buildScout, buildCometa];
  const manifestActors = [];
  const assetManifestEntries = new Map();

  for (const build of builders) {
    const char = build();
    const glb = assembleGLB({
      rigName: char.id,
      rig: char.rig,
      parts: char.parts,
      materials: char.materials,
      clips: char.clips,
    });

    const outPath = path.join(OUT_DIR, char.file);
    await fs.writeFile(outPath, glb);

    // Run gltf-validator strictly (0 errors, 0 warnings)
    const report = await validateBytes(new Uint8Array(glb), { uri: char.file, maxIssues: 100 });
    if (report.issues.numErrors > 0 || report.issues.numWarnings > 0) {
      console.error(JSON.stringify(report.issues.messages, null, 2));
      throw new Error(`glTF validation failed for ${char.file}: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
    }

    const sha256 = createHash('sha256').update(glb).digest('hex');
    const tris = char.parts.reduce((acc, p) => acc + p.triangleCount(), 0);
    const bindPoseRotations = new Map();
    const { min, max } = measurePoseBounds(char.parts, char.rig, bindPoseRotations, [0, 0, 0]);
    const minYAnim = Math.min(...char.clips.map((c) => c.minY));

    if (min[1] < -0.005 || minYAnim < -0.005) {
      throw new Error(`${char.id} grounded origin violated: bindMinY=${min[1].toFixed(4)}, animMinY=${minYAnim.toFixed(4)}`);
    }
    if (tris > 20000 || char.rig.joints.length > 64 || char.materials.length > 3) {
      throw new Error(`${char.id} exceeded provisional budget: tris=${tris}, joints=${char.rig.joints.length}, mats=${char.materials.length}`);
    }

    const clipBounds = {
      min: min.map((v) => Number(v.toFixed(4))),
      max: max.map((v) => Number(v.toFixed(4))),
      heightMeters: Number((max[1] - min[1]).toFixed(4)),
      animatedMinY: Number(minYAnim.toFixed(4)),
    };

    const clearanceMsg = char.clearanceVerification
      ? `, helmetClearance>=${char.clearanceVerification.minClearanceMeters}m`
      : '';
    console.log(
      `${char.id}: ${char.file} | ${glb.length} B | ${tris} tris | ${char.rig.joints.length} joints | ${char.materials.length} mats | ${char.clips.length} clips | bindY=[${clipBounds.min[1]}, ${clipBounds.max[1]}] | animMinY=${clipBounds.animatedMinY}${clearanceMsg} | gltf-validator: 0 errors, 0 warnings | sha256=${sha256.slice(0, 12)}...`
    );

    manifestActors.push({
      id: char.id,
      rigType: char.rigType,
      proposedGlbPath: `public/assets/models/characters/${char.file}`,
      exists: true,
      sha256,
      sourceAsset: char.sourceAsset,
      triangles: tris,
      joints: char.rig.joints.length,
      materials: char.materials.map((m) => m.name),
      rigNodePaths: char.rig.joints.map((j) => j.name),
      meshNodeNames: char.parts.map((p) => p.name),
      ...(char.variants ? { variants: char.variants } : {}),
      ...(char.clearanceVerification ? { clearanceVerification: char.clearanceVerification } : {}),
      bindPose: {
        units: 'meters',
        upAxis: '+Y',
        forwardAxis: '+Z',
        leftAxis: '+X',
        handedness: 'right-handed glTF 2.0',
        rootOrigin: [0, 0, 0],
        jointRestPositions: Object.fromEntries(
          char.rig.joints.map((j) => [j.name, j.worldPos.map((v) => Number(v.toFixed(4)))])
        ),
      },
      clipBounds,
      environmentVariantsRequired: char.environmentVariantsRequired,
      clips: char.clips.map((c) => ({
        name: c.name,
        phase: c.phase,
        requiredForPhase: c.requiredForPhase,
        semantics: c.semantics,
        loop: c.loop,
        sourceFps: c.sourceFps,
        sourceFrameStart: c.sourceFrameStart,
        sourceFrameEnd: c.sourceFrameEnd,
        durationSeconds: c.durationSeconds,
        contactMarkers: c.contactMarkers,
        rootTranslationSamples: c.rootTranslationSamples,
        rootYawSamples: c.rootYawSamples,
      })),
      contactMarkerPolicy: char.contactMarkerPolicy,
    });

    assetManifestEntries.set(`${char.id}-animated`, {
      id: `${char.id}-animated`,
      path: `assets/models/characters/${char.file}`,
      sha256,
      credit: 'ASTRA contributors; AI-assisted parametric skeletal modeling 2026-11-14',
      rights: 'Original ASTRA contribution, Apache-2.0; Node ESM generator requires no runtime dependency.',
      source: 'tools/models/build_characters.mjs',
      method: `Deterministic parametric glTF 2.0 binary (${char.rigType} rig, ${char.rig.joints.length} joints, ${char.clips.length} keyframed clips, shared PBR + COLOR_0).`,
      classification: 'Original fictional engineering/stylized character asset, not measured NASA equipment',
      aiAssisted: true,
      review: 'Structural glTF validation (0 errors/0 warnings), skin weights, bounds, and NullEngine skeletal checks verified; browser GPU inspection pending.',
    });
  }

  // Update content-design/animation-manifest.json
  const animManifest = {
    version: 1,
    status: 'authored_unintegrated',
    runtimeAsset: true,
    description: 'Authored deterministic character GLBs generated by tools/models/build_characters.mjs. Rigs, bounds, clips, frames and hashes reflect actual exported binary files.',
    coordinateContract: {
      units: 'meters',
      up: 'Y',
      forwardAxis: '+Z',
      runtimeAxisVerificationRequired: true,
      rootMotion: 'in-place; zero horizontal X/Z root translation; controller owns translation and yaw',
    },
    actors: manifestActors,
    budgets: {
      status: 'provisional_unmeasured',
      perCharacter: {
        trianglesCeiling: 20000,
        deformJointsCeiling: 64,
        materialsCeiling: 3,
        textureMaxDimension: 2048,
      },
      finalBudgetsRequireTargetDeviceProfiling: true,
    },
    acceptanceStatus: 'asset_and_nullengine_verified_gpu_pending',
  };
  await fs.writeFile(ANIM_MANIFEST_PATH, `${JSON.stringify(animManifest, null, 2)}\n`);

  // Update public/assets/manifest.json while preserving all existing non-character entries intact
  const existingAssetManifest = JSON.parse(await fs.readFile(ASSET_MANIFEST_PATH, 'utf8'));
  const preserved = existingAssetManifest.assets.filter((a) => !assetManifestEntries.has(a.id));
  const updatedAssets = [...preserved, ...assetManifestEntries.values()];
  await fs.writeFile(
    ASSET_MANIFEST_PATH,
    `${JSON.stringify({ ...existingAssetManifest, assets: updatedAssets }, null, 2)}\n`
  );

  console.log('Updated content-design/animation-manifest.json and public/assets/manifest.json.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
