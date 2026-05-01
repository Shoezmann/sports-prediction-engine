# 🚀 World-Class Readiness Roadmap

> **Goal:** Transform PredictEngine from a solid prototype into a production-grade, world-class sports prediction platform.
> **Approach:** Phased delivery, each phase ships independently valuable.

---

## Phase 0: Production Foundation (Weeks 1-2)
**Theme:** "Make it deployable, observable, and secure"

### 0.1 Containerization & Deployment
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Create `apps/backend/Dockerfile` | 🔴 Critical | Medium | Multi-stage build: Node 20 slim → build → runtime. Expose port 3000. Health check endpoint. |
| Create `apps/frontend/Dockerfile` | 🔴 Critical | Medium | Multi-stage build: Angular build → Nginx serve static. Proxy API to backend. |
| Add `docker-compose.yml` profiles | 🔴 Critical | Low | `dev`: PostgreSQL only. `full`: + backend + frontend. Include health checks. |
| Add `.dockerignore` files | 🔴 Critical | Low | Exclude `node_modules`, `.git`, `.nx/cache`, coverage, etc. |
| **Deliverable:** `docker compose --profile full up` starts everything |

### 0.2 CI/CD Pipeline Fixes
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Create `jest.preset.js` | 🔴 Critical | Low | Missing file referenced by `backend-e2e/jest.config.cts`. Copy from Nx preset or create minimal. |
| Fix Docker build stage in CI | 🔴 Critical | Low | Workflow references Dockerfiles that don't exist (now resolved by 0.1). |
| Add test coverage thresholds | 🟡 High | Low | Backend: 60% minimum. Frontend: 40% minimum (grows over time). |
| Add lint-staged + Husky | 🟡 High | Low | Pre-commit: lint + format staged files. Prevents broken commits. |
| **Deliverable:** `main` branch always green, every PR has tests + lint checks |

### 0.3 Security Hardening
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Implement real password reset flow | 🔴 Critical | Medium | Generate secure token, store with expiry, send via email service. Use `nodemailer` (already a dependency). |
| Add rate limiting on auth endpoints | 🔴 Critical | Medium | Use `@nestjs/throttler`. Login: 5 req/min. Register: 3 req/min. Password reset: 2 req/hour. |
| Configure CORS properly | 🔴 Critical | Low | Explicit whitelist of frontend origin. No wildcards. Handle preflight. |
| Add JWT refresh tokens | 🟡 High | Medium | Current JWT has no refresh. Add refresh token table in DB, `/auth/refresh` endpoint, auto-rotate on use. |
| Add input sanitization middleware | 🟡 High | Low | Beyond `class-validator`, sanitize HTML in user-facing strings. Use `dompurify` or similar. |
| Add role-based access control | 🟢 Medium | Medium | `USER`, `ADMIN` roles. Admin-only: trigger ML training, backfill results, view system status. |
| **Deliverable:** Security audit passes, OWASP Top 10 addressed |

### 0.4 Observability & Monitoring
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Add structured logging | 🔴 Critical | Medium | Replace `console.log` with `winston` or `pino`. JSON format, correlation IDs per request, log levels by env. |
| Add error tracking (Sentry) | 🟡 High | Medium | Integrate `@sentry/node` (backend) + `@sentry/angular` (frontend). Capture unhandled exceptions, user context. |
| Add request ID middleware | 🟡 High | Low | Generate `X-Request-ID` on ingress, propagate through all logs and external API calls. |
| Add basic Prometheus metrics | 🟢 Medium | Medium | `@willsoto/nestjs-prometheus`. Metrics: prediction count, accuracy rate, API latency, error rate, queue depth. |
| **Deliverable:** Dashboard with real-time error tracking, request metrics, structured logs |

---

## Phase 1: Testing Infrastructure (Weeks 3-5)
**Theme:** "If it's not tested, it's broken"

