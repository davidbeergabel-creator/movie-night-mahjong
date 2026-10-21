/* Movie Night Mahjong: board rules, dealing and rescue.
 *
 * Coordinates are in half-tile units: a tile at (x, y, z) covers x..x+2 and y..y+2 on layer z.
 * A tile is free when no tile on a higher layer overlaps it and its left or right side is open.
 * Every deal is built backwards from a removal order, so every new board can be cleared.
 * If the player reaches a board with no pairs left, rescue() reshuffles it into a solvable one.
 */
(function (root) {
  'use strict';

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

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // A layout is a list of blocks [x, y, cols, rows, z]. Transposing swaps x and y so a wide
  // board can stand upright on a phone; the free-side rule always uses the on-screen left and right.
  function layoutPositions(blocks, transposed) {
    var out = [];
    blocks.forEach(function (b) {
      for (var j = 0; j < b[3]; j++) {
        for (var i = 0; i < b[2]; i++) {
          var px = b[0] + 2 * i;
          var py = b[1] + 2 * j;
          out.push(transposed ? { x: py, y: px, z: b[4] } : { x: px, y: py, z: b[4] });
        }
      }
    });
    out.sort(function (a, b) { return a.z - b.z || a.y - b.y || a.x - b.x; });
    return out;
  }

  function bounds(positions) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: 0 };
    positions.forEach(function (p) {
      b.minX = Math.min(b.minX, p.x);
      b.minY = Math.min(b.minY, p.y);
      b.maxX = Math.max(b.maxX, p.x);
      b.maxY = Math.max(b.maxY, p.y);
      b.maxZ = Math.max(b.maxZ, p.z);
    });
    b.cols = (b.maxX - b.minX + 2) / 2;
    b.rows = (b.maxY - b.minY + 2) / 2;
    return b;
  }

  // For each position: which positions sit on top of it, and which touch its left and right sides.
  function neighbors(positions) {
    return positions.map(function (a, ai) {
      var n = { above: [], left: [], right: [] };
      positions.forEach(function (b, bi) {
        if (bi === ai) return;
        var overlapY = Math.abs(b.y - a.y) < 2;
        if (!overlapY) return;
        if (b.z > a.z && Math.abs(b.x - a.x) < 2) n.above.push(bi);
        else if (b.z === a.z && b.x === a.x - 2) n.left.push(bi);
        else if (b.z === a.z && b.x === a.x + 2) n.right.push(bi);
      });
      return n;
    });
  }

  function anyPresent(list, present) {
    for (var i = 0; i < list.length; i++) if (present[list[i]]) return true;
    return false;
  }

  function isFreeAt(i, present, nb) {
    var n = nb[i];
    if (anyPresent(n.above, present)) return false;
    return !anyPresent(n.left, present) || !anyPresent(n.right, present);
  }

  function freeIndexes(present, nb) {
    var out = [];
    for (var i = 0; i < present.length; i++) if (present[i] && isFreeAt(i, present, nb)) out.push(i);
    return out;
  }

  // Removes random pairs of free tiles until none are left. The pairs, in order, are a solution.
  // Returns null if no full removal turned up (some shapes, like one tile on top of another, have none).
  function removalOrder(positions, present, rng) {
    var nb = neighbors(positions);
    var total = 0;
    present.forEach(function (p) { if (p) total++; });
    if (total % 2) return null;
    for (var attempt = 0; attempt < 400; attempt++) {
      var left = present.slice();
      var count = total;
      var pairs = [];
      while (count > 0) {
        var free = freeIndexes(left, nb);
        if (free.length < 2) break;
        // Clearing upper layers first strands fewer tiles, so lean towards the highest free tiles.
        shuffle(free, rng);
        free.sort(function (a, b) { return positions[b].z - positions[a].z; });
        var pickFrom = Math.max(2, Math.ceil(free.length * 0.6));
        var a = free[Math.floor(rng() * pickFrom)];
        var b;
        do { b = free[Math.floor(rng() * free.length)]; } while (b === a);
        left[a] = left[b] = false;
        count -= 2;
        pairs.push([a, b]);
      }
      if (count === 0) return pairs;
    }
    return null;
  }

  function allPresent(n) {
    var out = new Array(n);
    for (var i = 0; i < n; i++) out[i] = true;
    return out;
  }

  // Deals a new board: every tile gets a face, matching faces come in pairs, and it can be cleared.
  function deal(blocks, faceIds, rng, transposed) {
    var positions = layoutPositions(blocks, transposed);
    var pairs = removalOrder(positions, allPresent(positions.length), rng);
    if (!pairs) throw new Error('This layout cannot be dealt');
    var pairFaces = [];
    for (var i = 0; i < pairs.length; i++) pairFaces.push(faceIds[i % faceIds.length]);
    shuffle(pairFaces, rng);
    var tiles = positions.map(function (p, id) {
      return { id: id, x: p.x, y: p.y, z: p.z, face: null, present: true };
    });
    pairs.forEach(function (pair, k) {
      tiles[pair[0]].face = pairFaces[k];
      tiles[pair[1]].face = pairFaces[k];
    });
    return tiles;
  }

  function presentList(tiles) {
    return tiles.map(function (t) { return t.present; });
  }

  function freeTileIds(tiles) {
    return freeIndexes(presentList(tiles), neighbors(tiles));
  }

  function isFree(tiles, id) {
    return tiles[id].present && isFreeAt(id, presentList(tiles), neighbors(tiles));
  }

  // All pairs of free tiles with the same face, highest layers first.
  function availableMatches(tiles) {
    var byFace = {};
    freeTileIds(tiles).forEach(function (id) {
      (byFace[tiles[id].face] = byFace[tiles[id].face] || []).push(id);
    });
    var out = [];
    Object.keys(byFace).forEach(function (face) {
      var ids = byFace[face];
      for (var i = 0; i < ids.length; i++) {
        for (var j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]]);
      }
    });
    out.sort(function (p, q) {
      return (tiles[q[0]].z + tiles[q[1]].z) - (tiles[p[0]].z + tiles[p[1]].z);
    });
    return out;
  }

  function remaining(tiles) {
    var n = 0;
    tiles.forEach(function (t) { if (t.present) n++; });
    return n;
  }

  function facePairsOf(tiles) {
    var counts = {};
    tiles.forEach(function (t) { if (t.present) counts[t.face] = (counts[t.face] || 0) + 1; });
    var out = [];
    Object.keys(counts).forEach(function (f) {
      for (var k = 0; k < counts[f] / 2; k++) out.push(f);
    });
    return out;
  }

  // Makes a stuck board playable again and returns how ('reshuffled' or 'rearranged').
  // First it tries new faces on the same spots. If the spots themselves can't be cleared
  // (say, one tile left on top of another), it moves the remaining tiles to the heart of the layout.
  function rescue(tiles, blocks, transposed, rng) {
    var facePairs = shuffle(facePairsOf(tiles), rng);
    var pairs = removalOrder(tiles, presentList(tiles), rng);
    if (pairs) {
      pairs.forEach(function (pair, k) {
        tiles[pair[0]].face = facePairs[k];
        tiles[pair[1]].face = facePairs[k];
      });
      return 'reshuffled';
    }
    // The last pairs of a full removal order are spots that can always be cleared on their own.
    var positions = layoutPositions(blocks, transposed);
    var full = removalOrder(positions, allPresent(positions.length), rng);
    var tail = full.slice(full.length - facePairs.length);
    var movers = tiles.filter(function (t) { return t.present; });
    var m = 0;
    tail.forEach(function (pair, k) {
      pair.forEach(function (posIndex) {
        var t = movers[m++];
        var p = positions[posIndex];
        t.x = p.x;
        t.y = p.y;
        t.z = p.z;
        t.face = facePairs[k];
      });
    });
    return 'rearranged';
  }

  // Picks the orientation that gives the biggest tiles in the space available.
  function tileWidthFor(b, width, height, aspect, layerShift, maxWidth) {
    var w = width / (b.cols + b.maxZ * layerShift + 0.12);
    var h = height / (aspect * (b.rows + b.maxZ * layerShift + 0.12));
    return Math.min(w, h, maxWidth);
  }

  function chooseOrientation(blocks, width, height, aspect, layerShift, maxWidth) {
    var wide = tileWidthFor(bounds(layoutPositions(blocks, false)), width, height, aspect, layerShift, maxWidth);
    var tall = tileWidthFor(bounds(layoutPositions(blocks, true)), width, height, aspect, layerShift, maxWidth);
    return tall > wide * 1.12;
  }

  var api = {
    mulberry32: mulberry32,
    shuffle: shuffle,
    layoutPositions: layoutPositions,
    bounds: bounds,
    neighbors: neighbors,
    removalOrder: removalOrder,
    deal: deal,
    isFree: isFree,
    freeTileIds: freeTileIds,
    availableMatches: availableMatches,
    remaining: remaining,
    rescue: rescue,
    tileWidthFor: tileWidthFor,
    chooseOrientation: chooseOrientation
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMEngine = api;
})(typeof window !== 'undefined' ? window : this);
