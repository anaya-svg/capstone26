import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, Package, AlertTriangle, TrendingDown, Plus, Download, List, X, Upload } from 'lucide-react'
import { exportToExcel } from '../utils/exportExcel'
import CsvFilterModal from '../components/CsvFilterModal'
import { useTheme } from '../context/ThemeContext'

function Inventory() {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')

  const [inventory, setInventory] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [stockStatusFilter, setStockStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalInventory, setTotalInventory] = useState(0)
  const [summary, setSummary] = useState({ total_items: 0, low_stock_items: 0, in_stock_items: 0, drafted_items: 0 })
  const [lowStockItems, setLowStockItems] = useState([])
  const [autoDraftLoadingItemId, setAutoDraftLoadingItemId] = useState(null)
  const [showAutoDraftModal, setShowAutoDraftModal] = useState(false)
  const [selectedAutoDraftItem, setSelectedAutoDraftItem] = useState(null)
  const [autoDraftQtyInput, setAutoDraftQtyInput] = useState('')
  const [autoDraftNotice, setAutoDraftNotice] = useState({ type: '', message: '' })
  const [uoms, setUoms] = useState([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [showUndraftModal, setShowUndraftModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const [formData, setFormData] = useState({
    item_name: '',
    stock_quantity: '',
    minimum_stock: '',
    uom_id: '',
    vendor: '',
    vendor_id: null,
    attachment: ''
  })

  const [showAddUOMModal, setShowAddUOMModal] = useState(false)
  const [showUOMOverviewModal, setShowUOMOverviewModal] = useState(false)
  const [editingUom, setEditingUom] = useState(null)
  const [uomSearchTerm, setUomSearchTerm] = useState('')
  const [uomSearchResults, setUomSearchResults] = useState([])
  const [newUOMName, setNewUOMName] = useState('')
  const [showAddVendorModal, setShowAddVendorModal] = useState(false)
  const [showVendorOverviewModal, setShowVendorOverviewModal] = useState(false)
  const [showVendorDeleteErrorModal, setShowVendorDeleteErrorModal] = useState(false)
  const [vendorUsageDetails, setVendorUsageDetails] = useState(null)
  const [editingVendor, setEditingVendor] = useState(null)
  const [vendorDeleteError, setVendorDeleteError] = useState(null)
  const [vendors, setVendors] = useState([])
  const [vendorSearchTerm, setVendorSearchTerm] = useState('')
  const [vendorSearchResults, setVendorSearchResults] = useState([])
  const [formErrors, setFormErrors] = useState({})
  const [showMissingDataModal, setShowMissingDataModal] = useState(false)
  const [showCloseAddDraftPromptModal, setShowCloseAddDraftPromptModal] = useState(false)
  const [isVendorEditable, setIsVendorEditable] = useState(true)

  const [newVendorFormData, setNewVendorFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone_number: '',
    email: '',
    city: ''
  })

  const [actionConfirmModal, setActionConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [showCsvFilterModal, setShowCsvFilterModal] = useState(false)
  const [csvFilter, setCsvFilter] = useState({
    allData: true,
    stockStatuses: []
  })

  const CSV_STOCK_STATUSES = [
    { value: 'in_stock', label: 'In Stock' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' }
  ]

  const showSystemNotice = (type, message) => {
    setAutoDraftNotice({ type, message })
  }

  const handleBackdropClose = (e, onClose) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const requestCloseAddModal = () => {
    setShowCloseAddDraftPromptModal(true)
  }

  const closeTopModal = () => {
    if (showCsvFilterModal) {
      setShowCsvFilterModal(false)
      return true
    }
    if (showCloseAddDraftPromptModal) {
      setShowCloseAddDraftPromptModal(false)
      return true
    }
    if (actionConfirmModal.isOpen) {
      closeActionConfirmModal()
      return true
    }
    if (showAutoDraftModal) {
      closeAutoDraftModal()
      return true
    }
    if (showVendorDeleteErrorModal) {
      setShowVendorDeleteErrorModal(false)
      return true
    }
    if (showVendorOverviewModal) {
      setShowVendorOverviewModal(false)
      setEditingVendor(null)
      return true
    }
    if (showAddVendorModal) {
      setShowAddVendorModal(false)
      return true
    }
    if (showUOMOverviewModal) {
      setShowUOMOverviewModal(false)
      setEditingUom(null)
      return true
    }
    if (showAddUOMModal) {
      setShowAddUOMModal(false)
      setNewUOMName('')
      return true
    }
    if (showUndraftModal) {
      setShowUndraftModal(false)
      return true
    }
    if (showDraftModal) {
      setShowDraftModal(false)
      return true
    }
    if (showDeleteModal) {
      setShowDeleteModal(false)
      return true
    }
    if (showEditModal) {
      setShowEditModal(false)
      return true
    }
    if (showViewModal) {
      setShowViewModal(false)
      return true
    }
    if (showMissingDataModal) {
      setShowMissingDataModal(false)
      return true
    }
    if (showAddModal) {
      requestCloseAddModal()
      return true
    }
    return false
  }

  const openActionConfirmModal = (title, message, onConfirm) => {
    setActionConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    })
  }

  const closeActionConfirmModal = () => {
    setActionConfirmModal({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: null
    })
  }

  const handleActionConfirm = async () => {
    const action = actionConfirmModal.onConfirm
    closeActionConfirmModal()
    if (action) {
      await action()
    }
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

  const handleOpenCsvFilter = () => {
    setCsvFilter({
      allData: true,
      stockStatuses: []
    })
    setShowCsvFilterModal(true)
  }

  const buildCsvFilterSummary = () => {
    if (csvFilter.allData) return 'All data'
    if (csvFilter.stockStatuses.length) return `Stock Status: ${csvFilter.stockStatuses.map(s => getStockStatusLabel(s)).join(', ')}`
    return 'All data'
  }

  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (!csvFilter.allData && csvFilter.stockStatuses.length) {
        params.append('stock_status', csvFilter.stockStatuses.join(','))
      }
      if (searchTerm) params.append('search', searchTerm)

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/export${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (!data.success) {
        showSystemNotice('error', 'Failed to fetch CSV data')
        return
      }

      const headers = ['Item Name', 'Category', 'Stock Quantity', 'Minimum Stock', 'UOM', 'Vendor (Last used)', 'Stock Status', 'Last Update']
      const rows = data.data.map((item) => [
        item.item_name,
        item.category_name || 'N/A',
        item.stock_quantity,
        item.minimum_stock,
        item.uom_name || 'N/A',
        item.last_procurement_vendor || item.vendor || 'N/A',
        getStockStatusLabel(item.stock_status),
        formatDate(item.last_update)
      ])

      await exportToExcel(
        headers,
        rows,
        'Recap Report - Inventory',
        'inventory',
        { columnWidths: [25, 15, 15, 15, 10, 20, 15, 18], filterSummary: buildCsvFilterSummary() }
      )

      setShowCsvFilterModal(false)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showSystemNotice('error', 'Error exporting CSV')
    }
  }

  const getStockStatusBadge = (status) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800'
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800'
      case 'out_of_stock':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const openAutoDraftModal = (item) => {
    if (!item?.item_id) return

    const currentStock = Number(item.stock_quantity) || 0
    const minimumStock = Number(item.minimum_stock) || 0
    const recommendedQty = Math.max(minimumStock - currentStock, 1)
    setSelectedAutoDraftItem(item)
    setAutoDraftQtyInput(String(recommendedQty))
    setShowAutoDraftModal(true)
  }

  const closeAutoDraftModal = () => {
    setShowAutoDraftModal(false)
    setSelectedAutoDraftItem(null)
    setAutoDraftQtyInput('')
  }

  const handleCreateAutoDraft = async () => {
    if (!selectedAutoDraftItem?.item_id) return

    const requestedQty = Number(autoDraftQtyInput)
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      showSystemNotice('error', 'Quantity harus diisi angka valid lebih dari 0.')
      return
    }

    setAutoDraftLoadingItemId(selectedAutoDraftItem.item_id)

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/auto-draft-from-inventory/${selectedAutoDraftItem.item_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify({
          requested_by: userName || 'System Auto Draft',
          suggested_quantity: Math.floor(requestedQty)
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        showSystemNotice('error', data.message || 'Gagal membuat draft procurement otomatis.')
        return
      }

      showSystemNotice('success', `Draft procurement ${data.data?.pr_id} berhasil dibuat untuk ${data.data?.item_name}.`)
      closeAutoDraftModal()
      fetchSummary()
      fetchInventory()
      fetchLowStockItems()
    } catch (error) {
      console.error('Error creating auto draft procurement:', error)
      showSystemNotice('error', 'Terjadi error saat membuat draft procurement otomatis.')
    } finally {
      setAutoDraftLoadingItemId(null)
    }
  }

  const getStockStatusLabel = (status) => {
    switch (status) {
      case 'in_stock':
        return 'In Stock'
      case 'low_stock':
        return 'Low Stock'
      case 'out_of_stock':
        return 'No Stock'
      default:
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
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
    fetchUoms()
    fetchVendors()
    fetchSummary()
    fetchInventory()
    fetchLowStockItems()
  }, [navigate, statusFilter, stockStatusFilter, searchTerm, currentPage, itemsPerPage])

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
    showCloseAddDraftPromptModal,
    actionConfirmModal.isOpen,
    showAutoDraftModal,
    showVendorDeleteErrorModal,
    showVendorOverviewModal,
    showAddVendorModal,
    showUOMOverviewModal,
    showAddUOMModal,
    showUndraftModal,
    showDraftModal,
    showDeleteModal,
    showEditModal,
    showViewModal,
    showMissingDataModal,
    showAddModal
  ])

  const fetchUoms = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/uom`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setUoms(data.data)
      }
    } catch (error) {
      console.error('Error fetching UOMs:', error)
    }
  }

  const fetchVendors = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vendors`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setVendors(data.data)
      }
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/summary`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Error fetching inventory summary:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter) params.append('status', statusFilter)
      if (stockStatusFilter) params.append('stock_status', stockStatusFilter)
      params.append('page', currentPage)
      params.append('limit', itemsPerPage)
      
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory?${params.toString()}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setInventory(data.data)
        setTotalInventory(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

  const fetchLowStockItems = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const params = new URLSearchParams()
      params.append('status', 'active')
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/low-stock?${params.toString()}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setLowStockItems(data.data)
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error)
    }
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setStockStatusFilter('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleInStockFilter = () => {
    setStatusFilter('active')
    setStockStatusFilter('in_stock')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleLowStockFilter = () => {
    setStatusFilter('active')
    setStockStatusFilter('low_or_out_of_stock')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  const handleAddItem = () => {
    setFormData({ item_name: '', stock_quantity: '', minimum_stock: '', uom_id: '', vendor: '', vendor_id: null, attachment: '' })
    setVendorSearchTerm('')
    setVendorSearchResults([])
    setUomSearchTerm('')
    setUomSearchResults([])
    setFormErrors({})
    setShowAddModal(true)
  }

  const handleViewItem = (item) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    
    const activeVendor = item.last_procurement_vendor || item.vendor || ''
    const existingVendor = vendors.find(v => v.vendor_name === activeVendor)
    
    setFormData({
      item_name: item.item_name,
      stock_quantity: item.stock_quantity.toString(),
      minimum_stock: item.minimum_stock.toString(),
      uom_id: item.uom_id,
      vendor: activeVendor,
      vendor_id: existingVendor ? existingVendor.vendor_id : null,
      attachment: item.attachment || ''
    })
    setVendorSearchTerm(activeVendor)
    setVendorSearchResults([])
    setUomSearchTerm(item.uom_name || '')
    setUomSearchResults([])
    setFormErrors({})
    setIsVendorEditable(!item.last_procurement_gr_id)
    setShowEditModal(true)
  }

  const handleDeleteItem = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleDraftItem = (item) => {
    setSelectedItem(item)
    setShowDraftModal(true)
  }

  const handleUndraftItem = (item) => {
    setSelectedItem(item)
    setShowUndraftModal(true)
  }

  const confirmDraft = async () => {
    if (!selectedItem) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/${selectedItem.item_id}/draft`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setShowDraftModal(false)
        setSelectedItem(null)
        fetchSummary()
        fetchInventory()
        fetchLowStockItems()
      } else {
        showSystemNotice('error', 'Error drafting item: ' + data.message)
      }
    } catch (error) {
      console.error('Error drafting item:', error)
      showSystemNotice('error', 'Error drafting item')
    }
  }

  const confirmUndraft = async () => {
    if (!selectedItem) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/${selectedItem.item_id}/undraft`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setShowUndraftModal(false)
        setSelectedItem(null)
        fetchSummary()
        fetchInventory()
        fetchLowStockItems()
      } else {
        showSystemNotice('error', 'Error undrafting item: ' + data.message)
      }
    } catch (error) {
      console.error('Error undrafting item:', error)
      showSystemNotice('error', 'Error undrafting item')
    }
  }

  const handleAddUOM = async () => {
    if (!newUOMName.trim()) {
      showSystemNotice('error', 'Please enter a UOM name')
      return
    }
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/uom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify({ uom_name: newUOMName })
      })
      const data = await response.json()
      if (data.success) {
        setShowAddUOMModal(false)
        setNewUOMName('')
        fetchUoms()
        showSystemNotice('success', 'UOM added successfully')
      } else {
        showSystemNotice('error', 'Error adding UOM: ' + data.message)
      }
    } catch (error) {
      console.error('Error adding UOM:', error)
      showSystemNotice('error', 'Error adding UOM')
    }
  }

  const handleAddVendor = async () => {
    if (!newVendorFormData.vendor_name.trim()) {
      showSystemNotice('error', 'Please enter a vendor name')
      return
    }
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify(newVendorFormData)
      })
      const data = await response.json()
      if (data.success) {
        setNewVendorFormData({
          vendor_name: '',
          contact_person: '',
          phone_number: '',
          email: '',
          city: ''
        })
        setShowAddVendorModal(false)
        fetchVendors()
        showSystemNotice('success', 'Vendor added successfully')
      } else {
        showSystemNotice('error', 'Error adding vendor: ' + data.message)
      }
    } catch (error) {
      console.error('Error adding vendor:', error)
      showSystemNotice('error', 'Error adding vendor')
    }
  }

  const handleDeleteVendor = async (vendorId) => {
    openActionConfirmModal(
      'Delete Vendor',
      'Are you sure you want to delete this vendor?',
      async () => {
        try {
          const user = JSON.parse(sessionStorage.getItem('user'))
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vendors/${vendorId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.session_token}` }
          })
          const data = await response.json()
          if (data.success) {
            fetchVendors()
            setVendorDeleteError(null)
            showSystemNotice('success', 'Vendor deleted successfully')
          } else {
            if (data.usage) {
              setVendorUsageDetails(data.usage)
              setShowVendorDeleteErrorModal(true)
            } else {
              showSystemNotice('error', 'Error deleting vendor: ' + data.message)
            }
          }
        } catch (error) {
          console.error('Error deleting vendor:', error)
          showSystemNotice('error', 'Error deleting vendor')
        }
      }
    )
  }

  const handleUpdateVendor = async (vendor) => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vendors/${vendor.vendor_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify({
          vendor_name: vendor.vendor_name,
          contact_person: vendor.contact_person,
          phone_number: vendor.phone_number,
          email: vendor.email,
          city: vendor.city
        })
      })
      const data = await response.json()
      if (data.success) {
        setEditingVendor(null)
        fetchVendors()
        showSystemNotice('success', 'Vendor updated successfully')
      } else {
        showSystemNotice('error', 'Error updating vendor: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating vendor:', error)
      showSystemNotice('error', 'Error updating vendor')
    }
  }

  const handlePhoneDoubleClick = (phoneNumber) => {
    if (phoneNumber) {
      const cleanNumber = phoneNumber.replace(/\D/g, '')
      window.open(`https://wa.me/${cleanNumber}`, '_blank')
    }
  }

  const handleVendorSearch = (term) => {
    setVendorSearchTerm(term)
    setFormData({ ...formData, vendor: term, vendor_id: null })
    if (term.trim() === '') {
      setVendorSearchResults([])
      return
    }
    const filtered = vendors.filter(vendor =>
      vendor.vendor_name.toLowerCase().includes(term.toLowerCase())
    )
    setVendorSearchResults(filtered)
  }

  const handleVendorSelect = (vendor) => {
    setFormData({ ...formData, vendor: vendor.vendor_name, vendor_id: vendor.vendor_id })
    setVendorSearchTerm(vendor.vendor_name)
    setVendorSearchResults([])
  }

  const handleDeleteUom = async (uomId) => {
    openActionConfirmModal(
      'Delete UOM',
      'Are you sure you want to delete this UOM?',
      async () => {
        try {
          const user = JSON.parse(sessionStorage.getItem('user'))
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/uom/${uomId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.session_token}` }
          })
          const data = await response.json()
          if (data.success) {
            fetchUoms()
            showSystemNotice('success', 'UOM deleted successfully')
          } else {
            showSystemNotice('error', 'Error deleting UOM: ' + data.message)
          }
        } catch (error) {
          console.error('Error deleting UOM:', error)
          showSystemNotice('error', 'Error deleting UOM')
        }
      }
    )
  }

  const handleUpdateUom = async (uom) => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/uom/${uom.uom_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.session_token}` },
        body: JSON.stringify({ uom_name: uom.uom_name })
      })
      const data = await response.json()
      if (data.success) {
        setEditingUom(null)
        fetchUoms()
        showSystemNotice('success', 'UOM updated successfully')
      } else {
        showSystemNotice('error', 'Error updating UOM: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating UOM:', error)
      showSystemNotice('error', 'Error updating UOM')
    }
  }

  const handleUomSearch = (term) => {
    setUomSearchTerm(term)
    setFormData({ ...formData, uom_id: null })
    if (term.trim() === '') {
      setUomSearchResults([])
      return
    }
    const filtered = uoms.filter(uom =>
      uom.uom_name.toLowerCase().includes(term.toLowerCase())
    )
    setUomSearchResults(filtered)
  }

  const handleUomSelect = (uom) => {
    setFormData({ ...formData, uom_id: uom.uom_id })
    setUomSearchTerm(uom.uom_name)
    setUomSearchResults([])
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.item_name) {
      errors.item_name = 'Item name is required'
    }
    if (!formData.minimum_stock) {
      errors.minimum_stock = 'Minimum stock is required'
    }
    if (!uomSearchTerm.trim()) {
      errors.uom_id = 'UOM is required'
    } else if (!formData.uom_id) {
      errors.uom_id = 'This data doesn\'t exist. Click here'
    }
    if (vendorSearchTerm.trim() && !formData.vendor_id) {
      errors.vendor = 'This data doesn\'t exist. Click here'
    }
    
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    
    return true
  }

  const handleSubmitAdd = async (e, customStatus = 'active') => {
    if (e) e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const formDataObj = new FormData()
      formDataObj.append('item_name', formData.item_name)
      formDataObj.append('category_id', '1')
      formDataObj.append('stock_quantity', formData.stock_quantity === '' ? 0 : formData.stock_quantity)
      formDataObj.append('minimum_stock', formData.minimum_stock === '' ? 0 : formData.minimum_stock)
      formDataObj.append('uom_id', formData.uom_id)
      formDataObj.append('vendor', formData.vendor)
      formDataObj.append('status', customStatus)
      if (formData.attachment) {
        formDataObj.append('attachment', formData.attachment)
      }

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: formDataObj
      })

      const data = await response.json()
      if (data.success) {
        setShowAddModal(false)
        fetchSummary()
        fetchInventory()
        fetchLowStockItems()
      } else {
        showSystemNotice('error', data.message === 'Item name already exists' ? 'This item already exists' : 'Error creating inventory item: ' + data.message)
      }
    } catch (error) {
      console.error('Error creating inventory item:', error)
      showSystemNotice('error', 'Error creating inventory item')
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    console.log('Frontend Debug - stock_quantity:', formData.stock_quantity, 'minimum_stock:', formData.minimum_stock, 'type:', typeof formData.stock_quantity)

    try {
      const formDataObj = new FormData()
      formDataObj.append('item_name', formData.item_name)
      formDataObj.append('category_id', '1')
      formDataObj.append('stock_quantity', Number(formData.stock_quantity === '' ? 0 : formData.stock_quantity))
      formDataObj.append('minimum_stock', Number(formData.minimum_stock === '' ? 0 : formData.minimum_stock))
      formDataObj.append('uom_id', formData.uom_id)
      formDataObj.append('vendor', formData.vendor)
      if (formData.attachment && typeof formData.attachment !== 'string') {
        formDataObj.append('attachment', formData.attachment)
      }

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/${selectedItem.item_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: formDataObj
      })

      const data = await response.json()
      if (data.success) {
        setShowEditModal(false)
        fetchSummary()
        fetchInventory()
        fetchLowStockItems()
      } else {
        showSystemNotice('error', data.message === 'Item name already exists' ? 'This item already exists' : 'Error updating inventory item: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating inventory item:', error)
      showSystemNotice('error', 'Error updating inventory item')
    }
  }

  const confirmDelete = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/${selectedItem.item_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })

      const data = await response.json()
      if (data.success) {
        setShowDeleteModal(false)
        fetchSummary()
        fetchInventory()
        fetchLowStockItems()
      } else {
        showSystemNotice('error', 'Error deleting inventory item: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error)
      showSystemNotice('error', 'Error deleting inventory item')
    }
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalInventory / itemsPerPage)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className={`flex-1 p-8 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
          >
            <Plus size={18} />
            New Item
          </button>
        </div>

        {autoDraftNotice.message && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${autoDraftNotice.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' : 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'}`}>
            <div className="flex items-center justify-between gap-3">
              <span>{autoDraftNotice.message}</span>
              <button
                onClick={() => setAutoDraftNotice({ type: '', message: '' })}
                className="text-xs underline"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards - Clickable Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            onClick={() => handleStatusFilter('active')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'active' && stockStatusFilter === '' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">All Supplies</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{Number(summary.in_stock_items) + Number(summary.low_stock_items)}</p>
          </div>
          <div
            onClick={() => handleInStockFilter()}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'active' && stockStatusFilter === 'in_stock' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">In Stock</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.in_stock_items}</p>
          </div>
          <div
            onClick={() => handleLowStockFilter()}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'active' && stockStatusFilter === 'low_or_out_of_stock' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Low Stock</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.low_stock_items}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('drafted')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'drafted' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Drafted</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{summary.drafted_items}</p>
          </div>
        </div>

        {/* Low Stock Reminder */}
        {lowStockItems.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">Low Stock Alert - Restock Needed</h3>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {lowStockItems.map((item) => (
                <div key={item.item_id} className="flex justify-between items-center bg-white dark:bg-slate-700 p-2 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{item.item_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.uom_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">{item.stock_quantity} / {item.minimum_stock}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current / Min</p>
                    </div>
                    <button
                      onClick={() => openAutoDraftModal(item)}
                      disabled={autoDraftLoadingItemId === item.item_id}
                      className="px-2 py-1 text-[11px] font-medium bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Auto Draft Procurement"
                    >
                      {autoDraftLoadingItemId === item.item_id ? 'Creating...' : 'Auto Draft'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {lowStockItems.length > 3 && (
              <p className="text-xs text-orange-600 mt-1 text-center italic">Scroll down to see more</p>
            )}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search supplies..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Inventory Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Inventory Overview</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVendorOverviewModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <List size={16} />
                All Vendors
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Update</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {inventory.map((item) => (
                <tr key={item.item_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.item_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.stock_quantity} {item.uom_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockStatusBadge(item.stock_status)}`}>
                      {getStockStatusLabel(item.stock_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(item.last_update)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewItem(item)}
                        className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      {item.status === 'active' ? (
                        <>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDraftItem(item)}
                            className="p-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-500"
                            title="Draft"
                          >
                            <Package size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUndraftItem(item)}
                            className="p-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                            title="Undraft"
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalInventory)} of {totalInventory} items
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

        {/* Add Item Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, requestCloseAddModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Add New Item</h2>
              <form onSubmit={handleSubmitAdd} noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.item_name && <p className="text-red-500 text-xs mt-1">{formErrors.item_name}</p>}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Stock *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.minimum_stock ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.minimum_stock && <p className="text-red-500 text-xs mt-1">{formErrors.minimum_stock}</p>}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UOM *</label>
                    <input
                      type="text"
                      value={uomSearchTerm}
                      onChange={(e) => handleUomSearch(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.uom_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      placeholder="Search UOM..."
                    />
                    {uomSearchResults.length > 0 && (
                      <div className="mt-1 border border-gray-300 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-slate-700">
                        {uomSearchResults.map((uom) => (
                          <div
                            key={uom.uom_id}
                            onClick={() => handleUomSelect(uom)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer border-b dark:border-slate-600 last:border-b-0 text-sm"
                          >
                            <p className="font-medium text-gray-800 dark:text-white">{uom.uom_name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddUOMModal(true)}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Plus size={14} /> Add UOM
                    </button>
                    {formErrors.uom_id && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.uom_id.includes('Click here') ? (
                          <>
                            This data doesn't exist.{' '}
                            <span 
                              onClick={() => setShowAddUOMModal(true)}
                              className="underline cursor-pointer hover:text-red-700"
                            >
                              Click here
                            </span>
                          </>
                        ) : (
                          formErrors.uom_id
                        )}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
                    <input
                      type="text"
                      value={vendorSearchTerm}
                      onChange={(e) => handleVendorSearch(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.vendor ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      placeholder="Search vendor..."
                    />
                    {vendorSearchResults.length > 0 && (
                      <div className="mt-1 border border-gray-300 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-slate-700">
                        {vendorSearchResults.map((vendor) => (
                          <div
                            key={vendor.vendor_id}
                            onClick={() => handleVendorSelect(vendor)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer border-b dark:border-slate-600 last:border-b-0"
                          >
                            <p className="font-medium text-gray-800 dark:text-white">{vendor.vendor_name}</p>
                            {vendor.contact_person && <p className="text-sm text-gray-500 dark:text-gray-400">{vendor.contact_person}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setShowAddVendorModal(true)}
                        className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <Plus size={14} /> Add Vendor
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowVendorOverviewModal(true)}
                        className="mt-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        <List size={14} /> All Vendors
                      </button>
                    </div>
                    {formErrors.vendor && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.vendor.includes('Click here') ? (
                          <>
                            This data doesn't exist.{' '}
                            <span 
                              onClick={() => setShowAddVendorModal(true)}
                              className="underline cursor-pointer hover:text-red-700"
                            >
                              Click here
                            </span>
                          </>
                        ) : (
                          formErrors.vendor
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Attachment</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 1 image (jpeg, jpg, png, gif, webp)</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitAdd(e, 'drafted')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Draft
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Item Modal */}
        {showViewModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowViewModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold mb-4">Item Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Item Name:</p>
                  <p className="text-sm text-gray-900">{selectedItem.item_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Stock Quantity:</p>
                  <p className="text-sm text-gray-900">{selectedItem.stock_quantity} {selectedItem.uom_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Minimum Stock:</p>
                  <p className="text-sm text-gray-900">{selectedItem.minimum_stock} {selectedItem.uom_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">UOM:</p>
                  <p className="text-sm text-gray-900">{selectedItem.uom_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Vendor (Last used):</p>
                  <p className="text-sm text-gray-900">{selectedItem.last_procurement_vendor || selectedItem.vendor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Stock Status:</p>
                  <p className="text-sm text-gray-900">{getStockStatusLabel(selectedItem.stock_status)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Update:</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedItem.last_update)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Created At:</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedItem.created_at)}</p>
                </div>
              </div>
              {selectedItem.attachment && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Image:</p>
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${selectedItem.attachment}`}
                    alt="Item Image"
                    className="max-w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowEditModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Edit Item</h2>
              <form onSubmit={handleSubmitEdit} noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.item_name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.item_name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.item_name}</p>}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Stock *</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.minimum_stock ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.minimum_stock && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.minimum_stock}</p>}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UOM *</label>
                    <input
                      type="text"
                      value={uomSearchTerm}
                      onChange={(e) => handleUomSearch(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.uom_id ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      placeholder="Search UOM..."
                    />
                    {uomSearchResults.length > 0 && (
                      <div className="mt-1 border border-gray-300 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-slate-700">
                        {uomSearchResults.map((uom) => (
                          <div
                            key={uom.uom_id}
                            onClick={() => handleUomSelect(uom)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer border-b dark:border-slate-600 last:border-b-0 text-sm"
                          >
                            <p className="font-medium text-gray-800 dark:text-white">{uom.uom_name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddUOMModal(true)}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Plus size={14} /> Add UOM
                    </button>
                    {formErrors.uom_id && (
                      <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                        {formErrors.uom_id.includes('Click here') ? (
                          <>
                            This data doesn't exist.{' '}
                            <span 
                              onClick={() => setShowAddUOMModal(true)}
                              className="underline cursor-pointer hover:text-red-700 dark:hover:text-red-300"
                            >
                              Click here
                            </span>
                          </>
                        ) : (
                          formErrors.uom_id
                        )}
                      </p>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor</label>
                    <input
                      type="text"
                      value={vendorSearchTerm}
                      onChange={(e) => handleVendorSearch(e.target.value)}
                      disabled={!isVendorEditable}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.vendor ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      placeholder="Search vendor..."
                    />
                    {!isVendorEditable && selectedItem?.last_procurement_gr_id && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300 flex items-center justify-between">
                        <span>This is the last-used vendor from {selectedItem.last_procurement_gr_id}, are you sure you want to change it?</span>
                        <button
                          type="button"
                          onClick={() => setIsVendorEditable(true)}
                          className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition text-[10px]"
                        >
                          Yes
                        </button>
                      </div>
                    )}
                    {vendorSearchResults.length > 0 && isVendorEditable && (
                      <div className="mt-1 border border-gray-300 dark:border-slate-600 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-slate-700">
                        {vendorSearchResults.map((vendor) => (
                          <div
                            key={vendor.vendor_id}
                            onClick={() => handleVendorSelect(vendor)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 cursor-pointer border-b dark:border-slate-600 last:border-b-0"
                          >
                            <p className="font-medium text-gray-800 dark:text-white">{vendor.vendor_name}</p>
                            {vendor.contact_person && <p className="text-sm text-gray-500 dark:text-gray-400">{vendor.contact_person}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {isVendorEditable && (
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setShowAddVendorModal(true)}
                          className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <Plus size={14} /> Add Vendor
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVendorOverviewModal(true)}
                          className="mt-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                        >
                          <List size={14} /> All Vendors
                        </button>
                      </div>
                    )}
                    {formErrors.vendor && (
                      <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                        {formErrors.vendor.includes('Click here') ? (
                          <>
                            This data doesn't exist.{' '}
                            <span 
                              onClick={() => setShowAddVendorModal(true)}
                              className="underline cursor-pointer hover:text-red-700 dark:hover:text-red-300"
                            >
                              Click here
                            </span>
                          </>
                        ) : (
                          formErrors.vendor
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Attachment</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 1 image (jpeg, jpg, png, gif, webp). Leave empty to keep existing image.</p>
                  {selectedItem.attachment && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Image:</p>
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${selectedItem.attachment}`}
                        alt="Current Item Image"
                        className="max-w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Item Modal */}
        {showDeleteModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Delete Item</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete item "{selectedItem.item_name}"? This action cannot be undone.
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

        {/* Draft Item Modal */}
        {showDraftModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDraftModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Draft Item</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to draft item "{selectedItem.item_name}"?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDraft}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Draft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Undraft Item Modal */}
        {showUndraftModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowUndraftModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Undraft Item</h2>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to undraft item "{selectedItem.item_name}"?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUndraftModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUndraft}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Undraft
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add UOM Modal */}
        {showAddUOMModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setShowAddUOMModal(false)
              setNewUOMName('')
            })}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New UOM</h2>
                <button
                  onClick={() => setShowUOMOverviewModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  title="All UOMs"
                >
                  <List size={16} />
                  <span className="text-sm">All UOMs</span>
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">UOM Name *</label>
                <input
                  type="text"
                  required
                  value={newUOMName}
                  onChange={(e) => setNewUOMName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., box, pack, liter, etc"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddUOMModal(false)
                    setNewUOMName('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUOM}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add UOM
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UOM Overview Modal */}
        {showUOMOverviewModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setShowUOMOverviewModal(false)
              setEditingUom(null)
            })}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">All UOMs</h2>
                <button
                  onClick={() => {
                    setShowUOMOverviewModal(false)
                    setEditingUom(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uoms.map((uom) => (
                      <tr key={uom.uom_id}>
                        <td className="px-4 py-3">
                          {editingUom?.uom_id === uom.uom_id ? (
                            <input
                              type="text"
                              value={editingUom.uom_name}
                              onChange={(e) => setEditingUom({ ...editingUom, uom_name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{uom.uom_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingUom?.uom_id === uom.uom_id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateUom(editingUom)}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Update
                              </button>
                              <button
                                onClick={() => setEditingUom(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                              >
                                Close
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingUom(uom)}
                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteUom(uom.uom_id)}
                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setShowUOMOverviewModal(false)
                    setEditingUom(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Vendor Modal */}
        {showAddVendorModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowAddVendorModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Vendor</h2>
                <button
                  onClick={() => setShowVendorOverviewModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  title="All Vendors"
                >
                  <List size={16} />
                  <span className="text-sm">All Vendors</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={newVendorFormData.vendor_name}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newVendorFormData.contact_person}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newVendorFormData.phone_number}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newVendorFormData.email}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newVendorFormData.city}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVendor}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Vendor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Overview Modal */}
        {showVendorOverviewModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setShowVendorOverviewModal(false)
              setEditingVendor(null)
            })}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">All Vendors</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowVendorOverviewModal(false)
                      setNewVendorFormData({
                        vendor_name: '',
                        contact_person: '',
                        phone_number: '',
                        email: '',
                        city: ''
                      })
                      setShowAddVendorModal(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold transition"
                  >
                    <Plus size={16} />
                    New Vendor
                  </button>
                  <button
                    onClick={() => {
                      setShowVendorOverviewModal(false)
                      setEditingVendor(null)
                      setVendorDeleteError(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendors.map((vendor) => (
                      <tr key={vendor.vendor_id}>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.vendor_name}
                              onChange={(e) => setEditingVendor({ ...editingVendor, vendor_name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{vendor.vendor_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.contact_person}
                              onChange={(e) => setEditingVendor({ ...editingVendor, contact_person: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{vendor.contact_person || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.phone_number}
                              onChange={(e) => setEditingVendor({ ...editingVendor, phone_number: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span 
                              className="text-sm text-gray-900 cursor-pointer hover:text-blue-600"
                              onDoubleClick={() => handlePhoneDoubleClick(vendor.phone_number)}
                              title="Double-click to open WhatsApp"
                            >
                              {vendor.phone_number || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.email}
                              onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{vendor.email || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.city}
                              onChange={(e) => setEditingVendor({ ...editingVendor, city: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">{vendor.city || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateVendor(editingVendor)}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Update
                              </button>
                              <button
                                onClick={() => setEditingVendor(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                              >
                                Close
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingVendor(vendor)}
                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteVendor(vendor.vendor_id)}
                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {vendorDeleteError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800 whitespace-pre-line">{vendorDeleteError}</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowVendorOverviewModal(false)
                    setEditingVendor(null)
                    setVendorDeleteError(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vendor Delete Error Modal */}
        {showVendorDeleteErrorModal && vendorUsageDetails && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setShowVendorDeleteErrorModal(false)
              setVendorUsageDetails(null)
            })}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Cannot Delete Vendor</h2>
              <p className="text-sm text-gray-700 mb-4">Vendor cannot be deleted. It is currently being used in:</p>
              <ul className="list-none text-sm text-gray-600 mb-6 space-y-2">
                {vendorUsageDetails.inventory && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <span className="font-medium">Inventory:</span>{' '}
                      {vendorUsageDetails.inventory.count} items
                    </span>
                  </li>
                )}
                {vendorUsageDetails.procurement && vendorUsageDetails.procurement.length > 0 && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <span className="font-medium">Procurement:</span>{' '}
                      {vendorUsageDetails.procurement.map(p => p.pr_id).join(', ')}
                    </span>
                  </li>
                )}
              </ul>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowVendorDeleteErrorModal(false)
                    setVendorUsageDetails(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
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
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4">Missing Data</h2>
              <p className="text-sm text-gray-700 mb-6">Complete the missing data.</p>
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
              stockStatuses: []
            })
          }
          title="Download Excel Filter"
          exportLabel="Download Excel"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Stock Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CSV_STOCK_STATUSES.map((status) => (
                <label key={status.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={csvFilter.stockStatuses.includes(status.value)}
                    onChange={(e) => {
                      const selected = e.target.checked
                        ? [...csvFilter.stockStatuses, status.value]
                        : csvFilter.stockStatuses.filter((s) => s !== status.value)
                      setCsvFilter({ ...csvFilter, allData: false, stockStatuses: selected })
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{status.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CsvFilterModal>
      </main>
      <SnapFunny />

      {showAutoDraftModal && selectedAutoDraftItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, closeAutoDraftModal)}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Auto Draft Procurement</h2>
            <p className="text-sm text-gray-600 mb-4">
              Isi quantity real untuk item <span className="font-semibold">{selectedAutoDraftItem.item_name}</span>.
            </p>
            <div className="space-y-2 mb-4 text-sm text-gray-700">
              <p>Current stock: <span className="font-semibold">{Number(selectedAutoDraftItem.stock_quantity) || 0}</span></p>
              <p>Minimum stock: <span className="font-semibold">{Number(selectedAutoDraftItem.minimum_stock) || 0}</span></p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to order *</label>
              <input
                type="number"
                min="1"
                value={autoDraftQtyInput}
                onChange={(e) => setAutoDraftQtyInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeAutoDraftModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Skip
              </button>
              <button
                onClick={handleCreateAutoDraft}
                disabled={autoDraftLoadingItemId === selectedAutoDraftItem.item_id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {autoDraftLoadingItemId === selectedAutoDraftItem.item_id ? 'Creating...' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseAddDraftPromptModal && showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, () => setShowCloseAddDraftPromptModal(false))}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Save as draft?</h2>
            <p className="text-sm text-gray-700 mb-6">Before closing this form, do you want to save this data as draft?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloseAddDraftPromptModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Back
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  setShowCloseAddDraftPromptModal(false)
                  await handleSubmitAdd(e, 'drafted')
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Yes, Save Draft
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">If draft save fails due to required fields, use Cancel button in the main form to close without saving.</p>
          </div>
        </div>
      )}

      {actionConfirmModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onMouseDown={(e) => handleBackdropClose(e, closeActionConfirmModal)}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{actionConfirmModal.title}</h2>
            <p className="text-sm text-gray-700 mb-6">{actionConfirmModal.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeActionConfirmModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleActionConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
