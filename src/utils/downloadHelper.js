import { exportToExcel } from './exportExcel'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
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
      return status ? status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'N/A'
  }
}

const FILTER_LABELS = {
  status: 'Status',
  createdAt: 'Created At',
  startDate: 'Start Date',
  endDate: 'End Date',
  segment: 'Customer Type',
  stock_status: 'Stock Status',
  reportFocus: 'Report Focus',
  filterType: 'Filter Type',
  search: 'Search',
  category: 'Category',
  condition: 'Condition',
  location: 'Location'
}

const VALUE_LABELS = {
  reportFocus: {
    customer_in_studio: 'Customer - In Studio',
    customer_off_site: 'Customer - Off Site',
    procurement: 'Procurement',
    all: 'All'
  },
  segment: {
    in_studio: 'In Studio',
    off_site: 'Off Site',
    all: 'All'
  },
  stock_status: {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    low_or_out_of_stock: 'Low or Out of Stock'
  },
  filterType: {
    all: 'All Time',
    month: 'By Month',
    year: 'By Year',
    custom: 'Custom Range'
  }
}

const getValueLabel = (key, value) => {
  if (VALUE_LABELS[key] && VALUE_LABELS[key][value]) {
    return VALUE_LABELS[key][value]
  }
  return value
    .split('_')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

const buildFilterSummary = (filterString) => {
  if (!filterString || filterString === 'all') return 'All data'
  const params = new URLSearchParams(filterString.startsWith('?') ? filterString.slice(1) : filterString)
  const parts = []
  for (const [key, value] of params.entries()) {
    const label = FILTER_LABELS[key] || key
    const values = value.split(',').map((v) => getValueLabel(key, v.trim())).filter(Boolean)
    parts.push(`${label}: ${values.join(', ')}`)
  }
  return parts.length ? parts.join('; ') : 'All data'
}

const buildExportUrl = (baseUrl, filterString) => {
  if (filterString && filterString !== 'all' && filterString.trim() !== '') {
    const query = filterString.startsWith('?') ? filterString.slice(1) : filterString
    return `${baseUrl}${query ? `?${query}` : ''}`
  }
  return baseUrl
}

const exportFunctions = {
  assets: async (filterString) => {
    try {
      const response = await fetch(buildExportUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/assets/export`, filterString))
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching assets for export')
      }

      const headers = ['Asset ID', 'Name', 'Category', 'Status', 'Location', 'Condition', 'Quantity', 'Created At']
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

      await exportToExcel(headers, rows, 'Recap Report - Assets', 'assets', {
        columnWidths: [15, 25, 15, 15, 20, 15, 12, 18],
        filterSummary: buildFilterSummary(filterString)
      })
    } catch (error) {
      console.error('Error downloading assets Excel:', error)
      throw new Error('Error downloading assets Excel')
    }
  },

  events: async (filterString) => {
    try {
      const response = await fetch(buildExportUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/events/export`, filterString))
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching events for export')
      }

      const headers = ['Event ID', 'Event Name', 'Start Date', 'End Date', 'Location', 'Customer', 'Package', 'Status', 'Revenue']
      const rows = data.data.map((event) => [
        event.event_id,
        event.event_name,
        formatDate(event.start_date),
        formatDate(event.end_date),
        event.location || 'N/A',
        event.customer || 'N/A',
        event.package_name || 'N/A',
        event.status,
        `Rp ${Number(event.expected_revenue).toLocaleString('id-ID')}`
      ])

      await exportToExcel(headers, rows, 'Events & Booths', 'events', {
        columnWidths: [15, 25, 15, 15, 20, 20, 20, 15, 20],
        filterSummary: buildFilterSummary(filterString)
      })
    } catch (error) {
      console.error('Error downloading events Excel:', error)
      throw new Error('Error downloading events Excel')
    }
  },

  customers: async (filterString) => {
    try {
      const response = await fetch(buildExportUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/export`, filterString))
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching customers for export')
      }

      const headers = ['Customer ID', 'Name', 'Phone Number', 'Email', 'Total Visits', 'Total Spending', 'Customer Type']
      const rows = data.data.map((customer) => {
        let customerType = 'None'
        if (customer.is_in_studio && customer.is_off_site) customerType = 'Both'
        else if (customer.is_in_studio) customerType = 'In Studio'
        else if (customer.is_off_site) customerType = 'Off Site'

        return [
          customer.customer_id,
          customer.name,
          customer.phone_number || 'N/A',
          customer.email || 'N/A',
          customer.total_visits || 0,
          `Rp ${Number(customer.total_spending).toLocaleString('id-ID')}`,
          customerType
        ]
      })

      await exportToExcel(headers, rows, 'Customers', 'customers', {
        columnWidths: [15, 25, 20, 25, 15, 20, 15],
        filterSummary: buildFilterSummary(filterString)
      })
    } catch (error) {
      console.error('Error downloading customers Excel:', error)
      throw new Error('Error downloading customers Excel')
    }
  },

  inventory: async (filterString) => {
    try {
      const response = await fetch(buildExportUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/inventory/export`, filterString))
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching inventory for export')
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

      await exportToExcel(headers, rows, 'Recap Report - Inventory', 'inventory', {
        columnWidths: [25, 15, 15, 15, 10, 20, 15, 18],
        filterSummary: buildFilterSummary(filterString)
      })
    } catch (error) {
      console.error('Error downloading inventory Excel:', error)
      throw new Error('Error downloading inventory Excel')
    }
  },

  procurement: async (filterString) => {
    try {
      const response = await fetch(buildExportUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/export`, filterString))
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching procurement for export')
      }

      const headers = ['ID', 'Items', 'Quantity', 'Vendor', 'Total Cost', 'Requested By', 'Date', 'Status']
      const rows = data.data.map((request) => [
        request.pr_id,
        (request.items || []).map((item) => item.item_name).join('; '),
        (request.items || []).map((item) => item.quantity).join('; '),
        request.supplier || request.vendor || 'N/A',
        request.total_cost || 0,
        request.requested_by,
        new Date(request.created_at).toLocaleDateString('id-ID'),
        request.status
      ])

      await exportToExcel(headers, rows, 'Recap Report - Purchase Requests', 'procurement', {
        columnWidths: [15, 30, 15, 20, 15, 20, 15, 15],
        filterSummary: buildFilterSummary(filterString)
      })
    } catch (error) {
      console.error('Error downloading procurement Excel:', error)
      throw new Error('Error downloading procurement Excel')
    }
  },

  accounting: async (filterString) => {
    try {
      const response = await fetch(buildExportUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/dashboard/accounting-report`, filterString))
      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching accounting report')
      }

      const transactions = data.data || []

      const headers = ['Date', 'Transaction Type', 'Account', 'Description', 'Debit', 'Credit', 'Reference ID', 'Status', 'Customer/Vendor', 'Balance']

      const rows = transactions.map((t) => [
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

      await exportToExcel(
        headers,
        rows,
        'Accounting Report - Financial Flow',
        'accounting_report',
        {
          columnWidths: [15, 18, 20, 35, 20, 20, 15, 15, 20, 20],
          filterSummary: buildFilterSummary(filterString)
        }
      )
    } catch (error) {
      console.error('Error downloading accounting report:', error)
      throw new Error('Error downloading accounting report')
    }
  },

  custom: async (exportString) => {
    try {
      const parts = exportString.split(':')
      const module = parts[0]
      const columns = parts[1]?.split(',') || []
      const filterString = parts[2] || 'all'

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/chatbot/custom-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, columns, filters: {} })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error('Error fetching custom export data')
      }

      // Convert snake_case columns to readable headers
      const headers = columns.map(col => 
        col.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      )

      const rows = data.data.map((row) => 
        columns.map(col => {
          const value = row[col]
          if (col.includes('date') || col.includes('created_at') || col.includes('updated_at') || col.includes('last_update')) {
            return formatDate(value)
          }
          if (col.includes('revenue') || col.includes('cost') || col.includes('spending')) {
            return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
          }
          if (col.includes('stock_status')) {
            return getStockStatusLabel(value)
          }
          return value || 'N/A'
        })
      )

      await exportToExcel(headers, rows, `Custom Export - ${module.charAt(0).toUpperCase() + module.slice(1)}`, `custom_${module}`, {
        columnWidths: columns.map(() => 20),
        filterSummary: buildFilterSummary(filterString)
      })
    } catch (error) {
      console.error('Error downloading custom export:', error)
      throw new Error('Error downloading custom export')
    }
  }
}

