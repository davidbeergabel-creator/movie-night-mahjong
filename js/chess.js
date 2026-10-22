/* Movie Night Mahjong: Chess Night rules.
 *
 * The board is a flat grid of squares. Every tile is a chess piece, and two matching pieces
 * can be cleared when one could capture the other with its chess move: rooks, bishops and
 * queens slide until something blocks them, knights jump, kings and pawns step one square.
 * Tiles use the same shape as the classic game: x is the column, y the row, z is always 0.
 * Like the classic deal, every board is built backwards from a removal order, so it can be cleared.
 */
(function (root) {
  'use strict';

  var STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  var MOVES = {
    rook: { slide: STRAIGHT },
    bishop: { slide: DIAGONAL },
    queen: { slide: STRAIGHT.concat(DIAGONAL) },
    king: { step: STRAIGHT.concat(DIAGONAL) },
    knight: { step: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] },
    // A pawn captures one square diagonally. Either pawn may do the capturing, so any
    // two pawns touching corner to corner can match.
    pawn: { step: DIAGONAL }
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A board's grid is a list of strings: '#' is a square with a piece on it, '.' an empty square.
  function cells(board) {
    var out = [];
    board.grid.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) if (row[x] === '#') out.push({ x: x, y: y });
    });
    return out;
  }

  function size(board) {
    return { cols: board.grid[0].length, rows: board.grid.length };
  }

  function occupancy(tiles) {
    var occ = {};
    tiles.forEach(function (t) { if (t.present) occ[t.x + ',' + t.y] = t.id; });
    return occ;
  }

  // Every square a piece of the given kind at tile `id` could reach: { x, y, id } where id is the
  // piece standing there (the end of a slide) or null for an empty square.
  function reachAs(tiles, id, kind, board, occ) {
    var t = tiles[id];
    var g = size(board);
    var move = MOVES[kind];
    occ = occ || occupancy(tiles);
    var out = [];
    function inside(x, y) { return x >= 0 && y >= 0 && x < g.cols && y < g.rows; }
    if (move.slide) {
      move.slide.forEach(function (d) {
        var x = t.x + d[0];
        var y = t.y + d[1];
        while (inside(x, y)) {
          var other = occ[x + ',' + y];
          out.push({ x: x, y: y, id: other === undefined ? null : other });
          if (other !== undefined) break;
          x += d[0];
          y += d[1];
        }
      });
    } else {
      move.step.forEach(function (d) {
        var x = t.x + d[0];
        var y = t.y + d[1];
        if (!inside(x, y)) return;
        var other = occ[x + ',' + y];
        out.push({ x: x, y: y, id: other === undefined ? null : other });
      });
    }
    return out;
  }

  function reach(tiles, id, board) {
    return reachAs(tiles, id, tiles[id].face, board);
  }

  function canMatch(tiles, a, b, board) {
    if (a === b || !tiles[a].present || !tiles[b].present || tiles[a].face !== tiles[b].face) return false;
    return reach(tiles, a, board).some(function (s) { return s.id === b; });
  }

  function availableMatches(tiles, board) {
    var occ = occupancy(tiles);
    var out = [];
    tiles.forEach(function (t) {
      if (!t.present) return;
      reachAs(tiles, t.id, t.face, board, occ).forEach(function (s) {
        if (s.id !== null && s.id > t.id && tiles[s.id].face === t.face) out.push([t.id, s.id]);
      });
    });
    return out;
  }

  function remaining(tiles) {
    var n = 0;
    tiles.forEach(function (t) { if (t.present) n++; });
    return n;
  }

  // Newly met pieces show up more often; the queen, who reaches almost anything, less often.
  function weightOf(kind, board, counts) {
    var w = board.newPieces && board.newPieces.indexOf(kind) >= 0 ? 3 : kind === 'queen' ? 0.5 : 1;
    return w / (1 + (counts[kind] || 0) * 0.35);
  }

  // Gives the present tiles new pieces so that they can all be cleared, by removing pairs a
  // piece could capture until none are left. Returns false if no full removal turned up.
  function assign(tiles, board, rng) {
    var ids = tiles.filter(function (t) { return t.present; }).map(function (t) { return t.id; });
    for (var attempt = 0; attempt < 300; attempt++) {
      var work = tiles.map(function (t) { return { id: t.id, x: t.x, y: t.y, face: null, present: t.present }; });
      var counts = {};
      var plan = [];
      var left = ids.length;
      while (left > 0) {
        var occ = occupancy(work);
        var options = [];
        var total = 0;
        work.forEach(function (t) {
          if (!t.present) return;
          board.pieces.forEach(function (kind) {
            reachAs(work, t.id, kind, board, occ).forEach(function (s) {
              if (s.id === null || s.id < t.id) return;
              var w = weightOf(kind, board, counts);
              options.push({ a: t.id, b: s.id, kind: kind, w: w });
              total += w;
            });
          });
        });
        if (!options.length) break;
        var r = rng() * total;
        var pick = options[options.length - 1];
        for (var i = 0; i < options.length; i++) {
          r -= options[i].w;
          if (r <= 0) { pick = options[i]; break; }
        }
        work[pick.a].present = false;
        work[pick.b].present = false;
        counts[pick.kind] = (counts[pick.kind] || 0) + 1;
        plan.push(pick);
        left -= 2;
      }
      if (left === 0) {
        plan.forEach(function (p) {
          tiles[p.a].face = p.kind;
          tiles[p.b].face = p.kind;
        });
        return true;
      }
    }
    return false;
  }

  function deal(board, rng) {
    var tiles = cells(board).map(function (c, id) {
      return { id: id, x: c.x, y: c.y, z: 0, face: null, present: true };
    });
    if (!assign(tiles, board, rng)) throw new Error('This chess board cannot be dealt');
    return tiles;
  }

  // Makes a stuck board playable again: new pieces on the same squares, or, if that can't work,
  // the remaining pieces move to the board's first squares, side by side, where rooks can always pair.
  function rescue(tiles, board, rng) {
    if (assign(tiles, board, rng)) return 'reshuffled';
    var spots = cells(board);
    var movers = tiles.filter(function (t) { return t.present; });
    movers.forEach(function (t, i) {
      t.x = spots[i].x;
      t.y = spots[i].y;
    });
    assign(tiles, board, rng);
    return 'rearranged';
  }

  var api = {
    MOVES: MOVES,
    mulberry32: mulberry32,
    cells: cells,
    size: size,
    reach: reach,
    reachAs: reachAs,
    canMatch: canMatch,
    availableMatches: availableMatches,
    remaining: remaining,
    deal: deal,
    rescue: rescue
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMChess = api;
})(typeof window !== 'undefined' ? window : this);
