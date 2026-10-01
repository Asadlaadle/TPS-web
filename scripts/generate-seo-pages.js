import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { DEMO_ACCESS_PATH, DEMO_INFORMATION_PATH, getPageMetadata, isSensitiveDestination, normalizeCmsHeadings, SEO_ROUTE_SLUGS, SITE_NAME, SITE_ORIGIN, sanitizeCmsHtml } from '../src/seo.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(projectDirectory, 'dist');
const apiOrigin = 'https://tps.schoolaxis.in/api/website';
const mediaOrigin = 'https://tps.schoolaxis.in/uploads/media/';
const sanitizerWindow = new JSDOM('').window;
const purifier = createDOMPurify(sanitizerWindow);
const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function updateMeta(html, metadata) {
  const tags = {
    'seo-description': `<meta id="seo-description" name="description" content="${escapeHtml(metadata.description)}">`,
    'seo-canonical': `<link id="seo-canonical" rel="canonical" href="${escapeHtml(metadata.canonical)}">`,
    'seo-og-title': `<meta id="seo-og-title" property="og:title" content="${escapeHtml(metadata.title)}">`,
    'seo-og-description': `<meta id="seo-og-description" property="og:description" content="${escapeHtml(metadata.description)}">`,
    'seo-og-url': `<meta id="seo-og-url" property="og:url" content="${escapeHtml(metadata.canonical)}">`,
    'seo-og-image': `<meta id="seo-og-image" property="og:image" content="${escapeHtml(metadata.image)}">`,
    'seo-twitter-title': `<meta id="seo-twitter-title" name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    'seo-twitter-description': `<meta id="seo-twitter-description" name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    'seo-twitter-image': `<meta id="seo-twitter-image" name="twitter:image" content="${escapeHtml(metadata.image)}">`,
  };
  let output = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  for (const [id, tag] of Object.entries(tags)) {
    const pattern = new RegExp(`<[^>]+id="${id}"[^>]*>`, 'i');
    if (!pattern.test(output)) throw new Error(`SEO template tag missing: ${id}`);
    output = output.replace(pattern, tag);
  }
  output = output.replace(/<meta name="robots" content="[^"]*"\s*\/?\s*>/i, `<meta name="robots" content="${escapeHtml(metadata.robots || 'index,follow,max-image-preview:large')}">`);
  return output;
}

function normalizePageLinks(html) {
  const document = new JSDOM(html, { url: SITE_ORIGIN }).window.document;
  for (const anchor of document.querySelectorAll('a[href]')) {
    const url = new URL(anchor.href, SITE_ORIGIN);
    if (isSensitiveDestination(url.href, anchor.textContent)) {
      anchor.href = DEMO_ACCESS_PATH;
      anchor.removeAttribute('target');
      anchor.rel = '';
      continue;
    }
    if (url.origin === SITE_ORIGIN && /^\/page\/[^/]+\/?$/.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/`;
      anchor.href = `${url.pathname}${url.search}${url.hash}`;
    }
  }
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

function normalizeMediaSource(rawSource) {
  if (!rawSource) return '';
  const source = String(rawSource).trim();
  if (/^data:/i.test(source)) return source;
  const absolute = source.startsWith('//') ? `https:${source}` : source;
  try {
    const url = new URL(absolute);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname || '/';
    if (host === 'tps.schoolaxis.info' || host === 'schoolaxis.info' || host === 'avp.schoolaxis.in' || host === 'sst.nilesh.cloudcampus.tech' || host === 'avp.santosh.cloudcampus.tech' || host.endsWith('cloudcampus.tech')) {
      const normalizedPath = pathname.replace(/^\/+/, '');
      if (normalizedPath.startsWith('uploads/media/')) return `https://tps.schoolaxis.in/${normalizedPath}`;
      if (normalizedPath.startsWith('website/')) return `https://schoolaxis.in/${normalizedPath}`;
      return `https://tps.schoolaxis.in/uploads/media/${normalizedPath.split('/').pop() || ''}`;
    }
    if (host === 'schoolaxis.in') {
      if (pathname.startsWith('/uploads/media/')) return `https://tps.schoolaxis.in${pathname}`;
      if (pathname.startsWith('/website/')) return `https://schoolaxis.in${pathname}`;
    }
    return url.href;
  } catch {
    if (absolute && !/^([a-z]+:)?\/\//i.test(absolute) && !/^data:/i.test(absolute)) {
      try { return new URL(absolute, mediaOrigin).href; } catch {}
    }
    return absolute;
  }
}

