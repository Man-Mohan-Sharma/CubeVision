import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowRight, Loader2, CheckCircle, AlertCircle, RefreshCw, Info, Edit3, Camera, Grid3x3 } from 'lucide-react'
import clsx from 'clsx'
import FaceUploader from '../components/FaceUploader'
import CubeStateDisplay from '../components/CubeStateDisplay'
import CubeEditor3D from '../components/CubeEditor3D'
import { useSolve } from '../hooks/useSolve'
import { validateCube } from '../services/api'
import { useAuth } from '../context/AuthContext'

const STEP_LABELS = ['Upload Faces','Detect & Validate','Generate Solution']

const TIPS = [
  '📸 Hold the cube face FLAT and centred toward the camera',
  '💡 Use bright even lighting — avoid shadows on stickers',
  '🙌 Keep fingers/hands away from the sticker area',
  '🔲 Fill the frame with the cube face — cube should be large',
  '🚫 Avoid glare — tilt slightly if stickers are shiny',
  '🎨 If detection is wrong, use the 3D editor, U/D swap, and face-rotate buttons below',
]

const COLOR_HEX = { white:'#F5F5F5', yellow:'#FFD700', red:'#EF2B24', orange:'#FF6B35', blue:'#0051A2', green:'#009B48', '?':'#555' }

function DetectedGrid({ faceResult }) {
  if (!faceResult) return null
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1 font-mono">{faceResult.face} — {faceResult.face_name?.split(' ')[0]}</div>
      <div className="grid grid-cols-3 gap-0.5 w-fit mx-auto">
        {faceResult.colors.flat().map((color,i) => (
          <div key={i} title={color} style={{ backgroundColor:COLOR_HEX[color]||'#555', width:20, height:20 }}
            className="rounded-sm border border-black/10 shadow-sm"/>
        ))}
      </div>
      <div className={clsx('text-xs mt-1 font-mono', faceResult.confidence>0.65?'text-green-400':faceResult.confidence>0.45?'text-yellow-400':'text-red-400')}>
        {Math.round(faceResult.confidence*100)}%
      </div>
    </div>
  )
}

