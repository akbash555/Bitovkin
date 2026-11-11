const {showcase,projectList} = require('./showcase.cjs');
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const url = model => `/models/${model.id}.html`;
const price = model => model.price ? `от ${new Intl.NumberFormat('ru-RU').format(model.price)} ₽` : 'Стоимость по запросу';
const button = (label, href, secondary = false) => `<a class="button${secondary ? ' secondary' : ''}" href="${e(href)}" data-cta>${e(label)} <span aria-hidden="true">↗</span></a>`;
const picture = (m, lazy = true) => m.photos?.length
  ? `<img class="product-image" src="${e(m.photos[0])}" alt="${e(m.name)}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`
  : `<div role="img" aria-label="Визуализация: ${e(m.name)}" class="tile tile-${m.tile ?? 15}"></div>`;
const constructorUrl = model => '/constructor.html?model='+encodeURIComponent(model.id);
const experience = (type, models, selected) => {
  const data=models.map(({id,name,tile})=>({id,name,tile}));
  const fallback = type==='hero'
    ? '<img class="experience-poster" src="/assets/architecture.jpg" alt="Концептуальная визуализация современной бытовки" width="1200" height="800" fetchpriority="high">'
    : '<p class="experience-message">Интерактивный 3D-просмотр загружается. Для работы конструктора нужен JavaScript.</p>';
  return `<div data-experience="${type}" data-selected="${e(selected)}" data-models="${e(JSON.stringify(data))}">${fallback}</div>`;
};