function sanitizePageBody(rawHtml) {
  const cleaned = sanitizeCmsHtml(rawHtml, purifier);
  const document = new JSDOM(`<main>${cleaned}</main>`, { url: SITE_ORIGIN }).window.document;
  const container = document.querySelector('main');
  for (const image of container.querySelectorAll('img[src]')) {
    const source = normalizeMediaSource(image.getAttribute('src'));
    if (!source) continue;
    image.src = source;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.setAttribute('onerror', "this.onerror=null;this.src='/assets/school/BUILDING.webp';");
  }
  for (const anchor of container.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') || '';
    const normalizedHref = href ? normalizeMediaSource(href) : href;
    if (normalizedHref && normalizedHref !== href && /^https?:\/\//i.test(normalizedHref)) {
      anchor.href = normalizedHref;
    }
    if (isSensitiveDestination(href, anchor.textContent)) {
      anchor.href = DEMO_ACCESS_PATH;
      anchor.removeAttribute('target');
      anchor.rel = '';
      continue;
    }
    if (!href || /^(mailto:|tel:|https?:|#)/i.test(href)) {
      if (/^https?:/i.test(href)) {
        anchor.href = normalizedHref || href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
      continue;
    }
    if (/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|webp)(\?|$)/i.test(href)) {
      anchor.href = new URL(href, mediaOrigin).href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    } else if (href.startsWith('page/')) {
      anchor.href = `/${href.replace(/\/$/, '')}/`;
    } else if (href.startsWith('/page/')) {
      anchor.href = `${href.replace(/\/$/, '')}/`;
    }
  }
  normalizeCmsHeadings(container);
  return container.innerHTML;
}

function renderStaticPage(page, metadata, menu) {
  const title = escapeHtml(page.heading || 'School information');
  const intro = escapeHtml(page.short_description || '');
  const related = menu.filter((item) => item.heading && item.linkname && item.linkname !== '/').map((item) => {
    const href = `/page/${encodeURIComponent(item.linkname)}/`;
    const safeHref = isSensitiveDestination(href, item.heading) ? DEMO_ACCESS_PATH : href;
    return `<li><a href="${safeHref}">${escapeHtml(item.heading.trim())}</a></li>`;
  }).join('');
  const image = page.photo ? `<figure class="page-feature-photo"><img src="${escapeHtml(normalizeMediaSource(page.photo) || new URL(page.photo, mediaOrigin).href)}" alt="${title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/school/BUILDING.webp';"></figure>` : '';
  const body = sanitizePageBody(page.pbody || '');
  return `<div class="page-width page-shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${title}</span></nav><header class="page-heading"><span class="section-label">${SITE_NAME}</span><h1>${title}</h1>${intro ? `<p>${intro}</p>` : ''}</header>${image}<div class="cms-layout"><article class="cms-body" id="page-body">${body || '<p>For details about this section, contact the school office or use the related school links.</p>'}</article><aside class="cms-sidebar"><h2>Explore school</h2><ul>${related}</ul></aside></div></div>`;
}

function staticText(value = '') {
  return new JSDOM(String(value)).window.document.body.textContent.replace(/\s+/g, ' ').trim();
}

function staticImage(filename, alt, className = '') {
  if (!filename) return '';
  const normalized = normalizeMediaSource(filename);
  const imageUrl = normalized || (/^https?:/i.test(filename) ? filename : new URL(filename, mediaOrigin).href);
  return `<img${className ? ` class="${escapeHtml(className)}"` : ''} src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt || '')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/school/BUILDING.webp';">`;
}

function renderStaticHome(feeds, menu) {
  const uniqueLinks = [...new Map(menu.filter((item) => item.heading && item.linkname && item.linkname !== '/').map((item) => [item.linkname, item])).values()];
  const protectedLink = (item) => isSensitiveDestination(`/page/${item.linkname}/`, item.heading) ? DEMO_ACCESS_PATH : `/page/${encodeURIComponent(item.linkname)}/`;
  return `<section class="home-hero" aria-labelledby="home-title"><div class="hero-copy"><span class="hero-kicker">${SITE_NAME} · Shahjahanpur</span><h1 id="home-title">A strong start.<br>Room to become.</h1><p>Thoughtful teaching, a lively campus and the confidence to take learning beyond the classroom.</p><div class="hero-actions"><a class="hero-primary" href="/page/admission-enquiry">Explore admissions <span aria-hidden="true">↗</span></a><a class="hero-secondary" href="/page/about-school">Get to know TPS</a></div></div><div class="hero-image"><img class="parallax-image" src="/assets/school/BUILDING.webp" alt="Takshashila Public School campus in Shahjahanpur" fetchpriority="high"><span class="hero-caption">Takshashila Public School · Shahjahanpur</span></div></section>
    <section class="section page-width"><div class="section-heading"><div><span class="section-label">On campus</span><h2>Learning happens everywhere</h2><p>A glimpse of the people, activities and shared moments that shape school life.</p></div><a class="text-link" href="/page/gallery">Explore all <span aria-hidden="true">→</span></a></div><div class="highlights-grid">${(feeds.highlights || []).map((item) => `<article class="highlight-item">${staticImage(item.image, item.title)}<div class="highlight-copy"><h3>${escapeHtml(item.title || 'School life')}</h3><p>${escapeHtml(staticText(item.body))}</p></div></article>`).join('')}</div></section>
    <section class="section updates-band"><div class="page-width"><div class="section-heading"><div><span class="section-label">School bulletin</span><h2>The latest from TPS</h2><p>Updates, activities and announcements from our school community.</p></div></div><div class="news-list">${(feeds.news || []).map((item) => `<article class="news-row"><div class="news-thumb">${staticImage(item.image, item.title)}</div><div><p class="news-date">${escapeHtml(item.created_at?.slice(0, 10) || 'School update')}</p><h3>${escapeHtml(item.title || 'School update')}</h3><p>${escapeHtml(staticText(item.body))}</p></div></article>`).join('')}</div></div></section>
    <section class="section-compact page-width"><div class="stats-row">${(feeds.achievements || []).map((item) => `<div class="stat-item"><span class="stat-value">${escapeHtml(staticText(item.body))}</span><span class="stat-label">${escapeHtml(item.title)}</span></div>`).join('')}</div></section>
    <section class="section page-width"><div class="section-heading"><div><span class="section-label">Space to learn</span><h2>Campus facilities</h2><p>Spaces that bring lessons, ideas and after-school interests to life.</p></div></div><div class="features-grid">${(feeds.features || []).map((item, index) => `<article class="feature-item"><span class="feature-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(staticText(item.body))}</p></article>`).join('')}</div></section>
    <section class="section updates-band"><div class="page-width"><div class="section-heading"><div><span class="section-label">Calendar</span><h2>School events</h2><p>Events and activities from the school community.</p></div></div><div class="events-grid">${(feeds.events || []).map((item) => `<article class="event-item">${staticImage(item.image, item.title, 'event-image')}<div class="event-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(staticText(item.body))}</p></div></article>`).join('')}</div></div></section>
    <section class="page-width section-compact" id="directory"><div class="section-heading"><div><span class="section-label">Information desk</span><h2>School information</h2><p>Browse admissions, academics, student life, campus facilities and public information.</p></div></div><div class="directory-list">${uniqueLinks.map((item) => `<div class="directory-group"><h2>${escapeHtml(item.heading.trim())}</h2><div class="directory-items"><a href="${protectedLink(item)}">${escapeHtml(item.heading.trim())}</a></div></div>`).join('')}</div></section>`;
}

let menu = [];
try {
  menu = await fetchJson(`${apiOrigin}/menu`);
} catch (error) {
  console.warn(`Could not fetch the CMS route list; using the maintained SEO route list. ${error.message}`);
}
const slugs = [...new Set([...menu.map((item) => item.linkname), ...SEO_ROUTE_SLUGS].filter((slug) => slug && slug !== '/' && /^[a-z0-9-]+$/i.test(slug)))];
const runtimeRoutes = {
  'menu/header': 'menu/header',
  settings: 'settings',
  ACHEIVEMENTS: 'ACHEIVEMENTS',
  NEWS: 'NEWS',
  Highlights: 'Highlights',
  SchoolFeature: 'SchoolFeature',
  OurUpcomingEvents: 'OurUpcomingEvents',
};
const runtimeEntries = await Promise.all(Object.entries(runtimeRoutes).map(async ([key, route]) => {
  try { return [key, await fetchJson(`${apiOrigin}/${route}`)]; }
  catch (error) { console.warn(`Could not snapshot ${key}: ${error.message}`); return [key, key === 'menu/header' ? [] : {}]; }
}));
const siteContent = Object.fromEntries(runtimeEntries);
siteContent.menu = menu;
const feeds = {
  highlights: siteContent.Highlights,
  news: siteContent.NEWS,
  achievements: siteContent.ACHEIVEMENTS,
  features: siteContent.SchoolFeature,
  events: siteContent.OurUpcomingEvents,
};
const homeMetadata = getPageMetadata({}, '/');
const homeHtml = updateMeta(template, homeMetadata).replace('<div id="seo-prerender"></div>', renderStaticHome(feeds, menu));
await writeFile(path.join(outputDirectory, 'index.html'), normalizePageLinks(homeHtml), 'utf8');
const pages = [];
for (let index = 0; index < slugs.length; index += 5) {
  const batch = await Promise.all(slugs.slice(index, index + 5).map(async (slug) => {
    try {
      const page = await fetchJson(`${apiOrigin}/page/${encodeURIComponent(slug)}`);
      return { slug, page };
    } catch (error) {
      console.warn(`Skipping unavailable CMS page ${slug}: ${error.message}`);
      return { slug, page: null };
    }
  }));
  pages.push(...batch);
}

for (const { slug, page } of pages) {
  if (page) siteContent[`page/${slug}`] = page;
}
const galleryPage = pages.find(({ slug }) => slug === 'gallery')?.page;
if (galleryPage?.id) {
  try { siteContent[`gallery/${galleryPage.id}`] = await fetchJson(`${apiOrigin}/gallery/${galleryPage.id}`); }
  catch (error) { console.warn(`Could not snapshot gallery albums: ${error.message}`); siteContent[`gallery/${galleryPage.id}`] = []; }
}
const dataDirectory = path.join(outputDirectory, 'data');
await mkdir(dataDirectory, { recursive: true });
await writeFile(path.join(dataDirectory, 'site-content.json'), JSON.stringify(siteContent), 'utf8');

function renderDemoDocument(blocked = false) {
  const slug = blocked ? 'demo-access' : 'demo-information';
  const metadata = getPageMetadata({}, slug);
  const content = blocked
    ? `<article class="demo-document"><span class="demo-blocked-mark" aria-hidden="true">×</span><header class="demo-document-header"><span class="section-label">Demo restriction</span><h1>That action is unavailable here</h1><p>This is a static website preview. Sign-ups, account access, application submission and payments are disabled.</p></header><div class="demo-document-body"><h2>No information was submitted</h2><p>This preview does not create accounts, accept registrations, process payments or send form data. No database or form endpoint is connected.</p><div class="demo-document-actions"><a href="${DEMO_INFORMATION_PATH}">Read the important demo notice</a><a href="https://takshashilapublicschool.in/" target="_blank" rel="noopener noreferrer">Visit the official school website ↗</a></div></div></article>`
    : `<article class="demo-document"><header class="demo-document-header"><span class="section-label">Important document · preview notice</span><h1>About this website</h1><p>This independent website is a visual preview for review. It was not made, operated or approved by Takshashila Public School.</p></header><div class="demo-document-body"><h2>Demo only</h2><p>The pages and content are a static, read-only snapshot prepared for demonstration. Content cannot be changed from this website.</p><h2>No accounts or transactions</h2><p>This preview has no sign-up, account creation, login, application submission, payment or checkout functionality. Sensitive actions are blocked and lead to a demo notice.</p><h2>No form or database</h2><p>There are no working forms, no connected database and no analytics or tracking service. The site does not collect or submit personal information.</p><h2>For accurate, current information</h2><p>This preview may be incomplete or out of date. Contact the school directly through its official website for verified information.</p><div class="demo-document-actions"><a href="https://takshashilapublicschool.in/" target="_blank" rel="noopener noreferrer">Visit takshashilapublicschool.in ↗</a><a href="/">Return to the preview</a></div><div class="demo-disclaimer-note">Independent preview only. Takshashila Public School has not made, approved or endorsed this website.</div></div></article>`;
  const html = updateMeta(template, metadata).replace('<div id="seo-prerender"></div>', content);
  return normalizePageLinks(html);
}

for (const [slug, routePath, blocked] of [['demo-information', DEMO_INFORMATION_PATH, false], ['demo-access', DEMO_ACCESS_PATH, true]]) {
  const routeDirectory = path.join(outputDirectory, slug);
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, 'index.html'), renderDemoDocument(blocked), 'utf8');
}

const sitemapEntries = [{ url: `${SITE_ORIGIN}/`, lastmod: new Date().toISOString().slice(0, 10), priority: '1.0' }];
const demoInformationMetadata = getPageMetadata({}, 'demo-information');
sitemapEntries.push({ url: demoInformationMetadata.canonical, lastmod: new Date().toISOString().slice(0, 10), priority: '0.5' });
let generatedCount = 0;
for (const { slug, page } of pages) {
  const metadata = getPageMetadata(page || {}, slug);
  sitemapEntries.push({ url: metadata.canonical, lastmod: page?.updated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10), priority: slug === 'mandatory-disclosure' ? '0.8' : '0.7' });
  if (!page) continue;
  const routeDirectory = path.join(outputDirectory, 'page', slug);
  await mkdir(routeDirectory, { recursive: true });
  let html = updateMeta(template, metadata);
  html = html.replace('<div id="seo-prerender"></div>', renderStaticPage(page, metadata, menu));
  await writeFile(path.join(routeDirectory, 'index.html'), normalizePageLinks(html), 'utf8');
  generatedCount += 1;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.map((entry) => `  <url><loc>${escapeHtml(entry.url)}</loc><lastmod>${escapeHtml(entry.lastmod)}</lastmod><changefreq>${entry.priority === '1.0' ? 'weekly' : 'monthly'}</changefreq><priority>${entry.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(outputDirectory, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated ${generatedCount} static CMS source pages and sitemap entries for ${sitemapEntries.length} URLs.`);
