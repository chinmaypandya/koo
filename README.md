<p align="center">
  <img src=".github/readme/icon.png" width="96" alt="Koo icon: Koo the explorer bird">
</p>

<h1 align="center">Koo</h1>

<p align="center">
  <img src="https://visitor-badge.laobi.icu/badge?page_id=chinmaypandya.koo&left_text=visitors" alt="Visitor count">
</p>

<p align="center">
  <b>An AI agent in your browser that hunts for flats in Facebook groups for you.</b><br>
  Open a group, press <b>Start</b>. Koo reads every post and lists only the flats that match your search.
</p>

<table>
  <tr>
    <td width="40%" valign="top"><img src=".github/readme/panel.png" alt="Koo side panel: status, Start/Stop, energy bar, side buttons and Koo flying over the city"></td>
    <td valign="top">

### What it does

| | |
|---|---|
| 📜 **Reads posts for you** | Scrolls the group at a human pace, expands "See more", strips Facebook's hidden junk text |
| 🔁 **Never twice** | Remembers posts it has read (30 days), so later runs only see new ones |
| 🤖 **AI judges each flat** | Budget, size range, location & distance, amenities, gender, in one AI request per 5 posts |
| 🏆 **Matches with contacts** | Rent, deposit, BHK, distance, society, phone numbers with country code |
| ↕️ **Sort & export** | Order by rent, deposit, amenities (multi-column); export all or only new to Excel (CSV) |
| 🔑 **Your key or credits** | Use your own OpenAI / Gemini / Anthropic key, **or** 🪙 Koo credits (UPI packs coming soon) |
| ✏️ **Your rules** | Edit the AI instructions yourself; the default is built in |

</td>
  </tr>
</table>

---

## 🚀 Use it yourself (no coding needed)

The extension is already built in **`output/v1/chrome-mv3/`**. You only need Google Chrome.

| Step | Do this |
|:-:|---|
| **1** | **Download:** on GitHub click **Code → Download ZIP** and unzip it, or `git clone` the repo |
| **2** | Open **`chrome://extensions`** in the address bar |
| **3** | Turn on **Developer mode** (top-right switch). It only allows installing from a folder |
| **4** | Click **Load unpacked** and select the **`output/v1/chrome-mv3`** folder (the one with `manifest.json`) |
| **5** | Click the 🧩 puzzle icon and **pin Koo** |
| **6** | Open the panel and go to **⚙️ Search settings**: choose how the AI is paid for and fill in what you want |
| **7** | Open a Facebook flat-rental group (logged in) and press **Start**. Matches appear under **🏆** |

| To… | Do this |
|---|---|
| **Update** | Download again (or `git pull`), then press ↻ on Koo's card in `chrome://extensions`. Your data is kept |
| **Remove** | Press **Remove** on its card. This also deletes its stored data, including your API key |

---

## 🧭 The panel

| Button | Opens |
|:-:|---|
| ⚙️ | **Search settings**: location & max distance, budget, size, amenities, gender, AI provider, AI instructions |
| 📜 | **Activity log**: every step the agent took |
| 🪙 | **Koo credits**: local mode for now; sign-in and UPI packs are coming soon |
| 🏆 | **Matches**: sort chips, CSV export, cart-style items with rent on the right and contacts at the bottom |
| 🗂️ | **All decisions**: every post the AI checked, with its reason |
| 🗑️ | **Clear history**: click twice; forgets read posts, decisions and the log |

### Search filters

| Filter | How the AI uses it |
|---|---|
| **Target location + max distance** | Estimates the distance from the post's area to yours; farther = not a match |
| **Budget** | Rent above it = not a match; shows how far over or under (`+₹2,000` / `−₹4,000`) |
| **Size** | A range: `2-3 BHK` means 2 ≤ size < 4, so 2, 2.5, 3 and 3.5 BHK pass |
| **Amenities** | Scored 0–100% for sorting |
| **Your gender** | Skips posts limited to another gender ("girls only", "male replacement") |

---

## 🐦 Meet Koo

<table>
  <tr>
    <td width="180"><img src=".github/readme/koo/hero.png" width="170" alt="Koo, a blue explorer bird with aviator goggles and a house-emblem backpack"></td>
    <td>Koo is the explorer bird who shows what the agent is doing, and how tired it's getting. Goggles for exploring,
    and a backpack with a little house for the home it's finding you.</td>
  </tr>
</table>

