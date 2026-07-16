import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function AdminRegister() {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [uniqueCode, setUniqueCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordComplexityError, setPasswordComplexityError] = useState('')
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validatePassword = (value) => {
    if (!value) {
      setPasswordComplexityError('')
      return
    }
    
    const errors = []
    
    if (value.length < 8) {
      errors.push('at least 8 characters')
    }
    if (value.length > 16) {
      errors.push('maximum 16 characters')
    }
    if (!/[a-zA-Z]/.test(value)) {
      errors.push('letters')
    }
    if (!/[0-9]/.test(value)) {
      errors.push('numbers')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push('symbols')
    }
    
    if (errors.length > 0) {
      setPasswordComplexityError(`Password must contain ${errors.join(', ')}`)
    } else {
      setPasswordComplexityError('')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    
    // Validate password complexity
    if (passwordComplexityError) {
      return
    }
    
    // Validate password match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setApiError('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          role: 'admin',
          unique_code: uniqueCode
        })
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to email verification page with email and verification code (development mode)
        navigate('/email-verification', {
          state: {
            isAdmin: true,
            email: email,
            verification_code: data.verification_code
          }
        })
      } else {
        setApiError(data.message || 'Registration failed')
      }
    } catch (error) {
      setApiError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = (e) => {
    const value = e.target.value
    setPassword(value)
    validatePassword(value)
  }

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value
    setConfirmPassword(value)
    
    // Clear error when passwords match
    if (password && value && password === value) {
      setPasswordError('')
    } else if (password && value && password !== value) {
      setPasswordError('Passwords do not match')
    }
  }

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 to-blue-100'}`}>
      {/* Left Side - Mascot */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
        <div className="text-center">
          <img 
            src="/snapfun_mascot_header.png" 
            alt="SnapFun Mascot" 
            className="w-full max-w-md mx-auto mb-6"
          />
          <h2 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Admin Registration</h2>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Join the SnapFun management team</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Dark Mode Toggle & Back Button */}
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
              className={`flex items-center transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Admin Login
            </Link>
          </div>

          <div className={`rounded-2xl shadow-xl p-8 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img src="/snapfun_logo.png" alt="SnapFunERP Logo" className="h-16 mr-3" />
            <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Resource System</span>
          </div>

          {/* Create Account Text */}
          <div className="text-center mb-8">
            <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Create Administrator Account</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Register to start managing the system</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500 placeholder-gray-400' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                placeholder="admin@snapfun.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500 placeholder-gray-400' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition pr-12 ${
                    passwordComplexityError 
                      ? isDarkMode 
                        ? 'border-red-500 bg-slate-700 text-white focus:ring-red-500 placeholder-gray-400' 
                        : 'border-red-500 focus:ring-red-500'
                      : isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500 placeholder-gray-400' 
                        : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
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
              {passwordComplexityError && (
                <p className="text-red-500 text-sm mt-1">{passwordComplexityError}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition pr-12 ${
                    passwordError 
                      ? isDarkMode 
                        ? 'border-red-500 bg-slate-700 text-white focus:ring-red-500 placeholder-gray-400' 
                        : 'border-red-500 focus:ring-red-500'
                      : isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500 placeholder-gray-400' 
                        : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {showConfirmPassword ? (
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
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            {/* Unique Code Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Company Unique Code
                <span className={`text-xs ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>(Required from CEO/C-Level)</span>
              </label>
              <input
                type="text"
                placeholder="Enter unique code"
                value={uniqueCode}
                onChange={(e) => setUniqueCode(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500 placeholder-gray-400' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              />
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                'Creating Account...'
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Create Administrator Account
                </>
              )}
            </button>
          </form>

          {/* API Error Message */}
          {apiError && (
            <div className={`mt-4 p-3 border rounded-lg text-sm ${
              isDarkMode 
                ? 'bg-red-900/30 border-red-800 text-red-300' 
                : 'bg-red-100 border-red-400 text-red-700'
            }`}>
              {apiError}
            </div>
          )}

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Already have an account?{' '}
              <Link to="/admin-login" className="text-blue-600 font-medium hover:text-blue-700">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default AdminRegister
