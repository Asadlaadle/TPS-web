import './styles.css';
import './demo.css';
import './preview.css';
import DOMPurify from 'dompurify';
import { DEMO_ACCESS_PATH, DEMO_INFORMATION_PATH, getPageMetadata, isSensitiveDestination, normalizeCmsHeadings, sanitizeCmsHtml } from './seo.js';

const appRoot = document.querySelector('#app-content');
const header = document.querySelector('.site-header');
const navPanel = document.querySelector('#navigation-panel');
const navGroups = document.querySelector('#navigation-groups');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cache = new Map();
let localSnapshot;
const feedRoutes = { menu: 'menu/header', allMenu: 'menu', settings: 'settings', achievements: 'ACHEIVEMENTS', news: 'NEWS', highlights: 'Highlights', features: 'SchoolFeature', events: 'OurUpcomingEvents', gallery: 'gallery/30' };

const titleCase = (value = '') => value.trim().toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
const cleanText = (value = '') => value == null ? '' : new DOMParser().parseFromString(String(value), 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
const mediaUrl = (path) => {
  const source = String(path || '').toLowerCase();
  if (/sport|athlet|field|event|play/.test(source)) return '/assets/school/sports-ground-wide.webp';
  if (/lab|science/.test(source)) return '/assets/school/laboratory.webp';
  return '/assets/school/classroom.webp';
};
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const routeFor = (item) => {
  const slug = item.linkname || item.slug || '';
  if (!slug || ['#', '-','javascript:;'].includes(slug)) return '/#directory';
  if (/^https?:\/\//i.test(slug)) return slug;
  return slug === '/' ? '/' : `/page/${slug.replace(/^\//, '')}/`;
};
const safeLinkAttrs = (href) => /^https?:\/\//i.test(href) ? ' target="_blank" rel="noreferrer"' : '';
const fallbackImageSrc = '/assets/school/classroom.webp';
const fallbackImageMarkup = '';

function bindImageFallbacks(container) {
  if (!container) return;
  for (const image of container.querySelectorAll('img')) {
    if (!image || image.dataset.fallbackBound === 'true') continue;
    image.dataset.fallbackBound = 'true';
    if (image.getAttribute('src')?.startsWith('/assets/school/')) {
      image.alt = `Representative CC0 stock image, not a photograph of the school: ${image.alt}`;
    }
    const applyFallback = () => {
      if (image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';
      image.onerror = null;
      image.src = fallbackImageSrc;
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
    };
    image.addEventListener('error', applyFallback, { once: true });
    image.addEventListener('load', () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) applyFallback();
    }, { once: true });
    window.setTimeout(() => {
      if (image.dataset.fallbackApplied === 'true') return;
      const src = image.currentSrc || image.src || '';
      const remoteImage = /^https?:\/\//i.test(src) && /schoolaxis|cloudcampus/i.test(src);
      if (remoteImage && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)) {
        applyFallback();
      }
    }, 2000);
    if (image.complete && (image.naturalWidth === 0 || image.naturalHeight === 0)) {
      applyFallback();
    }
  }
}

function updateDocumentMetadata(page, slug) {
  const metadata = getPageMetadata(page, slug);
  document.title = metadata.title;
  document.querySelector('#seo-description').content = metadata.description;
  document.querySelector('#seo-canonical').href = metadata.canonical;
  document.querySelector('#seo-og-title').content = metadata.title;
  document.querySelector('#seo-og-description').content = metadata.description;
  document.querySelector('#seo-og-url').content = metadata.canonical;
  document.querySelector('#seo-og-image').content = metadata.image;
  document.querySelector('#seo-twitter-title').content = metadata.title;
  document.querySelector('#seo-twitter-description').content = metadata.description;
  document.querySelector('#seo-twitter-image').content = metadata.image;
}

