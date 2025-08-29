import { Router } from 'express'
import multer from 'multer'
import { validateInvoice } from '../services/invoiceService'
import { ApiResponse } from '../types'

const router = Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files are allowed'))
    }
  }
})

// POST /api/invoice/validate
router.post('/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'No file uploaded'
      }
      return res.status(400).json(response)
    }

    const validationResult = await validateInvoice(req.file.buffer)
    
    const response: ApiResponse<typeof validationResult> = {
      success: true,
      data: validationResult,
      message: 'Invoice validated successfully'
    }
    
    return res.json(response)
  } catch (error) {
    return next(error)
  }
})

// GET /api/invoice/sample
router.get('/sample', (req, res) => {
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Sample endpoint for invoice operations' },
    message: 'Sample endpoint working'
  }
  
  res.json(response)
})

export { router as invoiceRoutes }
