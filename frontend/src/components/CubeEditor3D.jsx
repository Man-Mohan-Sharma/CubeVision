import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import clsx from 'clsx'

const SOLVED_STATE = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']
const CENTER_INDEXES = new Set([4, 13, 22, 31, 40, 49])

const COLORS = {
  U: { name: 'White', hex: '#F5F5F5', three: 0xf5f5f5 },
  R: { name: 'Blue', hex: '#0051A2', three: 0x0051a2 },
  F: { name: 'Red', hex: '#EF2B24', three: 0xef2b24 },
  D: { name: 'Yellow', hex: '#FFD700', three: 0xffd700 },
  L: { name: 'Green', hex: '#009B48', three: 0x009b48 },
  B: { name: 'Orange', hex: '#FF6B35', three: 0xff6b35 },
}

function normaliseState(value) {
  const state = typeof value === 'string' ? value.toUpperCase().trim() : ''
  return /^[URFDLB]{54}$/.test(state) ? state : SOLVED_STATE
}

function countColors(state) {
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const ch of state) if (counts[ch] !== undefined) counts[ch] += 1
  return counts
}

function rotateNine(cells, direction) {
  // clockwise: 6 3 0 / 7 4 1 / 8 5 2
  if (direction === 'cw') {
    return [cells[6], cells[3], cells[0], cells[7], cells[4], cells[1], cells[8], cells[5], cells[2]]
  }
  // counter-clockwise: 2 5 8 / 1 4 7 / 0 3 6
  return [cells[2], cells[5], cells[8], cells[1], cells[4], cells[7], cells[0], cells[3], cells[6]]
}

function rotateFaceInState(state, face, direction) {
  const faceIndex = FACE_ORDER.indexOf(face)
  if (faceIndex < 0) return state

  const start = faceIndex * 9
  const arr = state.split('')
  const oldFace = arr.slice(start, start + 9)
  const newFace = rotateNine(oldFace, direction)

  for (let i = 0; i < 9; i += 1) arr[start + i] = newFace[i]

  // Keep centers fixed.
  arr[4] = 'U'
  arr[13] = 'R'
  arr[22] = 'F'
  arr[31] = 'D'
  arr[40] = 'L'
  arr[49] = 'B'

  return arr.join('')
}

function makeFacelets() {
  const out = []

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

export default function CubeEditor3D({
  initialState,
  onStateChange,
  title = '3D Cube Color Editor',
}) {
  const mountRef = useRef(null)
  const onStateChangeRef = useRef(onStateChange)
  const activeColorRef = useRef('F')
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

  const syncStickerMaterials = useCallback((state) => {
    const { stickers, materials } = refs.current
    if (!stickers?.length) return

    for (const sticker of stickers) {
      const index = sticker.userData.index
      const letter = state[index]
      if (materials[letter]) sticker.material = materials[letter]
    }
  }, [])

  const commitState = useCallback((nextState) => {
    stateRef.current = nextState
    setCubeState(nextState)
    syncStickerMaterials(nextState)
    onStateChangeRef.current?.(nextState)
  }, [syncStickerMaterials])

  const paintSticker = useCallback((index) => {
    if (CENTER_INDEXES.has(index)) return
    const arr = stateRef.current.split('')
    arr[index] = activeColorRef.current
    commitState(arr.join(''))
  }, [commitState])

  const rotateFace = useCallback((face, direction) => {
    commitState(rotateFaceInState(stateRef.current, face, direction))
  }, [commitState])

  const resetColors = useCallback(() => {
    commitState(normaliseState(initialState))
  }, [commitState, initialState])

  const resetView = useCallback(() => {
    const { group } = refs.current
    if (!group) return
    group.rotation.set(-0.45, 0.7, 0.05)
  }, [])

  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  useEffect(() => {
    activeColorRef.current = activeColor
  }, [activeColor])

  useEffect(() => {
    const next = normaliseState(initialState)
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
    camera.position.set(4.8, 4.2, 5.8)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const light = new THREE.DirectionalLight(0xffffff, 0.9)
    light.position.set(5, 7, 8)
    scene.add(light)

    const group = new THREE.Group()
    group.rotation.set(-0.45, 0.7, 0.05)
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
          <button type="button" onClick={resetView} className="px-3 py-1.5 rounded-lg border border-dark-border text-xs text-gray-300 hover:text-white">
            Reset view
          </button>
          <button type="button" onClick={resetColors} className="px-3 py-1.5 rounded-lg border border-dark-border text-xs text-gray-300 hover:text-white">
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

      <div className="rounded-xl border border-dark-border p-3 bg-dark-bg/50">
        <p className="text-xs text-gray-400 mb-2">
          If uploaded cube is marked impossible, rotate the uploaded face grids here. This fixes photos taken sideways/upside-down.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {FACE_ORDER.map((face) => (
            <div key={face} className="rounded-lg border border-dark-border p-2 text-center">
              <div className="font-mono text-xs text-gray-300 mb-2">Face {face}</div>
              <div className="flex justify-center gap-2">
                <button type="button" onClick={() => rotateFace(face, 'ccw')} className="px-2 py-1 rounded-md bg-dark-border text-xs text-gray-300 hover:text-white">
                  ⟲
                </button>
                <button type="button" onClick={() => rotateFace(face, 'cw')} className="px-2 py-1 rounded-md bg-dark-border text-xs text-gray-300 hover:text-white">
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
