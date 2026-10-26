/* Makes the app icons and the app store images from the game itself.
 * Run: npm run store-assets   (needs Playwright)
 *
 *   icons/                 icons the site and an installed copy use
 *   store/play/            Google Play: 512 icon, 1024x500 feature graphic, 1080x1920 phone screenshots
 *   store/app-store/       App Store: 1024 icon, 1290x2796 iPhone screenshots
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mnm-store-'));
const ART = 'file://' + path.join(ROOT, 'js', 'art.js');
const font = (family, weight, file) => `@font-face{font-family:"${family}";font-weight:${weight};src:url("file://${path.join(ROOT, 'fonts', file)}") format("woff2")}`;
const FONTS = '<style>' + font('Atkinson Hyperlegible', 400, 'atkinson-hyperlegible-400.woff2') +
  font('Atkinson Hyperlegible', 700, 'atkinson-hyperlegible-700.woff2') + font('Bungee', 400, 'bungee-400.woff2') + '</style>';
const game = (q) => 'file://' + path.join(ROOT, 'index.html') + '?' + q;

const SHOTS = [
  { scene: 'board', title: 'Big, clear tiles.<br>No timer.', sub: 'A relaxing mahjong solitaire with a movie-night theme' },
  { scene: 'trivia', title: 'A movie memory<br>after every level', sub: 'Answer a question and collect the card' },
  { scene: 'hint', title: 'Real puzzles,<br>gentle hints', sub: 'Think ahead: one careless match can leave you stuck' },
  { scene: 'chapters', title: 'Three chapters,<br>then endless levels', sub: 'Earn up to three stars on every board' },
  { scene: 'daily', title: 'A new board<br>every day', sub: 'Collect a stamp for each one, with no streak to lose' }
];

function write(file, html) {
  const p = path.join(TMP, file);
  fs.writeFileSync(p, html);
  return 'file://' + p;
}

async function ready(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

// ---------- Icons ----------

function iconPage(scale) {
  return write(`icon-${scale}.html`, `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:#121a3a}
    #i{width:512px;height:512px;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#2e3b7a,#121a3a 70%)}
    #e{width:${scale}%;height:${scale}%}#e>svg{width:100%;height:100%}
    .bulb{animation:none!important}</style>
    <div id="i"><div id="e"></div></div><script src="${ART}"></script>
    <script>document.getElementById('e').innerHTML = MNMArt.emblem('car');</script>`);
}

async function icons(browser) {
  // [file, size, how much of the square the sign fills]. Maskable and store icons leave room for the
  // circle or rounded square the phone cuts them to.
  const list = [
    ['icons/icon-512.png', 512, 80], ['icons/icon-192.png', 192, 80], ['icons/apple-touch-icon.png', 180, 84],
    ['icons/icon-maskable-512.png', 512, 66], ['store/play/icon-512.png', 512, 74], ['store/app-store/icon-1024.png', 1024, 78]
  ];
  for (const [file, size, scale] of list) {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
    await page.goto(iconPage(scale));
    await page.screenshot({ path: path.join(ROOT, file), clip: { x: 0, y: 0, width: 512, height: 512 } });
    await page.close();
  }
}

// ---------- Feature graphic ----------

async function featureGraphic(browser) {
  const tiles = ['popcorn', 'rose', 'jukebox', 'ticket', 'champagne', 'car'];
  const url = write('feature.html', `<!doctype html><meta charset="utf-8">${FONTS}<style>
    html,body{margin:0}
    #f{position:relative;width:1024px;height:500px;overflow:hidden;background:radial-gradient(circle at 75% 45%,#2e3b7a,#121a3a 65%);font-family:"Atkinson Hyperlegible",sans-serif;color:#fff6e2}
    .title{position:absolute;left:56px;top:92px;width:520px}
    .small{font-family:Bungee;font-size:34px;color:#e8475b;letter-spacing:.04em}
    .big{font-family:Bungee;font-size:96px;line-height:1;color:#ffc94a;text-shadow:0 6px 0 #b8862a}
    .line{margin-top:26px;font-size:30px;font-weight:700;line-height:1.3}
    #e{position:absolute;right:36px;top:50px;width:400px;height:400px}#e>svg{width:100%;height:100%}
    .tiles{position:absolute;left:56px;bottom:-26px;display:flex;gap:14px}
    .t{position:relative;width:76px;height:95px;border-radius:12px;background:#fff6e2;box-shadow:5px 5px 0 #d4bb86}
    .t svg{position:absolute;left:9%;top:9%;width:82%;height:80%}
    .bulb{animation:none!important}</style>
    <div id="f"><div class="title"><div class="small">MOVIE NIGHT</div><div class="big">MAHJONG</div>
    <div class="line">Big tiles, real puzzles and a movie memory after every level.</div></div>
    <div id="e"></div><div class="tiles" id="t"></div></div>
    <script src="${ART}"></script><script>
    document.getElementById('e').innerHTML = MNMArt.emblem('car');
    document.getElementById('t').innerHTML = ${JSON.stringify(tiles)}.map(function (f, i) {
      return '<div class="t" style="transform:rotate(' + (i % 2 ? 4 : -4) + 'deg)">' + MNMArt.face(f) + '</div>';
    }).join('');</script>`);
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.goto(url);
  await ready(page);
  await page.screenshot({ path: path.join(ROOT, 'store/play/feature-graphic.png'), clip: { x: 0, y: 0, width: 1024, height: 500 } });
  await page.close();
}

// ---------- Screenshots ----------

async function solvePair(page) {
  const pair = await page.evaluate(() => {
    const r = window.__mnm.solve();
    return r && r.solvable !== false ? r.move : null;
  });
  if (!pair) return false;
  for (const id of pair) await page.click(`#board .tile[data-id="${id}"]`);
  await page.waitForFunction(() => !window.__mnm.game || !window.__mnm.game.busy);
  return true;
}

async function closeSheets(page) {
  while (await page.isVisible('#overlay:not([hidden]) [data-close]')) await page.click('#overlay [data-close]');
}

async function openBoard(page, key) {
  await page.click('#nav-chapters');
  await page.click(`#tab-${key.replace(/-\d+$/, '')}`);
  await page.click(`[data-board="${key}"]`);
  await page.waitForSelector('#game:not([hidden])');
  await closeSheets(page);
}

// A phone that has played a while: the first chapter done, a few stamps, some stars in Chapter 3.
function playedSave() {
  const cleared = {};
  const stars = {};
  for (let i = 1; i <= 6; i++) { cleared['drive-in-' + i] = true; stars['drive-in-' + i] = 3; }
  for (let i = 1; i <= 6; i++) { cleared['diner-' + i] = true; stars['diner-' + i] = i % 3 ? 3 : 2; }
  [[1, 3], [2, 2], [3, 3]].forEach(([i, s]) => { cleared['romance-' + i] = true; stars['romance-' + i] = s; });
  const daily = {};
  [2, 3, 5, 6, 8, 9, 10, 13, 14, 16, 19, 20, 22].forEach((d) => { daily['2026-10-' + String(d).padStart(2, '0')] = { hints: 0, shuffles: 0, stars: 3, moves: 20 }; });
  return {
    settings: { textSize: 'standard', dimBlocked: true, showMatch: false, sound: false },
    seenHowTo: true, seenHard: true, seenBlockedTip: true, seenReachTip: true, seenLateShow: true,
    seenIntro: { 'drive-in-3': true, 'romance-1': true, 'romance-4': true },
    cleared, stars, daily, tab: 'romance'
  };
}

async function capture(browser, scene) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const q = 'test=1&locks=1&today=2026-10-23&seed=';
  await page.goto(game(q + '7&fresh=1'));
  await page.evaluate((s) => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify(s)), playedSave());
  await page.goto(game(q + '7'));
  await ready(page);
  if (scene === 'board') {
    await openBoard(page, 'drive-in-3');
    for (let i = 0; i < 4; i++) await solvePair(page);
    const pick = await page.evaluate(() => window.__mnm.solve().move[0]);
    await page.click(`#board .tile[data-id="${pick}"]`);
  } else if (scene === 'trivia') {
    await openBoard(page, 'romance-1');
    while (await solvePair(page)) { /* clear the board */ }
    await page.waitForSelector('#quiz');
    await page.waitForTimeout(600);
  } else if (scene === 'hint') {
    await openBoard(page, 'romance-4');
    for (let i = 0; i < 2; i++) await solvePair(page);
    await page.click('#hint');
    await page.waitForSelector('#toast.show');
  } else if (scene === 'chapters') {
    await page.click('#nav-chapters');
    await page.click('#tab-romance');
  } else if (scene === 'daily') {
    await page.click('#nav-daily');
  }
  await page.waitForTimeout(400);
  const file = path.join(TMP, `shot-${scene}.png`);
  await page.screenshot({ path: file });
  await ctx.close();
  return file;
}

