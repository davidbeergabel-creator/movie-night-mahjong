/* Movie Night Mahjong: chapters, boards and trivia.
 * Layout blocks are [x, y, cols, rows, layer] in half-tile units (see engine.js).
 * difficulty is how often a player who takes any pair at random would get stuck (0 to 1); each
 * deal is picked to come close to it. hard marks the Hard levels, which get a warning and tips.
 * Trivia answers are shown in a random order; ordered: true keeps a number scale smallest to largest.
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
    rose: 'Red rose',
    chocolates: 'Box of chocolates',
    letter: 'Love letter',
    ring: 'Diamond ring',
    champagne: 'Champagne',
    umbrella: 'Umbrella',
    candle: 'Candle',
    perfume: 'Perfume',
    heels: 'Dancing shoe',
    tower: 'Eiffel Tower',
    lipstick: 'Lipstick',
    gift: 'Gift box',
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
    emblem: 'car',
    kicker: 'Chapter 1',
    short: 'Drive-In',
    title: 'Saturday at the Drive-In',
    blurb: 'Popcorn, convertibles and a double feature under the stars.',
    mode: 'classic',
    boards: [
      {
        name: 'Opening Night',
        difficulty: 0.03,
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
        difficulty: 0.15,
        blocks: [[0, 0, 5, 4, 0], [3, 2, 2, 2, 1]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star'],
        cardFace: 'ticket',
        cardColor: 'cherry',
        trivia: {
          q: 'At the height of the craze, around 1958, about how many drive-ins were there in the US?',
          options: ['About 400', 'About 1,500', 'About 4,000', 'About 12,000'],
          ordered: true,
          answer: 2,
          fact: 'There were more than 4,000 drive-ins in the late 1950s. Today only a few hundred are still open.'
        }
      },
      {
        name: 'Snack Bar',
        difficulty: 0.35,
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
        difficulty: 0.55,
        hard: true,
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
        difficulty: 0.35,
        blocks: [[0, 0, 8, 4, 0], [1, 1, 3, 3, 1], [9, 1, 3, 3, 1], [2, 2, 2, 2, 2], [10, 2, 2, 2, 2]],
        faces: ['car', 'ticket', 'popcorn', 'soda', 'hotdog', 'star', 'moon', 'shake', 'reel', 'glasses', 'sign', 'clapper'],
        cardFace: 'reel',
        cardColor: 'violet',
        trivia: {
          q: 'In Back to the Future (1985), how fast does the DeLorean have to go to travel through time?',
          options: ['55 miles per hour', '88 miles per hour', '99 miles per hour', '121 miles per hour'],
          ordered: true,
          answer: 1,
          fact: 'It also needs 1.21 gigawatts of power. Doc Brown first gets it from plutonium, and later from a bolt of lightning.'
        }
      },
      {
        name: 'Grand Finale',
        difficulty: 0.8,
        hard: true,
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
    emblem: 'jukebox',
    kicker: 'Chapter 2',
    short: 'Diner',
    title: 'Rock ’n’ Roll Diner',
    blurb: 'Jukebox hits, burgers and one last dance before closing time.',
    mode: 'classic',
    unlockAfter: 'drive-in',
    boards: [
      {
        name: 'Booth for Two',
        difficulty: 0.25,
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
        difficulty: 0.45,
        blocks: [[0, 0, 8, 2, 0], [2, 1, 6, 1, 1], [4, 1, 4, 1, 2],
          [1, 5, 1, 1, 0], [5, 5, 1, 1, 0], [9, 5, 1, 1, 0], [13, 5, 1, 1, 0],
          [1, 5, 1, 1, 1], [5, 5, 1, 1, 1], [9, 5, 1, 1, 1], [13, 5, 1, 1, 1]],
        faces: ['jukebox', 'burger', 'record', 'phone', 'cone', 'sax'],
        cardFace: 'record',
        cardColor: 'bulb',
        trivia: {
          q: 'Singles on a 1950s jukebox played at which speed?',
          options: ['16 rpm', '33⅓ rpm', '45 rpm', '78 rpm'],
          ordered: true,
          answer: 2,
          fact: 'RCA Victor brought out the 7-inch 45 rpm single in 1949, and jukeboxes soon switched to it.'
        }
      },
      {
        name: 'Jukebox Corner',
        difficulty: 0.65,
        hard: true,
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
        difficulty: 0.45,
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
        difficulty: 0.6,
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
        difficulty: 0.85,
        hard: true,
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
  var ROMANCE = {
    id: 'romance',
    emblem: 'rose',
    kicker: 'Chapter 3',
    short: 'Romance',
    title: 'Romance at the Movies',
    blurb: 'Roses, champagne and the great love stories of the silver screen.',
    mode: 'classic',
    unlockAfter: 'diner',
    boards: [
      {
        name: 'First Date',
        difficulty: 0.3,
        blocks: [[0, 0, 6, 4, 0], [3, 2, 3, 2, 1]],
        faces: ['rose', 'letter', 'champagne', 'ring'],
        cardFace: 'rose',
        cardColor: 'cherry',
        trivia: {
          q: 'Audrey Hepburn won the Oscar for Best Actress for her first leading role in a Hollywood film. Which film was it?',
          options: ['Roman Holiday', 'Sabrina', 'Breakfast at Tiffany’s', 'My Fair Lady'],
          answer: 0,
          fact: 'In Roman Holiday (1953) she plays a princess who slips away for a day in Rome and rides through the city on a Vespa with Gregory Peck.'
        }
      },
      {
        name: 'Dinner for Two',
        difficulty: 0.45,
        blocks: [[0, 0, 3, 4, 0], [8, 0, 3, 4, 0], [1, 1, 2, 3, 1], [9, 1, 2, 3, 1]],
        faces: ['rose', 'letter', 'champagne', 'ring', 'candle', 'chocolates'],
        cardFace: 'candle',
        cardColor: 'bulb',
        trivia: {
          q: 'In Disney’s Lady and the Tramp (1955), what do the two dogs share for dinner by candlelight?',
          options: ['Spaghetti and meatballs', 'A steak', 'A pizza', 'A plate of sausages'],
          answer: 0,
          fact: 'They eat behind Tony’s restaurant while Tony and Joe serenade them with “Bella Notte.”'
        }
      },
      {
        name: 'Rainy Day',
        difficulty: 0.4,
        blocks: [[4, 0, 2, 1, 0], [2, 2, 4, 1, 0], [0, 4, 6, 2, 0], [5, 8, 1, 3, 0],
          [4, 1, 2, 1, 1], [2, 3, 4, 1, 1], [1, 5, 5, 1, 1], [4, 2, 2, 1, 2], [3, 4, 3, 1, 2], [5, 3, 1, 1, 3]],
        faces: ['rose', 'letter', 'champagne', 'ring', 'candle', 'chocolates', 'umbrella', 'perfume'],
        cardFace: 'umbrella',
        cardColor: 'dusk',
        trivia: {
          q: 'Who splashes through the puddles singing the title song in Singin’ in the Rain (1952)?',
          options: ['Gene Kelly', 'Fred Astaire', 'Donald O’Connor', 'Frank Sinatra'],
          answer: 0,
          fact: 'Gene Kelly also directed the film, together with Stanley Donen.'
        }
      },
      {
        name: 'Paris in Spring',
        difficulty: 0.65,
        hard: true,
        blocks: [[4, 0, 2, 2, 0], [2, 4, 4, 2, 0], [0, 8, 6, 1, 0], [0, 10, 2, 1, 0], [8, 10, 2, 1, 0],
          [5, 1, 1, 2, 1], [3, 5, 3, 2, 1], [1, 9, 1, 1, 1], [9, 9, 1, 1, 1], [4, 6, 2, 1, 2]],
        faces: ['rose', 'letter', 'champagne', 'ring', 'candle', 'chocolates', 'umbrella', 'perfume', 'tower', 'heels'],
        cardFace: 'tower',
        cardColor: 'violet',
        trivia: {
          q: 'Which famous line is never actually spoken in Casablanca (1942)?',
          options: ['“Play it again, Sam”', '“Here’s looking at you, kid”', '“We’ll always have Paris”', '“Round up the usual suspects”'],
          answer: 0,
          fact: 'Ilsa says “Play it, Sam,” and Rick later says “Play it!” But nobody in the film says “Play it again, Sam.”'
        }
      },
      {
        name: 'Sweethearts',
        difficulty: 0.55,
        blocks: [[0, 0, 2, 1, 0], [8, 0, 2, 1, 0], [0, 2, 6, 3, 0], [2, 8, 4, 1, 0], [4, 10, 2, 1, 0],
          [1, 1, 1, 1, 1], [9, 1, 1, 1, 1], [1, 3, 5, 2, 1], [3, 7, 3, 1, 1], [5, 9, 1, 1, 1], [2, 4, 4, 1, 2], [4, 6, 2, 1, 2]],
        faces: ['rose', 'letter', 'champagne', 'ring', 'candle', 'chocolates', 'umbrella', 'perfume', 'tower', 'heels', 'lipstick', 'gift'],
        cardFace: 'ring',
        cardColor: 'mint',
        trivia: {
          q: 'Which song does Audrey Hepburn sing on her fire escape in Breakfast at Tiffany’s (1961)?',
          options: ['Moon River', 'As Time Goes By', 'Over the Rainbow', 'Unchained Melody'],
          answer: 0,
          fact: '“Moon River,” by Henry Mancini and Johnny Mercer, won the Oscar for Best Original Song.'
        }
      },
      {
        name: 'Happily Ever After',
        difficulty: 0.88,
        hard: true,
        blocks: [[4, 0, 2, 1, 0], [2, 2, 4, 2, 0], [0, 6, 6, 4, 0], [5, 0, 1, 1, 1], [3, 3, 3, 1, 1], [1, 7, 5, 3, 1],
          [4, 3, 2, 1, 2], [2, 8, 4, 2, 2], [3, 9, 3, 1, 3]],
        faces: ['rose', 'letter', 'champagne', 'ring', 'candle', 'chocolates', 'umbrella', 'perfume', 'tower', 'heels', 'lipstick', 'gift'],
        cardFace: 'champagne',
        cardColor: 'cherry',
        trivia: {
          q: 'In An Affair to Remember (1957), where do the two lovers promise to meet in six months?',
          options: ['At the top of the Empire State Building', 'Under the clock at Grand Central', 'On the Brooklyn Bridge', 'At the Eiffel Tower'],
          answer: 0,
          fact: 'Cary Grant and Deborah Kerr star in it, and Sleepless in Seattle (1993) pays tribute to the very same meeting place.'
        }
      }
    ]
  };

  var CHESS = {
    id: 'chess',
    emblem: 'knight',
    kicker: 'Bonus',
    short: 'Chess',
    title: 'Chess Night',
    blurb: 'Learn the moves your grandkids play. Two matching pieces clear when one could capture the other.',
    mode: 'chess',
    bonus: true,
    unlockAfter: 'drive-in',
    cardTitle: 'Did you know?',
    boards: [
      {
        name: 'Castle Walls',
        difficulty: 0.1,
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
        difficulty: 0.3,
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
        difficulty: 0.4,
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
        difficulty: 0.5,
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
        difficulty: 0.5,
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
        difficulty: 0.85,
        hard: true,
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

  var CHAPTERS = [DRIVE_IN, DINER, ROMANCE, CHESS];

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
