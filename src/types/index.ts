export interface ReferenceDrug {
    id: string
    drugName: string
    unitPrice: number
    formulation: string
    strength: string
    payer: string
}

export interface InvoiceDrug {
    drugName: string
    unitPrice: number
    formulation: string
    strength: string
    payer: string
    qty: number
}

export interface Discrepancy {
    id: string
    drugName: string
    type: "unit_price" | "formulation" | "strength" | "payer"
    severity: "low" | "medium" | "high"
    description: string
    invoiceValue: string
    referenceValue: string
    overchargePercentage?: number
    overchargeAmount?: string
}

export interface ValidationResult {
    totalItems: number
    discrepanciesFound: number
    validItems: number
    discrepancies: Discrepancy[]
    patientName: string
    processingTime: number
    priceDiscrepancies: number
    formulationIssues: number
    strengthErrors: number
    payerMismatches: number
    totalOvercharge: number
    apiError?: string | null
}

export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    message?: string
}
