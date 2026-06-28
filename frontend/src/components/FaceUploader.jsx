import { useRef, useState, useCallback } from 'react'
import { Camera, Upload, X, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

const BORDER = { U:'border-gray-400/30',R:'border-blue-500/30',F:'border-red-500/30',D:'border-yellow-400/30',L:'border-green-500/30',B:'border-orange-500/30' }
const DOT    = { U:'bg-gray-300',R:'bg-blue-500',F:'bg-red-500',D:'bg-yellow-400',L:'bg-green-500',B:'bg-orange-500' }

export default function FaceUploader({ face, label, preview, onFile, disabled }) {
  const inputRef  = useRef(null)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [webcam,   setWebcam]   = useState(false)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) { alert('Only JPG/PNG/WEBP accepted.'); return }
    onFile(face, file)
  }, [face, onFile])

  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }, [handleFile])

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
      streamRef.current = s; setWebcam(true)
      setTimeout(() => { if(videoRef.current) videoRef.current.srcObject = s }, 80)
    } catch { alert('Camera not accessible.') }
  }

  const capture = () => {
    const v = videoRef.current; if (!v) return
    const c = document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight
    c.getContext('2d').drawImage(v,0,0)
    c.toBlob(blob => { handleFile(new File([blob],`face_${face}.jpg`,{type:'image/jpeg'})); stopCam() }, 'image/jpeg', 0.92)
  }

  const stopCam = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null; setWebcam(false) }

  return (
    <div className={clsx('card border-2 overflow-hidden transition-all duration-200', BORDER[face], dragging&&'scale-105 border-primary')}>
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className={clsx('w-2.5 h-2.5 rounded-full', DOT[face])}/>
          <span className="font-display font-semibold text-sm">{label}</span>
          <span className="text-xs text-gray-500 font-mono">({face})</span>
        </div>
        {preview && <button onClick={() => onFile(face,null)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={13}/></button>}
      </div>

      <div
        className={clsx('relative mx-3 mb-2 rounded-xl overflow-hidden cursor-pointer h-28',
          !preview&&!webcam&&'flex flex-col items-center justify-center hover:bg-white/5')}
        onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
        onClick={()=>!preview&&!webcam&&inputRef.current?.click()}>
        {webcam ? (
          <div className="relative w-full h-full">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"/>
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-2">
              <button onClick={capture} className="bg-accent text-dark-bg text-xs font-bold px-3 py-1.5 rounded-lg">Capture</button>
              <button onClick={stopCam}  className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Cancel</button>
            </div>
          </div>
        ) : preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover"/>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <CheckCircle size={26} className="text-accent"/>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Upload size={20} className="text-gray-500 mx-auto mb-1"/>
            <p className="text-gray-500 text-xs">Drop or click</p>
            <p className="text-gray-600 text-xs">JPG / PNG</p>
          </div>
        )}
      </div>

      {!preview&&!webcam&&(
        <div className="flex gap-2 px-3 pb-3">
          <button onClick={()=>inputRef.current?.click()} disabled={disabled}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-dark-border hover:bg-primary/20 hover:text-primary text-gray-300 text-xs font-medium transition-all">
            <Upload size={11}/>File
          </button>
          <button onClick={startCam} disabled={disabled}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-dark-border hover:bg-accent/20 hover:text-accent text-gray-300 text-xs font-medium transition-all">
            <Camera size={11}/>Cam
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
    </div>
  )
}
