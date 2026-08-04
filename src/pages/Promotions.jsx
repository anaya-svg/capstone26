import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Percent, Calendar, Check, Sparkles, Tag, AlertTriangle, Eye } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Promotions({ isOpen, onClose }) {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const [promotions, setPromotions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [statusFilter, setStatusFilter] = useState('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState(null)
  const [systemNotice, setSystemNotice] = useState({ type: '', message: '' })

  const [formData, setFormData] = useState({
    promo_code: '',
    promo_name: '',
    discount_type: 'percentage',
    discount_value: 0,
    applicable_to: 'all',
    min_transaction: 0,
    eligibility_type: 'no_rule',
    target_package_name: '',
    day_restrictions: [],
    start_date: '',
    end_date: '',
    status: 'active'
  })

  const [formErrors, setFormErrors] = useState({})

  const showSystemNotice = (type, message) => {
    setSystemNotice({ type, message })
    setTimeout(() => {
      setSystemNotice({ type: '', message: '' })
    }, 5000)
  }

  const handleBackdropClose = (e, onCloseFn) => {
    if (e.target === e.currentTarget) {
      onCloseFn()
    }
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    resetForm()
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      promo_code: '',
      promo_name: '',
      discount_type: 'percentage',
      discount_value: 0,
      applicable_to: 'all',
      min_transaction: 0,
      eligibility_type: 'no_rule',
      target_package_name: '',
      day_restrictions: [],
      start_date: '',
      end_date: '',
      status: 'active'
    })
    setFormErrors({})
    setSelectedPromotion(null)
  }

  const closeTopModal = () => {
    if (showDeleteModal) {
      setShowDeleteModal(false)
      return true
    }
    if (showEditModal) {
      closeEditModal()
      return true
    }
    if (showAddModal) {
      closeAddModal()
      return true
    }
    return false
  }

  useEffect(() => {
    if (!isOpen) return
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      return
    }
    fetchPromotions()
  }, [isOpen, navigate])

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key !== 'Escape') return
      const handled = closeTopModal()
      if (handled) {
        event.preventDefault()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscKey)
    }
    return () => window.removeEventListener('keydown', handleEscKey)
  }, [isOpen, showAddModal, showEditModal, showDeleteModal])

  const fetchPromotions = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/promotions`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setPromotions(data.data)
      } else {
        showSystemNotice('error', data.message || 'Failed to fetch promotions')
      }
    } catch (error) {
      console.error('Error fetching promotions:', error)
      showSystemNotice('error', 'Network error while fetching promotions')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCheckboxChange = (day) => {
    setFormData(prev => {
      const currentDays = [...prev.day_restrictions]
      if (currentDays.includes(day)) {
        return { ...prev, day_restrictions: currentDays.filter(d => d !== day) }
      } else {
        return { ...prev, day_restrictions: [...currentDays, day] }
      }
    })
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.promo_code || !formData.promo_code.trim()) {
      errors.promo_code = 'Promo code is required!'
    } else if (/\s/.test(formData.promo_code)) {
      errors.promo_code = 'Promo code cannot contain spaces!'
    }
    if (!formData.promo_name || !formData.promo_name.trim()) {
      errors.promo_name = 'Promo name is required!'
    }
    if (formData.discount_value <= 0) {
      errors.discount_value = 'Discount value must be greater than 0!'
    } else if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      errors.discount_value = 'Percentage discount value cannot exceed 100%!'
    }
    if (!formData.start_date) {
      errors.start_date = 'Start date is required!'
    }
    if (!formData.end_date) {
      errors.end_date = 'End date is required!'
    } else if (formData.start_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      errors.end_date = 'End date cannot be before start date!'
    }

    if (formData.eligibility_type === 'weekday_slump' && formData.day_restrictions.length === 0) {
      errors.day_restrictions = 'Please select at least 1 restricted day for Weekday Slump!'
    }

    if (formData.discount_value < 0) {
      errors.discount_value = 'Discount value cannot be negative!'
    }
    if (formData.min_transaction < 0) {
      errors.min_transaction = 'Minimum transaction cannot be negative!'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const submissionData = {
      ...formData,
      promo_code: formData.promo_code.toUpperCase().trim(),
      day_restrictions: formData.day_restrictions.length > 0 ? formData.day_restrictions.join(',') : null,
      target_package_name: null
    }

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify(submissionData)
      })
      const data = await response.json()
      if (data.success) {
        showSystemNotice('success', 'Promotion added successfully!')
        closeAddModal()
        fetchPromotions()
      } else {
        showSystemNotice('error', data.message || 'Failed to add promotion')
      }
    } catch (error) {
      console.error('Error adding promotion:', error)
      showSystemNotice('error', 'Network error while adding promotion')
    }
  }

  const handleEditClick = (promo) => {
    setSelectedPromotion(promo)
    setFormData({
      promo_code: promo.promo_code,
      promo_name: promo.promo_name,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      applicable_to: promo.applicable_to,
      min_transaction: promo.min_transaction,
      eligibility_type: promo.eligibility_type,
      target_package_name: '',
      day_restrictions: promo.day_restrictions ? promo.day_restrictions.split(',') : [],
      start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
      end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
      status: promo.status
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const submissionData = {
      ...formData,
      promo_code: formData.promo_code.toUpperCase().trim(),
      day_restrictions: formData.day_restrictions.length > 0 ? formData.day_restrictions.join(',') : null,
      target_package_name: null
    }

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/promotions/${selectedPromotion.promo_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify(submissionData)
      })
      const data = await response.json()
      if (data.success) {
        showSystemNotice('success', 'Promotion updated successfully!')
        closeEditModal()
        fetchPromotions()
      } else {
        showSystemNotice('error', data.message || 'Failed to update promotion')
      }
    } catch (error) {
      console.error('Error updating promotion:', error)
      showSystemNotice('error', 'Network error while updating promotion')
    }
  }

  const handleDeleteClick = (promo) => {
    setSelectedPromotion(promo)
    setShowDeleteModal(true)
  }

  const handleDeleteSubmit = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/promotions/${selectedPromotion.promo_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        showSystemNotice('success', 'Promotion deleted successfully!')
        setShowDeleteModal(false)
        setSelectedPromotion(null)
        fetchPromotions()
      } else {
        showSystemNotice('error', data.message || 'Failed to delete promotion')
      }
    } catch (error) {
      console.error('Error deleting promotion:', error)
      showSystemNotice('error', 'Network error while deleting promotion')
    }
  }

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch =
      promo.promo_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promo.promo_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || promo.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPromotions.slice(indexOfFirstItem, indexOfLastItem)
  const totalItems = filteredPromotions.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => handleBackdropClose(e, onClose)}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-700 transform transition-all">
        
        {/* Modal Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                Manage Promo & Discount
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Create, edit, and monitor discount rules and weekday promotions.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center font-semibold text-sm shadow-md gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Promo
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold text-2xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </header>

        {/* Modal Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications Banner */}
          {systemNotice.message && (
            <div
              className={`p-4 rounded-lg flex items-center justify-between text-sm shadow-sm transition-all duration-300 ${
                systemNotice.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-l-4 border-green-500' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{systemNotice.message}</span>
              </div>
              <button onClick={() => setSystemNotice({ type: '', message: '' })} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold ml-2">
                ×
              </button>
            </div>
          )}

          {/* Filters & Search Control Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search promo code or name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">🔍</span>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Status Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Promotions Cards Grid / Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 uppercase font-bold text-xs border-b border-gray-200 dark:border-slate-600">
                    <th className="px-6 py-4">Promo Code</th>
                    <th className="px-6 py-4">Promo Name</th>
                    <th className="px-6 py-4">Discount Value</th>
                    <th className="px-6 py-4">Applies To</th>
                    <th className="px-6 py-4">Eligibility Type</th>
                    <th className="px-6 py-4">Validity Period</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200 text-sm">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium">
                        No promotions found. Please add a new promotion.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((promo) => (
                      <tr key={promo.promo_id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-mono font-bold text-xs px-2.5 py-1.5 rounded border border-blue-200 dark:border-blue-800">
                            {promo.promo_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{promo.promo_name}</p>
                            {promo.min_transaction > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Min. Transaction: {formatCurrency(promo.min_transaction)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {promo.discount_type === 'percentage' ? (
                            <span className="text-green-600 dark:text-green-400 font-bold">{promo.discount_value}% OFF</span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 font-bold">-{formatCurrency(promo.discount_value)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            promo.applicable_to === 'in_studio'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                              : promo.applicable_to === 'off_site'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                          }`}>
                            {promo.applicable_to === 'in_studio' ? 'In-Studio' : promo.applicable_to === 'off_site' ? 'Off-Site' : 'All (In/Off)'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {promo.eligibility_type === 'no_rule' && 'No Rule'}
                              {promo.eligibility_type === 'weekday_slump' && 'Weekday Slump'}
                            </span>
                            {promo.eligibility_type === 'weekday_slump' && promo.day_restrictions && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                Days: {promo.day_restrictions}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 space-y-0.5">
                          <p>Start: {formatDate(promo.start_date)}</p>
                          <p>End: {formatDate(promo.end_date)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 ${
                            promo.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {promo.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(promo)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors inline-block"
                            title="Edit Promo"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(promo)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors inline-block"
                            title="Delete Promo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600 px-6 py-4 flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-semibold">{indexOfFirstItem + 1}</span>-
                  <span className="font-semibold">{Math.min(indexOfLastItem, totalItems)}</span> of{' '}
                  <span className="font-semibold">{totalItems}</span> Promos
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors text-gray-900 dark:text-white"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 border rounded text-sm font-semibold transition-colors ${
                        currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors text-gray-900 dark:text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD PROMOTION MODAL (Higher z-index layer) */}
      {showAddModal && (
        <div
          onMouseDown={(e) => handleBackdropClose(e, closeAddModal)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150 dark:border-slate-700 animate-scaleIn">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Add New Promo
              </h3>
              <button onClick={closeAddModal} className="text-white hover:text-gray-200 font-bold text-xl leading-none" type="button">
                ×
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Promo Code *</label>
                  <input
                    type="text"
                    value={formData.promo_code}
                    onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                    placeholder="E.g. DISKONHEBOH"
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.promo_code && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.promo_code}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Promo Name *</label>
                  <input
                    type="text"
                    value={formData.promo_name}
                    onChange={(e) => setFormData({ ...formData, promo_name: e.target.value })}
                    placeholder="E.g. New Year Discount"
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.promo_name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.promo_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value, discount_value: 0 })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.discount_value || ''}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) || 0 })}
                    placeholder={formData.discount_type === 'percentage' ? 'E.g. 10' : 'E.g. 50000'}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.discount_value && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.discount_value}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Applies To</label>
                  <select
                    value={formData.applicable_to}
                    onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Transactions</option>
                    <option value="in_studio">In-Studio Only</option>
                    <option value="off_site">Off-Site (Events) Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Min. Transaction Amount (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_transaction || ''}
                    onChange={(e) => setFormData({ ...formData, min_transaction: Number(e.target.value) || 0 })}
                    placeholder="E.g. 100000"
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Eligibility Type (Rule Engine)</label>
                <select
                  value={formData.eligibility_type}
                  onChange={(e) => setFormData({ ...formData, eligibility_type: e.target.value, target_package_name: '', day_restrictions: [] })}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="no_rule">No Special Rule (Valid Every Day)</option>
                  <option value="weekday_slump">Weekday Slump (Specific Days Only)</option>
                </select>
              </div>

              {/* Conditional sub-form for Weekday Slump */}
              {formData.eligibility_type === 'weekday_slump' && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800 space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-orange-950 dark:text-orange-300 uppercase">Select Restricted Days *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                      const isChecked = formData.day_restrictions.includes(day)
                      return (
                        <label key={day} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(day)}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          {day === 'Mon' && 'Monday'}
                          {day === 'Tue' && 'Tuesday'}
                          {day === 'Wed' && 'Wednesday'}
                          {day === 'Thu' && 'Thursday'}
                          {day === 'Fri' && 'Friday'}
                          {day === 'Sat' && 'Saturday'}
                          {day === 'Sun' && 'Sunday'}
                        </label>
                      )
                    })}
                  </div>
                  {formErrors.day_restrictions && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.day_restrictions}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.start_date && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.end_date && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.end_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Active Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-md transition-colors"
                >
                  Save Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROMOTION MODAL (Higher z-index layer) */}
      {showEditModal && (
        <div
          onMouseDown={(e) => handleBackdropClose(e, closeEditModal)}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150 dark:border-slate-700 animate-scaleIn">
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Edit Promo Details
              </h3>
              <button onClick={closeEditModal} className="text-white hover:text-gray-200 font-bold text-xl leading-none" type="button">
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Promo Code *</label>
                  <input
                    type="text"
                    value={formData.promo_code}
                    onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                    placeholder="E.g. DISKONHEBOH"
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.promo_code && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.promo_code}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Promo Name *</label>
                  <input
                    type="text"
                    value={formData.promo_name}
                    onChange={(e) => setFormData({ ...formData, promo_name: e.target.value })}
                    placeholder="E.g. Promo HUT RI 81"
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.promo_name && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.promo_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value, discount_value: 0 })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.discount_value || ''}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) || 0 })}
                    placeholder={formData.discount_type === 'percentage' ? 'E.g. 10' : 'E.g. 50000'}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.discount_value && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.discount_value}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Applies To</label>
                  <select
                    value={formData.applicable_to}
                    onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Transactions</option>
                    <option value="in_studio">In-Studio Only</option>
                    <option value="off_site">Off-Site (Events) Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Min. Transaction Amount (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_transaction || ''}
                    onChange={(e) => setFormData({ ...formData, min_transaction: Number(e.target.value) || 0 })}
                    placeholder="E.g. 100000"
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Eligibility Type (Rule Engine)</label>
                <select
                  value={formData.eligibility_type}
                  onChange={(e) => setFormData({ ...formData, eligibility_type: e.target.value, target_package_name: '', day_restrictions: [] })}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="no_rule">No Special Rule (Valid Every Day)</option>
                  <option value="weekday_slump">Weekday Slump (Specific Days Only)</option>
                </select>
              </div>

              {/* Conditional sub-form for Weekday Slump */}
              {formData.eligibility_type === 'weekday_slump' && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800 space-y-2 animate-fadeIn">
                  <label className="block text-xs font-bold text-orange-950 dark:text-orange-300 uppercase">Select Restricted Days *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                      const isChecked = formData.day_restrictions.includes(day)
                      return (
                        <label key={day} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(day)}
                            className="rounded text-orange-600 focus:ring-orange-500"
                          />
                          {day === 'Mon' && 'Monday'}
                          {day === 'Tue' && 'Tuesday'}
                          {day === 'Wed' && 'Wednesday'}
                          {day === 'Thu' && 'Thursday'}
                          {day === 'Fri' && 'Friday'}
                          {day === 'Sat' && 'Saturday'}
                          {day === 'Sun' && 'Sunday'}
                        </label>
                      )
                    })}
                  </div>
                  {formErrors.day_restrictions && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.day_restrictions}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.start_date && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.start_date}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                  {formErrors.end_date && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formErrors.end_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Active Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-semibold text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (Higher z-index layer) */}
      {showDeleteModal && (
        <div
          onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-150 dark:border-slate-700 animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 animate-bounce" />
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">Delete Promotion?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Are you sure you want to delete the promo code <strong className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-800 dark:text-white">"{selectedPromotion?.promo_code}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-300 dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
