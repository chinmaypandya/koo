# OpenBroker

A Chrome extension with an AI agent that hunts for flats in Facebook groups for you. Open a group, press **Start**, and
it scrolls the feed, reads each post, and asks an LLM whether the flat matches your search — budget, size, location
and distance, amenities and gender. Posts it has already read are skipped on later runs.

Koo, the explorer bird, shows what the agent is doing: flying over the city while searching, dancing on a match,
taking water and energy-drink breaks, and sleeping on a branch when stopped.

## Features

- **Scroll & read** — scrolls the group feed at a human-like pace, expands "See more", and cleans Facebook's
  anti-scraping noise out of the post text.
- **Never reads a post twice** — remembers post IDs (30 days); "Clear history" resets them.
- **AI filtering** — one LLM call per batch of posts (batch size configurable, partial batches sent after 30 s).
  Each decision records verdict, rent, deposit, budget difference, BHK, distance estimate, amenities score, society,
  location and contact numbers (with country code).
- **Matches list** — cart-style items, multi-column ordering (rent / deposit / amenities) and **CSV export**
  (all, or only new since the last export).
- **Two ways to pay for the AI:** bring your own key (OpenAI, Gemini or Anthropic), **or** sign in with Google and use
  **Koo credits** bought over UPI (no key needed).
- **Activity log** — every step the agent takes, for checking what it did.

## Use it yourself (no coding or building needed)

The ready-to-run extension is already built and committed in `output/chrome-mv3/`. You only need Google Chrome.

1. **Download the project.**
   - Easiest: on the GitHub page click **Code → Download ZIP**, then unzip it anywhere (e.g. your Documents folder).
   - Or with git: `git clone <this repo's URL>`.
