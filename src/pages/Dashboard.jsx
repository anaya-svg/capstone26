import Sidebar from '../components/Sidebar'
import SnapFunny from '../components/SnapFunny'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts'
import { Box, Package, Calendar, DollarSign, AlertCircle, FileText, Users, Download, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { exportToExcel } from '../utils/exportExcel'
import AccountingReportModal from '../components/AccountingReportModal'
import { useTheme } from '../context/ThemeContext'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

function Dashboard() {
  const { isDarkMode } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('user')
  const navigate = useNavigate()

  const [summary, setSummary] = useState({
    totalAssets: 0,
    lowStockItems: 0,
    upcomingEvents: 0,
    totalCustomers: 0,
    customerSegmentation: {
      inStudio: 0,
      offSite: 0
    },
    totalRevenue: 0
  })

  const [assetStatus, setAssetStatus] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [predictiveStock, setPredictiveStock] = useState([])
  const [expandedItemEvents, setExpandedItemEvents] = useState({})
  const [autoDraftLoadingItemId, setAutoDraftLoadingItemId] = useState(null)
  const [showAutoDraftModal, setShowAutoDraftModal] = useState(false)
  const [selectedAutoDraftItem, setSelectedAutoDraftItem] = useState(null)
  const [autoDraftQtyInput, setAutoDraftQtyInput] = useState('')
  const [autoDraftNotice, setAutoDraftNotice] = useState({ type: '', message: '' })
  const [autoDraftError, setAutoDraftError] = useState('')
  const [revenueTrend, setRevenueTrend] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [recentProcurement, setRecentProcurement] = useState([])
  
  const [showAccountingModal, setShowAccountingModal] = useState(false)

  const handleBackdropClose = (e, onClose) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const closeTopModal = () => {
    if (showAccountingModal) {
      setShowAccountingModal(false)
      return true
    }
    if (showAutoDraftModal) {
      closeAutoDraftModal()
      return true
    }
    return false
  }

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!user) {
      navigate('/login')
      return
    }
    setUserName(user.full_name)
    setUserRole(user.role)

    fetchDashboardData()
  }, [navigate])

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
  }, [showAutoDraftModal, showAccountingModal])

  const fetchDashboardData = async () => {
    const user = JSON.parse(sessionStorage.getItem('user'))
    const authHeaders = user?.session_token ? { 'Authorization': `Bearer ${user.session_token}` } : {}

    const safeFetch = async (url) => {
      try {
        const res = await fetch(url, { headers: authHeaders })
        if (!res.ok) {
          console.warn(`Fetch to ${url} failed with status: ${res.status}`)
          return null
        }
        return await res.json()
      } catch (err) {
        console.error(`Error fetching from ${url}:`, err)
        return null
      }
    }

    const summaryData = await safeFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/summary`)
    if (summaryData?.success) {
      setSummary(summaryData.data)
    }

    const lowStockData = await safeFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/low-stock`)
    if (lowStockData?.success) {
      setLowStockItems(lowStockData.data)
    }

    const predictiveStockData = await safeFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/predictive-stock`)
    if (predictiveStockData?.success) {
      setPredictiveStock(predictiveStockData.data)
    }

    const revenueTrendData = await safeFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/revenue-trend`)
    if (revenueTrendData?.success) {
      setRevenueTrend(revenueTrendData.data)
    }

    const upcomingEventsData = await safeFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/upcoming-events`)
    if (upcomingEventsData?.success) {
      setUpcomingEvents(upcomingEventsData.data)
    }

    const recentProcurementData = await safeFetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/recent-procurement`)
    if (recentProcurementData?.success) {
      setRecentProcurement(recentProcurementData.data)
    }
  }

  const openAutoDraftModal = (item) => {
    if (!item?.item_id) return

    const currentStock = item.projected_net_stock !== undefined ? Number(item.projected_net_stock) : (Number(item.stock_quantity) || 0)
    const minimumStock = Number(item.minimum_stock) || 0
    const recommendedQty = Math.max(minimumStock - currentStock, 1)
    setSelectedAutoDraftItem({
      ...item,
      stock_quantity: currentStock
    })
    setAutoDraftQtyInput(String(recommendedQty))
    setShowAutoDraftModal(true)
  }

  const closeAutoDraftModal = () => {
    setShowAutoDraftModal(false)
    setSelectedAutoDraftItem(null)
    setAutoDraftQtyInput('')
    setAutoDraftError('')
  }

  const toggleItemEvents = (itemId) => {
    setExpandedItemEvents(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleCreateAutoDraft = async () => {
    if (!selectedAutoDraftItem?.item_id) return

    setAutoDraftError('')

    const requestedQty = Number(autoDraftQtyInput)
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      setAutoDraftError('Quantity harus diisi angka valid lebih dari 0 dan tidak boleh minus.')
      return
    }

    setAutoDraftLoadingItemId(selectedAutoDraftItem.item_id)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/auto-draft-from-inventory/${selectedAutoDraftItem.item_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requested_by: userName || 'System Auto Draft',
          suggested_quantity: Math.floor(requestedQty)
        })
      })

      const data = await response.json()

      if (data.success) {
        setAutoDraftNotice({
          type: 'success',
          message: `Draft procurement ${data.data?.pr_id} berhasil dibuat untuk ${data.data?.item_name}.`
        })
        closeAutoDraftModal()
        fetchDashboardData()
      } else {
        setAutoDraftError(data.message || 'Gagal membuat draft procurement.')
      }
    } catch (error) {
      console.error('Error creating auto draft procurement:', error)
      setAutoDraftError('Terjadi error saat membuat draft procurement otomatis.')
    } finally {
      setAutoDraftLoadingItemId(null)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      case 'pending':
        return 'Pending'
      case 'Waiting Approval':
        return 'Waiting Approval'
      case 'approved':
        return 'Approved'
      case 'Approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      case 'Rejected':
        return 'Rejected'
      case 'received':
        return 'Received'
      case 'Received':
        return 'Received'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
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

      const user = JSON.parse(sessionStorage.getItem('user'))
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${user?.session_token}`
        }
      })
      const data = await response.json()

      if (!data.success) {
        setAutoDraftNotice({
          type: 'error',
          message: 'Error fetching accounting report'
        })
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

      setShowAccountingModal(false)
    } catch (error) {
      console.error('Error downloading accounting report:', error)
      setAutoDraftNotice({
        type: 'error',
        message: 'Error downloading accounting report'
      })
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isProj = data.is_projection
      
      return (
        <div className="bg-white p-3 shadow-xl rounded-lg border border-gray-100 min-w-[200px] text-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2">
            <p className="font-bold text-gray-800">{data.month}</p>
            {isProj ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100 flex items-center gap-0.5">
                <Sparkles size={8} /> AI Forecast
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-100 flex items-center gap-0.5">
                📊 Actual Data
              </span>
            )}
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">In Studio:</span>
              <span className={`font-semibold ${isProj ? 'text-indigo-600' : 'text-purple-600'}`}>
                {formatCurrency(data.in_studio_revenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Off Site:</span>
              <span className={`font-semibold ${isProj ? 'text-indigo-600' : 'text-teal-600'}`}>
                {formatCurrency(data.off_site_revenue)}
              </span>
            </div>
            <div className="border-t border-dashed border-gray-100 my-1 pt-1.5 flex justify-between items-center">
              <span className="text-gray-700 font-bold">Total:</span>
              <span className="font-extrabold text-indigo-600 text-sm">
                {formatCurrency(data.total_revenue)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const formattedChartData = revenueTrend.map((item, idx) => {
    const isLastActual = !item.is_projection && (revenueTrend[idx + 1]?.is_projection);
    return {
      ...item,
      total_actual: item.is_projection ? null : item.total_revenue,
      total_projected: (item.is_projection || isLastActual) ? item.total_revenue : null,
      in_studio_actual: item.is_projection ? null : item.in_studio_revenue,
      in_studio_projected: (item.is_projection || isLastActual) ? item.in_studio_revenue : null,
      off_site_actual: item.is_projection ? null : item.off_site_revenue,
      off_site_projected: (item.is_projection || isLastActual) ? item.off_site_revenue : null,
    }
  });

  const getAiFinancialInsights = () => {
    if (revenueTrend.length === 0) return null;

    const projections = revenueTrend.filter(r => r.is_projection);
    const history = revenueTrend.filter(r => !r.is_projection);

    if (projections.length === 0 || history.length === 0) return null;

    const lastActualMonth = history[history.length - 1];
    const firstProjMonth = projections[0];

    const revenueChange = ((firstProjMonth.total_revenue - lastActualMonth.total_revenue) / lastActualMonth.total_revenue) * 100;
    const isRevenueDropping = firstProjMonth.total_revenue < lastActualMonth.total_revenue;

    const lowOffsiteMonth = projections.find(p => p.off_site_revenue === 0 || p.off_site_revenue < 3000000);

    let advice = "";
    let alertType = "info"; 

    if (isRevenueDropping) {
      alertType = "warning";
      advice = `Pendapatan di bulan ${firstProjMonth.month} diproyeksikan menurun sebesar ${Math.abs(revenueChange).toFixed(1)}% dibanding bulan ini. AI menyarankan segera aktifkan promo paket bundling in-studio untuk menambal kekurangan kas dari walk-in customer.`;
    } else {
      alertType = "success";
      advice = `Pertumbuhan positif terdeteksi! Pendapatan bulan ${firstProjMonth.month} diestimasikan naik sebesar ${revenueChange.toFixed(1)}% dipicu oleh booking event yang kuat. AI menyarankan mengalokasikan 20% kas untuk restock supply kertas foto & tinta guna mempersiapkan beban operasional mendatang.`;
    }

    if (lowOffsiteMonth && lowOffsiteMonth.month !== firstProjMonth.month) {
      advice += ` Selain itu, pesanan event Off-Site pada bulan ${lowOffsiteMonth.month} terpantau sangat sepi. Rekomendasi taktis: Hubungi klien korporat loyal di database CRM Anda dan tawarkan diskon Early Booking B2B.`;
    }

    return {
      advice,
      alertType,
      month: firstProjMonth.month
    };
  };

  const aiInsight = getAiFinancialInsights();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar
        userRole={userRole}
        userName={userName}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className={`flex-1 p-8 ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dashboard</h1>

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

        {/* Summary Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-5 shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{summary.totalAssets}</p>
              </div>
              <Box className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-5 shadow-md border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Low Stock</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{summary.lowStockItems}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-5 shadow-md border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Customers</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{summary.totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-5 shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming Events</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{summary.upcomingEvents}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-5 shadow-md border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Customer Segmentation Widget */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Segmentation:</span>
              </div>
              <div className="flex gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">In Studio</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.customerSegmentation.inStudio}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Off Site</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{summary.customerSegmentation.offSite}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* AI-Assisted Stock & Demand Predictor (Proactive Forecasting) */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 shadow-md flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-sm font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                  AI-Assisted Stock & Demand Predictor
                </h2>
                
                {/* Unified Badges on Right to avoid absolute overlaps */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                    <Sparkles size={9} /> Proactive ERP
                  </span>
                  <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 px-2 py-0.5 rounded-full font-bold">
                    {predictiveStock.length} alerts
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {predictiveStock.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">All stocks are secure</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Physical stock and future event demands are fully aligned.</p>
                  </div>
                ) : (
                  predictiveStock.map((item) => (
                    <div key={item.item_id} className="bg-white dark:bg-slate-700 p-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{item.item_name}</p>
                            {item.severity === 'critical_shortage' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded animate-pulse">
                                SHORTAGE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.category_name ? item.category_name.charAt(0).toUpperCase() + item.category_name.slice(1) : 'Uncategorized'}</p>
                        </div>

                        <div className="flex items-center gap-3 ml-3">
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              item.severity === 'critical_shortage' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {item.projected_net_stock} {item.uom_name}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Min: {item.minimum_stock}</p>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => openAutoDraftModal(item)}
                              disabled={autoDraftLoadingItemId === item.item_id}
                              className={`px-2 py-1 text-[10px] font-bold text-white rounded transition disabled:opacity-50 ${
                                item.severity === 'critical_shortage'
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                              title="Proactive Restock Draft"
                            >
                              {autoDraftLoadingItemId === item.item_id ? 'Creating...' : 'Auto Draft'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Stock Metrics Breakdown */}
                      <div className="mt-2 pt-2 border-t border-dashed border-gray-200/60 dark:border-gray-600/60 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                        <div>
                          SoH: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.physical_stock} {item.uom_name}</span>
                        </div>
                        {item.reserved_qty > 0 && (
                          <div>
                            Reserved for Events: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{item.reserved_qty} {item.uom_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Expandable Upcoming Events list */}
                      {item.upcoming_events && item.upcoming_events.length > 0 && (
                        <div className="mt-1.5">
                          <button
                            onClick={() => toggleItemEvents(item.item_id)}
                            className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
                          >
                            {expandedItemEvents[item.item_id] ? (
                              <>Hide Event Details <ChevronUp size={10} /></>
                            ) : (
                              <>Show Booked Events ({item.upcoming_events.length}) <ChevronDown size={10} /></>
                            )}
                          </button>
                          
                          {expandedItemEvents[item.item_id] && (
                            <div className="mt-1.5 p-1.5 bg-white/80 dark:bg-slate-600/80 rounded border border-gray-100 dark:border-gray-600 space-y-1 text-[10px] max-h-[80px] overflow-y-auto">
                              {item.upcoming_events.map((evt, idx) => (
                                <div key={idx} className="flex justify-between items-center text-gray-600 dark:text-gray-300 py-0.5 border-b border-gray-50 dark:border-gray-600 last:border-b-0">
                                  <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]" title={evt.event_name}>
                                    {evt.event_id} ({evt.event_name})
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-500">{new Date(evt.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">+{evt.reserved_qty} qty</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="mt-2 text-right">
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Go to Inventory →
              </button>
            </div>
          </div>

          {/* Revenue Trend - Line Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">Revenue (Monthly Trend & Forecast)</h2>
                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-700">
                    Proactive 3M Projection
                  </span>
                </div>
                <button
                  onClick={() => setShowAccountingModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                >
                  <Download size={14} />
                  Accounting Report
                </button>
              </div>
              
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={formattedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#475569' : '#e5e7eb'} />
                  <XAxis dataKey="month" tick={{fontSize: 10}} stroke={isDarkMode ? '#94a3b8' : '#6b7280'} />
                  <YAxis tick={{fontSize: 10}} stroke={isDarkMode ? '#94a3b8' : '#6b7280'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  
                  {/* Actual lines (Solid) */}
                  <Line type="monotone" dataKey="in_studio_actual" name="In Studio" stroke="#8884d8" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="off_site_actual" name="Off Site" stroke="#82ca9d" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="total_actual" name="Total Revenue" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                  
                  {/* Projected lines (Dashed) - Hide from Legend using legendType="none" */}
                  <Line type="monotone" dataKey="in_studio_projected" legendType="none" stroke="#8884d8" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="off_site_projected" legendType="none" stroke="#82ca9d" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="total_projected" legendType="none" stroke="#4f46e5" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* AI Financial Advisory Widget */}
            {aiInsight && (
              <div className="mt-3 p-2.5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-bl text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <Sparkles size={8} /> Financial Advisor
                </div>
                <div className="flex gap-2 items-start">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">AI Financial Insights & Recommendations</p>
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed font-medium">{aiInsight.advice}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events and Recent Procurement Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              Recent Events & Booths
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Event Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => (
                      <tr key={event.event_id}>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{event.event_name}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatDate(event.start_date)}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                            event.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                            event.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            event.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {getStatusLabel(event.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(event.expected_revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">No upcoming events</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Procurement Requests Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Recent Procurement Requests
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Requester</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentProcurement.length > 0 ? (
                    recentProcurement.map((pr) => (
                      <tr key={pr.pr_id}>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{pr.requester_name}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{pr.pr_id}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatDate(pr.request_date)}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pr.status === 'Waiting Approval' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                            pr.status === 'Approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                            pr.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                            pr.status === 'Received' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {getStatusLabel(pr.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(pr.total_amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">No procurement requests</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      setAutoDraftQtyInput(e.target.value)
                      setAutoDraftError('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {autoDraftError && (
                    <p className="text-red-600 text-sm mt-2">{autoDraftError}</p>
                  )}
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
      
      {/* Accounting Report Filter Modal */}
      <AccountingReportModal
        isOpen={showAccountingModal}
        onClose={() => setShowAccountingModal(false)}
        onExport={downloadAccountingReport}
      />
    </div>
  )
}

export default Dashboard
