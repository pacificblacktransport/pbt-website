# Pacific Black Transport

Official website for **Pacific Black Transport Inc. (PBT)**.

PBT is a Los Angeles-based transportation company focused on premium transportation services, professional driver opportunities, fleet operations, and business partnerships.

## Website

Live at [pacificblacktransport.com](https://pacificblacktransport.com/)

The website provides information and access to:

- Private ride requests
- Premium vehicle options
- Driver opportunities with PBT vehicles
- Driver opportunities using qualified personal vehicles
- Business and transportation partnerships
- Corporate transportation inquiries
- PBT standards and company information

## Vehicle Classes

- **First Class SUV** — Cadillac Escalade or similar
- **First Class** — BMW 7 Series or similar
- **Executive SUV** — Chevrolet Suburban or similar
- **Executive** — BMW 5 Series or similar

Vehicle images are representative. Specific makes and models are subject to availability.

This order is used consistently across the Vehicles page, the ride request form, and the homepage vehicle strip. If it changes, update all three.

## Design

The PBT website uses a cinematic monochrome design inspired by:

- Pacific Ocean
- Los Angeles
- Luxury automotive design
- Black, charcoal, white, and silver
- Premium interactive and scroll-based animations

Each page carries a single restrained accent color, set by a class on `<body>`:

| Page | Class | Accent |
|---|---|---|
| Home / Standards / Contact | *(none)* | Platinum |
| Ride | `accent-champagne` | Champagne |
| Vehicles | `accent-silver` | Metallic silver |
| Drive | `accent-blue` | Deep cool blue |
| Partner | `accent-emerald` | Muted emerald |

All colors come from CSS custom properties at the top of `assets/css/main.css`. No hard-coded hex values elsewhere.

## Technology

Static website built with HTML, CSS, and JavaScript and deployed using GitHub Pages. No build step, no framework, no backend.

```
/                  index.html
/ride/             Request a ride
/vehicles/         Vehicle classes
/drive/            Driver applications (two pathways)
/partner/          Business & partnerships
/standards/        Company identity and operating standards
/contact/          General contact
/assets/css/       main.css
/assets/js/        main.js
/assets/img/       Hero artwork, vehicle images, favicon
```

### Forms

All forms are handled by a shared module in `main.js`. On submit, a validated form composes a plain-text email and opens a pre-filled `mailto:` draft addressed to **pacific.black.transport@gmail.com**. There is no backend and no third-party form service.

If no mail app is configured (common on desktop), a fallback panel appears with **Open in Gmail** (browser compose) and **Copy message**.

Each form sets a distinct subject line so leads can be filtered in Gmail:

- Ride Request
- Driver Application — Company Vehicle
- Driver Application — Own Vehicle
- Business Partnership Inquiry / Corporate Account Inquiry
- Vehicle Program Inquiry

### Third-party libraries

Only one, loaded via CDN on the ride page: **flatpickr** for the date and time pickers. Everything else is vanilla.

## Maintenance notes

- **Header, footer, and nav are duplicated in every page.** There is no templating, so a nav change must be made in all seven files.
- **Canonical tags** must point at the live domain. Check for any remaining `SITE_URL` placeholder in `<link rel="canonical">` tags.
- **Vehicle images** live in `assets/img/cars/` as `car1.png`–`car4.png` (Executive, First Class, Executive SUV, First Class SUV respectively — note the file numbering does not match the display order above).
- **No fabricated claims.** Fleet size, customer counts, reviews, awards, years in business, driver counts, and compensation figures must never appear on the site. Only verifiable facts: legal name, TCP number, Los Angeles operating area, and the processes described.

## Company

**Pacific Black Transport Inc.**  
Los Angeles, California  
TCP0049330-P

## Copyright

© 2026 Pacific Black Transport Inc. All rights reserved.
