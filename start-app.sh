#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

kill_port_if_busy() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"

  if [ -n "$pids" ]; then
    echo "Port $port is in use. Stopping existing process(es): $pids"
    kill $pids 2>/dev/null || true
    sleep 1

    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      echo "Force stopping process(es) on port $port: $pids"
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

kill_port_if_busy 5055
kill_port_if_busy 5173

echo "Starting backend on http://localhost:5055"
npm run dev &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:5173"
npm run client &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "Stopping services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$BACKEND_PID" "$FRONTEND_PID"
