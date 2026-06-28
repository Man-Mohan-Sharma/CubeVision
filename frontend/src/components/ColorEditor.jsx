/**
 * ColorEditor — lets users manually correct any wrongly detected sticker
 * Click any sticker cell to cycle through the 6 colors
 */
import { useState } from 'react'
import clsx from 'clsx'

const COLORS  = ['white','yellow','red','orange','blue','green']
const HEX     = { white:'#F5F5F5', yellow:'#FFD700', red:'#EF2B24', orange:'#FF6B35', blue:'#0051A2', green:'#009B48' }
const NOTE    = { white:'U', yellow:'D', red:'F', orange:'B', blue:'R', green:'L' }
const LABELS  = { U:'Top', R:'Right', F:'Front', D:'Bottom', L:'Left', B:'Back' }
const CENTER_COLOR = { U:'white', R:'blue', F:'red', D:'yellow', L:'green', B:'orange' }

const FACE_ORDER = ['U','R','F','D','L','B']

export default function ColorEditor({ faceResults, onStateChange }) {
  // Build editable grid state from detection results
  const [grids, setGrids] = useState(() => {
    const g = {}
    for (const fr of (faceResults||[])) {
      g[fr.face] = fr.colors.map(row => [...row])
      if (g[fr.face]?.[1]) g[fr.face][1][1] = CENTER_COLOR[fr.face]
    }
    return g
  })

  const [activeColor, setActiveColor] = useState('red')

  function paintCell(face, row, col) {
    if (row === 1 && col === 1) return
    const next = { ...grids, [face]: grids[face].map((r,ri) => r.map((c,ci) => ri===row&&ci===col ? activeColor : c)) }
    setGrids(next)
    // Rebuild 54-char state and notify parent
    const chars = []
    for (const f of FACE_ORDER) {
      for (let ri=0; ri<(next[f]||[]).length; ri++) {
        for (let ci=0; ci<(next[f][ri]||[]).length; ci++) {
          const c = (ri===1 && ci===1) ? CENTER_COLOR[f] : next[f][ri][ci]
          chars.push(NOTE[c]||'U')
        }
      }
    }
    if (chars.length===54) onStateChange(chars.join(''))
  }

  return (
    <div className="space-y-4">
      {/* Color palette picker */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Select a color then click any sticker to correct it:</p>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(color => (
            <button key={color} onClick={() => setActiveColor(color)}
              title={color}
              style={{ backgroundColor: HEX[color] }}
              className={clsx('w-9 h-9 rounded-lg border-2 transition-all shadow',
                activeColor===color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Active: <span className="font-semibold" style={{color:HEX[activeColor]}}>{activeColor}</span>
        </p>
      </div>

      {/* Face grids */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {FACE_ORDER.map(face => (
          <div key={face} className="text-center">
            <div className="text-xs text-gray-400 mb-1 font-mono">{face} — {LABELS[face]}</div>
            <div className="grid grid-cols-3 gap-0.5 w-fit mx-auto">
              {(grids[face]||[]).flat().map((color,i) => {
                const row=Math.floor(i/3), col=i%3
                const isCenter = i === 4
                const fixedColor = isCenter ? CENTER_COLOR[face] : color
                return (
                  <button key={i} onClick={() => paintCell(face, row, col)}
                    disabled={isCenter}
                    title={isCenter ? 'Center is fixed' : `Click to paint ${activeColor}`}
                    style={{ backgroundColor: HEX[fixedColor]||'#555', width:22, height:22 }}
                    className={clsx('rounded-sm border transition-all shadow-sm', isCenter ? 'border-white/50 cursor-default' : 'border-black/20 hover:scale-110 hover:border-white/60 cursor-pointer')}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Each face center (middle sticker) determines that face's color and cannot be wrong —
        make sure all 9 stickers per face are correct before solving.
      </p>
    </div>
  )
}
