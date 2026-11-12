import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, MoveUpRight, X } from 'lucide-react'
import Configurator from './constructor/Configurator'
import type { CatalogId } from './constructor/model'
import { catalog, company, heroVideoSrc, projects, statistics } from './data/site'

const links = [
  { label: 'Каталог', href: '#catalog' },
  { label: 'Конструктор', href: '#constructor' },
  { label: 'Проекты', href: '#projects' },
  { label: 'О производстве', href: '#production' },
  { label: 'Контакты', href: '#contacts' },
] as const

function Logo({ light = false }: { light?: boolean }) {
  return <a className={light ? 'logo light' : 'logo'} href="#top" aria-label="БЫТОВКИн — наверх"><span className="logo-mark"><span /> <span /> <span /></span><span>БЫТОВК<span>И</span>н<small>ПРОИЗВОДСТВО МОДУЛЬНЫХ ЗДАНИЙ</small></span></a>
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className="site-header"><div className="header-inner wrap"><Logo /><nav className={open ? 'header-nav open' : 'header-nav'} aria-label="Главная навигация">{links.map(link => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}</nav><div className="header-contact"><span className="phone-placeholder">{company.phone}<small>номер будет добавлен</small></span><a className="button button-red header-button" href="#request">Заказать звонок <ArrowUpRight size={17} /></a></div><button className="mobile-toggle" type="button" onClick={() => setOpen(v => !v)} aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open}>{open ? <X /> : <Menu />}</button></div></header>
}

function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { if (media.matches) videoRef.current?.pause(); else videoRef.current?.play().catch(() => {}) }
    update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update)
  }, [])
  return <section className="hero" id="top" aria-labelledby="hero-title"><div className="hero-media"><img src="/images/workshop-hero.jpg" alt="Иллюстрация работы в производственном цеху" fetchPriority="high" />{heroVideoSrc && <video ref={videoRef} autoPlay muted loop playsInline poster="/images/workshop-hero.jpg" onError={e => { e.currentTarget.style.display = 'none' }} aria-hidden="true"><source src={heroVideoSrc} type="video/mp4" /></video>}</div><div className="hero-shade" /><div className="wrap hero-content"><div className="hero-kicker"><span /> СОБСТВЕННОЕ ПРОИЗВОДСТВО · ЧЕБОКСАРЫ</div><h1 id="hero-title">Бытовки и<br />модульные здания<br /><em>от производителя</em></h1><p>Собственное производство в Чебоксарах. Изготавливаем стандартные и нестандартные конструкции под ваши задачи.</p><div className="hero-actions"><a className="button button-red" href="#catalog">Смотреть каталог <ArrowUpRight size={20} /></a><a className="button button-light-outline" href="#constructor">Создать свою бытовку <ArrowUpRight size={20} /></a></div></div><a href="#constructor" className="hero-scroll">ЛИСТАЙТЕ ВНИЗ <ArrowDown size={17} /></a><div className="hero-index">01 / 09</div></section>
}

function Catalog({ configure }: { configure: (id: CatalogId) => void }) {
  const [active, setActive] = useState<(typeof catalog)[number] | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (active) dialog.current?.showModal(); else dialog.current?.close() }, [active])
  return <section className="section catalog-section" id="catalog" aria-labelledby="catalog-title"><div className="wrap"><div className="section-top"><div><span className="eyebrow"><span className="red-line" /> Готовые решения</span><h2 id="catalog-title">Популярные модели<span className="red-period">.</span></h2></div><p>Выберите отправную точку. Размеры, проёмы и компоновку можно изменить в конструкторе.</p></div><div className="catalog-grid">{catalog.map((item, index) => <article className="product-card" key={item.id}><div className={`product-visual ${item.imageClass}`}><img loading="lazy" src={item.id === 'cottage' ? '/images/cottage.jpg' : item.id === 'site' ? '/images/site-cabin.jpg' : item.id === 'container' ? '/images/modular-cabin.jpg' : '/images/northern-modules.jpg'} alt={`Иллюстрация: ${item.title.toLowerCase()}`} /><span className="image-credit">ИЛЛЮСТРАЦИЯ</span><span className="product-number">0{index + 1}</span></div><div className="product-body"><div className="product-tag">{item.tag}</div><h3>{item.title}</h3><p>{item.description}</p><div className="product-bottom"><strong>Стоимость по запросу</strong><div><button type="button" className="link-button" onClick={() => setActive(item)}>Подробнее <ArrowUpRight size={16} /></button><button type="button" className="mini-red" onClick={() => configure(item.id)}>Настроить <ArrowRight size={16} /></button></div></div></div></article>)}</div></div><dialog ref={dialog} className="detail-dialog" onClose={() => setActive(null)}><button className="dialog-close" type="button" onClick={() => setActive(null)} aria-label="Закрыть"><X /></button>{active && <><div className="detail-visual"><img src={active.id === 'cottage' ? '/images/cottage.jpg' : active.id === 'site' ? '/images/site-cabin.jpg' : active.id === 'container' ? '/images/modular-cabin.jpg' : '/images/northern-modules.jpg'} alt={`Иллюстрация: ${active.title}`} /><span>ИЛЛЮСТРАЦИЯ</span></div><div className="detail-copy"><span className="eyebrow">МОДЕЛЬ / {active.tag.toUpperCase()}</span><h3>{active.title}</h3><p>{active.description}</p><p>{active.details}</p><p className="detail-disclaimer">Габариты и стоимость уточняются после выбора конфигурации.</p><button className="button button-red" type="button" onClick={() => { setActive(null); configure(active.id) }}>Настроить модель <ArrowUpRight size={18} /></button></div></>}</dialog></section>
}

