import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, Package, Upload, Check, Camera, Download, Plus, AlertTriangle } from 'lucide-react'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import { exportToExcel } from '../utils/exportExcel'
import { useTheme } from '../context/ThemeContext'

function Assets() {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const html5QrCodeRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')

  const [assets, setAssets] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalAssets, setTotalAssets] = useState(0)
  const [summary, setSummary] = useState({ total: 0, available: 0, in_use: 0, maintenance: 0, drafted: 0, deleted: 0 })

  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false)
  const [showUndraftModal, setShowUndraftModal] = useState(false)
  const [showAssetUsageModal, setShowAssetUsageModal] = useState(false)
  const [assetUsageAction, setAssetUsageAction] = useState('delete') // 'delete' or 'draft'
  const [assetUsageDetails, setAssetUsageDetails] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [assetEvents, setAssetEvents] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    status: 'Available',
    location: '',
    condition: '',
    quantity: 1,
    photo_attachment: null,
    has_barcode: false
  })

  const [formErrors, setFormErrors] = useState({})
  const [showMissingDataModal, setShowMissingDataModal] = useState(false)
  const [showCloseAddDraftPromptModal, setShowCloseAddDraftPromptModal] = useState(false)
  const [showCsvFilterModal, setShowCsvFilterModal] = useState(false)
  const [csvFilter, setCsvFilter] = useState({
    allData: true,
    categories: [],
    statuses: [],
    conditions: [],
    locations: []
  })
  const [systemNotice, setSystemNotice] = useState({ type: '', message: '' })

  const CSV_CATEGORIES = ['Camera Gear', 'Lighting', 'Booth Equipment', 'Computers', 'Furniture', 'Other']
  const CSV_STATUSES = ['Available', 'In Use', 'Maintenance', 'Drafted', 'Deleted', 'Deleted Draft']
  const CSV_CONDITIONS = ['Good', 'Fair', 'Poor']
  const CSV_LOCATIONS = ['In Studio', 'Off Site']

  const showSystemNotice = (type, message) => {
    setSystemNotice({ type, message })
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
    if (showAssetUsageModal) {
      setShowAssetUsageModal(false)
      return true
    }
    if (showScanModal) {
      setShowScanModal(false)
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
    if (showUndraftModal) {
      setShowUndraftModal(false)
      return true
    }
    if (showDraftModal) {
      setShowDraftModal(false)
      return true
    }
    if (showEditModal) {
      handleCloseEditModal()
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

  const validateForm = () => {
    const errors = {}
    if (!formData.name || !formData.name.trim()) errors.name = 'Asset Name is required'
    if (!formData.category) errors.category = 'Category is required'
    if (!formData.status) errors.status = 'Status is required'
    if (!formData.location) errors.location = 'Location is required'
    if (!formData.condition) errors.condition = 'Condition is required'
    if (!formData.quantity) errors.quantity = 'Quantity is required'
    if (Number(formData.quantity) < 0) {
      errors.quantity = 'Quantity cannot be negative'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    return true
  }

  const [deleteReason, setDeleteReason] = useState('')

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)
    fetchSummary()
    fetchAssets()
  }, [navigate, statusFilter, categoryFilter, searchTerm, currentPage, itemsPerPage])

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        stopCamera()
      }
    }
  }, [])

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
    showAssetUsageModal,
    showScanModal,
    showHardDeleteModal,
    showDeleteModal,
    showUndraftModal,
    showDraftModal,
    showEditModal,
    showViewModal,
    showMissingDataModal,
    showAddModal
  ])

  const startCamera = async () => {
    setScanError('')
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
        } catch (e) {
          console.log('Ignoring stop error during restart')
        }
      }
      
      const html5QrCode = new Html5Qrcode('reader')
      html5QrCodeRef.current = html5QrCode
      
      const config = { 
        fps: 20, // Increased from 10 to 20 for better responsiveness
        qrbox: { width: 280, height: 280 }, // Slightly larger box
        aspectRatio: 1.0
      }
      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        handleScanResult,
        (errorMessage) => {
        }
      )
      console.log('Camera started successfully')
    } catch (err) {
      console.error('Failed to start camera', err)
      showSystemNotice('error', 'Failed to start camera. Please check camera permissions.')
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        console.log('Camera stopped successfully')
      } catch (err) {
        if (err.message && err.message.includes('transition')) {
          console.log('Scanner already in transition, ignoring stop error')
        } else {
          console.error('Failed to stop camera', err)
        }
      }
      html5QrCodeRef.current = null
    }
  }

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/summary`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Error fetching assets summary:', error)
    }
  }

  const fetchAssets = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets`
      const params = []
      if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`)
      if (categoryFilter) params.push(`category=${encodeURIComponent(categoryFilter)}`)
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`)
      params.push(`page=${currentPage}`)
      params.push(`limit=${itemsPerPage}`)
      if (params.length > 0) url += `?${params.join('&')}`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setAssets(data.data)
        setTotalAssets(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setCategoryFilter('')
    setSearchTerm('')
  }

  const handleCategoryFilter = (category) => {
    setCategoryFilter(category)
    setSearchTerm('')
  }

  const handleSearch = (search) => {
    setSearchTerm(search)
    setCategoryFilter('')
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalAssets / itemsPerPage)

  const handleAddAsset = () => {
    setFormData({
      name: '',
      category: '',
      status: 'Available',
      location: '',
      condition: '',
      quantity: 1,
      photo_attachment: null
    })
    setFormErrors({})
    setShowAddModal(true)
  }

  const handleViewAsset = async (asset) => {
    setSelectedAsset(asset)
    
    try {
      const eventsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${asset.asset_id}/events`)
      const eventsData = await eventsResponse.json()
      if (eventsData.success) {
        setAssetEvents(eventsData.data)
      } else {
        setAssetEvents([])
      }
    } catch (error) {
      console.error('Error fetching asset events:', error)
      setAssetEvents([])
    }
    
    if (asset.has_barcode === 1) {
      try {
        console.log('Generating QR code for asset:', asset.asset_id)
        if (!asset.asset_id) {
          console.error('Asset ID is missing')
          setQrCodeDataUrl('')
          setShowViewModal(true)
          return
        }
        const qrDataUrl = await QRCode.toDataURL(asset.asset_id, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        console.log('QR code generated successfully')
        setQrCodeDataUrl(qrDataUrl)
      } catch (error) {
        console.error('Error generating QR code:', error)
        setQrCodeDataUrl('')
      }
    } else {
      setQrCodeDataUrl('')
    }
    setShowViewModal(true)
  }

  const handleScanResult = async (result) => {
    try {
      if (!result || isScanning) return
      
      setIsScanning(true)
      setScanError('')
      console.log('Scanned result:', result)
      
      const scannedAssetId = result
      const asset = assets.find(a => a.asset_id === scannedAssetId)
      
      if (!asset) {
        setScanError('Asset not registered or unknown QR code')
        setIsScanning(false)
        return
      }
      
      if (asset.has_barcode !== 1) {
        setScanError('QR barcode for this asset is not active')
        setIsScanning(false)
        return
      }
      
      try {
        const eventsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${asset.asset_id}/events`)
        const eventsData = await eventsResponse.json()
        if (eventsData.success) {
          setAssetEvents(eventsData.data)
        } else {
          setAssetEvents([])
        }
      } catch (error) {
        console.error('Error fetching asset events:', error)
        setAssetEvents([])
      }
      
      await stopCamera()
      
      setShowScanModal(false)
      handleEditAsset(asset)
      setIsScanning(false)
    } catch (error) {
      console.error('Error in handleScanResult:', error)
      showSystemNotice('error', 'Error processing QR scan: ' + error.message)
      setIsScanning(false)
    }
  }

  const handleEditAsset = (asset) => {
    setSelectedAsset(asset)
    setFormData({
      name: asset.name,
      category: asset.category,
      status: asset.status,
      location: asset.location,
      condition: asset.condition,
      quantity: asset.quantity || 1,
      photo_attachment: null,
      has_barcode: asset.has_barcode === 1
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setFormErrors({})
    setAssetEvents([])
  }

  const handleDraftAsset = (asset) => {
    setSelectedAsset(asset)
    setShowDraftModal(true)
  }

  const handleUndraftAsset = (asset) => {
    setSelectedAsset(asset)
    setShowUndraftModal(true)
  }

  const handleDeleteAsset = (asset) => {
    setSelectedAsset(asset)
    setDeleteReason('')
    setShowDeleteModal(true)
  }

  const handleSubmitAdd = async (e, customStatus = null) => {
    if (e) e.preventDefault()
    if (!validateForm()) return
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('status', customStatus || formData.status)
      formDataToSend.append('location', formData.location)
      formDataToSend.append('condition', formData.condition)
      formDataToSend.append('quantity', formData.quantity)
      formDataToSend.append('has_barcode', formData.has_barcode ? 'true' : 'false')
      formDataToSend.append('created_by', userName)
      if (formData.photo_attachment) {
        formDataToSend.append('photo_attachment', formData.photo_attachment)
      }

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: formDataToSend
      })

      const data = await response.json()
      if (data.success) {
        setShowAddModal(false)
        fetchSummary()
        fetchAssets()
      } else {
        showSystemNotice('error', data.message === 'Asset name already exists' ? 'This asset already exists' : 'Error creating asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error creating asset:', error)
      showSystemNotice('error', 'Error creating asset')
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('status', formData.status)
      formDataToSend.append('location', formData.location)
      formDataToSend.append('condition', formData.condition)
      formDataToSend.append('quantity', formData.quantity)
      formDataToSend.append('has_barcode', formData.has_barcode ? 'true' : 'false')
      formDataToSend.append('updated_by', userName)
      if (formData.photo_attachment) {
        formDataToSend.append('photo_attachment', formData.photo_attachment)
      }

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${selectedAsset.asset_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: formDataToSend
      })

      const data = await response.json()
      if (data.success) {
        setShowEditModal(false)
        fetchSummary()
        fetchAssets()
      } else {
        showSystemNotice('error', data.message === 'Asset name already exists' ? 'This asset already exists' : 'Error updating asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating asset:', error)
      showSystemNotice('error', 'Error updating asset')
    }
  }

  const confirmDraft = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${selectedAsset.asset_id}/draft`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })

      const data = await response.json()
      if (data.success) {
        setShowDraftModal(false)
        fetchSummary()
        fetchAssets()
      } else if (data.message === 'Asset cannot be drafted because it is in use' && data.usage) {
        setShowDraftModal(false)
        setAssetUsageAction('draft')
        setAssetUsageDetails(data.usage)
        setShowAssetUsageModal(true)
      } else {
        showSystemNotice('error', 'Error drafting asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error drafting asset:', error)
      showSystemNotice('error', 'Error drafting asset')
    }
  }

  const confirmUndraft = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${selectedAsset.asset_id}/undraft`, {
        method: 'PUT'
      })

      const data = await response.json()
      if (data.success) {
        setShowUndraftModal(false)
        fetchSummary()
        fetchAssets()
      } else {
        showSystemNotice('error', 'Error undrafting asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error undrafting asset:', error)
      showSystemNotice('error', 'Error undrafting asset')
    }
  }

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      showSystemNotice('error', 'Please provide a reason for deletion')
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${selectedAsset.asset_id}/delete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleted_reason: deleteReason })
      })

      const data = await response.json()
      if (data.success) {
        setShowDeleteModal(false)
        fetchSummary()
        fetchAssets()
      } else if (data.message === 'Asset cannot be deleted because it is in use' && data.usage) {
        setAssetUsageAction('delete')
        setAssetUsageDetails(data.usage)
        setShowAssetUsageModal(true)
      } else {
        showSystemNotice('error', 'Error deleting asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
      showSystemNotice('error', 'Error deleting asset')
    }
  }

  const confirmDeleteDrafted = async () => {
    if (!deleteReason.trim()) {
      showSystemNotice('error', 'Please provide a reason for deletion')
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${selectedAsset.asset_id}/delete-drafted`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deleted_reason: deleteReason })
      })

      const data = await response.json()
      if (data.success) {
        setShowDeleteModal(false)
        fetchSummary()
        fetchAssets()
      } else if (data.message === 'Asset cannot be deleted because it is in use' && data.usage) {
        setAssetUsageAction('delete')
        setAssetUsageDetails(data.usage)
        setShowAssetUsageModal(true)
      } else {
        showSystemNotice('error', 'Error deleting drafted asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting drafted asset:', error)
      showSystemNotice('error', 'Error deleting drafted asset')
    }
  }

  const handleHardDelete = async (asset) => {
    setSelectedAsset(asset)
    setShowHardDeleteModal(true)
  }

  const confirmHardDelete = async () => {
    if (!selectedAsset) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/${selectedAsset.asset_id}/hard-delete`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        setShowHardDeleteModal(false)
        setSelectedAsset(null)
        fetchSummary()
        fetchAssets()
        showSystemNotice('success', 'Asset permanently deleted')
      } else {
        showSystemNotice('error', 'Error deleting asset: ' + data.message)
      }
    } catch (error) {
      console.error('Error hard deleting asset:', error)
      showSystemNotice('error', 'Error deleting asset')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleOpenCsvFilter = () => {
    setCsvFilter({
      allData: true,
      categories: [],
      statuses: [],
      conditions: [],
      locations: []
    })
    setShowCsvFilterModal(true)
  }

  const buildCsvFilterSummary = () => {
    if (csvFilter.allData) return 'All data'
    const parts = []
    if (csvFilter.categories.length) parts.push(`Category: ${csvFilter.categories.join(', ')}`)
    if (csvFilter.statuses.length) parts.push(`Status: ${csvFilter.statuses.join(', ')}`)
    if (csvFilter.conditions.length) parts.push(`Condition: ${csvFilter.conditions.join(', ')}`)
    if (csvFilter.locations.length) parts.push(`Location: ${csvFilter.locations.join(', ')}`)
    return parts.length ? parts.join('; ') : 'All data'
  }

  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (!csvFilter.allData) {
        if (csvFilter.statuses.length) params.append('status', csvFilter.statuses.join(','))
        if (csvFilter.categories.length) params.append('category', csvFilter.categories.join(','))
        if (csvFilter.conditions.length) params.append('condition', csvFilter.conditions.join(','))
        if (csvFilter.locations.length) params.append('location', csvFilter.locations.join(','))
      }
      if (searchTerm) params.append('search', searchTerm)

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/export${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (!data.success) {
        showSystemNotice('error', 'Failed to fetch CSV data')
        return
      }

      const headers = ['ID', 'Name', 'Category', 'Status', 'Location', 'Condition', 'Quantity', 'Created At']
      const rows = data.data.map((asset) => [
        asset.asset_id,
        asset.name,
        asset.category || 'N/A',
        asset.status,
        asset.location || 'N/A',
        asset.condition || 'N/A',
        asset.quantity || 1,
        formatDate(asset.created_at)
      ])

      await exportToExcel(
        headers,
        rows,
        'Recap Report - Assets',
        'assets',
        { columnWidths: [15, 25, 15, 15, 20, 15, 12, 18], filterSummary: buildCsvFilterSummary() }
      )

      setShowCsvFilterModal(false)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showSystemNotice('error', 'Error exporting CSV')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800'
      case 'In Use': return 'bg-blue-100 text-blue-800'
      case 'Maintenance': return 'bg-orange-100 text-orange-800'
      case 'Drafted': return 'bg-gray-100 text-gray-800'
      case 'Deleted': return 'bg-red-100 text-red-800'
      case 'Deleted Draft': return 'bg-red-200 text-red-900'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionsForStatus = (asset) => {
    if (asset.status === 'Deleted') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewAsset(asset)}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleHardDelete(asset)}
            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-900"
            title="Permanently Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }

    if (asset.status === 'Deleted Draft') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewAsset(asset)}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleHardDelete(asset)}
            className="p-2 bg-gray-800 text-white rounded hover:bg-gray-900"
            title="Permanently Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }

    if (asset.status === 'Drafted') {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewAsset(asset)}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleUndraftAsset(asset)}
            className="p-2 bg-gray-700 text-white rounded hover:bg-gray-800"
            title="Undraft"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={() => handleHardDelete(asset)}
            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
            title="Hard Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }

    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleViewAsset(asset)}
          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          title="View"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={() => handleEditAsset(asset)}
          className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
          title="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => handleDraftAsset(asset)}
          className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          title="Draft"
        >
          <Package size={16} />
        </button>
        <button
          onClick={() => handleDeleteAsset(asset)}
          className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    )
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Asset Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowScanModal(true)
                setTimeout(() => startCamera(), 100)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Camera size={18} />
              Scan QR
            </button>
            <button
              onClick={handleAddAsset}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
            >
              <Plus size={18} />
              New Asset
            </button>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div
            onClick={() => handleStatusFilter('')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === '' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">All Active Assets</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{Number(summary.available) + Number(summary.in_use) + Number(summary.maintenance)}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Available')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Available' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Available</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.available}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('In Use')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'In Use' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">In Use</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.in_use}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Maintenance')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Maintenance' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Maintenance</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.maintenance}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Drafted')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Drafted' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Drafted</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{summary.drafted}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Deleted')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Deleted' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Deleted</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.deleted}</p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by Asset Name</label>
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Camera Gear">Camera Gear</option>
              <option value="Lighting">Lighting</option>
              <option value="Booth Equipment">Booth Equipment</option>
              <option value="Computers">Computers</option>
              <option value="Furniture">Furniture</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Assets Overview</h2>
            <button
              onClick={handleOpenCsvFilter}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Download size={16} />
              Download Excel
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Condition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {assets.map((asset) => (
                <tr key={asset.asset_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onDoubleClick={() => handleViewAsset(asset)}
                    >
                      {asset.asset_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{asset.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{asset.condition}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{asset.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{asset.quantity || 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {getActionsForStatus(asset)}
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No assets found
                  </td>
                </tr>
              )}
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalAssets)} of {totalAssets} assets
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

        {/* Add Asset Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, requestCloseAddModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Add New Asset</h2>
              <form onSubmit={handleSubmitAdd} noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.category ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="">Select Category</option>
                      <option value="Camera Gear">Camera Gear</option>
                      <option value="Lighting">Lighting</option>
                      <option value="Booth Equipment">Booth Equipment</option>
                      <option value="Computers">Computers</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                    {formErrors.category && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.status ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="Available">Available</option>
                      <option value="In Use">In Use</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Drafted">Drafted</option>
                    </select>
                    {formErrors.status && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.status}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.location ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="">Select Location</option>
                      <option value="In Studio">In Studio</option>
                      <option value="Off Site">Off Site</option>
                    </select>
                    {formErrors.location && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.location}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition *</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.condition ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="">Select Condition</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                    {formErrors.condition && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.condition}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.quantity && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.quantity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Attachment</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, photo_attachment: e.target.files[0] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.has_barcode}
                        onChange={(e) => setFormData({ ...formData, has_barcode: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Generate QR Barcode</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setFormErrors({})
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitAdd(e, 'Drafted')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Draft
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Asset Modal */}
        {showViewModal && selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowViewModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">View Asset</h2>
              {selectedAsset.status === 'Deleted' || selectedAsset.status === 'Deleted Draft' ? (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800">Delete Reason:</p>
                  <p className="text-sm text-red-700">{selectedAsset.deleted_reason || '-'}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">ID:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.asset_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Name:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Category:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Location:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Condition:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.condition}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Quantity:</p>
                  <p className="text-sm text-gray-900">{selectedAsset.quantity || 1}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Added at:</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedAsset.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Edited at:</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedAsset.updated_at)}</p>
                </div>
                {selectedAsset.photo_attachment && (
                  <div className="col-span-2">
                    <div className="flex gap-6 items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">Photo:</p>
                        <img
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedAsset.photo_attachment}`}
                          alt="Asset"
                          className="mt-2 max-w-full h-48 object-contain rounded"
                        />
                      </div>
                      {qrCodeDataUrl && (
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm font-medium text-gray-700">QR Barcode:</p>
                          <img
                            src={qrCodeDataUrl}
                            alt="QR Code"
                            className="border rounded p-2 bg-white"
                          />
                          <button
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = qrCodeDataUrl
                              link.download = `${selectedAsset.asset_id}-qr-code.png`
                              link.click()
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Download size={16} />
                            Download QR Code
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!selectedAsset.photo_attachment && qrCodeDataUrl && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-700">QR Barcode:</p>
                    <div className="mt-2 flex flex-col items-center gap-2">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="border rounded p-2 bg-white"
                      />
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = qrCodeDataUrl
                          link.download = `${selectedAsset.asset_id}-qr-code.png`
                          link.click()
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Download size={16} />
                        Download QR Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Events Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Event Usage (Upcoming & In Progress)</h3>
                {assetEvents.length > 0 ? (
                  <div className="space-y-2">
                    {assetEvents.map((event) => (
                      <div key={event.event_id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{event.event_name}</p>
                            <p className="text-sm text-gray-600">Customer: {event.customer || 'N/A'}</p>
                            <p className="text-sm text-gray-600">Location: {event.location || 'N/A'}</p>
                            <p className="text-sm text-gray-600">Quantity: {event.quantity}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(event.start_date).toLocaleDateString('id-ID')} - {new Date(event.end_date).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                            event.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.status === 'upcoming' ? 'Upcoming' : event.status === 'in_progress' ? 'In Progress' : event.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">This asset is not currently assigned to any upcoming or in-progress events.</p>
                )}
              </div>
              
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

        {/* Edit Asset Modal */}
        {showEditModal && selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, handleCloseEditModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
              <div className="absolute top-6 right-6 flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none">Created By</span>
                <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset?.created_by || 'N/A'}</span>
                {selectedAsset?.updated_by && selectedAsset.updated_by !== selectedAsset.created_by && (
                  <>
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none mt-2">Updated By</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset.updated_by}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Edit Asset</h2>
              
              {/* Events Section */}
              {assetEvents.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3">Assigned Events (Upcoming & In Progress)</h3>
                  <div className="space-y-2">
                    {assetEvents.map((event) => (
                      <div key={event.event_id} className="p-3 bg-white dark:bg-slate-700 rounded border border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">{event.event_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Customer: {event.customer}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Location: {event.location}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Quantity: {event.quantity}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            event.status === 'upcoming' 
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' 
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          }`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmitEdit} noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.category ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="">Select Category</option>
                      <option value="Camera Gear">Camera Gear</option>
                      <option value="Lighting">Lighting</option>
                      <option value="Booth Equipment">Booth Equipment</option>
                      <option value="Computers">Computers</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                    {formErrors.category && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.status ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="Available">Available</option>
                      <option value="In Use">In Use</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                    {formErrors.status && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.status}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.location ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="">Select Location</option>
                      <option value="In Studio">In Studio</option>
                      <option value="Off Site">Off Site</option>
                    </select>
                    {formErrors.location && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.location}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition *</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.condition ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    >
                      <option value="">Select Condition</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                    {formErrors.condition && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.condition}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                    />
                    {formErrors.quantity && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.quantity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Attachment</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, photo_attachment: e.target.files[0] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {selectedAsset.photo_attachment && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Photo:</p>
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedAsset.photo_attachment}`}
                        alt="Current"
                        className="mt-2 max-w-full h-48 object-contain rounded"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.has_barcode}
                        onChange={(e) => setFormData({ ...formData, has_barcode: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Generate QR Barcode</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Asset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Draft Confirmation Modal */}
        {showDraftModal && selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDraftModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl relative">
              <div className="absolute top-6 right-6 flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none">Created By</span>
                <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset?.created_by || 'N/A'}</span>
                {selectedAsset?.updated_by && selectedAsset.updated_by !== selectedAsset.created_by && (
                  <>
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none mt-2">Updated By</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset.updated_by}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Draft Asset</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to draft this asset?</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDraft}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl relative">
              <div className="absolute top-6 right-6 flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none">Created By</span>
                <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset?.created_by || 'N/A'}</span>
                {selectedAsset?.updated_by && selectedAsset.updated_by !== selectedAsset.created_by && (
                  <>
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none mt-2">Updated By</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset.updated_by}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white leading-tight">Asset Details</h2>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delete Reason *</label>
                  <textarea
                    required
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Please provide a reason for deletion..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedAsset.status === 'Drafted' ? confirmDeleteDrafted : confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hard Delete Confirmation Modal */}
        {showHardDeleteModal && selectedAsset && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowHardDeleteModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl relative">
              <div className="absolute top-6 right-6 flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none">Created By</span>
                <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset?.created_by || 'N/A'}</span>
                {selectedAsset?.updated_by && selectedAsset.updated_by !== selectedAsset.created_by && (
                  <>
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 leading-none mt-2">Updated By</span>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 tracking-tight">{selectedAsset.updated_by}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white leading-tight">Asset Details</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to permanently delete this asset? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowHardDeleteModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmHardDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Asset Usage Modal */}
        {showAssetUsageModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowAssetUsageModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {assetUsageAction === 'draft' ? 'Cannot Draft Asset' : 'Cannot Delete Asset'}
              </h2>
              <p className="text-sm text-gray-700 mb-4">
                Asset cannot be {assetUsageAction === 'draft' ? 'drafted' : 'deleted'}. It is currently being used in:
              </p>
              <ul className="list-none text-sm text-gray-600 mb-6 space-y-2">
                {assetUsageDetails.map((usage, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <span className="font-medium">{usage.type}:</span>{' '}
                      {usage.type === 'Events & Booths' ? (
                        <>
                          "{usage.name}" - Qty: {usage.quantity}
                        </>
                      ) : (
                        <>
                          {usage.id} - Qty: {usage.quantity}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAssetUsageModal(false)
                    setShowDeleteModal(false)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Scan Modal */}
        {showScanModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowScanModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Scan QR Barcode</h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Point camera at QR barcode to scan asset</p>
                <div className="border rounded overflow-hidden relative">
                  <div id="reader" className="w-full"></div>
                  {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 pointer-events-none">
                      <div className="w-full h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-scan-line"></div>
                    </div>
                  )}
                </div>
                {scanError && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2 animate-shake">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{scanError}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    await stopCamera()
                    setShowScanModal(false)
                    setIsScanning(false)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
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
                    await handleSubmitAdd(e, 'Drafted')
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

        {/* CSV Filter Modal */}
        {showCsvFilterModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowCsvFilterModal(false))}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Download Excel Filter</h2>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={csvFilter.allData}
                    onChange={(e) => setCsvFilter({
                      allData: e.target.checked,
                      categories: [],
                      statuses: [],
                      conditions: [],
                      locations: []
                    })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="font-medium text-gray-800">All data (no filter)</span>
                </label>
              </div>

              <div className={`space-y-5 ${csvFilter.allData ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">By Category</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CSV_CATEGORIES.map((category) => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={csvFilter.categories.includes(category)}
                          onChange={(e) => {
                            const selected = e.target.checked
                              ? [...csvFilter.categories, category]
                              : csvFilter.categories.filter((c) => c !== category)
                            setCsvFilter({ ...csvFilter, allData: false, categories: selected })
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">By Status</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CSV_STATUSES.map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={csvFilter.statuses.includes(status)}
                          onChange={(e) => {
                            const selected = e.target.checked
                              ? [...csvFilter.statuses, status]
                              : csvFilter.statuses.filter((s) => s !== status)
                            setCsvFilter({ ...csvFilter, allData: false, statuses: selected })
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">By Condition</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CSV_CONDITIONS.map((condition) => (
                      <label key={condition} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={csvFilter.conditions.includes(condition)}
                          onChange={(e) => {
                            const selected = e.target.checked
                              ? [...csvFilter.conditions, condition]
                              : csvFilter.conditions.filter((c) => c !== condition)
                            setCsvFilter({ ...csvFilter, allData: false, conditions: selected })
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">By Location</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CSV_LOCATIONS.map((location) => (
                      <label key={location} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={csvFilter.locations.includes(location)}
                          onChange={(e) => {
                            const selected = e.target.checked
                              ? [...csvFilter.locations, location]
                              : csvFilter.locations.filter((l) => l !== location)
                            setCsvFilter({ ...csvFilter, allData: false, locations: selected })
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCsvFilterModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download size={16} />
                  Download Excel
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

export default Assets
