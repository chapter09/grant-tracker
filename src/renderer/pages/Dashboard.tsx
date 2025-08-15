import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isAfter, eachWeekOfInterval, addDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface Grant {
  id: string
  title: string
  agency: string
  totalAmount: number
  startDate: string
  endDate: string
  status: string
  expenses: { amount: number, category: string, date: string }[]
  budgetCategories?: {
    id: string
    category: string
    amount: number
    type: string
  }[]
}

interface Expense {
  id: string
  amount: number
  date: string
  category: string
  grant: { title: string }
}

export default function Dashboard() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGrantId, setSelectedGrantId] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadData()
  }, [dateRange])

  useEffect(() => {
    if (grants.length > 0 && !selectedGrantId) {
      setSelectedGrantId(grants[0].id)
    }
  }, [grants, selectedGrantId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [grantsData, expensesData] = await Promise.all([
        window.electronAPI.grants.getAll(),
        window.electronAPI.expenses.getByDateRange(dateRange.start, dateRange.end)
      ])
      console.log('Loaded grants:', grantsData)
      console.log('Loaded expenses:', expensesData)
      setGrants(grantsData || [])
      setExpenses(expensesData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      setGrants([])
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const totalBudget = grants.reduce((sum, grant) => sum + grant.totalAmount, 0)
  const totalSpent = grants.reduce((sum, grant) => 
    sum + (grant.expenses || []).reduce((expSum, exp) => expSum + exp.amount, 0), 0)
  
  const activeGrants = grants.filter(g => g.status === 'Active').length

  // Budget remaining timeline calculation for selected grant
  const selectedGrant = grants.find(g => g.id === selectedGrantId)
  const getBudgetTimelineData = () => {
    try {
      if (!selectedGrant?.budgetCategories || !selectedGrant.startDate || !selectedGrant.endDate) return []
      
      const categories = selectedGrant.budgetCategories.filter(budget => budget.category !== 'Indirect Costs')
      if (categories.length === 0) return []
      
      // Get date range from grant start to end (or current date if grant hasn't ended)
      const startDate = parseISO(selectedGrant.startDate)
      const endDate = parseISO(selectedGrant.endDate)
      const today = new Date()
      const currentEndDate = isAfter(today, endDate) ? endDate : today
      
      // Create timeline from start to current date (or end date) - use weekly intervals for better performance
      const dateRange = eachWeekOfInterval({ start: startDate, end: currentEndDate })
      
      // Add the actual start date if not included
      if (dateRange.length === 0 || dateRange[0].getTime() !== startDate.getTime()) {
        dateRange.unshift(startDate)
      }
      
      // Add one more week after end date to show the drop to 0
      if (isAfter(today, endDate)) {
        dateRange.push(addDays(endDate, 7))
      }
      
      return dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const isAfterGrant = isAfter(date, endDate)
        
        const dataPoint: any = { date: format(date, 'MM/dd/yyyy') }
        
        categories.forEach(budget => {
          if (isAfterGrant) {
            // After grant ends, remaining goes to 0
            dataPoint[budget.category] = 0
          } else {
            // Calculate expenses up to this date
            const expensesUpToDate = (selectedGrant.expenses || [])
              .filter(exp => exp.category === budget.category && exp.date <= dateStr)
              .reduce((sum, exp) => sum + exp.amount, 0)
            
            dataPoint[budget.category] = Math.max(0, budget.amount - expensesUpToDate)
          }
        })
        
        return dataPoint
      })
    } catch (error) {
      console.error('Error in getBudgetTimelineData:', error)
      return []
    }
  }

  const budgetTimelineData = getBudgetTimelineData()
  const budgetCategories = selectedGrant?.budgetCategories?.filter(budget => budget.category !== 'Indirect Costs') || []
  const totalRemaining = budgetCategories.reduce((sum, budget) => {
    const categoryExpenses = (selectedGrant?.expenses || [])
      .filter(exp => exp.category === budget.category)
      .reduce((total, exp) => total + exp.amount, 0)
    return sum + Math.max(0, budget.amount - categoryExpenses)
  }, 0)

  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const categoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    amount
  }))

  const expensesByDate = expenses.reduce((acc, expense) => {
    const date = format(new Date(expense.date), 'MM/dd')
    acc[date] = (acc[date] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const timelineData = Object.entries(expensesByDate).map(([date, amount]) => ({
    date,
    amount
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-4">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded px-3 py-1"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded px-3 py-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Budget</h3>
          <p className="text-2xl font-bold text-green-600">${totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Spent</h3>
          <p className="text-2xl font-bold text-red-600">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Grants</h3>
          <p className="text-2xl font-bold text-blue-600">{activeGrants}</p>
        </div>
      </div>

      {/* Budget Remaining Visualization */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Budget Remaining by Category</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedGrantId}
              onChange={(e) => setSelectedGrantId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select a grant</option>
              {grants.map(grant => (
                <option key={grant.id} value={grant.id}>
                  {grant.title} ({grant.agency})
                </option>
              ))}
            </select>
            {selectedGrant && (
              <div className="text-sm text-gray-600">
                Total Remaining: <span className="font-semibold text-green-600">${totalRemaining.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {selectedGrant ? (
          budgetCategories.length > 0 ? (
            budgetTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={budgetTimelineData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      return [`$${Number(value).toLocaleString()}`, name]
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  {budgetCategories.map((budget, index) => {
                    const colors = [
                      '#3B82F6', // blue
                      '#10B981', // green  
                      '#F59E0B', // yellow
                      '#EF4444', // red
                      '#8B5CF6', // purple
                      '#06B6D4', // cyan
                      '#F97316', // orange
                      '#84CC16', // lime
                    ]
                    return (
                      <Line
                        key={budget.id}
                        type="monotone"
                        dataKey={budget.category}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Timeline data could not be generated.</p>
                <p className="text-sm mt-1">Check that the grant has valid start/end dates.</p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No budget categories available for this grant.</p>
              <p className="text-sm mt-1">Add budget categories to see the visualization.</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-gray-500">
            Select a grant to view budget remaining over time
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Expenses Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              <Bar dataKey="amount" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Recent Grants</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading grants...
                  </td>
                </tr>
              ) : grants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="space-y-2">
                      <p>No grants found</p>
                      <Link to="/grants" className="text-blue-600 hover:underline">
                        Add your first grant →
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                grants.slice(0, 5).map((grant) => {
                  const spent = (grant.expenses || []).reduce((sum, exp) => sum + exp.amount, 0)
                  return (
                    <tr key={grant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {grant.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grant.agency}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${grant.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${spent.toLocaleString()}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        <Link to={`/grants/${grant.id}`} className="hover:underline">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}