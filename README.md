# Crumb: the website starter

A small, real website for a business that people visit and contact. The example is **Crumb**, a bakery that takes pickup orders. In YStar Founders you copy this starter in Week 3 and turn it into your own product: a tutoring service, a car wash, a club, a shop.

- Five pages: Home, Menu, About, Order and Privacy, plus a 404 page and a permission check page.
- Phone first: every page works on a 360-pixel-wide screen.
- Runs with no setup on day one. Orders are saved in your browser (local mode) until you connect Supabase in Week 4. Then they go into a database table that visitors can add to but never read.

## Quick start (5 minutes)

You need [Node.js](https://nodejs.org) 22 or newer. Open a terminal in this folder and install the packages:

```bash
npm install
```

You should see `added 27 packages` (the number can differ) and no red `ERR!` lines.

Start the site on your computer:

```bash
npm run dev
```

You should see `Local: http://localhost:5173/`. Open that address in your browser. A yellow banner says "Local mode: data is saved in this browser only. Connect Supabase in Week 4." That's expected.

New to all of this? Follow [Week 3: run it, change it, deploy it](docs/week-03-start.md) step by step.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site on your computer and refreshes the browser each time you save a file |
| `npm run build` | Builds the finished site into `dist/`. Netlify runs this too |
| `npm run preview` | Shows the built site from `dist/`, exactly as Netlify will serve it |
| `npm test` | Builds the site, checks the database rules, then clicks through every page in a browser |

## Docs, week by week

| Week | Guide |
| --- | --- |
| 3 | [Run it, change it, deploy it](docs/week-03-start.md) |
| 4 | [Connect Supabase](docs/week-04-data.md) |
| 5 | [Prove it's locked, and slow down spam](docs/week-05-permissions.md) |
| 7 | [Feature recipes: photo gallery, today's specials, "Open now"](docs/week-07-features.md) |
| 10 | [Release checklist](docs/week-10-release.md) |
| Any | [Troubleshooting: error message → what it means → how to fix it](docs/troubleshooting.md) |

## What's where

| To change | Edit |
| --- | --- |
| Words on a page | `index.html`, `menu.html`, `about.html`, `order.html`, `privacy.html`, `404.html` |
| The header and footer (they appear on every page) | `src/partials/header.html`, `src/partials/footer.html` |
| Menu items, prices and opening hours | `src/bakery.js` |
| Colours, fonts and spacing | `src/style.css` (start with the `:root` block at the top) |
| What the order form checks | `src/validate.js` |
| Where orders are saved | `src/store.js` |
| Spam limits | `src/spam.js` and the hidden field at the end of the form in `order.html` |
| The database table and its rules | `supabase/setup.sql` |
| Which pages get built | the `pages` list in `vite.config.js` |

## How the data works

```
order.html ──► src/pages/order.js ──► src/validate.js   (friendly messages)
                                  └─► src/store.js ──► local mode: localStorage in this browser
                                                   └─► Supabase:   the orders table (insert only)
```

`src/config.js` decides the mode: if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing, the site runs in local mode. Pages never need to know which mode they're in.

In Supabase, Row Level Security is on and the only policy lets anyone **insert** an order. There's no policy to read, change or delete orders, so nobody can do that through the website or its API. You read orders in Supabase's Table Editor.

## Tests

`npm test` runs three things, in this order:

1. `vite build` makes sure the site builds, the same way Netlify builds it.
2. `tests/policies.mjs` loads `supabase/setup.sql` into an in-memory Postgres database ([PGlite](https://pglite.dev)) and checks every rule both ways: a visitor can place a valid order, invalid orders are refused, and nobody can read, change or delete orders.
3. `tests/smoke.cjs` builds a local-mode copy, opens every page in a real browser at phone size, tries the order form with bad and good answers, checks the spam limits, and fails on any Console error. It needs [Playwright](https://playwright.dev); if your computer doesn't have it, the test says SKIPPED and explains how to add it.

## Stack

Vite 8.3.5, plain JavaScript (no framework), `@supabase/supabase-js` 2.118.0, hosted on Netlify. The system font stack, so there are no font downloads. The only outside service the site talks to is Supabase.
