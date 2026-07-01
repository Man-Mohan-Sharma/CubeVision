const {
  colorCounts,
  validateBasicState,
  strictCubeFromString,
} = require('../cube/strictCube');

class CubeValidator {
  validate(rawState) {
    const basic = validateBasicState(rawState);
    const errors = [...basic.errors];
    const warnings = [];

    if (!errors.length) {
      try {
        strictCubeFromString(basic.state);
      } catch (err) {
        errors.push(err.message || 'This sticker pattern is not a physically possible Rubik\'s cube state.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      colorCounts: basic.counts || colorCounts(basic.state),
      checksPassed: errors.length === 0
        ? ['Length', 'Characters', 'Color counts', 'Centers', 'Real corner pieces', 'Real edge pieces', 'Orientation', 'Parity', 'Exact facelet round-trip']
        : [],
    };
  }
}

module.exports = { CubeValidator };
