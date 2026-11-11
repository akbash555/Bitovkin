import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {options,type Config} from './config';

type Opening = {x:number; y:number; width:number; height:number; kind:'door'|'window'};
type Material = T.MeshStandardMaterial;

function texture(wood: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grain = ctx.createLinearGradient(0,0,wood ? 0 : 32,wood ? 128 : 0);
  grain.addColorStop(0,wood ? '#eed0a2' : '#93999b');
  grain.addColorStop(.28,wood ? '#b78247' : '#e6e7e6');
  grain.addColorStop(.82,wood ? '#d7ac72' : '#d5d9d8');
  grain.addColorStop(1,wood ? '#b17f4b' : '#8b9294');
  ctx.fillStyle = wood ? grain : '#bbb';
  ctx.fillRect(0,0,256,128);
  if (!wood) {
    for (let x=0;x<256;x+=32) {
      ctx.save();
      ctx.translate(x,0);
      ctx.fillStyle=grain;
      ctx.fillRect(0,0,32,128);
      ctx.restore();
    }
  }
  for (let i=0;i<(wood ? 270 : 30);i++) {
    const x = (i*73.13)%256, y = (i*29.31)%128;
    ctx.fillStyle = i%3===0 ? '#3f281a22' : '#fff1cf3b';
    ctx.fillRect(x,y,wood ? .5 + i%3*.35 : .5,13+i%34);
  }
  if (wood) for (let x=0;x<256;x+=32) {
    ctx.fillStyle='#352e29';
    ctx.fillRect(x,0,2,128);
    ctx.fillStyle='#edd19e';
    ctx.fillRect(x+2,0,1,128);
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 4;
  return map;
}

function createBuilding(config:Config,id:string) {
  const root = new T.Group();
  const {length:L,width:W,height:H} = config;
  const deck = .24;
  const paint = options.colors[config.color][1];
  const dark = new T.MeshStandardMaterial({color:'#20262a',roughness:.57,metalness:.28});
  const silver = new T.MeshStandardMaterial({color:'#727a7a',roughness:.46,metalness:.42});
  const warm = new T.MeshStandardMaterial({color:'#af916f',roughness:.86});
  const inside = new T.MeshStandardMaterial({color:'#ddd5c5',roughness:.93});
  const glass = new T.MeshPhysicalMaterial({color:'#79a4b4',roughness:.16,metalness:.22,transparent:true,opacity:.51,depthWrite:false,clearcoat:1});
  const woodMap = texture(true), metalMap = texture(false);
  const claddings: Material[] = [];
  const cladding = (isWood:boolean,width:number,height:number) => {
    const map = (isWood?woodMap:metalMap).clone();
    map.repeat.set(Math.max(.15,width/(isWood?1.06:.9)),Math.max(.1,height/2.5));
    map.needsUpdate = true;
    const color = isWood ? (config.finish==='mixed' ? '#ead1ad' : paint) : paint;
    const material = new T.MeshStandardMaterial({color,map,roughness:isWood?.83:.58,metalness:isWood?0:.2});
    claddings.push(material);
    return material;
  };
  function box(parent:T.Group,sx:number,sy:number,sz:number,x:number,y:number,z:number,material:Material) {
    const mesh = new T.Mesh(new T.BoxGeometry(sx,sy,sz),material);
    mesh.position.set(x,y,z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function openings(length:number,isFront:boolean): Opening[] {
    const all:Opening[] = [];
    const doorWidth = Math.min(.94,length*.23), doorHeight = Math.min(2.12,H-.26);
    if ((isFront && config.door!=='end') || !isFront) {
      const x = isFront ? (config.door==='left' ? -length*.33 : config.door==='right' ? length*.33 : 0) : 0;
      all.push({x,y:doorHeight/2,width:doorWidth,height:doorHeight,kind:'door'});
    }
    if (!isFront || config.windows==='none') return all;
    const candidates = config.windows==='single' ? [-length*.27] : config.windows==='pair' ? [-length*.31,length*.06] : config.windows==='panoramic' ? [-length*.22,length*.18] : [0];
    const windowWidth = Math.min(config.windows==='panoramic' ? 1.72 : config.windows==='slot' ? 1.25 : 1.24,length*.24);
    const height = config.windows==='panoramic' ? Math.min(1.7,H-.52) : config.windows==='slot' ? .34 : .95;
    for (const candidate of candidates) {
      let x = candidate;
      if (all.some(open=>Math.abs(open.x-x)<(open.width+windowWidth)/2+.13)) {
        const positions = [-length*.31,length*.31,0,-length*.09,length*.09];
        const next = positions.find(position=>all.every(open=>Math.abs(open.x-position)>=(open.width+windowWidth)/2+.13));
        if (next===undefined) continue;
        x = next;
      }
      all.push({x,y:config.windows==='slot'?H*.68:config.windows==='panoramic'?H*.49:H*.61,width:windowWidth,height,kind:'window'});
    }
    return all;
  }
  function wall(level:T.Group,length:number,x:number,z:number,angle:number,holes:Opening[],wood:boolean) {
    const panel = new T.Group();
    panel.position.set(x,deck,z);
    panel.rotation.y = angle;
    level.add(panel);
    const slab = (a:number,b:number,base:number,top:number) => {
      if (b-a<.015 || top-base<.015) return;
      box(panel,b-a,top-base,.105,(a+b)/2,(base+top)/2,0,cladding(wood,b-a,top-base));
      box(panel,b-a,top-base,.025,(a+b)/2,(base+top)/2,-.064,inside);
    };
    let edge = -length/2;
    for (const opening of holes.sort((a,b)=>a.x-b.x)) {
      const {x,y,width:w,height:h,kind} = opening;
      slab(edge,x-w/2,0,H);
      slab(x-w/2,x+w/2,0,y-h/2);
      slab(x-w/2,x+w/2,y+h/2,H);
      edge=x+w/2;
      const frame=.068;
      for (const dx of [-w/2,w/2]) box(panel,frame,h+frame,.16,x+dx,y,.025,dark);
      for (const dy of [-h/2,h/2]) box(panel,w,frame,.16,x,y+dy,.025,dark);
      if (kind==='window') {
        box(panel,w-.06,h-.06,.024,x,y,.022,glass).castShadow=false;
        if (w>.8 && h>.55) box(panel,.046,h,.075,x,y,.058,dark);
        box(panel,w+.17,.035,.2,x,y-h/2-.042,.07,silver);
      } else {
        box(panel,w-.065,h-.075,.07,x,y,.024,dark);
        box(panel,w*.62,h*.63,.025,x,y+.16,.074,glass).castShadow=false;
        box(panel,.15,.025,.045,x+w*.33,y-.12,.09,silver);
        box(panel,w+.2,.09,.35,x,.02,.19,dark);
      }
    }
    slab(edge,length/2,0,H);
    for (const dy of [.04,H-.035]) box(panel,length,.08,.148,0,dy,.018,dark);
  }
  const floors = id==='multilevel' ? 2 : 1;
  for (let i=0;i<floors;i++) {
    const level = new T.Group();
    level.position.y = i*(H+deck);
    root.add(level);
    box(level,L+.09,deck,W+.09,0,deck/2,0,dark);
    box(level,L-.12,.035,W-.12,0,deck+.009,0,warm);
    wall(level,L,0,W/2,0,openings(L,true),config.finish!=='metal');
    const guardBack: Opening[] = id==='guard' && config.windows==='panoramic' ? [{x:0,y:H*.57,width:L*.68,height:Math.min(H*.55,1.5),kind:'window'}] : [];
    wall(level,L,0,-W/2,Math.PI,guardBack,config.finish==='wood');
    wall(level,W,L/2,0,Math.PI/2,config.door==='end'?openings(W,false):[],config.finish==='wood');
    const sideWindow: Opening[] = config.windows==='panoramic' ? [{x:0,y:H*.52,width:W*.62,height:Math.min(H*.58,1.6),kind:'window'}] : [];
    wall(level,W,-L/2,0,-Math.PI/2,sideWindow,config.finish==='wood');
    for (const x of [-L/2,L/2]) for (const z of [-W/2,W/2]) {
      box(level,.12,H+.15,.12,x,H/2+deck,z,dark);
    }
    if (config.windows!=='none' && config.windows!=='slot') {
      box(level,L*.46,.11,.43,-L*.12,deck+.49,-W*.31,warm);
      for (const x of [-L*.33,L*.085]) box(level,.06,.48,.32,x,deck+.25,-W*.31,dark);
    }
  }
  const top = floors*(H+deck);
  if (config.roof==='flat') {
    box(root,L+.24,.115,W+.23,0,top+.044,0,dark);
    box(root,L+.22,.024,W+.21,0,top+.109,0,silver);
  } else {
    const half = W/2+.13;
    const rise = (config.roof==='gable' ? .34 : .23)*W;
    const slope = Math.atan(rise/(config.roof==='gable'?half:2*half));
    const fill = (vertices:number[][],z:number,angle:number) => {
      const shape = new T.Shape();
      vertices.forEach(([u,v],i)=> i===0 ? shape.moveTo(u,v) : shape.lineTo(u,v));
      shape.closePath();
      const material = dark.clone();
      material.side = T.DoubleSide;
      claddings.push(material);
      const mesh = new T.Mesh(new T.ShapeGeometry(shape),material);
      mesh.rotation.y=angle;
      mesh.position.set(0,top,z);
      if (angle) mesh.position.set(z,top,0);
      root.add(mesh);
    };
    if (config.roof==='gable') {
      for (const sign of [-1,1]) {
        const leaf = box(root,L+.25,.10,Math.hypot(half,rise),0,top+rise/2,sign*half/2,dark);
        leaf.rotation.x=sign*slope;
      }
      for (const x of [-L/2,L/2]) fill([[-half,0],[0,rise],[half,0]],x,Math.PI/2);
      box(root,L+.25,.09,.10,0,top+rise,0,silver);
    } else {
      const slab = box(root,L+.25,.11,Math.hypot(2*half,rise),0,top+rise/2,0,dark);
      slab.rotation.x=slope;
      for (const x of [-L/2,L/2]) fill([[-half,0],[half,rise],[half,0]],x,Math.PI/2);
      box(root,L,.94*rise,.08,0,top+rise/2,-W/2,dark);
    }
  }
  for (const z of [-W*.34,W*.34]) box(root,L+.2,.15,.15,0,-.04,z,dark);
  if (id==='garden') {
    const porchWidth=Math.min(1.6,L*.37);
    const doorX=config.door==='left' ? -L*.33 : config.door==='right' ? L*.33 : 0;
    if (config.door==='end') {
      box(root,.58,.15,Math.min(W*.62,1.6),L/2+.33,.10,0,warm);
      box(root,.35,.13,Math.min(W*.49,1.3),L/2+.73,.024,0,dark);
    } else {
      box(root,porchWidth,.15,.62,doorX,.10,W/2+.32,warm);
      box(root,porchWidth*.79,.13,.3,doorX,.024,W/2+.75,dark);
    }
  }
  if (id==='armored') {
    for (const x of [-L*.43,-L*.2,L*.2,L*.43]) for (const y of [deck+.17,deck+H-.18]) {
      box(root,.085,.085,.07,x,y,-W/2-.067,silver);
    }
  }
  if (floors===2) {
    const count = 12, run = Math.min(L*.53,4.1);
    for (let i=0;i<count;i++) box(root,run/count+.02,.09,.87,L*.45-run+run*i/count,(H+deck)*(i+1)/count,W/2+.47,silver);
    for (const fraction of [0,.33,.66,1]) box(root,.043,1,.043,L*.45-run+fraction*run,(H+deck)*fraction+.48,W/2+.91,dark);
    box(root,Math.hypot(run,H+deck),.045,.045,L*.45-run/2,(H+deck)/2+.96,W/2+.91,dark).rotation.z=Math.atan2(H+deck,run);
  }
  const materials = [dark,silver,warm,inside,glass,...claddings];
  return {root, height:top, dispose() {
    root.traverse(object=>{if (object instanceof T.Mesh) object.geometry.dispose();});
    for (const material of materials) {material.map?.dispose();material.dispose();}
    woodMap.dispose();
    metalMap.dispose();
  }};
}

export function mountScene(host:HTMLElement,onFailure:()=>void) {
  const renderer = new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.32;
  renderer.domElement.setAttribute('aria-label','Интерактивная трёхмерная модель бытовки');
  host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',onFailure);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(37,1,.1,180);
  camera.position.set(9,5.4,11);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;
  controls.enableDamping=false;
  controls.enableZoom=true;
  controls.minDistance=3;
  controls.maxDistance=45;
  controls.zoomSpeed=.72;
  controls.minPolarAngle=.32;
  controls.maxPolarAngle=Math.PI*.49;
  controls.rotateSpeed=.63;
  controls.target.set(0,1.3,0);
  const sun = new T.DirectionalLight('#fff2d8',3.1);
  sun.position.set(6,9,5);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:30});
  sun.shadow.normalBias=.025;
  sun.shadow.bias=-.00025;
  const rim = new T.DirectionalLight('#c4e5ff',1.6);
  rim.position.set(-5,5,-5);
  scene.add(sun,rim,new T.HemisphereLight('#e6efff','#665746',2.0));
  const floor = new T.Mesh(new T.PlaneGeometry(70,70),new T.ShadowMaterial({opacity:.37}));
  floor.rotation.x=-Math.PI/2;
  floor.position.y=-.13;
  floor.receiveShadow=true;
  scene.add(floor);
  let building:ReturnType<typeof createBuilding>|undefined;
  let frame = 0;
  let animation = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>renderer.render(scene,camera));
  };
  const fit = () => {
    const {clientWidth:w,clientHeight:h}=host;
    if (w && h) {
      camera.aspect=w/h;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
      draw();
    }
  };
  const observer = new ResizeObserver(fit);
  observer.observe(host);
  fit();
  controls.addEventListener('change',draw);
  let lastSize = '';
  return {
    change(config:Config,id:string) {
      const initial = !building;
      if (building) { scene.remove(building.root); building.dispose(); }
      cancelAnimationFrame(animation);
      building=createBuilding(config,id);
      scene.add(building.root);
      const size = [id,config.length,config.width,building.height].join('/');
      if (size!==lastSize) {
        const offset = camera.position.clone().sub(controls.target).normalize();
        const distance = Math.max(config.length*1.17,config.width*1.8,building.height*1.85) * (camera.aspect<1.1?1.55:1.17);
        controls.target.set(0,building.height*.46,0);
        camera.position.copy(controls.target).addScaledVector(offset,distance);
        controls.update();
        lastSize=size;
      }
      if (!initial && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const model=building.root, start=performance.now();
        const tick=(now:number)=>{
          const elapsed=Math.min((now-start)/170,1);
          model.scale.setScalar(.982+.018*(1-(1-elapsed)**3));
          draw();
          if (elapsed<1) animation=requestAnimationFrame(tick);
        };
        animation=requestAnimationFrame(tick);
      } else draw();
    },
    orbit(angle:number) {
      const position = camera.position.clone().sub(controls.target);
      position.applyAxisAngle(new T.Vector3(0,1,0),angle);
      camera.position.copy(controls.target).add(position);
      controls.update();
      draw();
    },
    zoom(multiplier:number) {
      const position = camera.position.clone().sub(controls.target);
      position.setLength(T.MathUtils.clamp(position.length()*multiplier,3,45));
      camera.position.copy(controls.target).add(position);
      controls.update();
      draw();
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(animation);
      controls.dispose();
      building?.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      sun.shadow.dispose();
      renderer.domElement.removeEventListener('webglcontextlost',onFailure);
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