export const downloadFunctions = {
  csv: exportFunctions,
  excel: exportFunctions,

  pdf: {
    procurement: async (prId) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/procurement/${prId}`)
        const data = await response.json()

        if (!data.success) {
          throw new Error('Error fetching procurement data')
        }

        const selectedRequest = data.data
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

        const tableData = selectedRequest.items.map((item) => [
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
      } catch (error) {
        console.error('Error downloading procurement PDF:', error)
        throw new Error('Error downloading procurement PDF')
      }
    }
  }
}

export const handleDownload = async (downloadString) => {
  console.log('handleDownload called with:', downloadString, 'type:', typeof downloadString)

  if (!downloadString) {
    console.error('Download string is empty or undefined')
    throw new Error('Invalid download link')
  }

  if (typeof downloadString !== 'string') {
    console.error('Download string is not a string:', typeof downloadString)
    throw new Error('Invalid download link format')
  }

  const parts = downloadString.split(':')

  if (parts.length < 3 || parts[0] !== 'download') {
    console.error('Invalid download format:', downloadString)
    throw new Error('Invalid download link format')
  }

  const type = parts[1] === 'excel' ? 'csv' : parts[1]
  const module = parts[2]
  const filterString = parts[3] || null

  console.log('Parsed download params:', { type, module, filterString })

  try {
    // Handle custom export format: download:excel:custom:module:columns:filter
    if (module === 'custom' && parts.length >= 5) {
      const customModule = parts[3]
      const customColumns = parts[4]
      const customFilter = parts[5] || 'all'
      const exportString = `${customModule}:${customColumns}:${customFilter}`
      
      if (downloadFunctions[type] && downloadFunctions[type].custom) {
        await downloadFunctions[type].custom(exportString)
      } else {
        console.error('Custom export function not found:', type)
        throw new Error('Custom export function not implemented')
      }
    } else if (downloadFunctions[type] && downloadFunctions[type][module]) {
      await downloadFunctions[type][module](filterString)
    } else {
      console.error('Download function not found:', type, module)
      throw new Error('Download function not implemented for this type/module')
    }
  } catch (error) {
    console.error('Error executing download:', error)
    throw error
  }
}
