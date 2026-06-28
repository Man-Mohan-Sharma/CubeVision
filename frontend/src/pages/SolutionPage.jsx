import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Zap, Clock, Hash, CheckCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import CubeVisualizer3D from '../components/CubeVisualizer3D'
import CubeStateDisplay from '../components/CubeStateDisplay'

export default function SolutionPage() {
  const { state } = useLocation()
  const sv = state?.solve
  if (!sv?.success) return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-gray-400 mb-6">No solution data. Please solve a cube first.</p>
      <Link to="/upload" className="btn-primary">Go to Upload</Link>
    </div>
  )
  const STATS=[
    {icon:Hash,label:'Move Count',value:sv.move_count,color:'text-primary'},
    {icon:Clock,label:'Solve Time',value:`${sv.execution_time_ms.toFixed(1)}ms`,color:'text-accent'},
    {icon:Zap,label:'Algorithm',value:'Kociemba Two-Phase',color:'text-yellow-400'},
    {icon:CheckCircle,label:'Status',value:'Valid & Solved',color:'text-green-400'},
  ]
  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(22); doc.setTextColor(108,99,255)
    doc.text('CubeVision — Solve Report', 20, 28)
    doc.setTextColor(0,0,0); doc.setFontSize(11)
    const lines=[`Date: ${new Date().toLocaleString()}`,`Algorithm: ${sv.algorithm}`,`Move Count: ${sv.move_count}`,`Time: ${sv.execution_time_ms.toFixed(1)}ms`,'',`Cube State:`,sv.cube_state,'','Solution:']
    let y=42; lines.forEach(l=>{doc.text(l,20,y);y+=8})
    let row=''
    sv.solution.split(' ').forEach(m=>{ if((row+m).length>65){doc.text(row.trim(),20,y);y+=8;row=''} row+=m+' ' })
    if(row) doc.text(row.trim(),20,y)
    doc.save('cubevision-solution.pdf')
  }
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <Link to="/upload" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-3 transition-colors"><ArrowLeft size={15}/>Back to Upload</Link>
          <h1 className="font-display font-bold text-4xl text-white">Solution Ready</h1>
          <p className="text-gray-400 mt-1">Solved in <span className="text-accent font-semibold">{sv.move_count} moves</span> using the Kociemba Two-Phase Algorithm</p>
        </div>
        <button onClick={exportPDF} className="btn-secondary flex items-center gap-2"><Download size={16}/>Export PDF</button>
      </div>
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
        {STATS.map(({icon:Icon,label,value,color})=>(
          <div key={label} className="card p-4"><Icon size={15} className={`${color} mb-2`}/><p className={`font-display font-bold text-lg ${color} leading-tight`}>{value}</p><p className="text-gray-500 text-xs mt-0.5">{label}</p></div>
        ))}
      </motion.div>
      <div className="grid lg:grid-cols-2 gap-8">
        <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.1}}>
          <h2 className="font-display font-semibold text-white mb-3">3D Visualization</h2>
          <p className="text-gray-500 text-xs mb-3">Drag to rotate · Play to animate · Step through moves manually</p>
          <CubeVisualizer3D solution={sv.solution} cubeState={sv.cube_state}/>
        </motion.div>
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.2}} className="space-y-5">
          <div className="card p-5"><h2 className="font-display font-semibold text-white mb-4">Cube State Net</h2><CubeStateDisplay state={sv.cube_state}/></div>
          <div className="card p-5">
            <h2 className="font-display font-semibold text-white mb-3">Solution Sequence</h2>
            <div className="flex flex-wrap gap-1.5">
              {sv.solution.split(' ').map((m,i)=>(
                <span key={i} className="font-mono text-sm px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">{m}</span>
              ))}
            </div>
            <p className="text-gray-600 text-xs mt-3">U=Up · D=Down · F=Front · B=Back · R=Right · L=Left · (')=counter-clockwise · (2)=180°</p>
          </div>
          <div className="flex gap-3">
            <Link to="/upload"  className="btn-primary flex-1 text-center text-sm py-3">Solve Another</Link>
            <Link to="/history" className="btn-secondary flex-1 text-center text-sm py-3">View History</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
