import { cleanText, longestLine, postId, type Post } from '@/lib/classify';
import { BATCH_SIZE as BATCH } from '@/cloud/billing';
import { ENERGY, addMatches, afterBreak, fullEnergy, isIrritated, tick, type Break } from '@/lib/energy';

// All FB selectors live here — fix these first when Facebook changes its DOM.
const SEL = {
  post: '[role="feed"] > div',
  message: '[data-ad-preview="message"], [data-ad-comet-preview="message"]',
  link: 'a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid="], a[href*="multi_permalinks="]',
  // Timestamp links start with no real href; Facebook fills it in on hover.
  hiddenLink: 'a[href="#"], a[href$="/#"], a[role="link"]:not([href])',
  // Poster's name link: group posts link authors to /groups/<id>/user/<uid>/; otherwise the first link in the header.
  author: 'a[href*="/user/"], h2 a[href], h3 a[href], h4 a[href], strong a[href]',
  button: '[role="button"]',
};
const MAX_NEW = 50, MAX_SEEN_STREAK = 15, MAX_EMPTY_SCROLLS = 5, MONTH = 30 * 864e5;
const BATCH_WAIT = 30_000; // send a partial batch if it hasn't filled up within this time
const LOAD_WAIT = 3000; // max ms to wait for Facebook to fill in posts before scrolling on
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cardText = (el: Element) => cleanText((el.querySelector<HTMLElement>(SEL.message) ?? (el as HTMLElement)).innerText);

// The post's own URL. If only placeholder timestamp links exist, simulate a hover so Facebook fills in the real href.
// Only href-less links are hovered: real profile links would pop up hover cards.
async function postLink(el: Element) {
  const found = () => el.querySelector<HTMLAnchorElement>(SEL.link)?.href;
  if (found()) return found();
  const hidden = [...el.querySelectorAll<HTMLElement>(SEL.hiddenLink)];
  if (!hidden.length) return undefined;
  for (const a of hidden) for (const type of ['pointerover', 'mouseover', 'focusin'])
    a.dispatchEvent(new (type === 'focusin' ? FocusEvent : MouseEvent)(type, { bubbles: true }));
  await sleep(250);
  const href = found();
  for (const a of hidden) a.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
  return href;
}

// Polls until an unhandled card has readable text (true) or the time runs out (false).
async function postsLoaded(handled: WeakSet<Element>, ms: number) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(300)) {
    if ([...document.querySelectorAll(SEL.post)].some((el) => !handled.has(el) && cardText(el).length >= 20)) return true;
  }
  return false;
}

