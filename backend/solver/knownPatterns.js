/**
 * Known Rubik's Cube patterns.
 * IMPORTANT: these algorithms CREATE patterns from the solved cube.
 * They are NOT solve shortcuts and must never be returned as the solution
 * for a detected/scanned cube state.
 */
function normalizeCubeState(state) {
  return String(state || '').toUpperCase().replace(/[^URFDLB]/g, '');
}

const KNOWN_PATTERNS = [
  { name: 'Pons Asinorum', moves: "F2 B2 R2 L2 U2 D2", type: 'pattern_creation' },
  { name: 'Checkerboards of order 3', moves: "F B2 R' D2 B R U D' R L' D' F' R2 D F2 B'", type: 'pattern_creation' },
  { name: 'Stripes', moves: "F U F R L2 B D' R D2 L D' B R2 L F U F", type: 'pattern_creation' },
  { name: 'Cube in a cube', moves: "F L F U' R U F2 L2 U' L' B D' B' L2 U", type: 'pattern_creation' },
  { name: 'Anaconda', moves: "L U B' U' R L' B R' F B' D R D' F'", type: 'pattern_creation' },
  { name: 'Python', moves: "F2 R' B' U R' L F L F' B D' R B L2", type: 'pattern_creation' },
  { name: 'Black Mamba', moves: "R D L F' R L' D R' U D B U' R' D'", type: 'pattern_creation' },
  { name: 'Green Mamba', moves: "R D F R' F' B D R' U' B' U D2", type: 'pattern_creation' },
  { name: 'Four Spot', moves: "F2 B2 U D' R2 L2 U D", type: 'pattern_creation' },
  { name: 'Six Spot', moves: "U D' R L' F B' U D'", type: 'pattern_creation' },
];

function getKnownSolution() {
  // Intentionally disabled. Pattern algorithms create patterns from solved state;
  // they do not solve arbitrary scanned cube states.
  return null;
}

module.exports = {
  KNOWN_SOLUTIONS: new Map(),
  KNOWN_PATTERNS,
  normalizeCubeState,
  getKnownSolution,
};
