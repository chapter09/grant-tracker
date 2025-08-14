import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Grants from './pages/Grants'
import GrantDetail from './pages/GrantDetail'
import Expenses from './pages/Expenses'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/grants" element={<Grants />} />
        <Route path="/grants/:id" element={<GrantDetail />} />
        <Route path="/expenses" element={<Expenses />} />
      </Routes>
    </Layout>
  )
}

export default App