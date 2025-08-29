import * as XLSX from 'xlsx'
import {
  ReferenceDrug,
  InvoiceDrug,
  Discrepancy,
  ValidationResult
} from '../types'
import {
  PRICE_THRESHOLD,
  SEVERITY_LEVELS,
  DISCREPANCY_TYPES,
  EXCEL_COLUMNS
} from '../constants'
import {
  calculatePriceDifference,
  determineSeverity,
  findColumnIndex,
  formatCurrency,
  formatPercentage,
  generateId,
  parsePrice
} from '../utils'

export async function fetchReferenceDrugs(): Promise<ReferenceDrug[]> {
  try {
    const MOCKAPI_URL = process.env.MOCKAPI_URL || ""

    console.log("🔧 MOCKAPI_URL from env:", process.env.MOCKAPI_URL)
    console.log("🔧 MOCKAPI_URL final value:", MOCKAPI_URL)
    console.log("Fetching reference drugs from:", MOCKAPI_URL)

    if (!MOCKAPI_URL) {
      throw new Error("MOCKAPI_URL environment variable is not set")
    }

    const response = await fetch(MOCKAPI_URL)

    if (!response.ok) {
      throw new Error(`Failed to fetch reference data: ${response.status} ${response.statusText}`)
    }

    const apiData = await response.json() as any[]
    console.log("Raw API data:", apiData)

    // Map API response to our interface structure
    const data: ReferenceDrug[] = apiData.map((item: any) => ({
      id: item.id.toString(),
      drugName: item.drugName,
      unitPrice: item.standardUnitPrice, // Map standardUnitPrice to unitPrice
      formulation: item.formulation,
      strength: item.strength,
      payer: item.payer
    }))

    console.log("Mapped reference drugs:", data)
    return data
  } catch (error) {
    console.error('Error fetching reference drugs:', error)
    // Throw the error so it can be handled by validateInvoice
    throw new Error(`Failed to fetch reference drug data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function parseExcelData(buffer: Buffer): InvoiceDrug[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    console.log("Excel data:", jsonData)

    // Parse the data (using third row as headers - index 2)
    const headers = jsonData[2] as string[]
    const rows = jsonData.slice(3) as any[][] // Start from row 4 (index 3)

    // Find column indices
    const drugNameIndex = findColumnIndex(headers, EXCEL_COLUMNS.DRUG_NAME)
    const unitPriceIndex = findColumnIndex(headers, EXCEL_COLUMNS.UNIT_PRICE)
    const formulationIndex = findColumnIndex(headers, EXCEL_COLUMNS.FORMULATION)
    const strengthIndex = findColumnIndex(headers, EXCEL_COLUMNS.STRENGTH)
    const payerIndex = findColumnIndex(headers, EXCEL_COLUMNS.PAYER)
    const qtyIndex = findColumnIndex(headers, EXCEL_COLUMNS.QTY)

    console.log("Column mapping:")
    console.log("  Headers:", headers)
    console.log("  Drug Name Index:", drugNameIndex, "->", headers[drugNameIndex])
    console.log("  Unit Price Index:", unitPriceIndex, "->", headers[unitPriceIndex])
    console.log("  Formulation Index:", formulationIndex, "->", headers[formulationIndex])
    console.log("  Strength Index:", strengthIndex, "->", headers[strengthIndex])
    console.log("  Payer Index:", payerIndex, "->", headers[payerIndex])
    console.log("  Qty Index:", qtyIndex, "->", headers[qtyIndex])

    // Validate that all required columns were found
    if (drugNameIndex === -1 || unitPriceIndex === -1 || formulationIndex === -1 ||
      strengthIndex === -1 || payerIndex === -1) {
      throw new Error('Required columns not found in Excel file')
    }

    const invoiceDrugs: InvoiceDrug[] = rows
      .filter(row => row.length > 0) // Skip empty rows
      .map((row) => {
        const drugName = (row[drugNameIndex]?.toString() || '').trim()
        const unitPrice = parsePrice(row[unitPriceIndex])
        const formulation = (row[formulationIndex]?.toString() || '').trim()
        const strength = (row[strengthIndex]?.toString() || '').trim()
        const payer = (row[payerIndex]?.toString() || '').trim()
        const qty = qtyIndex !== -1 ? parseInt(row[qtyIndex]?.toString() || '0') || 0 : 0

        return {
          drugName,
          unitPrice,
          formulation,
          strength,
          payer,
          qty,
        }
      })
      .filter(drug => drug.drugName && drug.drugName.trim() !== '') // Filter out empty drug names

    console.log("Parsed invoice drugs:", invoiceDrugs)
    return invoiceDrugs

  } catch (error) {
    console.error("Error parsing Excel file:", error)
    throw new Error("Failed to parse Excel file")
  }
}

export async function validateInvoice(buffer: Buffer): Promise<ValidationResult> {
  const startTime = Date.now()
  let referenceDrugs: ReferenceDrug[] = []
  let apiError: string | null = null

  try {
    referenceDrugs = await fetchReferenceDrugs()
  } catch (error) {
    console.error('Failed to fetch reference drugs:', error)
    apiError = error instanceof Error ? error.message : 'Failed to fetch reference data'
    // Continue with empty reference drugs array to show what we can validate
  }

  const invoiceData = parseExcelData(buffer)
  const discrepancies: Discrepancy[] = []

  let priceDiscrepancies = 0
  let formulationIssues = 0
  let strengthErrors = 0
  let payerMismatches = 0
  let totalOvercharge = 0

  // If we have API error, we can only validate basic data structure
  if (apiError) {
    console.log("API Error detected - skipping detailed validation")
    // Still process the invoice data to show what was parsed
    invoiceData.forEach((invoiceDrug, index) => {
      console.log(`Parsed drug: ${invoiceDrug.drugName} - $${invoiceDrug.unitPrice}`)
    })
  } else {
    // Normal validation process
    invoiceData.forEach((invoiceDrug, index) => {
      const referenceDrug = referenceDrugs.find(
        ref => ref.drugName.toLowerCase() === invoiceDrug.drugName.toLowerCase()
      )

      if (!referenceDrug) {
        console.warn(`Drug not found in reference: ${invoiceDrug.drugName}`)
        return
      }

      console.log(`\nProcessing: ${invoiceDrug.drugName}`)
      console.log(`  Invoice: $${invoiceDrug.unitPrice} | ${invoiceDrug.formulation} | ${invoiceDrug.strength} | ${invoiceDrug.payer}`)
      console.log(`  Reference: $${referenceDrug.unitPrice} | ${referenceDrug.formulation} | ${referenceDrug.strength} | ${referenceDrug.payer}`)

      // Check Unit Price discrepancy and calculate overcharge
      const pricePercentage = calculatePriceDifference(invoiceDrug.unitPrice, referenceDrug.unitPrice)
      const priceDifference = invoiceDrug.unitPrice - referenceDrug.unitPrice

      console.log(`  Price: Invoice $${invoiceDrug.unitPrice} vs Reference $${referenceDrug.unitPrice}`)
      console.log(`  Qty: ${invoiceDrug.qty}`)
      console.log(`  Difference: $${priceDifference.toFixed(2)} (${pricePercentage.toFixed(2)}%)`)
      console.log(`  Threshold: ${PRICE_THRESHOLD}% | Exceeds: ${pricePercentage > PRICE_THRESHOLD}`)

      // Only count as discrepancy if it exceeds threshold (10%)
      if (pricePercentage > PRICE_THRESHOLD) {
        priceDiscrepancies++
        console.log(`  COUNTED AS PRICE DISCREPANCY!`)

        discrepancies.push({
          id: generateId('price', index),
          drugName: invoiceDrug.drugName,
          type: DISCREPANCY_TYPES.UNIT_PRICE,
          severity: determineSeverity(pricePercentage),
          description: `${formatPercentage(pricePercentage)} overcharge detected`,
          invoiceValue: formatCurrency(invoiceDrug.unitPrice),
          referenceValue: formatCurrency(referenceDrug.unitPrice),
          overchargePercentage: Math.round(pricePercentage * 10) / 10,
          overchargeAmount: formatCurrency(priceDifference),
        })
      }

      // Always accumulate total overcharge for reporting
      if (priceDifference > 0) {
        const totalPriceDifference = priceDifference * invoiceDrug.qty
        totalOvercharge += totalPriceDifference
        console.log(`  Added to total overcharge: $${totalPriceDifference.toFixed(2)}`)
      }

      // Check Formulation discrepancy
      if (invoiceDrug.formulation.toLowerCase() !== referenceDrug.formulation.toLowerCase()) {
        formulationIssues++
        discrepancies.push({
          id: generateId('formulation', index),
          drugName: invoiceDrug.drugName,
          type: DISCREPANCY_TYPES.FORMULATION,
          severity: SEVERITY_LEVELS.HIGH,
          description: "Formulation mismatch",
          invoiceValue: invoiceDrug.formulation,
          referenceValue: referenceDrug.formulation,
        })
      }

      // Check Strength discrepancy
      if (invoiceDrug.strength.toLowerCase() !== referenceDrug.strength.toLowerCase()) {
        strengthErrors++
        discrepancies.push({
          id: generateId('strength', index),
          drugName: invoiceDrug.drugName,
          type: DISCREPANCY_TYPES.STRENGTH,
          severity: SEVERITY_LEVELS.HIGH,
          description: "Strength mismatch",
          invoiceValue: invoiceDrug.strength,
          referenceValue: referenceDrug.strength,
        })
      }

      // Check Payer discrepancy
      if (invoiceDrug.payer.toLowerCase() !== referenceDrug.payer.toLowerCase()) {
        payerMismatches++
        discrepancies.push({
          id: generateId('payer', index),
          drugName: invoiceDrug.drugName,
          type: DISCREPANCY_TYPES.PAYER,
          severity: SEVERITY_LEVELS.LOW,
          description: "Payer mismatch",
          invoiceValue: invoiceDrug.payer,
          referenceValue: referenceDrug.payer,
        })
      }
    })
  }

  const processingTime = (Date.now() - startTime) / 1000

  return {
    totalItems: invoiceData.length,
    discrepanciesFound: discrepancies.length,
    validItems: invoiceData.length - discrepancies.length,
    discrepancies,
    patientName: "Sample Patient", // This could be extracted from invoice data
    processingTime,
    priceDiscrepancies,
    formulationIssues,
    strengthErrors,
    payerMismatches,
    totalOvercharge,
    apiError, // Include API error information
  }
}
