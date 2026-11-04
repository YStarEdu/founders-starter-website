# Week 3: Run it, change it, deploy it

By the end of this guide the starter runs on your computer, it looks like your product, and it's live on the internet. Follow the steps in order. Each one says why you're doing it.

You need a laptop (Windows or Mac), a GitHub account and about an hour.

## 1. Install the tools (once per computer)

Why: these three programs let you run, edit and save a web project on your own computer.

1. **Node.js** runs JavaScript projects. Go to [nodejs.org](https://nodejs.org), download the **LTS** version, and install it with the default options.
2. **VS Code** is the code editor. Download it from [code.visualstudio.com](https://code.visualstudio.com) and install it.
3. **Git** saves versions of your code. On Windows, install it from [git-scm.com](https://git-scm.com) with the default options. On a Mac it's already there: the first time you use it, your Mac may offer to install "command line developer tools". Say yes.

Now open VS Code and choose **Terminal → New Terminal** in the menu. A panel opens at the bottom. This is the terminal: you type a command, then press Enter.

Check that Node.js works:

```bash
node --version
```

You should see a version number such as `v22.12.0`. Any version that starts with `v22` or higher is fine.

Check npm, the tool that installs packages (it comes with Node.js):

```bash
npm --version
```

You should see a number such as `10.9.2`. If either command says "not found" or "not recognized", see [Troubleshooting](troubleshooting.md#node-or-npm-not-found).

## 2. Make your own copy on GitHub

Why: your copy is where your code lives, and Netlify will build your website from it.

1. Open the website starter link your mentor shared. It's a template repository on GitHub.
2. Click **Use this template**, then **Create a new repository**.
3. Pick yourself as the owner and give it your product's name, for example `crumb-bakery`. Click **Create repository**.

## 3. Download it to your computer

Why: you change code on your computer, then send the changes back to GitHub.

1. On your new repository's page, click the green **Code** button and copy the HTTPS address. It ends in `.git`.
2. In the VS Code terminal, go to your Documents folder, where your project will live:

```bash
cd Documents
```

You won't see a message. That's normal: no news is good news in the terminal.

3. Download (clone) your repository. Paste your own address instead of this example:

```bash
git clone https://github.com/your-name/crumb-bakery.git
```

You should see `Cloning into 'crumb-bakery'...` and then `done`. If Git asks you to sign in to GitHub, sign in in the window that opens.

4. In VS Code, choose **File → Open Folder** and open the new folder. If VS Code asks whether you trust the authors, choose **Yes**.
5. Open a fresh terminal with **Terminal → New Terminal**. It now starts inside your project folder.

## 4. Install and run

Why: `npm install` downloads the two packages the starter uses (Vite, which runs the site, and Supabase's library) into a folder called `node_modules`.

```bash
npm install
```

You should see `added 27 packages` (the number can differ). Yellow `warn` lines are fine; red `ERR!` lines are not, see [Troubleshooting](troubleshooting.md#npm-install-errors).

Why: `npm run dev` starts a small web server on your computer that shows your site and refreshes it every time you save a file.

```bash
npm run dev
```

You should see something like:

```
  VITE v8.3.5  ready in 300 ms

  ➜  Local:   http://localhost:5173/
```

Hold **Ctrl** (**Cmd** on a Mac) and click the address, or type it into your browser. You'll see Crumb, with a yellow banner at the top: "Local mode: data is saved in this browser only. Connect Supabase in Week 4." That's expected this week.

Leave this terminal running while you work. To stop the server, click in the terminal and press **Ctrl+C**.

## 5. Look around

Why: knowing where each part lives makes it much easier to change, by hand or with AI.

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Headline, three benefits, a button to order |
| Menu | `menu.html` | Items and prices, built from `src/bakery.js` |
| About | `about.html` | The story, opening hours and address |
| Order | `order.html` | The order form |
| Privacy | `privacy.html` | A template you fill in before launch (Week 10) |
| Not found | `404.html` | Shown when someone opens an address that doesn't exist |
| Permission check | `check.html` | A tool for you in Week 5. It's not in the menu |

Try the order form:

1. Click **Place order** with the form empty. A red box lists what to fix, and each field shows its own message.
2. Fill it in properly and send it. You'll see "Thanks! Your order is in."

Where did the order go? Into your browser's own storage. To see it, right-click the page, choose **Inspect**, open the **Application** tab (in Firefox: **Storage**), then **Local Storage** → `http://localhost:5173` → `crumb-orders`. Nobody else can see it, not even you on another device. Week 4 fixes that.

## 6. Make it yours

Why: this is where the starter becomes your product.

| To change | Edit |
| --- | --- |
| The headline and words on the home page | `index.html` |
| The header menu and logo, on every page at once | `src/partials/header.html` |
| The footer: address, email, phone | `src/partials/footer.html` |
| Menu items, prices and opening hours | `src/bakery.js` |
| Colours and fonts | the `:root` block at the top of `src/style.css` |
| The title in the browser tab and on Google | `<title>` and `<meta name="description">` in each `.html` file |

Save a file and the browser updates by itself.

Not a bakery? Keep the same shape and rename things: the Menu page becomes "Services" or "Prices", and the Order page becomes "Book" or "Request a quote". If you change what the form asks for, change these together: the field in `order.html`, its check in `src/validate.js`, and (from Week 4) its column in `supabase/setup.sql`. Ask your AI helper to change all of them in one go.

Prompts that work well with an AI helper. Be specific, and name the files:

- "In this Vite project, rename the business from Crumb to Paws & Go everywhere: every .html file's title and text, and src/partials/header.html and footer.html."
- "In src/bakery.js, replace MENU with these dog-walking services and prices: … Keep the same shape (category, name, price, description)."
- "Change the colours in the :root block of src/style.css to a calm green theme. Keep enough contrast that text is easy to read."

Change one thing at a time and check the browser after each change. If something breaks, press **Ctrl+Z** (**Cmd+Z**) in the file to undo, or paste the red error from the browser Console into your AI helper and ask what it means.

## 7. Check that it builds

Why: Netlify builds your site with this exact command, so if it fails here it will fail there too.

Open a second terminal with the **+** button in the terminal panel, so the dev server keeps running in the first one:

```bash
npm run build
```

You should see a list of files in `dist/` and `✓ built in` with a time. If you see an error instead, read its first line: it usually names the file and line that's wrong.

## 8. Save your work to GitHub

Why: a commit is a saved version of your project, and pushing sends it to GitHub, where it's backed up and Netlify can see it.

Add all your changes to the next commit:

```bash
git add .
```

You won't see a message. Now save the version with a short description:

```bash
git commit -m "Make the starter my own"
```

You should see a line like `[main 1a2b3c4] Make the starter my own` and how many files changed. If Git asks who you are, run the two `git config` commands it suggests with your name and email, then commit again.

Send it to GitHub:

```bash
git push
```

You should see a line ending in `main -> main`. Refresh your repository on GitHub: your changes are there.

You can also do this without the terminal: open the **Source Control** panel in VS Code (the branch icon on the left), type a message, click **Commit**, then **Sync Changes**.

## 9. Put it online with Netlify

Why: Netlify turns your GitHub repository into a live website, and rebuilds it every time you push.

1. Go to [netlify.com](https://www.netlify.com) and sign up with your GitHub account.
2. Click **Add new project** (some accounts say **Add new site**), then **Import an existing project**, then **GitHub**. Allow Netlify to see your repositories and pick this one.
3. Netlify reads the settings from `netlify.toml`: build command `npm run build`, publish directory `dist`. Leave them as they are and click **Deploy**.
4. After a minute or two your site is live at an address like `https://wonderful-cake-123abc.netlify.app`. To choose a nicer name, open the project's configuration and look for **Change project name** (on some accounts, **Change site name**).

From now on, every `git push` updates the live site within a couple of minutes. Watch it happen under **Deploys**.

## 10. Check the live site

Why: real visitors will use phones on mobile data, not your laptop.

- Open your netlify.app address on your phone. Do the menu, buttons and form fit the screen?
- Place a test order. You'll see the confirmation. It's saved only in that phone's browser for now, which is exactly what local mode means.

## You're done when

- [ ] `npm run dev` shows your version of the site on your computer.
- [ ] The business name, words, menu and colours are yours.
- [ ] Your changes are pushed to GitHub.
- [ ] The site is live on Netlify and works on your phone.

Next week: [connect Supabase](week-04-data.md), so orders from every visitor end up in one place that only you can read.
