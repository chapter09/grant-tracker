import { contextBridge, ipcRenderer } from 'electron'

export interface BudgetCategory {
  id: string
  category: string
  type: 'pi_salary' | 'student_salary' | 'travel' | 'materials' | 'publication' | 'tuition' | 'indirect' | 'other'
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

// Helper interfaces for specific budget types
export interface PISalaryBudget extends BudgetCategory {
  type: 'pi_salary'
  monthlyRate: number
  numberOfMonths: number
}

export interface StudentSalaryBudget extends BudgetCategory {
  type: 'student_salary'
  monthlyRate: number
  numberOfMonths: number
  numberOfStudents: number
}

export interface TuitionBudget extends BudgetCategory {
  type: 'tuition'
  yearlyRate: number
  numberOfYears: number
  numberOfStudents: number
}

export interface TravelBudget extends BudgetCategory {
  type: 'travel'
  numberOfTrips?: number
  costPerTrip?: number
}

export interface MaterialsBudget extends BudgetCategory {
  type: 'materials'
}

export interface PublicationBudget extends BudgetCategory {
  type: 'publication'
}

export interface IndirectBudget extends BudgetCategory {
  type: 'indirect'
}

export interface Grant {
  id: string
  title: string
  agency: string
  number: string
  totalAmount: number
  startDate: string
  endDate: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
  expenses?: Expense[]
  budgetCategories?: BudgetCategory[]
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  receipt?: string
  notes?: string
  createdAt: string
  updatedAt: string
  grantId: string
  grant?: Grant
}

export interface ElectronAPI {
  grants: {
    getAll: () => Promise<Grant[]>
    create: (grantData: Omit<Grant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Grant>
    update: (id: string, grantData: Partial<Grant>) => Promise<Grant>
    delete: (id: string) => Promise<Grant>
  }
  expenses: {
    create: (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Expense>
    update: (id: string, expenseData: Partial<Expense>) => Promise<Expense>
    delete: (id: string) => Promise<Expense>
    getByDateRange: (startDate: string, endDate: string, grantIds?: string[]) => Promise<Expense[]>
  }
  budget: {
    import: (grantId: string, budgetCategories: Omit<BudgetCategory, 'id' | 'createdAt'>[]) => Promise<BudgetCategory[]>
    get: (grantId: string) => Promise<BudgetCategory[]>
    update: (grantId: string, budgetCategories: BudgetCategory[]) => Promise<BudgetCategory[]>
  }
  files: {
    importGrantsFromExcel: () => Promise<{
      success: boolean
      grantsCount?: number
      categoriesCount?: number
      error?: string
    }>
  }
}

const electronAPI: ElectronAPI = {
  grants: {
    getAll: () => ipcRenderer.invoke('grants:getAll'),
    create: (grantData) => ipcRenderer.invoke('grants:create', grantData),
    update: (id, grantData) => ipcRenderer.invoke('grants:update', id, grantData),
    delete: (id) => ipcRenderer.invoke('grants:delete', id)
  },
  expenses: {
    create: (expenseData) => ipcRenderer.invoke('expenses:create', expenseData),
    update: (id, expenseData) => ipcRenderer.invoke('expenses:update', id, expenseData),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
    getByDateRange: (startDate, endDate, grantIds) => 
      ipcRenderer.invoke('expenses:getByDateRange', startDate, endDate, grantIds)
  },
  budget: {
    import: (grantId, budgetCategories) => ipcRenderer.invoke('budget:import', grantId, budgetCategories),
    get: (grantId) => ipcRenderer.invoke('budget:get', grantId),
    update: (grantId, budgetCategories) => ipcRenderer.invoke('budget:update', grantId, budgetCategories)
  },
  files: {
    importGrantsFromExcel: () => ipcRenderer.invoke('files:importGrantsFromExcel')
  }
}

console.log('=== PRELOAD SCRIPT START ===')
console.log('Preload script loaded, exposing electronAPI')
console.log('electronAPI object:', electronAPI)

try {
  // Test basic contextBridge functionality
  contextBridge.exposeInMainWorld('testAPI', {
    test: () => 'Preload script is working!'
  })
  console.log('testAPI exposed successfully')
  
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  console.log('electronAPI exposed to main world successfully')
  
  // Add a ready signal
  contextBridge.exposeInMainWorld('electronAPIReady', true)
  console.log('electronAPIReady flag set')
  
} catch (error) {
  console.error('Error exposing APIs to main world:', error)
}

console.log('=== PRELOAD SCRIPT END ===')

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electronAPIReady: boolean
    testAPI: {
      test: () => string
    }
  }
}