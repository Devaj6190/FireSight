// City context geometry and shaders: the city as one indexed mesh, streets and parks as flat quads, flat map-style walls.
import * as THREE from 'three'
import { fs } from './tokens.ts'

export type Context = {
  id: string
  radiusM: number
  buildings: number[][] // [heightDm, x0, y0, x1, y1, ...] outer ring, CCW, local decimetres
  streets: { w: number; n?: string; p: number[] }[]
  parks?: number[][] // [x0, y0, x1, y1, ...] outer ring, local decimetres
}

// shape (x east, y north) -> world (x, up, -y), same as the hero's rotation-x -90 deg
export function cityGeometry(buildings: Context['buildings']) {
  const pos: number[] = [], nrm: number[] = [], seed: number[] = [], top: number[] = [], idx: number[] = []
  buildings.forEach((b, k) => {
    const h = b[0] / 10
    const ring: THREE.Vector2[] = []
    for (let i = 1; i < b.length; i += 2) ring.push(new THREE.Vector2(b[i] / 10, b[i + 1] / 10))
    const s = (k * 0.6180339) % 1
    const vert = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
      pos.push(x, y, z); nrm.push(nx, ny, nz); seed.push(s); top.push(h)
      return pos.length / 3 - 1
    }
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length]
      const dx = c.x - a.x, dy = c.y - a.y, l = Math.hypot(dx, dy) || 1
      const nx = dy / l, nz = dx / l // outward for a CCW ring: (dy, -dx) in shape space, z flips sign in world
      const v0 = vert(a.x, 0, -a.y, nx, 0, nz), v1 = vert(c.x, 0, -c.y, nx, 0, nz)
      const v2 = vert(c.x, h, -c.y, nx, 0, nz), v3 = vert(a.x, h, -a.y, nx, 0, nz)
      idx.push(v0, v1, v2, v0, v2, v3)
    }
    const base = pos.length / 3
    for (const p of ring) vert(p.x, h, -p.y, 0, 1, 0)
    for (const [i, j, l] of THREE.ShapeUtils.triangulateShape(ring, [])) {
      const ccw = THREE.ShapeUtils.area([ring[i], ring[j], ring[l]]) > 0 // roof faces up only if CCW in plan
      idx.push(base + i, base + (ccw ? j : l), base + (ccw ? l : j))
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1))
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

