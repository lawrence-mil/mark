#!/bin/bash

# Test OCR with sample PDF
echo "🧪 Testing OCR and AI Marking Pipeline..."
echo "========================================"

# 1. Check if Mistral OCR endpoint is accessible
echo -e "\n1️⃣ Testing Mistral OCR configuration..."
if [ -z "$MISTRAL_API_KEY" ]; then
  echo "❌ MISTRAL_API_KEY not set"
else
  echo "✅ MISTRAL_API_KEY is set"
fi

# 2. Check if OpenRouter API is accessible
echo -e "\n2️⃣ Testing OpenRouter API configuration..."
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ OPENROUTER_API_KEY not set"
else
  echo "✅ OPENROUTER_API_KEY is set"
fi

# 3. Check if Exa API is set
echo -e "\n3️⃣ Testing Exa API configuration..."
if [ -z "$EXA_API_KEY" ]; then
  echo "❌ EXA_API_KEY not set"
else
  echo "✅ EXA_API_KEY is set"
fi

# 4. Check submissions endpoint status
echo -e "\n4️⃣ Testing submission endpoints..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/submit/paper \
  -H "Content-Type: application/json" \
  -d '{"test":"test"}' 2>&1)
echo "POST /api/submit/paper: $RESPONSE"

