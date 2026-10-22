/* Movie Night Mahjong: chapters, boards and trivia.
 * Layout blocks are [x, y, cols, rows, layer] in half-tile units (see engine.js).
 * Trivia names films and facts in text only. No photos, posters, likenesses or lyrics.
 */
(function (root) {
  'use strict';

  var FACES = {
    popcorn: 'Popcorn',
    ticket: 'Ticket',
    car: 'Convertible',
    soda: 'Soda',
    hotdog: 'Hot dog',
    star: 'Gold star',
    moon: 'Moon',
    shake: 'Milkshake',
    reel: 'Film reel',
    glasses: '3D glasses',
    sign: 'Arrow sign',
    clapper: 'Clapperboard'
  };

  var DRIVE_IN = {
    id: 'drive-in',
    kicker: 'Chapter 1',
    short: 'Drive-In',
    title: 'Saturday at the Drive-In',
    blurb: 'Popcorn, convertibles and a double feature under the stars.',
    mode: 'classic',
    boards: [
      {
        name: 'Opening Night',
        blocks: [[0, 0, 4, 3, 0], [2, 1, 2, 2, 1]],
        faces: ['car', 'ticket', 'popcorn', 'soda'],
        cardFace: 'car',
        cardColor: 'mint',
        trivia: {
          q: 'The first drive-in theater opened in 1933. Which state was it in?',
          options: ['New Jersey', 'California', 'Texas', 'Florida'],
          answer: 0,
          fact: 'Richard Hollingshead opened it near Camden, New Jersey, in June 1933. He first tried the idea at home, with a projector on the hood of his car and a screen nailed between trees.'
        }
      },
      {
        name: 'Ticket Booth',
        blocks: [[0, 0, 5, 4, 0], [3, 2, 2, 2, 1]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star'],
        cardFace: 'ticket',
        cardColor: 'cherry',
        trivia: {
          q: 'At the height of the craze, around 1958, about how many drive-ins were there in the US?',
          options: ['About 400', 'About 1,500', 'About 4,000', 'About 12,000'],
          answer: 2,
          fact: 'There were more than 4,000 drive-ins in the late 1950s. Today only a few hundred are still open.'
        }
      },
      {
        name: 'Snack Bar',
        blocks: [[0, 0, 6, 4, 0], [2, 1, 4, 3, 1]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star', 'moon', 'shake'],
        cardFace: 'popcorn',
        cardColor: 'bulb',
        trivia: {
          q: 'In Grease (1978), Danny and Sandy have a date at the drive-in. What is the name of their high school?',
          options: ['Rydell High', 'Ridgemont High', 'Shermer High', 'Bayside High'],
          answer: 0,
          fact: 'The date goes badly. Sandy walks out, and Danny is left alone in the car, singing to the big screen.'
        }
      },
      {
        name: 'Back Row',
        blocks: [[0, 0, 7, 4, 0], [1, 1, 6, 3, 1], [5, 3, 2, 1, 2]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star', 'moon', 'shake', 'reel', 'glasses'],
        cardFace: 'moon',
        cardColor: 'dusk',
        trivia: {
          q: 'Which 1975 summer movie made people afraid to go into the water?',
          options: ['The Deep', 'Jaws', 'Orca', 'Piranha'],
          answer: 1,
          fact: 'Jaws opened in June 1975. It is often called the first summer blockbuster.'
        }
      },
      {
        name: 'Double Feature',
        blocks: [[0, 0, 8, 4, 0], [1, 1, 3, 3, 1], [9, 1, 3, 3, 1], [2, 2, 2, 2, 2], [10, 2, 2, 2, 2]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star', 'moon', 'shake', 'reel', 'glasses', 'sign', 'clapper'],
        cardFace: 'reel',
        cardColor: 'violet',
        trivia: {
          q: 'In Back to the Future (1985), how fast does the DeLorean have to go to travel through time?',
          options: ['55 miles per hour', '88 miles per hour', '99 miles per hour', '121 miles per hour'],
          answer: 1,
          fact: 'It also needs 1.21 gigawatts of power. Doc Brown first gets it from plutonium, and later from a bolt of lightning.'
        }
      },
      {
        name: 'Grand Finale',
        blocks: [[0, 0, 8, 4, 0], [2, 1, 6, 3, 1], [4, 2, 4, 2, 2], [6, 2, 2, 2, 3]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star', 'moon', 'shake', 'reel', 'glasses', 'sign', 'clapper'],
        cardFace: 'star',
        cardColor: 'cherry',
        trivia: {
          q: 'In E.T. the Extra-Terrestrial (1982), what candy does Elliott use to lead E.T. into the house?',
          options: ['M&M’s', 'Jelly beans', 'Reese’s Pieces', 'Gumdrops'],
          answer: 2,
          fact: 'Sales of Reese’s Pieces jumped after the movie came out.'
        }
      }
    ]
  };

  var CHAPTERS = [DRIVE_IN];

  // Tile count for each board, worked out from its blocks.
  CHAPTERS.forEach(function (ch) {
    ch.boards.forEach(function (b) {
      b.tiles = b.blocks.reduce(function (n, blk) { return n + blk[2] * blk[3]; }, 0);
    });
  });

  var api = { FACES: FACES, CHAPTERS: CHAPTERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMContent = api;
})(typeof window !== 'undefined' ? window : this);
