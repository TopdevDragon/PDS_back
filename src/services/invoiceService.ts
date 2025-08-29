import * as XLSX from 'xlsx'
import { 
  ReferenceDrug, 
  InvoiceDrug, 
  Discrepancy, 
  ValidationResult 
} from '../types'
import { 
  MOCKAPI_URL, 
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
    console.log("Fetching reference drugs from:", MOCKAPI_URL)
    const response = await fetch(MOCKAPI_URL)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reference data: ${response.status}`)
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
    // Return mock data as fallback
    return getMockReferenceDrugs()
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

    // Parse the data (assuming first row is headers)
    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1) as any[][]

    // Find column indices
    const drugNameIndex = findColumnIndex(headers, EXCEL_COLUMNS.DRUG_NAME)
    const unitPriceIndex = findColumnIndex(headers, EXCEL_COLUMNS.UNIT_PRICE)
    const formulationIndex = findColumnIndex(headers, EXCEL_COLUMNS.FORMULATION)
    const strengthIndex = findColumnIndex(headers, EXCEL_COLUMNS.STRENGTH)
    const payerIndex = findColumnIndex(headers, EXCEL_COLUMNS.PAYER)

    console.log("Column mapping:")
    console.log("  Headers:", headers)
    console.log("  Drug Name Index:", drugNameIndex, "->", headers[drugNameIndex])
    console.log("  Unit Price Index:", unitPriceIndex, "->", headers[unitPriceIndex])
    console.log("  Formulation Index:", formulationIndex, "->", headers[formulationIndex])
    console.log("  Strength Index:", strengthIndex, "->", headers[strengthIndex])
    console.log("  Payer Index:", payerIndex, "->", headers[payerIndex])

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

        return {
          drugName,
          unitPrice,
          formulation,
          strength,
          payer,
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
  const referenceDrugs = await fetchReferenceDrugs()
  const invoiceData = parseExcelData(buffer)
  const discrepancies: Discrepancy[] = []

  let priceDiscrepancies = 0
  let formulationIssues = 0
  let strengthErrors = 0
  let payerMismatches = 0
  let totalOvercharge = 0

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
    console.log(`  Difference: $${priceDifference.toFixed(2)} (${pricePercentage.toFixed(2)}%)`)
    console.log(`  Threshold: ${PRICE_THRESHOLD}% | Exceeds: ${pricePercentage > PRICE_THRESHOLD}`)
    
    // Always accumulate total overcharge (even for small differences)
    if (priceDifference > 0) {
      totalOvercharge += priceDifference
      console.log(`  Added to total overcharge: $${priceDifference.toFixed(2)}`)
    }
    
    // Only count as discrepancy if it exceeds threshold
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
  }
}

function getMockReferenceDrugs(): ReferenceDrug[] {
  return [
    {
      id: "1",
      drugName: "Amoxicillin",
      unitPrice: 0.45,
      formulation: "Capsule",
      strength: "500mg",
      payer: "Medicare",
    },
    {
      id: "2",
      drugName: "Insulin Glargine",
      unitPrice: 105.00,
      formulation: "Solution",
      strength: "100 units/ml",
      payer: "Medicare",
    },
    {
      id: "3",
      drugName: "Metformin",
      unitPrice: 0.15,
      formulation: "Tablet",
      strength: "500mg",
      payer: "Medicare",
    },
    {
      id: "4",
      drugName: "Omeprazole",
      unitPrice: 0.30,
      formulation: "Capsule",
      strength: "20mg",
      payer: "Medicare",
    },
    {
      id: "5",
      drugName: "Erythropoietin",
      unitPrice: 45.00,
      formulation: "Solution (vial)",
      strength: "2000 units",
      payer: "Medicare",
    },
    {
      id: "6",
      drugName: "Loratadine",
      unitPrice: 0.15,
      formulation: "Tablet",
      strength: "10 mg",
      payer: "Medicare",
    },
    {
      id: "7",
      drugName: "Lisinopril",
      unitPrice: 0.25,
      formulation: "Tablet",
      strength: "10mg",
      payer: "Medicaid",
    },
  ]
}
