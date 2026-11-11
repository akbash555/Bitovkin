const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bytovkin-check-'));
const password = 'Only-for-local-checks-1';
const origin = 'https://example.test';
Object.assign(process.env, { DATA_DIR:temp, ADMIN_PASSWORD:password, SITE_URL:origin, LEADS_ENABLED:'1', LEGAL_VERSION:'test-1', LEAD_WEBHOOK_URL:'', METRIKA_ID:'' });
const { handler } = require('./server.cjs');
let cookie = '';
let csrf = '';

async function request(route, {values, auth = false, crossSite = false} = {}) {
  const req = Readable.from([]);
  req.url = route;
  req.method = values ? 'POST' : 'GET';
  req.headers = {};
  req.socket = {remoteAddress:'127.0.0.1'};
  if (auth) req.headers.cookie = cookie;
  if (values) {
    const form = new FormData();
    for (const [key,value] of Object.entries(values)) form.append(key,value);
    const data = new Response(form);
    const bytes = Buffer.from(await data.arrayBuffer());
    req.push(bytes);
    req.headers['content-type'] = data.headers.get('content-type');
    req.headers.accept = 'application/json';
    req.headers.origin = crossSite ? 'https://other.test' : origin;
  }
  const result = {headers:{}};
  const response = {
    setHeader(name,value) { result.headers[name.toLowerCase()] = value; },
    writeHead(status,headers) {
      result.status = status;
      for (const [key,value] of Object.entries(headers)) this.setHeader(key,value);
    },
    end(body) { result.body = Buffer.from(body || '').toString(); }
  };
  await handler(req,response);
  return result;
}

async function main() {
  const home = await request('/');
  assert.equal(home.status,200);
  assert.match(home.body,/Бытовки и модульные конструкции от производителя/);
  assert.equal((await request('/catalog.html')).body.match(/<article class="card"/g).length,16);
  assert.equal((await request('/catalog.html?material='+encodeURIComponent('Дерево'))).body.match(/<article class="card"/g).length,3);
  for (const model of require('./catalog.cjs')) {
    const page = await request('/models/'+model.id+'.html');
    assert.equal(page.status,200);
    assert.ok(page.body.includes('value="'+model.id+'"'));
    assert.match(page.body,/Цена по запросу/);
  }
  for (const route of ['/custom.html','/production.html','/delivery.html','/contacts.html','/privacy.html','/consent.html','/robots.txt','/sitemap.xml','/assets/hero.jpg','/assets/catalog.jpg','/assets/interiors.jpg','/assets/site.js','/assets/style.css']) assert.equal((await request(route)).status,200,route);
  assert.equal((await request('/bad-link')).status,404);
  assert.equal((await request('/admin/attachment/1')).status,303);
  assert.equal((await request('/admin/status',{values:{id:'1',status:'closed'}})).status,401);
  assert.equal((await request('/admin/login',{values:{password:'bad'}})).status,401);
  const login = await request('/admin/login',{values:{password}});
  assert.equal(login.status,303);
  cookie = login.headers['set-cookie'].split(';')[0];
  assert.match(login.headers['set-cookie'],/HttpOnly; SameSite=Strict.*Secure/);
  const panel = await request('/admin',{auth:true});
  assert.match(panel.body,/Пока нет заявок/);
  csrf = panel.body.match(/name="_csrf" value="([a-f0-9]+)"/)[1];

  const common = {name:'Тестовый клиент',phone:'+7 000 000-00-00',consent:'yes',type:'callback',source:'/contacts.html'};
  assert.equal((await request('/lead',{values:common})).status,503);
  assert.equal((await request('/admin/company',{auth:true,values:{_csrf:csrf,phone:'+7 000 000-00-00',email:'example@example.test',address:'Тестовый адрес',
    accent:'#b84021',ink:'#212922',paper:'#f6f5ef',privacy:'Тестовая политика',consent:'Тестовый текст'}})).status,303);
  assert.match((await request('/')).body,/href="tel:\+70000000000"/);
  assert.equal((await request('/lead',{values:common,crossSite:true})).status,403);
  assert.equal((await request('/lead',{values:{...common,phone:'123'}})).status,400);
  assert.equal((await request('/lead',{values:{...common,website:'spam'}})).status,400);
  assert.equal((await request('/lead',{values:{...common,consent:''}})).status,400);
  const callback = await request('/lead',{values:common});
  assert.equal(callback.status,201);
  const quote = {...common,type:'quote',model:'construction',source:'/models/construction.html',message:'Нужна отделка',request_id:randomUUID()};
  const first = await request('/lead',{values:quote});
  const second = await request('/lead',{values:quote});
  assert.equal(first.status,201);
  assert.equal(second.status,200);
  assert.equal(first.body,second.body);
  const project = {...common,type:'project',source:'/custom.html',message:'Размеры согласуем'};
  assert.equal((await request('/lead',{values:{...project,drawing:new File(['test'],'test.html')}})).status,400);
  const saved = await request('/lead',{values:{...project,drawing:new File(['test drawing'],'drawing.txt')}});
  assert.equal(saved.status,201);
  const id = String(JSON.parse(saved.body).id);
  const withLeads = await request('/admin',{auth:true});
  assert.match(withLeads.body,/Строительная бытовка/);
  assert.equal(withLeads.body.match(/class="admin-item"/g).length,3);
  assert.equal((await request('/admin/attachment/'+id)).status,303);
  const download = await request('/admin/attachment/'+id,{auth:true});
  assert.equal(download.body,'test drawing');
  assert.match(download.headers['content-disposition'],/^attachment/);
  assert.equal((await request('/admin/status',{auth:true,values:{_csrf:'wrong',id,status:'closed'}})).status,403);
  assert.equal((await request('/admin/status',{auth:true,values:{_csrf:csrf,id,status:'closed'}})).status,303);
  assert.match((await request('/admin',{auth:true})).body,/<option value="closed" selected>/);

  const photo = new File([fs.readFileSync(path.join(__dirname,'public','hero.jpg'))],'model.jpg',{type:'image/jpeg'});
  const edit = {auth:true,values:{_csrf:csrf,id:'construction',name:'Обновлённая модель',category:'Для стройки',price:'50000',visible:'on',photos:photo}};
  assert.equal((await request('/admin/model',edit)).status,303);
  const updated = await request('/models/construction.html');
  assert.match(updated.body,/Обновлённая модель/);
  const media = updated.body.match(/src="(\/media\/[^"]+)"/)[1];
  assert.equal((await request(media)).headers['content-type'],'image/jpeg');
  delete edit.values.visible;
  delete edit.values.photos;
  assert.equal((await request('/admin/model',edit)).status,303);
  assert.equal((await request('/models/construction.html')).status,404);
  assert.doesNotMatch((await request('/sitemap.xml')).body,/models\/construction\.html/);
  assert.equal((await request('/admin/logout',{auth:true,values:{_csrf:csrf}})).status,303);
  assert.doesNotMatch((await request('/admin',{auth:true})).body,/Тестовый клиент/);
  console.log('Проверены страницы, каталог, три формы, SQLite, доступ к вложениям, статусы, редактирование модели и карта сайта.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  require('./server.cjs').closeDatabase();
  fs.rmSync(temp,{recursive:true,force:true});
});
