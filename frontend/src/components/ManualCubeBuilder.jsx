/**
 * ManualCubeBuilder — build a full 54-sticker cube state by hand, no photos
 * or detection involved. Pick a color from the palette, then tap stickers
 * on each face's 3x3 grid to paint them. Centers are fixed (they define
 * each face and can never change on a real cube).
 */
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, RotateCcw } from 'lucide-react'

const COLORS = ['white', 'yellow', 'red', 'orange', 'blue', 'green']
const HEX = { white: '#F5F5F5', yellow: '#FFD700', red: '#EF2B24', orange: '#FF6B35', blue: '#0051A2', green: '#009B48' }
const NOTE = { white: 'U', yellow: 'D', red: 'F', orange: 'B', blue: 'R', green: 'L' }
const CENTER_COLOR = { U: 'white', R: 'blue', F: 'red', D: 'yellow', L: 'green', B: 'orange' }
const LABELS = { U: 'Top', R: 'Right', F: 'Front', D: 'Bottom', L: 'Left', B: 'Back' }
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']

function blankGrids() {
  const g = {}
  for (const f of FACE_ORDER) {
    g[f] = Array.from({ length: 9 }, (_, i) => (i === 4 ? CENTER_COLOR[f] : null))
  }
  return g
}

export default function ManualCubeBuilder({ onStateChange }) {
  const [grids, setGrids] = useState(blankGrids)
  const [activeColor, setActiveColor] = useState('white')

  const filledCount = useMemo(
    () => FACE_ORDER.reduce((n, f) => n + grids[f].filter(Boolean).length, 0),
    [grids]
  )
  const isComplete = filledCount === 54

  function emit(next) {
    const chars = []
    for (const f of FACE_ORDER) {
      for (const c of next[f]) chars.push(c ? NOTE[c] : null)
    }
    onStateChange(chars.every(Boolean) ? chars.join('') : null)
  }

  function paintCell(face, idx) {
    if (idx === 4) return // center is fixed — defines the face
    const next = { ...grids, [face]: grids[face].map((c, i) => (i === idx ? activeColor : c)) }
    setGrids(next)
    emit(next)
  }

  function fillFaceSolid(face) {
    const next = { ...grids, [face]: grids[face].map(() => CENTER_COLOR[face]) }
    setGrids(next)
    emit(next)
  }

  function clearAll() {
    const next = blankGrids()
    setGrids(next)
    emit(next)
  }

  return (
    <div className="space-y-5">
      {/* Palette */}
      <div>
        <p className="text-xs text-gray-400 mb-2">
          Pick a color, then tap stickers on the grids below. Centers (highlighted) are fixed.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                title={color}
                style={{ backgroundColor: HEX[color] }}
                className={clsx(
                  'w-10 h-10 rounded-lg border-2 transition-all shadow',
                  activeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            Active: <span className="font-semibold" style={{ color: HEX[activeColor] }}>{activeColor}</span>
          </span>
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-dark-border hover:border-gray-500 transition-all"
          >
            <RotateCcw size={12} />Clear all
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${(filledCount / 54) * 100}%` }} />
        </div>
        <span className={clsx('text-xs font-mono shrink-0', isComplete ? 'text-accent' : 'text-gray-500')}>
          {filledCount}/54{isComplete && <CheckCircle2 size={12} className="inline ml-1 -mt-0.5" />}
        </span>
      </div>

      {/* Face grids */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
        {FACE_ORDER.map(face => (
          <div key={face} className="text-center">
            <div className="text-xs text-gray-400 mb-1.5 font-mono">{face} — {LABELS[face]}</div>
            <div className="grid grid-cols-3 gap-1 w-fit mx-auto p-1.5 rounded-lg bg-black/20">
              {grids[face].map((color, i) => (
                <button
                  key={i}
                  onClick={() => paintCell(face, i)}
                  disabled={i === 4}
                  title={i === 4 ? 'Center (fixed)' : `Paint ${activeColor}`}
                  style={{ backgroundColor: color ? HEX[color] : '#262633', width: 26, height: 26 }}
                  className={clsx(
                    'rounded-sm transition-all',
                    i === 4
                      ? 'border-2 border-white/50 cursor-default'
                      : clsx('border cursor-pointer hover:scale-110 hover:border-white/60', color ? 'border-black/20' : 'border-dashed border-gray-600')
                  )}
                />
              ))}
            </div>
            <button onClick={() => fillFaceSolid(face)} className="mt-1.5 text-[10px] text-gray-500 hover:text-accent transition-colors">
              fill solid
            </button>
          </div>
        ))}
      </div>

      {!isComplete && (
        <p className="text-xs text-yellow-400/80 text-center">
          Paint every sticker (dashed = not set yet) to enable validation — {54 - filledCount} left.
        </p>
      )}
    </div>
  )
}