2. **Open Chrome's extensions page.** Type `chrome://extensions` in the address bar and press Enter.
3. **Turn on Developer mode** with the switch in the top-right corner. (Chrome only lets you install extensions from
   a folder in this mode; it doesn't change anything else about your browser.)
4. **Click "Load unpacked"** and select the `output/chrome-mv3` folder inside the project you downloaded.
   Select that exact folder: it's the one that contains `manifest.json`.
5. **Pin it.** Click the puzzle-piece icon in Chrome's toolbar and pin **OpenBroker** so Koo's icon is always visible.
6. **Set it up.** Click the icon to open the side panel, then **⚙️ Search settings**:
   - Choose how the AI is paid for:
     - **Your own API key** (OpenAI, Google Gemini or Anthropic): paste it; it stays on your computer.
     - **🪙 Koo credits**: no key. Open **🪙 Koo credits**, sign in with Google and buy credits by UPI.
   - Fill in what you're looking for: target location and max distance, budget, size, amenities, your gender.
7. **Run it.** Open a Facebook flat-rental group (you must be logged in to Facebook), then press **Start**.
   Koo takes off and starts reading posts; matches appear under **🏆 Matches**, with contact numbers, and can be
   exported to Excel (CSV). Press **Stop** whenever you like.

**Updating:** download the new version (or `git pull`), then click the ↻ reload button on OpenBroker's card in
`chrome://extensions`. Your settings, matches and history are kept.

**Removing:** click **Remove** on OpenBroker's card in `chrome://extensions`. This also deletes its stored data,
including your API key.

## Development

Requirements: Node.js 22+ (tests run TypeScript directly with Node's type stripping) and Google Chrome.

```bash
npm install
npm run build          # production build → output/chrome-mv3 (the committed, ready-to-load folder)
```

**After changing code, run `npm run build` and commit the updated `output/chrome-mv3/`** so people who download the
project get your changes without building.

For live reloading while coding, run `npm run dev` and load `output/chrome-mv3-dev` instead (keep the dev server
running; that build doesn't work without it and is not committed). Chrome 137+ no longer lets tools auto-load
extensions, so loading is always manual. The extension icons are generated into `public/icon/`.

## Choosing an AI provider

In the side panel, open **Search settings → Provider**:

- **OpenAI / Gemini / Anthropic (your key)** — paste your API key; it is stored unencrypted in the extension's local
  storage on your machine only and sent only to that provider. The model field is optional.
- **🪙 Koo credits (no API key needed)** — sign in with Google under **🪙 Koo credits** and buy credits by UPI.
  AI calls go through the OpenBroker cloud API, which uses its own key and charges your credits.

The **AI instructions** box in Search settings changes the matching rules for either option.

## Koo credits: the cloud API (for the operator)

`cloud/` is a Cloudflare Worker + D1 database. Users sign in with Google and get an OpenBroker token; payments arrive
as Razorpay UPI Payment Links; a signed Razorpay webhook adds credits automatically; every AI call deducts its real
cost from that user only. **1 Koo credit = ₹1 of AI usage, and users get credits worth half of what they pay.**

| Endpoint | Purpose |
|---|---|
| `POST /auth` | Google access token → OpenBroker token (only its SHA-256 hash is stored) |
| `GET /me` | Email and credit balance |
| `POST /checkout` | Creates a UPI-only Razorpay Payment Link for a ₹100 / ₹200 / ₹500 pack |
| `POST /razorpay-webhook` | Verifies Razorpay's signature, credits the payment exactly once |
| `POST /classify` | Checks credits, calls the AI with your key, deducts the real token cost |

**One-time setup:**

1. **Cloudflare:** `npx wrangler login`, then `npx wrangler d1 create openbroker` and paste the printed `database_id`
   into `cloud/wrangler.toml`. Create the tables: `npm run cloud:db`.
2. **Prices and key:** in `cloud/wrangler.toml` set `LLM_PROVIDER`, `LLM_MODEL` and your model's price
   (`PRICE_INPUT_INR_PER_1M`, `PRICE_OUTPUT_INR_PER_1M`, ₹ per million tokens; AI calls are refused while they're 0).
   Then add secrets (never put them in files):
   ```bash
   npx wrangler secret put LLM_API_KEY --config cloud/wrangler.toml
   npx wrangler secret put RZP_KEY_ID --config cloud/wrangler.toml
   npx wrangler secret put RZP_KEY_SECRET --config cloud/wrangler.toml
   npx wrangler secret put RZP_WEBHOOK_SECRET --config cloud/wrangler.toml
   ```
3. **Deploy:** `npm run cloud:deploy` → note the URL, e.g. `https://openbroker.<you>.workers.dev`.
4. **Razorpay** (KYC done): Dashboard → Webhooks → add `https://<your-worker>/razorpay-webhook`, event
   **`payment_link.paid`**, with the same secret as `RZP_WEBHOOK_SECRET`. Use test keys first, then live keys.
5. **Google sign-in:** Google Cloud Console → Credentials → OAuth client ID → type **Chrome Extension**, item ID
   **`ickjoonhepcjfhdiopbckhgalfdgijbj`** (fixed by the `key` in `wxt.config.ts`, so every unpacked install has it).
6. **Build the extension against it:** create `.env` in the project root (git-ignored):
   ```bash
   WXT_API_URL=https://openbroker.<you>.workers.dev
   WXT_GOOGLE_CLIENT_ID=<client id>.apps.googleusercontent.com
   ```
   then `npm run build` and commit `output/chrome-mv3/`.
7. **Keep your AI balance funded:** enable auto-recharge in your AI provider's billing settings.

Local testing: put the same secrets in `cloud/.dev.vars` (git-ignored), run
`npx wrangler d1 execute openbroker --local --file cloud/schema.sql --config cloud/wrangler.toml`, then `npm run cloud:dev`
(serves on `http://localhost:8787`, which is the extension's default API URL).

Razorpay charges about 2% + GST per successful payment (check their pricing page); that comes out of your half.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev build with live reload → `output/chrome-mv3-dev` |
| `npm run build` | Production build → `output/chrome-mv3` (commit it after changes) |
| `npm test` | Unit tests (`lib/` and `cloud/`, Node's built-in test runner) |
| `npm run cloud:dev` | Run the cloud API locally (Wrangler) |
| `npm run cloud:deploy` | Deploy the cloud API to Cloudflare |
| `npm run cloud:db` | Create the D1 tables (remote) |

## Project structure

```text
entrypoints/
  content.ts        Facebook scanner: scroll, read, dedupe, batch, energy & breaks
  background.ts     Receives batches, calls the LLM, stores decisions
  sidepanel/        Side panel UI (React) and Koo, the avatar (koo.tsx)
lib/
  classify.ts       Prompt, provider calls, post IDs, text cleanup, phone numbers
  energy.ts         Koo's energy model (drain, water / energy-drink breaks)
  sort.ts, csv.ts   Matches ordering and CSV export
cloud/
  worker.ts         Cloud API: sign-in, credits, UPI checkout, webhook, paid AI calls
  billing.ts        Credit packs, cost, webhook signature, exactly-once crediting (tested)
  schema.sql        D1 tables: users, tokens, payments, usage
wxt.config.ts       Extension manifest and build config
```

Facebook page selectors live in `SEL` at the top of `entrypoints/content.ts` — fix those first when Facebook changes
its layout.

## Notes

- Automated browsing is against Facebook's terms; the agent only reads, runs only when you start it, in a tab you can
  see, at a human-like pace. Use it on your own account at your own risk.
- Messaging (WhatsApp / Facebook DMs) is not automated; contacts are collected for you to reach out yourself.
