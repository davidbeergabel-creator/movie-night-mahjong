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
    clapper: 'Clapperboard',
    jukebox: 'Jukebox',
    record: 'Record',
    burger: 'Burger',
    guitar: 'Guitar',
    mic: 'Microphone',
    skate: 'Roller skate',
    pie: 'Cherry pie',
    mug: 'Coffee',
    phone: 'Telephone',
    cone: 'Ice cream cone',
    sax: 'Saxophone',
    note: 'Music note',
    rook: 'Rook',
    bishop: 'Bishop',
    knight: 'Knight',
    king: 'King',
    pawn: 'Pawn',
    queen: 'Queen'
  };

  // How each chess piece moves, in the words the game uses to teach it.
  var PIECE_RULES = {
    rook: 'The rook moves in straight lines: up, down, left or right, as far as it likes. A piece in the way stops it.',
    bishop: 'The bishop moves diagonally, as far as it likes. A piece in the way stops it.',
    knight: 'The knight moves in an L: two squares one way, then one square to the side. It jumps over anything in between.',
    king: 'The king moves one square in any direction.',
    pawn: 'A pawn captures one square diagonally. Here, any two pawns that touch corner to corner can match.',
    queen: 'The queen moves like a rook and a bishop together: straight or diagonal, as far as she likes.'
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

  var DINER = {
    id: 'diner',
    kicker: 'Chapter 2',
    short: 'Diner',
    title: 'Rock ’n’ Roll Diner',
    blurb: 'Jukebox hits, burgers and one last dance before closing time.',
    mode: 'classic',
    unlockAfter: 'drive-in',
    boards: [
      {
        name: 'Booth for Two',
        blocks: [[0, 0, 6, 3, 0], [1, 1, 2, 2, 1], [7, 1, 2, 2, 1]],
        faces: ['jukebox', 'burger', 'record', 'phone'],
        cardFace: 'jukebox',
        cardColor: 'violet',
        trivia: {
          q: 'In the TV show Happy Days (1974–1984), what was the name of the gang’s hangout?',
          options: ['Arnold’s', 'Mel’s Diner', 'The Max', 'Monk’s Café'],
          answer: 0,
          fact: 'At Arnold’s, Fonzie could get the jukebox playing with one tap of his fist.'
        }
      },
      {
        name: 'Counter Stools',
        blocks: [[0, 0, 8, 2, 0], [2, 1, 6, 1, 1], [4, 1, 4, 1, 2],
          [1, 5, 1, 1, 0], [5, 5, 1, 1, 0], [9, 5, 1, 1, 0], [13, 5, 1, 1, 0],
          [1, 5, 1, 1, 1], [5, 5, 1, 1, 1], [9, 5, 1, 1, 1], [13, 5, 1, 1, 1]],
        faces: ['jukebox', 'burger', 'record', 'phone', 'cone', 'sax'],
        cardFace: 'record',
        cardColor: 'bulb',
        trivia: {
          q: 'Singles on a 1950s jukebox played at which speed?',
          options: ['33⅓ rpm', '45 rpm', '78 rpm', '16 rpm'],
          answer: 1,
          fact: 'RCA Victor brought out the 7-inch 45 rpm single in 1949, and jukeboxes soon switched to it.'
        }
      },
      {
        name: 'Jukebox Corner',
        blocks: [[2, 0, 5, 1, 0], [0, 2, 7, 3, 0], [2, 3, 5, 2, 1]],
        faces: ['jukebox', 'burger', 'record', 'phone', 'cone', 'sax', 'skate', 'mug'],
        cardFace: 'burger',
        cardColor: 'mint',
        trivia: {
          q: 'In American Graffiti (1973), the teenagers meet at which drive-in restaurant?',
          options: ['Mel’s Drive-In', 'Arnold’s', 'Frosty Palace', 'The Peach Pit'],
          answer: 0,
          fact: 'The whole movie takes place over one night in the summer of 1962.'
        }
      },
      {
        name: 'Malt Shop',
        blocks: [[0, 0, 8, 1, 0], [1, 2, 7, 1, 0], [2, 4, 6, 1, 0], [3, 6, 5, 1, 0],
          [1, 1, 7, 1, 1], [2, 3, 6, 1, 1], [3, 5, 5, 1, 1]],
        faces: ['jukebox', 'burger', 'record', 'phone', 'cone', 'sax', 'skate', 'mug', 'guitar', 'mic'],
        cardFace: 'pie',
        cardColor: 'dusk',
        trivia: {
          q: 'On a diner menu, what does “à la mode” mean?',
          options: ['With a scoop of ice cream', 'With whipped cream', 'Served warm', 'With a slice of cheese'],
          answer: 0,
          fact: 'Pie à la mode comes with ice cream on top. In parts of New England, apple pie is sometimes served with a slice of cheddar instead.'
        }
      },
      {
        name: 'Sock Hop',
        blocks: [[0, 0, 8, 4, 0], [1, 1, 2, 3, 1], [11, 1, 2, 3, 1], [6, 2, 2, 2, 1], [2, 2, 1, 2, 2], [12, 2, 1, 2, 2]],
        faces: ['jukebox', 'burger', 'record', 'phone', 'cone', 'sax', 'skate', 'mug', 'guitar', 'mic', 'pie', 'note'],
        cardFace: 'skate',
        cardColor: 'cherry',
        trivia: {
          q: 'Why were 1950s school dances called sock hops?',
          options: ['Dancers took off their shoes to protect the gym floor', 'Socks were given out as prizes',
            'Everyone had to wear matching socks', 'The band played in its socks'],
          answer: 0,
          fact: 'Hard shoes could scratch the varnished gym floor, so students danced in their socks.'
        }
      },
      {
        name: 'Last Dance',
        blocks: [[0, 0, 8, 4, 0], [1, 1, 7, 3, 1], [3, 2, 5, 2, 2], [7, 3, 1, 1, 3]],
        faces: ['jukebox', 'burger', 'record', 'phone', 'cone', 'sax', 'skate', 'mug', 'guitar', 'mic', 'pie', 'note'],
        cardFace: 'note',
        cardColor: 'mint',
        trivia: {
          q: 'Which 1987 movie ends with the big dance to “(I’ve Had) The Time of My Life”?',
          options: ['Footloose', 'Dirty Dancing', 'Flashdance', 'Saturday Night Fever'],
          answer: 1,
          fact: 'The song won the Academy Award for Best Original Song.'
        }
      }
    ]
  };

  // Bonus chapter. Grids: '#' is a square with a piece on it, '.' an empty square.
  var CHESS = {
    id: 'chess',
    kicker: 'Bonus',
    short: 'Chess Night',
    title: 'Chess Night',
    blurb: 'Learn the moves your grandkids play. Two matching pieces clear when one could capture the other.',
    mode: 'chess',
    bonus: true,
    unlockAfter: 'drive-in',
    cardTitle: 'Did you know?',
    boards: [
      {
        name: 'Castle Walls',
        grid: ['####', '####', '####', '####'],
        pieces: ['rook'],
        newPieces: ['rook'],
        cardFace: 'rook',
        cardColor: 'cherry',
        trivia: {
          q: 'Castling is a special move the king makes together with which piece?',
          options: ['The rook', 'The queen', 'A knight', 'A pawn'],
          answer: 0,
          fact: 'The king moves two squares toward a rook, and the rook hops over to the king’s other side.'
        }
      },
      {
        name: 'Bishop’s Path',
        grid: ['#####', '#####', '##.##', '#####', '#####'],
        pieces: ['rook', 'bishop'],
        newPieces: ['bishop'],
        cardFace: 'bishop',
        cardColor: 'violet',
        trivia: {
          q: 'A bishop that starts on a light square…',
          options: ['…stays on light squares all game', '…changes color every move', '…can change color by capturing', '…must move to a dark square first'],
          answer: 0,
          fact: 'Bishops only move diagonally, so they never leave their starting color. That’s why each side gets one bishop for each color.'
        }
      },
      {
        name: 'Knight Moves',
        grid: ['######', '#.##.#', '######', '#.##.#', '######'],
        pieces: ['rook', 'bishop', 'knight'],
        newPieces: ['knight'],
        cardFace: 'knight',
        cardColor: 'mint',
        trivia: {
          q: 'Which chess piece can jump over other pieces on an ordinary move?',
          options: ['The knight', 'The queen', 'The bishop', 'The king'],
          answer: 0,
          fact: 'A knight always lands on a square of the other color from the one it started on.'
        }
      },
      {
        name: 'Royal Court',
        grid: ['.####.', '######', '######', '######', '######', '.####.'],
        pieces: ['rook', 'bishop', 'knight', 'king', 'pawn'],
        newPieces: ['king', 'pawn'],
        cardFace: 'pawn',
        cardColor: 'bulb',
        trivia: {
          q: 'What happens when a pawn reaches the far side of the board?',
          options: ['It becomes another piece, usually a queen', 'It goes back to its starting square', 'It leaves the board', 'It becomes a king'],
          answer: 0,
          fact: 'This is called promotion. A player can even end up with two or more queens.'
        }
      },
      {
        name: 'The Queen Arrives',
        grid: ['######', '##..##', '#.##.#', '#.##.#', '##..##', '######'],
        pieces: ['rook', 'bishop', 'knight', 'king', 'pawn', 'queen'],
        newPieces: ['queen'],
        cardFace: 'queen',
        cardColor: 'dusk',
        trivia: {
          q: 'Before about 1500, how far could the piece in the queen’s place move?',
          options: ['One square diagonally', 'Anywhere in a straight line', 'Only forward', 'It could not move'],
          answer: 0,
          fact: 'The old piece, called the fers or counselor, was one of the weakest. The far-reaching modern queen appeared in Spain in the late 1400s.'
        }
      },
      {
        name: 'Checkmate',
        grid: ['######', '######', '######', '######', '######', '######'],
        pieces: ['rook', 'bishop', 'knight', 'king', 'pawn', 'queen'],
        newPieces: [],
        cardFace: 'king',
        cardColor: 'violet',
        trivia: {
          q: 'The word “checkmate” comes from a Persian phrase. What does it mean?',
          options: ['The king is helpless', 'Check, my friend', 'The last move', 'The castle has fallen'],
          answer: 0,
          fact: 'Chess traveled from India to Persia and then to Europe, and it picked up words along the way.'
        }
      }
    ]
  };

  var CHAPTERS = [DRIVE_IN, DINER, CHESS];

  // Tile count for each board, worked out from its blocks or its grid.
  CHAPTERS.forEach(function (ch) {
    ch.boards.forEach(function (b) {
      b.tiles = b.blocks
        ? b.blocks.reduce(function (n, blk) { return n + blk[2] * blk[3]; }, 0)
        : b.grid.join('').split('#').length - 1;
      b.faces = b.faces || b.pieces;
    });
  });

  var api = { FACES: FACES, PIECE_RULES: PIECE_RULES, CHAPTERS: CHAPTERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMContent = api;
})(typeof window !== 'undefined' ? window : this);
