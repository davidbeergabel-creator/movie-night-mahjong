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
      '<path d="M16 48 L22 48 M64 48 L70 48" stroke="#fff6e2" stroke-width="3" stroke-linecap="round"/>'
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
    star: '<polygon points="12,2.8 14.6,8.9 21.2,9.4 16.2,13.7 17.7,20.2 12,16.8 6.3,20.2 7.8,13.7 2.8,9.4 9.4,8.9" class="fill"/>'
  };

  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
  }

  var api = { face: face, icon: icon, FACE_IDS: Object.keys(FACES) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MNMArt = api;
})(typeof window !== 'undefined' ? window : this);
