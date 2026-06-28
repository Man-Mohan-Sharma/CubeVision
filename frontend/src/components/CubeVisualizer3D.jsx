import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, SkipForward } from 'lucide-react'
import clsx from 'clsx'

const COLORS = {
  U: 0xF5F5F5,
  D: 0xFFD700,
  F: 0xEF2B24,
  B: 0xFF6B35,
  R: 0x0051A2,
  L: 0x009B48,
}
const BLACK = 0x111111
const SOLVED_STATE = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const CUBIE_SPACING = 1.05
const LAYER_EPS = 0.18

const MATERIAL_INDEX = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 }
const NORMAL_VECTOR = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
}

function normalFromVector([x, y, z]) {
  if (x === 1) return 'R'
  if (x === -1) return 'L'
  if (y === 1) return 'U'
  if (y === -1) return 'D'
  if (z === 1) return 'F'
  return 'B'
}

function createFaceletMap() {
  const result = []

  // Facelet order is the same as cubejs/Kociemba: U R F D L B, each 3x3 row-major.
  // Coordinates are in cube-local space: x=right, y=up, z=front.
  for (const z of [-1, 0, 1]) for (const x of [-1, 0, 1]) result.push({ x, y: 1, z, normal: 'U' })
  for (const y of [1, 0, -1]) for (const z of [1, 0, -1]) result.push({ x: 1, y, z, normal: 'R' })
  for (const y of [1, 0, -1]) for (const x of [-1, 0, 1]) result.push({ x, y, z: 1, normal: 'F' })
  for (const z of [1, 0, -1]) for (const x of [-1, 0, 1]) result.push({ x, y: -1, z, normal: 'D' })
  for (const y of [1, 0, -1]) for (const z of [-1, 0, 1]) result.push({ x: -1, y, z, normal: 'L' })
  for (const y of [1, 0, -1]) for (const x of [1, 0, -1]) result.push({ x, y, z: -1, normal: 'B' })

  return result
}

const FACELETS = createFaceletMap()

function rotateQuarter([x, y, z], axis, quarterTurns) {
  let nx = x
  let ny = y
  let nz = z
  const turns = ((quarterTurns % 4) + 4) % 4

  for (let i = 0; i < turns; i += 1) {
    if (axis === 'x') {
      ;[ny, nz] = [-nz, ny]
    } else if (axis === 'y') {
      ;[nx, nz] = [nz, -nx]
    } else {
      ;[nx, ny] = [-ny, nx]
    }
  }

  return [nx, ny, nz]
}

function parseMove(move) {
  if (!move) return null

  const base = move.replace(/[2']/g, '')
  const prime = move.includes("'")
  const doubleTurn = move.includes('2')
  const map = {
    U: { axis: 'y', layer: 1, sign: 1 },
    D: { axis: 'y', layer: -1, sign: -1 },
    R: { axis: 'x', layer: 1, sign: 1 },
    L: { axis: 'x', layer: -1, sign: -1 },
    F: { axis: 'z', layer: 1, sign: 1 },
    B: { axis: 'z', layer: -1, sign: -1 },
  }
  const parsed = map[base]
  if (!parsed) return null

  const quarterTurns = (doubleTurn ? 2 : 1) * (prime ? 1 : -1) * parsed.sign
  return {
    ...parsed,
    quarterTurns,
    angle: quarterTurns * (Math.PI / 2),
  }
}

function normaliseState(cubeState) {
  const state = typeof cubeState === 'string' ? cubeState.toUpperCase().trim() : ''
  return /^[URFDLB]{54}$/.test(state) ? state : SOLVED_STATE
}

function makeCubie(x, y, z, stickers = {}) {
  const group = new THREE.Group()
  group.position.set(x * CUBIE_SPACING, y * CUBIE_SPACING, z * CUBIE_SPACING)
  group.userData = { isCubie: true }

  const materials = [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshLambertMaterial({ color: BLACK }))
  for (const [normal, stickerLetter] of Object.entries(stickers)) {
    const materialIndex = MATERIAL_INDEX[normal]
    if (materialIndex !== undefined) {
      materials[materialIndex] = new THREE.MeshLambertMaterial({ color: COLORS[stickerLetter] ?? BLACK })
    }
  }

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.97, 0.97), materials)
  group.add(mesh)
  return group
}

