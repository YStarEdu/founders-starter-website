# Week 4: Connect Supabase

Right now each order is saved only in the browser that placed it, so you, the owner, never see it. This week you give the site a real database. Orders from any phone or laptop go to one table, and only you can read them.

You need your project from Week 3 and about 45 minutes.

## 1. Create a Supabase project

Why: Supabase gives you a Postgres database on the internet, with an API your website can talk to.

1. Go to [supabase.com](https://supabase.com), click **Start your project** and sign in with GitHub.
2. Click **New project**. Choose your personal organization on the **Free** plan.
3. Give the project your product's name.
4. For the database password, click **Generate a password**, then save it somewhere safe, like a password manager. You won't need it in this course, and Supabase can't show it to you again.
5. For the region, choose the one closest to your customers. In Canada that's **Canada (Central)**. Your privacy page will mention it later.
6. Click **Create new project** and wait a minute or two while it gets ready.

## 2. Create the orders table

Why: `supabase/setup.sql` creates the table, its limits and its security rules in one go, so you don't have to click them together by hand.

1. In VS Code, open `supabase/setup.sql`, select everything (**Ctrl+A**, or **Cmd+A** on a Mac) and copy it.
2. In Supabase, open the **SQL Editor** from the left sidebar and start a **New query**.
3. Paste and click **Run**.

You should see `Success. No rows returned`.

Supabase may first warn that the query has a "destructive operation". That's the `drop policy if exists` line, which only replaces the old copy of the policy if you run the file again. Confirm that you want to run it.

4. Open the **Table Editor** from the left sidebar and click **orders**. You'll see an empty table with the columns `id`, `created_at`, `name`, `email`, `item`, `quantity`, `pickup_at` and `notes`.

## 3. Copy your project's URL and publishable key

Why: these two values tell your site which database to talk to. They're designed to be public, and the rules in `setup.sql` decide what anyone can do with them.

1. In Supabase, click **Connect** at the top of the project page. You can also find the values under **Project Settings**: the Project URL under **Data API**, and the keys under **API Keys**.
2. The **Project URL** looks like `https://abcdefghijklmnopqrst.supabase.co`.
3. The **publishable key** starts with `sb_publishable_`. Older projects show an **anon public** key instead, a long text that starts with `eyJ`. That one works too.

Never use the **secret** key (`sb_secret_…`) or the **service_role** key. They skip every security rule, so anyone who finds them can read and delete all your data. If one ends up in your site by mistake, the build stops with an error that says so.

## 4. Put them in a `.env` file

Why: a `.env` file keeps settings out of your code, and `.gitignore` makes sure Git never uploads it.

1. In VS Code's file list, right-click `.env.example`, choose **Copy**, then right-click an empty spot in the file list and choose **Paste**. Rename the copy to exactly `.env`.
2. Open `.env` and replace the two example values with yours. No quotes, and no spaces around the `=`:

```
VITE_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_AbC123...
```

3. Save the file.

## 5. Restart the dev server

Why: Vite reads `.env` only when it starts, so it hasn't seen your new values yet.

Click in the terminal that's running the site, press **Ctrl+C** to stop it, then start it again:

```bash
npm run dev
```

You should see `Local: http://localhost:5173/` again. Open it: the yellow local-mode banner is gone. That means the site found your Supabase settings.

## 6. Place a real order

Why: this proves that orders now reach your database.

1. Open the Order page and place an order. Use an email that ends in `@example.com` (for example `test@example.com`) for every test order, so they're easy to find and delete before launch.
2. In Supabase, open **Table Editor → orders**. Your order is there. If you don't see it, click the refresh button above the table.

Notice what just happened: the website could add the order, but it can't read it back. Only you can, in the dashboard. That's the whole security design of this starter, and Week 5 proves it.

## 7. Add the two variables on Netlify

Why: `.env` exists only on your computer, so Netlify needs its own copy of the two values to build the live site.

1. In Netlify, open your project, then its configuration, then **Environment variables**.
2. Click **Add a variable**. Key: `VITE_SUPABASE_URL`. Value: your Project URL. Save it.
3. Add a second variable. Key: `VITE_SUPABASE_PUBLISHABLE_KEY`. Value: your publishable key. Save it.
4. If Netlify offers a **Contains secret values** option, leave it off. These two values end up in your public website's code anyway (that's fine, they're publishable), and marking them secret makes Netlify's secret scanner stop the build.
5. Open **Deploys**, click **Trigger deploy** and choose **Deploy project** (or **Deploy site**). Variables only reach new builds.
6. When the deploy is done, open the live site on your phone: no yellow banner. Place a test order and find it in the Table Editor.

## 8. Save your work

Why: this commit records that the project is now connected to Supabase.

First check what's about to be saved:

```bash
git status
```

You should see a list of changed files. `.env` must not be in it. If it is, stop and see [Troubleshooting](troubleshooting.md#env-shows-up-in-git-status).

```bash
git add .
```

You won't see a message.

```bash
git commit -m "Connect Supabase"
```

You should see `[main …] Connect Supabase`. If nothing changed in your files this week, Git says `nothing to commit`, and that's fine too.

```bash
git push
```

You should see a line ending in `main -> main`.

## How it works

You don't need to memorize this, but it helps when something goes wrong.

- `src/config.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If either is missing, the site stays in local mode and shows the banner.
- `src/store.js` has `saveOrder()`. In local mode it saves to `localStorage`; with Supabase it runs `supabase.from("orders").insert(order)`. The pages call `saveOrder()` the same way in both modes.
- `supabase/setup.sql` creates the `orders` table. Each `check (...)` is a rule the database enforces on every new order, for example `quantity between 1 and 12`.
- `alter table … enable row level security` locks the table: through the API, nobody can do anything unless a **policy** allows it.
- The only policy is `for insert`: anyone can add an order, if the pickup time is between now and 60 days ahead. There's no policy for select, update or delete, so nobody can read, change or delete orders through the API.
- That's also why `saveOrder()` doesn't add `.select()` after `.insert()`. Asking for the new row back is a read, and reading isn't allowed.
- The Table Editor works because you're signed in to Supabase as the project's owner. Owners aren't limited by these policies.

## You're done when

- [ ] The `orders` table exists in Supabase.
- [ ] Locally, there's no yellow banner and a test order shows up in the Table Editor.
- [ ] On Netlify, there's no yellow banner and a test order from your phone shows up too.
- [ ] `.env` is not on GitHub.

Something not working? Check [Troubleshooting](troubleshooting.md): it covers `Invalid API key`, `new row violates row-level security policy`, the banner that won't go away, and more.

Next week: [prove that nobody can read your orders](week-05-permissions.md), and slow down spam.
