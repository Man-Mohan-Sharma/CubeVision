// Pattern algorithms CREATE these patterns from the solved cube.
// They are not solutions for a scanned cube.
export const KNOWN_PATTERNS = [
  { name: 'Pons Asinorum', moves: "F2 B2 R2 L2 U2 D2" },
  { name: 'Checkerboards of order 3', moves: "F B2 R' D2 B R U D' R L' D' F' R2 D F2 B'" },
  { name: 'Stripes', moves: "F U F R L2 B D' R D2 L D' B R2 L F U F" },
  { name: 'Cube in a cube', moves: "F L F U' R U F2 L2 U' L' B D' B' L2 U" },
  { name: 'Anaconda', moves: "L U B' U' R L' B R' F B' D R D' F'" },
  { name: 'Python', moves: "F2 R' B' U R' L F L F' B D' R B L2" },
  { name: 'Black Mamba', moves: "R D L F' R L' D R' U D B U' R' D'" },
  { name: 'Green Mamba', moves: "R D F R' F' B D R' U' B' U D2" },
  { name: 'Four Spot', moves: "F2 B2 U D' R2 L2 U D" },
  { name: 'Six Spot', moves: "U D' R L' F B' U D'" },
]

export const PATTERN_NOTE = 'Pattern moves are applied forward from a solved cube to create the pattern. They are not solve algorithms.'
