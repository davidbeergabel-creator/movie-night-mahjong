/* Movie Night Mahjong: The Late Show, an endless run of levels after the story chapters.
 *
 * Each level is made from its number, so Level 40 is the same board for everyone:
 * a shape for the bottom layer, smaller shapes stacked on top, a difficulty that rises and
 * dips in runs of ten, and tiles drawn from every story chapter.
 *
 * Layouts use the same half-tile units as engine.js. The board is built wide (long side
 * across); the game turns it upright on a phone when that gives bigger tiles.
 */
(function (root) {
  'use strict';

  var E = root.MNMEngine || (typeof require === 'function' ? require('./engine.js') : null);

  // Ten levels make a run: mostly steady, a Hard level halfway, and a harder one to finish.
  var RUN = [
    { difficulty: 0.35, tiles: [30, 44] },
    { difficulty: 0.45, tiles: [34, 48] },
    { difficulty: 0.55, tiles: [38, 52] },
    { difficulty: 0.4, tiles: [36, 50] },
    { difficulty: 0.7, tiles: [44, 60], hard: true },
    { difficulty: 0.45, tiles: [36, 50] },
    { difficulty: 0.55, tiles: [42, 56] },
    { difficulty: 0.6, tiles: [46, 60] },
    { difficulty: 0.5, tiles: [40, 56] },
    { difficulty: 0.85, tiles: [54, 72], hard: true }
  ];

  var NAMES = [
    'After Hours', 'Midnight Matinee', 'Curtain Call', 'Sneak Preview', 'Main Feature',
    'Coming Attractions', 'Box Office', 'Front Row', 'Balcony Seats', 'Gala Premiere',
    'Intermission', 'Projection Booth', 'Neon Nights', 'Starlight', 'Owl Show',
    'Silver Screen', 'Opening Credits', 'Spotlight', 'Velvet Curtain', 'Red Carpet',
    'Second Reel', 'Ticket Stub', 'Marquee Lights', 'Popcorn Refill', 'Sunday Matinee',
    'Usher’s Torch', 'Last Row', 'Moonlight Screening', 'Encore', 'Closing Credits'
  ];

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pick(list, rng) {
    return list[Math.floor(rng() * list.length)];
  }

  // The bottom layer: a shape on an L x S grid of whole tiles, mirrored left to right and top to bottom.
  var SHAPES = {
    full: function () { return true; },
    notched: function (i, j, L, S) { return !((i === 0 || i === L - 1) && (j === 0 || j === S - 1)); },
    diamond: function (i, j, L, S) {
      return Math.abs(i - (L - 1) / 2) / (L / 2) + Math.abs(j - (S - 1) / 2) / (S / 2) <= 1.1;
    },
    hollow: function (i, j, L, S) { return !(i > 1 && i < L - 2 && j > 0 && j < S - 1); },
    split: function (i, j, L) { return L % 2 ? i !== (L - 1) / 2 : i !== L / 2 - 1 && i !== L / 2; },
    hourglass: function (i, j, L, S) {
      var fromEdge = Math.min(j, S - 1 - j);
      var inset = Math.max(0, Math.floor((S - 1) / 2) - fromEdge);
      return i >= inset && i < L - inset;
    },
    cross: function (i, j, L, S) {
      return Math.abs(i - (L - 1) / 2) <= 1 || Math.abs(j - (S - 1) / 2) <= 0.5 || S <= 3;
    },
    bars: function (i, j, L, S) { return S < 4 || j !== Math.floor(S / 2) || i === 0 || i === L - 1; }
  };

  // Which half-tile squares a layer covers, so the next layer only sits on solid ground.
  function covered(tiles) {
    var c = {};
    tiles.forEach(function (t) {
      c[t.x + ',' + t.y] = c[(t.x + 1) + ',' + t.y] = c[t.x + ',' + (t.y + 1)] = c[(t.x + 1) + ',' + (t.y + 1)] = true;
    });
    return c;
  }

  function supported(x, y, ground) {
    return ground[x + ',' + y] && ground[(x + 1) + ',' + y] && ground[x + ',' + (y + 1)] && ground[(x + 1) + ',' + (y + 1)];
  }

  // A layer on top of the one below: a centered block, a pair of mirrored blocks, or a band across.
  // It may sit half a tile over, which keeps it centered. Each layer is clearly smaller than the
  // one under it, so the board reads as a stack rather than a slab.
  function upperLayer(rng, below, z, L, S) {
    var ground = covered(below);
    for (var tries = 0; tries < 8; tries++) {
      var ox = rng() < 0.4 ? 1 : 0;
      var oy = rng() < 0.4 ? 1 : 0;
      var form = pick(['block', 'block', 'twin', 'band'], rng);
      var a = 1 + 2 * Math.floor(rng() * L);
      var b = 1 + 2 * Math.floor(rng() * S);
      var gap = 1 + 2 * Math.floor(rng() * (L / 2));
      var next = [];
      for (var y = oy; y + 2 <= 2 * S; y += 2) {
        for (var x = ox; x + 2 <= 2 * L; x += 2) {
          if (!supported(x, y, ground)) continue;
          var dx = Math.abs(x + 1 - L);
          var dy = Math.abs(y + 1 - S);
          var keep = form === 'block' ? dx <= a && dy <= b
            : form === 'twin' ? dx >= gap && dx <= gap + a && dy <= b
              : dy <= b;
          if (keep) next.push({ x: x, y: y, z: z });
        }
      }
      if (next.length >= 2 && next.length <= below.length * 0.7) return next;
    }
    return null;
  }

  // One try at a layout. Returns its tiles as { x, y, z }.
  function build(rng, L, S, shape, run) {
    var tiles = [];
    for (var j = 0; j < S; j++) {
      for (var i = 0; i < L; i++) {
        if (SHAPES[shape](i, j, L, S)) tiles.push({ x: 2 * i, y: 2 * j, z: 0 });
      }
    }
    var layer = tiles;
    var target = run.tiles[0] + rng() * (run.tiles[1] - run.tiles[0]);
    for (var z = 1; z <= 3 && tiles.length < target; z++) {
      var next = upperLayer(rng, layer, z, L, S);
      if (!next) break;
      tiles = tiles.concat(next);
      layer = next;
    }
    // Shapes are mirrored, so only tiles on the middle line can leave an odd count. Drop a top one.
    if (tiles.length % 2) {
      var spare = null;
      tiles.forEach(function (t) {
        if (t.x + 1 === L && (!spare || t.z > spare.z || (t.z === spare.z && Math.abs(t.y + 1 - S) < Math.abs(spare.y + 1 - S)))) spare = t;
      });
      var top = tiles.some(function (o) { return o.z > spare.z && Math.abs(o.x - spare.x) < 2 && Math.abs(o.y - spare.y) < 2; });
      if (top) return null;
      tiles.splice(tiles.indexOf(spare), 1);
    }
    return tiles;
  }

  // Blocks in the format the engine reads: one 1 x 1 block per tile.
  function toBlocks(tiles) {
    return tiles.map(function (t) { return [t.x, t.y, 1, 1, t.z]; });
  }

  function layout(n) {
    var rng = E.mulberry32(hashString('late-show:' + n));
    var run = RUN[(n - 1) % RUN.length];
    var best = null;
    var bestGap = Infinity;
    for (var attempt = 0; attempt < 80; attempt++) {
      var L = 6 + Math.floor(rng() * 3);
      var S = 3 + Math.floor(rng() * 3);
      if (L * S > run.tiles[1]) continue;
      var shape = pick(Object.keys(SHAPES), rng);
      var tiles = build(rng, L, S, shape, run);
      if (!tiles) continue;
      var count = tiles.length;
      // A fifth of the tiles or more should sit above the ground floor.
      var raised = tiles.filter(function (t) { return t.z > 0; }).length;
      if (raised < count * 0.2) continue;
      var gap = count < run.tiles[0] ? run.tiles[0] - count : count > run.tiles[1] ? count - run.tiles[1] : 0;
      if (gap < bestGap) {
        var blocks = toBlocks(tiles);
        var positions = E.layoutPositions(blocks, false);
        var all = positions.map(function () { return true; });
        if (!E.removalOrder(positions, all, E.mulberry32(n))) continue;
        best = { blocks: blocks, tiles: count, shape: shape };
        bestGap = gap;
        if (gap === 0) break;
      }
    }
    return best;
  }

  // The board for Late Show level n (1, 2, 3...). faces: every tile the story chapters use.
  function board(n, faces) {
    var run = RUN[(n - 1) % RUN.length];
    var shape = layout(n);
    var rng = E.mulberry32(hashString('late-show-faces:' + n));
    var count = Math.min(12, Math.max(8, Math.round(shape.tiles / 5)));
    var mine = E.shuffle(faces.slice(), rng).slice(0, Math.min(count, faces.length));
    return {
      name: NAMES[(n - 1) % NAMES.length],
      late: n,
      // Each pass through the names gets a touch harder, up to a limit.
      difficulty: Math.min(0.92, run.difficulty + Math.min(0.06, Math.floor((n - 1) / RUN.length) * 0.01)),
      hard: !!run.hard,
      blocks: shape.blocks,
      tiles: shape.tiles,
      shape: shape.shape,
      faces: mine,
      cardFace: mine[0]
    };
  }

  var api = { board: board, RUN: RUN, NAMES: NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMEndless = api;
})(typeof window !== 'undefined' ? window : this);
