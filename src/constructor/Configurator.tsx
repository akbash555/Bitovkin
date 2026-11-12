import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ArrowDownRight, Box, Check, DoorOpen, Download, Maximize2, RotateCcw, Save, Square, Trash2, View, Warehouse } from 'lucide-react'
import type { CatalogId, Config, ModelId, OpeningKind, ViewMode, Wall } from './model'
import { availableOpeningPosition, canPlaceOpening, canPlacePartition, canResize, createConfig, formatDimension, limits, loadConfig, modelNames, saveConfig, snap } from './model'

const Scene = lazy(() => import('./Scene'))
type Selection = { kind: 'opening' | 'partition'; id: string } | null
const wallLabels: Record<Wall, string> = { front: 'Передняя', back: 'Задняя', left: 'Левая', right: 'Правая' }

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('3D-сцена недоступна', error, info) }
  render() { return this.state.failed ? <SceneFallback message="Не удалось запустить 3D-сцену на этом устройстве." /> : this.props.children }
}

function SceneFallback({ message }: { message: string }) {
  return <div className="scene-fallback"><img src={`${import.meta.env.BASE_URL}images/modular-cabin.jpg`} alt="Иллюстрация модульной конструкции" /><div><strong>3D-просмотр недоступен</strong><span>{message} Параметры справа остаются доступными.</span></div></div>
}

