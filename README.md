# Movie Night Mahjong

A relaxing mahjong solitaire for players who want big, clear tiles and no time pressure. It has a movie-night theme: two story chapters, a bonus chess chapter, and a new board every day. Clearing a chapter board earns a movie card for your album.

## Play

**https://davidbeergabel-creator.github.io/movie-night-mahjong/**

You can also open `index.html` straight from a download. There's no build step and no server.

## What's in it

| Chapter | Boards | Tiles | Opens |
|---|---|---|---|
| 1 · Saturday at the Drive-In | Opening Night, Ticket Booth, Snack Bar, Back Row, Double Feature, Grand Finale | 16–62 | From the start |
| 2 · Rock ’n’ Roll Diner | Booth for Two, Counter Stools, Jukebox Corner, Malt Shop, Sock Hop, Last Dance | 26–64 | After Chapter 1 |
| Bonus · Chess Night | Castle Walls, Bishop’s Path, Knight Moves, Royal Court, The Queen Arrives, Checkmate | 16–36 pieces | After Chapter 1 |

- **Chapters.** Each board opens the next. A board's new tiles are introduced before you play it. Clearing a board opens its card ("Do you remember?" for the movie chapters, "Did you know?" for chess). The card goes into the album whether you answer right or wrong.
- **Chess Night.** Every tile is a chess piece, and two matching pieces clear when one could capture the other with its chess move. Tap a piece to see where it can go: dots mark the squares it can reach, and a ring marks a twin it can capture. Each board introduces one piece with a small diagram, so you don't need to know chess.
- **Daily board.** Everyone gets the same board on the same day; the date picks the layout, the tiles and the deal. Clearing it stamps a calendar. There's no streak to lose. The daily card appears once you've cleared your first board.
- **Send a board to a friend.** After clearing a board, you can share a link. It carries the board, its seed, its orientation and how many hints you used, so your friend gets the very same tiles. Afterwards they see how their hints compare and can send it back. Phones open their own share sheet; elsewhere the message is copied.

## Built for the audience

The design follows the research on women over 55, the core mahjong solitaire audience:

- **Readable tiles.** There are 30 original drawings (24 tiles and 6 chess pieces), each with its own color *and* shape, so no two are told apart by color alone. The board picks whichever way round (wide or tall) gives the biggest tiles on the screen. On a 390px phone, tiles are 62–85px wide. A phone held sideways moves the tools to the side.
- **Nothing to remember.** Tiles you can't pick yet are darkened, which can be turned off. An optional setting points out the matching tile when you pick one. In Chess Night, a piece's moves are always shown when you pick it.
- **Forgiving play.** There's no timer, Undo and Hint are unlimited, and Shuffle is free. Every board is dealt so it can be cleared. If you reach a dead end, the tiles reshuffle for you. If the tiles can't be cleared where they sit (one tile stuck on top of its twin), the last tiles move to fresh spots.
- **Comfort settings.** Three text sizes and a sound switch. Animations stop when the device asks for reduced motion.
- **Something to complete.** Album cards, chapter tickets and calendar stamps.
- **A first visit stays simple.** The daily board and the other chapters appear after the first board is cleared.

## Legal choices

All tile art is original. There are no photos, posters, likenesses, logos or song lyrics. The trivia names films, TV shows and facts in plain text only, and no star appears anywhere. Before launch, have a lawyer take a quick look at the trivia wording.

## Privacy

Progress is saved in your own browser (`localStorage`). Nothing is sent anywhere; a shared link carries only the board, seed, orientation and hint count. For playtests, `window.__events` in the page lists what happened (boards started and cleared, hints, undos, rescues, trivia answers, shares, opened friend links).

## Files

| File | What it does |
|---|---|
| `index.html` | The page: program, board, album |
| `css/style.css` | All styles |
| `js/content.js` | Chapters: board layouts and grids, which tiles each board uses, trivia, how chess pieces move |
| `js/engine.js` | Mahjong rules: free tiles, dealing solvable boards, hints, rescue |
| `js/chess.js` | Chess Night rules: piece moves, capture matching, dealing solvable boards, rescue |
| `js/art.js` | The tile and piece drawings and the interface icons |
| `js/app.js` | Screens, drawing boards, play, the daily board, shared links, saving |
| `tests/engine.test.js` | Mahjong rule tests: layouts, dealing, rescue, finishing every board |
| `tests/chess.test.js` | Chess rule tests: each piece's moves, dealing, finishing every board |
| `tests/e2e.cjs` | Plays through the game in a real browser by tapping tiles |

## Tests

```
npm test          # rules (Node 18+)
npm run e2e       # the game in Chromium (needs Playwright)
```

Add `?test=1` to the URL to unlock every board, and `&locks=1` to keep the locks on. Add `&seed=123` to get the same deal every time, `&fresh=1` to start from an empty save, and `&today=2026-10-22` to choose the daily board's date.
