#!/bin/bash

# Quick Start Guide for Perplexity Thread Exporter
# Run this script to get started quickly

echo "🚀 Perplexity Thread Exporter - Quick Start"
echo ""

# Check if Playwright browsers are installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "📦 Installing Playwright browsers..."
    npx playwright install chromium
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Capture API requests:"
echo "    npm run capture"
echo "    (Then log in, navigate to threads, and press Ctrl+C when done)"
echo ""
echo "2️⃣  Analyze the captured data:"
echo "    npm run analyze"
echo ""
echo "3️⃣  Update export-threads.js with the discovered endpoints"
echo ""
echo "4️⃣  Export all your threads:"
echo "    npm run export"
echo ""
