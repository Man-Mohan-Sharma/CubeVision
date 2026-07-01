import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import clsx from 'clsx'

const SOLVED_STATE = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']
const FACE_START = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 }
const CENTER_INDEXES = new Set([4, 13, 22, 31, 40, 49])
const CENTER_LETTERS = { 4: 'U', 13: 'R', 22: 'F', 31: 'D', 40: 'L', 49: 'B' }
const DEFAULT_ROTATION = { x: -0.45, y: 0.7, z: 0.05 }
const DEFAULT_CAMERA = { x: 4.8, y: 4.2, z: 5.8 }

const COLORS = {
  U: { name: 'White', hex: '#F5F5F5', three: 0xf5f5f5 },
  R: { name: 'Blue', hex: '#0051A2', three: 0x0051a2 },
  F: { name: 'Red', hex: '#EF2B24', three: 0xef2b24 },
  D: { name: 'Yellow', hex: '#FFD700', three: 0xffd700 },
  L: { name: 'Green', hex: '#009B48', three: 0x009b48 },
  B: { name: 'Orange', hex: '#FF6B35', three: 0xff6b35 },
}

function cleanState(value) {
  return typeof value === 'string'
    ? value.toUpperCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '')
    : ''
}

function lockCenters(state) {
  const arr = state.split('')
  for (const [index, letter] of Object.entries(CENTER_LETTERS)) {
    arr[Number(index)] = letter
  }
  return arr.join('')
}

function normaliseState(value) {
  const state = cleanState(value)
  return /^[URFDLB]{54}$/.test(state) ? lockCenters(state) : SOLVED_STATE
}

function countColors(state) {
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const ch of state) if (counts[ch] !== undefined) counts[ch] += 1
  return counts
}

function rotateNine(cells, direction) {
  if (direction === 'cw') {
    return [cells[6], cells[3], cells[0], cells[7], cells[4], cells[1], cells[8], cells[5], cells[2]]
  }
  return [cells[2], cells[5], cells[8], cells[1], cells[4], cells[7], cells[0], cells[3], cells[6]]
}

function rotateFaceInState(state, face, direction) {
  const faceIndex = FACE_ORDER.indexOf(face)
  if (faceIndex < 0) return state

  const start = faceIndex * 9
  const arr = state.split('')
  const newFace = rotateNine(arr.slice(start, start + 9), direction)

  for (let i = 0; i < 9; i += 1) arr[start + i] = newFace[i]
  return lockCenters(arr.join(''))
}

function swapLettersInState(state, a, b) {
  const arr = state.split('')
  for (let i = 0; i < arr.length; i += 1) {
    if (CENTER_INDEXES.has(i)) continue
    if (arr[i] === a) arr[i] = b
    else if (arr[i] === b) arr[i] = a
  }
  return lockCenters(arr.join(''))
}

function swapFaceBlocksInState(state, faceA, faceB) {
  const arr = state.split('')
  const a = FACE_START[faceA]
  const b = FACE_START[faceB]
  if (a === undefined || b === undefined) return state

  for (let i = 0; i < 9; i += 1) {
    const temp = arr[a + i]
    arr[a + i] = arr[b + i]
    arr[b + i] = temp
  }
  return lockCenters(arr.join(''))
}

function makeFacelets() {
  const out = []

  // Kociemba/cubejs facelet order: U R F D L B, each face row-major.
  for (const z of [-1, 0, 1]) for (const x of [-1, 0, 1]) out.push({ x, y: 1, z, normal: 'U' })
  for (const y of [1, 0, -1]) for (const z of [1, 0, -1]) out.push({ x: 1, y, z, normal: 'R' })
  for (const y of [1, 0, -1]) for (const x of [-1, 0, 1]) out.push({ x, y, z: 1, normal: 'F' })
  for (const z of [1, 0, -1]) for (const x of [-1, 0, 1]) out.push({ x, y: -1, z, normal: 'D' })
  for (const y of [1, 0, -1]) for (const z of [-1, 0, 1]) out.push({ x: -1, y, z, normal: 'L' })
  for (const y of [1, 0, -1]) for (const x of [1, 0, -1]) out.push({ x, y, z: -1, normal: 'B' })

  return out.map((f, index) => ({ ...f, index }))
}

