/* Checks that the game keeps working offline once it has been opened, as an installed app would.
 * Run: npm run offline   (serves the folder on localhost, where service workers are allowed)
 */
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((resolve) => server.listen(0, 'localhost', resolve));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(base + '?test=1&fresh=1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the service worker looks after the page');

  await ctx.setOffline(true);
  await page.goto(base + '?test=1&fresh=1&seed=4');
  assert.strictEqual((await page.textContent('#play-btn')).trim(), 'Level 1', 'the home screen opens offline');
  await page.click('#play-btn');
  await page.click('#overlay [data-close]');
  const pair = await page.evaluate(() => window.__mnm.solve().move);
  for (const id of pair) await page.click(`#board .tile[data-id="${id}"]`);
  await page.waitForFunction(() => window.__mnm.engine.remaining(window.__mnm.game.tiles) === 14);
  await page.goto(base + 'privacy.html');
  assert.match(await page.textContent('h1'), /Privacy Policy/, 'the privacy policy opens offline');

  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close();
  server.close();
  console.log('offline: all checks passed');
})().catch((e) => {
  console.error(e);
  server.close();
  process.exit(1);
});
