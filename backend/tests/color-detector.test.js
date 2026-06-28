const sharp = require('sharp')
const { ColorDetector } = require('../vision/colorDetector')

const RGB = {
  U: { r: 245, g: 245, b: 245 },
  R: { r: 0, g: 81, b: 162 },
  F: { r: 239, g: 43, b: 36 },
  D: { r: 255, g: 215, b: 0 },
  L: { r: 0, g: 155, b: 72 },
  B: { r: 255, g: 107, b: 53 },
}

async function solidPng({ r, g, b }) {
  return sharp({
    create: { width: 300, height: 300, channels: 3, background: { r, g, b } },
  }).png().toBuffer()
}

describe('ColorDetector', () => {
  test('calibrates from face centers and detects a solved cube from synthetic faces', async () => {
    const detector = new ColorDetector()
    const buffers = {}
    for (const [face, rgb] of Object.entries(RGB)) buffers[face] = await solidPng(rgb)

    const result = await detector.processAllFaces(buffers)
    expect(result.error).toBeUndefined()
    expect(result.colorGrids.U.flat().every(c => c === 'white')).toBe(true)
    expect(result.colorGrids.R.flat().every(c => c === 'blue')).toBe(true)
    expect(result.colorGrids.F.flat().every(c => c === 'red')).toBe(true)
    expect(result.colorGrids.D.flat().every(c => c === 'yellow')).toBe(true)
    expect(result.colorGrids.L.flat().every(c => c === 'green')).toBe(true)
    expect(result.colorGrids.B.flat().every(c => c === 'orange')).toBe(true)
  })
})
