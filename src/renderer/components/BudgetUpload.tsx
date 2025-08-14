import React, { useState } from 'react'
import * as XLSX from 'xlsx'

interface BudgetCategory {
  category: string
  amount: number
  description?: string
}

interface BudgetUploadProps {
  grantId: string
  onBudgetImported: (categories: BudgetCategory[]) => void
  onClose: () => void
}

const EXPENSE_CATEGORIES = ['Personnel', 'Equipment', 'Travel', 'Supplies', 'Other']

export default function BudgetUpload({ grantId, onBudgetImported, onClose }: BudgetUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [columnMapping, setColumnMapping] = useState({
    description: '',
    amount: '',
    category: ''
  })
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1).map((row: any) => {
            const obj: Record<string, any> = {}
            headers.forEach((header, index) => {
              obj[header] = row[index]
            })
            return obj
          })
          setParsedData(rows.filter(row => Object.values(row).some(val => val !== undefined && val !== '')))
        }
      } catch (error) {
        console.error('Error parsing Excel file:', error)
        alert('Error parsing Excel file. Please make sure it\'s a valid Excel file.')
      }
    }
    
    reader.readAsArrayBuffer(selectedFile)
  }

  const getAvailableColumns = () => {
    if (parsedData.length === 0) return []
    return Object.keys(parsedData[0]).filter(key => key && key.trim() !== '')
  }

  const getUniqueValues = (column: string) => {
    if (!column || parsedData.length === 0) return []
    return [...new Set(parsedData.map(row => row[column]).filter(val => val && val.toString().trim() !== ''))]
  }

  const handleImport = async () => {
    if (!columnMapping.amount || parsedData.length === 0) {
      alert('Please select at least an amount column')
      return
    }

    setIsProcessing(true)
    
    try {
      const budgetCategories: BudgetCategory[] = parsedData.map(row => {
        let category = 'Other'
        
        if (columnMapping.category && row[columnMapping.category]) {
          const originalCategory = row[columnMapping.category].toString()
          category = categoryMapping[originalCategory] || 'Other'
        }
        
        const amount = parseFloat(row[columnMapping.amount]?.toString().replace(/[^0-9.-]/g, '') || '0')
        const description = columnMapping.description ? row[columnMapping.description]?.toString() : ''
        
        return {
          category,
          amount,
          description
        }
      }).filter(item => item.amount > 0)

      await window.electronAPI.budget.import(grantId, budgetCategories)
      onBudgetImported(budgetCategories)
      onClose()
    } catch (error) {
      console.error('Error importing budget:', error)
      alert('Error importing budget. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const availableColumns = getAvailableColumns()

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Import Budget from Excel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {parsedData.length > 0 && (
            <>
              {/* Column Mapping */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Map Excel Columns</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description Column (Optional)
                    </label>
                    <select
                      value={columnMapping.description}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Column *
                    </label>
                    <select
                      value={columnMapping.amount}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Column (Optional)
                    </label>
                    <select
                      value={columnMapping.category}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category Mapping */}
              {columnMapping.category && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Map Categories to Expense Types</h3>
                  <div className="space-y-2">
                    {getUniqueValues(columnMapping.category).map(value => (
                      <div key={value} className="flex items-center space-x-4">
                        <span className="w-1/3 text-sm text-gray-700">{value}</span>
                        <span className="text-gray-400">→</span>
                        <select
                          value={categoryMapping[value] || 'Other'}
                          onChange={(e) => setCategoryMapping(prev => ({
                            ...prev,
                            [value]: e.target.value
                          }))}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-1"
                        >
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Preview (First 5 rows)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, index) => {
                        const description = columnMapping.description ? row[columnMapping.description] : ''
                        const amount = columnMapping.amount ? row[columnMapping.amount] : ''
                        const originalCategory = columnMapping.category ? row[columnMapping.category] : ''
                        const mappedCategory = originalCategory ? (categoryMapping[originalCategory] || 'Other') : 'Other'
                        
                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2">{description || '-'}</td>
                            <td className="p-2">${parseFloat(amount?.toString().replace(/[^0-9.-]/g, '') || '0').toLocaleString()}</td>
                            <td className="p-2">{mappedCategory}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!columnMapping.amount || isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isProcessing ? 'Importing...' : 'Import Budget'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}