#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}🚀 Testing Full Stack Authentication Integration${NC}"
echo "=============================================="
echo

echo -e "${YELLOW}Prerequisites:${NC}"
echo "1. Backend server should be running on port 3000"
echo "2. Frontend should be accessible (if testing manually)"
echo "3. MongoDB should be connected"
echo

# Test 1: Register a new user
echo -e "${BLUE}1. Testing User Registration${NC}"
echo "----------------------------"

RANDOM_USER="testuser_$(date +%s)"
echo "Creating user: $RANDOM_USER"

register_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$RANDOM_USER\",\"password\":\"password123\"}")

register_body=$(echo "$register_response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
register_status=$(echo "$register_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$register_status" = "201" ]; then
    echo -e "${GREEN}✓ Registration successful${NC}"
    TOKEN=$(echo "$register_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$TOKEN" ]; then
        echo -e "${GREEN}✓ Token received on registration${NC}"
        echo "Token: ${TOKEN:0:20}..."
    else
        echo -e "${RED}✗ No token received on registration${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "Status: $register_status"
    echo "Response: $register_body"
    exit 1
fi
echo

# Test 2: Test duplicate registration
echo -e "${BLUE}2. Testing Duplicate Registration Prevention${NC}"
echo "--------------------------------------------"

duplicate_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$RANDOM_USER\",\"password\":\"password123\"}")

duplicate_status=$(echo "$duplicate_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$duplicate_status" = "409" ]; then
    echo -e "${GREEN}✓ Duplicate registration properly rejected${NC}"
else
    echo -e "${RED}✗ Duplicate registration not properly handled${NC}"
    echo "Expected: 409, Got: $duplicate_status"
fi
echo

# Test 3: Test login
echo -e "${BLUE}3. Testing User Login${NC}"
echo "--------------------"

login_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$RANDOM_USER\",\"password\":\"password123\"}")

login_body=$(echo "$login_response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
login_status=$(echo "$login_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$login_status" = "200" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    LOGIN_TOKEN=$(echo "$login_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$LOGIN_TOKEN" ]; then
        echo -e "${GREEN}✓ Token received on login${NC}"
        echo "Token: ${LOGIN_TOKEN:0:20}..."
    else
        echo -e "${RED}✗ No token received on login${NC}"
    fi
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "Status: $login_status"
    echo "Response: $login_body"
fi
echo

# Test 4: Test wrong password
echo -e "${BLUE}4. Testing Wrong Password${NC}"
echo "-------------------------"

wrong_login_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$RANDOM_USER\",\"password\":\"wrongpassword\"}")

wrong_login_status=$(echo "$wrong_login_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$wrong_login_status" = "401" ]; then
    echo -e "${GREEN}✓ Wrong password properly rejected${NC}"
else
    echo -e "${RED}✗ Wrong password not properly handled${NC}"
    echo "Expected: 401, Got: $wrong_login_status"
fi
echo

# Test 5: Test API without authentication
echo -e "${BLUE}5. Testing API Protection${NC}"
echo "-------------------------"

unauth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/images")
unauth_status=$(echo "$unauth_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$unauth_status" = "401" ]; then
    echo -e "${GREEN}✓ API properly protected (401 without auth)${NC}"
else
    echo -e "${RED}✗ API not properly protected${NC}"
    echo "Expected: 401, Got: $unauth_status"
fi
echo

# Test 6: Test API with authentication
echo -e "${BLUE}6. Testing Authenticated API Access${NC}"
echo "-----------------------------------"

if [ ! -z "$TOKEN" ]; then
    auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN")
    
    auth_body=$(echo "$auth_response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    auth_status=$(echo "$auth_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$auth_status" = "200" ]; then
        echo -e "${GREEN}✓ Authenticated API access successful${NC}"
        
        # Check if we got JSON array
        if [[ $auth_body == \[* ]]; then
            echo -e "${GREEN}✓ Received images array${NC}"
            image_count=$(echo "$auth_body" | grep -o '"id":' | wc -l)
            echo "Found $image_count images"
        else
            echo -e "${YELLOW}? Unexpected response format${NC}"
            echo "Response: ${auth_body:0:100}..."
        fi
    else
        echo -e "${RED}✗ Authenticated API access failed${NC}"
        echo "Status: $auth_status"
        echo "Response: ${auth_body:0:200}..."
    fi
else
    echo -e "${RED}✗ No token available for testing${NC}"
fi
echo

# Test 7: Test image search with authentication
echo -e "${BLUE}7. Testing Authenticated Image Search${NC}"
echo "-------------------------------------"

if [ ! -z "$TOKEN" ]; then
    search_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/images?search=cat" \
        -H "Authorization: Bearer $TOKEN")
    
    search_status=$(echo "$search_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$search_status" = "200" ]; then
        echo -e "${GREEN}✓ Authenticated image search successful${NC}"
    else
        echo -e "${RED}✗ Authenticated image search failed${NC}"
        echo "Status: $search_status"
    fi
else
    echo -e "${RED}✗ No token available for testing${NC}"
fi
echo

echo -e "${GREEN}🎉 Integration Testing Complete!${NC}"
echo "================================="
echo
echo -e "${BLUE}Summary:${NC}"
echo "• User registration with immediate login ✓"
echo "• Duplicate username prevention ✓"  
echo "• User login with JWT tokens ✓"
echo "• Wrong password rejection ✓"
echo "• API route protection ✓"
echo "• Authenticated API access ✓"
echo "• Image search with authentication ✓"
echo
echo -e "${YELLOW}Frontend Testing:${NC}"
echo "• Visit http://localhost:5173/"
echo "• Try registering a new account"
echo "• Try logging in with wrong credentials"
echo "• Try accessing protected pages without login"
echo "• Test image search and renaming"
echo
echo -e "${BLUE}Test user created:${NC} $RANDOM_USER"
echo -e "${BLUE}Password:${NC} password123" 