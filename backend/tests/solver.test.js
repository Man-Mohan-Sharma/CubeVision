const { KociembaSolver } = require('../solver/kociembaSolver')
const { CubeValidator }  = require('../validator/cubeValidator')
const { StateGenerator } = require('../cube/stateGenerator')
const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

describe('CubeValidator', () => {
  const v = new CubeValidator()
  test('accepts solved state',   () => { const r=v.validate(SOLVED);     expect(r.isValid).toBe(true) })
  test('rejects wrong length',   () => { const r=v.validate('UUUUUU');   expect(r.isValid).toBe(false) })
  test('rejects wrong counts',   () => { const r=v.validate('U'.repeat(54)); expect(r.isValid).toBe(false) })
})

describe('KociembaSolver', () => {
  const s = new KociembaSolver()
  test('solves solved state', () => { const r=s.solve(SOLVED); expect(r.success).toBe(true); expect(r.move_count).toBe(0) })
  test('rejects short state', () => { const r=s.solve('UUUU'); expect(r.success).toBe(false) })
  test('returns moves array', () => { const r=s.solve(SOLVED); expect(Array.isArray(r.moves)).toBe(true) })
})

describe('StateGenerator', () => {
  const g = new StateGenerator()
  test('builds solved state from color grids', () => {
    const MAP={U:'white',R:'blue',F:'red',D:'yellow',L:'green',B:'orange'}
    const grids={}
    for (const [face,color] of Object.entries(MAP)) grids[face]=Array.from({length:3},()=>Array(3).fill(color))
    const r=g.build(grids); expect(r.error).toBeUndefined(); expect(r.state).toBe(SOLVED)
  })
  test('errors on missing face', () => { const r=g.build({}); expect(r.error).toBeTruthy() })
})
