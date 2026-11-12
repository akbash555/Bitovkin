export type ModelId = 'cottage' | 'site' | 'container'
export type CatalogId = ModelId | 'modular'
export type Wall = 'front' | 'back' | 'left' | 'right'
export type OpeningKind = 'window' | 'door'
export type ViewMode = 'exterior' | 'top' | 'interior'
export type Opening = { id: string; kind: OpeningKind; wall: Wall; position: number }
export type Partition = { id: string; axis: 'x' | 'z'; position: number }
export type ModuleKind = 'side' | 'top'
export type Config = {
  version: 1
  model: ModelId
  length: number
  width: number
  height: number
  openings: Opening[]
  partitions: Partition[]
  modules: ModuleKind[]
}

export const limits = {
  length: [3, 12], width: [2.2, 4], height: [2.35, 3.6],
} as const

export const modelNames: Record<ModelId, string> = {
  cottage: 'Дачная бытовка', site: 'Строительная бытовка', container: 'Блок-контейнер',
}

export function createConfig(id: CatalogId = 'cottage'): Config {
  const model = id === 'modular' ? 'container' : id
  const sizes = {
    cottage: [6, 2.5, 2.55],
    site: [6, 2.5, 2.6],
    container: [6, 2.5, 2.7],
  }[model]
  return {
    version: 1, model, length: sizes[0], width: sizes[1], height: sizes[2],
    openings: [
      { id: 'initial-door', kind: 'door', wall: 'front', position: 0.25 },
      { id: 'initial-window', kind: 'window', wall: 'front', position: 0.7 },
    ],
    partitions: [], modules: id === 'modular' ? ['side'] : [],
  }
}

export function wallSpan(c: Config, wall: Wall) {
  return wall === 'front' || wall === 'back' ? c.length : c.width
}

export function openingSize(kind: OpeningKind) { return kind === 'door' ? 0.86 : 0.9 }

export function canPlaceOpening(c: Config, item: Opening): boolean {
  const span = wallSpan(c, item.wall)
  const half = openingSize(item.kind) / (2 * span)
  if (item.position < half + 0.035 || item.position > 1 - half - 0.035) return false
  if (c.partitions.some(p => {
    const affected = p.axis === 'x' ? item.wall === 'front' || item.wall === 'back' : item.wall === 'left' || item.wall === 'right'
    if (!affected) return false
    const mirrored = item.wall === 'back' || item.wall === 'right'
    const openingPosition = mirrored ? 1 - item.position : item.position
    return Math.abs((p.position - openingPosition) * span) < openingSize(item.kind) / 2 + 0.1
  })) return false
  return !c.openings.some(other => other.id !== item.id && other.wall === item.wall &&
    Math.abs((other.position - item.position) * span) < (openingSize(other.kind) + openingSize(item.kind)) / 2 + 0.22)
}

export function canPlacePartition(c: Config, item: Partition): boolean {
  if (item.position < 0.15 || item.position > 0.85) return false
  if (c.partitions.some(other => other.id !== item.id && other.axis === item.axis && Math.abs(other.position - item.position) < 0.12)) return false
  const span = item.axis === 'x' ? c.length : c.width
  return !c.openings.some(o => {
    const affected = item.axis === 'x' ? o.wall === 'front' || o.wall === 'back' : o.wall === 'left' || o.wall === 'right'
    if (!affected) return false
    const mirrored = o.wall === 'back' || o.wall === 'right'
    const openingPosition = mirrored ? 1 - o.position : o.position
    return Math.abs((item.position - openingPosition) * span) < openingSize(o.kind) / 2 + 0.1
  })
}

export function canResize(c: Config): boolean {
  return c.openings.every(o => canPlaceOpening(c, o)) &&
    c.partitions.every(p => canPlacePartition(c, p))
}

export function snap(position: number) { return Math.round(position * 20) / 20 }
export function formatDimension(value: number) { return Number(value.toFixed(2)).toString().replace('.', ',') }

export function availableOpeningPosition(c: Config, kind: OpeningKind, wall: Wall) {
  for (const p of [0.5, 0.7, 0.3, 0.15, 0.85, 0.4, 0.6]) {
    const item = { id: 'new', kind, wall, position: p }
    if (canPlaceOpening(c, item)) return p
  }
  return null
}

const storageKey = 'bytovkin-config-v1'

export function saveConfig(c: Config) { localStorage.setItem(storageKey, JSON.stringify(c)) }

export function loadConfig(): Config | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const c = JSON.parse(raw) as Config
    const valid = c.version === 1 && ['cottage', 'site', 'container'].includes(c.model) &&
      (Object.keys(limits) as Array<keyof typeof limits>).every(key => Number.isFinite(c[key]) && c[key] >= limits[key][0] && c[key] <= limits[key][1]) &&
      Array.isArray(c.openings) && c.openings.length <= 32 && c.openings.every(o => typeof o.id === 'string' && ['window', 'door'].includes(o.kind) && ['front', 'back', 'left', 'right'].includes(o.wall) && Number.isFinite(o.position)) &&
      Array.isArray(c.partitions) && c.partitions.length <= 12 && c.partitions.every(p => typeof p.id === 'string' && ['x', 'z'].includes(p.axis) && Number.isFinite(p.position) && p.position >= 0.15 && p.position <= 0.85) &&
      Array.isArray(c.modules) && c.modules.length <= 2 && c.modules.every(m => ['side', 'top'].includes(m)) && new Set(c.modules).size === c.modules.length &&
      (!c.modules.includes('top') || c.model === 'container') && canResize(c)
    if (valid) return c
  } catch { /* damaged or unavailable browser storage */ }
  return null
}
