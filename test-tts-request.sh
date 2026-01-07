#!/bin/bash
# Test script to call the test-tts API endpoint
# Usage: ./test-tts-request.sh

curl -X POST http://localhost:3000/api/test-tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天是10月26日。",
    "voice_id": "702cad93c44e4d8aa8063027c85278c6"
  }' | jq '.'

