# Troubleshooting

Find the message you see, then read what it means and how to fix it. If nothing here matches, copy the exact error (the first red line is usually the important one) and ask your mentor or your AI helper.

**Where to find error messages:**

- **The terminal** shows errors from `npm install`, `npm run dev`, `npm run build` and `git`.
- **The browser Console** shows errors from the website itself. Press **F12** (on a Mac, **Cmd+Option+J**), or right-click the page, choose **Inspect**, then the **Console** tab. Red lines are errors.
- **Netlify's deploy log** shows why a live build failed: open **Deploys**, click the failed deploy and scroll to the first red line.

---

## Setup

### Node or npm not found

**You see:** `node: command not found` or `npm: command not found` (Mac), or `'node' is not recognized as an internal or external command` (Windows).

**What it means:** Node.js isn't installed, or the terminal was opened before you installed it.

**How to fix it:**

1. Install the **LTS** version from [nodejs.org](https://nodejs.org) with the default options.
2. Close VS Code completely (all windows) and open it again, so its terminal sees the new install.
3. Check again:

```bash
node --version
```

You should see `v22` or higher. If it still isn't found on Windows, restart the computer.

### npm install errors

**You see:** red lines starting with `npm ERR!` or `npm error` after `npm install`.

**What it means:** npm couldn't download or install the packages. The most common reasons, in order:

- **You're in the wrong folder.** npm needs the folder that contains `package.json`. In VS Code, open the project folder itself (**File → Open Folder**), then open a new terminal.
- **`ENOENT: no such file or directory, open '…package.json'`** means the same thing: wrong folder.
- **`EBADENGINE` or `Unsupported engine`**: your Node.js is too old. Install the LTS version from [nodejs.org](https://nodejs.org).
- **`ETIMEDOUT`, `ECONNRESET` or `network`**: the internet connection dropped or a school network blocks npm. Try again, or use another network such as home Wi-Fi or a phone hotspot.
- **`EACCES` or `permission denied`** (Mac): don't use `sudo`. Make sure the project is inside your own user folder, such as Documents.

**How to fix it:** fix the cause above, then run `npm install` again. If it still fails, delete the `node_modules` folder (not `package-lock.json`) and try once more.

### Port already in use

**You see:** `Port 5173 is in use, trying another one...`

**What it means:** another dev server is already running, maybe in a terminal you forgot about. Vite picks the next free port, such as 5174.

**How to fix it:** open the address Vite prints this time. Or find the other terminal and press **Ctrl+C** to stop it, so you only have one server running.

### Blank page

**You see:** a white page, or a page that's missing its menu or form.

**What it means:** a JavaScript error stopped the page. The error is in the browser Console.

**How to fix it:**

1. Open the Console (**F12**) and read the first red line. It names the file and line number, for example `order.js:42`.
2. Common causes: a typo or missing bracket after an edit, an `import` of a file that doesn't exist (`Failed to resolve import`), or a renamed `id` that the script still looks for (`Cannot read properties of null`).
3. Undo your last change (**Ctrl+Z** in the file), or paste the error and the file into your AI helper and ask what's wrong.

### Changes don't show up

**What it means:** the file isn't saved, the dev server isn't running, or the browser is showing an old copy.

**How to fix it:** save the file (a dot on the file's tab in VS Code means unsaved). Check the terminal: the dev server should be running. Reload the page with **Ctrl+Shift+R** (**Cmd+Shift+R**). Changed `vite.config.js` or `.env`? Restart the dev server. On the live site, check that you pushed and that the latest deploy finished.

---

## Supabase

### Environment variables not picked up

**You see:** the yellow "Local mode" banner is still there after you set up Supabase.

**What it means:** the site can't see both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

**How to fix it:**

1. The file is called exactly `.env`, not `.env.txt` or `env`, and it sits next to `package.json`, not inside `src/`.
2. The names are spelled exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Vite only passes variables that start with `VITE_` to the browser.
3. You replaced both example values from `.env.example` with your own.
4. Restart the dev server: **Ctrl+C**, then `npm run dev`. Vite reads `.env` only when it starts.
5. On the live site: add both variables in Netlify (**Environment variables**), then start a new deploy (**Deploys → Trigger deploy**). Old deploys never see new variables.

### Invalid API key

**You see:** `Invalid API key` in the browser Console, or the order form says "Our order system isn't working right now."

**What it means:** Supabase doesn't accept the key in `VITE_SUPABASE_PUBLISHABLE_KEY`.

**How to fix it:**

1. Copy the publishable key again from **Project Settings → API Keys**. Make sure you got all of it.
2. Check that the URL and the key come from the **same** project.
3. If you created new keys or disabled the legacy keys, update `.env` and Netlify with the new one.
4. Restart the dev server, and redeploy on Netlify.

### new row violates row-level security policy

**You see:** `new row violates row-level security policy for table "orders"`, or the form says "This order couldn't be accepted. Check the pickup time and try again."

**What it means:** the database refused the new order because no policy allows it.

**How to fix it:**

- **The policy isn't there.** Run all of `supabase/setup.sql` again in the SQL Editor.
- **The pickup time is outside the policy's window** (between now and 60 days ahead). Check the date and time, and that the computer's clock is right.
- **You (or your AI helper) added `.select()` after `.insert()`.** That asks for the new row back, which is a read, and nobody may read orders. Remove `.select()`. Never fix this by adding a select policy to `orders`: that would make every customer's details public.

### violates check constraint

**You see:** `new row for relation "orders" violates check constraint "orders_quantity_check"` (or another name ending in `_check`), or the form says "One of your answers isn't allowed."

**What it means:** a value broke one of the limits in `setup.sql`. The name tells you which column: `orders_quantity_check` is the quantity, `orders_email_check` the email, and so on.

**How to fix it:** make the form's checks in `src/validate.js` match the limits in `setup.sql`, so people see a friendly message before sending. If you changed a limit on purpose, change it in the database too. `create table if not exists` doesn't change a table that already exists, so use `alter table`. For example, to allow up to 24 items:

```sql
alter table public.orders drop constraint if exists orders_quantity_check;
alter table public.orders add constraint orders_quantity_check check (quantity between 1 and 24);
```

### permission denied for table

**You see:** `permission denied for table orders`.

**What it means:** in this project, visitors aren't allowed to use the table through the API at all. The `grant` line in `setup.sql` wasn't run.

**How to fix it:** run all of `supabase/setup.sql` again in the SQL Editor. (For orders, "permission denied" when *reading* is fine: that's the lock doing its job.)

### Could not find the table

**You see:** `Could not find the table 'public.orders' in the schema cache`, or `relation "public.orders" does not exist`.

**What it means:** the table doesn't exist in the project your site is connected to.

**How to fix it:** run `supabase/setup.sql` in the SQL Editor of the right project (compare the Project URL with the one in `.env`). Wait a few seconds and try again.

### Failed to fetch

**You see:** `TypeError: Failed to fetch` in the Console, or the form says "We couldn't reach the order system."

**What it means:** the browser couldn't reach Supabase at all.

**How to fix it:** check your internet connection. Check `VITE_SUPABASE_URL` for typos. Open the Supabase dashboard: free projects pause after about a week with no activity, and a paused project has a **Restore** button.

### The build stops: secret key

**You see:** `VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key`.

**What it means:** you pasted the secret key (`sb_secret_…`) or the `service_role` key. The starter stops the build so that key never reaches the internet.

**How to fix it:** replace it with the publishable key (`sb_publishable_…`) in `.env` and in Netlify. If the secret key was ever pushed to GitHub or deployed, rotate it: create a new secret key in **Project Settings → API Keys** and delete the old one.

### The build stops: URL

**You see:** `VITE_SUPABASE_URL should look like https://abcdefghijklmnopqrst.supabase.co`.

**What it means:** the URL has something extra, like `/rest/v1/` at the end, or it's the address of the dashboard instead of your project.

**How to fix it:** copy the **Project URL** from **Project Settings → Data API** and paste it with nothing after `.supabase.co`.

---

## Git and GitHub

### .env shows up in git status

**What it means:** Git is about to upload your settings file. The publishable key in it isn't secret, but `.env` files often end up holding real secrets later, so it must never be on GitHub.

**How to fix it:** check that `.gitignore` is in the project folder and contains the line `.env`. If `.env` was already committed, take it out of Git (your file stays on your computer):

```bash
git rm --cached .env
```

You should see `rm '.env'`. Then commit and push as usual.

### git push rejected

**You see:** `! [rejected] main -> main (fetch first)` or `Updates were rejected because the remote contains work that you do not have locally`.

**What it means:** GitHub has changes your computer doesn't, for example from an edit on github.com or from another computer.

**How to fix it:** bring those changes down first, then push:

```bash
git pull --no-rebase
```

You should see the changes being merged. If an editor opens asking for a message, save and close it. If Git reports a **conflict**, VS Code highlights the files: choose which version to keep, save, commit, then push again. Then:

```bash
git push
```

You should see a line ending in `main -> main`.

Other push problems:

- **`Authentication failed` or `Permission denied`**: GitHub doesn't accept passwords in the terminal. Push once from VS Code's **Source Control** panel and sign in to GitHub when it asks, or use GitHub Desktop.
- **`src refspec main does not match any`**: there's nothing committed yet. Commit first, then push.

---

## Netlify

### Netlify build failing

**You see:** a red **Failed** deploy in Netlify.

**What it means:** `npm run build` didn't work on Netlify's computer. The deploy log says why: open the failed deploy and scroll to the first red line.

**How to fix it**, depending on what the log says:

- **`Command failed` or `missing script: build`:** the build command must be `npm run build`. Check it in the project's build settings, and leave the base directory empty.
- **`Deploy directory 'dist' does not exist`** or your live site shows Netlify's "Page not found" for every page: the publish directory must be `dist`.
- **`VITE_SUPABASE_PUBLISHABLE_KEY is a SECRET key`:** fix the variable in Netlify (see [The build stops: secret key](#the-build-stops-secret-key)).
- **The log mentions secrets scanning:** you marked a `VITE_` variable as secret. Those two values are meant to be public. Edit the variable and turn off **Contains secret values**, then redeploy. If Netlify still flags your Supabase URL or publishable key, add a variable `SECRETS_SCAN_OMIT_KEYS` with the value `VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY`.
- **It works on your computer but not on Netlify:** run `npm run build` on your computer. If it fails there too, fix that first. If it works locally, compare the environment variables, and check that every file you need is committed (`git status`).

### The live site still shows local mode

**What it means:** the environment variables aren't set on Netlify, or the deploy started before you added them.

**How to fix it:** see [Environment variables not picked up](#environment-variables-not-picked-up), step 5.