function buildCubiesFromState(state) {
  const stickersByCubie = new Map()

  FACELETS.forEach((facelet, index) => {
    const key = `${facelet.x},${facelet.y},${facelet.z}`
    const stickers = stickersByCubie.get(key) || {}
    stickers[facelet.normal] = state[index]
    stickersByCubie.set(key, stickers)
  })

  const cubies = []
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        cubies.push(makeCubie(x, y, z, stickersByCubie.get(`${x},${y},${z}`) || {}))
      }
    }
  }
  return cubies
}

function disposeCubie(cubie) {
  cubie.traverse((obj) => {
    if (!obj.isMesh) return
    obj.geometry?.dispose?.()
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.())
    else obj.material?.dispose?.()
  })
}

export default function CubeVisualizer3D({ solution, cubeState }) {
  const mountRef = useRef(null)
  const refs = useRef({ renderer: null, scene: null, camera: null, group: null, cubies: [], raf: null, animRaf: null })
  const [currentMove, setCurrentMove] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [animating, setAnimating] = useState(false)

  const moves = useMemo(() => (solution ? solution.trim().split(/\s+/).filter(Boolean) : []), [solution])
  const initialState = useMemo(() => normaliseState(cubeState), [cubeState])

  const resetCubies = useCallback((state = initialState) => {
    const { group, cubies } = refs.current
    if (!group) return

    cubies.forEach((cubie) => {
      group.remove(cubie)
      disposeCubie(cubie)
    })

    const nextCubies = buildCubiesFromState(state)
    nextCubies.forEach((cubie) => group.add(cubie))
    refs.current.cubies = nextCubies
  }, [initialState])

  const runMove = useCallback((move, { animated = false, onDone } = {}) => {
    const parsed = parseMove(move)
    if (!parsed) {
      onDone?.()
      return
    }

    const { group, cubies } = refs.current
    if (!group || !cubies.length) {
      onDone?.()
      return
    }

    const { axis, layer, angle } = parsed
    const affected = cubies.filter((cubie) => {
      const worldPosition = new THREE.Vector3()
      cubie.getWorldPosition(worldPosition)
      group.worldToLocal(worldPosition)
      const value = axis === 'x' ? worldPosition.x : axis === 'y' ? worldPosition.y : worldPosition.z
      return Math.abs(value - layer * CUBIE_SPACING) < LAYER_EPS
    })

    if (!affected.length) {
      onDone?.()
      return
    }

    const pivot = new THREE.Group()
    group.add(pivot)
    affected.forEach((cubie) => pivot.attach(cubie))

    const axisVector = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)

    const finish = () => {
      pivot.setRotationFromAxisAngle(axisVector, angle)
      pivot.updateMatrixWorld(true)
      affected.forEach((cubie) => group.attach(cubie))
      group.remove(pivot)
      if (animated) setAnimating(false)
      onDone?.()
    }

    if (!animated) {
      finish()
      return
    }

    const startedAt = performance.now()
    const duration = 320
    const animate = (now) => {
      const t = Math.min((now - startedAt) / duration, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      pivot.setRotationFromAxisAngle(axisVector, angle * eased)

      if (t < 1) {
        refs.current.animRaf = requestAnimationFrame(animate)
      } else {
        finish()
      }
    }

    refs.current.animRaf = requestAnimationFrame(animate)
  }, [])

  const jumpToMove = useCallback((targetIndex) => {
    if (animating) return
    const safeTarget = Math.max(-1, Math.min(targetIndex, moves.length - 1))
    setPlaying(false)
    resetCubies(initialState)
    for (let i = 0; i <= safeTarget; i += 1) runMove(moves[i], { animated: false })
    setCurrentMove(safeTarget)
  }, [animating, initialState, moves, resetCubies, runMove])

  const stepForward = useCallback(() => {
    if (animating || currentMove >= moves.length - 1) return
    const nextMoveIndex = currentMove + 1
    setCurrentMove(nextMoveIndex)
    setAnimating(true)
    runMove(moves[nextMoveIndex], { animated: true })
  }, [animating, currentMove, moves, runMove])

  useEffect(() => {
    const element = mountRef.current
    if (!element) return undefined

    const width = element.clientWidth || 600
    const height = 380
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    element.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(4.5, 4, 5)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.75))
    const light = new THREE.DirectionalLight(0xffffff, 0.85)
    light.position.set(5, 8, 6)
    scene.add(light)

    const group = new THREE.Group()
    scene.add(group)
    refs.current = { renderer, scene, camera, group, cubies: [], raf: null, animRaf: null }
    resetCubies(initialState)

    let dragging = false
    let previousX = 0
    let previousY = 0

    const getPoint = (event) => ({
      x: event.clientX ?? event.touches?.[0]?.clientX ?? previousX,
      y: event.clientY ?? event.touches?.[0]?.clientY ?? previousY,
    })

    const onPointerDown = (event) => {
      const point = getPoint(event)
      dragging = true
      previousX = point.x
      previousY = point.y
    }
    const onPointerUp = () => { dragging = false }
    const onPointerMove = (event) => {
      if (!dragging) return
      const point = getPoint(event)
      group.rotation.y += (point.x - previousX) * 0.012
      group.rotation.x += (point.y - previousY) * 0.012
      previousX = point.x
      previousY = point.y
    }

    renderer.domElement.addEventListener('mousedown', onPointerDown)
    renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: true })
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchend', onPointerUp)
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('touchmove', onPointerMove, { passive: true })

    const renderLoop = () => {
      refs.current.raf = requestAnimationFrame(renderLoop)
      renderer.render(scene, camera)
    }
    renderLoop()

    const onResize = () => {
      const nextWidth = element.clientWidth || width
      renderer.setSize(nextWidth, height)
      camera.aspect = nextWidth / height
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(refs.current.raf)
      cancelAnimationFrame(refs.current.animRaf)
      renderer.domElement.removeEventListener('mousedown', onPointerDown)
      renderer.domElement.removeEventListener('touchstart', onPointerDown)
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener('touchend', onPointerUp)
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('resize', onResize)
      refs.current.cubies.forEach(disposeCubie)
      refs.current.cubies = []
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [initialState, resetCubies])

  useEffect(() => {
    cancelAnimationFrame(refs.current.animRaf)
    setPlaying(false)
    setAnimating(false)
    setCurrentMove(-1)
    resetCubies(initialState)
  }, [initialState, solution, resetCubies])

  useEffect(() => {
    if (!playing || animating) return undefined
    if (currentMove >= moves.length - 1) {
      setPlaying(false)
      return undefined
    }

    const timer = setTimeout(stepForward, 120)
    return () => clearTimeout(timer)
  }, [playing, animating, currentMove, moves.length, stepForward])

  const percentComplete = moves.length > 0 ? ((currentMove + 1) / moves.length) * 100 : 0

  return (
    <div className="card overflow-hidden">
      <div ref={mountRef} className="w-full bg-gradient-to-br from-dark-bg to-dark-card" style={{ height: 380, cursor: 'grab' }} />
      <div className="h-1 bg-dark-border"><div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${percentComplete}%` }} /></div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Move {Math.max(0, currentMove + 1)} / {moves.length}</span>
          <span className="font-mono font-bold text-accent">{currentMove >= 0 && currentMove < moves.length ? moves[currentMove] : '—'}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => jumpToMove(-1)}
            disabled={animating || currentMove < 0}
            title="Reset to uploaded cube"
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => jumpToMove(currentMove - 1)}
            disabled={animating || currentMove < 0}
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous move"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setPlaying((value) => !value)}
            disabled={moves.length === 0}
            className={clsx('px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed', playing ? 'bg-yellow-500/20 text-yellow-400' : 'bg-accent/20 text-accent hover:bg-accent/30')}
          >
            {playing ? <><Pause size={16} />Pause</> : <><Play size={16} />Play</>}
          </button>
          <button
            onClick={stepForward}
            disabled={animating || currentMove >= moves.length - 1}
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next move"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => jumpToMove(moves.length - 1)}
            disabled={animating || currentMove >= moves.length - 1}
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Jump to solved state"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {moves.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center max-h-20 overflow-y-auto pt-1">
            {moves.map((move, index) => (
              <button
                key={`${move}-${index}`}
                type="button"
                onClick={() => jumpToMove(index)}
                disabled={animating}
                title={`Jump to move ${index + 1}`}
                className={clsx('font-mono text-xs px-2 py-0.5 rounded border transition-all disabled:cursor-not-allowed',
                  index === currentMove
                    ? 'bg-accent/20 border-accent text-accent font-bold scale-110'
                    : index < currentMove
                      ? 'bg-primary/10 border-primary/30 text-primary/50 hover:text-primary'
                      : 'bg-dark-border border-transparent text-gray-500 hover:text-white')}
              >
                {move}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
