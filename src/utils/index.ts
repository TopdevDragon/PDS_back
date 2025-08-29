import { PRICE_THRESHOLD, SEVERITY_LEVELS, DISCREPANCY_TYPES } from '../constants'

export function calculatePriceDifference(invoicePrice: number, referencePrice: number): number {
    // Validate inputs
    if (typeof invoicePrice !== 'number' || typeof referencePrice !== 'number') {
        return 0
    }
    
    // Handle edge cases
    if (referencePrice === 0) {
        return invoicePrice > 0 ? 100 : 0
    }
    
    if (invoicePrice === 0 && referencePrice === 0) {
        return 0
    }
    
    // Calculate percentage difference
    const difference = invoicePrice - referencePrice
    const percentage = (difference / referencePrice) * 100
    
    // Handle extreme values
    if (!isFinite(percentage)) {
        return invoicePrice > referencePrice ? 100 : -100
    }
    
    return percentage
}

export function determineSeverity(percentage: number): "low" | "medium" | "high" {
    if (percentage > 20) return SEVERITY_LEVELS.HIGH
    if (percentage > 10) return SEVERITY_LEVELS.MEDIUM
    return SEVERITY_LEVELS.LOW
}

export function findColumnIndex(headers: string[], possibleNames: readonly string[]): number {
    return headers.findIndex(h => 
        possibleNames.some(name => h.toLowerCase().trim().includes(name.toLowerCase().trim()))
    )
}

export function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`
}

export function formatPercentage(percentage: number): string {
    return `${percentage.toFixed(1)}%`
}

export function generateId(prefix: string, index: number): string {
    return `${prefix}-${index}`
}

export function validateExcelHeaders(headers: string[]): boolean {
    const requiredColumns = [
        'drug', 'name', 'price', 'cost', 'formulation', 'form', 
        'strength', 'dose', 'payer', 'insurance'
    ]
    
    const headerText = headers.join(' ').toLowerCase()
    return requiredColumns.some(col => headerText.includes(col))
}

export function parsePrice(priceString: string | number | undefined): number {
    if (typeof priceString === 'number') {
        return priceString
    }
    
    if (!priceString) {
        return 0
    }
    
    // Convert to string and remove common currency symbols and formatting
    const cleanPrice = priceString.toString()
        .replace(/[$€£¥,]/g, '')  // Remove currency symbols and commas
        .replace(/\s+/g, '')      // Remove whitespace
        .trim()
    
    // Parse the cleaned string
    const parsed = parseFloat(cleanPrice)
    
    // Return 0 if parsing failed, otherwise return the parsed value
    return isNaN(parsed) ? 0 : parsed
}
