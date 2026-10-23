# Movie Night Mahjong

A mahjong solitaire for players who want big, clear tiles, no time pressure and a real puzzle. It has a movie-night theme: two story chapters, a bonus chess chapter, and a new board every day. Clearing a chapter board earns a movie card for your album, and up to three stars.

## Play

**https://davidbeergabel-creator.github.io/movie-night-mahjong/**

You can also open `index.html` straight from a download. There's no build step and no server.

## How it's laid out

The structure follows Vita Mahjong, and no screen scrolls:

- **Home:** the marquee, a round drive-in sign, and one big **Level N** button that plays the next level or resumes one in progress. Help and settings are round buttons in the top corner, and your star count is on the left. On a hard level the button turns purple and says so. Side badges work like Vita's event icons: **Daily** (with a red dot until today's board is done, then a countdown to the next one), **Chess** and, when one is waiting, **Friend**. They appear after the first cleared board.
- **Tabs:** Home · Daily (this month's calendar and today's board) · Chapters (pick a chapter, then one of its six boards) · Album (six cards per chapter).
- **The board:** a round back button, **Level / Tiles / Matches** counters (Matches is how many pairs you can take right now), the board's name, and round **Shuffle / Hint / Undo** buttons. Shuffle and Hint show how many are left; Undo shows ∞.
- **Portrait only.** Like an app locked to portrait, the game stays upright for a phone held sideways. An installed copy (Add to Home Screen) asks the phone to lock to portrait too.

The movie chapters are numbered as one run of levels: Chapter 1 is Levels 1–6 and Chapter 2 is Levels 7–12.

## What's in it

| Chapter | Boards | Tiles | Opens |
|---|---|---|---|
| 1 · Saturday at the Drive-In | Opening Night, Ticket Booth, Snack Bar, Back Row, Double Feature, Grand Finale | 16–62 | From the start |
| 2 · Rock ’n’ Roll Diner | Booth for Two, Counter Stools, Jukebox Corner, Malt Shop, Sock Hop, Last Dance | 26–64 | After Chapter 1 |
| Bonus · Chess Night | Castle Walls, Bishop’s Path, Knight Moves, Royal Court, The Queen Arrives, Checkmate | 16–36 pieces | After Chapter 1 |

- **Chapters.** Each board opens the next. A board's new tiles are introduced before you play it. Clearing a board opens its card ("Do you remember?" for the movie chapters, "Did you know?" for chess). The card goes into the album whether you answer right or wrong.
- **Chess Night.** Every tile is a chess piece, and two matching pieces clear when one could capture the other with its chess move. Tap a piece to see where it can go: dots mark the squares it can reach, and a ring marks a twin it can capture. Each board introduces one piece with a small diagram, so you don't need to know chess.
- **Daily board.** Everyone gets the same board on the same day; the date picks the layout, the tiles and the deal. Clearing it stamps a calendar. There's no streak to lose. The daily card appears once you've cleared your first board.
- **Send a board to a friend.** After clearing a board, you can share a link. It carries the board, its seed, its orientation and how many hints and shuffles you used, so your friend gets the very same tiles. Afterwards they see how their stars compare and can send it back. Phones open their own share sheet; elsewhere the message is copied.

## How hard it is

The first version never let you lose: a dead end reshuffled itself, and help was unlimited. Now the boards are real puzzles.

- **Dead ends are real.** Every board can be cleared, but a careless match can bury a tile under its own twin. When no pairs are left, the game stops and asks what to do: go back to the last board that could still be cleared (it counts the moves for you), shuffle, or start over. Nothing reshuffles by itself.
- **Help is limited.** Each level gives 3 hints and 3 shuffles, and starting over brings a fresh set. Undo is always free. A hint shows a pair that keeps the board clearable, found by a solver that looks ahead, not just any pair. On a board that can't be cleared any more, the hint says how many moves to undo instead, and that costs nothing.
- **Stars.** Three stars for a board cleared with no hints or shuffles, two for one or two, one otherwise. Your best is kept, so there's a reason to replay a level.
- **A difficulty curve.** Each board has a target: how often a player who takes any matching pair at random gets stuck. The game deals up to 16 boards from the seed and keeps the one closest to the target. Harder targets also stack twins on top of each other more often, which is what makes a careless match costly. Like Vita's, the curve rises and dips, so a hard level is followed by a breather:

  | | Targets, level by level (**bold** = Hard) |
  |---|---|
  | Chapter 1 | 3%, 15%, 35%, **55%**, 35%, **80%** |
  | Chapter 2 | 25%, 45%, **65%**, 45%, 60%, **85%** |
  | Chess Night | 10%, 30%, 40%, 50%, 50%, **85%** (chess deals rarely go below 50%: random captures strand pieces easily) |
  | Daily board | Monday 30%, then up through the week to Saturday 85%; Friday and Saturday are Hard |

  A player who looks before matching does far better than these numbers.
