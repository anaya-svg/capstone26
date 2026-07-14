import { useState } from 'react'
import { Download } from 'lucide-react'

export default function AccountingReportModal({
  isOpen,
  onClose,
  onExport,
  title = 'Download Accounting Report',
  exportLabel = 'Download Report'
}) {
  const [filterType, setFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportFocus, setReportFocus] = useState('all')

  if (!isOpen) return null

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleExport = () => {
    onExport({ filterType, startDate, endDate, reportFocus })
  }

  const focusOptions = [
    { value: 'all', label: 'All' },
    { value: 'customer_in_studio', label: 'Customer - In Studio' },
    { value: 'customer_off_site', label: 'Customer - Off Site' },
    { value: 'procurement', label: 'Procurement' }
  ]

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onMouseDown={handleBackdrop}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Focus</label>
          <select
            value={reportFocus}
            onChange={(e) => setReportFocus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {focusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value)
              setStartDate('')
              setEndDate('')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="month">By Month</option>
            <option value="year">By Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {filterType === 'month' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month (YYYY-MM)</label>
            <input
              type="month"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {filterType === 'year' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Year (YYYY)</label>
            <input
              type="number"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="2024"
              min="2020"
              max="2030"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {filterType === 'custom' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download size={16} />
            {exportLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
