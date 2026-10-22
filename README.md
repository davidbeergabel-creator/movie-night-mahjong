# Movie Night Mahjong

A relaxing mahjong solitaire for players who want big, clear tiles and no time pressure. It has a movie-night theme. Chapter 1, **Saturday at the Drive-In**, has six boards. Clearing a board earns a "Do you remember?" movie card for your album.

## Play

**https://davidbeergabel-creator.github.io/movie-night-mahjong/**

You can also open `index.html` straight from a download. There's no build step and no server.

## What's in Chapter 1

| Board | Name | Tiles | New tiles |
|---|---|---|---|
| 1 | Opening Night | 16 | Convertible, Ticket, Popcorn, Soda |
| 2 | Ticket Booth | 24 | Hot dog, Gold star |
| 3 | Snack Bar | 36 | Moon, Milkshake |
| 4 | Back Row | 48 | Film reel, 3D glasses |
| 5 | Double Feature | 58 | Arrow sign, Clapperboard |
| 6 | Grand Finale | 62 | (all twelve) |

Each board unlocks the next. Clearing a board opens its trivia card. Whether you answer right or wrong, the card goes into the Movie Night album.

## Built for the audience

The design follows the research on women over 55, the core mahjong solitaire audience:

- **Readable tiles.** There are twelve original drawings, each with its own color *and* shape, so no two tiles are told apart by color alone. The board picks whichever way round (wide or tall) gives the biggest tiles on the screen. On a 390px phone, tiles are 62–85px wide. A phone held sideways moves the tools to the side.
- **Nothing to remember.** Tiles you can't pick yet are darkened, which can be turned off. An optional setting points out the matching tile when you pick one.
- **Forgiving play.** There's no timer, Undo and Hint are unlimited, and Shuffle is free. Every board is dealt so it can be cleared. If you reach a dead end, the tiles reshuffle for you. If the tiles can't be cleared where they sit (one tile stuck on top of its twin), the last tiles move to fresh spots.
- **Comfort settings.** Three text sizes and a sound switch. Animations stop when the device asks for reduced motion.
- **Something to complete.** Every board gives one album card.

## Legal choices

All tile art is original. There are no photos, posters, likenesses, logos or song lyrics. The trivia names films and facts in plain text only, and no star appears anywhere. Before launch, have a lawyer take a quick look at the trivia wording.

## Privacy

Progress is saved in your own browser (`localStorage`). Nothing is sent anywhere. For playtests, `window.__events` in the page lists what happened (boards started and cleared, hints, undos, rescues, trivia answers).

## Files

| File | What it does |
|---|---|
| `index.html` | The page: program, board, album |
| `css/style.css` | All styles |
| `js/content.js` | Chapter data: board layouts, which tiles each board uses, trivia |
| `js/engine.js` | Rules: free tiles, dealing solvable boards, hints, rescue |
| `js/art.js` | The twelve tile drawings and the interface icons |
| `js/app.js` | Screens, drawing the board, play, saving |
| `tests/engine.test.js` | Rule tests: layouts, dealing, rescue, finishing every board |
| `tests/e2e.cjs` | Plays the whole chapter in a real browser by tapping tiles |

## Tests

```
npm test          # rules (Node 18+)
npm run e2e       # full chapter in Chromium (needs Playwright)
```

Add `?test=1` to the URL to unlock every board. Add `&seed=123` to get the same deal every time, and `&fresh=1` to start from an empty save.