### 1.1 Backend API Tests (Highest ROI)
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| `SportsController` tests | 🔴 Critical | Low | Test `POST /api/sports/sync`. Mock `SyncSportsUseCase`. Verify response shape. |
| `GamesController` tests | 🔴 Critical | Low | Test `POST /api/games/sync` with/without sport param. |
| `PredictionsController` tests | 🔴 Critical | Medium | Test all 5 endpoints: generate, pending, resolved, stats, summary. Verify stats calculations. |
| `ResultsController` tests | 🔴 Critical | Medium | Test `POST /api/results/update` and `POST /api/results/backfill`. |
| `AuthController` tests | 🔴 Critical | Medium | Test register, login, forgot-password, reset-password. Verify error cases (duplicate email, wrong password). |
| `BetsController` tests | 🔴 Critical | Medium | Test place bet + get bets WITH auth header. Verify unauthorized access returns 401. |
| `AccuracyController` tests | 🟡 High | Low | Test `GET /api/accuracy` with/without sport param. |
| `LiveScoresController` tests | 🟡 High | Low | Test `GET /api/live-scores`. Mock scraper service. |
| `MLTrainingController` tests | 🟡 High | Low | Test `POST /api/ml/train` and `GET /api/ml/health`. |
| **Deliverable:** Every endpoint has at least 1 happy-path + 1 error-case test |

### 1.2 Backend Domain & Service Tests
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| `Prediction` entity tests | 🔴 Critical | Low | Already have Game + Team. Add Prediction: create, resolve, grade accuracy. |
| `Bet` entity tests | 🟡 High | Low | Create, settle won/lost, calculate payout. |
| `GoalsPredictor` tests | 🟡 High | Medium | Verify league averages, over/under logic, BTTS calculations. |
| `ELO Calculator` parameterized tests | 🟡 High | Low | Already tested, but add sport-specific K-factor and home-advantage parameterized tests. |
| `Form Model Adapter` tests | 🟡 High | Medium | Test form window calculations, home/away multipliers, sigmoid curve. |
| `Odds Implied Model` tests | 🟡 High | Medium | Test overround removal, probability normalization, fuzzy team matching. |
| `ML Model Adapter` tests | 🟢 Medium | Medium | Test Python subprocess invocation, output parsing, fallback behavior. |
| **Deliverable:** All domain logic has unit tests with edge cases covered |

### 1.3 Backend Integration & E2E Tests
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Fix existing E2E setup | 🔴 Critical | Low | `jest.preset.js` missing. Fix `global-setup`, `test-setup`. |
| Auth flow E2E test | 🔴 Critical | Medium | Register → login → get token → place bet → get bets. Full HTTP-level test. |
| Prediction pipeline E2E test | 🔴 Critical | High | Sync sport → sync games → generate predictions → get pending. Verify data flows correctly. |
| Result update E2E test | 🟡 High | High | Create game → update results → verify predictions graded → verify accuracy updated. |
| Database repository tests | 🟡 High | Medium | Test PG repositories: save, find, update, batch operations. Use test DB with transactions + rollback. |
| **Deliverable:** Critical user journeys tested end-to-end via HTTP |

### 1.4 Frontend Tests
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Set up Jest + Testing Library for Angular | 🔴 Critical | Low | `@testing-library/angular`, `jest-preset-angular`. Configure in `project.json`. |
| `LoginPage` component tests | 🔴 Critical | Low | Form validation, submit calls auth service, error display, redirect on success. |
| `RegisterPage` component tests | 🔴 Critical | Low | Form validation, password requirements, submit calls register service. |
| `PredictionsPage` tests | 🟡 High | Medium | Grid renders, filters work, "Place Bet" button opens bet slip. |
| `LivePage` tests | 🟡 High | Medium | SSE connection established, live cards render, updates propagate. |
| `MyTrackerPage` tests | 🟡 High | Medium | Stats cards display correct values, tabs switch, data loads from API. |
| `BetSlipComponent` tests | 🟡 High | Medium | Add/remove predictions, stake input, payout calculation, submit bet. |
| `AuthService` tests | 🟡 High | Low | Login/register call API, store/retrieve token, logout clears storage. |
| `authGuard` tests | 🟡 High | Low | Redirects to login when unauthenticated, allows when authenticated. |
| `authInterceptor` tests | 🟡 High | Low | Attaches token to requests, skips auth endpoints. |
| **Deliverable:** All pages have tests, critical services tested |

