// City context: every DataSF LiDAR footprint and OSM street within 1.5 km of the hero, drawn as one night-time mesh.
// Context only: nothing here is clickable or pinned. On explode the city sinks to its footprints so the floor fan
// reads over it, and rises again on collapse. Windows are a shader pattern (no facade data exists), not records.
import { Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import sansBold from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff?url'
import { reduce } from './explode'
import { useStore } from './store'
import { fs } from './tokens'
import { cityGeometry, cityMaterial, streetGeometry, streetLabels, type Context } from './cityMesh'

const FLAT = 0.05 // city height when exploded, as a fraction
const noRaycast = () => null

export function City({ id }: { id: string }) {
  const [ctx, setCtx] = useState<Context | null>(null)
  const phase = useStore((s) => s.phase)
  const camera = useThree((s) => s.camera)
  const fog = useThree((s) => s.scene.fog) as THREE.Fog | null
  useEffect(() => {
    const c = new AbortController()
    fetch(`${import.meta.env.BASE_URL}context/${id}.json`, { signal: c.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setCtx)
      .catch(() => {}) // no context cached: the hero stands alone, as before
    return () => c.abort()
  }, [id])

  const u = useMemo(() => ({ lift: { value: 1 }, glow: { value: 1 }, ground: { a: 1 } }), [])
  const mesh = useMemo(() => {
    if (!ctx) return null
    const city = cityGeometry(ctx.buildings), streets = streetGeometry(ctx.streets)
    return {
      city, streets, labels: streetLabels(ctx.streets),
      cityMat: cityMaterial(u.lift, u.glow),
      streetMat: new THREE.MeshBasicMaterial({ color: fs.street, transparent: true, depthWrite: false }),
      groundMat: new THREE.MeshBasicMaterial({ color: fs.ground, transparent: true, depthWrite: false }),
    }
  }, [ctx, u])
  useEffect(() => () => void (mesh && (mesh.city.dispose(), mesh.streets.dispose(), mesh.cityMat.dispose(), mesh.streetMat.dispose(), mesh.groundMat.dispose())), [mesh])

  // sink while the floors fan out over it; rise back on collapse
  useEffect(() => {
    const down = phase === 'exploding' || phase === 'exploded'
    const tw = gsap.to(u.lift, { value: down ? FLAT : 1, duration: reduce ? 0.001 : down ? 1.2 : 1.4, ease: 'power3.inOut', delay: down ? 0 : 0.2 })
    const tg = gsap.to(u.glow, { value: down ? 0.25 : 1, duration: reduce ? 0.001 : 0.9, ease: 'sine.inOut' })
    return () => void (tw.kill(), tg.kill())
  }, [phase, u])

  // fog follows the camera, so the city fades out at its edge from the street and from the sky
  useFrame(() => {
    if (!mesh) return
    if (fog) {
      const d = camera.position.length()
      fog.near = d * 0.9
      fog.far = d + ctx!.radiusM * 0.9
    }
    mesh.streetMat.opacity = 0.35 + 0.65 * u.glow.value
  })

  if (!ctx || !mesh) return null
  const r = ctx.radiusM * 1.25
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03} material={mesh.groundMat} raycast={noRaycast} renderOrder={-2}>
        <circleGeometry args={[r, 96]} />
      </mesh>
      <mesh geometry={mesh.streets} material={mesh.streetMat} position-y={-0.02} raycast={noRaycast} renderOrder={-1} />
      <mesh geometry={mesh.city} material={mesh.cityMat} raycast={noRaycast} />
      {mesh.labels.map((l) => (
        <group key={l.name} position={[l.x, 0.05, -l.y]} rotation-y={l.a}>
          <Text font={sansBold} fontSize={5} letterSpacing={0.12} color={fs.muted} fillOpacity={0.55} rotation-x={-Math.PI / 2} anchorX="center" anchorY="middle" raycast={noRaycast}>
            {l.name}
          </Text>
        </group>
      ))}
    </group>
  )
}
