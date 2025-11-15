import requests
import json

BASE_URL = "http://localhost:8000"

# Test data
TEST_USER = {
    "email": "test@outfitai.com",
    "username": "testuser",
    "password": "testpass123"
}

def test_health():
    """Test health endpoint"""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_register():
    """Test user registration"""
    print("Testing user registration...")
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": TEST_USER["email"],
            "username": TEST_USER["username"],
            "password": TEST_USER["password"]
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    return response

def test_login():
    """Test user login"""
    print("Testing user login...")
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
    )
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {data}")
    print()
    return data.get("access_token") if response.status_code == 200 else None

def test_get_clothing_items(token):
    """Test getting clothing items"""
    print("Testing get clothing items...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/clothing/items",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_get_outfits(token):
    """Test getting outfits"""
    print("Testing get outfits...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/outfits",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

if __name__ == "__main__":
    print("=" * 60)
    print("OutfitAI Backend API Test Suite")
    print("=" * 60)
    print()
    
    try:
        # Test health
        test_health()
        
        # Test registration (may fail if user exists, that's ok)
        test_register()
        
        # Test login
        token = test_login()
        
        if token:
            print("✅ Authentication successful!")
            print()
            
            # Test authenticated endpoints
            test_get_clothing_items(token)
            test_get_outfits(token)
            
            print("✅ All tests completed!")
        else:
            print("❌ Login failed, skipping authenticated tests")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure server is running:")
        print("   cd backend && python -m uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")
