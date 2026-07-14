import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function ForgotPassword() {
  const navigate = useNavigate()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Verification code sent to your email. Please check your inbox.')
        setMessageType('success')
        // Store email in sessionStorage for next steps
        sessionStorage.setItem('reset_email', email)
        
        // Redirect to email verification page with forgot-password mode
        setTimeout(() => {
          navigate('/email-verification', {
            state: {
              mode: 'forgot-password',
              email: email
            }
          })
        }, 2000)
      } else {
        setMessage(data.message || 'Failed to send verification code')
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
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Reset Password</h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">We'll help you get back in</p>
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
              onClick={() => navigate('/login')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Login
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Forgot Password?</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Enter your email to receive a verification code</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              messageType === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
