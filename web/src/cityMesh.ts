// City context geometry and shaders: the city as one indexed mesh, streets as flat quads, and the window patterns.
import * as THREE from 'three'
import { fs } from './tokens.ts'

export type Context = {
  id: string
  radiusM: number
  buildings: number[][] // [heightDm, x0, y0, x1, y1, ...] outer ring, CCW, local decimetres
  streets: { w: number; n?: string; p: number[] }[]
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

// each segment is a quad, stretched half a width past both ends so corners close
export function streetGeometry(streets: Context['streets']) {
  const pos: number[] = [], idx: number[] = []
  for (const s of streets) {
    const h = s.w / 2
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
const shared = { uGlass: { value: new THREE.Color(fs.glass) }, uWarm: { value: new THREE.Color(fs.windowWarm) }, uCool: { value: new THREE.Color(fs.windowCool) } }

// neighbours: a window grid on every wall (3.6 m floors, 3.2 m bays), a few lit, darker toward the street
export function cityMaterial(lift: { value: number }, glow: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ color: fs.city, roughness: 0.85, metalness: 0.05 })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared, { uLift: lift, uGlow: glow })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSeed; attribute float aTop; uniform float uLift;\nvarying vec3 vCP; varying vec3 vCN; varying float vSeed; varying float vTop;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCP = position; vCN = normal; vSeed = aSeed; vTop = aTop; transformed.y *= uLift;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGlass; uniform vec3 uWarm; uniform vec3 uCool; uniform float uGlow;\nvarying vec3 vCP; varying vec3 vCN; varying float vSeed; varying float vTop;\n' + HASH)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 cn = normalize(vCN);
        float wall = 1.0 - step(0.5, abs(cn.y));
        vec2 cell = vec2((abs(cn.x) > abs(cn.z) ? vCP.z : vCP.x) / 3.2, vCP.y / 3.6);
        vec2 f = fract(cell);
        float win = wall * step(0.2, f.x) * step(f.x, 0.8) * step(0.3, f.y) * step(f.y, 0.78) * step(vCP.y + 1.0, vTop) * step(3.6, vCP.y);
        float r = fsHash(floor(cell) + vSeed * 97.0);
        diffuseColor.rgb *= 0.65 + 0.35 * clamp(vCP.y / 30.0, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uGlass, win * 0.8);
        totalEmissiveRadiance += win * step(0.8, r) * mix(uWarm, uCool, step(0.94, r)) * (0.35 + 0.4 * fract(r * 13.0)) * uGlow;`)
  }
  m.customProgramCacheKey = () => 'fs-city'
  return m
}

// the hero's walls: terracotta piers every 1.9 m between dark glass, one window band per slab (one slab = one floor).
// Object space: shape x, y in plan, z = extrusion up. Pattern only: no public record has the facade layout.
export function facade(m: THREE.MeshStandardMaterial, floor: number, depth: number) {
  m.color.set(fs.facade)
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared, { uFloor: { value: floor }, uDepth: { value: depth } })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCP; varying vec3 vCN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCP = position; vCN = normal;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGlass; uniform vec3 uWarm; uniform float uFloor; uniform float uDepth;\nvarying vec3 vCP; varying vec3 vCN;\n' + HASH)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 cn = normalize(vCN);
        float u = (abs(cn.x) > abs(cn.y) ? vCP.y : vCP.x) / 1.9;
        float v = vCP.z / uDepth;
        float win = step(0.42, fract(u)) * step(0.2, v) * step(v, 0.8);
        float r = fsHash(vec2(floor(u), uFloor));
        diffuseColor.rgb = mix(diffuseColor.rgb, uGlass * 1.8, win);
        totalEmissiveRadiance += (1.0 - win) * diffuseColor.rgb * 0.16; // floodlit terracotta
        totalEmissiveRadiance += win * step(0.86, r) * uWarm * 0.45;`)
  }
  m.customProgramCacheKey = () => 'fs-facade'
}

