# Grant Tracker

```
 ██████╗ ██████╗  █████╗ ███╗   ██╗████████╗    
██╔════╝ ██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝    
██║  ███╗██████╔╝███████║██╔██╗ ██║   ██║       
██║   ██║██╔══██╗██╔══██║██║╚██╗██║   ██║       
╚██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║       
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝       
                                                 
████████╗██████╗  █████╗  ██████╗██╗  ██╗███████╗██████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
   ██║   ██████╔╝███████║██║     █████╔╝ █████╗  ██████╔╝
   ██║   ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗
   ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

> **A powerful, offline-first desktop application for tracking research grants with Excel budget import capabilities**

## 🌟 Features

### 📊 **Grant Management**
- ✅ Create, edit, and delete research grants
- ✅ Track grant status (Active, Completed, Cancelled)
- ✅ Store grant details (agency, number, dates, budget)
- ✅ Comprehensive grant overview dashboard

### 💰 **Expense Tracking**
- ✅ Categorized expense tracking (Personnel, Equipment, Travel, Supplies, Other)
- ✅ Real-time budget vs. spending analysis
- ✅ Timeline-based expense filtering
- ✅ Detailed expense management with notes and receipts

### 📈 **Excel Budget Import**
- ✅ Import budgets from Excel/CSV files
- ✅ Flexible column mapping for different file formats
- ✅ Category mapping to standardize expense types
- ✅ Data preview before import
- ✅ Budget allocation by category with spending tracking

### 📊 **Analytics & Visualization**
- ✅ Interactive charts using Recharts
- ✅ Spending trends over time
- ✅ Budget vs. actual comparisons
- ✅ Category-wise expense breakdowns
- ✅ Grant portfolio overview

### 🔒 **Offline-First Architecture**
- ✅ Fully functional without internet connection
- ✅ Local JSON-based data storage
- ✅ Cross-platform desktop application
- ✅ Data stored in user's local directory

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/chapter09/grant-tracker.git
cd grant-tracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

The application will start with:
- Vite development server on `http://localhost:5173`
- Electron desktop application window

### Building for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run package
```

## 📖 Usage Guide

### 1. **Adding a Grant**
1. Navigate to the "Grants" page
2. Click "Add Grant" button
3. Fill in grant details (title, agency, number, budget, dates)
4. Save to create the grant

### 2. **Importing Budget from Excel**
1. Open a grant detail page
2. Click "Import Budget" button
3. Upload your Excel/CSV file
4. Map columns to description, amount, and category fields
5. Map Excel categories to expense types
6. Preview and import

### 3. **Tracking Expenses**
1. In grant detail view, click "Add Expense"
2. Enter expense details and categorize
3. View real-time budget vs. spending analysis
4. Monitor remaining budget per category

### 4. **Dashboard Analytics**
- View portfolio overview with total budgets and spending
- Analyze spending trends with interactive charts
- Filter expenses by date range
- Compare performance across grants

## 🏗️ Technical Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for data visualization
- **xlsx** library for Excel file processing

### Backend
- **Electron** main process
- **Node.js** with TypeScript
- **File-based JSON storage** for offline operation
- **IPC communication** between main and renderer processes

### Development Tools
- **Vite** for fast development and building
- **TypeScript** for type safety
- **ESLint** for code quality
- **Concurrently** for running multiple processes

## 📁 Project Structure

```
grant-tracker/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main process entry point
│   │   └── preload.ts       # Preload script for IPC
│   └── renderer/            # React frontend
│       ├── components/      # Reusable React components
│       ├── pages/          # Application pages
│       ├── App.tsx         # Main React component
│       └── main.tsx        # React entry point
├── dist/                    # Build output
├── public/                  # Static assets
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🔧 Configuration

### Data Storage
Grant data is stored locally in JSON format at:
- **macOS**: `~/Library/Application Support/grant-tracker/grants-data.json`
- **Windows**: `%APPDATA%/grant-tracker/grants-data.json`
- **Linux**: `~/.config/grant-tracker/grants-data.json`

### Supported File Formats
- Excel files (.xlsx, .xls)
- CSV files (.csv)
- Any spreadsheet format supported by the xlsx library

## 🎯 Use Cases

### Research Institutions
- Track multiple NSF, NIH, and other federal grants
- Monitor spending across different grant categories
- Import complex budget allocations from Excel
- Generate reports for grant compliance

### Principal Investigators
- Personal grant portfolio management
- Budget planning and tracking
- Expense categorization for reporting
- Offline access during travel

### Grant Administrators
- Centralized grant tracking
- Budget vs. actual analysis
- Historical spending patterns
- Multi-grant portfolio overview

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:vite   # Build renderer only
npm run build:electron # Build main process only
npm run package      # Create distributable package
```

### Adding New Features

1. **Frontend**: Add components in `src/renderer/components/`
2. **Pages**: Create new pages in `src/renderer/pages/`
3. **Backend**: Extend IPC handlers in `src/main/main.ts`
4. **Types**: Update TypeScript interfaces in `src/main/preload.ts`

## 🐛 Troubleshooting

### Common Issues

**Build Failures**
- Ensure Node.js version is 16 or higher
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

**Excel Import Issues**
- Verify file format is supported (.xlsx, .xls, .csv)
- Check that amount columns contain numeric values
- Ensure file is not corrupted or password-protected

**Data Loss Prevention**
- Data is automatically saved to local storage
- Regular backups are recommended for important data
- Export functionality can be added for data portability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/) for cross-platform desktop support
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Charts created with [Recharts](https://recharts.org/)
- Excel processing using [SheetJS](https://sheetjs.com/)

---

**Grant Tracker** - Simplifying research grant management, one expense at a time. 💼✨