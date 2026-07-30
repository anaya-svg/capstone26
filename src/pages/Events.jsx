import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, Plus, Minus, Download, Search, Check, Sparkles } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { exportToExcel } from '../utils/exportExcel'
import CsvFilterModal from '../components/CsvFilterModal'
import { useTheme } from '../context/ThemeContext'

function Events() {
  const { isDarkMode } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('user')
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)
    fetchAssets()
  }, [navigate])

  const fetchAssets = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/active`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setAssets(data.data)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  }

  const handleOpenCsvFilter = () => {
    setCsvFilter({
      allData: true,
      statuses: [],
      startDate: '',
      endDate: ''
    })
    setShowCsvFilterModal(true)
  }

  const formatCsvDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const buildCsvFilterSummary = () => {
    if (csvFilter.allData) return 'All data'
    const parts = []
    if (csvFilter.statuses.length) {
      const labels = csvFilter.statuses.map((s) => CSV_STATUSES.find((status) => status.value === s)?.label || s)
      parts.push(`Status: ${labels.join(', ')}`)
    }
    if (csvFilter.startDate || csvFilter.endDate) {
      parts.push(`Date: ${csvFilter.startDate || '...'} to ${csvFilter.endDate || '...'}`)
    }
    return parts.length ? parts.join('; ') : 'All data'
  }

  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (!csvFilter.allData) {
        if (csvFilter.statuses.length) params.append('status', csvFilter.statuses.join(','))
        if (csvFilter.startDate) params.append('startDate', csvFilter.startDate)
        if (csvFilter.endDate) params.append('endDate', csvFilter.endDate)
      }
      if (searchTerm) params.append('search', searchTerm)

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/export${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (!data.success) {
        showSystemNotice('error', 'Failed to fetch CSV data')
        return
      }

      const headers = ['Event ID', 'Event Name', 'Start Date', 'End Date', 'Location', 'Customer', 'Package', 'Status', 'Revenue']
      const rows = data.data.map((event) => [
        event.event_id,
        event.event_name,
        formatCsvDate(event.start_date),
        formatCsvDate(event.end_date),
        event.location || 'N/A',
        event.customer || event.customer_name || 'N/A',
        event.package_name || 'N/A',
        event.status,
        event.expected_revenue || 0
      ])

      await exportToExcel(
        headers,
        rows,
        'Recap Report - Events & Booths',
        'events',
        { columnWidths: [15, 25, 15, 15, 20, 20, 18, 15, 18], filterSummary: buildCsvFilterSummary() }
      )

      setShowCsvFilterModal(false)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showSystemNotice('error', 'Error exporting CSV')
    }
  }

  const [summary, setSummary] = useState({ total: 0, upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 })
  const [events, setEvents] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalEvents, setTotalEvents] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showSelectPackageModal, setShowSelectPackageModal] = useState(false)
  const [showPackageDetailsModal, setShowPackageDetailsModal] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [addonBackup, setAddonBackup] = useState(null)
  const [packageWizardBackup, setPackageWizardBackup] = useState(null)
  const [showInventorySearch, setShowInventorySearch] = useState(false)
  const [inventorySearchType, setInventorySearchType] = useState('')
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryResults, setInventoryResults] = useState([])
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false)
  const [showMissingDataModal, setShowMissingDataModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventForDelete, setSelectedEventForDelete] = useState(null)
  const [formData, setFormData] = useState({
    event_name: '',
    start_date: '',
    end_date: '',
    location: '',
    customer: '',
    customer_id: null,
    package_name: '',
    custom_base_price: 0,
    extra_hours: 0,
    backdrop_item_id: null,
    backdrop_name: '',
    backdrop_quantity: 0,
    backdrop_stock: 0,
    guestbook_album: false,
    gif_boomerang: false,
    print_item_id: null,
    print_name: '',
    print_quantity: 0,
    print_stock: 0,
    expected_revenue: 0,
    status: 'upcoming',
    assets: [],
    custom_extra_hours_price: 150000,
    custom_backdrop_price: 250000,
    custom_guestbook_price: 200000,
    custom_gif_boomerang_price: 300000,
    custom_print_price: 50000,
    promo_id: null,
    discount_amount: 0,
    promo_code: ''
  })
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [activePromo, setActivePromo] = useState(null)
  const [customerSearchResults, setCustomerSearchResults] = useState([])
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [assetAssignments, setAssetAssignments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [showCsvFilterModal, setShowCsvFilterModal] = useState(false)
  const [csvFilter, setCsvFilter] = useState({
    allData: true,
    statuses: [],
    startDate: '',
    endDate: ''
  })
  const [assetConflicts, setAssetConflicts] = useState(null)

  const CSV_STATUSES = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ]
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [systemNotice, setSystemNotice] = useState({ type: '', message: '' })
  const showSystemNotice = (type, message) => {
    setSystemNotice({ type, message })
  }

  const handleBackdropClose = (e, onClose) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const closeCreateOrEditModal = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setFormErrors({})
  }

  const closeTopModal = () => {
    if (showCsvFilterModal) {
      setShowCsvFilterModal(false)
      return true
    }
    if (showInventorySearch) {
      setShowInventorySearch(false)
      return true
    }
    if (showAddonModal) {
      handleCancelAddon()
      return true
    }
    if (showPackageDetailsModal) {
      setShowPackageDetailsModal(false)
      return true
    }
    if (showSelectPackageModal) {
      handleCancelSelectPackage()
      return true
    }
    if (showConflictModal) {
      setShowConflictModal(false)
      return true
    }
    if (showMissingDataModal) {
      setShowMissingDataModal(false)
      return true
    }
    if (showHardDeleteModal) {
      setShowHardDeleteModal(false)
      return true
    }
    if (showDeleteModal) {
      setShowDeleteModal(false)
      return true
    }
    if (isViewModalOpen) {
      setIsViewModalOpen(false)
      return true
    }
    if (isCreateModalOpen || isEditModalOpen) {
      closeCreateOrEditModal()
      return true
    }
    return false
  }

  useEffect(() => {
    fetchSummary()
    fetchEvents()
  }, [searchTerm, currentPage, itemsPerPage])

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
  }, [
    showCsvFilterModal,
    showInventorySearch,
    showAddonModal,
    showPackageDetailsModal,
    showSelectPackageModal,
    showConflictModal,
    showMissingDataModal,
    showHardDeleteModal,
    showDeleteModal,
    isViewModalOpen,
    isCreateModalOpen,
    isEditModalOpen
  ])

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/summary`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchEvents = async (status = '', date = '', search = '') => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events`
      const params = []
      if (status) params.push(`status=${status}`)
      if (date) params.push(`date=${date}`)
      if (search) params.push(`search=${search}`)
      params.push(`page=${currentPage}`)
      params.push(`limit=${itemsPerPage}`)
      if (params.length > 0) url += `?${params.join('&')}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setEvents(data.data)
        setTotalEvents(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    fetchEvents(status, dateFilter, searchTerm)
  }

  const handleCustomerSearch = async (searchTerm) => {
    console.log('handleCustomerSearch called with:', searchTerm)
    setCustomerSearchTerm(searchTerm)
    setFormData({ ...formData, customer: searchTerm, customer_id: null })
    if (searchTerm.length > 0) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers?search=${searchTerm}&segment=off_site`)
        const data = await response.json()
        console.log('Customer search results:', data)
        console.log('Customer search results data:', data.data)
        console.log('Customer search results length:', data.data?.length)
        if (data.success) {
          setCustomerSearchResults(data.data)
          console.log('Set customerSearchResults to:', data.data)
        }
      } catch (error) {
        console.error('Error searching customers:', error)
      }
    } else {
      setCustomerSearchResults([])
    }
  }

  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customer: customer.name,
      customer_id: customer.customer_id
    })
    setCustomerSearchTerm(customer.name)
    setCustomerSearchResults([])
  }

  const handleDateFilter = (date) => {
    setDateFilter(date)
    fetchEvents(statusFilter, date, searchTerm)
  }

  const handleSearch = (search) => {
    setSearchTerm(search)
    fetchEvents(statusFilter, dateFilter, search)
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalEvents / itemsPerPage)

  const handleCreate = () => {
    setFormData({
      event_name: '',
      start_date: '',
      end_date: '',
      location: '',
      customer: '',
      customer_id: null,
      package_name: '',
      custom_base_price: 0,
      extra_hours: 0,
      backdrop_item_id: null,
      backdrop_name: '',
      backdrop_quantity: 0,
      backdrop_stock: 0,
      guestbook_album: false,
      gif_boomerang: false,
      print_item_id: null,
      print_name: '',
      print_quantity: 0,
      print_stock: 0,
      expected_revenue: 0,
      status: 'upcoming',
      assets: [],
      custom_extra_hours_price: 150000,
      custom_backdrop_price: 250000,
      custom_guestbook_price: 200000,
      custom_gif_boomerang_price: 300000,
      custom_print_price: 50000,
      promo_id: null,
      discount_amount: 0,
      promo_code: ''
    })
    setCouponInput('')
    setCouponError('')
    setCouponSuccess('')
    setActivePromo(null)
    setCustomerSearchTerm('')
    setCustomerSearchResults([])
    setAssetAssignments([])
    setSelectedEvent(null)
    setFormErrors({})
    setIsCreateModalOpen(true)
  }

  const handleSelectPackage = (packageName) => {
    let basePrice = 0
    if (packageName === 'Paket Basic Memories') basePrice = 299000
    else if (packageName === 'Paket Silver Celebration') basePrice = 599000
    else if (packageName === 'Paket Gold Glam') basePrice = 999000
    else if (packageName === 'Paket Platinum Luxury') basePrice = 1499000
    else if (packageName === 'Paket Custom Agreement') basePrice = formData.custom_base_price || 0

    const newData = { 
      ...formData, 
      package_name: packageName, 
      custom_base_price: basePrice
    }
    handleUpdateEventForm(newData)
    setShowSelectPackageModal(false)
    setShowPackageDetailsModal(true)
  }

  const handleOpenAddonModal = (currentData = formData) => {
    setAddonBackup({
      extra_hours: currentData.extra_hours,
      backdrop_item_id: currentData.backdrop_item_id,
      backdrop_name: currentData.backdrop_name,
      backdrop_quantity: currentData.backdrop_quantity,
      backdrop_stock: currentData.backdrop_stock,
      guestbook_album: currentData.guestbook_album,
      gif_boomerang: currentData.gif_boomerang,
      print_item_id: currentData.print_item_id,
      print_name: currentData.print_name,
      print_quantity: currentData.print_quantity,
      print_stock: currentData.print_stock,
      expected_revenue: currentData.expected_revenue,
      custom_extra_hours_price: currentData.custom_extra_hours_price,
      custom_backdrop_price: currentData.custom_backdrop_price,
      custom_guestbook_price: currentData.custom_guestbook_price,
      custom_gif_boomerang_price: currentData.custom_gif_boomerang_price,
      custom_print_price: currentData.custom_print_price
    })
    setShowAddonModal(true)
    setShowPackageDetailsModal(false)
  }

  const handleCancelAddon = () => {
    if (addonBackup) {
      setFormData(prev => ({
        ...prev,
        ...addonBackup
      }))
    }
    setShowAddonModal(false)
    setShowPackageDetailsModal(true)
  }

  const handleDoneAddon = () => {
    setShowAddonModal(false)
    setShowPackageDetailsModal(true)
  }

  const handleBackFromPackageDetails = () => {
    setShowPackageDetailsModal(false)
    setShowSelectPackageModal(true)
  }

  const handleConfirmPackageDetails = () => {
    if (formData.package_name === 'Paket Custom Agreement' && (formData.custom_base_price === undefined || formData.custom_base_price === null || formData.custom_base_price === '')) {
      setFormErrors(prev => ({ ...prev, custom_base_price: 'Custom base price is required' }))
      return
    }
    setFormErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.custom_base_price
      delete newErrors.package_name
      return newErrors
    })
    setShowPackageDetailsModal(false)
    setPackageWizardBackup(null)
  }

  const handleOpenSelectPackageModal = () => {
    setPackageWizardBackup({
      package_name: formData.package_name,
      custom_base_price: formData.custom_base_price,
      extra_hours: formData.extra_hours,
      backdrop_item_id: formData.backdrop_item_id,
      backdrop_name: formData.backdrop_name,
      backdrop_quantity: formData.backdrop_quantity,
      backdrop_stock: formData.backdrop_stock,
      guestbook_album: formData.guestbook_album,
      gif_boomerang: formData.gif_boomerang,
      print_item_id: formData.print_item_id,
      print_name: formData.print_name,
      print_quantity: formData.print_quantity,
      print_stock: formData.print_stock,
      expected_revenue: formData.expected_revenue,
      custom_extra_hours_price: formData.custom_extra_hours_price,
      custom_backdrop_price: formData.custom_backdrop_price,
      custom_guestbook_price: formData.custom_guestbook_price,
      custom_gif_boomerang_price: formData.custom_gif_boomerang_price,
      custom_print_price: formData.custom_print_price
    })
    setShowSelectPackageModal(true)
  }

  const handleCancelSelectPackage = () => {
    if (packageWizardBackup) {
      setFormData(prev => ({
        ...prev,
        ...packageWizardBackup
      }))
    }
    setShowSelectPackageModal(false)
    setPackageWizardBackup(null)
  }

  const calculateTotalRevenue = (data) => {
    let total = 0
    if (data.package_name === 'Paket Basic Memories') total = 299000
    else if (data.package_name === 'Paket Silver Celebration') total = 599000
    else if (data.package_name === 'Paket Gold Glam') total = 999000
    else if (data.package_name === 'Paket Platinum Luxury') total = 1499000
    else if (data.package_name === 'Paket Custom Agreement') total = Number(data.custom_base_price) || 0

    const isCustom = data.package_name === 'Paket Custom Agreement'
    const hoursPrice = isCustom ? (data.custom_extra_hours_price !== undefined ? Number(data.custom_extra_hours_price) : 150000) : 150000
    const backdropPrice = isCustom ? (data.custom_backdrop_price !== undefined ? Number(data.custom_backdrop_price) : 250000) : 250000
    const guestbookPrice = isCustom ? (data.custom_guestbook_price !== undefined ? Number(data.custom_guestbook_price) : 200000) : 200000
    const gifPrice = isCustom ? (data.custom_gif_boomerang_price !== undefined ? Number(data.custom_gif_boomerang_price) : 300000) : 300000
    const printPrice = isCustom ? (data.custom_print_price !== undefined ? Number(data.custom_print_price) : 50000) : 50000

    total += (data.extra_hours || 0) * hoursPrice
    if (data.backdrop_item_id) total += backdropPrice
    if (data.guestbook_album) total += guestbookPrice
    if (data.gif_boomerang) total += gifPrice
    if (data.print_quantity > 0) total += ((data.print_quantity || 0) / 50) * printPrice

    return total
  }

  const recalculatePromoDiscount = (promo, subtotal, packageName, date) => {
    if (!promo) return { discount: 0, error: '' }

    if (promo.applicable_to !== 'all' && promo.applicable_to !== 'off_site') {
      return { discount: 0, error: `Promo ini hanya berlaku untuk transaksi In-Studio!` }
    }

    if (subtotal < Number(promo.min_transaction)) {
      return { discount: 0, error: `Belum mencapai minimum transaksi Rp ${new Intl.NumberFormat('id-ID').format(promo.min_transaction)}` }
    }

    const transactionDate = date ? new Date(date) : new Date()
    const startDate = new Date(promo.start_date)
    const endDate = new Date(promo.end_date)
    transactionDate.setHours(0,0,0,0)
    startDate.setHours(0,0,0,0)
    endDate.setHours(0,0,0,0)

    if (transactionDate < startDate || transactionDate > endDate) {
      return { discount: 0, error: 'Promo sudah tidak berlaku di tanggal ini!' }
    }

    if (promo.eligibility_type === 'weekday_slump' && promo.day_restrictions) {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = weekdays[transactionDate.getDay()]
      if (!promo.day_restrictions.includes(dayName)) {
        return { discount: 0, error: 'Promo ini tidak valid untuk hari ini!' }
      }
    }

    if (promo.eligibility_type === 'package_bundling' && promo.target_package_name) {
      if (!packageName || packageName.toLowerCase() !== promo.target_package_name.toLowerCase()) {
        return { discount: 0, error: `Hanya valid untuk paket ${promo.target_package_name}` }
      }
    }

    let discount = 0
    if (promo.discount_type === 'percentage') {
      discount = (subtotal * Number(promo.discount_value)) / 100
    } else {
      discount = Number(promo.discount_value)
    }
    return { discount: Math.min(discount, subtotal), error: '' }
  }

  const handleUpdateEventForm = (newData) => {
    const subtotal = calculateTotalRevenue(newData)
    if (activePromo) {
      const check = recalculatePromoDiscount(activePromo, subtotal, newData.package_name, newData.start_date)
      if (check.error) {
        setCouponError(`Kupon tidak valid: ${check.error}`)
        setCouponSuccess('')
        setActivePromo(null)
        setFormData({
          ...newData,
          promo_id: null,
          promo_code: '',
          discount_amount: 0,
          expected_revenue: subtotal
        })
      } else {
        setCouponError('')
        setFormData({
          ...newData,
          promo_id: activePromo.promo_id,
          promo_code: activePromo.promo_code,
          discount_amount: check.discount,
          expected_revenue: Math.max(0, subtotal - check.discount)
        })
      }
    } else {
      setFormData({
        ...newData,
        expected_revenue: subtotal
      })
    }
  }

  const handleVerifyCoupon = async () => {
    if (!couponInput || !couponInput.trim()) {
      setCouponError('Ketik kode kupon terlebih dahulu!')
      return
    }

    setCouponError('')
    setCouponSuccess('')

    try {
      const subtotal = calculateTotalRevenue(formData)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promo_code: couponInput.trim(),
          amount: subtotal,
          transaction_type: 'off_site',
          date: formData.start_date,
          package_name: formData.package_name
        })
      })

      const res = await response.json()
      if (res.success) {
        setCouponSuccess('Kode promo berhasil diterapkan!')
        
        const promoDetails = {
          promo_id: res.data.promo_id,
          promo_code: res.data.promo_code,
          promo_name: res.data.promo_name,
          discount_type: res.data.discount_type,
          discount_value: res.data.discount_value,
          applicable_to: 'off_site',
          min_transaction: 0
        }
        
        setActivePromo(promoDetails)
        setFormData(prev => ({
          ...prev,
          promo_id: res.data.promo_id,
          promo_code: res.data.promo_code,
          discount_amount: res.data.discount_amount,
          expected_revenue: Math.max(0, subtotal - res.data.discount_amount)
        }))
      } else {
        setCouponError(res.message || 'Kupon tidak valid!')
        setActivePromo(null)
        setFormData(prev => ({
          ...prev,
          promo_id: null,
          promo_code: '',
          discount_amount: 0,
          expected_revenue: subtotal
        }))
      }
    } catch (err) {
      console.error('Error verifying coupon:', err)
      setCouponError('Kesalahan jaringan saat memverifikasi kupon')
    }
  }

  const handleRemoveCoupon = () => {
    setCouponInput('')
    setCouponError('')
    setCouponSuccess('')
    setActivePromo(null)
    const subtotal = calculateTotalRevenue(formData)
    setFormData(prev => ({
      ...prev,
      promo_id: null,
      promo_code: '',
      discount_amount: 0,
      expected_revenue: subtotal
    }))
  }

  const handleInventorySearch = async (term, type) => {
    setInventorySearch(term)
    if (term.length > 0) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory?search=${term}&status=active`)
        const data = await response.json()
        if (data.success) {
          setInventoryResults(data.data)
        }
      } catch (error) {
        console.error('Error searching inventory:', error)
      }
    } else {
      setInventoryResults([])
    }
  }

  const handleSelectInventoryItem = (item) => {
    if (inventorySearchType === 'backdrop') {
      const newData = {
        ...formData,
        backdrop_item_id: item.item_id,
        backdrop_name: item.item_name,
        backdrop_quantity: 1,
        backdrop_stock: item.stock_quantity
      }
      handleUpdateEventForm(newData)
    } else if (inventorySearchType === 'print') {
      const newData = {
        ...formData,
        print_item_id: item.item_id,
        print_name: item.item_name,
        print_quantity: 50,
        print_stock: item.stock_quantity
      }
      handleUpdateEventForm(newData)
    }
    setShowInventorySearch(false)
    setInventorySearch('')
    setInventoryResults([])
  }

  const handleView = async (eventId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${eventId}`)
      const data = await response.json()
      if (data.success) {
        setSelectedEvent(data.data)
        setIsViewModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching event:', error)
    }
  }

  const handleEdit = async (eventId) => {
    try {
      setFormErrors({})
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${eventId}`)
      const data = await response.json()
      
      if (data.success) {
        const event = data.data
        setSelectedEvent(event)

        let parsedCustomPrices = {}
        try {
          if (event.booth_setup) {
            parsedCustomPrices = JSON.parse(event.booth_setup)
          }
        } catch (e) {
          console.error("Error parsing custom prices JSON:", e)
        }

        const isCustomPkg = event.package_name === 'Paket Custom Agreement'
        const custom_extra_hours_price = parsedCustomPrices.custom_extra_hours_price !== undefined ? parsedCustomPrices.custom_extra_hours_price : 150000
        const custom_backdrop_price = parsedCustomPrices.custom_backdrop_price !== undefined ? parsedCustomPrices.custom_backdrop_price : 250000
        const custom_guestbook_price = parsedCustomPrices.custom_guestbook_price !== undefined ? parsedCustomPrices.custom_guestbook_price : 200000
        const custom_gif_boomerang_price = parsedCustomPrices.custom_gif_boomerang_price !== undefined ? parsedCustomPrices.custom_gif_boomerang_price : 300000
        const custom_print_price = parsedCustomPrices.custom_print_price !== undefined ? parsedCustomPrices.custom_print_price : 50000

        const subtotal = Number(event.expected_revenue) + Number(event.discount_amount || 0)

        let initialCustomBasePrice = 0
        if (isCustomPkg) {
          let addOns = (event.extra_hours || 0) * custom_extra_hours_price
          if (event.backdrop_item_id) addOns += custom_backdrop_price
          if (event.guestbook_album) addOns += custom_guestbook_price
          if (event.gif_boomerang) addOns += custom_gif_boomerang_price
          addOns += ((event.print_quantity || 0) / 50) * custom_print_price
          
          initialCustomBasePrice = Math.max(0, subtotal - addOns)
        }

        setFormData({
          event_name: event.event_name,
          start_date: event.start_date,
          end_date: event.end_date,
          location: event.location,
          customer: event.customer,
          customer_id: event.customer_id || null,
          package_name: event.package_name,
          custom_base_price: initialCustomBasePrice,
          extra_hours: event.extra_hours,
          backdrop_item_id: event.backdrop_item_id,
          backdrop_name: event.backdrop_name,
          backdrop_quantity: event.backdrop_quantity,
          guestbook_album: !!event.guestbook_album,
          gif_boomerang: !!event.gif_boomerang,
          print_item_id: event.print_item_id,
          print_name: event.print_name,
          print_quantity: event.print_quantity,
          expected_revenue: event.expected_revenue,
          status: event.status,
          assets: event.assets || [],
          custom_extra_hours_price,
          custom_backdrop_price,
          custom_guestbook_price,
          custom_gif_boomerang_price,
          custom_print_price,
          promo_id: event.promo_id || null,
          discount_amount: event.discount_amount || 0,
          promo_code: event.promo_code || ''
        })

        if (event.promo_id) {
          setCouponInput(event.promo_code || '')
          setCouponSuccess('Kode promo berhasil diterapkan!')
          setActivePromo({
            promo_id: event.promo_id,
            promo_code: event.promo_code,
            promo_name: event.promo_name,
            discount_type: 'flat',
            discount_value: event.discount_amount
          })
        } else {
          setCouponInput('')
          setCouponSuccess('')
          setActivePromo(null)
        }
        setCouponError('')
        if (event.assets && Array.isArray(event.assets) && event.assets.length > 0) {
          const parsedAssets = event.assets.map(asset => ({
            asset_id: asset.asset_id,
            name: asset.asset_name || asset.name || '',
            quantity: asset.quantity
          }))
          setAssetAssignments(parsedAssets)
        } else {
          setAssetAssignments([])
        }
        setIsEditModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching event:', error)
    }
  }

  const handleDelete = async (eventId) => {
    const event = events.find(e => e.event_id === eventId)
    if (!event) return
    setSelectedEventForDelete(event)
    setDeleteReason('')
    setShowDeleteModal(true)
  }

  const handleHardDelete = async (eventId) => {
    const event = events.find(e => e.event_id === eventId)
    if (!event) return
    setSelectedEventForDelete(event)
    setShowHardDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedEventForDelete) return

    if (selectedEventForDelete.status === 'completed' && !deleteReason.trim()) {
      showSystemNotice('error', 'Please provide a reason for deleting this completed event')
      return
    }

    const user = JSON.parse(sessionStorage.getItem('user'))

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${selectedEventForDelete.event_id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify({ 
          delete_reason: deleteReason,
          is_completed: selectedEventForDelete.status === 'completed',
          deleted_by: userName
        })
      })
      const data = await response.json()
      if (data.success) {
        setShowDeleteModal(false)
        setSelectedEventForDelete(null)
        setDeleteReason('')
        fetchSummary()
        fetchEvents(statusFilter, dateFilter, searchTerm)
        showSystemNotice('success', selectedEventForDelete.status === 'completed' ? 'Event deleted successfully' : 'Event cancelled successfully')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      showSystemNotice('error', 'Error cancelling event')
    }
  }

  const confirmHardDelete = async () => {
    if (!selectedEventForDelete) return

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${selectedEventForDelete.event_id}/hard-delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setShowHardDeleteModal(false)
        setSelectedEventForDelete(null)
        fetchSummary()
        fetchEvents(statusFilter, dateFilter, searchTerm)
        showSystemNotice('success', 'Event permanently deleted')
      }
    } catch (error) {
      console.error('Error hard deleting event:', error)
      showSystemNotice('error', 'Error deleting event')
    }
  }

  const handleAddAsset = () => {
    setAssetAssignments([...assetAssignments, { name: '', quantity: 1 }])
  }

  const handleRemoveAsset = (index) => {
    setAssetAssignments(assetAssignments.filter((_, i) => i !== index))
  }

  const handleAssetChange = (index, field, value) => {
    const updated = [...assetAssignments]
    updated[index][field] = value
    
    if (field === 'name') {
      const asset = assets.find(a => a.name === value)
      if (asset) {
        updated[index].asset_id = asset.asset_id
        updated[index].quantity = asset.quantity || 1
      } else {
        updated[index].asset_id = null
      }
    }
    
    setAssetAssignments(updated)
  }

  const checkAssetConflicts = async () => {
    const assetIds = assetAssignments
      .filter(a => a.asset_id)
      .map(a => a.asset_id)
    
    if (assetIds.length === 0) return false
    
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/check-asset-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify({
          start_date: formData.start_date,
          end_date: formData.end_date,
          asset_ids: assetIds,
          exclude_event_id: isEditModalOpen ? selectedEvent?.event_id : null
        })
      })
      
      const data = await response.json()
      if (data.success && data.has_conflicts) {
        setAssetConflicts(data.conflicts)
        setShowConflictModal(true)
        return true
      }
      return false
    } catch (error) {
      console.error('Error checking asset conflicts:', error)
      return false
    }
  }

  const handleApplyAssetSubstitution = (conflictedAssetId, substituteAsset) => {
    const updated = assetAssignments.map(assignment => {
      if (assignment.asset_id === conflictedAssetId) {
        return {
          ...assignment,
          asset_id: substituteAsset.asset_id,
          name: substituteAsset.name
        }
      }
      return assignment
    })
    setAssetAssignments(updated)
    
    const remainingConflicts = assetConflicts.filter(c => c.asset_id !== conflictedAssetId)
    setAssetConflicts(remainingConflicts)
    if (remainingConflicts.length === 0) {
      setShowConflictModal(false)
      showSystemNotice('success', 'Asset substitutions applied successfully!')
    } else {
      showSystemNotice('success', `Substituted with ${substituteAsset.name}. Remaining conflicts need resolution.`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const hasConflicts = await checkAssetConflicts()
    if (hasConflicts) {
      return
    }

    const assetsData = assetAssignments.filter(a => a.name).map(a => ({
      name: a.name,
      asset_id: a.asset_id,
      quantity: a.quantity
    }))

    const customPrices = {
      custom_extra_hours_price: formData.custom_extra_hours_price,
      custom_backdrop_price: formData.custom_backdrop_price,
      custom_guestbook_price: formData.custom_guestbook_price,
      custom_gif_boomerang_price: formData.custom_gif_boomerang_price,
      custom_print_price: formData.custom_print_price
    }

    const payload = {
      ...formData,
      assets: assetsData,
      customer_id: formData.customer_id || null,
      booth_setup: JSON.stringify(customPrices),
      created_by: userName
    }

    try {
      const url = isEditModalOpen
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${selectedEvent.event_id}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events`
      const method = isEditModalOpen ? 'PUT' : 'POST'

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.success) {
        setIsCreateModalOpen(false)
        setIsEditModalOpen(false)
        fetchSummary()
        fetchEvents(statusFilter)
        showSystemNotice('success', isEditModalOpen ? 'Event updated successfully' : 'Event created successfully')
      } else {
        showSystemNotice('error', data.message || 'Error saving event')
      }
    } catch (error) {
      console.error('Error saving event:', error)
      showSystemNotice('error', 'Error saving event')
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const hasConflicts = await checkAssetConflicts()
    if (hasConflicts) {
      return
    }

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/${selectedEvent.event_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify({
          ...formData,
          assets: assetAssignments
        })
      })

      const data = await response.json()
      if (data.success) {
        fetchSummary()
        fetchEvents(statusFilter)
        setIsEditModalOpen(false)
        showSystemNotice('success', 'Event updated successfully')
      } else {
        showSystemNotice('error', data.message || 'Error updating event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      showSystemNotice('error', 'Error updating event')
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.event_name) {
      errors.event_name = 'Event name is required'
    }
    if (!formData.start_date) {
      errors.start_date = 'Start date is required'
    }
    if (!formData.end_date) {
      errors.end_date = 'End date is required'
    }
    if (!formData.location) {
      errors.location = 'Location is required'
    }

    if (!selectedEvent) {
      if (!customerSearchTerm) {
        errors.customer = 'Customer is required'
      } else if (!formData.customer_id) {
        errors.customer = 'This data doesn\'t exist. Click here'
      }
    }
    if (!formData.package_name) {
      errors.package_name = 'Package is required'
    } else if (formData.package_name === 'Paket Custom Agreement' && (formData.custom_base_price === undefined || formData.custom_base_price === null || formData.custom_base_price === '')) {
      errors.custom_base_price = 'Custom base price is required'
    }
    if (!assetAssignments.length || !assetAssignments[0].name) {
      errors.assets = 'At least one asset is required'
    } else {
      const invalidAsset = assetAssignments.find(a => a.name && !a.asset_id)
      if (invalidAsset) {
        errors.assets = 'This data doesn\'t exist. Click here'
      } else {
        const invalidQty = assetAssignments.find(a => {
          const asset = assets.find(asset => asset.asset_id === a.asset_id)
          return asset && a.quantity > asset.quantity
        })
        if (invalidQty) {
          errors.assets = 'The quantity is exceeding the maximum'
        }
      }
    }
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    
    return true
  }

  const getStatusColor = (status) => {
    const statusLower = status ? status.toLowerCase() : ''
    switch (statusLower) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Events & Booth Operations</h1>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </button>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div
              onClick={() => handleStatusFilter('')}
              className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === '' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <p className="text-gray-500 dark:text-gray-400 text-sm">All Events</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total}</p>
            </div>
            <div
              onClick={() => handleStatusFilter('upcoming')}
              className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'upcoming' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <p className="text-gray-500 dark:text-gray-400 text-sm">Upcoming</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.upcoming}</p>
            </div>
            <div
              onClick={() => handleStatusFilter('in_progress')}
              className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'in_progress' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <p className="text-gray-500 dark:text-gray-400 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.in_progress}</p>
            </div>
            <div
              onClick={() => handleStatusFilter('cancelled')}
              className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'cancelled' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <p className="text-gray-500 dark:text-gray-400 text-sm">Cancelled</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.cancelled}</p>
            </div>
            <div
              onClick={() => handleStatusFilter('completed')}
              className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'completed' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <p className="text-gray-500 dark:text-gray-400 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.completed}</p>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Search Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Event Name or Customer</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearch('')}
                    className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Start Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => handleDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {dateFilter && (
                  <button
                    onClick={() => handleDateFilter('')}
                    className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Events & Booths Overview</h2>
              <button
                onClick={handleOpenCsvFilter}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Download size={16} />
                Download CSV
              </button>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Event ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Event Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Start - End Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event) => (
                  <tr key={event.event_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3">
                      <span
                        className="text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        onDoubleClick={() => handleView(event.event_id)}
                      >
                        {event.event_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{event.event_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatDisplayDate(event.start_date)} : {formatDisplayDate(event.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{event.location}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{event.customer}</td>
                    <td className="px-4 py-3 text-left">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.is_deleted ? 'bg-gray-500 text-white' : getStatusColor(event.status)
                        }`}
                      >
                        {event.is_deleted
                          ? 'Deleted'
                          : event.status === 'in_progress'
                          ? 'In Progress'
                          : event.status === 'upcoming'
                          ? 'Upcoming'
                          : event.status === 'completed'
                          ? 'Completed'
                          : 'Cancelled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-bold">
                      {event.expected_revenue ? `Rp ${Number(event.expected_revenue).toLocaleString('id-ID')}` : 'Rp 0'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(event.event_id)}
                          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {event.status === 'upcoming' || event.status === 'in_progress' || event.status === 'completed' ? (
                          <>
                            <button
                              onClick={() => handleEdit(event.event_id)}
                              className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            {event.status === 'upcoming' || event.status === 'in_progress' || event.status === 'completed' ? (
                              <button
                                onClick={() => handleDelete(event.event_id)}
                                className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                                title={event.status === 'completed' ? 'Delete' : 'Delete'}
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {event.status === 'cancelled' && (
                          <button
                            onClick={() => handleHardDelete(event.event_id)}
                            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-900"
                            title="Permanently Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalEvents)} of {totalEvents} events
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
      </main>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, closeCreateOrEditModal)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {isEditModalOpen ? 'Edit Event' : 'Create New Event'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                    <input
                      type="text"
                      value={formData.event_name}
                      onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                      disabled={isEditModalOpen && formData.status === 'completed'}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.event_name ? 'border-red-500' : 'border-gray-300'} ${isEditModalOpen && formData.status === 'completed' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.event_name && <p className="text-red-500 text-xs mt-1">{formErrors.event_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                    {isEditModalOpen ? (
                      <input
                        type="text"
                        value={formData.customer}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={customerSearchTerm}
                          onChange={(e) => handleCustomerSearch(e.target.value)}
                          placeholder="Search Off-Site customer..."
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.customer ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {customerSearchResults.length > 0 && (
                          <div className="mt-1 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                            {customerSearchResults.map((customer) => (
                              <div
                                key={customer.customer_id}
                                onClick={() => handleCustomerSelect(customer)}
                                className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                              >
                                <p className="font-medium text-gray-800">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.phone_number || 'N/A'} - {customer.email || 'N/A'}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {formErrors.customer && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.customer.includes('Click here') ? (
                          <>
                            This data doesn't exist.{' '}
                            <span 
                              onClick={() => navigate('/customers')}
                              className="underline cursor-pointer hover:text-red-700"
                            >
                              Click here
                            </span>
                          </>
                        ) : (
                          formErrors.customer
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleUpdateEventForm({ ...formData, start_date: e.target.value })}
                      disabled={isEditModalOpen && formData.status === 'completed'}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.start_date ? 'border-red-500' : 'border-gray-300'} ${isEditModalOpen && formData.status === 'completed' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.start_date && <p className="text-red-500 text-xs mt-1">{formErrors.start_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleUpdateEventForm({ ...formData, end_date: e.target.value })}
                      disabled={isEditModalOpen && formData.status === 'completed'}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.end_date ? 'border-red-500' : 'border-gray-300'} ${isEditModalOpen && formData.status === 'completed' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.end_date && <p className="text-red-500 text-xs mt-1">{formErrors.end_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      disabled={isEditModalOpen && formData.status === 'completed'}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.location ? 'border-red-500' : 'border-gray-300'} ${isEditModalOpen && formData.status === 'completed' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.location && <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <input
                      type="text"
                      value={formData.status.replace('_', ' ').toUpperCase()}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Status is automatically determined by dates</p>
                  </div>
                </div>

                {/* Package & Revenue Section */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-blue-800">Booth Package*</h3>
                    <button
                      type="button"
                      onClick={handleOpenSelectPackageModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      {formData.package_name ? 'Change Package' : 'Select Package'}
                    </button>
                  </div>
                  
                  {formData.package_name && (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Selected Package:</span>
                        <span className="font-bold text-blue-900">{formData.package_name}</span>
                      </div>

                      {formData.package_name === 'Paket Custom Agreement' && (
                        <div className="p-3.5 bg-white rounded-xl border border-teal-200 shadow-sm">
                          <label className="block text-xs font-bold text-teal-800 uppercase tracking-wider mb-1.5">Custom Base Price (Rp) *</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Enter custom agreed base price..."
                            value={formData.custom_base_price || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                              const newData = { ...formData, custom_base_price: val }
                              handleUpdateEventForm(newData)
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 text-sm font-semibold text-gray-800 ${formErrors.custom_base_price ? 'border-red-500' : 'border-teal-300'}`}
                          />
                          {formErrors.custom_base_price && <p className="text-red-500 text-xs mt-1">{formErrors.custom_base_price}</p>}
                          <p className="text-[10px] text-gray-500 mt-1">Enter the base price from the contract/proposal. Add-Ons configured below will automatically add to the total revenue.</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => handleOpenAddonModal()}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} /> Configure Add-Ons
                        </button>
                      </div>

                      {/* Coupon Code Input */}
                      <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Kode Promo / Kupon</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="E.g. EVENTPROMO"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            disabled={!!activePromo}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs uppercase disabled:bg-gray-100 disabled:text-gray-500"
                          />
                          {activePromo ? (
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs font-semibold transition-colors"
                            >
                              Hapus
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleVerifyCoupon}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold transition-colors"
                            >
                              Gunakan
                            </button>
                          )}
                        </div>
                        {couponError && <p className="text-red-500 text-[11px] font-semibold">{couponError}</p>}
                        {couponSuccess && <p className="text-green-600 text-[11px] font-semibold">{couponSuccess}</p>}
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-xs border border-gray-100">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal:</span>
                          <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(calculateTotalRevenue(formData))}</span>
                        </div>
                        {Number(formData.discount_amount) > 0 && (
                          <div className="flex justify-between text-green-600 font-medium">
                            <span>Diskon ({formData.promo_code}):</span>
                            <span>-{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(formData.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-blue-900 border-t pt-1.5 mt-1.5">
                          <span>Total Revenue:</span>
                          <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(formData.expected_revenue)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {formErrors.package_name && <p className="text-red-500 text-xs mt-1">{formErrors.package_name}</p>}
                </div>

                {/* Assets Assignment */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Assign Assets *</label>
                    {(!isEditModalOpen || (selectedEvent && (selectedEvent.status === 'upcoming' || selectedEvent.status === 'in_progress'))) && (
                      <button
                        type="button"
                        onClick={handleAddAsset}
                        className="text-blue-600 text-sm hover:text-blue-800"
                      >
                        + Add Asset
                      </button>
                    )}
                  </div>
                  {assetAssignments.map((assignment, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        list={`assets-datalist-${index}`}
                        value={assignment.name}
                        onChange={(e) => handleAssetChange(index, 'name', e.target.value)}
                        disabled={isEditModalOpen && selectedEvent && selectedEvent.status !== 'upcoming' && selectedEvent.status !== 'in_progress'}
                        placeholder="Search or select asset..."
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.assets ? 'border-red-500' : 'border-gray-300'} ${
                          isEditModalOpen && selectedEvent && selectedEvent.status !== 'upcoming' && selectedEvent.status !== 'in_progress' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                        }`}
                      />
                      <datalist id={`assets-datalist-${index}`}>
                        {assets
                          .filter((a) => !assetAssignments.some((assign, i) => assign.asset_id === a.asset_id && i !== index))
                          .map((a) => (
                            <option key={a.asset_id} value={a.name}>{a.name}</option>
                          ))}
                      </datalist>
                      <input
                        type="number"
                        min="1"
                        value={assignment.quantity}
                        onChange={(e) => handleAssetChange(index, 'quantity', parseInt(e.target.value))}
                        disabled={isEditModalOpen && selectedEvent && selectedEvent.status !== 'upcoming' && selectedEvent.status !== 'in_progress'}
                        className={`w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.assets ? 'border-red-500' : 'border-gray-300'} ${
                          isEditModalOpen && selectedEvent && selectedEvent.status !== 'upcoming' && selectedEvent.status !== 'in_progress' ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                        }`}
                        placeholder="Qty"
                      />
                      {(!isEditModalOpen || (selectedEvent && (selectedEvent.status === 'upcoming' || selectedEvent.status === 'in_progress'))) && assetAssignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(index)}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setIsEditModalOpen(false)
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
                    {isEditModalOpen ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Select Event Package Modal */}
      {showSelectPackageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-65 flex items-center justify-center z-[60] backdrop-blur-sm transition-all duration-300"
          onMouseDown={(e) => handleBackdropClose(e, handleCancelSelectPackage)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-7xl shadow-2xl border border-gray-100 dark:border-slate-700 transform scale-100 transition-all duration-300 m-4 overflow-y-auto max-h-[95vh]">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Select Event Package</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select the best package that fits the requirements of this event setup</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {[
                { 
                  name: 'Paket Basic Memories', 
                  price: 299000, 
                  color: 'blue', 
                  badge: 'BASIC MEMORIES',
                  features: ['2-Hour Service', 'Unlimited Sessions', 'Standard Backdrop', 'Soft Files Included']
                },
                { 
                  name: 'Paket Silver Celebration', 
                  price: 599000, 
                  color: 'purple', 
                  badge: 'SILVER CELEBRATION',
                  features: ['4-Hour Service', 'Unlimited Prints', 'Custom Frame Design', 'Online Digital Gallery']
                },
                { 
                  name: 'Paket Gold Glam', 
                  price: 999000, 
                  color: 'amber', 
                  badge: 'GOLD GLAM',
                  features: ['6-Hour Service', 'Premium Backdrop', 'Custom Design Template', 'Professional Attendant']
                },
                { 
                  name: 'Paket Platinum Luxury', 
                  price: 1499000, 
                  color: 'rose', 
                  badge: 'PLATINUM LUXURY',
                  features: ['Full Day Service', 'Exclusive Backdrop', 'GIF & Boomerang Support', 'Personal Guestbook']
                },
                { 
                  name: 'Paket Custom Agreement', 
                  price: 0, 
                  color: 'teal', 
                  badge: 'CUSTOM PROPOSAL',
                  features: ['Adjustable Base Price', 'Optional Add-Ons Calculated', 'Flexible Concept & Props', 'As Agreed in Proposal'],
                  priceLabel: 'Adjustable / Proposal'
                }
              ].map((pkg) => {
                const themeMap = {
                  blue: {
                    bg: 'bg-blue-50/40 hover:bg-blue-50/80',
                    border: 'border-blue-100 hover:border-blue-500',
                    textHeader: 'text-blue-600 bg-blue-100',
                    textTitle: 'text-blue-900',
                    textPrice: 'text-blue-950',
                    bulletBg: 'bg-blue-100 text-blue-600',
                    btnBg: 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20'
                  },
                  purple: {
                    bg: 'bg-purple-50/40 hover:bg-purple-50/80',
                    border: 'border-purple-100 hover:border-purple-500',
                    textHeader: 'text-purple-600 bg-purple-100',
                    textTitle: 'text-purple-900',
                    textPrice: 'text-purple-950',
                    bulletBg: 'bg-purple-100 text-purple-600',
                    btnBg: 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/20'
                  },
                  amber: {
                    bg: 'bg-amber-50/40 hover:bg-amber-50/80',
                    border: 'border-amber-100 hover:border-amber-500',
                    textHeader: 'text-amber-600 bg-amber-100',
                    textTitle: 'text-amber-900',
                    textPrice: 'text-amber-950',
                    bulletBg: 'bg-amber-100 text-amber-600',
                    btnBg: 'bg-amber-600 hover:bg-amber-700 hover:shadow-amber-500/20'
                  },
                  rose: {
                    bg: 'bg-rose-50/40 hover:bg-rose-50/80',
                    border: 'border-rose-100 hover:border-rose-500',
                    textHeader: 'text-rose-600 bg-rose-100',
                    textTitle: 'text-rose-900',
                    textPrice: 'text-rose-950',
                    bulletBg: 'bg-rose-100 text-rose-600',
                    btnBg: 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-500/20'
                  },
                  teal: {
                    bg: 'bg-teal-50/40 hover:bg-teal-50/80',
                    border: 'border-teal-100 hover:border-teal-500',
                    textHeader: 'text-teal-600 bg-teal-100',
                    textTitle: 'text-teal-950',
                    textPrice: 'text-teal-950',
                    bulletBg: 'bg-teal-100 text-teal-600',
                    btnBg: 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/20'
                  }
                }
                const theme = themeMap[pkg.color]
                
                return (
                  <div 
                    key={pkg.name}
                    onClick={() => handleSelectPackage(pkg.name)}
                    className={`group relative flex flex-col justify-between border-2 ${theme.border} p-5 rounded-2xl cursor-pointer transition-all duration-300 ${theme.bg} shadow-sm hover:shadow-xl hover:-translate-y-1.5`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-bold tracking-widest ${theme.textHeader} uppercase px-2.5 py-1 rounded-full`}>
                          {pkg.badge}
                        </span>
                      </div>
                      <h3 className={`font-extrabold ${theme.textTitle} text-base mb-1`}>{pkg.name}</h3>
                      <div className="flex items-baseline gap-1 mb-5">
                        {pkg.name === 'Paket Custom Agreement' ? (
                          <span className={`text-sm font-black ${theme.textPrice} bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md`}>
                            {pkg.priceLabel}
                          </span>
                        ) : (
                          <span className={`text-lg font-black ${theme.textPrice}`}>Rp {pkg.price.toLocaleString('id-ID')}</span>
                        )}
                      </div>
                      <ul className="space-y-3">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                            <div className={`p-0.5 rounded-full ${theme.bulletBg} shrink-0`}>
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-8">
                      <button className={`w-full py-2.5 px-4 ${theme.btnBg} text-white font-semibold rounded-xl shadow-md group-hover:shadow-lg transition duration-200 text-xs flex items-center justify-center gap-1`}>
                        Select Package
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="flex justify-center mt-8 border-t border-gray-100 pt-6">
              <button 
                type="button"
                onClick={handleCancelSelectPackage} 
                className="px-8 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 hover:text-gray-900 transition duration-150 text-sm shadow-sm"
              >
                Cancel & Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Package Details Modal */}
      {showPackageDetailsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-65 flex items-center justify-center z-[60] backdrop-blur-sm transition-all duration-300"
          onMouseDown={(e) => handleBackdropClose(e, () => setShowPackageDetailsModal(false))}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-slate-700 transform scale-100 transition-all duration-300 m-4">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Package Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Verify and enter mandatory configuration for your selected package</p>

            <div className="space-y-5">
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Chosen Package</p>
                  <p className="text-base font-extrabold text-blue-950 dark:text-blue-200 mt-0.5">{formData.package_name}</p>
                </div>
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-800 dark:text-blue-300 text-xs font-bold">
                  {formData.package_name === 'Paket Custom Agreement' ? 'Proposal' : 'Standard'}
                </div>
              </div>

              {/* Mandatory Custom Price for Custom Agreement */}
              {formData.package_name === 'Paket Custom Agreement' ? (
                <div className="p-4 bg-teal-50/40 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800">
                  <label className="block text-xs font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider mb-2">Custom Base Price (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter custom agreed base price..."
                    value={formData.custom_base_price || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                      const newData = { ...formData, custom_base_price: val }
                      setFormData({ ...newData, expected_revenue: calculateTotalRevenue(newData) })
                    }}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 text-sm font-semibold text-gray-800 dark:text-white bg-white dark:bg-slate-700 ${formErrors.custom_base_price ? 'border-red-500' : 'border-teal-300 dark:border-teal-600'}`}
                  />
                  {formErrors.custom_base_price && <p className="text-red-500 dark:text-red-400 text-xs mt-1 font-semibold">{formErrors.custom_base_price}</p>}
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">Required: Enter the basic contract/proposal base rate before optional add-ons.</p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package Base Price</p>
                  <p className="text-lg font-black text-gray-800 dark:text-white mt-0.5">
                    Rp {(
                      formData.package_name === 'Paket Basic Memories' ? 299000 :
                      formData.package_name === 'Paket Silver Celebration' ? 599000 :
                      formData.package_name === 'Paket Gold Glam' ? 999000 :
                      formData.package_name === 'Paket Platinum Luxury' ? 1499000 : 0
                    ).toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {/* Optional Configured Add-Ons section */}
              <div className="p-4 bg-gray-50/50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected Add-Ons</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddonModal()}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold flex items-center gap-1 hover:underline"
                  >
                    Configure Add-Ons
                  </button>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-100 dark:border-slate-600 max-h-32 overflow-y-auto">
                  {formData.extra_hours > 0 && (
                    <p className="flex justify-between">
                      <span>• Extra Duration ({formData.extra_hours} hrs)</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Rp {(formData.extra_hours * (formData.package_name === 'Paket Custom Agreement' ? formData.custom_extra_hours_price : 150000)).toLocaleString('id-ID')}
                      </span>
                    </p>
                  )}
                  {formData.backdrop_item_id && (
                    <p className="flex justify-between">
                      <span>• Backdrop ({formData.backdrop_name})</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Rp {(formData.package_name === 'Paket Custom Agreement' ? formData.custom_backdrop_price : 250000).toLocaleString('id-ID')}
                      </span>
                    </p>
                  )}
                  {formData.guestbook_album && (
                    <p className="flex justify-between">
                      <span>• Guestbook Album</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Rp {(formData.package_name === 'Paket Custom Agreement' ? formData.custom_guestbook_price : 200000).toLocaleString('id-ID')}
                      </span>
                    </p>
                  )}
                  {formData.gif_boomerang && (
                    <p className="flex justify-between">
                      <span>• GIF & Boomerang Support</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Rp {(formData.package_name === 'Paket Custom Agreement' ? formData.custom_gif_boomerang_price : 300000).toLocaleString('id-ID')}
                      </span>
                    </p>
                  )}
                  {formData.print_quantity > 0 && (
                    <p className="flex justify-between">
                      <span>• Extra Prints ({formData.print_quantity} sheets)</span>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        Rp {((formData.print_quantity / 50) * (formData.package_name === 'Paket Custom Agreement' ? formData.custom_print_price : 50000)).toLocaleString('id-ID')}
                      </span>
                    </p>
                  )}
                  {!formData.extra_hours && !formData.backdrop_item_id && !formData.guestbook_album && !formData.gif_boomerang && !formData.print_quantity && (
                    <p className="text-gray-400 dark:text-gray-500 italic text-center py-1">No add-ons selected</p>
                  )}
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-baseline pt-2">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Calculated Revenue:</p>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400">Rp {formData.expected_revenue.toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8 border-t border-gray-100 dark:border-slate-700 pt-5">
              <button
                type="button"
                onClick={handleBackFromPackageDetails}
                className="px-5 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition duration-150 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmPackageDetails}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition duration-150 text-sm"
              >
                Confirm Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add-On Configuration Modal */}
      {showAddonModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, handleCancelAddon)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 m-4">
            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Configure Add-Ons</h2>
            
            <div className="space-y-6">
              {/* Extra Hours */}
              <div className="flex justify-between items-center">
                {formData.package_name === 'Paket Custom Agreement' ? (
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-gray-800 dark:text-white">Extra Hours</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.custom_extra_hours_price || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                          const newData = { ...formData, custom_extra_hours_price: val }
                          handleUpdateEventForm(newData)
                        }}
                        className="w-24 px-2 py-0.5 border border-gray-300 dark:border-slate-600 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        placeholder="150000"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">/ hour</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">Extra Hours</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rp 150.000 / jam</p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (formData.extra_hours > 0) {
                        const newData = { ...formData, extra_hours: formData.extra_hours - 1 }
                        handleUpdateEventForm(newData)
                      }
                    }}
                    className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="font-bold w-4 text-center text-gray-800 dark:text-white">{formData.extra_hours}</span>
                  <button 
                    onClick={() => {
                      const newData = { ...formData, extra_hours: formData.extra_hours + 1 }
                      handleUpdateEventForm(newData)
                    }}
                    className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Custom Backdrop */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.backdrop_item_id === -1}
                    onChange={(e) => {
                      const isChecked = e.target.checked
                      const newData = { 
                        ...formData, 
                        backdrop_item_id: isChecked ? -1 : null,
                        backdrop_name: isChecked ? 'Custom Backdrop' : '',
                        backdrop_quantity: isChecked ? 1 : 0
                      }
                      handleUpdateEventForm(newData)
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                  />
                  <div className="text-xs flex flex-col gap-1">
                    <p className="font-bold text-gray-800 dark:text-white">Custom Backdrop</p>
                    {formData.package_name === 'Paket Custom Agreement' ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.custom_backdrop_price || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                            const newData = { ...formData, custom_backdrop_price: val }
                            handleUpdateEventForm(newData)
                          }}
                          className="w-20 px-1.5 py-0.5 border border-gray-300 dark:border-slate-600 rounded text-[10px] font-semibold focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          placeholder="250000"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Rp 250.000</p>
                    )}
                  </div>
                </label>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-slate-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.guestbook_album}
                    onChange={(e) => {
                      const newData = { ...formData, guestbook_album: e.target.checked }
                      handleUpdateEventForm(newData)
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                  />
                  <div className="text-xs flex flex-col gap-1">
                    <p className="font-bold text-gray-800 dark:text-white">Guestbook Album</p>
                    {formData.package_name === 'Paket Custom Agreement' ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.custom_guestbook_price || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                            const newData = { ...formData, custom_guestbook_price: val }
                            handleUpdateEventForm(newData)
                          }}
                          className="w-20 px-1.5 py-0.5 border border-gray-300 dark:border-slate-600 rounded text-[10px] font-semibold focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          placeholder="200000"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Rp 200.000</p>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.gif_boomerang}
                    onChange={(e) => {
                      const newData = { ...formData, gif_boomerang: e.target.checked }
                      handleUpdateEventForm(newData)
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600"
                  />
                  <div className="text-xs flex flex-col gap-1">
                    <p className="font-bold text-gray-800 dark:text-white">GIF/Boomerang</p>
                    {formData.package_name === 'Paket Custom Agreement' ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.custom_gif_boomerang_price || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                            const newData = { ...formData, custom_gif_boomerang_price: val }
                            handleUpdateEventForm(newData)
                          }}
                          className="w-20 px-1.5 py-0.5 border border-gray-300 dark:border-slate-600 rounded text-[10px] font-semibold focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          placeholder="300000"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Rp 300.000</p>
                    )}
                  </div>
                </label>
              </div>

              {/* Tambahan Print */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <p className="font-bold text-gray-800 dark:text-white">Tambahan Print</p>
                    {formData.package_name === 'Paket Custom Agreement' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.custom_print_price || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value) || 0
                            const newData = { ...formData, custom_print_price: val }
                            handleUpdateEventForm(newData)
                          }}
                          className="w-24 px-2 py-0.5 border border-gray-300 dark:border-slate-600 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          placeholder="50000"
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">/ 50 sheets</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Rp 50.000 / 50 lembar</p>
                    )}
                  </div>
                  <button 
                    onClick={() => { setInventorySearchType('print'); setShowInventorySearch(true); }}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    {formData.print_item_id ? 'Change' : 'Search Item'}
                  </button>
                </div>
                {formData.print_item_id && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm bg-gray-50 dark:bg-slate-700 p-2 rounded">
                      <span className="text-gray-800 dark:text-white">{formData.print_name}</span>
                      <span className={formData.print_stock < 50 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>Stock: {formData.print_stock}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => {
                          if (formData.print_quantity >= 50) {
                            const newData = { ...formData, print_quantity: formData.print_quantity - 50 }
                            handleUpdateEventForm(newData)
                          }
                        }}
                        className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full"
                      >
                        <Minus size={20} />
                      </button>
                      <span className="font-bold text-lg text-gray-800 dark:text-white">{formData.print_quantity}</span>
                      <button 
                        onClick={() => {
                          const newData = { ...formData, print_quantity: formData.print_quantity + 50 }
                          handleUpdateEventForm(newData)
                        }}
                        className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Add-Ons Total</p>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400">Rp {(formData.expected_revenue - (
                  formData.package_name === 'Paket Basic Memories' ? 299000 :
                  formData.package_name === 'Paket Silver Celebration' ? 599000 :
                  formData.package_name === 'Paket Gold Glam' ? 999000 :
                  formData.package_name === 'Paket Platinum Luxury' ? 1499000 :
                  formData.package_name === 'Paket Custom Agreement' ? (Number(formData.custom_base_price) || 0) : 0
                )).toLocaleString('id-ID')}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleCancelAddon}
                  className="px-6 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold shadow-sm hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddonModal(false)}
                  className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Search Modal Overlay */}
      {showInventorySearch && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setShowInventorySearch(false))}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4">
            <h3 className="font-bold text-lg mb-4">Search Inventory for {inventorySearchType}</h3>
            <div className="relative mb-4">
              <input
                type="text"
                autoFocus
                placeholder="Type item name..."
                value={inventorySearch}
                onChange={(e) => handleInventorySearch(e.target.value, inventorySearchType)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
              {inventoryResults.map(item => (
                <div 
                  key={item.item_id} 
                  onClick={() => handleSelectInventoryItem(item)}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-800">{item.item_name}</p>
                    <p className="text-xs text-gray-500">{item.category} • {item.uom}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.stock_quantity <= 0 ? 'text-red-500' : item.stock_quantity < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                      {item.stock_quantity <= 0 ? 'Out of Stock' : `Qty: ${item.stock_quantity}`}
                    </p>
                  </div>
                </div>
              ))}
              {inventorySearch && inventoryResults.length === 0 && (
                <p className="p-4 text-center text-sm text-gray-500">No items found</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowInventorySearch(false)} className="text-sm text-gray-500 underline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setIsViewModalOpen(false))}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">Event Details</h2>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Created By: {selectedEvent.created_by || 'N/A'}
                </span>
              </div>
              {selectedEvent.is_deleted ? (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800">Delete Reason:</p>
                  <p className="text-sm text-red-700">{selectedEvent.deleted_reason || '-'}</p>
                </div>
              ) : null}
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Event ID</p>
                    <p className="font-medium">{selectedEvent.event_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Event Name</p>
                    <p className="font-medium">{selectedEvent.event_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Start Date</p>
                    <p className="font-medium">{formatDisplayDate(selectedEvent.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">End Date</p>
                    <p className="font-medium">{formatDisplayDate(selectedEvent.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Location</p>
                    <p className="font-medium">{selectedEvent.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Customer</p>
                    <p className="font-medium">{selectedEvent.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Status</p>
                    <p className="font-medium">{selectedEvent.status?.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase text-[10px] font-bold">Total Revenue</p>
                    <p className="font-black text-blue-600 text-lg">
                      {selectedEvent.expected_revenue ? `Rp ${Number(selectedEvent.expected_revenue).toLocaleString('id-ID')}` : '-'}
                    </p>
                  </div>
                </div>

                {/* Package Specifics */}
                <div className="bg-gray-50 p-4 rounded-xl border">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Package & Add-Ons</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Base Package</p>
                      <p className="text-sm font-bold text-blue-800">{selectedEvent.package_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Extra Hours</p>
                      <p className="text-sm font-bold">{selectedEvent.extra_hours || 0} hrs</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Backdrop</p>
                      <p className="text-sm font-bold">{selectedEvent.backdrop_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Extra Print</p>
                      <p className="text-sm font-bold">{selectedEvent.print_quantity || 0} lembar</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">Guestbook</p>
                      <p className="text-sm font-bold">{selectedEvent.guestbook_album ? 'YES' : 'NO'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">GIF/Boomerang</p>
                      <p className="text-sm font-bold">{selectedEvent.gif_boomerang ? 'YES' : 'NO'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Assigned Assets</p>
                  {selectedEvent.assets && selectedEvent.assets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {selectedEvent.assets.map((asset, index) => (
                        <div key={index} className="border-b pb-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">[{asset.asset_id || asset.name}] {asset.asset_name || asset.name}</span>
                            <span className="font-bold">Qty: {asset.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No assets assigned</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end items-center gap-3 mt-8">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEventForDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {selectedEventForDelete.status === 'completed' ? 'Delete Completed Event' : 'Cancel Event'}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              {selectedEventForDelete.status === 'completed' 
                ? 'Are you sure you want to delete this completed event? This will remove it from revenue calculations.' 
                : 'Are you sure you want to cancel this event?'}
            </p>
            {selectedEventForDelete.status === 'completed' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for deletion *
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                  rows="3"
                  placeholder="Please explain why this event needs to be deleted..."
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteReason('')
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {selectedEventForDelete.status === 'completed' ? 'Delete' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {showHardDeleteModal && selectedEventForDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setShowHardDeleteModal(false))}
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Permanently Delete Event</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to permanently delete this event? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowHardDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmHardDelete}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
              >
                Delete Permanently
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

      {showConflictModal && assetConflicts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setShowConflictModal(false))}
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 animate-pulse" />
              Asset Conflict Detected
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Assets cannot be used during the selected date range due to overlapping bookings:</p>
            
            {assetConflicts.map((conflict, index) => (
              <div key={index} className="mb-4 p-3.5 bg-red-50/50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-900 dark:text-white">{conflict.asset_name}</p>
                  {conflict.is_in_use && (
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded border border-orange-200 dark:border-orange-800">
                      Currently In Use
                    </span>
                  )}
                </div>
                
                {conflict.conflicting_events && conflict.conflicting_events.length > 0 && (
                  <div className="mb-3 pl-2 border-l-2 border-red-300 dark:border-red-700">
                    <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Overlapping Events:</p>
                    {conflict.conflicting_events.map((event, eventIndex) => (
                      <div key={eventIndex} className="text-xs text-gray-700 dark:text-gray-300 ml-1">
                        • <span className="font-semibold text-gray-800 dark:text-white">{event.event_name}</span> ({event.start_date} to {event.end_date})
                      </div>
                    ))}
                  </div>
                )}

                {/* AI suggested substitutes */}
                {conflict.suggested_substitutes && conflict.suggested_substitutes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-100/60 dark:border-red-800/60">
                    <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Sparkles size={11} className="text-indigo-500 dark:text-indigo-400 animate-bounce" />
                      AI Smart Recommendations (Substitutes):
                    </p>
                    <div className="space-y-2">
                      {conflict.suggested_substitutes.map((sub, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-700 rounded-lg border border-indigo-100 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition shadow-sm">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{sub.name}</span>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-800 flex items-center gap-0.5">
                                <Sparkles size={8} /> {sub.similarity_rating}% match
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">Loc: {sub.location || 'Studio'} • Status: {sub.status}</span>
                          </div>
                          <button
                            onClick={() => handleApplyAssetSubstitution(conflict.asset_id, sub)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition shadow"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowConflictModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 font-semibold text-xs"
              >
                Close & Check Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Filter Modal */}
      <CsvFilterModal
        isOpen={showCsvFilterModal}
        onClose={() => setShowCsvFilterModal(false)}
        onExport={downloadCSV}
        allData={csvFilter.allData}
        onAllDataChange={(checked) =>
          setCsvFilter({
            allData: checked,
            statuses: [],
            startDate: '',
            endDate: ''
          })
        }
        title="Download CSV Filter"
        exportLabel="Download CSV"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CSV_STATUSES.map((status) => (
              <label key={status.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={csvFilter.statuses.includes(status.value)}
                  onChange={(e) => {
                    const selected = e.target.checked
                      ? [...csvFilter.statuses, status.value]
                      : csvFilter.statuses.filter((s) => s !== status.value)
                    setCsvFilter({ ...csvFilter, allData: false, statuses: selected })
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{status.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Start - End Date</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={csvFilter.startDate}
                onChange={(e) => setCsvFilter({ ...csvFilter, allData: false, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={csvFilter.endDate}
                onChange={(e) => setCsvFilter({ ...csvFilter, allData: false, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </CsvFilterModal>
      <SnapFunny />
    </div>
  )
}

export default Events
