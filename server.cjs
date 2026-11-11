const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID, createHash, timingSafeEqual } = require('node:crypto');
const { openDatabase } = require('./database.cjs');
const {describeConfiguration} = require('./configuration.cjs');
const facts = require('./company-facts.json');
const { render, layout, e, url } = require('./views.cjs');
const { renderAdmin, statuses } = require('./admin.cjs');
const seed = require('./catalog.cjs');

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';
const loopback = ['127.0.0.1', 'localhost', '::1'].includes(host);
const demo = process.argv.includes('--demo');
const origin = !demo && process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : '';
const hosted = process.env.VERCEL === '1';
const readOnly = hosted && !process.env.TURSO_DATABASE_URL;
if (origin && !origin.startsWith('https://')) throw new Error('SITE_URL must be an HTTPS origin.');
if (!loopback && !origin) throw new Error('Set SITE_URL to the HTTPS origin before binding a public interface.');
const localOrigin = `http://${host === '::1' ? '[::1]' : host}:${port}`;
const adminPassword = demo ? randomBytes(12).toString('hex') : process.env.ADMIN_PASSWORD || '';
const legalVersion = demo ? 'local-test' : process.env.LEGAL_VERSION?.trim();
const metrika = !demo && /^\d{1,15}$/.test(process.env.METRIKA_ID || '') ? process.env.METRIKA_ID : '';
const webhook = !demo && process.env.LEAD_WEBHOOK_URL ? new URL(process.env.LEAD_WEBHOOK_URL) : null;
if (webhook && webhook.protocol !== 'https:') throw new Error('LEAD_WEBHOOK_URL must be HTTPS.');
const db = openDatabase({hosted,demo});
const schema = [
  'CREATE TABLE IF NOT EXISTS models(id TEXT PRIMARY KEY, payload TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS company(id INTEGER PRIMARY KEY, payload TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY, mime TEXT NOT NULL, content BLOB NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)',
  `CREATE TABLE IF NOT EXISTS leads(
    id INTEGER PRIMARY KEY, request_id TEXT UNIQUE, type TEXT NOT NULL, name TEXT NOT NULL,
    phone TEXT NOT NULL, model_name TEXT, message TEXT, source TEXT NOT NULL, created_at TEXT NOT NULL,
    legal_version TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
    attachment_name TEXT, attachment BLOB, notification TEXT NOT NULL DEFAULT 'off'
  )`
];
const defaultCompany = {phone:'', email:'', address:'', logo:'', accent:'#b84021', ink:'#212922', paper:'#f6f5ef', privacy:'', consent:''};
const statement = (sql,...args) => ({sql,args});
let initialized;
function initialize() {
  initialized ??= (async () => {
    await db.batch(schema.map(sql=>statement(sql)));
    if (!await db.get('SELECT 1 FROM company WHERE id=1')) {
      await db.batch([
        ...seed.map(model=>statement('INSERT OR IGNORE INTO models VALUES (?, ?)',model.id,JSON.stringify(model))),
        statement('INSERT OR IGNORE INTO company VALUES (1, ?)',JSON.stringify(defaultCompany))
      ]);
    }
  })().catch(error=>{
    initialized = undefined;
    throw error;
  });
  return initialized;
}
async function loadCompany() {
  const row = await db.get('SELECT payload FROM company WHERE id=1');
  return {...defaultCompany,...JSON.parse(row.payload)};
}
async function allModels() {
  const rows = await db.all('SELECT payload FROM models ORDER BY rowid');
  return rows.map(row=>JSON.parse(row.payload));
}
const trustedOrigins = new Set(origin || hosted ? [origin].filter(Boolean) : [localOrigin,`http://localhost:${port}`,`http://127.0.0.1:${port}`]);
if (hosted) {
  for (const value of [process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL,process.env.VERCEL_BRANCH_URL]) {
    if (/^[a-z0-9-]+\.vercel\.app$/i.test(value || '')) trustedOrigins.add('https://'+value);
  }
}
const hash = value => createHash('sha256').update(value).digest('hex');
const sessionHash = token => hash(token+':'+adminPassword);
const safeEqual = (a,b) => timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
const field = (form, key, limit = 200) => {
  const value = form.get(key);
  if (typeof value !== 'string') return '';
  if (value.length > limit) throw new HttpError(400, 'Одно из полей превышает допустимую длину.');
  return value.trim();
};
class HttpError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new HttpError(code, message); };
function respond(res, status, content, mime = 'text/html; charset=utf-8', headers = {}) {
  res.writeHead(status, {'Content-Type':mime, ...headers});
  res.end(content);
}
const redirect = (res, href, headers = {}) => respond(res,303,'','text/plain',{Location:href,...headers});
const json = (res, status, content) => respond(res,status,JSON.stringify(content),'application/json; charset=utf-8');
const types = new Set(['callback','quote','project']);
const paths = ['/', '/catalog.html','/constructor.html','/custom.html','/production.html','/delivery.html','/contacts.html','/projects.html','/privacy.html','/consent.html'];
const cache = new Map();
const minutes = 60_000;
const rateWindow = 15 * minutes;
const photoLimit = 4 * 1024 * 1024;
const drawingMB = hosted ? 4 : 8;
const drawingLimit = drawingMB * 1024 * 1024;
const requestLimit = hosted ? 4_400_000 : 21 * 1024 * 1024;
const ipAddress = req => (hosted && req.headers['x-vercel-forwarded-for']) || req.socket.remoteAddress;
let nextRateCleanup = 0;

