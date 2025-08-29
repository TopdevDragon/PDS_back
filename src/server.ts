import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { invoiceRoutes } from './routes/invoice'
import { healthRoutes } from './routes/health'
import path from 'path'

// Load environment variables from the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Debug: Log environment variables
console.log('🔧 Environment Variables:')
console.log('  PORT:', process.env.PORT)
console.log('  NODE_ENV:', process.env.NODE_ENV)
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL)
console.log('  MOCKAPI_URL:', process.env.MOCKAPI_URL)

const app = express()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes
app.use('/api/health', healthRoutes)
app.use('/api/invoice', invoiceRoutes)

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  })
})

// Start server
const PORT = process.env.PORT || 3001

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
    console.log(`📋 Invoice validation: http://localhost:${PORT}/api/invoice/validate`)
  })
}

export default app
