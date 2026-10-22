'use strict';
const test = require('node:test');
const assert = require('node:assert');
const CH = require('../js/chess.js');
const { CHAPTERS, FACES, PIECE_RULES } = require('../js/content.js');

const chess = CHAPTERS.find((c) => c.mode === 'chess');

function tilesOn(grid, faces) {
  const board = { grid };
  return { board, tiles: CH.cells(board).map((c, id) => ({ id, x: c.x, y: c.y, z: 0, face: faces[id], present: true })) };
}

test('each piece moves the way chess says', () => {
  // A row: rook . . rook  -> the rooks see each other across the empty squares.
  let { board, tiles } = tilesOn(['#..#'], ['rook', 'rook']);
  assert.ok(CH.canMatch(tiles, 0, 1, board));
  // A piece in between blocks a rook.
  ({ board, tiles } = tilesOn(['###'], ['rook', 'pawn', 'rook']));
  assert.ok(!CH.canMatch(tiles, 0, 2, board));
  // Bishops need a clear diagonal.
  ({ board, tiles } = tilesOn(['#..', '...', '..#'], ['bishop', 'bishop']));
  assert.ok(CH.canMatch(tiles, 0, 1, board));
  ({ board, tiles } = tilesOn(['#.#'], ['bishop', 'bishop']));
  assert.ok(!CH.canMatch(tiles, 0, 1, board), 'bishops on one row cannot reach each other');
  // Knights jump in an L, over anything.
  ({ board, tiles } = tilesOn(['##.', '###'], ['knight', 'pawn', 'rook', 'pawn', 'knight']));
  assert.ok(CH.canMatch(tiles, 0, 4, board), 'knight jumps two across and one down');
  ({ board, tiles } = tilesOn(['##'], ['knight', 'knight']));
  assert.ok(!CH.canMatch(tiles, 0, 1, board), 'knights side by side cannot capture each other');
  // Kings step one square in any direction; pawns only diagonally.
  ({ board, tiles } = tilesOn(['##', '##'], ['king', 'pawn', 'pawn', 'king']));
  assert.ok(CH.canMatch(tiles, 0, 3, board), 'kings corner to corner');
  assert.ok(CH.canMatch(tiles, 1, 2, board), 'pawns corner to corner');
  ({ board, tiles } = tilesOn(['##'], ['pawn', 'pawn']));
  assert.ok(!CH.canMatch(tiles, 0, 1, board), 'pawns side by side cannot capture');
  // Different pieces never match.
  ({ board, tiles } = tilesOn(['##'], ['rook', 'queen']));
  assert.ok(!CH.canMatch(tiles, 0, 1, board));
});

test('Chess Night boards are set up properly', () => {
  assert.ok(chess, 'there is a chess chapter');
  chess.boards.forEach((b) => {
    assert.strictEqual(b.tiles % 2, 0, `${b.name} has an even number of pieces`);
    assert.ok(b.grid.every((row) => row.length === b.grid[0].length), `${b.name} grid is a rectangle`);
    b.pieces.forEach((p) => {
      assert.ok(CH.MOVES[p] && FACES[p] && PIECE_RULES[p], `${b.name}: ${p} has moves, a name and a rule`);
    });
    b.newPieces.forEach((p) => assert.ok(b.pieces.includes(p)));
    assert.ok(b.pieces.includes('rook'), 'every board has rooks, which rescue relies on');
  });
});

test('every chess deal can be cleared, even when the player picks badly', () => {
  chess.boards.forEach((board) => {
    let rescues = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = CH.mulberry32(seed * 104729);
      const tiles = CH.deal(board, rng);
      assert.ok(tiles.every((t) => board.pieces.includes(t.face)));
      const counts = {};
      tiles.forEach((t) => { counts[t.face] = (counts[t.face] || 0) + 1; });
      Object.values(counts).forEach((n) => assert.strictEqual(n % 2, 0));
      assert.ok(CH.availableMatches(tiles, board).length > 0, `${board.name} seed ${seed} opens with no moves`);
      for (let guard = 0; guard < 300 && CH.remaining(tiles) > 0; guard++) {
        const moves = CH.availableMatches(tiles, board);
        if (!moves.length) {
          CH.rescue(tiles, board, rng);
          rescues++;
          continue;
        }
        const [a, b] = moves[Math.floor(rng() * moves.length)];
        tiles[a].present = false;
        tiles[b].present = false;
      }
      assert.strictEqual(CH.remaining(tiles), 0, `${board.name} seed ${seed} was left unfinished`);
    }
    assert.ok(rescues / 60 < 2, `${board.name} needed ${rescues} rescues in 60 random games`);
  });
});

test('each board leans on the piece it introduces', () => {
  chess.boards.filter((b) => b.newPieces.length && b.pieces.length > 1).forEach((board) => {
    let fresh = 0;
    let all = 0;
    for (let seed = 1; seed <= 40; seed++) {
      CH.deal(board, CH.mulberry32(seed)).forEach((t) => {
        all++;
        if (board.newPieces.includes(t.face)) fresh++;
      });
    }
    const share = fresh / all;
    const fair = board.newPieces.length / board.pieces.length;
    assert.ok(share > fair, `${board.name}: new pieces are ${(share * 100).toFixed(0)}% of the board`);
  });
});
