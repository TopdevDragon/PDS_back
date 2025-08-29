import { Router } from 'express'
import { ApiResponse } from '../types'

const router = Router()

router.get('/', (req, res) => {
  const response: ApiResponse<{ status: string; timestamp: string; uptime: number }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    message: 'PDS Backend is running'
  }
  
  res.json(response)
})

router.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() })
})

export { router as healthRoutes }
