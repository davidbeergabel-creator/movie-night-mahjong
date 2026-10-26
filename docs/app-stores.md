# להעלות את Movie Night Mahjong לחנויות

המסמך מסביר מה כבר מוכן, מה רק אתה יכול לעשות (חשבונות, תשלום, אימות זהות), ואיך עושים את זה צעד אחרי צעד. כל הטקסטים לחנויות כתובים כאן באנגלית ומוכנים להדבקה.

## מה כבר מוכן

- **עובד בלי אינטרנט.** אחרי הפתיחה הראשונה המשחק עובד גם בלי חיבור (`sw.js`). הגופנים כלולים במשחק עצמו, אז הוא לא פונה לשום שרת חיצוני.
- **מוכן להתקנה.** יש קובץ manifest עם שם, צבעים, נעילה לאורך, אייקונים (כולל אייקון "maskable" שהטלפון חותך לעיגול) וצילומי מסך.
- **מדיניות פרטיות:** https://davidbeergabel-creator.github.io/movie-night-mahjong/privacy.html. יש אליה קישור גם בתחתית מסך ההגדרות.
- **תמונות לחנויות,** בתיקייה `store/`:
  - `store/play/`: אייקון 512, תמונה ראשית (feature graphic) בגודל 1024x500, וחמישה צילומי מסך 1080x1920.
  - `store/app-store/`: אייקון 1024 (בלי שקיפות, כמו שאפל דורשת) וחמישה צילומי מסך לאייפון 1290x2796.
  - אחרי כל שינוי במשחק אפשר לצייר אותן מחדש: `npm run store-assets`.

## מה צריך ממך

| | Google Play | App Store |
|---|---|---|
| חשבון | Google Play Console | Apple Developer Program |
| עלות | 25 דולר, חד־פעמי | 99 דולר לשנה |
| אימות | תעודה מזהה, ואימות טלפון ומייל | Apple ID עם אימות דו־שלבי |
| מחשב | כל מחשב עם דפדפן | Mac עם Xcode (או שירות Mac בענן) |
| לפני פרסום | בחשבון אישי חדש: בדיקה סגורה עם 12 בודקים לפחות, 14 ימים ברציפות | בדיקה של אפל, בדרך כלל יום עד שלושה |

**כתובת מייל ליצירת קשר:** שתי החנויות מציגות אותה בפומבי. כדאי לפתוח כתובת נפרדת למשחק. אפל דורשת גם **Support URL**: כשתבחר כתובת, אוסיף עמוד `support.html` עם פרטי הקשר.

**החלטה פתוחה: כסף.** כרגע המשחק חינמי, בלי פרסומות ובלי רכישות, וכך כתוב גם בתיאורים למטה. אם תרצה פרסומות או רכישות בתוך המשחק, צריך להחליט לפני ההעלאה: זה משנה את טופס הפרטיות, את התיאור ואת הקוד.

## הדרך המומלצת: קודם אנדרואיד

### 1. לארוז את המשחק עם PWABuilder

PWABuilder הוא כלי חינמי של מיקרוסופט שעוטף אתר כמו שלנו באפליקציית אנדרואיד (Trusted Web Activity).

1. היכנס ל־https://www.pwabuilder.com והדבק את כתובת המשחק: `https://davidbeergabel-creator.github.io/movie-night-mahjong/`
2. הוא יבדוק את האתר. אמורים לעבור: manifest, ‏service worker ואייקונים.
3. **Package for stores** ← **Android** ← **Google Play**.
4. **Package ID:** זה שם קבוע לתמיד, ואי אפשר לשנות אותו אחר כך. הצעה: `com.movienightmahjong.game`.
5. **Signing key:** בחר **Create new**. תקבל קובץ zip ובו:
   - `app-release-bundle.aab`: הקובץ שמעלים ל־Google Play.
   - `signing.keystore` ו־`signing-key-info.txt`: מפתח החתימה והסיסמאות שלו. **שמור אותם בשני מקומות בטוחים.** בלעדיהם אי אפשר לעדכן את האפליקציה. (Google Play App Signing מאפשר לאפס את מפתח ההעלאה, אבל זה תהליך ארוך.)
   - `assetlinks.json`: הוכחה שהאפליקציה והאתר שייכים לאותו בעלים. ראה את השלב הבא.

### 2. קישור בין האפליקציה לאתר (Digital Asset Links)

בלי הקישור הזה האפליקציה תציג שורת כתובת של דפדפן בראש המסך.

הקובץ `assetlinks.json` חייב לשבת בשורש הדומיין: `https://davidbeergabel-creator.github.io/.well-known/assetlinks.json`. הוא לא יכול לשבת בתוך `/movie-night-mahjong/`, ולכן צריך מאגר נוסף:

1. ב־GitHub, צור מאגר ציבורי חדש בשם **בדיוק** `davidbeergabel-creator.github.io`.
2. הפעל בו GitHub Pages (Settings ← Pages ← Deploy from branch ← main).
3. תן לי גישה ושלח לי את תוכן `assetlinks.json`. אני אוסיף אותו יחד עם קובץ ריק בשם `.nojekyll`, שבלעדיו GitHub Pages לא מגיש תיקיות שמתחילות בנקודה.
4. אחרי ההעלאה הראשונה ל־Play Console: **Setup ← App signing** מציג קטע JSON בשם "Digital Asset Links". גם את טביעת האצבע של Google צריך להוסיף לקובץ. שלח לי אותה ואעדכן.

### 3. ב־Play Console