async function api(path) {
  if (cache.has(path)) return cache.get(path);
  if (!localSnapshot) {
    const response = await fetch('/data/site-content.json', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Local school preview content unavailable (${response.status})`);
    localSnapshot = await response.json();
  }
  const data = localSnapshot[path];
  if (data === undefined) throw new Error(`Local preview content is missing: ${path}`);
  cache.set(path, data);
  return data;
}

async function loadFeeds() {
  const entries = await Promise.all(Object.entries(feedRoutes).map(async ([key, path]) => {
    try { return [key, await api(path)]; } catch { return [key, []]; }
  }));
  return Object.fromEntries(entries);
}

function groupMenu(headerMenu = [], completeMenu = []) {
  const groups = [];
  const addGroup = (heading) => {
    const label = titleCase(heading || 'School');
    let group = groups.find((item) => item.heading === label);
    if (!group) { group = { heading: label, links: [] }; groups.push(group); }
    return group;
  };
  const addLink = (group, item) => {
    if (item?.heading && item.linkname && item.linkname !== '/' && !groups.some((entry) => entry.links.some((link) => link.linkname === item.linkname))) group.links.push(item);
  };
  const rootIds = new Map();
  for (const item of headerMenu) {
    const group = addGroup(item.heading === 'Home' ? 'School' : item.heading);
    rootIds.set(item.id, group);
    if (item.menus?.length) addLink(group, item);
    for (const child of item.menus || []) addLink(group, child);
    if (!item.menus?.length && item.heading !== 'Home') addLink(group, item);
  }
  const allById = new Map(completeMenu.map((item) => [item.id, item]));
  const parentIds = new Set(headerMenu.filter((item) => item.menus?.length).map((item) => item.id));
  for (const item of completeMenu) {
    if (!item.heading || !item.linkname || item.linkname === '/') continue;
    if (parentIds.has(item.id)) continue;
    if (groups.some((group) => group.links.some((link) => link.linkname === item.linkname))) continue;
    let parent = item;
    let group;
    const visited = new Set();
    while (parent?.underof && !visited.has(parent.id)) {
      visited.add(parent.id);
      group = rootIds.get(parent.underof);
      if (group) break;
      parent = allById.get(parent.underof);
    }
    const name = `${item.heading} ${item.linkname}`.toLowerCase();
    group ||= addGroup(/admission|fee|book list|certificate/.test(name) ? 'Admissions' : /academic|result|curriculum|examination/.test(name) ? 'Academic' : /sports|music|laboratory|library|computer|transport|swimming|infrastructure|campus/.test(name) ? 'Campus & activities' : /student|alumni|download/.test(name) ? 'Student life' : 'School');
    addLink(group, item);
  }
  const additions = [
    ['Academic', 'Academic Overview', 'academic-calendar'], ['Academic', 'CBSE results', 'result'],
    ['Admissions', 'Fee structure', 'admission-overview'], ['Admissions', 'Transfer certificate', 'transfer-certificate'],
    ['Campus & activities', 'Gallery', 'gallery'], ['School', 'Contact us', 'contact-us'],
  ];
  for (const [groupName, heading, linkname] of additions) addLink(addGroup(groupName), { heading, linkname });
  return groups.filter((group) => group.links.length);
}

function renderNavigation(headerMenu = [], completeMenu = []) {
  navGroups.innerHTML = groupMenu(headerMenu, completeMenu).map((group) => `
    <section class="nav-group" aria-label="${escapeHtml(group.heading)}"><h2>${escapeHtml(group.heading)}</h2>
      <ul>${group.links.map((item) => { const href = routeFor(item); const label = titleCase(item.heading); const protectedHref = isSensitiveDestination(href, label) ? DEMO_ACCESS_PATH : href; return `<li><a href="${escapeHtml(protectedHref)}"${safeLinkAttrs(protectedHref)}>${escapeHtml(label)}</a></li>`; }).join('')}</ul>
    </section>`).join('');
}

function sectionHeading(label, heading, description = '', href = '') {
  return `<div class="section-heading"><div><span class="section-label">${escapeHtml(label)}</span><h2>${escapeHtml(heading)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div>${href ? `<a class="text-link" href="${escapeHtml(href)}">Explore all <span aria-hidden="true">→</span></a>` : ''}</div>`;
}

function renderHome(feeds) {
  const highlights = feeds.highlights || [];
  const news = feeds.news || [];
  const stats = feeds.achievements || [];
  const features = feeds.features || [];
  const events = feeds.events || [];
  const gallery = feeds.gallery || [];
  const photo = (image, alt, className = '') => image ? `<img class="${className}" src="${escapeHtml(mediaUrl(image))}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${fallbackImageMarkup}>` : '';
  appRoot.innerHTML = `
    <section class="home-hero" aria-labelledby="home-title"><div class="hero-copy"><span class="hero-kicker">Independent website preview</span><h1 id="home-title">A strong start.<br>Room to become.</h1><p>Thoughtful teaching, a lively campus and the confidence to take learning beyond the classroom.</p><div class="hero-actions"><a class="hero-primary" href="/page/admission-enquiry">Explore admissions <span aria-hidden="true">↗</span></a><a class="hero-secondary" href="/page/about-school">About this preview</a></div></div><div class="hero-image"><img class="parallax-image" src="/assets/school/classroom.webp" alt="Representative CC0 stock image, not a photograph of the school: empty classroom" fetchpriority="high"><span class="hero-caption">Representative stock image · empty classroom</span></div></section>
    <div class="notice-strip"><div class="page-width notice-inner"><span class="notice-label">Admissions</span><span class="notice-copy">Enquiries are open. Speak with our school team about the admission process.</span><a class="notice-link" href="/page/admission-enquiry">Apply / enquire ↗</a></div></div>
    <section class="section page-width reveal">${sectionHeading('On campus', 'Learning happens everywhere', 'A glimpse of the people, activities and shared moments that shape school life.', '/page/gallery')}<div class="highlights-grid">${highlights.map((item) => `<article class="highlight-item">${photo(item.image, item.title)}<div class="highlight-copy"><h3>${escapeHtml(item.title || 'School life')}</h3><p>${escapeHtml(cleanText(item.body))}</p></div></article>`).join('')}</div></section>
    <section class="section updates-band"><div class="page-width updates-layout"><div class="updates-intro reveal">${sectionHeading('School bulletin', 'The latest from TPS', 'Updates, activities and announcements from our school community.', '/#directory')}</div><div class="news-list reveal">${news.map((item) => { const date = new Date(item.created_at || ''); const displayDate = Number.isNaN(date.getTime()) ? 'School update' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); return `<article class="news-row"><div class="news-thumb">${photo(item.image, item.title)}</div><div><p class="news-date">${escapeHtml(displayDate)}</p><h3>${escapeHtml(item.title || 'School update')}</h3><p>${escapeHtml(cleanText(item.body))}</p></div><span class="news-arrow" aria-hidden="true">↗</span></article>`; }).join('')}</div></div></section>
    ${stats.length ? `<section class="section-compact page-width reveal" aria-label="School at a glance"><div class="stats-row">${stats.map((item) => `<div class="stat-item"><span class="stat-value">${escapeHtml(cleanText(item.body))}</span><span class="stat-label">${escapeHtml(item.title)}</span></div>`).join('')}</div></section>` : ''}
    <section class="school-life reveal"><div class="school-life-photo"><img class="parallax-image" src="${escapeHtml(mediaUrl(gallery[0]?.front_image || 'sports-ground-wide.webp'))}" alt="Representative CC0 stock image, not a photograph of the school: outdoor sports ground" loading="lazy"></div><div class="school-life-copy"><span class="section-label">The school experience</span><h2>Curiosity in class. Confidence beyond it.</h2><p>From a strong academic foundation to sport, music and student leadership, there is more than one way to find your stride.</p><a class="text-link" href="/page/mission">Our approach to learning <span aria-hidden="true">→</span></a></div></section>
    ${features.length ? `<section class="section page-width reveal">${sectionHeading('Space to learn', 'Campus facilities', 'The practical spaces that bring lessons, ideas and after-school interests to life.', '/page/meet-the-chairman')}<div class="features-grid">${features.map((item, index) => `<article class="feature-item"><span class="feature-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(cleanText(item.body))}</p></article>`).join('')}</div></section>` : ''}
    ${events.length ? `<section class="section updates-band"><div class="page-width reveal">${sectionHeading('Calendar', 'Coming together', 'School events and moments to look forward to.')}<div class="events-grid">${events.map((item) => { const date = cleanText(item.body).match(/\d{1,2}\s+\w+\s+\d{4}/)?.[0] || 'School event'; return `<article class="event-item">${photo(item.image, item.title, 'event-image')}<div class="event-copy"><time>${escapeHtml(date)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(cleanText(item.body))}</p></div></article>`; }).join('')}</div></div></section>` : ''}
    ${gallery.length ? `<section class="section page-width reveal">${sectionHeading('In pictures', 'A look around school', 'Campus activities and shared celebrations.', '/page/gallery')}<div class="gallery-preview">${gallery.slice(0, 3).map((item) => `<a class="gallery-tile" href="/page/gallery" aria-label="Explore ${escapeHtml(item.name)} gallery">${photo(item.front_image, item.name)}<span>${escapeHtml(item.name)}</span></a>`).join('')}</div></section>` : ''}
    <section class="page-width section-compact reveal" id="directory">${sectionHeading('Information desk', 'School information', 'The full school directory: admissions, academics, student life and public information.')}<div class="directory-toolbar"><div class="directory-search"><label for="directory-filter">Search school pages</label><input id="directory-filter" type="search" placeholder="Try “results”, “fees” or “transport”" autocomplete="off"></div><span class="directory-count" id="directory-count" aria-live="polite"></span></div><div class="directory-list" id="directory-list"></div></section>`;
  bindImageFallbacks(appRoot);
  renderDirectory(feeds.menu || [], feeds.allMenu || []);
  activateReveals();
  enableParallax();
  updateDocumentMetadata({}, '/');
}

function renderDirectory(headerMenu, completeMenu) {
  const directory = document.querySelector('#directory-list');
  if (!directory) return;
  directory.innerHTML = groupMenu(headerMenu, completeMenu).map((group) => `<section class="directory-group"><h2>${escapeHtml(group.heading)}</h2><div class="directory-items">${group.links.map((item) => { const href = routeFor(item); const searchTerms = `${group.heading} ${titleCase(item.heading)} ${item.linkname} ${item.linkname === 'result' ? 'results cbse' : ''} ${item.linkname.includes('fee') ? 'fees' : ''}`; return `<a href="${escapeHtml(href)}" data-search-item="${escapeHtml(searchTerms.toLowerCase())}"${safeLinkAttrs(href)}>${escapeHtml(titleCase(item.heading))}</a>`; }).join('')}</div></section>`).join('');
  const input = document.querySelector('#directory-filter');
  const count = document.querySelector('#directory-count');
  const update = () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    directory.querySelectorAll('.directory-group').forEach((group) => {
      let groupCount = 0;
      group.querySelectorAll('[data-search-item]').forEach((link) => { link.hidden = Boolean(query) && !link.dataset.searchItem.includes(query); if (!link.hidden) groupCount += 1; });
      group.hidden = groupCount === 0;
      visible += groupCount;
    });
    count.textContent = `${visible} ${visible === 1 ? 'page' : 'pages'}`;
  };
  input.addEventListener('input', update);
  update();
}

function fixCmsLinks(container) {
  if (!container) return;
  for (const image of container.querySelectorAll('img[src]')) {
    const raw = image.getAttribute('src');
    image.src = mediaUrl(raw || '');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.onerror = () => {
      if (image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';
      image.src = fallbackImageSrc;
    };
    if (image.complete && (image.naturalWidth === 0 || image.naturalHeight === 0)) {
      image.src = fallbackImageSrc;
    }
  }
  bindImageFallbacks(container);
  for (const anchor of container.querySelectorAll('a[href]')) {
    const raw = anchor.getAttribute('href');
    if (isSensitiveDestination(raw, anchor.textContent)) {
      anchor.href = DEMO_ACCESS_PATH;
      anchor.removeAttribute('target');
      anchor.rel = '';
      anchor.setAttribute('aria-label', `${anchor.textContent.trim() || 'This action'} is disabled in this demo`);
      continue;
    }
    if (/^(?:https?:|\/\/|mailto:|tel:|javascript:)/i.test(raw || '')) {
      anchor.replaceWith(document.createTextNode(anchor.textContent || ''));
      continue;
    }
    if (!raw || raw.startsWith('#')) continue;
    if (/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|webp)(?:\?|$)/i.test(raw)) {
      anchor.href = new URL(raw, MEDIA).href;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
    } else if (/^page\//.test(raw)) anchor.href = `/${raw.replace(/\/$/, '')}/`;
    else if (raw.startsWith('/page/')) anchor.href = `${raw.replace(/\/$/, '')}/`;
  }
  for (const anchor of container.querySelectorAll('a[target="_blank"]')) {
    anchor.rel = 'noopener noreferrer';
  }
  normalizeCmsHeadings(container);
}

function renderPage(page, menu = [], allMenu = []) {
  const groups = groupMenu(menu, allMenu);
  const title = cleanText(page.heading || 'School information');
  const intro = cleanText(page.short_description || page.meta_description || '');
  const bodyHtml = sanitizeCmsHtml(page.pbody || (page.linkname === 'gallery' ? '' : '<p>For details about this section, please contact the school office or choose a related page from the school directory.</p>'), DOMPurify);
  appRoot.innerHTML = `<div class="page-width page-shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${escapeHtml(title)}</span></nav><header class="page-heading"><span class="section-label">Takshashila Public School</span><h1>${escapeHtml(title)}</h1>${intro ? `<p>${escapeHtml(intro)}</p>` : ''}</header>${page.photo ? `<figure class="page-feature-photo"><img src="${escapeHtml(mediaUrl(page.photo))}" alt="${escapeHtml(title)}" loading="lazy" decoding="async"${fallbackImageMarkup}></figure>` : ''}<div class="cms-layout"><article class="cms-body" id="page-body">${bodyHtml}</article><aside class="cms-sidebar"><h2>Explore school</h2><ul>${groups.flatMap((group) => group.links).slice(0, 18).map((item) => { const href = routeFor(item); return `<li><a href="${escapeHtml(href)}"${safeLinkAttrs(href)}>${escapeHtml(titleCase(item.heading))}</a></li>`; }).join('')}</ul></aside></div>${page.linkname === 'gallery' ? '<section id="gallery-content" aria-live="polite"></section>' : ''}</div>`;
  updateDocumentMetadata(page, page.linkname);
  fixCmsLinks(document.querySelector('#page-body'));
  if (page.linkname === 'gallery') renderGallery();
  activateReveals();
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

function renderDemoDocument(blocked = false) {
  const path = blocked ? 'demo-access' : 'demo-information';
  const metadata = getPageMetadata({}, path);
  updateDocumentMetadata({}, path);
  const content = blocked
    ? `<span class="demo-blocked-mark" aria-hidden="true">×</span><header class="demo-document-header"><span class="section-label">Demo restriction</span><h1>That action is unavailable here</h1><p>This is a static website preview. Sign-ups, account access, application submission and payments are disabled.</p></header><div class="demo-document-body"><h2>No information was submitted</h2><p>This preview does not create accounts, accept registrations, process payments or send form data. No database or form endpoint is connected.</p><div class="demo-document-actions"><a href="${DEMO_INFORMATION_PATH}">Read the important demo notice</a></div></div>`
    : `<header class="demo-document-header"><span class="section-label">Important document · preview notice</span><h1>About this website</h1><p>This independent website is a visual preview for review. It was not made, operated or approved by Takshashila Public School.</p></header><div class="demo-document-body"><h2>Demo only</h2><p>The pages and content are a static, read-only snapshot prepared for demonstration. Content cannot be changed from this website.</p><h2>No accounts or transactions</h2><p>This preview has no sign-up, account creation, login, application submission, payment or checkout functionality. Sensitive actions are blocked and lead to a demo notice.</p><h2>No form or database</h2><p>There are no working forms, no connected database and no analytics or tracking service. No personal data is requested or sent by the application.</p><h2>Hosting logs</h2><p>The hosting provider may process basic request and security logs, including network identifiers. Review its privacy terms and configure deployment accordingly.</p><p>Do not submit personal information through this demo. Independent preview only; Takshashila Public School has not made, approved or endorsed this website.</p><div class="demo-document-actions"><a href="/">Return to the preview</a></div></div>`;
  const contentDocument = new DOMParser().parseFromString(content, 'text/html');
  for (const anchor of contentDocument.querySelectorAll('a[href]')) {
    const url = new URL(anchor.getAttribute('href'), location.origin);
    if (url.origin !== location.origin) anchor.replaceWith(contentDocument.createTextNode(anchor.textContent || ''));
  }
  const safeContent = contentDocument.body.innerHTML.replace('<h1>', '<h1 id="demo-title">');
  appRoot.innerHTML = `<article class="demo-document" aria-labelledby="demo-title"><div id="demo-content">${safeContent}</div></article>`;
  if (metadata.robots) document.querySelector('meta[name="robots"]').content = metadata.robots;
  else document.querySelector('meta[name="robots"]').content = 'index,follow,max-image-preview:large';
  navPanel.hidden = true;
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}

async function renderGallery() {
  const root = document.querySelector('#gallery-content');
  root.innerHTML = '<p class="loading-state">Loading campus photographs…</p>';
  try {
    const page = await api('page/gallery');
    const albums = await api(`gallery/${page.id}`);
    root.innerHTML = `<div class="section-label">Campus photographs</div><div class="gallery-albums">${albums.map((album) => {
      const photos = (album.image_collection || '').split(',').map((photo) => photo.trim()).filter(Boolean);
      return `<button class="album-button" type="button" data-gallery-title="${escapeHtml(album.name)}" data-gallery-photos="${escapeHtml(JSON.stringify(photos))}"><div class="album-cover">${album.front_image ? `<img src="${escapeHtml(mediaUrl(album.front_image))}" alt="${escapeHtml(album.name)}" loading="lazy"${fallbackImageMarkup}>` : ''}</div><h2>${escapeHtml(album.name)}</h2><p>${photos.length} ${photos.length === 1 ? 'photograph' : 'photographs'}</p></button>`;
    }).join('')}</div>`;
    bindImageFallbacks(root);
    root.querySelectorAll('.album-button').forEach((button) => button.addEventListener('click', () => openLightbox(button.dataset.galleryTitle, JSON.parse(button.dataset.galleryPhotos))));
  } catch { root.innerHTML = '<p class="notice-error">The photo albums could not be loaded. Please try again shortly.</p>'; }
}

function openLightbox(title, photos) {
  const dialog = document.createElement('section');
  dialog.className = 'photo-lightbox';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', `${title} photo album`);
  dialog.innerHTML = `<div class="lightbox-top"><h2>${escapeHtml(title)} · ${photos.length} photographs</h2><button class="lightbox-close" type="button" aria-label="Close photo album">×</button></div><div class="lightbox-photos">${photos.map((photo, index) => `<a href="${escapeHtml(mediaUrl(photo))}" target="_blank" rel="noreferrer" aria-label="Open photograph ${index + 1}"><img src="${escapeHtml(mediaUrl(photo))}" alt="${escapeHtml(title)} · photograph ${index + 1}" loading="lazy"${fallbackImageMarkup}></a>`).join('')}</div>`;
  bindImageFallbacks(dialog);
  document.body.append(dialog);
  document.body.style.overflow = 'hidden';
  const close = () => { dialog.remove(); document.body.style.overflow = ''; };
  dialog.querySelector('.lightbox-close').addEventListener('click', close);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  dialog.querySelector('.lightbox-close').focus();
}

function activateReveals() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach((item) => item.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); currentObserver.unobserve(entry.target); }
  }, { threshold: .12, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((item) => observer.observe(item));
}

function enableParallax() {
  const images = [...document.querySelectorAll('.parallax-image')];
  if (!images.length || reducedMotion.matches) return;
  let scheduled = false;
  const update = () => {
    for (const image of images) { const rect = image.parentElement.getBoundingClientRect(); const progress = (innerHeight - rect.top) / (innerHeight + rect.height); image.style.transform = `scale(1.12) translate3d(0, ${(progress - .5) * -42}px, 0)`; }
    scheduled = false;
  };
  window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

async function renderCurrentRoute() {
  const path = decodeURIComponent(location.pathname.replace(/\/$/, '') || '/');
  if (path === '/demo-information') {
    renderDemoDocument(false);
  } else if (path === '/demo-access') {
    renderDemoDocument(true);
  } else if (path === '/') {
    const feeds = await loadFeeds();
    renderNavigation(feeds.menu, feeds.allMenu);
    renderHome(feeds);
  } else if (path.startsWith('/page/')) {
    const slug = path.slice('/page/'.length);
    const [page, menu, allMenu] = await Promise.all([api(`page/${encodeURIComponent(slug)}`), api('menu/header').catch(() => []), api('menu').catch(() => [])]);
    renderNavigation(menu, allMenu);
    renderPage(page, menu, allMenu);
  } else {
    appRoot.innerHTML = '<div class="page-width page-shell"><nav class="breadcrumbs"><a href="/">Home</a><span aria-hidden="true">/</span><span>Page not found</span></nav><header class="page-heading"><span class="section-label">Takshashila Public School</span><h1>Page not found</h1><p>This school page may have moved. Browse the school directory to find what you need.</p></header><p style="margin-top:24px"><a class="text-link" href="/#directory">Open school directory <span aria-hidden="true">→</span></a></p></div>';
  }
}

function setTheme(theme) {
  const next = theme === 'night' ? 'night' : 'day';
  document.documentElement.dataset.theme = next;
  document.querySelector('.theme-icon').textContent = next === 'night' ? '☼' : '☾';
  document.querySelector('.theme-word').textContent = next === 'night' ? 'Day' : 'Night';
  document.querySelector('.theme-toggle').setAttribute('aria-label', `Switch to ${next === 'night' ? 'day' : 'night'} theme`);
  document.querySelector('meta[name="theme-color"]').content = next === 'night' ? '#101b2b' : '#f2f6fb';
}

document.querySelector('.theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'night' ? 'day' : 'night'));
setTheme(document.documentElement.dataset.theme || 'day');
document.querySelector('.menu-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  navPanel.hidden = !open;
  if (open) navPanel.querySelector('a')?.focus();
});
document.querySelector('.nav-close').addEventListener('click', () => { navPanel.hidden = true; document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false'); document.querySelector('.menu-toggle').focus(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !navPanel.hidden) { navPanel.hidden = true; document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false'); document.querySelector('.menu-toggle').focus(); } });

let scrollQueued = false;
window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    header.classList.toggle('is-scrolled', scrollY > 12);
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    document.querySelector('.scroll-progress').style.width = `${scrollable > 0 ? Math.min(100, scrollY / scrollable * 100) : 0}%`;
    scrollQueued = false;
  });
}, { passive: true });

