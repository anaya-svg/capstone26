import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import EmailVerification from './pages/EmailVerification'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Inventory from './pages/Inventory'
import Events from './pages/Events'
import Calendar from './pages/Calendar'
import Procurement from './pages/Procurement'
import Customers from './pages/Customers'
import UserManagement from './pages/UserManagement'

function SessionGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  const intervalRef = useRef(null)
  const inactivityTimeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now()
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      sessionStorage.removeItem('user')
      window.location.reload()
    }, 30 * 60 * 1000) // 30 minutes
  }

  useEffect(() => {
    const userData = sessionStorage.getItem('user')
    const user = userData ? JSON.parse(userData) : null
    if (!user?.session_token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer)
    })

    resetInactivityTimer()

    const verifySession = async () => {
      const currentData = sessionStorage.getItem('user')
      const currentUser = currentData ? JSON.parse(currentData) : null
      if (!currentUser?.session_token) return

      const currentToken = currentUser.session_token
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: currentToken })
        })

        if (!response.ok) {
          const latestData = sessionStorage.getItem('user')
          const latestUser = latestData ? JSON.parse(latestData) : null
          if (latestUser?.session_token !== currentToken) return

          sessionStorage.removeItem('user')
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          if (inactivityTimeoutRef.current) {
            clearTimeout(inactivityTimeoutRef.current)
          }
          navigate('/login', { replace: true })
        }
      } catch (err) {
        console.error('Session verification error:', err)
      }
    }

    verifySession()
    intervalRef.current = setInterval(verifySession, 15000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer)
      })
    }
  }, [location, navigate])

  return null
}


function App() {
  return (
    <BrowserRouter>
      <SessionGuard />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/events" element={<Events />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/user-management" element={<UserManagement />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
