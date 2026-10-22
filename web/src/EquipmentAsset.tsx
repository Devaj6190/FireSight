import { Edges } from '@react-three/drei'
import type { FloorMarker } from './floorMarkers'

type V = [number, number, number]
// These are diagram symbols built as real meshes, not equipment counts or layouts.
// Every asset inherits the floor record's explicitly unverified diagram placement.
function Box({ at, size, color = '#d9ded8', ink = '#53625a' }: { at: V; size: V; color?: string; ink?: string }) {
  return <mesh position={at} renderOrder={10}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.72} transparent />
    <Edges color={ink} threshold={20} renderOrder={11} transparent opacity={0.65} />
  </mesh>
}
function Cylinder({ at, radius, height, color = '#c3ccc6', rotation }: { at: V; radius: number; height: number; color?: string; rotation?: V }) {
  return <mesh position={at} rotation={rotation} renderOrder={10}>
    <cylinderGeometry args={[radius, radius, height, 20]} />
    <meshStandardMaterial color={color} roughness={0.6} transparent />
    <Edges color="#53625a" renderOrder={11} transparent opacity={0.55} />
  </mesh>
}
function Cabinet({ x, server = false }: { x: number; server?: boolean }) {
  return <group position-x={x}>
    <Box at={[0, 1.5, 0]} size={[1.35, 2.8, 1.1]} color={server ? '#53646b' : '#aebdb8'} />
    <Box at={[0, 1.55, .57]} size={[1.12, 2.5, .07]} color={server ? '#283e48' : '#d8e1d8'} />
    <Box at={[.43, 1.5, .65]} size={[.06, .5, .08]} color="#40554a" />
    <Box at={[0, 2.35, .64]} size={[.74, .3, .06]} color="#263e3e" />
    {[0, 1, 2, 3, 4].map(i => <Box key={i} at={[0, .55 + i * .22, .64]} size={[.8, .055, .04]} color="#536b60" />)}
    {!server && <Box at={[-.25, 1.8, .66]} size={[.28, .3, .03]} color="#d69a43" />}
    <Box at={[0, .09, 0]} size={[1.5, .18, 1.25]} color="#667970" />
  </group>
}
function Table({ x, z }: { x: number; z: number }) {
  return <group position={[x, 0, z]}>
    <Box at={[0, 1.05, 0]} size={[2.4, .12, 1.25]} color="#deceb1" />
    {[-.85, .85].flatMap(xx => [-.4, .4].map(zz => <Box key={`${xx}-${zz}`} at={[xx, .51, zz]} size={[.1, .95, .1]} color="#647b6d" />))}
    {[-1, 1].flatMap(side => [-.65, .65].map(xx => <group key={`${side}-${xx}`} position={[xx, 0, side * 1.05]}>
      <Box at={[0, .56, 0]} size={[.55, .12, .55]} color="#839b83" />
      <Box at={[0, .9, side * .22]} size={[.55, .65, .08]} color="#839b83" />
      <Box at={[0, .27, 0]} size={[.09, .5, .09]} />
    </group>))}
  </group>
}
function Pump() {
  return <group>
    <Box at={[0, .16, 0]} size={[3.8, .3, 1.8]} color="#7e9083" />
    <Cylinder at={[-.85, 1, 0]} radius={.65} height={1.5} color="#b4654b" rotation={[0, 0, Math.PI / 2]} />
    <Cylinder at={[.65, .9, 0]} radius={.5} height={1.25} color="#657e88" rotation={[0, 0, Math.PI / 2]} />
    <Cylinder at={[-1.4, 1.9, 0]} radius={.18} height={2.1} color="#aa5d48" />
    <Cylinder at={[-.8, 2.9, 0]} radius={.18} height={1.2} color="#aa5d48" rotation={[0, 0, Math.PI / 2]} />
    <Cylinder at={[-1.4, 2.3, .32]} radius={.36} height={.06} color="#485c50" rotation={[Math.PI / 2, 0, 0]} />
  </group>
}

export function EquipmentAsset({ marker, onSelect }: { marker: FloorMarker; onSelect: () => void }) {
  const text = `${marker.title} ${marker.pin?.detail ?? ''}`
  const cafeteria = /cafeteria|food|restaurant|kitchen/i.test(text)
  const battery = /battery|electrolyte/i.test(text)
  const server = !battery && /server|computer|electrical/i.test(text)
  const pump = /pump/i.test(text)
  const tank = !pump && /tank|fuel|diesel/i.test(text)
  const panel = /alarm|electrical|control|sprinkler|standpipe|riser/i.test(text)
  const accent = marker.kind === 'hazard' ? '#b86d48' : marker.kind === 'system' ? '#548396' : '#708a66'
  return <group renderOrder={10} scale={1.35} onClick={e => { e.stopPropagation(); onSelect() }}>
    <Box at={[0, .025, 0]} size={[cafeteria ? 5.8 : 5.4, .05, cafeteria ? 6.5 : 3.2]} color="#e2e5d9" ink={accent} />
    {battery || server ? <>
      {[-1.65, 0, 1.65].map(x => <Cabinet key={x} x={x} server={server} />)}
      <Box at={[0, 3.02, 0]} size={[4.7, .12, .4]} color={accent} />
    </> : cafeteria ? <>
      <Table x={0} z={-1.6} /><Table x={0} z={1.6} />
      <Box at={[2.3, 1, 0]} size={[.7, 1.9, 5.5]} color="#bec8ba" />
    </> : pump ? <Pump /> : tank ? <>
      <Cylinder at={[0, 1.25, 0]} radius={1.1} height={3.5} color="#c3b797" rotation={[0, 0, Math.PI / 2]} />
      {[-1.2, 1.2].map(x => <Box key={x} at={[x, .35, 0]} size={[.3, .65, 2]} color="#6b7b70" />)}
    </> : panel ? <>
      <Box at={[0, 1.5, 0]} size={[2.5, 2.8, .8]} color="#c7d3cb" />
      <Box at={[0, 1.6, .43]} size={[2.15, 2.4, .05]} color="#e6e9df" />
      <Box at={[0, 2.2, .49]} size={[1.2, .4, .08]} color={accent} />
    </> : <>
      <Box at={[0, .1, 0]} size={[1.5, .2, 1.5]} color={accent} />
      <Cylinder at={[0, .9, 0]} radius={.08} height={1.6} />
      <mesh position={[0, 2.3, 0]} rotation-x={Math.PI / 2} renderOrder={10}>
        <cylinderGeometry args={[1, 1, .12, 3]} />
        <meshBasicMaterial color="#d8a456" transparent />
        <Edges color="#735439" transparent renderOrder={11} />
      </mesh>
      <Box at={[0, 2.35, .1]} size={[.12, .55, .06]} color="#735439" />
    </>}
  </group>
}
