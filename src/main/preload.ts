import { contextBridge, ipcRenderer } from 'electron'

export interface BudgetCategory {
  id: string
  category: string
  amount: number
  description?: string
  createdAt: string
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
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}