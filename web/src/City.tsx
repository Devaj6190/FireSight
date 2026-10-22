// City context: every DataSF LiDAR footprint, OSM street and park around the hero, drawn flat like a street map.
// Context only: nothing here is clickable or pinned. On explode the city sinks to its footprints so the floor fan
// reads over it, and rises again on collapse. Wall colours and windows are a shader pattern (no facade data), not records.
import { Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import sansBold from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff?url'
import { reduce } from './explode'
import { useStore } from './store'
import { fs } from './tokens'
import { areaGeometry, cityGeometry, cityMaterial, streetGeometry, streetLabels, type Context } from './cityMesh'

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

  const u = useMemo(() => ({ lift: { value: 1 }, dim: { value: 1 } }), [])
  const mesh = useMemo(() => {
    if (!ctx) return null
    // map colours exact (no tone mapping) and see-through enough that B1 shows below grade when exploded
    const flat = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false })
    return {
      city: cityGeometry(ctx.buildings), sidewalks: streetGeometry(ctx.streets, 2.5), streets: streetGeometry(ctx.streets),
      parks: areaGeometry(ctx.parks ?? []), labels: streetLabels(ctx.streets),
      cityMat: cityMaterial(u.lift, u.dim),
      ground: flat(fs.land), park: flat(fs.park), sidewalk: flat(fs.sidewalk), street: flat(fs.street),
    }
  }, [ctx, u])
  useEffect(() => () => void (mesh && Object.values(mesh).forEach((v) => (v as { dispose?: () => void }).dispose?.())), [mesh])

  // sink while the floors fan out over it; rise back on collapse
  useEffect(() => {
    const down = phase === 'exploding' || phase === 'exploded'
    const tw = gsap.to(u.lift, { value: down ? FLAT : 1, duration: reduce ? 0.001 : down ? 1.2 : 1.4, ease: 'power3.inOut', delay: down ? 0 : 0.2 })
    const tg = gsap.to(u.dim, { value: down ? 0.25 : 1, duration: reduce ? 0.001 : 0.9, ease: 'sine.inOut' })
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
    for (const m of [mesh.ground, mesh.park, mesh.sidewalk, mesh.street]) m.opacity = 0.5 + 0.5 * u.dim.value
  })

  if (!ctx || !mesh) return null
  const r = ctx.radiusM * 1.25
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.04} material={mesh.ground} raycast={noRaycast} renderOrder={-4}>
        <circleGeometry args={[r, 96]} />
      </mesh>
      <mesh geometry={mesh.parks} material={mesh.park} position-y={-0.03} raycast={noRaycast} renderOrder={-3} />
      <mesh geometry={mesh.sidewalks} material={mesh.sidewalk} position-y={-0.02} raycast={noRaycast} renderOrder={-2} />
      <mesh geometry={mesh.streets} material={mesh.street} position-y={-0.01} raycast={noRaycast} renderOrder={-1} />
      <mesh geometry={mesh.city} material={mesh.cityMat} raycast={noRaycast} />
      {mesh.labels.map((l) => (
        <group key={l.name} position={[l.x, 0.05, -l.y]} rotation-y={l.a}>
          <Text font={sansBold} fontSize={5} letterSpacing={0.12} color={fs.cityLabel} fillOpacity={0.9} rotation-x={-Math.PI / 2} anchorX="center" anchorY="middle" raycast={noRaycast}>
            {l.name}
          </Text>
        </group>
      ))}
    </group>
  )
}