function Production() {
  return <section className="section production-section" id="production" aria-labelledby="production-title"><div className="wrap"><div className="section-top"><div><span className="eyebrow"><span className="red-line" /> Производство</span><h2 id="production-title">От чертежа<br /><em>до готового объекта.</em></h2></div><p>Мы производим бытовки и модульные конструкции с нуля в Чебоксарах — от обработки материалов до сборки и доставки.</p></div><div className="production-layout"><div className="production-photo"><img loading="lazy" src="/images/production.jpg" alt="Иллюстрация производственного процесса в цеху" /><span className="image-credit">ИЛЛЮСТРАЦИЯ ПРОИЗВОДСТВА</span></div><div className="production-feature"><span>01 / СОБСТВЕННЫЕ ЦЕХА</span><h3>Производство<br />под контролем<br />на каждом этапе</h3><p>Деревообрабатывающие и металлообрабатывающие цеха позволяют работать со стандартными и сложными нестандартными конструкциями.</p><div className="production-mini"><span>РУЧНАЯ РАБОТА</span><span>КОНТРОЛЬ КАЧЕСТВА</span></div></div></div><div className="production-strip"><div><b>01</b><span>Индивидуальные чертежи</span></div><div><b>02</b><span>Изготовление элементов</span></div><div><b>03</b><span>Сборка и проверка</span></div><div><b>04</b><span>Доставка и монтаж</span></div></div></div></section>
}

function RequestForm() {
  const [submitted, setSubmitted] = useState(false)
  return <section className="request-section" id="request" aria-labelledby="request-title"><div className="wrap request-layout"><div className="request-copy"><span className="eyebrow light-eyebrow"><span className="red-line" /> Обсудим ваш проект</span><h2 id="request-title">Рассчитаем стоимость бытовки <em>под ваши задачи</em></h2><p>Расскажите, какая конструкция вам нужна. После подключения приёма заявок менеджер сможет рассчитать стоимость и обсудить детали.</p><span className="request-decoration">БЫТОВКИн / ПРОИЗВОДСТВО</span></div><form className="request-form" onSubmit={e => { e.preventDefault(); setSubmitted(true) }}><div className="form-top"><span>ЗАЯВКА НА РАСЧЁТ</span><span>ДЕМО-РЕЖИМ</span></div><label>Ваше имя<input name="name" autoComplete="name" required placeholder="Как к вам обращаться" onChange={() => setSubmitted(false)} /></label><label>Телефон<input name="phone" type="tel" autoComplete="tel" required placeholder="Номер для связи" onChange={() => setSubmitted(false)} /></label><label>Комментарий<textarea name="comment" rows={3} placeholder="Размеры, назначение, пожелания" onChange={() => setSubmitted(false)} /></label><button className="button button-red" type="submit">Отправить заявку <ArrowUpRight size={18} /></button><p className="form-legal">Демонстрационная форма. Отправка менеджеру пока не подключена. Место для ссылки на политику обработки персональных данных.</p>{submitted && <p className="form-result" role="status"><Check size={18} /> Форма проверена, но заявка не отправлена менеджеру. Данные остались только на этой странице.</p>}</form></div></section>
}

function Projects() {
  const images = ['/images/pavilion.jpg', '/images/northern-modules.jpg', '/images/modular-cabin.jpg', '/images/cottage.jpg', '/images/site-cabin.jpg']
  return <section className="section projects-section" id="projects" aria-labelledby="projects-title"><div className="wrap"><div className="section-top"><div><span className="eyebrow"><span className="red-line" /> География работ</span><h2 id="projects-title">Реализованные проекты<span className="red-period">.</span></h2></div><p>Проекты, упомянутые в исходных материалах. Изображения ниже — иллюстрации, реальные фотографии будут добавлены после согласования.</p></div><div className="projects-grid">{projects.map((project, i) => <article className={`project-card project-${i + 1}`} key={project.title}><img loading="lazy" src={images[i]} alt={`Иллюстрация для проекта «${project.title}»`} /><span className="image-credit">ИЛЛЮСТРАЦИЯ</span><div className="project-caption"><span>{project.place}</span><h3>{project.title}</h3></div></article>)}</div></div></section>
}

