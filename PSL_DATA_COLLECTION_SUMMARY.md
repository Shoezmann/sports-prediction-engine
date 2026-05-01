# South African PSL Data Collection - Implementation Summary

## What Was Built

A comprehensive data collection system specifically for **South African football (PSL)** from **1996 to present day**. This system enables aggressive data scraping and bulk importing to build a rich historical dataset.

## Files Created

### **1. Entities (Database Schema)**
- `match-statistics.orm-entity.ts` - Detailed match statistics (goals, xG, possession, cards, corners, etc.)
- `player.orm-entity.ts` - Player information and career statistics
- `coach.orm-entity.ts` - Coach/manager information and records

### **2. Repositories**
- `pg-match-statistics.repository.ts` - Match statistics data access
- `pg-player.repository.ts` - Player data access
- `pg-coach.repository.ts` - Coach data access

### **3. PSL Data Collection System**
Located in `/apps/backend/src/data-ingestion/psl/`:

- `psl-historical-scraper.service.ts` - Scrapes FlashScore API for historical match data
- `psl-historical-teams.seeds.ts` - All PSL teams from 1996-2026 with aliases
- `psl-historical-data-seeder.service.ts` - Seeds baseline PSL data and sample matches
- `historical-data-importer.service.ts` - Bulk CSV/JSON import functionality
- `psl-data-ingestion.service.ts` - Orchestrates all PSL data collection
- `psl-data-ingestion.controller.ts` - Admin API endpoints
- `psl-data-ingestion.module.ts` - NestJS module configuration
- `sample-psl-data.json` - Example data import file
- `README.md` - Comprehensive documentation

### **4. Module Integration**
Updated:
- `infrastructure.module.ts` - Added new entities and repositories
- `entities/index.ts` - Export new entities
- `repositories/index.ts` - Export new repositories

## Data Coverage

### **Tournaments**
1. **PSL** (Premier Soccer League) - 1996/1997 to present
2. **Nedbank Cup** - 1971/1972 to present
3. **MTN 8** - 1972/1973 to present
4. **Carling Knockout** - 2014/2015 to present
5. **Telkom Knockout** - 1982/1983 to 2020/2021 (defunct)

### **Teams Tracked**
- **40+ historical teams** including:
  - Current PSL teams (16 active)
  - Defunct clubs (Bloemfontein Celtic, Platinum Stars, etc.)
  - Renamed/merged clubs
  - Comprehensive name aliasing (100+ variants)

### **Statistics Per Match**
- Goals (full-time and half-time)
- Expected goals (xG)
- Shots (total, on target, off target, blocked)
- Possession percentage
- Passes and accuracy
- Corners, crosses, offsides
- Tackles, clearances, interceptions
- Fouls, cards (yellow/red)
- Saves
- Set pieces (free kicks, throw-ins, goal kicks)
- Venue, attendance, referee

### **Player Data**
- Personal info (name, DOB, nationality, position)
- Career statistics (appearances, goals, assists, cards)
- Season performance
- Advanced metrics (xG, xA, per-90 stats)
- Physical attributes (height, weight, foot)
- Market value and contract

### **Coach Data**
- Personal info and nationality
- Career win/loss records
- Trophies and achievements
- Tactical preferences (formations, style)
- Coaching history
- Season performance

## API Endpoints

All endpoints require admin authentication:

```bash
# Scrape all historical data (1996-2026)
POST /api/admin/psl/scrape-all

# Scrape specific season
POST /api/admin/psl/scrape-season?season=2023/2024

# Import from JSON file
POST /api/admin/psl/import-json
Body: { "filePath": "/path/to/data.json" }

# Import from CSV file
POST /api/admin/psl/import-csv
Body: { "filePath": "/path/to/data.csv" }

# Import from directory
POST /api/admin/psl/import-directory
Body: { "directoryPath": "/path/to/data-dir" }

# Seed sample matches (for testing)
POST /api/admin/psl/seed-sample?seasons=3

# Get data summary
GET /api/admin/psl/summary
```

## How to Use

### **1. Seed Baseline PSL Data**

The system automatically seeds PSL teams and tournaments on startup in development mode. This includes:
- All 40+ historical PSL teams
- Tournament configurations
- Team name aliases

### **2. Import Historical Data**

Create a JSON file with your historical match data:

```json
[
  {
    "date": "1996-08-10",
    "homeTeam": "Mamelodi Sundowns",
    "awayTeam": "Orlando Pirates",
    "homeScore": 2,
    "awayScore": 1,
    "htHomeScore": 1,
    "htAwayScore": 0,
    "season": "1996/1997",
    "round": "Round 1",
    "venue": "Loftus Versfeld Stadium",
    "attendance": 25000
  }
]
```

Then import it:

```bash
curl -X POST http://localhost:3000/api/admin/psl/import-json \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/psl-1996-2000.json"}'
```

### **3. Scrape FlashScore**

If you have a FlashScore RapidAPI key:

```bash
# Set your API key
export SCRAPER_RAPIDAPI_KEY=your_key_here

# Scrape all seasons
curl -X POST http://localhost:3000/api/admin/psl/scrape-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Scrape specific season
curl -X POST http://localhost:3000/api/admin/psl/scrape-season?season=2023/2024 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### **4. Generate Sample Data (Testing)**

```bash
curl -X POST http://localhost:3000/api/admin/psl/seed-sample?seasons=3 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

This generates realistic sample match data for the last 3 seasons.

## Next Steps for Data Collection

### **Immediate Actions**

1. **Get FlashScore API Key**
   - Sign up at https://rapidapi.com/
   - Subscribe to FlashScore API
   - Set `SCRAPER_RAPIDAPI_KEY` environment variable

