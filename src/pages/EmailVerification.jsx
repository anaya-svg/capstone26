import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function EmailVerification() {
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [code, setCode] = useState(['', '', '', '', ''])
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  
  const mode = location.state?.mode || 'registration'
  const isAdmin = location.state?.isAdmin || false
  const email = location.state?.email || ''
  const [verificationCode, setVerificationCode] = useState(location.state?.verification_code || '')

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 4) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const verificationCode = code.join('')

    console.log('Email:', email)
    console.log('Verification Code:', verificationCode)
    console.log('Mode:', mode)

    if (!email) {
      setApiError('Email not found. Please start again.')
      return
    }

    if (mode === 'forgot-password') {
      const storedEmail = sessionStorage.getItem('reset_email')
      if (!storedEmail || storedEmail !== email) {
        setApiError('Email mismatch. Please start the password reset process again.')
        setTimeout(() => {
          navigate('/forgot-password')
        }, 2000)
        return
      }
    }

    setIsLoading(true)
    setApiError('')

    try {
      const endpoint = mode === 'forgot-password' 
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-code`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/verify-email`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          verification_code: verificationCode
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        if (mode === 'forgot-password') {
          sessionStorage.setItem('reset_code', verificationCode)
          navigate('/reset-password')
        } else {
          navigate(isAdmin ? '/admin-login' : '/login', {
            state: { successMessage: data.message }
          })
        }
      } else {
        setApiError(data.message || 'Verification failed')
      }
    } catch (error) {
      console.log('Error:', error)
      setApiError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return

    if (mode === 'forgot-password') {
      const storedEmail = sessionStorage.getItem('reset_email')
      if (!storedEmail || storedEmail !== email) {
        setApiError('Email mismatch. Please start the password reset process again.')
        setTimeout(() => {
          navigate('/forgot-password')
        }, 2000)
        return
      }
    }

    setIsResending(true)
    setApiError('')

    try {
      const endpoint = mode === 'forgot-password'
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/forgot-password`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/resend-verification`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        if (data.verification_code) {
          setVerificationCode(data.verification_code)
        }
        setCode(['', '', '', '', ''])
        setResendCooldown(30)

        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setApiError(data.message || 'Failed to resend code')
      }
    } catch (error) {
      setApiError('Network error. Please try again.')
    } finally {
      setIsResending(false)
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
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            {mode === 'forgot-password' ? 'Verify Your Identity' : 'Verify Your Email'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {mode === 'forgot-password' ? 'Secure your account' : 'Complete your registration'}
          </p>
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
              to={mode === 'forgot-password' ? '/forgot-password' : (isAdmin ? '/admin-register' : '/register')}
              state={mode === 'forgot-password' ? {} : { isAdmin }}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img src="/snapfun_logo.png" alt="SnapFunERP Logo" className="h-16 mr-3" />
            <span className="text-xl font-bold text-gray-800 dark:text-white">Resource System</span>
          </div>

          {/* Verification Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              {mode === 'forgot-password' ? 'Verify Code' : 'Email Verification'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {mode === 'forgot-password'
                ? 'Please check your email to verify your password reset request'
                : (isAdmin 
                  ? 'Please check your email to verify your Administrator account'
                  : 'Please check your email to verify your account')
              }
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              We've sent a 5-digit verification code to your email
            </p>
            {verificationCode && (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
                <strong>Development Mode:</strong> Your verification code is <span className="font-mono font-bold text-lg">{verificationCode}</span>
              </div>
            )}
          </div>

          {/* Verification Code Input */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : (mode === 'forgot-password' ? 'Verify Code' : 'Verify Email')}
            </button>
          </form>

          {/* API Error Message */}
          {apiError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          {/* Resend Code */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="text-blue-600 font-medium hover:text-blue-700 underline disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : isResending ? 'Sending...' : 'Resend'}
              </button>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerification
