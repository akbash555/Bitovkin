import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {choices,defaults,dimensions,meters,options,restore,summary,type Config,type Model} from './config';
import type {mountScene} from './scene';

function Viewer({model,config,featured=false}: {model:Model;config:Config;featured?:boolean}) {
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof mountScene> | null>(null);
  const latest = useRef({config,model});
  latest.current={config,model};
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
  useEffect(()=>{
    const host=stage.current!;
    let disposed=false;
    const observer = new IntersectionObserver(async entries=>{
      if (!entries.some(entry=>entry.isIntersecting)) return;
      observer.disconnect();
      try {
        if (!window.WebGL2RenderingContext) throw Error('WebGL2');
        const {mountScene}=await import('./scene');
        if (disposed) return;
        scene.current=mountScene(host,()=>setStatus('failed'));
        const first=latest.current;
        scene.current.change(first.config,first.model.id);
        setStatus('ready');
      } catch {
        scene.current?.dispose();
        scene.current=null;
        if (!disposed) setStatus('failed');
      }
    },{rootMargin:'150px'});
    observer.observe(host);
    return ()=>{
      disposed=true;
      observer.disconnect();
      scene.current?.dispose();
      scene.current=null;
    };
  },[]);
  useEffect(()=>{
    scene.current?.change(config,model.id);
  },[config,model.id]);
  const action = (label:string, text:string, perform:()=>void) =>
    <button type="button" aria-label={label} title={label} onClick={perform}>{text}</button>;
  return <div className={'experience-view '+(status==='ready'?'is-ready':'')}>
    <div className="experience-grid" aria-hidden="true"></div>
    <div className="experience-fallback" aria-hidden={status==='ready'}>
      {featured ? <img src="/assets/architecture.jpg" alt="Временная визуализация современной бытовки"/> : <div className={`tile tile-${model.tile ?? 15}`} role="img" aria-label={'Визуализация: '+model.name}/>}
    </div>
    <div className="experience-canvas" ref={stage}></div>
    <div className="experience-meta"><span className="indicator"></span>{status==='failed'?'РЕЗЕРВНАЯ ВИЗУАЛИЗАЦИЯ':'ПРОСМОТР · 360°'}</div>
    {status==='ready' && <div className="experience-controls">
      {action('Повернуть влево','↶',()=>scene.current?.orbit(.42))}
      {action('Повернуть вправо','↷',()=>scene.current?.orbit(-.42))}
      {action('Уменьшить','−',()=>scene.current?.zoom(1.18))}
      {action('Увеличить','+',()=>scene.current?.zoom(.85))}
    </div>}
    <div className="experience-hint">{status==='failed'?'3D недоступно в этом браузере':status==='ready'?'Потяните, чтобы повернуть':'Загрузка 3D'}</div>
  </div>;
}

function Configurator({models,initial}: {models:Model[];initial:Model}) {
  const [model,setModel]=useState(initial);
  const [config,setConfig]=useState(()=>restore(initial.id,new URLSearchParams(location.search).get('config')));
  const [copyState,setCopyState]=useState('');
  const note=summary(model,config);
  const set=(key:keyof Config,value:Config[keyof Config])=>setConfig(old=>({...old,[key]:value}));
  useEffect(()=>{
    const form=document.querySelector<HTMLFormElement>('#configuration-quote form');
    const modelInput=form?.querySelector<HTMLInputElement>('[name=model]');
    const configInput=form?.querySelector<HTMLInputElement>('[name=configuration]');
    if (modelInput) modelInput.value=model.id;
    if (configInput) configInput.value=JSON.stringify(config);
    form?.dispatchEvent(new Event('input'));
    const url=new URL(location.href);
    url.searchParams.set('model',model.id);
    url.searchParams.set('config',JSON.stringify(config));
    history.replaceState(null,'',url);
    setCopyState('');
  },[model,config]);
  const select = (key:'finish'|'windows'|'door'|'roof',label:string) =>
    <label>{label}<select value={config[key]} onChange={event=>set(key,event.target.value as Config[typeof key])}>
      {Object.entries(choices[key]).map(([value,name])=><option key={value} value={value}>{name}</option>)}
    </select></label>;
  return <div className="studio">
    <div className="studio-workspace">
    <div className="studio-stage"><Viewer model={model} config={config}/>
      <div className="studio-caption"><strong>{model.name}</strong><span>{meters(config.length)} × {meters(config.width)} × {meters(config.height)} м{model.id==='multilevel'?' · на этаж':''}</span></div>
    </div>
    <div className="studio-controls">
      <label>Базовая модель<select value={model.id} onChange={event=>{
        const next=models.find(item=>item.id===event.target.value);
        if (next) {setModel(next);setConfig(defaults(next.id));}
      }}>{models.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset><legend>Размеры</legend>
        {(Object.keys(dimensions) as (keyof typeof dimensions)[]).map(key=>{
          const {label,min,max,step}=dimensions[key];
          return <label className="range" key={key}><span>{label}<output>{meters(config[key])} м</output></span>
            <input type="range" aria-label={label} min={min} max={max} step={step} value={config[key]} onChange={event=>set(key,Number(event.target.value))}/>
          </label>;
        })}
      </fieldset>
      <fieldset><legend>Обшивка</legend>{select('finish','Материал')}
        <div className="swatches" role="group" aria-label="Цвет обшивки">
          {Object.entries(options.colors).map(([value,[label]])=><button key={value} type="button" className={`swatch swatch-${value}`} aria-label={label} aria-pressed={config.color===value} title={label} onClick={()=>set('color',value as Config['color'])}/>)}
        </div><small>{options.colors[config.color][0]}</small>
      </fieldset>
      <div className="studio-openings">{select('windows','Окна')}{select('door','Дверь')}{select('roof','Крыша')}</div>
      <button type="button" className="text-button" onClick={()=>setConfig(defaults(model.id))}>Сбросить настройки</button>
    </div>
    </div>
    <div className="studio-summary">
      <div><h2>Ваша конфигурация</h2><pre>{note}</pre><span className="notice">Размеры демонстрационные. Выполнимость и стоимость уточняются при расчёте.</span></div>
      <div className="actions">
        <button type="button" className="button secondary" onClick={async()=>{
          try {await navigator.clipboard.writeText(note);setCopyState('Сводка скопирована.');}
          catch {setCopyState('Выделите текст сводки и скопируйте его вручную.');}
        }}>Копировать сводку</button>
        <a className="button" href="#configuration-quote">Получить расчёт моей бытовки ↗</a>
        <small role="status">{copyState}</small>
      </div>
    </div>
  </div>;
}

for (const element of document.querySelectorAll<HTMLElement>('[data-experience]')) {
  const models=JSON.parse(element.dataset.models || '[]') as Model[];
  const initial=models.find(item=>item.id===element.dataset.selected) || models[0];
  if (!initial) continue;
  const root=createRoot(element);
  if (element.dataset.experience==='studio') root.render(<Configurator models={models} initial={initial}/>);
  else root.render(<Viewer model={initial} config={defaults(initial.id)} featured={element.dataset.experience==='hero'}/>);
}
