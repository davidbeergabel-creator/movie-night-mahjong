'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const L = require('../js/endless.js');
const P = require('../js/puzzle.js');
const { CHAPTERS } = require('../js/content.js');

const faces = [...new Set(CHAPTERS.filter((c) => !c.bonus).flatMap((c) => c.boards.flatMap((b) => b.faces)))];
const LEVELS = 200;
const boards = Array.from({ length: LEVELS }, (_, i) => L.board(i + 1, faces));

test('a Late Show level is the same board for everyone', () => {
  [1, 7, 50, 199].forEach((n) => assert.deepStrictEqual(L.board(n, faces), boards[n - 1]));
});

test('every layout is sound: even, no overlaps, stacked on solid ground, mirrored', () => {
  boards.forEach((b, i) => {
    const pos = E.layoutPositions(b.blocks, false);
    const name = `level ${i + 1}`;
    assert.strictEqual(pos.length, b.tiles, name);
    assert.strictEqual(pos.length % 2, 0, `${name} has an even number of tiles`);
    const run = L.RUN[i % L.RUN.length];
    assert.ok(b.tiles >= run.tiles[0] && b.tiles <= run.tiles[1], `${name}: ${b.tiles} tiles`);
    const at = new Set(pos.map((p) => `${p.x},${p.y},${p.z}`));
    pos.forEach((p) => {
      pos.forEach((o) => {
        if (o !== p && o.z === p.z) assert.ok(Math.abs(o.x - p.x) >= 2 || Math.abs(o.y - p.y) >= 2, `${name}: tiles overlap`);
      });
      if (p.z > 0) {
        const below = pos.filter((o) => o.z === p.z - 1);
        for (const [hx, hy] of [[p.x, p.y], [p.x + 1, p.y], [p.x, p.y + 1], [p.x + 1, p.y + 1]]) {
          assert.ok(below.some((o) => hx >= o.x && hx < o.x + 2 && hy >= o.y && hy < o.y + 2), `${name}: a tile floats`);
        }
      }
    });
    const b0 = E.bounds(pos);
    pos.forEach((p) => {
      const mx = b0.minX + b0.maxX - p.x;
      assert.ok(at.has(`${mx},${p.y},${p.z}`), `${name} is mirrored left to right`);
    });
    assert.ok(pos.filter((p) => p.z > 0).length >= b.tiles * 0.2, `${name} has a real stack`);
  });
});

test('every layout deals, and fits a phone with big tiles', () => {
  boards.forEach((b, i) => {
    const tiles = E.deal(b.blocks, b.faces, E.mulberry32(i + 1), false, 1);
    assert.strictEqual(tiles.length, b.tiles);
    const tall = E.chooseOrientation(b.blocks, 358, 625, 1.25, 0.07, 116);
    const w = E.tileWidthFor(E.bounds(E.layoutPositions(b.blocks, tall)), 358, 625, 1.25, 0.07, 116);
    assert.ok(w >= 58, `level ${i + 1} tiles are ${Math.round(w)}px on a 390px phone`);
  });
});

test('the difficulty rises and dips in runs of ten, with hard levels', () => {
  boards.forEach((b, i) => {
    assert.ok(b.difficulty > 0 && b.difficulty < 1);
    assert.strictEqual(b.hard, (i + 1) % 5 === 0, `level ${i + 1}`);
  });
  assert.ok(boards[9].difficulty > boards[4].difficulty, 'the tenth level is the hardest of its run');
  assert.ok(boards[109].difficulty > boards[9].difficulty, 'later runs are a little harder');
  assert.ok(new Set(boards.slice(0, 50).map((b) => JSON.stringify(b.blocks))).size >= 45, 'layouts vary');
  assert.ok(new Set(boards.slice(0, 30).map((b) => b.name)).size === 30, 'thirty names before one repeats');
});

test('picked deals on Late Show boards can be cleared', () => {
  [1, 5, 10, 23, 40].forEach((n) => {
    const b = boards[n - 1];
    const rng = E.mulberry32(n);
    const picked = P.pickDeal(() => E.deal(b.blocks, b.faces, rng, false, b.difficulty > 0.5 ? 1 : 0.5),
      (t) => E.pairFinder(t), b.difficulty, rng, 16, 24).tiles;
    const r = P.solve(E.pairFinder(picked), picked.map((t) => t.present), {
      faces: picked.map((t) => t.face), allFreeSafe: true, doomed: E.doomCheck(picked), score: E.moveScore(picked)
    });
    assert.notStrictEqual(r.solvable, false, `level ${n}`);
  });
});