const FACELETS = makeFacelets()

function placeSticker(mesh, facelet, offset = 0) {
  const d = 1.535 + offset
  const { x, y, z, normal } = facelet

  if (normal === 'F') {
    mesh.position.set(x, y, d)
    mesh.rotation.set(0, 0, 0)
  } else if (normal === 'B') {
    mesh.position.set(x, y, -d)
    mesh.rotation.set(0, Math.PI, 0)
  } else if (normal === 'R') {
    mesh.position.set(d, y, z)
    mesh.rotation.set(0, Math.PI / 2, 0)
  } else if (normal === 'L') {
    mesh.position.set(-d, y, z)
    mesh.rotation.set(0, -Math.PI / 2, 0)
  } else if (normal === 'U') {
    mesh.position.set(x, d, z)
    mesh.rotation.set(-Math.PI / 2, 0, 0)
  } else if (normal === 'D') {
    mesh.position.set(x, -d, z)
    mesh.rotation.set(Math.PI / 2, 0, 0)
  }
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

export default function CubeEditor3D({
  initialState,
  onStateChange,
  title = '3D Cube Color Editor',
}) {
  const mountRef = useRef(null)
  const onStateChangeRef = useRef(onStateChange)
  const activeColorRef = useRef('F')
  const originalStateRef = useRef(normaliseState(initialState))
  const hasUserEditedRef = useRef(false)
  const stateRef = useRef(normaliseState(initialState))

  const refs = useRef({
    renderer: null,
    camera: null,
    scene: null,
    group: null,
    raycaster: null,
    pointer: null,
    stickers: [],
    materials: {},
    raf: null,
  })

  const [cubeState, setCubeState] = useState(() => normaliseState(initialState))
  const [activeColor, setActiveColor] = useState('F')

  const counts = useMemo(() => countColors(cubeState), [cubeState])

  const renderOnce = useCallback(() => {
    const { renderer, scene, camera } = refs.current
    if (renderer && scene && camera) renderer.render(scene, camera)
  }, [])

  const syncStickerMaterials = useCallback((state) => {
    const { stickers, materials } = refs.current
    if (!stickers?.length) return

    for (const sticker of stickers) {
      const index = sticker.userData.index
      const letter = state[index]
      if (materials[letter]) sticker.material = materials[letter]
    }
    renderOnce()
  }, [renderOnce])

  const commitState = useCallback((nextRawState, { userEdit = false } = {}) => {
    const nextState = normaliseState(nextRawState)
    if (userEdit) hasUserEditedRef.current = true
    stateRef.current = nextState
    setCubeState(nextState)
    syncStickerMaterials(nextState)
    onStateChangeRef.current?.(nextState)
  }, [syncStickerMaterials])

  const paintSticker = useCallback((index) => {
    if (CENTER_INDEXES.has(index)) return
    const arr = stateRef.current.split('')
    arr[index] = activeColorRef.current
    commitState(arr.join(''), { userEdit: true })
  }, [commitState])

  const rotateFace = useCallback((face, direction) => {
    commitState(rotateFaceInState(stateRef.current, face, direction), { userEdit: true })
  }, [commitState])

  const resetColors = useCallback((event) => {
    stopUiEvent(event)
    hasUserEditedRef.current = false
    commitState(originalStateRef.current || SOLVED_STATE)
  }, [commitState])

  const resetView = useCallback((event) => {
    stopUiEvent(event)
    const { group, camera } = refs.current
    if (group) group.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, DEFAULT_ROTATION.z)
    if (camera) {
      camera.position.set(DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z)
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix?.()
    }
    renderOnce()
  }, [renderOnce])

  const swapUDColors = useCallback((event) => {
    stopUiEvent(event)
    commitState(swapLettersInState(stateRef.current, 'U', 'D'), { userEdit: true })
  }, [commitState])

  const swapUDFaces = useCallback((event) => {
    stopUiEvent(event)
    commitState(swapFaceBlocksInState(stateRef.current, 'U', 'D'), { userEdit: true })
  }, [commitState])

  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  useEffect(() => {
    activeColorRef.current = activeColor
  }, [activeColor])

  useEffect(() => {
    if (hasUserEditedRef.current) return
    const next = normaliseState(initialState)
    originalStateRef.current = next
    stateRef.current = next
    setCubeState(next)
    syncStickerMaterials(next)
  }, [initialState, syncStickerMaterials])

  useEffect(() => {
    const element = mountRef.current
    if (!element) return undefined

    const width = element.clientWidth || 700
    const height = 430

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.touchAction = 'none'
    element.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const light = new THREE.DirectionalLight(0xffffff, 0.9)
    light.position.set(5, 7, 8)
    scene.add(light)

    const group = new THREE.Group()
    group.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, DEFAULT_ROTATION.z)
    scene.add(group)

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshLambertMaterial({ color: 0x0e1018 })
    )
    group.add(body)

    const materials = {}
    for (const letter of FACE_ORDER) {
      materials[letter] = new THREE.MeshLambertMaterial({ color: COLORS[letter].three, side: THREE.DoubleSide })
    }

    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x070707, side: THREE.DoubleSide })
    const centerBorderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    const stickers = []

    for (const facelet of FACELETS) {
      const border = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.9),
        CENTER_INDEXES.has(facelet.index) ? centerBorderMaterial : borderMaterial
      )
      placeSticker(border, facelet, 0.006)
      group.add(border)

      const sticker = new THREE.Mesh(
        new THREE.PlaneGeometry(0.78, 0.78),
        materials[stateRef.current[facelet.index]] || materials.U
      )
      placeSticker(sticker, facelet, 0.018)
      sticker.userData = { isSticker: true, index: facelet.index }
      group.add(sticker)
      stickers.push(sticker)
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    refs.current = { renderer, camera, scene, group, raycaster, pointer, stickers, materials, raf: null }

    let isDragging = false
    let moved = false
    let lastX = 0
    let lastY = 0
    let startX = 0
    let startY = 0

    function setPointerNdc(event) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    function onPointerDown(event) {
      event.preventDefault()
      isDragging = true
      moved = false
      startX = event.clientX
      startY = event.clientY
      lastX = event.clientX
      lastY = event.clientY
      renderer.domElement.setPointerCapture?.(event.pointerId)
    }

    function onPointerMove(event) {
      if (!isDragging) return
      event.preventDefault()

      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 5) moved = true

      group.rotation.y += dx * 0.01
      group.rotation.x += dy * 0.01
      lastX = event.clientX
      lastY = event.clientY
    }

    function onPointerUp(event) {
      if (!isDragging) return
      event.preventDefault()
      isDragging = false

      if (!moved) {
        setPointerNdc(event)
        raycaster.setFromCamera(pointer, camera)
        const hits = raycaster.intersectObjects(stickers, false)
        const hit = hits.find((h) => h.object.userData?.isSticker)
        if (hit) paintSticker(hit.object.userData.index)
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)

    function animate() {
      refs.current.raf = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      const nextWidth = element.clientWidth || width
      renderer.setSize(nextWidth, height)
      camera.aspect = nextWidth / height
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(refs.current.raf)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)

      stickers.forEach((s) => s.geometry?.dispose?.())
      Object.values(materials).forEach((m) => m.dispose?.())
      borderMaterial.dispose?.()
      centerBorderMaterial.dispose?.()
      body.geometry?.dispose?.()
      body.material?.dispose?.()
      renderer.dispose()
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement)
    }
  }, [paintSticker])

  const controlButtonClass = 'px-3 py-1.5 rounded-lg border border-dark-border text-xs text-gray-300 hover:text-white hover:border-primary/40 transition-all'

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Pick a color, click a sticker to paint it, drag the cube to rotate view. Center stickers are locked.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button type="button" onPointerDownCapture={stopPointerEvent} onMouseDownCapture={stopPointerEvent} onClick={resetView} className={controlButtonClass}>
            Reset view
          </button>
          <button type="button" onPointerDownCapture={stopPointerEvent} onMouseDownCapture={stopPointerEvent} onClick={resetColors} className={controlButtonClass}>
            Reset colors
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FACE_ORDER.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => setActiveColor(letter)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all',
              activeColor === letter ? 'border-white text-white scale-105' : 'border-dark-border text-gray-400 hover:text-white'
            )}
          >
            <span className="w-5 h-5 rounded-md border border-black/30" style={{ backgroundColor: COLORS[letter].hex }} />
            {letter} {COLORS[letter].name}
          </button>
        ))}
      </div>

      <div
        ref={mountRef}
        className="w-full rounded-2xl overflow-hidden bg-gradient-to-br from-dark-bg to-dark-card border border-dark-border"
        style={{ height: 430 }}
      />

      <div className="rounded-xl border border-yellow-400/20 p-3 bg-yellow-400/5">
        <p className="text-xs text-yellow-100 mb-3">
          If the scan confuses <strong>U/White</strong> and <strong>D/Yellow</strong>, use these one-click fixes before solving.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onPointerDownCapture={stopPointerEvent} onMouseDownCapture={stopPointerEvent} onClick={swapUDColors} className={controlButtonClass}>
            Swap U/D colors
          </button>
          <button type="button" onPointerDownCapture={stopPointerEvent} onMouseDownCapture={stopPointerEvent} onClick={swapUDFaces} className={controlButtonClass}>
            Swap U/D faces
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          Use “Swap U/D colors” when white/yellow stickers are labelled opposite. Use “Swap U/D faces” only when top and bottom photos were assigned to the wrong face slots.
        </p>
      </div>

      <div className="rounded-xl border border-dark-border p-3 bg-dark-bg/50">
        <p className="text-xs text-gray-400 mb-2">
          If a single uploaded face photo was sideways/upside-down, rotate only that face grid here.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {FACE_ORDER.map((face) => (
            <div key={face} className="rounded-lg border border-dark-border p-2 text-center">
              <div className="font-mono text-xs text-gray-300 mb-2">Face {face}</div>
              <div className="flex justify-center gap-2">
                <button type="button" onPointerDownCapture={stopPointerEvent} onMouseDownCapture={stopPointerEvent} onClick={() => rotateFace(face, 'ccw')} className="px-2 py-1 rounded-md bg-dark-border text-xs text-gray-300 hover:text-white">
                  ⟲
                </button>
                <button type="button" onPointerDownCapture={stopPointerEvent} onMouseDownCapture={stopPointerEvent} onClick={() => rotateFace(face, 'cw')} className="px-2 py-1 rounded-md bg-dark-border text-xs text-gray-300 hover:text-white">
                  ⟳
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {FACE_ORDER.map((letter) => {
          const count = counts[letter] || 0
          const good = count === 9
          return (
            <div
              key={letter}
              className={clsx(
                'rounded-xl px-3 py-2 border text-xs flex items-center justify-between',
                good ? 'border-accent/30 bg-accent/5 text-accent' : 'border-yellow-400/30 bg-yellow-400/5 text-yellow-300'
              )}
            >
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-black/20" style={{ backgroundColor: COLORS[letter].hex }} />
                {letter}
              </span>
              <span className="font-mono">{count}/9</span>
            </div>
          )
        })}
      </div>

      <div className="bg-dark-bg rounded-xl p-3 font-mono text-xs text-gray-300 text-center tracking-widest break-all border border-dark-border select-all">
        {cubeState}
      </div>
    </div>
  )
}
