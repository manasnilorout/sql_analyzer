# SQL Analyzer Pro

An AI-powered SQL analysis tool that provides comprehensive insights, explanations, and visualizations for SQL Server code. The application uses Google AI (Genkit) to analyze SQL scripts and provides educational breakdowns suitable for developers of all skill levels.

## 🏗️ Architecture

This project uses a **separated architecture** with distinct frontend and backend services:

```
sql-analyzer-pro/
├── frontend/           # Next.js React frontend
├── server/            # Express.js AI analysis server  
├── shared/            # Shared types and constants
├── README.md          # This file
└── package.json       # Root workspace configuration
```

### Frontend (Next.js)
- **Port**: 3000
- **Technology**: Next.js 15, React 18, Tailwind CSS, TypeScript
- **Purpose**: User interface for SQL input, analysis visualization, and report generation
- **Key Features**: 
  - Responsive design with collapsible sidebar
  - Multiple analysis views (Summary, Deep Dive, Tables, Visual Flow)
  - File upload support (.sql, .txt)
  - HTML report generation and download

### Backend (Express.js AI Server)
- **Port**: 3001  
- **Technology**: Express.js, TypeScript, Google AI (Genkit), Winston logging
- **Purpose**: AI-powered SQL analysis processing
- **Key Features**:
  - RESTful API endpoints
  - Parallel AI processing for multiple SQL chunks
  - Comprehensive error handling and logging
  - Rate limiting and security middleware

### Shared
- **Purpose**: Type definitions and constants shared between frontend and server
- **Contents**: Analysis interfaces, API request/response types, application constants

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Google AI API key (for Genkit)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sql-analyzer-pro
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   **Server environment** (`server/.env`):
   ```bash
   # Copy the example file
   cp server/env.example server/.env
   
   # Edit with your configuration
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   GOOGLE_GENAI_API_KEY=your_google_ai_api_key_here
   ```

   **Frontend environment** (`frontend/.env.local`):
   ```bash
   # Copy the example file  
   cp frontend/env.example frontend/.env.local
   
   # Edit with your configuration
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This runs both frontend (localhost:3000) and server (localhost:3001) concurrently.

## 🛠️ Development

### Available Scripts

**Root level commands:**
- `npm run dev` - Start both frontend and server in development mode
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:server` - Start only the AI server
- `npm run dev:genkit` - Start Genkit development server for AI flow testing
- `npm run build` - Build both frontend and server for production
- `npm run start` - Start both services in production mode
- `npm run typecheck` - Run TypeScript checking on both projects
- `npm run clean` - Clean all node_modules and build artifacts

**Individual service commands:**
```bash
# Frontend
cd frontend
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server

# Server  
cd server
npm run dev        # Development server with hot reload
npm run build      # Compile TypeScript to JavaScript
npm run start      # Production server
npm run genkit:dev # Genkit development server
```

### Development Workflow

1. **Frontend Development**: 
   - Edit files in `frontend/src/`
   - Components are in `frontend/src/components/`
   - Pages are in `frontend/src/app/`

2. **Server Development**:
   - Edit files in `server/src/`
   - API routes are in `server/src/routes/`
   - AI flows are in `server/src/ai/flows/`
   - Services are in `server/src/services/`

3. **Shared Types**:
   - Edit shared types in `shared/types/`
   - Update constants in `shared/constants/`

## 📡 API Endpoints

The AI server exposes the following REST API endpoints:

### Analysis Endpoints
- `POST /api/analysis/sql` - Analyze SQL code
  ```typescript
  // Request
  {
    "sqlCode": "SELECT * FROM users WHERE active = 1",
    "blockType": "Single Statement"
  }
  
  // Response
  {
    "chunkAnalyses": [...],
    "overallScriptSummary": "...",
    "originalFullSqlCode": "..."
  }
  ```

- `POST /api/analysis/reports/generate` - Generate HTML reports
  ```typescript
  // Request
  {
    "analysisData": { /* FullAnalysisPayload */ },
    "reportType": "full" | "chunk"
  }
  
  // Response: HTML string
  ```

### Utility Endpoints
- `GET /api/health` - Health check and server status

## 🧠 AI Analysis Features

The application provides multiple types of AI-powered analysis:

### 1. **Code Summary**
- Main purpose and key operations
- Data flow analysis
- Core SQL concepts with examples
- Business logic insights
- Beginner-friendly learning tips

### 2. **Detailed Explanation**
- Step-by-step code breakdown
- Join analysis and relationships
- Filtering and business rules
- Transformation logic
- Dependencies and cross-references

### 3. **Table Analysis** 
- Identified tables and views
- Table roles (source, target, lookup)
- Column usage patterns
- Relationship mapping

### 4. **Visual Flow**
- Step-by-step logical flow representation
- Data transformation pipeline
- Interactive visual components

### 5. **Overall Script Analysis**
- Multi-chunk script summaries
- Cross-chunk dependencies
- Overall business logic

## 🔧 Configuration

### Server Configuration (`server/.env`)
```bash
# Server settings
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# CORS and security  
FRONTEND_URL=http://localhost:3000

# AI Configuration
GOOGLE_GENAI_API_KEY=your_api_key_here

# Optional production settings
# JWT_SECRET=your_jwt_secret
# CORS_ORIGIN=https://yourdomain.com
```

### Frontend Configuration (`frontend/.env.local`)
```bash
# API communication
NEXT_PUBLIC_API_URL=http://localhost:3001

# App settings
NEXT_PUBLIC_APP_NAME="SQL Analyzer Pro"
```

## 🏭 Production Deployment

### Building for Production
```bash
npm run build
```

### Server Deployment
The server can be deployed to any Node.js hosting platform:
- **Heroku**: Use the included `Procfile`
- **AWS/Google Cloud**: Deploy as a containerized application
- **VPS**: Use PM2 or similar process manager

### Frontend Deployment  
The frontend can be deployed to:
- **Vercel**: Zero-config deployment for Next.js
- **Netlify**: Static site deployment
- **AWS S3 + CloudFront**: Static hosting with CDN

### Environment Variables in Production
Ensure these environment variables are set in your production environment:
- `GOOGLE_GENAI_API_KEY` (server)
- `NEXT_PUBLIC_API_URL` (frontend)
- `FRONTEND_URL` (server, for CORS)

## 🧪 Testing

### Running Tests
```bash
# Server tests
cd server && npm test

# Frontend tests (when implemented)
cd frontend && npm test
```

### API Testing
Use the health endpoint to verify server connectivity:
```bash
curl http://localhost:3001/api/health
```

## 📊 Monitoring and Logging

The server includes comprehensive logging using Winston:
- **Error logs**: `server/logs/error.log`
- **Combined logs**: `server/logs/combined.log`
- **Console output**: Development mode only

Log levels: `error`, `warn`, `info`, `debug`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type checking (`npm run typecheck`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Server won't start:**
- Check if port 3001 is available
- Verify Google AI API key is set correctly
- Check server logs in `server/logs/`

**Frontend can't connect to server:**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS configuration in server
- Ensure both services are running

**AI analysis fails:**
- Verify Google AI API key is valid and has quota
- Check server logs for detailed error messages
- Ensure SQL input is properly formatted

**Build failures:**
- Run `npm run clean` and reinstall dependencies
- Check TypeScript errors with `npm run typecheck`
- Verify all environment variables are set

### Getting Help

1. Check the server logs for detailed error messages
2. Use the health endpoint to verify server status
3. Check browser console for frontend errors
4. Verify all environment variables are properly configured

---

**Built with ❤️ using Next.js, Express.js, and Google AI**
