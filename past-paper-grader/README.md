# Past Paper Grader

GCSE/A-Level past paper grading application using OCR and AI.

## Development

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

## API Endpoints

- `POST /api/submit/paper` - Upload past paper
- `POST /api/submit/markscheme` - Upload mark scheme
- `POST /api/process/:submissionId` - Trigger processing
- `GET /api/results/:submissionId` - Get results
- `GET /api/health` - Health check

## Project Structure

```
past-paper-grader/
├── src/
│   ├── server/         # Elysia API routes
│   ├── client/         # React frontend (to be added)
│   ├── lib/
│   │   ├── database/   # PostgreSQL/Drizzle
│   │   ├── cache/      # Redis client
│   │   ├── storage/    # R2/S3 storage
│   │   ├── ocr/        # Mistral OCR
│   │   └── ai/         # OpenRouter AI grading
│   └── shared/         # Shared types/constants
├── drizzle/            # Database migrations
└── package.json
```
