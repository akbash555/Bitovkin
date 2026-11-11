const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const url = model => `/models/${model.id}.html`;
const price = model => model.price ? `от ${new Intl.NumberFormat('ru-RU').format(model.price)} ₽` : 'Цена по запросу';
const button = (label, href, secondary = false) => `<a class="button${secondary ? ' secondary' : ''}" href="${e(href)}" data-cta>${e(label)} <span aria-hidden="true">↗</span></a>`;
const picture = (m, lazy = true) => m.photos?.length
  ? `<img class="product-image" src="${e(m.photos[0])}" alt="${e(m.name)}" ${lazy ? 'loading="lazy"' : ''} decoding="async">`
  : `<div role="img" aria-label="Визуализация: ${e(m.name)}" class="tile tile-${m.tile ?? 15}"></div>`;

function layout({title, description, path, company, site, content, admin = false, noindex = false}) {
  const contact = company.phone ? `<a class="phone" href="tel:${e(company.phone.replace(/[^\d+]/g, ''))}">${e(company.phone)}</a>` : '';
  const logo = company.logo ? `<img src="${e(company.logo)}" alt="БЫТОВКИн" width="145" height="44">` : 'БЫТОВКИн';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(title)} · БЫТОВКИн</title><meta name="description" content="${e(description)}">
  ${site.origin && !admin ? `<link rel="canonical" href="${e(site.origin + path)}">` : ''}
  ${!site.origin || admin || noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
  <link rel="stylesheet" href="/assets/style.css"><link rel="stylesheet" href="/brand.css"><script src="/assets/site.js" defer></script></head>
  <body data-metrika="${admin ? '' : site.metrika}"><a class="skip" href="#main">К содержанию</a>
  ${site.demo ? '<div class="demo-note">Локальный тестовый режим. Используйте вымышленные данные.</div>' : ''}
  <header><div class="wrap top"><span>Чебоксары · Собственное производство</span>${contact}</div><nav class="wrap" aria-label="Основная навигация"><a class="wordmark" href="/">${logo}</a><div class="nav-links">
  <a href="/catalog.html">Каталог</a><a href="/custom.html">На заказ</a><a href="/production.html">Производство</a><a href="/delivery.html">Доставка</a><a href="/contacts.html">Контакты</a></div>${button('Заказать звонок','/contacts.html#callback',true)}</nav></header>
  <main id="main">${content}</main><footer><div class="wrap footer"><a class="wordmark" href="/">${logo}</a><div><strong>Производство в Чебоксарах</strong><br>Доставка по Чувашии и соседним регионам</div><div>${contact || '<a href="/contacts.html">Контакты</a>'}<br><a href="/privacy.html">Конфиденциальность</a><br><a href="/consent.html">Согласие на обработку данных</a></div></div></footer></body></html>`;
}

const crumbs = (label, model = false) => `<div class="crumb"><a href="/">Главная</a> / ${model ? '<a href="/catalog.html">Каталог</a> / ' : ''}${e(label)}</div>`;

function lead(site, type, models = [], selected = '', source = '') {
  const labels = {callback: 'Заказать звонок', quote: 'Получить расчёт', project: 'Обсудить индивидуальный проект'};
  const modelField = selected
    ? `<input type="hidden" name="model" value="${e(selected)}">`
    : `<label>Модель<select name="model"><option value="">Помогите подобрать</option>${models.map(m => `<option value="${e(m.id)}">${e(m.name)}</option>`).join('')}</select></label>`;
  return `<form class="lead" action="/lead" method="post" enctype="multipart/form-data" data-lead>
  <input type="hidden" name="type" value="${type}"><input type="hidden" name="source" value="${e(source)}">
  <div class="trap" aria-hidden="true"><label>Сайт<input name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="form-row"><label>Имя<input name="name" autocomplete="${site.demo ? 'off' : 'given-name'}" maxlength="80" required></label><label>Телефон<input name="phone" type="tel" autocomplete="${site.demo ? 'off' : 'tel'}" placeholder="+7 (___) ___-__-__" maxlength="30" required></label></div>
  ${type === 'quote' ? modelField : ''}
  ${type !== 'callback' ? `<label>${type === 'project' ? 'Описание задачи' : 'Комментарий (необязательно)'}<textarea name="message" rows="3" maxlength="2500" ${type === 'project' ? 'required' : ''}></textarea></label>` : ''}
  ${type === 'project' ? '<label>Чертёж или ТЗ (необязательно)<input type="file" name="drawing" accept=".pdf,.png,.jpg,.jpeg,.txt"><small>PDF, PNG, JPEG или TXT, до 8 МБ</small></label>' : ''}
  <label class="check"><input type="checkbox" name="consent" value="yes" required><span>${site.demo ? 'Использую вымышленные данные для тестовой заявки.' : 'Даю <a href="/consent.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a>.'}</span></label>
  ${site.leads ? '' : '<p class="notice">Приём заявок закрыт до настройки документов. Форма доступна для просмотра.</p>'}
  <button class="button" type="submit" ${site.leads ? '' : 'disabled'}>${labels[type]} <span aria-hidden="true">↗</span></button>
  <p class="form-status" role="status" aria-live="polite" hidden></p></form>`;
}

function card(m) {
  return `<article class="card" data-category="${e(m.category)}" data-material="${e(m.material)}"><a href="${url(m)}" class="card-image">${picture(m)}${m.demo ? '<span class="picture-label">Демонстрационная модель</span>' : ''}</a>
  <div class="card-body"><span class="overline">${e(m.category)}</span><h3><a href="${url(m)}">${e(m.name)}</a></h3><p>${e(m.description)}</p><p class="spec">${[m.material, m.size].filter(Boolean).map(e).join(' · ') || 'Параметры по проекту'}</p>
  <div class="card-foot"><strong>${price(m)}</strong><a href="${url(m)}#quote" data-cta>Получить расчёт ↗</a></div></div></article>`;
}
const services = [
  ['Доставка и монтаж', 'Согласуем место разгрузки, подъезд и способ установки.'],
  ['Свайное основание', 'Возможность установки свай обсуждаем по условиям участка.'],
  ['Утепление и отделка', 'Подберём варианты под назначение и сезон эксплуатации.'],
  ['Электромонтаж', 'Уточним количество розеток, освещение и точки подключения.']
];
const steps = [['Расскажите о задаче', 'Выберите модель или отправьте параметры проекта.'], ['Согласуем расчёт', 'Уточним размеры, комплектацию, стоимость и сроки.'], ['Изготовим и установим', 'Согласуем доставку, разгрузку и монтаж на участке.']];
const features = items => `<div class="features">${items.map(([name, desc]) => `<article><h3>${name}</h3><p>${desc}</p></article>`).join('')}</div>`;
const categories = models => [...new Set(models.map(m => m.category))];
const sections = {
  '/production.html': ['О производстве', 'Производство бытовок в Чебоксарах', 'Изготавливаем бытовки и модульные конструкции с нуля в Чебоксарах. По вашему чертежу согласуем материалы, планировку и оснащение с учётом технических возможностей.', [['Производство под заказ', 'Проектируем конструкцию под назначение помещения и условия установки.'], ['Комплектация', 'Утепление, электромонтаж и отделка обсуждаются на этапе расчёта.'], ['Гарантия', 'Условия гарантии согласовываются при оформлении заказа.']]],
  '/delivery.html': ['Доставка и установка', 'Доставка и установка бытовок в Чувашии', 'Доставляем по Чувашии и соседним регионам. Для расчёта сообщите населённый пункт, условия подъезда, место разгрузки и установки.', services],
  '/custom.html': ['Индивидуальные проекты', 'Модульные конструкции по вашим чертежам', 'Разрабатываем нестандартные бытовки и модульные конструкции по чертежам и техническому заданию. Возможность изготовления согласуем после изучения проекта.', [['Многоэтажные здания', 'Обсудим размещение блоков, лестницы, планировку и требования к площадке.'], ['Бронированные бытовки', 'Опишите назначение конструкции и требуемые параметры защиты.'], ['Специализированные модули', 'Согласуем проёмы, оборудование, отделку и подвод коммуникаций.']]]
};

function render(path, company, site, models, query) {
  const page = (title, description, content, noindex = false) => layout({ title, description, path, company, site, content, noindex });
  if (path === '/') return page('Бытовки и модульные конструкции в Чебоксарах', 'Изготовление бытовок и модульных зданий на заказ в Чебоксарах. Доставка, установка и монтаж свай в Чувашии и соседних регионах.', `
  <section class="hero wrap"><div><p class="overline">Чебоксары и соседние регионы</p><h1>Бытовки и модульные конструкции от производителя в Чебоксарах</h1><p class="intro">Производим с нуля по вашим размерам или чертежам. Доставляем и устанавливаем на участке.</p><p class="hero-price">от 50 000 ₽ <small>Ориентир для ассортимента</small></p><div class="actions">${button('Рассчитать стоимость','#quote')}${button('Смотреть каталог','/catalog.html',true)}</div></div>
  <figure class="hero-visual"><img src="/assets/hero.jpg" alt="Визуализация современной бытовки с деревянной отделкой" fetchpriority="high" width="1200" height="800"><figcaption>Визуализация конструкции</figcaption></figure></section>
  <section class="wrap section"><h2>Категории бытовок</h2><div class="chips">${categories(models).map(c => `<a href="/catalog.html?category=${encodeURIComponent(c)}">${e(c)} ↗</a>`).join('')}</div></section>
  <section class="wrap section"><div class="section-head"><h2>Модели для стройки, дачи и бизнеса</h2><a href="/catalog.html">Все модели ↗</a></div><div class="grid">${['construction','garden','container'].map(id=>models.find(m=>m.id===id)).filter(Boolean).map(card).join('')}</div></section>
  <section class="band"><div class="wrap section"><h2>Собственное производство</h2>${features([['По вашим размерам','Согласуем конструкцию и планировку для участка и назначения помещения.'],['Изготовление с нуля','Сроки производства зависят от состава работ и согласовываются при расчёте.'],['Гарантия на продукцию','Условия гарантии уточняются при оформлении заказа.']])}</div></section>
  <section class="wrap section project"><div><h2>Есть чертёж или нестандартная задача?</h2><p class="intro">Обсудим многоэтажные модули, бронированные бытовки и конструкции под ваше техническое задание.</p>${button('Обсудить проект','/custom.html#project')}</div>${picture(models.find(m=>m.id==='multilevel') || {tile:13,name:'Двухэтажное модульное здание'})}</section>
  <section class="wrap section"><h2>Услуги</h2>${features(services)}</section>
  <section class="wrap section"><h2>От заявки до установки</h2>${features(steps)}</section>
  <section class="wrap section faq"><h2>Частые вопросы</h2>
  <details><summary>От чего зависит цена бытовки?</summary><p>От размеров, материалов, планировки и оснащения. Доставку и монтаж рассчитываем с учётом адреса и условий участка.</p></details>
  <details><summary>Можно ли изготовить бытовку по моему чертежу?</summary><p>Да. Прикрепите чертёж или ТЗ в <a href="/custom.html#project">форме индивидуального проекта</a>. Мы уточним возможность изготовления и состав работ.</p></details>
  <details><summary>Как выбрать утепление?</summary><p>Сообщите, в какие сезоны будет использоваться бытовка и какое помещение нужно. Вариант утепления согласуем при расчёте.</p></details></section>
  <section class="band" id="quote"><div class="wrap section split"><div><h2>Рассчитать стоимость</h2><p>Выберите модель и укажите, что нужно для вашего участка или объекта.</p></div>${lead(site,'quote',models,'','/')}</div></section>
  <section class="wrap section split"><div><h2>Чебоксары, Чувашская Республика</h2><p>Доставка по Чувашии и соседним регионам.</p></div><div>${button('Связаться с нами','/contacts.html',true)}</div></section>`);
  if (path === '/catalog.html') return page('Каталог бытовок от производителя', 'Строительные, дачные, утеплённые бытовки и блок-контейнеры на заказ в Чувашии. Фильтры по назначению и материалу.', `
  <section class="wrap section">${crumbs('Каталог')}<h1>Каталог бытовок</h1><p class="intro">Бытовки и модули от 50 000 ₽ по ассортименту. Стоимость модели зависит от размеров и комплектации.</p>
  <form class="filters" action="/catalog.html"><label>Поиск<input name="q" value="${e(query.get('q') || '')}" placeholder="Например, блок-контейнер"></label>
  <label>Категория<select name="category"><option value="">Все категории</option>${categories(models).map(c=>`<option ${c===query.get('category') ? 'selected' : ''}>${e(c)}</option>`).join('')}</select></label>
  <label>Материал<select name="material"><option value="">Любой</option>${['Металл','Дерево'].map(c=>`<option ${c===query.get('material') ? 'selected' : ''}>${c}</option>`).join('')}</select></label><button class="button" type="submit">Найти</button><a href="/catalog.html">Сбросить</a></form>
  <p class="notice">Демонстрационные модели показывают возможные конструкции. Размеры в таких карточках приведены как примеры.</p>
  <div class="grid">${models.filter(m => (!query.get('category') || m.category===query.get('category')) && (!query.get('material') || m.material===query.get('material')) && (!query.get('q') || (m.name+' '+m.description).toLowerCase().includes(query.get('q').trim().toLowerCase()))).map(card).join('') || '<p>Модели не найдены. <a href="/catalog.html">Показать все</a></p>'}</div></section>`);
  const model = models.find(m=>url(m)===path);
  if (model) {
    const related = models.filter(m=>m.id!==model.id).sort((a,b)=>Number(b.category===model.category)-Number(a.category===model.category)).slice(0,3);
    return page(model.name + ' в Чебоксарах', model.description, `<div class="wrap">${crumbs(model.name,true)}<section class="product split">
    <div class="gallery"><figure>${picture(model,false)}${model.demo ? '<figcaption>Демонстрационная модель. Параметры уточняются при заказе.</figcaption>' : ''}</figure>
    ${!model.photos?.length && model.demo && Number.isInteger(model.tile) ? `<details class="interior"><summary>Посмотреть пример интерьера</summary><div class="tile tile-${model.tile} tile-interior" role="img" aria-label="Условный интерьер: ${e(model.name)}"></div></details>` : ''}
    ${model.photos?.slice(1).map((src,i)=>`<a href="${e(src)}" target="_blank" rel="noopener"><img src="${e(src)}" alt="${e(model.name)} — вид ${i+2}" loading="lazy"></a>`).join('') || ''}</div>
    <div><p class="overline">${e(model.category)}</p><h1>${e(model.name)}</h1><p class="intro">${e(model.description)}</p><p class="hero-price">${price(model)}</p>${button('Получить расчёт','#quote')}</div></section>
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