export default function UploadPage() {
  const navigate  = useNavigate()
  const { isAuthed } = useAuth()
  const [mode,          setMode]          = useState('photo') // 'photo' | 'manual'
  const [showEditor,    setShowEditor]    = useState(false)
  const [editedState,   setEditedState]   = useState(null)
  const [editValidation, setEditValidation] = useState(null)

  // Fully manual (no photos / no detection) cube builder state
  const [manualState,      setManualState]      = useState(null)
  const [manualValidation, setManualValidation]  = useState(null)
  const [manualChecking,   setManualChecking]    = useState(false)

  const {
    previews, setFaceFile, uploadResult, loading,
    step, error, allUploaded, processImages, solve, reset, FACES, FACE_NAMES
  } = useSolve()

  const stepIndex = step==='upload'?0:step==='detected'?1:2

  const handleDetect = async () => {
    setShowEditor(false)
    setEditedState(null)
    setEditValidation(null)
    const tid = toast.loading('Analysing face images…')
    await processImages()
    toast.dismiss(tid)
  }

  const handleFullReset = () => {
    setShowEditor(false)
    setEditedState(null)
    setEditValidation(null)
    reset()
  }

  // When user edits colors manually (correction mode), re-validate
  const handleStateChange = async (newState) => {
    setEditedState(newState)
    try {
      const result = await validateCube(newState)
      setEditValidation(result)
    } catch(e) {
      console.warn('Validate error:', e.message)
    }
  }

  // When the from-scratch manual builder produces a complete 54-char state, validate it
  const handleManualStateChange = async (newState) => {
    setManualState(newState)
    if (!newState) { setManualValidation(null); return }
    setManualChecking(true)
    try {
      const result = await validateCube(newState)
      setManualValidation(result)
    } catch(e) {
      console.warn('Validate error:', e.message)
      setManualValidation(null)
    } finally {
      setManualChecking(false)
    }
  }

  const handleManualSolve = async () => {
    if (!manualState) return
    const tid = toast.loading('Running Kociemba Two-Phase solver…')
    const result = await solve(manualState, 'manual')
    toast.dismiss(tid)
    if (result?.success) {
      toast.success(`Solved in ${result.move_count} moves!${result.saved_to_account ? ' Saved to your account.' : ''}`)
      const solveForPage = { ...result, cube_state: result.cube_state || manualState }
      navigate('/solution', { state:{ solve: solveForPage, upload:{ cube_state: manualState } } })
    } else {
      toast.error(result?.error || 'Solver failed')
    }
  }

  const activeState      = editedState || uploadResult?.cube_state
  const activeValidation = editedState ? editValidation : uploadResult?.validation
  const isReadyToSolve   = activeValidation?.is_valid && activeState

  const handleSolve = async () => {
    if (!activeState) return
    const tid = toast.loading('Running Kociemba Two-Phase solver…')
    const result = await solve(activeState, editedState ? 'edited' : 'photo')
    toast.dismiss(tid)
    if (result?.success) {
      toast.success(`Solved in ${result.move_count} moves!${result.saved_to_account ? ' Saved to your account.' : ''}`)
      const solveForPage = { ...result, cube_state: result.cube_state || activeState }
      const uploadForPage = { ...(uploadResult || {}), cube_state: activeState, validation: activeValidation }
      navigate('/solution', { state:{ solve: solveForPage, upload: uploadForPage } })
    } else {
      toast.error(result?.error || 'Solver failed')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-4xl text-white mb-3">Solve Your Cube</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          {mode==='photo'
            ? 'Upload a clear photo of each face. If detection is inaccurate, use the 3D editor.'
            : 'Skip photo detection entirely — paint the cube by hand in the 3D editor.'}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 rounded-xl bg-dark-card border border-dark-border">
          <button
            onClick={() => { setMode('photo'); setManualState(null); setManualValidation(null) }}
            className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode==='photo' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white')}
          >
            <Camera size={15}/>Photo Upload
          </button>
          <button
            onClick={() => { setMode('manual'); setShowEditor(false); setEditedState(null); setEditValidation(null) }}
            className={clsx('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mode==='manual' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white')}
          >
            <Grid3x3 size={15}/>Manual Entry
          </button>
        </div>
      </div>

      {!isAuthed && (
        <div className="card p-3 mb-6 border-yellow-400/20 bg-yellow-400/5 text-center">
          <p className="text-xs text-yellow-200">Login to save solve history and personal stats. You can still solve without login.</p>
        </div>
      )}

      {mode==='manual' ? (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
          <div className="card p-5">
            <h2 className="font-display font-semibold text-white mb-4">Build Cube State Manually</h2>
            <CubeEditor3D
              key="manual-cube-editor"
              title="3D Manual Cube Builder"
              initialState={manualState}
              onStateChange={handleManualStateChange}
            />
          </div>

          {manualState && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-white mb-4">Cube State Net</h2>
              <CubeStateDisplay state={manualState}/>
            </div>
          )}

          {manualChecking && (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin"/>Validating…
            </div>
          )}

          {manualValidation && !manualChecking && (
            <div className={clsx('card p-4 border', manualValidation.is_valid?'border-accent/30 bg-accent/5':'border-red-500/30 bg-red-500/5')}>
              <div className="flex items-start gap-3">
                {manualValidation.is_valid
                  ?<CheckCircle size={20} className="text-accent shrink-0 mt-0.5"/>
                  :<AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5"/>
                }
                <div className="flex-1">
                  <p className={clsx('font-semibold text-sm',manualValidation.is_valid?'text-accent':'text-red-400')}>
                    {manualValidation.is_valid?'Valid cube — ready to solve':'Invalid cube configuration'}
                  </p>
                  {(manualValidation.errors||[]).map((e,i)=>(
                    <div key={i} className="mt-1">
                      {e.split('\n').map((line,j)=>(
                        <p key={j} className={clsx('text-xs', j===0?'text-gray-300':'text-yellow-400 mt-0.5')}>{line}</p>
                      ))}
                    </div>
                  ))}
                  {manualValidation.is_valid && manualValidation.checks_passed?.length>0 && (
                    <p className="text-gray-500 text-xs mt-1">✓ {manualValidation.checks_passed.join(' · ')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={handleManualSolve} disabled={!manualValidation?.is_valid||loading} className="btn-accent flex items-center gap-2 px-10">
              {loading?<><Loader2 size={16} className="animate-spin"/>Solving…</>:<>Generate Solution<ArrowRight size={16}/></>}
            </button>
          </div>
        </motion.div>
      ) : (
      <>
      {/* Tips */}
      <div className="card p-4 mb-8 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Info size={15} className="text-primary"/>
          <span className="text-primary text-sm font-semibold">Photo Tips for Best Results</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {TIPS.map((tip,i) => <p key={i} className="text-gray-400 text-xs">{tip}</p>)}
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEP_LABELS.map((label,i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              i<stepIndex?'bg-accent border-accent text-dark-bg':i===stepIndex?'bg-primary/20 border-primary text-primary':'bg-dark-border border-dark-border text-gray-500')}>
              {i<stepIndex?<CheckCircle size={14}/>:i+1}
            </div>
            <span className={clsx('text-sm font-medium hidden sm:block',i===stepIndex?'text-white':'text-gray-500')}>{label}</span>
            {i<STEP_LABELS.length-1&&<div className={clsx('w-8 h-0.5',i<stepIndex?'bg-accent':'bg-dark-border')}/>}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="mb-6 card p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-red-400 font-semibold text-sm mb-1">Detection Error</p>
              {error.split('\n').map((line,i)=>(
                <p key={i} className={clsx('text-xs', i===0?'text-gray-300':'text-yellow-400 mt-1')}>{line}</p>
              ))}
              <p className="text-xs text-gray-500 mt-2">
                <strong className="text-white">Fix:</strong> Use the <strong className="text-accent">3D editor</strong> below to correct wrong stickers or rotate uploaded face grids.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 1: Upload */}
      {step==='upload' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {FACES.map(face => (
              <FaceUploader key={face} face={face} label={FACE_NAMES[face]} preview={previews[face]} onFile={setFaceFile} disabled={loading}/>
            ))}
          </div>
          <div className="text-center space-y-4">
            <p className="text-gray-500 text-sm">{Object.keys(previews).length} of 6 faces uploaded</p>
            <button onClick={handleDetect} disabled={!allUploaded||loading} className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4">
              {loading?<><Loader2 size={18} className="animate-spin"/>Detecting…</>:<>Detect Colors<ArrowRight size={18}/></>}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: Detected */}
      {step==='detected' && uploadResult && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">

          {/* Detected grids overview */}
          {uploadResult.face_results?.length>0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display font-semibold text-white">Detected Sticker Colors</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Percentages show detection confidence per face</p>
                </div>
                <button onClick={() => setShowEditor(v=>!v)}
                  className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    showEditor?'bg-accent/20 text-accent border border-accent/30':'bg-dark-border text-gray-300 hover:text-white')}>
                  <Edit3 size={14}/>{showEditor?'Hide Editor':'Manual Edit'}
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-4">
                {uploadResult.face_results.map(fr=><DetectedGrid key={fr.face} faceResult={fr}/>)}
              </div>

              {/* Manual color editor */}
              <AnimatePresence>
                {showEditor && (
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
                    <div className="border-t border-dark-border pt-4 mt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Edit3 size={14} className="text-accent"/>
                        <span className="text-accent text-sm font-semibold">Manual Color Correction</span>
                        <span className="text-gray-500 text-xs">— Paint stickers, rotate face grids, or use U/D swap buttons if white/yellow are opposite</span>
                      </div>
                      <CubeEditor3D
                          key={`photo-editor-${uploadResult?.cube_state || 'empty'}`}
                          title="3D Photo Correction Editor"
                          initialState={activeState}
                          onStateChange={handleStateChange}
                        />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Full cube net */}
          {activeState && (
            <div className="card p-5">
              <h2 className="font-display font-semibold text-white mb-4">
                Cube State Net {editedState && <span className="text-xs text-accent ml-2 font-normal">(manually edited)</span>}
              </h2>
              <CubeStateDisplay state={activeState}/>
            </div>
          )}

          {/* Validation */}
          {activeValidation && (
            <div className={clsx('card p-4 border', activeValidation.is_valid?'border-accent/30 bg-accent/5':'border-red-500/30 bg-red-500/5')}>
              <div className="flex items-start gap-3">
                {activeValidation.is_valid
                  ?<CheckCircle size={20} className="text-accent shrink-0 mt-0.5"/>
                  :<AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5"/>
                }
                <div className="flex-1">
                  <p className={clsx('font-semibold text-sm',activeValidation.is_valid?'text-accent':'text-red-400')}>
                    {activeValidation.is_valid?'Valid cube — ready to solve':'Invalid cube configuration'}
                  </p>
                  {(activeValidation.errors||[]).map((e,i)=>(
                    <div key={i} className="mt-1">
                      {e.split('\n').map((line,j)=>(
                        <p key={j} className={clsx('text-xs', j===0?'text-gray-300':'text-yellow-400 mt-0.5')}>{line}</p>
                      ))}
                    </div>
                  ))}
                  {!activeValidation.is_valid && (
                    <p className="text-xs text-gray-400 mt-2">
                      👆 Click <strong className="text-accent">Manual Edit</strong> above, fix colors, and use face rotate buttons if a face photo was sideways.
                    </p>
                  )}
                  {activeValidation.is_valid && activeValidation.checks_passed?.length>0 && (
                    <p className="text-gray-500 text-xs mt-1">✓ {activeValidation.checks_passed.join(' · ')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={handleFullReset} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={16}/>Reset & Retake
            </button>
            <button onClick={handleSolve} disabled={!isReadyToSolve||loading} className="btn-accent flex items-center gap-2 px-10">
              {loading?<><Loader2 size={16} className="animate-spin"/>Solving…</>:<>Generate Solution<ArrowRight size={16}/></>}
            </button>
          </div>
        </motion.div>
      )}
      </>
      )}
    </div>
  )
}
