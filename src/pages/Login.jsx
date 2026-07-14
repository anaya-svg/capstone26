import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { AlertTriangle, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || '')
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [isForceLoading, setIsForceLoading] = useState(false)

  const handleLoginSuccess = (user) => {
    sessionStorage.setItem('user', JSON.stringify(user))
    setSuccessMessage('Login successful! Redirecting to dashboard...')
    setTimeout(() => {
      navigate('/dashboard')
    }, 1000)
  }

  const performLogin = async (endpoint, force = false) => {
    if (!force) {
      setIsLoading(true)
    } else {
      setIsForceLoading(true)
    }
    setApiError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          role: 'user'
        })
      })

      const data = await response.json()

      if (response.status === 409 && data.active_session) {
        setShowSessionModal(true)
        return
      }

      if (data.success) {
        setShowSessionModal(false)
        handleLoginSuccess(data.user)
      } else {
        setApiError(data.message || 'Login failed')
      }
    } catch (error) {
      setApiError('Network error. Please try again.')
    } finally {
      if (!force) {
        setIsLoading(false)
      } else {
        setIsForceLoading(false)
      }
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    performLogin('login')
  }

  const handleForceLogin = (e) => {
    e.preventDefault()
    performLogin('force-login', true)
  }

  const handleUseOtherAccount = () => {
    setShowSessionModal(false)
    setEmail('')
    setPassword('')
    setApiError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 flex">
      {/* Left Side - Mascot */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
        <div className="text-center">
          <img 
            src="/snapfun_mascot_header.png" 
            alt="SnapFun Mascot" 
            className="w-full max-w-md mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Welcome to SnapFun</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Your Photo Studio Resource System</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Dark Mode Toggle & Admin Login Button */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link
              to="/admin-login"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <span className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center text-sm">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Admin Login
              </span>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img src="/snapfun_logo.png" alt="SnapFunERP Logo" className="h-16 mr-3" />
            <span className="text-xl font-bold text-gray-800 dark:text-white">Resource System</span>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome Back</h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                'Signing In...'
              ) : (
                <>
                  Sign In
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {/* API Error Message */}
          {apiError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          {/* Register Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 font-medium hover:text-blue-700">
                Register here
              </Link>
            </p>
          </div>

          {/* Forgot Password Link */}
          <div className="text-center mt-2">
            <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-blue-600">
              Forgot Password?
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* Active Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-800">Active Session Detected</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This account is currently logged in on another device. You can either use a different account or log out the other device and continue here.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleUseOtherAccount}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Use Another Account
              </button>
              <button
                onClick={handleForceLogin}
                disabled={isForceLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isForceLoading ? 'Processing...' : 'Log Out Other Device & Use This Device'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Login
