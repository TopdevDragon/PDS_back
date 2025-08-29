export const MOCKAPI_URL = "https://685daed17b57aebd2af6da54.mockapi.io/api/v1/drugs"

export const PRICE_THRESHOLD = 10 // 10% overcharge threshold

export const SEVERITY_LEVELS = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high"
} as const

export const DISCREPANCY_TYPES = {
    UNIT_PRICE: "unit_price",
    FORMULATION: "formulation",
    STRENGTH: "strength",
    PAYER: "payer"
} as const

export const EXCEL_COLUMNS = {
    DRUG_NAME: ['drugname', 'drug name', 'drug'],
    UNIT_PRICE: ['unit price', 'unitprice', 'price', 'cost'],
    FORMULATION: ['formulation', 'form'],
    STRENGTH: ['strength', 'dose'],
    PAYER: ['payer', 'insurance'],
    QTY: ['qty', 'quantity', 'qty.'] // Optional field
} as const
