import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
const MATERIAL_INDEX = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 }
const DEFAULT_ROTATION = { x: -0.42, y: 0.72, z: 0.02 }
const DEFAULT_CAMERA = { x: 4.5, y: 4, z: 5 }
const TURN_DURATION_MS = 520

function normaliseState(value) {
  const state = typeof value === 'string' ? value.toUpperCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '') : ''
  return /^[URFDLB]{54}$/.test(state) ? state : SOLVED_STATE
}

function splitMoves(value) {
  if (Array.isArray(value)) return value.map((move) => String(move || '').trim()).filter(Boolean)
  return String(value || '').trim().split(/\s+/).filter(Boolean)
}

function createFaceletMap() {
  const result = []

  // Cubejs/Kociemba facelet order: U R F D L B, each face row-major.
  for (const z of [-1, 0, 1]) for (const x of [-1, 0, 1]) result.push({ x, y: 1, z, normal: 'U' })
  for (const y of [1, 0, -1]) for (const z of [1, 0, -1]) result.push({ x: 1, y, z, normal: 'R' })
  for (const y of [1, 0, -1]) for (const x of [-1, 0, 1]) result.push({ x, y, z: 1, normal: 'F' })
  for (const z of [1, 0, -1]) for (const x of [-1, 0, 1]) result.push({ x, y: -1, z, normal: 'D' })
  for (const y of [1, 0, -1]) for (const z of [-1, 0, 1]) result.push({ x: -1, y, z, normal: 'L' })
  for (const y of [1, 0, -1]) for (const x of [1, 0, -1]) result.push({ x, y, z: -1, normal: 'B' })

  return result
}

const FACELETS = createFaceletMap()

