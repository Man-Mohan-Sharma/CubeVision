/**
 * CubeValidator — checks a 54-char URFDLB facelet string for the
 * structural rules every legal cube must follow.
 *
 * The first four checks (length, characters, sticker counts, fixed
 * centers) are simple bookkeeping. The last three are the actual
 * mathematical solvability conditions for a Rubik's Cube:
 *   1. Every corner/edge facelet grouping must form a real, distinct
 *      cube piece (no duplicate-color corners/edges).
 *   2. Corner orientation ("twist") must sum to 0 mod 3.
 *   3. Edge orientation ("flip") must sum to 0 mod 2.
 *   4. Corner permutation parity must equal edge permutation parity.
 * Any state that violates these can never be reached by twisting a
 * real cube — usually the sign of one or two mis-clicked stickers.
 *
 * We reuse `cubejs` (the same library the solver uses) to convert the
 * facelet string into its underlying cubie representation (cp/co/ep/eo),
 * so validation and solving always agree on what counts as "solvable".
 */
const Cube = require('cubejs');

const VALID   = new Set(['U', 'R', 'F', 'D', 'L', 'B']);
const CENTERS = { 4: 'U', 13: 'R', 22: 'F', 31: 'D', 40: 'L', 49: 'B' };

function permutationParity(perm) {
  const n = perm.length;
  const seen = new Array(n).fill(false);
  let parity = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    let j = i, cycleLen = 0;
    while (!seen[j]) { seen[j] = true; j = perm[j]; cycleLen++; }
    parity += (cycleLen - 1);
  }
  return parity % 2;
}

function isPermutationOf(arr, n) {
  if (!Array.isArray(arr) || arr.length !== n) return false;
  const seen = new Set();
  for (const v of arr) {
    if (!Number.isInteger(v) || v < 0 || v >= n || seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === n;
}

class CubeValidator {
  validate(state) {
    const errors = [], warnings = [];
    if (typeof state !== 'string' || state.length !== 54) {
      return { isValid: false, errors: [`State must be 54 characters, got ${state?.length ?? 0}.`], warnings, colorCounts: {} };
    }
    state = state.toUpperCase();

    const badChars = [...new Set(state.split('').filter(c => !VALID.has(c)))];
    if (badChars.length) errors.push(`Invalid characters: [${badChars.join(', ')}]. Only U R F D L B allowed.`);

    const colorCounts = {};
    for (const c of state) colorCounts[c] = (colorCounts[c] || 0) + 1;

    const countErr = [];
    for (const c of 'URFDLB') {
      const n = colorCounts[c] || 0;
      if (n !== 9) countErr.push(`${c}: found ${n}, need 9`);
    }
    if (countErr.length) {
      errors.push(
        `Wrong sticker counts: ${countErr.join(', ')}.\n` +
        `TIP: For best results — hold each cube face flat toward the camera, ` +
        `ensure bright even lighting, and keep hands out of the frame as much as possible.`
      );
    }

    for (const [pos, exp] of Object.entries(CENTERS)) {
      if (state[+pos] !== exp) {
        errors.push(`Center of face ${exp} (position ${pos}): found '${state[+pos]}'. Centers are fixed and must match the face color.`);
      }
    }

    // Can't go further until the basics (length/chars/counts/centers) check out —
    // cubejs can't meaningfully parse a state with the wrong sticker counts.
    if (errors.length) return { isValid: false, errors, warnings, colorCounts };

    // Convert to cubie representation and check the real solvability invariants.
    let cube;
    try {
      cube = Cube.fromString(state);
    } catch (err) {
      errors.push(
        `This sticker arrangement doesn't form a physically possible cube ` +
        `(likely two faces of the same corner or edge piece were given the same color). ` +
        `Recheck your color choices for a stuck/duplicate sticker.`
      );
      return { isValid: false, errors, warnings, colorCounts };
    }

    const { cp, co, ep, eo } = cube.toJSON();

    if (!isPermutationOf(cp, 8) || !isPermutationOf(ep, 12)) {
      errors.push(
        `Some stickers don't form valid cube pieces (e.g. a corner or edge with a duplicated/impossible color combination). ` +
        `Recheck stickers near the corners and edges of each face.`
      );
      return { isValid: false, errors, warnings, colorCounts };
    }

    const cornerTwist = co.reduce((a, b) => a + b, 0) % 3;
    if (cornerTwist !== 0) {
      errors.push('Corner orientation is impossible on a real cube — one corner sticker is likely placed incorrectly. Recheck the corner stickers (the ones touching 3 faces).');
    }

    const edgeFlip = eo.reduce((a, b) => a + b, 0) % 2;
    if (edgeFlip !== 0) {
      errors.push('Edge orientation is impossible on a real cube — one edge sticker is likely flipped. Recheck the edge stickers (the ones touching 2 faces).');
    }

    const cornerParity = permutationParity(cp);
    const edgeParity   = permutationParity(ep);
    if (cornerParity !== edgeParity) {
      errors.push('Permutation parity is impossible on a real cube — this usually means two stickers got swapped (e.g. two corners or two edges). Recheck for a mixed-up pair of stickers.');
    }

    if (errors.length) return { isValid: false, errors, warnings, colorCounts };

    return {
      isValid: true, errors, warnings, colorCounts,
      checksPassed: ['Length', 'Characters', 'Color counts', 'Centers', 'Piece validity', 'Corner orientation', 'Edge orientation', 'Permutation parity'],
    };
  }
}

module.exports = { CubeValidator };
