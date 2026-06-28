const HEX   = { U:'#F5F5F5',R:'#0051A2',F:'#EF2B24',D:'#FFD700',L:'#009B48',B:'#FF6B35' }
const LABEL = { U:'White',R:'Blue',F:'Red',D:'Yellow',L:'Green',B:'Orange' }

function FaceGrid({ letters, size=20 }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {letters.map((l,i)=>(
        <div key={i} title={`${l} – ${LABEL[l]||l}`}
          style={{ backgroundColor:HEX[l]||'#444', width:size, height:size }}
          className="rounded-sm shadow-sm border border-black/10"/>
      ))}
    </div>
  )
}

export default function CubeStateDisplay({ state }) {
  if (!state || state.length!==54) return null
  const grids = {}
  ;['U','R','F','D','L','B'].forEach((f,i)=>{ grids[f]=[...state.slice(i*9,(i+1)*9)] })
  const S=20
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-px">
        <div style={{ marginLeft:(S+2)*3+2 }}><FaceGrid letters={grids.U} size={S}/></div>
        <div className="flex gap-px">
          <FaceGrid letters={grids.L} size={S}/>
          <FaceGrid letters={grids.F} size={S}/>
          <FaceGrid letters={grids.R} size={S}/>
          <FaceGrid letters={grids.B} size={S}/>
        </div>
        <div style={{ marginLeft:(S+2)*3+2 }}><FaceGrid letters={grids.D} size={S}/></div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.entries(HEX).map(([k,hex])=>(
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 rounded-sm border border-black/20" style={{ backgroundColor:hex }}/>
            {k}={LABEL[k]}
          </div>
        ))}
      </div>
      <div className="bg-dark-bg rounded-xl p-3 font-mono text-xs text-gray-300 text-center tracking-widest break-all border border-dark-border select-all">
        {state}
      </div>
    </div>
  )
}
