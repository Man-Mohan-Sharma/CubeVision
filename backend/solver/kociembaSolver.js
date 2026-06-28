/**
 * Kociemba Two-Phase Solver — backed by `cubejs` (Herbert Kociemba's real
 * two-phase algorithm with precomputed pruning tables).
 *
 * The previous version of this file was a hand-rolled IDA* search with a
 * very weak heuristic (misplaced-facelet count / 8) and no real phase-1/
 * phase-2 group reduction. That makes the search space for any genuinely
 * scrambled cube (~17-20 moves away from solved) computationally
 * intractable — it would search for an impractically long time and block
 * Node's single event loop the entire time, with no real guarantee of
 * ever returning a correct answer (it even had a *hardcoded fallback
 * algorithm* that doesn't actually solve the given cube — it just
 * pretended to succeed).
 *
 * `cubejs` does it properly: a one-time ~4-5s table precomputation at
 * startup, then real solves in ~10-400ms (rarely up to ~2s), guaranteed
 * to find a solution of 22 moves or fewer for any legally reachable cube
 * state. It accepts the exact same 54-char URFDLB facelet string this
 * project already uses, so it's a drop-in replacement.
 */
const Cube = require('cubejs');

// One-time precomputation of the search pruning tables. This runs once,
// the moment this module is first required (i.e. at server startup, since
// routes/solve.js requires it eagerly) — NOT on every request.
let solverReady = false;
function ensureSolverInitialized() {
  if (solverReady) return;
  const t0 = Date.now();
  console.log('🧩 Initialising Kociemba two-phase solver tables (one-time, ~4-5s)…');
  Cube.initSolver();
  solverReady = true;
  console.log(`✅ Solver tables ready in ${Date.now() - t0}ms`);
}
ensureSolverInitialized();

class KociembaSolver {
  solve(stateStr) {
    if (typeof stateStr !== 'string' || stateStr.length !== 54) {
      return { success: false, error: 'State must be exactly 54 characters.' };
    }
    ensureSolverInitialized();
    const t0 = Date.now();
    try {
      const cube = Cube.fromString(stateStr.toUpperCase());

      if (cube.isSolved()) {
        return {
          success: true, solution: '', moves: [], move_count: 0,
          execution_time_ms: Date.now() - t0, algorithm: 'Kociemba Two-Phase (cubejs)',
        };
      }

      const solution = cube.solve(); // default maxDepth 22 — always sufficient for a reachable cube
      const moves = solution.trim().split(/\s+/).filter(Boolean);
      return {
        success: true, solution, moves, move_count: moves.length,
        execution_time_ms: Date.now() - t0, algorithm: 'Kociemba Two-Phase (cubejs)',
      };
    } catch (err) {
      // cubejs throws if the facelet string doesn't correspond to a
      // physically reachable cube state (bad parity, impossible piece, etc.)
      return {
        success: false,
        error: err?.message || 'This cube state is not solvable — double-check every sticker against the real cube.',
      };
    }
  }
}

module.exports = { KociembaSolver };
