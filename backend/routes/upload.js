const express = require('express');
const multer = require('multer');
const { ColorDetector, FACE_NAMES } = require('../vision/colorDetector');
const { StateGenerator } = require('../cube/stateGenerator');
const { CubeValidator } = require('../validator/cubeValidator');
const { OrientationFixer, rotateGrid } = require('../cube/orientationFixer');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`Only JPG/PNG/WEBP accepted, got ${file.mimetype}`));
  },
});

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const FIELDS = FACES.map(f => ({ name: `face_${f}`, maxCount: 1 }));
const detector = new ColorDetector();
const stateGen = new StateGenerator();
const validator = new CubeValidator();
const orientationFixer = new OrientationFixer();

function averageConfidence(confidences) {
  const vals = Object.values(confidences || {}).filter(v => Number.isFinite(v));
  if (!vals.length) return 0;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3));
}

function rotateConfidenceGrid(grid, turns) {
  if (!Array.isArray(grid)) return grid;
  return rotateGrid(grid, turns || 0);
}

function makeFaceResults({ colorGrids, notationGrids, confidenceGrids, confidences, rotations = null }) {
  return FACES.map(face => {
    const turns = rotations?.[face] || 0;
    return {
      face,
      face_name: FACE_NAMES[face],
      colors: colorGrids[face],
      notation: notationGrids?.[face] ? rotateGrid(notationGrids[face], turns) : undefined,
      confidence_grid: confidenceGrids?.[face] ? rotateConfidenceGrid(confidenceGrids[face], turns) : undefined,
      confidence: confidences?.[face],
      auto_rotated_turns: turns,
    };
  });
}

router.post('/', upload.fields(FIELDS), async (req, res) => {
  try {
    const files = req.files || {};
    const missing = FACES.filter(f => !files[`face_${f}`]?.[0]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing: ${missing.join(', ')}`,
        errors: [`Upload images for: ${missing.join(', ')}`],
      });
    }

    const faceBuffers = {};
    for (const face of FACES) faceBuffers[face] = files[`face_${face}`][0].buffer;

    const det = await detector.processAllFaces(faceBuffers);
    if (det.error) {
      return res.status(422).json({ success: false, message: det.error, errors: [det.error] });
    }

    const { colorGrids, notationGrids, confidenceGrids, confidences, calibration, diagnostics } = det;

    const gen = stateGen.build(colorGrids);
    if (gen.error) {
      return res.status(422).json({
        success: false,
        message: gen.error,
        face_results: makeFaceResults({ colorGrids, notationGrids, confidenceGrids, confidences }),
        errors: [gen.error],
        detection: { calibration, diagnostics, average_confidence: averageConfidence(confidences) },
      });
    }

    let finalColorGrids = colorGrids;
    let finalState = gen.state;
    let validation = validator.validate(finalState);
    let autoOrientationFix = null;
    let orientationWarning = null;

    // Main fix: photos are often uploaded sideways/upside-down. The center color can be right,
    // but the 3x3 face orientation is wrong, making a real scramble look impossible.
    // Try all 4 rotations of each uploaded face and use the unique physically valid orientation.
    if (!validation.isValid) {
      const fix = orientationFixer.findValidOrientation(colorGrids, stateGen, validator);

      if (fix?.applied) {
        finalColorGrids = fix.colorGrids;
        finalState = fix.state;
        validation = fix.validation;
        autoOrientationFix = fix.rotations;
        orientationWarning = `Auto-fixed uploaded face orientation: ${fix.summary}. Review the 3D editor before solving.`;
      } else if (fix?.ambiguous) {
        orientationWarning = 'Detected colors have multiple possible face orientations. Use Manual Edit → face rotate buttons to match your real cube.';
      }
    }

    const avgConf = averageConfidence(confidences);
    const lowConfidenceFaces = Object.entries(confidences)
      .filter(([, c]) => c < 0.62)
      .map(([face]) => face);

    const warnings = [
      ...(validation.warnings || []),
      ...(orientationWarning ? [orientationWarning] : []),
      ...(lowConfidenceFaces.length
        ? [`Low photo confidence on face(s): ${lowConfidenceFaces.join(', ')}. Review the detected grid before solving.`]
        : []),
    ];

    return res.json({
      success: validation.isValid,
      message: validation.isValid
        ? 'Cube detected successfully'
        : 'Cube photos were processed, but the detected state is not physically valid. Use Manual Edit to fix wrong stickers or rotate face grids.',
      cube_state: finalState,
      face_results: makeFaceResults({
        colorGrids: finalColorGrids,
        notationGrids,
        confidenceGrids,
        confidences,
        rotations: autoOrientationFix,
      }),
      auto_orientation_fix: autoOrientationFix,
      detection: {
        average_confidence: avgConf,
        low_confidence_faces: lowConfidenceFaces,
        calibration,
        diagnostics,
      },
      validation: {
        is_valid: validation.isValid,
        errors: validation.errors,
        warnings,
        color_counts: validation.colorCounts,
        checks_passed: validation.checksPassed || [],
      },
      errors: validation.errors,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message, errors: [err.message] });
  }
});

module.exports = router;
