/* Movie Night Mahjong: original tile drawings and interface icons.
 * Each face has its own color and silhouette, so no two tiles are told apart by color alone.
 */
(function (root) {
  'use strict';

  var INK = '#221a33';
  var S = 'stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"';

  var FACES = {
    popcorn:
      '<g ' + S + '>' +
      '<circle cx="30" cy="44" r="9" fill="#fff0b3"/><circle cx="42" cy="33" r="11" fill="#ffe27a"/>' +
      '<circle cx="50" cy="20" r="9" fill="#fff0b3"/><circle cx="58" cy="31" r="11" fill="#fff0b3"/>' +
      '<circle cx="70" cy="42" r="10" fill="#ffe27a"/>' +
      '<path d="M22 50 H78 L70 92 H30 Z" fill="#ffffff"/></g>' +
      '<g fill="#e8384f"><path d="M28 53 L37 53 L39.5 92 L33 92 Z"/><path d="M45.5 53 L54.5 53 L53 92 L47 92 Z"/>' +
      '<path d="M63 53 L72 53 L67 92 L60.5 92 Z"/></g>' +
      '<path d="M22 50 H78 L70 92 H30 Z" fill="none" ' + S + '/>' +
      '<rect x="18" y="44" width="64" height="9" rx="2" fill="#e8384f" ' + S + '/>',

    ticket:
      '<g transform="rotate(-12 50 50)">' +
      '<path d="M10 30 H90 V43 A7 7 0 0 0 90 57 V70 H10 V57 A7 7 0 0 0 10 43 Z" fill="#f2892e" ' + S + '/>' +
      '<path d="M32 34 V66" stroke="' + INK + '" stroke-width="3" stroke-dasharray="4 4"/>' +
      '<path d="M16 44 H25 M16 51 H25 M16 58 H22" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<polygon points="62,38 64.94,45.95 73.41,46.29 66.76,51.55 69.05,59.71 62,55 54.95,59.71 57.24,51.55 50.59,46.29 59.06,45.95" fill="#fff6e2" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '</g>',

    star:
      '<polygon points="50,12 59.99,38.25 88.04,39.64 66.17,57.25 73.51,84.36 50,69 26.49,84.36 33.83,57.25 11.96,39.64 40.01,38.25" fill="#ffc94a" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M40 44 L46 40" stroke="#fff6e2" stroke-width="4" stroke-linecap="round"/>',

    hotdog:
      '<rect x="14" y="38" width="72" height="22" rx="11" fill="#d9a55e" ' + S + '/>' +
      '<rect x="6" y="42" width="88" height="20" rx="10" fill="#c7432c" ' + S + '/>' +
      '<path d="M18 48 Q23 42 28 48 T38 48 T48 48 T58 48 T68 48 T80 48" fill="none" stroke="#ffd23f" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M12 58 Q12 52 18 52 H82 Q88 52 88 58 V62 Q88 76 72 76 H28 Q12 76 12 62 Z" fill="#edb86e" ' + S + '/>',

    car:
      '<path d="M56 47 Q58 39 64 39 Q70 39 70 47 Z" fill="#e8384f" ' + S + '/>' +
      '<path d="M6 60 Q6 50 16 49 L40 47 L47 36 L52 36 L49 47 L78 47 L90 39 Q93 38 93 42 L94 50 Q97 54 96 62 Q96 70 90 70 L12 70 Q6 70 6 64 Z" fill="#4fc9b9" ' + S + '/>' +
      '<path d="M12 59 H90" stroke="#fff6e2" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M48.5 45 L53 33" stroke="#bfe8f2" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="11" cy="55" r="3" fill="#ffe27a" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="27" cy="70" r="11" fill="' + INK + '"/><circle cx="27" cy="70" r="4.5" fill="#d8dee9"/>' +
      '<circle cx="74" cy="70" r="11" fill="' + INK + '"/><circle cx="74" cy="70" r="4.5" fill="#d8dee9"/>',

    soda:
      '<path d="M60 30 L72 7" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M60 30 L72 7" stroke="#e8384f" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M60 30 L72 7" stroke="#fff6e2" stroke-width="5" stroke-dasharray="4 5"/>' +
      '<path d="M30 34 H70 L64 92 H36 Z" fill="#3d7bda" ' + S + '/>' +
      '<rect x="25" y="26" width="50" height="10" rx="5" fill="#fff6e2" ' + S + '/>' +
      '<path d="M35 61 Q42.5 54 50 61 T65 61" stroke="#fff6e2" stroke-width="5" fill="none" stroke-linecap="round"/>',

    moon:
      '<circle cx="50" cy="50" r="40" fill="#22306b" ' + S + '/>' +
      '<circle cx="45" cy="52" r="24" fill="#fff0b3"/><circle cx="57" cy="45" r="21" fill="#22306b"/>' +
      '<g fill="#fff0b3">' +
      '<path d="M71 61 Q71 67 77 67 Q71 67 71 73 Q71 67 65 67 Q71 67 71 61 Z"/>' +
      '<path d="M70 22 Q70 27 75 27 Q70 27 70 32 Q70 27 65 27 Q70 27 70 22 Z"/>' +
      '<circle cx="30" cy="30" r="2.5"/></g>',

    shake:
      '<path d="M58 36 L70 8" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M58 36 L70 8" stroke="#5ed6c6" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M28 40 L36 92 H64 L72 40 Z" fill="#f59ac4" ' + S + '/>' +
      '<path d="M38 50 L42 84" stroke="#fff6e2" stroke-width="3.5" stroke-linecap="round"/>' +
      '<g ' + S + ' fill="#ffffff"><circle cx="33" cy="38" r="8"/><circle cx="67" cy="38" r="8"/>' +
      '<circle cx="45" cy="32" r="10"/><circle cx="57" cy="32" r="10"/></g>' +
      '<path d="M50 22 Q52 13 59 9" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="50" cy="22" r="7" fill="#e8384f" ' + S + '/>',

    sign:
      '<path d="M8 36 H58 V22 L94 50 L58 78 V64 H8 Z" fill="#8e5bd8" ' + S + '/>' +
      '<g fill="#ffe27a" stroke="' + INK + '" stroke-width="2">' +
      '<circle cx="18" cy="50" r="4"/><circle cx="30" cy="50" r="4"/><circle cx="42" cy="50" r="4"/>' +
      '<circle cx="54" cy="50" r="4"/><circle cx="66" cy="50" r="4"/><circle cx="78" cy="50" r="4"/></g>',

    clapper:
      '<rect x="14" y="46" width="72" height="44" rx="4" fill="#2e2a3d" ' + S + '/>' +
      '<rect x="14" y="46" width="72" height="12" fill="#fff6e2" ' + S + '/>' +
      '<g fill="' + INK + '"><path d="M20 46 H30 L24 58 H14 Z"/><path d="M38 46 H48 L42 58 H32 Z"/>' +
      '<path d="M56 46 H66 L60 58 H50 Z"/><path d="M74 46 H84 L78 58 H68 Z"/></g>' +
      '<g transform="rotate(-16 14 44)"><rect x="14" y="32" width="72" height="12" fill="#fff6e2" ' + S + '/>' +
      '<g fill="' + INK + '"><path d="M24 32 H34 L28 44 H18 Z"/><path d="M42 32 H52 L46 44 H36 Z"/>' +
      '<path d="M60 32 H70 L64 44 H54 Z"/><path d="M78 32 H86 V36 L82 44 H72 Z"/></g></g>' +
      '<path d="M22 70 H78 M22 80 H60" stroke="#fff6e2" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="16" cy="45" r="3.5" fill="#ffc94a" stroke="' + INK + '" stroke-width="2"/>',

    reel:
      '<path d="M76 70 Q86 84 95 84" stroke="' + INK + '" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<path d="M76 70 Q86 84 95 84" stroke="#a3acbf" stroke-width="3" fill="none" stroke-dasharray="2 4"/>' +
      '<circle cx="48" cy="46" r="38" fill="#a3acbf" ' + S + '/>' +
      '<g fill="#fff6e2" stroke="' + INK + '" stroke-width="3">' +
      '<circle cx="48" cy="25" r="9"/><circle cx="67.97" cy="39.51" r="9"/><circle cx="60.34" cy="62.99" r="9"/>' +
      '<circle cx="35.66" cy="62.99" r="9"/><circle cx="28.03" cy="39.51" r="9"/></g>' +
      '<circle cx="48" cy="46" r="5" fill="' + INK + '"/>',

    glasses:
      '<path d="M10 44 L4 30 M90 44 L96 30" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="6" y="38" width="40" height="30" rx="7" fill="#fff6e2" ' + S + '/>' +
      '<rect x="54" y="38" width="40" height="30" rx="7" fill="#fff6e2" ' + S + '/>' +
      '<path d="M46 48 Q50 42 54 48" stroke="' + INK + '" stroke-width="4" fill="none"/>' +
      '<rect x="11" y="43" width="30" height="20" rx="4" fill="#e8384f" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="59" y="43" width="30" height="20" rx="4" fill="#38bde0" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M16 48 L22 48 M64 48 L70 48" stroke="#fff6e2" stroke-width="3" stroke-linecap="round"/>',

    // Chapter 2: Rock 'n' Roll Diner
    jukebox:
      '<path d="M22 90 V44 C22 22 36 10 50 10 C64 10 78 22 78 44 V90 Z" fill="#8b4a2b" ' + S + '/>' +
      '<path d="M30 52 V44 C30 28 39 18 50 18 C61 18 70 28 70 44 V52" fill="none" stroke="#f2892e" stroke-width="5"/>' +
      '<path d="M37 52 V45 C37 34 43 27 50 27 C57 27 63 34 63 45 V52" fill="none" stroke="#ffc94a" stroke-width="5"/>' +
      '<rect x="42" y="38" width="16" height="12" rx="3" fill="#fff0b3" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<rect x="31" y="58" width="38" height="26" rx="4" fill="#e8384f" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M39 62 V80 M46 62 V80 M54 62 V80 M61 62 V80" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<rect x="18" y="88" width="64" height="6" rx="2" fill="' + INK + '"/>',

    record:
      '<circle cx="50" cy="50" r="40" fill="#1d1a24" ' + S + '/>' +
      '<g fill="none" stroke="#4a4458" stroke-width="1.6"><circle cx="50" cy="50" r="33"/><circle cx="50" cy="50" r="26"/><circle cx="50" cy="50" r="20"/></g>' +
      '<path d="M26 32 A30 30 0 0 1 40 21" stroke="#8a82a0" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="50" cy="50" r="13" fill="#e8384f" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="50" cy="50" r="3" fill="#fff6e2"/>',

    burger:
      '<path d="M16 72 H84 V76 C84 86 16 86 16 76 Z" fill="#e9a94f" ' + S + '/>' +
      '<rect x="13" y="58" width="74" height="13" rx="6.5" fill="#7a3e22" ' + S + '/>' +
      '<path d="M15 54 H85 L79 61 L70 57 L60 63 L50 57 L40 62 L30 57 L21 61 Z" fill="#ffd23f" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M13 52 Q19 45 25 52 T37 52 T49 52 T61 52 T73 52 T87 52 L87 56 L13 56 Z" fill="#6cc04a" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M16 48 C16 22 84 22 84 48 Z" fill="#e9a94f" ' + S + '/>' +
      '<g fill="#fff6e2"><ellipse cx="38" cy="34" rx="2.6" ry="1.6"/><ellipse cx="50" cy="30" rx="2.6" ry="1.6"/>' +
      '<ellipse cx="62" cy="35" rx="2.6" ry="1.6"/><ellipse cx="44" cy="41" rx="2.6" ry="1.6"/><ellipse cx="57" cy="42" rx="2.6" ry="1.6"/></g>',

    guitar:
      '<g transform="translate(50 50) scale(1.12) translate(-50 -50) rotate(-38 50 50)">' +
      '<circle cx="50" cy="73" r="20" fill="#e8384f" ' + S + '/><circle cx="50" cy="52" r="14" fill="#e8384f" ' + S + '/>' +
      '<circle cx="50" cy="62" r="13" fill="#e8384f"/>' +
      '<path d="M41 66 Q50 58 59 66 L59 84 Q50 90 41 84 Z" fill="#fff6e2" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="46" y="6" width="8" height="58" fill="#c08a4a" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="43" y="0" width="14" height="13" rx="3" fill="#2e2a3d" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="43" y="68" width="14" height="4" fill="' + INK + '"/><rect x="43" y="76" width="14" height="4" fill="' + INK + '"/>' +
      '<path d="M48 12 V84 M52 12 V84" stroke="#fff6e2" stroke-width="1"/></g>',

    mic:
      '<path d="M28 40 V48 C28 66 72 66 72 48 V40" fill="none" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M50 64 V84" stroke="' + INK + '" stroke-width="5"/>' +
      '<ellipse cx="50" cy="88" rx="20" ry="6" fill="#2e2a3d" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="34" y="8" width="32" height="46" rx="16" fill="#c9d1de" ' + S + '/>' +
      '<path d="M38 20 H62 M37 28 H63 M37 36 H63 M38 44 H62" stroke="#6b7385" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="32" y="48" width="36" height="7" rx="3.5" fill="#ffc94a" stroke="' + INK + '" stroke-width="2.5"/>',

    skate:
      '<path d="M26 14 H48 V48 Q50 57 60 59 L74 60 Q86 61 86 71 V75 H22 V18 Q22 14 26 14 Z" fill="#ffffff" ' + S + '/>' +
      '<rect x="22" y="14" width="26" height="7" fill="#e8384f" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M29 28 L43 34 M43 28 L29 34 M29 39 L43 45 M43 39 L29 45 M30 50 L46 56" stroke="#e8384f" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="20" y="75" width="68" height="5" rx="2" fill="#2e2a3d"/>' +
      '<circle cx="88" cy="79" r="4.5" fill="#e8384f" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="33" cy="86" r="8" fill="#ffc94a" stroke="' + INK + '" stroke-width="3"/><circle cx="33" cy="86" r="2.5" fill="' + INK + '"/>' +
      '<circle cx="73" cy="86" r="8" fill="#ffc94a" stroke="' + INK + '" stroke-width="3"/><circle cx="73" cy="86" r="2.5" fill="' + INK + '"/>',

    pie:
      '<path d="M8 64 L92 58 V76 L8 80 Z" fill="#f0c27a" ' + S + '/>' +
      '<path d="M10 68 L90 63 V69 L10 73 Z" fill="#c8213a"/>' +
      '<path d="M8 64 L80 30 Q96 38 92 58 Z" fill="#c8213a" ' + S + '/>' +
      '<path d="M80 30 Q96 38 92 58" fill="none" stroke="#f0c27a" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M30 55 L84 37 M48 58 L90 47 M40 48 L58 61 M58 40 L74 59" stroke="#f0c27a" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="36" cy="52" r="3" fill="#7d0f22"/><circle cx="66" cy="48" r="3" fill="#7d0f22"/>',

    mug:
      '<path d="M40 22 Q34 16 40 10 M50 22 Q44 16 50 10 M60 22 Q54 16 60 10" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="47" cy="90" rx="36" ry="6" fill="#e3d8bd" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M70 42 C88 42 88 72 70 72" fill="none" stroke="' + INK + '" stroke-width="11"/>' +
      '<path d="M70 42 C88 42 88 72 70 72" fill="none" stroke="#fffdf7" stroke-width="5"/>' +
      '<path d="M24 30 H70 V78 Q70 88 60 88 H34 Q24 88 24 78 Z" fill="#fffdf7" ' + S + '/>' +
      '<rect x="24" y="44" width="46" height="9" fill="#e8384f" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="47" cy="31" rx="21" ry="4" fill="#6b3a20" stroke="' + INK + '" stroke-width="2.5"/>',

    phone:
      '<path d="M16 80 C16 60 30 50 50 50 C70 50 84 60 84 80 Z" fill="#8fd18a" ' + S + '/>' +
      '<rect x="14" y="78" width="72" height="8" rx="4" fill="#5aa356" ' + S + '/>' +
      '<circle cx="50" cy="66" r="12" fill="#fff6e2" stroke="' + INK + '" stroke-width="3"/>' +
      '<g fill="' + INK + '"><circle cx="50" cy="58.5" r="1.8"/><circle cx="56.5" cy="62" r="1.8"/><circle cx="56.5" cy="70" r="1.8"/>' +
      '<circle cx="50" cy="73.5" r="1.8"/><circle cx="43.5" cy="70" r="1.8"/><circle cx="43.5" cy="62" r="1.8"/></g>' +
      '<path d="M12 42 C12 30 22 26 30 28 H70 C78 26 88 30 88 42 L76 45 C74 38 70 37 66 37 H34 C30 37 26 38 24 45 Z" fill="#8fd18a" ' + S + '/>',

    cone:
      '<path d="M33 52 L50 94 L67 52 Z" fill="#e0a15a" ' + S + '/>' +
      '<path d="M38 60 L56 80 M44 54 L61 71 M60 58 L42 76 M54 54 L38 68" stroke="#a8692e" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="50" cy="44" r="16" fill="#7a4a2e" ' + S + '/>' +
      '<path d="M34 48 Q38 56 42 50 Q46 58 50 51 Q55 58 58 50 Q62 56 66 48" fill="#7a4a2e" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="50" cy="24" r="13" fill="#9ee0c2" ' + S + '/>' +
      '<path d="M44 20 L47 18" stroke="#fff6e2" stroke-width="3" stroke-linecap="round"/>',

    sax:
      '<path d="M38 10 C46 10 48 14 48 22 V64 C48 80 58 88 67 88 C79 88 85 78 83 64 L81 52" fill="none" stroke="' + INK + '" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M38 10 C46 10 48 14 48 22 V64 C48 80 58 88 67 88 C79 88 85 78 83 64 L81 52" fill="none" stroke="#e0b23c" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M72 50 L90 34 L96 48 L84 58 Z" fill="#e0b23c" ' + S + '/>' +
      '<path d="M38 10 L26 15" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
      '<g fill="#fff6e2" stroke="' + INK + '" stroke-width="2"><circle cx="48" cy="32" r="3.5"/><circle cx="48" cy="44" r="3.5"/><circle cx="48" cy="56" r="3.5"/><circle cx="56" cy="78" r="3.5"/></g>',

    note:
      '<path d="M40 74 V24 M80 64 V14" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M37 22 L83 10 V24 L37 36 Z" fill="' + INK + '"/>' +
      '<ellipse cx="29" cy="76" rx="13" ry="9.5" transform="rotate(-20 29 76)" fill="#d6336c" ' + S + '/>' +
      '<ellipse cx="69" cy="66" rx="13" ry="9.5" transform="rotate(-20 69 66)" fill="#d6336c" ' + S + '/>',

    // Chess Night: each piece has its own color as well as its own shape.
    pawn:
      '<rect x="22" y="78" width="56" height="12" rx="4" fill="#3d7bda" ' + S + '/>' +
      '<path d="M42 50 C42 62 34 70 30 78 H70 C66 70 58 62 58 50 Z" fill="#3d7bda" ' + S + '/>' +
      '<path d="M37 44 H63 L59 51 H41 Z" fill="#3d7bda" ' + S + '/>' +
      '<circle cx="50" cy="29" r="13" fill="#3d7bda" ' + S + '/>' +
      '<path d="M44 24 Q46 20 50 19" stroke="#fff6e2" stroke-width="3" fill="none" stroke-linecap="round"/>',

    rook:
      '<rect x="20" y="82" width="60" height="9" rx="3" fill="#e8384f" ' + S + '/>' +
      '<rect x="25" y="74" width="50" height="9" rx="3" fill="#e8384f" ' + S + '/>' +
      '<path d="M32 34 H68 L64 74 H36 Z" fill="#e8384f" ' + S + '/>' +
      '<path d="M28 14 H38 V22 H45 V14 H55 V22 H62 V14 H72 V34 H28 Z" fill="#e8384f" ' + S + '/>' +
      '<path d="M36 50 H64 M38 62 H62" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M50 34 V50 M44 50 V62 M56 50 V62" stroke="' + INK + '" stroke-width="2.5"/>',

    bishop:
      '<rect x="22" y="80" width="56" height="10" rx="4" fill="#8e5bd8" ' + S + '/>' +
      '<path d="M42 66 C42 72 36 76 33 80 H67 C64 76 58 72 58 66 Z" fill="#8e5bd8" ' + S + '/>' +
      '<rect x="37" y="59" width="26" height="7" rx="2" fill="#8e5bd8" ' + S + '/>' +
      '<path d="M50 18 C65 28 67 47 58 59 H42 C33 47 35 28 50 18 Z" fill="#8e5bd8" ' + S + '/>' +
      '<path d="M56 30 L46 44" stroke="#fff6e2" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="50" cy="13" r="5.5" fill="#8e5bd8" ' + S + '/>',

    knight:
      '<rect x="22" y="82" width="58" height="10" rx="4" fill="#2fb3a3" ' + S + '/>' +
      '<path d="M32 82 C30 72 34 64 42 56 C46 52 46 48 43 45 L31 50 C25 53 18 49 20 42 C22 32 30 22 40 17 L44 8 L50 15 C62 18 70 30 72 44 C74 56 76 68 76 82 Z" fill="#2fb3a3" ' + S + '/>' +
      '<path d="M58 20 Q68 32 70 48 Q71 60 72 72" stroke="#1d7f74" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="40" cy="29" r="3.2" fill="' + INK + '"/>' +
      '<path d="M24 44 L28 45" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>',

    queen:
      '<rect x="22" y="80" width="56" height="10" rx="4" fill="#ffc94a" ' + S + '/>' +
      '<path d="M34 74 H66 L62 80 H38 Z" fill="#ffc94a" ' + S + '/>' +
      '<rect x="30" y="64" width="40" height="10" rx="3" fill="#ffc94a" ' + S + '/>' +
      '<path d="M22 30 L33 64 H67 L78 30 L64 48 L58 22 L50 46 L42 22 L36 48 Z" fill="#ffc94a" ' + S + '/>' +
      '<g fill="#ffc94a" stroke="' + INK + '" stroke-width="3"><circle cx="22" cy="28" r="5"/><circle cx="42" cy="20" r="5"/>' +
      '<circle cx="58" cy="20" r="5"/><circle cx="78" cy="28" r="5"/></g>' +
      '<circle cx="50" cy="56" r="4" fill="#e8384f" stroke="' + INK + '" stroke-width="2"/>',

    king:
      '<rect x="22" y="80" width="56" height="10" rx="4" fill="#f2892e" ' + S + '/>' +
      '<path d="M35 66 H65 L61 80 H39 Z" fill="#f2892e" ' + S + '/>' +
      '<rect x="30" y="58" width="40" height="9" rx="3" fill="#f2892e" ' + S + '/>' +
      '<path d="M31 58 C26 42 36 30 50 30 C64 30 74 42 69 58 Z" fill="#f2892e" ' + S + '/>' +
      '<path d="M46 6 H54 V13 H61 V21 H54 V30 H46 V21 H39 V13 H46 Z" fill="#f2892e" ' + S + '/>' +
      '<path d="M40 40 Q44 35 50 35" stroke="#fff6e2" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
  };

  function face(id) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + (FACES[id] || '') + '</svg>';
  }

  var ICONS = {
    undo: '<path d="M9 6 L4 11 L9 16"/><path d="M4 11 H14.5 A5.5 5.5 0 0 1 14.5 22 H11"/>',
    hint: '<path d="M9 18.5 H15 M10 21.5 H14"/><path d="M12 2.5 A6.5 6.5 0 0 1 16.2 14 C15.4 14.8 15 15.6 15 16.5 H9 C9 15.6 8.6 14.8 7.8 14 A6.5 6.5 0 0 1 12 2.5 Z"/>',
    shuffle: '<path d="M3 7 H7 C11 7 13 17 17 17 H21"/><path d="M3 17 H7 C8.6 17 9.8 15.6 10.8 13.8"/><path d="M13.2 10.2 C14.2 8.4 15.4 7 17 7 H21"/><path d="M18 4 L21 7 L18 10"/><path d="M18 14 L21 17 L18 20"/>',
    settings: '<path d="M4 7 H20 M4 17 H20"/><circle cx="9" cy="7" r="2.6" class="knob"/><circle cx="15" cy="17" r="2.6" class="knob"/>',
    back: '<path d="M15 5 L8 12 L15 19"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11 V8 A4 4 0 0 1 16 8 V11"/>',
    star: '<polygon points="12,2.8 14.6,8.9 21.2,9.4 16.2,13.7 17.7,20.2 12,16.8 6.3,20.2 7.8,13.7 2.8,9.4 9.4,8.9" class="fill"/>',
    home: '<path d="M3.5 11 L12 3.5 L20.5 11"/><path d="M5.5 9.5 V20.5 H18.5 V9.5"/><path d="M10 20.5 V14.5 H14 V20.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10 H21 M8 3 V7 M16 3 V7"/>',
    chapters: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7.5 4 V20 M16.5 4 V20 M3 9.3 H7.5 M3 14.7 H7.5 M16.5 9.3 H21 M16.5 14.7 H21"/>',
    album: '<rect x="3.5" y="3" width="13" height="17" rx="2"/><path d="M8 21 H18 A2.5 2.5 0 0 0 20.5 18.5 V7"/>',
    bolt: '<polygon points="13.5,2.5 5,13.5 11,13.5 10,21.5 19,10 13,10" class="fill"/>',
    restart: '<path d="M4.5 12 A7.5 7.5 0 1 0 7 6.4"/><path d="M7.5 2.5 V6.8 H3.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4 A2.7 2.7 0 1 1 12.9 12 C12.3 12.3 12 12.9 12 13.6 V14"/><circle cx="12" cy="17.3" r="1.1" class="fill"/>'
  };

  // The big round sign on the home screen: a lit marquee ring around a drive-in at night,
  // with the current chapter's tile up on the screen.
  function emblem(faceId) {
    var bulbs = '';
    for (var i = 0; i < 28; i++) {
      var a = (i / 28) * Math.PI * 2;
      bulbs += '<circle class="bulb b' + (i % 2) + '" cx="' + (150 + 133 * Math.cos(a)).toFixed(1) + '" cy="' +
        (150 + 133 * Math.sin(a)).toFixed(1) + '" r="5.5"/>';
    }
    var tile = face(faceId).replace('<svg ', '<svg x="127" y="80" width="46" height="46" ');
    return '<svg class="emblem-svg" viewBox="0 0 300 300" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="emblem-sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#0c1330"/><stop offset="1" stop-color="#2e3b7a"/></linearGradient>' +
      '<clipPath id="emblem-clip"><circle cx="150" cy="150" r="108"/></clipPath></defs>' +
      '<circle cx="150" cy="150" r="146" fill="#7a1d33" stroke="' + INK + '" stroke-width="4"/>' +
      '<g fill="#ffc94a">' + bulbs + '</g>' +
      '<circle cx="150" cy="150" r="117" fill="#fff6e2" stroke="' + INK + '" stroke-width="4"/>' +
      '<g clip-path="url(#emblem-clip)">' +
      '<rect x="40" y="40" width="220" height="220" fill="url(#emblem-sky)"/>' +
      '<g fill="#fff6e2"><circle cx="78" cy="88" r="1.6"/><circle cx="222" cy="78" r="1.8"/><circle cx="96" cy="58" r="1.2"/>' +
      '<circle cx="206" cy="118" r="1.3"/><circle cx="64" cy="128" r="1.2"/><circle cx="240" cy="140" r="1.4"/></g>' +
      '<path d="M205 66 A16 16 0 1 0 223 88 A12 12 0 1 1 205 66 Z" fill="#fff0b3"/>' +
      '<polygon points="150,236 104,146 196,146" fill="#fff6e2" opacity="0.13"/>' +
      '<path d="M108 146 V178 M192 146 V178" stroke="' + INK + '" stroke-width="5"/>' +
      '<path d="M96 66 H204 L198 148 H102 Z" fill="#fff6e2" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="125" y="78" width="50" height="58" rx="7" fill="#fffdf7" stroke="#d4bb86" stroke-width="3"/>' + tile +
      '<path d="M30 196 Q150 172 270 196 V270 H30 Z" fill="#141a35"/>' +
      '<g fill="' + INK + '" stroke="#2e3b7a" stroke-width="2">' +
      '<path d="M62 214 Q64 202 78 201 L84 194 H102 L110 201 Q122 202 122 214 Z"/>' +
      '<path d="M178 214 Q180 202 194 201 L200 194 H218 L226 201 Q238 202 238 214 Z"/>' +
      '<path d="M118 232 Q120 220 134 219 L140 212 H160 L166 219 Q180 220 182 232 Z"/></g>' +
      '<rect x="138" y="232" width="24" height="18" rx="3" fill="#2e3b7a" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="150" cy="236" r="4" fill="#ffc94a"/>' +
      '</g></svg>';
  }

  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
  }

  var api = { face: face, icon: icon, emblem: emblem, FACE_IDS: Object.keys(FACES) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMArt = api;
})(typeof window !== 'undefined' ? window : this);