window.addEventListener('popstate', () => renderCurrentRoute().catch(renderError));
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  if (isSensitiveDestination(link.href, link.textContent)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    history.pushState({}, '', DEMO_ACCESS_PATH);
    renderDemoDocument(true);
    return;
  }
  if (!link.href.startsWith(`${location.origin}/`) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
  const target = new URL(link.href);
  if (target.origin !== location.origin || link.getAttribute('href').startsWith('/#')) return;
  event.preventDefault();
  navPanel.hidden = true;
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
  if (target.pathname === location.pathname) return;
  history.pushState({}, '', `${target.pathname}${target.search}${target.hash}`);
  renderCurrentRoute().catch(renderError);
}, true);
document.addEventListener('auxclick', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || !isSensitiveDestination(link.href, link.textContent)) return;
  event.preventDefault();
  history.pushState({}, '', DEMO_ACCESS_PATH);
  renderDemoDocument(true);
}, true);
document.addEventListener('submit', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  history.pushState({}, '', DEMO_ACCESS_PATH);
  renderDemoDocument(true);
}, true);
function renderError() { appRoot.innerHTML = '<div class="page-width page-shell"><div class="notice-error"><strong>School information could not be loaded.</strong> Check your connection or return to the home page.</div><p><a class="text-link" href="/">Return home <span aria-hidden="true">→</span></a></p></div>'; activateReveals(); }

renderCurrentRoute().catch(renderError);