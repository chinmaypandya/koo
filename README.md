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
- **Bring your own key** (OpenAI, Gemini or Anthropic) **or** use the OpenBroker server, which keeps the key server-side.
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
   - Pick an AI provider and paste your API key (OpenAI, Google Gemini or Anthropic). The key stays on your computer.
   - Fill in what you're looking for: target location and max distance, budget, size, amenities, your gender.
7. **Run it.** Open a Facebook flat-rental group (you must be logged in to Facebook), then press **Start**.
   Koo takes off and starts reading posts; matches appear under **🏆 Matches**, with contact numbers, and can be
   exported to Excel (CSV). Press **Stop** whenever you like.

**Updating:** download the new version (or `git pull`), then click the ↻ reload button on OpenBroker's card in
`chrome://extensions`. Your settings, matches and history are kept.

**Removing:** click **Remove** on OpenBroker's card in `chrome://extensions`. This also deletes its stored data,
including your API key.

## Development

Requirements: Node.js 22+ (the server and tests run TypeScript directly with Node's type stripping) and Google Chrome.

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

In the side panel, open **Search settings**:

- **OpenAI / Gemini / Anthropic (your key)** — paste your API key; it is stored unencrypted in the extension's local
  storage on your machine only. The model field is optional.
- **OpenBroker server (no key needed)** — run the server below; the extension never sees the key.

### Running the OpenBroker server

Create `server/.env` (git-ignored):

```bash
LLM_PROVIDER=openai     # openai | gemini | anthropic
LLM_API_KEY=sk-...      # required
LLM_MODEL=              # optional; provider default if empty
PORT=8787               # optional
```

Then:

```bash
npm run server          # http://127.0.0.1:8787
```

The server has no authentication yet and only listens on `127.0.0.1`. Add auth before deploying it anywhere.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev build with live reload → `output/chrome-mv3-dev` |
| `npm run build` | Production build → `output/chrome-mv3` (commit it after changes) |
| `npm test` | Unit tests (`lib/*.test.ts`, Node's built-in test runner) |
| `npm run server` | OpenBroker LLM proxy server |

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
server/index.ts     Optional LLM proxy that holds the API key
wxt.config.ts       Extension manifest and build config
```

Facebook page selectors live in `SEL` at the top of `entrypoints/content.ts` — fix those first when Facebook changes
its layout.

## Notes

- Automated browsing is against Facebook's terms; the agent only reads, runs only when you start it, in a tab you can
  see, at a human-like pace. Use it on your own account at your own risk.
- Messaging (WhatsApp / Facebook DMs) is not automated; contacts are collected for you to reach out yourself.
