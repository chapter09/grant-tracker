import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes?: string
  grant: {
    id: string
    title: string
    agency: string
  }
}

interface Grant {
  id: string
  title: string
  agency: string
  budgetCategories?: {
    id: string
    category: string
    amount: number
  }[]
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    category: '',
    grantId: ''
  })

  // Get all unique categories from all grants (excluding indirect costs)
  const getAllCategories = (): string[] => {
    const allCategories = new Set<string>()
    grants.forEach(grant => {
      if (grant.budgetCategories) {
        grant.budgetCategories.forEach(cat => {
          if (cat.category !== 'Indirect Costs') {
            allCategories.add(cat.category)
          }
        })
      }
    })
    // Add default categories if no budget categories exist
    if (allCategories.size === 0) {
      return ['PI Summer Salary', 'Student Summer Salary', 'Travel', 'Materials and Supplies', 'Publication Costs', 'Tuition']
    }
    return Array.from(allCategories).sort()
  }
  
  const categories = getAllCategories()

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    try {
      const [expensesData, grantsData] = await Promise.all([
        window.electronAPI.expenses.getByDateRange(
          filters.startDate, 
          filters.endDate,
          filters.grantId ? [filters.grantId] : undefined
        ),
        window.electronAPI.grants.getAll()
      ])
      
      let filteredExpenses = expensesData
      if (filters.category) {
        filteredExpenses = filteredExpenses.filter(exp => exp.category === filters.category)
      }
      
      setExpenses(filteredExpenses)
      setGrants(grantsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await window.electronAPI.expenses.delete(id)
        loadData()
      } catch (error) {
        console.error('Failed to delete expense:', error)
      }
    }
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const expensesByGrant = expenses.reduce((acc, expense) => {
    const grantTitle = expense.grant?.title || 'Unknown Grant'
    acc[grantTitle] = (acc[grantTitle] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <div className="text-lg font-semibold text-gray-900">
          Total: ${totalAmount.toLocaleString()}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Grant</label>
            <select
              value={filters.grantId}
              onChange={(e) => setFilters(prev => ({ ...prev, grantId: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Grants</option>
              {grants.map(grant => (
                <option key={grant.id} value={grant.id}>{grant.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Expenses by Category</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory).map(([category, amount]) => (
              <div key={category} className="flex justify-between">
                <span className="text-sm text-gray-600">{category}</span>
                <span className="text-sm font-medium">${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Expenses by Grant</h3>
          <div className="space-y-2">
            {Object.entries(expensesByGrant).map(([grant, amount]) => (
              <div key={grant} className="flex justify-between">
                <span className="text-sm text-gray-600">{grant}</span>
                <span className="text-sm font-medium">${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Expense Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{expense.grant?.title || 'Unknown'}</div>
                    <div className="text-xs text-gray-400">{expense.grant?.agency}</div>
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
          {expenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No expenses found for the selected criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}