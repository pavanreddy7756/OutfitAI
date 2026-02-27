#!/bin/bash

# OutfitAI Mobile App Startup Script

echo "📱 Starting OutfitAI Mobile App..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "✅ Starting Expo development server"
echo ""
echo "Press:"
echo "  'i' to launch iOS simulator"
echo "  'a' to launch Android emulator"
echo "  'w' to open web version"
echo "  'q' to quit"
echo ""

npm start
