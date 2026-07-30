import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, Check, X, Package, Clock, CheckCircle, XCircle, Inbox, Upload, Download, List, Plus } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { exportToExcel } from '../utils/exportExcel'
import CsvFilterModal from '../components/CsvFilterModal'
import { useTheme } from '../context/ThemeContext'

function Procurement() {
  const { isDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')
  const [assets, setAssets] = useState([])
  const [inventory, setInventory] = useState([])
  const [vendors, setVendors] = useState([])
  const [vendorSearchTerm, setVendorSearchTerm] = useState('')
  const [vendorSearchResults, setVendorSearchResults] = useState([])
  const [showAddVendorModal, setShowAddVendorModal] = useState(false)
  const [showVendorOverviewModal, setShowVendorOverviewModal] = useState(false)
  const [showVendorDeleteErrorModal, setShowVendorDeleteErrorModal] = useState(false)
  const [vendorUsageDetails, setVendorUsageDetails] = useState(null)
  const [editingVendor, setEditingVendor] = useState(null)
  const [vendorDeleteError, setVendorDeleteError] = useState(null)
  const [newVendorFormData, setNewVendorFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone_number: '',
    email: '',
    city: ''
  })

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)
    fetchAssets()
    fetchInventory()
    fetchVendors()
  }, [navigate])

  const fetchInventory = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory?status=active`, {
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        setInventory(data.data)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

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

  const handleVendorSearch = async (searchTerm) => {
    setVendorSearchTerm(searchTerm)
    setFormData({ ...formData, vendor: searchTerm, vendor_id: null })
    if (searchTerm.length > 0) {
      const filtered = vendors.filter(v => 
        v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setVendorSearchResults(filtered)
    } else {
      setVendorSearchResults([])
    }
  }

  const handleVendorSelect = (vendor) => {
    setFormData({
      ...formData,
      vendor: vendor.vendor_name,
      vendor_id: vendor.vendor_id
    })
    setVendorSearchTerm(vendor.vendor_name)
    setVendorSearchResults([])
  }

  const handleAddVendor = async () => {
    if (!newVendorFormData.vendor_name.trim()) {
      showSystemNotice('error', 'Vendor name is required')
      return
    }
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/vendors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
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
  const [summary, setSummary] = useState({ draft: 0, waiting_approval: 0, approved: 0, rejected: 0, received: 0 })
  const [procurementRequests, setProcurementRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalRequests, setTotalRequests] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [showUndraftModal, setShowUndraftModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [selectedRequestForDraft, setSelectedRequestForDraft] = useState(null)
  const [selectedRequestForUndraft, setSelectedRequestForUndraft] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedRequestForDelete, setSelectedRequestForDelete] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingPrId, setRejectingPrId] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [showMissingDataModal, setShowMissingDataModal] = useState(false)
  const [showCloseCreateDraftPromptModal, setShowCloseCreateDraftPromptModal] = useState(false)
  const [systemNotice, setSystemNotice] = useState({ type: '', message: '' })
  const [actionConfirmModal, setActionConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [showCsvFilterModal, setShowCsvFilterModal] = useState(false)
  const [csvFilter, setCsvFilter] = useState({
    allData: true,
    statuses: [],
    createdAt: ''
  })

  const CSV_STATUSES = ['Draft', 'Waiting Approval', 'Approved', 'Rejected', 'Received']

  const [formData, setFormData] = useState({
    items: [
      {
        item_classification: 'Supplies',
        item_name: '',
        quantity: '',
        cost: '',
        additional_charge: '',
        additional_cost: ''
      }
    ],
    vendor: '',
    vendor_id: null,
    marketplace_link: '',
    attachment: ''
  })

  const STATUS_REQUIRES_QUOTATION = ['Waiting Approval', 'Approved', 'Received']

  const showSystemNotice = (type, message) => {
    setSystemNotice({ type, message })
  }

  const handleBackdropClose = (e, onClose) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const requestCloseCreateModal = () => {
    setShowCloseCreateDraftPromptModal(true)
  }

  const closeTopModal = () => {
    if (showCsvFilterModal) {
      setShowCsvFilterModal(false)
      return true
    }
    if (showCloseCreateDraftPromptModal) {
      setShowCloseCreateDraftPromptModal(false)
      return true
    }
    if (actionConfirmModal.isOpen) {
      closeActionConfirmModal()
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
    if (showMissingDataModal) {
      setShowMissingDataModal(false)
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
    if (isRejectModalOpen) {
      setIsRejectModalOpen(false)
      setRejectionReason('')
      setRejectingPrId(null)
      return true
    }
    if (isViewModalOpen) {
      setIsViewModalOpen(false)
      return true
    }
    if (isEditModalOpen) {
      setIsEditModalOpen(false)
      setFormErrors({})
      return true
    }
    if (isCreateModalOpen) {
      requestCloseCreateModal()
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

  const hasMissingQuotation = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return true

    return items.some((item) => {
      const quantity = Number(item.quantity)
      const cost = Number(item.cost)
      return !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(cost) || cost <= 0
    })
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
    fetchProcurementRequests()
  }, [navigate])

  useEffect(() => {
    fetchProcurementRequests(statusFilter, dateFilter, searchTerm)
  }, [statusFilter, dateFilter, searchTerm, currentPage, itemsPerPage])

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
    showCloseCreateDraftPromptModal,
    actionConfirmModal.isOpen,
    showVendorDeleteErrorModal,
    showVendorOverviewModal,
    showAddVendorModal,
    showMissingDataModal,
    showDeleteModal,
    showUndraftModal,
    showDraftModal,
    isRejectModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isCreateModalOpen
  ])

  const fetchSummary = async () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/summary`, {
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

  const fetchProcurementRequests = async (status = '', date = '', search = '') => {
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement`
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
        setProcurementRequests(data.data)
        setTotalRequests(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching procurement requests:', error)
    }
  }

  const handleOpenCsvFilter = () => {
    setCsvFilter({
      allData: true,
      statuses: [],
      createdAt: ''
    })
    setShowCsvFilterModal(true)
  }

  const buildCsvFilterSummary = () => {
    if (csvFilter.allData) return 'All data'
    const parts = []
    if (csvFilter.statuses.length) parts.push(`Status: ${csvFilter.statuses.join(', ')}`)
    if (csvFilter.createdAt) parts.push(`Created At: ${csvFilter.createdAt}`)
    return parts.length ? parts.join('; ') : 'All data'
  }

  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (!csvFilter.allData) {
        if (csvFilter.statuses.length) params.append('status', csvFilter.statuses.join(','))
        if (csvFilter.createdAt) params.append('createdAt', csvFilter.createdAt)
      }
      if (searchTerm) params.append('search', searchTerm)

      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/export${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (!data.success) {
        showSystemNotice('error', 'Failed to fetch CSV data')
        return
      }

      const headers = ['ID', 'Items', 'Quantity', 'Vendor', 'Total Cost', 'Requested By', 'Date', 'Status']
      const rows = data.data.map((request) => [
        request.pr_id,
        (request.items || []).map(item => item.item_name).join('; '),
        (request.items || []).map(item => item.quantity).join('; '),
        request.supplier || request.vendor || 'N/A',
        request.total_cost || 0,
        request.requested_by,
        new Date(request.created_at).toLocaleDateString('id-ID'),
        request.status
      ])

      await exportToExcel(
        headers,
        rows,
        'Recap Report - Purchase Requests',
        'procurement',
        { columnWidths: [15, 30, 15, 20, 15, 20, 15, 15], filterSummary: buildCsvFilterSummary() }
      )

      setShowCsvFilterModal(false)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      showSystemNotice('error', 'Error exporting CSV')
    }
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    fetchProcurementRequests(status, dateFilter, searchTerm)
  }

  const handleDateFilter = (date) => {
    setDateFilter(date)
    fetchProcurementRequests(statusFilter, date, searchTerm)
  }

  const handleSearch = (search) => {
    setSearchTerm(search)
    fetchProcurementRequests(statusFilter, dateFilter, search)
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalRequests / itemsPerPage)

  const handleCreate = () => {
    setFormData({
      items: [
        {
          item_classification: 'Supplies',
          item_name: '',
          quantity: '',
          cost: '',
          additional_charge: '',
          additional_cost: ''
        }
      ],
      vendor: '',
      vendor_id: null,
      marketplace_link: '',
      attachment: ''
    })
    setVendorSearchTerm('')
    setVendorSearchResults([])
    setFormErrors({})
    setSelectedRequest(null)
    setIsCreateModalOpen(true)
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_classification: 'Supplies',
          item_name: '',
          quantity: '',
          cost: '',
          additional_charge: '',
          additional_cost: ''
        }
      ]
    })
  }

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      items: newItems
    })
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    
    if (field === 'item_classification') {
      newItems[index].item_id = null
      newItems[index].asset_id = null
      newItems[index].item_name = ''
    }
    
    if (field === 'item_name') {
      const item = newItems[index]
      if (item.item_classification === 'Supplies') {
        const invItem = inventory.find(i => i.item_name === value)
        if (invItem) {
          newItems[index].item_id = invItem.item_id
        } else {
          newItems[index].item_id = null
        }
      } else if (item.item_classification === 'Assets') {
        const asset = assets.find(a => a.name === value)
        if (asset) {
          newItems[index].asset_id = asset.asset_id
        } else {
          newItems[index].asset_id = null
        }
      }
    }
    
    setFormData({
      ...formData,
      items: newItems
    })
  }

  const handleEdit = (pr_id) => {
    const request = procurementRequests.find(r => r.pr_id === pr_id)
    if (!request) return

    const processedItems = (request.items || []).map(item => {
      if (item.item_classification === 'Supplies') {
        const invItem = inventory.find(i => i.item_name === item.item_name)
        return {
          ...item,
          item_id: invItem ? invItem.item_id : null
        }
      } else if (item.item_classification === 'Assets') {
        const asset = assets.find(a => a.name === item.item_name)
        return {
          ...item,
          asset_id: asset ? asset.asset_id : null
        }
      }
      return item
    })

    setSelectedRequest(request)
    setFormData({
      items: processedItems.length > 0 ? processedItems : [
        {
          item_classification: 'Supplies',
          item_name: '',
          quantity: '',
          cost: '',
          additional_charge: '',
          additional_cost: ''
        }
      ],
      vendor: request.supplier || '',
      vendor_id: null,
      marketplace_link: request.marketplace_link,
      attachment: request.attachment,
      status: request.status
    })
    setVendorSearchTerm(request.supplier || '')
    setVendorSearchResults([])
    setFormErrors({})
    setIsEditModalOpen(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!selectedRequest) return
    
    if (!validateForm()) {
      return
    }

    const formDataObj = new FormData()
    formDataObj.append('items', JSON.stringify(formData.items))
    formDataObj.append('supplier', formData.vendor)
    formDataObj.append('marketplace_link', formData.marketplace_link)
    formDataObj.append('status', selectedRequest.status)
    formDataObj.append('existing_attachment', selectedRequest.attachment || '')
    
    if (formData.attachment) {
      formDataObj.append('attachment', formData.attachment)
    }

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/${selectedRequest.pr_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: formDataObj
      })
      const data = await response.json()
      if (data.success) {
        setIsEditModalOpen(false)
        fetchSummary()
        fetchProcurementRequests(statusFilter)
      }
    } catch (error) {
      console.error('Error updating procurement request:', error)
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedRequest) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    let docTitle = 'Purchase Request'
    let docFileName = 'PR'
    
    if (selectedRequest.status === 'Approved') {
      docTitle = 'Purchase Order'
      docFileName = 'PO'
    } else if (selectedRequest.status === 'Received') {
      docTitle = 'Goods Receipt'
      docFileName = 'GR'
    }

    try {
      const logoData = await fetchImageAsBase64('/snapfun_logo.png')
      doc.addImage(logoData, 'PNG', 20, 15, 30, 30)
    } catch (error) {
      console.error('Error loading logo:', error)
    }

    doc.setFont('times', 'bold')
    doc.setFontSize(20)
    doc.setTextColor('#3B82F6')
    doc.text('SnapFun Studio', 60, 25)

    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.setTextColor('#374151')
    doc.text('Photo Booth & Event Services', 60, 32)
    doc.text('Jakarta, Indonesia', 60, 38)

    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor('#1F2937')
    doc.text(docTitle, 105, 52, { align: 'center' })

    doc.setDrawColor('#3B82F6')
    doc.setLineWidth(0.5)
    doc.line(20, 58, 190, 58)

    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.setTextColor('#374151')
    
    let yPos = 70
    const leftCol = 20
    const rightCol = 110
    const labelOffset = 0
    const valueOffset = 40

    doc.setFont('times', 'bold')
    doc.text(`${docFileName} ID:`, leftCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(selectedRequest.pr_id, leftCol + valueOffset, yPos)

    doc.setFont('times', 'bold')
    doc.text('Status:', rightCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(selectedRequest.status, rightCol + valueOffset, yPos)

    yPos += 12
    doc.setFont('times', 'bold')
    doc.text('Created At:', leftCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(new Date(selectedRequest.created_at).toLocaleString('id-ID'), leftCol + valueOffset, yPos)

    doc.setFont('times', 'bold')
    doc.text('Updated At:', rightCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(new Date(selectedRequest.updated_at).toLocaleString('id-ID'), rightCol + valueOffset, yPos)

    yPos += 12
    doc.setFont('times', 'bold')
    doc.text('Requested By:', leftCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(selectedRequest.requested_by, leftCol + valueOffset, yPos)

    yPos += 12
    doc.setFont('times', 'bold')
    doc.text('Vendor:', leftCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(selectedRequest.supplier || selectedRequest.vendor, leftCol + valueOffset, yPos)

    yPos += 12
    doc.setFont('times', 'bold')
    doc.text('Marketplace Link:', leftCol, yPos)
    doc.setFont('times', 'normal')
    const linkText = selectedRequest.marketplace_link || '-'
    doc.text(linkText.substring(0, 55) + (linkText.length > 55 ? '...' : ''), leftCol + valueOffset, yPos)

    yPos += 12
    doc.setFont('times', 'bold')
    doc.text('Total Cost:', leftCol, yPos)
    doc.setFont('times', 'normal')
    doc.text(`Rp ${Number(selectedRequest.total_cost).toLocaleString('id-ID')}`, leftCol + valueOffset, yPos)

    if (selectedRequest.attachment) {
      yPos += 18
      doc.setFont('times', 'bold')
      doc.text('Attachment:', leftCol, yPos)
      yPos += 5

      try {
        const imgData = await fetchImageAsBase64(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedRequest.attachment}`)
        const imgWidth = 80
        const imgHeight = 60
        doc.addImage(imgData, 'JPEG', leftCol, yPos, imgWidth, imgHeight)
        yPos += imgHeight + 12
      } catch (error) {
        console.error('Error loading image:', error)
        doc.setFont('times', 'normal')
        doc.text('Unable to load attachment image', leftCol, yPos + 5)
        yPos += 12
      }
    }

    yPos += 8
    doc.setFont('times', 'bold')
    doc.setFontSize(14)
    doc.text('Items', leftCol, yPos)
    yPos += 8

    const tableData = selectedRequest.items.map(item => [
      item.item_classification,
      item.item_name,
      item.quantity.toString(),
      `Rp ${Number(item.cost).toLocaleString('id-ID')}`,
      item.additional_charge || '-',
      item.additional_cost ? `Rp ${Number(item.additional_cost).toLocaleString('id-ID')}` : '-',
      `Rp ${Number(item.total_cost).toLocaleString('id-ID')}`
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Classification', 'Item Name', 'Qty', 'Cost/Item', 'Add. Charge', 'Add. Cost', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        font: 'times',
        fontSize: 12
      },
      styles: {
        fontSize: 12,
        cellPadding: 4,
        halign: 'left',
        font: 'times'
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20 },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' }
      }
    })

    if (selectedRequest.status === 'Rejected' && selectedRequest.rejection_reason) {
      const finalY = doc.lastAutoTable.finalY + 18
      doc.setFont('times', 'bold')
      doc.setFontSize(12)
      doc.setTextColor('#DC2626')
      doc.text('Rejection Reason:', leftCol, finalY)
      doc.setFont('times', 'normal')
      doc.setFontSize(12)
      doc.setTextColor('#374151')
      const splitReason = doc.splitTextToSize(selectedRequest.rejection_reason, 170)
      doc.text(splitReason, leftCol, finalY + 10)
    }

    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.setTextColor('#9CA3AF')
    doc.text(`Generated on ${new Date().toLocaleString('id-ID')}`, 105, pageHeight - 12, { align: 'center' })

    doc.save(`${docFileName}-${selectedRequest.pr_id}.pdf`)
  }

  const fetchImageAsBase64 = async (url) => {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleView = async (pr_id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/${pr_id}`)
      const data = await response.json()
      if (data.success) {
        setSelectedRequest(data.data)
        setIsViewModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching procurement request:', error)
    }
  }

  const handleStatusChange = async (pr_id, newStatus, rejectionReason = null) => {
    console.log('handleStatusChange called', pr_id, newStatus, rejectionReason)

    if (STATUS_REQUIRES_QUOTATION.includes(newStatus)) {
      const targetRequest = procurementRequests.find((r) => r.pr_id === pr_id)
      if (!targetRequest || hasMissingQuotation(targetRequest.items)) {
        showSystemNotice('error', 'This request still needs quotation. Fill item cost (> 0) first before moving status.')
        return
      }
    }

    try {
      const payload = { status: newStatus }
      if (rejectionReason) {
        payload.rejection_reason = rejectionReason
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/${pr_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      console.log('Response:', data)
      if (data.success) {
        fetchSummary()
        fetchProcurementRequests(statusFilter)
      } else {
        console.error('Server error:', data.message)
        showSystemNotice('error', 'Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showSystemNotice('error', 'Error updating status: ' + error.message)
    }
  }

  const handleDraftRequest = (request) => {
    setSelectedRequestForDraft(request)
    setShowDraftModal(true)
  }

  const confirmDraft = async () => {
    try {
      await handleStatusChange(selectedRequestForDraft.pr_id, 'Draft')
      setShowDraftModal(false)
      setSelectedRequestForDraft(null)
    } catch (error) {
      console.error('Error drafting request:', error)
      showSystemNotice('error', 'Error drafting request')
    }
  }

  const handleUndraftRequest = (request) => {
    setSelectedRequestForUndraft(request)
    setShowUndraftModal(true)
  }

  const confirmUndraft = async () => {
    try {
      await handleStatusChange(selectedRequestForUndraft.pr_id, 'Waiting Approval')
      setShowUndraftModal(false)
      setSelectedRequestForUndraft(null)
    } catch (error) {
      console.error('Error undrafting request:', error)
      showSystemNotice('error', 'Error undrafting request')
    }
  }

  const handleDelete = async (pr_id, rejectionReason = null, skipReceivedConfirm = false) => {
    const request = procurementRequests.find(r => r.pr_id === pr_id)
    if (!request) return

    if (request.status === 'Received' && !skipReceivedConfirm) {
      openActionConfirmModal(
        'Delete Received Request',
        'This will move the PR to Rejected status with deleted flag. Continue?',
        async () => {
          await handleDelete(pr_id, rejectionReason, true)
        }
      )
      return
    }

    if (request.status !== 'Received') {
      setSelectedRequestForDelete(request)
      setShowDeleteModal(true)
      return
    }

    try {
      let url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/${pr_id}`
      if (request.status === 'Received') {
        url += '?status=deleted'
        if (rejectionReason) {
          url += `&rejection_reason=${encodeURIComponent(rejectionReason)}`
        }
      }

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        fetchSummary()
        fetchProcurementRequests(statusFilter)
      } else {
        showSystemNotice('error', 'Error deleting procurement request: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting procurement request:', error)
      showSystemNotice('error', 'Error deleting procurement request')
    }
  }

  const confirmDelete = async () => {
    if (!selectedRequestForDelete) return
    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/${selectedRequestForDelete.pr_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.session_token}` }
      })
      const data = await response.json()
      if (data.success) {
        fetchSummary()
        fetchProcurementRequests(statusFilter)
        setShowDeleteModal(false)
        setSelectedRequestForDelete(null)
      } else {
        showSystemNotice('error', 'Error deleting procurement request: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting procurement request:', error)
      showSystemNotice('error', 'Error deleting procurement request')
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!vendorSearchTerm) {
      errors.vendor = 'Vendor is required'
    } else if (!formData.vendor_id) {
      errors.vendor = 'This data doesn\'t exist. Click here'
    }
    
    formData.items.forEach((item, index) => {
      if (!item.item_name) {
        errors[`item_name_${index}`] = 'Item name is required'
      } else {
        if (item.item_classification === 'Supplies') {
          if (!item.item_id) {
            errors[`item_name_${index}`] = 'This data doesn\'t exist. Click here'
          }
        } else if (item.item_classification === 'Assets') {
          if (!item.asset_id) {
            errors[`item_name_${index}`] = 'This data doesn\'t exist. Click here'
          }
        }
      }
      
      if (!item.quantity) {
        errors[`quantity_${index}`] = 'Quantity is required'
      }
      
      if (!item.cost) {
        errors[`cost_${index}`] = 'Cost is required'
      } else if (!Number.isFinite(Number(item.cost)) || Number(item.cost) <= 0) {
        errors[`cost_${index}`] = 'Cost must be greater than 0 (valid quotation required)'
      }
    })
    
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setShowMissingDataModal(true)
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const formDataObj = new FormData()
    formDataObj.append('items', JSON.stringify(formData.items))
    formDataObj.append('requested_by', userName)
    formDataObj.append('supplier', formData.vendor)
    formDataObj.append('marketplace_link', formData.marketplace_link)
    formDataObj.append('status', 'Waiting Approval')
    
    if (formData.attachment) {
      formDataObj.append('attachment', formData.attachment)
    }

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: formDataObj
      })
      const data = await response.json()
      console.log('Response:', data)
      if (data.success) {
        setIsCreateModalOpen(false)
        fetchSummary()
        fetchProcurementRequests(statusFilter)
      } else {
        console.error('Server error:', data.message)
        showSystemNotice('error', 'Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error creating procurement request:', error)
      showSystemNotice('error', 'Error creating procurement request: ' + error.message)
    }
  }

  const handleSaveDraft = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }
    console.log('handleSaveDraft called', formData)
    const totalCost = (parseFloat(formData.cost) * parseInt(formData.quantity)) + (formData.additional_cost ? parseFloat(formData.additional_cost) : 0)

    const payload = {
      ...formData,
      requested_by: userName,
      total_cost: totalCost,
      status: 'Draft'
    }

    console.log('Payload:', payload)

    try {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.session_token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      console.log('Response:', data)
      if (data.success) {
        setIsCreateModalOpen(false)
        fetchSummary()
        fetchProcurementRequests(statusFilter)
      } else {
        console.error('Server error:', data.message)
        showSystemNotice('error', 'Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      showSystemNotice('error', 'Error saving draft: ' + error.message)
    }
  }

  const getStatusColor = (status, deletedFromReceived) => {
    if (deletedFromReceived) return 'bg-red-200 text-red-900'
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Waiting Approval': return 'bg-yellow-100 text-yellow-800'
      case 'Approved': return 'bg-blue-100 text-blue-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Received': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status, deletedFromReceived) => {
    if (deletedFromReceived) return <Trash2 size={16} />
    switch (status) {
      case 'Draft': return <Package size={16} />
      case 'Waiting Approval': return <Clock size={16} />
      case 'Approved': return <CheckCircle size={16} />
      case 'Rejected': return <XCircle size={16} />
      case 'Received': return <Inbox size={16} />
      default: return null
    }
  }

  const getStatusText = (status, deletedFromReceived, rejectedFromWaiting) => {
    if (deletedFromReceived) return 'Deleted'
    if (rejectedFromWaiting && status === 'Draft') return 'Rejected'
    return status
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Procurement</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 text-sm font-medium shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Request
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div
            onClick={() => handleStatusFilter('')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === '' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">All Requests</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{summary.draft + summary.waiting_approval + summary.approved + summary.rejected + summary.received}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Draft')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Draft' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Draft</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{summary.draft}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Waiting Approval')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Waiting Approval' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Waiting Approval</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.waiting_approval}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Approved')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Approved' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Approved</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.approved}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Rejected')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Rejected' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Rejected</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.rejected}</p>
          </div>
          <div
            onClick={() => handleStatusFilter('Received')}
            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow cursor-pointer transition ${statusFilter === 'Received' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <p className="text-gray-500 dark:text-gray-400 text-sm">Received</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.received}</p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search by ID, Items, or Vendor</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search requests..."
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Date</label>
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

        {/* Procurement Overview */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Procurement Overview</h2>
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
                Download CSV
              </button>
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {procurementRequests.map((request) => (
                  <tr key={request.pr_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onDoubleClick={() => handleView(request.pr_id)}>
                      {request.pr_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {request.items && request.items.length > 0 ? (
                        <div className="space-y-1">
                          {request.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              {item.item_name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No items</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {request.items && request.items.length > 0 ? (
                        <div className="space-y-1">
                          {request.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              {item.quantity}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{request.supplier || request.vendor}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-col">
                        <span>Rp {Number(request.total_cost).toLocaleString('id-ID')}</span>
                        {hasMissingQuotation(request.items) && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Need quotation</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {new Date(request.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(request.status, request.deleted_from_received)}`}>
                        {getStatusIcon(request.status, request.deleted_from_received)}
                        {getStatusText(request.status, request.deleted_from_received, request.rejected_from_waiting)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(request.pr_id)}
                          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {request.status === 'Waiting Approval' && (
                          <>
                            <button
                              onClick={() => handleEdit(request.pr_id)}
                              className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            {userRole === 'admin' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(request.pr_id, 'Approved')}
                                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  title="Approve"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingPrId(request.pr_id)
                                    setIsRejectModalOpen(true)
                                  }}
                                  className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                                  title="Reject"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDraftRequest(request)}
                              className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              title="Draft"
                            >
                              <Package size={16} />
                            </button>
                          </>
                        )}
                        {request.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => handleUndraftRequest(request)}
                              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                              title="Undraft"
                            >
                              <Upload size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(request.pr_id)}
                              className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {request.status === 'Approved' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(request.pr_id, 'Received')}
                              className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Received"
                            >
                              <Inbox size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setRejectingPrId(request.pr_id)
                                setIsRejectModalOpen(true)
                              }}
                              className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {request.status === 'Received' && (
                          <button
                            onClick={() => {
                              setRejectingPrId(request.pr_id)
                              setIsRejectModalOpen(true)
                            }}
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {request.status === 'Rejected' && (
                          <button
                            onClick={() => handleDelete(request.pr_id)}
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRequests)} of {totalRequests} requests
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

        {/* Create/Edit Modal */}
        {isCreateModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, requestCloseCreateModal)}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">New Purchase Request</h2>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Items</h3>
                    {formData.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-700">Item {index + 1}</span>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Classification *</label>
                            <select
                              value={item.item_classification}
                              onChange={(e) => handleItemChange(index, 'item_classification', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="Supplies">Supplies</option>
                              <option value="Assets">Assets</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                            <input
                              type="text"
                              list={item.item_classification === 'Supplies' ? 'inventory-datalist' : 'assets-datalist'}
                              value={item.item_name}
                              onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`item_name_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder={item.item_classification === 'Supplies' ? 'Search or select supply...' : 'Search or select asset...'}
                              required
                            />
                            <datalist id="inventory-datalist">
                              {inventory.map((inv) => (
                                <option key={inv.item_id} value={inv.item_name}>{inv.item_name}</option>
                              ))}
                            </datalist>
                            <datalist id="assets-datalist">
                              {assets.map((asset) => (
                                <option key={asset.asset_id} value={asset.name}>{asset.name}</option>
                              ))}
                            </datalist>
                            {formErrors[`item_name_${index}`] && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors[`item_name_${index}`].includes('Click here') ? (
                                  <>
                                    This data doesn't exist.{' '}
                                    <span 
                                      onClick={() => navigate(item.item_classification === 'Supplies' ? '/inventory' : '/assets')}
                                      className="underline cursor-pointer hover:text-red-700"
                                    >
                                      Click here
                                    </span>
                                  </>
                                ) : (
                                  formErrors[`item_name_${index}`]
                                )}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '')
                                handleItemChange(index, 'quantity', value)
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors[`quantity_${index}`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`quantity_${index}`]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cost (per item) *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '')
                                handleItemChange(index, 'cost', value)
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9.]/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`cost_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors[`cost_${index}`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`cost_${index}`]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Charge</label>
                            <input
                              type="text"
                              value={item.additional_charge}
                              onChange={(e) => handleItemChange(index, 'additional_charge', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Shipping fee"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Cost</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.additional_cost}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '')
                                handleItemChange(index, 'additional_cost', value)
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9.]/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              disabled={!item.additional_charge}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${!item.additional_charge ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Request Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                      <input
                        type="text"
                        value={vendorSearchTerm}
                        onChange={(e) => handleVendorSearch(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.vendor ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Search vendor..."
                        required
                      />
                      {vendorSearchResults.length > 0 && (
                        <div className="mt-1 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                          {vendorSearchResults.map((vendor) => (
                            <div
                              key={vendor.vendor_id}
                              onClick={() => handleVendorSelect(vendor)}
                              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            >
                              <p className="font-medium text-gray-800">{vendor.vendor_name}</p>
                              <p className="text-sm text-gray-500">{vendor.contact_person || 'N/A'} - {vendor.phone_number || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setShowAddVendorModal(true)}
                          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Plus size={14} /> Add Vendor
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVendorOverviewModal(true)}
                          className="mt-2 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marketplace Link</label>
                      <input
                        type="text"
                        value={formData.marketplace_link}
                        onChange={(e) => setFormData({ ...formData, marketplace_link: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image Attachment</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false)
                        setFormErrors({})
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                    >
                      Draft
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && selectedRequest && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setIsEditModalOpen(false)
              setFormErrors({})
            })}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Edit Purchase Request ({selectedRequest.pr_id})</h2>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Created By: {selectedRequest.requested_by}
                  </span>
                </div>
                <form onSubmit={handleUpdate} noValidate>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Items</h3>
                    {formData.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-700">Item {index + 1}</span>
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Classification *</label>
                            <select
                              value={item.item_classification}
                              onChange={(e) => handleItemChange(index, 'item_classification', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="Supplies">Supplies</option>
                              <option value="Assets">Assets</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                            <input
                              type="text"
                              list={item.item_classification === 'Supplies' ? 'inventory-datalist' : 'assets-datalist'}
                              value={item.item_name}
                              onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`item_name_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder={item.item_classification === 'Supplies' ? 'Search or select supply...' : 'Search or select asset...'}
                              required
                            />
                            <datalist id="inventory-datalist">
                              {inventory.map((inv) => (
                                <option key={inv.item_id} value={inv.item_name}>{inv.item_name}</option>
                              ))}
                            </datalist>
                            <datalist id="assets-datalist">
                              {assets.map((asset) => (
                                <option key={asset.asset_id} value={asset.name}>{asset.name}</option>
                              ))}
                            </datalist>
                            {formErrors[`item_name_${index}`] && (
                              <p className="text-red-500 text-xs mt-1">
                                {formErrors[`item_name_${index}`].includes('Click here') ? (
                                  <>
                                    This data doesn't exist.{' '}
                                    <span 
                                      onClick={() => navigate(item.item_classification === 'Supplies' ? '/inventory' : '/assets')}
                                      className="underline cursor-pointer hover:text-red-700"
                                    >
                                      Click here
                                    </span>
                                  </>
                                ) : (
                                  formErrors[`item_name_${index}`]
                                )}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '')
                                handleItemChange(index, 'quantity', value)
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors[`quantity_${index}`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`quantity_${index}`]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cost (per item) *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '')
                                handleItemChange(index, 'cost', value)
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9.]/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors[`cost_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {formErrors[`cost_${index}`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`cost_${index}`]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Charge</label>
                            <input
                              type="text"
                              value={item.additional_charge}
                              onChange={(e) => handleItemChange(index, 'additional_charge', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Shipping fee"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Cost</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.additional_cost}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '')
                                handleItemChange(index, 'additional_cost', value)
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9.]/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              disabled={!item.additional_charge}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${!item.additional_charge ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Request Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                      <input
                        type="text"
                        value={vendorSearchTerm}
                        onChange={(e) => handleVendorSearch(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formErrors.vendor ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Search vendor..."
                        required
                      />
                      {vendorSearchResults.length > 0 && (
                        <div className="mt-1 border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                          {vendorSearchResults.map((vendor) => (
                            <div
                              key={vendor.vendor_id}
                              onClick={() => handleVendorSelect(vendor)}
                              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                            >
                              <p className="font-medium text-gray-800">{vendor.vendor_name}</p>
                              <p className="text-sm text-gray-500">{vendor.contact_person || 'N/A'} - {vendor.phone_number || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setShowAddVendorModal(true)}
                          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Plus size={14} /> Add Vendor
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVendorOverviewModal(true)}
                          className="mt-2 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marketplace Link</label>
                      <input
                        type="text"
                        value={formData.marketplace_link}
                        onChange={(e) => setFormData({ ...formData, marketplace_link: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image Attachment</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {selectedRequest.attachment && (
                        <p className="text-sm text-gray-500 mt-1">Current: {selectedRequest.attachment}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false)
                        setFormErrors({})
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Update
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && selectedRequest && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setIsViewModalOpen(false))}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Purchase Request Details</h2>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Created By: {selectedRequest.requested_by}
                  </span>
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-3">Request Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                        <div className="flex flex-col space-y-0.5 text-gray-900 font-medium">
                          {(() => {
                            const idStr = selectedRequest.pr_id;
                            const numPart = idStr.substring(2);
                            const prefix = idStr.substring(0, 2);
                            
                            let idsToRender = [];
                            if (prefix === 'PR') {
                              idsToRender = [`PR${numPart}`];
                            } else if (prefix === 'PO') {
                              idsToRender = [`PR${numPart}`, `PO${numPart}`];
                            } else if (prefix === 'GR') {
                              idsToRender = [`PR${numPart}`, `PO${numPart}`, `GR${numPart}`];
                            }
                            return idsToRender.map((id) => (
                              <span key={id}>{id}</span>
                            ));
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status, selectedRequest.deleted_from_received)}`}>
                          {getStatusText(selectedRequest.status, selectedRequest.deleted_from_received, selectedRequest.rejected_from_waiting)}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                        <p className="text-gray-900">{selectedRequest.supplier || selectedRequest.vendor}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Marketplace Link</label>
                        <p className="text-gray-900">{selectedRequest.marketplace_link || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                        <p className="text-gray-900 font-bold">Rp {Number(selectedRequest.total_cost).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image Attachment</label>
                        {selectedRequest.attachment ? (
                          <div>
                            <button
                              onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedRequest.attachment}`, '_blank')}
                              className="text-blue-600 hover:text-blue-800 underline mb-2 block"
                            >
                              Open Attachment in New Window
                            </button>
                            {selectedRequest.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                              <img
                                src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedRequest.attachment}`}
                                alt="Attachment"
                                className="max-w-full h-auto rounded-lg cursor-pointer"
                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${selectedRequest.attachment}`, '_blank')}
                                title="Click to open in new window"
                              />
                            )}
                            {!selectedRequest.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                              <p className="text-gray-600">{selectedRequest.attachment}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">No attachment</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                        <p className="text-gray-900">{new Date(selectedRequest.created_at).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
                        <p className="text-gray-900">{new Date(selectedRequest.updated_at).toLocaleString('id-ID')}</p>
                      </div>
                      {selectedRequest.rejection_reason && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                          <p className="text-gray-900 bg-red-50 p-3 rounded-lg border border-red-200">{selectedRequest.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-3">Items</h3>
                    {selectedRequest.items && selectedRequest.items.length > 0 ? (
                      <div className="space-y-3">
                        {selectedRequest.items.map((item, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg border">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                                <p className="text-gray-900">{item.item_classification}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <p className="text-gray-900">{item.item_name}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <p className="text-gray-900">{item.quantity}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (per item)</label>
                                <p className="text-gray-900">Rp {Number(item.cost).toLocaleString('id-ID')}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Charge</label>
                                <p className="text-gray-900">{item.additional_charge || '-'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Cost</label>
                                <p className="text-gray-900">{item.additional_cost ? `Rp ${Number(item.additional_cost).toLocaleString('id-ID')}` : '-'}</p>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Total Cost</label>
                                <p className="text-gray-900 font-bold">Rp {Number(item.total_cost).toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No items</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  {(selectedRequest.status === 'Waiting Approval' || selectedRequest.status === 'Approved' || selectedRequest.status === 'Received') && (
                    <button
                      onClick={handleDownloadPDF}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                  )}
                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {isRejectModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => {
              setIsRejectModalOpen(false)
              setRejectionReason('')
              setRejectingPrId(null)
            })}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Rejection Reason</h2>
                <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this procurement request.</p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Enter rejection reason..."
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsRejectModalOpen(false)
                      setRejectionReason('')
                      setRejectingPrId(null)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (rejectionReason.trim()) {
                        const request = procurementRequests.find(r => r.pr_id === rejectingPrId)
                        if (request && request.status === 'Received') {
                          handleDelete(rejectingPrId, rejectionReason)
                        } else {
                          handleStatusChange(rejectingPrId, 'Rejected', rejectionReason)
                        }
                        setIsRejectModalOpen(false)
                        setRejectionReason('')
                        setRejectingPrId(null)
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Draft Confirmation Modal */}
        {showDraftModal && selectedRequestForDraft && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDraftModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Draft Request</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to draft this request?</p>
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

        {/* Undraft Confirmation Modal */}
        {showUndraftModal && selectedRequestForUndraft && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowUndraftModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Undraft Request</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to undraft this request? The status will become Waiting Approval.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUndraftModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUndraft}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedRequestForDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowDeleteModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Delete Request</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to delete this procurement request? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedRequestForDelete(null)
                  }}
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

        {/* Add Vendor Modal */}
        {showAddVendorModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowAddVendorModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New Vendor</h2>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    value={newVendorFormData.vendor_name}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newVendorFormData.contact_person}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newVendorFormData.phone_number}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newVendorFormData.email}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={newVendorFormData.city}
                    onChange={(e) => setNewVendorFormData({ ...newVendorFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
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
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">All Vendors</h2>
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
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact Person</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">City</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {vendors.map((vendor) => (
                      <tr key={vendor.vendor_id}>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.vendor_name}
                              onChange={(e) => setEditingVendor({ ...editingVendor, vendor_name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">{vendor.vendor_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.contact_person}
                              onChange={(e) => setEditingVendor({ ...editingVendor, contact_person: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">{vendor.contact_person || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.phone_number}
                              onChange={(e) => setEditingVendor({ ...editingVendor, phone_number: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          ) : (
                            <span 
                              className="text-sm text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
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
                              className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">{vendor.email || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingVendor?.vendor_id === vendor.vendor_id ? (
                            <input
                              type="text"
                              value={editingVendor.city}
                              onChange={(e) => setEditingVendor({ ...editingVendor, city: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          ) : (
                            <span className="text-sm text-gray-900 dark:text-white">{vendor.city || '-'}</span>
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
                                className="px-2 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-300 dark:hover:bg-slate-600"
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
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-line">{vendorDeleteError}</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowVendorOverviewModal(false)
                    setEditingVendor(null)
                    setVendorDeleteError(null)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
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
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Cannot Delete Vendor</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Vendor cannot be deleted. It is currently being used in:</p>
              <ul className="list-none text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                {vendorUsageDetails.inventory && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <span className="font-medium text-gray-800 dark:text-white">Inventory:</span>{' '}
                      {vendorUsageDetails.inventory.count} items
                    </span>
                  </li>
                )}
                {vendorUsageDetails.procurement && vendorUsageDetails.procurement.length > 0 && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <span className="font-medium text-gray-800 dark:text-white">Procurement:</span>{' '}
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
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showCloseCreateDraftPromptModal && isCreateModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, () => setShowCloseCreateDraftPromptModal(false))}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Save as draft?</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">Before closing this form, do you want to save this data as draft?</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseCreateDraftPromptModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    setShowCloseCreateDraftPromptModal(false)
                    await handleSaveDraft(e)
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Yes, Save Draft
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">If draft save fails due to required fields, use Cancel button in the main form to close without saving.</p>
            </div>
          </div>
        )}

        {actionConfirmModal.isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            onMouseDown={(e) => handleBackdropClose(e, closeActionConfirmModal)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{actionConfirmModal.title}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">{actionConfirmModal.message}</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeActionConfirmModal}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600"
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
              createdAt: ''
            })
          }
          title="Download CSV Filter"
          exportLabel="Download CSV"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
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
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Created At</h3>
            <input
              type="date"
              value={csvFilter.createdAt}
              onChange={(e) => setCsvFilter({ ...csvFilter, allData: false, createdAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CsvFilterModal>
      </main>
      <SnapFunny />
    </div>
  )
}

export default Procurement
