const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

function rotateGridCW(grid) {
  return [
    [grid[2][0], grid[1][0], grid[0][0]],
    [grid[2][1], grid[1][1], grid[0][1]],
    [grid[2][2], grid[1][2], grid[0][2]],
  ];
}

function rotateGrid(grid, turns) {
  let out = cloneGrid(grid);
  const n = ((turns % 4) + 4) % 4;
  for (let i = 0; i < n; i += 1) out = rotateGridCW(out);
  return out;
}

function formatRotations(rotations) {
  return Object.entries(rotations)
    .filter(([, turns]) => turns > 0)
    .map(([face, turns]) => `${face}:${turns * 90}°`)
    .join(', ');
}

class OrientationFixer {
  findValidOrientation(colorGrids, stateGenerator, validator) {
    const missing = FACE_ORDER.filter(face => !colorGrids?.[face]);
    if (missing.length) return null;

    const base = stateGenerator.build(colorGrids);
    if (base.error) return null;

    const baseValidation = validator.validate(base.state);

    // Rotating faces cannot fix wrong color counts, so stop early.
    const counts = baseValidation.colorCounts || {};
    const hasBadCounts = FACE_ORDER.some(face => (counts[face] || 0) !== 9);
    if (hasBadCounts) return null;

    const candidates = [];
    const currentGrids = {};
    const currentRotations = {};

    const dfs = (idx) => {
      if (candidates.length > 1) return;

      if (idx === FACE_ORDER.length) {
        const gen = stateGenerator.build(currentGrids);
        if (gen.error) return;

        const validation = validator.validate(gen.state);
        if (validation.isValid) {
          candidates.push({
            state: gen.state,
            colorGrids: Object.fromEntries(FACE_ORDER.map(face => [face, cloneGrid(currentGrids[face])])),
            rotations: { ...currentRotations },
            validation,
          });
        }
        return;
      }

      const face = FACE_ORDER[idx];
      for (let turns = 0; turns < 4; turns += 1) {
        currentGrids[face] = rotateGrid(colorGrids[face], turns);
        currentRotations[face] = turns;
        dfs(idx + 1);
      }
    };

    dfs(0);

    if (candidates.length !== 1) {
      return {
        applied: false,
        ambiguous: candidates.length > 1,
        candidate_count: candidates.length,
      };
    }

    const candidate = candidates[0];
    return {
      applied: true,
      ...candidate,
      summary: formatRotations(candidate.rotations) || 'No rotation needed',
    };
  }
}

module.exports = { OrientationFixer, rotateGrid };