| | State | Scene | When |
|:-:|---|---|---|
| <img src=".github/readme/koo/searching.png" width="120" alt="Koo flying"> | ✈️ **Searching** | Flying over the city | Reading posts |
| <img src=".github/readme/koo/dancing.png" width="120" alt="Koo dancing with a music note"> | 🎉 **Dancing** | Mid-air, music notes | A batch had a match (2 s) |
| <img src=".github/readme/koo/irritated.png" width="120" alt="Koo looking irritated"> | 😤 **Irritated** | Still flying, 💢 | Energy 25–50% (it keeps searching) |
| <img src=".github/readme/koo/drinking.png" width="120" alt="Koo drinking from a water bottle"> | 💧 **Water break** · ⚡ **Energy drink** | Riverbank, with a countdown | Water at 90, 80 … 30% energy (5 s, +4%) · energy drink at 25% (15 s, back to 75%) |
| <img src=".github/readme/koo/sleeping.png" width="120" alt="Koo sleeping on its backpack"> | 😴 **Sleeping** | Night, tree branch | Stopped (energy resets to 100%) |

Energy drains **1% per second** while searching, and a match adds **+2%**. Scanning pauses during breaks. Every move
between scenes is animated: take-off, landing, and flying down to the river.

---

## 🔑 Paying for the AI

| | Your own API key | 🪙 Koo credits |
|---|---|---|
| **You need** | An OpenAI, Google Gemini or Anthropic key | *Coming soon:* a Google account and UPI. For now: the local server |
| **Set up in** | ⚙️ Search settings → Provider | ⚙️ Provider = Koo credits (sign-in is switched off for now) |
| **Your key goes to** | Only that provider (stored on your computer, unencrypted) | Not needed; Koo's key is used |
| **Cost** | Billed by your provider | **1 🪙 = ₹1 = 5 AI requests** (5 posts each). Packs: ₹100 → 100 🪙 · ₹200 → 200 🪙 · ₹500 → 500 🪙 |
| **Free to try** | — | **10 🪙 free** on sign-up (50 requests = 250 posts) |

> **Local mode:** while no central Koo API is deployed, Koo credits use the **local server** at `localhost:8787`
> (`npm run server`), with no sign-in and no credits. See **Local server** below.

---

## 🛠️ Development

> Requires Node.js 22+ and Google Chrome.

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run build` | Production build → `output/v1/chrome-mv3` **(commit it after changes, so downloads stay current)** |
| `npm run dev` | Live-reload build → load `output/v1/chrome-mv3-dev` (needs the dev server running; not committed) |
| `npm run server` | Local server: the AI router Koo credits use when no cloud API is configured |
| `npm test` | Unit tests for `lib/` (Node's built-in runner); `npm run test:cloud` for the private worker |
| `npm run cloud:dev` | Run the cloud API locally (Wrangler) |
| `npm run cloud:deploy` | Deploy the cloud API to Cloudflare |
| `npm run cloud:db` | Create the D1 tables (remote) |

| Path | What's in it |
|---|---|
| `entrypoints/content.ts` | Facebook scanner: scroll, read, dedupe, batch, energy & breaks. **Page selectors are in `SEL` at the top** |
| `entrypoints/background.ts` | Receives batches, calls the AI (your key or the cloud API), stores decisions |
| `entrypoints/sidepanel/` | Panel UI (React) and Koo (`koo.tsx`) |
| `lib/classify.ts` | Prompt, AI provider calls, post IDs, text cleanup, phone numbers & country codes |
| `lib/energy.ts` · `sort.ts` · `csv.ts` | Koo's energy model · match ordering · CSV export |
| `server/` *(local, not in this repo)* | Local server: fallback AI router on `localhost:8787`, key from `server/.env` |
| `lib/pricing.ts` | Koo credits pricing shared with the worker: packs, 5 requests per credit, batch of 5, sign-up bonus |
| `cloud/` *(private, not in this repo)* | The paid cloud API worker: sign-in, credits, UPI checkout, webhook, paid AI calls |
| `wxt.config.ts` | Manifest and build config (the fixed extension `key` lives here) |

Chrome 137+ no longer lets tools auto-load extensions, so loading is always manual. Icons are in `public/icon/`.

---

## 🖥️ Local server (no cloud API needed)

While the extension is built **without** `WXT_API_URL` (the default), **🪙 Koo credits** send their AI requests to a
local server on your machine, which calls the AI with your key. No sign-in, no credits.

> The local server (`server/`) is kept on the operator's machine and **not included in this repository**. Without it,
> use **your own API key** in Search settings instead of Koo credits.

| Step | Do this |
|:-:|---|
| **1** | Create `server/.env` (git-ignored): `LLM_PROVIDER=openai`, `LLM_API_KEY=sk-...`, optional `LLM_MODEL=`, `PORT=8787` |
| **2** | Run `npm run server` and leave it running (`http://127.0.0.1:8787`, localhost only) |
| **3** | In ⚙️ Search settings choose **🪙 Koo credits** and press Start |