function layout({title, description, path, company, site, content, admin = false, noindex = false}) {
  const contact = company.phone ? `<a class="phone" href="tel:${e(company.phone.replace(/[^\d+]/g, ''))}">${e(company.phone)}</a>` : '';
  const logo = company.logo ? `<img src="${e(company.logo)}" alt="БЫТОВКИн" width="145" height="44">` : 'БЫТОВКИн';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(title)} · БЫТОВКИн</title><meta name="description" content="${e(description)}">
  ${site.origin && !admin ? `<link rel="canonical" href="${e(site.origin + path)}">` : ''}
  ${!site.origin || admin || noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
  <link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/assets/architecture.css"><link rel="stylesheet" href="/brand.css"><script src="/assets/site.js" defer></script>
  ${content.includes('data-experience=') ? '<script type="module" src="/assets/experience/main.js"></script>' : ''}</head>
  <body class="${path==='/'?'home':path==='/constructor.html'?'constructor-page':''}" data-metrika="${admin ? '' : site.metrika}"><a class="skip" href="#main">К содержанию</a>
  ${site.demo ? '<div class="demo-note">Локальный тестовый режим. Используйте вымышленные данные.</div>' : ''}
  <header><div class="wrap top"><span>Чебоксары · Собственное производство</span>${contact}</div><nav class="wrap" aria-label="Основная навигация"><a class="wordmark" href="/">${logo}</a><div class="nav-links">
  <a href="/catalog.html">Каталог</a><a href="/constructor.html" class="nav-studio">Конструктор 3D</a><a href="/custom.html">На заказ</a><a href="/production.html">Производство</a><a href="/contacts.html">Контакты</a></div>${button('Заказать звонок','/contacts.html#callback',true)}</nav></header>
  <main id="main">${content}</main><footer><div class="wrap footer"><a class="wordmark" href="/">${logo}</a><div><strong>Производство в Чебоксарах</strong><br>Доставка по Чувашии и соседним регионам</div><div>${contact || '<a href="/contacts.html">Контакты</a>'}<br><a href="/privacy.html">Конфиденциальность</a><br><a href="/consent.html">Согласие на обработку данных</a></div></div></footer></body></html>`;
}

const crumbs = (label, model = false) => `<div class="crumb"><a href="/">Главная</a> / ${model ? '<a href="/catalog.html">Каталог</a> / ' : ''}${e(label)}</div>`;

function lead(site, type, models = [], selected = '', source = '', configured = false) {
  const labels = {callback: 'Заказать звонок', quote: 'Получить расчёт', project: 'Обсудить индивидуальный проект'};
  const modelField = selected
    ? `<input type="hidden" name="model" value="${e(selected)}">`
    : `<label>Модель<select name="model"><option value="">Помогите подобрать</option>${models.map(m => `<option value="${e(m.id)}">${e(m.name)}</option>`).join('')}</select></label>`;
  const maxMB = site.drawingMB || 8;
  return `<form class="lead" action="/lead" method="post" enctype="multipart/form-data" data-lead data-drawing-mb="${maxMB}">
  <input type="hidden" name="type" value="${type}"><input type="hidden" name="source" value="${e(source)}">
  <div class="trap" aria-hidden="true"><label>Сайт<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="form-row"><label>Имя<input name="name" autocomplete="${site.demo ? 'off' : 'given-name'}" maxlength="80" required></label><label>Телефон<input name="phone" type="tel" autocomplete="${site.demo ? 'off' : 'tel'}" placeholder="+7 (___) ___-__-__" maxlength="30" required></label></div>
  ${type === 'quote' ? modelField : ''}${configured?'<input type="hidden" name="configuration" value="">':''}
  ${type !== 'callback' ? `<label>${type === 'project' ? 'Описание задачи' : 'Комментарий (необязательно)'}<textarea name="message" rows="3" maxlength="2500" ${type === 'project' ? 'required' : ''}></textarea></label>` : ''}
  ${type === 'project' ? `<label>Чертёж или ТЗ (необязательно)<input type="file" name="drawing" accept=".pdf,.png,.jpg,.jpeg,.txt"><small>PDF, PNG, JPEG или TXT, до ${maxMB} МБ</small></label>` : ''}
  <label class="check"><input type="checkbox" name="consent" value="yes" required><span>${site.demo ? 'Использую вымышленные данные для тестовой заявки.' : 'Даю <a href="/consent.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a>.'}</span></label>
  ${site.leads ? '' : `<p class="notice">${site.readOnly ? 'Форма доступна для просмотра. Приём заявок включится после подключения базы и настройки документов.' : 'Приём заявок закрыт до настройки документов. Форма доступна для просмотра.'}</p>`}
  <button class="button" type="submit" ${site.leads ? '' : 'disabled'}>${labels[type]} <span aria-hidden="true">↗</span></button>
  <p class="form-status" role="status" aria-live="polite" hidden></p></form>`;
}

function card(m) {
  return `<article class="card" data-category="${e(m.category)}" data-material="${e(m.material)}"><a href="${url(m)}" class="card-image">${picture(m)}${m.demo ? '<span class="picture-label">Демонстрационная модель</span>' : ''}</a>
  <div class="card-body"><span class="overline">${e(m.category)}</span><h3><a href="${url(m)}">${e(m.name)}</a></h3><p>${e(m.description)}</p><p class="spec">${[m.material, m.size].filter(Boolean).map(e).join(' · ') || 'Параметры по проекту'}</p>
  <div class="card-foot"><strong>${price(m)}</strong><a href="${url(m)}#quote" data-cta>Получить расчёт ↗</a></div><div class="card-actions"><a href="${url(m)}#model-3d">Смотреть в 3D</a><a href="${constructorUrl(m)}">В конструктор ↗</a></div></div></article>`;
}
const services = [
  ['Доставка и монтаж', 'Согласуем место разгрузки, подъезд и способ установки.'],
  ['Свайное основание', 'Возможность установки свай обсуждаем по условиям участка.'],
  ['Утепление и отделка', 'Подберём варианты под назначение и сезон эксплуатации.'],
  ['Электромонтаж', 'Уточним количество розеток, освещение и точки подключения.']
];
const features = items => `<div class="features">${items.map(([name, desc]) => `<article><h3>${name}</h3><p>${desc}</p></article>`).join('')}</div>`;
const categories = models => [...new Set(models.map(m => m.category))];
const sections = {
  '/production.html': ['О производстве', 'Производство бытовок в Чебоксарах', 'Изготавливаем бытовки и модульные конструкции с нуля в Чебоксарах. По вашему чертежу согласуем материалы, планировку и оснащение с учётом технических возможностей.', [['Цех металлоконструкций', 'Здесь изготавливаем каркасы модулей.'], ['Сборочные цеха', 'Собираем изделия в закрытых помещениях, защищённых от ветра и осадков.'], ['Комплектация', 'Утепление, электромонтаж и отделка обсуждаются на этапе расчёта.']]],
  '/delivery.html': ['Доставка и установка', 'Доставка и установка бытовок в Чувашии', 'Доставляем по Чувашии и соседним регионам. Доставка по России возможна по индивидуальному согласованию при оплате логистики заказчиком. Для расчёта сообщите населённый пункт, условия подъезда, место разгрузки и установки.', services],
  '/custom.html': ['Индивидуальные проекты', 'Модульные конструкции по вашим чертежам', 'Разрабатываем нестандартные бытовки и модульные конструкции по чертежам и техническому заданию. Возможность изготовления согласуем после изучения проекта.', [['Многоэтажные здания', 'Обсудим размещение блоков, лестницы, планировку и требования к площадке.'], ['Бронированные бытовки', 'Опишите назначение конструкции и требуемые параметры защиты.'], ['Специализированные модули', 'Согласуем проёмы, оборудование, отделку и подвод коммуникаций.']]]
};

function render(path, company, site, models, query) {
  const page = (title, description, content, noindex = false) => layout({ title, description, path, company, site, content, noindex });
  if (path === '/') return page('Бытовки и модульные конструкции в Чебоксарах', 'Производство бытовок и модульных зданий в Чебоксарах. Каталог, 3D-конструктор и изготовление по индивидуальным размерам.', showcase({e,button,card,picture,lead,experience,models,company,site}));
  if (path === '/constructor.html') {
    const selected = models.find(model=>model.id===query.get('model')) || models[0];
    return page('3D-конструктор бытовки', 'Выберите модель, размеры, наружную отделку, окна, дверь и крышу. Сохраните конфигурацию для расчёта.', `
    <section class="wrap section studio-page">${crumbs('Конструктор')}<p class="index-line">ПРОЕКТИРОВАНИЕ</p><h1>Конструктор бытовки</h1><p class="intro">Выберите базовую модель и настройте её размеры, обшивку, проёмы и крышу.</p>
    ${selected ? experience('studio',models,selected.id) : '<p>Модели появятся после обновления каталога.</p>'}</section>
    ${selected ? `<section class="architecture-band" id="configuration-quote"><div class="wrap section split"><div><h2>Получить расчёт моей бытовки</h2><p>Размеры и выбранные параметры будут переданы вместе с заявкой.</p></div>${lead(site,'quote',models,selected.id,path,true)}</div></section>` : ''}`);
  }
  if (path === '/projects.html') return page('Реализованные проекты','Проекты производства БЫТОВКИн.',`
    <section class="wrap section">${crumbs('Проекты')}<h1>Реализованные проекты</h1>${projectList(company,site,e)}</section>
    <section class="architecture-band"><div class="wrap section split"><div><h2>Обсудить свой проект</h2><p>Расскажите о назначении конструкции или приложите техническое задание.</p></div><div>${button('Отправить параметры','/custom.html#project')}</div></div></section>`,!company.factsVerified);
  if (path === '/catalog.html') return page('Каталог бытовок от производителя', 'Строительные, дачные, утеплённые бытовки и блок-контейнеры на заказ в Чувашии. Фильтры по назначению и материалу.', `
  <section class="wrap section catalog-page">${crumbs('Каталог')}<div class="heading-row"><div><p class="index-line">БЫТОВКИ И МОДУЛИ</p><h1>Каталог конструкций</h1></div>${button('Открыть 3D-конструктор','/constructor.html',true)}</div><p class="intro">Ориентир по ассортименту — от 50 000 ₽ до 1 000 000 ₽. Стоимость модели зависит от размеров и комплектации.</p>
  <form class="filters" action="/catalog.html"><label>Поиск<input name="q" value="${e(query.get('q') || '')}" placeholder="Например, блок-контейнер"></label>
  <label>Категория<select name="category"><option value="">Все категории</option>${categories(models).map(c=>`<option ${c===query.get('category') ? 'selected' : ''}>${e(c)}</option>`).join('')}</select></label>
  <label>Материал<select name="material"><option value="">Любой</option>${['Металл','Дерево'].map(c=>`<option ${c===query.get('material') ? 'selected' : ''}>${c}</option>`).join('')}</select></label><button class="button" type="submit">Найти</button><a href="/catalog.html">Сбросить</a></form>
  <p class="notice">Демонстрационные модели показывают возможные конструкции. Размеры в таких карточках приведены как примеры.</p>
  <div class="grid gallery-grid">${models.filter(m => (!query.get('category') || m.category===query.get('category')) && (!query.get('material') || m.material===query.get('material')) && (!query.get('q') || (m.name+' '+m.description).toLowerCase().includes(query.get('q').trim().toLowerCase()))).map(card).join('') || '<p>Модели не найдены. <a href="/catalog.html">Показать все</a></p>'}</div></section>`);
  const model = models.find(m=>url(m)===path);
  if (model) {
    const related = models.filter(m=>m.id!==model.id).sort((a,b)=>Number(b.category===model.category)-Number(a.category===model.category)).slice(0,3);
    return page(model.name + ' в Чебоксарах', model.description, `<div class="wrap">${crumbs(model.name,true)}<section class="product split">
    <div class="gallery"><figure>${picture(model,false)}${model.demo ? '<figcaption>Демонстрационная модель. Параметры уточняются при заказе.</figcaption>' : ''}</figure>
    ${!model.photos?.length && model.demo && Number.isInteger(model.tile) ? `<details class="interior"><summary>Посмотреть пример интерьера</summary><div class="tile tile-${model.tile} tile-interior" role="img" aria-label="Условный интерьер: ${e(model.name)}"></div></details>` : ''}
    ${model.photos?.slice(1).map((src,i)=>`<a href="${e(src)}" target="_blank" rel="noopener"><img src="${e(src)}" alt="${e(model.name)} — вид ${i+2}" loading="lazy"></a>`).join('') || ''}</div>
    <div><p class="overline">${e(model.category)}</p><h1>${e(model.name)}</h1><p class="intro">${e(model.description)}</p><p class="hero-price">${price(model)}</p><div class="actions">${button('Изменить в конструкторе',constructorUrl(model))}${button('Получить расчёт','#quote',true)}</div></div></section>
    <section class="section product-experience" id="model-3d"><div class="heading-row"><div><p class="index-line">ПРОСМОТР МОДЕЛИ</p><h2>Конструкция в 3D</h2></div>${button('Настроить модель',constructorUrl(model),true)}</div>${experience('product',[model],model.id)}</section>
    <section class="section split"><div><h2>Характеристики</h2><dl>${[['Тип',model.category],['Размеры',model.size],['Материал',model.material],['Комплектация',model.equipment],['Утепление',model.insulation],['Индивидуальные изменения',model.changes]].map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value || 'По согласованию')}</dd></div>`).join('')}</dl></div>
    <div><h2>Доставка и оснащение</h2><p>Можно обсудить электромонтаж, внутреннюю отделку, установку и свайное основание. Доставляем по Чувашии и соседним регионам.</p><a href="/delivery.html">Условия доставки ↗</a></div></section></div>
    <section class="band" id="quote"><div class="wrap section split"><div><h2>Запросить расчёт</h2><p>${e(model.name)}</p></div>${lead(site,'quote',models,model.id,path)}</div></section>
    ${related.length ? `<section class="wrap section"><h2>Похожие модели</h2><div class="grid">${related.map(card).join('')}</div></section>` : ''}`);
  }
  if (sections[path]) {
    const [name,title,desc,items] = sections[path];
    return page(title, desc, `<section class="wrap section">${crumbs(name)}<h1>${title}</h1><p class="intro">${desc}</p>${features(items)}</section>
    <section class="band" id="${path==='/custom.html' ? 'project' : 'quote'}"><div class="wrap section split"><div><h2>${path==='/custom.html' ? 'Обсудить индивидуальный проект' : 'Получить расчёт'}</h2><p>${path==='/custom.html' ? 'Укажите назначение, размеры и желаемую комплектацию. При наличии приложите чертёж.' : 'Укажите модель и вопросы, которые нужно уточнить.'}</p></div>${lead(site,path==='/custom.html'?'project':'quote',models,'',path)}</div></section>`);
  }
  if (path==='/contacts.html') return page('Контакты производства в Чебоксарах','Контакты БЫТОВКИн. Закажите обратный звонок и обсудите бытовку или модуль под вашу задачу.',`<section class="wrap section">${crumbs('Контакты')}<h1>Контакты</h1><div class="split"><div><h2>Производство в Чебоксарах</h2><p>Чувашская Республика</p>${company.address ? `<p>${e(company.address)}</p>` : ''}${company.phone ? `<p><a href="tel:${e(company.phone.replace(/[^\d+]/g,''))}">${e(company.phone)}</a></p>` : '<p>Телефон ожидает подтверждения.</p>'}${company.email ? `<p><a href="mailto:${e(company.email)}">${e(company.email)}</a></p>` : ''}<a href="/delivery.html">Доставка и установка ↗</a></div><div id="callback"><h2>Заказать звонок</h2>${lead(site,'callback',[],'',path)}</div></div></section>`);
  if (path==='/privacy.html' || path==='/consent.html') {
    const isPrivacy = path==='/privacy.html';
    const title = isPrivacy ? 'Политика конфиденциальности' : 'Согласие на обработку персональных данных';
    const copy = company[isPrivacy ? 'privacy' : 'consent'];
    return page(title,title,`<section class="wrap section prose">${crumbs(title)}<h1>${title}</h1>
    ${copy ? copy.split(/\n\s*\n/).map(p=>`<p>${e(p)}</p>`).join('') : '<p>Черновик для заполнения оператором. Укажите реквизиты и контакт оператора, цели, состав данных, порядок обработки и отзыва согласия, получателей и сроки хранения.</p><p>Для обработки обращений используются имя, телефон, описание задачи и приложенный файл, если он предоставлен.</p>'}</section>`,!copy);
  }
  return null;
}

module.exports = {e, layout, render, button, url};