2. **Gather Historical Data Sources**
   - Download historical data from:
     - RSSSF (https://www.rsssf.org/)
     - Wikipedia PSL season articles
     - PSL official website (https://www.psl.co.za/)
   - Format as JSON/CSV and import

3. **Import Existing Data**
   - If you have any historical PSL data files, use the bulk importer
   - The system handles team name aliases automatically

### **Data Enrichment**

4. **Add Player-Level Data**
   - Scrape player statistics from external sources
   - Import player match-by-match performance
   - Track injuries, transfers, suspensions

5. **Add Advanced Statistics**
   - xG (expected goals) data
   - Possession and passing stats
   - Defensive metrics
   - Set piece data

6. **Historical ELO Ratings**
   - Calculate retrospective ELO ratings for all seasons
   - Track team strength over time

### **Expert Report Features**

7. **Build Report Generator**
   - On-demand match reports
   - Team performance reports
   - Player comparison tools
   - Head-to-head analysis
   - Form guides and streaks

8. **User Query System**
   - User asks: "Man City vs Arsenal"
   - System returns: Full breakdown with stats, history, predictions
   - Similar for players, teams, tournaments

## Data Sources to Explore

### **Free Sources**
1. **RSSSF** - Historical results for PSL since 1996
2. **Wikipedia** - Season articles with tables and stats
3. **FlashScore** - Live and historical match data
4. **Soccerway** - Match data and statistics
5. **FBref** - Advanced statistics (limited for PSL)

### **Paid Sources (Optional)**
1. **Opta** - Professional-grade data
2. **StatsPerform** - Advanced analytics
3. **Sportradar** - Comprehensive coverage

## Team Alias System

The system includes comprehensive team name mapping:

```typescript
// Examples
'Mamelodi Sundowns FC' → 'Mamelodi Sundowns'
'Pirates' → 'Orlando Pirates'
'Chiefs' → 'Kaizer Chiefs'
'Bloemfontein Celtic' → 'Bloemfontein Celtic' (defunct)
'Platinum Stars' → 'Platinum Stars' (defunct)
```

This ensures data from different sources can be normalized and matched correctly.

## Database Schema

### **New Tables Created**
1. `match_statistics` - Detailed match stats
2. `players` - Player information and stats
3. `coaches` - Coach/manager information

### **Existing Tables Enhanced**
- `teams` - Now includes PSL historical teams
- `games` - Now supports historical PSL matches

## Configuration

Required environment variables:

```bash
# FlashScore API (for scraping)
SCRAPER_RAPIDAPI_KEY=your_rapidapi_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sports_prediction_engine

# Node environment
NODE_ENV=development  # Auto-seeds on startup
```

## Sample Data

A sample data file is provided at:
`apps/backend/src/data-ingestion/psl/sample-psl-data.json`

This demonstrates the expected JSON format for bulk imports.

## Architecture

```
External APIs (FlashScore, PSL.co.za)
        |
        v
┌─────────────────────────────┐
│  PslHistoricalScraper       │  Scrapes FlashScore API
│  HistoricalDataImporter     │  Bulk CSV/JSON imports
│  PslDataIngestionService    │  Orchestrates collection
│  PslHistoricalDataSeeder    │  Seeds baseline data
└─────────────────────────────┘
        |
        v
┌─────────────────────────────┐
│  PostgreSQL Database         │
│  - teams (40+ PSL teams)    │
│  - games (historical)        │
│  - match_statistics          │
│  - players                   │
│  - coaches                   │
└─────────────────────────────┘
```

## Testing the System

### **1. Verify Build**
```bash
npm run build
```

### **2. Start Backend**
```bash
npm start backend
```

The system will automatically:
- Seed PSL teams on startup
- Create tournament configurations
- Log seeding progress

### **3. Test API Endpoints**
```bash
# Check summary
curl http://localhost:3000/api/admin/psl/summary

# Seed sample data
curl -X POST http://localhost:3000/api/admin/psl/seed-sample?seasons=3

# Import sample file
curl -X POST http://localhost:3000/api/admin/psl/import-json \
  -H "Content-Type: application/json" \
  -d '{"filePath": "apps/backend/src/data-ingestion/psl/sample-psl-data.json"}'
```

## Future Enhancements

1. **Web Scraping** - Build scrapers for PSL website, FlashScore web
2. **PDF Parsing** - Parse historical season reports
3. **API Integrations** - Connect to Opta, StatsPerform
4. **Crowdsourcing** - Allow users to submit historical data
5. **Data Validation** - Cross-reference multiple sources
6. **Real-time Updates** - Live match statistics
7. **Expert Reports** - On-demand comprehensive match/team reports

## Success Metrics

Track these metrics to measure data collection progress:

- ✅ **Teams**: 40+ historical PSL teams seeded
- ✅ **Tournaments**: 5 SA tournaments configured
- ⏳ **Historical Matches**: Target 5,000+ matches (1996-2026)
- ⏳ **Match Statistics**: Target xG, possession, shots for 80%+ matches
- ⏳ **Players**: Target 500+ players with full statistics
- ⏳ **Coaches**: Target 50+ coaches with career records

## Support & Documentation

- Full README: `/apps/backend/src/data-ingestion/psl/README.md`
- API documentation: See "API Endpoints" section above
- Sample data: `sample-psl-data.json`
- Team aliases: `psl-historical-teams.seeds.ts`

---

**Built**: April 15, 2026
**Status**: ✅ Complete and production-ready
**Next**: Start importing historical data from external sources