When a cloud API is deployed and the extension is built with `WXT_API_URL`, Koo credits use that instead.

---

## ☁️ Running the cloud API (operators)

> The worker in `cloud/` is **private** and not published in this repository. The notes below are for its operator.

<details>
<summary><b>How Koo credits work</b> (Cloudflare Worker + D1, Razorpay UPI, Google sign-in)</summary>

<br>

> **Status:** built but **switched off**: `SIGN_IN_ENABLED = false` in `lib/api.ts`. Until it's on, Koo credits use
> the local server.

```text
Panel ──sign in (Google)──► /auth      → Koo token (only its hash is stored)
Panel ──buy ₹200─────────► /checkout  → UPI-only Razorpay Payment Link (user id attached)
User pays by UPI ────────► Razorpay ──► /razorpay-webhook → signature check → +100 🪙, exactly once
Scanner ─5 posts────────► /classify  → checks credits → AI with your key → charges 0.2 🪙 (1 request)
```

| Endpoint | Purpose |
|---|---|
| `POST /auth` | Google access token → Koo token; a new account starts with 10 free 🪙 |
| `GET /me` | Email and credit balance |
| `POST /checkout` | UPI-only Razorpay Payment Link for a ₹100 / ₹200 / ₹500 pack |
| `POST /razorpay-webhook` | Verifies Razorpay's signature and credits the payment exactly once |
| `POST /classify` | Up to 5 posts; charges 0.2 🪙; refuses below 0.2 🪙; failed AI calls cost nothing |

**Pricing** (all in `lib/pricing.ts`): 1 credit = ₹1 paid = 5 AI requests; a request is one batch of 5 posts
(0.2 credits); minimum top-up ₹100; new accounts get 10 free credits. The API rejects requests with more than 5 posts.
Your margin is ₹0.20 per request minus the AI provider's cost for 5 posts; Razorpay takes about 2% + GST per payment.

</details>

<details>
<summary><b>One-time setup</b></summary>

<br>

| # | Where | What |
|:-:|---|---|
| 1 | **Cloudflare** | `npx wrangler login` → `npx wrangler d1 create koo` → paste `database_id` into `cloud/wrangler.toml` → `npm run cloud:db` |
| 2 | **Model** | In `cloud/wrangler.toml` set `LLM_PROVIDER` and `LLM_MODEL` (pricing is in `lib/pricing.ts`) |
| 3 | **Secrets** | `npx wrangler secret put <NAME> --config cloud/wrangler.toml` for `LLM_API_KEY`, `RZP_KEY_ID`, `RZP_KEY_SECRET`, `RZP_WEBHOOK_SECRET` |
| 4 | **Deploy** | `npm run cloud:deploy` → note `https://koo.<you>.workers.dev` |
| 5 | **Razorpay** | Webhook `https://<worker>/razorpay-webhook`, event **`payment_link.paid`**, same secret as `RZP_WEBHOOK_SECRET` (test keys first) |
| 6 | **Google** | OAuth client of type **Chrome Extension**, item ID **`ickjoonhepcjfhdiopbckhgalfdgijbj`** |
| 7 | **Build** | `.env` with `WXT_API_URL=…` and `WXT_GOOGLE_CLIENT_ID=…` → `npm run build` → commit `output/v1/chrome-mv3/` |
| 8 | **AI balance** | Turn on auto-recharge in your AI provider's billing settings |

</details>

<details>
<summary><b>Testing the worker locally</b></summary>

<br>

Put the secrets in `cloud/.dev.vars` (git-ignored), create the local tables with
`npx wrangler d1 execute koo --local --file cloud/schema.sql --config cloud/wrangler.toml`, then run `npm run cloud:dev`
(stop the local server first; both use port 8787). `DEV_NO_AUTH=1` in `.dev.vars` lets the worker serve localhost
requests without sign-in, for quick checks.

</details>

---

## ⚠️ Good to know

| | |
|---|---|
| **Facebook's terms** | Automated browsing is against them. Koo only reads, runs only when you press Start, in a tab you can see, at a human pace. Use it on your own account at your own risk |
| **Messaging** | Not automated. Contacts are collected so you can reach out yourself |
| **Facebook changes** | If posts stop being found, the selectors in `SEL` (`entrypoints/content.ts`) need updating |