function rate(key, max) {
  const now = Date.now();
  if (now >= nextRateCleanup) {
    for (const [key, record] of cache) if (record.until <= now) cache.delete(key);
    nextRateCleanup = now+minutes;
  }
  let record = cache.get(key);
  if (!record || record.until <= now) {
    if (cache.size >= 50_000) fail(503, 'Сервис занят. Попробуйте позже.');
    record = {count:0, until:now+rateWindow};
    cache.set(key,record);
  }
  if (++record.count > max) fail(429,'Слишком много попыток. Попробуйте позже.');
}

function verifyOrigin(req) {
  if (req.headers.origin && trustedOrigins.has(req.headers.origin)) return;
  if (!req.headers.origin && req.headers.referer && [...trustedOrigins].some(value=>req.headers.referer.startsWith(value+'/'))) return;
  fail(403,'Откройте форму на сайте и попробуйте ещё раз.');
}

async function formData(req, max) {
  const type = req.headers['content-type'] || '';
  if (!/^(multipart\/form-data;|application\/x-www-form-urlencoded\b)/i.test(type)) fail(415,'Не удалось прочитать поля формы.');
  if (Number(req.headers['content-length']) > max) fail(413,'Слишком большой запрос.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({destroyOnReturn:false})) {
    size += chunk.length;
    if (size > max) {
      req.resume();
      fail(413,'Слишком большой запрос.');
    }
    chunks.push(chunk);
  }
  try {
    return await new Response(Buffer.concat(chunks), {headers:{'content-type':type}}).formData();
  } catch {
    fail(400,'Форма повреждена. Обновите страницу и попробуйте ещё раз.');
  }
}