1. **Create app:** שם `Movie Night Mahjong`, שפה English (United States), סוג Game, חינמי.
2. **Store listing:** הטקסטים בהמשך המסמך, והתמונות מ־`store/play/`.
3. **App content:**
   - Privacy policy: הקישור שלמעלה.
   - Ads: No.
   - Data safety: **No data collected, no data shared.**
   - Target audience: ‏**18 and over**. כך המשחק לא נכנס לכללי "Families" של אפליקציות לילדים.
   - Content rating: למלא את השאלון בכנות (אין אלימות, אין הימורים, אין צ'אט). התוצאה צפויה להיות Everyone / PEGI 3.
4. **Category:** Games ← Puzzle. תגיות: Mahjong, Solitaire, Tile.
5. **Countries:** המשחק באנגלית, אז כדאי להתחיל בארצות הברית, בריטניה, קנדה, אוסטרליה, ניו זילנד ואירלנד.

### 4. בדיקה סגורה, ואז פרסום

1. **Testing ← Closed testing:** העלה את קובץ ה־`.aab` והוסף לפחות 12 בודקים (רשימת מיילים או Google Group).
2. השחקניות מבדיקת השחקניות (ראה `docs/playtest-kit.md`) הן בודקות מושלמות. בקש מכל אחת לשחק כמה פעמים במהלך 14 הימים.
3. אחרי 14 ימים: **Apply for production**. גוגל שואלת כמה שאלות על הבדיקה, ובודקת תוך כמה ימים.

## אחר כך: אייפון

1. ב־PWABuilder: **Package for stores** ← **iOS**. תקבל פרויקט Xcode.
2. במחשב Mac: פתח אותו ב־Xcode, היכנס עם חשבון המפתח, בחר Bundle ID (הצעה: `com.movienightmahjong.game`), ואז **Product ← Archive ← Distribute App**.
3. ב־App Store Connect: הטקסטים בהמשך, התמונות מ־`store/app-store/`, ובפרטיות: **Data Not Collected**. דירוג גיל: 4+.

**סיכון שכדאי להכיר:** אפל לפעמים דוחה אפליקציות שהן "רק אתר עטוף" (סעיף 4.2 בהנחיות שלה). לטובתנו: זה משחק שלם שעובד בלי אינטרנט ובלי חשבון. אם בכל זאת ידחו, הפתרון הוא לארוז את קבצי המשחק בתוך האפליקציה עצמה עם Capacitor. אני יכול להכין את זה, אבל הבנייה דורשת Mac עם Xcode (ולאנדרואיד, Android Studio).

## טקסטים לחנויות

### Google Play

**App name** (30 תווים לכל היותר):

```
Movie Night Mahjong
```

**Short description** (80 לכל היותר):

```
Relaxing mahjong solitaire with big tiles, movie trivia and real puzzles.
```

**Full description:** זהה לתיאור של App Store, למטה.

### App Store

**Name** (30 לכל היותר):

```
Movie Night Mahjong
```

**Subtitle** (30 לכל היותר):

```
Big tiles. Real puzzles.
```

**Keywords** (100 לכל היותר, מופרדות בפסיקים):

```
mahjong,solitaire,tile,match,puzzle,classic,movie,trivia,relaxing,brain,daily,large,print
```

**Promotional text** (170 לכל היותר):

```
Three chapters of big, clear tiles and movie memories, then a brand-new board every level in the Late Show. No timer, no ads, no tracking.
```

**Category:** Games ← Puzzle. קטגוריה משנית: Board.

### התיאור המלא (לשתי החנויות)

```
Movie Night Mahjong is a relaxing mahjong solitaire with big, clear tiles and a movie-night theme. Match pairs of free tiles to clear the board, at your own pace, with no timer.

REAL PUZZLES
Every board can be cleared, but one careless match can leave you stuck. Think ahead, use Undo as often as you like, and save your hints and shuffles for when you need them. Clear a level without help to earn three stars.

A MOVIE MEMORY AFTER EVERY LEVEL
Finish a level and answer a question about the movies, music and TV you remember. Every answer adds a card to your album.

THREE CHAPTERS, THEN THE LATE SHOW
• Saturday at the Drive-In: popcorn, convertibles and a double feature under the stars
• Rock ’n’ Roll Diner: jukebox hits, burgers and one last dance
• Romance at the Movies: roses, champagne and the great love stories of the silver screen
• The Late Show: a brand-new board every level, as many as you like
• Bonus: Chess Night, where matching pieces clear when one could capture the other

A NEW BOARD EVERY DAY
The daily board is the same for everyone. Collect a stamp for each one, with no streak to lose.

EASY ON THE EYES
• Big tiles with bold, original drawings, each with its own color and shape
• Three text sizes
• Tiles you can't pick yet are gently darkened
• Plays offline, with no account

NO ADS. NO TRACKING.
Movie Night Mahjong collects no personal information. Your progress stays on your device.
```

## רשימת תיוג

- [ ] חשבון Google Play Console (25 דולר) ואימות זהות
- [ ] כתובת מייל ציבורית למשחק
- [ ] החלטה: חינמי בלי פרסומות (כמו היום), או אחרת
- [ ] PWABuilder: לארוז, ולשמור את מפתח החתימה בשני מקומות
- [ ] מאגר `davidbeergabel-creator.github.io` עם `assetlinks.json` (אני מוסיף את הקבצים)
- [ ] Play Console: דף החנות, App content ו־Data safety
- [ ] בדיקה סגורה: 12 בודקים, 14 ימים
- [ ] בקשה לפרסום (Production)
- [ ] אחר כך: Apple Developer, ‏Mac, ‏PWABuilder iOS, ‏App Store Connect
