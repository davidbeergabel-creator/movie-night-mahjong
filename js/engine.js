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
  // `trap` (0 to 1) is how often a pair takes the same face as a pair lying on top of it. That sets
  // the classic trap: with three copies free, taking the wrong two buries the fourth under its twin.
  function deal(blocks, faceIds, rng, transposed, trap) {
    var positions = layoutPositions(blocks, transposed);
    var pairs = removalOrder(positions, allPresent(positions.length), rng);
    if (!pairs) throw new Error('This layout cannot be dealt');
    var nb = neighbors(positions);
    // Each face gets a fair share of the pairs.
    var quota = {};
    shuffle(faceIds.slice(), rng).forEach(function (f, i) {
      quota[f] = Math.floor(pairs.length / faceIds.length) + (i < pairs.length % faceIds.length ? 1 : 0);
    });
    var faceOf = new Array(positions.length);
    pairs.forEach(function (pair) {
      var choice = null;
      if (trap && rng() < trap) {
        // Tiles on top of this pair were taken earlier in the solution, so their faces are set.
        var above = [];
        pair.forEach(function (t) {
          nb[t].above.forEach(function (o) { if (faceOf[o] && quota[faceOf[o]] > 0) above.push(faceOf[o]); });
        });
        if (above.length) choice = above[Math.floor(rng() * above.length)];
      }
      if (!choice) {
        var open = Object.keys(quota).filter(function (f) { return quota[f] > 0; });
        choice = open[Math.floor(rng() * open.length)];
      }
      quota[choice]--;
      faceOf[pair[0]] = faceOf[pair[1]] = choice;
    });
    return positions.map(function (p, id) {
      return { id: id, x: p.x, y: p.y, z: p.z, face: faceOf[id], present: true };
    });
  }

  // Lists the pairs on offer for any set of present tiles, fast enough to play thousands of
  // practice games. Positions and faces are read once, as they are now.
  function pairFinder(tiles) {
    var nb = neighbors(tiles);
    var faces = tiles.map(function (t) { return t.face; });
    return function (present) {
      var byFace = {};
      for (var i = 0; i < present.length; i++) {
        if (present[i] && isFreeAt(i, present, nb)) (byFace[faces[i]] = byFace[faces[i]] || []).push(i);
      }
      var out = [];
      Object.keys(byFace).forEach(function (f) {
        var ids = byFace[f];
        for (var a = 0; a < ids.length; a++) {
          for (var b = a + 1; b < ids.length; b++) out.push([ids[a], ids[b]]);
        }
      });
      return out;
    };
  }

  // Spots a board that can no longer be cleared, whatever happens next: a tile resting on top of
  // every other remaining copy of itself can never be matched.
  function doomCheck(tiles) {
    var nb = neighbors(tiles);
    var faces = tiles.map(function (t) { return t.face; });
    var under = tiles.map(function () { return {}; });
    nb.forEach(function (n, u) { n.above.forEach(function (t) { under[t][u] = true; }); });
    return function (present) {
      var byFace = {};
      for (var i = 0; i < present.length; i++) if (present[i]) (byFace[faces[i]] = byFace[faces[i]] || []).push(i);
      for (var f in byFace) {
        var ids = byFace[f];
        for (var a = 0; a < ids.length; a++) {
          var buried = true;
          for (var b = 0; b < ids.length; b++) {
            if (a !== b && !under[ids[a]][ids[b]]) { buried = false; break; }
          }
          if (buried) return true;
        }
      }
      return false;
    };
  }

  // How promising a move looks to the solver: tiles that cover many others, and high ones, first.
  function moveScore(tiles) {
    var covers = tiles.map(function () { return 0; });
    neighbors(tiles).forEach(function (n) { n.above.forEach(function (t) { covers[t]++; }); });
    return function (p, o) {
      return covers[o[0]] + covers[o[1]] + (tiles[o[0]].z + tiles[o[1]].z) * 0.5;
    };
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
    pairFinder: pairFinder,
    doomCheck: doomCheck,
    moveScore: moveScore,
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