function phoneNumber(value) {
  if (!/^[+\d()\s-]+$/.test(value)) return '';
  const digits = value.replace(/\D/g,'');
  if (digits.length === 10) return '+7'+digits;
  if (digits.length === 11 && /^[78]/.test(digits)) return '+7'+digits.slice(1);
  return '';
}
const file = value => value instanceof File && value.size > 0;
function imageMime(bytes) {
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) return 'image/png';
  if (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'image/webp';
  return '';
}
async function prepareImage(upload) {
  if (upload.size > photoLimit) fail(413,'Размер фотографии превышает 4 МБ.');
  const bytes = Buffer.from(await upload.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime) fail(400,'Загрузите фотографию JPEG, PNG или WebP.');
  return {id:randomUUID(), mime, bytes};
}
const mediaPath = media => '/media/'+media.id;
const insertMedia = media => statement('INSERT INTO media VALUES (?, ?, ?)',media.id,media.mime,media.bytes);
async function prepareDrawing(upload) {
  if (!file(upload)) return {};
  if (upload.size > drawingLimit) fail(413,`Размер чертежа превышает ${drawingMB} МБ.`);
  const bytes = Buffer.from(await upload.arrayBuffer());
  const extension = path.extname(upload.name).toLowerCase();
  const valid = (extension==='.pdf' && bytes.toString('ascii',0,5)==='%PDF-') ||
    (extension==='.png' && imageMime(bytes)==='image/png') ||
    (['.jpg','.jpeg'].includes(extension) && imageMime(bytes)==='image/jpeg') ||
    (extension==='.txt' && !bytes.includes(0));
  if (!valid) fail(400,'Загрузите чертёж в формате PDF, PNG, JPEG или TXT.');
  return {name:path.basename(upload.name.replaceAll('\\','/')).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,140),bytes};
}
async function session(req) {
  if (adminPassword.length < 12) return '';
  const token = /(?:^|;\s*)bytovkin_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  if (!token) return '';
  const digest = sessionHash(token);
  return await db.get('SELECT 1 FROM sessions WHERE hash=? AND expires>?',digest,Date.now()) ? digest : '';
}
const cookie = (value, age) => `bytovkin_session=${value}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${origin || hosted ? '; Secure' : ''}`;
const adminPage = async (company,site,token,edit,error) => renderAdmin({
  company,site,token,edit,error,models:token && !edit ? await allModels() : [],
  leads:token && !edit ? await db.all('SELECT id,type,name,phone,model_name,message,source,created_at,status,attachment_name FROM leads ORDER BY id DESC') : []
});

