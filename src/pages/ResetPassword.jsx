import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowLeft, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function ResetPassword() {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordComplexityError, setPasswordComplexityError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

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

  const handlePasswordChange = (e) => {
    const value = e.target.value
    setNewPassword(value)
    validatePassword(value)
  }

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value
    setConfirmPassword(value)
    
    if (newPassword && value && newPassword === value) {
      setPasswordError('')
    } else if (newPassword && value && newPassword !== value) {
      setPasswordError('Passwords do not match')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('')

    if (passwordComplexityError) {
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 8 characters long')
      setMessageType('error')
      setLoading(false)
      return
    }

    const email = sessionStorage.getItem('reset_email')
    const code = sessionStorage.getItem('reset_code') || ''

    if (!email) {
      setMessage('Email not found. Please start the password reset process again.')
      setMessageType('error')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          code, 
          new_password: newPassword 
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Password reset successfully! Redirecting to login...')
        setMessageType('success')
        
        sessionStorage.removeItem('reset_email')
        sessionStorage.removeItem('reset_code')
        
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setMessage(data.message || 'Failed to reset password')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('An error occurred. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
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
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">New Password</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Secure your account with a new password</p>
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
            <button
              onClick={() => navigate('/forgot-password')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Reset Password</h1>
            <p className="text-gray-500 dark:text-gray-400">Enter your new password</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-3 rounded-lg text-sm ${
              messageType === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition pr-12 ${
                    passwordComplexityError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwordComplexityError && (
                <p className="text-red-500 text-sm mt-1">{passwordComplexityError}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition pr-12 ${
                    passwordError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            {/* Reset Password Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Resetting...'
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
