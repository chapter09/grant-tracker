import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isAfter, eachWeekOfInterval, addDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

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
      setSelectedGrantId('all') // Default to "All Grants"
    }
  }, [grants, selectedGrantId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Wait for electronAPI to be available
      if (!window.electronAPI) {
        console.log('electronAPI not available, waiting...')
        await new Promise(resolve => {
          const checkAPI = () => {
            if (window.electronAPI) {
              resolve(true)
            } else {
              setTimeout(checkAPI, 100)
            }
          }
          checkAPI()
        })
      }
      
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

  // Budget remaining timeline calculation for selected grant or all grants
  const selectedGrant = grants.find(g => g.id === selectedGrantId)
  const getBudgetTimelineData = () => {
    try {
      if (selectedGrantId === 'all') {
        // Handle "All Grants" option
        return getAllGrantsBudgetTimelineData()
      }
      
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

  // Function to handle "All Grants" timeline data
  const getAllGrantsBudgetTimelineData = () => {
    try {
      const grantsWithBudgets = grants.filter(g => g.budgetCategories && g.budgetCategories.length > 0 && g.startDate && g.endDate)
      if (grantsWithBudgets.length === 0) return []
      
      // Get all unique categories across all grants (excluding indirect costs)
      const allCategories = new Set<string>()
      grantsWithBudgets.forEach(grant => {
        grant.budgetCategories?.forEach(budget => {
          if (budget.category !== 'Indirect Costs') {
            allCategories.add(budget.category)
          }
        })
      })
      
      if (allCategories.size === 0) return []
      
      // Find the overall date range across all grants
      const allStartDates = grantsWithBudgets.map(g => parseISO(g.startDate))
      const allEndDates = grantsWithBudgets.map(g => parseISO(g.endDate))
      const earliestStart = new Date(Math.min(...allStartDates.map(d => d.getTime())))
      const latestEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())))
      const today = new Date()
      const currentEndDate = isAfter(today, latestEnd) ? latestEnd : today
      
      // Create timeline from earliest start to latest end (or current date)
      const dateRange = eachWeekOfInterval({ start: earliestStart, end: currentEndDate })
      
      // Add the actual start date if not included
      if (dateRange.length === 0 || dateRange[0].getTime() !== earliestStart.getTime()) {
        dateRange.unshift(earliestStart)
      }
      
      // Add one more week after latest end date to show the drop to 0
      if (isAfter(today, latestEnd)) {
        dateRange.push(addDays(latestEnd, 7))
      }
      
      return dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dataPoint: any = { date: format(date, 'MM/dd/yyyy') }
        
        // For each category, sum up remaining amounts across all grants
        Array.from(allCategories).forEach(categoryName => {
          let totalRemaining = 0
          
          grantsWithBudgets.forEach(grant => {
            const grantStartDate = parseISO(grant.startDate)
            const grantEndDate = parseISO(grant.endDate)
            const isAfterThisGrant = isAfter(date, grantEndDate)
            const isBeforeThisGrant = date < grantStartDate
            
            if (isBeforeThisGrant || isAfterThisGrant) {
              // Don't count this grant's budget if we're outside its date range
              return
            }
            
            const categoryBudget = grant.budgetCategories?.find(b => b.category === categoryName)
            if (categoryBudget) {
              // Calculate expenses up to this date for this grant and category
              const expensesUpToDate = (grant.expenses || [])
                .filter(exp => exp.category === categoryName && exp.date <= dateStr)
                .reduce((sum, exp) => sum + exp.amount, 0)
              
              totalRemaining += Math.max(0, categoryBudget.amount - expensesUpToDate)
            }
          })
          
          dataPoint[categoryName] = totalRemaining
        })
        
        return dataPoint
      })
    } catch (error) {
      console.error('Error in getAllGrantsBudgetTimelineData:', error)
      return []
    }
  }

  const budgetTimelineData = getBudgetTimelineData()
  
  // Get budget categories and total remaining based on selection
  const getBudgetCategoriesAndTotal = () => {
    if (selectedGrantId === 'all') {
      // For "All Grants", get unique categories across all grants
      const allCategories = new Set<string>()
      let totalRemaining = 0
      
      grants.forEach(grant => {
        if (grant.budgetCategories) {
          grant.budgetCategories.forEach(budget => {
            if (budget.category !== 'Indirect Costs') {
              allCategories.add(budget.category)
            }
          })
        }
      })
      
      // Calculate total remaining across all grants for each category
      Array.from(allCategories).forEach(categoryName => {
        grants.forEach(grant => {
          const categoryBudget = grant.budgetCategories?.find(b => b.category === categoryName)
          if (categoryBudget) {
            const categoryExpenses = (grant.expenses || [])
              .filter(exp => exp.category === categoryName)
              .reduce((total, exp) => total + exp.amount, 0)
            totalRemaining += Math.max(0, categoryBudget.amount - categoryExpenses)
          }
        })
      })
      
      // Create mock budget categories for display purposes
      const mockCategories = Array.from(allCategories).map(category => ({
        id: category,
        category,
        amount: 0, // Not used for display in "All Grants" mode
        type: 'other' as const
      }))
      
      return { budgetCategories: mockCategories, totalRemaining }
    } else {
      // Single grant selection
      const budgetCategories = selectedGrant?.budgetCategories?.filter(budget => budget.category !== 'Indirect Costs') || []
      const totalRemaining = budgetCategories.reduce((sum, budget) => {
        const categoryExpenses = (selectedGrant?.expenses || [])
          .filter(exp => exp.category === budget.category)
          .reduce((total, exp) => total + exp.amount, 0)
        return sum + Math.max(0, budget.amount - categoryExpenses)
      }, 0)
      
      return { budgetCategories, totalRemaining }
    }
  }
  
  const { budgetCategories, totalRemaining } = getBudgetCategoriesAndTotal()

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

  // Show loading state for the entire dashboard initially
  if (loading && grants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading dashboard...</div>
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

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
          <h3 className="text-lg font-medium">Grant Balance</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedGrantId}
              onChange={(e) => setSelectedGrantId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select a grant</option>
              <option value="all">All Grants</option>
              {grants.map(grant => (
                <option key={grant.id} value={grant.id}>
                  {grant.title} ({grant.agency})
                </option>
              ))}
            </select>
            {(selectedGrant || selectedGrantId === 'all') && (
              <div className="text-sm text-gray-600">
                Total Remaining: <span className="font-semibold text-green-600">${totalRemaining.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {(selectedGrant || selectedGrantId === 'all') ? (
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
                  <Legend 
                    verticalAlign="top"
                    height={60}
                    iconType="plainline"
                    wrapperStyle={{ paddingBottom: '20px' }}
                    content={(props) => {
                      if (!props.payload) return null
                      return (
                        <div className="flex flex-wrap justify-center gap-4 mb-4">
                          {props.payload.map((entry, index) => {
                            const strokeDashArrays = [
                              '0',        // solid line
                              '5 5',      // dashed line
                              '10 5',     // longer dash
                              '3 3',      // dotted line
                              '15 5 5 5', // dash-dot pattern
                              '20 5',     // long dash
                              '8 4 2 4',  // dash-dot-dash pattern
                              '12 3 3 3', // custom pattern
                            ]
                            const shapeTypes = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'plus', 'pentagon']
                            return (
                              <div key={index} className="flex items-center gap-2">
                                <svg width="24" height="12">
                                  <line 
                                    x1="2" 
                                    y1="6" 
                                    x2="16" 
                                    y2="6" 
                                    stroke={entry.color} 
                                    strokeWidth="2"
                                    strokeDasharray={strokeDashArrays[index % strokeDashArrays.length]}
                                  />
                                  {/* Custom markers based on shape type */}
                                  {shapeTypes[index % shapeTypes.length] === 'circle' && (
                                    <circle cx="20" cy="6" r="3" fill={entry.color} />
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'square' && (
                                    <rect x="17" y="3" width="6" height="6" fill={entry.color} />
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'triangle' && (
                                    <polygon points="20,3 17,9 23,9" fill={entry.color} />
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'diamond' && (
                                    <polygon points="20,2 23,6 20,10 17,6" fill={entry.color} />
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'star' && (
                                    <polygon points="20,2 21,5 24,5 22,7 23,10 20,8 17,10 18,7 16,5 19,5" fill={entry.color} />
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'cross' && (
                                    <g>
                                      <line x1="20" y1="3" x2="20" y2="9" stroke={entry.color} strokeWidth="2"/>
                                      <line x1="17" y1="6" x2="23" y2="6" stroke={entry.color} strokeWidth="2"/>
                                    </g>
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'plus' && (
                                    <g>
                                      <line x1="20" y1="3" x2="20" y2="9" stroke={entry.color} strokeWidth="3"/>
                                      <line x1="17" y1="6" x2="23" y2="6" stroke={entry.color} strokeWidth="3"/>
                                    </g>
                                  )}
                                  {shapeTypes[index % shapeTypes.length] === 'pentagon' && (
                                    <polygon points="20,2 23,5 22,9 18,9 17,5" fill={entry.color} />
                                  )}
                                </svg>
                                <span className="text-sm text-gray-700">{entry.value}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }}
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
                    
                    const strokeDashArrays = [
                      '0',        // solid line
                      '5 5',      // dashed line
                      '10 5',     // longer dash
                      '3 3',      // dotted line
                      '15 5 5 5', // dash-dot pattern
                      '20 5',     // long dash
                      '8 4 2 4',  // dash-dot-dash pattern
                      '12 3 3 3', // custom pattern
                    ]
                    
                    // Custom dot component for different shapes
                    const CustomDot = (props: any) => {
                      const { cx, cy } = props
                      const shapeTypes = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'plus', 'pentagon']
                      const shapeType = shapeTypes[index % shapeTypes.length]
                      const color = colors[index % colors.length]
                      
                      switch (shapeType) {
                        case 'circle':
                          return <circle cx={cx} cy={cy} r="4" fill={color} />
                        case 'square':
                          return <rect x={cx - 3} y={cy - 3} width="6" height="6" fill={color} />
                        case 'triangle':
                          return <polygon points={`${cx},${cy-4} ${cx-4},${cy+3} ${cx+4},${cy+3}`} fill={color} />
                        case 'diamond':
                          return <polygon points={`${cx},${cy-4} ${cx+3},${cy} ${cx},${cy+4} ${cx-3},${cy}`} fill={color} />
                        case 'star':
                          return <polygon points={`${cx},${cy-4} ${cx+1},${cy-1} ${cx+4},${cy-1} ${cx+2},${cy+1} ${cx+3},${cy+4} ${cx},${cy+2} ${cx-3},${cy+4} ${cx-2},${cy+1} ${cx-4},${cy-1} ${cx-1},${cy-1}`} fill={color} />
                        case 'cross':
                          return (
                            <g>
                              <line x1={cx} y1={cy-3} x2={cx} y2={cy+3} stroke={color} strokeWidth="2"/>
                              <line x1={cx-3} y1={cy} x2={cx+3} y2={cy} stroke={color} strokeWidth="2"/>
                            </g>
                          )
                        case 'plus':
                          return (
                            <g>
                              <line x1={cx} y1={cy-3} x2={cx} y2={cy+3} stroke={color} strokeWidth="3"/>
                              <line x1={cx-3} y1={cy} x2={cx+3} y2={cy} stroke={color} strokeWidth="3"/>
                            </g>
                          )
                        case 'pentagon':
                          return <polygon points={`${cx},${cy-3} ${cx+3},${cy-1} ${cx+2},${cy+3} ${cx-2},${cy+3} ${cx-3},${cy-1}`} fill={color} />
                        default:
                          return <circle cx={cx} cy={cy} r="4" fill={color} />
                      }
                    }
                    
                    return (
                      <Line
                        key={budget.id}
                        type="monotone"
                        dataKey={budget.category}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        strokeDasharray={strokeDashArrays[index % strokeDashArrays.length]}
                        dot={<CustomDot />}
                        connectNulls={false}
                        name={budget.category}
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
              <p>No budget categories available{selectedGrantId === 'all' ? ' across all grants' : ' for this grant'}.</p>
              <p className="text-sm mt-1">Add budget categories to see the visualization.</p>
            </div>
          )
        ) : (
          <div className="text-center py-8 text-gray-500">
            Select a grant to view budget remaining over time
          </div>
        )}
      </div>

      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div> */}

      

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