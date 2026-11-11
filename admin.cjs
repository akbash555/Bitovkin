const { e, layout } = require('./views.cjs');

const csrf = token => `<input type="hidden" name="_csrf" value="${token}">`;
const field = (name, label, value = '', options = '') => `<label>${label}<input name="${name}" value="${e(value)}" ${options}></label>`;
const area = (name, label, value = '', max = 3000) => `<label>${label}<textarea name="${name}" rows="3" maxlength="${max}">${e(value)}</textarea></label>`;
const statuses = {new: 'Новая', processing: 'В работе', closed: 'Закрыта'};
const types = {callback: 'Обратный звонок', quote: 'Расчёт стоимости', project: 'Индивидуальный проект'};

function renderAdmin({company, site, token, models, leads, edit, error = ''}) {
  const heading = `<section class="wrap section admin"><h1>Панель управления</h1>${error ? `<p class="error" role="alert">${e(error)}</p>` : ''}`;
  let body;
  if (!token) {
    body = `<form method="post" action="/admin/login" class="lead"><h2>Вход для сотрудников</h2>
    <label>Пароль<input name="password" type="password" autocomplete="current-password" required maxlength="512"></label><button class="button">Войти</button></form>`;
  } else if (edit) {
    body = `<p><a href="/admin">← Панель управления</a></p><h2>${edit.id ? e(edit.name) : 'Новая модель'}</h2>
    <form action="/admin/model" method="post" enctype="multipart/form-data" class="lead">
    ${csrf(token)}<input type="hidden" name="id" value="${e(edit.id)}">
    ${field('name','Название',edit.name,'required maxlength="140"')}${field('category','Категория',edit.category,'required maxlength="80"')}
    <label>Материал<select name="material">${['','Металл','Дерево','Комбинированный'].map(value=>`<option value="${value}" ${edit.material===value?'selected':''}>${value || 'По согласованию'}</option>`).join('')}</select></label>
    ${field('size','Размеры',edit.size,'maxlength="120"')}${field('price','Стартовая цена, ₽',edit.price,'type="number" min="1" max="1000000000" step="1"')}
    ${area('description','Описание',edit.description)}${area('equipment','Комплектация',edit.equipment)}${area('insulation','Утепление',edit.insulation)}${area('changes','Индивидуальные изменения',edit.changes)}
    <label>Добавить фотографии<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple><small>JPEG, PNG или WebP. До 4 МБ на файл, до 5 фотографий в галерее.</small></label>
    ${edit.photos?.map((p,i)=>`<label class="check"><input type="checkbox" name="removePhoto" value="${e(p)}"><img src="${e(p)}" alt="Фото ${i+1}" width="84" height="56"> Удалить фото ${i+1}</label>`).join('') || ''}
    <label class="check"><input type="checkbox" name="visible" ${edit.visible?'checked':''}> Показывать в каталоге</label>
    <label class="check"><input type="checkbox" name="demo" ${edit.demo?'checked':''}> Демонстрационная модель</label>
    <button class="button">Сохранить модель</button></form>`;
  } else {
    body = `<form method="post" action="/admin/logout">${csrf(token)}<button class="button secondary">Выйти</button></form>
    <nav class="admin-links"><a href="#leads">Заявки</a><a href="#models">Модели</a><a href="#company">Контакты и оформление</a></nav>
    <h2 id="leads">Заявки</h2>${leads.length ? `<div class="admin-list">${leads.map(row=>`<article class="admin-item">
    <h3>${types[row.type]} · №${row.id}</h3>
    <p>${e(new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Moscow'}).format(new Date(row.created_at)))} МСК · ${e(row.source)}</p>
    <p><strong>${e(row.name)}</strong> · <a href="tel:${e(row.phone)}">${e(row.phone)}</a></p>
    ${row.model_name ? `<p>Модель: ${e(row.model_name)}</p>` : ''}${row.message ? `<p class="multiline">${e(row.message)}</p>` : ''}
    ${row.attachment_name ? `<a href="/admin/attachment/${row.id}">Скачать ${e(row.attachment_name)}</a>` : ''}
    <form class="status-form" action="/admin/status" method="post">${csrf(token)}<input type="hidden" name="id" value="${row.id}">
    <label>Статус<select name="status">${Object.entries(statuses).map(([key,label])=>`<option value="${key}" ${key===row.status?'selected':''}>${label}</option>`).join('')}</select></label><button class="button secondary">Сохранить</button></form></article>`).join('')}</div>` : '<p>Пока нет заявок.</p>'}
    <h2 id="models">Модели</h2><a class="button" href="/admin/model/new">Добавить модель</a><ul class="models-admin">${models.map(m=>`<li><a href="/admin/model/${e(m.id)}">${e(m.name)}</a> <span>${m.visible?'В каталоге':'Скрыта'}</span></li>`).join('')}</ul>
    <h2 id="company">Контакты и оформление</h2><form action="/admin/company" method="post" enctype="multipart/form-data" class="lead">${csrf(token)}
    ${field('phone','Телефон',company.phone,'type="tel" maxlength="30"')}${field('email','Электронная почта',company.email,'type="email" maxlength="180"')}
    ${field('address','Адрес',company.address,'maxlength="300"')}
    <label>Логотип<input type="file" name="logo" accept="image/jpeg,image/png,image/webp"><small>JPEG, PNG или WebP, до 4 МБ.</small></label>
    ${company.logo ? '<label class="check"><input type="checkbox" name="removeLogo"> Удалить текущий логотип</label>' : ''}
    <div class="form-row">${field('accent','Цвет кнопок',company.accent,'type="color"')}${field('ink','Цвет текста',company.ink,'type="color"')}${field('paper','Цвет фона',company.paper,'type="color"')}</div>
    ${area('privacy','Утверждённая политика конфиденциальности',company.privacy,20000)}${area('consent','Утверждённый текст согласия',company.consent,20000)}
    <button class="button">Сохранить настройки</button></form>`;
  }
  return layout({title:'Панель управления', description:'Доступ для сотрудников БЫТОВКИн',path:'/admin',company,site,admin:true,content:heading+body+'</section>'});
}

module.exports = {renderAdmin, statuses};