export default defineContentScript({
  // FB is a SPA, so match all of it and check for /groups/ when started.
  matches: ['https://www.facebook.com/*'],
  main() {
    let running = false;
    let lines: string[] = [];
    const status = (s: string) => {
      console.log('[koo]', s);
      browser.storage.local.set({ status: s });
    };
    // Step-by-step activity shown in the side panel (newest first, last 200 lines).
    const log = (s: string) => {
      console.log('[koo]', s);
      lines = [`${new Date().toLocaleTimeString()}  ${s}`, ...lines].slice(0, 200);
      browser.storage.local.set({ log: lines });
    };
    // Drives Koo in the side panel (see assets/avatar.md): sleeping | starting | searching | irritated | dancing |
    // drinking | energy | stopping | error. The version stops a finished one-shot (dance) from overwriting a newer state.
    let moodVersion = 0;
    const mood = (m: string) => (moodVersion++, browser.storage.local.set({ agent: m }));
    const snip = (t: string) => `"${t.replace(/\s+/g, ' ').slice(0, 70)}…"`;

    let seenIds: Record<string, number> = {};
    // "Clear history" removes these keys; drop our in-memory copies too so a running scan can't write them back.
    browser.storage.onChanged.addListener((c) => {
      if (c.log && !c.log.newValue) lines = [];
      if (c.seenIds && !c.seenIds.newValue) seenIds = {};
    });

    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'stop') running ? (running = false) : mood('sleeping'); // a running scan sets sleeping when it ends
      if (msg.type === 'start' && !running) {
        running = true;
        run()
          .then((ok) => mood(ok ? 'sleeping' : 'error'))
          .catch((e) => (status('Error: ' + e.message), mood('error')))
          .finally(() => {
            running = false;
            browser.storage.local.set({ energy: 100 }); // stopped → back to full energy
            browser.storage.local.remove(['breakKind', 'breakUntil']);
          });
      }
    });

    async function run() {
      lines = [];
      if (!location.pathname.startsWith('/groups/')) return status('Open a Facebook group first.'), true;
      let energy = fullEnergy(Date.now()), onBreak: Break = null;
      // Break kinds map to Koo's states: water → drinking, energy → energy (an unknown name would fall back to sleeping).
      const breakState = (b: Break) => (b === 'water' ? 'drinking' : b);
      const base = () => (breakState(onBreak) ?? (isIrritated(energy.level) ? 'irritated' : 'searching'));
      let lastBase = 'searching', dancingUntil = 0;
      const saveEnergy = () => browser.storage.local.set({ energy: Math.round(energy.level * 10) / 10 }); // 0.1% steps → smooth bar
      mood('searching');
      saveEnergy();
      seenIds = ((await browser.storage.local.get('seenIds')) as { seenIds?: Record<string, number> }).seenIds ?? {};
      for (const [id, t] of Object.entries(seenIds)) if (Date.now() - t > MONTH) delete seenIds[id];
      log(`Started. ${Object.keys(seenIds).length} posts remembered from earlier runs.`);

      const handled = new WeakSet<Element>();
      let batch: Post[] = [], batchStart = 0, inFlight = 0, fresh = 0, skipped = 0, seenStreak = 0, emptyScrolls = 0, pass = 0, failed = false;
      const pending: Promise<void>[] = []; // AI calls run alongside scrolling instead of pausing it

      const flush = async () => {
        const posts = batch;
        batch = [];
        log(`Sending ${posts.length} posts to the AI…`);
        inFlight++;
        const res = await browser.runtime.sendMessage({ type: 'classify', posts });
        inFlight--;
        if (!res?.ok) {
          posts.forEach((p) => delete seenIds[p.id]); // retry these next run
          running = false;
          failed = true;
          const err = res?.error ?? 'no reply from the extension background';
          log(`AI call failed: ${err}`);
          status('Error: ' + err);
        } else {
          log(`AI replied for ${res.total}/${posts.length} posts: ${res.found} match. See "AI decisions" below.`);
          if (res.found && running) {
            energy = addMatches(energy, res.found);
            saveEnergy();
            if (!onBreak) {
              mood('dancing'); // one 2s dance per batch, however many matched; never over a break
              dancingUntil = Date.now() + 2000;
              const v = moodVersion;
              setTimeout(() => v === moodVersion && running && mood((lastBase = base())), 2000);
            }
          }
        }
        await browser.storage.local.set({ seenIds });
      };

      // Energy ticks every second on its own (not once per scroll), so the bar moves smoothly and breaks start on time.
      let due: Break = null;
      const ticker = setInterval(() => {
        if (!running) return clearInterval(ticker);
        if (onBreak) return; // no drain during a break
        ({ energy, due } = tick(energy, Date.now()));
        saveEnergy();
        // Crossing 50% flips searching ⇄ irritated; leave a playing dance alone.
        if (!due && Date.now() > dancingUntil && base() !== lastBase) mood((lastBase = base()));
      }, 1000);

      while (running && fresh < MAX_NEW && seenStreak < MAX_SEEN_STREAK && emptyScrolls < MAX_EMPTY_SCROLLS) {
        if (due) {
          // Water at each 10% mark (90…30), energy drink at 25%. Reading and scrolling pause for the whole break;
          // breakUntil lets the panel show a countdown.
          const kind = due, ms = kind === 'water' ? ENERGY.waterBreakMs : ENERGY.energyDrinkMs;
          log(kind === 'water' ? `Water break (${ms / 1000}s)…` : `Energy at ${Math.round(energy.level)}%: energy-drink break (${ms / 1000}s)…`);
          onBreak = kind;
          browser.storage.local.set({ breakKind: kind, breakUntil: Date.now() + ms });
          mood(breakState(kind)!);
          for (const end = Date.now() + ms; running && Date.now() < end; ) await sleep(250); // Stop interrupts the break
          energy = afterBreak(energy, kind, Date.now());
          due = onBreak = null;
          browser.storage.local.remove(['breakKind', 'breakUntil']);
          saveEnergy();
          if (running) mood((lastBase = base()));
          continue;
        }
        if (batch.length && Date.now() - batchStart >= BATCH_WAIT) {
          log(`No full batch of ${BATCH} within ${BATCH_WAIT / 1000}s; sending the ${batch.length} found so far.`);
          pending.push(flush());
        }
        let found = 0;
        const cards = document.querySelectorAll(SEL.post);
        for (const el of cards) {
          if (due) break; // a break is due: stop reading new posts right away
          if (handled.has(el) || !running) continue;
          const more = [...el.querySelectorAll<HTMLElement>(SEL.button)].find((b) => b.textContent?.trim() === 'See more');
          if (more) { more.click(); await sleep(300); }
          const text = cardText(el);
          if (text.length < 20) continue; // placeholder not rendered yet; retry once it loads
          handled.add(el);
          found++;

          const href = await postLink(el);
          const id = postId(href, location.pathname + longestLine(text));
          if (seenIds[id]) { skipped++; seenStreak++; log(`Skipped (already read) [${id}] ${snip(text)}`); continue; }
          seenStreak = 0;
          fresh++;
          seenIds[id] = Date.now();
          log(`Read post [${id}] ${snip(text)}`);
          if (!href) log(`  (no post link found for [${id}]; it will link to the group page)`);
          if (!batch.length) batchStart = Date.now();
          const author = el.querySelector<HTMLAnchorElement>(SEL.author);
          batch.push({
            id, url: href ?? location.href, group: document.title, text: text.slice(0, 2000),
            author: author?.innerText.trim() || null,
            author_url: author?.href.split('?')[0] ?? null, // drop FB tracking params
          });
          if (batch.length >= BATCH) pending.push(flush());
          if (fresh >= MAX_NEW || seenStreak >= MAX_SEEN_STREAK) break;
        }
        if (due) continue; // take the break before waiting or scrolling
        // Nothing new usually means Facebook is still loading: wait for posts to fill in instead of scrolling past them.
        if (!found && running && (await postsLoaded(handled, LOAD_WAIT))) {
          log('New posts finished loading; reading them without scrolling.');
          continue;
        }
        emptyScrolls = found ? 0 : emptyScrolls + 1;
        log(`Scroll ${++pass}: ${cards.length} post cards on page, ${found} new to look at.`);
        status(`Scrolling… ${fresh} new, ${skipped} already seen`);
        // Human-ish: smooth scroll of most of a screen, then a short, varied pause to "read".
        window.scrollBy({ top: innerHeight * (0.6 + Math.random() * 0.3), behavior: 'smooth' });
        await sleep(600 + Math.random() * 900);
      }
      if (batch.length && !failed) pending.push(flush());
      if (pending.length) log('Waiting for the AI to finish the last posts…');
      await Promise.all(pending);
      if (failed) return false;
      // Short reason first so it fits the one-line status card; the log keeps the detail.
      const [why, detail] =
        !running ? ['you pressed Stop', '']
        : fresh >= MAX_NEW ? [`${MAX_NEW}-post limit reached`, `read ${MAX_NEW} new posts, the per-run limit`]
        : seenStreak >= MAX_SEEN_STREAK ? ['caught up with last run', `${MAX_SEEN_STREAK} already-read posts in a row`]
        : ['no new posts found', `nothing new in ${MAX_EMPTY_SCROLLS} scrolls (if "post cards on page" is 0, Facebook's layout changed)`];
      log(`Stopped: ${why}${detail && ` (${detail})`}.`);
      status(`Stopped: ${why} · ${fresh} new, ${skipped} skipped`);
      return true;
    }
  },
});
