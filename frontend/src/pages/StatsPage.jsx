import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, Zap, Clock, Trophy, TrendingUp, Calendar, AlertCircle, Brain } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getStats, getHistory } from '../services/api'

const fade = { hidden:{opacity:0,y:20}, show:{opacity:1,y:0} }
const stag = { show:{transition:{staggerChildren:0.07}} }

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm">
      <p className="text-gray-400">{payload[0]?.name}</p>
      <p className="text-primary font-bold">{payload[0]?.value}</p>
    </div>
  )
}

export default function StatsPage() {
  const [stats,   setStats]   = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    Promise.all([getStats(), getHistory({ page:1, perPage:10 })])
      .then(([s, h]) => {
        setStats(s)
        setRecent((h.records||[]).slice(0,8).map((r,i) => ({
          name: `#${i+1}`, moves: r.move_count, time: Math.round(r.execution_time_ms)
        })))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="skeleton h-10 w-56 rounded mb-8"/>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length:8}).map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl"/>)}
      </div>
    </div>
  )

  if (error) return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <AlertCircle size={36} className="text-red-400 mx-auto mb-4"/>
      <p className="text-red-400 font-semibold">Failed to load statistics</p>
      <p className="text-gray-400 text-sm mt-1">{error}</p>
    </div>
  )

  const s = stats || {}
  const CARDS = [
    { icon:BarChart2,  label:'Total Solves',     value:s.total_solves??0,                      color:'text-primary',    bg:'bg-primary/10' },
    { icon:TrendingUp, label:'Avg Moves',         value:s.avg_moves??0,                         color:'text-accent',     bg:'bg-accent/10' },
    { icon:Trophy,     label:'Fewest Moves',      value:s.min_moves??'—',                       color:'text-yellow-400', bg:'bg-yellow-400/10' },
    { icon:BarChart2,  label:'Most Moves',        value:s.max_moves??'—',                       color:'text-red-400',    bg:'bg-red-400/10' },
    { icon:Clock,      label:'Avg Solve Time',    value:`${s.avg_time_ms?.toFixed(1)??0}ms`,    color:'text-blue-400',   bg:'bg-blue-400/10' },
    { icon:Zap,        label:'Fastest Solve',     value:`${s.fastest_time_ms?.toFixed(1)??0}ms`,color:'text-green-400',  bg:'bg-green-400/10' },
    { icon:Calendar,   label:'Solves This Week',  value:s.solves_this_week??0,                  color:'text-purple-400', bg:'bg-purple-400/10' },
    { icon:Calendar,   label:'Solves This Month', value:s.solves_this_month??0,                 color:'text-pink-400',   bg:'bg-pink-400/10' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display font-bold text-4xl text-white mb-2">Statistics Dashboard</h1>
        <p className="text-gray-400">Aggregate metrics from all recorded Rubiks Cube solves</p>
      </div>

      <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10" initial="hidden" animate="show" variants={stag}>
        {CARDS.map(({ icon:Icon, label, value, color, bg }) => (
          <motion.div key={label} variants={fade} className="card p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={color}/>
            </div>
            <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
            <p className="text-gray-400 text-sm mt-0.5">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {recent.length > 0 && (
        <motion.div className="card p-6 mb-8" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
          <h2 className="font-display font-semibold text-white mb-6">Recent Solves — Move Count</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={recent} margin={{top:5,right:10,left:-20,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A45"/>
              <XAxis dataKey="name" tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="moves" name="Moves" fill="#6C63FF" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <motion.div className="card p-6" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}}>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={18} className="text-primary"/>
          <h2 className="font-display font-semibold text-white">About the Algorithm</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400 leading-relaxed">
          <div>
            <h3 className="text-white font-semibold mb-2">Kociemba Two-Phase Algorithm (Pure JS)</h3>
            <p>
              Implemented entirely in Node.js — no Python, no C compilation required. Uses IDA* 
              (Iterative Deepening A*) search with an admissible heuristic to find optimal or 
              near-optimal solutions, typically within 20 moves (Gods Number).
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Gods Number</h3>
            <p>
              In 2010, researchers proved any 3×3 Rubiks Cube can be solved in at most 20 moves 
              (half-turn metric). CubeVision targets this bound using the Two-Phase IDA* search, 
              with Phase 1 reducing to a subgroup and Phase 2 solving within it.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