---

## Phase 2: Data & Reliability (Weeks 6-8)
**Theme:** "Garbage in, garbage out — fix the data pipeline"

### 2.1 Database Migrations & Seeding
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Set up TypeORM migrations | 🔴 Critical | Medium | `typeorm migration:generate` workflow. Migration files in `apps/backend/src/infrastructure/persistence/migrations/`. |
| Add database indexes | 🔴 Critical | Low | Indexes on: `game.external_id`, `game.commence_time`, `prediction.status`, `prediction.sport_key`, `bet.user_id`, `user.email` (unique). |
| Create seed scripts | 🟡 High | Medium | Seed 5 sports, 20 teams, 50 games (mix of upcoming + completed), 100 predictions. For local dev + tests. |
| Add migration to CI/CD | 🟡 High | Low | Auto-run migrations on deploy. Use `typeorm migration:run` in Docker entrypoint. |
| **Deliverable:** Zero-downtime deploys with proper migration strategy |

### 2.2 Data Validation Layer
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| API response schema validation | 🔴 Critical | Medium | Use `zod` or `class-validator` to validate The Odds API responses. Alert on schema drift. |
| Team canonical ID mapping | 🔴 Critical | High | Build `team_aliases` table: `"Man Utd" → "Manchester United"`. Fuzzy matching → manual curation. |
| External API error handling | 🔴 Critical | Medium | Retry with exponential backoff on 429/5xx. Circuit breaker pattern for repeated failures. |
| Data freshness monitoring | 🟡 High | Medium | Alert when no new predictions in 24h, no results updated in 48h, API quota < 50. |
| **Deliverable:** Data pipeline handles failures gracefully, no silent corruption |

### 2.3 Historical Data Backfill (Unblocks ML)
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Expand `HistoricalBackfillUseCase` | 🔴 Critical | High | Current implementation uses The Odds API. Add FlashScore/Soccerway scraper for historical results. |
| Build team name reconciliation | 🔴 Critical | Medium | Map scraper team names → canonical names → Odds API names. |
| Backfill 12 months of data | 🟡 High | Low | Run backfill for top 5 leagues (EPL, La Liga, Bundesliga, Serie A, Ligue 1). |
| Validate backfilled data | 🟡 High | Medium | Spot-check 20 matches. Verify scores, odds, dates. |
| **Deliverable:** 500+ historical matches in DB, ready for ML training |

### 2.4 Caching Layer
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Add Redis | 🔴 Critical | Medium | Docker service + `ioredis` client. Cache: pending predictions (5 min), accuracy stats (15 min), live scores (30 sec), sports list (1 hour). |
| Add cache invalidation | 🔴 Critical | Low | Invalidate predictions cache on generate, accuracy cache on results update. |
| Add cache-aside pattern | 🟡 High | Low | Check cache → miss → query DB → populate cache → return. |
| **Deliverable:** 70% reduction in DB reads, faster API responses |

---

## Phase 3: ML Platform Maturity (Weeks 9-12)
**Theme:** "From experimental to production ML"

### 3.1 Model Management
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Model versioning (MLflow or DVC) | 🔴 Critical | High | Track model artifacts, hyperparameters, metrics per training run. REST API to load specific version. |
| Feature store | 🔴 Critical | High | Persist computed features (rolling ELO, form, H2H) in dedicated table. Avoid recomputation. Enable point-in-time correctness. |
| Model registry endpoint | 🟡 High | Medium | `/api/ml/models` — list available models by sport, version, accuracy, training date. |
| A/B testing framework | 🟢 Medium | High | Serve predictions from model A and B simultaneously. Compare accuracy over N matches. Promote winner. |
| **Deliverable:** Every model version tracked, reproducible training, feature reuse |

