# Grant Tracker - Excel Import Template

## Enhanced Budget Structure

Your Grant Tracker now supports detailed academic budget categories with automatic calculations!

## Excel Column Headers for Basic Grant Info:
- **Grant Title** (required)
- **Agency** (required) 
- **Grant Number** (required)
- **Total Amount** (required)
- **Start Date** (required - format: YYYY-MM-DD or MM/DD/YYYY)
- **End Date** (required - format: YYYY-MM-DD or MM/DD/YYYY)
- **Description** (optional)
- **Status** (optional, defaults to "Active")

## Excel Column Headers for Enhanced Budget Categories:

### PI Summer Salary
- **PI Summer Salary** - Total amount (calculated automatically if monthly rate provided)
- **PI Monthly Rate** - Monthly salary rate
- **PI Months** - Number of months (default: 3)

### Student Summer Salary  
- **Student Summer Salary** - Total amount (calculated automatically)
- **Student Monthly Rate** - Monthly salary per student
- **Student Months** - Number of months (default: 3) 
- **Number of Students** - Number of students (default: 1)

### Tuition
- **Tuition** - Total tuition amount (calculated automatically)
- **Tuition Per Year** - Yearly tuition rate per student
- **Tuition Years** - Number of years (default: 1)
- **Tuition Students** - Number of students (default: 1)

### Travel
- **Travel** - Total travel budget (calculated automatically)
- **Number of Trips** - Number of trips (default: 1)
- **Cost Per Trip** - Cost per trip

### Other Categories
- **Materials** - Materials and supplies budget
- **Publication** - Publication costs budget

### Optional Description Fields
- **PI Summer Salary Description**
- **Student Summer Salary Description** 
- **Travel Description**
- **Materials Description**
- **Publication Description**
- **Tuition Description**

### Optional Notes Fields
- **PI Summer Salary Notes**
- **Student Summer Salary Notes**
- **Travel Notes**
- **Materials Notes**
- **Publication Notes**
- **Tuition Notes**

## Sample Excel Data:

| Grant Title | Agency | Grant Number | Total Amount | Start Date | End Date | PI Summer Salary | PI Monthly Rate | PI Months | Student Summer Salary | Student Monthly Rate | Student Months | Number of Students | Travel | Number of Trips | Cost Per Trip | Materials | Publication | Tuition | Tuition Per Year | Tuition Years | Tuition Students |
|-------------|--------|--------------|--------------|------------|----------|------------------|-----------------|-----------|----------------------|---------------------|----------------|-------------------|--------|----------------|---------------|-----------|-------------|---------|------------------|---------------|------------------|
| AI Research Grant | NSF | DMS-2025001 | 500000 | 2025-09-01 | 2028-08-31 | 30000 | 10000 | 3 | 36000 | 3000 | 3 | 4 | 15000 | 3 | 5000 | 25000 | 8000 | 60000 | 20000 | 3 | 1 |
| ML Innovation Project | NIH | R01-234567 | 350000 | 2025-01-01 | 2027-12-31 | 24000 | 8000 | 3 | 18000 | 3000 | 2 | 3 | 12000 | 2 | 6000 | 15000 | 5000 | 40000 | 20000 | 2 | 1 |

## Features:

### ✅ **Automatic Calculations**
- PI/Student salaries calculated from monthly rates × months × students
- Travel costs calculated from trips × cost per trip  
- Tuition calculated from yearly rate × years × students

### ✅ **Budget Management Interface**
- Click "Budget" button on any grant to manage detailed budgets
- Add/edit budget categories with type-specific fields
- Real-time calculation of totals
- Visual budget breakdown by category

### ✅ **Flexible Import**
- Supports both detailed budget fields and simple amount columns
- Backwards compatible with existing Excel formats
- Automatic type detection for budget categories

### ✅ **Academic Focus**
- Designed specifically for research grant management
- Handles common academic budget categories
- Supports multi-year and multi-student scenarios

Try creating an Excel file with the above format and importing it using the "Import Excel" button!