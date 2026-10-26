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

// Taps the pair the solver picks, so the board can always be cleared. Returns false when the board is done.
async function playPair(page) {
  const pair = await page.evaluate(() => {
    if (!window.__mnm.game) return null;
    const r = window.__mnm.solve();
    return r.solvable === false ? [] : r.move;
  });
  if (pair === null) return false;
  assert.ok(pair.length === 2, 'the solver always finds a way on a fair board');
  for (const id of pair) await page.click(`#board .tile[data-id="${id}"]`);
  await waitIdle(page);
  return true;
}

// Taps the first pair it sees, the way a careless player would, until the board runs out of pairs.
async function playCarelessly(page) {
  for (let i = 0; i < 100; i++) {
    const pair = await page.evaluate(() => window.__mnm.matches()[0] || null);
    if (!pair) return;
    for (const id of pair) await page.click(`#board .tile[data-id="${id}"]`);
    await waitIdle(page);
  }
}

async function closeSheets(page) {
  while (await page.isVisible('#overlay:not([hidden]) [data-close]')) await page.click('#overlay [data-close]');
  await page.waitForSelector('#overlay', { state: 'hidden' });
}

const badge = (page, id) => page.textContent(`#${id} .badge`);

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
  assert.ok(await page.$eval(`[data-answer="${correct}"]`, (el) => el.classList.contains('right')), 'the right answer lights up');
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
  assert.match(await page.textContent('#album-count'), /^2 of 24/);
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

  // A blocked tile shakes. The first time, a note says why; after that, nothing covers the board.
  const blocked = await page.evaluate(() => {
    const g = window.__mnm.game;
    const free = new Set(window.__mnm.engine.freeTileIds(g.tiles));
    const t = g.tiles.find((t) => t.present && !free.has(t.id));
    return t ? t.id : null;
  });
  assert.notStrictEqual(blocked, null);
  await page.click(`#board .tile[data-id="${blocked}"]`, { force: true });
  assert.ok(await page.$eval(`#board .tile[data-id="${blocked}"]`, (el) => el.classList.contains('nudge')));
  assert.match(await page.textContent('#toast.show'), /blocked/, 'the first blocked tap explains itself');
  await page.click(`#board .tile[data-id="${blocked}"]`, { force: true });
  assert.ok(!(await page.isVisible('#toast.show')), 'the next blocked tap only shakes, and clears the note');

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
  assert.strictEqual(await badge(page, 'hint'), '2', 'three hints per level');
  await shot(page, '04-hint');

  // Shuffle keeps the same pictures.
  const faces = () => page.evaluate(() => window.__mnm.game.tiles.filter((t) => t.present).map((t) => t.face).sort().join());
  const facesBefore = await faces();
  await page.click('#shuffle');
  assert.strictEqual(await faces(), facesBefore);
  assert.strictEqual(await badge(page, 'shuffle'), '2', 'three shuffles per level');

  await clearBoard(page);
  assert.strictEqual(await page.getAttribute('#sheet .stars-row', 'aria-label'), '2 stars out of 3', 'a hint and a shuffle cost a star');
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
  assert.match(await friend.textContent('#sheet'), /cleared it using 1 hint and 1 shuffle and earned 2 stars/);
  await shot(friend, '06b-friend-invite');
  await friend.click('[data-go="friend"]');
  await friend.waitForSelector('#game:not([hidden])');
  assert.strictEqual(await friend.textContent('#stat-kind'), 'Friend');
  assert.strictEqual(await deal(friend), firstDeal, 'the friend gets the same deal');
  assert.ok(!(await friend.evaluate(() => location.search.includes('play='))), 'the link is cleared from the address bar');
  await clearBoard(friend);
  await friend.waitForSelector('#sheet-title:has-text("Board cleared!")');
  assert.match(await friend.textContent('#sheet .question'), /You earned 3 stars\. Your friend earned 2 stars\./);
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
      // Level 4 is the first hard level: it warns once and offers tips.
      if (level === 4) {
        await page.waitForSelector('#sheet-title:has-text("A hard level")');
        await shot(page, '09-hard-intro');
      }
      await closeSheets(page);
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
  assert.strictEqual(await page.textContent('#stars-count'), '20', '2 stars for Level 1, then 3 for each level cleared without help');
  await page.click('#nav-album');
  assert.match(await page.textContent('#album-count'), /^7 of 24/);
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
  assert.strictEqual(await page.$$eval('[data-board="drive-in-1"] .star.on', (els) => els.length), 2);
  assert.strictEqual(await page.$$eval('[data-board="drive-in-6"] .star.on', (els) => els.length), 3);
  assert.ok(await page.isVisible('[data-board="drive-in-4"] .hard-tag'), 'hard levels are marked');
  await shot(page, '12-chapters-done');

  // A hard level for real: careless play gets stuck, and nothing reshuffles by itself.
  await page.goto(url('test=1&fresh=1&seed=3'));
  await page.evaluate(() => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({
    seenHowTo: true, cleared: { 'drive-in-1': true, 'drive-in-2': true, 'drive-in-3': true }, stars: { 'drive-in-1': 3 }
  })));
  await page.goto(url('test=1&seed=3'));
  assert.ok(await page.$eval('#play-btn', (el) => el.classList.contains('hard')), 'the home button turns purple for a hard level');
  assert.match(await page.textContent('#play-btn'), /Hard level\s*Level 4/);
  assert.strictEqual(await page.textContent('#stars-count'), '5', 'boards cleared before stars count one each');
  await shot(page, '12h-home-hard');
  await page.click('#play-btn');
  await page.waitForSelector('#sheet-title:has-text("A hard level")');
  await closeSheets(page);
  assert.match(await page.textContent('#board-name'), /Back Row\s*Hard/);
  const hardDeal = await deal(page);
  const fullCount = await tilesLeft(page);
  await playCarelessly(page);
  await page.waitForSelector('#sheet-title:has-text("No more matches")');
  assert.ok(await tilesLeft(page) > 0, 'stuck with tiles still on the board');
  await shot(page, '12i-stuck');
  // Looking at the board, then asking for a hint, brings the choices back.
  await page.click('#sheet [data-close]');
  await page.click('#hint');
  await page.waitForSelector('#sheet-title:has-text("No more matches")');
  assert.strictEqual(await badge(page, 'hint'), '3', 'a hint on a dead end is free');
  // The stuck sheet counts how far back the board could still be cleared.
  const wayBack = async () => Number((await page.getAttribute('#sheet [data-go^="undo:"]', 'data-go')).slice(5));
  const back = await wayBack();
  assert.ok(back > 1, `this deal went wrong ${back} moves before the end`);
  // One move back it is still a dead end with pairs left, and a hint says how far to go, for free.
  await page.click('#sheet [data-close]');
  await page.click('#undo');
  await page.click('#hint');
  await page.waitForSelector('#toast.show');
  const rest = back - 1 === 1 ? 'your last move' : `your last ${back - 1} moves`;
  assert.match(await page.textContent('#toast'), new RegExp(`can’t be cleared from here\\. Undo ${rest}`));
  assert.strictEqual(await badge(page, 'hint'), '3');
  await shot(page, '12j-hint-on-dead-end');
  // Playing on from a dead end always ends stuck. Going back from there gives a board a hint can solve.
  await playCarelessly(page);
  await page.waitForSelector('#sheet-title:has-text("No more matches")');
  const stuckLeft = await tilesLeft(page);
  const back2 = await wayBack();
  await page.click('#sheet [data-go^="undo:"]');
  await page.waitForSelector('#overlay', { state: 'hidden' });
  assert.strictEqual(await tilesLeft(page), stuckLeft + 2 * back2);
  assert.notStrictEqual((await page.evaluate(() => window.__mnm.solve())).solvable, false);
  await page.click('#hint');
  await page.waitForSelector('#toast:has-text("These two match")');
  assert.strictEqual(await badge(page, 'hint'), '2');
  await shot(page, '12j-hint-after-way-back');
  // Start over: the same deal, with a full set of hints and shuffles.
  await page.click('#game-settings');
  await page.click('#sheet [data-go="restart"]');
  await page.waitForSelector('#toast:has-text("from the start")');
  assert.strictEqual(await deal(page), hardDeal, 'starting over deals the same board');
  assert.strictEqual(await tilesLeft(page), fullCount);
  assert.strictEqual(await badge(page, 'hint'), '3');
  // Help runs out.
  for (let i = 0; i < 3; i++) await page.click('#hint');
  for (let i = 0; i < 3; i++) await page.click('#shuffle');
  assert.strictEqual(await badge(page, 'hint'), '0');
  assert.strictEqual(await badge(page, 'shuffle'), '0');
  assert.ok(await page.$eval('#hint', (el) => el.classList.contains('spent')));
  await page.click('#hint');
  assert.match(await page.textContent('#toast'), /No hints left/);
  await page.click('#shuffle');
  assert.match(await page.textContent('#toast'), /No shuffles left/);
  await shot(page, '12k-help-spent');
  await clearBoard(page);
  assert.strictEqual(await page.getAttribute('#sheet .stars-row', 'aria-label'), '1 star out of 3');
  await answerTrivia(page, true);
  assert.match(await page.textContent('#reveal'), /no hints or shuffles for 3 stars/);

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
  assert.ok(await page.$eval(`#board .tile[data-id="${chessCheck.far}"]`, (el) => el.classList.contains('nudge')), 'a twin out of reach shakes');
  assert.match(await page.textContent('#toast.show'), /out of reach/, 'the first time, a note says why');
  await page.click(`#board .tile[data-id="${chessCheck.far}"]`);
  assert.ok(!(await page.isVisible('#toast.show')), 'after that, it only shakes');
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

  // Chapter 3: every board fits a phone, and the umbrella, the tower, the heart and the cake stay upright.
  await page.goto(url('test=1&fresh=1&seed=13'));
  await page.evaluate(() => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({ seenHowTo: true, seenHard: true })));
  await page.goto(url('test=1&seed=13'));
  const romanceSizes = [];
  for (let i = 1; i <= 6; i++) {
    await openBoard(page, `romance-${i}`);
    if (i === 1) {
      await page.waitForSelector('#sheet-title:has-text("New tiles tonight")');
      await shot(page, '17a-romance-new-tiles');
    }
    await closeSheets(page);
    assert.strictEqual(await page.textContent('#stat-level'), String(12 + i));
    romanceSizes.push(await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw'))));
    if (i >= 3) assert.strictEqual(await page.evaluate(() => window.__mnm.game.transposed), false, `romance board ${i} stays upright`);
    await checkNoScroll(page, `romance board ${i}`);
    await shot(page, `17b-romance-${i}`);
    await page.click('#back');
  }
  console.log('Tile widths on a 390px phone, levels 13-18:', romanceSizes.join(', '));
  assert.ok(Math.min(...romanceSizes) >= 44, 'Chapter 3 tiles stay at least 44px wide on a phone');
  await page.click('#nav-chapters');
  await page.click('#tab-romance');
  await checkNoScroll(page, 'chapters with four tabs');
  await shot(page, '17c-chapters-romance');

  // The Late Show: finishing the last story chapter opens endless levels, numbered on from Level 18.
  await page.goto(url('test=1&fresh=1&seed=9'));
  await page.evaluate(() => {
    const cleared = {};
    for (let i = 1; i <= 6; i++) cleared['drive-in-' + i] = true;
    for (let i = 1; i <= 6; i++) cleared['diner-' + i] = true;
    for (let i = 1; i <= 5; i++) cleared['romance-' + i] = true;
    localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({ seenHowTo: true, seenHard: true, cleared, seenIntro: { 'romance-6': true } }));
  });
  await page.goto(url('test=1&seed=9'));
  assert.match(await page.textContent('#play-btn'), /Level 18/);
  await page.click('#play-btn');
  await closeSheets(page);
  await clearBoard(page);
  await answerTrivia(page, true);
  assert.match(await page.textContent('#reveal'), /The Late Show is now open/);
  await page.click('#reveal [data-go="board:late-1"]');
  await page.waitForSelector('#sheet-title:has-text("Welcome to the Late Show")');
  await shot(page, '15a-late-show-intro');
  await closeSheets(page);
  assert.strictEqual(await page.textContent('#stat-level'), '19');
  assert.match(await page.textContent('#board-name'), /After Hours/);
  const lateTile = await page.evaluate(() => parseFloat(document.getElementById('board').style.getPropertyValue('--tw')));
  assert.ok(lateTile >= 44, `Late Show tiles are ${lateTile}px on a phone`);
  await checkNoScroll(page, 'late show board');
  await shot(page, '15b-late-show-board');
  await clearBoard(page);
  await page.waitForSelector('#sheet-title:has-text("Level cleared!")');
  assert.ok(await page.isVisible('#sheet .stars-row'));
  await shot(page, '15c-late-show-cleared');
  await page.click('#sheet [data-go="board:late-2"]');
  await page.waitForSelector('#overlay', { state: 'hidden' });
  assert.strictEqual(await page.textContent('#stat-level'), '20');
  await page.click('#back');
  assert.match(await page.textContent('#play-btn'), /Level 20/);
  assert.match(await page.textContent('#play-sub'), /^Resume · The Late Show · Midnight Matinee/);
  assert.strictEqual(await page.getAttribute('#emblem', 'data-face'), 'moon');
  await shot(page, '15d-home-late-show');

  // Playtest mode: the log stays on the phone across visits, and Settings copies readable notes.
  await page.goto(url('test=1&fresh=1&seed=11&playtest=1'));
  await page.click('#play-btn');
  await closeSheets(page);
  await playPair(page);
  await page.click('#back');
  await page.goto(url('test=1&seed=11'));
  await page.click('#open-settings');
  assert.ok(await page.isVisible('.playtest-box'), 'playtest mode stays on for this phone');
  await shot(page, '16a-playtest-settings');
  await page.click('#pt-copy');
  await page.waitForSelector('#toast:has-text("Playtest notes copied")');
  const notes = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(notes, /^Movie Night Mahjong playtest notes/);
  assert.match(notes, /2 visits/);
  assert.match(notes, /Level 1 · Opening Night: left unfinished with 14 tiles on the board/);
  assert.match(notes, /--- Raw log, for analysis ---\n\[\{"event":"session"/);
  await page.click('#pt-clear');
  assert.strictEqual((await page.textContent('#pt-clear')).trim(), 'Tap again to clear', 'clearing takes two taps');
  await page.click('#pt-clear');
  assert.strictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('movie-night-mahjong.playtest')).length), 0);
  await page.click('#pt-off');
  await page.click('#open-settings');
  assert.ok(!(await page.isVisible('.playtest-box')), 'playtest mode can be turned off');
  await page.click('#sheet [data-close]');

  // A small phone, a tablet, a desktop and a phone held sideways.
  for (const [w, h, name] of [[375, 667, 'small-phone'], [1280, 800, 'desktop'], [1024, 768, 'tablet']]) {
    await page.setViewportSize({ width: w, height: h });
    // Each size starts afresh, so its board is dealt for that screen's shape.
    await page.goto(url('test=1&fresh=1&seed=5'));
    await page.evaluate(() => localStorage.setItem('movie-night-mahjong.v1', JSON.stringify({ seenHowTo: true, seenHard: true, seenIntro: { 'drive-in-6': true } })));
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
  const pairs = await turned.evaluate(() => window.__mnm.solve().move);
  for (const id of pairs) await turned.tap(`#board .tile[data-id="${id}"]`);
  await turned.waitForFunction(() => !window.__mnm.game.busy);
  assert.strictEqual(await turned.evaluate(() => window.__mnm.engine.remaining(window.__mnm.game.tiles)), 14, 'taps land on the turned board');
  await shot(turned, '14-sideways-board');
  await sideways.close();

  // Trivia answers come in a new order each time, except number scales, which stay in order.
  const orders = await page.evaluate(() => {
    const C = window.MNMContent.CHAPTERS;
    const free = C[0].boards[0].trivia;
    const scale = C.flatMap((c) => c.boards).find((b) => b.trivia.ordered).trivia;
    const runs = Array.from({ length: 40 }, () => window.__mnm.answerOrder(free));
    return {
      perms: runs.every((o) => o.slice().sort().join() === '0,1,2,3'),
      rightFirst: runs.filter((o) => o[0] === free.answer).length,
      scale: window.__mnm.answerOrder(scale).join()
    };
  });
  assert.ok(orders.perms, 'every answer shows once');
  assert.ok(orders.rightFirst < 25, `the right answer came first ${orders.rightFirst} times out of 40`);
  assert.strictEqual(orders.scale, '0,1,2,3');

  assert.deepStrictEqual(errors, [], 'no page errors');
  await browser.close();
  console.log('e2e: all checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
