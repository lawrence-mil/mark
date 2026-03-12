# GCSE/A-Level Past Paper Grading App - Design Specification

## Overview
A monolithic Bun application for automated grading of GCSE and A-Level past papers using OCR and AI. Users upload past papers and mark schemes, receive AI-generated scores and feedback, and can share results via unique URLs without login.

## Architecture

### Technology Stack
- **Runtime:** Bun (v1.0+)
- **Backend Framework:** Elysia (Bun-native HTTP server)
- **Frontend:** React 18 + TypeScript + Vite
- **UI Components:** DaisyUI + Headless UI
- **Database:** PostgreSQL (Neon.tech)
- **Cache:** Redis (Upstash)
- **File Storage:** Cloudflare R2
- **OCR:** Mistral API (mistral-ocr-latest)
- **AI Grading:** OpenRouter (DeepSeek-v3.2-exp + Kimi K2.5)

### Project Structure
```
past-paper-grader/
├── src/
│   ├── server/
│   │   ├── api/          # Elysia route handlers
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── services/     # Business logic (OCR, AI, storage)
│   │   └── index.ts      # Server entry point
│   ├── client/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Frontend utilities
│   │   └── index.tsx     # React entry point
│   ├── shared/
│   │   ├── types/        # TypeScript interfaces
│   │   └── constants/    # Shared constants
│   └── lib/
│       ├── database/     # PostgreSQL client
│       ├── cache/        # Redis client
│       ├── storage/      # R2/S3 client
│       ├── ocr/          # Mistral API integration
│       └── ai/           # OpenRouter integration
├── public/               # Static assets
├── package.json          # Bun workspace configuration
└── bun.lockb
```

## Database Schema

### Submissions Table
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- File references
  paper_file_url TEXT NOT NULL,
  paper_text TEXT,
  markscheme_file_url TEXT,
  markscheme_text TEXT,

  -- Processing status
  status VARCHAR(20) DEFAULT 'uploaded' CHECK (
    status IN ('uploaded', 'processing', 'completed', 'failed')
  ),

  -- Results
  total_score INTEGER,
  max_possible_score INTEGER,
  ai_feedback JSONB,

  -- Metadata (extracted by AI)
  subject VARCHAR(100),
  exam_board VARCHAR(100),
  paper_date DATE
);
```

### Question Results Table (Optional Detail)
```sql
CREATE TABLE question_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  question_number INTEGER,
  question_text TEXT,
  student_answer TEXT,
  markscheme_answer TEXT,
  score INTEGER,
  max_score INTEGER,
  feedback TEXT,
  improvement_suggestions TEXT
);
```

### Redis Cache Structure
- `submission:{uuid}` → JSON serialized submission with results
- `ocr:{file_hash}` → Extracted text (prevents reprocessing)
- `ai:{submission_id}` → AI grading results (24h TTL)

## API Endpoints

### Submission Management
- `POST /api/submit/paper` - Upload past paper
  - Content-Type: multipart/form-data
  - Returns: `{ submissionId: UUID, status: 'uploaded' }`

- `POST /api/submit/markscheme` - Upload mark scheme
  - Body: `{ submissionId: UUID }` + multipart file
  - Returns: `{ success: boolean }`

- `POST /api/process/{submissionId}` - Trigger OCR + AI processing
  - Returns: `{ processing: true }`

### Results Retrieval
- `GET /api/results/{submissionId}` - Get grading results
  - Returns: Submission with scores, feedback, questions

### System Health
- `GET /api/health` - Service status check
  - Returns: `{ status: 'ok', services: { db, redis, ocr, ai } }`

## Frontend Design

### Theme & Styling
- **Aesthetic:** Modern terminal with clean dark/light modes
- **Dark Theme:**
  - Background: `#1a1a1a`
  - Text: `#00ff00` (green)
  - Accents: `#ffb000` (amber)
- **Light Theme:**
  - Background: `#f5f5f5`
  - Text: `#000000` (black)
  - Accents: `#0066cc` (blue)
- **Typography:** Monospace font (JetBrains Mono/Fira Code)
- **Components:** DaisyUI base + Headless UI for complex interactions

### Component Hierarchy
1. **TerminalLayout** - Root layout with theme toggle
2. **UploadWizard** - Two-step upload flow
   - Step 1: PaperUpload (drag-and-drop)
   - Step 2: MarkschemeUpload
3. **ProcessingStatus** - Real-time progress with terminal animations
4. **ResultsDisplay** - Score breakdown with expandable questions
5. **ErrorBoundary** - Graceful error handling

### User Flow
1. Landing page with upload instructions
2. Step 1: Upload past paper (PDF/image/text)
3. Step 2: Upload corresponding mark scheme
4. Processing screen with live status
5. Results page with scores and feedback
6. Shareable URL: `/{submissionId}`

## Service Integrations

### PostgreSQL (Neon.tech)
```typescript
const db = new Pool({
  connectionString: "postgresql://neondb_owner:npg_QlC4O7jPaKVZ@ep-dark-sky-abnveflx-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});
```

### Redis (Upstash)
```typescript
const redis = new Redis({
  url: "rediss://default:gQAAAAAAAQyUAAIncDIxYmFhZmRjNTQ4MTM0NmNhYTVhYjg3ZDM3YjFhZmJkOHAyNjg3NTY@winning-redbird-68756.upstash.io:6379"
});
```

