/* Plays all of Chapter 1 in a real browser by tapping tiles, the way a player would.
 * Run: npm run e2e   (screenshots go to the folder given as SHOTS, if set)
 */
'use strict';
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
const url = (q) => 'file://' + path.join(ROOT, 'index.html') + (q ? '?' + q : '');

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') });
}

async function waitIdle(page) {
  await page.waitForFunction(() => !window.__mnm.game || !window.__mnm.game.busy);
}

async function tilesLeft(page) {
  return page.evaluate(() => window.__mnm.engine.remaining(window.__mnm.game.tiles));
}

// Taps one available pair. Returns false when the board is done.
async function playPair(page) {
  const pair = await page.evaluate(() => {
    const g = window.__mnm.game;
    if (!g) return null;
    const m = window.__mnm.engine.availableMatches(g.tiles);
    return m.length ? m[0] : [];
  });
  if (pair === null) return false;
  assert.ok(pair.length === 2, 'there is always a pair to play (rescue keeps the board going)');
  for (const id of pair) await page.click(`#board .tile[data-id="${id}"]`);
  await waitIdle(page);
  return true;
}

async function clearBoard(page) {
  for (let i = 0; i < 200; i++) {
    if (!(await playPair(page))) break;
  }
  await page.waitForSelector('#overlay:not([hidden]) .celebrate, .sheet.celebrate');
}

async function answerTrivia(page, right) {
  const correct = await page.evaluate(() => window.__mnm.trivia.found.board.trivia.answer);
  const choice = right ? correct : (correct + 1) % 4;
  await page.click(`[data-answer="${choice}"]`);
  await page.waitForSelector('#reveal:not([hidden])');
  const verdict = await page.textContent('#reveal .verdict');
  assert.ok(right ? /right/.test(verdict) : /^It was/.test(verdict), verdict);
}

