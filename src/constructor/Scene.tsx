import { Canvas, ThreeEvent, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Plane, Shape, Path, Vector3 } from 'three'
import type { Config, Opening, Partition, ViewMode, Wall } from './model'
import { canPlaceOpening, canPlacePartition, openingSize, snap, wallSpan } from './model'

type Selection = { kind: 'opening' | 'partition'; id: string } | null
type SceneProps = {
  config: Config
  view: ViewMode
  selected: Selection
  onSelect: (selection: Selection) => void
  onChange: (config: Config) => void
}

function setCapture(e: ThreeEvent<PointerEvent>, active: boolean) {
  const target = e.target as EventTarget & { setPointerCapture?: (id: number) => void; releasePointerCapture?: (id: number) => void }
  if (active) target?.setPointerCapture?.(e.pointerId)
  else target?.releasePointerCapture?.(e.pointerId)
}

function CameraRig({ view, config }: { view: ViewMode; config: Config }) {
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    const side = config.modules.includes('side')
    const top = config.modules.includes('top')
    const focusX = side ? config.length * 0.5 : 0
    const focusY = top ? config.height : config.height * 0.46
    const extent = side ? config.length * 2.2 : config.length
    const fit = Math.max(1, 1.2 / (size.width / size.height))
    if (view === 'top') camera.position.set(focusX, Math.max(9, extent * 1.65 * fit), 0.01)
    else if (view === 'interior') camera.position.set(focusX + extent * 0.75 * fit, focusY + config.height * 1.9 * fit, extent * 0.8 * fit)
    else camera.position.set(focusX + extent * 0.94 * fit, focusY + config.height * 2.2 * fit, extent * 1.04 * fit)
    camera.lookAt(focusX, focusY, 0)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, view, config.length, config.width, config.height, config.modules, invalidate])
  return null
}

function wallTransform(c: Config, wall: Wall): { position: [number, number, number]; rotation: [number, number, number] } {
  if (wall === 'front') return { position: [0, 0, c.width / 2], rotation: [0, 0, 0] }
  if (wall === 'back') return { position: [0, 0, -c.width / 2], rotation: [0, Math.PI, 0] }
  if (wall === 'left') return { position: [-c.length / 2, 0, 0], rotation: [0, -Math.PI / 2, 0] }
  return { position: [c.length / 2, 0, 0], rotation: [0, Math.PI / 2, 0] }
}

function wallPlane(c: Config, wall: Wall) {
  const { position } = wallTransform(c, wall)
  return new Plane().setFromNormalAndCoplanarPoint(
    wall === 'front' || wall === 'back' ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0),
    new Vector3(...position),
  )
}

function wallLocalX(wall: Wall, point: Vector3) {
  return wall === 'front' ? point.x : wall === 'back' ? -point.x : wall === 'left' ? point.z : -point.z
}

function wallGeometry(c: Config, wall: Wall, includeOpenings: boolean) {
  const span = wallSpan(c, wall)
  const shape = new Shape()
  shape.moveTo(-span / 2, 0)
  shape.lineTo(span / 2, 0)
  shape.lineTo(span / 2, c.height)
  shape.lineTo(-span / 2, c.height)
  shape.closePath()
  if (includeOpenings) c.openings.filter(o => o.wall === wall).forEach(o => {
    const size = openingSize(o.kind)
    const x = (o.position - 0.5) * span
    const bottom = o.kind === 'door' ? 0.07 : 1.05
    const top = o.kind === 'door' ? Math.min(c.height - 0.28, 2.12) : Math.min(c.height - 0.35, 1.95)
    const hole = new Path()
    hole.moveTo(x - size / 2, bottom)
    hole.lineTo(x - size / 2, top)
    hole.lineTo(x + size / 2, top)
    hole.lineTo(x + size / 2, bottom)
    hole.closePath()
    shape.holes.push(hole)
  })
  return shape
}

