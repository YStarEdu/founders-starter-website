# Week 5: Prove it's locked, and slow down spam

Your order form collects people's names and emails. This week you prove that nobody can read them through your website, and you look at the three spam limits the starter comes with: what each one stops, and what it doesn't.

You need Supabase connected (Week 4) and about 45 minutes.

## Why this matters

Your publishable key is inside your website's JavaScript. Anyone can find it in a minute with the browser's developer tools. That's how Supabase is designed, and it's fine, as long as the database's rules only allow what you mean to allow.

So the real question isn't "can someone get my key?" (yes, they can). It's "what can someone do with it?" Today you find out, the way an attacker would.

## 1. Read your rules

Why: you can't check rules you haven't read.

Open `supabase/setup.sql`. In plain words, it says:

| Line | Means |
| --- | --- |
| `alter table public.orders enable row level security` | The table is locked. Through the API, nobody can do anything unless a policy allows it. |
| `create policy "Anyone can place an order" … for insert` | The one exception: anyone may **add** an order, if the pickup time is between now and 60 days ahead. |
| (no select, update or delete policy) | Nobody can **read**, **change** or **delete** orders through the API. |
| `check (quantity between 1 and 12)` and the other checks | Every new order must follow these limits, even one that doesn't come from your website. |
| `grant insert on table public.orders to anon, authenticated` | Visitors are allowed to try inserting. The policy above still decides which orders get in. |

`anon` is the role for every visitor who isn't signed in, which here is everyone. Your website and an attacker's script look exactly the same to Supabase: both are `anon`, using the same publishable key.

A warning for later: when something doesn't work, an AI helper may suggest adding a policy like `for select using (true)` "to fix the error". On `orders` that would make every customer's name and email public. Your website never needs to read orders, so the answer is always no.

## 2. Run the permission check page

Why: this page uses your site's real key, so it can only do what any visitor could do.

1. Start the site with `npm run dev` and open `http://localhost:5173/check.html`. It isn't in the menu on purpose: it's a tool for you, not for customers.
2. Click **Run the check**. It adds one test order called "Permission check", then tries to read, change and delete orders.

You should see five lines, all marked **Pass**:

- A visitor can place an order.
- A visitor can't place an order for 99 items (refused by the `orders_quantity_check` rule).
- A visitor can't read any orders: the database sent back 0, even though there's at least one.
- A visitor can't change orders: 0 orders were changed.
- A visitor can't delete orders: 0 orders were deleted.

If the browser Console is open, it shows a red `Failed to load resource` line (status 400) while the check runs. That's the 99-item order being refused, which is exactly what you want, so here a red line is good news.

3. Open **Table Editor → orders** in Supabase. The "Permission check" order is still there, and its notes still say "Added by the permission check page". Nothing was changed or deleted.
4. Do the same on your live site: `https://your-site.netlify.app/check.html`.

If a line says **Fail**, it tells you which policy to look at. Compare your policies with the original `supabase/setup.sql`, fix them in the SQL Editor, and run the check again.

## 3. Try it like an attacker

Why: an attacker doesn't use your website at all, only your URL and key, so this is the test that counts.

1. Open your live site and the browser Console: press **F12** (on a Mac, **Cmd+Option+J**), or right-click the page, choose **Inspect**, then the **Console** tab.
2. Chrome may ask you to type `allow pasting` before it lets you paste. That's a good warning: never paste code you don't understand. You'll understand this one: it asks your database for every order.
3. Paste this, with your own Project URL and publishable key in the first two lines, and press Enter:

```js
const url = "https://abcdefghijklmnopqrst.supabase.co";
const key = "sb_publishable_AbC123...";
const response = await fetch(`${url}/rest/v1/orders?select=*`, { headers: { apikey: key } });
console.log(response.status, await response.json());
```

You should see `200 []`: the database answered, and there was nothing this visitor was allowed to see. Some projects answer `401` with `permission denied for table orders` instead. That's a pass too. What you must never see is a list of orders.

4. Try the same with a filter, as if you knew a customer's email:

```js
const byEmail = await fetch(`${url}/rest/v1/orders?email=eq.test@example.com`, { headers: { apikey: key } });
console.log(byEmail.status, await byEmail.json());
```

You should see `200 []` again.

## 4. Run the policy test

Why: this test checks the same rules on your computer, in a pretend database, every time you run `npm test`.