### 3.2 Model Quality & Monitoring
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| SHAP feature importance | 🟡 High | Medium | Generate SHAP values post-training. Store top 10 features per sport. Display in UI ("Why this prediction?"). |
| Prediction drift detection | 🟡 High | Medium | Alert when ensemble confidence distribution shifts > 2σ from 30-day average. |
| Model degradation alerts | 🟡 High | Medium | Alert when rolling accuracy drops below 30-day average by > 5%. |
| Hyperparameter optimization | 🟢 Medium | Medium | Use Optuna or grid search. Track best params per sport. Run weekly alongside training. |
| Confidence calibration | 🟢 Medium | Medium | Platt scaling or isotonic regression. Ensure "60% confidence" means ~60% correct. |
| **Deliverable:** Data-driven model decisions, explainable predictions |

### 3.3 Advanced ML Features
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Sport-specific feature engineering | 🟡 High | High | Soccer: xG, corners, cards. Basketball: pace, offensive/defensive rating. Tennis: surface, serve stats. |
| Ensemble model stacking | 🟢 Medium | High | Meta-model that learns optimal weights (instead of fixed %). Train on validation set. |
| Live in-play predictions | 🟢 Medium | High | Update predictions during match based on live score, time elapsed, events. |
| Player-level features | 🟢 Low | Very High | Injury data, suspensions, lineup info. Requires additional data sources. |
| **Deliverable:** Higher accuracy, more granular predictions |

---

## Phase 4: User Experience & Features (Weeks 13-16)
**Theme:** "Make users love it"

### 4.1 Notifications & Alerts
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Email notifications | 🔴 Critical | Medium | Prediction resolved (won/lost), high-confidence picks, weekly performance summary. Use existing `nodemailer`. |
| In-app notifications | 🟡 High | Medium | Toast notifications for live score changes, prediction results. Bell icon with unread count. |
| Push notifications (PWA) | 🟢 Medium | High | Service worker, web push protocol. User opts in for favorite sports/teams. |
| **Deliverable:** Users stay engaged without constantly checking the dashboard |

### 4.2 Export & Reporting
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| CSV export | 🟡 High | Low | Export predictions, bets, performance data. Add "Export" button on relevant pages. |
| PDF report generation | 🟢 Medium | Medium | Weekly/monthly performance report: accuracy, profit/loss, top leagues, model breakdown. |
| API for external tools | 🟢 Medium | Medium | Public API with API key auth. Allow third-party tools to query predictions programmatically. |
| **Deliverable:** Data portability, professional reporting |

### 4.3 User Preferences & Personalization
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Favorite sports/leagues | 🟡 High | Medium | User selects interests. Dashboard shows favorites first. Filter defaults to favorites. |
| Notification settings | 🟡 High | Low | Toggle email/push notifications per sport, per event type (win/loss/live). |
| Custom confidence threshold | 🟢 Medium | Low | User sets minimum confidence to display. "Only show me predictions ≥ 65% confidence." |
| Dark/light theme persistence | ✅ Done | — | Already implemented with localStorage. |
| **Deliverable:** Personalized experience per user |

### 4.4 Bankroll & Profit Tracking
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Bankroll management | 🔴 Critical | Medium | User sets starting bankroll. Track stake per bet. Calculate ROI, profit/loss over time. |
| Profit/loss chart | 🟡 High | Medium | Line chart showing bankroll over time. Compare against flat-bet baseline. |
| Betting strategy presets | 🟢 Medium | Medium | Kelly criterion, flat stake, % of bankroll. Auto-calculate optimal stake. |
| **Deliverable:** Users know if they're actually profitable |

