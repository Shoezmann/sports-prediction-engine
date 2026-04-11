#!/bin/bash
# Backend auto-restart daemon
# Survives crashes, shell disconnects, and port conflicts

PIDFILE="/tmp/predict-engine-backend.pid"
LOGFILE="/tmp/predict-engine-backend.log"
MAX_RESTARTS=10
RESTART_DELAY=3
KILL_TIMEOUT=5

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"; }

cleanup() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            log "Stopping backend (PID $PID)..."
            kill "$PID"
            sleep "$KILL_TIMEOUT"
            kill -9 "$PID" 2>/dev/null
        fi
        rm -f "$PIDFILE"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Kill any existing backend on port 3000
EXISTING_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
    log "Killing existing process on port 3000 (PID $EXISTING_PID)"
    kill -9 "$EXISTING_PID" 2>/dev/null
    sleep 1
fi

RESTART_COUNT=0

while true; do
    # Check we're in the project directory
    cd "$(dirname "$0")"

    # Build if dist doesn't exist
    if [ ! -f "dist/apps/backend/main.js" ]; then
        log "Building backend..."
        npx nx build backend 2>&1 | tee -a "$LOGFILE"
    fi

    RESTART_COUNT=$((RESTART_COUNT + 1))

    if [ "$RESTART_COUNT" -gt "$MAX_RESTARTS" ]; then
        log "ERROR: Backend crashed $MAX_RESTARTS times. Giving up."
        log "Check logs: tail -50 $LOGFILE"
        exit 1
    fi

    if [ "$RESTART_COUNT" -gt 1 ]; then
        log "Restart attempt $RESTART_COUNT/$MAX_RESTARTS (waiting ${RESTART_DELAY}s)..."
        sleep "$RESTART_DELAY"
    fi

    log "Starting backend (attempt $RESTART_COUNT)..."

    # Start the backend, capture PID
    node dist/apps/backend/main.js >> "$LOGFILE" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$PIDFILE"

    log "Backend started with PID $BACKEND_PID"

    # Wait for the process
    wait "$BACKEND_PID"
    EXIT_CODE=$?

    if [ "$EXIT_CODE" -eq 0 ]; then
        log "Backend exited cleanly"
        break
    else
        log "Backend crashed with exit code $EXIT_CODE"
        rm -f "$PIDFILE"
    fi
done
