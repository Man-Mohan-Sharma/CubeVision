import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, LogIn, UserPlus } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/upload'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        await register({ name, email, password })
        toast.success('Account created. Your solves will now be saved.')
      } else {
        await login({ email, password })
        toast.success('Logged in successfully.')
      }
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} className="card p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-3">
            <Lock size={20} className="text-primary"/>
          </div>
          <h1 className="font-display font-bold text-3xl text-white">
            {mode === 'register' ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'register'
              ? 'JWT login keeps each user history and stats separate.'
              : 'Log in to save solves, history, and personal stats.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-dark-border mb-5">
          <button onClick={() => setMode('login')} className={clsx('py-2 rounded-lg text-sm font-semibold transition-all', mode==='login'?'bg-primary text-white':'text-gray-400 hover:text-white')}>Login</button>
          <button onClick={() => setMode('register')} className={clsx('py-2 rounded-lg text-sm font-semibold transition-all', mode==='register'?'bg-primary text-white':'text-gray-400 hover:text-white')}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Name</label>
              <input className="input-field" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" minLength={2} required />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Password</label>
            <div className="relative">
              <input className="input-field pr-11" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters" minLength={6} required />
              <button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>} 
              </button>
            </div>
          </div>

          <button disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {mode === 'register' ? <UserPlus size={16}/> : <LogIn size={16}/>} {loading ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-5">
          Passwords are stored as salted scrypt hashes. JWT is stored in browser localStorage for this student project.
        </p>
        <Link to="/upload" className="block text-center text-xs text-gray-500 hover:text-accent mt-3">Continue without login</Link>
      </motion.div>
    </div>
  )
}
