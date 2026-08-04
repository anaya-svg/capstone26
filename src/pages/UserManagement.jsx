import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, Users, UserCheck, Shield } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

function UserManagement() {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')

  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalUsers, setTotalUsers] = useState(0)
  const [summary, setSummary] = useState({ total_users: 0, active_users: 0, administrators: 0 })

  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
    status: 'active'
  })

  const [formErrors, setFormErrors] = useState({})
  const [showMissingDataModal, setShowMissingDataModal] = useState(false)
  const [systemNotice, setSystemNotice] = useState({ type: '', message: '' })

  const showSystemNotice = (type, message) => {
    setSystemNotice({ type, message })
  }

  const handleBackdropClose = (e, onClose) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const closeTopModal = () => {
    if (showMissingDataModal) {
      setShowMissingDataModal(false)
      return true
    }
    if (showDeleteModal) {
      setShowDeleteModal(false)
      return true
    }
    if (showEditModal) {
      setShowEditModal(false)
      setFormErrors({})
      return true
    }
    if (showViewModal) {
      setShowViewModal(false)
      return true
    }
    return false
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.full_name || !formData.full_name.trim()) errors.full_name = 'Full Name is required'
    if (!formData.email || !formData.email.trim()) errors.email = 'Email is required'
    if (!formData.role) errors.role = 'Role is required'
    if (!formData.status) errors.status = 'Status is required'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    return true
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'admin') {
      navigate('/dashboard')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)
    fetchSummary()
    fetchUsers()
  }, [navigate, searchTerm, roleFilter, currentPage, itemsPerPage])

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key !== 'Escape') return
      const handled = closeTopModal()
      if (handled) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleEscKey)
    return () => window.removeEventListener('keydown', handleEscKey)
  }, [showViewModal, showEditModal, showDeleteModal, showMissingDataModal])

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      if (!user?.session_token) return
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/summary`, {
        headers: {
          'Authorization': `Bearer ${user.session_token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      } else {
        showSystemNotice('error', data.message || 'Gagal memuat ringkasan user')
      }
    } catch (error) {
      console.error('Error fetching users summary:', error)
      showSystemNotice('error', 'Gagal memuat ringkasan user')
    }
  }

  const fetchUsers = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      if (!user?.session_token) {
        showSystemNotice('error', 'Sesi tidak valid, silakan login ulang')
        return
      }
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      params.append('page', currentPage)
      params.append('limit', itemsPerPage)

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users?${params.toString()}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user.session_token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
        setTotalUsers(data.total || 0)
      } else {
        showSystemNotice('error', data.message || 'Gagal memuat daftar user')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      showSystemNotice('error', 'Gagal memuat daftar user')
    }
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const handleDeleteUser = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const updateData = {
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        updated_by: user?.full_name || 'N/A'
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()
      if (data.success) {
        setShowEditModal(false)
        fetchUsers()
      } else {
        showSystemNotice('error', 'Error updating user: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      showSystemNotice('error', 'Error updating user')
    }
  }

  const confirmDelete = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        }
      })

      const data = await response.json()
      if (response.status === 403 && data.hasRecords) {
        setShowDeleteModal(false)
        showSystemNotice('warning', data.message)
      } else if (data.success) {
        setShowDeleteModal(false)
        fetchSummary()
        fetchUsers()
      } else {
        showSystemNotice('error', 'Error deleting user: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showSystemNotice('error', 'Error deleting user')
    }
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalUsers / itemsPerPage)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className={`flex-1 p-8 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
        </div>

        {systemNotice.message && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${systemNotice.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' : systemNotice.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300' : 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'}`}>
            <div className="flex items-center justify-between gap-3">
              <span>{systemNotice.message}</span>
              <button
                onClick={() => setSystemNotice({ type: '', message: '' })}
                className="text-xs underline"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total_users}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.active_users}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administrators</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.administrators}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            <option value="user">Regular User</option>
            <option value="admin">Admin User</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Users Overview</h2>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.last_login)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        {/* View User Modal */}
        {showViewModal && selectedUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowViewModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md relative">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">User Details</h2>
                {selectedUser.updated_by && (
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Updated By: {selectedUser.updated_by}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">ID:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Role:</p>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</p>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedUser.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Verified:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedUser.is_verified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Login:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedUser.last_login)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setShowEditModal(false)
              setFormErrors({})
            })}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md relative">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit User</h2>
                {selectedUser.updated_by && (
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Updated By: {selectedUser.updated_by}
                  </span>
                )}
              </div>
              <form onSubmit={handleSubmitEdit} noValidate>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                  />
                  {formErrors.full_name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.full_name}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.role ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {formErrors.role && <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.status ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {formErrors.status && <p className="text-red-500 text-xs mt-1">{formErrors.status}</p>}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setFormErrors({})
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal && selectedUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Delete User</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete user "{selectedUser.full_name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Missing Data Modal */}
        {showMissingDataModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowMissingDataModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Missing Data</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Complete the missing data.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowMissingDataModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <SnapFunny />
    </div>
  )
}

export default UserManagement
