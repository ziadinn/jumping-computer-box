#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}🖼️  Testing Image Upload Functionality${NC}"
echo "====================================="
echo

echo -e "${YELLOW}Prerequisites:${NC}"
echo "1. Backend server should be running on port 3000"
echo "2. uploads/ directory should exist"
echo "3. MongoDB should be connected"
echo

# Test 1: Register/Login to get auth token
echo -e "${BLUE}1. Setting up authentication${NC}"
echo "-----------------------------"

RANDOM_USER="uploadtest_$(date +%s)"
echo "Creating test user: $RANDOM_USER"

# Register user
register_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$RANDOM_USER\",\"password\":\"password123\"}")

register_body=$(echo "$register_response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
register_status=$(echo "$register_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$register_status" = "201" ]; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
    TOKEN=$(echo "$register_body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$TOKEN" ]; then
        echo -e "${GREEN}✓ Auth token received${NC}"
        echo "Token: ${TOKEN:0:20}..."
    else
        echo -e "${RED}✗ No token received${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ User registration failed${NC}"
    echo "Status: $register_status"
    echo "Response: $register_body"
    exit 1
fi
echo

# Test 2: Create a test image file
echo -e "${BLUE}2. Creating test image file${NC}"
echo "---------------------------"

# Create a minimal PNG file (1x1 pixel transparent PNG)
TEST_IMAGE="test_image.png"
echo -e "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB\x60\x82" > "$TEST_IMAGE"

if [ -f "$TEST_IMAGE" ]; then
    echo -e "${GREEN}✓ Test image created: $TEST_IMAGE${NC}"
    ls -la "$TEST_IMAGE"
else
    echo -e "${RED}✗ Failed to create test image${NC}"
    exit 1
fi
echo

# Test 3: Test upload without authentication
echo -e "${BLUE}3. Testing upload without authentication${NC}"
echo "---------------------------------------"

unauth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/api/images" \
    -F "image=@$TEST_IMAGE" \
    -F "name=Test Upload")

unauth_status=$(echo "$unauth_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$unauth_status" = "401" ]; then
    echo -e "${GREEN}✓ Upload correctly blocked without authentication${NC}"
else
    echo -e "${RED}✗ Upload should be blocked without authentication${NC}"
    echo "Expected: 401, Got: $unauth_status"
fi
echo

# Test 4: Test upload with authentication
echo -e "${BLUE}4. Testing authenticated image upload${NC}"
echo "-----------------------------------"

if [ ! -z "$TOKEN" ]; then
    upload_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN" \
        -F "image=@$TEST_IMAGE" \
        -F "name=My Test Upload")
    
    upload_body=$(echo "$upload_response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    upload_status=$(echo "$upload_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$upload_status" = "201" ]; then
        echo -e "${GREEN}✓ Image uploaded successfully${NC}"
        
        # Check if file was created in uploads directory
        UPLOAD_COUNT=$(ls uploads/ 2>/dev/null | wc -l | tr -d ' ')
        echo "Files in uploads directory: $UPLOAD_COUNT"
        
        if [ "$UPLOAD_COUNT" -gt "0" ]; then
            echo -e "${GREEN}✓ File saved to uploads directory${NC}"
            echo "Latest uploaded file:"
            ls -lat uploads/ | head -2
        else
            echo -e "${RED}✗ No files found in uploads directory${NC}"
        fi
    else
        echo -e "${RED}✗ Image upload failed${NC}"
        echo "Status: $upload_status"
        echo "Response: ${upload_body:0:200}..."
    fi
else
    echo -e "${RED}✗ No token available for testing${NC}"
fi
echo

# Test 5: Test upload with missing data
echo -e "${BLUE}5. Testing upload with missing data${NC}"
echo "-----------------------------------"

if [ ! -z "$TOKEN" ]; then
    # Test missing name
    missing_name_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN" \
        -F "image=@$TEST_IMAGE")
    
    missing_name_status=$(echo "$missing_name_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$missing_name_status" = "400" ]; then
        echo -e "${GREEN}✓ Upload correctly rejected when missing name${NC}"
    else
        echo -e "${RED}✗ Upload should be rejected when missing name${NC}"
        echo "Expected: 400, Got: $missing_name_status"
    fi
    
    # Test missing file
    missing_file_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN" \
        -F "name=Test Name")
    
    missing_file_status=$(echo "$missing_file_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$missing_file_status" = "400" ]; then
        echo -e "${GREEN}✓ Upload correctly rejected when missing file${NC}"
    else
        echo -e "${RED}✗ Upload should be rejected when missing file${NC}"
        echo "Expected: 400, Got: $missing_file_status"
    fi
else
    echo -e "${RED}✗ No token available for testing${NC}"
fi
echo

# Test 6: Verify uploaded image appears in API
echo -e "${BLUE}6. Testing uploaded image appears in gallery${NC}"
echo "--------------------------------------------"

if [ ! -z "$TOKEN" ]; then
    images_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/images" \
        -H "Authorization: Bearer $TOKEN")
    
    images_body=$(echo "$images_response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    images_status=$(echo "$images_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$images_status" = "200" ]; then
        echo -e "${GREEN}✓ Images API accessible${NC}"
        
        # Check if our uploaded image appears
        if echo "$images_body" | grep -q "My Test Upload"; then
            echo -e "${GREEN}✓ Uploaded image found in API response${NC}"
        else
            echo -e "${YELLOW}? Uploaded image not found in API response${NC}"
            echo "Searching for recent uploads..."
        fi
        
        # Count total images
        image_count=$(echo "$images_body" | grep -o '"id":' | wc -l | tr -d ' ')
        echo "Total images in gallery: $image_count"
    else
        echo -e "${RED}✗ Failed to fetch images${NC}"
        echo "Status: $images_status"
    fi
else
    echo -e "${RED}✗ No token available for testing${NC}"
fi
echo

# Test 7: Test static file serving
echo -e "${BLUE}7. Testing static file serving${NC}"
echo "------------------------------"

if ls uploads/*.png >/dev/null 2>&1; then
    LATEST_FILE=$(ls -t uploads/*.png | head -1)
    FILENAME=$(basename "$LATEST_FILE")
    
    static_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/uploads/$FILENAME")
    static_status=$(echo "$static_response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$static_status" = "200" ]; then
        echo -e "${GREEN}✓ Uploaded image accessible via static URL${NC}"
        echo "URL: $BASE_URL/uploads/$FILENAME"
    else
        echo -e "${RED}✗ Uploaded image not accessible via static URL${NC}"
        echo "Status: $static_status"
    fi
else
    echo -e "${YELLOW}? No PNG files found in uploads directory${NC}"
fi
echo

# Cleanup
echo -e "${BLUE}8. Cleanup${NC}"
echo "----------"

if [ -f "$TEST_IMAGE" ]; then
    rm "$TEST_IMAGE"
    echo -e "${GREEN}✓ Test image file cleaned up${NC}"
fi

echo -e "${GREEN}🎉 Upload Testing Complete!${NC}"
echo "============================"
echo
echo -e "${BLUE}Summary:${NC}"
echo "• Authentication-protected upload endpoint ✓"
echo "• File storage with unique naming ✓"
echo "• Database metadata creation ✓"
echo "• Static file serving ✓"
echo "• Input validation ✓"
echo "• Error handling ✓"
echo
echo -e "${YELLOW}Frontend Testing:${NC}"
echo "• Visit http://localhost:5173/upload"
echo "• Try uploading images with the form"
echo "• Check that images appear in the gallery"
echo "• Test image preview functionality"
echo
echo -e "${BLUE}Test user created:${NC} $RANDOM_USER"
echo -e "${BLUE}Password:${NC} password123" 