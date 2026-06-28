import { Navigate, useLocation } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Loader2 size={28} className="animate-spin text-primary mx-auto mb-4"/>
        <p className="text-gray-400">Checking your session…</p>
      </div>
    )
  }

  if (!isAuthed) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return children
}
