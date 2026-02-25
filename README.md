# 🎯 PredictEngine — AI Sports Prediction Platform

A full-stack sports prediction engine powered by ELO ratings, form analysis, and market odds ensemble models. Supports 80+ sports, generates daily predictions, and tracks accuracy over time.

![Dashboard](https://img.shields.io/badge/Frontend-Angular%2021-red?logo=angular) ![Backend](https://img.shields.io/badge/Backend-NestJS%2011-red?logo=nestjs) ![DB](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql) ![API](https://img.shields.io/badge/Data-The%20Odds%20API-green)

---

## 📋 Table of Contents

- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Using the Dashboard](#-using-the-dashboard)
- [Using the API](#-using-the-api)
- [Pipeline Explained](#-pipeline-explained)
- [Prediction Models](#-prediction-models)
- [Scheduled Automation](#-scheduled-automation)
- [Architecture](#-architecture)
- [API Quota Management](#-api-quota-management)

---

## 🧠 How It Works

PredictEngine follows a **4-step pipeline** that runs automatically or on-demand:

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│  1. SYNC    │ →  │  2. FETCH   │ →  │ 3. PREDICT   │ →  │  4. VERIFY     │
│   Sports    │    │   Games     │    │  Outcomes     │    │   Results      │
│             │    │             │    │              │    │                │
│ Discover    │    │ Get upcoming│    │ 3 models     │    │ Fetch scores   │
│ all leagues │    │ matches     │    │ combine into │    │ Mark correct/  │
│ from API    │    │ from API    │    │ ensemble     │    │ incorrect      │
│ (FREE)      │    │ (1 req/sport)│   │ prediction   │    │ Update ELO     │
└─────────────┘    └─────────────┘    └──────────────┘    └────────────────┘
```

### The Prediction Flow (Step 3 in detail)

For each upcoming game, three models independently predict the outcome:

| Model | How it works | Weight |
|-------|-------------|--------|
| **ELO Rating** | Teams have ratings (start at 1500). Win → rating goes up, lose → goes down. Higher-rated teams are predicted to win. | 30% |
| **Form Model** | Like ELO but adds home advantage bonus (+50 ELO for home team). Uses sigmoid curve for smoother probabilities. | 30% |
| **Odds Implied** | Converts real bookmaker odds into fair probabilities. Averages across multiple bookmakers and removes their profit margin (overround). | 40% |

The **Ensemble Predictor** combines all three with weighted averaging to produce final probabilities (e.g., 51.1% home, 21.9% draw, 27.0% away). The highest probability becomes the predicted outcome, and the confidence level is determined by how dominant that probability is.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ (`nvm use 20`)
- **PostgreSQL** running locally
- **API Key** from [The Odds API](https://the-odds-api.com) (free, 500 requests/month)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Shoezmann/sports-prediction-engine.git
cd sports-prediction-engine

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env and add your ODDS_API_KEY and DATABASE_URL

# 4. Create the database
createdb sports_prediction_db

# 5. Start backend (builds + starts on port 3000)
npx nx run backend:build && node dist/apps/backend/main.js

# 6. In a new terminal — start frontend (port 4200)
npx nx run frontend:serve

# 7. Open http://localhost:4200
```

---

## 🖥️ Using the Dashboard

Open **http://localhost:4200** in your browser.

### First Time Setup

When you first open the dashboard, everything will show 0s. You need to run the pipeline to populate data.

#### Option A: One-Click (Recommended)

Click the **⚡ Run Full Pipeline** button on the dashboard. This automatically:
1. Syncs all available sports (158 sports, 80+ active)
2. Fetches upcoming games for all active sports
3. Generates predictions using the ensemble model

#### Option B: Step by Step

Use the individual buttons to control each step:

| Button | What it does | API Cost |
|--------|-------------|----------|
| **🌐 Sync Sports** | Discovers all available sports/leagues | FREE (0 requests) |
| **⚡ Run Full Pipeline** | Sync → Fetch games → Generate predictions | ~2 requests per sport |
| **📊 Update Results** | Fetches final scores and grades predictions | ~1 request per sport |

### Dashboard Sections

1. **Hero Section** — Title and action buttons
2. **Stat Cards** — Quick metrics:
   - **Total Predictions** — Lifetime count
   - **Accuracy** — Overall hit rate (correct / total resolved)
   - **Last 7 Days** — Recent rolling accuracy
   - **Last 30 Days** — Monthly rolling accuracy
3. **Model Accuracy Breakdown** — Bar chart comparing how each model performs (Ensemble, Odds Implied, ELO, Form)
4. **Confidence Rings** — How accurate the predictions are at each confidence level (high/medium/low)
5. **Pipeline Log** — Live feed of what the system is doing when you trigger actions

### Predictions Page

Click **Predictions** in the nav bar to see:
- **Overall accuracy ring** — Conic gradient showing hit rate
- **Per-model comparison** — Which model is performing best
- **Per-sport breakdown** — Cards showing accuracy for each sport/league

---

## 🔌 Using the API

All endpoints are available at `http://localhost:3000/api/`.

### Health Check

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

### Step 1: Sync Sports (FREE — no API quota)

```bash
curl -X POST http://localhost:3000/api/sports/sync
# → { "total": 158, "active": 81, "new": 158 }
```

This discovers all available sports from The Odds API. You only need to do this once or daily. The sports endpoint is **completely free**.

### Step 2: Sync Games

```bash
# Sync ALL active sports (costs 1 request per sport)
curl -X POST http://localhost:3000/api/games/sync

# Sync only one sport (costs 1 request)
curl -X POST "http://localhost:3000/api/games/sync?sport=soccer_epl"
```

**Popular sport keys:**
| Key | League |
|-----|--------|
| `soccer_epl` | English Premier League |
| `soccer_spain_la_liga` | La Liga |
| `soccer_germany_bundesliga` | Bundesliga |
| `soccer_italy_serie_a` | Serie A |
| `soccer_france_ligue_one` | Ligue 1 |
| `soccer_uefa_champs_league` | Champions League |
| `basketball_nba` | NBA |
| `americanfootball_nfl` | NFL |
| `icehockey_nhl` | NHL |
| `baseball_mlb` | MLB |
| `tennis_atp_french_open` | ATP French Open |
| `mma_mixed_martial_arts` | UFC/MMA |

### Step 3: Generate Predictions

```bash
# Generate for all synced games
curl -X POST http://localhost:3000/api/predictions/generate

# Generate for one sport only
curl -X POST "http://localhost:3000/api/predictions/generate?sport=soccer_epl"
# → { "generated": 20, "skipped": 0 }
```

This fetches live odds and runs all three prediction models to create ensemble predictions. Games that already have predictions are skipped.

### Step 4: Update Results

```bash
curl -X POST http://localhost:3000/api/results/update
# → { "updated": 5, "predictionsResolved": 5, "eloUpdated": 10 }
```

Run this **after games have been played**. It:
- Fetches final scores from the API
- Marks each prediction as ✅ correct or ❌ incorrect
- Updates ELO ratings based on actual results

### Step 5: Check Accuracy

```bash
curl http://localhost:3000/api/accuracy
```

Returns a comprehensive breakdown:

```json
{
  "totalPredictions": 20,
  "correctPredictions": 12,
  "accuracy": 0.6,
  "byConfidenceLevel": {
    "high":   { "total": 3, "correct": 3, "accuracy": 1.0 },
    "medium": { "total": 8, "correct": 5, "accuracy": 0.625 },
    "low":    { "total": 9, "correct": 4, "accuracy": 0.444 }
  },
  "byModel": {
    "ensemble": 0.6,
    "elo": 0.55,
    "form": 0.55,
    "oddsImplied": 0.65
  },
  "bySport": {
    "soccer_epl": { "total": 20, "correct": 12, "accuracy": 0.6 }
  },
  "last7Days": 0.6,
  "last30Days": 0.6
}
```

---

## 🔄 Pipeline Explained

### Typical Daily Workflow

```
Morning (automatic at 3 AM):
  └─ Sync sports catalog (FREE)

Every 6 hours (automatic):
  ├─ Fetch upcoming games across all sports
  └─ Generate predictions for new games

Every 2 hours (automatic):
  ├─ Fetch scores for completed games
  ├─ Grade predictions (correct/incorrect)
  └─ Update ELO ratings
```

### Manual Workflow (for first-time or testing)

```bash
# 1. Sync sports (free, do once)
curl -X POST http://localhost:3000/api/sports/sync

# 2. Pick a sport and sync games
curl -X POST "http://localhost:3000/api/games/sync?sport=soccer_epl"

# 3. Generate predictions (fetches odds automatically)
curl -X POST "http://localhost:3000/api/predictions/generate?sport=soccer_epl"

# 4. Wait for games to finish...

# 5. Update results and check accuracy
curl -X POST http://localhost:3000/api/results/update
curl http://localhost:3000/api/accuracy
```

---

## 🤖 Prediction Models

### ELO Rating Model (30% weight)
- Every team starts with a **1500 ELO rating**
- Winning raises your rating, losing lowers it
- K-factor = 32 (how much each game moves ratings)
- For soccer: distributes draw probability based on how evenly matched teams are (default draw rate: 26%)

### Form Model (30% weight)
- Uses ELO ratings + **home advantage bonus** (+50 ELO for home team)
- Applies a **sigmoid function** to convert ELO difference to probability
- More gradual predictions (avoids extreme values)

### Odds Implied Model (40% weight — highest)
- Fetches **real bookmaker odds** from multiple sportsbooks
- Averages odds across all available bookmakers
- **Removes overround** (bookmaker profit margin) to get fair probabilities
- Gets the highest weight because market odds represent the collective wisdom of millions of bettors and sharp models

### Ensemble Predictor
- Weighted average of all three models
- Weights are normalized if a model doesn't support a sport category
- Final probabilities always sum to 1.0
- Picks the outcome with the highest probability
- Confidence = the value of the highest probability

### Confidence Levels
| Level | Threshold | Meaning |
|-------|-----------|---------|
| **High** | ≥ 70% | Strong prediction, model is very confident |
| **Medium** | 55–70% | Moderate confidence |
| **Low** | < 55% | Close call, could go either way |

---

## ⏰ Scheduled Automation

The system runs cron jobs automatically when the backend is running:

| Schedule | Job | API Cost |
|----------|-----|----------|
| Daily at **3:00 AM UTC** | Sync sports catalog | FREE |
| Every **6 hours** | Sync games + generate predictions | ~2 per active sport |
| Every **2 hours** | Update results + grade predictions | ~1 per active sport |

**You don't need to do anything manually** — just keep the backend running and the system will automatically discover games, predict outcomes, fetch results, and track accuracy.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Angular 21)                      │
│  Dashboard │ Predictions │ Components │ ApiService               │
│  Port 4200 │ Proxy → :3000/api                                  │
└────────────────────────────┬───────────────────────────────────┘
                             │ HTTP
┌────────────────────────────┴───────────────────────────────────┐
│                      BACKEND (NestJS 11)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Layer (Controllers)                     │   │
│  │  Sports │ Games │ Predictions │ Results │ Accuracy       │   │
│  └────────────────────────┬────────────────────────────────┘   │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │           Application Layer (Use Cases)                  │   │
│  │  SyncSports │ SyncGames │ GeneratePredictions            │   │
│  │  UpdateResults │ GetAccuracy │ PredictionScheduler        │   │
│  └────────────────────────┬────────────────────────────────┘   │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │              Domain Layer (Pure Logic)                    │   │
│  │  Entities: Sport, Team, Game, Prediction                  │   │
│  │  Services: EnsemblePredictor, EloCalculator               │   │
│  │  Value Objects: Probability, Confidence, EloRating        │   │
│  │  Ports: interfaces (no external dependencies)             │   │
│  └────────────────────────┬────────────────────────────────┘   │
│  ┌────────────────────────┴────────────────────────────────┐   │
│  │         Infrastructure Layer (Adapters)                   │   │
│  │  The Odds API │ ELO Model │ Form Model │ Odds Model       │   │
│  │  PostgreSQL Repositories (TypeORM)                        │   │
│  │  In-Memory Repositories (testing fallback)                │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   PostgreSQL     │
                    │  sports (158)    │
                    │  teams           │
                    │  games           │
                    │  predictions     │
                    └─────────────────┘
```

---

## 💰 API Quota Management

The Odds API free tier gives you **500 requests/month**. Here's how to stay within limits:

| Action | Cost | Notes |
|--------|------|-------|
| Sync Sports | **0** | Always free |
| Sync Games (1 sport) | **1** | Per sport |
| Generate Predictions (1 sport) | **1** | Fetches odds |
| Update Results (1 sport) | **1** | Fetches scores |

### Recommended Strategy

**Start small**: Sync only 1-2 sports to conserve quota.

```bash
# Just EPL and Champions League (4 requests total)
curl -X POST "http://localhost:3000/api/games/sync?sport=soccer_epl"
curl -X POST "http://localhost:3000/api/games/sync?sport=soccer_uefa_champs_league"
curl -X POST "http://localhost:3000/api/predictions/generate?sport=soccer_epl"
curl -X POST "http://localhost:3000/api/predictions/generate?sport=soccer_uefa_champs_league"
```

**Don't sync all 81 active sports at once** — that would cost ~160 requests in one go. Pick your favorites and add more as needed.

The API response headers tell you remaining quota. The backend logs a warning when you're running low:

```
[TheOddsApiAdapter] ⚠️ API quota low: 42 requests remaining
```

---

## 📂 Project Structure

```
sports-prediction-engine/
├── apps/
│   ├── backend/          # NestJS API server
│   │   └── src/
│   │       ├── api/          # REST controllers
│   │       ├── application/  # Use cases + scheduler
│   │       ├── domain/       # Entities, services, ports
│   │       └── infrastructure/ # Adapters, DB, models
│   └── frontend/         # Angular dashboard
│       └── src/
│           └── app/
│               ├── components/  # Header, StatCard, AccuracyChart
│               ├── pages/       # Dashboard, Predictions
│               └── services/    # ApiService
├── libs/
│   └── shared/types/     # Shared TypeScript types/enums
├── .env.example          # Template (safe to commit)
├── .env                  # Your secrets (gitignored)
└── docker-compose.yml    # PostgreSQL for dev
```

---

## License

MIT
