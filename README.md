# Pacific Black Transport — Website

Static site (HTML/CSS/vanilla JS) built for GitHub Pages. No build step, no server.

## 1. Deploy to GitHub Pages

1. Create a repo (e.g. `pbt-site`) and push everything in this folder to the `main` branch.
2. In the repo: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. The site goes live at `https://<username>.github.io/<repo>/` within a minute or two.

All asset paths are relative, so the site works from a subpath or a custom domain without changes. The only exception is `404.html` (see the comment inside it — GitHub serves it from any path, so it uses root-relative paths; prefix them with `/<repo>` if you stay on the subpath URL).

## 2. Make the forms work (required)

Forms use **Web3Forms** (free, no backend).

1. Go to https://web3forms.com and create a free access key using **pacific.black.transport@gmail.com** — submissions will be emailed there.
2. Open `assets/js/main.js` and replace the placeholder on this line:
   ```js
   var WEB3FORMS_ACCESS_KEY = "WEB3FORMS_ACCESS_KEY"; // TODO: insert real key
   ```
3. Submit a test on each form to confirm delivery.

## 3. Gmail labels/filters (recommended)

Each form sends a distinct subject. Create Gmail filters (`Subject contains → apply label`) for:

- `Ride Request — PBT Website`
- `Driver Application — PBT Vehicle`
- `Driver Application — Own Vehicle`
- `Partnership/Corporate Inquiry — PBT Website`
- `Vehicle Program Inquiry` (arrives via the Contact form's subject dropdown)

## 4. Custom domain (when ready)

1. Buy the domain (recommend `pacificblacktransport.com`).
2. Rename `CNAME.example` to `CNAME` (file contents = the bare domain, one line).
3. Point DNS: `CNAME` record `www → <username>.github.io`, plus the four GitHub Pages `A` records for the apex (see GitHub's docs).
4. In **Settings → Pages**, set the custom domain and enable **Enforce HTTPS**.
5. Find-and-replace `SITE_URL` with the live domain in: every page's `<link rel="canonical">`, `sitemap.xml`, and `robots.txt`.

## 5. Your vehicle photos (easiest swap)

Drop your own photos into `assets/img/cars/`, overwriting these exact filenames:

| File | Class | Vehicle |
|---|---|---|
| `car1.png` | Executive | BMW 5 Series |
| `car2.png` | First Class | BMW 7 Series |
| `car3.png` | Executive SUV | Chevrolet Suburban |
| `car4.png` | First Class SUV | Cadillac Escalade |

That's it — no HTML/CSS changes. The same four files feed the Vehicles page, the Home class cards, and the Ride form thumbnails. Recommended: 1280×800+ landscape (16:10); the layout crops with `object-fit: cover`, so nothing stretches.

## 5b. Replace other placeholder imagery

All images in `assets/img/` are dark SVG placeholders so the site renders cleanly today. Each `<img>` in the HTML has an `<!-- IMAGE DIRECTION -->` comment describing the shot to generate or license (cinematic night LA, black vehicles, near-monochrome grade, no lens flares).

When replacing:
- Export WebP (or AVIF) at ~1600px wide for heroes, ~800px for cards; add `srcset` for retina if desired.
- Keep the same filenames (or update the `src` attributes).
- Keep `loading="lazy"` on below-fold images and `fetchpriority="high"` on heroes.

## 6. Analytics (optional)

No cookies or trackers ship in V1. If you want analytics later, Plausible is the lightest option — add its one-line script to each page's `<head>`.

## 7. Editing notes

- Design tokens (all colors, fonts, spacing) live at the top of `assets/css/main.css`. No hex values are hard-coded elsewhere.
- Header and footer are duplicated on every page between the marked
  `SHARED HEADER` / `SHARED FOOTER` comment blocks — if you edit one, edit all seven pages.
- Per-page accent colors are set by a class on `<body>` (`accent-champagne`, `accent-silver`, `accent-blue`, `accent-emerald`; default platinum with no class).
- To add a future `/programs/` page: copy any page folder, update the canonical URL, title/description, and nav `aria-current`, and add the URL to `sitemap.xml`.

## 8. Truthfulness rules baked into the copy

The site makes no claims about fleet size, ride counts, reviews, income, or partnerships. If you add copy later, keep it to what's verifiable: legal name, TCP0049330-P, Los Angeles operating area, and the actual processes described on each page.
