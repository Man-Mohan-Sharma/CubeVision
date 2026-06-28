const FACE_ORDER = ['U','R','F','D','L','B'];
const COLOR_TO_LETTER = { white:'U', yellow:'D', red:'F', orange:'B', blue:'R', green:'L' };

class StateGenerator {
  build(colorGrids) {
    const missing = FACE_ORDER.filter(f => !colorGrids[f]);
    if (missing.length) return { error:`Missing face images for: [${missing.join(', ')}]` };
    const chars = [];
    for (const face of FACE_ORDER) {
      const grid = colorGrids[face];
      if (!Array.isArray(grid)||grid.length!==3) return { error:`Face ${face} grid is not 3x3.` };
      for (const row of grid) {
        for (const color of row) {
          const letter = COLOR_TO_LETTER[color];
          if (!letter) return { error:`Unrecognised color '${color}' on face ${face}. Check lighting and retry.` };
          chars.push(letter);
        }
      }
    }
    if (chars.length!==54) return { error:`Expected 54 stickers, got ${chars.length}.` };
    const state = chars.join('');
    console.log('Generated state:', state);
    return { state };
  }

  stateToFaceGrids(state) {
    if (state.length!==54) throw new Error(`State must be 54 chars, got ${state.length}`);
    const result = {};
    FACE_ORDER.forEach((face,i) => {
      const seg = state.slice(i*9,(i+1)*9);
      result[face] = [seg.slice(0,3).split(''), seg.slice(3,6).split(''), seg.slice(6,9).split('')];
    });
    return result;
  }
}

module.exports = { StateGenerator };
