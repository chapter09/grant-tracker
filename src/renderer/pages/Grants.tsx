import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import BudgetForm from '../components/BudgetForm'
import ExpenseForm from '../components/ExpenseForm'

interface Grant {
  id: string
  title: string
  agency: string
  number: string
  totalAmount: number
  startDate: string
  endDate: string
  description?: string
  status: string
  expenses: { amount: number }[]
  budgetCategories?: any[]
}

export default function Grants() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [selectedGrantForBudget, setSelectedGrantForBudget] = useState<string | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [selectedGrantForExpense, setSelectedGrantForExpense] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    agency: '',
    number: '',
    totalAmount: '',
    startDate: '',
    endDate: '',
    description: '',
    status: 'Active'
  })
  const [formBudgetCategories, setFormBudgetCategories] = useState<any[]>([])

  useEffect(() => {
    console.log('=== GRANTS COMPONENT MOUNTED ===')
    console.log('window object keys:', Object.keys(window))
    console.log('window.testAPI available:', !!(window as any).testAPI)
    console.log('window.testAPI test:', (window as any).testAPI?.test?.())
    console.log('window.electronAPI available:', !!window.electronAPI)
    console.log('window.electronAPI.grants available:', !!window.electronAPI?.grants)
    console.log('typeof window.electronAPI:', typeof window.electronAPI)
    
    // Retry mechanism for electronAPI availability
    const waitForElectronAPI = async () => {
      const maxRetries = 20
      const retryDelay = 100
      
      for (let i = 0; i < maxRetries; i++) {
        console.log(`Attempt ${i + 1}: Checking for electronAPI...`)
        console.log('electronAPIReady:', !!(window as any).electronAPIReady)
        console.log('electronAPI available:', !!window.electronAPI)
        console.log('testAPI available:', !!(window as any).testAPI)
        
        if (window.electronAPI && (window as any).electronAPIReady) {
          console.log('electronAPI found and ready! Loading grants...')
          await loadGrants()
          return
        }
        
        if (window.electronAPI) {
          console.log('electronAPI exists but ready flag not set, checking testAPI...')
          if ((window as any).testAPI) {
            console.log('testAPI also available, proceeding with load...')
            await loadGrants()
            return
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      
      console.error('electronAPI still not available after retries')
      console.error('Final state - electronAPI:', !!window.electronAPI)
      console.error('Final state - electronAPIReady:', !!(window as any).electronAPIReady)
      console.error('Final state - testAPI:', !!(window as any).testAPI)
      setGrants([])
    }
    
    waitForElectronAPI()
  }, [])

  const loadGrants = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI not available - preload script may not be working')
      }
      if (!window.electronAPI.grants) {
        throw new Error('electronAPI.grants not available')
      }
      const data = await window.electronAPI.grants.getAll()
      console.log('Loaded grants:', data)
      setGrants(data || [])
    } catch (error) {
      console.error('Failed to load grants:', error)
      setGrants([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('=== FORM SUBMISSION STARTED ===')
    console.log('Submitting grant form with data:', formData)
    console.log('Form validation - all required fields filled?', {
      title: !!formData.title,
      agency: !!formData.agency,
      number: !!formData.number,
      totalAmount: !!formData.totalAmount,
      startDate: !!formData.startDate,
      endDate: !!formData.endDate
    })
    
    try {
      // Wait for electronAPI if not immediately available
      if (!window.electronAPI) {
        console.log('electronAPI not immediately available, waiting...')
        await new Promise(resolve => {
          const checkAPI = () => {
            if (window.electronAPI) {
              resolve(true)
            } else {
              setTimeout(checkAPI, 50)
            }
          }
          checkAPI()
        })
      }
      
      if (!window.electronAPI) {
        throw new Error('electronAPI not available - preload script may not be working')
      }
      if (!window.electronAPI.grants) {
        throw new Error('electronAPI.grants not available')
      }
      
      // Check if budget is balanced
      if (!isBudgetBalanced() && formBudgetCategories.length > 0) {
        const totalAmount = parseFloat(formData.totalAmount) || 0
        const budgetTotal = getTotalBudget()
        const difference = Math.abs(totalAmount - budgetTotal)
        if (difference > 0.01) {
          alert(`Budget mismatch! Total amount ($${totalAmount.toLocaleString()}) doesn't equal budget categories total ($${budgetTotal.toLocaleString()}). Difference: $${difference.toFixed(2)}`)
          return
        }
      }

      const grantToCreate = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount),
        budgetCategories: formBudgetCategories
      }
      console.log('Processed grant data:', grantToCreate)
      
      const result = await window.electronAPI.grants.create(grantToCreate)
      console.log('Grant creation result:', result)
      
      setFormData({
        title: '',
        agency: '',
        number: '',
        totalAmount: '',
        startDate: '',
        endDate: '',
        description: '',
        status: 'Active'
      })
      setFormBudgetCategories([])
      setShowForm(false)
      await loadGrants()
      console.log('=== FORM SUBMISSION SUCCESS ===')
      alert('Grant created successfully!')
    } catch (error) {
      console.error('=== FORM SUBMISSION ERROR ===')
      console.error('Failed to create grant:', error)
      alert('Failed to create grant: ' + (error as Error).message)
    }
    console.log('=== FORM SUBMISSION ENDED ===')
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this grant?')) {
      try {
        await window.electronAPI.grants.delete(id)
        loadGrants()
      } catch (error) {
        console.error('Failed to delete grant:', error)
      }
    }
  }

  const handleImportExcel = async () => {
    try {
      console.log('Starting Excel import...')
      
      if (!window.electronAPI) {
        throw new Error('electronAPI not available')
      }
      
      // This will trigger the file dialog and process the Excel file
      const result = await window.electronAPI.files.importGrantsFromExcel()
      
      if (result.success) {
        console.log('Excel import successful:', result)
        await loadGrants() // Refresh the grants list
        alert(`Successfully imported ${result.grantsCount} grants with ${result.categoriesCount} budget categories!`)
      } else {
        console.error('Excel import failed:', result.error)
        alert('Failed to import Excel file: ' + result.error)
      }
    } catch (error) {
      console.error('Failed to import Excel:', error)
      alert('Failed to import Excel file: ' + (error as Error).message)
    }
  }

  const handleManageBudget = (grantId: string) => {
    setSelectedGrantForBudget(grantId)
    setShowBudgetForm(true)
  }

  const handleSaveBudget = async (budgets: any[]) => {
    try {
      if (!window.electronAPI || !selectedGrantForBudget) {
        throw new Error('electronAPI not available or no grant selected')
      }
      
      await window.electronAPI.budget.update(selectedGrantForBudget, budgets)
      await loadGrants() // Refresh to show updated budget totals
      setShowBudgetForm(false)
      setSelectedGrantForBudget(null)
      alert('Budget saved successfully!')
    } catch (error) {
      console.error('Failed to save budget:', error)
      alert('Failed to save budget: ' + (error as Error).message)
    }
  }

  const handleCancelBudget = () => {
    setShowBudgetForm(false)
    setSelectedGrantForBudget(null)
  }

  const handleManageExpense = (grantId: string) => {
    setSelectedGrantForExpense(grantId)
    setShowExpenseForm(true)
  }

  const handleSaveExpense = async (expenses: any[]) => {
    try {
      if (!window.electronAPI || !selectedGrantForExpense) {
        throw new Error('electronAPI not available or no grant selected')
      }
      
      // Save each expense individually through the existing expense creation API
      for (const expense of expenses) {
        if (!expense.id || expense.id.includes('temp')) {
          // This is a new expense, create it
          await window.electronAPI.expenses.create({
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            notes: expense.notes || '',
            grantId: selectedGrantForExpense
          })
        } else {
          // This is an existing expense, update it
          await window.electronAPI.expenses.update(expense.id, {
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            notes: expense.notes || ''
          })
        }
      }
      
      await loadGrants() // Refresh to show updated expenses
      setShowExpenseForm(false)
      setSelectedGrantForExpense(null)
      alert('Expenses saved successfully!')
    } catch (error) {
      console.error('Failed to save expenses:', error)
      alert('Failed to save expenses: ' + (error as Error).message)
    }
  }

  const handleCancelExpense = () => {
    setShowExpenseForm(false)
    setSelectedGrantForExpense(null)
  }

  // Budget category management for new grant form
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)
  
  const addFormBudgetCategory = (type: string) => {
    const newBudget = {
      id: generateId(),
      category: getBudgetCategoryName(type),
      type,
      amount: 0,
      createdAt: new Date().toISOString(),
      description: '',
      notes: '',
      // Default values based on type
      ...(type === 'pi_salary' && { monthlyRate: 0, numberOfMonths: 3 }),
      ...(type === 'student_salary' && { monthlyRate: 0, numberOfMonths: 3, numberOfStudents: 1 }),
      ...(type === 'tuition' && { yearlyRate: 0, numberOfYears: 1, numberOfStudents: 1 }),
      ...(type === 'travel' && { numberOfTrips: 1, costPerTrip: 0 })
    }
    setFormBudgetCategories([...formBudgetCategories, newBudget])
  }
  
  const updateFormBudgetCategory = (id: string, updates: any) => {
    setFormBudgetCategories(formBudgetCategories.map(budget => {
      if (budget.id === id) {
        const updated = { ...budget, ...updates }
        // Recalculate amount based on type and values
        updated.amount = calculateBudgetAmount(updated)
        return updated
      }
      return budget
    }))
  }
  
  const deleteFormBudgetCategory = (id: string) => {
    setFormBudgetCategories(formBudgetCategories.filter(budget => budget.id !== id))
  }
  
  const calculateBudgetAmount = (budget: any): number => {
    switch (budget.type) {
      case 'pi_salary':
      case 'student_salary':
        const monthlyTotal = (budget.monthlyRate || 0) * (budget.numberOfMonths || 0)
        return budget.type === 'student_salary' 
          ? monthlyTotal * (budget.numberOfStudents || 1)
          : monthlyTotal
      case 'tuition':
        return (budget.yearlyRate || 0) * (budget.numberOfYears || 1) * (budget.numberOfStudents || 1)
      case 'travel':
        return (budget.costPerTrip || 0) * (budget.numberOfTrips || 1)
      default:
        return budget.amount || 0
    }
  }
  
  const getBudgetCategoryName = (type: string): string => {
    switch (type) {
      case 'pi_salary': return 'PI Summer Salary'
      case 'student_salary': return 'Student Summer Salary'
      case 'travel': return 'Travel'
      case 'materials': return 'Materials and Supplies'
      case 'publication': return 'Publication Costs'
      case 'tuition': return 'Tuition'
      case 'indirect': return 'Indirect Costs'
      case 'other': return 'Other'
      default: return 'Unknown'
    }
  }
  
  const getTotalBudget = (): number => {
    return formBudgetCategories.reduce((total, budget) => total + budget.amount, 0)
  }
  
  const isBudgetBalanced = (): boolean => {
    const totalAmount = parseFloat(formData.totalAmount) || 0
    const budgetTotal = getTotalBudget()
    return Math.abs(totalAmount - budgetTotal) < 0.01 // Allow for small floating point differences
  }

  const autoBalanceWithIndirect = () => {
    const totalAmount = parseFloat(formData.totalAmount) || 0
    const budgetTotal = getTotalBudget()
    const difference = totalAmount - budgetTotal
    
    // Find existing indirect category or create one
    let indirectCategory = formBudgetCategories.find(budget => budget.type === 'indirect')
    
    if (indirectCategory) {
      // Update existing indirect category
      updateFormBudgetCategory(indirectCategory.id, { amount: indirectCategory.amount + difference })
    } else {
      // Create new indirect category with the difference amount
      const newIndirectBudget = {
        id: generateId(),
        category: getBudgetCategoryName('indirect'),
        type: 'indirect',
        amount: difference,
        createdAt: new Date().toISOString(),
        description: 'Auto-balanced indirect costs',
        notes: ''
      }
      setFormBudgetCategories([...formBudgetCategories, newIndirectBudget])
    }
  }

  const getBudgetDifference = (): number => {
    const totalAmount = parseFloat(formData.totalAmount) || 0
    const budgetTotal = getTotalBudget()
    return totalAmount - budgetTotal
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Grants</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleImportExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span>Import Excel</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add Grant
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Add New Grant</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Agency</label>
                <input
                  type="text"
                  required
                  value={formData.agency}
                  onChange={(e) => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grant Number</label>
                <input
                  type="text"
                  required
                  value={formData.number}
                  onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            {/* Budget Categories Section */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Budget Categories</h3>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-600">
                    Budget Total: <span className={`font-semibold ${isBudgetBalanced() ? 'text-green-600' : 'text-red-600'}`}>
                      ${getTotalBudget().toLocaleString()}
                    </span>
                    {formData.totalAmount && (
                      <span className="ml-2">
                        / ${parseFloat(formData.totalAmount || '0').toLocaleString()}
                        {!isBudgetBalanced() && formBudgetCategories.length > 0 && (
                          <span className="text-red-600 ml-1">⚠️ Mismatch: ${Math.abs(getBudgetDifference()).toFixed(2)}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {!isBudgetBalanced() && formBudgetCategories.length > 0 && formData.totalAmount && Math.abs(getBudgetDifference()) > 0.01 && (
                    <button
                      type="button"
                      onClick={autoBalanceWithIndirect}
                      className="px-3 py-1 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 flex items-center space-x-1"
                    >
                      <span>⚖️</span>
                      <span>Auto-Balance</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Budget Category Buttons */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Add budget categories:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('pi_salary')}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200"
                  >
                    PI Summer Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('student_salary')}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm hover:bg-green-200"
                  >
                    Student Summer Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('travel')}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm hover:bg-purple-200"
                  >
                    Travel
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('materials')}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm hover:bg-yellow-200"
                  >
                    Materials & Supplies
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('publication')}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200"
                  >
                    Publication Costs
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('tuition')}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm hover:bg-indigo-200"
                  >
                    Tuition
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('indirect')}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm hover:bg-orange-200"
                  >
                    Indirect Costs
                  </button>
                  <button
                    type="button"
                    onClick={() => addFormBudgetCategory('other')}
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
                  >
                    Other
                  </button>
                </div>
              </div>

              {/* Budget Categories List */}
              {formBudgetCategories.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {formBudgetCategories.map((budget) => (
                    <div key={budget.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-medium text-gray-900">{budget.category}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-green-600">
                            ${budget.amount.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteFormBudgetCategory(budget.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      {/* Type-specific fields */}
                      {budget.type === 'pi_salary' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Monthly Rate ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={budget.monthlyRate || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { monthlyRate: parseFloat(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Number of Months</label>
                            <input
                              type="number"
                              value={budget.numberOfMonths || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { numberOfMonths: parseInt(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {budget.type === 'student_salary' && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Monthly Rate ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={budget.monthlyRate || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { monthlyRate: parseFloat(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Months</label>
                            <input
                              type="number"
                              value={budget.numberOfMonths || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { numberOfMonths: parseInt(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Students</label>
                            <input
                              type="number"
                              value={budget.numberOfStudents || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { numberOfStudents: parseInt(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {budget.type === 'tuition' && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Yearly Rate ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={budget.yearlyRate || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { yearlyRate: parseFloat(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Years</label>
                            <input
                              type="number"
                              value={budget.numberOfYears || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { numberOfYears: parseInt(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Students</label>
                            <input
                              type="number"
                              value={budget.numberOfStudents || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { numberOfStudents: parseInt(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {budget.type === 'travel' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Number of Trips</label>
                            <input
                              type="number"
                              value={budget.numberOfTrips || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { numberOfTrips: parseInt(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Cost per Trip ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={budget.costPerTrip || ''}
                              onChange={(e) => updateFormBudgetCategory(budget.id, { costPerTrip: parseFloat(e.target.value) || 0 })}
                              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {(budget.type === 'materials' || budget.type === 'publication' || budget.type === 'indirect' || budget.type === 'other') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Amount ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={budget.amount || ''}
                            onChange={(e) => updateFormBudgetCategory(budget.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
                        <input
                          type="text"
                          value={budget.description || ''}
                          onChange={(e) => updateFormBudgetCategory(budget.id, { description: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Brief description of this budget item..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formBudgetCategories.length === 0 && (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  No budget categories added yet. Click the buttons above to add budget items.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormBudgetCategories([])
                  setFormData({
                    title: '',
                    agency: '',
                    number: '',
                    totalAmount: '',
                    startDate: '',
                    endDate: '',
                    description: '',
                    status: 'Active'
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Grant
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grants.map((grant) => {
                const spent = grant.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
                return (
                  <tr key={grant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {grant.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.agency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${grant.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${spent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(grant.startDate), 'MM/dd/yyyy')} - {format(new Date(grant.endDate), 'MM/dd/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        grant.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {grant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Link 
                        to={`/grants/${grant.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleManageBudget(grant.id)}
                        className="text-green-600 hover:underline"
                      >
                        Budget
                      </button>
                      <button
                        onClick={() => handleManageExpense(grant.id)}
                        className="text-orange-600 hover:underline"
                      >
                        Expense
                      </button>
                      <button
                        onClick={() => handleDelete(grant.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Form Modal */}
      {showBudgetForm && selectedGrantForBudget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <BudgetForm
              grantId={selectedGrantForBudget}
              initialBudgets={grants.find(g => g.id === selectedGrantForBudget)?.budgetCategories || []}
              onSave={handleSaveBudget}
              onCancel={handleCancelBudget}
            />
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && selectedGrantForExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <ExpenseForm
              grantId={selectedGrantForExpense}
              initialExpenses={grants.find(g => g.id === selectedGrantForExpense)?.expenses || []}
              onSave={handleSaveExpense}
              onCancel={handleCancelExpense}
            />
          </div>
        </div>
      )}
    </div>
  )
}