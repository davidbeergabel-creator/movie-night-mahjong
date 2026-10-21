/* Movie Night Mahjong: screens, board drawing and play. */
(function () {
  'use strict';

  var E = window.MNMEngine;
  var ART = window.MNMArt;
  var C = window.MNMContent;
  var CHAPTER = C.CHAPTER;
  var BOARDS = CHAPTER.boards;

  var params = new URLSearchParams(location.search);
  var TEST = params.has('test');
  var STORE_KEY = 'movie-night-mahjong.v1';
  var TILE_ASPECT = 1.25;
  var LAYER_SHIFT = 0.07;
  var MAX_TILE = 116;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Playtest log, kept in the page only. Nothing is sent anywhere.
  var events = (window.__events = []);
  function track(name, data) {
    var e = { event: name, at: new Date().toISOString() };
    if (data) Object.keys(data).forEach(function (k) { e[k] = data[k]; });
    events.push(e);
  }

  // ---------- Saved progress ----------

  function defaultSave() {
    return {
      settings: { textSize: 'standard', dimBlocked: true, showMatch: false, sound: true },
      cleared: BOARDS.map(function () { return false; }),
      cards: BOARDS.map(function () { return null; }),
      seenIntro: BOARDS.map(function () { return false; }),
      seenHowTo: false,
      current: null
    };
  }

  function normalize(data) {
    var s = defaultSave();
    if (!data || typeof data !== 'object') return s;
    if (data.settings) Object.keys(s.settings).forEach(function (k) {
      if (typeof data.settings[k] === typeof s.settings[k]) s.settings[k] = data.settings[k];
    });
    ['cleared', 'cards', 'seenIntro'].forEach(function (k) {
      if (Array.isArray(data[k])) s[k] = s[k].map(function (v, i) { return data[k][i] === undefined ? v : data[k][i]; });
    });
    s.seenHowTo = !!data.seenHowTo;
    if (data.current && BOARDS[data.current.level] && Array.isArray(data.current.tiles)) s.current = data.current;
    return s;
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? normalize(JSON.parse(raw)) : defaultSave();
    } catch (e) {
      return defaultSave();
    }
  }

  var save = defaultSave();
  var game = null;
  var screen = 'hub';

  function persist() {
    if (game) save.current = snapshotGame();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) { /* private window: play on without saving */ }
  }

  function snapshotTiles(tiles) {
    return tiles.map(function (t) { return [t.x, t.y, t.z, t.face, t.present ? 1 : 0]; });
  }

  function restoreTiles(snap) {
    return snap.map(function (s, id) { return { id: id, x: s[0], y: s[1], z: s[2], face: s[3], present: !!s[4] }; });
  }

  function snapshotGame() {
    return {
      level: game.level,
      transposed: game.transposed,
      seed: game.seed,
      tiles: snapshotTiles(game.tiles),
      history: game.history,
      moves: game.moves,
      hints: game.hints,
      rescues: game.rescues
    };
  }

  // ---------- Sound ----------

  var audio = null;
  var TUNES = {
    select: [[523, 0, 0.07]],
    match: [[659, 0, 0.12], [880, 0.09, 0.18]],
    blocked: [[196, 0, 0.12]],
    hint: [[784, 0, 0.1], [988, 0.12, 0.14]],
    undo: [[440, 0, 0.09]],
    win: [[523, 0, 0.2], [659, 0.16, 0.2], [784, 0.32, 0.2], [1047, 0.48, 0.45]]
  };

  function sound(kind) {
    if (!save.settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = audio.currentTime + 0.01;
      TUNES[kind].forEach(function (n) {
        var osc = audio.createOscillator();
        var gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.value = n[0];
        gain.gain.setValueAtTime(0.0001, t0 + n[1]);
        gain.gain.exponentialRampToValueAtTime(0.14, t0 + n[1] + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(t0 + n[1]);
        osc.stop(t0 + n[1] + n[2] + 0.03);
      });
    } catch (e) { /* no sound available */ }
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- Toast ----------

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4000);
  }

  // ---------- Screens ----------

  function showScreen(name) {
    screen = name;
    ['hub', 'game', 'album'].forEach(function (s) { $(s).hidden = s !== name; });
    if (name === 'hub') renderHub();
    if (name === 'album') renderAlbum();
  }

  function isUnlocked(i) {
    return TEST || i === 0 || save.cleared[i] || save.cleared[i - 1];
  }

  function nextBoard() {
    for (var i = 0; i < BOARDS.length; i++) if (!save.cleared[i]) return i;
    return null;
  }

  function cardsCollected() {
    return save.cards.filter(Boolean).length;
  }

  function renderHub() {
    var next = nextBoard();
    var cta = $('cta');
    var current = save.current;
    $('chapter-done').hidden = next !== null;
    $('next-chapter').textContent = CHAPTER.next;
    if (current) {
      cta.textContent = 'Resume Board ' + (current.level + 1) + ': ' + BOARDS[current.level].name;
      cta.dataset.action = 'board:' + current.level;
    } else if (next === null) {
      cta.textContent = 'See your Movie Night album';
      cta.dataset.action = 'album';
    } else if (next === 0) {
      cta.textContent = 'Start the show';
      cta.dataset.action = 'board:0';
    } else {
      cta.textContent = 'Play Board ' + (next + 1) + ': ' + BOARDS[next].name;
      cta.dataset.action = 'board:' + next;
    }

    $('program').innerHTML = BOARDS.map(function (b, i) {
      var status;
      if (current && current.level === i) status = '<span class="ticket-status is-progress">In progress</span>';
      else if (save.cleared[i]) status = '<span class="ticket-status is-cleared">' + ART.icon('star') + 'Cleared</span>';
      else if (i === next) status = '<span class="ticket-status is-next">Up next</span>';
      else if (!isUnlocked(i)) status = '<span class="ticket-status is-locked">' + ART.icon('lock') + 'Locked</span>';
      else status = '';
      var label = 'Board ' + (i + 1) + ', ' + b.name + ', ' + b.tiles + ' tiles' + (isUnlocked(i) ? '' : ', locked');
      return '<li><button class="ticket" type="button" data-board="' + i + '"' + (isUnlocked(i) ? '' : ' disabled') +
        ' aria-label="' + esc(label) + '">' +
        '<span class="ticket-stub" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="ticket-body"><span class="ticket-name">' + esc(b.name) + '</span>' +
        '<span class="ticket-meta">' + b.tiles + ' tiles</span></span>' + status + '</button></li>';
    }).join('');

    $('album-count').textContent = cardsCollected() + ' of ' + BOARDS.length;
  }

  function cardArt(i, empty) {
    var b = BOARDS[i];
    if (empty) {
      return '<div class="card-art card-empty"><span class="empty-mark" aria-hidden="true">?</span></div>';
    }
    return '<div class="card-art card-' + b.cardColor + '"><div class="card-tile">' + ART.face(b.cardFace) + '</div></div>';
  }

  function renderAlbum() {
    $('album-grid').innerHTML = BOARDS.map(function (b, i) {
      var card = save.cards[i];
      if (!card) {
        return '<button class="album-card" type="button" disabled>' + cardArt(i, true) +
          '<h3>' + esc(b.name) + '</h3><p>Clear Board ' + (i + 1) + ' to collect this card.</p></button>';
      }
      return '<button class="album-card" type="button" data-card="' + i + '">' + cardArt(i) +
        '<h3>' + esc(b.name) + '</h3><p>' + esc(b.trivia.q) + '</p>' +
        '<p class="answer-line">' + esc(b.trivia.options[b.trivia.answer]) + '</p></button>';
    }).join('');
  }

  // ---------- Sheets ----------

  var sheetReturnFocus = null;
  var sheetOnClose = null;
  var sheetLocked = false;

  function openSheet(html, opts) {
    opts = opts || {};
    sheetReturnFocus = document.activeElement;
    sheetOnClose = opts.onClose || null;
    sheetLocked = !!opts.locked;
    var sheet = $('sheet');
    sheet.className = 'sheet' + (opts.celebrate ? ' celebrate' : '');
    sheet.innerHTML = html;
    $('overlay').hidden = false;
    sheet.scrollTop = 0;
    var first = sheet.querySelector('[data-autofocus]') || sheet.querySelector('button, input');
    if (first) first.focus({ preventScroll: true });
  }

  function closeSheet() {
    if ($('overlay').hidden) return;
    $('overlay').hidden = true;
    $('sheet').innerHTML = '';
    var after = sheetOnClose;
    sheetOnClose = null;
    sheetLocked = false;
    if (after) after();
    else if (sheetReturnFocus && document.body.contains(sheetReturnFocus)) sheetReturnFocus.focus({ preventScroll: true });
  }

  function miniTile(face, extra) {
    return '<span class="mini ' + (extra || '') + '">' + ART.face(face) + '</span>';
  }

  function showHowTo(thenPlay) {
    openSheet(
      '<h2 id="sheet-title">How to play</h2>' +
      '<ul class="steps">' +
      '<li><div class="step-art">' + miniTile('popcorn') + miniTile('popcorn') + '</div>' +
      '<p><strong>Find two matching tiles.</strong> Tap one, then tap its twin. The pair leaves the board.</p></li>' +
      '<li><div class="step-art">' + miniTile('car') + miniTile('soda', 'dim') + miniTile('ticket') + '</div>' +
      '<p><strong>Pick tiles that are free.</strong> A tile is free when nothing sits on top of it and its left or right side is open. Tiles you can’t pick yet look darker.</p></li>' +
      '<li><div class="step-art"><span class="stack">' + miniTile('star', 'dim') + miniTile('moon') + '</span></div>' +
      '<p><strong>Clear the top first.</strong> A tile on top hides the tiles under it until you match it.</p></li>' +
      '<li><div class="step-art">' + ART.icon('hint') + '</div>' +
      '<p><strong>No timer, no rush.</strong> Use Hint and Undo as often as you like. If no pairs are left, the tiles reshuffle for you.</p></li>' +
      '</ul>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close data-autofocus>' +
      (thenPlay ? 'Let’s play' : 'Got it') + '</button></div>',
      {
        onClose: function () {
          save.seenHowTo = true;
          persist();
          if (thenPlay) maybeShowIntro();
        }
      }
    );
  }

  function newFaces(level) {
    if (level === 0) return [];
    var before = BOARDS[level - 1].faces;
    return BOARDS[level].faces.filter(function (f) { return before.indexOf(f) < 0; });
  }

  function maybeShowIntro() {
    if (!game) return;
    var level = game.level;
    var fresh = newFaces(level);
    if (save.seenIntro[level] || !fresh.length) return;
    openSheet(
      '<p class="eyebrow">Board ' + (level + 1) + ' · ' + esc(BOARDS[level].name) + '</p>' +
      '<h2 id="sheet-title">New tiles tonight</h2>' +
      '<div class="new-tiles">' + fresh.map(function (f) {
        return '<figure>' + miniTile(f, 'big') + '<figcaption>' + esc(C.FACES[f]) + '</figcaption></figure>';
      }).join('') + '</div>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close data-autofocus>Let’s play</button></div>',
      {
        onClose: function () {
          save.seenIntro[level] = true;
          persist();
        }
      }
    );
  }

  function showSettings() {
    var st = save.settings;
    var sizes = [['standard', 'Standard'], ['large', 'Large'], ['largest', 'Largest']];
    openSheet(
      '<h2 id="sheet-title">Settings</h2>' +
      '<fieldset class="setting-group"><legend>Text size</legend><div class="seg">' +
      sizes.map(function (s) {
        return '<label><input type="radio" name="text-size" id="text-' + s[0] + '" value="' + s[0] + '"' +
          (st.textSize === s[0] ? ' checked' : '') + '><span>' + s[1] + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<label class="switch" for="set-dim"><span>Darken tiles you can’t pick yet</span>' +
      '<input type="checkbox" id="set-dim"' + (st.dimBlocked ? ' checked' : '') + '></label>' +
      '<label class="switch" for="set-match"><span>Show the matching tile when I pick one</span>' +
      '<input type="checkbox" id="set-match"' + (st.showMatch ? ' checked' : '') + '></label>' +
      '<label class="switch" for="set-sound"><span>Sounds</span>' +
      '<input type="checkbox" id="set-sound"' + (st.sound ? ' checked' : '') + '></label>' +
      '<div class="reset-box">' +
      '<button class="btn btn-danger" type="button" id="reset-start">Start Chapter 1 over</button>' +
      '<div class="reset-confirm" id="reset-confirm" hidden><p>This clears your cleared boards and your album cards.</p>' +
      '<div class="row"><button class="btn btn-ghost" type="button" id="reset-cancel">Keep my progress</button>' +
      '<button class="btn btn-danger" type="button" id="reset-yes">Start over</button></div></div></div>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close>Done</button></div>'
    );
  }

  function applySettings() {
    var root = document.documentElement;
    if (save.settings.textSize === 'standard') root.removeAttribute('data-text');
    else root.setAttribute('data-text', save.settings.textSize);
    if (game) render();
  }

  function showCard(i) {
    var b = BOARDS[i];
    openSheet(
      '<p class="eyebrow">Board ' + (i + 1) + ' card</p>' +
      '<h2 id="sheet-title">' + esc(b.name) + '</h2>' + cardArt(i) +
      '<p class="question">' + esc(b.trivia.q) + '</p>' +
      '<p class="verdict">' + esc(b.trivia.options[b.trivia.answer]) + '</p>' +
      '<p>' + esc(b.trivia.fact) + '</p>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close>Close</button></div>'
    );
  }

  var triviaLevel = null;

  function showTrivia(level) {
    triviaLevel = level;
    var b = BOARDS[level];
    var tv = b.trivia;
    openSheet(
      '<p class="eyebrow">Board ' + (level + 1) + ' cleared</p>' +
      '<h2 id="sheet-title">Do you remember?</h2>' + cardArt(level) +
      '<p class="question">' + esc(tv.q) + '</p>' +
      '<div class="answers">' + tv.options.map(function (o, i) {
        return '<button class="answer" type="button" data-answer="' + i + '">' + esc(o) + '</button>';
      }).join('') + '</div>' +
      '<div class="reveal" id="reveal" hidden></div>',
      { celebrate: true, locked: true, onClose: function () { showScreen('hub'); } }
    );
  }

  function answerTrivia(level, choice) {
    var b = BOARDS[level];
    var tv = b.trivia;
    var right = choice === tv.answer;
    var firstCard = !save.cards[level];
    if (firstCard) save.cards[level] = { correct: right };
    persist();
    track('trivia_answer', { board: level + 1, correct: right });

    var buttons = $('sheet').querySelectorAll('.answer');
    buttons.forEach(function (btn, i) {
      btn.disabled = true;
      if (i === tv.answer) btn.classList.add('right');
      else if (i === choice) btn.classList.add('wrong');
    });

    var last = level === BOARDS.length - 1;
    var actions = last
      ? '<p class="verdict">You finished Chapter 1!</p><p>Next up: ' + esc(CHAPTER.next) + '. Coming soon.</p>' +
        '<button class="btn btn-primary btn-xl" type="button" data-go="album" data-autofocus>See your album</button>' +
        '<button class="btn btn-ghost" type="button" data-go="hub">Back to the program</button>'
      : '<button class="btn btn-primary btn-xl" type="button" data-go="board:' + (level + 1) + '" data-autofocus>Next: ' +
        esc(BOARDS[level + 1].name) + '</button>' +
        '<button class="btn btn-ghost" type="button" data-go="hub">Back to the program</button>';

    var reveal = $('reveal');
    reveal.innerHTML =
      '<p class="verdict">' + (right ? 'That’s right!' : 'It was ' + esc(tv.options[tv.answer]) + '.') + '</p>' +
      '<p>' + esc(tv.fact) + '</p>' +
      '<p class="collected">' + (firstCard ? 'Card added to your Movie Night album.' : 'This card is already in your album.') + '</p>' +
      '<div class="sheet-actions">' + actions + '</div>';
    reveal.hidden = false;
    sheetLocked = false;
    var focus = reveal.querySelector('[data-autofocus]');
    if (focus) focus.focus({ preventScroll: true });
    reveal.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  // ---------- The board ----------

  // The room the board has inside its padding.
  function boardSpace() {
    var wrap = $('board-wrap');
    var cs = getComputedStyle(wrap);
    return {
      width: wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      height: wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    };
  }

  function startBoard(level, resume) {
    showScreen('game');
    var board = BOARDS[level];
    var saved = save.current;
    if (resume && saved && saved.level === level) {
      game = {
        level: level,
        transposed: !!saved.transposed,
        seed: saved.seed >>> 0,
        tiles: restoreTiles(saved.tiles),
        history: Array.isArray(saved.history) ? saved.history : [],
        moves: saved.moves || 0,
        hints: saved.hints || 0,
        rescues: saved.rescues || 0
      };
      track('board_resume', { board: level + 1 });
    } else {
      var space = boardSpace();
      var seed = TEST && params.get('seed') ? Number(params.get('seed')) >>> 0 : Math.floor(Math.random() * 4294967296);
      var transposed = E.chooseOrientation(board.blocks, space.width, space.height, TILE_ASPECT, LAYER_SHIFT, MAX_TILE);
      game = {
        level: level,
        transposed: transposed,
        seed: seed,
        tiles: E.deal(board.blocks, board.faces, E.mulberry32(seed), transposed),
        history: [],
        moves: 0,
        hints: 0,
        rescues: 0
      };
      track('board_start', { board: level + 1, tiles: board.tiles });
    }
    game.selected = null;
    game.busy = false;
    game.rng = E.mulberry32((game.seed ^ 0x9e3779b9) + game.moves);
    game.bounds = E.bounds(E.layoutPositions(board.blocks, game.transposed));

    $('board-label').textContent = 'Board ' + (level + 1) + ' of ' + BOARDS.length;
    $('board-name').textContent = board.name;
    buildBoard();
    layoutBoard();
    var bar = $('progress-bar');
    bar.style.transition = 'none';
    render();
    void bar.offsetWidth;
    bar.style.transition = '';
    persist();

    if (!save.seenHowTo) showHowTo(true);
    else maybeShowIntro();
  }

  function buildBoard() {
    var el = $('board');
    el.innerHTML = '';
    game.tiles.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.dataset.id = t.id;
      el.appendChild(b);
    });
  }

  function layoutBoard() {
    if (!game) return;
    var space = boardSpace();
    var b = game.bounds;
    var W = Math.floor(E.tileWidthFor(b, space.width, space.height, TILE_ASPECT, LAYER_SHIFT, MAX_TILE));
    W = Math.max(W, 24);
    var H = Math.round(W * TILE_ASPECT);
    var ox = W * LAYER_SHIFT;
    var oy = H * LAYER_SHIFT;
    var el = $('board');
    el.style.width = Math.round(b.cols * W + b.maxZ * ox) + 'px';
    el.style.height = Math.round(b.rows * H + b.maxZ * oy) + 'px';
    el.style.setProperty('--tw', W + 'px');
    el.style.setProperty('--th', H + 'px');
    el.style.setProperty('--edge', Math.max(3, Math.round(W * 0.06)) + 'px');
    game.tiles.forEach(function (t) {
      var btn = el.children[t.id];
      btn.style.left = Math.round((t.x - b.minX) / 2 * W + (b.maxZ - t.z) * ox) + 'px';
      btn.style.top = Math.round((t.y - b.minY) / 2 * H + (b.maxZ - t.z) * oy) + 'px';
      btn.style.zIndex = String(t.z * 1000 + t.y * 30 + t.x + 1);
    });
  }

  function render() {
    var tiles = game.tiles;
    var free = {};
    E.freeTileIds(tiles).forEach(function (id) { free[id] = true; });
    var sel = game.selected;
    var selFace = sel === null ? null : tiles[sel].face;
    var el = $('board');
    tiles.forEach(function (t) {
      var btn = el.children[t.id];
      if (btn.dataset.face !== t.face) {
        btn.dataset.face = t.face;
        btn.innerHTML = ART.face(t.face);
      }
      btn.hidden = !t.present;
      var isFree = !!free[t.id];
      btn.classList.toggle('blocked', t.present && !isFree && save.settings.dimBlocked);
      btn.classList.toggle('selected', t.id === sel);
      btn.classList.toggle('match', save.settings.showMatch && sel !== null && t.id !== sel && isFree && t.face === selFace);
      btn.setAttribute('aria-label', C.FACES[t.face] + (isFree ? '' : ', blocked'));
      btn.setAttribute('aria-pressed', t.id === sel ? 'true' : 'false');
    });
    var left = E.remaining(tiles);
    var total = tiles.length;
    $('tiles-left').textContent = left + (left === 1 ? ' tile left' : ' tiles left');
    $('progress-bar').style.width = Math.round((total - left) / total * 100) + '%';
  }

  function clearHint() {
    if (!game) return;
    clearTimeout(game.hintTimer);
    $('board').querySelectorAll('.tile.hint').forEach(function (t) { t.classList.remove('hint'); });
  }

  var blockedTips = 0;
  function onTileTap(id) {
    if (!game || game.busy) return;
    var t = game.tiles[id];
    if (!t || !t.present) return;
    clearHint();
    var btn = $('board').children[id];
    if (!E.isFree(game.tiles, id)) {
      btn.classList.remove('nudge');
      void btn.offsetWidth;
      btn.classList.add('nudge');
      sound('blocked');
      if (blockedTips < 3 || !save.settings.dimBlocked) {
        blockedTips++;
        toast('That tile is blocked. Pick one with nothing on top and an open left or right side.');
      }
      return;
    }
    if (game.selected === id) {
      game.selected = null;
    } else if (game.selected !== null && game.tiles[game.selected].face === t.face) {
      matchPair(game.selected, id);
      return;
    } else {
      game.selected = id;
    }
    sound('select');
    render();
  }

  function matchPair(a, b) {
    game.busy = true;
    game.history.push(snapshotTiles(game.tiles));
    game.selected = null;
    var el = $('board');
    el.children[a].classList.remove('selected');
    el.children[a].classList.add('leaving');
    el.children[b].classList.add('leaving');
    sound('match');
    setTimeout(function () {
      if (!game) return;
      [a, b].forEach(function (id) {
        game.tiles[id].present = false;
        el.children[id].classList.remove('leaving');
      });
      game.moves++;
      var left = E.remaining(game.tiles);
      track('match', { board: game.level + 1, tilesLeft: left });
      game.busy = false;
      if (left === 0) {
        render();
        boardCleared();
        return;
      }
      if (!E.availableMatches(game.tiles).length) rescue(true);
      render();
      persist();
    }, reducedMotion() ? 40 : 240);
  }

  function rescue(auto) {
    var how = E.rescue(game.tiles, BOARDS[game.level].blocks, game.transposed, game.rng);
    game.rescues++;
    if (how === 'rearranged') layoutBoard();
    track('rescue', { board: game.level + 1, auto: auto, how: how });
    if (auto) {
      toast(how === 'rearranged'
        ? 'No pairs were left, so the last tiles moved to fresh spots.'
        : 'No pairs were left, so the tiles were reshuffled for you.');
    } else {
      toast('Tiles reshuffled.');
    }
  }

  function onShuffle() {
    if (!game || game.busy) return;
    clearHint();
    game.history.push(snapshotTiles(game.tiles));
    game.selected = null;
    rescue(false);
    render();
    persist();
  }

  function onUndo() {
    if (!game || game.busy) return;
    clearHint();
    if (!game.history.length) {
      toast('Nothing to undo yet.');
      return;
    }
    game.tiles = restoreTiles(game.history.pop());
    game.selected = null;
    sound('undo');
    layoutBoard();
    render();
    persist();
    track('undo', { board: game.level + 1 });
  }

  function onHint() {
    if (!game || game.busy) return;
    clearHint();
    var moves = E.availableMatches(game.tiles);
    if (!moves.length) {
      rescue(true);
      render();
      persist();
      return;
    }
    game.selected = null;
    render();
    var el = $('board');
    moves[0].forEach(function (id) { el.children[id].classList.add('hint'); });
    game.hintTimer = setTimeout(clearHint, 5000);
    game.hints++;
    sound('hint');
    toast('These two match. Tap both of them.');
    track('hint', { board: game.level + 1 });
  }

  function boardCleared() {
    var level = game.level;
    clearTimeout(toastTimer);
    $('toast').classList.remove('show');
    sound('win');
    track('board_clear', { board: level + 1, moves: game.moves, hints: game.hints, rescues: game.rescues });
    save.cleared[level] = true;
    save.current = null;
    game = null;
    persist();
    setTimeout(function () { showTrivia(level); }, reducedMotion() ? 0 : 350);
  }

  function leaveGame() {
    clearHint();
    if (game) persist();
    game = null;
    showScreen('hub');
  }

  function go(action) {
    if (!action) return;
    if (action === 'hub') leaveGame();
    else if (action === 'album') { if (game) persist(); game = null; showScreen('album'); }
    else if (action.indexOf('board:') === 0) {
      var level = Number(action.slice(6));
      startBoard(level, !!(save.current && save.current.level === level));
    }
  }

  // ---------- Wiring ----------

  function wire() {
    document.querySelectorAll('[data-icon]').forEach(function (s) { s.outerHTML = ART.icon(s.dataset.icon); });
    document.querySelectorAll('.back-icon').forEach(function (s) { s.innerHTML = ART.icon('back'); });

    $('cta').addEventListener('click', function () { go(this.dataset.action); });
    $('program').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-board]');
      if (btn && !btn.disabled) go('board:' + btn.dataset.board);
    });
    $('open-album').addEventListener('click', function () { showScreen('album'); });
    $('open-howto').addEventListener('click', function () { showHowTo(false); });
    $('open-settings').addEventListener('click', showSettings);
    $('back').addEventListener('click', leaveGame);
    $('album-back').addEventListener('click', function () { showScreen('hub'); });
    $('album-grid').addEventListener('click', function (e) {
      var card = e.target.closest('[data-card]');
      if (card) showCard(Number(card.dataset.card));
    });

    $('board').addEventListener('click', function (e) {
      var tile = e.target.closest('.tile');
      if (tile) onTileTap(Number(tile.dataset.id));
    });
    $('undo').addEventListener('click', onUndo);
    $('hint').addEventListener('click', onHint);
    $('shuffle').addEventListener('click', onShuffle);
    $('game-settings').addEventListener('click', showSettings);

    var sheet = $('sheet');
    sheet.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-close]')) { closeSheet(); return; }
      var answer = t.closest('[data-answer]');
      if (answer && !answer.disabled) {
        answerTrivia(triviaLevel, Number(answer.dataset.answer));
        return;
      }
      var goBtn = t.closest('[data-go]');
      if (goBtn) {
        var action = goBtn.dataset.go;
        sheetOnClose = null;
        closeSheet();
        go(action);
        return;
      }
      if (t.id === 'reset-start') { $('reset-confirm').hidden = false; t.hidden = true; $('reset-cancel').focus(); }
      if (t.id === 'reset-cancel') { $('reset-confirm').hidden = true; $('reset-start').hidden = false; $('reset-start').focus(); }
      if (t.id === 'reset-yes') {
        var settings = save.settings;
        save = defaultSave();
        save.settings = settings;
        save.seenHowTo = true;
        game = null;
        persist();
        sheetOnClose = null;
        closeSheet();
        showScreen('hub');
        toast('Chapter 1 starts fresh.');
      }
    });
    sheet.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'text-size') save.settings.textSize = t.value;
      if (t.id === 'set-dim') save.settings.dimBlocked = t.checked;
      if (t.id === 'set-match') save.settings.showMatch = t.checked;
      if (t.id === 'set-sound') save.settings.sound = t.checked;
      applySettings();
      persist();
    });
    $('overlay').addEventListener('click', function (e) {
      if (e.target === this && !sheetLocked) closeSheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('overlay').hidden && !sheetLocked) closeSheet();
    });

    if (window.ResizeObserver) new ResizeObserver(function () { layoutBoard(); }).observe($('board-wrap'));
    else window.addEventListener('resize', layoutBoard);
    window.addEventListener('pagehide', function () { if (game) persist(); });
  }

  function boot(data) {
    save = data && data.save ? normalize(data.save) : loadSave();
    if (TEST && params.has('fresh')) save = defaultSave();
    applySettings();
    showScreen('hub');
    if (data && data.screen === 'game' && save.current) startBoard(save.current.level, true);
    else if (data && data.screen === 'album') showScreen('album');
  }

  wire();

  if (TEST) {
    window.__mnm = {
      engine: E,
      get game() { return game; },
      get save() { return save; },
      tileButton: function (id) { return $('board').children[id]; }
    };
  }

  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { if (game) persist(); return { save: save, screen: screen }; });
  if (hot && hot.ready) hot.ready(boot);
  else boot(hot && hot.data);
})();