```bash
npm test
```

You should see the build, then two rounds of checks ending with:

```
56 passed, 0 failed
```

and then the browser smoke test (or `SKIPPED the browser smoke test` if your computer doesn't have Playwright, which is fine). The policy test runs twice on purpose: once like a Supabase project that gives visitors broad access by default, and once like one that doesn't. Your rules must hold in both.

If you change `setup.sql`, run `npm test` again. A new policy that lets visitors read, change or delete orders makes it fail.

## 5. The three spam limits

Anyone can send your form, including bots. The starter has three limits, from strongest to weakest.

### Limit 1: the database checks (strongest)

Where: the `check (...)` rules and the policy in `supabase/setup.sql`.

What it stops: orders with an empty or 500-letter name, 99 items, a fake-looking email, a pickup date in the past or next year. It works for everyone, including bots that skip your website and call the API directly, because the database itself refuses the row.

What it doesn't stop: valid-looking junk. A bot can still send "Ann, ann@example.com, 2 croissants, tomorrow at 10".

How to test: the "99 items" line on the check page.

### Limit 2: the honeypot

Where: the hidden field near the end of the form in `order.html`, and `isHoneypotFilled()` in `src/spam.js`.

```html
<div class="honeypot" aria-hidden="true">
  <label for="website">Leave this field empty</label>
  <input id="website" name="website" type="text" tabindex="-1" autocomplete="off" />
</div>
```

The field is moved off the screen with CSS, so people never see it and leave it empty. Simple bots fill in every field they find. When the hidden field has text, the page shows "Thanks!" but saves nothing, so the bot thinks it worked and moves on.

What it doesn't stop: a bot written for your site (it would leave the field empty), and anyone calling the API directly (they never see your form).

How to test it:

1. Open the Order page and the Console.
2. Paste this to fill in the hidden field, like a bot would:

```js
document.querySelector("#website").value = "https://spam.example";
```

3. Fill in the form normally and click **Place order**. You see "Thanks!", but no new order appears in the Table Editor.

### Limit 3: one order per 30 seconds (weakest)

Where: `secondsUntilNextOrder()` and `rememberOrderTime()` in `src/spam.js`, used in `src/pages/order.js`.

The browser remembers when it last sent an order. Within 30 seconds, it asks the customer to wait instead of sending another. This stops double clicks and someone hammering the button.

The honest truth: this limit lives in the browser, and the browser belongs to the visitor. Clearing the site's data, opening a private window or calling the API directly gets around it. It slows down a lazy bot. It doesn't stop a determined one.

How to test it: place an order, click **Place another order**, and send a second one right away. You see "Please wait … seconds before sending another one", and only one new order appears in the Table Editor.

### Rebuilt your form?

If you or your AI helper rewrote the form, check that the three limits survived:

1. The hidden `website` field is still inside the `<form>`, and `.honeypot` is still in `src/style.css`.
2. Your submit code still starts with `if (isHoneypotFilled(form))` and checks `secondsUntilNextOrder()` before saving.
3. Every new field has a matching `check (...)` in `setup.sql`. For example, a phone number field needs a column like:

```sql
alter table public.orders add column if not exists phone text not null default '' check (char_length(phone) <= 20);
```

Run new SQL like this in the SQL Editor, and also add it to `setup.sql` so the file always describes your whole database.

## 6. Ideas for later

If real spam ever shows up, these are the next steps up. Each is a bigger project, so talk to your mentor first.

- **A CAPTCHA**, like Cloudflare Turnstile or hCaptcha, checked by a Supabase Edge Function before the order is saved.
- **A limit in the database**, for example at most 5 orders per email per hour, using a small database function that counts recent orders.
- **No links in notes**: spam almost always contains links. `check (notes !~* 'https?://')` refuses notes with a web address.
- **A notification** when an order arrives, so you notice a flood quickly: Supabase Database Webhooks can call an email service.

## You're done when

- [ ] All five lines on the check page pass, locally and on the live site.
- [ ] The Console snippet returns an empty list (or "permission denied"), never orders.
- [ ] `npm test` says `56 passed, 0 failed`.
- [ ] You tested the honeypot and the 30-second limit yourself.
- [ ] You deleted the "Permission check" test orders in the Table Editor.

Next: in Week 6 you build your main features with GitHub Copilot, in small tested steps. Week 7's [feature recipes](week-07-features.md) are ready when you are.