### 4.5 Odds Movement & Market Analysis
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Odds history tracking | 🟡 High | Medium | Store odds snapshots at prediction time, 24h before kickoff, at kickoff. Show movement in UI. |
| Value bet highlighting | 🟡 High | Low | Flag predictions where model probability > implied probability by > 5%. Show expected value. |
| Bookmaker comparison | 🟢 Medium | Medium | Show odds from multiple bookmakers side-by-side. Highlight best odds. |
| **Deliverable:** Users identify value bets, not just likely outcomes |

---

## Phase 5: Performance & Scale (Weeks 17-20)
**Theme:** "Handle the load"

### 5.1 API Performance
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Pagination on all list endpoints | 🔴 Critical | Medium | `GET /predictions/pending?page=1&limit=50`. Return `total`, `hasNext`, `hasPrev`. |
| Query optimization | 🔴 Critical | Low | Add `EXPLAIN ANALYZE` to slow queries. Optimize TypeORM relations (use `SELECT` instead of `JOIN` where possible). |
| Response compression | 🟡 High | Low | Enable `compression` middleware in NestJS. Gzip/Brotli for responses > 1KB. |
| **Deliverable:** API responses < 200ms for p95, < 500ms for p99 |

### 5.2 Background Job Queue
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Replace cron with BullMQ | 🔴 Critical | High | Current `@nestjs/schedule` runs in-process. BullMQ with Redis backend: persistent jobs, retries, concurrency control, failure alerts. |
| Job dashboard | 🟡 High | Medium | `/admin/jobs` — view pending/running/failed jobs. Retry failed jobs manually. |
| Job prioritization | 🟡 High | Low | Results update > predictions generate > sync sports > ML training. |
| **Deliverable:** Resilient scheduling, survives restarts, observable job state |

### 5.3 Frontend Performance
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| AG Grid virtual scrolling | 🔴 Critical | Low | Already using AG Grid. Ensure `rowModelType: 'infinite'` for large datasets. |
| Route-level code splitting | 🟡 High | Low | Angular lazy-loads routes by default. Verify bundle sizes with `source-map-explorer`. |
| CDN for static assets | 🟡 High | Low | Deploy frontend to Vercel/Cloudflare Pages. Cache HTML/CSS/JS at edge. |
| Image optimization | 🟢 Low | Low | No images currently, but future-proof: use `ng-img` directive, WebP format. |
| **Deliverable:** Lighthouse score > 90 on all metrics |

### 5.4 Database Scalability
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| PgBouncer connection pooling | 🟡 High | Medium | Transaction-level pooling. Reduces connection overhead under load. |
| Read replicas (future) | 🟢 Low | High | Separate read/write connections. Route all SELECTs to replica. |
| Data archival strategy | 🟢 Low | Medium | Move predictions > 1 year old to archive table. Keep active table small. |
| **Deliverable:** Database handles 10x current load without degradation |

---

## Phase 6: Developer Experience & Community (Weeks 21-24)
**Theme:** "Make it easy to contribute and maintain"

### 6.1 Documentation
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Auto-generated API docs | 🔴 Critical | Low | Enable Swagger UI at `/api/docs`. Already have `@nestjs/swagger` decorators — just need `SwaggerModule.setup()`. |
| Update README with setup guide | 🔴 Critical | Low | Prerequisites, 1-command setup (`docker compose up`), run tests, common troubleshooting. |
| Architecture Decision Records | 🟡 High | Medium | `docs/adr/` — document why NestJS, why Angular, why hexagonal architecture, why XGBoost. |
| `CONTRIBUTING.md` | 🟡 High | Low | Coding standards, PR template, branch strategy, how to run tests, how to add a new sport. |
| `CHANGELOG.md` | 🟡 High | Low | Semantic versioning, release notes format. |
| **Deliverable:** New developer can onboard in < 30 minutes |

