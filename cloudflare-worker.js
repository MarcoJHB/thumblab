// ThumbLab YouTube API proxy — Cloudflare Worker
//
// Purpose: lets ThumbLab call the YouTube Data API v3 with a key that stays
// fully private on the server. The browser never sees it, so it can't be
// read from page source, dev tools, or network requests.
//
// Setup (dashboard only, no CLI needed):
//   1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Worker.
//   2. Give it a name (e.g. "thumblab-proxy") and deploy the default template.
//   3. Click "Edit code", delete everything, paste this whole file, click "Deploy".
//   4. Go to Settings -> Variables and Secrets -> Add.
//      Name: YOUTUBE_API_KEY   Type: Secret   Value: <your YouTube Data API v3 key>
//      Save and deploy.
//   5. Below, set ALLOWED_ORIGIN to your GitHub Pages URL (no trailing slash),
//      e.g. "https://your-username.github.io". Deploy again.
//   6. Copy your worker's URL (looks like https://thumblab-proxy.<you>.workers.dev)
//      and paste it into PROXY_URL near the top of index.html's <script> block.
//
// Your YouTube API key lives only in this Worker's encrypted secret storage —
// it is never sent to, or readable by, anyone visiting the ThumbLab page.

export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = "https://marcojhb.github.io"; // <-- set this (lowercase — GitHub Pages always serves your site at the lowercase form of your username, whatever case your account displays)
    const ALLOWED_PATHS = new Set(["videos", "search", "channels", "playlistItems"]);

    // Compared case-insensitively on purpose: browsers always send a lowercase
    // Origin/Referer host, but it's easy to paste ALLOWED_ORIGIN above with the
    // wrong case by hand — normalizing here means that typo can't cause a
    // false "Forbidden" for your own real site.
    const allowedOriginLower = ALLOWED_ORIGIN.toLowerCase();
    const origin = (request.headers.get("Origin") || "").toLowerCase();
    const referer = (request.headers.get("Referer") || "").toLowerCase();
    const allowed = origin === allowedOriginLower || referer.indexOf(allowedOriginLower + "/") === 0 || referer === allowedOriginLower;

    function cors(resp) {
      const headers = new Headers(resp.headers);
      headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      headers.set("Vary", "Origin");
      return new Response(resp.body, { status: resp.status, headers });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (!allowed) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    if (!ALLOWED_PATHS.has(path)) {
      return new Response("Not found", { status: 404 });
    }

    if (!env.YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: { message: "Worker is missing the YOUTUBE_API_KEY secret." } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const upstream = new URL("https://www.googleapis.com/youtube/v3/" + path);
    for (const [k, v] of url.searchParams) {
      if (k === "key") continue; // never trust a client-supplied key
      upstream.searchParams.set(k, v);
    }
    upstream.searchParams.set("key", env.YOUTUBE_API_KEY);

    let ytRes;
    try {
      ytRes = await fetch(upstream.toString());
    } catch (err) {
      return cors(new Response(
        JSON.stringify({ error: { message: "Upstream fetch failed." } }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      ));
    }

    const body = await ytRes.text();
    return cors(new Response(body, {
      status: ytRes.status,
      headers: { "Content-Type": "application/json" },
    }));
  },
};
