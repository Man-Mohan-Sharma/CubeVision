const Cube = require('cubejs');

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

const DEFAULT_MAX_DEPTH = Number(process.env.SOLVER_MAX_DEPTH || 20);
const DEFAULT_TIMEOUT_MS = Number(process.env.SOLVER_TIMEOUT_MS || 15000);

function splitMoves(solution) {
  return String(solution || '').trim().split(/\s+/).filter(Boolean);
}

function verifySolution(state, solution) {
  const verifier = Cube.fromString(state);
  if (String(solution || '').trim()) {
    verifier.move(solution);
  }
  return verifier.isSolved();
}

function trySolveAtDepth(state, depth) {
  try {
    const cube = Cube.fromString(state);
    const solution = cube.solve(depth);

    if (typeof solution !== 'string') return null;

    const moves = splitMoves(solution);

    // If cubejs ignores maxDepth or returns a longer solution, do not accept it for this depth.
    if (moves.length > depth) return null;

    if (!verifySolution(state, solution)) return null;

    return {
      solution,
      moves,
      move_count: moves.length,
      verified: true,
    };
  } catch (_) {
    return null;
  }
}

function tryFallbackSolve(state) {
  const cube = Cube.fromString(state);
  const solution = cube.solve();
  const moves = splitMoves(solution);

  if (!verifySolution(state, solution)) {
    return null;
  }

  return {
    solution,
    moves,
    move_count: moves.length,
    verified: true,
  };
}

function findShortestVerifiedSolution(state, maxDepth, timeoutMs) {
  const startedAt = Date.now();

  // Iterative deepening: try 0, 1, 2, ... maxDepth.
  // First verified solution found at the lowest depth is the shortest solution
  // found by cubejs within this depth limit.
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    if (Date.now() - startedAt > timeoutMs) {
      return {
        success: false,
        timeout: true,
        error: `Optimal-depth search timed out after ${timeoutMs}ms. Try increasing SOLVER_TIMEOUT_MS or use a simpler cube state.`,
      };
    }

    const result = trySolveAtDepth(state, depth);

    if (result) {
      return {
        success: true,
        ...result,
        optimal_depth_found: depth,
        search_depth_limit: maxDepth,
        search_mode: 'iterative-depth shortest verified search',
      };
    }
  }

  return {
    success: false,
    error: `No verified solution found up to depth ${maxDepth}.`,
  };
}

class KociembaSolver {
  solve(stateStr) {
    if (typeof stateStr !== 'string' || stateStr.length !== 54) {
      return {
        success: false,
        error: 'State must be exactly 54 characters.',
      };
    }

    ensureSolverInitialized();
    const t0 = Date.now();

    try {
      const state = stateStr.toUpperCase().trim();

      if (!/^[URFDLB]{54}$/.test(state)) {
        return {
          success: false,
          error: 'State contains invalid characters. Only U, R, F, D, L, B are allowed.',
        };
      }

      const cube = Cube.fromString(state);

      if (cube.isSolved()) {
        return {
          success: true,
          solution: '',
          moves: [],
          move_count: 0,
          verified: true,
          optimal_depth_found: 0,
          execution_time_ms: Date.now() - t0,
          algorithm: 'Kociemba Two-Phase shortest verified search (cubejs)',
        };
      }

      const maxDepth = Number.isFinite(DEFAULT_MAX_DEPTH) ? DEFAULT_MAX_DEPTH : 20;
      const timeoutMs = Number.isFinite(DEFAULT_TIMEOUT_MS) ? DEFAULT_TIMEOUT_MS : 15000;

      const shortest = findShortestVerifiedSolution(state, maxDepth, timeoutMs);

      if (shortest.success) {
        return {
          ...shortest,
          execution_time_ms: Date.now() - t0,
          algorithm: 'Kociemba Two-Phase shortest verified search (cubejs)',
          note:
            'This returns the shortest verified solution found by cubejs within the configured depth limit. Exact mathematical optimal solving for every cube is much slower.',
        };
      }

      // Fallback: if strict shortest search fails or times out, still try normal cubejs once.
      // But never show it unless verification passes.
      const fallback = tryFallbackSolve(state);

      if (fallback) {
        return {
          success: true,
          ...fallback,
          verified: true,
          optimal_depth_found: null,
          search_depth_limit: maxDepth,
          search_mode: 'fallback verified Kociemba solve',
          execution_time_ms: Date.now() - t0,
          algorithm: 'Kociemba Two-Phase verified fallback (cubejs)',
          warning:
            shortest.error ||
            'Shortest-depth search did not finish, so a verified fallback solution is shown instead.',
        };
      }

      return {
        success: false,
        error:
          shortest.error ||
          'No verified solution found. The cube state is probably inconsistent. Recheck sticker colors and face orientation.',
      };
    } catch (err) {
      return {
        success: false,
        error:
          err?.message ||
          'This cube state is not solvable. Please recheck every sticker color and face orientation.',
      };
    }
  }
}

module.exports = { KociembaSolver };
