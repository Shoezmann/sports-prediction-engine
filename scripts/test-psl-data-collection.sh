#!/bin/bash

# PSL Data Collection Quick Start Script
# This script demonstrates how to use the new PSL data collection system

BASE_URL="http://localhost:3000/api/admin/psl"

echo "========================================="
echo "PSL Data Collection - Quick Start"
echo "========================================="
echo ""

# 1. Check if backend is running
echo "Checking if backend is running..."
if curl -s "$BASE_URL/summary" > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Please start it first:"
    echo "   npm start backend"
    exit 1
fi

echo ""
echo "-----------------------------------------"
echo "1. Get Current Data Summary"
echo "-----------------------------------------"
curl -s "$BASE_URL/summary" | jq .

echo ""
echo "-----------------------------------------"
echo "2. Seed Sample Historical Matches (Last 3 Seasons)"
echo "-----------------------------------------"
curl -s -X POST "$BASE_URL/seed-sample?seasons=3" | jq .

echo ""
echo "-----------------------------------------"
echo "3. Import Sample JSON Data"
echo "-----------------------------------------"
# Adjust path to your project root
SAMPLE_FILE="$(pwd)/apps/backend/src/data-ingestion/psl/sample-psl-data.json"
if [ -f "$SAMPLE_FILE" ]; then
    curl -s -X POST "$BASE_URL/import-json" \
        -H "Content-Type: application/json" \
        -d "{\"filePath\": \"$SAMPLE_FILE\"}" | jq .
else
    echo "⚠️  Sample file not found at: $SAMPLE_FILE"
    echo "   Creating a small test file..."
    
    cat > /tmp/test-psl-data.json << 'EOF'
[
  {
    "date": "1996-08-10",
    "homeTeam": "Mamelodi Sundowns",
    "awayTeam": "Orlando Pirates",
    "homeScore": 2,
    "awayScore": 1,
    "season": "1996/1997",
    "round": "Round 1"
  },
  {
    "date": "1996-08-17",
    "homeTeam": "Kaizer Chiefs",
    "awayTeam": "SuperSport United",
    "homeScore": 1,
    "awayScore": 1,
    "season": "1996/1997",
    "round": "Round 2"
  }
]
EOF
    
    curl -s -X POST "$BASE_URL/import-json" \
        -H "Content-Type: application/json" \
        -d "{\"filePath\": \"/tmp/test-psl-data.json\"}" | jq .
fi

echo ""
echo "-----------------------------------------"
echo "4. Verify Data Was Imported"
echo "-----------------------------------------"
curl -s "$BASE_URL/summary" | jq .

echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Prepare your historical PSL data as JSON files"
echo "2. Use the import endpoint to bulk load:"
echo "   curl -X POST $BASE_URL/import-json \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"filePath\": \"/path/to/your-data.json\"}'"
echo ""
echo "3. If you have FlashScore API key:"
echo "   curl -X POST $BASE_URL/scrape-all"
echo ""
echo "4. Check data anytime:"
echo "   curl $BASE_URL/summary"
echo ""
echo "========================================="
echo "Done! ✅"
echo "========================================="
