const express = require('express');
const { CubeValidator } = require('../validator/cubeValidator');
const { KociembaSolver, normalizeCubeState } = require('../solver/kociembaSolver');
const SolveHistory = require('../models/SolveHistory');
const { optionalAuth } = require('../middleware/auth');
const { buildStateSequence, SOLVED_STATE } = require('../cube/strictCube');

const router = express.Router();
const validator = new CubeValidator();
const solver = new KociembaSolver();

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
const FACE_START = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
const CENTER_INDEXES = new Set([4, 13, 22, 31, 40, 49]);
const CENTER_LETTERS = { 4: 'U', 13: 'R', 22: 'F', 31: 'D', 40: 'L', 49: 'B' };

function lockCenters(state) {
  if (!/^[URFDLB]{54}$/.test(state)) return state;
  const arr = state.split('');
  for (const [index, letter] of Object.entries(CENTER_LETTERS)) {
    arr[Number(index)] = letter;
  }
  return arr.join('');
}

function swapLetters(state, a, b) {
  if (!/^[URFDLB]{54}$/.test(state)) return state;
  const arr = state.split('');
  for (let i = 0; i < arr.length; i += 1) {
    if (CENTER_INDEXES.has(i)) continue;
    if (arr[i] === a) arr[i] = b;
    else if (arr[i] === b) arr[i] = a;
  }
  return lockCenters(arr.join(''));
}

function swapFaceBlocks(state, faceA, faceB) {
  if (!/^[URFDLB]{54}$/.test(state)) return state;
  const arr = state.split('');
  const a = FACE_START[faceA];
  const b = FACE_START[faceB];
  if (a === undefined || b === undefined) return state;

  for (let i = 0; i < 9; i += 1) {
    const tmp = arr[a + i];
    arr[a + i] = arr[b + i];
    arr[b + i] = tmp;
  }
  return lockCenters(arr.join(''));
}

function getColorCounts(state) {
  return state.split('').reduce((acc, ch) => {
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 });
}

function orientationSuggestions(state) {
  if (!/^[URFDLB]{54}$/.test(state)) return [];

  const candidates = [
    {
      id: 'swap_ud_colors',
      label: 'Swap U/D colors',
      description: 'Use this when white/yellow stickers were labelled opposite but the top/bottom face slots are correct.',
      cube_state: swapLetters(state, 'U', 'D'),
    },
    {
      id: 'swap_ud_faces',
      label: 'Swap U/D faces',
      description: 'Use this when the top face photo and bottom face photo were assigned to each other.',
      cube_state: swapFaceBlocks(state, 'U', 'D'),
    },
    {
      id: 'swap_ud_faces_and_colors',
      label: 'Swap U/D faces + colors',
      description: 'Use only if both the face slots and white/yellow labels are opposite.',
      cube_state: swapLetters(swapFaceBlocks(state, 'U', 'D'), 'U', 'D'),
    },
  ];

  const seen = new Set([state]);
  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.cube_state)) return false;
      seen.add(candidate.cube_state);
      return true;
    })
    .map((candidate) => {
      const validation = validator.validate(candidate.cube_state);
      return {
        ...candidate,
        is_valid: validation.isValid,
        errors: validation.errors,
        color_counts: validation.colorCounts || getColorCounts(candidate.cube_state),
      };
    });
}


function parseMoveList(value) {
  if (Array.isArray(value)) return value.map((m) => String(m).trim()).filter(Boolean);
  return String(value || '').trim().split(/\s+/).filter(Boolean);
}

router.post('/sequence', async (req, res) => {
  try {
    const state = normalizeCubeState(req.body?.cube_state || SOLVED_STATE);
    const moves = parseMoveList(req.body?.moves || req.body?.solution || '');

    if (!/^[URFDLB]{54}$/.test(state)) {
      return res.status(400).json({
        success: false,
        error: 'cube_state must be a valid 54-character URFDLB string.',
      });
    }

    if (moves.length > 200) {
      return res.status(400).json({ success: false, error: 'Too many moves for animation sequence.' });
    }

    const sequence = buildStateSequence(state, moves);
    return res.json({
      success: true,
      cube_state: state,
      moves,
      move_count: moves.length,
      state_sequence: sequence,
      final_state: sequence[sequence.length - 1],
      note: 'This endpoint applies moves forward. Pattern algorithms should start from the solved cube; solver algorithms start from the scanned cube.',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'Could not build move animation sequence.',
    });
  }
});

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { cube_state, source = 'unknown' } = req.body;

    if (!cube_state || typeof cube_state !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'cube_state is required (54-char URFDLB string).',
      });
    }

    const state = normalizeCubeState(cube_state);

    if (state.length !== 54) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cube state',
        cube_state: state,
        error: `cube_state must contain exactly 54 URFDLB stickers after cleanup. Got ${state.length}.`,
      });
    }

    const val = validator.validate(state);
    if (!val.isValid) {
      return res.json({
        success: false,
        message: 'Invalid cube state',
        cube_state: state,
        error: val.errors.join('; '),
        color_counts: val.colorCounts,
        orientation_suggestions: orientationSuggestions(state),
      });
    }

    const result = solver.solve(state);
    if (!result.success) {
      return res.json({
        success: false,
        message: 'Solver failed',
        cube_state: state,
        error: result.error,
        final_state: result.final_state,
        orientation_suggestions: orientationSuggestions(state),
      });
    }

    const record = {
      user_id: req.user?._id || null,
      cube_state: state,
      solution: result.solution,
      moves: result.moves,
      move_count: result.move_count,
      execution_time_ms: result.execution_time_ms,
      source: ['photo', 'manual', 'edited'].includes(source) ? source : 'unknown',
    };

    SolveHistory.create(record).catch((e) => {
      console.warn('History save failed:', e.message);
    });

    return res.json({
      success: true,
      message: `Solved in ${result.move_count} moves`,
      saved_to_account: Boolean(req.user),
      cube_state: state,
      solution: result.solution,
      moves: result.moves,
      move_count: result.move_count,
      execution_time_ms: result.execution_time_ms,
      algorithm: result.algorithm,
      verified: result.verified,
      final_state: result.final_state,
      state_sequence: result.state_sequence,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { cube_state } = req.body;

    if (!cube_state) {
      return res.status(400).json({ is_valid: false, errors: ['cube_state required'] });
    }

    const state = normalizeCubeState(cube_state);
    const val = validator.validate(state);

    res.json({
      is_valid: val.isValid,
      cube_state: state,
      errors: val.errors,
      warnings: val.warnings,
      color_counts: val.colorCounts,
      checks_passed: val.checksPassed || [],
      orientation_suggestions: orientationSuggestions(state),
    });
  } catch (err) {
    res.status(500).json({ is_valid: false, errors: [err.message] });
  }
});

module.exports = router;
