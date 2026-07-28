import ExcelJS from 'exceljs'

/**
 * Export data to Excel with professional styling
 * @param {Array} headers - Array of column headers
 * @param {Array} data - Array of data rows (each row is an array of values)
 * @param {String} title - Report title (e.g., "Events & Booths Report")
 * @param {String} fileName - Output filename without extension
 * @param {Object} options - Optional configurations
 * @param {Number} options.headerRow - Row number for headers (default: 4)
 * @param {Array} options.columnWidths - Custom column widths (default: auto)
 * @param {String} options.filterSummary - Optional filter summary shown below the date
 */
export const exportToExcel = async (headers, data, title, fileName, options = {}) => {
  const {
    columnWidths = null,
    filterSummary = null
  } = options

  const headerRow = filterSummary ? 5 : (options.headerRow || 4)

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Report')

  const headerStyle = {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  const titleStyle = {
    font: { bold: true, size: 16, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left' }
  }

  const subtitleStyle = {
    font: { bold: true, size: 12, color: { argb: 'FF666666' } },
    alignment: { horizontal: 'left' }
  }

  const dateStyle = {
    font: { size: 10, color: { argb: 'FF999999' } },
    alignment: { horizontal: 'left' }
  }

  const dataStyle = {
    font: { size: 10, color: { argb: 'FF000000' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
    }
  }

  worksheet.mergeCells('A1:Z1')
  const companyCell = worksheet.getCell('A1')
  companyCell.value = 'SnapFun Studio'
  companyCell.style = titleStyle
  worksheet.getRow(1).height = 25

  worksheet.mergeCells('A2:Z2')
  const titleCell = worksheet.getCell('A2')
  titleCell.value = title
  titleCell.style = subtitleStyle
  worksheet.getRow(2).height = 20

  worksheet.mergeCells('A3:Z3')
  const dateCell = worksheet.getCell('A3')
  dateCell.value = `Generated: ${new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`
  dateCell.style = dateStyle
  worksheet.getRow(3).height = 18

  if (filterSummary) {
    worksheet.mergeCells('A4:Z4')
    const filterCell = worksheet.getCell('A4')
    filterCell.value = `Filters: ${filterSummary}`
    filterCell.style = dateStyle
    worksheet.getRow(4).height = 18
  }

  worksheet.addRow([])

  const headerRowObj = worksheet.addRow(headers)
  headerRowObj.eachCell((cell) => {
    cell.style = headerStyle
  })
  worksheet.getRow(headerRow).height = 22

  data.forEach((row) => {
    const dataRow = worksheet.addRow(row)
    dataRow.eachCell((cell) => {
      cell.style = dataStyle
    })
  })

  if (columnWidths) {
    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width
    })
  } else {
    worksheet.columns.forEach((column) => {
      let maxLength = 0
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10
        if (columnLength > maxLength) {
          maxLength = columnLength
        }
      })
      column.width = maxLength < 15 ? 15 : maxLength + 2
    })
  }

  worksheet.views = [
    { state: 'frozen', ySplit: headerRow }
  ]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}
