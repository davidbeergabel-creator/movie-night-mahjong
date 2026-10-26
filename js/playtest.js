/* Movie Night Mahjong: playtest notes.
 *
 * In playtest mode (?playtest=1) the game keeps a log of what happened on the phone. This turns
 * that log into notes a facilitator can read at a glance, followed by the raw log for analysis.
 * Nothing is sent anywhere: the facilitator copies or downloads the notes from Settings.
 */
(function (root) {
  'use strict';

  function minutes(ms) {
    var m = Math.round(ms / 60000);
    return m < 1 ? 'under a minute' : m === 1 ? '1 minute' : m + ' minutes';
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function clock(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // What happened on each board, in the order the boards were first played.
  function boardsFrom(log) {
    var boards = {};
    var order = [];
    log.forEach(function (e) {
      if (!e.board) return;
      var b = boards[e.board];
      if (!b) {
        b = boards[e.board] = {
          key: e.board, first: e.at, last: e.at, starts: 0, clears: [], stuck: 0, restarts: 0,
          hints: 0, shuffles: 0, undos: 0, blocked: 0, deadEndHints: 0, ranOut: 0, leftWith: null
        };
        order.push(b);
      }
      b.last = e.at;
      switch (e.event) {
        case 'board_start': case 'board_resume': b.starts++; break;
        case 'board_clear': b.clears.push(e); b.leftWith = null; break;
        case 'stuck': b.stuck++; break;
        case 'restart': b.restarts++; break;
        case 'hint': b.hints++; break;
        case 'hint_dead_end': b.deadEndHints++; break;
        case 'shuffle': b.shuffles++; break;
        case 'undo': b.undos += e.moves || 1; break;
        case 'blocked_tap': b.blocked++; break;
        case 'help_out': b.ranOut++; break;
        case 'board_leave': b.leftWith = e.tilesLeft; break;
      }
    });
    return order;
  }

  function boardLine(b, describe) {
    var parts = [];
    var spent = minutes(new Date(b.last) - new Date(b.first));
    if (b.clears.length) {
      var c = b.clears[b.clears.length - 1];
      parts.push('cleared' + (b.clears.length > 1 ? ' ' + b.clears.length + ' times' : '') + ', ' + plural(c.stars, 'star'));
    } else if (b.leftWith !== null) {
      parts.push('left unfinished with ' + plural(b.leftWith, 'tile') + ' on the board');
    } else {
      parts.push('not finished');
    }
    parts.push('about ' + spent);
    if (b.stuck) parts.push('stuck ' + plural(b.stuck, 'time'));
    if (b.restarts) parts.push('started over ' + plural(b.restarts, 'time'));
    parts.push(plural(b.hints, 'hint') + ', ' + plural(b.shuffles, 'shuffle') + ', ' + plural(b.undos, 'undo'));
    if (b.blocked) parts.push('tapped blocked tiles ' + plural(b.blocked, 'time'));
    return '- ' + describe(b.key) + ': ' + parts.join('; ') + '.';
  }

  // Moments worth asking the player about after the session.
  function moments(boards, log, describe) {
    var out = [];
    boards.forEach(function (b) {
      var name = describe(b.key);
      if (b.stuck >= 2) out.push('Got stuck ' + plural(b.stuck, 'time') + ' on ' + name + '. How did that feel? What did you try?');
      if (!b.clears.length && b.leftWith !== null) out.push('Left ' + name + ' unfinished. Why did you stop there?');
      if (b.blocked >= 5) out.push('Tapped blocked tiles ' + plural(b.blocked, 'time') + ' on ' + name + '. Was it clear which tiles you could pick?');
      if (b.ranOut) out.push('Ran out of hints or shuffles on ' + name + '. What did you do next?');
      if (b.restarts >= 2) out.push('Started ' + name + ' over ' + plural(b.restarts, 'time') + '. Too hard, or a fresh try?');
    });
    var opened = function (name) { return log.some(function (e) { return e.event === 'view' && e.name === name; }); };
    if (!opened('daily')) out.push('Never opened the Daily tab. Did you notice it?');
    if (!opened('album')) out.push('Never opened the Album. Did you notice the movie cards?');
    var hints = log.filter(function (e) { return e.event === 'hint'; }).length;
    if (!hints && boards.length) out.push('Never used a hint. Did you see the Hint button?');
    return out;
  }

  // log: the playtest events, oldest first. describe(key): a readable name for a board.
  function summary(log, describe) {
    var lines = ['Movie Night Mahjong playtest notes'];
    if (!log.length) return lines.concat(['', 'Nothing was played yet.']).join('\n');
    var first = log[0].at;
    var last = log[log.length - 1].at;
    var sessions = log.filter(function (e) { return e.event === 'session'; });
    var screen = sessions.length ? sessions[sessions.length - 1] : {};
    lines.push('From ' + clock(first) + ' to ' + clock(last) + ' (' + minutes(new Date(last) - new Date(first)) +
      ', ' + plural(Math.max(1, sessions.length), 'visit') + ')');
    if (screen.w) lines.push('Screen ' + screen.w + ' x ' + screen.h + (screen.turned ? ', held sideways' : '') + ', text size ' + screen.text);

    var boards = boardsFrom(log);
    lines.push('', 'Boards (' + boards.filter(function (b) { return b.clears.length; }).length + ' cleared of ' + boards.length + ' played)');
    boards.forEach(function (b) { lines.push(boardLine(b, describe)); });

    var trivia = log.filter(function (e) { return e.event === 'trivia_answer'; });
    if (trivia.length) {
      lines.push('', 'Trivia: ' + trivia.filter(function (e) { return e.correct; }).length + ' right of ' + trivia.length);
    }
    var settings = log.filter(function (e) { return e.event === 'setting'; });
    if (settings.length) {
      lines.push('Settings changed: ' + settings.map(function (e) { return e.name + ' to ' + e.value; }).join(', '));
    }
    var shares = log.filter(function (e) { return e.event === 'share'; }).length;
    if (shares) lines.push('Shared a board ' + plural(shares, 'time'));

    var ask = moments(boards, log, describe);
    if (ask.length) {
      lines.push('', 'Moments to ask about');
      ask.forEach(function (m) { lines.push('- ' + m); });
    }
    lines.push('', '--- Raw log, for analysis ---', JSON.stringify(log));
    return lines.join('\n');
  }

  var api = { summary: summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMPlaytest = api;
})(typeof window !== 'undefined' ? window : this);
