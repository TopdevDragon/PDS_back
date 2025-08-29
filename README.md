# PDS Backend - Express.js API Server

A standalone Express.js backend server for the Pharmacy Data Solutions (PDS) application, providing invoice validation APIs.

## 🚀 Features

- **Excel File Processing**: Parse and validate pharmacy invoice Excel files
- **Invoice Validation**: Compare invoice data against reference pricing
- **Discrepancy Detection**: Identify price, formulation, strength, and payer mismatches
- **RESTful API**: Clean, documented API endpoints
- **TypeScript**: Full type safety and modern development experience
- **Security**: Helmet middleware and CORS configuration

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **File Processing**: XLSX library
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **File Upload**: Multer

## 📁 Project Structure

```
pds_backend/
├── src/
│   ├── types/              # TypeScript interfaces
│   ├── constants/          # Application constants
│   ├── utils/              # Utility functions
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   └── server.ts           # Main server file
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── env.example             # Environment variables template
├── Dockerfile              # Container configuration
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd pds_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The server will run on http://localhost:3001

### Available Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build for production
npm run start      # Start production server
npm run clean      # Clean build artifacts
npm run lint       # Lint TypeScript files
```

## 🔧 API Endpoints

### Health Check
- `GET /api/health` - Server health status
- `GET /api/health/ping` - Simple ping endpoint

### Invoice Validation
- `POST /api/invoice/validate` - Process Excel invoice files
- `GET /api/invoice/sample` - Sample endpoint

### Request Format
```typescript
// File upload
POST /api/invoice/validate
Content-Type: multipart/form-data
Body: { file: ExcelFile }
```

### Response Format
```typescript
{
  "success": true,
  "data": {
    "totalItems": 7,
    "discrepanciesFound": 8,
    "validItems": 0,
    "discrepancies": [...],
    "patientName": "Sample Patient",
    "processingTime": 1.2,
    "priceDiscrepancies": 4,
    "formulationIssues": 1,
    "strengthErrors": 1,
    "payerMismatches": 2
  },
  "message": "Invoice validated successfully"
}
```

## 🎯 Invoice Validation Logic

### Discrepancy Types
1. **Unit Price Discrepancies** (10% overcharge threshold)
2. **Formulation Discrepancies** (exact match required)
3. **Strength Discrepancies** (exact match required)
4. **Payer Discrepancies** (exact match required)

### Excel File Format
The system expects Excel files with these columns:
- **Drug Name**: Name of the medication
- **Unit Price**: Price per unit (in dollars)
- **Formulation**: Form of medication (e.g., Tablet, Capsule)
- **Strength**: Strength/concentration
- **Payer**: Insurance provider

## 🔧 Configuration

### Environment Variables

```bash
# Backend Configuration
PORT=3001
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# External API Configuration
MOCKAPI_URL=https://685daed17b57aebd2af6da54.mockapi.io/api/v1/drugs

# Security
HELMET_ENABLED=true
CORS_ENABLED=true
```

## 🐳 Docker

### Build and Run
```bash
# Build the image
docker build -t pds-backend .

# Run the container
docker run -p 3001:3001 pds-backend
```

### Docker Compose
```bash
# Start with docker-compose
docker-compose up
```

## 🧪 Testing

### Manual Testing
1. Start the server: `npm run dev`
2. Test health endpoint: `GET http://localhost:3001/api/health`
3. Test invoice validation with sample Excel file

### API Testing
Use tools like Postman or curl to test the endpoints:
```bash
# Health check
curl http://localhost:3001/api/health

# Ping
curl http://localhost:3001/api/health/ping
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production environment variables
3. Set appropriate CORS origins
4. Configure logging and monitoring

## 🔮 Future Enhancements

- **Database Integration**: PostgreSQL/MongoDB for data persistence
- **Authentication**: JWT-based user management
- **Rate Limiting**: API request throttling
- **Caching**: Redis for performance optimization
- **Logging**: Structured logging with Winston
- **Testing**: Jest test suite
- **API Documentation**: OpenAPI/Swagger specs

## 📝 License

This project is created for the PDS Coding Challenge.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For questions or issues, please refer to the project documentation or create an issue in the repository.
