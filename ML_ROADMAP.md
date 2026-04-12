# ML Independence Roadmap

## Vision
Build a self-sufficient prediction engine that generates its own odds, 
trained on its own data — completely independent of external APIs.

## Current State
- **Data sources**: The Odds API (fixtures/odds), SportAPI (results), FlashScore (live)
- **Models**: ELO (handcrafted), Form (recent results), Odds Implied (bookmaker)
- **ML**: XGBoost pipeline built, not yet trained (needs historical data)
- **Ensemble**: Weighted average of 3 models with dynamic per-sport weights

## Phase 1: Train on Consumed Data (NOW)
**Goal**: Use data from external APIs to train our own models

### What's Built
- ✅ XGBoost training pipeline (`train_models.py`)
- ✅ 3 prediction tasks: outcome (1X2), goals (over/under 2.5), BTTS
- ✅ Feature engineering: team strength, form, H2H, market odds
- ✅ ML service integration into prediction generation
- ✅ Probability blending (ensemble + ML)
- ✅ Implied odds generation from model probabilities
- ✅ Weekly auto-retraining cron job

### What's Needed
- [ ] Populate historical results database (need past match data)
- [ ] First training run once we have 50+ resolved games per league
- [ ] Monitor ML accuracy vs ensemble over time

## Phase 2: Build Data Collection (NEXT)
**Goal**: Collect our own data, starting with South Africa PSL

### South Africa PSL Priority
1. **Historical results** — Scrape past 5 years of PSL matches
   - Sources: FlashScore, Soccerway, ESPN, PSL official site
   - Data needed: date, teams, scores, odds, stats (shots, possession, cards)
   
2. **Ongoing collection** — Auto-collect every PSL match result
   - Hook into live scores scraper to also store final results
   - Store odds snapshots before each match

3. **Feature data** — Build team strength database
   - Historical ELO ratings for all PSL teams
   - Head-to-head records
   - Home/away performance splits

### Data Collection Architecture
```
Scrapers → Raw Data → Validation → Database → Training Pipeline
   ↓
FlashScore (live scores + results)
Soccerway (historical results)
Odds portals (historical odds)
```

## Phase 3: Full Independence (GOAL)
**Goal**: Replace all external API dependencies

### Our Own Fixtures
- Scrape league websites for upcoming fixtures
- Validate against multiple sources
- No more dependency on The Odds API for fixture data

### Our Own Odds
- XGBoost model generates probabilities
- Apply configurable margin (3-8%) to create odds
- Compare against bookmaker odds to find value
- No more dependency on external odds APIs

### Our Own Live Scores
- FlashScore scraper already running (rate limited on free tier)
- Build custom scraper for specific leagues we care about
- Store all results in our database

### Our Own Predictions
- ML model replaces bookmaker odds as the "odds implied" model
- ELO + Form + ML ensemble becomes fully self-sufficient
- Confidence increases as we collect more data

## Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PREDICTION ENGINE                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   ELO Model  │  │  Form Model  │  │   XGBoost ML   │ │
│  │ (handcrafted)│  │ (recent form)│  │ (trained model)│ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │           │
│         └────────────────┼───────────────────┘           │
│                          │                               │
│                   ┌──────▼──────┐                        │
│                   │  Ensemble   │                        │
│                   │  (blend)    │                        │
│                   └──────┬──────┘                        │
│                          │                               │
│                   ┌──────▼──────┐                        │
│                   │  Generated  │                        │
│                   │    Odds     │                        │
│                   └─────────────┘                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    DATA LAYER                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Scrapers   │  │   Database   │  │  Feature Store  │ │
│  │ (collect)   │──▶│   (store)    │──▶│  (engineer)    │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| ML pipeline built | Week 1 | ✅ Done |
| First model trained | When we have 50+ games/league | ⏳ Waiting for data |
| ML odds generated | After first training | ⏳ |
| ML blended with ensemble | After training | ⏳ |
| PSL historical data collected | Phase 2 | 📋 Planned |
| Own fixtures database | Phase 3 | 📋 Planned |
| Own odds (no external API) | Phase 3 | 📋 Planned |
| Full independence | Phase 3 | 📋 Planned |

## Key Metrics to Track

1. **ML accuracy** — % correct predictions vs actual results
2. **ML vs bookmaker** — Does our model beat the market?
3. **ROI** — If we bet on our highest-confidence picks, do we profit?
4. **Data coverage** — How many leagues/matches do we have data for?
5. **Model freshness** — How recently was each model trained?
