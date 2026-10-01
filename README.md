# Independent School Website Preview

Standalone static demonstration project. It is not made, operated, or endorsed by Takshashila Public School.

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

The build creates a small, synthetic local sample dataset in `dist/data/site-content.json`, prerenders routes to `dist/page/<slug>/index.html`, writes `dist/sitemap.xml`, and copies the public hosting files. It does not contact a CMS or fetch third-party media. Browser content and images are served from this project only.

The preview has no forms, sign-ups, accounts, payment flows, database, analytics, tracking cookies, or browser storage. It does not request or submit personal data. Demo imagery is local CC0 stock and is explicitly labelled as representative, not as school photography. See `public/assets/school/IMAGE-SOURCES.md` for source and license records.

Before deployment, set `SITE_URL` to the preview domain you control so canonical URLs and the sitemap use the correct origin. Without it, metadata intentionally uses the non-routable `https://demo.example.invalid` placeholder. Do not deploy this independent demo over the school's official website. The `public/_headers` file supplies security headers on static hosts that support the Netlify/Cloudflare Pages format; adapt and verify them for other hosts.

## Privacy and DPDP

The application code does not collect or transmit personal data. Static hosting providers may process request and security logs, which can include IP addresses and other network metadata. Select and configure the host accordingly, publish any notice required for the deployment, and obtain legal review before public or production use. This project is not a legal determination or guarantee of compliance with India's Digital Personal Data Protection Act.
