import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import BudgetUpload from '../components/BudgetUpload'
import BudgetForm from '../components/BudgetForm'

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
  expenses: Expense[]
  budgetCategories?: BudgetCategory[]
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes?: string
}

export default function GrantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [grant, setGrant] = useState<Grant | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showBudgetUpload, setShowBudgetUpload] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  })

  // Get available categories from grant's budget categories (excluding indirect costs)
  const getAvailableCategories = (): string[] => {
    if (!grant?.budgetCategories) {
      return ['PI Summer Salary', 'Student Summer Salary', 'Travel', 'Materials and Supplies', 'Publication Costs', 'Tuition']
    }
    return grant.budgetCategories
      .filter(cat => cat.category !== 'Indirect Costs')
      .map(cat => cat.category)
  }
  
  const categories = getAvailableCategories()

  useEffect(() => {
    if (id) {
      loadGrant()
    }
  }, [id])

  // Set default category when grant loads
  useEffect(() => {
    if (grant && categories.length > 0 && !expenseForm.category) {
      setExpenseForm(prev => ({ ...prev, category: categories[0] }))
    }
  }, [grant, categories])

  const loadGrant = async () => {
    try {
      const grants = await window.electronAPI.grants.getAll()
      const foundGrant = grants.find(g => g.id === id)
      setGrant(foundGrant || null)
    } catch (error) {
      console.error('Failed to load grant:', error)
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grant) return

    try {
      await window.electronAPI.expenses.create({
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        grantId: grant.id
      })
      setExpenseForm({
        description: '',
        amount: '',
        category: categories[0] || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      })
      setShowExpenseForm(false)
      loadGrant()
    } catch (error) {
      console.error('Failed to create expense:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await window.electronAPI.expenses.delete(expenseId)
        loadGrant()
      } catch (error) {
        console.error('Failed to delete expense:', error)
      }
    }
  }

  const handleBudgetImported = (budgetCategories: BudgetCategory[]) => {
    if (grant) {
      setGrant({
        ...grant,
        budgetCategories
      })
    }
  }

  const handleSaveBudget = async (budgetCategories: BudgetCategory[]) => {
    try {
      if (!grant || !window.electronAPI) {
        throw new Error('Grant or electronAPI not available')
      }
      
      // Update the grant with new budget categories
      const updatedGrant = await window.electronAPI.grants.update(grant.id, {
        budgetCategories
      })
      
      setGrant(updatedGrant)
      setShowBudgetForm(false)
    } catch (error) {
      console.error('Failed to save budget:', error)
      alert('Failed to save budget. Please try again.')
    }
  }

  const handleDeleteGrant = async () => {
    if (!grant || !window.electronAPI) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete the grant "${grant.title}"? This action cannot be undone.`
    )
    
    if (confirmed) {
      try {
        await window.electronAPI.grants.delete(grant.id)
        navigate('/grants')
      } catch (error) {
        console.error('Failed to delete grant:', error)
        alert('Failed to delete grant. Please try again.')
      }
    }
  }

  if (!grant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const totalSpent = grant.expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const remaining = grant.totalAmount - totalSpent

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/grants" className="text-blue-600 hover:underline text-sm">← Back to Grants</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{grant.title}</h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBudgetForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Budget
          </button>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Expense
          </button>
          <button
            onClick={handleDeleteGrant}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Budget</h3>
          <p className="text-2xl font-bold text-green-600">${grant.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Spent</h3>
          <p className="text-2xl font-bold text-red-600">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Remaining</h3>
          <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            ${remaining.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-base font-medium mb-3">Grant Details</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
          <div>
            <dt className="text-xs font-medium text-gray-500">Agency</dt>
            <dd className="text-sm text-gray-900 mt-0.5">{grant.agency}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Grant Number</dt>
            <dd className="text-sm text-gray-900 mt-0.5">{grant.number}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Status</dt>
            <dd className="mt-0.5">
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                grant.status === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {grant.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Start Date</dt>
            <dd className="text-sm text-gray-900 mt-0.5">{format(new Date(grant.startDate), 'MMM dd, yyyy')}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">End Date</dt>
            <dd className="text-sm text-gray-900 mt-0.5">{format(new Date(grant.endDate), 'MMM dd, yyyy')}</dd>
          </div>
          {grant.description && (
            <div className="col-span-2 md:col-span-3 pt-2 border-t border-gray-100">
              <dt className="text-xs font-medium text-gray-500">Description</dt>
              <dd className="text-sm text-gray-900 mt-0.5">{grant.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {grant.budgetCategories && grant.budgetCategories.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Budget by Category</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Category</th>
                  <th className="text-left py-2">Budgeted Amount</th>
                  <th className="text-left py-2">Spent</th>
                  <th className="text-left py-2">Remaining</th>
                  <th className="text-left py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {grant.budgetCategories.map(budgetCat => {
                  const spent = grant.expenses
                    .filter(exp => exp.category === budgetCat.category)
                    .reduce((sum, exp) => sum + exp.amount, 0)
                  const remaining = budgetCat.amount - spent
                  
                  return (
                    <tr key={budgetCat.id} className="border-b">
                      <td className="py-2 font-medium">{budgetCat.category}</td>
                      <td className="py-2">${budgetCat.amount.toLocaleString()}</td>
                      <td className="py-2">${spent.toLocaleString()}</td>
                      <td className={`py-2 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${remaining.toLocaleString()}
                      </td>
                      <td className="py-2 text-sm text-gray-600">{budgetCat.description || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBudgetUpload && (
        <BudgetUpload
          grantId={grant.id}
          onBudgetImported={handleBudgetImported}
          onClose={() => setShowBudgetUpload(false)}
        />
      )}

      {showBudgetForm && (
        <BudgetForm
          grantId={grant.id}
          initialBudgets={grant.budgetCategories || []}
          onSave={handleSaveBudget}
          onCancel={() => setShowBudgetForm(false)}
        />
      )}

      {showExpenseForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Add Expense</h2>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  {categories.length === 0 ? (
                    <option value="">No budget categories available</option>
                  ) : (
                    categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Expense
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grant.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(expense.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{expense.description}</div>
                    {expense.notes && (
                      <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}