function Trust() {
  return <section className="section trust-section" aria-labelledby="trust-title"><div className="wrap"><div className="trust-intro"><span className="eyebrow"><span className="red-line" /> Цифры компании</span><h2 id="trust-title">Почему нам<br /><em>доверяют</em></h2><p>Опыт производства и масштаб работы — в цифрах из исходного брифа.</p></div><div className="stats-grid">{statistics.map((stat, i) => <div className="stat" key={stat.label}><span>0{i + 1}</span><strong>{stat.value}<small>{stat.suffix}</small></strong><p>{stat.label}</p></div>)}</div><p className="stats-note">Показатели требуют проверки актуальности перед публичным запуском.</p></div></section>
}

const advantages = [
  { no: '01', title: 'Собственное производство', text: 'Деревообработка и металлообработка в собственных цехах.' },
  { no: '02', title: 'Индивидуальные решения', text: 'Изготовление по чертежам и задачам конкретного заказчика.' },
  { no: '03', title: 'Контроль качества', text: 'Проверка конструкции на этапах производства и сборки.' },
  { no: '04', title: 'Сложные конструкции', text: 'Работа с нестандартными и многоэтажными модульными решениями.' },
  { no: '05', title: 'Собственная доставка', text: 'Логистика по Чувашии, соседним регионам и по согласованию — России.' },
  { no: '06', title: 'Монтаж на месте', text: 'Доставка, монтаж конструкций и установка свай.' },
]

function Advantages() {
  return <section className="section advantages-section" aria-labelledby="advantages-title"><div className="wrap advantages-layout"><div className="advantages-heading"><span className="eyebrow"><span className="red-line" /> Возможности компании</span><h2 id="advantages-title">Сделаем<br />сложное <em>понятным.</em></h2><p>От первой схемы до установки на участке — основные этапы остаются внутри одной производственной команды.</p><a className="button button-dark" href="#request">Обсудить проект <ArrowUpRight size={19} /></a></div><div className="advantages-list">{advantages.map(item => <div key={item.no} className="advantage-row"><span>{item.no}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><MoveUpRight size={19} /></div>)}</div></div></section>
}

function Contacts() {
  return <><section className="contacts-section" id="contacts" aria-labelledby="contacts-title"><div className="wrap contacts-layout"><div className="contacts-copy"><span className="eyebrow light-eyebrow"><span className="red-line" /> На связи</span><h2 id="contacts-title">Давайте обсудим<br /><em>ваш проект</em></h2><p>Производство в Чебоксарах. Работаем по Чувашии и соседним регионам, доставку по России согласуем отдельно.</p><div className="contact-list"><div><span>ТЕЛЕФОН</span><strong>{company.phone}</strong><small>Контакт будет добавлен после подтверждения</small></div><div><span>МЕССЕНДЖЕРЫ</span><strong>WhatsApp · Telegram</strong><small>{company.whatsapp}; {company.telegram}</small></div><div><span>АДРЕС ПРОИЗВОДСТВА</span><strong>{company.city}, {company.region}</strong><small>{company.address}</small></div><div><span>РЕЖИМ РАБОТЫ</span><strong>{company.hours}</strong></div></div><a className="button button-red" href="#request">Оставить заявку <ArrowUpRight size={18} /></a></div><div className="map-card"><div className="map-heading"><span>КАРТА / ЧЕБОКСАРЫ</span><span>ТОЧНЫЙ АДРЕС УТОЧНЯЕТСЯ</span></div><iframe title="Интерактивная карта Чебоксар без отметки производства" src="https://www.openstreetmap.org/export/embed.html?bbox=47.18%2C56.07%2C47.37%2C56.19&layer=mapnik" loading="lazy" referrerPolicy="no-referrer" /><div className="map-bottom"><span>Чебоксары, Чувашская Республика</span><ChevronDown size={18} /></div></div></div></section><footer className="footer"><div className="wrap"><div className="footer-main"><Logo light /><nav aria-label="Навигация в подвале">{links.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}</nav><div><strong>{company.phone}</strong><small>Редактируемый контакт</small></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {company.name}. Все права защищены.</span><span>Место для юридической информации и политики обработки данных</span><a href="#top">Наверх ↑</a></div></div></footer></>
}

function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nodes = document.querySelectorAll<HTMLElement>('.section-top, .product-card, .production-layout, .production-strip, .project-card, .stat, .advantage-row')
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target) } }), { threshold: 0.08 })
    nodes.forEach(node => { node.classList.add('reveal'); observer.observe(node) })
    return () => observer.disconnect()
  }, [])
  return null
}

export default function App() {
  const [preset, setPreset] = useState<{ id: CatalogId; token: number }>({ id: 'cottage', token: 0 })
  const configure = (id: CatalogId) => { setPreset(prev => ({ id, token: prev.token + 1 })); document.getElementById('constructor')?.scrollIntoView({ behavior: 'smooth' }) }
  return <><RevealObserver /><Header /><main><Hero /><Configurator preset={preset} /><Catalog configure={configure} /><Production /><RequestForm /><Projects /><Trust /><Advantages /><Contacts /></main></>
}
