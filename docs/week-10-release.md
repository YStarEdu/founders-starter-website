# Week 10: Release checklist

Before you send your link to real customers, go through every section here and tick each box. Most items take a minute. Do them in order: the early ones protect people's data, the later ones polish.

## 1. No secret keys anywhere

Why: a secret key skips every rule you wrote, so if it's in your site or on GitHub, anyone can read and delete all your data.

- [ ] Search the whole project for secret keys. In VS Code, press **Ctrl+Shift+F** (**Cmd+Shift+F** on a Mac) and search for `sb_secret`, then for `service_role`. The only results should be in `docs/`, `vite.config.js` and `.env.example`, which mention them as warnings.
- [ ] Check that `.env` was never uploaded to GitHub:

```bash
git log --all --oneline -- .env
```

You should see nothing at all. If you see one or more lines, `.env` was committed at some point: rotate your keys (below), then ask your mentor how to clean it out of the history.

- [ ] In Netlify's **Environment variables** there are exactly two: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and the key starts with `sb_publishable_` (or is the legacy anon key).
- [ ] If a secret key ever leaked, rotate it now: in Supabase, open **Project Settings → API Keys**, create a new secret key and delete the old one. A leaked key stops working the moment you delete it.

## 2. Your policies are tested

Why: what you tested in Week 5 must still be true after everything you built since.

- [ ] Run the tests:

```bash
npm test
```

You should see `0 failed` from the policy test and `Smoke test: all passed` (or `SKIPPED` if your computer doesn't have Playwright).

- [ ] Open `https://your-site.netlify.app/check.html` and click **Run the check**. All five lines pass.
- [ ] Run the attacker snippet from [Week 5](week-05-permissions.md#3-try-it-like-an-attacker) in the Console on your live site. It returns `[]` or "permission denied", never orders.
- [ ] In Supabase, open **Advisors → Security Advisor**. There are no errors about tables without Row Level Security.
- [ ] Every table you added since Week 4 has Row Level Security turned on and a one-line comment above each policy saying who can do what.

## 3. The privacy page is filled in

Why: people deserve to know what happens to their name and email before they type them in, and Canadian law expects it.

- [ ] Every highlighted part of `privacy.html` (each `<mark>…</mark>`) is replaced with your own words, and the yellow "Template" note is deleted. Search the file for `<mark>`: there should be none left.
- [ ] "What we collect" lists exactly what your form asks for. Nothing more, nothing less.
- [ ] The Supabase region you chose in Week 4 is named (you can see it in **Project Settings → General**).
- [ ] "How long we keep it" gives a real time, and you've put a reminder in your calendar to delete old orders (the SQL is in section 6).
- [ ] The contact email works and someone reads it.
- [ ] The footer links to the privacy page on every page, and there's a short note next to the form (both are already in the starter: check they survived your changes).

## 4. PIPEDA, in plain words

PIPEDA is Canada's privacy law for businesses. A small site like yours doesn't need a lawyer, but it should follow the same common-sense rules. This is a plain-words summary, not legal advice.

1. **Ask only for what you need.** Name, email and the order. Not a birthday, address or phone number "just in case".
2. **Say why, when you ask.** The note under the form does this: "We use your name and email only for this order."
3. **Use it only for that.** No newsletter from order emails. Canada's anti-spam law (CASL) says you need people's clear permission before you send marketing emails.
4. **Keep it safe.** Row Level Security on, no secret keys in the site, two-factor authentication on your GitHub, Supabase and Netlify accounts.
5. **Keep it only as long as you need it**, then delete it, as your privacy page promises.
6. **Let people see, fix or delete their information** when they ask. Reply within 30 days, the time PIPEDA allows. Faster is better.
7. **Someone is responsible.** That's you. Your name or role and contact email are on the privacy page.
8. **If data leaks** (someone saw orders they shouldn't have), tell your mentor and a parent or guardian right away. Businesses must report serious privacy breaches to the Office of the Privacy Commissioner of Canada and tell the people affected.

You're under 18, so involve a parent or guardian before you take real customers' orders or any payments.

## 5. A 404 page

Why: people mistype addresses and follow old links, and a friendly page keeps them on your site.

- [ ] Open `https://your-site.netlify.app/this-page-does-not-exist`. You see your own "Page not found" page with your header and footer, not Netlify's plain one.
- [ ] Its links (home, menu, order) work.

## 6. Remove test orders

Why: test orders mixed in with real ones cause mistakes, and fake data has no place in a real business.

- [ ] In Supabase, open the **SQL Editor** and delete the test orders. If you used `@example.com` emails for testing, as Week 4 suggested, this finds them all:

```sql
delete from public.orders where email like '%@example.com' or name = 'Permission check';
```

You should see `Success. No rows returned`, and the Table Editor no longer shows test orders. Check that the real orders you want to keep are still there.

- [ ] Later, to delete orders older than your privacy page promises (here, 30 days after pickup):

```sql
delete from public.orders where pickup_at < now() - interval '30 days';
```

You should see `Success. No rows returned`. Run it on the schedule your privacy page promises.

## 7. Your own domain on Netlify

Why: `crumbbakery.ca` is easier to remember and trust than `wonderful-cake-123abc.netlify.app`.

1. Buy a domain with a parent's or guardian's help. A `.ca` or `.com` costs about $15 to $25 a year. The GitHub Student Developer Pack includes a free first-year domain from some registrars.
2. In Netlify, open your project's **Domain management** and click **Add a domain**. Type the domain you bought.
3. Netlify shows you exactly what to change at the company you bought the domain from: either switch to Netlify's name servers, or add the records it lists. Follow its steps word for word.
4. Wait. The change can take from a few minutes to a day to reach the whole internet.
5. Netlify sets up HTTPS (the padlock) for free by itself. Wait until the domain settings say HTTPS is active, then open `https://your-domain` and check the padlock.
6. Update the link everywhere you've shared it: social media, posters, your Campus hand-in.

## 8. Last checks

- [ ] There's no yellow local-mode banner on the live site. If there is, Netlify is missing an environment variable.
- [ ] Every page has its own `<title>` and `<meta name="description">` that describe your business, not Crumb.
- [ ] `favicon.svg` in `public/` is your logo, not the bread loaf.
- [ ] On your phone, on mobile data (Wi-Fi off), you can open every page and place an order.
- [ ] Someone outside your class placed an order while you watched, without your help.
- [ ] Optional: delete `check.html` and remove `"check"` from the `pages` list in `vite.config.js`. It's harmless to keep (it can only do what any visitor can do), but customers don't need it.

One more thing: free Supabase projects pause after about a week with no activity. If your site will be quiet for a while, open the Supabase dashboard now and then, and if a project is paused, click **Restore**.

## You're ready when

Every box above is ticked. Then send the link to your first real customers.