async function admin(req,res,route,company,site) {
  if (readOnly) fail(503,'Панель управления станет доступна после подключения базы данных.');
  const token = await session(req);
  if (req.method === 'GET' && route === '/admin') return respond(res,200,await adminPage(company,site,token));
  if (req.method === 'POST' && route === '/admin/login') {
    verifyOrigin(req);
    rate('login:'+ipAddress(req),8);
    const form = await formData(req,4096);
    if (adminPassword.length < 12 || !safeEqual(field(form,'password',512),adminPassword)) {
      return respond(res,401,await adminPage(company,site,'',null,'Проверьте пароль и настройку доступа.'));
    }
    const value = randomBytes(32).toString('hex');
    await db.batch([
      statement('DELETE FROM sessions WHERE expires <= ?',Date.now()),
      statement('INSERT INTO sessions VALUES (?, ?)',sessionHash(value),Date.now()+8*60*minutes)
    ]);
    return redirect(res,'/admin',{'Set-Cookie':cookie(value,28800)});
  }
  if (!token) return req.method==='GET' ? redirect(res,'/admin') : fail(401,'Войдите в панель управления.');
  if (req.method === 'GET') {
    if (route.startsWith('/admin/model/')) {
      const id = route.split('/').pop();
      const edit = id === 'new' ? {visible:true,photos:[]} : (await allModels()).find(m=>m.id===id);
      if (edit) return respond(res,200,await adminPage(company,site,token,edit));
    }
    const match = /^\/admin\/attachment\/(\d+)$/.exec(route);
    if (match) {
      const row = await db.get('SELECT attachment_name, attachment FROM leads WHERE id=?',match[1]);
      if (row?.attachment) {
        const name = encodeURIComponent(row.attachment_name.toWellFormed()).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16));
        return respond(res,200,Buffer.from(row.attachment),'application/octet-stream',{'Content-Disposition':"attachment; filename*=UTF-8''"+name});
      }
    }
    fail(404,'Страница не найдена.');
  }
  if (req.method !== 'POST') fail(405,'Метод недоступен.');
  verifyOrigin(req);
  const form = await formData(req,route==='/admin/model' ? requestLimit : Math.min(requestLimit,5*1024*1024));
  if (!safeEqual(field(form,'_csrf',80),token)) fail(403,'Обновите страницу панели управления.');
  if (route === '/admin/logout') {
    await db.run('DELETE FROM sessions WHERE hash=?',token);
    return redirect(res,'/admin',{'Set-Cookie':cookie('',0)});
  }
  if (route === '/admin/status') {
    const status = field(form,'status');
    if (!Object.hasOwn(statuses,status)) fail(400,'Выберите статус из списка.');
    await db.run('UPDATE leads SET status=? WHERE id=?',status,field(form,'id'));
    return redirect(res,'/admin#leads');
  }
  if (route === '/admin/company') {
    const phone = field(form,'phone',30);
    const email = field(form,'email',180);
    if (phone && !phoneNumber(phone)) fail(400,'Проверьте телефон.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Проверьте адрес электронной почты.');
    const next = {...company,phone,email,address:field(form,'address',300),privacy:field(form,'privacy',20000),consent:field(form,'consent',20000)};
    next.stats = Object.fromEntries(facts.stats.map(([key,value])=>[key,field(form,'stat_'+key,50)||value]));
    next.projects = field(form,'projects',5000).split('\n').map(name=>name.trim()).filter(Boolean);
    next.factsVerified = form.has('factsVerified');
    for (const key of ['accent','ink','paper']) {
      const value = field(form,key);
      if (!/^#[\da-f]{6}$/i.test(value)) fail(400,'Проверьте цвета.');
      next[key] = value;
    }
    const logo = form.get('logo');
    if (form.has('removeLogo')) next.logo = '';
    const image = file(logo) ? await prepareImage(logo) : null;
    if (image) next.logo = mediaPath(image);
    await db.batch([
      ...(image ? [insertMedia(image)] : []),
      statement('UPDATE company SET payload=? WHERE id=1',JSON.stringify(next))
    ]);
    return redirect(res,'/admin#company');
  }
  if (route === '/admin/model') {
    const id = field(form,'id');
    const before = id ? (await allModels()).find(m=>m.id===id) : null;
    if (id && !before) fail(404,'Модель не найдена.');
    const name = field(form,'name',140);
    const category = field(form,'category',80);
    const price = field(form,'price',12);
    if (!name || !category || (price && (!/^\d+$/.test(price) || Number(price)<1 || Number(price)>1e9))) fail(400,'Проверьте название, категорию и стартовую цену.');
    const photos = (before?.photos || []).filter(p=>!form.getAll('removePhoto').includes(p));
    const added = form.getAll('photos').filter(file);
    if (photos.length+added.length > 5) fail(400,'В галерее может быть до пяти фотографий.');
    const model = {...before, id:id || 'model-'+randomUUID().slice(0,12), name,category,price:price ? Number(price) : null,
      size:field(form,'size',120), material:field(form,'material',40), description:field(form,'description',3000), equipment:field(form,'equipment',3000),
      insulation:field(form,'insulation',3000), changes:field(form,'changes',3000), photos, visible:form.has('visible'), demo:form.has('demo')};
    const images = await Promise.all(added.map(prepareImage));
    model.photos.push(...images.map(mediaPath));
    await db.batch([
      ...images.map(insertMedia),
      statement('INSERT INTO models VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',model.id,JSON.stringify(model))
    ]);
    return redirect(res,'/admin#models');
  }
  fail(404,'Страница не найдена.');
}

async function notifyLead(id, payload) {
  let status = 'failed';
  try {
    const result = await fetch(webhook,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),
      headers:{'Content-Type':'application/json',...(process.env.LEAD_WEBHOOK_TOKEN ? {Authorization:'Bearer '+process.env.LEAD_WEBHOOK_TOKEN} : {})},
      body:JSON.stringify({id,...payload})});
    if (result.ok) status = 'sent';
  } catch {}
  try {
    await db.run('UPDATE leads SET notification=? WHERE id=?',status,id);
  } catch {
    console.error('Could not save lead notification status.');
  }
}

