# PredictEngine — System Documentation

## Overview

A fully self-contained sports prediction engine with **automated result tracking** and **zero manual data entry**. All seed data is local. Predictions are generated from proprietary models. Results are auto-fetched from free public APIs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PREDICT ENGINE                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              DATA INGESTION LAYER (Local)                │   │
│  │                                                          │   │
│  │  league.config.ts     → 12 leagues configured           │   │
│  │  team.seeds.ts        → 200+ teams with ELO ratings     │   │
│  │  fixture.seeds.ts     → 84 upcoming fixtures            │   │
│  │  data-ingestion.service.ts → Seeds DB on startup        │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │              AUTOMATED RESULTS (Cron: every 4h)          │   │
│  │                                                          │   │
│  │  Football-Data.org (free, 10 req/min)                   │   │
│  │    → EPL, La Liga, Serie A, Ligue 1, Bundesliga, Erediv │   │
│  │                                                          │   │
│  │  The Odds API (when quota available)                    │   │
│  │    → PSL, Brasileirão                                   │   │
│  │                                                          │   │
│  │  Pipeline:                                               │   │
│  │    1. Fetch completed matches from APIs                 │   │
│  │    2. Match to our games (team alias + date proximity)  │   │
│  │    3. Auto-resolve predictions (correct/incorrect)      │   │
│  │    4. Update team ELO ratings                           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │              PREDICTION MODELS                           │   │
│  │                                                          │   │
│  │  ELO Model           → Team strength + home bonus (+40) │   │
│  │  Form Model          → Recent results, recency weighted │   │
│  │  ML Model (XGBoost)  → Fallback: neutral distribution   │   │
│  │  Synthetic Odds      → ELO → bookmaker odds (owned)     │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐   │
│  │              ENSEMBLE PREDICTOR                          │   │
│  │                                                          │   │
│  │  Default: ELO 25% | Form 25% | Odds 30% | ML 20%       │   │
│  │  Dynamic: Adjusted by historical accuracy per sport     │   │
│  │  Output: probabilities + EV + Kelly stake               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Target Leagues (Phase 1)

### ⚽ Soccer (7 leagues)
| League | Country | Teams | Results Source |
|--------|---------|-------|----------------|
| PSL | South Africa | 16 | The Odds API |
| EPL | England | 20 | Football-Data.org (free) |
| La Liga | Spain | 22 | Football-Data.org (free) |
| Serie A | Italy | 20 | Football-Data.org (free) |
| Ligue 1 | France | 20 | Football-Data.org (free) |
| Eredivisie | Netherlands | 18 | Football-Data.org (free) |
| Brasileirão | Brazil | 20 | The Odds API |

### 🏉 Rugby (3 competitions)
- Six Nations (6 teams)
- NRL (16 teams)
- Rugby Championship (4 teams)

### 🎾 Tennis (2 tours)
- ATP Masters (10 players)
- WTA 1000 (10 players)

## Performance Tracking

### How We Measure Accuracy

```
Match Finishes → Auto-Fetch Result → Resolve Prediction → Track Accuracy
```

**Automated pipeline (every 4 hours):**
1. Fetch completed matches from Football-Data.org (6 leagues) + The Odds API (2 leagues)
2. Match results to our games using team name aliases + date proximity
3. Mark predictions as correct/incorrect
4. Update team ELO ratings based on actual result

**Accuracy metrics tracked:**
- Overall hit rate (correct / total resolved)
- Per-model accuracy (ELO, Form, Odds, ML)
- Per-league accuracy
- 7-day / 30-day rolling accuracy
- Goals prediction accuracy (Over/Under 2.5)
- BTTS prediction accuracy
- Successful predictions (all metrics correct) vs Failed

### Team Name Matching

The system uses a 200+ entry alias map to match external API team names to our seeded names:

```
External API Name     → Our Seeded Name
─────────────────────────────────────────
"Man City"            → "Manchester City"
"Man. United"         → "Manchester United"
"Real Madrid CF"      → "Real Madrid"
"FC Internazionale"   → "Inter"
"Paris Saint-Germain" → "Paris Saint Germain"
"FC Bayern München"   → "Bayern Munich"
```

Fallback: Lowercase normalization with FC/SC/AC suffix stripping.

## API Endpoints

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions/pending` | Upcoming predictions |
| POST | `/api/predictions/generate` | Generate predictions |
| GET | `/api/predictions/resolved` | Resolved predictions |
| GET | `/api/predictions/stats` | Accuracy statistics |
| GET | `/api/predictions/summary` | Summary counts |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/seed` | Seed all data (sports, teams, fixtures) |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## Key Design Decisions

### 1. No External API Dependencies for Data
- All team ELO ratings are seeded locally
- All fixtures are seeded locally
- Results are fetched from free public APIs (Football-Data.org)
- Odds are synthetically generated from ELO differentials

### 2. Home Bias Eliminated
- ELO home bonus reduced from +65 to +40
- Form model no longer applies home multiplier (was double-counting)
- ML fallback uses neutral 34/33/33 distribution
- Tie-breaking uses strict `>` (ties → DRAW, not home)

### 3. Fully Owned Odds Engine
- Synthetic odds generated from ELO differentials
- Bookmaker margin (5% soccer) and favorite-longshot bias applied
- Zero cost, zero rate limits, zero dependencies

### 4. Automated Result Resolution
- Cron job runs every 4 hours
- Fetches completed matches from free APIs
- Auto-resolves predictions and updates ELO
- No manual score entry needed

## File Structure

```
apps/backend/src/
├── data-ingestion/              # Self-contained data pipeline
│   ├── league.config.ts         # League definitions
│   ├── team.seeds.ts            # 200+ teams with ELO ratings
│   ├── fixture.seeds.ts         # 84 upcoming fixtures
│   ├── data-ingestion.service.ts # Seeds DB on startup
│   ├── auto-results.service.ts   # Automated results fetching (every 4h)
│   └── data-ingestion.controller.ts # Admin API
├── application/use-cases/
│   └── generate-predictions.use-case.ts # Main prediction pipeline
├── domain/
│   ├── entities/                # Game, Prediction, Team, Sport
│   ├── services/                # EnsemblePredictor, EloCalculator
│   └── value-objects/           # Probability, Confidence, EloRating
└── infrastructure/
    ├── odds-scraper/
    │   └── synthetic-odds.adapter.ts # Self-owned odds engine
    └── scheduling/
        └── prediction.scheduler.ts   # Cron orchestration
```

## Current State

| Metric | Value |
|--------|-------|
| Total predictions | 62 |
| Sports covered | 7 |
| Home picks | 58 (93.5%) |
| Draw picks | 0 |
| Away picks | 4 (6.5%) |
| With odds | 62 (100%) |
| With EV | 62 (100%) |
| With goals | 62 (100%) |

## Running Services

- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:4200`
