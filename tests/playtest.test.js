'use strict';
const test = require('node:test');
const assert = require('node:assert');
const PT = require('../js/playtest.js');

const at = (min) => new Date(Date.UTC(2026, 9, 26, 10, min)).toISOString();
const names = { 'drive-in-1': 'Level 1 · Opening Night', 'drive-in-4': 'Level 4 · Back Row' };
const describe = (k) => names[k] || k;

test('notes sum up each board and point at moments worth asking about', () => {
  const log = [
    { event: 'session', at: at(0), w: 390, h: 844, turned: false, text: 'large' },
    { event: 'view', at: at(0), name: 'game' },
    { event: 'board_start', at: at(1), board: 'drive-in-1' },
    { event: 'blocked_tap', at: at(2), board: 'drive-in-1' },
    { event: 'hint', at: at(3), board: 'drive-in-1' },
    { event: 'undo', at: at(3), board: 'drive-in-1', moves: 2 },
    { event: 'board_clear', at: at(6), board: 'drive-in-1', stars: 2, hints: 1, shuffles: 0 },
    { event: 'trivia_answer', at: at(7), board: 'drive-in-1', correct: true },
    { event: 'board_start', at: at(8), board: 'drive-in-4' },
    { event: 'stuck', at: at(12), board: 'drive-in-4' },
    { event: 'stuck', at: at(15), board: 'drive-in-4' },
    { event: 'help_out', at: at(16), board: 'drive-in-4', what: 'hints' },
    { event: 'board_leave', at: at(20), board: 'drive-in-4', tilesLeft: 18, moves: 15 },
    { event: 'setting', at: at(21), name: 'text size', value: 'largest' }
  ];
  const notes = PT.summary(log, describe);
  assert.match(notes, /^Movie Night Mahjong playtest notes/);
  assert.match(notes, /21 minutes, 1 visit/);
  assert.match(notes, /Screen 390 x 844, text size large/);
  assert.match(notes, /1 cleared of 2 played/);
  assert.match(notes, /Level 1 · Opening Night: cleared, 2 stars; about 6 minutes; 1 hint, 0 shuffles, 2 undos; tapped blocked tiles 1 time\./);
  assert.match(notes, /Level 4 · Back Row: left unfinished with 18 tiles on the board; about 12 minutes; stuck 2 times/);
  assert.match(notes, /Trivia: 1 right of 1/);
  assert.match(notes, /Settings changed: text size to largest/);
  assert.match(notes, /Got stuck 2 times on Level 4 · Back Row/);
  assert.match(notes, /Left Level 4 · Back Row unfinished/);
  assert.match(notes, /Ran out of hints or shuffles on Level 4/);
  assert.match(notes, /Never opened the Daily tab/);
  const raw = JSON.parse(notes.split('--- Raw log, for analysis ---\n')[1]);
  assert.strictEqual(raw.length, log.length, 'the raw log comes along');
});

test('an empty log says so', () => {
  assert.match(PT.summary([], describe), /Nothing was played yet/);
});
