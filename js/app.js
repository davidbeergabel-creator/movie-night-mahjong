/* Movie Night Mahjong: screens, board drawing and play. */
(function () {
  'use strict';

  var E = window.MNMEngine;
  var CH = window.MNMChess;
  var ART = window.MNMArt;
  var C = window.MNMContent;
  var CHAPTERS = C.CHAPTERS;

  var params = new URLSearchParams(location.search);
  var TEST = params.has('test');
  var UNLOCK_ALL = TEST && !params.has('locks');
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
    if (UNLOCK_ALL || !chapter.unlockAfter) return true;
    return chapterDone(chapterById(chapter.unlockAfter));
  }

  function boardUnlocked(chapter, i) {
    if (!chapterUnlocked(chapter)) return false;
    return UNLOCK_ALL || i === 0 || save.cleared[boardKey(chapter, i)] || save.cleared[boardKey(chapter, i - 1)];
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
      seenChessHowTo: false,
      games: {},
      daily: {},
      lastPlayed: null,
      tab: CHAPTERS[0].id,
      albumTab: CHAPTERS[0].id
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
    s.seenChessHowTo = !!data.seenChessHowTo;
    s.games = plainObject(data.games);
    s.daily = plainObject(data.daily);
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
    if (typeof data.albumTab === 'string' && chapterById(data.albumTab)) s.albumTab = data.albumTab;
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
  var view = 'home';

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

  // A spec says which board a game is:
  //   { kind: 'chapter', key: 'drive-in-3' }
  //   { kind: 'daily', key: 'daily-2026-10-22' }
  //   { kind: 'friend', key: 'friend', ref: 'drive-in-3', theirHints: 2 }  (a board someone sent)
  function boardForKey(key) {
    var found = lookup(key);
    if (found) return found.board;
    var day = /^daily-(\d{4}-\d{2}-\d{2})$/.exec(key || '');
    return day ? dailyBoard(day[1]) : null;
  }

  function refOf(spec) {
    return spec.kind === 'friend' ? spec.ref : spec.key;
  }

  function resolveBoard(spec) {
    return spec ? boardForKey(refOf(spec)) : null;
  }

  function boardName(key) {
    var board = boardForKey(key);
    return board ? board.name : '';
  }

  function shortDate(date) {
    return parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // The three counters at the top of the board, and the name under them.
  function gameStats(spec) {
    var ref = refOf(spec);
    var friend = spec.kind === 'friend';
    var found = lookup(ref);
    if (!found) {
      var date = ref.slice(6);
      return { kind: friend ? 'Friend' : 'Daily', value: shortDate(date), name: (friend ? 'A friend’s daily board · ' : '') + longDate(date) };
    }
    var level = levelNumber(ref);
    return {
      kind: friend ? 'Friend' : found.chapter.bonus ? 'Chess' : 'Level',
      value: String(level || found.index + 1),
      name: found.board.name
    };
  }

  // ---------- The daily board ----------

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDate(key) {
    var p = key.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function today() {
    if (TEST && /^\d{4}-\d{2}-\d{2}$/.test(params.get('today') || '')) return params.get('today');
    return dateKey(new Date());
  }

  function longDate(key) {
    return parseDate(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  var dailyCache = {};

  // Everyone gets the same board on the same day: the date picks the layout, the tiles and the deal.
  function dailyBoard(date) {
    if (dailyCache[date]) return dailyCache[date];
    var rng = E.mulberry32(hashString('daily:' + date));
    var layouts = [];
    var faces = [];
    CHAPTERS.forEach(function (ch) {
      if (ch.mode !== 'classic') return;
      ch.boards.forEach(function (b) {
        if (b.tiles >= 36) layouts.push(b);
        b.faces.forEach(function (f) { if (faces.indexOf(f) < 0) faces.push(f); });
      });
    });
    var layout = layouts[Math.floor(rng() * layouts.length)];
    var count = Math.min(12, Math.max(8, Math.round(layout.tiles / 5)));
    dailyCache[date] = {
      name: longDate(date),
      daily: true,
      date: date,
      blocks: layout.blocks,
      tiles: layout.tiles,
      faces: E.shuffle(faces.slice(), rng).slice(0, count),
      seed: hashString('deal:' + date)
    };
    return dailyCache[date];
  }

  function stampsIn(year, month) {
    var prefix = year + '-' + pad(month + 1) + '-';
    return Object.keys(save.daily).filter(function (k) { return k.indexOf(prefix) === 0; }).length;
  }

  function stampsLine(date) {
    var d = parseDate(date);
    var n = stampsIn(d.getFullYear(), d.getMonth());
    var month = d.toLocaleDateString('en-US', { month: 'long' });
    return n === 0 ? 'No stamps yet in ' + month + '.' : n + (n === 1 ? ' stamp' : ' stamps') + ' in ' + month + '.';
  }

  function stamp(date, result) {
    if (!save.daily[date]) save.daily[date] = { hints: result.hints, moves: result.moves };
  }

  var calendarMonth = null;

  function renderDailyView() {
    var date = today();
    var key = 'daily-' + date;
    var base = parseDate(date);
    if (!calendarMonth) calendarMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    var y = calendarMonth.getFullYear();
    var m = calendarMonth.getMonth();
    $('daily-title').textContent = longDate(date);
    $('cal-month').textContent = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    $('cal-next').disabled = y === base.getFullYear() && m === base.getMonth();
    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var cells = '';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) { cells += '<span class="cal-head" aria-hidden="true">' + d + '</span>'; });
    var weeks = Math.ceil((first + days) / 7);
    $('calendar').style.gridTemplateRows = 'auto repeat(' + weeks + ', minmax(0, 1fr))';
    for (var i = 0; i < weeks * 7; i++) {
      var d = i - first + 1;
      if (d < 1 || d > days) { cells += '<span class="cal-day blank"></span>'; continue; }
      var k = y + '-' + pad(m + 1) + '-' + pad(d);
      var cls = save.daily[k] ? 'stamped' : k === date ? 'today' : '';
      cells += '<span class="cal-day ' + cls + '"' + (save.daily[k] ? ' aria-label="' + d + ', stamped"' : '') + '>' +
        (save.daily[k] ? ART.icon('star') : '') + '<span>' + d + '</span></span>';
    }
    $('calendar').innerHTML = cells;
    var n = stampsIn(y, m);
    $('daily-note').textContent = (n === 0 ? 'No stamps yet this month.' : n + (n === 1 ? ' stamp' : ' stamps') + ' this month.') +
      ' A new board every day, and no streak to lose.';
    $('daily-action').innerHTML = save.daily[date]
      ? '<p class="stamped-chip">' + ART.icon('star') + 'Stamped today. See you tomorrow!</p>'
      : '<button id="daily-play" class="btn btn-primary btn-xl" type="button">' +
        (save.games[key] ? 'Resume today’s board' : 'Play today’s board') + '</button>';
  }

  function showDailyResult(result, date) {
    openSheet(
      '<p class="eyebrow">Daily board · ' + esc(longDate(date)) + '</p>' +
      '<h2 id="sheet-title">Stamped!</h2>' +
      '<div class="big-stamp" aria-hidden="true">' + ART.icon('star') + '</div>' +
      '<p class="question">You cleared it using ' + esc(hintsText(result.hints)) + '. ' + esc(stampsLine(date)) + '</p>' +
      '<p>A new board arrives tomorrow.</p>' +
      shareBox(result, 'Send this board to a friend') +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-go="home" data-autofocus>Home</button>' +
      '<button class="btn btn-ghost" type="button" data-go="daily">See your calendar</button></div>',
      { celebrate: true, onClose: function () { showView('home'); } }
    );
  }

  // ---------- Sending a board to a friend ----------

  var SITE = 'https://davidbeergabel-creator.github.io/movie-night-mahjong/';

  function siteUrl() {
    var local = /^https?:$/.test(location.protocol) && /(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
    return local ? location.origin + location.pathname : SITE;
  }

  function hintsText(n) {
    return n === 0 ? 'no hints' : n === 1 ? '1 hint' : n + ' hints';
  }

  // The link holds everything needed to deal the same board: which one, its seed and its orientation.
  function shareLink(result) {
    var q = new URLSearchParams({
      play: refOf(result.spec),
      seed: String(result.seed),
      o: result.transposed ? 't' : 'w',
      h: String(result.hints)
    });
    return siteUrl() + '?' + q.toString();
  }

  function shareBox(result, label) {
    var name = boardName(refOf(result.spec)) || 'this board';
    var text = 'I cleared “' + name + '” in Movie Night Mahjong using ' + hintsText(result.hints) +
      '. Here’s the very same board for you: ' + shareLink(result);
    return '<div class="share" data-text="' + esc(text) + '">' +
      '<button class="btn btn-ghost" type="button" data-share>' + esc(label) + '</button>' +
      '<div class="share-box" hidden><label for="share-text">Copy this and send it in a message or email:</label>' +
      '<textarea id="share-text" rows="4" readonly>' + esc(text) + '</textarea></div></div>';
  }

  function shareFrom(box) {
    var text = box.dataset.text;
    track('share', { board: game ? game.spec.key : null });
    function showBox() {
      var b = box.querySelector('.share-box');
      b.hidden = false;
      var area = b.querySelector('textarea');
      area.focus();
      area.select();
    }
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          toast('Link copied. Paste it into a message or email.');
        }, showBox);
      } else {
        showBox();
      }
    }
    if (navigator.share) {
      navigator.share({ title: 'Movie Night Mahjong', text: text }).catch(function (err) {
        if (!err || err.name !== 'AbortError') copy();
      });
    } else {
      copy();
    }
  }

  // ?play=drive-in-3&seed=123&o=t&h=2 -> the board a friend sent.
  function readFriendLink() {
    var ref = params.get('play');
    if (!ref || !boardForKey(ref)) return null;
    var rawSeed = params.get('seed');
    var seed = Number(rawSeed);
    if (rawSeed === null || rawSeed === '' || !isFinite(seed)) return null;
    var h = params.get('h');
    return {
      ref: ref,
      seed: seed >>> 0,
      transposed: params.get('o') === 't',
      theirHints: h === null || h === '' || isNaN(parseInt(h, 10)) ? null : Math.max(0, parseInt(h, 10))
    };
  }

  function forgetFriendLink() {
    try {
      var q = new URLSearchParams(location.search);
      ['play', 'seed', 'o', 'h'].forEach(function (k) { q.delete(k); });
      var rest = q.toString();
      history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    } catch (e) { /* the address bar keeps the link; nothing else depends on it */ }
  }

  var invite = null;

  function showInvite(link) {
    invite = link;
    var board = boardForKey(link.ref);
    var theirs = link.theirHints === null ? ''
      : '<p>Your friend cleared it using ' + hintsText(link.theirHints) + '.</p>';
    openSheet(
      '<p class="eyebrow">A friend sent you a board</p>' +
      '<h2 id="sheet-title">' + esc(board.name) + '</h2>' +
      '<div class="new-tiles">' + board.faces.slice(0, 3).map(function (f) { return miniTile(f, 'big'); }).join('') + '</div>' +
      theirs + '<p>You get the very same tiles in the very same places. No timer, as always.</p>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-go="friend" data-autofocus>Play it now</button>' +
      '<button class="btn btn-ghost" type="button" data-close>Not now</button></div>'
    );
  }

  function playInvite() {
    var link = invite;
    if (!link) return;
    var spec = { kind: 'friend', key: 'friend', ref: link.ref, theirHints: link.theirHints };
    var saved = save.games.friend;
    var same = saved && saved.spec.ref === link.ref && saved.seed === link.seed;
    track('friend_board_start', { board: link.ref });
    startGame(spec, { seed: link.seed, transposed: link.transposed, fresh: !same });
  }

  function showFriendResult(result) {
    var mine = result.hints;
    var theirs = result.spec.theirHints;
    var line;
    if (theirs === null || theirs === undefined) line = 'You used ' + hintsText(mine) + '.';
    else if (mine === theirs) line = mine === 0 ? 'Neither of you needed a hint.' : 'You both used ' + hintsText(mine) + '.';
    else line = 'You used ' + hintsText(mine) + '. Your friend used ' + hintsText(theirs) + '.';
    openSheet(
      '<p class="eyebrow">Your friend’s board</p>' +
      '<h2 id="sheet-title">Board cleared!</h2>' +
      '<p class="question">' + esc(line) + '</p>' +
      shareBox(result, 'Send it back to your friend') +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-go="home" data-autofocus>Home</button></div>',
      { celebrate: true, onClose: function () { showView('home'); } }
    );
  }

  // ---------- Rules for each kind of board ----------

  function modeOf(board) {
    return board.grid ? 'chess' : 'classic';
  }

  var RULES = {
    classic: {
      deal: function (board, rng, transposed) { return E.deal(board.blocks, board.faces, rng, transposed); },
      matches: function (tiles) { return E.availableMatches(tiles); },
      rescue: function (tiles, board, transposed, rng) { return E.rescue(tiles, board.blocks, transposed, rng); }
    },
    chess: {
      deal: function (board, rng) { return CH.deal(board, rng); },
      matches: function (tiles, board) { return CH.availableMatches(tiles, board); },
      rescue: function (tiles, board, transposed, rng) { return CH.rescue(tiles, board, rng); }
    }
  };

  function rules() {
    return RULES[game.mode];
  }

  function currentMatches() {
    return rules().matches(game.tiles, game.board);
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

  // ---------- Portrait, always ----------

  // Like an app locked to portrait: when a phone is held sideways, the game turns with the phone
  // and stays upright for it. Tablets and computers keep their normal layout.
  var sidewaysPhone = window.matchMedia('(orientation: landscape) and (max-height: 540px) and (pointer: coarse)');

  function turnAngle() {
    var a = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle
      : typeof window.orientation === 'number' ? window.orientation : 90;
    a = ((a % 360) + 360) % 360;
    return a === 270 ? 270 : 90;
  }

  function keepPortrait() {
    var root = document.documentElement;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var turned = sidewaysPhone.matches;
    if (turned) {
      root.setAttribute('data-turned', turnAngle() === 270 ? 'right' : 'left');
      var t = w;
      w = h;
      h = t;
    } else {
      root.removeAttribute('data-turned');
    }
    root.style.setProperty('--app-w', w + 'px');
    root.style.setProperty('--app-h', h + 'px');
    root.style.setProperty('--gw', (w / 100) + 'px');
    root.style.setProperty('--gh', (h / 100) + 'px');
    root.toggleAttribute('data-short', h < 700);
    root.toggleAttribute('data-narrow', w <= 380);
    root.toggleAttribute('data-wide', w >= 640);
    layoutBoard();
  }

  function lockPortrait() {
    // Works in an installed app on Android; elsewhere the browser says no and keepPortrait() covers it.
    try {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(function () {});
    } catch (e) { /* not supported */ }
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

  var VIEWS = ['home', 'daily', 'chapters', 'album', 'game'];
  var clockTimer = null;

  function showView(name) {
    view = name;
    VIEWS.forEach(function (v) { $(v).hidden = v !== name; });
    $('tabbar').hidden = name === 'game';
    document.querySelectorAll('#tabbar .tab').forEach(function (t) {
      var on = t.dataset.view === name;
      t.classList.toggle('on', on);
      if (on) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    clearInterval(clockTimer);
    if (name === 'home') {
      renderHome();
      clockTimer = setInterval(updateClock, 1000);
    }
    if (name === 'daily') renderDailyView();
    if (name === 'chapters') renderChapters();
    if (name === 'album') renderAlbum();
  }

  function totalBoards() {
    return CHAPTERS.reduce(function (n, ch) { return n + ch.boards.length; }, 0);
  }

  function cardsCollected(chapter) {
    return Object.keys(save.cards).filter(function (k) {
      var found = save.cards[k] && lookup(k);
      return found && (!chapter || found.chapter === chapter);
    }).length;
  }

  // Boards on the main path are numbered as levels: Chapter 1 is Levels 1-6, Chapter 2 Levels 7-12.
  function levelNumber(key) {
    var n = 0;
    for (var c = 0; c < CHAPTERS.length; c++) {
      var ch = CHAPTERS[c];
      if (ch.bonus) continue;
      for (var i = 0; i < ch.boards.length; i++) {
        n++;
        if (boardKey(ch, i) === key) return n;
      }
    }
    return 0;
  }

  function boardLabel(found) {
    var level = levelNumber(found.key);
    return level ? 'Level ' + level : found.chapter.short + ' ' + (found.index + 1);
  }

  // What the big button on the home screen plays.
  function homePlay() {
    var last = save.lastPlayed && save.games[save.lastPlayed] && lookup(save.lastPlayed);
    var target = last || nextBoard();
    if (target) {
      return {
        label: boardLabel(target),
        sub: (last ? 'Resume · ' : '') + target.chapter.title + ' · ' + target.board.name,
        action: 'board:' + target.key,
        chapter: target.chapter
      };
    }
    if (!save.daily[today()]) {
      return { label: 'Today’s board', sub: 'Every level is cleared. Here is today’s daily board.', action: 'daily-play', chapter: CHAPTERS[0] };
    }
    var chess = chapterById('chess');
    return { label: 'Chess Night', sub: 'Every level is cleared and today is stamped.', action: 'chapter:chess', chapter: chess };
  }

  function renderHome() {
    var play = homePlay();
    var btn = $('play-btn');
    btn.textContent = play.label;
    btn.dataset.action = play.action;
    $('play-sub').textContent = play.sub;
    var stars = Object.keys(save.cleared).length;
    $('stars-count').textContent = stars;
    $('stars-chip').setAttribute('aria-label', stars + (stars === 1 ? ' board' : ' boards') + ' cleared. Open chapters.');
    var emblem = $('emblem');
    if (emblem.dataset.face !== play.chapter.emblem) {
      emblem.innerHTML = ART.emblem(play.chapter.emblem);
      emblem.dataset.face = play.chapter.emblem;
    }
    renderWidgets();
  }

  function widget(opts) {
    return '<button class="widget" type="button" data-go="' + opts.go + '" aria-label="' + esc(opts.aria) + '">' +
      (opts.dot ? '<span class="dot" aria-hidden="true"></span>' : '') +
      '<span class="widget-art" aria-hidden="true">' + opts.art + '</span>' +
      '<span class="widget-label">' + esc(opts.label) + '</span>' +
      '<span class="widget-sub"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' + esc(opts.sub) + '</span></button>';
  }

  // Side badges, like the event icons on Vita's home screen. They appear after the first board.
  function renderWidgets() {
    var played = Object.keys(save.cleared).length > 0 || Object.keys(save.daily).length > 0;
    var left = '';
    var right = '';
    if (played) {
      var date = today();
      var done = !!save.daily[date];
      right += widget({
        go: 'daily', label: 'Daily', art: String(parseDate(date).getDate()), dot: !done, id: 'clock', sub: done ? '' : 'New',
        aria: done ? 'Daily board, stamped today' : 'Daily board, a new board is ready'
      });
      var chess = chapterById('chess');
      if (chess && chapterUnlocked(chess)) {
        left += widget({
          go: 'chapter:chess', label: 'Chess', art: ART.face('knight'),
          sub: chapterCleared(chess) + ' of ' + chess.boards.length, aria: 'Chess Night, bonus chapter'
        });
      }
    }
    if (save.games.friend) {
      var fb = boardForKey(save.games.friend.spec.ref);
      left += widget({ go: 'friend-resume', label: 'Friend', art: ART.face(fb.faces[0]), sub: 'Resume', aria: 'Finish the board from your friend' });
    }
    $('widgets-left').innerHTML = left;
    $('widgets-right').innerHTML = right;
    updateClock();
  }

  // Once today is stamped, the daily badge counts down to the next board.
  function updateClock() {
    var el = document.getElementById('clock');
    if (!el || !save.daily[today()]) return;
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var secs = Math.max(0, Math.floor((next - now) / 1000));
    el.textContent = Math.floor(secs / 3600) + ':' + pad(Math.floor(secs / 60) % 60) + ':' + pad(secs % 60);
  }

  function chapterTab(ch, on, attr, status) {
    return '<button class="seg-tab' + (on ? ' on' : '') + '" type="button" role="tab" ' + attr + ' aria-selected="' + on + '">' +
      '<span class="tab-kicker">' + esc(ch.kicker) + '</span>' +
      '<span class="tab-name">' + esc(ch.short) + '</span>' +
      '<span class="tab-status">' + status + '</span></button>';
  }

  function renderChapters() {
    var ch = chapterById(save.tab) || CHAPTERS[0];
    $('chapter-tabs').innerHTML = CHAPTERS.map(function (c) {
      var status = chapterUnlocked(c) ? chapterCleared(c) + ' of ' + c.boards.length : ART.icon('lock') + 'Locked';
      return chapterTab(c, c === ch, 'id="tab-' + c.id + '" data-tab="' + c.id + '" aria-controls="program"', status);
    }).join('');
    var next = nextBoard();
    var unlocked = chapterUnlocked(ch);
    $('program-title').textContent = ch.title;
    $('chapter-sub').textContent = ch.blurb;

    var locked = $('chapter-locked');
    locked.hidden = unlocked;
    if (!unlocked) {
      var before = chapterById(ch.unlockAfter);
      locked.textContent = 'Finish ' + before.kicker + ', ' + before.title + ', to open this chapter.';
    }
    var done = $('chapter-done');
    done.hidden = !chapterDone(ch);
    if (!done.hidden) {
      var after = CHAPTERS.filter(function (c) { return c.unlockAfter === ch.id && !c.bonus; })[0];
      done.textContent = 'You finished this chapter.' + (after ? ' Next up: ' + after.title + '.' : '');
    }
    $('chess-howto').hidden = !(ch.mode === 'chess' && unlocked);

    $('program').setAttribute('aria-labelledby', 'tab-' + ch.id);
    $('program').innerHTML = ch.boards.map(function (b, i) {
      var found = lookup(boardKey(ch, i));
      var key = found.key;
      var open = boardUnlocked(ch, i);
      var cleared = !!save.cleared[key];
      var isNext = next && next.key === key;
      var status;
      if (save.games[key]) status = 'In progress';
      else if (cleared) status = ART.icon('star') + 'Cleared';
      else if (isNext) status = 'Up next';
      else if (!open) status = ART.icon('lock') + 'Locked';
      else status = b.tiles + (ch.mode === 'chess' ? ' pieces' : ' tiles');
      var level = levelNumber(key);
      var label = boardLabel(found) + ', ' + b.name + (cleared ? ', cleared' : open ? '' : ', locked');
      return '<li><button class="board-card' + (cleared ? ' cleared' : '') + (isNext ? ' next' : '') + '" type="button" data-board="' + key + '"' +
        (open ? '' : ' disabled') + ' aria-label="' + esc(label) + '">' +
        '<span class="board-num" aria-hidden="true">' + (level || i + 1) + '</span>' +
        '<span class="board-art' + (ch.mode === 'chess' ? ' square' : '') + '" aria-hidden="true">' + ART.face(b.cardFace) + '</span>' +
        '<span class="board-name-line">' + esc(b.name) + '</span>' +
        '<span class="board-status">' + status + '</span></button></li>';
    }).join('');
  }

  function cardArt(found, empty) {
    if (empty) {
      return '<div class="card-art card-empty"><span class="empty-mark" aria-hidden="true">?</span></div>';
    }
    var b = found.board;
    return '<div class="card-art card-' + b.cardColor + '"><div class="card-tile">' + ART.face(b.cardFace) + '</div></div>';
  }

  function renderAlbum() {
    var ch = chapterById(save.albumTab) || CHAPTERS[0];
    var total = cardsCollected();
    $('album-count').textContent = total + ' of ' + totalBoards() + ' cards collected';
    $('album-tabs').innerHTML = CHAPTERS.map(function (c) {
      return chapterTab(c, c === ch, 'id="album-tab-' + c.id + '" data-album-tab="' + c.id + '" aria-controls="album-grid"',
        cardsCollected(c) + ' of ' + c.boards.length);
    }).join('');
    $('album-grid').setAttribute('aria-labelledby', 'album-tab-' + ch.id);
    $('album-grid').innerHTML = ch.boards.map(function (b, i) {
      var found = lookup(boardKey(ch, i));
      if (!save.cards[found.key]) {
        return '<button class="album-card" type="button" disabled aria-label="' + esc(boardLabel(found)) + ' card, not collected yet">' +
          cardArt(found, true) + '<h3>' + esc(boardLabel(found)) + '</h3></button>';
      }
      return '<button class="album-card" type="button" data-card="' + found.key + '">' + cardArt(found) +
        '<h3>' + esc(b.name) + '</h3></button>';
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

  function miniBoard(piece) {
    var dots = {};
    var tiles = [{ id: 0, x: 2, y: 2, z: 0, face: piece, present: true }];
    CH.reach(tiles, 0, { grid: ['.....', '.....', '..#..', '.....', '.....'] }).forEach(function (s) {
      dots[s.x + ',' + s.y] = true;
    });
    var cells = '';
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 5; x++) {
        var dark = (x + y) % 2 ? ' dark' : '';
        var inner = x === 2 && y === 2 ? ART.face(piece) : dots[x + ',' + y] ? '<i></i>' : '';
        cells += '<span class="mb-sq' + dark + (dots[x + ',' + y] ? ' mb-dot' : '') + '">' + inner + '</span>';
      }
    }
    return '<div class="mini-board" aria-hidden="true">' + cells + '</div>';
  }

  function showChessHowTo(thenPlay) {
    openSheet(
      '<p class="eyebrow">Bonus chapter</p>' +
      '<h2 id="sheet-title">How Chess Night works</h2>' +
      '<ul class="steps">' +
      '<li><div class="step-art">' + miniTile('rook', 'square') + miniTile('rook', 'square') + '</div>' +
      '<p><strong>Every tile is a chess piece.</strong> Two matching pieces clear when one could capture the other with its chess move.</p></li>' +
      '<li><div class="step-art">' + miniBoard('rook') + '</div>' +
      '<p><strong>Tap a piece to see its moves.</strong> Dots show the squares it can reach. A glowing ring marks a twin it can capture.</p></li>' +
      '<li><div class="step-art">' + ART.icon('hint') + '</div>' +
      '<p><strong>No need to know chess.</strong> Each board introduces one piece. Hint and Undo work as always.</p></li>' +
      '</ul>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close data-autofocus>' +
      (thenPlay ? 'Let’s play' : 'Got it') + '</button></div>',
      {
        onClose: function () {
          save.seenChessHowTo = true;
          persist();
          if (thenPlay) maybeShowIntro();
        }
      }
    );
  }

  function showPieceIntro(found) {
    var fresh = found.board.newPieces;
    openSheet(
      '<p class="eyebrow">' + esc(boardLabel(found)) + ' · ' + esc(found.board.name) + '</p>' +
      '<h2 id="sheet-title">' + (fresh.length === 1 ? 'Meet the ' + esc(C.FACES[fresh[0]].toLowerCase()) : 'Meet the ' +
        fresh.map(function (p) { return esc(C.FACES[p].toLowerCase()); }).join(' and the ')) + '</h2>' +
      fresh.map(function (p) {
        return '<div class="piece-intro">' + miniBoard(p) + '<p>' + esc(C.PIECE_RULES[p]) + '</p></div>';
      }).join('') +
      '<div class="sheet-actions"><button class="btn btn-primary btn-xl" type="button" data-close data-autofocus>Let’s play</button></div>',
      {
        onClose: function () {
          save.seenIntro[found.key] = true;
          persist();
        }
      }
    );
  }

  function maybeShowIntro() {
    if (!game || game.spec.kind !== 'chapter') return;
    var found = lookup(game.spec.key);
    if (game.mode === 'chess') {
      if (!save.seenChessHowTo) showChessHowTo(true);
      else if (!save.seenIntro[found.key] && found.board.newPieces.length) showPieceIntro(found);
      return;
    }
    var fresh = newFaces(found.chapter, found.index);
    if (save.seenIntro[found.key] || !fresh.length) return;
    openSheet(
      '<p class="eyebrow">' + esc(boardLabel(found)) + ' · ' + esc(found.board.name) + '</p>' +
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
      '<p class="eyebrow">' + esc(found.chapter.kicker) + ' · ' + esc(boardLabel(found)) + ' card</p>' +
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
      '<p class="eyebrow">' + esc(boardLabel(found)) + ' cleared</p>' +
      '<h2 id="sheet-title">' + esc(found.chapter.cardTitle || 'Do you remember?') + '</h2>' + cardArt(found) +
      '<div id="quiz" class="reveal"><p class="question">' + esc(tv.q) + '</p>' +
      '<div class="answers">' + tv.options.map(function (o, i) {
        return '<button class="answer" type="button" data-answer="' + i + '">' + esc(o) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="reveal" id="reveal" hidden></div>',
      { celebrate: true, locked: true, onClose: function () { showView('home'); } }
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
      actions = '<button class="btn btn-primary btn-xl" type="button" data-go="board:' + nextKey + '" data-autofocus>Play ' +
        esc(boardLabel(lookup(nextKey))) + '</button>';
    } else {
      var after = CHAPTERS.filter(function (c) { return c.unlockAfter === ch.id; })[0];
      actions = '<p class="verdict">You finished ' + esc(ch.kicker) + '!</p>' +
        (after
          ? '<p>' + esc(after.kicker) + ', ' + esc(after.title) + ', is now open.</p>' +
            '<button class="btn btn-primary btn-xl" type="button" data-go="chapter:' + after.id + '" data-autofocus>Open ' + esc(after.kicker) + '</button>'
          : '<button class="btn btn-primary btn-xl" type="button" data-go="album" data-autofocus>See your album</button>');
    }
    actions += '<button class="btn btn-ghost" type="button" data-go="home">Home</button>';

    var reveal = $('reveal');
    reveal.innerHTML =
      '<p class="verdict">' + (right ? 'That’s right! ' : 'It was ') + esc(tv.options[tv.answer]) + (right ? '' : '.') + '</p>' +
      '<p>' + esc(tv.fact) + '</p>' +
      '<p class="collected">' + (firstCard ? 'Card added to your Movie Night album.' : 'This card is already in your album.') + '</p>' +
      '<div class="sheet-actions">' + actions + '</div>' +
      shareBox(trivia.result, 'Send this board to a friend');
    sheetLocked = false;
    // Let the green and red answers show for a moment, then swap in the result.
    setTimeout(function () {
      if (!$('quiz')) return;
      $('quiz').hidden = true;
      reveal.hidden = false;
      var focus = reveal.querySelector('[data-autofocus]');
      if (focus) focus.focus({ preventScroll: true });
    }, reducedMotion() ? 0 : 900);
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
    showView('game');
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
        : board.seed !== undefined ? board.seed
        : TEST && params.get('seed') ? Number(params.get('seed')) >>> 0 : randomSeed();
      var transposed = modeOf(board) === 'chess' ? false
        : opts.transposed !== undefined ? opts.transposed
        : E.chooseOrientation(board.blocks, space.width, space.height, TILE_ASPECT, LAYER_SHIFT, MAX_TILE);
      game = {
        spec: spec,
        transposed: transposed,
        seed: seed,
        tiles: RULES[modeOf(board)].deal(board, E.mulberry32(seed), transposed),
        history: [],
        moves: 0,
        hints: 0,
        rescues: 0
      };
      track('board_start', { board: spec.key, tiles: board.tiles });
    }
    game.board = board;
    game.mode = modeOf(board);
    game.selected = null;
    game.busy = false;
    game.rng = E.mulberry32((game.seed ^ 0x9e3779b9) + game.moves);
    if (game.mode === 'classic') game.bounds = E.bounds(E.layoutPositions(board.blocks, game.transposed));
    save.lastPlayed = spec.kind === 'chapter' ? spec.key : save.lastPlayed;

    var stats = gameStats(game.spec);
    $('stat-kind').textContent = stats.kind;
    $('stat-level').textContent = stats.value;
    $('stat-left-label').textContent = game.mode === 'chess' ? 'Pieces' : 'Tiles';
    $('board-name').textContent = stats.name;
    buildBoard();
    layoutBoard();
    render();
    persist();

    if (!save.seenHowTo && game.mode === 'classic') showHowTo(true);
    else maybeShowIntro();
  }

  function buildBoard() {
    var el = $('board');
    el.innerHTML = '';
    el.classList.toggle('chess', game.mode === 'chess');
    if (game.mode === 'chess') {
      var g = CH.size(game.board);
      var squares = document.createElement('div');
      squares.className = 'squares';
      squares.style.gridTemplateColumns = 'repeat(' + g.cols + ', minmax(0, 1fr))';
      squares.setAttribute('aria-hidden', 'true');
      for (var y = 0; y < g.rows; y++) {
        for (var x = 0; x < g.cols; x++) {
          var sq = document.createElement('span');
          sq.className = 'square' + ((x + y) % 2 ? ' dark' : '');
          sq.dataset.sq = x + ',' + y;
          squares.appendChild(sq);
        }
      }
      el.appendChild(squares);
    }
    game.tiles.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.dataset.id = t.id;
      el.appendChild(b);
    });
  }

  function tileButton(id) {
    return $('board').querySelector('.tile[data-id="' + id + '"]');
  }

  function layoutChess() {
    var space = boardSpace();
    var g = CH.size(game.board);
    var S = Math.max(28, Math.floor(Math.min(space.width / g.cols, space.height / g.rows, 104)));
    var inset = Math.round(S * 0.06);
    var el = $('board');
    el.style.width = g.cols * S + 'px';
    el.style.height = g.rows * S + 'px';
    el.style.setProperty('--sq', S + 'px');
    el.style.setProperty('--tw', (S - 2 * inset) + 'px');
    el.style.setProperty('--th', (S - 2 * inset) + 'px');
    el.style.setProperty('--edge', Math.max(3, Math.round(S * 0.05)) + 'px');
    game.tiles.forEach(function (t) {
      var btn = tileButton(t.id);
      btn.style.left = (t.x * S + inset) + 'px';
      btn.style.top = (t.y * S + inset) + 'px';
      btn.style.zIndex = String(t.y * 30 + t.x + 1);
    });
  }

  function layoutBoard() {
    if (!game) return;
    if (game.mode === 'chess') { layoutChess(); return; }
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
      var btn = tileButton(t.id);
      btn.style.left = Math.round((t.x - b.minX) / 2 * W + (b.maxZ - t.z) * ox) + 'px';
      btn.style.top = Math.round((t.y - b.minY) / 2 * H + (b.maxZ - t.z) * oy) + 'px';
      btn.style.zIndex = String(t.z * 1000 + t.y * 30 + t.x + 1);
    });
  }

  function renderChess() {
    var tiles = game.tiles;
    var sel = game.selected;
    var reach = sel === null ? [] : CH.reach(tiles, sel, game.board);
    var dots = {};
    var targets = {};
    reach.forEach(function (s) {
      if (s.id === null) dots[s.x + ',' + s.y] = true;
      else if (tiles[s.id].face === tiles[sel].face) targets[s.id] = true;
    });
    $('board').querySelectorAll('.square').forEach(function (sq) {
      sq.classList.toggle('reach', !!dots[sq.dataset.sq]);
    });
    tiles.forEach(function (t) {
      var btn = tileButton(t.id);
      if (btn.dataset.face !== t.face) {
        btn.dataset.face = t.face;
        btn.innerHTML = ART.face(t.face);
      }
      btn.hidden = !t.present;
      btn.classList.add('piece');
      btn.classList.toggle('selected', t.id === sel);
      btn.classList.toggle('match', !!targets[t.id]);
      btn.setAttribute('aria-label', C.FACES[t.face] + (targets[t.id] ? ', can be captured' : ''));
      btn.setAttribute('aria-pressed', t.id === sel ? 'true' : 'false');
    });
  }

  function render() {
    var tiles = game.tiles;
    if (game.mode === 'chess') {
      renderChess();
    } else {
      renderClassic();
    }
    $('tiles-left').textContent = String(E.remaining(tiles));
    $('matches').textContent = String(currentMatches().length);
  }

  function renderClassic() {
    var tiles = game.tiles;
    var free = {};
    E.freeTileIds(tiles).forEach(function (id) { free[id] = true; });
    var sel = game.selected;
    var selFace = sel === null ? null : tiles[sel].face;
    tiles.forEach(function (t) {
      var btn = tileButton(t.id);
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
  }

  function clearHint() {
    if (!game) return;
    clearTimeout(game.hintTimer);
    $('board').querySelectorAll('.tile.hint').forEach(function (t) { t.classList.remove('hint'); });
  }

  function nudge(btn) {
    btn.classList.remove('nudge');
    void btn.offsetWidth;
    btn.classList.add('nudge');
  }

  function onChessTap(id) {
    var t = game.tiles[id];
    var sel = game.selected;
    if (sel === id) {
      game.selected = null;
    } else if (sel !== null && game.tiles[sel].face === t.face) {
      if (CH.canMatch(game.tiles, sel, id, game.board)) {
        matchPair(sel, id);
        return;
      }
      nudge(tileButton(id));
      sound('blocked');
      toast('That ' + C.FACES[t.face].toLowerCase() + ' is out of reach. ' + C.PIECE_RULES[t.face]);
      return;
    } else {
      game.selected = id;
    }
    sound('select');
    render();
  }

  var blockedTips = 0;
  function onTileTap(id) {
    if (!game || game.busy) return;
    var t = game.tiles[id];
    if (!t || !t.present) return;
    clearHint();
    if (game.mode === 'chess') { onChessTap(id); return; }
    var btn = tileButton(id);
    if (!E.isFree(game.tiles, id)) {
      nudge(btn);
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
    tileButton(a).classList.remove('selected');
    tileButton(a).classList.add('leaving');
    tileButton(b).classList.add('leaving');
    sound('match');
    setTimeout(function () {
      if (!game) return;
      [a, b].forEach(function (id) {
        game.tiles[id].present = false;
        tileButton(id).classList.remove('leaving');
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
      if (!currentMatches().length) rescue(true);
      render();
      persist();
    }, reducedMotion() ? 40 : 240);
  }

  function rescue(auto) {
    var how = rules().rescue(game.tiles, game.board, game.transposed, game.rng);
    game.rescues++;
    if (how === 'rearranged') layoutBoard();
    track('rescue', { board: game.spec.key, auto: auto, how: how });
    if (auto) {
      var things = game.mode === 'chess' ? 'pieces' : 'tiles';
      toast(how === 'rearranged'
        ? 'No pairs were left, so the last ' + things + ' moved to fresh spots.'
        : 'No pairs were left, so the ' + things + ' were reshuffled for you.');
    } else {
      toast(game.mode === 'chess' ? 'Pieces reshuffled.' : 'Tiles reshuffled.');
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
    var moves = currentMatches();
    if (!moves.length) {
      rescue(true);
      render();
      persist();
      return;
    }
    game.selected = null;
    render();
    moves[0].forEach(function (id) { tileButton(id).classList.add('hint'); });
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
    var dailyRef = /^daily-(.+)$/.exec(refOf(finished.spec));
    if (dailyRef) stamp(dailyRef[1], result);
    persist();
    setTimeout(function () { showResult(result); }, reducedMotion() ? 0 : 350);
  }

  function showResult(result) {
    if (result.spec.kind === 'chapter') showTrivia(lookup(result.spec.key), result);
    else if (result.spec.kind === 'daily') showDailyResult(result, result.spec.key.slice(6));
    else if (result.spec.kind === 'friend') showFriendResult(result);
  }

  function leaveGame(to) {
    clearHint();
    if (game) persist();
    game = null;
    showView(to || 'home');
  }

  function go(action) {
    if (!action) return;
    if (VIEWS.indexOf(action) >= 0 && action !== 'game') leaveGame(action);
    else if (action === 'daily-play') startGame({ kind: 'daily', key: 'daily-' + today() });
    else if (action === 'friend') playInvite();
    else if (action === 'friend-resume' && save.games.friend) startGame(save.games.friend.spec);
    else if (action.indexOf('chapter:') === 0) {
      save.tab = action.slice(8);
      persist();
      leaveGame('chapters');
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

    $('play-btn').addEventListener('click', function () { go(this.dataset.action); });
    $('stars-chip').addEventListener('click', function () { showView('chapters'); });
    $('open-howto').addEventListener('click', function () { showHowTo(false); });
    $('open-settings').addEventListener('click', showSettings);
    $('home').addEventListener('click', function (e) {
      var w = e.target.closest('.widget[data-go]');
      if (w) go(w.dataset.go);
    });
    $('tabbar').addEventListener('click', function (e) {
      var t = e.target.closest('[data-view]');
      if (t) showView(t.dataset.view);
    });

    $('cal-prev').addEventListener('click', function () {
      calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
      renderDailyView();
    });
    $('cal-next').addEventListener('click', function () {
      calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
      renderDailyView();
    });
    $('daily-action').addEventListener('click', function (e) {
      if (e.target.closest('#daily-play')) go('daily-play');
    });

    function pickChapter(id) {
      save.tab = id;
      persist();
      renderChapters();
      $('tab-' + id).focus();
    }
    $('chapter-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) pickChapter(tab.dataset.tab);
    });
    $('chapter-tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = CHAPTERS.map(function (c) { return c.id; });
      var i = ids.indexOf(save.tab) + (e.key === 'ArrowRight' ? 1 : -1);
      pickChapter(ids[(i + ids.length) % ids.length]);
    });
    $('program').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-board]');
      if (btn && !btn.disabled) go('board:' + btn.dataset.board);
    });
    $('chess-howto').addEventListener('click', function () { showChessHowTo(false); });

    $('album-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-album-tab]');
      if (!tab) return;
      save.albumTab = tab.dataset.albumTab;
      persist();
      renderAlbum();
      $('album-tab-' + save.albumTab).focus();
    });
    $('album-grid').addEventListener('click', function (e) {
      var card = e.target.closest('[data-card]');
      if (card) showCard(card.dataset.card);
    });
    $('back').addEventListener('click', function () { leaveGame('home'); });

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
      var share = t.closest('[data-share]');
      if (share) { shareFrom(share.closest('.share')); return; }
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
        showView('home');
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
    window.addEventListener('resize', keepPortrait);
    window.addEventListener('orientationchange', keepPortrait);
    if (sidewaysPhone.addEventListener) sidewaysPhone.addEventListener('change', keepPortrait);
    if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', keepPortrait);
  }

  function boot(data) {
    keepPortrait();
    lockPortrait();
    save = data && data.save ? normalize(data.save) : loadSave();
    if (TEST && params.has('fresh')) save = defaultSave();
    applySettings();
    showView('home');
    var link = readFriendLink();
    if (link) {
      forgetFriendLink();
      track('friend_link_open', { board: link.ref });
      showInvite(link);
    } else if (data && data.view === 'game' && data.spec && save.games[data.spec.key]) startGame(data.spec);
    else if (data && data.view && data.view !== 'game' && VIEWS.indexOf(data.view) >= 0) showView(data.view);
  }

  wire();

  if (TEST) {
    window.__mnm = {
      engine: E,
      get game() { return game; },
      get save() { return save; },
      get trivia() { return trivia; },
      chess: CH,
      matches: function () { return game ? currentMatches() : []; },
      tileButton: tileButton
    };
  }

  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(function () {
      if (game) persist();
      return { save: save, view: view, spec: game ? game.spec : null };
    });
  }
  if (hot && hot.ready) hot.ready(boot);
  else boot(hot && hot.data);
})();
