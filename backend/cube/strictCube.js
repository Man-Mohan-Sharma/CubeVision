const Cube = require('cubejs');

const SOLVED_STATE = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
const FACE_ORDER = 'URFDLB';
const VALID = new Set(FACE_ORDER.split(''));
const CENTERS = { 4: 'U', 13: 'R', 22: 'F', 31: 'D', 40: 'L', 49: 'B' };

const CORNER_FACELET = [
  [8, 9, 20],   // URF
  [6, 18, 38],  // UFL
  [0, 36, 47],  // ULB
  [2, 45, 11],  // UBR
  [29, 26, 15], // DFR
  [27, 44, 24], // DLF
  [33, 53, 42], // DBL
  [35, 17, 51], // DRB
];

const EDGE_FACELET = [
  [5, 10],  // UR
  [7, 19],  // UF
  [3, 37],  // UL
  [1, 46],  // UB
  [32, 16], // DR
  [28, 25], // DF
  [30, 43], // DL
  [34, 52], // DB
  [23, 12], // FR
  [21, 41], // FL
  [50, 39], // BL
  [48, 14], // BR
];

const CORNER_COLOR = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
];

const EDGE_COLOR = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
];

const CORNER_NAME = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
const EDGE_NAME = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

function cleanState(input) {
  return String(input || '').toUpperCase().replace(/\s+/g, '');
}

function colorCounts(state) {
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (const ch of state) {
    if (counts[ch] !== undefined) counts[ch] += 1;
  }
  return counts;
}

function permutationParity(perm) {
  const seen = new Array(perm.length).fill(false);
  let swaps = 0;
  for (let i = 0; i < perm.length; i += 1) {
    if (seen[i]) continue;
    let j = i;
    let cycle = 0;
    while (!seen[j]) {
      seen[j] = true;
      j = perm[j];
      cycle += 1;
    }
    swaps += cycle - 1;
  }
  return swaps % 2;
}

function sameSet(a, b) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function findCornerBySet(colors) {
  return CORNER_COLOR.findIndex((candidate) => sameSet(colors, candidate));
}

function findEdgeBySet(colors) {
  return EDGE_COLOR.findIndex((candidate) => sameSet(colors, candidate));
}

function parseCorner(state, positionIndex) {
  const facelets = CORNER_FACELET[positionIndex];
  const actual = facelets.map((idx) => state[idx]);
  const cubieBySet = findCornerBySet(actual);

  for (let cubie = 0; cubie < 8; cubie += 1) {
    for (let ori = 0; ori < 3; ori += 1) {
      let ok = true;
      for (let n = 0; n < 3; n += 1) {
        if (state[CORNER_FACELET[positionIndex][(n + ori) % 3]] !== CORNER_COLOR[cubie][n]) {
          ok = false;
          break;
        }
      }
      if (ok) return { cubie, orientation: ori };
    }
  }

  const place = CORNER_NAME[positionIndex];
  const colors = actual.join('');
  if (cubieBySet >= 0) {
    const cubieName = CORNER_NAME[cubieBySet];
    throw new Error(
      `Impossible corner orientation at ${place}: found ${colors}. ` +
      `Those colors belong to corner ${cubieName}, but in a mirrored order that no legal cube turn can create. ` +
      `Recheck this corner sticker order/orientation.`
    );
  }

  throw new Error(
    `Invalid corner at ${place}: found ${colors}. A real corner must contain exactly one U/D color and two side colors from one real cubie.`
  );
}

function parseEdge(state, positionIndex) {
  const facelets = EDGE_FACELET[positionIndex];
  const actual = facelets.map((idx) => state[idx]);
  const cubieBySet = findEdgeBySet(actual);

  for (let cubie = 0; cubie < 12; cubie += 1) {
    for (let ori = 0; ori < 2; ori += 1) {
      let ok = true;
      for (let n = 0; n < 2; n += 1) {
        if (state[EDGE_FACELET[positionIndex][(n + ori) % 2]] !== EDGE_COLOR[cubie][n]) {
          ok = false;
          break;
        }
      }
      if (ok) return { cubie, orientation: ori };
    }
  }

  const place = EDGE_NAME[positionIndex];
  const colors = actual.join('');
  if (cubieBySet >= 0) {
    throw new Error(
      `Impossible edge orientation at ${place}: found ${colors}. Recheck this edge sticker orientation.`
    );
  }

  throw new Error(
    `Invalid edge at ${place}: found ${colors}. A real edge must contain colors from one real edge cubie.`
  );
}