function WallPanel({ c, wall, withOpenings, view }: { c: Config; wall: Wall; withOpenings: boolean; view: ViewMode }) {
  const transform = wallTransform(c, wall)
  const shape = useMemo(() => wallGeometry(c, wall, withOpenings), [c, wall, withOpenings])
  if (view === 'interior' && wall === 'front') return null
  const color = c.model === 'cottage' ? '#aa8663' : c.model === 'site' ? '#d8d7cf' : '#b5bdc0'
  return <group {...transform}>
    <mesh>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} roughness={0.86} side={DoubleSide} transparent={view === 'top'} opacity={view === 'top' ? 0.72 : 1} />
    </mesh>
    {c.model === 'container' && Array.from({ length: Math.floor(wallSpan(c, wall) / 0.36) }, (_, i) => {
      const x = -wallSpan(c, wall) / 2 + (i + 1) * 0.36
      return <mesh key={i} position={[x, c.height / 2, 0.012]}><boxGeometry args={[0.012, c.height - 0.1, 0.025]} /><meshStandardMaterial color="#879093" /></mesh>
    })}
  </group>
}

function Frame({ c, view }: { c: Config; view: ViewMode }) {
  const color = c.model === 'cottage' ? '#4d4137' : '#303c42'
  return <group>
    {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`${x}-${z}`} position={[x * c.length / 2, c.height / 2, z * c.width / 2]}>
      <boxGeometry args={[0.09, c.height, 0.09]} /><meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
    </mesh>))}
    {[-1, 1].map(z => <mesh key={`long-${z}`} position={[0, c.height, z * c.width / 2]}><boxGeometry args={[c.length, 0.09, 0.09]} /><meshStandardMaterial color={color} /></mesh>)}
    {[-1, 1].map(x => <mesh key={`end-${x}`} position={[x * c.length / 2, c.height, 0]}><boxGeometry args={[0.09, 0.09, c.width]} /><meshStandardMaterial color={color} /></mesh>)}
    <mesh position={[0, 0.045, 0]} receiveShadow><boxGeometry args={[c.length, 0.09, c.width]} /><meshStandardMaterial color={view === 'interior' || view === 'top' ? '#c8b9a2' : '#55524b'} roughness={0.9} /></mesh>
    {view === 'exterior' && <mesh position={[0, c.height + 0.06, 0]} rotation={[0, 0, c.model === 'cottage' ? -0.035 : 0]} castShadow>
      <boxGeometry args={[c.length + 0.24, 0.11, c.width + 0.22]} />
      <meshStandardMaterial color={c.model === 'cottage' ? '#474e4d' : '#3f484c'} metalness={0.38} roughness={0.56} />
    </mesh>}
  </group>
}

function Building({ c, view, position = [0, 0, 0], main = false, selected, onSelect, onChange }: {
  c: Config; view: ViewMode; position?: [number, number, number]; main?: boolean;
  selected: Selection; onSelect: SceneProps['onSelect']; onChange: SceneProps['onChange'];
}) {
  return <group position={position}>
    <Frame c={c} view={view} />
    {(['front', 'back', 'left', 'right'] as Wall[]).map(wall => <WallPanel key={wall} c={c} wall={wall} withOpenings={main} view={view} />)}
    {main && c.openings.map(item => <OpeningObject key={item.id} item={item} c={c} selected={selected?.id === item.id} onSelect={onSelect} onChange={onChange} />)}
    {main && c.partitions.map(item => <PartitionObject key={item.id} item={item} c={c} selected={selected?.id === item.id} onSelect={onSelect} onChange={onChange} />)}
  </group>
}

