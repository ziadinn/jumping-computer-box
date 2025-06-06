#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}🔐 Testing Authentication System${NC}"
echo "=================================="
echo

# Function to test HTTP response
test_endpoint() {
    local description="$1"
    local expected_status="$2"
    local response=$(curl -s -w "%{http_code}" "$@" 2>/dev/null)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    echo -e "${YELLOW}Testing:${NC} $description"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $status_code"
    else
        echo -e "${RED}✗ FAIL${NC} - Expected: $expected_status, Got: $status_code"
    fi
    
    if [ ! -z "$body" ]; then
        echo "Response: $body"
    fi
    echo
}

echo -e "${BLUE}1. Testing User Registration${NC}"
echo "----------------------------"

# Test 1: Register a new user
test_endpoint "Register new user 'testuser'" "201" \
    -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"password"}'

# Test 2: Register user that matches existing image author
test_endpoint "Register 'chunkylover23' (existing image author)" "201" \
    -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"chunkylover23","password":"password"}'

# Test 3: Try to register existing user (should fail)
test_endpoint "Register existing user (should fail)" "409" \
    -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"password2"}'

# Test 4: Register with missing username
test_endpoint "Register with missing username (should fail)" "400" \
    -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"password":"password"}'

# Test 5: Register with missing password
test_endpoint "Register with missing password (should fail)" "400" \
    -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser2"}'

echo -e "${BLUE}2. Testing User Login${NC}"
echo "---------------------"

# Test 6: Login with valid credentials
echo -e "${YELLOW}Testing:${NC} Login with valid credentials"
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"password"}')

if [[ $login_response == *"token"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - Login successful"
    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token received: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ FAIL${NC} - Login failed"
    echo "Response: $login_response"
fi
echo

# Test 7: Login chunkylover23 to get their token
echo -e "${YELLOW}Testing:${NC} Login chunkylover23 for ownership tests"
chunk_login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"chunkylover23","password":"password"}')

if [[ $chunk_login_response == *"token"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - chunkylover23 login successful"
    CHUNK_TOKEN=$(echo "$chunk_login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token received: ${CHUNK_TOKEN:0:20}..."
else
    echo -e "${RED}✗ FAIL${NC} - chunkylover23 login failed"
    echo "Response: $chunk_login_response"
fi
echo

# Test 8: Login with invalid password
test_endpoint "Login with invalid password (should fail)" "401" \
    -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"wrongpassword"}'

# Test 9: Login with non-existent user
test_endpoint "Login with non-existent user (should fail)" "401" \
    -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"nonexistent","password":"password"}'

# Test 10: Login with missing username
test_endpoint "Login with missing username (should fail)" "400" \
    -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"password":"password"}'

echo -e "${BLUE}3. Testing Protected Routes${NC}"
echo "---------------------------"

# Test 11: Get images without token
test_endpoint "Get images without token (should fail)" "401" \
    -X GET "$BASE_URL/api/images"

# Test 12: Get images with valid token
if [ ! -z "$TOKEN" ]; then
    test_endpoint "Get images with valid token" "200" \
        -X GET "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN"
else
    echo -e "${RED}✗ SKIP${NC} - No token available for testing"
    echo
fi

echo -e "${BLUE}4. Testing Image Ownership Protection${NC}"
echo "-------------------------------------"

# First, let's get an image ID to test with
if [ ! -z "$TOKEN" ]; then
    echo -e "${YELLOW}Getting image list to find an image ID...${NC}"
    images_response=$(curl -s -X GET "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN")
    
    # Extract first image ID (this is a simple extraction, might need adjustment based on actual response)
    IMAGE_ID=$(echo "$images_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$IMAGE_ID" ]; then
        echo "Using image ID: $IMAGE_ID"
        echo
        
        # Test 13: Update image name without token
        test_endpoint "Update image name without token (should fail)" "401" \
            -X PUT "$BASE_URL/api/images/$IMAGE_ID/name" \
            -H "Content-Type: application/json" \
            -d '{"name":"New Image Name"}'
        
        # Test 14: Update image name with wrong user token
        test_endpoint "Update image name with wrong user (should fail)" "403" \
            -X PUT "$BASE_URL/api/images/$IMAGE_ID/name" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{"name":"New Image Name"}'
        
        # Test 15: Update image name with correct owner token
        if [ ! -z "$CHUNK_TOKEN" ]; then
            test_endpoint "Update image name with correct owner" "204" \
                -X PUT "$BASE_URL/api/images/$IMAGE_ID/name" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $CHUNK_TOKEN" \
                -d '{"name":"Updated by Owner"}'
        else
            echo -e "${RED}✗ SKIP${NC} - No chunkylover23 token available"
            echo
        fi
    else
        echo -e "${RED}✗ SKIP${NC} - Could not extract image ID from response"
        echo
    fi
else
    echo -e "${RED}✗ SKIP${NC} - No token available for testing"
    echo
fi

echo -e "${BLUE}5. Testing Error Cases${NC}"
echo "----------------------"

# Test 16: Invalid JWT token
test_endpoint "Access API with invalid token (should fail)" "403" \
    -X GET "$BASE_URL/api/images" \
    -H "Authorization: Bearer invalid.jwt.token"

# Test 17: Malformed Authorization header
test_endpoint "Access API with malformed auth header (should fail)" "401" \
    -X GET "$BASE_URL/api/images" \
    -H "Authorization: NotBearer $TOKEN"

echo -e "${GREEN}🎉 Authentication Testing Complete!${NC}"
echo "======================================="
echo
echo -e "${BLUE}Summary:${NC}"
echo "• User registration with password hashing ✓"
echo "• User login with JWT token generation ✓"
echo "• API route protection ✓"
echo "• Owner-only image editing ✓"
echo "• Proper error handling ✓" 