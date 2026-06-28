/**
 * Color Detector v4 — calibrated face-center matching
 * ====================================================
 * Why this version is more reliable than fixed HSV thresholds:
 * 1. It samples only the inner part of each sticker, avoiding black borders.
 * 2. It uses the uploaded center sticker of each face as the color reference.
 * 3. It compares stickers in CIE Lab space, which is much closer to human color
 *    perception than raw RGB/HSV thresholds.
 * 4. It returns confidence values so the frontend can push users to review weak
 *    detections instead of silently accepting bad colors.
 */

const sharp = require('sharp');

const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
const FACE_NAMES = {
  U: 'Top (White)',
  R: 'Right (Blue)',
  F: 'Front (Red)',
  D: 'Bottom (Yellow)',
  L: 'Left (Green)',
  B: 'Back (Orange)',
};

const FACE_TO_COLOR = {
  U: 'white',
  R: 'blue',
  F: 'red',
  D: 'yellow',
  L: 'green',
  B: 'orange',
};

const COLOR_TO_NOTE = {
  white: 'U',
  yellow: 'D',
  red: 'F',
  orange: 'B',
  blue: 'R',
  green: 'L',
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function srgbToLinear(v) {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToXyz({ r, g, b }) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);

  return {
    x: R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    y: R * 0.2126729 + G * 0.7151522 + B * 0.0721750,
    z: R * 0.0193339 + G * 0.1191920 + B * 0.9503041,
  };
}

function xyzToLab({ x, y, z }) {
  // D65 reference white
  const Xn = 0.95047;
  const Yn = 1.00000;
  const Zn = 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116));
  const fx = f(x / Xn);
  const fy = f(y / Yn);
  const fz = f(z / Zn);

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function rgbToLab(rgb) {
  return xyzToLab(rgbToXyz(rgb));
}

function labDistance(a, b) {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function rgbToHsv({ r, g, b }) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb), d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, v: v * 100 };
}

function circularHueDistance(a, b) {
  return Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
}

function robustAverage(pixels) {
  if (!pixels.length) return { r: 255, g: 255, b: 255 };

  const brightness = pixels
    .map((p, idx) => ({ idx, y: 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b }))
    .sort((a, b) => a.y - b.y);

  // Drop darkest/brightest pixels to reduce black grid lines, shadows, and glare.
  const trim = Math.floor(brightness.length * 0.12);
  const kept = brightness.slice(trim, Math.max(trim + 1, brightness.length - trim)).map(x => pixels[x.idx]);

  const sum = kept.reduce((acc, p) => {
    acc.r += p.r; acc.g += p.g; acc.b += p.b;
    return acc;
  }, { r: 0, g: 0, b: 0 });

  return {
    r: Math.round(sum.r / kept.length),
    g: Math.round(sum.g / kept.length),
    b: Math.round(sum.b / kept.length),
  };
}

function sampleRegion(data, width, x1, y1, x2, y2) {
  const pixels = [];
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * width + x) * 3;
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }
  const rgb = robustAverage(pixels);
  return { rgb, hsv: rgbToHsv(rgb), lab: rgbToLab(rgb) };
}

function classifySample(sample, references) {
  const scored = references.map((ref) => {
    const labD = labDistance(sample.lab, ref.lab);
    const hueD = circularHueDistance(sample.hsv.h, ref.hsv.h) / 3.5;
    const satD = Math.abs(sample.hsv.s - ref.hsv.s) / 5;
    const valD = Math.abs(sample.hsv.v - ref.hsv.v) / 6;

    // Lab carries most of the decision. HSV helps separate red/orange/yellow
    // and prevents dim white from drifting into yellow.
    let score = (labD * 1.0) + (hueD * 0.22) + (satD * 0.16) + (valD * 0.10);

    // White should stay low-saturation. Penalize saturated stickers becoming U.
    if (ref.face === 'U' && sample.hsv.s > Math.max(28, ref.hsv.s + 22)) score += 16;

    // Yellow is often bright like white, so encourage hue separation.
    if (ref.face === 'D' && sample.hsv.s < 22) score += 12;

    return { ...ref, score };
  }).sort((a, b) => a.score - b.score);

  const best = scored[0];
  const second = scored[1] || { score: best.score + 25 };
  const margin = Math.max(0, second.score - best.score);
  const confidence = clamp(0.30 + (margin / Math.max(second.score, 1)) * 0.70, 0.30, 0.99);

  return {
    face: best.face,
    color: FACE_TO_COLOR[best.face],
    confidence: Number(confidence.toFixed(3)),
    distance: Number(best.score.toFixed(2)),
    second_best: second.face,
  };
}