function makeCubie(x, y, z, stickers = {}) {
  const group = new THREE.Group()
  group.position.set(x * CUBIE_SPACING, y * CUBIE_SPACING, z * CUBIE_SPACING)
  group.userData.coord = { x, y, z }

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

function stopPointerEvent(event) {
  event?.stopPropagation?.()
  event?.nativeEvent?.stopImmediatePropagation?.()
}

function stopUiEvent(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  event?.nativeEvent?.stopImmediatePropagation?.()
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function getMoveTurn(moveToken) {
  const token = String(moveToken || '').trim()
  const face = token[0]
  const prime = token.includes("'")
  const doubleTurn = token.includes('2')

  const baseConfig = {
    U: { axis: 'y', layer: 1, sign: -1 },
    D: { axis: 'y', layer: -1, sign: 1 },
    R: { axis: 'x', layer: 1, sign: -1 },
    L: { axis: 'x', layer: -1, sign: 1 },
    F: { axis: 'z', layer: 1, sign: -1 },
    B: { axis: 'z', layer: -1, sign: 1 },
  }[face]

  if (!baseConfig) return null

  let angle = baseConfig.sign * (doubleTurn ? Math.PI : Math.PI / 2)
  if (prime) angle *= -1

  return { ...baseConfig, angle }
}

function getLayerCubies(cubies, axis, layer) {
  return cubies.filter((cubie) => cubie.userData?.coord?.[axis] === layer)
}

export default function CubeVisualizer3D({ solution, cubeState, stateSequence, mode = 'solve' }) {
  const mountRef = useRef(null)
  const refs = useRef({
    renderer: null,
    scene: null,
    camera: null,
    group: null,
    cubies: [],
    raf: null,
    turnRaf: null,
    activePivot: null,
    animating: false,
  })

  const moves = useMemo(() => splitMoves(solution), [solution])
  const baseState = useMemo(() => normaliseState(cubeState), [cubeState])
  const providedSequence = useMemo(() => {
    const list = Array.isArray(stateSequence) ? stateSequence.map(normaliseState) : []
    return list.length === moves.length + 1 ? list : []
  }, [stateSequence, moves.length])

  const [currentMove, setCurrentMove] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [animatingMove, setAnimatingMove] = useState(null)
  const [generatedSequence, setGeneratedSequence] = useState(null)
  const [sequenceLoading, setSequenceLoading] = useState(false)
  const [sequenceError, setSequenceError] = useState('')

  const playableSequence = useMemo(() => {
    if (providedSequence.length === moves.length + 1) return providedSequence
    if (Array.isArray(generatedSequence) && generatedSequence.length === moves.length + 1) return generatedSequence
    return [baseState]
  }, [providedSequence, generatedSequence, moves.length, baseState])

  const hasPlayableStates = playableSequence.length === moves.length + 1
  const shownState = playableSequence[Math.max(0, currentMove + 1)] || playableSequence[0] || baseState

  const clearActivePivot = useCallback(() => {
    const { group, activePivot } = refs.current
    if (activePivot && group) {
      group.remove(activePivot)
    }
    refs.current.activePivot = null
  }, [])

  const renderState = useCallback((state) => {
    const { group, cubies } = refs.current
    if (!group) return

    cancelAnimationFrame(refs.current.turnRaf)
    refs.current.turnRaf = null
    refs.current.animating = false
    clearActivePivot()

    cubies.forEach((cubie) => {
      cubie.parent?.remove?.(cubie)
      disposeCubie(cubie)
    })

    const nextCubies = buildCubiesFromState(normaliseState(state))
    nextCubies.forEach((cubie) => group.add(cubie))
    refs.current.cubies = nextCubies
  }, [clearActivePivot])

  const resetView = useCallback((event) => {
    stopUiEvent(event)
    const { group, camera, renderer, scene } = refs.current
    if (group) group.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, DEFAULT_ROTATION.z)
    if (camera) {
      camera.position.set(DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix?.()
    }
    if (renderer && scene && camera) renderer.render(scene, camera)
  }, [])

  const jumpToMove = useCallback((targetIndex) => {
    if (refs.current.animating) return
    const safeTarget = Math.max(-1, Math.min(targetIndex, moves.length - 1))
    setPlaying(false)
    setCurrentMove(safeTarget)
    const targetState = playableSequence[Math.max(0, safeTarget + 1)] || playableSequence[0] || baseState
    renderState(targetState)
  }, [moves.length, playableSequence, baseState, renderState])

  const animateMove = useCallback((moveIndex) => {
    if (!hasPlayableStates || refs.current.animating) return
    if (moveIndex < 0 || moveIndex >= moves.length) return

    const fromState = playableSequence[moveIndex] || baseState
    const toState = playableSequence[moveIndex + 1] || fromState
    const turn = getMoveTurn(moves[moveIndex])

    // Always start from the exact previous cube state, then rotate the layer physically.
    renderState(fromState)

    if (!turn) {
      renderState(toState)
      setCurrentMove(moveIndex)
      return
    }

    const { group } = refs.current
    const selectedCubies = getLayerCubies(refs.current.cubies, turn.axis, turn.layer)
    if (!group || selectedCubies.length === 0) {
      renderState(toState)
      setCurrentMove(moveIndex)
      return
    }

    const pivot = new THREE.Group()
    group.add(pivot)
    selectedCubies.forEach((cubie) => {
      cubie.parent?.remove?.(cubie)
      pivot.add(cubie)
    })

    refs.current.activePivot = pivot
    refs.current.animating = true
    setAnimatingMove(moveIndex)

    const startTime = performance.now()
    const animateFrame = (now) => {
      const rawT = Math.min(1, (now - startTime) / TURN_DURATION_MS)
      const eased = easeInOutCubic(rawT)
      pivot.rotation[turn.axis] = turn.angle * eased

      if (rawT < 1) {
        refs.current.turnRaf = requestAnimationFrame(animateFrame)
        return
      }

      refs.current.animating = false
      refs.current.turnRaf = null
      setAnimatingMove(null)
      clearActivePivot()
      renderState(toState)
      setCurrentMove(moveIndex)
    }

    refs.current.turnRaf = requestAnimationFrame(animateFrame)
  }, [hasPlayableStates, moves, playableSequence, baseState, renderState, clearActivePivot])

  const stepForward = useCallback(() => {
    if (refs.current.animating || !hasPlayableStates) return
    if (currentMove >= moves.length - 1) {
      setPlaying(false)
      return
    }
    animateMove(currentMove + 1)
  }, [hasPlayableStates, currentMove, moves.length, animateMove])

  useEffect(() => {
    const element = mountRef.current
    if (!element) return undefined

    const width = element.clientWidth || 600
    const height = 380
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.touchAction = 'none'
    element.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.78))
    const light = new THREE.DirectionalLight(0xffffff, 0.9)
    light.position.set(5, 8, 6)
    scene.add(light)

    const group = new THREE.Group()
    group.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, DEFAULT_ROTATION.z)
    scene.add(group)

    refs.current = {
      renderer,
      scene,
      camera,
      group,
      cubies: [],
      raf: null,
      turnRaf: null,
      activePivot: null,
      animating: false,
    }
    renderState(shownState)

    let dragging = false
    let previousX = 0
    let previousY = 0

    function onPointerDown(event) {
      event.preventDefault()
      dragging = true
      previousX = event.clientX
      previousY = event.clientY
      renderer.domElement.setPointerCapture?.(event.pointerId)
    }

    function onPointerUp(event) {
      event.preventDefault()
      dragging = false
    }

    function onPointerMove(event) {
      if (!dragging) return
      event.preventDefault()
      group.rotation.y += (event.clientX - previousX) * 0.012
      group.rotation.x += (event.clientY - previousY) * 0.012
      previousX = event.clientX
      previousY = event.clientY
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('pointermove', onPointerMove)

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
      cancelAnimationFrame(refs.current.turnRaf)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      refs.current.cubies.forEach(disposeCubie)
      refs.current.cubies = []
      clearActivePivot()
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement)
      renderer.dispose()
    }
  // mount once; state updates are handled by renderState/jump/animate effects.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!refs.current.animating) renderState(shownState)
  }, [shownState, renderState])

  useEffect(() => {
    let cancelled = false
    setGeneratedSequence(null)
    setSequenceError('')

    if (moves.length === 0 || providedSequence.length === moves.length + 1) return undefined

    const controller = new AbortController()
    const loadSequence = async () => {
      setSequenceLoading(true)
      try {
        const response = await fetch('/api/solve/sequence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cube_state: baseState, moves }),
          signal: controller.signal,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.success || !Array.isArray(data.state_sequence)) {
          throw new Error(data?.error || 'Move animation sequence is unavailable.')
        }
        if (!cancelled) setGeneratedSequence(data.state_sequence.map(normaliseState))
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') {
          setSequenceError(err?.message || 'Move animation sequence is unavailable.')
        }
      } finally {
        if (!cancelled) setSequenceLoading(false)
      }
    }

    loadSequence()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [baseState, moves, providedSequence.length])

  useEffect(() => {
    setPlaying(false)
    setCurrentMove(-1)
    setAnimatingMove(null)
    if (!refs.current.animating) renderState(baseState)
  }, [solution, baseState, renderState])

  useEffect(() => {
    if (!playing || refs.current.animating) return undefined
    if (currentMove >= moves.length - 1) {
      setPlaying(false)
      return undefined
    }

    const timer = setTimeout(() => animateMove(currentMove + 1), 120)
    return () => clearTimeout(timer)
  }, [playing, currentMove, moves.length, animateMove])

  const percentComplete = moves.length > 0 ? ((currentMove + 1) / moves.length) * 100 : 0
  const currentLabel = animatingMove !== null ? moves[animatingMove] : (currentMove >= 0 && currentMove < moves.length ? moves[currentMove] : '—')

  return (
    <div className="card overflow-hidden">
      <div ref={mountRef} className="w-full bg-gradient-to-br from-dark-bg to-dark-card" style={{ height: 380, cursor: 'grab' }} />
      <div className="h-1 bg-dark-border"><div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${percentComplete}%` }} /></div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm gap-3">
          <span className="text-gray-400">
            {animatingMove !== null ? 'Animating' : mode === 'pattern' ? 'Pattern move' : 'Move'} {Math.max(0, (animatingMove ?? currentMove) + 1)} / {moves.length}
          </span>
          <span className="font-mono font-bold text-accent">{currentLabel}</span>
        </div>

        {sequenceLoading && moves.length > 0 && (
          <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg p-2 text-center">
            Building exact move-by-move 3D animation…
          </p>
        )}

        {!sequenceLoading && !hasPlayableStates && moves.length > 0 && (
          <p className="text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2 text-center">
            {sequenceError || 'Move states are not available. Backend must return state_sequence, or restart backend after adding /api/solve/sequence.'}
          </p>
        )}

        {hasPlayableStates && moves.length > 0 && (
          <p className="text-[11px] text-gray-500 text-center">
            The simulator now rotates the actual face layer first, then locks in the next cube state.
          </p>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => jumpToMove(-1)}
            disabled={currentMove < 0 || animatingMove !== null}
            title="Reset to starting cube"
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => jumpToMove(currentMove - 1)}
            disabled={currentMove < 0 || animatingMove !== null}
            title="Previous move"
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            disabled={moves.length === 0 || !hasPlayableStates || sequenceLoading || animatingMove !== null}
            className={clsx('px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed', playing ? 'bg-yellow-500/20 text-yellow-400' : 'bg-accent/20 text-accent hover:bg-accent/30')}
          >
            {playing ? <><Pause size={16} />Pause</> : <><Play size={16} />Play</>}
          </button>
          <button
            type="button"
            onClick={stepForward}
            disabled={!hasPlayableStates || sequenceLoading || animatingMove !== null || currentMove >= moves.length - 1}
            title="Animate next move"
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => jumpToMove(moves.length - 1)}
            disabled={!hasPlayableStates || sequenceLoading || animatingMove !== null || currentMove >= moves.length - 1}
            title="Jump to final state"
            className="p-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SkipForward size={16} />
          </button>
          <button
            type="button"
            onPointerDownCapture={stopPointerEvent}
            onMouseDownCapture={stopPointerEvent}
            onClick={resetView}
            title="Reset camera view"
            className="px-3 py-2.5 rounded-xl bg-dark-border hover:bg-primary/20 hover:text-primary transition-all text-xs text-gray-300"
          >
            Reset view
          </button>
        </div>

        {moves.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center max-h-20 overflow-y-auto pt-1">
            {moves.map((move, index) => (
              <button
                key={`${move}-${index}`}
                type="button"
                onClick={() => jumpToMove(index)}
                disabled={!hasPlayableStates || animatingMove !== null}
                title={`Jump to move ${index + 1}`}
                className={clsx('font-mono text-xs px-2 py-0.5 rounded border transition-all disabled:cursor-not-allowed',
                  index === (animatingMove ?? currentMove)
                    ? 'bg-accent/20 border-accent text-accent font-bold scale-110'
                    : index < currentMove
                      ? 'bg-primary/10 border-primary/30 text-primary/60 hover:text-primary'
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
