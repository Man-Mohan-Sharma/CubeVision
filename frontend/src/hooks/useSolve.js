import { useState, useCallback } from 'react'
import { uploadCubeImages, solveCube } from '../services/api'

const FACES      = ['U','R','F','D','L','B']
const FACE_NAMES = { U:'Top', R:'Right', F:'Front', D:'Bottom', L:'Left', B:'Back' }

export function useSolve() {
  const [faceFiles,    setFF]          = useState({})
  const [previews,     setPreviews]    = useState({})
  const [uploadResult, setUploadResult]= useState(null)
  const [solveResult,  setSolveResult] = useState(null)
  const [loading,      setLoading]     = useState(false)
  const [step,         setStep]        = useState('upload')
  const [error,        setError]       = useState(null)

  const setFaceFile = useCallback((face, file) => {
    setFF(p => { const n={...p}; if(file) n[face]=file; else delete n[face]; return n })
    if (file) setPreviews(p => ({ ...p, [face]: URL.createObjectURL(file) }))
    else      setPreviews(p => { const n={...p}; delete n[face]; return n })
  }, [])

  const allUploaded = FACES.every(f => faceFiles[f])

  const processImages = useCallback(async () => {
    if (!allUploaded) return
    setLoading(true); setError(null)
    try {
      const r = await uploadCubeImages(faceFiles)
      setUploadResult(r)
      // Even when the detected cube is invalid, show the detected grids so the
      // user can fix wrong stickers in Manual Edit instead of re-uploading.
      if (r.success || r.face_results?.length) setStep('detected')
      if (!r.success) setError(r.errors?.[0] || r.message || 'Detection needs review')
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [faceFiles, allUploaded])

  const solve = useCallback(async (cubeState, source='unknown') => {
    setLoading(true); setError(null)
    try {
      const r = await solveCube(cubeState, source)
      setSolveResult(r)
      if (r.success) setStep('solved')
      else setError(r.error || 'Solver failed')
      return r
    } catch(e) { setError(e.message); return null }
    finally { setLoading(false) }
  }, [])

  const reset = useCallback(() => {
    setFF({}); setPreviews({}); setUploadResult(null)
    setSolveResult(null); setStep('upload'); setError(null)
  }, [])

  return { faceFiles, previews, setFaceFile, uploadResult, solveResult, loading, step, error, allUploaded, processImages, solve, reset, FACES, FACE_NAMES }
}
