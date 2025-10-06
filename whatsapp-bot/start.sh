#!/bin/bash

echo "� Starting WhatsApp Group Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "� Installing dependencies..."
    npm install
fi

# Initialize database if it doesn't exist
if [ ! -f "bot.db" ]; then
    echo "�️ Initializing database..."
    npm run init-db
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️ Warning: .env file not found. Using default configuration."
    echo "Please configure your environment variables for production use."
fi

echo "✅ Starting bot..."
npm start
