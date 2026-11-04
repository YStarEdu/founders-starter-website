# Week 7: Feature recipes

Three features small businesses ask for, each one tested with this starter. Pick the one that fits your product. Do one at a time, and check that everything still works before you start the next.

| Recipe | You'll learn | Time |
| --- | --- | --- |
| [1. Photo gallery](#recipe-1-photo-gallery-from-supabase-storage) | File storage, public read-only access | 45 min |
| [2. Today's specials](#recipe-2-todays-specials) | A table the owner edits in the dashboard, public read only | 45 min |
| [3. "Open now" or "Closed"](#recipe-3-open-now-or-closed) | Dates, times and time zones in JavaScript | 30 min |

Before you start, commit your work, so you can always go back:

```bash
git add .
```

```bash
git commit -m "Before the Week 7 recipe"
```

You should see `[main …] Before the Week 7 recipe`, or `nothing to commit` if you'd already saved everything.

Recipes 1 and 2 add SQL. Run it in Supabase's SQL Editor, **and** paste it at the end of `supabase/setup.sql`, so that file always describes your whole database and the policy test checks it.

---

## Recipe 1: Photo gallery from Supabase Storage

A Gallery page that shows every photo you upload to Supabase. You add photos in the dashboard; visitors can look but never upload, replace or delete.

### 1. Make the bucket and its rule

Why: a public bucket lets anyone open a photo from its link, and the policy lets the website list what's in the bucket.

Run this in the SQL Editor, then add it to the end of `supabase/setup.sql`:

```sql
-- Week 7 recipe: the photo gallery, in a public Storage bucket called "gallery".
-- Public means anyone can open a photo if they have its link.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do update set public = true;

-- Who can do what: anyone can see the list of photos in the gallery bucket.
-- There's no insert, update or delete policy, so only you (in the dashboard) can add, replace or remove photos.
drop policy if exists "Anyone can see gallery photos" on storage.objects;
create policy "Anyone can see gallery photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');
```

You should see `Success. No rows returned`.

### 2. Upload photos

Why: the page shows whatever is in the bucket, so this is how you change the gallery from now on, without touching code.

1. In Supabase, open **Storage**, then the **gallery** bucket, then **Upload files**.
2. Use JPG or WebP photos under 500 KB each. Big photos make the page slow on mobile data and use up your free storage. A free tool like [Squoosh](https://squoosh.app) shrinks them in seconds.
3. Name each file in plain words, like `cinnamon-buns.jpg`. The page turns the file name into the photo's description for people who use screen readers ("cinnamon buns").
4. Only upload photos you took yourself or have permission to use, and none that show people's faces without their OK.

### 3. Add the page

Why: one HTML file and one script make the new page, the same way every other page in the starter works.

Create `gallery.html` next to `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gallery · Crumb</title>
    <meta name="description" content="Photos from the Crumb bakery: fresh bread, pastries and the shop." />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/src/style.css" />
    <script type="module" src="/src/pages/gallery.js"></script>
  </head>
  <body>
    <!-- include src/partials/header.html -->

    <main id="main" class="container">
      <h1>Gallery</h1>
      <p class="lead">Fresh from the oven this week.</p>
      <p class="gallery-status" id="gallery-status" role="status">Loading photos…</p>
      <!-- src/pages/gallery.js fills this with the photos in your Supabase "gallery" bucket. -->
      <ul class="gallery" id="gallery"></ul>
    </main>

    <!-- include src/partials/footer.html -->
  </body>
</html>
```

Create `src/pages/gallery.js`:

```js
// The Gallery page (Week 7 recipe): shows every photo in the public "gallery" bucket in Supabase Storage.
import "../main.js";
import { LOCAL_MODE } from "../config.js";
import { supabase } from "../supabase.js";

const status = document.querySelector("#gallery-status");
const gallery = document.querySelector("#gallery");

if (LOCAL_MODE) {
  status.textContent = "Photos show up here once Supabase is connected (Week 4).";
} else {
  showPhotos();
}

async function showPhotos() {
  const bucket = supabase.storage.from("gallery");
  const { data: files, error } = await bucket.list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (error) {
    console.error("The gallery didn't load:", error);
    status.textContent = "The photos couldn't load. Please try again later.";
    return;
  }

  // Folders show up in the list too (without an id), so keep only image files.
  const photos = files.filter((file) => file.id && /\.(jpe?g|png|webp|avif|gif)$/i.test(file.name));
  if (photos.length === 0) {
    status.textContent = "No photos yet.";
    return;
  }

  status.hidden = true;
  for (const file of photos) {
    const image = document.createElement("img");
    image.src = bucket.getPublicUrl(file.name).data.publicUrl;
    image.alt = describe(file.name);
    image.loading = "lazy"; // photos further down load only when someone scrolls to them
    const item = document.createElement("li");
    item.append(image);
    gallery.append(item);
  }
}

// "cinnamon-buns_1.jpg" → "cinnamon buns 1": the description screen readers read out.
function describe(fileName) {
  return fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
}
```

Add the page to the build. In `vite.config.js`, add `"gallery"` to the list:

```js
const pages = ["index", "menu", "about", "order", "privacy", "check", "404", "gallery"];
```

Add a link in `src/partials/header.html`, after the Menu link:

```html
        <li><a href="/gallery.html">Gallery</a></li>
```

On a small phone the header menu now wraps onto two lines. That's fine. If you'd rather keep it on one line, put the link in `src/partials/footer.html` instead.

Add the styles at the end of `src/style.css`:

```css
/* Week 7: the photo gallery */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gallery img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius);
  background: var(--color-border);
}
```

### 4. Test it

1. Restart the dev server (`vite.config.js` changed). Press **Ctrl+C** in its terminal, then:

```bash
npm run dev
```

You should see `Local: http://localhost:5173/` again.

2. Open `http://localhost:5173/gallery.html`. Your photos appear in a grid: two across on a phone, more on a laptop.
3. Upload one more photo in the dashboard and reload the page. It appears, with no code change.
4. Add the gallery checks to the policy test (see [the end of this page](#add-the-recipes-to-the-policy-test)) and run `npm test`.

What can go wrong:

- **"No photos yet." but the bucket has photos:** the select policy is missing, or the bucket isn't called `gallery`. Run the SQL again.
- **Broken image icons:** the bucket isn't public. In **Storage**, open the bucket's settings and turn on **Public bucket**, or run the SQL again.

---

## Recipe 2: Today's specials

A "Today's specials" box on the home page. Each morning you add the day's specials in the Table Editor; the site shows only today's. Visitors can read specials but never add, change or delete them.

### 1. Make the table

Why: specials change every day, so they belong in a table you can edit from your phone, not in the code.

Run this in the SQL Editor, then add it to the end of `supabase/setup.sql`. If your business isn't in Ontario or Quebec, change `America/Toronto` to your time zone, such as `America/Vancouver`, `America/Edmonton`, `America/Winnipeg` or `America/Halifax`:

```sql
-- Week 7 recipe: today's specials. You add them in the Table Editor, and the home page shows today's.
create table if not exists public.specials (
  id          bigint generated always as identity primary key,
  day         date not null default (now() at time zone 'America/Toronto')::date,
  name        text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 200),
  price       numeric(6, 2) check (price >= 0)
);

alter table public.specials enable row level security;
grant select on table public.specials to anon, authenticated;

-- Who can do what: anyone can read the specials. Only you, in the dashboard, can add, change or delete them.
drop policy if exists "Anyone can read specials" on public.specials;
create policy "Anyone can read specials"
  on public.specials for select
  to anon, authenticated
  using (true);
```

You should see `Success. No rows returned`.

### 2. Add today's specials

Why: this is your daily routine from now on, and it takes a minute.

1. Open **Table Editor → specials** and click **Insert**, then **Insert row**.
2. Fill in `name`, `description` and `price`. Leave `id` and `day` empty: `day` fills itself in with today's date.
3. Click **Save**. Add one or two more.

To plan ahead, type a future date in `day`, like `2026-12-24`. That special appears on that day only. Leave `price` empty for "ask at the counter".

### 3. Show them on the home page

Why: the page asks the database for today's rows only, and hides the box on days without specials.

At the end of `src/bakery.js`, add the time zone (recipe 3 uses it too, so add it only once) and a helper for today's date:

```js
// Week 7: the bakery's time zone, so "Open now" and today's specials are right even for visitors
// in another province. Vancouver is "America/Vancouver", Halifax "America/Halifax", and so on.
export const TIME_ZONE = "America/Toronto";

// Today's date at the bakery as "YYYY-MM-DD", the way Supabase writes dates.
export function todayAtBakery(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
```

In `src/store.js`, add this line under the other `import` lines at the top:

```js
import { todayAtBakery } from "./bakery.js";
```

Then add this at the end of `src/store.js`:

```js
// Week 7: today's specials. In local mode you get two examples, so you can see how the section looks.
const EXAMPLE_SPECIALS = [
  { name: "Pumpkin loaf", description: "Warm spices and a cream cheese swirl. Fall only.", price: 6.5 },
  { name: "Maple pecan tart", description: "Made with Quebec maple syrup.", price: 4.25 },
];

export async function todaysSpecials() {
  if (LOCAL_MODE) return EXAMPLE_SPECIALS;
  const { data, error } = await supabase
    .from("specials")
    .select("name, description, price")
    .eq("day", todayAtBakery())
    .order("id");
  if (error) {
    console.error("Today's specials didn't load:", error);
    throw new Error("Today's specials couldn't load.");
  }
  return data;
}
```

In `index.html`, add this section between the hero `</section>` and the benefits section:

```html
      <!-- Week 7: filled in by src/pages/home.js, and hidden when there are no specials today. -->
      <section class="specials" id="specials" aria-labelledby="specials-heading" hidden>
        <h2 id="specials-heading">Today's specials</h2>
        <ul class="specials-list" id="specials-list"></ul>
      </section>
```

Also in `index.html`, change the script line in the `<head>` so the home page gets its own script:

```html
    <script type="module" src="/src/pages/home.js"></script>
```

Create `src/pages/home.js`:

```js
// The Home page: shows today's specials, if there are any (Week 7 recipe).
import "../main.js";
import { formatPrice } from "../bakery.js";
import { todaysSpecials } from "../store.js";

showSpecials();

async function showSpecials() {
  const section = document.querySelector("#specials");
  const list = document.querySelector("#specials-list");
  let specials;
  try {
    specials = await todaysSpecials();
  } catch {
    return; // no specials section is better than an error message on the home page
  }
  for (const special of specials) {
    const item = document.createElement("li");
    item.className = "special";
    const name = document.createElement("h3");
    name.textContent = special.name;
    const description = document.createElement("p");
    description.textContent = special.description;
    item.append(name, description);
    if (special.price !== null) {
      const price = document.createElement("p");
      price.className = "price";
      price.textContent = formatPrice(Number(special.price));
      item.append(price);
    }
    list.append(item);
  }
  section.hidden = specials.length === 0;
}
```

Add the styles at the end of `src/style.css`:

```css
/* Week 7: today's specials on the home page */
.specials {
  margin-bottom: 2.5rem;
  padding: 1.25rem;
  border: 2px solid var(--color-accent);
  border-radius: var(--radius);
  background: var(--color-accent-soft);
}

.specials h2 {
  margin-top: 0;
}

.specials-list {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.special h3 {
  margin: 0;
  font-family: var(--font-body);
  font-size: 1.125rem;
}

.special p {
  margin: 0.25rem 0 0;
}

.special .price {
  font-weight: 700;
}
```

### 4. Test it

1. Open the home page. Today's specials from the Table Editor appear in a box under the headline.
2. In the Table Editor, change one special's `day` to tomorrow and reload the page: it disappears today and will appear tomorrow.
3. Delete all of today's specials and reload: the box disappears.
4. Check that visitors can't add specials. In the browser Console on your site (same `url` and `key` as in Week 5):

```js
const attempt = await fetch(`${url}/rest/v1/specials`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Free cake for everyone" }),
});
console.log(attempt.status, await attempt.json());
```

You should see `401` with `permission denied for table specials` (or a message about row-level security). No new row appears in the Table Editor.

5. Add the specials checks to the policy test (see [the end of this page](#add-the-recipes-to-the-policy-test)) and run `npm test`.

---

## Recipe 3: "Open now" or "Closed"

A small badge in the header that says "Open now · until 6:00 p.m." or "Closed · opens tomorrow at 7:30 a.m.", worked out from the opening hours in `src/bakery.js`. No database needed.

### 1. Add the time zone

Why: a visitor in Vancouver at 4 p.m. is looking at a Toronto bakery where it's already 7 p.m., so the badge has to use the bakery's clock, not the visitor's.

If you did recipe 2, `TIME_ZONE` is already at the end of `src/bakery.js`. If not, add it there:

```js
// Week 7: the bakery's time zone, so "Open now" is right even for visitors in another province.
// Vancouver is "America/Vancouver", Halifax "America/Halifax", and so on.
export const TIME_ZONE = "America/Toronto";
```

### 2. Work out the status

Why: a separate file with one job is easy to test and easy to reuse on other pages.

Create `src/open-status.js`:

```js
// Week 7: "Open now" or "Closed", worked out from HOURS in src/bakery.js and the time at the bakery.
import { DAYS, HOURS, TIME_ZONE, formatTime, toMinutes } from "./bakery.js";

// The day and time right now at the bakery. It can differ from the visitor's own clock.
function bakeryClock(now) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "long", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return { day: part("weekday"), minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}

// Returns { open: true or false, text: "Open now · until 6:00 p.m." }.
export function openStatus(now = new Date()) {
  const { day, minutes } = bakeryClock(now);
  const today = HOURS[day];

  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return { open: true, text: `Open now · until ${formatTime(today.close)}` };
  }
  if (today && minutes < toMinutes(today.open)) {
    return { open: false, text: `Closed · opens today at ${formatTime(today.open)}` };
  }
  // Closed for the rest of today: find the next day you're open.
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const nextDay = DAYS[(DAYS.indexOf(day) + daysAhead) % 7];
    const hours = HOURS[nextDay];
    if (hours) {
      return { open: false, text: `Closed · opens ${daysAhead === 1 ? "tomorrow" : nextDay} at ${formatTime(hours.open)}` };
    }
  }
  return { open: false, text: "Closed" };
}
```

### 3. Show it in the header

Why: the header is on every page, so visitors see the status wherever they land.

In `src/partials/header.html`, add this line right after the closing `</a>` of the brand link (before `<nav>`):

```html
    <p class="open-status" data-open-status></p>
```

At the end of `src/main.js`, add:

```js
// Week 7: the "Open now" badge in the header, updated every minute.
import { openStatus } from "./open-status.js";

const badge = document.querySelector("[data-open-status]");
if (badge) {
  const update = () => {
    const status = openStatus();
    badge.textContent = status.text;
    badge.classList.toggle("is-open", status.open);
  };
  update();
  setInterval(update, 60 * 1000);
}
```

(An `import` at the end of a file works: JavaScript always runs imports first.)

Add the styles at the end of `src/style.css`:

```css
/* Week 7: the "Open now" badge */
.open-status {
  margin: 0;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: #efe7dd;
  color: var(--color-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.open-status.is-open {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.open-status:empty {
  display: none;
}
```

### 4. Test it

Why: you can't wait until Monday to see if "Closed on Mondays" works, so you test with chosen dates instead.

Open the site: the badge shows in the header on every page. Then, in a terminal in your project folder, ask for the status at chosen moments. This one is a Tuesday at 10 a.m. in Toronto (15:00 in UTC, the world's reference clock):

```bash
node --input-type=module -e "import { openStatus } from './src/open-status.js'; console.log(openStatus(new Date('2026-11-03T15:00:00Z')).text)"
```

You should see `Open now · until 6:00 p.m.`

A Monday, when Crumb is closed:

```bash
node --input-type=module -e "import { openStatus } from './src/open-status.js'; console.log(openStatus(new Date('2026-11-02T15:00:00Z')).text)"
```

You should see `Closed · opens tomorrow at 7:30 a.m.`

A Sunday at 3 p.m., after closing, with Monday closed:

```bash
node --input-type=module -e "import { openStatus } from './src/open-status.js'; console.log(openStatus(new Date('2026-11-08T20:00:00Z')).text)"
```

You should see `Closed · opens Tuesday at 7:30 a.m.` If you changed `HOURS`, your answers will differ: check them against your own hours.

Good to know: the order form's pickup check still uses the visitor's own clock. For a local business that's almost always the same time zone, but now you know where to look if a customer from far away says the times look off.

---

## Add the recipes to the policy test

Why: the policy test should check every table your site uses, so a later change can't quietly open one up.

In `tests/policies.mjs`, find the line `await db.close();` and paste the lines for your recipes just above it. Recipe 2:

```js
  // Week 7 recipe: today's specials.
  await db.exec("insert into public.specials (name, price) values ('Pumpkin loaf', 6.5)");
  await check("a visitor can read today's specials", async () => {
    expectEqual((await as("anon", "select name from public.specials")).rows.length, 1);
  });
  await refused("a visitor adding a special", () => as("anon", "insert into public.specials (name) values ('Free cake')"));
  await nothingChanged("a visitor can't change specials", () => as("anon", "update public.specials set price = 0"));
  await nothingChanged("a visitor can't delete specials", () => as("anon", "delete from public.specials"));
```

Recipe 1:

```js
  // Week 7 recipe: the photo gallery.
  await db.exec("insert into storage.objects (bucket_id, name) values ('gallery', 'sourdough.jpg')");
  await check("a visitor can see the gallery photos", async () => {
    expectEqual((await as("anon", "select name from storage.objects where bucket_id = 'gallery'")).rows.length, 1);
  });
  await refused("a visitor uploading a photo", () => as("anon", "insert into storage.objects (bucket_id, name) values ('gallery', 'spam.jpg')"));
  await nothingChanged("a visitor can't delete photos", () => as("anon", "delete from storage.objects"));
```

Run the tests:

```bash
npm test
```

You should see your new checks marked `ok` in both rounds, and `0 failed` at the end. With both recipes it's `70 passed, 0 failed`.

## You're done when

- [ ] Your recipe works on your computer and on the live site after `git push`.
- [ ] Visitors can read what they should (photos, specials) and can't change anything.
- [ ] `npm test` passes, with the new checks included.
