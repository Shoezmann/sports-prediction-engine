# South African PSL Data Collection System

## Overview

Comprehensive data collection system for South African football from **1996 to present day**. This system enables aggressive scraping and bulk importing of historical match data, player statistics, team information, and coach/manager data.

## What We're Collecting

### 1. **Historical Match Data (1996-2026)**
- All PSL matches from inception (1996/1997 season)
- Score lines (full-time and half-time)
- Match dates, venues, attendance
- Referee information
- Round/matchday information

### 2. **Advanced Match Statistics** (when available)
- **Goals & Scoring**: Goals, xG (expected goals), shots, shots on target
- **Possession & Passing**: Possession %, passes, pass accuracy
- **Attacking**: Corners, crosses, offsides, attacks, dangerous attacks
- **Defending**: Tackles, clearances, interceptions
- **Discipline**: Fouls, yellow cards, red cards
- **Goalkeeping**: Saves
- **Set Pieces**: Free kicks, throw-ins, goal kicks

### 3. **Team Data**
- All PSL teams since 1996 (including defunct clubs)
- Team name aliases and historical names
- ELO ratings
- First/last season in PSL
- Club status (active/defunct/merged)

### 4. **Player Statistics**
- Personal information (name, DOB, nationality, position)
- Career statistics (appearances, goals, assists, cards)
- Season-by-season performance
- Advanced metrics (xG, xA, goals per 90, pass accuracy)
- Physical attributes (height, weight, preferred foot)
- Market value and contract information

### 5. **Coach/Manager Data**
- Personal information and nationality
- Career win/loss records
- Trophies and achievements
- Tactical preferences (formations, playing style)
- Coaching history
- Current season performance

## South African Tournaments Covered

### **Primary Tournaments**
1. **PSL (Premier Soccer League)** - 1996/1997 to present
   - Top-tier South African league
   - 16-18 teams per season

### **Cup Competitions**
2. **Nedbank Cup** - 1971/1972 to present
   - Major domestic cup competition
   - Open to all divisions

3. **MTN 8** - 1972/1973 to present
   - Top 8 teams from previous season
   - Knockout format

4. **Carling Knockout Cup** - 2014/2015 to present
   - Sponsored cup competition

5. **Telkom Knockout** - 1982/1983 to 2020/2021
   - Defunct cup competition

## Architecture

### **Entities Created**
- `MatchStatisticsEntity` - Detailed match statistics
- `PlayerEntity` - Player information and statistics
- `CoachEntity` - Coach/manager information and records

### **Services Created**
1. `PslHistoricalScraper` - Scrapes FlashScore for historical data
2. `HistoricalDataImporter` - Bulk imports from CSV/JSON files
3. `PslDataIngestionService` - Orchestrates all PSL data collection
4. `PslDataIngestionController` - Admin API endpoints

### **Repositories**
- `PgMatchStatisticsRepository`
- `PgPlayerRepository`
- `PgCoachRepository`

## API Endpoints

All endpoints are under `/api/admin/psl/` and require admin authentication.

### **Scraping Endpoints**

#### Scrape All Historical Data (1996-2026)
```bash
POST /api/admin/psl/scrape-all
```
Scrapes all PSL seasons from FlashScore API.

#### Scrape Specific Season
```bash
POST /api/admin/psl/scrape-season?season=2023/2024
```
Scrapes a specific season.

### **Import Endpoints**

#### Import from JSON File
```bash
POST /api/admin/psl/import-json
Content-Type: application/json

{
  "filePath": "/path/to/historical-data.json"
}
```

#### Import from CSV File
```bash
POST /api/admin/psl/import-csv
Content-Type: application/json

{
  "filePath": "/path/to/historical-data.csv"
}
```

#### Import from Directory
```bash
POST /api/admin/psl/import-directory
Content-Type: application/json

{
  "directoryPath": "/path/to/data-directory"
}
```

#### Get Data Summary
```bash
GET /api/admin/psl/summary
```

## Data Import Format

