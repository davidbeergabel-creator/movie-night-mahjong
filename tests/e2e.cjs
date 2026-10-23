/* Plays through the game in a real browser by tapping tiles, the way a player would.
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

async function deal(page) {
  return page.evaluate(() => JSON.stringify(window.__mnm.game.tiles.map((t) => [t.x, t.y, t.z, t.face])));
}

// Taps one available pair. Returns false when the board is done.
async function playPair(page) {
  const pair = await page.evaluate(() => {
    const g = window.__mnm.game;
    if (!g) return null;
    const m = window.__mnm.matches();
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
  await page.waitForSelector('.sheet.celebrate');
}

async function answerTrivia(page, right) {
  const correct = await page.evaluate(() => window.__mnm.trivia.found.board.trivia.answer);
  const choice = right ? correct : (correct + 1) % 4;
  await page.click(`[data-answer="${choice}"]`);
  await page.waitForSelector('#reveal:not([hidden])');
  assert.ok(await page.isHidden('#quiz'), 'the answers make way for the result');
  const verdict = await page.textContent('#reveal .verdict');
  assert.ok(right ? /right/.test(verdict) : /^It was/.test(verdict), verdict);
}

// Every screen fills the phone exactly: nothing scrolls, sideways or down.
async function checkNoScroll(page, where) {
  const over = await page.evaluate(() => [
    document.documentElement.scrollWidth - window.innerWidth,
    document.documentElement.scrollHeight - window.innerHeight
  ]);
  assert.ok(over[0] <= 0 && over[1] <= 0, `${where}: page scrolls by ${over.join(' x ')}px`);
}

async function openBoard(page, key) {
  await page.click('#nav-chapters');
  await page.click(`#tab-${key.replace(/-\d+$/, '')}`);
  await page.click(`[data-board="${key}"]`);
  await page.waitForSelector('#game:not([hidden])');
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
  assert.strictEqual((await page.textContent('#play-btn')).trim(), 'Level 3');
  assert.match(await page.textContent('#play-sub'), /Snack Bar/);
  assert.strictEqual(await page.getAttribute('html', 'data-text'), 'large');
  await page.click('#nav-album');
  assert.match(await page.textContent('#album-count'), /^2 of 18/);
  // Chapter 2 stays locked until Chapter 1 is finished.
  await page.goto(url('test=1&locks=1'));
  await page.click('#nav-chapters');
  assert.match(await page.textContent('#tab-diner'), /Locked/);
  await page.click('#tab-diner');
  assert.ok(await page.isVisible('#chapter-locked'));
  assert.ok(await page.isDisabled('[data-board="diner-1"]'));
  await shot(page, '00-diner-locked');

  // A first visit: one big button, no side badges yet, and each tab fits the screen.
  await page.goto(url('test=1&fresh=1&seed=11'));
  assert.strictEqual((await page.textContent('#play-btn')).trim(), 'Level 1');
  assert.strictEqual(await page.$$eval('.widget', (els) => els.length), 0);
  for (const v of ['home', 'daily', 'chapters', 'album']) {
    await page.click(`#nav-${v}`);
    await checkNoScroll(page, v);
    await shot(page, `01-${v}`);
  }
  await page.click('#nav-home');

  // Level 1, with the first-time how-to sheet.
  await page.click('#play-btn');
  await page.waitForSelector('#sheet-title:has-text("How to play")');
  await shot(page, '02-how-to');
  await page.click('[data-close]');
  await page.waitForSelector('#overlay', { state: 'hidden' });
  assert.ok(await page.isHidden('#tabbar'), 'the board gets the whole screen');
  assert.strictEqual(await page.textContent('#stat-kind'), 'Level');
  assert.strictEqual(await page.textContent('#stat-level'), '1');
  assert.strictEqual(Number(await page.textContent('#matches')), await page.evaluate(() => window.__mnm.matches().length));
  await checkNoScroll(page, 'board');
  await shot(page, '03-board-1');
  const firstDeal = await deal(page);

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
  assert.strictEqual(await page.textContent('#tiles-left'), String(before - 2));
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
  await checkNoScroll(page, 'trivia result');
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
  assert.match(await friend.textContent('#sheet'), /cleared it using (no hints|\d+ hints?)/);
  await shot(friend, '06b-friend-invite');
  await friend.click('[data-go="friend"]');
  await friend.waitForSelector('#game:not([hidden])');
  assert.strictEqual(await friend.textContent('#stat-kind'), 'Friend');
  assert.strictEqual(await deal(friend), firstDeal, 'the friend gets the same deal');
  assert.ok(!(await friend.evaluate(() => location.search.includes('play='))), 'the link is cleared from the address bar');
  await clearBoard(friend);
  await friend.waitForSelector('#sheet-title:has-text("Board cleared!")');
  assert.match(await friend.textContent('#sheet .question'), /You used|Neither of you|You both used/);
  await shot(friend, '06c-friend-result');
  await friend.close();

  // After the first board, home shows the Daily badge. Clearing the daily board stamps the calendar.
  await page.goto(url('test=1&today=2026-10-22'));
  assert.ok(await page.isVisible('.widget[data-go="daily"]'));
  assert.ok(await page.isVisible('.widget[data-go="chapter:chess"]'), 'Chess Night badge (test mode unlocks it)');
  await shot(page, '07a-home-badges');
  await page.click('.widget[data-go="daily"]');
  await page.waitForSelector('#daily:not([hidden])');
  assert.match(await page.textContent('#daily-title'), /Thursday, October 22/);
  await checkNoScroll(page, 'daily');
  await page.click('#daily-play');
  await page.waitForSelector('#game:not([hidden])');
  assert.strictEqual(await page.textContent('#stat-kind'), 'Daily');
  assert.strictEqual(await page.textContent('#stat-level'), 'Oct 22');
  const dailyDeal = await deal(page);
  await clearBoard(page);
  await page.waitForSelector('#sheet-title:has-text("Stamped!")');
  await shot(page, '07b-daily-stamped');
  await page.click('#sheet [data-go="daily"]');
  await page.waitForSelector('#daily:not([hidden])');
  assert.strictEqual(await page.$$eval('.cal-day.stamped', (els) => els.length), 1);
  assert.match(await page.textContent('#daily-action'), /Stamped today/);
  await shot(page, '07c-calendar');
  await page.click('#nav-home');
  assert.match(await page.textContent('#clock'), /^\d+:\d\d:\d\d$/, 'the badge counts down to the next board');
  // Everyone gets the same daily board on the same day.
  const otherPlayer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const again = await otherPlayer.newPage();
  await again.goto(url('test=1&fresh=1&today=2026-10-22'));
  await again.click('#nav-daily');
  await again.click('#daily-play');
  await again.waitForSelector('#game:not([hidden])');
  while (await again.isVisible('#overlay:not([hidden]) [data-close]')) await again.click('#overlay [data-close]');
  assert.strictEqual(await deal(again), dailyDeal, 'same daily board for everyone on the same device size');
  await otherPlayer.close();

  // Level 2 opens with its new tiles.
  await page.goto(url('test=1'));
  await openBoard(page, 'drive-in-2');
  await page.waitForSelector('#sheet-title:has-text("New tiles tonight")');
  await shot(page, '07-new-tiles');
  await page.click('[data-close]');

  // Leave mid-board, reload, and resume where we were.
  await playPair(page);
  const leftMid = await tilesLeft(page);
  await page.click('#back');
  await page.waitForSelector('#home:not([hidden])');
  assert.strictEqual((await page.textContent('#play-btn')).trim(), 'Level 2');
  assert.match(await page.textContent('#play-sub'), /^Resume/);
  await page.goto(url('test=1'));
  await page.click('#play-btn');
  await page.waitForSelector('#game:not([hidden])');
  assert.strictEqual(await tilesLeft(page), leftMid, 'resumed with the same tiles left');

  // Settings change the text size straight away.
  await page.click('#game-settings');
  await page.click('label:has(#text-largest)');
  assert.strictEqual(await page.getAttribute('html', 'data-text'), 'largest');
  await shot(page, '08-settings');
  await page.click('[data-close]');
  await checkNoScroll(page, 'board, largest text');
  await page.click('#game-settings');
  await page.click('label:has(#text-standard)');
  await page.click('[data-close]');

  // Play out levels 2 to 6, checking the tile size on a phone for each.
  const sizes = [];
  for (let level = 2; level <= 6; level++) {
    if (level > 2) {
      await page.click(`[data-go="board:drive-in-${level}"]`);
      if (await page.isVisible('#sheet-title:has-text("New tiles tonight")')) await page.click('[data-close]');
    }
    await page.waitForSelector('#overlay', { state: 'hidden' });
    assert.strictEqual(await page.textContent('#stat-level'), String(level));
    sizes.push(await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw'))));
    await checkNoScroll(page, `level ${level}`);
    await shot(page, `09-level-${level}`);
    await clearBoard(page);
    await answerTrivia(page, true);
  }
  console.log('Tile widths on a 390px phone, levels 2-6:', sizes.join(', '));
  assert.ok(Math.min(...sizes) >= 44, 'tiles stay at least 44px wide on a phone');

  await shot(page, '10-chapter-done');
  assert.match(await page.textContent('#reveal'), /Chapter 2, Rock ’n’ Roll Diner, is now open/);

  // Chapter 2: the Chapters tab switches to the Diner, every board fits a phone, and its first board plays through.
  await page.click('[data-go="chapter:diner"]');
  await page.waitForSelector('#chapters:not([hidden])');
  assert.strictEqual(await page.getAttribute('#tab-diner', 'aria-selected'), 'true');
  await shot(page, '10b-chapters-diner');
  const dinerSizes = [];
  for (let i = 6; i >= 1; i--) {
    await openBoard(page, `diner-${i}`);
    if (await page.isVisible('#sheet-title:has-text("New tiles tonight")')) {
      if (i === 1) await shot(page, '10c-diner-new-tiles');
      await page.click('[data-close]');
    }
    assert.strictEqual(await page.textContent('#stat-level'), String(6 + i));
    dinerSizes.unshift(await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw'))));
    await checkNoScroll(page, `diner board ${i}`);
    await shot(page, `10d-diner-${i}`);
    if (i > 1) await page.click('#back');
  }
  console.log('Tile widths on a 390px phone, levels 7-12:', dinerSizes.join(', '));
  assert.ok(Math.min(...dinerSizes) >= 44, 'Diner tiles stay at least 44px wide on a phone');
  await clearBoard(page);
  await answerTrivia(page, true);
  assert.ok(await page.isVisible('[data-go="board:diner-2"]'));
  await page.click('[data-go="home"]');
  await page.click('#nav-album');
  assert.match(await page.textContent('#album-count'), /^7 of 18/);
  assert.strictEqual(await page.$$eval('#album-grid [data-card]', (els) => els.length), 6);
  await page.click('#album-tab-diner');
  assert.strictEqual(await page.$$eval('#album-grid [data-card]', (els) => els.length), 1);
  await checkNoScroll(page, 'album');
  await shot(page, '11-album');
  await page.click('#album-grid [data-card]');
  await page.waitForSelector('#sheet-title:has-text("Booth for Two")');
  await page.click('[data-close]');

  await page.click('#nav-chapters');
  await page.click('#tab-drive-in');
  assert.ok(await page.isVisible('#chapter-done'));
  await shot(page, '12-chapters-done');

  // Chess Night: the how-to and piece intro, move dots, an out-of-reach twin, and a full board.
  await page.goto(url('test=1&seed=21'));
  await openBoard(page, 'chess-3');
  await page.waitForSelector('#sheet-title:has-text("How Chess Night works")');
  await shot(page, '12c-chess-howto');
  await page.click('[data-close]');
  await page.waitForSelector('#sheet-title:has-text("Meet the knight")');
  await shot(page, '12d-meet-knight');
  await page.click('[data-close]');
  await page.waitForSelector('#overlay', { state: 'hidden' });
  assert.strictEqual(await page.textContent('#stat-kind'), 'Chess');
  assert.strictEqual(await page.textContent('#stat-left-label'), 'Pieces');
  const chessCheck = await page.evaluate(() => {
    const g = window.__mnm.game;
    const CH = window.__mnm.chess;
    // Pick a piece that has a twin it can reach and a twin it cannot.
    for (const t of g.tiles) {
      const reach = CH.reach(g.tiles, t.id, g.board);
      const reachable = new Set(reach.filter((s) => s.id !== null).map((s) => s.id));
      const twins = g.tiles.filter((o) => o.id !== t.id && o.face === t.face);
      const near = twins.find((o) => reachable.has(o.id));
      const far = twins.find((o) => !reachable.has(o.id));
      if (near && far) return { id: t.id, near: near.id, far: far.id, dots: reach.filter((s) => s.id === null).length };
    }
    return null;
  });
  assert.ok(chessCheck, 'found a piece with a near and a far twin');
  await page.click(`#board .tile[data-id="${chessCheck.id}"]`);
  assert.strictEqual(await page.$$eval('.square.reach', (els) => els.length), chessCheck.dots);
  assert.ok(await page.$eval(`#board .tile[data-id="${chessCheck.near}"]`, (el) => el.classList.contains('match')));
  await shot(page, '12e-chess-selected');
  await page.click(`#board .tile[data-id="${chessCheck.far}"]`);
  await page.waitForSelector('#toast.show');
  assert.match(await page.textContent('#toast'), /out of reach/);
  const piecesBefore = await tilesLeft(page);
  await page.click(`#board .tile[data-id="${chessCheck.near}"]`);
  await waitIdle(page);
  assert.strictEqual(await tilesLeft(page), piecesBefore - 2);
  await checkNoScroll(page, 'chess board');
  await clearBoard(page);
  assert.match(await page.textContent('#sheet-title'), /Did you know\?/);
  await answerTrivia(page, true);
  await shot(page, '12f-chess-card');
  await page.click('[data-go="home"]');
  for (let i = 1; i <= 6; i++) {
    await openBoard(page, `chess-${i}`);
    while (await page.isVisible('#overlay:not([hidden]) [data-close]')) await page.click('#overlay [data-close]');
    const sq = await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--sq')));
    assert.ok(sq >= 50, `chess board ${i} squares are ${sq}px on a phone`);
    if (i === 6) await shot(page, '12g-chess-6');
    await page.click('#back');
  }

  // A small phone, a tablet, a desktop and a phone held sideways.
  for (const [w, h, name] of [[375, 667, 'small-phone'], [1280, 800, 'desktop'], [1024, 768, 'tablet']]) {
    await page.setViewportSize({ width: w, height: h });
    // Each size starts afresh, so its board is dealt for that screen's shape.
    await page.goto(url('test=1&fresh=1&seed=5'));
    await page.evaluate(() => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({ seenHowTo: true, seenIntro: { 'drive-in-6': true } })));
    await page.goto(url('test=1&seed=5'));
    for (const v of ['home', 'daily', 'chapters', 'album']) {
      await page.click(`#nav-${v}`);
      await checkNoScroll(page, `${name} ${v}`);
    }
    await shot(page, `13-${name}-album`);
    await page.click('#nav-home');
    await shot(page, `13-${name}-home`);
    await openBoard(page, 'drive-in-6');
    const tw = await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw')));
    console.log(`Grand Finale tile width on ${name} (${w}x${h}): ${tw}px`);
    await checkNoScroll(page, `${name} board`);
    await shot(page, `13-${name}-board`);
    await page.click('#back');
  }

  // A phone held sideways keeps the game upright for the phone, like an app locked to portrait.
  const sideways = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const turned = await sideways.newPage();
  turned.on('pageerror', (e) => errors.push(e.message));
  await turned.goto(url('test=1&fresh=1&seed=5'));
  assert.strictEqual(await turned.getAttribute('html', 'data-turned'), 'left');
  await checkNoScroll(turned, 'sideways phone home');
  await shot(turned, '14-sideways-home');
  await turned.tap('#play-btn');
  while (await turned.isVisible('#overlay:not([hidden]) [data-close]')) await turned.tap('#overlay [data-close]');
  const turnedTile = await turned.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw')));
  assert.ok(turnedTile >= 80, `sideways phone gets portrait-sized tiles (${turnedTile}px)`);
  const pairs = await turned.evaluate(() => window.__mnm.matches()[0]);
  for (const id of pairs) await turned.tap(`#board .tile[data-id="${id}"]`);
  await turned.waitForFunction(() => !window.__mnm.game.busy);
  assert.strictEqual(await turned.evaluate(() => window.__mnm.engine.remaining(window.__mnm.game.tiles)), 14, 'taps land on the turned board');
  await shot(turned, '14-sideways-board');
  await sideways.close();

  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close();
  console.log('e2e: all checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