async function checkNoSideScroll(page, where) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 0, `${where}: page scrolls sideways by ${over}px`);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });

  // A version 1 save (Chapter 1 progress in arrays) carries over.
  await page.goto(url('test=1&fresh=1'));
  await page.evaluate(() => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({
    settings: { textSize: 'large', dimBlocked: true, showMatch: false, sound: false },
    cleared: [true, true, false, false, false, false], cards: [{ correct: true }, { correct: false }, null, null, null, null],
    seenIntro: [false, true, false, false, false, false], seenHowTo: true, current: null
  })));
  await page.goto(url('test=1'));
  assert.match(await page.textContent('#cta'), /Play Board 3: Snack Bar/);
  assert.strictEqual(await page.getAttribute('html', 'data-text'), 'large');
  assert.match(await page.textContent('#album-count'), /^2 of/);
  // Chapter 2 stays locked until Chapter 1 is finished.
  await page.goto(url('test=1&locks=1'));
  assert.match(await page.textContent('#tab-diner'), /Locked/);
  await page.click('#tab-diner');
  assert.ok(await page.isVisible('#chapter-locked'));
  assert.ok(await page.isDisabled('[data-board="diner-1"]'));
  await shot(page, '00-diner-locked');

  await page.goto(url('test=1&fresh=1&seed=11'));
  assert.strictEqual((await page.textContent('#cta')).trim(), 'Start the show');
  await checkNoSideScroll(page, 'hub');
  await shot(page, '01-hub-phone');

  // Board 1, with the first-time how-to sheet.
  await page.click('#cta');
  await page.waitForSelector('#sheet-title:has-text("How to play")');
  await shot(page, '02-how-to');
  await page.click('[data-close]');
  await page.waitForSelector('#overlay', { state: 'hidden' });
  await shot(page, '03-board-1');
  const firstDeal = await page.evaluate(() => JSON.stringify(window.__mnm.game.tiles.map((t) => [t.x, t.y, t.z, t.face])));

  // A blocked tile shakes and explains itself.
  const blocked = await page.evaluate(() => {
    const g = window.__mnm.game;
    const free = new Set(window.__mnm.engine.freeTileIds(g.tiles));
    const t = g.tiles.find((t) => t.present && !free.has(t.id));
    return t ? t.id : null;
  });
  assert.notStrictEqual(blocked, null);
  await page.click(`#board .tile[data-id="${blocked}"]`, { force: true });
  await page.waitForSelector('#toast.show');
  assert.match(await page.textContent('#toast'), /blocked/);

  // Undo puts a pair back.
  const before = await tilesLeft(page);
  await playPair(page);
  assert.strictEqual(await tilesLeft(page), before - 2);
  await page.click('#undo');
  assert.strictEqual(await tilesLeft(page), before);

  // Hint lights up two free tiles with the same picture.
  await page.click('#hint');
  const hinted = await page.$$eval('#board .tile.hint', (els) => els.map((e) => Number(e.dataset.id)));
  assert.strictEqual(hinted.length, 2);
  const hintOk = await page.evaluate((ids) => {
    const g = window.__mnm.game;
    const free = window.__mnm.engine.freeTileIds(g.tiles);
    return g.tiles[ids[0]].face === g.tiles[ids[1]].face && ids.every((id) => free.includes(id));
  }, hinted);
  assert.ok(hintOk, 'hinted tiles match and are free');
  await shot(page, '04-hint');

  // Shuffle keeps the same pictures.
  const faces = () => page.evaluate(() => window.__mnm.game.tiles.filter((t) => t.present).map((t) => t.face).sort().join());
  const facesBefore = await faces();
  await page.click('#shuffle');
  assert.strictEqual(await faces(), facesBefore);

  await clearBoard(page);
  await shot(page, '05-trivia');
  await answerTrivia(page, false);
  await shot(page, '06-trivia-answered');

  // Send the board to a friend: the link is copied, and opening it deals the very same tiles.
  await page.click('[data-share]');
  await page.waitForSelector('#toast.show');
  assert.match(await page.textContent('#toast'), /Link copied/);
  const message = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(message, /Opening Night/);
  const link = new URL(message.match(/https:\S+/)[0]);
  assert.strictEqual(link.origin + link.pathname, 'https://davidbeergabel-creator.github.io/movie-night-mahjong/');
  const friend = await ctx.newPage();
  friend.on('pageerror', (e) => errors.push(e.message));
  await friend.goto(url('test=1&' + link.searchParams.toString()));
  await friend.waitForSelector('#sheet-title:has-text("Opening Night")');
  assert.match(await friend.textContent('#sheet'), /cleared it using 2 hints|cleared it using \d+ hints?|no hints/);
  await shot(friend, '06b-friend-invite');
  await friend.click('[data-go="friend"]');
  await friend.waitForSelector('#game:not([hidden])');
  const friendDeal = await friend.evaluate(() => JSON.stringify(window.__mnm.game.tiles.map((t) => [t.x, t.y, t.z, t.face])));
  assert.strictEqual(friendDeal, firstDeal, 'the friend gets the same deal');
  assert.ok(!(await friend.evaluate(() => location.search.includes('play='))), 'the link is cleared from the address bar');
  await clearBoard(friend);
  await friend.waitForSelector('#sheet-title:has-text("Board cleared!")');
  assert.match(await friend.textContent('#sheet .question'), /You used|Neither of you|You both used/);
  await shot(friend, '06c-friend-result');
  await friend.close();
  // The daily board appears once a board is cleared. Clearing it stamps the calendar.
  await page.goto(url('test=1&today=2026-10-22'));
  await page.waitForSelector('#daily:not([hidden])');
  assert.match(await page.textContent('#daily-title'), /Thursday, October 22/);
  await shot(page, '07a-hub-daily');
  await page.click('[data-daily="play"]');
  await page.waitForSelector('#game:not([hidden])');
  assert.strictEqual(await page.textContent('#board-label'), 'Daily board');
  const dailyDeal = await page.evaluate(() => JSON.stringify(window.__mnm.game.tiles.map((t) => [t.x, t.y, t.z, t.face])));
  await clearBoard(page);
  await page.waitForSelector('#sheet-title:has-text("Stamped!")');
  await shot(page, '07b-daily-stamped');
  await page.click('#sheet [data-daily]');
  await page.waitForSelector('#sheet-title:has-text("Your calendar")');
  assert.strictEqual(await page.$$eval('.cal-day.stamped', (els) => els.length), 1);
  await shot(page, '07c-calendar');
  await page.click('[data-close]');
  await page.waitForSelector('#hub:not([hidden])');
  assert.match(await page.textContent('#daily'), /Stamped today/);
  // Everyone gets the same daily board on the same day.
  const otherPlayer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const again = await otherPlayer.newPage();
  await again.goto(url('test=1&fresh=1&today=2026-10-22'));
  await again.evaluate(() => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({ cleared: { 'drive-in-1': true }, seenHowTo: true })));
  await again.goto(url('test=1&today=2026-10-22'));
  await again.click('[data-daily="play"]');
  await again.waitForSelector('#game:not([hidden])');
  const dailyAgain = await again.evaluate(() => JSON.stringify(window.__mnm.game.tiles.map((t) => [t.x, t.y, t.z, t.face])));
  assert.strictEqual(dailyAgain, dailyDeal, 'same daily board for everyone on the same device size');
  await otherPlayer.close();
  await page.goto(url('test=1'));
  await page.click('[data-board="drive-in-2"]');

  // Board 2 opens with its new tiles.
  await page.waitForSelector('#sheet-title:has-text("New tiles tonight")');
  await shot(page, '07-new-tiles');
  await page.click('[data-close]');

  // Leave mid-board, reload, and resume where we were.
  await playPair(page);
  const leftMid = await tilesLeft(page);
  await page.click('#back');
  assert.match(await page.textContent('#cta'), /Resume Board 2/);
  await page.goto(url('test=1'));
  await page.click('#cta');
  await page.waitForSelector('#game:not([hidden])');
  assert.strictEqual(await tilesLeft(page), leftMid, 'resumed with the same tiles left');

  // Settings change the text size straight away.
  await page.click('#game-settings');
  await page.click('label:has(#text-largest)');
  assert.strictEqual(await page.getAttribute('html', 'data-text'), 'largest');
  await shot(page, '08-settings');
  await page.click('[data-close]');
  await checkNoSideScroll(page, 'game, largest text');
  await page.click('#game-settings');
  await page.click('label:has(#text-standard)');
  await page.click('[data-close]');

  // Play out boards 2 to 6, checking the tile size on a phone for each.
  const sizes = [];
  for (let level = 1; level < 6; level++) {
    if (level > 1) {
      await page.click(`[data-go="board:drive-in-${level + 1}"]`);
      if (await page.isVisible('#sheet-title:has-text("New tiles tonight")')) await page.click('[data-close]');
    }
    await page.waitForSelector('#overlay', { state: 'hidden' });
    const tw = await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw')));
    sizes.push(tw);
    await checkNoSideScroll(page, `board ${level + 1}`);
    await shot(page, `09-board-${level + 1}`);
    await clearBoard(page);
    await answerTrivia(page, true);
  }
  console.log('Tile widths on a 390px phone, boards 2-6:', sizes.join(', '));
  assert.ok(Math.min(...sizes) >= 44, 'tiles stay at least 44px wide on a phone');

  await shot(page, '10-chapter-done');
  assert.match(await page.textContent('#reveal'), /Chapter 2, Rock ’n’ Roll Diner, is now open/);

  // Chapter 2: the program switches to the Diner, every board fits a phone, and board 1 plays through.
  await page.click('[data-go="chapter:diner"]');
  await page.waitForSelector('#hub:not([hidden])');
  assert.strictEqual(await page.getAttribute('#tab-diner', 'aria-selected'), 'true');
  await shot(page, '10b-hub-diner');
  const dinerSizes = [];
  for (let i = 6; i >= 1; i--) {
    await page.click(`[data-board="diner-${i}"]`);
    await page.waitForSelector('#game:not([hidden])');
    if (await page.isVisible('#sheet-title:has-text("New tiles tonight")')) {
      if (i === 1) await shot(page, '10c-diner-new-tiles');
      await page.click('[data-close]');
    }
    dinerSizes.unshift(await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw'))));
    await checkNoSideScroll(page, `diner board ${i}`);
    await shot(page, `10d-diner-${i}`);
    if (i > 1) await page.click('#back');
  }
  console.log('Tile widths on a 390px phone, Diner boards 1-6:', dinerSizes.join(', '));
  assert.ok(Math.min(...dinerSizes) >= 44, 'Diner tiles stay at least 44px wide on a phone');
  await clearBoard(page);
  await answerTrivia(page, true);
  assert.ok(await page.isVisible('[data-go="board:diner-2"]'));
  await page.click('[data-go="hub"]');
  await page.click('#open-album');
  await page.waitForSelector('#album:not([hidden])');
  assert.strictEqual(await page.$$eval('[data-card]', (els) => els.length), 7);
  assert.strictEqual(await page.$$eval('.album-section', (els) => els.length), 2);
  await shot(page, '11-album');

  await page.goto(url('test=1'));
  await page.click('#tab-drive-in');
  assert.ok(await page.isVisible('#chapter-done'));
  assert.match(await page.textContent('#album-count'), /7 of 12/);
  await shot(page, '12-hub-done');

  // Desktop and tablet layouts.
  for (const [w, h, name] of [[1280, 800, 'desktop'], [1024, 768, 'tablet'], [844, 390, 'phone-landscape']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(url('test=1&seed=5'));
    await page.click('#tab-drive-in');
    await page.click('[data-board="drive-in-6"]');
    await page.waitForSelector('#game:not([hidden])');
    const tw = await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw')));
    console.log(`Grand Finale tile width on ${name} (${w}x${h}): ${tw}px`);
    await checkNoSideScroll(page, name);
    await shot(page, `13-${name}`);
    await page.click('#back');
  }

  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close();
  console.log('e2e: all checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