// each segment is a quad, stretched half a width past both ends so corners close; pad widens it (sidewalks)
export function streetGeometry(streets: Context['streets'], pad = 0) {
  const pos: number[] = [], idx: number[] = []
  for (const s of streets) {
    const h = s.w / 2 + pad
    for (let i = 2; i + 1 < s.p.length; i += 2) {
      const ax = s.p[i - 2] / 10, ay = s.p[i - 1] / 10, bx = s.p[i] / 10, by = s.p[i + 1] / 10
      const l = Math.hypot(bx - ax, by - ay)
      if (!l) continue
      const ux = (bx - ax) / l, uy = (by - ay) / l
      const n = pos.length / 3
      for (const [x, y] of [[ax - ux * h - uy * h, ay - uy * h + ux * h], [ax - ux * h + uy * h, ay - uy * h - ux * h],
        [bx + ux * h + uy * h, by + uy * h - ux * h], [bx + ux * h - uy * h, by + uy * h + ux * h]]) pos.push(x, 0, -y)
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

// flat polygons on the ground (parks)
export function areaGeometry(rings: number[][]) {
  const pos: number[] = [], idx: number[] = []
  for (const r of rings) {
    const ring: THREE.Vector2[] = []
    for (let i = 0; i + 1 < r.length; i += 2) ring.push(new THREE.Vector2(r[i] / 10, r[i + 1] / 10))
    if (ring.length < 3) continue
    const base = pos.length / 3
    for (const p of ring) pos.push(p.x, 0, -p.y)
    for (const t of THREE.ShapeUtils.triangulateShape(ring, [])) idx.push(base + t[0], base + t[1], base + t[2])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

// one label per named street near the hero, on its segment closest to the hero, laid flat and reading left to right
export function streetLabels(streets: Context['streets'], within = 320) {
  const best = new Map<string, { d: number; x: number; y: number; a: number }>()
  for (const s of streets) {
    if (!s.n) continue
    for (let i = 2; i + 1 < s.p.length; i += 2) {
      const ax = s.p[i - 2] / 10, ay = s.p[i - 1] / 10, bx = s.p[i] / 10, by = s.p[i + 1] / 10
      if (Math.hypot(bx - ax, by - ay) < 45) continue
      const x = (ax + bx) / 2, y = (ay + by) / 2, d = Math.hypot(x, y)
      let a = Math.atan2(by - ay, bx - ax)
      if (a > Math.PI / 2) a -= Math.PI
      if (a <= -Math.PI / 2) a += Math.PI
      if (d < within && d > 30 && d < (best.get(s.n)?.d ?? Infinity)) best.set(s.n, { d, x, y, a })
    }
  }
  return [...best].map(([name, l]) => ({ name: name.toUpperCase(), ...l }))
}

const HASH = 'float fsHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n'
const color = (c: string) => new THREE.Color(c)

// neighbours, flat map style: each building gets one wall colour from fs.walls, a grid of flat windows
// (3.6 m floors, 3.2 m bays; curtain-wall glass on the glass colour), a storefront band at grade and a plain roof.
// dim fades them toward the land colour once they sink to footprints on explode.
export function cityMaterial(lift: { value: number }, dim: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      uLift: lift, uDim: dim, uPal: { value: fs.walls.map(color) }, uRoof: { value: color(fs.roof) },
      uGlass: { value: color(fs.cityGlass) }, uLand: { value: color(fs.land) },
    })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSeed; attribute float aTop; uniform float uLift;\nvarying vec3 vCP; varying vec3 vCN; varying float vSeed; varying float vTop;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCP = position; vCN = normal; vSeed = aSeed; vTop = aTop; transformed.y *= uLift;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uPal[${fs.walls.length}]; uniform vec3 uRoof; uniform vec3 uGlass; uniform vec3 uLand; uniform float uDim;
varying vec3 vCP; varying vec3 vCN; varying float vSeed; varying float vTop;
` + HASH)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 cn = normalize(vCN);
        float wall = 1.0 - step(0.5, abs(cn.y));
        int k = int(floor(vSeed * ${fs.walls.length}.0));
        vec3 base = uPal[k];
        float curtain = k == 4 ? 1.0 : 0.0;
        vec2 cell = vec2((abs(cn.x) > abs(cn.z) ? vCP.z : vCP.x) / 3.2, vCP.y / 3.6);
        vec2 f = fract(cell);
        float x0 = mix(0.2, 0.04, curtain), y0 = mix(0.3, 0.1, curtain), y1 = mix(0.78, 0.96, curtain);
        float win = step(x0, f.x) * step(f.x, 1.0 - x0) * step(y0, f.y) * step(f.y, y1) * step(3.6, vCP.y) * step(vCP.y + 1.0, vTop);
        float shop = step(0.06, f.x) * step(f.x, 0.94) * step(0.6, vCP.y) * step(vCP.y, 3.0) * step(6.0, vTop);
        float shade = 0.92 + 0.08 * fsHash(floor(cell) + vSeed * 97.0); // a little variety between panes
        vec3 c = mix(base, uGlass * shade, max(win, shop) * 0.9);
        c *= 0.86 + 0.14 * clamp(vCP.y / 12.0, 0.0, 1.0); // soft grounding near the street
        c = mix(mix(uRoof, base, 0.2), c, wall);
        diffuseColor.rgb = mix(uLand, c, 0.35 + 0.65 * uDim);`)
  }
  m.customProgramCacheKey = () => 'fs-city-day'
  return m
}

// the hero's walls: terracotta piers every 1.9 m between glass, one window band per slab (one slab = one floor).
// Object space: shape x, y in plan, z = extrusion up. Pattern only: no public record has the facade layout.
export function facade(m: THREE.MeshStandardMaterial, floor: number, depth: number) {
  m.color.set(fs.facade)
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uGlass: { value: color(fs.heroGlass) }, uFloor: { value: floor }, uDepth: { value: depth } })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCP; varying vec3 vCN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCP = position; vCN = normal;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGlass; uniform float uFloor; uniform float uDepth;\nvarying vec3 vCP; varying vec3 vCN;\n' + HASH)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 cn = normalize(vCN);
        float u = (abs(cn.x) > abs(cn.y) ? vCP.y : vCP.x) / 1.9;
        float v = vCP.z / uDepth;
        float win = step(0.42, fract(u)) * step(0.2, v) * step(v, 0.8);
        float shade = 0.9 + 0.1 * fsHash(vec2(floor(u), uFloor));
        diffuseColor.rgb = mix(diffuseColor.rgb, uGlass * shade, win);`)
  }
  m.customProgramCacheKey = () => 'fs-facade-day'
}
