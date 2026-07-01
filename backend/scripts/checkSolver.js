/*
 * Usage from backend folder:
 *   node scripts/checkSolver.js UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
 */
const { CubeValidator } = require('../validator/cubeValidator');
const { KociembaSolver, normalizeCubeState } = require('../solver/kociembaSolver');

const input = process.argv[2] || 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
const state = normalizeCubeState(input);
const validator = new CubeValidator();
const solver = new KociembaSolver();

console.log('State:', state);
console.log('Length:', state.length);

const validation = validator.validate(state);
console.log('Valid:', validation.isValid);
if (!validation.isValid) {
  console.log('Errors:', validation.errors);
  process.exit(1);
}

const result = solver.solve(state);
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
