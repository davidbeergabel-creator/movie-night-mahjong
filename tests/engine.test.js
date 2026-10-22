'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const { CHAPTERS, FACES } = require('../js/content.js');
const BOARDS = CHAPTERS.filter((ch) => ch.mode === 'classic').flatMap((ch) => ch.boards);

// Plays a board to the end the way a careless player would: always the first pair on offer,
// rescuing whenever no pairs are left. Returns how many rescues it took.
function playOut(tiles, board, transposed, rng) {
  let rescues = 0;
  for (let guard = 0; guard < 500 && E.remaining(tiles) > 0; guard++) {
    const moves = E.availableMatches(tiles);
    if (moves.length === 0) {
      E.rescue(tiles, board.blocks, transposed, rng);
      rescues++;
      continue;
    }
    const [a, b] = moves[Math.floor(rng() * moves.length)];
    tiles[a].present = false;
    tiles[b].present = false;
  }
  return rescues;
}

function key(t) {
  return `${t.x},${t.y},${t.z}`;
}

test('every board layout is well formed', () => {
  BOARDS.forEach((board) => {
    [false, true].forEach((transposed) => {
      const positions = E.layoutPositions(board.blocks, transposed);
      assert.strictEqual(positions.length, board.tiles, board.name);
      assert.strictEqual(positions.length % 2, 0, `${board.name} has an even number of tiles`);
      // No two tiles on the same layer overlap.
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const overlap = a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
          assert.ok(!overlap, `${board.name}: tiles overlap at ${key(a)} and ${key(b)}`);
        }
      }
      // Every raised tile rests on something.
      positions.filter((p) => p.z > 0).forEach((p) => {
        const below = positions.some((q) => q.z === p.z - 1 && Math.abs(q.x - p.x) < 2 && Math.abs(q.y - p.y) < 2);
        assert.ok(below, `${board.name}: tile at ${key(p)} floats`);
      });
    });
    board.faces.forEach((f) => assert.ok(FACES[f], `${board.name} uses unknown face ${f}`));
  });
});

test('every deal pairs up faces and can be cleared in its own removal order', () => {
  BOARDS.forEach((board) => {
    for (let seed = 1; seed <= 150; seed++) {
      const transposed = seed % 2 === 0;
      const tiles = E.deal(board.blocks, board.faces, E.mulberry32(seed), transposed);
      const counts = {};
      tiles.forEach((t) => { counts[t.face] = (counts[t.face] || 0) + 1; });
      Object.entries(counts).forEach(([face, n]) => assert.strictEqual(n % 2, 0, `${board.name}: ${face} appears ${n} times`));
      assert.ok(Object.keys(counts).every((f) => board.faces.includes(f)));
      assert.ok(E.availableMatches(tiles).length > 0, `${board.name} seed ${seed} opens with no moves`);
    }
  });
});

test('a dealt board can always be finished, even when the player picks badly', () => {
  BOARDS.forEach((board) => {
    let totalRescues = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const rng = E.mulberry32(seed * 7919);
      const transposed = seed % 3 === 0;
      const tiles = E.deal(board.blocks, board.faces, rng, transposed);
      totalRescues += playOut(tiles, board, transposed, rng);
      assert.strictEqual(E.remaining(tiles), 0, `${board.name} seed ${seed} was left unfinished`);
    }
    // Rescues should be the exception, not the way the game is played.
    assert.ok(totalRescues / 120 < 1.5, `${board.name} needed ${totalRescues} rescues in 120 random games`);
  });
});

test('rescue keeps the same faces and leaves a move to make', () => {
  const board = BOARDS[5];
  const rng = E.mulberry32(42);
  const tiles = E.deal(board.blocks, board.faces, rng, false);
  // Clear half the board, then rescue.
  for (let i = 0; i < 12; i++) {
    const [a, b] = E.availableMatches(tiles)[0];
    tiles[a].present = false;
    tiles[b].present = false;
  }
  const before = tiles.filter((t) => t.present).map((t) => t.face).sort();
  const how = E.rescue(tiles, board.blocks, false, rng);
  const after = tiles.filter((t) => t.present).map((t) => t.face).sort();
  assert.ok(how === 'reshuffled' || how === 'rearranged');
  assert.deepStrictEqual(after, before);
  assert.ok(E.availableMatches(tiles).length > 0);
});

test('rescue rearranges a stack that no reshuffle could fix', () => {
  const board = BOARDS[0];
  const tiles = E.deal(board.blocks, board.faces, E.mulberry32(3), false);
  // Leave one raised tile and one tile directly underneath it: only the top one is free.
  const top = tiles.find((t) => t.z === 1);
  const under = tiles.find((t) => t.z === 0 && Math.abs(t.x - top.x) < 2 && Math.abs(t.y - top.y) < 2);
  tiles.forEach((t) => { t.present = t === top || t === under; });
  top.face = under.face = 'car';
  assert.strictEqual(E.availableMatches(tiles).length, 0);
  assert.strictEqual(E.rescue(tiles, board.blocks, false, E.mulberry32(9)), 'rearranged');
  assert.strictEqual(E.availableMatches(tiles).length, 1);
  const spots = new Set(tiles.filter((t) => t.present).map(key));
  assert.strictEqual(spots.size, 2, 'the two tiles end up on different spots');
});

test('free tiles follow the open-side rule', () => {
  const blocks = [[0, 0, 4, 1, 0], [1, 0, 1, 1, 1]];
  const tiles = E.deal(blocks.slice(0, 1), ['car'], E.mulberry32(1), false);
  assert.deepStrictEqual(E.freeTileIds(tiles), [0, 3], 'only the two ends of a row are free');
  tiles[0].present = false;
  assert.deepStrictEqual(E.freeTileIds(tiles), [1, 3]);
  // A tile on top blocks both tiles it overlaps, even though their sides are open.
  const stacked = E.layoutPositions(blocks, false).map((p, id) => ({ ...p, id, face: 'car', present: true }));
  assert.deepStrictEqual(E.freeTileIds(stacked), [3, 4], 'the right end and the raised tile');
});
