'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const CH = require('../js/chess.js');
const P = require('../js/puzzle.js');
const { CHAPTERS } = require('../js/content.js');

const classic = CHAPTERS.filter((c) => c.mode === 'classic').flatMap((c) => c.boards);
const chess = CHAPTERS.find((c) => c.mode === 'chess').boards;
const present = (tiles) => tiles.map((t) => t.present);
const sortPairs = (list) => list.map((p) => p.slice().sort((a, b) => a - b).join('-')).sort();

test('the fast pair finders agree with the game rules', () => {
  classic.forEach((b, i) => {
    const rng = E.mulberry32(i + 1);
    const tiles = E.deal(b.blocks, b.faces, rng, i % 2 === 1, 0.6);
    const pairs = E.pairFinder(tiles);
    for (let step = 0; step < 6; step++) {
      assert.deepStrictEqual(sortPairs(pairs(present(tiles))), sortPairs(E.availableMatches(tiles)), b.name);
      const m = E.availableMatches(tiles);
      if (!m.length) break;
      tiles[m[0][0]].present = tiles[m[0][1]].present = false;
    }
  });
  chess.forEach((b, i) => {
    const tiles = CH.deal(b, CH.mulberry32(i + 5));
    const pairs = CH.pairFinder(tiles, b);
    for (let step = 0; step < 6; step++) {
      assert.deepStrictEqual(sortPairs(pairs(present(tiles))), sortPairs(CH.availableMatches(tiles, b)), b.name);
      const m = CH.availableMatches(tiles, b);
      if (!m.length) break;
      tiles[m[0][0]].present = tiles[m[0][1]].present = false;
    }
  });
});

test('trap deals still pair up faces and can be cleared', () => {
  classic.forEach((b) => {
    for (let seed = 1; seed <= 20; seed++) {
      const tiles = E.deal(b.blocks, b.faces, E.mulberry32(seed), seed % 2 === 0, 1);
      const counts = {};
      tiles.forEach((t) => { counts[t.face] = (counts[t.face] || 0) + 1; });
      Object.values(counts).forEach((n) => assert.strictEqual(n % 2, 0));
      const r = P.solve(E.pairFinder(tiles), present(tiles), { budget: 4000, faces: tiles.map((t) => t.face), allFreeSafe: true, doomed: E.doomCheck(tiles), score: E.moveScore(tiles) });
      assert.strictEqual(r.solvable, true, `${b.name} seed ${seed}`);
    }
  });
});

test('the solver finds a way on every fresh board and knows a dead end', () => {
  classic.concat(chess).forEach((b, i) => {
    const rng = E.mulberry32(100 + i);
    const tiles = b.grid ? CH.deal(b, rng) : E.deal(b.blocks, b.faces, rng, false, 0.8);
    const finder = b.grid ? CH.pairFinder(tiles, b) : E.pairFinder(tiles);
    const r = P.solve(finder, present(tiles), { budget: 4000, faces: tiles.map((t) => t.face), allFreeSafe: !b.grid, doomed: b.grid ? CH.doomCheck(tiles, b) : E.doomCheck(tiles), score: b.grid ? undefined : E.moveScore(tiles) });
    assert.strictEqual(r.solvable, true, `${b.name} should be solvable`);
    assert.ok(Array.isArray(r.move));
  });
  // One tile on top of its own twin: there is no way out.
  const b = classic[0];
  const tiles = E.deal(b.blocks, b.faces, E.mulberry32(3), false);
  const top = tiles.find((t) => t.z === 1);
  const under = tiles.find((t) => t.z === 0 && Math.abs(t.x - top.x) < 2 && Math.abs(t.y - top.y) < 2);
  tiles.forEach((t) => { t.present = t === top || t === under; });
  top.face = under.face = 'car';
  assert.strictEqual(P.solve(E.pairFinder(tiles), present(tiles), { faces: tiles.map((t) => t.face), allFreeSafe: true }).solvable, false);
});

test('picking deals steers how hard a board is', () => {
  const b = classic[3];
  const avg = (target) => {
    let sum = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const rng = E.mulberry32(seed);
      const picked = P.pickDeal(
        () => E.deal(b.blocks, b.faces, rng, false, target > 0.5 ? 1 : 0),
        (t) => E.pairFinder(t), target, rng, 16, 24);
      sum += P.stuckRate(E.pairFinder(picked.tiles), present(picked.tiles), E.mulberry32(seed + 99), 60);
    }
    return sum / 8;
  };
  const easy = avg(0.05);
  const hard = avg(0.85);
  assert.ok(easy < 0.25, `easy picks get a careless player stuck ${Math.round(easy * 100)}% of the time`);
  assert.ok(hard > 0.6, `hard picks get a careless player stuck ${Math.round(hard * 100)}% of the time`);
});

test('a seed always picks the same deal, so shared links and the daily board match', () => {
  [classic[5], chess[5]].forEach((b) => {
    const pick = () => {
      const rng = E.mulberry32(4242);
      const deal = b.grid ? () => CH.deal(b, rng) : () => E.deal(b.blocks, b.faces, rng, false, 1);
      const finder = b.grid ? (t) => CH.pairFinder(t, b) : (t) => E.pairFinder(t);
      return P.pickDeal(deal, finder, b.difficulty, rng, 16, 24).tiles.map((t) => t.face).join();
    };
    assert.strictEqual(pick(), pick(), b.name);
  });
});

test('every board has a difficulty, and each chapter has hard levels', () => {
  CHAPTERS.forEach((ch) => {
    ch.boards.forEach((b) => assert.ok(b.difficulty > 0 && b.difficulty < 1, b.name));
    const hard = ch.boards.filter((b) => b.hard);
    assert.ok(hard.length >= 1, `${ch.id} has a hard level`);
    assert.ok(ch.boards[ch.boards.length - 1].hard, `${ch.id} ends on a hard level`);
    hard.forEach((b) => assert.ok(b.difficulty >= 0.5, `${b.name} is hard enough`));
  });
  assert.ok(!CHAPTERS[0].boards[0].hard && CHAPTERS[0].boards[0].difficulty < 0.1, 'the very first board stays gentle');
});