function OpeningObject({ item, c, selected, onSelect, onChange }: { item: Opening; c: Config; selected: boolean; onSelect: SceneProps['onSelect']; onChange: SceneProps['onChange'] }) {
  const dragging = useRef(false)
  const transform = wallTransform(c, item.wall)
  const span = wallSpan(c, item.wall)
  const width = openingSize(item.kind)
  const height = item.kind === 'door' ? Math.min(c.height - 0.35, 2.05) : Math.min(c.height - 1.4, 0.85)
  const bottom = item.kind === 'door' ? 0.08 : 1.05
  const centerY = bottom + height / 2
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return
    e.stopPropagation()
    const hit = new Vector3()
    if (!e.ray.intersectPlane(wallPlane(c, item.wall), hit)) return
    const position = snap(wallLocalX(item.wall, hit) / span + 0.5)
    const next = { ...item, position }
    if (canPlaceOpening(c, next)) onChange({ ...c, openings: c.openings.map(o => o.id === item.id ? next : o) })
  }
  return <group {...transform}>
    <group position={[(item.position - 0.5) * span, centerY, 0.045]}
      onPointerDown={e => { e.stopPropagation(); dragging.current = true; onSelect({ kind: 'opening', id: item.id }); setCapture(e, true) }}
      onPointerMove={move}
      onPointerUp={e => { e.stopPropagation(); dragging.current = false; setCapture(e, false) }}
      onPointerCancel={() => { dragging.current = false }}>
      <mesh castShadow><boxGeometry args={[width, height, 0.065]} /><meshStandardMaterial color={item.kind === 'door' ? '#5e6b6d' : '#618391'} metalness={item.kind === 'window' ? 0.48 : 0.15} roughness={0.35} transparent opacity={item.kind === 'window' ? 0.7 : 1} /></mesh>
      <mesh position={[0, 0, 0.052]}><boxGeometry args={[width + 0.09, height + 0.09, 0.045]} /><meshStandardMaterial color={selected ? '#f7192c' : '#303b3e'} wireframe /></mesh>
      {item.kind === 'window' && <mesh position={[0, 0, 0.08]}><boxGeometry args={[0.035, height, 0.04]} /><meshStandardMaterial color="#38494e" /></mesh>}
      {item.kind === 'door' && <mesh position={[width * 0.34, 0, 0.09]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#ece9dd" /></mesh>}
    </group>
  </group>
}

function PartitionObject({ item, c, selected, onSelect, onChange }: { item: Partition; c: Config; selected: boolean; onSelect: SceneProps['onSelect']; onChange: SceneProps['onChange'] }) {
  const dragging = useRef(false)
  const isX = item.axis === 'x'
  const x = isX ? (item.position - 0.5) * c.length : 0
  const z = isX ? 0 : (item.position - 0.5) * c.width
  return <mesh position={[x, c.height * 0.43, z]}
    onPointerDown={e => { e.stopPropagation(); dragging.current = true; onSelect({ kind: 'partition', id: item.id }); setCapture(e, true) }}
    onPointerMove={e => {
      if (!dragging.current) return
      e.stopPropagation()
      const hit = new Vector3()
      if (!e.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -c.height * 0.43), hit)) return
      const position = snap((isX ? hit.x / c.length : hit.z / c.width) + 0.5)
      if (canPlacePartition(c, { ...item, position }))
        onChange({ ...c, partitions: c.partitions.map(p => p.id === item.id ? { ...p, position } : p) })
    }}
    onPointerUp={e => { e.stopPropagation(); dragging.current = false; setCapture(e, false) }}
    onPointerCancel={() => { dragging.current = false }}>
    <boxGeometry args={isX ? [0.06, c.height * 0.85, c.width - 0.18] : [c.length - 0.18, c.height * 0.85, 0.06]} />
    <meshStandardMaterial color={selected ? '#f7192c' : '#d1c7b5'} transparent opacity={selected ? 0.75 : 0.66} side={DoubleSide} />
  </mesh>
}

export default function Scene({ config, view, selected, onSelect, onChange }: SceneProps) {
  return <Canvas shadows dpr={[1, 1.6]} frameloop="demand" camera={{ position: [8, 6, 8], fov: 45, near: 0.1, far: 100 }} onPointerMissed={() => onSelect(null)} gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#e9ecea']} />
    <ambientLight intensity={1.25} />
    <hemisphereLight args={['#ffffff', '#b3b8b6', 1.4]} />
    <directionalLight position={[6, 10, 8]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} />
    <CameraRig view={view} config={config} />
    <Grid position={[0, -0.035, 0]} args={[40, 40]} cellSize={0.5} cellThickness={0.5} cellColor="#c3cac8" sectionSize={2} sectionThickness={0.7} sectionColor="#aeb8b5" fadeDistance={28} infiniteGrid />
    <Building c={config} view={view} main selected={selected} onSelect={onSelect} onChange={onChange} />
    {config.modules.includes('side') && <Building c={config} view={view} position={[config.length + 0.12, 0, 0]} selected={null} onSelect={onSelect} onChange={onChange} />}
    {config.modules.includes('top') && <Building c={config} view={view} position={[0, config.height + 0.11, 0]} selected={null} onSelect={onSelect} onChange={onChange} />}
    <OrbitControls makeDefault enabled={!selected} enableDamping dampingFactor={0.08} minDistance={3} maxDistance={45} maxPolarAngle={view === 'top' ? 0.12 : Math.PI / 2.02} minPolarAngle={view === 'top' ? 0 : 0.18} target={[config.modules.includes('side') ? config.length * 0.5 : 0, config.modules.includes('top') ? config.height : config.height * 0.46, 0]} />
  </Canvas>
}
