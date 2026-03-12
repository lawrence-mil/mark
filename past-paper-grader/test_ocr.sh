#!/bin/bash

echo "🧪 TESTING OCR, AI MARKING, AND DETECTION"
echo "========================================="
echo ""

# Create a simple test image (1x1 pixel) to test with
echo "1️⃣ Creating test files..."

# Create a simple text file to test
cat > /tmp/test_paper.txt << 'TESTEOF'
AQA A-Level Computer Science
Paper 1
June 2023

Question 1: What is an algorithm?
Student Answer: A set of instructions to solve a problem.

Question 2: Define a variable.
Student Answer: A named storage location that holds a value.
TESTEOF

echo "✅ Created /tmp/test_paper.txt"
echo ""

# Create a test markscheme
cat > /tmp/test_markscheme.txt << 'TESTEOF'
MARK SCHEME - AQA A-Level Computer Science Paper 1 June 2023

Question 1: [4 marks]
Expected: Algorithm is a step-by-step procedure for solving a problem
Accept: Set of instructions, process, sequence of steps
Award 4 marks for complete answer

Question 2: [4 marks]
Expected: Variable is a named storage location
Accept: Storage location, container for data, named location
Award 4 marks for correct answer
TESTEOF

echo "✅ Created /tmp/test_markscheme.txt"
echo ""

echo "2️⃣ Testing API endpoints..."
echo ""

# Test health check
echo "🏥 Health Check:"
curl -s http://localhost:3000/api/health | jq . || echo "Health check failed"
echo ""

# Test file upload endpoint
echo "📤 Testing Paper Upload..."
# Create FormData with test file
result=$(curl -s -X POST http://localhost:3000/api/submit/paper \
  -F "files=@/tmp/test_paper.txt" 2>&1)
echo "Response: $result"
echo ""

# Extract submission ID if successful
submissionId=$(echo $result | jq -r '.submissionId' 2>/dev/null || echo "")
if [ -z "$submissionId" ] || [ "$submissionId" = "null" ]; then
  echo "❌ Failed to get submission ID"
  exit 1
fi

echo "✅ Got submission ID: $submissionId"
echo ""

# Test markscheme upload
echo "📄 Testing Markscheme Upload..."
curl -s -X POST "http://localhost:3000/api/submit/markscheme" \
  -F "file=@/tmp/test_markscheme.txt" \
  -F "submissionId=$submissionId" | jq .
echo ""

# Test detection endpoint
echo "🔍 Testing Auto-Detection..."
curl -s -X POST "http://localhost:3000/api/detect-markscheme/$submissionId" | jq .
echo ""

# Test processing
echo "⚙️ Testing Processing..."
curl -s -X POST "http://localhost:3000/api/process/$submissionId" | jq .
echo ""

# Poll for results
echo "⏳ Waiting for results (10 seconds)..."
sleep 10

echo "📊 Fetching Results..."
curl -s "http://localhost:3000/api/results/$submissionId" | jq .

