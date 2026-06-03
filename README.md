# WarpFix Intelligence Cloud

**Autonomous CI repair agent SaaS** — detects CI failures, generates safe patches, validates them in sandboxes, and opens pull requests automatically.

Terminal-first. Warp-native. CodeRabbit intelligence meets Cursor context-awareness.

## Quick Start

```bash
# From your Warp terminal:
/fix-ci
```

WarpFix will:
1. Detect the latest CI failure
2. Parse logs and classify the error
3. Check the fingerprint database for known fixes
4. Generate a safe patch via LLM
5. Validate the patch in an isolated sandbox
6. Compute a confidence score (0-100)
7. Open a PR automatically

## Architecture

```
Warp Terminal / GitHub Webhook
        ↓
    Express API Server
        ↓
    BullMQ Job Queue
        ↓
    Multi-Agent Pipeline
    ├── Log Parser Agent
    ├── Classifier Agent
    ├── Fingerprint Engine
    ├── Patch Generator Agent (Groq Llama, GitHub Models fallback)
    ├── Sandbox Validator Agent
    ├── Confidence Engine
    └── Pull Request Agent
        ↓
    PostgreSQL + Redis
        ↓
    Next.js Dashboard
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Frontend | Next.js 16 (App Router) |
| Queue | BullMQ |
| Cache | Redis |
| Database | PostgreSQL |
| LLM | Groq (Llama 3.3) with GitHub Models fallback |
| Auth | GitHub OAuth |
| Billing | Dodo Payments |
| Hosting | Render |
| Terminal | Warp Extension |

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- GitHub App credentials
- Groq API key (GitHub Models token optional, used as fallback)

### 1. Clone & Install

```bash
git clone https://github.com/bytepassperks/warpfix-intelligence-cloud.git
cd warpfix-intelligence-cloud

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 3. GitHub App Setup

1. Go to GitHub Settings → Developer settings → GitHub Apps → New GitHub App
2. Set permissions:
   - Repository: Metadata (read), Contents (write), Pull requests (write), Actions (read), Checks (read)
3. Subscribe to events: `workflow_run`, `installation`, `push`, `pull_request`
4. Set webhook URL: `https://your-domain.com/webhooks/github`
5. Generate a private key and download it
6. Copy App ID, Client ID, Client Secret, and Webhook Secret to `.env`

### 4. LLM Provider Setup

1. Go to [console.groq.com](https://console.groq.com) and create an API key
2. Set `GROQ_API_KEY` in `.env` (defaults: `GROQ_MODEL=llama-3.3-70b-versatile`)
3. Optional fallback: set `GITHUB_MODELS_TOKEN` (a GitHub token) so repairs keep working if Groq's daily cap is hit. The chain is controlled by `LLM_PROVIDER` (default `groq,github`).

### 5. Dodo Payments Setup

1. Go to [dodopayments.com](https://dodopayments.com)
2. Create products for Pro and Team plans
3. Set `DODO_API_KEY` and `DODO_WEBHOOK_SECRET` in `.env`

### 6. Run Database Migration

```bash
cd backend && node src/models/migrate.js
```

### 7. Start Development

```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Queue Worker
cd backend && npm run worker

# Terminal 3: Frontend
cd frontend && npm run dev
```

### 8. Warp Extension

Copy the YAML files from `warp-extension/` to your Warp workflows directory.

Set environment variables:
```bash
export WARPFIX_API_KEY="your-github-access-token"
export WARPFIX_API_URL="http://localhost:4000"
```

## Deploy to Render

1. Fork this repository
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render will read `render.yaml` and create all services
5. Set the environment variables in each service's settings

## Warp Commands

| Command | Description |
|---------|------------|
| `/fix-ci` | Fix the latest CI failure |
| `/fix-tests` | Fix failing tests |
| `/fix-deps` | Fix dependency issues |
| `/fix-runtime` | Fix runtime errors |
| `/repair-last` | View the last repair |
| `/predict-failure` | Predict potential failures |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/github` | GitHub webhook receiver |
| POST | `/warp/command` | Warp CLI command handler |
| GET | `/warp/status/:jobId` | Job status check |
| GET | `/api/repairs` | List repairs |
| GET | `/api/repairs/:id` | Get repair details |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/stability` | CI stability data |
| GET | `/api/dashboard/telemetry` | Telemetry metrics |
| GET | `/api/billing/plans` | Available plans |
| GET | `/api/billing/subscription` | Current subscription |
| POST | `/api/billing/checkout` | Create checkout session |
| GET | `/auth/github` | GitHub OAuth login |
| GET | `/auth/me` | Current user |
| GET | `/health` | Health check |

## Intelligence Modules

### Failure Fingerprint Engine
Normalizes error patterns into unique hashes. Proven fixes are instantly reused when the same fingerprint appears.

### Confidence Engine
Scores each repair 0-100 based on:
- Sandbox validation result (+50)
- Fingerprint reuse (+25)
- Patch size (+5-10)
- Classification confidence (+5-10)
- Severity adjustment (-10 to +5)

### Dependency Radar
Monitors npm registry for breaking releases, deprecated versions, and peer dependency conflicts.

### Patch Safety Rules
Rejects patches that:
- Exceed 200 changed lines
- Modify lockfiles
- Touch secrets or .env files
- Contain destructive commands

## License

MIT