function framePage(shot, w, h) {
  const titleSize = Math.round(w * 0.072);
  return write(`frame-${shot.scene}-${w}.html`, `<!doctype html><meta charset="utf-8">${FONTS}<style>
    html,body{margin:0}
    #f{width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;box-sizing:border-box;padding:${Math.round(h * 0.045)}px ${Math.round(w * 0.06)}px 0;
       background:radial-gradient(circle at 50% 30%,#2e3b7a,#121a3a 70%);font-family:"Atkinson Hyperlegible",sans-serif;color:#fff6e2;overflow:hidden}
    h1{margin:0;font-family:Bungee;font-weight:400;font-size:${titleSize}px;line-height:1.08;text-align:center;color:#ffc94a}
    p{margin:${Math.round(h * 0.012)}px 0 ${Math.round(h * 0.03)}px;font-size:${Math.round(titleSize * 0.42)}px;font-weight:700;text-align:center;color:#b3bce0}
    .phone{flex:1;min-height:0;display:flex;align-items:flex-start}
    img{display:block;max-width:100%;max-height:100%;border-radius:${Math.round(w * 0.05)}px;box-shadow:0 0 0 ${Math.round(w * 0.012)}px #0c1330,0 30px 80px rgba(0,0,0,.55)}</style>
    <div id="f"><h1>${shot.title}</h1><p>${shot.sub}</p><div class="phone"><img src="${'file://' + shot.file}"></div></div>`);
}

async function screenshots(browser) {
  for (const shot of SHOTS) shot.file = await capture(browser, shot.scene);
  const sizes = [['store/play/phone', 1080, 1920], ['store/app-store/iphone-6.9', 1290, 2796]];
  for (const [prefix, w, h] of sizes) {
    for (let i = 0; i < SHOTS.length; i++) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(framePage(SHOTS[i], w, h));
      await ready(page);
      await page.screenshot({ path: path.join(ROOT, `${prefix}-${i + 1}.jpg`), type: 'jpeg', quality: 88 });
      await page.close();
    }
  }
}

(async () => {
  ['icons', 'store/play', 'store/app-store'].forEach((d) => fs.mkdirSync(path.join(ROOT, d), { recursive: true }));
  const browser = await chromium.launch();
  await icons(browser);
  await featureGraphic(browser);
  await screenshots(browser);
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Store images written to icons/ and store/.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
