// The fire area on the stacked building (scenario.ts): the cells of the estimated plan the dispatch side names, as a
// red block the height of the floor, so the assembled tower shows a red band at the fire's end of floor 22 and the
// fan shows it on the plate. The origin cell burns brightest, the spread cells less. Tap it to open the floor's rooms
// framed on the fire. Hidden while that floor's rooms are open: Rooms.tsx draws the fire on the plan instead.
import { Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { FireArea } from './archPlan.ts'
import { reduce } from './explode'
import { useStore } from './store'
import './rooms.css'

export const FIRE = '#ff2d1a'
const PROUD = 0.25 // m above the slab top, so a tap from above hits the fire before the floor
const OUT = 1.012 // outset about the fire's centre, so the band reads over the facade

export function FireZone({ fire, floor, height, side }: { fire: FireArea; floor: number; height: number; side: string }) {
  const hidden = useStore((s) => s.target === floor && s.rooms !== 'off')
  const goToFire = useStore((s) => s.goToFire)
  const res = useMemo(() => {
    const cells = fire.cells.map((c) => {
      const shape = new THREE.Shape(c.poly.map(([x, y]) => new THREE.Vector2(x, y)))
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height + PROUD, bevelEnabled: false })
      return {
        heat: c.heat,
        geo,
        edges: new THREE.EdgesGeometry(geo, 15),
        body: new THREE.MeshBasicMaterial({ color: FIRE, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
        line: new THREE.LineBasicMaterial({ color: '#ffb199', transparent: true, toneMapped: false }),
      }
    })
    return { cells }
  }, [fire, height])
  useEffect(() => () => res.cells.forEach((c) => [c.geo, c.edges, c.body, c.line].forEach((x) => x.dispose())), [res])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // flicker: two incommensurate sines, so it never reads as a metronome
    const k = reduce ? 0.6 : 0.6 + 0.25 * Math.sin(t * 5.3) + 0.15 * Math.sin(t * 8.9 + 1.3)
    for (const c of res.cells) {
      c.body.opacity = c.heat * (0.45 + 0.4 * k)
      c.line.opacity = c.heat * (0.6 + 0.4 * k)
    }
  })

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return // the end of a camera drag, not a tap
    e.stopPropagation()
    goToFire()
  }
  const hover = (on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = on ? 'pointer' : ''
  }
  useEffect(() => void (hidden && (document.body.style.cursor = '')), [hidden]) // unmounted under the pointer
  if (hidden) return null
  const [cx, cy] = fire.c
  return (
    <group>
      <group position={[cx * (1 - OUT), 0, -cy * (1 - OUT)]} scale={[OUT, 1, OUT]}>
        {res.cells.map((c, i) => (
          <mesh key={i} geometry={c.geo} material={c.body} rotation-x={-Math.PI / 2} renderOrder={2} onClick={tap} onPointerOver={hover(true)} onPointerOut={hover(false)}>
            <lineSegments geometry={c.edges} material={c.line} />
          </mesh>
        ))}
      </group>
      <pointLight position={[cx, height + 2, -cy]} color={FIRE} intensity={reduce ? 60 : 90} distance={40} decay={1.6} />
      <Html center position={[cx, height + PROUD + 3, -cy]} zIndexRange={[7, 0]}>
        <button className="fire-tag" onClick={() => goToFire()} aria-label={`Fire area, floor ${floor}, ${side}. Open the floor plan at the fire`}>
          <i aria-hidden />FIRE · {side.toUpperCase()}<small>simulated</small>
        </button>
      </Html>
    </group>
  )
}
