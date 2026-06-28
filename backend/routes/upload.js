const express = require('express');
const multer = require('multer');
const { ColorDetector, FACE_NAMES } = require('../vision/colorDetector');
const { StateGenerator } = require('../cube/stateGenerator');
const { CubeValidator } = require('../validator/cubeValidator');

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

function averageConfidence(confidences) {
  const vals = Object.values(confidences || {}).filter(v => Number.isFinite(v));
  if (!vals.length) return 0;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3));
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
    const faceResults = FACES.map(face => ({
      face,
      face_name: FACE_NAMES[face],
      colors: colorGrids[face],
      notation: notationGrids[face],
      confidence_grid: confidenceGrids[face],
      confidence: confidences[face],
    }));

    const gen = stateGen.build(colorGrids);
    if (gen.error) {
      return res.status(422).json({
        success: false,
        message: gen.error,
        face_results: faceResults,
        errors: [gen.error],
        detection: { calibration, diagnostics, average_confidence: averageConfidence(confidences) },
      });
    }

    const val = validator.validate(gen.state);
    const avgConf = averageConfidence(confidences);
    const lowConfidenceFaces = Object.entries(confidences)
      .filter(([, c]) => c < 0.62)
      .map(([face]) => face);

    const warnings = [
      ...(val.warnings || []),
      ...(lowConfidenceFaces.length
        ? [`Low photo confidence on face(s): ${lowConfidenceFaces.join(', ')}. Review the detected grid before solving.`]
        : []),
    ];

    return res.json({
      success: val.isValid,
      message: val.isValid
        ? 'Cube detected successfully'
        : 'Cube photos were processed, but the detected state is not physically valid. Use Manual Edit to fix wrong stickers.',
      // Return the generated state even when invalid so the UI can show the net
      // and the user can correct it instead of being pushed back to upload.
      cube_state: gen.state,
      face_results: faceResults,
      detection: {
        average_confidence: avgConf,
        low_confidence_faces: lowConfidenceFaces,
        calibration,
        diagnostics,
      },
      validation: {
        is_valid: val.isValid,
        errors: val.errors,
        warnings,
        color_counts: val.colorCounts,
        checks_passed: val.checksPassed || [],
      },
      errors: val.errors,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message, errors: [err.message] });
  }
});

module.exports = router;
