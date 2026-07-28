import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ClipboardList, Calendar, ShoppingCart, Users, UserCog, LogOut, AlertTriangle, Percent, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function Sidebar({ userRole, userName, isSidebarOpen, setIsSidebarOpen }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const { isDarkMode, toggleDarkMode } = useTheme()

  const handleLogout = async () => {
    const userData = sessionStorage.getItem('user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        if (user?.session_token) {
          await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_token: user.session_token })
          })
        }
      } catch (err) {
        console.error('Error logging out:', err)
      }
    }

    sessionStorage.removeItem('snapfunny_chat_history')
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const userMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/assets', label: 'Assets', icon: Package },
    { path: '/inventory', label: 'Inventory', icon: ClipboardList },
    { path: '/events', label: 'Events & Booths', icon: Calendar },
    { path: '/calendar', label: 'Internal Calendar', icon: Calendar },
    { path: '/procurement', label: 'Procurement', icon: ShoppingCart },
    { path: '/customers', label: 'Customers', icon: Users }
  ]

  const adminMenuItems = [
    ...userMenuItems,
    { path: '/user-management', label: 'User Management', icon: UserCog }
  ]

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems

  return (
    <>
      {/* Overlay for mobile */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-blue-600 text-white p-2 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-slate-800 shadow-xl z-40 transition-all duration-300 ${
          isSidebarOpen ? 'w-56' : 'w-0 lg:w-56'
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center relative">
            {/* Dark Mode Toggle - Quarter Circle Button at Top-Left Corner */}
            <button
              onClick={toggleDarkMode}
              className="absolute top-0 left-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-yellow-400 dark:to-orange-500 rounded-br-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={24} className="text-white" /> : <Moon size={24} className="text-white" />}
            </button>
            
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 left-4 lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Link to="/dashboard" className="mb-2 mt-6">
              <img
                src="/snapfun_logo.png"
                alt="SnapFun Logo"
                className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white text-center">Resource System</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 overflow-y-auto">
            <ul className="space-y-3">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <item.icon size={18} className="mr-2" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="ml-2 flex-1">
                <p className="font-bold text-gray-800 dark:text-white text-sm">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userRole === 'admin' ? 'Admin' : 'Staff'}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleLogoutClick}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Confirm Logout</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to log out? You will need to log in again to access the system.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
