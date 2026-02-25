# Sports Prediction Engine — Implementation Plan

> **Stack:** Nx Monorepo · Angular 20 · NestJS 11 · Hexagonal Architecture · TypeORM · PostgreSQL · The Odds API v4 · Render  
> **Target Sportsbooks:** Betway · Sportingbet South Africa  
> **Created:** 2026-02-24  
> **Status:** Phase 1 — Foundation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Workspace Structure](#3-workspace-structure)
4. [Phase 1 — Foundation](#4-phase-1--foundation)
5. [Phase 2 — Intelligence](#5-phase-2--intelligence)
6. [Phase 3 — Polish & Scale](#6-phase-3--polish--scale)
7. [Data Sources](#7-data-sources)
8. [Deployment Strategy](#8-deployment-strategy)
9. [Task Breakdown](#9-task-breakdown)

---

## 1. Project Overview

A full-stack application that:

- Fetches upcoming games/matches across **all sports available on Betway & Sportingbet SA** via **The Odds API v4**
- Generates predictions using custom models (ELO, form-based, odds-implied, ML ensemble)
- Displays predictions in a modern Angular dashboard with confidence scores
- Tracks prediction accuracy over time per sport, league, and model
- Runs daily automated prediction generation via cron jobs
- Dynamically discovers in-season sports via the API

### Target Sportsbooks

| Sportsbook | Region | URL |
|-----------|--------|-----|
| **Betway** | Global / SA | betway.com / betway.co.za |
| **Sportingbet** | South Africa | sportingbet.co.za |

The system covers the **union of all sports** available across both sportsbooks, mapped to The Odds API sport keys. Sports are organized into categories based on their prediction model type:

#### ⚽ Team Sports (Home Win / Draw / Away Win)

| Betway Sport | The Odds API Key(s) | League(s) |
|-------------|--------------------|-----------|
| **Soccer** | `soccer_epl` | English Premier League |
| | `soccer_efl_champ` | EFL Championship |
| | `soccer_germany_bundesliga` | German Bundesliga |
| | `soccer_germany_bundesliga2` | German Bundesliga 2 |
| | `soccer_italy_serie_a` | Italian Serie A |
| | `soccer_italy_serie_b` | Italian Serie B |
| | `soccer_spain_la_liga` | Spanish La Liga |
| | `soccer_spain_segunda_division` | Spanish La Liga 2 |
| | `soccer_france_ligue_one` | French Ligue 1 |
| | `soccer_france_ligue_two` | French Ligue 2 |
| | `soccer_netherlands_eredivisie` | Dutch Eredivisie |
| | `soccer_portugal_primeira_liga` | Portuguese Primeira Liga |
| | `soccer_belgium_first_div` | Belgian First Division |
| | `soccer_turkey_super_league` | Turkish Süper Lig |
| | `soccer_brazil_campeonato` | Brazilian Série A |
| | `soccer_brazil_serie_b` | Brazilian Série B |
| | `soccer_australia_aleague` | A-League (Australia) |
| | `soccer_japan_j_league` | Japanese J-League |
| | `soccer_usa_mls` | MLS (USA) |
| | `soccer_mexico_ligamx` | Liga MX (Mexico) |
| | `soccer_sweden_allsvenskan` | Swedish Allsvenskan |
| | `soccer_norway_eliteserien` | Norwegian Eliteserien |
| | `soccer_denmark_superliga` | Danish Superliga |
| | `soccer_finland_veikkausliiga` | Finnish Veikkausliiga |
| | `soccer_switzerland_superleague` | Swiss Super League |
| | `soccer_austria_bundesliga` | Austrian Bundesliga |
| | `soccer_poland_ekstraklasa` | Polish Ekstraklasa |
| | `soccer_greece_super_league` | Greek Super League |
| | `soccer_uefa_champs_league` | UEFA Champions League |
| | `soccer_uefa_europa_league` | UEFA Europa League |
| | `soccer_uefa_europa_conference_league` | UEFA Conference League |
| | `soccer_conmebol_copa_libertadores` | Copa Libertadores |
| | `soccer_league_of_ireland` | League of Ireland |
| | `soccer_spl` | Scottish Premiership |
| **Ice Hockey** | `icehockey_nhl` | NHL |
| | `icehockey_ahl` | AHL |
| | `icehockey_sweden_hockey_league` | SHL (Sweden) |
| | `icehockey_sweden_allsvenskan` | HockeyAllsvenskan |
| | `icehockey_finland_liiga` | Liiga (Finland) |
| | `icehockey_finland_mestis` | Mestis (Finland) |
| **Handball** | `handball_germany_bundesliga` | German Handball Bundesliga |
| **Field Hockey** | *(limited API coverage — use odds-implied only)* | |
| **Futsal** | *(limited API coverage — use odds-implied only)* | |

#### 🏈 Team Sports (Home Win / Away Win — No Draw)

| Betway Sport | The Odds API Key(s) | League(s) |
|-------------|--------------------|-----------|
| **American Football** | `americanfootball_nfl` | NFL |
| | `americanfootball_ncaaf` | NCAA Football |
| | `americanfootball_nfl_preseason` | NFL Preseason |
| | `americanfootball_cfl` | CFL |
| | `americanfootball_ufl` | UFL |
| **Basketball** | `basketball_nba` | NBA |
| | `basketball_ncaab` | NCAA Basketball |
| | `basketball_wnba` | WNBA |
| | `basketball_euroleague` | EuroLeague |
| | `basketball_nba_preseason` | NBA Preseason |
| **Baseball** | `baseball_mlb` | MLB |
| | `baseball_ncaa` | NCAA Baseball |
| | `baseball_kbo` | KBO (Korea) |
| | `baseball_npb` | NPB (Japan) |
| **Aussie Rules** | `aussierules_afl` | AFL |
| **Rugby League** | `rugbyleague_nrl` | NRL |
| **Rugby Union** | `rugbyunion_world_cup` | Rugby World Cup |
| | `rugbyunion_six_nations` | Six Nations |
| **Volleyball** | *(limited API coverage — use odds-implied only)* | |
| **Water Polo** | *(limited API coverage — use odds-implied only)* | |
| **Netball** | *(limited API coverage — use odds-implied only)* | |
| **Floorball** | *(limited API coverage — use odds-implied only)* | |

#### 🥊 Individual / Combat Sports (Competitor A / Competitor B)

| Betway Sport | The Odds API Key(s) | Event(s) |
|-------------|--------------------|---------|
| **MMA / UFC** | `mma_mixed_martial_arts` | UFC / MMA Events |
| **Boxing** | `boxing_boxing` | Major Boxing Cards |
| **Tennis** | `tennis_atp_australian_open` | ATP Australian Open |
| | `tennis_atp_french_open` | ATP French Open |
| | `tennis_atp_us_open` | ATP US Open |
| | `tennis_atp_wimbledon` | ATP Wimbledon |
| | `tennis_atp_canadian_open` | ATP Canadian Open |
| | `tennis_atp_china_open` | ATP China Open |
| | `tennis_atp_cincinnati_open` | ATP Cincinnati Open |
| | `tennis_atp_dubai` | ATP Dubai |
| | `tennis_atp_indian_wells` | ATP Indian Wells |
| | `tennis_atp_italian_open` | ATP Italian Open |
| | `tennis_atp_madrid_open` | ATP Madrid Open |
| | `tennis_atp_miami_open` | ATP Miami Open |
| | `tennis_atp_monte_carlo` | ATP Monte-Carlo |
| | `tennis_atp_paris` | ATP Paris Masters |
| | `tennis_atp_qatar_open` | ATP Qatar Open |
| | `tennis_atp_shanghai` | ATP Shanghai Masters |
| | `tennis_wta_australian_open` | WTA Australian Open |
| | `tennis_wta_french_open` | WTA French Open |
| | `tennis_wta_us_open` | WTA US Open |
| | `tennis_wta_wimbledon` | WTA Wimbledon |
| | `tennis_wta_canadian_open` | WTA Canadian Open |
| | `tennis_wta_china_open` | WTA China Open |
| | `tennis_wta_cincinnati_open` | WTA Cincinnati Open |
| | `tennis_wta_dubai` | WTA Dubai |
| | `tennis_wta_indian_wells` | WTA Indian Wells |
| | `tennis_wta_italian_open` | WTA Italian Open |
| | `tennis_wta_madrid_open` | WTA Madrid Open |
| | `tennis_wta_miami_open` | WTA Miami Open |
| | `tennis_wta_qatar_open` | WTA Qatar Open |
| | `tennis_wta_wuhan_open` | WTA Wuhan Open |
| **Table Tennis** | *(limited API coverage — use odds-implied when available)* | |
| **Badminton** | *(limited API coverage — use odds-implied when available)* | |
| **Squash** | *(limited API coverage — use odds-implied when available)* | |

#### 🏆 Outright / Futures Markets

| Betway Sport | The Odds API Key(s) | Market |
|-------------|--------------------|---------|
| **Golf** | `golf_masters_tournament_winner` | Masters Winner |
| | `golf_pga_championship_winner` | PGA Championship Winner |
| | `golf_the_open_championship_winner` | The Open Winner |
| | `golf_us_open_winner` | US Open Winner |
| **American Football** | `americanfootball_nfl_super_bowl_winner` | Super Bowl Winner |
| **Cricket** | `cricket_ipl` | IPL |
| | `cricket_test_match` | Test Matches |
| | `cricket_big_bash` | Big Bash |
| | `cricket_icc_world_cup` | ICC World Cup |
| **Cycling** | *(no API coverage — future data source)* | |
| **Darts** | *(no API coverage — future data source)* | |
| **Snooker** | *(no API coverage — future data source)* | |
| **Formula 1** | *(no API coverage — future data source)* | |
| **Motorsport / NASCAR** | *(no API coverage — future data source)* | |
| **Motorbikes / MotoGP** | *(no API coverage — future data source)* | |

#### ⚠️ Sportsbook Sports NOT Covered by The Odds API

| Sport | On Betway | On Sportingbet | Status | Plan |
|-------|:---------:|:--------------:|--------|------|
| Greyhounds | ✅ | ❌ | No API coverage | Future: scrape or alt data source |
| Horse Racing | ✅ | ✅ | No API coverage | Future: dedicated racing API |
| Virtual Sports | ✅ | ❌ | N/A | Not predictable (RNG-based) |
| Politics | ✅ | ❌ | Limited | May be seasonal |
| Gaelic Sports | ✅ | ✅ | No API coverage | Future: alt data source |
| Esports | ✅ | ❌ | Limited coverage | Future: dedicated esports API |
| Alpine Skiing | ❌ | ✅ | No API coverage | Future: winter sports data source |
| Cross Country Skiing | ❌ | ✅ | No API coverage | Future: winter sports data source |
| Ski Jumping | ❌ | ✅ | No API coverage | Future: winter sports data source |
| Speedway | ❌ | ✅ | No API coverage | Future: motorsport data source |
| Chess | ❌ | ✅ | No API coverage | Future: niche sports data source |

### Dynamic Sport Discovery

Rather than hardcoding sport keys, the system will:
1. Call `GET /v4/sports?all=true` (free, no quota cost) on startup and daily
2. Store the returned sport list with `active` status
3. Only fetch odds/scores for sports where `active: true`
4. Automatically pick up new sports when The Odds API adds them

### Sport Model Categories

The prediction engine handles three distinct match types:

| Category | Outcome Options | Draw Possible | Example |
|----------|----------------|--------------|--------|
| `THREE_WAY` | Home / Draw / Away | ✅ Yes | Soccer, Ice Hockey (regulation) |
| `TWO_WAY` | Home / Away | ❌ No | Basketball, American Football, Baseball |
| `HEAD_TO_HEAD` | Competitor A / B | ❌ No | Tennis, MMA, Boxing |
| `OUTRIGHT` | Multiple competitors | N/A | Golf winner, Super Bowl winner |

---

## 2. Architecture

### 2.1 High-Level Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Nx Monorepo                               │
│                                                                  │
│  ┌─────────────────────┐          ┌────────────────────────────┐ │
│  │   apps/frontend     │  HTTP    │      apps/backend          │ │
│  │   (Angular 20)      │ ◄──────► │      (NestJS 11)           │ │
│  │                     │  REST    │                            │ │
│  │  • Dashboard        │          │  ┌──────────────────────┐  │ │
│  │  • Predictions List │          │  │   Infrastructure     │  │ │
│  │  • Accuracy Tracker │          │  │   (Adapters)         │  │ │
│  │  • Sport Browser    │          │  │                      │  │ │
│  └─────────────────────┘          │  │  REST Controllers    │  │ │
│                                   │  │  Cron Schedulers     │  │ │
│  ┌─────────────────────┐          │  │  The Odds API Client │  │ │
│  │   libs/shared       │          │  │  TypeORM Repos       │  │ │
│  │                     │          │  │  Prediction Models   │  │ │
│  │  • DTOs / Interfaces│          │  └──────────┬───────────┘  │ │
│  │  • Enums            │          │             │              │ │
│  │  • Util functions   │          │  ┌──────────▼───────────┐  │ │
│  └─────────────────────┘          │  │   Application        │  │ │
│                                   │  │   (Use Cases)        │  │ │
│                                   │  │                      │  │ │
│                                   │  │  GeneratePredictions │  │ │
│                                   │  │  GetPredictions      │  │ │
│                                   │  │  TrackAccuracy       │  │ │
│                                   │  │  UpdateResults       │  │ │
│                                   │  └──────────┬───────────┘  │ │
│                                   │             │              │ │
│                                   │  ┌──────────▼───────────┐  │ │
│                                   │  │   Domain (Core)      │  │ │
│                                   │  │                      │  │ │
│                                   │  │  Entities            │  │ │
│                                   │  │  Value Objects       │  │ │
│                                   │  │  Domain Services     │  │ │
│                                   │  │  Port Interfaces     │  │ │
│                                   │  └──────────────────────┘  │ │
│                                   └────────────────────────────┘ │
│                                                                  │
│                              ┌───────────┐                       │
│                              │ PostgreSQL│                       │
│                              └───────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Hexagonal Architecture (Backend)

```
                    ┌─── INPUT ADAPTERS (Driving) ───┐
                    │                                 │
                    │  • REST Controllers             │
                    │  • Cron Scheduler               │
                    │  • CLI Commands                 │
                    │                                 │
                    └────────────┬────────────────────┘
                                │ calls
                    ┌───────────▼────────────────────┐
                    │      INPUT PORTS               │
                    │      (Use Case Interfaces)     │
                    │                                │
                    │  • GeneratePredictionsUseCase   │
                    │  • GetPredictionsUseCase        │
                    │  • UpdateGameResultsUseCase     │
                    │  • GetAccuracyMetricsUseCase    │
                    └───────────┬────────────────────┘
                                │ implements
                    ┌───────────▼────────────────────┐
                    │      APPLICATION SERVICES      │
                    │      (Orchestration)           │
                    │                                │
                    │  PredictionService             │
                    │  AccuracyService               │
                    │  GameService                   │
                    └───────────┬────────────────────┘
                                │ uses
                    ┌───────────▼────────────────────┐
                    │      DOMAIN CORE               │
                    │      (Pure Business Logic)     │
                    │                                │
                    │  Entities: Game, Prediction,   │
                    │    Team, AccuracyMetrics       │
                    │  Value Objects: Confidence,    │
                    │    Probability, SportType,     │
                    │    PredictionOutcome           │
                    │  Domain Services:              │
                    │    EloCalculator,              │
                    │    EnsemblePredictor,          │
                    │    ConfidenceCalculator        │
                    └───────────┬────────────────────┘
                                │ depends on
                    ┌───────────▼────────────────────┐
                    │      OUTPUT PORTS              │
                    │      (Interfaces)              │
                    │                                │
                    │  • GameRepositoryPort           │
                    │  • PredictionRepositoryPort     │
                    │  • TeamRepositoryPort           │
                    │  • SportsDataPort               │
                    │  • PredictionModelPort          │
                    │  • NotificationPort             │
                    └───────────┬────────────────────┘
                                │ implemented by
                    ┌───────────▼────────────────────┐
                    │      OUTPUT ADAPTERS (Driven)  │
                    │                                │
                    │  • TypeORM Repositories         │
                    │  • The Odds API Client          │
                    │  • ELO Model Adapter            │
                    │  • Form-Based Model Adapter     │
                    │  • Odds-Implied Model Adapter   │
                    │  • Email/Webhook Notifications  │
                    └────────────────────────────────┘
```

### 2.3 Dependency Rule

```
Infrastructure → Application → Domain ← Application ← Infrastructure
     (adapters)     (use cases)   (core)    (use cases)    (adapters)

Domain depends on NOTHING.
Application depends on Domain only.
Infrastructure depends on Application & Domain.
```

---

## 3. Workspace Structure

```
sports-prediction-engine/
│
├── apps/
│   ├── frontend/                          # Angular 20 application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/                  # Singleton services, guards, interceptors
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── api.service.ts
│   │   │   │   │   │   └── theme.service.ts
│   │   │   │   │   ├── interceptors/
│   │   │   │   │   │   └── error.interceptor.ts
│   │   │   │   │   └── guards/
│   │   │   │   ├── features/              # Feature modules (lazy-loaded)
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── dashboard.component.ts
│   │   │   │   │   │   ├── dashboard.component.html
│   │   │   │   │   │   ├── dashboard.component.scss
│   │   │   │   │   │   └── dashboard.routes.ts
│   │   │   │   │   ├── predictions/
│   │   │   │   │   │   ├── prediction-list/
│   │   │   │   │   │   ├── prediction-detail/
│   │   │   │   │   │   └── predictions.routes.ts
│   │   │   │   │   ├── accuracy/
│   │   │   │   │   │   ├── accuracy-dashboard/
│   │   │   │   │   │   └── accuracy.routes.ts
│   │   │   │   │   └── sports/
│   │   │   │   │       └── sports.routes.ts
│   │   │   │   ├── shared/                # Shared UI components
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── prediction-card/
│   │   │   │   │   │   ├── confidence-badge/
│   │   │   │   │   │   ├── probability-bar/
│   │   │   │   │   │   ├── sport-icon/
│   │   │   │   │   │   ├── skeleton-loader/
│   │   │   │   │   │   └── navbar/
│   │   │   │   │   └── pipes/
│   │   │   │   │       ├── confidence-color.pipe.ts
│   │   │   │   │       └── sport-label.pipe.ts
│   │   │   │   ├── app.component.ts
│   │   │   │   ├── app.config.ts
│   │   │   │   └── app.routes.ts
│   │   │   ├── styles/
│   │   │   │   ├── _variables.scss
│   │   │   │   ├── _mixins.scss
│   │   │   │   ├── _animations.scss
│   │   │   │   └── styles.scss
│   │   │   ├── assets/
│   │   │   ├── environments/
│   │   │   └── index.html
│   │   └── project.json
│   │
│   └── backend/                           # NestJS 11 application
│       ├── src/
│       │   ├── domain/                    # 🟢 DOMAIN LAYER (pure TS, no framework deps)
│       │   │   ├── entities/
│       │   │   │   ├── game.entity.ts
│       │   │   │   ├── prediction.entity.ts
│       │   │   │   ├── team.entity.ts
│       │   │   │   └── accuracy-metrics.entity.ts
│       │   │   ├── value-objects/
│       │   │   │   ├── confidence.vo.ts
│       │   │   │   ├── probability.vo.ts
│       │   │   │   ├── sport-type.vo.ts
│       │   │   │   ├── prediction-outcome.vo.ts
│       │   │   │   └── elo-rating.vo.ts
│       │   │   ├── services/
│       │   │   │   ├── elo-calculator.service.ts
│       │   │   │   ├── ensemble-predictor.service.ts
│       │   │   │   └── confidence-calculator.service.ts
│       │   │   ├── ports/
│       │   │   │   ├── output/
│       │   │   │   │   ├── game-repository.port.ts
│       │   │   │   │   ├── prediction-repository.port.ts
│       │   │   │   │   ├── team-repository.port.ts
│       │   │   │   │   ├── sports-data.port.ts
│       │   │   │   │   ├── prediction-model.port.ts
│       │   │   │   │   └── notification.port.ts
│       │   │   │   └── index.ts
│       │   │   └── exceptions/
│       │   │       ├── game-not-found.exception.ts
│       │   │       ├── prediction-already-exists.exception.ts
│       │   │       └── invalid-probability.exception.ts
│       │   │
│       │   ├── application/               # 🟡 APPLICATION LAYER (use cases)
│       │   │   ├── ports/
│       │   │   │   └── input/
│       │   │   │       ├── generate-predictions.use-case.ts
│       │   │   │       ├── get-predictions.use-case.ts
│       │   │   │       ├── update-game-results.use-case.ts
│       │   │   │       └── get-accuracy-metrics.use-case.ts
│       │   │   └── services/
│       │   │       ├── prediction-application.service.ts
│       │   │       ├── game-application.service.ts
│       │   │       └── accuracy-application.service.ts
│       │   │
│       │   ├── infrastructure/            # 🔴 INFRASTRUCTURE LAYER (adapters)
│       │   │   ├── adapters/
│       │   │   │   ├── input/             # Driving adapters
│       │   │   │   │   ├── rest/
│       │   │   │   │   │   ├── controllers/
│       │   │   │   │   │   │   ├── predictions.controller.ts
│       │   │   │   │   │   │   ├── games.controller.ts
│       │   │   │   │   │   │   └── accuracy.controller.ts
│       │   │   │   │   │   ├── dto/
│       │   │   │   │   │   │   ├── prediction-response.dto.ts
│       │   │   │   │   │   │   ├── game-response.dto.ts
│       │   │   │   │   │   │   └── accuracy-response.dto.ts
│       │   │   │   │   │   └── mappers/
│       │   │   │   │   │       └── response.mapper.ts
│       │   │   │   │   └── scheduled/
│       │   │   │   │       ├── daily-prediction.scheduler.ts
│       │   │   │   │       └── result-updater.scheduler.ts
│       │   │   │   │
│       │   │   │   └── output/            # Driven adapters
│       │   │   │       ├── persistence/
│       │   │   │       │   ├── typeorm/
│       │   │   │       │   │   ├── entities/
│       │   │   │       │   │   │   ├── game.orm-entity.ts
│       │   │   │       │   │   │   ├── prediction.orm-entity.ts
│       │   │   │       │   │   │   └── team.orm-entity.ts
│       │   │   │       │   │   ├── mappers/
│       │   │   │       │   │   │   ├── game.mapper.ts
│       │   │   │       │   │   │   ├── prediction.mapper.ts
│       │   │   │       │   │   │   └── team.mapper.ts
│       │   │   │       │   │   └── repositories/
│       │   │   │       │   │       ├── game-typeorm.repository.ts
│       │   │   │       │   │       ├── prediction-typeorm.repository.ts
│       │   │   │       │   │       └── team-typeorm.repository.ts
│       │   │   │       │   └── in-memory/
│       │   │   │       │       ├── game-in-memory.repository.ts
│       │   │   │       │       └── prediction-in-memory.repository.ts
│       │   │   │       │
│       │   │   │       ├── sports-api/
│       │   │   │       │   ├── the-odds-api/
│       │   │   │       │   │   ├── the-odds-api.adapter.ts
│       │   │   │       │   │   ├── the-odds-api.mapper.ts
│       │   │   │       │   │   └── the-odds-api.types.ts
│       │   │   │       │   └── sports-data.port-impl.ts
│       │   │   │       │
│       │   │   │       └── prediction-models/
│       │   │   │           ├── elo-model.adapter.ts
│       │   │   │           ├── form-based-model.adapter.ts
│       │   │   │           └── odds-implied-model.adapter.ts
│       │   │   │
│       │   │   ├── config/
│       │   │   │   ├── database.config.ts
│       │   │   │   ├── odds-api.config.ts
│       │   │   │   └── app.config.ts
│       │   │   │
│       │   │   └── modules/
│       │   │       ├── prediction.module.ts
│       │   │       ├── game.module.ts
│       │   │       ├── accuracy.module.ts
│       │   │       ├── sports-data.module.ts
│       │   │       └── persistence.module.ts
│       │   │
│       │   ├── app.module.ts
│       │   └── main.ts
│       │
│       ├── test/
│       │   ├── unit/
│       │   │   ├── domain/
│       │   │   │   ├── elo-calculator.spec.ts
│       │   │   │   └── ensemble-predictor.spec.ts
│       │   │   └── application/
│       │   │       └── prediction.service.spec.ts
│       │   └── integration/
│       │       └── predictions.e2e-spec.ts
│       └── project.json
│
├── libs/
│   └── shared/
│       └── types/                         # Shared TypeScript types
│           ├── src/
│           │   ├── lib/
│           │   │   ├── dto/
│           │   │   │   ├── prediction.dto.ts
│           │   │   │   ├── game.dto.ts
│           │   │   │   ├── team.dto.ts
│           │   │   │   └── accuracy.dto.ts
│           │   │   ├── enums/
│           │   │   │   ├── sport-type.enum.ts
│           │   │   │   ├── prediction-outcome.enum.ts
│           │   │   │   └── confidence-level.enum.ts
│           │   │   └── index.ts
│           │   └── index.ts
│           ├── tsconfig.json
│           ├── tsconfig.lib.json
│           └── project.json
│
├── .env.example                           # Environment variable template
├── docker-compose.yml                     # Local PostgreSQL
├── nx.json
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## 4. Phase 1 — Foundation

**Goal:** A working end-to-end pipeline: fetch games across **all active Betway sports** → predict outcomes → display in a multi-sport dashboard.

### 4.1 Tasks

#### Step 1: Scaffold Nx Workspace

| Item | Detail |
|------|--------|
| **Tool** | `npx create-nx-workspace@latest` |
| **Preset** | `apps` (empty workspace, we add apps manually) |
| **Apps** | `@nx/angular:application frontend`, `@nx/nest:application backend` |
| **Libs** | `@nx/js:library shared-types` |
| **Package Manager** | npm |

#### Step 2: Local Development Environment

| Item | Detail |
|------|--------|
| **Docker Compose** | PostgreSQL 16 on port `5432` |
| **Environment** | `.env` with `ODDS_API_KEY`, `DATABASE_URL`, `PORT` |
| **Backend Port** | `3000` |
| **Frontend Port** | `4200` |
| **Proxy** | Angular dev server proxies `/api/*` → `localhost:3000` |

#### Step 3: Shared Types Library (`libs/shared/types`)

```typescript
// Shared between Angular & NestJS
// No framework dependencies — pure TypeScript

// ═══════════════════════════════════════════
// Sport Categories — determines prediction model behavior
// ═══════════════════════════════════════════

export enum SportCategory {
  THREE_WAY = 'three_way',       // Home / Draw / Away (soccer, hockey regulation)
  TWO_WAY = 'two_way',           // Home / Away (basketball, american football, baseball)
  HEAD_TO_HEAD = 'head_to_head', // Competitor A / B (tennis, MMA, boxing)
  OUTRIGHT = 'outright',         // Multiple competitors (golf winner, futures)
}

export enum SportGroup {
  SOCCER = 'Soccer',
  AMERICAN_FOOTBALL = 'American Football',
  BASKETBALL = 'Basketball',
  BASEBALL = 'Baseball',
  ICE_HOCKEY = 'Ice Hockey',
  TENNIS = 'Tennis',
  MMA = 'Mixed Martial Arts',
  BOXING = 'Boxing',
  RUGBY_LEAGUE = 'Rugby League',
  RUGBY_UNION = 'Rugby Union',
  AUSSIE_RULES = 'Aussie Rules',
  GOLF = 'Golf',
  CRICKET = 'Cricket',
  HANDBALL = 'Handball',
  VOLLEYBALL = 'Volleyball',
  TABLE_TENNIS = 'Table Tennis',
  LACROSSE = 'Lacrosse',
}

// ═══════════════════════════════════════════
// Sport — dynamically discovered from The Odds API
// ═══════════════════════════════════════════

export interface SportDto {
  key: string;             // e.g. 'soccer_epl', 'basketball_nba'
  group: SportGroup;       // e.g. 'Soccer', 'Basketball'
  title: string;           // e.g. 'EPL', 'NBA'
  description: string;     // e.g. 'English Premier League'
  active: boolean;         // currently in-season
  hasOutrights: boolean;   // supports outright/futures markets
  category: SportCategory; // derived from group
}

// ═══════════════════════════════════════════
// Prediction Outcomes
// ═══════════════════════════════════════════

export enum PredictionOutcome {
  HOME_WIN = 'home_win',
  AWAY_WIN = 'away_win',
  DRAW = 'draw',           // only for THREE_WAY sports
  COMPETITOR_A = 'competitor_a', // for HEAD_TO_HEAD sports
  COMPETITOR_B = 'competitor_b', // for HEAD_TO_HEAD sports
  PENDING = 'pending',
}

export enum ConfidenceLevel {
  HIGH = 'high',       // ≥ 70%
  MEDIUM = 'medium',   // 55-69%
  LOW = 'low',         // < 55%
}

// ═══════════════════════════════════════════
// Game / Match
// ═══════════════════════════════════════════

export interface GameDto {
  id: string;
  sportKey: string;          // The Odds API sport key
  sportGroup: SportGroup;
  sportTitle: string;        // Human-readable league name
  sportCategory: SportCategory;
  homeTeam: TeamDto;         // or competitorA for H2H
  awayTeam: TeamDto;         // or competitorB for H2H
  commenceTime: string;      // ISO 8601
  completed: boolean;
  homeScore?: number;
  awayScore?: number;
}

export interface TeamDto {
  id: string;
  name: string;
  shortName?: string;
  eloRating: number;
  sportKey: string;          // which sport/league this team belongs to
}

// ═══════════════════════════════════════════
// Predictions
// ═══════════════════════════════════════════

export interface PredictionDto {
  id: string;
  game: GameDto;
  predictedOutcome: PredictionOutcome;
  confidence: number;              // 0.0 – 1.0
  confidenceLevel: ConfidenceLevel;
  probabilities: ProbabilitySetDto; // full probability distribution
  modelBreakdown: ModelBreakdownDto;
  actualOutcome?: PredictionOutcome;
  isCorrect?: boolean;
  createdAt: string;
}

export interface ModelBreakdownDto {
  elo: ProbabilitySetDto;
  form: ProbabilitySetDto;
  oddsImplied: ProbabilitySetDto;
}

// Flexible probability set — draw is optional based on sport category
export interface ProbabilitySetDto {
  homeWin: number;           // or competitorA win
  awayWin: number;           // or competitorB win
  draw?: number;             // only present for THREE_WAY sports
}

// ═══════════════════════════════════════════
// Accuracy Tracking
// ═══════════════════════════════════════════

export interface AccuracyDto {
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  byConfidenceLevel: {
    high: { total: number; correct: number; accuracy: number };
    medium: { total: number; correct: number; accuracy: number };
    low: { total: number; correct: number; accuracy: number };
  };
  byModel: {
    elo: number;
    form: number;
    oddsImplied: number;
    ensemble: number;
  };
  bySport: Record<string, { total: number; correct: number; accuracy: number }>;
  bySportGroup: Record<SportGroup, { total: number; correct: number; accuracy: number }>;
  last7Days: number;
  last30Days: number;
}

// ═══════════════════════════════════════════
// Sport Category Mapping Helper
// ═══════════════════════════════════════════

export const SPORT_GROUP_CATEGORY_MAP: Record<string, SportCategory> = {
  'Soccer': SportCategory.THREE_WAY,
  'Ice Hockey': SportCategory.THREE_WAY,
  'American Football': SportCategory.TWO_WAY,
  'Basketball': SportCategory.TWO_WAY,
  'Baseball': SportCategory.TWO_WAY,
  'Aussie Rules': SportCategory.TWO_WAY,
  'Rugby League': SportCategory.TWO_WAY,
  'Rugby Union': SportCategory.TWO_WAY,
  'Volleyball': SportCategory.TWO_WAY,
  'Handball': SportCategory.TWO_WAY,
  'Lacrosse': SportCategory.TWO_WAY,
  'Tennis': SportCategory.HEAD_TO_HEAD,
  'Mixed Martial Arts': SportCategory.HEAD_TO_HEAD,
  'Boxing': SportCategory.HEAD_TO_HEAD,
  'Table Tennis': SportCategory.HEAD_TO_HEAD,
  'Golf': SportCategory.OUTRIGHT,
  'Cricket': SportCategory.TWO_WAY,
};
```

#### Step 4: Domain Layer (Backend)

**Entities** — Rich domain objects with behavior:

| Entity | Key Properties | Key Methods |
|--------|---------------|-------------|
| `Game` | id, sport, homeTeam, awayTeam, commenceTime, scores | `isCompleted()`, `getOutcome()`, `isToday()` |
| `Prediction` | id, game, probabilities, confidence, outcome | `markResult()`, `isCorrect()`, `isHighConfidence()` |
| `Team` | id, name, eloRating | `updateElo()`, `getFormRating()` |

**Value Objects** — Immutable, validated:

| Value Object | Validation Rule |
|-------------|----------------|
| `Probability` | Must be 0.0 – 1.0 |
| `Confidence` | Must be 0.0 – 1.0, derives level (high/medium/low) |
| `SportType` | Must be a recognized sport enum value |
| `EloRating` | Must be positive number, default 1500 |
| `PredictionOutcome` | HOME_WIN, AWAY_WIN, DRAW, PENDING |

**Domain Services** — Pure business logic, no I/O:

| Service | Purpose |
|---------|---------|
| `EloCalculatorService` | Calculate win probability from ELO ratings, update ratings after results |
| `EnsemblePredictorService` | Combine multiple model outputs using weighted average |
| `ConfidenceCalculatorService` | Derive confidence from probability distribution entropy |

**Output Ports** — Interfaces the domain needs:

| Port | Methods |
|------|---------|
| `GameRepositoryPort` | `save()`, `findById()`, `findByDate()`, `findUpcoming()` |
| `PredictionRepositoryPort` | `save()`, `findById()`, `findByDate()`, `findByGame()`, `findAll()` |
| `TeamRepositoryPort` | `save()`, `findById()`, `findByName()`, `findAll()` |
| `SportsDataPort` | `fetchSports()`, `fetchUpcomingGames(sportKey)`, `fetchScores(sportKey)`, `fetchOdds(sportKey)` |
| `SportRepositoryPort` | `save()`, `findByKey()`, `findActive()`, `findByGroup()` |
| `PredictionModelPort` | `predict(game, category): ProbabilitySet`, `getName(): string`, `supportsCategory(category): boolean` |

#### Step 5: Application Layer (Backend)

**Use Cases / Input Ports:**

| Use Case | Trigger | Flow |
|----------|---------|------|
| `SyncSports` | Cron (daily) or POST /api/sports/sync | Fetch `/v4/sports?all=true` → Upsert sport records → Update active flags |
| `GeneratePredictions` | Cron (6AM daily) or POST /api/predictions/generate | For each **active sport**: fetch games → determine category → run appropriate models → ensemble → save |
| `GetPredictions` | GET /api/predictions?date=&sport=&group= | Query repo → Filter by sport/group/date → Map to DTOs → Return |
| `UpdateGameResults` | Cron (hourly) or POST /api/games/update-results | For each **active sport**: fetch scores → update games → mark prediction outcomes → update ELO |
| `GetAccuracyMetrics` | GET /api/accuracy?period=&sport=&group= | Aggregate results → Calculate stats by sport/group/model → Return |

#### Step 6: Infrastructure Layer (Backend)

**Output Adapters:**

| Adapter | Implements Port | Technology |
|---------|----------------|-----------|
| `TheOddsApiAdapter` | `SportsDataPort` | HTTP (axios), The Odds API v4 |
| `GameTypeormRepository` | `GameRepositoryPort` | TypeORM + PostgreSQL |
| `PredictionTypeormRepository` | `PredictionRepositoryPort` | TypeORM + PostgreSQL |
| `TeamTypeormRepository` | `TeamRepositoryPort` | TypeORM + PostgreSQL |
| `EloModelAdapter` | `PredictionModelPort` | In-process ELO calculation |
| `FormBasedModelAdapter` | `PredictionModelPort` | In-process (last N games) |
| `OddsImpliedModelAdapter` | `PredictionModelPort` | Derived from bookmaker odds |

**Input Adapters:**

| Adapter | Type | Endpoints |
|---------|------|-----------|
| `SportsController` | REST | `GET /api/sports` (list all), `GET /api/sports/active` (in-season), `POST /api/sports/sync` |
| `PredictionsController` | REST | `GET /api/predictions/today?sport=&group=`, `GET /api/predictions?date=&sport=&group=`, `POST /api/predictions/generate` |
| `GamesController` | REST | `GET /api/games/today?sport=&group=`, `GET /api/games?date=&sport=`, `POST /api/games/update-results` |
| `AccuracyController` | REST | `GET /api/accuracy?sport=&group=&period=`, `GET /api/accuracy/history?sport=` |
| `DailyPredictionScheduler` | Cron | Runs `SyncSports` then `GeneratePredictions` for all active sports at 06:00 UTC daily |
| `ResultUpdaterScheduler` | Cron | Runs `UpdateGameResults` for all active sports every hour |

**The Odds API v4 — Endpoints We'll Use:**

| Endpoint | Purpose | Quota Cost |
|----------|---------|-----------|
| `GET /v4/sports` | List available sports | Free |
| `GET /v4/sports/{sport}/odds` | Get odds for upcoming games | 1 request per call |
| `GET /v4/sports/{sport}/scores` | Get scores for completed games | 1 request per call |
| `GET /v4/sports/{sport}/events` | Get scheduled events | 1 request per call |

**Database Schema:**

```sql
-- sports (dynamically discovered from The Odds API)
CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,        -- e.g. 'soccer_epl'
  "group" VARCHAR(100) NOT NULL,           -- e.g. 'Soccer'
  title VARCHAR(255) NOT NULL,             -- e.g. 'EPL'
  description VARCHAR(500),
  category VARCHAR(20) NOT NULL,           -- 'three_way', 'two_way', 'head_to_head', 'outright'
  active BOOLEAN DEFAULT FALSE,
  has_outrights BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sports_group ON sports("group");
CREATE INDEX idx_sports_active ON sports(active);

-- teams / competitors
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  elo_rating DECIMAL(8,2) DEFAULT 1500.00,
  sport_key VARCHAR(100) NOT NULL REFERENCES sports(key),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, sport_key)
);
CREATE INDEX idx_teams_sport ON teams(sport_key);

-- games / matches / events
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) UNIQUE,
  sport_key VARCHAR(100) NOT NULL REFERENCES sports(key),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  commence_time TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_games_sport ON games(sport_key);
CREATE INDEX idx_games_commence ON games(commence_time);
CREATE INDEX idx_games_completed ON games(completed);

-- predictions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  predicted_outcome VARCHAR(20) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  home_win_prob DECIMAL(5,4) NOT NULL,
  draw_prob DECIMAL(5,4),                  -- NULL for two_way and h2h sports
  away_win_prob DECIMAL(5,4) NOT NULL,
  model_breakdown JSONB NOT NULL,
  actual_outcome VARCHAR(20),
  is_correct BOOLEAN,
  sport_key VARCHAR(100) NOT NULL REFERENCES sports(key),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id)
);
CREATE INDEX idx_predictions_sport ON predictions(sport_key);
CREATE INDEX idx_predictions_created ON predictions(created_at);
CREATE INDEX idx_predictions_correct ON predictions(is_correct);

-- team_form (last N games for form-based model)
CREATE TABLE team_form (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  game_id UUID REFERENCES games(id),
  result VARCHAR(10) NOT NULL,       -- 'win', 'draw', 'loss'
  points_scored INTEGER NOT NULL,    -- generic: goals, points, runs, etc.
  points_conceded INTEGER NOT NULL,
  played_at TIMESTAMPTZ NOT NULL,
  UNIQUE(team_id, game_id)
);
CREATE INDEX idx_team_form_team ON team_form(team_id);
```

#### Step 7: Angular Frontend

**Pages:**

| Page | Route | Features |
|------|-------|----------|
| **Dashboard** | `/` | Today's predictions, win/loss streak, overall accuracy badge |
| **Predictions** | `/predictions` | Filterable list (by date, sport, confidence), prediction cards |
| **Prediction Detail** | `/predictions/:id` | Full model breakdown, probability bars, game info |
| **Accuracy** | `/accuracy` | Charts (accuracy over time, by confidence level, by model) |
| **Settings** | `/settings` | API key config (Phase 2), notification preferences |

**Shared Components:**

| Component | Purpose |
|-----------|---------|
| `PredictionCardComponent` | Displays a single prediction with teams, confidence badge, probability bar |
| `ConfidenceBadgeComponent` | Color-coded badge (green/amber/red) |
| `ProbabilityBarComponent` | Three-way horizontal bar (home/draw/away) |
| `SportIconComponent` | SVG icon for each sport type |
| `SkeletonLoaderComponent` | Loading placeholder with shimmer animation |
| `NavbarComponent` | Top navigation with sport filters |
| `EmptyStateComponent` | Friendly illustration when no data available |

**Design System:**

- **Theme:** Dark mode default, glassmorphism cards
- **Font:** Inter (Google Fonts)
- **Color Palette:**
  - Background: `hsl(225, 25%, 8%)` → `hsl(225, 20%, 12%)`
  - Cards: `rgba(255, 255, 255, 0.04)` with backdrop-filter blur
  - Accent: `hsl(168, 80%, 50%)` (vibrant teal)
  - High confidence: `hsl(152, 70%, 50%)` (green)
  - Medium confidence: `hsl(38, 90%, 55%)` (amber)
  - Low confidence: `hsl(0, 70%, 55%)` (coral)
  - Text primary: `hsl(0, 0%, 95%)`
  - Text secondary: `hsl(0, 0%, 60%)`
- **Animations:** Smooth card hover lifts, staggered list entry, pulse on live games

---

## 5. Phase 2 — Intelligence

**Goal:** Smarter predictions, user accounts, value analysis.

| Feature | Detail |
|---------|--------|
| ML model | Train on historical data per sport (logistic regression → XGBoost) |
| Sport-specific models | Custom models tuned per sport (e.g., surface analysis for tennis, home ice advantage for hockey) |
| Player props | Leverage The Odds API player prop markets |
| User authentication | JWT-based auth, save favorite sports/teams |
| Push notifications | Notify when high-confidence predictions are generated |
| Historical analysis | View past predictions and accuracy trends per sport |
| Betting value finder | Compare model probability vs bookmaker implied probability |
| Live odds tracking | Track line movements to detect sharp action |

---

## 6. Phase 3 — Polish & Scale

**Goal:** Production-ready, scalable, monetizable.

| Feature | Detail |
|---------|--------|
| WebSocket updates | Real-time prediction status and live scores |
| Rate limiting | Protect API endpoints |
| Caching | Redis for API responses and computed predictions |
| Admin dashboard | Manage models, view system health |
| Public API | Expose predictions via API for third-party use |
| Mobile-responsive | PWA with offline support |
| Monetization | Premium predictions (higher confidence threshold), subscription tiers |

---

## 7. Data Sources

### The Odds API v4 (Primary)

- **Free tier:** 500 requests/month
- **Paid tiers:** from $12/mo (10,000 requests) to $199/mo (100,000 requests)
- **Supported sports:** 70+ (Soccer, NBA, NFL, NHL, MLB, Tennis, MMA, Cricket, etc.)
- **Markets:** h2h, spreads, totals, outrights, player props
- **Data:** Live odds, scores, events, historical, participants
- **Auth:** API key in query parameter
- **Sport list endpoint:** `GET /v4/sports` — **FREE, does not count against quota**

### API Endpoints Used

| Endpoint | Purpose | Quota Cost |
|----------|---------|-----------|
| `GET /v4/sports?all=true` | Discover all sports + active status | **Free** |
| `GET /v4/sports/{sport}/odds` | Get odds for upcoming games in a sport | 1 per call |
| `GET /v4/sports/{sport}/scores` | Get scores for completed/in-progress games | 1 per call |
| `GET /v4/sports/{sport}/events` | Get scheduled events (no odds) | 1 per call |
| `GET /v4/sports/{sport}/events/{id}/odds` | Get odds for a specific event | 1 per call |
| `GET /v4/sports/{sport}/participants` | Get teams/players for a sport | 1 per call |

### Data Budget — All Betway Sports

With ~20–30 active sports at any given time (seasonal), here's the budget:

| Operation | Per Sport | Active Sports | Daily Cost | Monthly Cost |
|-----------|-----------|--------------|------------|-------------|
| Fetch odds (1x/day) | 1 req | ~25 | 25 | ~750 |
| Fetch scores (2x/day, match days ~50%) | 1 req | ~12 | 24 | ~720 |
| Fetch events (1x/day, to discover new games) | 1 req | ~25 | 25 | ~750 |
| Sport list sync (1x/day) | 0 req | — | 0 | 0 |
| **Daily Total** | | | **~74** | |
| **Monthly Total** | | | | **~2,220** |

### Recommended API Tier

| Tier | Requests/Month | Price | Sufficient? |
|------|---------------|-------|------------|
| Free | 500 | $0 | ❌ Only enough for ~3 sports |
| **Starter** | **10,000** | **$12/mo** | **✅ Covers all sports with headroom** |
| Pro | 50,000 | $79/mo | ✅ Comfortable for high-frequency updates |
| Ultra | 100,000 | $199/mo | ✅ Real-time updates, all markets |

**Recommendation:** Start with the **Starter tier ($12/mo)** — gives 10,000 requests which is ~4.5x the estimated monthly usage, leaving plenty of room for testing, retries, and adding more frequent updates.

### Smart Quota Management

To stay within budget, the system implements:

1. **Sport priority tiers** — Major leagues (EPL, NBA, NFL) get more frequent updates than minor leagues
2. **Seasonal awareness** — Only fetch odds for sports where `active: true`
3. **Batch optimization** — One API call per sport returns all games for that sport
4. **Caching** — Cache API responses for 30 minutes to avoid redundant calls
5. **Quota tracking** — Monitor `x-requests-remaining` header and throttle if running low

---

## 8. Deployment Strategy

### Render Configuration

| Service | Type | Plan | Config |
|---------|------|------|--------|
| **Backend** | Web Service (Docker) | Starter ($7/mo) | Dockerfile, port 3000 |
| **Frontend** | Static Site | Free ($0) | `nx build frontend --configuration=production` |
| **Database** | PostgreSQL | Basic ($7/mo) | 256 MB RAM, 1 GB storage |
| **The Odds API** | Data Provider | Starter ($12/mo) | 10,000 requests/month |
| **Total** | | **$26/month** | |

### CI/CD

- **GitHub Actions** → On push to `main`:
  1. `nx affected --target=lint`
  2. `nx affected --target=test`
  3. `nx affected --target=build`
  4. Deploy affected apps to Render

---

## 9. Task Breakdown

### Phase 1 — Ordered Task List

| # | Task | Depends On | Estimated Time |
|---|------|-----------|----------------|
| 1 | Scaffold Nx workspace with Angular + NestJS + shared lib | — | 30 min |
| 2 | Set up Docker Compose (PostgreSQL) | — | 15 min |
| 3 | Configure environment variables and configs | 1 | 15 min |
| 4 | Implement shared types library (DTOs, enums, sport categories) | 1 | 45 min |
| 5 | Implement Domain Layer — entities & value objects (sport-category-aware) | 4 | 1.5 hr |
| 6 | Implement Domain Layer — domain services (ELO, ensemble, confidence — per sport category) | 5 | 1.5 hr |
| 7 | Implement Domain Layer — output port interfaces (incl. SportRepositoryPort) | 5 | 30 min |
| 8 | Implement Application Layer — use case interfaces (incl. SyncSports) | 7 | 30 min |
| 9 | Implement Application Layer — application services with multi-sport orchestration | 6, 8 | 2 hr |
| 10 | Implement Infrastructure — TypeORM entities & mappers (incl. sports table) | 5 | 1 hr |
| 11 | Implement Infrastructure — TypeORM repositories | 7, 10 | 1 hr |
| 12 | Implement Infrastructure — The Odds API adapter (multi-sport, sport discovery) | 7 | 1.5 hr |
| 13 | Implement Infrastructure — Prediction model adapters (ELO, form, odds — category-aware) | 7 | 2 hr |
| 14 | Implement Infrastructure — REST controllers (sport filtering, /api/sports) | 8 | 1 hr |
| 15 | Implement Infrastructure — Cron schedulers (iterates all active sports) | 8 | 45 min |
| 16 | Implement Infrastructure — Quota manager & caching | 12 | 45 min |
| 17 | Wire up NestJS DI modules | 9–16 | 45 min |
| 18 | Unit tests for domain services | 6 | 1 hr |
| 19 | Integration test: full multi-sport prediction pipeline | 17 | 1 hr |
| 20 | Angular — Design system (SCSS variables, global styles) | 1 | 45 min |
| 21 | Angular — Shared components (prediction card, confidence badge, sport icon, etc.) | 20 | 2.5 hr |
| 22 | Angular — API service + proxy config (sport-aware endpoints) | 1 | 30 min |
| 23 | Angular — Dashboard page (multi-sport, group tabs) | 21, 22 | 2.5 hr |
| 24 | Angular — Predictions list page (filter by sport, group, date) | 21, 22 | 2 hr |
| 25 | Angular — Accuracy page (per-sport breakdowns, charts) | 21, 22 | 2 hr |
| 26 | Angular — Sports browser page (browse all sports, see status) | 21, 22 | 1 hr |
| 27 | Angular — Responsive design & animations | 23–26 | 1.5 hr |
| 28 | Docker configuration for Render deployment | 17 | 30 min |
| 29 | Deploy to Render | 28 | 30 min |
| | **Total Estimated** | | **~28 hours** |

---

## Next Step

**Ready to start with Task #1: Scaffold the Nx workspace.**
