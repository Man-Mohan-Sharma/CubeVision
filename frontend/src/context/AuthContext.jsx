import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearSession, getMe, getStoredToken, getStoredUser, loginUser, logoutUser, registerUser } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [token, setToken] = useState(getStoredToken())
  const [loading, setLoading] = useState(Boolean(getStoredToken()))

  useEffect(() => {
    let alive = true
    if (!token) { setLoading(false); return }
    getMe()
      .then(data => { if (alive) setUser(data.user) })
      .catch(() => { clearSession(); if (alive) { setUser(null); setToken(null) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token])

  async function login(payload) {
    const data = await loginUser(payload)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function register(payload) {
    const data = await registerUser(payload)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function logout() {
    await logoutUser()
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ user, token, loading, isAuthed:Boolean(token && user), login, register, logout }), [user, token, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
