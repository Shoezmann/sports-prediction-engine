#!/bin/bash
# Backend auto-restart daemon
# Survives crashes, shell disconnects, and port conflicts

PIDFILE="/tmp/predict-engine-backend.pid"
DAEMON_PIDFILE="/tmp/predict-engine-daemon.pid"
LOGFILE="/tmp/predict-engine-backend.log"
MAX_RESTARTS=10
RESTART_DELAY=3
KILL_TIMEOUT=5

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"; }

kill_backend() {
    # Kill by saved PID
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null
        fi
        rm -f "$PIDFILE"
    fi
    # Kill ALL orphaned backend processes by name (catches previous daemon's children)
    pkill -9 -f "node dist/apps/backend/main.js" 2>/dev/null
    # Wait for port to actually be free
    local waited=0
    while lsof -ti:3000 >/dev/null 2>&1; do
        sleep 1
        waited=$((waited + 1))
        if [ "$waited" -ge 10 ]; then
            log "WARNING: Port 3000 still in use after 10s — force killing"
            lsof -ti:3000 | xargs kill -9 2>/dev/null
            sleep 1
            break
        fi
    done
}

cleanup() {
    log "Daemon shutting down..."
    kill_backend
    rm -f "$DAEMON_PIDFILE"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Prevent multiple daemon instances
if [ -f "$DAEMON_PIDFILE" ]; then
    EXISTING_DAEMON=$(cat "$DAEMON_PIDFILE")
    if kill -0 "$EXISTING_DAEMON" 2>/dev/null; then
        log "Daemon already running (PID $EXISTING_DAEMON). Stopping it first..."
        kill "$EXISTING_DAEMON" 2>/dev/null
        sleep 2
    fi
fi
echo $$ > "$DAEMON_PIDFILE"

# Kill any existing backend processes before starting
log "Cleaning up any existing backend processes..."
kill_backend

RESTART_COUNT=0
while true; do
    cd "$(dirname "$0")"

    if [ ! -f "dist/apps/backend/main.js" ]; then
        log "Building backend..."
        npx nx build backend 2>&1 | tee -a "$LOGFILE"
    fi

    RESTART_COUNT=$((RESTART_COUNT + 1))
    if [ "$RESTART_COUNT" -gt "$MAX_RESTARTS" ]; then
        log "ERROR: Backend crashed $MAX_RESTARTS times. Giving up."
        log "Check logs: tail -50 $LOGFILE"
        rm -f "$DAEMON_PIDFILE"
        exit 1
    fi

    if [ "$RESTART_COUNT" -gt 1 ]; then
        log "Restart attempt $RESTART_COUNT/$MAX_RESTARTS (waiting ${RESTART_DELAY}s)..."
        # On restart: kill orphans and wait for port to free before retrying
        kill_backend
        sleep "$RESTART_DELAY"
    fi

    log "Starting backend (attempt $RESTART_COUNT)..."
    node dist/apps/backend/main.js >> "$LOGFILE" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > "$PIDFILE"
    log "Backend started with PID $BACKEND_PID"

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
