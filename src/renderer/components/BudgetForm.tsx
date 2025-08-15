import React, { useState } from 'react'

interface BudgetCategory {
  id: string
  category: string
  type: 'pi_salary' | 'student_salary' | 'travel' | 'materials' | 'publication' | 'tuition' | 'other'
  amount: number
  description?: string
  createdAt: string
  
  // Salary-specific fields
  monthlyRate?: number
  numberOfMonths?: number
  
  // Tuition-specific fields
  yearlyRate?: number
  numberOfYears?: number
  
  // Travel-specific fields
  numberOfTrips?: number
  costPerTrip?: number
  
  // Student-specific fields
  numberOfStudents?: number
  
  // Additional metadata
  notes?: string
  fiscalYear?: string
}

interface BudgetFormProps {
  grantId: string
  initialBudgets?: BudgetCategory[]
  onSave: (budgets: BudgetCategory[]) => void
  onCancel: () => void
}

export default function BudgetForm({ grantId, initialBudgets = [], onSave, onCancel }: BudgetFormProps) {
  const [budgets, setBudgets] = useState<BudgetCategory[]>(initialBudgets)
  
  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)
  
  const addBudgetCategory = (type: BudgetCategory['type']) => {
    const newBudget: BudgetCategory = {
      id: generateId(),
      category: getBudgetCategoryName(type),
      type,
      amount: 0,
      createdAt: new Date().toISOString(),
      description: '',
      notes: '',
      fiscalYear: new Date().getFullYear().toString()
    }
    
    // Set default values based on type
    switch (type) {
      case 'pi_salary':
        newBudget.monthlyRate = 0
        newBudget.numberOfMonths = 1 // Default 1 month
        break
      case 'student_salary':
        newBudget.monthlyRate = 0
        newBudget.numberOfMonths = 3
        newBudget.numberOfStudents = 1
        break
      case 'tuition':
        newBudget.yearlyRate = 0
        newBudget.numberOfYears = 1
        newBudget.numberOfStudents = 1
        break
      case 'travel':
        newBudget.numberOfTrips = 1
        newBudget.costPerTrip = 0
        break
    }
    
    setBudgets([...budgets, newBudget])
  }
  
  const updateBudget = (id: string, updates: Partial<BudgetCategory>) => {
    setBudgets(budgets.map(budget => {
      if (budget.id === id) {
        const updated = { ...budget, ...updates }
        // Recalculate amount based on type and values
        updated.amount = calculateAmount(updated)
        return updated
      }
      return budget
    }))
  }
  
  const deleteBudget = (id: string) => {
    setBudgets(budgets.filter(budget => budget.id !== id))
  }
  
  const calculateAmount = (budget: BudgetCategory): number => {
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
  
  const getBudgetCategoryName = (type: BudgetCategory['type']): string => {
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
  
  const getTotalBudget = (): number => {
    return budgets.reduce((total, budget) => total + budget.amount, 0)
  }
  
  const handleSave = () => {
    onSave(budgets)
  }
  
  const renderBudgetFields = (budget: BudgetCategory) => {
    switch (budget.type) {
      case 'pi_salary':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={budget.monthlyRate || ''}
                onChange={(e) => updateBudget(budget.id, { monthlyRate: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Months</label>
              <input
                type="number"
                step="0.25"
                value={budget.numberOfMonths || ''}
                onChange={(e) => updateBudget(budget.id, { numberOfMonths: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 0.25, 1, 2.5"
              />
            </div>
          </div>
        )
      
      case 'student_salary':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={budget.monthlyRate || ''}
                onChange={(e) => updateBudget(budget.id, { monthlyRate: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Months</label>
              <input
                type="number"
                step="0.25"
                value={budget.numberOfMonths || ''}
                onChange={(e) => updateBudget(budget.id, { numberOfMonths: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 0.25, 1, 2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Students</label>
              <input
                type="number"
                value={budget.numberOfStudents || ''}
                onChange={(e) => updateBudget(budget.id, { numberOfStudents: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        )
      
      case 'tuition':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Yearly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={budget.yearlyRate || ''}
                onChange={(e) => updateBudget(budget.id, { yearlyRate: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Years</label>
              <input
                type="number"
                value={budget.numberOfYears || ''}
                onChange={(e) => updateBudget(budget.id, { numberOfYears: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Students</label>
              <input
                type="number"
                value={budget.numberOfStudents || ''}
                onChange={(e) => updateBudget(budget.id, { numberOfStudents: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        )
      
      case 'travel':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Trips</label>
              <input
                type="number"
                value={budget.numberOfTrips || ''}
                onChange={(e) => updateBudget(budget.id, { numberOfTrips: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cost per Trip ($)</label>
              <input
                type="number"
                step="0.01"
                value={budget.costPerTrip || ''}
                onChange={(e) => updateBudget(budget.id, { costPerTrip: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        )
      
      case 'materials':
      case 'publication':
      case 'other':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={budget.amount || ''}
              onChange={(e) => updateBudget(budget.id, { amount: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        )
      
      default:
        return null
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium mb-4">Grant Budget Details</h2>
      
      {/* Add Budget Category Buttons */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Add Budget Category:</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addBudgetCategory('pi_salary')}
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200"
          >
            PI Summer Salary
          </button>
          <button
            onClick={() => addBudgetCategory('student_salary')}
            className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm hover:bg-green-200"
          >
            Student Summer Salary
          </button>
          <button
            onClick={() => addBudgetCategory('travel')}
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md text-sm hover:bg-purple-200"
          >
            Travel
          </button>
          <button
            onClick={() => addBudgetCategory('materials')}
            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm hover:bg-yellow-200"
          >
            Materials & Supplies
          </button>
          <button
            onClick={() => addBudgetCategory('publication')}
            className="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200"
          >
            Publication Costs
          </button>
          <button
            onClick={() => addBudgetCategory('tuition')}
            className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm hover:bg-indigo-200"
          >
            Tuition
          </button>
          <button
            onClick={() => addBudgetCategory('other')}
            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
          >
            Other
          </button>
        </div>
      </div>
      
      {/* Budget Categories List */}
      <div className="space-y-6">
        {budgets.map((budget) => (
          <div key={budget.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">{budget.category}</h4>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-green-600">
                  ${budget.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => deleteBudget(budget.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            </div>
            
            {renderBudgetFields(budget)}
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Description/Notes</label>
              <textarea
                rows={2}
                value={budget.description || ''}
                onChange={(e) => updateBudget(budget.id, { description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Optional notes about this budget item..."
              />
            </div>
          </div>
        ))}
      </div>
      
      {budgets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No budget categories added yet. Click the buttons above to add budget items.
        </div>
      )}
      
      {/* Total Budget */}
      {budgets.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">Total Budget:</span>
            <span className="text-xl font-bold text-green-600">
              ${getTotalBudget().toLocaleString()}
            </span>
          </div>
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
          Save Budget
        </button>
      </div>
    </div>
  )
}