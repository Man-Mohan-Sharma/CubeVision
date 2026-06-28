import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Box, Upload, Clock, BarChart2, Home, Menu, X, LogIn, LogOut, UserCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { to:'/',        label:'Home',    icon:Home },
  { to:'/upload',  label:'Solve',   icon:Upload },
  { to:'/history', label:'History', icon:Clock },
  { to:'/stats',   label:'Stats',   icon:BarChart2 },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { user, isAuthed, logout } = useAuth()

  async function handleLogout() {
    await logout()
    toast.success('Logged out')
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
            <Box size={17} className="text-white"/>
          </div>
          <span className="font-display font-bold text-lg">Cube<span className="gradient-text">Vision</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map(({ to, label, icon:Icon }) => (
            <Link key={to} to={to} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              pathname===to ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white hover:bg-dark-border')}>
              <Icon size={15}/>{label}
            </Link>
          ))}
          {isAuthed ? (
            <div className="flex items-center gap-2 ml-3">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-border text-gray-300 text-sm max-w-40 truncate">
                <UserCircle size={15}/><span className="truncate">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-border transition-all">
                <LogOut size={15}/>Logout
              </button>
            </div>
          ) : (
            <Link to="/auth" className="ml-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-dark-border hover:bg-primary/20 hover:text-primary transition-all">
              <LogIn size={15}/>Login
            </Link>
          )}
          <Link to="/upload" className="ml-2 btn-primary !py-2 !px-5 !text-sm">Solve Now →</Link>
        </div>
        <button className="md:hidden p-2 rounded-lg hover:bg-dark-border" onClick={() => setOpen(!open)}>
          {open ? <X size={20}/> : <Menu size={20}/>} 
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-dark-border bg-dark-card px-4 py-3 space-y-1">
          {LINKS.map(({ to, label, icon:Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className={clsx('flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                pathname===to ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white')}>
              <Icon size={16}/>{label}
            </Link>
          ))}
          {isAuthed ? (
            <button onClick={() => { setOpen(false); handleLogout() }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              <LogOut size={16}/>Logout {user?.name ? `(${user.name})` : ''}
            </button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              <LogIn size={16}/>Login / Register
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
