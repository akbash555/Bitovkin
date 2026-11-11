const digits = value => value.replace(/\D/g, '');
const metrika = document.body.dataset.metrika;
let analyticsEnabled = false;

function track(event) {
  if (analyticsEnabled && typeof window.ym === 'function') window.ym(Number(metrika), 'reachGoal', event);
}

function enableAnalytics() {
  if (analyticsEnabled || !metrika) return;
  analyticsEnabled = true;
  window.ym = function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  const script = document.createElement('script');
  script.src = 'https://mc.yandex.ru/metrika/tag.js';
  script.async = true;
  document.head.append(script);
  window.ym(Number(metrika), 'init', {clickmap:false, trackLinks:false, webvisor:false});
}

if (metrika) {
  const footer = document.querySelector('footer');
  const choice = document.createElement('div');
  choice.className = 'analytics-choice wrap';
  choice.innerHTML = '<p>Статистика посещений</p><button class="button" type="button">Включить</button><button class="button" type="button">Отклонить</button>';
  footer.append(choice);
  const [allow, reject] = choice.querySelectorAll('button');
  let allowed = false;
  try { allowed = localStorage.getItem('bytovkin-analytics') === 'yes'; } catch {}
  if (allowed) enableAnalytics();
  function refresh() {
    allow.hidden = allowed;
    reject.textContent = allowed ? 'Отключить' : 'Отклонить';
    reject.hidden = !allowed && choice.dataset.rejected === 'yes';
  }
  allow.addEventListener('click', () => {
    allowed = true;
    try { localStorage.setItem('bytovkin-analytics','yes'); } catch {}
    enableAnalytics();
    refresh();
  });
  reject.addEventListener('click', () => {
    try { localStorage.setItem('bytovkin-analytics','no'); } catch {}
    if (allowed) location.reload();
    choice.dataset.rejected = 'yes';
    refresh();
  });
  refresh();
}

document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  if (link.getAttribute('href')?.startsWith('tel:')) track('phone_click');
  if (link.hasAttribute('data-cta')) track('cta_click');
});

for (const form of document.querySelectorAll('[data-lead]')) {
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');
  let requestId = '';
  form.addEventListener('input', () => { requestId = ''; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    const values = new FormData(form);
    const number = digits(values.get('phone'));
    const show = (message, error = false) => {
      status.hidden = false;
      status.classList.toggle('error',error);
      status.textContent = message;
    };
    if (number.length !== 10 && !/^[78]\d{10}$/.test(number)) {
      show('Введите российский номер телефона из 10 цифр или в формате +7.',true);
      form.elements.phone.focus();
      return;
    }
    if (values.get('drawing')?.size > 8 * 1024 * 1024) {
      show('Файл превышает 8 МБ.',true);
      return;
    }
    requestId ||= globalThis.crypto?.randomUUID?.() || '';
    values.set('request_id',requestId);
    button.disabled = true;
    show('Сохраняем заявку…');
    try {
      const response = await fetch('/lead',{method:'POST',headers:{Accept:'application/json'},body:values});
      const result = await response.json();
      if (!response.ok || !result.ok) {
        show(result.message || 'Не удалось сохранить заявку. Попробуйте ещё раз.',true);
        return;
      }
      form.reset();
      requestId = '';
      show('Заявка принята. Номер обращения — ' + result.id + '.');
      track('lead_success');
    } catch {
      show('Связь прервалась. Повторите отправку.',true);
    } finally {
      button.disabled = false;
    }
  });
}
