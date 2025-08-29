export const MOCKAPI_URL = "https://685daed17b57aebd2af6da54.mockapi.io/api/v1/drugs"

export const PRICE_THRESHOLD = 5 // 5% overcharge threshold (more sensitive for pharmacy pricing)

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
    DRUG_NAME: ['drug', 'name', 'drug name'],
    UNIT_PRICE: ['price', 'cost', 'unit price'],
    FORMULATION: ['formulation', 'form'],
    STRENGTH: ['strength', 'dose'],
    PAYER: ['payer', 'insurance']
} as const
