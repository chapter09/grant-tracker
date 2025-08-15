import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

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
}

export default function Grants() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [showForm, setShowForm] = useState(false)
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

  useEffect(() => {
    loadGrants()
  }, [])

  const loadGrants = async () => {
    try {
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
    console.log('Submitting grant form with data:', formData)
    
    try {
      const grantToCreate = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount)
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
      setShowForm(false)
      loadGrants()
      alert('Grant created successfully!')
    } catch (error) {
      console.error('Failed to create grant:', error)
      alert('Failed to create grant: ' + (error as Error).message)
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Grants</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Grant
        </button>
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
                onClick={() => setShowForm(false)}
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
    </div>
  )
}