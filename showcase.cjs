const facts = require('./company-facts.json');

function showcase({e,button,card,picture,lead,experience,models,company,site}) {
  const pick = id => models.find(model=>model.id===id);
  const featured = ['garden-panoramic','construction','office'].map(pick).filter(Boolean);
  const complex = pick('multilevel') || pick('armored') || pick('special');
  const heroModel = {id:'featured',name:'Бытовка с комбинированной обшивкой',tile:15};
  const categories = [
    ['garden','Для дачи','Бытовки для участка и отдыха'],
    ['construction','Для стройки','Бытовки для бригад и площадок'],
    ['office','Офисные модули','Рабочие пространства и посты'],
    ['modular','Модульные здания','Сборные и многоэтажные конструкции']
  ];
  return `<section class="hero-shell"><div class="wrap arch-hero">
    <div class="arch-copy">
      <p class="index-line"><span></span> ПРОИЗВОДСТВО · ЧЕБОКСАРЫ</p>
      <h1>Бытовки и<br> модульные<br> конструкции</h1>
      <p class="intro">Проектируем и производим в Чебоксарах. Собираем по вашим размерам, доставляем и устанавливаем.</p>
      <div class="actions">${button('Выбрать бытовку','/catalog.html')}${button('Создать свою в 3D','/constructor.html',true)}</div>
    </div>
    <div class="arch-stage">${experience('hero',[heroModel],heroModel.id)}<div class="arch-caption"><span>Концептуальная модель</span><span>от 50 000 ₽ по ассортименту</span></div></div>
  </div></section>
  <section class="wrap section product-categories">
    <div class="heading-row"><div><p class="index-line">КАТАЛОГ</p><h2>Под вашу задачу</h2></div><a class="arrow-link" href="/catalog.html">Все категории ↗</a></div>
    <div class="category-gallery">${categories.map(([id,category,title])=>{
      const model=pick(id);
      if (!model) return '';
      return `<a class="category-entry" href="/catalog.html?category=${encodeURIComponent(category)}">${picture(model)}<span><small>${e(category)}</small><strong>${e(title)}</strong></span><b aria-hidden="true">↗</b></a>`;
    }).join('')}</div><p class="notice">Концептуальные изображения ассортимента.</p>
  </section>
  <section class="wrap section"><div class="heading-row"><div><p class="index-line">МОДЕЛИ</p><h2>Базовые конструкции</h2></div><a class="arrow-link" href="/constructor.html">Настроить свою ↗</a></div>
  <div class="grid gallery-grid">${featured.map(card).join('')}</div></section>
  <section class="architecture-band"><div class="wrap section">
    <div class="split"><div><p class="index-line">СОБСТВЕННОЕ ПРОИЗВОДСТВО</p><h2>От чертежа<br>до монтажа</h2></div><div><p class="intro">Деревообработка и металлообработка в собственных цехах. Делаем отдельные конструкции и серии модулей под задачи площадки.</p>${button('О производстве','/production.html',true)}</div></div>
    ${company.factsVerified || site.demo ? `<div class="stats">${facts.stats.map(([key,value,label])=>`<div><strong>${e(company.stats?.[key] || value)}</strong><span>${label}</span></div>`).join('')}</div>${company.factsVerified?'':'<p class="notice">Цифры из брифа. Ожидают подтверждения перед публикацией.</p>'}` : ''}
  </div></section>
  <section class="wrap section"><div class="heading-row"><div><p class="index-line">ЧАСТНЫМ И КОМПАНИЯМ</p><h2>Два маршрута к заказу</h2></div></div><div class="audience">
    <article><h3>Для участка</h3><p>Выберите размеры, отделку, окна и дверь. Передайте конфигурацию на расчёт.</p>${button('Собрать в 3D','/constructor.html',true)}</article>
    <article><h3>Для бизнеса</h3><p>Серии, многоэтажные здания, бронированные и специализированные конструкции. Приложите чертёж или ТЗ.</p>${button('Обсудить проект','/custom.html#project',true)}</article>
  </div></section>
  ${complex ? `<section class="wrap section complex-project"><div class="complex-copy"><p class="index-line">ИНДИВИДУАЛЬНОЕ ПРОЕКТИРОВАНИЕ</p><h2>Сложные конструкции</h2><p>Многоэтажные здания, бронированные бытовки и специализированные модули. Изготовление по техническому заданию или чертежам заказчика.</p>${button('Передать параметры','/custom.html#project',true)}</div><figure>${picture(complex)}<figcaption>${e(complex.name)} · ${complex.photos?.length?'изображение модели':'концептуальная визуализация'}</figcaption></figure></section>` : ''}
  ${company.factsVerified || site.demo ? `<section class="wrap section"><div class="heading-row"><h2>Реализованные проекты</h2><a class="arrow-link" href="/projects.html">Список проектов ↗</a></div>${projectList(company,site,e)}</section>` : ''}
  <section class="wrap section"><div class="heading-row"><h2>Доставка и монтаж</h2><a class="arrow-link" href="/delivery.html">Условия ↗</a></div><p class="intro">Чувашия и соседние регионы. По России — по индивидуальному согласованию с оплатой логистики заказчиком. На месте обсудим монтаж и свайное основание.</p></section>
  <section class="architecture-band" id="quote"><div class="wrap section split"><div><p class="index-line">ИНДИВИДУАЛЬНЫЙ ЗАКАЗ</p><h2>Есть идея? Мы поможем превратить её в готовую конструкцию</h2>${button('Обсудить проект','/custom.html#project',true)}</div>${lead(site,'quote',models,'','/')}</div></section>`;
}

function projectList(company,site,e) {
  if (!company.factsVerified && !site.demo) return '<p>Материалы о реализованных проектах появятся после подтверждения компанией.</p>';
  const projects=Array.isArray(company.projects) && company.projects.length ? company.projects : facts.projects;
  return `<ul class="project-list">${projects.map(name=>`<li>${e(name)}</li>`).join('')}</ul>${company.factsVerified?'':'<p class="notice">Сведения из брифа компании. Публикация требует подтверждения.</p>'}`;
}

module.exports={showcase,projectList};
