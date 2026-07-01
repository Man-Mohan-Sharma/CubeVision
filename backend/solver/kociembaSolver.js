/**
 * Man Mohan Sharma proper solver fix.
 *
 * No fake / hard-coded solutions.
 * Every solution returned here is verified by applying the moves back to the
 * exact submitted cube state and checking the final state is solved.
 */
const Cube = require('cubejs');
const {
  cleanState,
  strictCubeFromString,
  buildStateSequence,
  SOLVED_STATE,
} = require('../cube/strictCube');

let solverReady = false;

function normalizeCubeState(value) {
  return cleanState(value).replace(/[^URFDLB]/g, '');
}

function ensureSolverInitialized() {
  if (solverReady) return;
  const t0 = Date.now();
  console.log('🧩 Initialising Kociemba two-phase solver tables (one-time)…');
  Cube.initSolver();
  solverReady = true;
  console.log(`✅ Solver tables ready in ${Date.now() - t0}ms`);
}

function splitMoves(solution) {
  return String(solution || '').trim().split(/\s+/).filter(Boolean);
}

function getMaxDepth() {
  const raw = Number.parseInt(process.env.SOLVER_MAX_DEPTH || '30', 10);
  if (!Number.isFinite(raw)) return 30;
  return Math.max(21, Math.min(raw, 35));
}

function verifySolution(state, moves) {
  try {
    const sequence = buildStateSequence(state, moves);
    const finalState = sequence[sequence.length - 1];
    return {
      ok: finalState === SOLVED_STATE,
      final_state: finalState,
      state_sequence: sequence,
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Verification failed.',
    };
  }
}

class KociembaSolver {
  solve(stateStr) {
    const t0 = Date.now();
    const state = normalizeCubeState(stateStr);

    if (state.length !== 54) {
      return {
        success: false,
        error: `State must be exactly 54 URFDLB stickers after cleanup. Got ${state.length}.`,
        cube_state_used: state,
      };
    }

    if (!/^[URFDLB]{54}$/.test(state)) {
      return {
        success: false,
        error: 'State contains invalid characters. Only U R F D L B are allowed.',
        cube_state_used: state,
      };
    }

    try {
      // Strict physical-cube check before solving. This catches wrong U/D scans,
      // mirrored corners, duplicate cubies, impossible parity, etc.
      const cube = strictCubeFromString(state);

      if (state === SOLVED_STATE || cube.isSolved()) {
        return {
          success: true,
          solution: '',
          moves: [],
          move_count: 0,
          verified: true,
          final_state: state,
          state_sequence: [state],
          cube_state_used: state,
          execution_time_ms: Date.now() - t0,
          algorithm: 'Already solved',
        };
      }

      ensureSolverInitialized();
      const maxDepth = getMaxDepth();
      const solution = cube.solve(maxDepth);
      const moves = splitMoves(solution);

      if (!moves.length) {
        return {
          success: false,
          error: `No solution was returned within max depth ${maxDepth}. Recheck cube state or set SOLVER_MAX_DEPTH=35.`,
          cube_state_used: state,
        };
      }

      const verification = verifySolution(state, moves);
      if (!verification.ok) {
        return {
          success: false,
          error:
            verification.error ||
            'Kociemba returned moves, but applying them did not solve the submitted cube state. Recheck colors/orientation.',
          verification_failed: true,
          final_state: verification.final_state,
          cube_state_used: state,
        };
      }

      return {
        success: true,
        solution: moves.join(' '),
        moves,
        move_count: moves.length,
        verified: true,
        final_state: verification.final_state,
        state_sequence: verification.state_sequence,
        cube_state_used: state,
        execution_time_ms: Date.now() - t0,
        algorithm: `Kociemba Two-Phase (cubejs, verified, maxDepth ${maxDepth})`,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err?.message ||
          'This cube state is not physically solvable. Recheck every sticker color and face orientation.',
        cube_state_used: state,
      };
    }
  }
}

module.exports = {
  KociembaSolver,
  normalizeCubeState,
  verifySolution,
};
