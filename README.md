# Takshashila Public School Website

Standalone website source and production output for Takshashila Public School, Shahjahanpur.

## Run locally

```powershell
npm ci
npm run dev
```

## Build and preview

```powershell
npm run build
npm run preview
```

The build snapshots public CMS content into `dist/data/site-content.json`, prerenders routes to `dist/page/<slug>/index.html`, writes `dist/sitemap.xml`, and copies `public/robots.txt` into the output. The browser uses only the local snapshot; it does not call a CMS API. Each page source includes its own title, description, canonical URL, social metadata, and sanitized page content. CMS routes are collected at build time from the public SchoolAxis API, with a maintained route list as a fallback.

The site is an independent demonstration, not made, operated or approved by the school. It has no forms, sign-ups, accounts, payment flows, database, analytics or tracking. Application, login and payment destinations are blocked. The Important document page explains the demo limits.

Deploy the contents of `dist/` to a preview domain controlled by the demo publisher. Do not deploy this independent demo over the school's official website. Set `SITE_URL` in the build environment to the preview domain before building so canonical and sitemap URLs point to the correct host. The `public/_headers` file supplies security and cache headers on static hosts that support the Netlify/Cloudflare Pages headers format. Review those headers if deploying behind a different host or proxy.

CMS page content and gallery photographs are served by the school's public SchoolAxis API and media host. Runtime page navigation uses the same API.
