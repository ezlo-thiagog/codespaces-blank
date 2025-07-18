#!/bin/bash

BASE_URL="https://animated-spoon-x5pr565x9q7vfpvp6-3000.app.github.dev"

echo "🔎 Testing GET /"
curl -s "$BASE_URL" && echo -e "\n"

echo -e "\n📦 Testing POST / (valid serial)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"channel_id":"C04SM9CP4F2", "text":"92000000"}' && echo -e "\n"

echo -e "\n🚫 Testing POST / (empty serial)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"channel_id":"C04SM9CP4F2", "text":""}' && echo -e "\n"

echo -e "\n🚫 Testing POST / (multiple serials)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"channel_id":"C04SM9CP4F2", "text":"92000000 92000001"}' && echo -e "\n"

echo -e "\n🚫 Testing POST / (unauthorized channel)"
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"channel_id":"C0000000000", "text":"92000000"}' && echo -e "\n"