- **Hard levels** are marked in purple on the cards, the home button and the board. The first one explains what's different and gives three tips.

## Built for the audience

The design follows the research on women over 55, the core mahjong solitaire audience:

- **Readable tiles.** There are 30 original drawings (24 tiles and 6 chess pieces), each with its own color *and* shape, so no two are told apart by color alone. The board picks whichever way round (wide or tall) gives the biggest tiles on the screen. On a 390px phone, tiles are 60–85px wide, and a phone held sideways gets the same portrait-sized tiles.
- **Nothing to remember.** Tiles you can't pick yet are darkened, which can be turned off. An optional setting points out the matching tile when you pick one. In Chess Night, a piece's moves are always shown when you pick it.
- **Challenging, but never a trap.** There's no timer and Undo is unlimited. Every board is dealt so it can be cleared, a dead end tells you how far back to go, and Level 1 is gentle. A shuffle always leaves a board that can be cleared; if the tiles can't be cleared where they sit (one tile stuck on top of its twin), the last tiles move to fresh spots.
- **Comfort settings.** Three text sizes and a sound switch. Animations stop when the device asks for reduced motion.
- **Something to complete.** Album cards, stars, chapter tickets and calendar stamps.
- **A first visit stays simple.** The daily board and the other chapters appear after the first board is cleared.

## Legal choices

All tile art is original. There are no photos, posters, likenesses, logos or song lyrics. The trivia names films, TV shows and facts in plain text only, and no star appears anywhere. Before launch, have a lawyer take a quick look at the trivia wording.

## Privacy

Progress is saved in your own browser (`localStorage`). Nothing is sent anywhere; a shared link carries only the board, seed, orientation and how many hints and shuffles were used. For playtests, `window.__events` in the page lists what happened (boards started and cleared with their stars, hints, shuffles, undos, dead ends and how far back they went, restarts, trivia answers, shares, opened friend links).

## Files

| File | What it does |
|---|---|
| `index.html` | The page: program, board, album |
| `css/style.css` | All styles |
| `js/content.js` | Chapters: board layouts and grids, which tiles each board uses, trivia, how chess pieces move |
| `js/engine.js` | Mahjong rules: free tiles, dealing solvable boards (with traps on harder ones), rescue |
| `js/chess.js` | Chess Night rules: piece moves, capture matching, dealing solvable boards, rescue |
| `js/puzzle.js` | How hard a deal is, picking deals to match a target, and the solver behind hints and dead ends |
| `js/art.js` | The tile and piece drawings and the interface icons |
| `js/app.js` | Screens, drawing boards, play, the daily board, shared links, saving |
| `tests/engine.test.js` | Mahjong rule tests: layouts, dealing, rescue, finishing every board |
| `tests/chess.test.js` | Chess rule tests: each piece's moves, dealing, finishing every board |
| `tests/puzzle.test.js` | Fast pair finders match the rules, trap deals can be cleared, the solver finds ways and dead ends, deal picking steers difficulty |
| `tests/e2e.cjs` | Plays through the game in a real browser by tapping tiles |

## Tests

```
npm test          # rules (Node 18+)
npm run e2e       # the game in Chromium (needs Playwright)
```

Add `?test=1` to the URL to unlock every board, and `&locks=1` to keep the locks on. Add `&seed=123` to get the same deal every time, `&fresh=1` to start from an empty save, and `&today=2026-10-22` to choose the daily board's date.
