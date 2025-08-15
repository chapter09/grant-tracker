import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

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
      updatedAt: new Date().toISOString(),
      budgetCategories: grantData.budgetCategories || []
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

// Excel import handler
ipcMain.handle('files:importGrantsFromExcel', async () => {
  console.log('IPC: files:importGrantsFromExcel called')
  
  try {
    // Show file dialog
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Grants from Excel',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    
    if (result.canceled || result.filePaths.length === 0) {
      console.log('IPC: File selection canceled')
      return { success: false, error: 'File selection canceled' }
    }
    
    const filePath = result.filePaths[0]
    console.log('IPC: Processing Excel file:', filePath)
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // Use first sheet
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    console.log('IPC: Excel data parsed:', data)
    
    if (!data || data.length === 0) {
      return { success: false, error: 'No data found in Excel file' }
    }
    
    // Process the data and create grants
    const currentData = readData()
    let grantsCreated = 0
    let categoriesCreated = 0
    
    for (const row of data as any[]) {
      // Map Excel columns to grant fields (adjust these based on your Excel structure)
      const grantData = {
        title: row['Grant Title'] || row['Title'] || row['title'] || '',
        agency: row['Agency'] || row['agency'] || '',
        number: row['Grant Number'] || row['Number'] || row['number'] || '',
        totalAmount: parseFloat(row['Total Amount'] || row['Amount'] || row['totalAmount'] || 0),
        startDate: formatDate(row['Start Date'] || row['startDate'] || ''),
        endDate: formatDate(row['End Date'] || row['endDate'] || ''),
        description: row['Description'] || row['description'] || '',
        status: row['Status'] || row['status'] || 'Active'
      }
      
      // Validate required fields
      if (!grantData.title || !grantData.agency || !grantData.number) {
        console.log('IPC: Skipping row due to missing required fields:', row)
        continue
      }
      
      // Create the grant
      const newGrant = {
        ...grantData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        budgetCategories: [] as any[]
      }
      
      // Add budget categories with enhanced structure
      const budgetCategories: any[] = []
      
      // Handle specific budget types with enhanced fields
      const budgetTypes = [
        { key: 'PI Summer Salary', type: 'pi_salary' },
        { key: 'Student Summer Salary', type: 'student_salary' },
        { key: 'Travel', type: 'travel' },
        { key: 'Materials', type: 'materials' },
        { key: 'Publication', type: 'publication' },
        { key: 'Tuition', type: 'tuition' }
      ]
      
      // Process specific budget types
      for (const budgetType of budgetTypes) {
        const amount = parseFloat(row[budgetType.key] || row[budgetType.key.toLowerCase()] || 0)
        if (amount > 0) {
          const budget: any = {
            id: generateId(),
            category: budgetType.key,
            type: budgetType.type,
            amount: amount,
            description: row[`${budgetType.key} Description`] || '',
            createdAt: new Date().toISOString(),
            notes: row[`${budgetType.key} Notes`] || ''
          }
          
          // Add type-specific fields based on Excel columns
          switch (budgetType.type) {
            case 'pi_salary':
              budget.monthlyRate = parseFloat(row['PI Monthly Rate'] || 0)
              budget.numberOfMonths = parseInt(row['PI Months'] || 3)
              break
            case 'student_salary':
              budget.monthlyRate = parseFloat(row['Student Monthly Rate'] || 0)
              budget.numberOfMonths = parseInt(row['Student Months'] || 3)
              budget.numberOfStudents = parseInt(row['Number of Students'] || 1)
              break
            case 'tuition':
              budget.yearlyRate = parseFloat(row['Tuition Per Year'] || 0)
              budget.numberOfYears = parseInt(row['Tuition Years'] || 1)
              budget.numberOfStudents = parseInt(row['Tuition Students'] || 1)
              break
            case 'travel':
              budget.numberOfTrips = parseInt(row['Number of Trips'] || 1)
              budget.costPerTrip = parseFloat(row['Cost Per Trip'] || amount)
              break
          }
          
          budgetCategories.push(budget)
          categoriesCreated++
        }
      }
      
      // Also handle generic budget categories (for backwards compatibility)
      for (let i = 1; i <= 10; i++) {
        const categoryName = row[`Category ${i}`] || row[`category${i}`]
        const categoryAmount = row[`Amount ${i}`] || row[`amount${i}`]
        
        if (categoryName && categoryAmount) {
          budgetCategories.push({
            id: generateId(),
            category: categoryName,
            type: 'other',
            amount: parseFloat(categoryAmount),
            description: row[`Description ${i}`] || row[`description${i}`] || '',
            createdAt: new Date().toISOString()
          })
          categoriesCreated++
        }
      }
      
      newGrant.budgetCategories = budgetCategories
      currentData.grants.push(newGrant)
      grantsCreated++
      
      console.log('IPC: Created grant from Excel:', newGrant)
    }
    
    // Save the updated data
    writeData(currentData)
    
    console.log(`IPC: Excel import completed - ${grantsCreated} grants, ${categoriesCreated} categories`)
    
    return {
      success: true,
      grantsCount: grantsCreated,
      categoriesCount: categoriesCreated
    }
    
  } catch (error) {
    console.error('IPC: Error importing Excel file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
})

// Helper function to format dates from Excel
function formatDate(dateValue: any): string {
  if (!dateValue) return ''
  
  try {
    // Handle Excel date numbers
    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue)
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
    
    return dateValue.toString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}