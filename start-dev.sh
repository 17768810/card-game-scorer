#!/bin/bash

# Start server
cd card-game-scorer/server
npm run dev > server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Start client
cd ../client
npm run dev > client.log 2>&1 &
CLIENT_PID=$!
echo "Client started with PID: $CLIENT_PID"

# Wait for client to start
sleep 3

echo "Both services are running"
echo "Server: http://localhost:3000"
echo "Client: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user interrupt
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM

wait
