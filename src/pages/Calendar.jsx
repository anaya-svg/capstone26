import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

function Calendar() {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')
  const [events, setEvents] = useState([])
  const [activities, setActivities] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isEventViewModalOpen, setIsEventViewModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [activityForm, setActivityForm] = useState({
    title: '',
    notes: '',
    activity_date: '',
    repeat_type: 'none'
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
    if (isAddModalOpen) {
      setIsAddModalOpen(false)
      setFormErrors({})
      return true
    }
    if (isEventViewModalOpen) {
      setIsEventViewModalOpen(false)
      return true
    }
    if (isDeleteModalOpen) {
      setIsDeleteModalOpen(false)
      return true
    }
    if (isViewModalOpen) {
      setIsViewModalOpen(false)
      setFormErrors({})
      return true
    }
    return false
  }

  const validateForm = () => {
    const errors = {}
    if (!activityForm.title || !activityForm.title.trim()) {
      errors.title = 'Title is required'
    }
    if (!activityForm.activity_date) {
      errors.activity_date = 'Date is required'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    return true
  }

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)
  }, [navigate])

  useEffect(() => {
    fetchEvents()
    fetchActivities()
  }, [statusFilter])

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
  }, [isViewModalOpen, isDeleteModalOpen, isEventViewModalOpen, isAddModalOpen, showMissingDataModal])

  const fetchEvents = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const url = statusFilter === 'all'
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/calendar`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/calendar?status=${statusFilter}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setEvents(data.data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchActivities = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/calendar`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setActivities(data.data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityForm,
          created_by: user?.full_name || 'N/A'
        })
      })
      const data = await response.json()
      if (data.success) {
        fetchActivities()
        setIsAddModalOpen(false)
        setActivityForm({ title: '', notes: '', activity_date: '', repeat_type: 'none' })
        showSystemNotice('success', 'Activity added successfully')
      }
    } catch (error) {
      console.error('Error adding activity:', error)
      showSystemNotice('error', 'Error adding activity')
    }
  }

  const handleOpenAddModal = () => {
    setActivityForm({ title: '', notes: '', activity_date: '', repeat_type: 'none' })
    setFormErrors({})
    setIsAddModalOpen(true)
  }

  const handleViewActivity = (activity) => {
    setSelectedActivity(activity)
    setIsViewModalOpen(true)
    setIsEditMode(false)
  }

  const handleViewEvent = async (event) => {
    try {
      console.log('Fetching event details for:', event.event_id)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${event.event_id}`)
      const data = await response.json()
      console.log('Event details response:', data)
      if (data.success && data.data) {
        setSelectedEvent(data.data)
        setIsEventViewModalOpen(true)
      } else {
        console.error('Failed to fetch event details:', data.message || 'Unknown error')
        showSystemNotice('error', 'Failed to load event details. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching event details:', error)
      showSystemNotice('error', 'Error loading event details. Please try again.')
    }
  }

  const handleEditActivity = (activity) => {
    setSelectedActivity(activity)
    setActivityForm({
      title: activity.title,
      notes: activity.notes,
      activity_date: activity.activity_date,
      repeat_type: activity.repeat_type
    })
    setFormErrors({})
    setIsViewModalOpen(true)
    setIsEditMode(true)
  }

  const handleUpdateActivity = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/calendar/${selectedActivity.activity_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activityForm,
          updated_by: user?.full_name || 'N/A'
        })
      })
      const data = await response.json()
      if (data.success) {
        fetchActivities()
        setIsViewModalOpen(false)
        setSelectedActivity(null)
        setActivityForm({ title: '', notes: '', activity_date: '', repeat_type: 'none' })
        showSystemNotice('success', 'Activity updated successfully')
      }
    } catch (error) {
      console.error('Error updating activity:', error)
      showSystemNotice('error', 'Error updating activity')
    }
  }

  const handleDeleteActivity = async () => {
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteActivity = async () => {
    if (!selectedActivity) return
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/calendar/${selectedActivity.activity_id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchActivities()
        setIsViewModalOpen(false)
        setIsDeleteModalOpen(false)
        setSelectedActivity(null)
        showSystemNotice('success', 'Activity deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
      showSystemNotice('error', 'Error deleting activity')
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    return { daysInMonth, startDayOfWeek }
  }

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const startDate = new Date(event.start_date)
      const endDate = new Date(event.end_date)
      const currentDate = new Date(dateStr)
      return currentDate >= startDate && currentDate <= endDate
    })
  }

  const getActivitiesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return activities.filter(activity => activity.activity_date === dateStr)
  }

  const getStatusColor = (status) => {
    const statusLower = status ? status.toLowerCase() : ''
    switch (statusLower) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusTextColor = (status) => {
    const statusLower = status ? status.toLowerCase() : ''
    switch (statusLower) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  }

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    return `${day}-${month}-${year}`
  }

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  const handleDateClick = (day) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const { daysInMonth, startDayOfWeek } = getDaysInMonth(currentMonth)
  const selectedDateEvents = getEventsForDate(selectedDate)
  const selectedDateActivities = getActivitiesForDate(selectedDate)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className={`flex-1 p-8 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Internal Calendar</h1>
            <div className="flex gap-3">
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Reminder
              </button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {systemNotice.message && (
            <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${systemNotice.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' : 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'}`}>
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

          {/* Status Legend */}
          <div className="flex gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
            </div>
          </div>

          <div className="flex gap-6 h-[calc(100vh-180px)]">
            {/* Calendar */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={goToPrevMonth}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                >
                  Previous
                </button>
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h2>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Today
                  </button>
                </div>
                <button
                  onClick={goToNextMonth}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition"
                >
                  Next
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: startDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="h-20"></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  const dayEvents = getEventsForDate(date)
                  const dayActivities = getActivitiesForDate(date)
                  const allActivities = [...dayEvents, ...dayActivities]
                  const isSelected = selectedDate.toDateString() === date.toDateString()
                  const isToday = new Date().toDateString() === date.toDateString()

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`h-20 p-2 border rounded-lg cursor-pointer transition ${
                        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                      } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div className="text-xs font-semibold text-gray-800 dark:text-white mb-1">{day}</div>
                      <div className="space-y-0.5">
                        {allActivities.slice(0, 2).map((item, idx) => {
                          const isEvent = item.event_id
                          return (
                            <div
                              key={idx}
                              className={`text-[10px] px-1 py-0.5 rounded truncate leading-tight ${isEvent ? getStatusColor(item.status) : 'bg-gray-500 text-white'}`}
                            >
                              {isEvent ? item.event_name : item.title}
                            </div>
                          )
                        })}
                        {allActivities.length > 2 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">+{allActivities.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Event Details Panel */}
            <div className="w-96 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>

              {selectedDateEvents.length === 0 && selectedDateActivities.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No events or activities scheduled for this date</p>
              ) : (
                <div className="space-y-4">
                  {/* Events & Booths Section */}
                  {selectedDateEvents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Events & Booths</h4>
                      <div className="space-y-3">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.event_id}
                            onClick={() => handleViewEvent(event)}
                            className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-800 dark:text-white text-sm">{event.event_name}</h5>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusTextColor(event.status)}`}>
                                {event.status === 'in_progress' ? 'In Progress' : event.status === 'upcoming' ? 'Upcoming' : event.status === 'completed' ? 'Completed' : event.status}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                              <p><strong>Customer:</strong> {event.customer}</p>
                              <p><strong>Date:</strong> {formatDate(event.start_date)} - {formatDate(event.end_date)}</p>
                              <p><strong>Location:</strong> {event.location}</p>
                              <p><strong>Package:</strong> {event.package_name || '-'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Internal Activities Section */}
                  {selectedDateActivities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Internal Activities</h4>
                      <div className="space-y-3">
                        {selectedDateActivities.map((activity) => (
                          <div
                            key={activity.activity_id}
                            onClick={() => handleViewActivity(activity)}
                            className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-800 dark:text-white text-sm">{activity.title}</h5>
                              <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-300`}>
                                {activity.repeat_type !== 'none' ? activity.repeat_type : 'One-time'}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                              {activity.notes && <p><strong>Notes:</strong> {activity.notes}</p>}
                              <p><strong>Date:</strong> {formatDate(activity.activity_date)}</p>
                              <p><strong>Created by:</strong> {activity.created_by}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* View/Edit Activity Modal */}
      {isViewModalOpen && selectedActivity && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setIsViewModalOpen(false))}
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-6 right-6 flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none">Created By</span>
              <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedActivity.created_by || 'N/A'}</span>
              {selectedActivity.updated_by && selectedActivity.updated_by !== selectedActivity.created_by && (
                <>
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none mt-2">Updated By</span>
                  <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedActivity.updated_by}</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Activity Details</h2>
            <div className="space-y-4 mt-4">
              {isEditMode ? (
                <form onSubmit={handleUpdateActivity}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                      <textarea
                        value={activityForm.notes}
                        onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={activityForm.activity_date}
                        onChange={(e) => setActivityForm({ ...activityForm, activity_date: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.activity_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repeat</label>
                      <select
                        value={activityForm.repeat_type}
                        onChange={(e) => setActivityForm({ ...activityForm, repeat_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      >
                        <option value="none">One-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsViewModalOpen(false)
                        setFormErrors({})
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Update
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="space-y-3 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Title:</span>
                      <p className="text-gray-800">{selectedActivity.title}</p>
                    </div>
                    {selectedActivity.notes && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Notes:</span>
                        <p className="text-gray-800">{selectedActivity.notes}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700">Date:</span>
                      <p className="text-gray-800">{formatDate(selectedActivity.activity_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Repeat:</span>
                      <p className="text-gray-800">{selectedActivity.repeat_type !== 'none' ? selectedActivity.repeat_type : 'One-time'}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEditActivity(selectedActivity)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteActivity}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setIsViewModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Activity Modal */}
      {isDeleteModalOpen && selectedActivity && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setIsDeleteModalOpen(false))}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Delete Activity</h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete activity "{selectedActivity.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteActivity}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Event Modal */}
      {isEventViewModalOpen && selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setIsEventViewModalOpen(false))}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800">Event Details</h2>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    Created By: {selectedEvent?.created_by || 'N/A'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsEventViewModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Event ID</p>
                    <p className="font-medium">{selectedEvent?.event_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Event Name</p>
                    <p className="font-medium">{selectedEvent?.event_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Start Date</p>
                    <p className="font-medium">{selectedEvent?.start_date ? formatDisplayDate(selectedEvent.start_date) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">End Date</p>
                    <p className="font-medium">{selectedEvent?.end_date ? formatDisplayDate(selectedEvent.end_date) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Location</p>
                    <p className="font-medium">{selectedEvent?.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Customer</p>
                    <p className="font-medium">{selectedEvent?.customer || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Status</p>
                    <p className="font-medium">{selectedEvent?.status ? selectedEvent.status.replace('_', ' ').toUpperCase() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Total Revenue</p>
                    <p className="font-black text-blue-600 text-lg">
                      {selectedEvent?.expected_revenue ? `Rp ${Number(selectedEvent.expected_revenue).toLocaleString('id-ID')}` : '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Package & Add-Ons</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Base Package</p>
                      <p className="text-sm font-bold text-blue-800">{selectedEvent?.package_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Extra Hours</p>
                      <p className="text-sm font-medium">{selectedEvent?.extra_hours || 0} hours</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Backdrop</p>
                      <p className="text-sm font-medium">{selectedEvent?.backdrop_name || 'None'} ({selectedEvent?.backdrop_quantity || 0})</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Prints</p>
                      <p className="text-sm font-medium">{selectedEvent?.print_name || 'None'} ({selectedEvent?.print_quantity || 0})</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Guestbook Album</p>
                      <p className="text-sm font-medium">{selectedEvent?.guestbook_album ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">GIF/Boomerang</p>
                      <p className="text-sm font-medium">{selectedEvent?.gif_boomerang ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Assets */}
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assigned Assets</h3>
                  {selectedEvent?.assets && selectedEvent.assets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {selectedEvent.assets.map((asset, index) => (
                        <div key={index} className="flex justify-between items-center text-sm border-b pb-1">
                          <span className="text-gray-600">[{asset.asset_id || asset.name}] {asset.asset_name || asset.name}</span>
                          <span className="font-bold">Qty: {asset.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No assets assigned</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setIsEventViewModalOpen(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => {
            setIsAddModalOpen(false)
            setFormErrors({})
          })}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Activity</h2>
              <form onSubmit={handleAddActivity} noValidate>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={activityForm.title}
                      onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Activity title"
                    />
                    {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={activityForm.notes}
                      onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Add notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={activityForm.activity_date}
                      onChange={(e) => setActivityForm({ ...activityForm, activity_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.activity_date ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.activity_date && <p className="text-red-500 text-xs mt-1">{formErrors.activity_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                    <select
                      value={activityForm.repeat_type}
                      onChange={(e) => setActivityForm({ ...activityForm, repeat_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false)
                      setFormErrors({})
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Activity
                  </button>
                </div>
              </form>
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
      <SnapFunny />
    </div>
  )
}

export default Calendar
