import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Trash2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getHistory, deleteRecord } from '../services/api'

function Row({ rec, onDelete }) {
  return (
    <motion.tr initial={{opacity:0}} animate={{opacity:1}} className="border-b border-dark-border hover:bg-dark-card/50 transition-colors">
      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(rec.date).toLocaleString()}</td>
      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-300">{rec.cube_state.slice(0,18)}…</span></td>
      <td className="px-4 py-3 text-center"><span className="font-mono text-sm font-bold text-primary">{rec.move_count}</span></td>
      <td className="px-4 py-3 text-center text-xs text-gray-400">{rec.execution_time_ms.toFixed(1)}ms</td>
      <td className="px-4 py-3 text-center">
        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', rec.is_valid?'bg-green-500/20 text-green-400':'bg-red-500/20 text-red-400')}>
          {rec.is_valid?'Valid':'Invalid'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={()=>onDelete(rec.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 size={13}/>
        </button>
      </td>
    </motion.tr>
  )
}

export default function HistoryPage() {
  const [records,  setRecords]  = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [minMoves, setMinMoves] = useState('')
  const [maxMoves, setMaxMoves] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const PER = 15

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const d = await getHistory({ page, perPage:PER, search, minMoves:minMoves?+minMoves:undefined, maxMoves:maxMoves?+maxMoves:undefined })
      setRecords(d.records||[]); setTotal(d.total||0)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, search, minMoves, maxMoves])

  useEffect(()=>{ load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('Delete this record?')) return
    try { await deleteRecord(id); toast.success('Deleted'); load() }
    catch(e) { toast.error(e.message) }
  }

  const pages = Math.ceil(total/PER)

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-4xl text-white mb-1">Solve History</h1>
          <p className="text-gray-400">{total} total solves recorded</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={15}/>Refresh</button>
      </div>

      <div className="card p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-gray-500 mb-1 block">Search cube state</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input className="input-field pl-8 !py-2 text-sm" placeholder="Filter by state…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Min moves</label>
          <input className="input-field !py-2 w-24 text-sm" type="number" min={0} placeholder="0" value={minMoves} onChange={e=>{setMinMoves(e.target.value);setPage(1)}}/>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Max moves</label>
          <input className="input-field !py-2 w-24 text-sm" type="number" min={0} placeholder="30" value={maxMoves} onChange={e=>{setMaxMoves(e.target.value);setPage(1)}}/>
        </div>
        <button onClick={()=>{setSearch('');setMinMoves('');setMaxMoves('');setPage(1)}} className="btn-secondary !py-2 text-sm">Clear</button>
      </div>

      {error ? (
        <div className="card p-6 flex items-center gap-3 border-red-500/30">
          <AlertCircle size={20} className="text-red-400"/>
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border bg-dark-card/50">
                  {['Date','Cube State','Moves','Time','Status',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length:5}).map((_,i)=>(
                      <tr key={i} className="border-b border-dark-border">
                        {Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full"/></td>)}
                      </tr>
                    ))
                  : records.length===0
                    ? <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-500">No records found. Solve a cube to see history here.</td></tr>
                    : records.map(r=><Row key={r.id} rec={r} onDelete={handleDelete}/>)
                }
              </tbody>
            </table>
          </div>
          {pages>1&&(
            <div className="flex items-center justify-between px-4 py-3 border-t border-dark-border">
              <span className="text-sm text-gray-400">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg bg-dark-border hover:bg-primary/20 disabled:opacity-40 transition-all"><ChevronLeft size={15}/></button>
                <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="p-2 rounded-lg bg-dark-border hover:bg-primary/20 disabled:opacity-40 transition-all"><ChevronRight size={15}/></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