class ColorDetector {
  async readFaceSamples(imageBuffer) {
    const SIZE = 300;
    const GRID = 3;

    const meta = await sharp(imageBuffer).metadata();
    const W0 = meta.width || 300;
    const H0 = meta.height || 300;

    // Use a centered square crop. 92% keeps sticker rows while removing hands/table.
    const cropSize = Math.floor(Math.min(W0, H0) * 0.92);
    const left = Math.max(0, Math.floor((W0 - cropSize) / 2));
    const top = Math.max(0, Math.floor((H0 - cropSize) / 2));

    const { data } = await sharp(imageBuffer)
      .rotate()
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(SIZE, SIZE, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cell = Math.floor(SIZE / GRID);
    const inner = 0.28;
    const margin = Math.floor(cell * inner);
    const samples = [];

    for (let row = 0; row < GRID; row++) {
      const sampleRow = [];
      for (let col = 0; col < GRID; col++) {
        const x1 = col * cell + margin;
        const y1 = row * cell + margin;
        const x2 = Math.min(SIZE, (col + 1) * cell - margin);
        const y2 = Math.min(SIZE, (row + 1) * cell - margin);
        sampleRow.push(sampleRegion(data, SIZE, x1, y1, x2, y2));
      }
      samples.push(sampleRow);
    }

    return samples;
  }

  async detectFace(imageBuffer, references = null, assumedFace = null) {
    const samples = await this.readFaceSamples(imageBuffer);

    // Backward-compatible single-face mode for tests/tools. Without all six
    // face centers, fallback to the six canonical colors.
    const refs = references || [
      { face: 'U', color: 'white', rgb: { r: 245, g: 245, b: 245 } },
      { face: 'R', color: 'blue', rgb: { r: 0, g: 81, b: 162 } },
      { face: 'F', color: 'red', rgb: { r: 239, g: 43, b: 36 } },
      { face: 'D', color: 'yellow', rgb: { r: 255, g: 215, b: 0 } },
      { face: 'L', color: 'green', rgb: { r: 0, g: 155, b: 72 } },
      { face: 'B', color: 'orange', rgb: { r: 255, g: 107, b: 53 } },
    ].map(r => ({ ...r, hsv: rgbToHsv(r.rgb), lab: rgbToLab(r.rgb) }));

    const colorGrid = Array.from({ length: 3 }, () => Array(3).fill('?'));
    const notationGrid = Array.from({ length: 3 }, () => Array(3).fill('?'));
    const confidenceGrid = Array.from({ length: 3 }, () => Array(3).fill(0));
    const distances = Array.from({ length: 3 }, () => Array(3).fill(null));
    const confs = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        let cls = classifySample(samples[row][col], refs);

        // A real cube center is fixed. If the caller tells us which face this
        // photo represents, lock the middle sticker to that face. This prevents
        // one bad center crop from poisoning the whole cube state.
        if (assumedFace && row === 1 && col === 1) {
          cls = {
            face: assumedFace,
            color: FACE_TO_COLOR[assumedFace],
            confidence: 0.99,
            distance: 0,
            second_best: null,
          };
        }

        colorGrid[row][col] = cls.color;
        notationGrid[row][col] = cls.face;
        confidenceGrid[row][col] = cls.confidence;
        distances[row][col] = { best: cls.face, second_best: cls.second_best, distance: cls.distance };
        confs.push(cls.confidence);
      }
    }

    const avgConf = Number((confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(3));
    return { colorGrid, notationGrid, confidenceGrid, confidence: avgConf, distances, samples };
  }

  async processAllFaces(faceBuffers) {
    const missing = FACE_ORDER.filter(face => !faceBuffers[face]);
    if (missing.length) return { error: `Missing image for face '${missing[0]}' (${FACE_NAMES[missing[0]]})` };

    const rawSamples = {};
    for (const face of FACE_ORDER) {
      try {
        rawSamples[face] = await this.readFaceSamples(faceBuffers[face]);
      } catch (err) {
        return { error: `Error reading face '${face}': ${err.message}` };
      }
    }

    // Calibrate from the center sticker of each uploaded face.
    const references = FACE_ORDER.map(face => {
      const sample = rawSamples[face][1][1];
      return {
        face,
        color: FACE_TO_COLOR[face],
        rgb: sample.rgb,
        hsv: sample.hsv,
        lab: sample.lab,
      };
    });

    const colorGrids = {}, notationGrids = {}, confidenceGrids = {}, confidences = {}, diagnostics = {};

    for (const face of FACE_ORDER) {
      try {
        const r = await this.detectFace(faceBuffers[face], references, face);
        colorGrids[face] = r.colorGrid;
        notationGrids[face] = r.notationGrid;
        confidenceGrids[face] = r.confidenceGrid;
        confidences[face] = r.confidence;
        diagnostics[face] = r.distances;
        console.log(`Face ${face}: conf=${r.confidence} ${r.notationGrid.flat().join(' ')}`);
      } catch (err) {
        return { error: `Error processing face '${face}': ${err.message}` };
      }
    }

    return {
      colorGrids,
      notationGrids,
      confidenceGrids,
      confidences,
      calibration: references.map(r => ({ face: r.face, color: r.color, rgb: r.rgb })),
      diagnostics,
    };
  }
}

module.exports = { ColorDetector, FACE_NAMES, FACE_ORDER, COLOR_TO_NOTE, FACE_TO_COLOR };
