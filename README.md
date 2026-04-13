# 🎯 PredictEngine — AI Sports Prediction Platform

A full-stack sports prediction engine powered by **ensemble models** (ELO, Form, Odds Implied, XGBoost ML), **goals predictions** (Over/Under 2.5, BTTS), and real-time league-average data. Supports 80+ sports with automated pipelines, live scores, and a performance tracking dashboard.

![Frontend](https://img.shields.io/badge/Frontend-Angular%2020-red?logo=angular)
![Backend](https://img.shields.io/badge/Backend-NestJS%2011-red?logo=nestjs)
![DB](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)
![ML](https://img.shields.io/badge/ML-XGBoost-orange)

---

## 📋 Table of Contents

- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Dashboard Pages](#-dashboard-pages)
- [API Endpoints](#-api-endpoints)
- [Prediction Models](#-prediction-models)
- [Goals Predictions](#-goals-predictions)
- [Performance Tracking](#-performance-tracking)
- [Pipeline Automation](#-pipeline-automation)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [API Quota Management](#-api-quota-management)
- [ML Roadmap](#-ml-roadmap)

---

## 🧠 How It Works

PredictEngine follows a **6-step pipeline** that runs automatically or on-demand:

```
┌─────────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐
│ 1. SYNC  │→ │ 2. FETCH│→ │ 3.PREDICT│→ │ 4. TRACK  │→ │ 5.UPDATE │→ │ 6. GRADE │
│ Sports   │  │ Games   │  │ Outcomes │  │ Live      │  │ Results  │  │ Accuracy │
│          │  │         │  │ + Goals  │  │ Scores    │  │ + ELO    │  │          │
└─────────┘  └─────────┘  └──────────┘  └───────────┘  └──────────┘  └──────────┘
```

### Step 1: Discover Sports
Queries The Odds API for all available sports/leagues. **Free** — no quota cost.

### Step 2: Fetch Upcoming Games
For each active sport, pulls upcoming fixtures with team names and kickoff times.

### Step 3: Generate Predictions
For each game, **4 models** independently predict:
- **Match Outcome** → Home Win / Draw / Away Win
- **Goals** → Over/Under 2.5 with expected goals
- **BTTS** → Both Teams To Score (Yes/No)

### Step 4: Live Score Tracking
Polls for live scores during active matches. Users can watch predictions resolve in real-time.

### Step 5: Update Results
After games finish, fetches final scores and updates ELO ratings.

### Step 6: Grade Accuracy
Compares predictions against actual outcomes. Tracks accuracy by model, sport, confidence level, and time window.

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20+ | `nvm use 20` |
| **Python**  | 3.9+  | For XGBoost ML pipeline |
| **PostgreSQL** | 14+ | Local or Docker |
| **API Key** | — | [The Odds API](https://the-odds-api.com) (free, 500 req/month) |

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Shoezmann/sports-prediction-engine.git
cd sports-prediction-engine
npm install
pip3 install xgboost pandas sklearn numpy  # ML dependencies

# 2. Configure environment
cp .env.example .env
# Edit .env → add ODDS_API_KEY and DATABASE_URL

# 3. Start services
# Terminal 1 — Backend (port 3000)
bash start-backend.sh

# Terminal 2 — Frontend (port 4200)
node serve-frontend.js

# 4. Open http://localhost:4200
```

---

## 🖥️ Dashboard Pages

### Predictions Page
Browse all pending predictions with filters by sport, region, and league.

| Column | Description |
|--------|-------------|
| **Time** | Relative time (SOON, TOMORROW, HH:MM, day name) |
| **Date** | Full date in local timezone |
| **Match** | Home vs Away teams |
| **Outcome** | Probabilities (H%, D%, A%) + Goals (O/U %) + BTTS (Y/N) |
| **Confidence** | HIGH / MEDIUM / LOW with % |
| **EV** | Expected Value (positive = value bet) |
| **Odds** | Best available decimal odds |

Click **+** to add predictions to your bet slip.

### Live Now
Real-time live scores from the scraper + SportAPI fallback. Shows matches currently in progress with scores and elapsed time.

### Performance (`/performance`)
Track how the prediction engine performs over time.

**Stats Dashboard (6 cards):**
| Card | Meaning |
|------|---------|
| **Total** | All-time predictions made (resolved + pending) |
| **Successful** | Resolved with outcome + goals + BTTS all correct |
| **Failed** | Resolved with wrong outcome prediction |
| **Outcome %** | Overall match result hit rate |
| **Goals O/U 2.5 %** | Over/Under 2.5 accuracy |
| **BTTS %** | Both Teams To Score accuracy |

**Tabs:**
| Tab | Shows |
|-----|-------|
| **Pending** | Upcoming predictions with goals/BTTS forecasts |
| **Successful** | Resolved picks where all predictions were correct |
| **Failed** | Resolved picks showing predicted vs actual outcome |

---

## 🔌 API Endpoints

Base URL: `http://localhost:3000/api/`

### Health
```
GET /health
→ { "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

### Sports
```
POST /sports/sync
→ { "total": 158, "active": 81, "new": 158 }
```

### Games
```
POST /games/sync?sport=soccer_epl
→ { "synced": 20, "sports": 1 }
```

### Predictions
```
POST /predictions/generate?sport=soccer_epl
→ { "generated": 20, "skipped": 0 }

GET /predictions/pending
→ [{ id, game, predictedOutcome, confidence, probabilities, goals, btts, ... }]

GET /predictions/resolved
→ [{ id, game, predictedOutcome, actualOutcome, isCorrect, goals, btts, ... }]

GET /predictions/stats
→ { resolved, resolvedCorrect, accuracy, last7Accuracy, last30Accuracy,
    streak, goalsAccuracy, bttsAccuracy, successful, failed }

GET /predictions/summary
→ { total, resolved, pending }
```

### Results
```
POST /results/update
→ { "updated": 5, "predictionsResolved": 5, "eloUpdated": 10 }

POST /results/backfill?days=30
→ Backfills N days of historical results
```

### Accuracy
```
GET /accuracy?sport=soccer_epl
→ {
    totalPredictions, correctPredictions, accuracy,
    brierScore,
    byConfidenceLevel: { high, medium, low },
    byModel: { elo, form, oddsImplied, ml, ensemble },
    bySport: { soccer_epl: { total, correct, accuracy }, ... },
    bySportGroup: { Soccer: { total, correct, accuracy }, ... },
    last7Days, last30Days
  }
```

### Live Scores
```
GET /live-scores
→ { matches: [{ sportKey, homeTeam, awayTeam, homeScore, awayScore, status, minute }, ...] }
```

### ML Training
```
POST /ml/train
→ { "message": "ML training triggered", "status": "ready" }

GET /ml/health
→ { "ready": true, "python": true, "models": ["outcome", "goals", "btts"] }
```

### Auth
```
POST /auth/register  { email, password, firstName? }
POST /auth/login     { email, password }
POST /auth/forgot-password  { email }
POST /auth/reset-password   { token, newPassword }
```

---

## 🤖 Prediction Models

### 1. ELO Rating Model (~25% weight)

| Property | Value |
|----------|-------|
| **Starting rating** | 1500 |
| **K-factor** | 32 |
| **Home advantage** | +65 ELO (soccer), sport-specific for others |
| **Draw handling** | Sport-specific draw rate × evenness factor |

Draw rates by sport:
| Sport | Draw Rate |
|-------|-----------|
| Soccer | 26% |
| Ice Hockey | 23% |
| American Football | 0.5% |
| Tennis, Basketball, MMA, Boxing | 0% |

### 2. Form Model (~25% weight)

- Uses ELO ratings + **home advantage multiplier** (Soccer: 1.12, Basketball: 1.06)
- Sigmoid curve for smooth probability conversion: `1 / (1 + e^(-ΔELO/400))`
- Falls back to ELO-only when no recent game data exists

### 3. Odds Implied Model (~30% weight)

- Fetches **real bookmaker odds** from The Odds API
- Averages across all available bookmakers
- **Removes overround** (bookmaker margin) to produce fair probabilities
- Uses fuzzy matching for team name reconciliation

### 4. XGBoost ML Model (~20% weight)

- Trained on historical match data via Python subprocess
- 3 tasks: outcome (1X2), goals (Over/Under 2.5), BTTS
- **Features**: rolling ELO, form windows (5/10/20), H2H, goal averages, streaks, market-implied probabilities
- **Fallback**: uses league-average data until enough historical data is collected (50+ games per league)

### Ensemble Predictor

Weights are dynamically recalculated per sport based on each model's historical accuracy (minimum floor of 5% per model). Default weights:

| Model | Default | Condition |
|-------|---------|-----------|
| ELO | 25% | All sports |
| Form | 25% | All sports |
| Odds Implied | 30% | When odds available |
| XGBoost ML | 20% | When trained model exists |

---

## 📊 Goals Predictions

The engine predicts goals markets for **all soccer leagues**:

### Over/Under 2.5 Goals
| League | Over 2.5 % | Avg Goals |
|--------|-----------|-----------|
| Bundesliga | 58% | 3.2 |
| Eredivisie | 57% | 3.1 |
| EPL | 52% | 2.8 |
| La Liga | 50% | 2.7 |
| Serie A | 49% | 2.7 |
| Ligue 1 | 48% | 2.6 |
| **PSL (South Africa)** | **40%** | **2.2** |
| Argentina | 42% | 2.3 |
| Brazil | 44% | 2.4 |

### BTTS (Both Teams To Score)
| League | BTTS Yes % |
|--------|-----------|
| Bundesliga | 56% |
| Eredivisie | 55% |
| EPL | 52% |
| **PSL (South Africa)** | **42%** |
| Argentina | 43% |

These are initially based on **league averages** until the ML model is trained on sufficient historical data.

---

## 📈 Performance Tracking

### What Gets Tracked
- **Outcome accuracy** — Was the predicted outcome (Home/Draw/Away) correct?
- **Goals accuracy** — Was the Over/Under 2.5 prediction correct?
- **BTTS accuracy** — Was the BTTS Yes/No prediction correct?
- **Brier Score** — Probability calibration quality (lower = better)
- **Streak** — Consecutive correct outcome predictions

### Time Windows
| Window | Purpose |
|--------|---------|
| All-time | Overall engine accuracy |
| Last 7 days | Recent performance trend |
| Last 30 days | Monthly window |

### Breakdowns Available
- By model (ELO, Form, Odds Implied, ML, Ensemble)
- By sport (per league key)
- By sport group (Soccer, Basketball, etc.)
- By confidence level (High ≥ 60%, Medium ≥ 50%, Low < 50%)

---

## ⏰ Pipeline Automation

Cron jobs run automatically when the backend is running:

| Schedule | Job | Description |
|----------|-----|-------------|
| **Daily 6:05 AM UTC** | Sync sports + games | Discover new sports, fetch upcoming fixtures |
| **Every 5 minutes** | Generate predictions | Create predictions for new games |
| **Every 4 hours** | Update results | Fetch scores, grade predictions, update ELO |
| **Weekly (Sunday)** | ML retraining | Retrain XGBoost models (if 50+ games available) |

All schedules respect API quota limits and skip sports with no active games.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Angular 20)                         │
│  Predictions │ Live │ Performance │ Bet Slip │ Auth               │
│  Port 4200 ← Proxy → :3000/api                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP
┌────────────────────────────┴─────────────────────────────────────┐
│                     BACKEND (NestJS 11)                           │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Controllers: Sports, Games, Predictions, Results,         │  │
│  │  Accuracy, Live Scores, ML, Auth, Bets, SSE Stream         │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │  Use Cases: SyncSports, SyncGames, GeneratePredictions,     │  │
│  │  UpdateResults, GetAccuracy, GetResolvedPredictions,       │  │
│  │  TrainModels, Login, Register, PlaceBet, GetUserBets       │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │  Domain: Entities (Sport, Team, Game, Prediction, Bet)     │  │
│  │  Services: EnsemblePredictor, EloCalculator,               │  │
│  │  GoalsPredictor, MLTrainingService                         │  │
│  │  Value Objects: Probability, Confidence, EloRating          │  │
│  │  Ports: SportsDataPort, PredictionModelPort,               │  │
│  │  GameRepositoryPort, PredictionRepositoryPort              │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│  ┌────────────────────────┴───────────────────────────────────┐  │
│  │  Infrastructure: The Odds API, SportAPI, ApiFootball,       │  │
│  │  Sportmonks, LiveScoresScraper, PostgreSQL (TypeORM),       │  │
│  │  SSE PredictionStream, EmailService, JwtAuth                │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │        PostgreSQL            │
              │  sports │ teams │ games      │
              │  predictions │ bets │ users   │
              └──────────────────────────────┘
```

---

## 📂 Project Structure

```
sports-prediction-engine/
├── apps/
│   ├── backend/                    # NestJS API server
│   │   └── src/
│   │       ├── api/controllers/     # REST + SSE endpoints
│   │       ├── application/         # Use cases + scheduler
│   │       │   └── use-cases/       # SyncSports, GeneratePredictions, etc.
│   │       ├── domain/              # Pure business logic
│   │       │   ├── entities/        # Sport, Team, Game, Prediction, Bet
│   │       │   ├── services/        # EnsemblePredictor, EloCalculator, GoalsPredictor
│   │       │   ├── value-objects/   # Probability, Confidence, EloRating
│   │       │   └── ports/output/    # Repository + adapter interfaces
│   │       └── infrastructure/      # External adapters
│   │           ├── adapters/        # The Odds API, SportAPI, ApiFootball, Sportmonks
│   │           │   └── prediction-models/  # ELO, Form, OddsImplied, ML adapters
│   │           ├── ml/              # train_models.py, predict.py
│   │           ├── live-scores/     # Scraper + service
│   │           ├── persistence/     # TypeORM entities + repositories
│   │           ├── sse/             # Server-Sent Events stream
│   │           └── scheduling/       # Cron jobs
│   └── frontend/                   # Angular application
│       └── src/app/
│           ├── components/          # LiveCard, Sidebar, BetSlip
│           ├── pages/              # Predictions, Live, Performance, Dashboard
│           ├── services/           # ApiService, AuthService, BetsService
│           └── interceptors/        # Auth interceptor
├── libs/
│   └── shared/types/               # Shared DTOs, enums, utils
│       └── src/lib/
│           ├── dto/                # PredictionDto, GameDto, AccuracyDto
│           ├── enums/              # SportCategory, PredictionOutcome
│           └── utils/              # Date formatter, sport duration config
├── .env.example                    # Environment template
├── docker-compose.yml              # PostgreSQL for local dev
├── start-backend.sh                # Backend auto-restart daemon
├── serve-frontend.js               # Static file server + API proxy
├── ML_ROADMAP.md                   # ML independence roadmap
└── IMPLEMENTATION_PLAN.md          # Full implementation plan
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ODDS_API_KEY` | ✅ | — | The Odds API key |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | `super-secret-fallback-key-for-dev` | JWT signing secret |
| `NODE_ENV` | — | `development` | `development` or `production` |
| `SPORT_API_KEY` | — | — | SportAPI (RapidAPI) key |
| `SCRAPER_RAPIDAPI_KEY` | — | — | FlashScore scraper key |
| `SMTP_HOST` | — | — | Email server for notifications |

### Sport-Specific Configuration

**Home advantage ELO bonuses:**
| Sport | Bonus |
|-------|-------|
| Soccer | +65 |
| Basketball | +40 |
| American Football | +25 |
| Ice Hockey | +35 |
| Tennis, MMA, Boxing | 0 |

**Goals prediction league data** is defined in `GoalsPredictor` (`goals-predictor.service.ts`) with 16+ leagues configured.

---

## 💰 API Quota Management

The Odds API free tier: **500 requests/month**.

| Action | Cost | Notes |
|--------|------|-------|
| Sync Sports | **0** | Always free |
| Sync Games (1 sport) | **1** | Per sport |
| Generate Predictions | **1** | Fetches odds |
| Update Results | **1** | Fetches scores |

### Recommended Strategy

**Start with 1-2 sports** to conserve quota:
```bash
curl -X POST "http://localhost:3000/api/games/sync?sport=soccer_epl"
curl -X POST "http://localhost:3000/api/predictions/generate?sport=soccer_epl"
```

**Don't sync all 80+ sports at once** — that costs ~160 requests. The backend logs warnings when quota runs low.

---

## 🗺️ ML Roadmap

### Phase 1: Train on Consumed Data ✅ Done
- [x] XGBoost training pipeline
- [x] 3 prediction tasks: outcome, goals, BTTS
- [x] ML model wired into prediction ensemble
- [x] Goals predictions (league averages until ML trained)
- [ ] First training run (needs 50+ resolved games per league)

### Phase 2: Build Data Collection
- [ ] Historical results scraper (FlashScore, Soccerway)
- [ ] South Africa PSL priority (Phase 2 target)
- [ ] Auto-collect ongoing match results
- [ ] Build historical ELO database

### Phase 3: Full Independence
- [ ] Replace external API dependencies
- [ ] Generate own fixtures from league websites
- [ ] Generate own odds from ML probabilities
- [ ] ELO + Form + ML ensemble becomes fully self-sufficient

See `ML_ROADMAP.md` for details.

---

## License

MIT
