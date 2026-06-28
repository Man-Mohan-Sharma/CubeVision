import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import SolutionPage from './pages/SolutionPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'
import AuthPage from './pages/AuthPage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/"         element={<HomePage />} />
            <Route path="/auth"     element={<AuthPage />} />
            <Route path="/upload"   element={<UploadPage />} />
            <Route path="/solution" element={<SolutionPage />} />
            <Route path="/history"  element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/stats"    element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