function hasWebGL() {
  try { const canvas = document.createElement('canvas'); return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')) } catch { return false }
}

const freshId = () => Math.random().toString(36).slice(2, 11)

export default function Configurator({ preset }: { preset: { id: CatalogId; token: number } }) {
  const [config, setConfig] = useState<Config>(() => createConfig())
  const [view, setView] = useState<ViewMode>('exterior')
  const [selected, setSelected] = useState<Selection>(null)
  const [status, setStatus] = useState('Изменения доступны для сохранения в этом браузере.')
  const [sceneReady, setSceneReady] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const webgl = useMemo(hasWebGL, [])
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setSceneReady(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setSceneReady(true); observer.disconnect() }
    }, { rootMargin: '250px' })
    if (stageRef.current) observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (preset.token) { setConfig(createConfig(preset.id)); setSelected(null); setView('exterior'); setStatus('Базовая конфигурация загружена.') } }, [preset])
  const selectedOpening = selected?.kind === 'opening' ? config.openings.find(o => o.id === selected.id) : null
  const selectedPartition = selected?.kind === 'partition' ? config.partitions.find(p => p.id === selected.id) : null

  const changeDimension = (key: 'length' | 'width' | 'height', raw: number) => {
    if (!Number.isFinite(raw)) return
    const value = Math.min(limits[key][1], Math.max(limits[key][0], raw))
    const next = { ...config, [key]: value }
    if (!canResize(next)) { setStatus('Размер конфликтует с расположением проёмов. Сначала переместите их.'); return }
    setConfig(next); setStatus('Габариты обновлены.')
  }
  const addOpening = (kind: OpeningKind) => {
    for (const wall of ['front', 'back', 'left', 'right'] as Wall[]) {
      const position = availableOpeningPosition(config, kind, wall)
      if (position !== null) {
        const id = freshId()
        setConfig({ ...config, openings: [...config.openings, { id, kind, wall, position }] })
        setSelected({ kind: 'opening', id }); setStatus('Элемент добавлен. Перетащите его в 3D-сцене или настройте ниже.'); return
      }
    }
    setStatus('Свободного места для нового проёма нет.')
  }
  const addPartition = () => {
    const position = [0.5, 0.85, 0.15, 0.4, 0.6, 0.75, 0.25].find(p => canPlacePartition(config, { id: 'new', axis: 'x', position: p }))
    if (position === undefined) { setStatus('Для новой перегородки нет свободного места.'); return }
    const id = freshId()
    setConfig({ ...config, partitions: [...config.partitions, { id, axis: 'x', position }] })
    setSelected({ kind: 'partition', id }); setView('top'); setStatus('Перегородка добавлена. Перемещайте её в виде сверху.')
  }
  const updateOpening = (changes: Partial<typeof selectedOpening>) => {
    if (!selectedOpening) return
    const next = { ...selectedOpening, ...changes }
    if (!canPlaceOpening(config, next)) { setStatus('Это положение занято или слишком близко к краю стены.'); return }
    setConfig({ ...config, openings: config.openings.map(o => o.id === next.id ? next : o) }); setStatus('Проём обновлён.')
  }
  const updatePartition = (changes: Partial<typeof selectedPartition>) => {
    if (!selectedPartition) return
    const next = { ...selectedPartition, ...changes }
    if (!canPlacePartition(config, next)) { setStatus('Перегородка пересекается с проёмом, другой перегородкой или краем.'); return }
    setConfig({ ...config, partitions: config.partitions.map(p => p.id === next.id ? next : p) }); setStatus('Перегородка обновлена.')
  }
  const toggleModule = (kind: 'side' | 'top') => {
    if (kind === 'top' && config.model !== 'container') { setStatus('Верхний модуль доступен для блок-контейнера.'); return }
    setConfig({ ...config, modules: config.modules.includes(kind) ? config.modules.filter(m => m !== kind) : [...config.modules, kind] })
    setStatus(config.modules.includes(kind) ? 'Модуль удалён.' : 'Модуль добавлен. Размещение носит предварительный характер.')
  }
  const removeSelected = () => {
    if (!selected) return
    setConfig({ ...config, openings: config.openings.filter(o => o.id !== selected.id), partitions: config.partitions.filter(p => p.id !== selected.id) })
    setSelected(null); setStatus('Элемент удалён.')
  }
  return <section className="section constructor-section" id="constructor" aria-labelledby="constructor-title">
    <div className="wrap">
      <div className="section-top constructor-top"><div><span className="eyebrow"><span className="red-line" /> Онлайн-конструктор</span><h2 id="constructor-title">Создайте конструкцию<br /><em>под свои задачи</em></h2></div><p>Меняйте размеры и планировку прямо на 3D-модели. Сохраните вариант, чтобы вернуться к нему позже.</p></div>
      <div className="constructor-shell">
        <div className="scene-column">
          <div className="scene-toolbar"><div className="scene-live"><span className="live-dot" /> ИНТЕРАКТИВНАЯ МОДЕЛЬ</div><div className="scene-meta">{modelNames[config.model]} <span>·</span> {formatDimension(config.length)} × {formatDimension(config.width)} × {formatDimension(config.height)} м</div></div>
          <div className="scene-stage" ref={stageRef} aria-label="Интерактивная 3D-модель конструкции">
            {webgl ? sceneReady ? <SceneBoundary><Suspense fallback={<div className="scene-loading">Загружаем 3D-модель…</div>}><Scene config={config} view={view} selected={selected} onSelect={setSelected} onChange={setConfig} /></Suspense></SceneBoundary> : <div className="scene-loading">3D-модель загрузится при прокрутке</div> : <SceneFallback message="Браузер не поддерживает WebGL." />}
            <div className="scene-dimensions">Д {formatDimension(config.length)} м <span>×</span> Ш {formatDimension(config.width)} м <span>×</span> В {formatDimension(config.height)} м</div>
            <div className="scene-hint">Перетаскивайте элементы · Вращайте модель · Колесо — масштаб</div>
          </div>
          <div className="scene-controls" aria-label="Режим просмотра">
            {([['exterior', View, 'Внешний вид'], ['top', Square, 'Вид сверху'], ['interior', Warehouse, 'Интерьер']] as const).map(([mode, Icon, label]) => <button key={mode} type="button" className={view === mode ? 'view-button is-active' : 'view-button'} onClick={() => setView(mode)} aria-pressed={view === mode}><Icon size={17} />{label}</button>)}
            <span className="scene-control-note"><Maximize2 size={15} /> 3D-просмотр</span>
          </div>
          <p className="technical-note">Схема для предварительного выбора конфигурации. Возможность изготовления, устойчивость и безопасность составной конструкции проверяет специалист.</p>
        </div>
        <div className="config-panel">
          <div className="panel-heading"><span>ПАРАМЕТРЫ КОНСТРУКЦИИ</span><span className="panel-step">01 / 03</span></div>
          <div className="panel-block"><h3>Базовая модель</h3><div className="model-options">{(Object.keys(modelNames) as ModelId[]).map(id => <button type="button" key={id} className={config.model === id ? 'model-option active' : 'model-option'} onClick={() => { setConfig(createConfig(id)); setSelected(null); setStatus('Базовая модель обновлена.') }} aria-pressed={config.model === id}><Box size={17} />{modelNames[id]}{config.model === id && <Check size={15} className="option-check" />}</button>)}</div></div>
          <div className="panel-block"><h3>Габариты <small>в метрах</small></h3><div className="dimension-fields">{([['length', 'Длина'], ['width', 'Ширина'], ['height', 'Высота']] as const).map(([key, label]) => <label key={key}>{label}<input type="number" inputMode="decimal" step="0.1" min={limits[key][0]} max={limits[key][1]} value={config[key]} onChange={e => changeDimension(key, Number(e.target.value))} /><span>{limits[key][0]}–{limits[key][1]} м</span></label>)}</div></div>
          <div className="panel-block"><h3>Проёмы и планировка</h3><div className="add-grid"><button type="button" onClick={() => addOpening('window')}><Square size={17} /> Добавить окно</button><button type="button" onClick={() => addOpening('door')}><DoorOpen size={17} /> Добавить дверь</button><button type="button" onClick={addPartition}><ArrowDownRight size={17} /> Перегородка</button></div>
            {selectedOpening && <div className="selected-editor"><div className="selected-title"><strong>{selectedOpening.kind === 'window' ? 'Окно' : 'Дверь'} выбрано</strong><button type="button" onClick={removeSelected} aria-label="Удалить выбранный элемент"><Trash2 size={17} /></button></div><label>Стена<select value={selectedOpening.wall} onChange={e => updateOpening({ wall: e.target.value as Wall })}>{(Object.keys(wallLabels) as Wall[]).map(w => <option value={w} key={w}>{wallLabels[w]}</option>)}</select></label><label>Положение по стене: {Math.round(selectedOpening.position * 100)}%<input type="range" min="0.05" max="0.95" step="0.05" value={selectedOpening.position} onChange={e => updateOpening({ position: snap(Number(e.target.value)) })} /></label></div>}
            {selectedPartition && <div className="selected-editor"><div className="selected-title"><strong>Перегородка выбрана</strong><button type="button" onClick={removeSelected} aria-label="Удалить выбранный элемент"><Trash2 size={17} /></button></div><label>Направление<select value={selectedPartition.axis} onChange={e => updatePartition({ axis: e.target.value as 'x' | 'z' })}><option value="x">Поперёк длины</option><option value="z">Поперёк ширины</option></select></label><label>Положение: {Math.round(selectedPartition.position * 100)}%<input type="range" min="0.15" max="0.85" step="0.05" value={selectedPartition.position} onChange={e => updatePartition({ position: snap(Number(e.target.value)) })} /></label></div>}
            {!selected && <p className="panel-help">Нажмите на проём или перегородку в сцене, чтобы изменить положение. На телефоне используйте касание или ползунок.</p>}
          </div>
          <div className="panel-block"><h3>Дополнительные модули</h3><div className="module-options"><button type="button" aria-pressed={config.modules.includes('side')} className={config.modules.includes('side') ? 'module-active' : ''} onClick={() => toggleModule('side')}><span>+ Сбоку</span><small>{config.modules.includes('side') ? 'Добавлен · убрать' : 'Добавить'}</small></button><button type="button" disabled={config.model !== 'container'} aria-pressed={config.modules.includes('top')} className={config.modules.includes('top') ? 'module-active' : ''} onClick={() => toggleModule('top')}><span>+ Сверху</span><small>{config.model !== 'container' ? 'Для блок-контейнера' : config.modules.includes('top') ? 'Добавлен · убрать' : 'Добавить'}</small></button></div></div>
          <div className="panel-actions"><button type="button" className="button button-red" onClick={() => { try { saveConfig(config); setStatus('Конфигурация сохранена в этом браузере.') } catch { setStatus('Не удалось сохранить: хранилище браузера недоступно.') } }}><Save size={17} /> Сохранить конфигурацию</button><div><button type="button" onClick={() => { const loaded = loadConfig(); if (loaded) { setConfig(loaded); setSelected(null); setStatus('Сохранённая конфигурация загружена.') } else setStatus('Сохранённая конфигурация не найдена или повреждена.') }}><Download size={16} /> Загрузить</button><button type="button" onClick={() => { setConfig(createConfig()); setSelected(null); setView('exterior'); setStatus('Настройки сброшены.') }}><RotateCcw size={16} /> Сбросить</button></div></div>
          <p className="config-status" role="status">{status}</p>
        </div>
      </div>
    </div>
  </section>
}
