import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, Users, Plus, Minus, Coins, Calendar, Building, Download, Check, Sparkles, Percent } from 'lucide-react'
import { exportToExcel } from '../utils/exportExcel'
import CsvFilterModal from '../components/CsvFilterModal'
import AccountingReportModal from '../components/AccountingReportModal'
import Promotions from './Promotions'
import { useTheme } from '../context/ThemeContext'

function Customers() {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')
  const [showPromoModal, setShowPromoModal] = useState(false)

  const [customers, setCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSegment, setActiveSegment] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [summary, setSummary] = useState({ total_customers: 0, total_revenue: 0, total_visits: 0, total_booths: 0 })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddVisitModal, setShowAddVisitModal] = useState(false)
  const [showSelectPackageModal, setShowSelectPackageModal] = useState(false)
  const [showPackageConfigModal, setShowPackageConfigModal] = useState(false)
  const [showAddInStudioModal, setShowAddInStudioModal] = useState(false)
  const [showAddOffSiteModal, setShowAddOffSiteModal] = useState(false)
  const [showManageVisitsModal, setShowManageVisitsModal] = useState(false)
  const [showDeleteVisitModal, setShowDeleteVisitModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerVisits, setCustomerVisits] = useState([])
  const [customerEvents, setCustomerEvents] = useState([])
  const [selectedVisitForDelete, setSelectedVisitForDelete] = useState(null)
  const [isEditingVisit, setIsEditingVisit] = useState(false)
  const [editingVisitId, setEditingVisitId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: ''
  })

  const [formErrors, setFormErrors] = useState({})
  const [showMissingDataModal, setShowMissingDataModal] = useState(false)
  const [systemNotice, setSystemNotice] = useState({ type: '', message: '' })
  const [showCsvFilterModal, setShowCsvFilterModal] = useState(false)
  const [csvFilter, setCsvFilter] = useState({
    allData: true,
    customerType: 'all'
  })
  const [showAccountingReportModal, setShowAccountingReportModal] = useState(false)

  const CSV_CUSTOMER_TYPES = [
    { value: 'all', label: 'All' },
    { value: 'in_studio', label: 'In Studio' },
    { value: 'off_site', label: 'Off Site' }
  ]

  const showSystemNotice = (type, message) => {
    setSystemNotice({ type, message })
  }

  const handleBackdropClose = (e, onClose) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    setFormErrors({})
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setSelectedCustomer(null)
    setCustomerVisits([])
    setCustomerEvents([])
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setFormErrors({})
  }

  const closePackageConfigModal = () => {
    setShowPackageConfigModal(false)
    setFormErrors({})
    if (!isEditingVisit) setShowSelectPackageModal(true)
  }

  const closeAddInStudioModal = () => {
    setShowAddInStudioModal(false)
    setSelectedAssignCustomer(null)
    setAssignCustomerSearch('')
    setAssignCustomerResults([])
  }

  const closeAddOffSiteModal = () => {
    setShowAddOffSiteModal(false)
    setSelectedAssignCustomer(null)
    setAssignCustomerSearch('')
    setAssignCustomerResults([])
  }

  const closeManageVisitsModal = () => {
    setShowManageVisitsModal(false)
    setSelectedCustomer(null)
    setCustomerVisits([])
  }

  const closeDeleteVisitModal = () => {
    setShowDeleteVisitModal(false)
    setSelectedVisitForDelete(null)
  }

  const closeTopModal = () => {
    if (showAccountingReportModal) {
      setShowAccountingReportModal(false)
      return true
    }
    if (showCsvFilterModal) {
      setShowCsvFilterModal(false)
      return true
    }
    if (showMissingDataModal) {
      setShowMissingDataModal(false)
      return true
    }
    if (showDeleteVisitModal) {
      closeDeleteVisitModal()
      return true
    }
    if (showManageVisitsModal) {
      closeManageVisitsModal()
      return true
    }
    if (showAddOffSiteModal) {
      closeAddOffSiteModal()
      return true
    }
    if (showAddInStudioModal) {
      closeAddInStudioModal()
      return true
    }
    if (showPackageConfigModal) {
      closePackageConfigModal()
      return true
    }
    if (showSelectPackageModal) {
      setShowSelectPackageModal(false)
      return true
    }
    if (showDeleteModal) {
      setShowDeleteModal(false)
      return true
    }
    if (showEditModal) {
      closeEditModal()
      return true
    }
    if (showViewModal) {
      closeViewModal()
      return true
    }
    if (showAddModal) {
      closeAddModal()
      return true
    }
    return false
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Customer Name is required'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    return true
  }

  const validateVisitForm = () => {
    const errors = {}
    if (!visitFormData.visit_date) {
      errors.visit_date = 'Visit Date is required'
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    return true
  }

  const [visitFormData, setVisitFormData] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    spending: 0,
    package_name: '',
    person_quantity: 1,
    duration: 7,
    paper_type_item_id: null,
    paper_type_name: '',
    paper_quantity: 1,
    with_photographer: false,
    promo_id: null,
    discount_amount: 0,
    promo_code: ''
  })

  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [activePromo, setActivePromo] = useState(null)

  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryResults, setInventoryResults] = useState([])
  const [showInventorySearch, setShowInventorySearch] = useState(false)

  const [assignCustomerSearch, setAssignCustomerSearch] = useState('')
  const [assignCustomerResults, setAssignCustomerResults] = useState([])
  const [selectedAssignCustomer, setSelectedAssignCustomer] = useState(null)

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

  const handleOpenCsvFilter = () => {
    setCsvFilter({
      allData: true,
      customerType: 'all'
    })
    setShowCsvFilterModal(true)
  }

  const getCustomerType = (customer) => {
    const hasInStudio = (customer.in_studio_visits || 0) > 0 || (customer.in_studio_spending || 0) > 0
    const hasOffSite = (customer.total_off_site || 0) > 0 || (customer.off_site_spending || 0) > 0
    if (hasInStudio && hasOffSite) return 'In Studio & Off Site'
    if (hasInStudio) return 'In Studio'
    if (hasOffSite) return 'Off Site'
    return 'None'
  }

  const buildCsvFilterSummary = () => {
    if (csvFilter.allData || csvFilter.customerType === 'all') return 'All data'
    const type = CSV_CUSTOMER_TYPES.find((t) => t.value === csvFilter.customerType)
    return `Customer Type: ${type?.label || csvFilter.customerType}`
  }

  const buildReportFocusSummary = (reportFocus) => {
    switch (reportFocus) {
      case 'customer_in_studio':
        return 'Customer - In Studio'
      case 'customer_off_site':
        return 'Customer - Off Site'
      case 'procurement':
        return 'Procurement'
      default:
        return 'All'
    }
  }

  const downloadAccountingReport = async ({ filterType, startDate, endDate, reportFocus }) => {
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/accounting-report`
      const params = []

      if (filterType === 'month' && startDate) {
        params.push(`filterType=month`)
        params.push(`startDate=${startDate}`)
      } else if (filterType === 'year' && startDate) {
        params.push(`filterType=year`)
        params.push(`startDate=${startDate}`)
      } else if (filterType === 'custom' && startDate && endDate) {
        params.push(`startDate=${startDate}`)
        params.push(`endDate=${endDate}`)
      }

      if (reportFocus && reportFocus !== 'all') {
        params.push(`reportFocus=${reportFocus}`)
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!data.success) {
        showSystemNotice('error', 'Error fetching accounting report')
        return
      }

      const transactions = data.data || []

      const headers = ['Date', 'Transaction Type', 'Account', 'Description', 'Debit', 'Credit', 'Reference ID', 'Status', 'Customer/Vendor', 'Balance']

      const rows = transactions.map(t => [
        new Date(t.transaction_date).toLocaleDateString('id-ID'),
        t.transaction_type,
        t.account,
        t.description,
        t.debit > 0 ? `Rp ${Number(t.debit).toLocaleString('id-ID')}` : '-',
        t.credit > 0 ? `Rp ${Number(t.credit).toLocaleString('id-ID')}` : '-',
        t.reference_id,
        t.status,
        t.customer_vendor || '-',
        `Rp ${Number(t.balance).toLocaleString('id-ID')}`
      ])

      const filterSummary = `Report Focus: ${buildReportFocusSummary(reportFocus)}` +
        (filterType !== 'all' ? ` | Date: ${filterType === 'custom' ? `${startDate} to ${endDate}` : startDate}` : '')

      await exportToExcel(
        headers,
        rows,
        'Accounting Report - Financial Flow',
        'accounting_report',
        { columnWidths: [15, 18, 20, 35, 20, 20, 15, 15, 20, 20], filterSummary }
      )

      setShowAccountingReportModal(false)
    } catch (error) {
      console.error('Error downloading accounting report:', error)
      showSystemNotice('error', 'Error downloading accounting report')
    }
  }

  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (!csvFilter.allData && csvFilter.customerType && csvFilter.customerType !== 'all') {
        params.append('segment', csvFilter.customerType)
      }
      if (searchTerm) params.append('search', searchTerm)

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/export${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (!data.success) {
        showSystemNotice('error', 'Failed to fetch CSV data')
        return
      }

      const allCustomers = data.data || []

      const headers = ['Customer Name', 'Phone Number', 'Email', 'Customer Type', 'In Studio Visits', 'In Studio Last Visit', 'In Studio Spending', 'Off Site Bookings', 'Off Site Last Booking', 'Off Site Spending', 'Total Spending']

      const rows = allCustomers.map((customer) => {
        const customerType = getCustomerType(customer)
        return [
          customer.name,
          customer.phone_number || 'N/A',
          customer.email || 'N/A',
          customerType,
          customer.in_studio_visits || 0,
          formatDate(customer.in_studio_last_visit),
          customer.in_studio_spending || 0,
          customer.total_off_site || 0,
          formatDate(customer.last_booking),
          customer.off_site_spending || 0,
          ((parseFloat(customer.in_studio_spending) || 0) + (parseFloat(customer.off_site_spending) || 0))
        ]
      })

      await exportToExcel(
        headers,
        rows,
        'Recap Report - All Customers',
        'customers_all',
        { columnWidths: [25, 18, 25, 20, 15, 18, 18, 15, 18, 18, 18], filterSummary: buildCsvFilterSummary() }
      )

      setShowCsvFilterModal(false)
    } catch (error) {
      console.error('Error downloading customers CSV:', error)
      showSystemNotice('error', 'Error downloading customers CSV')
    }
  }

  const formatPhoneForWhatsApp = (phoneNumber) => {
    if (!phoneNumber) return null
    let formatted = phoneNumber.replace(/\D/g, '')
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1)
    }
    return formatted
  }

  const handleWhatsAppClick = (phoneNumber) => {
    const formatted = formatPhoneForWhatsApp(phoneNumber)
    if (formatted) {
      window.open(`https://wa.me/${formatted}`, '_blank')
    }
  }

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)
    fetchSummary()
    fetchCustomers()
  }, [navigate, searchTerm, activeSegment, currentPage, itemsPerPage])

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
    showAccountingReportModal,
    showCsvFilterModal,
    showMissingDataModal,
    showDeleteVisitModal,
    showManageVisitsModal,
    showAddOffSiteModal,
    showAddInStudioModal,
    showPackageConfigModal,
    showSelectPackageModal,
    showDeleteModal,
    showEditModal,
    showViewModal,
    showAddModal
  ])

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const url = activeSegment === 'all'
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/summary`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/summary?segment=${activeSegment}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Error fetching customers summary:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers`
      const params = []
      
      if (activeSegment !== 'all') {
        params.push(`segment=${activeSegment}`)
      }
      
      if (searchTerm) {
        params.push(`search=${searchTerm}`)
      }
      
      params.push(`page=${currentPage}`)
      params.push(`limit=${itemsPerPage}`)
      
      if (params.length > 0) {
        url += `?${params.join('&')}`
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setCustomers(data.data)
        setTotalCustomers(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const handleAddCustomer = () => {
    setFormData({ name: '', phone_number: '', email: '' })
    setFormErrors({})
    setShowAddModal(true)
  }

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer)
    fetchCustomerVisits(customer.customer_id)
    if (activeSegment === 'off_site' || activeSegment === 'all') {
      fetchCustomerEvents(customer.customer_id)
    }
    setShowViewModal(true)
  }

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      phone_number: customer.phone_number,
      email: customer.email
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowDeleteModal(true)
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCustomers / itemsPerPage)

  const handleAddVisit = (customer) => {
    setSelectedCustomer(customer)
    setIsEditingVisit(false)
    setEditingVisitId(null)
    setVisitFormData({
      visit_date: new Date().toISOString().split('T')[0],
      spending: 0,
      package_name: '',
      person_quantity: 1,
      duration: 7,
      paper_type_item_id: null,
      paper_type_name: '',
      paper_quantity: 1,
      with_photographer: false,
      promo_id: null,
      discount_amount: 0,
      promo_code: ''
    })
    setCouponInput('')
    setCouponError('')
    setCouponSuccess('')
    setActivePromo(null)
    setShowSelectPackageModal(true)
  }

  const handleSelectPackage = (packageName) => {
    let defaultConfig = {
      package_name: packageName,
      visit_date: visitFormData.visit_date || new Date().toISOString().split('T')[0],
    }

    if (packageName === 'Snap Photobox') {
      defaultConfig = {
        ...defaultConfig,
        person_quantity: 1,
        duration: 7,
        paper_quantity: 1,
        with_photographer: false
      }
    } else if (packageName === 'Snap Self Photo') {
      defaultConfig = {
        ...defaultConfig,
        person_quantity: 2,
        duration: 15,
        paper_quantity: 2,
        with_photographer: false
      }
    } else if (packageName === 'Snap Pas Photo') {
      defaultConfig = {
        ...defaultConfig,
        person_quantity: 1,
        duration: 7,
        paper_quantity: 1,
        with_photographer: false
      }
    }

    setVisitFormData(prev => ({ ...prev, ...defaultConfig, spending: calculateSpending(defaultConfig) }))
    setShowSelectPackageModal(false)
    setShowPackageConfigModal(true)
  }

  const calculateSpending = (data) => {
    let total = 0
    if (data.package_name === 'Snap Photobox') {
      total = 20000
      if (data.person_quantity > 1) total += (data.person_quantity - 1) * 20000
      if (data.duration > 7) total += ((data.duration - 7) / 7) * 10000
      if (data.paper_quantity > 1) total += (data.paper_quantity - 1) * 5000
    } else if (data.package_name === 'Snap Self Photo') {
      total = 60000
      if (data.person_quantity > 2) total += (data.person_quantity - 2) * 20000
      if (data.duration > 15) total += ((data.duration - 15) / 15) * 12000
      if (data.paper_quantity > 2) total += (data.paper_quantity - 2) * 5000
    } else if (data.package_name === 'Snap Pas Photo') {
      total = 35000
      if (data.duration > 7) total += ((data.duration - 7) / 7) * 12000
      if (data.paper_quantity > 1) total += (data.paper_quantity - 1) * 5000
      if (data.with_photographer) total += 50000
    }
    return total
  }

  const recalculatePromoDiscount = (promo, subtotal, packageName, date) => {
    if (!promo) return { discount: 0, error: '' }

    if (promo.applicable_to !== 'all' && promo.applicable_to !== 'in_studio') {
      return { discount: 0, error: `This promo is only valid for Off-Site Events!` }
    }

    if (subtotal < Number(promo.min_transaction)) {
      return { discount: 0, error: `Minimum transaction amount of Rp ${new Intl.NumberFormat('id-ID').format(promo.min_transaction)} not reached` }
    }

    const transactionDate = date ? new Date(date) : new Date()
    const startDate = new Date(promo.start_date)
    const endDate = new Date(promo.end_date)
    transactionDate.setHours(0,0,0,0)
    startDate.setHours(0,0,0,0)
    endDate.setHours(0,0,0,0)

    if (transactionDate < startDate || transactionDate > endDate) {
      return { discount: 0, error: 'This promo is not valid on this date!' }
    }

    if (promo.eligibility_type === 'weekday_slump' && promo.day_restrictions) {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = weekdays[transactionDate.getDay()]
      if (!promo.day_restrictions.includes(dayName)) {
        return { discount: 0, error: 'This promo is not valid for today!' }
      }
    }

    if (promo.eligibility_type === 'package_bundling' && promo.target_package_name) {
      if (!packageName || packageName.toLowerCase() !== promo.target_package_name.toLowerCase()) {
        return { discount: 0, error: `Only valid for ${promo.target_package_name} package` }
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

  const handleUpdateVisitForm = (newData) => {
    const subtotal = calculateSpending(newData)
    if (activePromo) {
      const check = recalculatePromoDiscount(activePromo, subtotal, newData.package_name, newData.visit_date)
      if (check.error) {
        setCouponError(`Coupon invalid: ${check.error}`)
        setCouponSuccess('')
        setActivePromo(null)
        setVisitFormData({
          ...newData,
          promo_id: null,
          promo_code: '',
          discount_amount: 0,
          spending: subtotal
        })
      } else {
        setCouponError('')
        setVisitFormData({
          ...newData,
          promo_id: activePromo.promo_id,
          promo_code: activePromo.promo_code,
          discount_amount: check.discount,
          spending: Math.max(0, subtotal - check.discount)
        })
      }
    } else {
      setVisitFormData({
        ...newData,
        spending: subtotal
      })
    }
  }

  const handleVerifyCoupon = async () => {
    if (!couponInput || !couponInput.trim()) {
      setCouponError('Please enter a promo code first!')
      return
    }

    setCouponError('')
    setCouponSuccess('')

    try {
      const subtotal = calculateSpending(visitFormData)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promo_code: couponInput.trim(),
          amount: subtotal,
          transaction_type: 'in_studio',
          date: visitFormData.visit_date,
          package_name: visitFormData.package_name
        })
      })

      const res = await response.json()
      if (res.success) {
        setCouponSuccess('Promo code applied successfully!')
        
        const promoDetails = {
          promo_id: res.data.promo_id,
          promo_code: res.data.promo_code,
          promo_name: res.data.promo_name,
          discount_type: res.data.discount_type,
          discount_value: res.data.discount_value,
          applicable_to: 'in_studio',
          min_transaction: 0
        }
        
        setActivePromo(promoDetails)
        setVisitFormData(prev => ({
          ...prev,
          promo_id: res.data.promo_id,
          promo_code: res.data.promo_code,
          discount_amount: res.data.discount_amount,
          spending: Math.max(0, subtotal - res.data.discount_amount)
        }))
      } else {
        setCouponError(res.message || 'Invalid coupon!')
        setActivePromo(null)
        setVisitFormData(prev => ({
          ...prev,
          promo_id: null,
          promo_code: '',
          discount_amount: 0,
          spending: subtotal
        }))
      }
    } catch (err) {
      console.error('Error verifying coupon:', err)
      setCouponError('Network error while verifying coupon')
    }
  }

  const handleRemoveCoupon = () => {
    setCouponInput('')
    setCouponError('')
    setCouponSuccess('')
    setActivePromo(null)
    const subtotal = calculateSpending(visitFormData)
    setVisitFormData(prev => ({
      ...prev,
      promo_id: null,
      promo_code: '',
      discount_amount: 0,
      spending: subtotal
    }))
  }

  const handleInventorySearch = async (term) => {
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

  const handleSelectPaper = (item) => {
    const newData = {
      ...visitFormData,
      paper_type_item_id: item.item_id,
      paper_type_name: item.item_name,
      paper_stock: item.stock_quantity
    }
    handleUpdateVisitForm(newData)
    setShowInventorySearch(false)
    setInventorySearch('')
    setInventoryResults([])
  }

  const handleSubmitAdd = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setShowAddModal(false)
        fetchSummary()
        fetchCustomers()
      } else {
        showSystemNotice('error', 'Error creating customer: ' + data.message)
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      showSystemNotice('error', 'Error creating customer')
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedCustomer.customer_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setShowEditModal(false)
        fetchCustomers()
      } else {
        showSystemNotice('error', 'Error updating customer: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      showSystemNotice('error', 'Error updating customer')
    }
  }

  const confirmDelete = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedCustomer.customer_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })

      const data = await response.json()
      if (data.success) {
        setShowDeleteModal(false)
        fetchSummary()
        fetchCustomers()
      } else {
        showSystemNotice('error', 'Error deleting customer: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      showSystemNotice('error', 'Error deleting customer')
    }
  }

  const handleSubmitAddVisit = async (e) => {
    e.preventDefault()
    if (!validateVisitForm()) return
    
    if (visitFormData.paper_type_item_id && visitFormData.paper_quantity > (visitFormData.paper_stock || 0)) {
      showSystemNotice('error', 'Quantity insufficient for the selected photo paper.')
      return
    }

    try {
      const url = isEditingVisit 
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedCustomer.customer_id}/visits/${editingVisitId}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedCustomer.customer_id}/visits`
      
      const response = await fetch(url, {
        method: isEditingVisit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visitFormData)
      })

      const data = await response.json()
      if (data.success) {
        setShowPackageConfigModal(false)
        setIsEditingVisit(false)
        setEditingVisitId(null)
        fetchSummary()
        fetchCustomers()
        if (showViewModal && selectedCustomer) {
          fetchCustomerVisits(selectedCustomer.customer_id)
        }
      } else {
        showSystemNotice('error', 'Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error saving visit:', error)
      showSystemNotice('error', 'Error saving visit')
    }
  }

  const handleEditVisit = (visit) => {
    setEditingVisitId(visit.visit_id)
    setIsEditingVisit(true)
    
    const disc = Number(visit.discount_amount) || 0
    setVisitFormData({
      visit_date: visit.visit_date.split('T')[0],
      spending: visit.spending,
      package_name: visit.package_name,
      person_quantity: visit.person_quantity,
      duration: visit.duration,
      paper_type_item_id: visit.paper_type_item_id,
      paper_type_name: visit.paper_type_name || 'Selected Paper',
      paper_quantity: visit.paper_quantity,
      with_photographer: !!visit.with_photographer,
      paper_stock: 999, 
      promo_id: visit.promo_id || null,
      promo_code: visit.promo_code || '',
      discount_amount: disc
    })

    if (visit.promo_id) {
      setCouponInput(visit.promo_code || '')
      setCouponSuccess('Kode promo berhasil diterapkan!')
      setActivePromo({
        promo_id: visit.promo_id,
        promo_code: visit.promo_code,
        promo_name: visit.promo_name,
        discount_type: 'flat',
        discount_value: disc
      })
    } else {
      setCouponInput('')
      setCouponSuccess('')
      setActivePromo(null)
    }

    setCouponError('')
    setShowPackageConfigModal(true)
  }

  const fetchCustomerVisits = async (customerId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${customerId}/visits`)
      const data = await response.json()
      if (data.success) {
        setCustomerVisits(data.data)
      }
    } catch (error) {
      console.error('Error fetching customer visits:', error)
    }
  }

  const fetchCustomerEvents = async (customerId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${customerId}/events`)
      const data = await response.json()
      if (data.success) {
        setCustomerEvents(data.data)
      }
    } catch (error) {
      console.error('Error fetching customer events:', error)
    }
  }

  const handleAssignCustomerSearch = async (searchTerm) => {
    setAssignCustomerSearch(searchTerm)
    if (searchTerm.length > 0) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers?search=${searchTerm}`)
        const data = await response.json()
        if (data.success) {
          setAssignCustomerResults(data.data)
        }
      } catch (error) {
        console.error('Error searching customers:', error)
      }
    } else {
      setAssignCustomerResults([])
    }
  }

  const handleAssignCustomerSelect = (customer) => {
    setSelectedAssignCustomer(customer)
    setAssignCustomerSearch(customer.name)
    setAssignCustomerResults([])
  }

  const handleAssignToInStudio = async () => {
    if (!selectedAssignCustomer) {
      showSystemNotice('error', 'Please select a customer')
      return
    }
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedAssignCustomer.customer_id}/assign-in-studio`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setShowAddInStudioModal(false)
        setSelectedAssignCustomer(null)
        setAssignCustomerSearch('')
        setAssignCustomerResults([])
        fetchSummary()
        fetchCustomers()
        showSystemNotice('success', 'Customer assigned to In Studio successfully')
      } else {
        showSystemNotice('error', 'Error assigning customer: ' + data.message)
      }
    } catch (error) {
      console.error('Error assigning customer to In Studio:', error)
      showSystemNotice('error', 'Error assigning customer to In Studio')
    }
  }

  const handleAssignToOffSite = async () => {
    if (!selectedAssignCustomer) {
      showSystemNotice('error', 'Please select a customer')
      return
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedAssignCustomer.customer_id}/assign-off-site`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        setShowAddOffSiteModal(false)
        setSelectedAssignCustomer(null)
        setAssignCustomerSearch('')
        setAssignCustomerResults([])
        fetchSummary()
        fetchCustomers()
        showSystemNotice('success', 'Customer assigned to Off Site successfully')
      } else {
        showSystemNotice('error', 'Error assigning customer: ' + data.message)
      }
    } catch (error) {
      console.error('Error assigning customer to Off Site:', error)
      showSystemNotice('error', 'Error assigning customer to Off Site')
    }
  }

  const handleManageVisits = (customer) => {
    setSelectedCustomer(customer)
    fetchCustomerVisits(customer.customer_id)
    setShowManageVisitsModal(true)
  }

  const handleDeleteVisit = async (visitId) => {
    if (!selectedCustomer) return
    const visit = customerVisits.find(v => v.visit_id === visitId)
    if (!visit) return
    setSelectedVisitForDelete(visit)
    setShowDeleteVisitModal(true)
  }

  const confirmDeleteVisit = async () => {
    if (!selectedCustomer || !selectedVisitForDelete) return
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/${selectedCustomer.customer_id}/visits/${selectedVisitForDelete.visit_id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchCustomerVisits(selectedCustomer.customer_id)
        fetchSummary()
        fetchCustomers()
        setShowDeleteVisitModal(false)
        setSelectedVisitForDelete(null)
        showSystemNotice('success', 'Visit deleted successfully')
      } else {
        showSystemNotice('error', 'Error deleting visit: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting visit:', error)
      showSystemNotice('error', 'Error deleting visit')
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Customer Management</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowPromoModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
              type="button"
            >
              <Percent size={18} />
              Manage Promo & Discount
            </button>
            {activeSegment === 'all' && (
              <button
                onClick={handleAddCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
                type="button"
              >
                <Plus size={18} />
                New Customer
              </button>
            )}
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

        {/* Summary Box */}
        <div className={`grid ${activeSegment === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'} gap-4 mb-6`}>
          {activeSegment === 'all' && (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total_customers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">All Revenue</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(summary.total_revenue)}</p>
                  </div>
                  <Coins className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </>
          )}
          {activeSegment === 'in_studio' && (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total In Studio Customer</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total_customers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total In Studio Revenue</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(summary.total_revenue)}</p>
                  </div>
                  <Coins className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Visits</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total_visits}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </>
          )}
          {activeSegment === 'off_site' && (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Off Site Customer</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total_customers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Off Site Revenue</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(summary.total_revenue)}</p>
                  </div>
                  <Coins className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Booths</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.total_booths || 0}</p>
                  </div>
                  <Building className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveSegment('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeSegment === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            All Customers
          </button>
          <button
            onClick={() => setActiveSegment('in_studio')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeSegment === 'in_studio'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            In Studio
          </button>
          <button
            onClick={() => setActiveSegment('off_site')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeSegment === 'off_site'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Off Site
          </button>
        </div>

        {/* Search with Add Button */}
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {activeSegment === 'in_studio' && (
            <button
              onClick={() => setShowAddInStudioModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              + Add In Studio
            </button>
          )}
          {activeSegment === 'off_site' && (
            <button
              onClick={() => setShowAddOffSiteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              + Add Off-Site
            </button>
          )}
        </div>

        {/* Customers Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {activeSegment === 'all' && 'Customers Overview'}
              {activeSegment === 'in_studio' && 'In Studio Customers Overview'}
              {activeSegment === 'off_site' && 'Off-Site Customers Overview'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAccountingReportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Download size={16} />
                Accounting Report
              </button>
              <button
                onClick={handleOpenCsvFilter}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Download size={16} />
                Download Excel
              </button>
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
              <tr>
                {activeSegment === 'all' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Spending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {activeSegment === 'in_studio' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Visit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Spending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </>
                )}
                {activeSegment === 'off_site' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Off-Site</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Booking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Spending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {customers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    onDoubleClick={() => handleViewCustomer(customer)}
                  >
                    {customer.name}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    onDoubleClick={() => handleWhatsAppClick(customer.phone_number)}
                  >
                    {customer.phone_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.email || 'N/A'}</td>
                  {activeSegment === 'all' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency((parseFloat(customer.in_studio_spending) || 0) + (parseFloat(customer.off_site_spending) || 0))}</td>
                  )}
                  {activeSegment === 'in_studio' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.in_studio_visits || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(customer.in_studio_last_visit)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(customer.in_studio_spending || 0)}</td>
                    </>
                  )}
                  {activeSegment === 'off_site' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{customer.total_off_site || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(customer.last_booking)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(customer.off_site_spending || 0)}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      {activeSegment === 'all' && (
                        <>
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {activeSegment === 'in_studio' && (
                        <>
                          <button
                            onClick={() => handleAddVisit(customer)}
                            className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                            title="Add Visit"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {activeSegment === 'off_site' && (
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Delete"
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCustomers)} of {totalCustomers} customers
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

        {/* Add Customer Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeAddModal)}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
              <form onSubmit={handleSubmitAdd} noValidate>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
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
                    Add Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Customer Modal */}
        {showViewModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeViewModal)}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">Customer Name:</p>
                  <p className="text-sm text-gray-900">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Phone Number:</p>
                  <p 
                    className="text-sm text-gray-900 cursor-pointer hover:text-blue-600"
                    onDoubleClick={() => handleWhatsAppClick(selectedCustomer.phone_number)}
                  >
                    {selectedCustomer.phone_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Email:</p>
                  <p className="text-sm text-gray-900">{selectedCustomer.email || 'N/A'}</p>
                </div>
                {activeSegment === 'in_studio' && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Visits:</p>
                      <p className="text-sm text-gray-900">{selectedCustomer.in_studio_visits || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Visit Date:</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedCustomer.in_studio_last_visit)}</p>
                    </div>
                  </>
                )}
                {activeSegment === 'off_site' && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Bookings:</p>
                      <p className="text-sm text-gray-900">{customerEvents.length}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Booking:</p>
                      <p className="text-sm text-gray-900">{customerEvents.length > 0 ? formatDate(customerEvents[0].start_date) : 'N/A'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Spending:</p>
                  <p className="text-sm text-gray-900">
                    {activeSegment === 'all' 
                      ? formatCurrency((parseFloat(selectedCustomer.in_studio_spending) || 0) + (parseFloat(selectedCustomer.off_site_spending) || 0))
                      : activeSegment === 'in_studio'
                      ? formatCurrency(parseFloat(selectedCustomer.in_studio_spending) || 0)
                      : formatCurrency(parseFloat(selectedCustomer.off_site_spending) || 0)
                    }
                  </p>
                </div>
              </div>
              
              {activeSegment === 'in_studio' && (
                <>
                  {/* Visit History */}
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3">Visit History</h3>
                    {customerVisits.length > 0 ? (
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {customerVisits.map((visit) => (
                              <tr key={visit.visit_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(visit.visit_date)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{visit.package_name}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {visit.person_quantity} persons, {visit.duration} mins, {visit.paper_quantity} paper
                                  {visit.with_photographer ? ' (+ Photog)' : ''}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(visit.spending)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditVisit(visit)}
                                      className="p-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                      title="Edit"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteVisit(visit.visit_id)}
                                      className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No visit history available</p>
                    )}
                  </div>
                </>
              )}

              {activeSegment === 'off_site' && (
                <>
                  {/* Event History */}
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3">Event History</h3>
                    {customerEvents.length > 0 ? (
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spending (Revenue)</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {customerEvents.map((event) => (
                              <tr key={event.event_id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(event.start_date)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(event.expected_revenue)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{event.event_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No event history available</p>
                    )}
                  </div>
                </>
              )}

              {activeSegment === 'all' && (
                <>
                  {/* Combined History */}
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3">Customer History</h3>
                    {(customerVisits.length > 0 || customerEvents.length > 0) ? (
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spending</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {customerVisits.map((visit) => (
                              <tr key={`visit-${visit.visit_id}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">In Studio</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(visit.spending)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">-</td>
                              </tr>
                            ))}
                            {customerEvents.map((event) => (
                              <tr key={`event-${event.event_id}`} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">Off-Site</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(event.expected_revenue)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{event.event_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No history available</p>
                    )}
                  </div>
                </>
              )}
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedCustomer(null)
                    setCustomerVisits([])
                    setCustomerEvents([])
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeEditModal)}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Edit Customer</h2>
              <form onSubmit={handleSubmitEdit} noValidate>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
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
                    Update Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Customer Modal */}
        {showDeleteModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Delete Customer</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete customer "{selectedCustomer.name}"? This action cannot be undone.
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

        {/* Select Package Modal */}
        {showSelectPackageModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-65 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-300"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowSelectPackageModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-4xl shadow-2xl border border-gray-100 dark:border-slate-700 transform scale-100 transition-all duration-300">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Select Package for {selectedCustomer.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose the perfect photo session style for this customer visit</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Snap Photobox Card */}
                <div 
                  onClick={() => handleSelectPackage('Snap Photobox')}
                  className="group relative flex flex-col justify-between border-2 border-blue-100 p-6 rounded-2xl hover:border-blue-500 cursor-pointer transition-all duration-300 bg-blue-50/40 hover:bg-blue-50/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold tracking-widest text-blue-600 uppercase bg-blue-100 px-3 py-1 rounded-full">BOX SESSION</span>
                    </div>
                    <h3 className="font-extrabold text-blue-900 text-xl mb-1">Snap Photobox</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-2xl font-black text-blue-950">Rp 20.000</span>
                      <span className="text-xs text-gray-500">/ person</span>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'Max 5 persons',
                        '7 mins duration',
                        'FREE 1 print',
                        'Soft files included'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                          <div className="p-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <button className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md group-hover:shadow-lg transition duration-200 text-sm flex items-center justify-center gap-1">
                      Choose Photobox
                    </button>
                  </div>
                </div>

                {/* Snap Self Photo Card */}
                <div 
                  onClick={() => handleSelectPackage('Snap Self Photo')}
                  className="group relative flex flex-col justify-between border-2 border-purple-100 p-6 rounded-2xl hover:border-purple-500 cursor-pointer transition-all duration-300 bg-purple-50/40 hover:bg-purple-50/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold tracking-widest text-purple-600 uppercase bg-purple-100 px-3 py-1 rounded-full">SELF SESSION</span>
                    </div>
                    <h3 className="font-extrabold text-purple-900 text-xl mb-1">Snap Self Photo</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-2xl font-black text-purple-950">Rp 60.000</span>
                      <span className="text-xs text-gray-500">/ 2 persons</span>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'Max 8 persons',
                        '15 mins duration',
                        'FREE 2 prints',
                        'Soft files included'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                          <div className="p-0.5 rounded-full bg-purple-100 text-purple-600 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <button className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md group-hover:shadow-lg transition duration-200 text-sm flex items-center justify-center gap-1">
                      Choose Self Photo
                    </button>
                  </div>
                </div>

                {/* Snap Pas Photo Card */}
                <div 
                  onClick={() => handleSelectPackage('Snap Pas Photo')}
                  className="group relative flex flex-col justify-between border-2 border-emerald-100 p-6 rounded-2xl hover:border-emerald-500 cursor-pointer transition-all duration-300 bg-emerald-50/40 hover:bg-emerald-50/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase bg-emerald-100 px-3 py-1 rounded-full">PAS PHOTO</span>
                    </div>
                    <h3 className="font-extrabold text-emerald-900 text-xl mb-1">Snap Pas Photo</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-2xl font-black text-emerald-950">Rp 35.000</span>
                      <span className="text-xs text-gray-500">/ person</span>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'Strictly 1 person',
                        '7 mins duration',
                        'Various sizes print',
                        'Soft files included'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                          <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <button className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md group-hover:shadow-lg transition duration-200 text-sm flex items-center justify-center gap-1">
                      Choose Pas Photo
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-8 border-t border-gray-100 dark:border-slate-700 pt-6">
                <button
                  type="button"
                  onClick={() => setShowSelectPackageModal(false)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-gray-900 dark:hover:text-white transition duration-150 text-sm shadow-sm"
                >
                  Cancel & Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Package Configuration Modal */}
        {showPackageConfigModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closePackageConfigModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
              <h2 className="text-xl font-bold mb-4 flex-shrink-0 text-gray-800 dark:text-white">{isEditingVisit ? 'Edit' : 'Add'} {visitFormData.package_name}</h2>
              <form onSubmit={handleSubmitAddVisit} noValidate className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visit Date *</label>
                  <input
                    type="date"
                    value={visitFormData.visit_date}
                    onChange={(e) => handleUpdateVisitForm({ ...visitFormData, visit_date: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.visit_date ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                  />
                  {formErrors.visit_date && <p className="text-red-500 text-xs mt-1">{formErrors.visit_date}</p>}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Person Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        let min = visitFormData.package_name === 'Snap Self Photo' ? 2 : 1
                        if (visitFormData.person_quantity > min) {
                          const newData = { ...visitFormData, person_quantity: visitFormData.person_quantity - 1 }
                          handleUpdateVisitForm(newData)
                        }
                      }}
                      className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">{visitFormData.person_quantity}</span>
                    <button
                      type="button"
                      disabled={
                        (visitFormData.package_name === 'Snap Photobox' && visitFormData.person_quantity >= 5) ||
                        (visitFormData.package_name === 'Snap Self Photo' && visitFormData.person_quantity >= 8) ||
                        (visitFormData.package_name === 'Snap Pas Photo')
                      }
                      onClick={() => {
                        const newData = { ...visitFormData, person_quantity: visitFormData.person_quantity + 1 }
                        handleUpdateVisitForm(newData)
                      }}
                      className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-30"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        let step = visitFormData.package_name === 'Snap Self Photo' ? 15 : 7
                        if (visitFormData.duration > step) {
                          const newData = { ...visitFormData, duration: visitFormData.duration - step }
                          handleUpdateVisitForm(newData)
                        }
                      }}
                      className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">{visitFormData.duration}</span>
                    <button
                      type="button"
                      onClick={() => {
                        let step = visitFormData.package_name === 'Snap Self Photo' ? 15 : 7
                        const newData = { ...visitFormData, duration: visitFormData.duration + step }
                        handleUpdateVisitForm(newData)
                      }}
                      className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="mb-4 relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo Paper Type</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-sm text-gray-900 dark:text-white">
                      {visitFormData.paper_type_name || 'None selected'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInventorySearch(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Search
                    </button>
                  </div>
                  {showInventorySearch && (
                    <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl p-2">
                      <input
                        type="text"
                        placeholder="Type item name..."
                        autoFocus
                        value={inventorySearch}
                        onChange={(e) => handleInventorySearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto">
                        {inventoryResults.map(item => (
                          <div
                            key={item.item_id}
                            onClick={() => handleSelectPaper(item)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white"
                          >
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Stock: {item.stock_quantity}</div>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => setShowInventorySearch(false)}
                        className="w-full mt-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo Paper Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        let min = visitFormData.package_name === 'Snap Self Photo' ? 2 : 1
                        if (visitFormData.paper_quantity > min) {
                          const newData = { ...visitFormData, paper_quantity: visitFormData.paper_quantity - 1 }
                          handleUpdateVisitForm(newData)
                        }
                      }}
                      className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">{visitFormData.paper_quantity}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newData = { ...visitFormData, paper_quantity: visitFormData.paper_quantity + 1 }
                        handleUpdateVisitForm(newData)
                      }}
                      className="p-1 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  {visitFormData.paper_type_item_id && visitFormData.paper_quantity > visitFormData.paper_stock && (
                    <p className="text-red-500 dark:text-red-400 text-xs mt-1 italic">Quantity insufficient (Max: {visitFormData.paper_stock})</p>
                  )}
                </div>

                {visitFormData.package_name === 'Snap Pas Photo' && (
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="with_photog"
                      checked={visitFormData.with_photographer}
                      onChange={(e) => {
                        const newData = { ...visitFormData, with_photographer: e.target.checked }
                        handleUpdateVisitForm(newData)
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor="with_photog" className="text-sm font-medium text-gray-700">With photographer (+Rp 50.000)</label>
                  </div>
                )}

                {/* Coupon Code Input */}
                <div className="mb-4 border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promo / Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="E.g. DISKON10"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      disabled={!!activePromo}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm uppercase disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-gray-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                    {activePromo ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyCoupon}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  {couponError && <p className="text-red-500 dark:text-red-400 text-xs mt-1 font-semibold">{couponError}</p>}
                  {couponSuccess && <p className="text-green-600 dark:text-green-400 text-xs mt-1 font-semibold">{couponSuccess}</p>}
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateSpending(visitFormData))}</span>
                  </div>
                  {Number(visitFormData.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                      <span>Discount ({visitFormData.promo_code}):</span>
                      <span>-{formatCurrency(visitFormData.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-2 mt-2">
                    <span className="text-blue-800 dark:text-blue-300 font-bold">Final Total:</span>
                    <span className="text-xl font-bold text-blue-900 dark:text-blue-200">{formatCurrency(visitFormData.spending)}</span>
                  </div>
                </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPackageConfigModal(false)
                      setFormErrors({})
                      if (!isEditingVisit) setShowSelectPackageModal(true)
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                  >
                    {isEditingVisit ? 'Update' : 'Submit'} Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add In Studio Modal */}
        {showAddInStudioModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeAddInStudioModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Add Customer to In Studio</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={assignCustomerSearch}
                  onChange={(e) => handleAssignCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="Search customer name..."
                />
                {assignCustomerResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-slate-800">
                    {assignCustomerResults.map((customer) => (
                      <div
                        key={customer.customer_id}
                        onClick={() => handleAssignCustomerSelect(customer)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-700 last:border-b-0 text-gray-900 dark:text-white"
                      >
                        <p className="font-medium text-gray-800 dark:text-white">{customer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone_number || 'N/A'} - {customer.email || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedAssignCustomer && (
                <>
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="font-medium text-gray-800 dark:text-white">{selectedAssignCustomer.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone: {selectedAssignCustomer.phone_number || 'N/A'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email: {selectedAssignCustomer.email || 'N/A'}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowAddInStudioModal(false)
                        setSelectedAssignCustomer(null)
                        setAssignCustomerSearch('')
                        setAssignCustomerResults([])
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignToInStudio}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Assign to In Studio
                    </button>
                  </div>
                </>
              )}
              {!selectedAssignCustomer && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddInStudioModal(false)
                      setSelectedAssignCustomer(null)
                      setAssignCustomerSearch('')
                      setAssignCustomerResults([])
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Off Site Modal */}
        {showAddOffSiteModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeAddOffSiteModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Add Customer to Off Site</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={assignCustomerSearch}
                  onChange={(e) => handleAssignCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="Search customer name..."
                />
                {assignCustomerResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-slate-800">
                    {assignCustomerResults.map((customer) => (
                      <div
                        key={customer.customer_id}
                        onClick={() => handleAssignCustomerSelect(customer)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-200 dark:border-slate-700 last:border-b-0 text-gray-900 dark:text-white"
                      >
                        <p className="font-medium text-gray-800 dark:text-white">{customer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone_number || 'N/A'} - {customer.email || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedAssignCustomer && (
                <>
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <p className="font-medium text-gray-800 dark:text-white">{selectedAssignCustomer.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone: {selectedAssignCustomer.phone_number || 'N/A'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email: {selectedAssignCustomer.email || 'N/A'}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowAddOffSiteModal(false)
                        setSelectedAssignCustomer(null)
                        setAssignCustomerSearch('')
                        setAssignCustomerResults([])
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignToOffSite}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Assign to Off Site
                    </button>
                  </div>
                </>
              )}
              {!selectedAssignCustomer && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddOffSiteModal(false)
                      setSelectedAssignCustomer(null)
                      setAssignCustomerSearch('')
                      setAssignCustomerResults([])
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Visits Modal */}
        {showManageVisitsModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeManageVisitsModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Manage Visits for {selectedCustomer.name}</h2>
              {customerVisits.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 mb-4">No visits recorded yet.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {customerVisits.map((visit) => (
                    <div key={visit.visit_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{formatDate(visit.visit_date)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Spending: {formatCurrency(visit.spending)}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteVisit(visit.visit_id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowManageVisitsModal(false)
                    setSelectedCustomer(null)
                    setCustomerVisits([])
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Visit Modal */}
        {showDeleteVisitModal && selectedVisitForDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeDeleteVisitModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Delete Visit</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete the visit from {formatDate(selectedVisitForDelete.visit_date)}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteVisitModal(false)
                    setSelectedVisitForDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteVisit}
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

        {/* CSV Filter Modal */}
        <CsvFilterModal
          isOpen={showCsvFilterModal}
          onClose={() => setShowCsvFilterModal(false)}
          onExport={downloadCSV}
          allData={csvFilter.allData}
          onAllDataChange={(checked) =>
            setCsvFilter({
              allData: checked,
              customerType: 'all'
            })
          }
          title="Download Excel Filter"
          exportLabel="Download Excel"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Customer Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {CSV_CUSTOMER_TYPES.map((type) => (
                <label key={type.value} className="flex items-center">
                  <input
                    type="radio"
                    name="customerType"
                    checked={csvFilter.customerType === type.value}
                    onChange={() => setCsvFilter({ allData: false, customerType: type.value })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CsvFilterModal>

        {/* Accounting Report Modal */}
        <AccountingReportModal
          isOpen={showAccountingReportModal}
          onClose={() => setShowAccountingReportModal(false)}
          onExport={downloadAccountingReport}
        />

        {/* Promotions Modal Overlay */}
        <Promotions
          isOpen={showPromoModal}
          onClose={() => setShowPromoModal(false)}
        />
      </main>
      <SnapFunny />
    </div>
  )
}

export default Customers
