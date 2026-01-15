#!/usr/bin/env bash
# scripts/run-dev.sh
# Usage: ./scripts/run-dev.sh [api_port] [dashboard_port]
# Defaults: api_port=5000, dashboard_port=5001

API_PORT=${1:-5000}
DASH_PORT=${2:-5001}

# Ensure .env exists
if [ ! -f .env ]; then
  echo ".env not found. Copying .env.example to .env"
  cp .env.example .env
  echo "Please edit .env before running the servers if you need to change credentials."
fi

# Create logs dir if missing
mkdir -p logs

echo "Starting API server on port $API_PORT..."
# Run API in background, inherit env PORT
PORT=$API_PORT nodemon server.js &
API_PID=$!

echo "API PID: $API_PID"

# Start dashboard in foreground in a new terminal if available, otherwise background
if command -v gnome-terminal >/dev/null 2>&1; then
  gnome-terminal -- bash -c "PORT=$DASH_PORT node dashboard-server.js; exec bash" || true
elif command -v xterm >/dev/null 2>&1; then
  xterm -e "PORT=$DASH_PORT node dashboard-server.js" &
else
  echo "No terminal opener found; starting dashboard in background"
  PORT=$DASH_PORT node dashboard-server.js &
  DASH_PID=$!
  echo "Dashboard PID: $DASH_PID"
fi

echo "Development servers started. API: http://localhost:$API_PORT  Dashboard: http://localhost:$DASH_PORT"

echo "To stop the background processes run: kill $API_PID ${DASH_PID:-}"