async function submitLead(req,res,site,models) {
  if (!site.leads) fail(503,'Приём заявок временно недоступен.');
  verifyOrigin(req);
  rate('lead-ip:'+ipAddress(req),35);
  const form = await formData(req, drawingLimit + 96*1024);
  const type = field(form,'type',24);
  const name = field(form,'name',80);
  const phone = phoneNumber(field(form,'phone',30));
  let message = type==='callback' ? '' : field(form,'message',2500);
  const key = field(form,'request_id',40);
  const requestId = /^[a-f0-9-]{36}$/.test(key) ? key : null;
  if (field(form,'website') || !types.has(type) || !name || !phone || (type==='project' && !message) || field(form,'consent')!=='yes') {
    fail(400,'Проверьте имя, телефон, согласие и обязательные поля.');
  }
  const saved = requestId && await db.get('SELECT id, phone FROM leads WHERE request_id=?',requestId);
  if (saved) {
    if (saved.phone !== phone) fail(409,'Обновите страницу и отправьте заявку повторно.');
    return json(res,200,{ok:true,id:saved.id});
  }
  rate('lead-phone:'+hash(phone),5);
  const modelId = type==='quote' ? field(form,'model',100) : '';
  const model = models.find(m=>m.id===modelId);
  if (modelId && !model) fail(400,'Эта модель больше не доступна. Обновите каталог.');
  const attachment = type==='project' ? await prepareDrawing(form.get('drawing')) : {};
  const sourcePath = field(form,'source',180);
  if (sourcePath==='/constructor.html') {
    const configuration = describeConfiguration(field(form,'configuration',700),model);
    if (!configuration) fail(400,'Не удалось прочитать конфигурацию. Проверьте параметры в конструкторе.');
    message = [configuration,message].filter(Boolean).join('\n\n');
  }
  const source = paths.includes(sourcePath) || models.some(m=>url(m)===sourcePath) ? sourcePath : '/';
  const createdAt = new Date().toISOString();
  const result = await db.run(`INSERT INTO leads(request_id,type,name,phone,model_name,message,source,created_at,legal_version,attachment_name,attachment,notification)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_id) DO NOTHING`,requestId,type,name,phone,model?.name ?? null,message,source,createdAt,legalVersion,
    attachment.name ?? null,attachment.bytes ?? null,webhook?'pending':'off');
  const row = result.changes ? {id:Number(result.lastInsertRowid),phone} : await db.get('SELECT id,phone FROM leads WHERE request_id=?',requestId);
  if (row.phone!==phone) fail(409,'Обновите страницу и отправьте заявку повторно.');
  if (result.changes && webhook) await notifyLead(row.id,{type,model:model?.name ?? null,createdAt});
  if (req.headers.accept?.includes('application/json')) return json(res,201,{ok:true,id:row.id});
  return redirect(res,'/thanks');
}

