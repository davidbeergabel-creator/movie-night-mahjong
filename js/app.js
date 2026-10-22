/* Movie Night Mahjong: screens, board drawing and play. */
(function () {
  'use strict';

  var E = window.MNMEngine;
  var ART = window.MNMArt;
  var C = window.MNMContent;
  var CHAPTERS = C.CHAPTERS;

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

  // ---------- Chapters and boards ----------

  function chapterById(id) {
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
    return null;
  }

  function boardKey(chapter, index) {
    return chapter.id + '-' + (index + 1);
  }

  // 'drive-in-3' -> the third board of the Drive-In chapter.
  function lookup(key) {
    var m = /^([a-z-]+)-(\d+)$/.exec(key || '');
    if (!m) return null;
    var chapter = chapterById(m[1]);
    var index = Number(m[2]) - 1;
    if (!chapter || !chapter.boards[index]) return null;
    return { key: key, chapter: chapter, index: index, board: chapter.boards[index] };
  }

  function chapterDone(chapter) {
    return chapter.boards.every(function (b, i) { return save.cleared[boardKey(chapter, i)]; });
  }

  function chapterCleared(chapter) {
    return chapter.boards.filter(function (b, i) { return save.cleared[boardKey(chapter, i)]; }).length;
  }

  function chapterUnlocked(chapter) {
    if (TEST || !chapter.unlockAfter) return true;
    return chapterDone(chapterById(chapter.unlockAfter));
  }

  function boardUnlocked(chapter, i) {
    if (!chapterUnlocked(chapter)) return false;
    return TEST || i === 0 || save.cleared[boardKey(chapter, i)] || save.cleared[boardKey(chapter, i - 1)];
  }

  // The next board on the main path, skipping bonus chapters.
  function nextBoard() {
    for (var c = 0; c < CHAPTERS.length; c++) {
      var ch = CHAPTERS[c];
      if (ch.bonus || !chapterUnlocked(ch)) continue;
      for (var i = 0; i < ch.boards.length; i++) {
        if (!save.cleared[boardKey(ch, i)]) return lookup(boardKey(ch, i));
      }
    }
    return null;
  }

  function newFaces(chapter, index) {
    var faces = chapter.boards[index].faces;
    if (index === 0) return chapter.id === CHAPTERS[0].id ? [] : faces.slice();
    var before = chapter.boards[index - 1].faces;
    return faces.filter(function (f) { return before.indexOf(f) < 0; });
  }

  // ---------- Saved progress ----------

  function defaultSave() {
    return {
      settings: { textSize: 'standard', dimBlocked: true, showMatch: false, sound: true },
      cleared: {},
      cards: {},
      seenIntro: {},
      seenHowTo: false,
      games: {},
      lastPlayed: null,
      tab: CHAPTERS[0].id
    };
  }

  function plainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }

  // Version 1 kept Chapter 1 progress in arrays; carry it over to board keys.
  function fromArrays(list, chapterId) {
    var out = {};
    list.forEach(function (v, i) { if (v) out[chapterId + '-' + (i + 1)] = v; });
    return out;
  }

  function normalize(data) {
    var s = defaultSave();
    if (!data || typeof data !== 'object') return s;
    if (data.settings) Object.keys(s.settings).forEach(function (k) {
      if (typeof data.settings[k] === typeof s.settings[k]) s.settings[k] = data.settings[k];
    });
    ['cleared', 'cards', 'seenIntro'].forEach(function (k) {
      s[k] = Array.isArray(data[k]) ? fromArrays(data[k], 'drive-in') : plainObject(data[k]);
    });
    s.seenHowTo = !!data.seenHowTo;
    s.games = plainObject(data.games);
    if (data.current && typeof data.current.level === 'number' && Array.isArray(data.current.tiles)) {
      var key = 'drive-in-' + (data.current.level + 1);
      s.games[key] = Object.assign({}, data.current, { spec: { kind: 'chapter', key: key } });
      s.lastPlayed = key;
    }
    Object.keys(s.games).forEach(function (k) {
      var g = s.games[k];
      if (!g || !g.spec || !Array.isArray(g.tiles) || !resolveBoard(g.spec)) delete s.games[k];
    });
    if (typeof data.lastPlayed === 'string') s.lastPlayed = data.lastPlayed;
    if (typeof data.tab === 'string' && chapterById(data.tab)) s.tab = data.tab;
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
    if (game) save.games[game.spec.key] = snapshotGame();
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
      spec: game.spec,
      transposed: game.transposed,
      seed: game.seed,
      tiles: snapshotTiles(game.tiles),
      history: game.history,
      moves: game.moves,
      hints: game.hints,
      rescues: game.rescues
    };
  }

  // ---------- Board kinds ----------

  // A spec says which board a game is: { kind: 'chapter', key: 'drive-in-3' }.
  function resolveBoard(spec) {
    if (!spec) return null;
    if (spec.kind === 'chapter') {
      var found = lookup(spec.key);
      return found && found.board;
    }
    return null;
  }

  function gameTitle(spec) {
    var found = lookup(spec.key);
    return {
      meta: found.chapter.kicker + ' · Board ' + (found.index + 1) + ' of ' + found.chapter.boards.length,
      name: found.board.name
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

  function hideToast() {
    clearTimeout(toastTimer);
    $('toast').classList.remove('show');
  }

  // ---------- Screens ----------

  function showScreen(name) {
    screen = name;
    ['hub', 'game', 'album'].forEach(function (s) { $(s).hidden = s !== name; });
    if (name === 'hub') renderHub();
    if (name === 'album') renderAlbum();
  }

  function totalBoards() {
    return CHAPTERS.reduce(function (n, ch) { return n + ch.boards.length; }, 0);
  }

  function cardsCollected() {
    return Object.keys(save.cards).filter(function (k) { return save.cards[k] && lookup(k); }).length;
  }

  function renderCta() {
    var cta = $('cta');
    var last = save.lastPlayed && save.games[save.lastPlayed] && lookup(save.lastPlayed);
    var next = nextBoard();
    if (last) {
      cta.textContent = 'Resume Board ' + (last.index + 1) + ': ' + last.board.name;
      cta.dataset.action = 'board:' + last.key;
    } else if (!next) {
      cta.textContent = 'See your Movie Night album';
      cta.dataset.action = 'album';
    } else if (next.key === boardKey(CHAPTERS[0], 0)) {
      cta.textContent = 'Start the show';
      cta.dataset.action = 'board:' + next.key;
    } else {
      cta.textContent = 'Play Board ' + (next.index + 1) + ': ' + next.board.name;
      cta.dataset.action = 'board:' + next.key;
    }
  }

  function renderTabs() {
    var tabs = $('chapter-tabs');
    tabs.hidden = CHAPTERS.length < 2;
    tabs.innerHTML = CHAPTERS.map(function (ch) {
      var on = ch.id === save.tab;
      var status = chapterUnlocked(ch)
        ? chapterCleared(ch) + ' of ' + ch.boards.length
        : ART.icon('lock') + 'Locked';
      return '<button class="chapter-tab' + (on ? ' on' : '') + '" type="button" role="tab" id="tab-' + ch.id +
        '" data-tab="' + ch.id + '" aria-selected="' + on + '" aria-controls="program">' +
        '<span class="tab-kicker">' + esc(ch.kicker) + '</span>' +
        '<span class="tab-name">' + esc(ch.short) + '</span>' +
        '<span class="tab-status">' + status + '</span></button>';
    }).join('');
  }

  function renderProgram() {
    var ch = chapterById(save.tab) || CHAPTERS[0];
    var next = nextBoard();
    var unlocked = chapterUnlocked(ch);
    $('program-title').textContent = ch.kicker + ' · ' + ch.title;
    $('chapter-sub').textContent = ch.blurb;

    var done = $('chapter-done');
    done.hidden = !chapterDone(ch);
    if (!done.hidden) {
      var after = CHAPTERS.filter(function (c) { return c.unlockAfter === ch.id; })[0];
      done.innerHTML = '<strong>You finished ' + esc(ch.kicker) + '.</strong>' +
        '<span>' + (after ? 'Next up: ' + esc(after.title) + '.' : 'More chapters are coming soon.') + '</span>';
    }

    var locked = $('chapter-locked');
    locked.hidden = unlocked;
    if (!unlocked) {
      var before = chapterById(ch.unlockAfter);
      locked.textContent = 'Finish ' + before.kicker + ', ' + before.title + ', to open this chapter.';
    }

    $('program').setAttribute('aria-labelledby', 'tab-' + ch.id);
    $('program').innerHTML = ch.boards.map(function (b, i) {
      var key = boardKey(ch, i);
      var open = boardUnlocked(ch, i);
      var status;
      if (save.games[key]) status = '<span class="ticket-status is-progress">In progress</span>';
      else if (save.cleared[key]) status = '<span class="ticket-status is-cleared">' + ART.icon('star') + 'Cleared</span>';
      else if (next && next.key === key) status = '<span class="ticket-status is-next">Up next</span>';
      else if (!open) status = '<span class="ticket-status is-locked">' + ART.icon('lock') + 'Locked</span>';
      else status = '';
      var label = 'Board ' + (i + 1) + ', ' + b.name + ', ' + b.tiles + ' tiles' + (open ? '' : ', locked');
      return '<li><button class="ticket" type="button" data-board="' + key + '"' + (open ? '' : ' disabled') +
        ' aria-label="' + esc(label) + '">' +
        '<span class="ticket-stub" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="ticket-body"><span class="ticket-name">' + esc(b.name) + '</span>' +
        '<span class="ticket-meta">' + b.tiles + ' tiles</span></span>' + status + '</button></li>';
    }).join('');
  }

  function renderHub() {
    renderCta();
    renderTabs();
    renderProgram();
    $('album-count').textContent = cardsCollected() + ' of ' + totalBoards();
  }

  function cardArt(found, empty) {
    if (empty) {
      return '<div class="card-art card-empty"><span class="empty-mark" aria-hidden="true">?</span></div>';
    }
    var b = found.board;
    return '<div class="card-art card-' + b.cardColor + '"><div class="card-tile">' + ART.face(b.cardFace) + '</div></div>';
  }

  function renderAlbum() {
    $('album-sections').innerHTML = CHAPTERS.map(function (ch) {
      var cards = ch.boards.map(function (b, i) {
        var found = lookup(boardKey(ch, i));
        if (!save.cards[found.key]) {
          return '<button class="album-card" type="button" disabled>' + cardArt(found, true) +
            '<h3>' + esc(b.name) + '</h3><p>Clear Board ' + (i + 1) + ' to collect this card.</p></button>';
        }
        return '<button class="album-card" type="button" data-card="' + found.key + '">' + cardArt(found) +
          '<h3>' + esc(b.name) + '</h3><p>' + esc(b.trivia.q) + '</p>' +
          '<p class="answer-line">' + esc(b.trivia.options[b.trivia.answer]) + '</p></button>';
      }).join('');
      return '<section class="album-section" aria-labelledby="album-' + ch.id + '">' +
        '<h2 id="album-' + ch.id + '" class="section-label">' + esc(ch.kicker) + ' · ' + esc(ch.title) + '</h2>' +
        '<div class="album-grid">' + cards + '</div></section>';
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

  function maybeShowIntro() {
    if (!game || game.spec.kind !== 'chapter') return;
    var found = lookup(game.spec.key);
    var fresh = newFaces(found.chapter, found.index);
    if (save.seenIntro[found.key] || !fresh.length) return;
    openSheet(
      '<p class="eyebrow">Board ' + (found.index + 1) + ' · ' + esc(found.board.name) + '</p>' +
      '<h2 id="sheet-title">New tiles tonight</h2>' +
      '<div class="new-tiles">' + fresh.map(function (f) {
        return '<figure>' + miniTile(f, 'big') + '<figcaption>' + esc(C.FACES[f]) + '</figcaption></figure>';
      }).join('') + '</div>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close data-autofocus>Let’s play</button></div>',
      {
        onClose: function () {
          save.seenIntro[found.key] = true;
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
      '<button class="btn btn-danger" type="button" id="reset-start">Start everything over</button>' +
      '<div class="reset-confirm" id="reset-confirm" hidden><p>This clears every cleared board, your album cards and your calendar stamps.</p>' +
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

  function showCard(key) {
    var found = lookup(key);
    var b = found.board;
    openSheet(
      '<p class="eyebrow">' + esc(found.chapter.kicker) + ' · Board ' + (found.index + 1) + ' card</p>' +
      '<h2 id="sheet-title">' + esc(b.name) + '</h2>' + cardArt(found) +
      '<p class="question">' + esc(b.trivia.q) + '</p>' +
      '<p class="verdict">' + esc(b.trivia.options[b.trivia.answer]) + '</p>' +
      '<p>' + esc(b.trivia.fact) + '</p>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close>Close</button></div>'
    );
  }

  var trivia = null;

  function showTrivia(found, result) {
    trivia = { found: found, result: result };
    var tv = found.board.trivia;
    openSheet(
      '<p class="eyebrow">Board ' + (found.index + 1) + ' cleared</p>' +
      '<h2 id="sheet-title">' + esc(found.chapter.cardTitle || 'Do you remember?') + '</h2>' + cardArt(found) +
      '<p class="question">' + esc(tv.q) + '</p>' +
      '<div class="answers">' + tv.options.map(function (o, i) {
        return '<button class="answer" type="button" data-answer="' + i + '">' + esc(o) + '</button>';
      }).join('') + '</div>' +
      '<div class="reveal" id="reveal" hidden></div>',
      { celebrate: true, locked: true, onClose: function () { showScreen('hub'); } }
    );
  }

  function answerTrivia(choice) {
    var found = trivia.found;
    var tv = found.board.trivia;
    var right = choice === tv.answer;
    var firstCard = !save.cards[found.key];
    if (firstCard) save.cards[found.key] = { correct: right };
    persist();
    track('trivia_answer', { board: found.key, correct: right });

    $('sheet').querySelectorAll('.answer').forEach(function (btn, i) {
      btn.disabled = true;
      if (i === tv.answer) btn.classList.add('right');
      else if (i === choice) btn.classList.add('wrong');
    });

    var ch = found.chapter;
    var nextKey = found.index + 1 < ch.boards.length ? boardKey(ch, found.index + 1) : null;
    var actions;
    if (nextKey) {
      actions = '<button class="btn btn-primary btn-xl" type="button" data-go="board:' + nextKey + '" data-autofocus>Next: ' +
        esc(ch.boards[found.index + 1].name) + '</button>';
    } else {
      var after = CHAPTERS.filter(function (c) { return c.unlockAfter === ch.id; })[0];
      actions = '<p class="verdict">You finished ' + esc(ch.kicker) + '!</p>' +
        (after
          ? '<p>' + esc(after.kicker) + ', ' + esc(after.title) + ', is now open.</p>' +
            '<button class="btn btn-primary btn-xl" type="button" data-go="chapter:' + after.id + '" data-autofocus>Open ' + esc(after.kicker) + '</button>'
          : '<button class="btn btn-primary btn-xl" type="button" data-go="album" data-autofocus>See your album</button>');
    }
    actions += '<button class="btn btn-ghost" type="button" data-go="hub">Back to the program</button>';

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

  function randomSeed() {
    return Math.floor(Math.random() * 4294967296);
  }

  // Starts the board a spec names, or picks up where the player left it.
  // opts.seed and opts.transposed recreate a particular deal.
  function startGame(spec, opts) {
    opts = opts || {};
    showScreen('game');
    var board = resolveBoard(spec);
    var saved = save.games[spec.key];
    if (saved && !opts.fresh) {
      game = {
        spec: saved.spec,
        transposed: !!saved.transposed,
        seed: saved.seed >>> 0,
        tiles: restoreTiles(saved.tiles),
        history: Array.isArray(saved.history) ? saved.history : [],
        moves: saved.moves || 0,
        hints: saved.hints || 0,
        rescues: saved.rescues || 0
      };
      track('board_resume', { board: spec.key });
    } else {
      var space = boardSpace();
      var seed = opts.seed !== undefined ? opts.seed >>> 0
        : TEST && params.get('seed') ? Number(params.get('seed')) >>> 0 : randomSeed();
      var transposed = opts.transposed !== undefined ? opts.transposed
        : E.chooseOrientation(board.blocks, space.width, space.height, TILE_ASPECT, LAYER_SHIFT, MAX_TILE);
      game = {
        spec: spec,
        transposed: transposed,
        seed: seed,
        tiles: E.deal(board.blocks, board.faces, E.mulberry32(seed), transposed),
        history: [],
        moves: 0,
        hints: 0,
        rescues: 0
      };
      track('board_start', { board: spec.key, tiles: board.tiles });
    }
    game.board = board;
    game.selected = null;
    game.busy = false;
    game.rng = E.mulberry32((game.seed ^ 0x9e3779b9) + game.moves);
    game.bounds = E.bounds(E.layoutPositions(board.blocks, game.transposed));
    save.lastPlayed = spec.kind === 'chapter' ? spec.key : save.lastPlayed;

    var title = gameTitle(game.spec);
    $('board-label').textContent = title.meta;
    $('board-name').textContent = title.name;
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
      track('match', { board: game.spec.key, tilesLeft: left });
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
    var how = E.rescue(game.tiles, game.board.blocks, game.transposed, game.rng);
    game.rescues++;
    if (how === 'rearranged') layoutBoard();
    track('rescue', { board: game.spec.key, auto: auto, how: how });
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
    track('undo', { board: game.spec.key });
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
    track('hint', { board: game.spec.key });
  }

  function boardCleared() {
    var finished = game;
    hideToast();
    sound('win');
    track('board_clear', { board: finished.spec.key, moves: finished.moves, hints: finished.hints, rescues: finished.rescues });
    delete save.games[finished.spec.key];
    if (save.lastPlayed === finished.spec.key) save.lastPlayed = null;
    var result = { hints: finished.hints, moves: finished.moves, spec: finished.spec, seed: finished.seed, transposed: finished.transposed };
    game = null;
    if (finished.spec.kind === 'chapter') save.cleared[finished.spec.key] = true;
    persist();
    setTimeout(function () { showResult(result); }, reducedMotion() ? 0 : 350);
  }

  function showResult(result) {
    if (result.spec.kind === 'chapter') showTrivia(lookup(result.spec.key), result);
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
    else if (action.indexOf('chapter:') === 0) {
      save.tab = action.slice(8);
      persist();
      leaveGame();
    } else if (action.indexOf('board:') === 0) {
      var key = action.slice(6);
      var found = lookup(key);
      if (!found) return;
      save.tab = found.chapter.id;
      startGame({ kind: 'chapter', key: key });
    }
  }

  // ---------- Wiring ----------

  function wire() {
    document.querySelectorAll('[data-icon]').forEach(function (s) { s.outerHTML = ART.icon(s.dataset.icon); });
    document.querySelectorAll('.back-icon').forEach(function (s) { s.innerHTML = ART.icon('back'); });

    $('cta').addEventListener('click', function () { go(this.dataset.action); });
    $('chapter-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (!tab) return;
      save.tab = tab.dataset.tab;
      persist();
      renderTabs();
      renderProgram();
      $('tab-' + save.tab).focus();
    });
    $('chapter-tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = CHAPTERS.map(function (c) { return c.id; });
      var i = ids.indexOf(save.tab) + (e.key === 'ArrowRight' ? 1 : -1);
      save.tab = ids[(i + ids.length) % ids.length];
      renderTabs();
      renderProgram();
      $('tab-' + save.tab).focus();
    });
    $('program').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-board]');
      if (btn && !btn.disabled) go('board:' + btn.dataset.board);
    });
    $('open-album').addEventListener('click', function () { showScreen('album'); });
    $('open-howto').addEventListener('click', function () { showHowTo(false); });
    $('open-settings').addEventListener('click', showSettings);
    $('back').addEventListener('click', leaveGame);
    $('album-back').addEventListener('click', function () { showScreen('hub'); });
    $('album-sections').addEventListener('click', function (e) {
      var card = e.target.closest('[data-card]');
      if (card) showCard(card.dataset.card);
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
        answerTrivia(Number(answer.dataset.answer));
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
        toast('Everything starts fresh.');
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
    if (data && data.screen === 'game' && data.spec && save.games[data.spec.key]) startGame(data.spec);
    else if (data && data.screen === 'album') showScreen('album');
  }

  wire();

  if (TEST) {
    window.__mnm = {
      engine: E,
      get game() { return game; },
      get save() { return save; },
      get trivia() { return trivia; },
      tileButton: function (id) { return $('board').children[id]; }
    };
  }

  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(function () {
      if (game) persist();
      return { save: save, screen: screen, spec: game ? game.spec : null };
    });
  }
  if (hot && hot.ready) hot.ready(boot);
  else boot(hot && hot.data);
})();
