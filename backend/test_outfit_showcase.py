#!/usr/bin/env python3
"""
Test script for Outfit Showcase Feature
Tests the force_include_item_ids parameter in outfit generation
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_outfit_generation_with_forced_item():
    """
    Test generating outfits with a forced item inclusion.
    This simulates what happens when a user clicks on an item in the wardrobe.
    """
    
    print("=" * 60)
    print("Testing Outfit Showcase Feature")
    print("=" * 60)
    
    # Step 1: Login to get a token
    print("\n[1] Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "password123"
        }
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        print("\nNote: You may need to register a user first.")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # Step 2: Get clothing items
    print("\n[2] Fetching wardrobe items...")
    items_response = requests.get(
        f"{BASE_URL}/api/clothing/items?page_size=500",
        headers=headers
    )
    
    if items_response.status_code != 200:
        print(f"❌ Failed to fetch items: {items_response.text}")
        return
    
    items = items_response.json().get("items", [])
    print(f"✅ Found {len(items)} items in wardrobe")
    
    if len(items) < 3:
        print("⚠️  Need at least 3 items in wardrobe to generate outfits")
        return
    
    # Pick the first item to showcase
    showcase_item = items[0]
    print(f"\n[3] Showcasing item: ID {showcase_item['id']}")
    print(f"    Category: {showcase_item.get('category')}")
    print(f"    Color: {showcase_item.get('color')}")
    if showcase_item.get('brand'):
        print(f"    Brand: {showcase_item['brand']}")
    
    # Step 3: Generate outfits with forced inclusion
    print(f"\n[4] Generating 3 outfits that MUST include item {showcase_item['id']}...")
    
    all_item_ids = [item['id'] for item in items]
    
    generate_response = requests.post(
        f"{BASE_URL}/api/outfits/generate",
        headers=headers,
        json={
            "occasion": "casual",
            "clothing_item_ids": all_item_ids,
            "force_include_item_ids": [showcase_item['id']]  # THE NEW FEATURE!
        }
    )
    
    if generate_response.status_code != 200:
        print(f"❌ Failed to generate outfits: {generate_response.text}")
        return
    
    result = generate_response.json()
    print("✅ Outfits generated successfully")
    
    # Step 4: Verify outfits contain the forced item
    print("\n[5] Verifying outfits contain the forced item...")
    
    try:
        suggestions = json.loads(result['ai_suggestions'])
        if not isinstance(suggestions, list):
            suggestions = [suggestions]
        
        print(f"\nGenerated {len(suggestions)} outfit(s):")
        print("-" * 60)
        
        all_valid = True
        for i, outfit in enumerate(suggestions[:3], 1):
            item_ids = outfit.get('item_ids', [])
            contains_forced = showcase_item['id'] in item_ids
            
            print(f"\nOutfit {i}: {outfit.get('outfit_name', 'Unnamed')}")
            print(f"  Items: {item_ids}")
            print(f"  Description: {outfit.get('description', '')[:60]}...")
            
            if contains_forced:
                print(f"  ✅ Contains forced item {showcase_item['id']}")
            else:
                print(f"  ❌ MISSING forced item {showcase_item['id']}")
                all_valid = False
        
        print("\n" + "=" * 60)
        if all_valid:
            print("🎉 SUCCESS! All outfits contain the forced item.")
            print("Feature is working correctly!")
        else:
            print("⚠️  WARNING: Some outfits missing the forced item")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error parsing suggestions: {e}")
        print(f"Raw response: {result.get('ai_suggestions', '')[:200]}")

if __name__ == "__main__":
    try:
        test_outfit_generation_with_forced_item()
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server.")
        print("Please ensure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