function validateBasicState(rawState) {
  const state = cleanState(rawState);
  const errors = [];

  if (state.length !== 54) {
    errors.push(`State must be exactly 54 stickers, got ${state.length}.`);
    return { state, errors, counts: colorCounts(state) };
  }

  const badChars = [...new Set(state.split('').filter((ch) => !VALID.has(ch)))];
  if (badChars.length) {
    errors.push(`Invalid characters: ${badChars.join(', ')}. Only U R F D L B are allowed.`);
  }

  const counts = colorCounts(state);
  for (const face of FACE_ORDER) {
    if (counts[face] !== 9) {
      errors.push(`Wrong sticker count for ${face}: found ${counts[face]}, need 9.`);
    }
  }

  for (const [idx, expected] of Object.entries(CENTERS)) {
    if (state[Number(idx)] !== expected) {
      errors.push(`Wrong center at index ${idx}: found ${state[Number(idx)]}, expected ${expected}. Centers must be fixed.`);
    }
  }

  return { state, errors, counts };
}

function strictCubeFromString(rawState) {
  const basic = validateBasicState(rawState);
  if (basic.errors.length) {
    const err = new Error(basic.errors.join(' '));
    err.details = basic.errors;
    throw err;
  }

  const state = basic.state;
  const cube = new Cube();
  cube.center = [0, 1, 2, 3, 4, 5];
  cube.cp = new Array(8);
  cube.co = new Array(8);
  cube.ep = new Array(12);
  cube.eo = new Array(12);

  const usedCorners = new Set();
  for (let i = 0; i < 8; i += 1) {
    const parsed = parseCorner(state, i);
    if (usedCorners.has(parsed.cubie)) {
      throw new Error(`Duplicate corner cubie detected: ${CORNER_NAME[parsed.cubie]}.`);
    }
    usedCorners.add(parsed.cubie);
    cube.cp[i] = parsed.cubie;
    cube.co[i] = parsed.orientation;
  }

  const usedEdges = new Set();
  for (let i = 0; i < 12; i += 1) {
    const parsed = parseEdge(state, i);
    if (usedEdges.has(parsed.cubie)) {
      throw new Error(`Duplicate edge cubie detected: ${EDGE_NAME[parsed.cubie]}.`);
    }
    usedEdges.add(parsed.cubie);
    cube.ep[i] = parsed.cubie;
    cube.eo[i] = parsed.orientation;
  }

  const cornerTwist = cube.co.reduce((a, b) => a + b, 0) % 3;
  if (cornerTwist !== 0) {
    throw new Error('Impossible cube: corner twists do not sum to 0 mod 3. Recheck corner stickers.');
  }

  const edgeFlip = cube.eo.reduce((a, b) => a + b, 0) % 2;
  if (edgeFlip !== 0) {
    throw new Error('Impossible cube: edge flips do not sum to 0 mod 2. Recheck edge stickers.');
  }

  if (permutationParity(cube.cp) !== permutationParity(cube.ep)) {
    throw new Error('Impossible cube: corner and edge permutation parity do not match. Recheck swapped stickers.');
  }

  const roundTrip = cube.asString();
  if (roundTrip !== state) {
    throw new Error(
      `Internal parser mismatch. Input was ${state}, but legal cubie reconstruction gives ${roundTrip}. ` +
      `This means the sticker pattern is not physically reachable.`
    );
  }

  return cube;
}

function applyMovesToState(rawState, moves) {
  const cube = strictCubeFromString(rawState);
  if (moves && String(moves).trim()) cube.move(String(moves).trim());
  return cube.asString();
}

function buildStateSequence(rawState, moves) {
  const cube = strictCubeFromString(rawState);
  const sequence = [cube.asString()];
  for (const move of moves || []) {
    cube.move(move);
    sequence.push(cube.asString());
  }
  return sequence;
}

function isSolvedState(rawState) {
  return cleanState(rawState) === SOLVED_STATE;
}

module.exports = {
  SOLVED_STATE,
  FACE_ORDER,
  cleanState,
  colorCounts,
  validateBasicState,
  strictCubeFromString,
  applyMovesToState,
  buildStateSequence,
  isSolvedState,
};
