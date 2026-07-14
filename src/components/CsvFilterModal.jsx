import { Download } from 'lucide-react'

export default function CsvFilterModal({
  isOpen,
  onClose,
  onExport,
  title = 'Download CSV Filter',
  exportLabel = 'Download CSV',
  showAllData = true,
  allData = true,
  onAllDataChange,
  children
}) {
  if (!isOpen) return null

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] backdrop-blur-sm"
      onMouseDown={handleBackdrop}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{title}</h2>

        {showAllData && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={allData}
                onChange={(e) => onAllDataChange(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="font-medium text-gray-800">All data (no filter)</span>
            </label>
          </div>
        )}

        <fieldset
          disabled={showAllData && allData}
          className={`space-y-5 ${showAllData && allData ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {children}
        </fieldset>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={16} />
            {exportLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
