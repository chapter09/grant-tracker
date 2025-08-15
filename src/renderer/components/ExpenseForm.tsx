import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes?: string
  createdAt: string
  updatedAt: string
  grantId: string
}

interface Grant {
  id: string
  title: string
  budgetCategories?: {
    id: string
    category: string
    type: string
    amount: number
  }[]
}

interface ExpenseFormProps {
  grantId: string
  initialExpenses?: Expense[]
  onSave: (expenses: Expense[]) => void
  onCancel: () => void
}

export default function ExpenseForm({ grantId, initialExpenses = [], onSave, onCancel }: ExpenseFormProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [grant, setGrant] = useState<Grant | null>(null)
  
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)
  
  useEffect(() => {
    loadGrant()
  }, [grantId])
  
  const loadGrant = async () => {
    try {
      const grants = await window.electronAPI.grants.getAll()
      const foundGrant = grants.find((g: any) => g.id === grantId)
      setGrant(foundGrant || null)
    } catch (error) {
      console.error('Failed to load grant:', error)
    }
  }
  
  // Get available budget categories from grant (excluding indirect costs)
  const getAvailableBudgetCategories = () => {
    if (!grant?.budgetCategories) {
      return []
    }
    return grant.budgetCategories.filter(cat => cat.category !== 'Indirect Costs')
  }
  
  const budgetCategories = getAvailableBudgetCategories()
  
  // Helper function to get budget category name from type
  const getBudgetCategoryName = (type: string): string => {
    switch (type) {
      case 'pi_salary': return 'PI Summer Salary'
      case 'student_salary': return 'Student Summer Salary'
      case 'travel': return 'Travel'
      case 'materials': return 'Materials and Supplies'
      case 'publication': return 'Publication Costs'
      case 'tuition': return 'Tuition'
      case 'other': return 'Other'
      default: return 'Unknown'
    }
  }
  
  const addExpense = (category: string) => {
    const newExpense: Expense = {
      id: generateId(),
      description: '',
      amount: 0,
      category: category,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      grantId
    }
    
    setExpenses([...expenses, newExpense])
  }
  
  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(expenses.map(expense => 
      expense.id === id 
        ? { ...expense, ...updates, updatedAt: new Date().toISOString() }
        : expense
    ))
  }
  
  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id))
  }
  
  const getTotalExpenses = (): number => {
    return expenses.reduce((total, expense) => total + expense.amount, 0)
  }
  
  const handleSave = () => {
    // Validate that all expenses have required fields
    const validExpenses = expenses.filter(exp => 
      exp.description.trim() && 
      exp.amount > 0 && 
      exp.category && 
      exp.date
    )
    
    if (validExpenses.length !== expenses.length) {
      alert('Please fill in all required fields for each expense (description, amount, category, date)')
      return
    }
    
    onSave(validExpenses)
  }
  
  const getExpensesByCategory = () => {
    return expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)
  }
  
  const expensesByCategory = getExpensesByCategory()
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Manage Expenses</h2>
        <div className="text-sm text-gray-600">
          Grant: <span className="font-medium">{grant?.title || 'Loading...'}</span>
        </div>
      </div>
      
      {/* Add Expense Category Buttons */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Add Expense by Category:</h3>
        {budgetCategories.length === 0 ? (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
            <p className="text-sm text-red-600">
              No budget categories available. Please add budget categories to the grant first.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {budgetCategories.map((budgetCat) => {
              // Determine button color based on budget category type
              const getButtonStyle = (type: string) => {
                switch (type) {
                  case 'pi_salary': return 'px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200'
                  case 'student_salary': return 'px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm hover:bg-green-200'
                  case 'travel': return 'px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm hover:bg-purple-200'
                  case 'materials': return 'px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm hover:bg-yellow-200'
                  case 'publication': return 'px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200'
                  case 'tuition': return 'px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm hover:bg-indigo-200'
                  default: return 'px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200'
                }
              }
              
              return (
                <button
                  key={budgetCat.id}
                  onClick={() => addExpense(budgetCat.category)}
                  className={getButtonStyle(budgetCat.type)}
                >
                  + {budgetCat.category}
                </button>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.map((expense) => (
          <div key={expense.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-600">Expense #{expense.id.slice(-6)}</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-red-600">
                  ${expense.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => deleteExpense(expense.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description *</label>
                <input
                  type="text"
                  required
                  value={expense.description}
                  onChange={(e) => updateExpense(expense.id, { description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Expense description..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expense.amount || ''}
                  onChange={(e) => updateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  value={expense.category}
                  onChange={(e) => updateExpense(expense.id, { category: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  required
                >
                  {budgetCategories.length === 0 ? (
                    <option value="">No categories available</option>
                  ) : (
                    budgetCategories.map(budgetCat => (
                      <option key={budgetCat.id} value={budgetCat.category}>{budgetCat.category}</option>
                    ))
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={expense.date}
                  onChange={(e) => updateExpense(expense.id, { date: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
              <textarea
                rows={2}
                value={expense.notes || ''}
                onChange={(e) => updateExpense(expense.id, { notes: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Additional notes about this expense..."
              />
            </div>
          </div>
        ))}
      </div>
      
      {expenses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No expenses added yet. Click "Add New Expense" to get started.
        </div>
      )}
      
      {/* Summary */}
      {expenses.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Total Expenses */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total Expenses:</span>
              <span className="text-xl font-bold text-red-600">
                ${getTotalExpenses().toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Expenses by Category */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Expenses by Category:</h4>
              <div className="space-y-1">
                {Object.entries(expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span className="text-gray-600">{category}</span>
                    <span className="font-medium">${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Expenses
        </button>
      </div>
    </div>
  )
}