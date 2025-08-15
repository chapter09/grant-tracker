import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow

const createWindow = () => {
  // Try different paths for preload script
  const possiblePaths = [
    path.join(__dirname, 'preload.js'),
    path.join(process.cwd(), 'dist', 'main', 'preload.js'),
    path.resolve(__dirname, 'preload.js')
  ]
  
  let preloadPath = ''
  for (const testPath of possiblePaths) {
    console.log('Testing preload path:', testPath)
    if (fs.existsSync(testPath)) {
      preloadPath = testPath
      console.log('Found preload script at:', preloadPath)
      break
    }
  }
  
  if (!preloadPath) {
    console.error('ERROR: Could not find preload script!')
    console.log('Current working directory:', process.cwd())
    console.log('__dirname:', __dirname)
    // Use the first path anyway and let it fail with a clear error
    preloadPath = possiblePaths[0]
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      // Additional debug settings
      webSecurity: false, // Only for development debugging
      allowRunningInsecureContent: true
    }
  })

  // Add event listeners to debug preload script loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading')
  })
  
  mainWindow.webContents.on('preload-error', (_, preloadPath, error) => {
    console.error('Preload script error:', preloadPath, error)
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

const dataPath = path.join(app.getPath('userData'), 'grants-data.json')

// Initialize data storage
const initializeData = () => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ grants: [], expenses: [] }, null, 2))
  }
}

const readData = () => {
  try {
    const data = fs.readFileSync(dataPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return { grants: [], expenses: [] }
  }
}

const writeData = (data: any) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

app.whenReady().then(() => {
  console.log('App ready, data path:', dataPath)
  initializeData()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Helper function to generate IDs
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36)

// IPC handlers for database operations
ipcMain.handle('grants:getAll', () => {
  console.log('IPC: grants:getAll called')
  try {
    const data = readData()
    console.log('IPC: Data loaded for getAll:', data)
    
    const grantsWithExpenses = data.grants.map((grant: any) => ({
      ...grant,
      expenses: data.expenses.filter((exp: any) => exp.grantId === grant.id)
    }))
    console.log('IPC: Returning grants with expenses:', grantsWithExpenses)
    
    return grantsWithExpenses
  } catch (error) {
    console.error('IPC: Error getting grants:', error)
    throw error
  }
})

ipcMain.handle('grants:create', (_, grantData) => {
  console.log('IPC: grants:create called with data:', grantData)
  try {
    const data = readData()
    console.log('IPC: Current data loaded:', data)
    
    const newGrant = {
      ...grantData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    console.log('IPC: New grant created:', newGrant)
    
    data.grants.push(newGrant)
    writeData(data)
    console.log('IPC: Data written successfully')
    
    return newGrant
  } catch (error) {
    console.error('IPC: Error creating grant:', error)
    throw error
  }
})

ipcMain.handle('grants:update', (_, id, grantData) => {
  const data = readData()
  const grantIndex = data.grants.findIndex((g: any) => g.id === id)
  if (grantIndex >= 0) {
    data.grants[grantIndex] = {
      ...data.grants[grantIndex],
      ...grantData,
      updatedAt: new Date().toISOString()
    }
    writeData(data)
    return data.grants[grantIndex]
  }
  throw new Error('Grant not found')
})

ipcMain.handle('grants:delete', (_, id) => {
  const data = readData()
  const grantIndex = data.grants.findIndex((g: any) => g.id === id)
  if (grantIndex >= 0) {
    const deletedGrant = data.grants[grantIndex]
    data.grants.splice(grantIndex, 1)
    // Also delete associated expenses
    data.expenses = data.expenses.filter((exp: any) => exp.grantId !== id)
    writeData(data)
    return deletedGrant
  }
  throw new Error('Grant not found')
})

ipcMain.handle('expenses:create', (_, expenseData) => {
  const data = readData()
  const newExpense = {
    ...expenseData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  data.expenses.push(newExpense)
  writeData(data)
  return newExpense
})

ipcMain.handle('expenses:update', (_, id, expenseData) => {
  const data = readData()
  const expenseIndex = data.expenses.findIndex((e: any) => e.id === id)
  if (expenseIndex >= 0) {
    data.expenses[expenseIndex] = {
      ...data.expenses[expenseIndex],
      ...expenseData,
      updatedAt: new Date().toISOString()
    }
    writeData(data)
    return data.expenses[expenseIndex]
  }
  throw new Error('Expense not found')
})

ipcMain.handle('expenses:delete', (_, id) => {
  const data = readData()
  const expenseIndex = data.expenses.findIndex((e: any) => e.id === id)
  if (expenseIndex >= 0) {
    const deletedExpense = data.expenses[expenseIndex]
    data.expenses.splice(expenseIndex, 1)
    writeData(data)
    return deletedExpense
  }
  throw new Error('Expense not found')
})

ipcMain.handle('expenses:getByDateRange', (_, startDate, endDate, grantIds?) => {
  const data = readData()
  const grants = data.grants.reduce((acc: any, grant: any) => {
    acc[grant.id] = grant
    return acc
  }, {})
  
  return data.expenses
    .filter((expense: any) => {
      const expenseDate = new Date(expense.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      const dateInRange = expenseDate >= start && expenseDate <= end
      const grantMatch = !grantIds || grantIds.includes(expense.grantId)
      return dateInRange && grantMatch
    })
    .map((expense: any) => ({
      ...expense,
      grant: grants[expense.grantId] || null
    }))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

// Budget import handlers
ipcMain.handle('budget:import', (_, grantId, budgetCategories) => {
  const data = readData()
  const grantIndex = data.grants.findIndex((g: any) => g.id === grantId)
  
  if (grantIndex >= 0) {
    if (!data.grants[grantIndex].budgetCategories) {
      data.grants[grantIndex].budgetCategories = []
    }
    
    data.grants[grantIndex].budgetCategories = budgetCategories.map((category: any) => ({
      ...category,
      id: generateId(),
      createdAt: new Date().toISOString()
    }))
    
    data.grants[grantIndex].updatedAt = new Date().toISOString()
    writeData(data)
    return data.grants[grantIndex].budgetCategories
  }
  
  throw new Error('Grant not found')
})

ipcMain.handle('budget:get', (_, grantId) => {
  const data = readData()
  const grant = data.grants.find((g: any) => g.id === grantId)
  return grant?.budgetCategories || []
})

ipcMain.handle('budget:update', (_, grantId, budgetCategories) => {
  const data = readData()
  const grantIndex = data.grants.findIndex((g: any) => g.id === grantId)
  
  if (grantIndex >= 0) {
    data.grants[grantIndex].budgetCategories = budgetCategories
    data.grants[grantIndex].updatedAt = new Date().toISOString()
    writeData(data)
    return data.grants[grantIndex].budgetCategories
  }
  
  throw new Error('Grant not found')
})