### **JSON Format**

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
    "attendance": 25000,
    "referee": "John Doe",
    "stats": {
      "homeXg": 1.8,
      "awayXg": 1.2,
      "homeShots": 15,
      "awayShots": 10,
      "homeShotsOnTarget": 7,
      "awayShotsOnTarget": 5,
      "homePossession": 55,
      "awayPossession": 45,
      "homeCorners": 6,
      "awayCorners": 4,
      "homeFouls": 12,
      "awayFouls": 14,
      "homeYellowCards": 2,
      "awayYellowCards": 3,
      "homeRedCards": 0,
      "awayRedCards": 1
    }
  }
]
```

### **CSV Format**

Headers (all columns except first 6 are optional):
```csv
date,homeTeam,awayTeam,homeScore,awayScore,htHomeScore,htAwayScore,season,round,venue,attendance,referee
1996-08-10,Mamelodi Sundowns,Orlando Pirates,2,1,1,0,1996/1997,Round 1,Loftus Versfeld Stadium,25000,John Doe
```

## Team Name Aliases

The system includes comprehensive team name aliasing to handle:
- Historical name changes
- Club renames and mergers
- Defunct clubs
- Sponsor name changes

### **Example Aliases**
```typescript
'Mamelodi Sundowns FC' → 'Mamelodi Sundowns'
'Pirates' → 'Orlando Pirates'
'Chiefs' → 'Kaizer Chiefs'
'Bloemfontein Celtic' → 'Bloemfontein Celtic' (defunct)
'Platinum Stars' → 'Platinum Stars' (defunct, became TTM)
```

## Historical Teams Tracked

### **Current PSL Teams (2025/2026)**
- Mamelodi Sundowns
- Orlando Pirates
- Kaizer Chiefs
- Cape Town City
- Stellenbosch
- SuperSport United
- AmaZulu
- Golden Arrows
- Chippa United
- Sekhukhune United
- TS Galaxy
- Polokwane City
- Richards Bay
- Royal AM
- And more...

### **Defunct/Historical Teams**
- Bloemfontein Celtic (dissolved 2023)
- Platinum Stars (became TTM)
- Bidvest Wits (became University of Pretoria)
- Highlands Park (became Royal AM)
- Ajax Cape Town (became Cape Town Spurs)
- Mpumalanga Black Aces
- Free State Stars
- Maritzburg United
- Vasco da Gama
- Bay United
- Jomo Cosmos
- And 20+ more historical clubs

## Next Steps for Data Collection

### **Phase 1: Core Data (Current)**
✅ Historical match data (1996-2026)
✅ Team information and aliases
✅ Match statistics
✅ Player entities
✅ Coach entities

### **Phase 2: Data Enrichment**
- [ ] Scrape FlashScore for actual historical data
- [ ] Import historical data from external sources (RSSSF, Wikipedia)
- [ ] Add player-level match statistics
- [ ] Add referee tracking
- [ ] Add venue/stadium information

### **Phase 3: Advanced Analytics**
- [ ] Calculate historical ELO ratings for all seasons
- [ ] Build head-to-head records
- [ ] Track form guides and streaks
- [ ] Calculate home/away performance metrics
- [ ] Track managerial changes and impact

### **Phase 4: Expert Report Generation**
- [ ] Build on-demand report generator
- [ ] User queries: "Man City vs Arsenal" → full breakdown
- [ ] Player comparison tools
- [ ] Team performance reports
- [ ] Tournament histories

## Data Sources

### **Primary Sources**
1. **FlashScore API** - Live and historical match data
2. **PSL Official Website** (psl.co.za) - Fixtures, results, statistics
3. **Manual Import** - CSV/JSON from external data sources

### **External Data Sources for Import**
- **RSSSF** (Rec.Sport.Soccer Statistics Foundation) - Historical results
- **Wikipedia** - Season articles, team histories
- **Transfermarkt** - Player values, statistics
- **Soccerway** - Match data, statistics
- **FBref** - Advanced statistics (xG, possession, etc.)

## Usage Example

### **1. Import Historical Data**

Create a JSON file with historical matches (see format above), then:

```bash
curl -X POST http://localhost:3000/api/admin/psl/import-json \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/psl-1996-2000.json"}'
```

### **2. Scrape FlashScore**

```bash
curl -X POST http://localhost:3000/api/admin/psl/scrape-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### **3. Check Summary**

```bash
curl http://localhost:3000/api/admin/psl/summary
```

## Configuration

Ensure these environment variables are set:

```bash
# FlashScore API (RapidAPI)
SCRAPER_RAPIDAPI_KEY=your_rapidapi_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sports_prediction_engine
```

## Sample Data

A sample data file is provided at:
`apps/backend/src/data-ingestion/psl/sample-psl-data.json`

This demonstrates the expected format for bulk imports.

## Future Enhancements

1. **Automated Web Scraping** - Build scrapers for PSL website, FlashScore web interface
2. **PDF Report Parsing** - Parse historical season reports and articles
3. **API Integrations** - Connect to Opta, StatsPerform for advanced data
4. **Crowdsourcing** - Allow users to submit historical data
5. **Data Validation** - Cross-reference multiple sources for accuracy
6. **Real-time Updates** - Live match statistics during games

## Contributing

When adding historical data:
1. Use the JSON or CSV import format
2. Include as much detail as possible (statistics, attendance, etc.)
3. Verify team names against the alias list
4. Submit data files for bulk import

## License

Part of the Sports Prediction Engine project.