### Cloudflare R2
```typescript
const s3 = new S3Client({
  endpoint: "https://c3c985ac8a0f141a39b4d518ce9e1559.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "3d5098be335f63f63e00a9dd13587f1f",
    secretAccessKey: "f15e146652ef8c19e6fd2fb83e0f538bc8229055e4c4bfbafe70c6ff1e85b15b"
  },
  region: "auto"
});
```

### Mistral OCR
```typescript
const mistral = new Mistral({
  apiKey: "mlnVzfr7ZoZdhrSX2CpIlfDga8KUIqbL"
});
// Model: "mistral-ocr-latest"
```

### OpenRouter AI
- **Primary:** DeepSeek-v3.2-exp ($0.34/1M tokens)
- **Detailed:** Kimi K2.5 ($1.32/1M tokens)
- **Prompt Template:**
```json
{
  "role": "system",
  "content": "You are a teacher grading a student answer..."
}
```

## Processing Pipeline

### Step 1: File Upload
1. Receive multipart file upload
2. Generate unique filename: `{uuid}_{timestamp}_{original_name}`
3. Upload to Cloudflare R2 bucket
4. Generate presigned URL for external access
5. Store file URL in database

### Step 2: OCR Processing
1. Check Redis cache for file hash
2. If not cached, call Mistral OCR API with file URL
3. Parse OCR response into structured text
4. Cache result in Redis (24h TTL)
5. Store extracted text in database

### Step 3: AI Grading
1. Wait for both paper and markscheme text
2. Construct AI prompt with structured data:
   - Question text
   - Student answer (from paper)
   - Mark scheme answer
   - Scoring rubric
3. Call OpenRouter with DeepSeek/Kimi model
4. Parse JSON response:
   ```json
   {
     "score": X,
     "feedback": "...",
     "improvement": "...",
     "subject": "...",
     "examBoard": "..."
   }
   ```
5. Store results in database and Redis cache

### Step 4: Results Delivery
1. Update submission status to 'completed'
2. Return structured results to frontend
3. Frontend displays scores with terminal styling

## Error Handling

### Client Errors (4xx)
- `400` - Invalid file type or size
- `404` - Submission not found
- `422` - OCR/AI processing failed

### Server Errors (5xx)
- `500` - Internal server error
- `502` - External service failure (OCR/AI)
- `503` - Database/Redis unavailable

### Graceful Degradation
1. If OCR fails, fall back to text extraction from PDF
2. If AI fails, return partial results with error message
3. If Redis unavailable, bypass cache
4. If file upload fails, provide retry option

## Security Considerations

### File Upload Safety
- Validate file types (PDF, PNG, JPG, TXT)
- Scan for viruses/malware (optional)
- Limit file size (e.g., 50MB)
- Sanitize filenames

### Data Protection
- UUIDs instead of sequential IDs
- No PII storage
- File URLs expire after 7 days
- Redis cache TTL: 24 hours

### Rate Limiting
- Per-IP rate limits on upload endpoints
- Maximum concurrent processing jobs
- Queue system for high load

## Deployment

### Development
```bash
bun install
bun run dev  # Starts both server and client
```

### Production
```bash
bun run build  # Build client assets
bun run start  # Start production server
```

### Environment Variables
```env
DATABASE_URL="postgresql://..."
REDIS_URL="rediss://..."
R2_ENDPOINT="https://..."
R2_ACCESS_KEY="..."
R2_SECRET_KEY="..."
MISTRAL_API_KEY="..."
OPENROUTER_API_KEY="..."
NODE_ENV="production"
PORT="3000"
```

## Cost Estimates

### AI Processing (per submission)
- **Tokens:** ~15,000 tokens
- **DeepSeek-v3.2-exp:** $0.005 per submission
- **Kimi K2.5:** $0.02 per submission
- **Monthly (100 submissions/day):**
  - DeepSeek: ~$15/month
  - Kimi (20% usage): ~$12/month
  - **Total:** ~$27/month

### Storage & Infrastructure
- **Cloudflare R2:** $0.015/GB-month
- **PostgreSQL (Neon.tech):** Free tier (3GB)
- **Redis (Upstash):** Free tier (10K commands/day)
- **Total Infrastructure:** < $5/month

## Success Criteria

### Functional Requirements
1. ✅ Two-step upload (paper → markscheme)
2. ✅ OCR extraction from PDF/images
3. ✅ AI grading with detailed feedback
4. ✅ Shareable results via UUID
5. ✅ Modern terminal UI with dark/light themes

### Performance Requirements
1. File upload < 30 seconds (50MB)
2. OCR processing < 60 seconds
3. AI grading < 30 seconds
4. Page load < 2 seconds
5. 99% uptime for core services

### User Experience
1. No login required
2. Clear upload progress
3. Informative error messages
4. Mobile-responsive design
5. Accessible to screen readers

## Next Steps

1. **Implementation Plan** - Create detailed task breakdown
2. **Backend First** - Start with Bun server + database
3. **Service Integration** - Connect OCR, AI, storage
4. **Frontend Development** - Build React UI
5. **Testing & Deployment** - End-to-end testing, production deployment

---
*Design approved: 2026-03-11*
*Spec version: 1.0*