const assets = {
  '/assets/style.css':'text/css; charset=utf-8', '/assets/site.js':'application/javascript; charset=utf-8',
  '/assets/architecture.css':'text/css; charset=utf-8', '/assets/architecture.jpg':'image/jpeg',
  '/assets/hero.jpg':'image/jpeg', '/assets/catalog.jpg':'image/jpeg', '/assets/interiors.jpg':'image/jpeg'
};
async function handler(req,res) {
  const location = new URL(req.url,'http://localhost');
  const route = location.pathname;
  let company = defaultCompany;
  const site = {origin,metrika,demo,hosted,readOnly,drawingMB,leads:false};
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  const privateRoute = route.startsWith('/admin') || route==='/lead';
  res.setHeader('Cache-Control',privateRoute ? 'no-store' : 'no-cache');
  if (privateRoute) res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (origin || hosted) res.setHeader('Strict-Transport-Security','max-age=31536000');
  const tracking = metrika && !privateRoute;
  res.setHeader('Content-Security-Policy',`default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; script-src 'self'${tracking?' https://mc.yandex.ru':''}; img-src 'self'${tracking?' https://mc.yandex.ru data:':''}; connect-src 'self'${tracking?' https://mc.yandex.ru':''}; style-src 'self'`);
  try {
    await initialize();
    company = await loadCompany();
    site.leads = !readOnly && (demo || process.env.LEADS_ENABLED==='1' && Boolean(company.privacy && company.consent && legalVersion));
    if (route==='/admin' || route.startsWith('/admin/')) return await admin(req,res,route,company,site);
    if (route==='/lead' && req.method==='POST') return await submitLead(req,res,site,(await allModels()).filter(m=>m.visible));
    if (!['GET','HEAD'].includes(req.method)) fail(405,'Метод недоступен.');
    const experienceAsset = /^\/assets\/experience\/[a-z0-9_-]+\.js$/i.test(route);
    if (Object.hasOwn(assets,route) || experienceAsset) {
      const name = path.join(__dirname,'public',route.slice('/assets/'.length));
      if (!fs.existsSync(name)) fail(404,'Файл не найден.');
      const mime = experienceAsset ? 'application/javascript; charset=utf-8' : assets[route];
      return respond(res,200,fs.readFileSync(name),mime,{'Cache-Control':route.endsWith('/main.js')?'no-cache':'public, max-age=3600'});
    }
    if (route==='/brand.css') return respond(res,200,`:root{--accent:${company.accent};--ink:${company.ink};--paper:${company.paper}}`,'text/css; charset=utf-8');
    if (/^\/media\/[a-f0-9-]{36}$/.test(route)) {
      const row = await db.get('SELECT mime,content FROM media WHERE id=?',route.slice(7));
      if (row) return respond(res,200,Buffer.from(row.content),row.mime,{'Cache-Control':'public, max-age=86400'});
      fail(404,'Файл не найден.');
    }
    if (route==='/robots.txt') return respond(res,200,origin ? `User-agent: *\nDisallow: /admin\nDisallow: /thanks\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n','text/plain; charset=utf-8');
    const models = (await allModels()).filter(m=>m.visible);
    if (route==='/sitemap.xml') {
      if (!origin) fail(404,'Укажите SITE_URL для карты сайта.');
      const list = paths.filter(p=>(p!=='/privacy.html'||company.privacy)&&(p!=='/consent.html'||company.consent)&&(p!=='/projects.html'||company.factsVerified)).concat(models.map(url));
      return respond(res,200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${list.map(p=>`<url><loc>${e(origin+p)}</loc></url>`).join('')}</urlset>`,'application/xml; charset=utf-8');
    }
    if (route==='/thanks') return respond(res,200,layout({title:'Заявка принята',description:'Заявка сохранена',path:route,company,site,noindex:true,content:'<section class="wrap section"><h1>Заявка принята</h1><p>Ваше обращение сохранено.</p><a href="/catalog.html">Вернуться в каталог ↗</a></section>'}));
    const page = render(route,company,site,models,location.searchParams);
    if (page) return respond(res,200,page);
    fail(404,'Страница не найдена.');
  } catch (error) {
    const status = error instanceof HttpError ? error.code : 500;
    const message = error instanceof HttpError ? error.message : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
    if (status===500) console.error('Request failed:', error.name, error.code || '');
    if (req.headers.accept?.includes('application/json')) return json(res,status,{ok:false,message});
    return respond(res,status,layout({title:message,description:message,path:route,company,site,admin:privateRoute,noindex:true,
      content:`<section class="wrap section"><h1>${e(message)}</h1><a href="${route.startsWith('/admin')?'/admin':'/'}">Вернуться ↗</a></section>`}));
  }
}

function start() {
  http.createServer({requestTimeout:30_000,headersTimeout:15_000},handler).listen(port,host,()=>{
    console.log('БЫТОВКИн: '+localOrigin);
    if (demo) console.log('Панель: '+localOrigin+'/admin\nПароль тестового сеанса: '+adminPassword);
  });
}
if (require.main === module) start();
module.exports = {handler,start,closeDatabase() { db.close(); }};
