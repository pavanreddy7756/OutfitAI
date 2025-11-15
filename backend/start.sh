#!/bin/bash

# OutfitAI Backend Startup Script

echo "🚀 Starting OutfitAI Backend Server..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Create uploads directory
mkdir -p uploads

# Start server
echo ""
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "📚 API Docs available at http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
