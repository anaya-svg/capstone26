/**
 * Export data to a CSV file with optional title, date, and filter summary.
 * @param {Array} headers - Array of column header strings.
 * @param {Array<Array>} rows - Array of data rows (each row is an array of values).
 * @param {String} title - Report title shown on the first line.
 * @param {String} fileName - Output filename without extension.
 * @param {Object} options - Optional configurations.
 * @param {String} options.filterSummary - Human-readable summary of applied filters.
 */
export const exportToCSV = (headers, rows, title, fileName, options = {}) => {
  const { filterSummary = '' } = options

  const escapeCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value)
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [
    title,
    `Generated: ${new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`
  ]

  if (filterSummary) {
    lines.push(`Filters: ${filterSummary}`)
  }

  lines.push('', headers.map(escapeCell).join(','))

  rows.forEach((row) => {
    lines.push(row.map(escapeCell).join(','))
  })

  const csvContent = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}