### 6.2 Local Development Experience
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| One-command setup | 🔴 Critical | Low | `make dev` or `npm run setup` — installs deps, runs migrations, seeds data, starts all services. |
| Seed data for local dev | 🔴 Critical | Medium | 10 sports, 50 teams, 200 games, 500 predictions. Realistic data for testing UI. |
| Nx affected commands | 🟡 High | Low | `nx affected:test`, `nx affected:build` — only test/build changed apps/libs. |
| VS Code workspace settings | 🟡 High | Low | Recommended extensions, debug configurations, tasks.json for common operations. |
| **Deliverable:** `git clone` → working app in < 5 minutes |

### 6.3 Open Source Readiness
| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Add LICENSE file | 🔴 Critical | Low | README says MIT but no LICENSE file exists. |
| Code of Conduct | 🟢 Medium | Low | `CODE_OF_CONDUCT.md` — Contributor Covenant. |
| Issue templates | 🟡 High | Low | `.github/ISSUE_TEMPLATE/` — Bug report, Feature request, New sport request. |
| PR template | 🟡 High | Low | `.github/PULL_REQUEST_TEMPLATE.md` — Checklist, testing confirmation, screenshots. |
| Release automation | 🟢 Medium | Medium | Tag-based releases. Auto-generate changelog, create GitHub release. |
| **Deliverable:** Professional open-source project ready for community contributions |

---

## Summary: Priority Matrix

### 🔴 Do Now (Weeks 1-8) — "Ship it right"
- Dockerize everything
- Fix CI/CD pipeline
- Security hardening (rate limiting, CORS, password reset, RBAC)
- Backend API tests (every endpoint)
- Frontend component tests (all pages)
- Database migrations + indexes
- Data validation + error handling
- Redis caching
- Historical data backfill

### 🟡 Do Next (Weeks 9-16) — "Make it excellent"
- Model versioning + feature store
- ML monitoring (drift, degradation, SHAP)
- Email notifications
- CSV export
- User preferences
- Bankroll management
- Odds history + value bet detection
- Background job queue (BullMQ)
- Pagination on all endpoints

### 🟢 Do Later (Weeks 17-24) — "Make it legendary"
- A/B testing for models
- In-play live predictions
- Profit/loss analytics
- PWA push notifications
- Read replicas + PgBouncer
- CDN deployment
- Auto-generated API docs
- Full contributor docs
- Open-source release automation

---

## Estimated Effort Summary

| Phase | Duration | Tasks | Cumulative |
|-------|----------|-------|------------|
| Phase 0: Production Foundation | 2 weeks | 18 tasks | 18 |
| Phase 1: Testing Infrastructure | 3 weeks | 34 tasks | 52 |
| Phase 2: Data & Reliability | 3 weeks | 16 tasks | 68 |
| Phase 3: ML Platform Maturity | 4 weeks | 15 tasks | 83 |
| Phase 4: UX & Features | 4 weeks | 20 tasks | 103 |
| Phase 5: Performance & Scale | 4 weeks | 15 tasks | 118 |
| Phase 6: DevEx & Community | 4 weeks | 16 tasks | 134 |

**Total: ~24 weeks to world-class** (can be accelerated with parallel work or a team)

---

## Quick Wins (< 1 day each, do these first)

1. Add `LICENSE` file (MIT)
2. Enable Swagger UI at `/api/docs` (5 lines of code)
3. Add `.dockerignore` files
4. Add `jest.preset.js` to fix CI
5. Add database indexes (3-4 index decorators)
6. Add response compression (`compression` middleware)
7. Add `CONTRIBUTING.md`
8. Create seed script for local dev
9. Add rate limiting to auth endpoints
10. Replace `console.log` with structured logger

---

## Next Steps

1. **Review this roadmap** — prioritize based on business needs
2. **Pick Phase 0** — I can start implementing immediately
3. **Set up tracking** — Use GitHub Projects or Issues to track progress
4. **Iterate** — Each phase delivers independently; no need to complete all before shipping

Shall I begin with Phase 0, or would you like to adjust priorities?
