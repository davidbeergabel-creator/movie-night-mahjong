/* Movie Night Mahjong: how hard a board is, and how to clear it.
 *
 * Works for both kinds of board through a "pairs" function: given which tiles are still on the
 * board (an array of true/false), it lists the pairs that can be taken right now.
 * engine.js and chess.js each provide one (pairFinder).
 */
(function (root) {
  'use strict';

  function count(present) {
    var n = 0;
    for (var i = 0; i < present.length; i++) if (present[i]) n++;
    return n;
  }

  // How often a player who takes any matching pair at random gets stuck (0 to 1).
  function stuckRate(pairs, present, rng, runs) {
    var stuck = 0;
    for (var r = 0; r < runs; r++) {
      var p = present.slice();
      var left = count(p);
      while (left > 0) {
        var options = pairs(p);
        if (!options.length) { stuck++; break; }
        var pick = options[Math.floor(rng() * options.length)];
        p[pick[0]] = p[pick[1]] = false;
        left -= 2;
      }
    }
    return stuck / runs;
  }

  // By default, moves that leave the most pairs to choose from come first: they keep the most doors open.
  function pairsAfter(pairs) {
    return function (p, o) {
      p[o[0]] = p[o[1]] = false;
      var n = pairs(p).length;
      p[o[0]] = p[o[1]] = true;
      return n;
    };
  }

  // A move that can never hurt: the last two copies of a face, or (where taking tiles only ever
  // frees others, as in mahjong) a face whose remaining copies are all free.
  function sureMove(p, options, faces, allFreeSafe) {
    if (!faces) return null;
    var left = {};
    for (var i = 0; i < p.length; i++) if (p[i]) left[faces[i]] = (left[faces[i]] || 0) + 1;
    var free = {};
    var first = {};
    options.forEach(function (o) {
      var f = faces[o[0]];
      if (!first[f]) first[f] = o;
      free[f] = free[f] || {};
      free[f][o[0]] = free[f][o[1]] = true;
    });
    for (var f in first) {
      if (left[f] === 2) return first[f];
      if (allFreeSafe && Object.keys(free[f]).length === left[f]) return first[f];
    }
    return null;
  }

  // Looks for a way to clear the board from here, within opts.budget positions.
  //   opts.faces       each tile's face, so sure moves are taken without searching around them
  //   opts.doomed(p)   true for positions that can never be cleared, so they are dropped at once
  //   opts.score(p, o) how promising a move looks; higher is tried first
  // A search that wanders into a bad corner starts over a few times with the order shaken up,
  // keeping what it learned about dead positions.
  // Returns { solvable: true, move: [a, b] }, { solvable: false } when there is no way,
  // or { solvable: null, move: [a, b] } when it ran out of room before it could tell.
  function solve(pairs, present, opts) {
    opts = opts || {};
    var budget = opts.budget || 4000;
    var restarts = opts.restarts || 4;
    var faces = opts.faces;
    var allFreeSafe = !!opts.allFreeSafe;
    var doomed = opts.doomed || function () { return false; };
    var score = opts.score || pairsAfter(pairs);
    var failed = {};
    var nodes = 0;
    var limit = 0;
    var noise = 0;
    var seed = 12345;
    function shake() {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }

    function key(p) {
      var s = '';
      for (var i = 0; i < p.length; i++) s += p[i] ? '1' : '0';
      return s;
    }

    function order(p, options) {
      var sure = sureMove(p, options, faces, allFreeSafe);
      if (sure) return [sure];
      return options.map(function (o) { return { o: o, v: score(p, o) + noise * shake() }; })
        .sort(function (a, b) { return b.v - a.v; })
        .map(function (x) { return x.o; });
    }

    // true: clearable; false: proven not; null: out of room.
    function clearable(p, left) {
      if (left === 0) return true;
      if (++nodes > limit) return null;
      var k = key(p);
      if (failed[k]) return false;
      var options = pairs(p);
      if (!options.length || doomed(p)) { failed[k] = true; return false; }
      var tries = order(p, options);
      for (var i = 0; i < tries.length; i++) {
        var o = tries[i];
        p[o[0]] = p[o[1]] = false;
        var r = clearable(p, left - 2);
        p[o[0]] = p[o[1]] = true;
        if (r !== false) return r;
      }
      failed[k] = true;
      return false;
    }

    var p = present.slice();
    var left = count(p);
    if (left === 0) return { solvable: true, move: null };
    var options = pairs(p);
    if (!options.length || doomed(p)) return { solvable: false };
    var fallback = null;
    for (var round = 0; round < restarts; round++) {
      noise = round === 0 ? 0 : 3;
      limit = nodes + Math.ceil(budget / restarts);
      var tries = order(p, options);
      if (!fallback) fallback = tries[0];
      var outOfRoom = false;
      for (var i = 0; i < tries.length; i++) {
        var o = tries[i];
        p[o[0]] = p[o[1]] = false;
        var r = clearable(p, left - 2);
        p[o[0]] = p[o[1]] = true;
        if (r === true) return { solvable: true, move: o };
        if (r === null) { outOfRoom = true; break; }
      }
      if (!outOfRoom) return { solvable: false };
    }
    return { solvable: null, move: fallback };
  }

  // Deals up to `tries` boards and keeps the one a random player gets stuck on closest to
  // `target` of the time. makeDeal(i) deals candidate i; pairsFor(tiles) gives its pairs function.
  function pickDeal(makeDeal, pairsFor, target, rng, tries, runs) {
    var best = null;
    var bestRate = 0;
    var bestGap = Infinity;
    for (var i = 0; i < tries; i++) {
      var tiles = makeDeal(i);
      var rate = stuckRate(pairsFor(tiles), tiles.map(function (t) { return t.present; }), rng, runs);
      var gap = Math.abs(rate - target);
      if (gap < bestGap) {
        best = tiles;
        bestRate = rate;
        bestGap = gap;
      }
      if (gap <= 0.04) break;
    }
    return { tiles: best, stuckRate: bestRate };
  }

  var api = { stuckRate: stuckRate, solve: solve, pickDeal: pickDeal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMPuzzle = api;
})(typeof window !== 'undefined' ? window : this);
