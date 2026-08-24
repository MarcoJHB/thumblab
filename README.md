# ThumbLab

A YouTube thumbnail preview console. Upload up to three thumbnail variants, see them dropped into a realistic, freshly-generated YouTube home page or search results feed, and check how they read on desktop, tablet, and mobile before you publish.

The site itself is a single self-contained `index.html` — no build step, no server, no dependencies. Everything (your uploaded images included) stays in your browser; nothing is uploaded anywhere. `cloudflare-worker.js` is a companion file — a tiny proxy that powers the site with real YouTube data for every visitor, with your API key kept fully private (see below). There's no key field anywhere in the UI — visitors never see or enter anything; they just get real data.

## Features

- Upload up to 3 thumbnail variants at once, each with its own title, dropped into the feed above the fold so you actually see them without scrolling
- Add up to 3 competitor videos by channel name, @handle, or URL — ThumbLab automatically pulls each channel's most recent public upload live from YouTube and drops it into the feed alongside yours (no uploading their thumbnail yourself)
- Upload your channel avatar and set a channel name (defaults to "ThumbLab")
- Switch device: desktop, tablet, mobile
- Switch preview surface: home page grid or search results list (with your own search query)
- Switch YouTube's own theme: light or dark
- Click any category chip (Home) or tab (Search: Videos / Shorts / Live / Playlists) to filter what's shown
- "New videos" pulls a fresh set of surrounding videos
- "Shuffle order" re-shuffles where your thumbnail(s) and competitors land near the top of the feed
- Your thumbnails and competitor videos aren't marked or highlighted in any way — they sit in the feed exactly like everything else, so what you see is an honest read of how they hold up

## Real YouTube data, private by design

ThumbLab shows real trending/search videos and real competitor uploads to every visitor automatically — there's no key field in the UI at all, nothing for a visitor to find or paste. This works through a small serverless proxy that holds the API key server-side; the browser only ever talks to the proxy, never to `googleapis.com` directly, so the key never appears anywhere in `index.html`, in view-source, or in a visitor's network tab. Until the proxy is deployed and wired up, ThumbLab falls back to generated placeholder videos automatically (and says so in the status line) — it never breaks, it just isn't live yet.

**Already done for this copy:**

- A dedicated Google Cloud project (`thumblab`) was created with the YouTube Data API v3 enabled, and an API key was generated and restricted so it can only call that one API — it can't touch anything else on the account even if it ever leaked. The raw key value isn't written into this repo (secrets never belong in a static site's source); it was handed over separately.
- A Cloudflare Worker named `thumblab-proxy` was created and deployed, live at `https://thumblab-proxy.marcothepolo.workers.dev`.
- `index.html`'s `PROXY_URL` already points at that Worker, and `cloudflare-worker.js`'s `ALLOWED_ORIGIN` is already set to `https://marcojhb.github.io` (lowercase — GitHub Pages always serves your site at the lowercase form of your username, no matter how your account name is displayed elsewhere, and the Worker now compares origins case-insensitively too, as a safety net against this exact mistake).

**One manual step left** — the Cloudflare dashboard's live code editor couldn't be driven by browser automation reliably, so the Worker is still running its placeholder "Hello World" code. To finish:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → `thumblab-proxy` → **Edit code**.
2. Select all the existing code and delete it, then paste in the full contents of `cloudflare-worker.js` from this folder. Click **Deploy**.
3. Go to **Settings → Variables and Secrets → Add**. Name it `YOUTUBE_API_KEY`, set type to **Secret**, and paste in the API key value you were given. Save and deploy — this is where the key lives now; it's encrypted at rest and never sent to the browser.

That's it — once that's deployed, every visitor sees live YouTube data and live competitor lookups automatically, with nothing to configure on their end and nothing of yours exposed to them. No further changes to `index.html` are needed.

Worth knowing:

- **It's a shared, capped resource.** Every visitor's page load, search, and competitor lookup draws from the key's 10,000 units/day free quota. If the quota runs out, ThumbLab falls back to generated placeholders for everyone until it resets the next day — there's no surprise billing risk unless you've specifically requested a quota increase.
- **The `ALLOWED_ORIGIN` check is a speed bump, not a hard guarantee** — a non-browser client can set arbitrary headers — but it stops casual reuse and keeps the key from appearing anywhere a visitor (or a search engine, or view-source) could see it, which is the actual goal here.
- Browsing categories on the home page is cheap (1 unit per click); searching costs more (100 units), so search only fires on **Enter**, **Go**, a search tab click, or **New videos**. A competitor lookup costs a few units (channel lookup + playlist + stats), firing once when you tab away from that field or press Enter.

## Run it locally

Just open `index.html` in a browser — double-click it, or in VS Code install the "Live Server" extension and click "Go Live". No install, no npm, no build.

## Publish it on GitHub Pages

1. On [github.com](https://github.com), create a new repository (e.g. `thumblab`). Don't initialize it with a README — you already have one.
2. In VS Code, open the folder containing these files (`index.html`, `README.md`, `LICENSE`, `cloudflare-worker.js`).
3. Open the Source Control panel (the branch icon in the left sidebar) and click **Initialize Repository**.
4. Stage and commit the files (the checkmark button, with a message like "Initial commit").
5. Click **Publish Branch**, pick the GitHub repository you just created, and push.
   - If you'd rather use the terminal instead of the Source Control panel:
     ```
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/<your-username>/thumblab.git
     git push -u origin main
     ```
6. On GitHub, go to the repository's **Settings → Pages**.
7. Under **Build and deployment → Source**, choose **Deploy from a branch**. Under **Branch**, choose `main` and `/ (root)`, then **Save**.
8. Wait a minute or two, then visit `https://<your-username>.github.io/thumblab/`.

Any time you want to update the site, edit `index.html`, commit, and push — GitHub Pages redeploys automatically within a minute or so.

## License

MIT — see `LICENSE`. Use it, fork it, put your own spin on it.
