import google.generativeai as genai
import json
import base64
import os
from pathlib import Path

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAmzS8-Y3clGTJpIYjXOSRETi1qCr25vSU")
genai.configure(api_key=GEMINI_API_KEY)


def analyze_clothing_image(image_path: str) -> dict:
    """
    Analyze a clothing image and extract comprehensive attributes using Gemini Vision API.
    """
    
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            return {
                "analysis_successful": False,
                "error": f"Image file not found: {image_path}"
            }
        
        # Determine MIME type from file extension
        mime_type = "image/jpeg"
        if image_path.lower().endswith((".png", ".PNG")):
            mime_type = "image/png"
        elif image_path.lower().endswith((".gif", ".GIF")):
            mime_type = "image/gif"
        elif image_path.lower().endswith((".webp", ".WEBP")):
            mime_type = "image/webp"
        
        # Read image as bytes
        with open(image_path, "rb") as img_file:
            image_bytes = img_file.read()
        
        # Encode to base64
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        analysis_prompt = """Analyze this clothing item image in EXTREME DETAIL and return ONLY a valid JSON object (no markdown, no extra text). Be very specific and thorough:

{
  "category": "main category (shirt, pants, dress, jacket, sweater, coat, skirt, etc.)",
  "subcategory": "specific type (t-shirt, polo, dress-shirt, jeans, chino, hoodie, cardigan, etc.)",
  "color": "primary color (be specific: navy blue, forest green, cream, burgundy, etc.)",
  "secondary_colors": "other colors present, comma-separated",
  "fit_type": "slim, regular, oversized, boxy, athletic, tailored, relaxed, etc.",
  "silhouette": "fitted, relaxed, loose, tapered, A-line, bodycon, etc.",
  "sleeve_type": "full, 3/4, short, sleeveless, cap, flutter, raglan, batwing, etc. (if applicable)",
  "sleeve_fit": "fitted, relaxed, puffed, bell, etc. (if applicable)",
  "neckline": "crew, v-neck, scoop, polo, henley, turtleneck, mock-neck, halter, etc. (if applicable)",
  "collar_type": "spread, button-down, club, pointed, mandarin, etc. (if applicable)",
  "collar_closure": "buttons, zipper, snaps, none, etc. (if applicable)",
  "texture": "smooth, ribbed, knitted, woven, denim, linen, corduroy, velvet, fleece, etc.",
  "fabric_type": "cotton, polyester, silk, wool, linen, blend, synthetic, rayon, etc.",
  "fabric_weight": "light, medium, heavy",
  "pattern": "solid, striped, plaid, checkered, floral, graphic, geometric, tie-dye, argyle, etc.",
  "pattern_description": "detailed description of the pattern if not solid",
  "length": "short, cropped, regular, long, knee-length, midi, maxi, full-length, etc.",
  "waist_type": "high-waist, mid-rise, low-rise, ultra-low, etc. (for pants)",
  "pant_type": "jeans, chino, formal, cargo, joggers, leggings, shorts, capris, etc.",
  "pant_fit": "slim, skinny, straight, tapered, baggy, bootcut, flare, wide-leg, etc.",
  "pant_rise": "high, mid, low",
  "condition": "new, excellent, good, fair, worn, distressed",
  "distressing_level": "none, minimal, moderate, heavy (for distressed/worn-look items)",
  "occasion_tags": "casual, formal, business, athletic, party, date-night, weekend, work, lounge, travel",
  "style_tags": "minimalist, bohemian, streetwear, classic, trendy, vintage, preppy, edgy, romantic, athletic, sportswear, oversized, fitted, relaxed",
  "season_tags": "summer, winter, spring, fall, all-season",
  "special_features": "pockets, hood, drawstring, belt, collar, cuffs, zip, buttons, adjustable, side-slits, high-waist, etc.",
  "detailed_description": "A comprehensive 2-3 sentence description of the clothing piece",
  "quality_score": 7.5
}

Return ONLY valid JSON. Start with { and end with }."""
        
        # Call Gemini with image
        response = model.generate_content([
            {
                "mime_type": mime_type,
                "data": image_data,
            },
            analysis_prompt
        ])
        
        # Get response text
        response_text = response.text.strip()
        
        # Try to parse as JSON
        try:
            if response_text.startswith("{"):
                clothing_data = json.loads(response_text)
                clothing_data["analysis_successful"] = True
                return clothing_data
            else:
                # Try to find JSON in response
                start_idx = response_text.find("{")
                end_idx = response_text.rfind("}") + 1
                if start_idx != -1 and end_idx > start_idx:
                    clothing_data = json.loads(response_text[start_idx:end_idx])
                    clothing_data["analysis_successful"] = True
                    return clothing_data
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Response: {response_text[:500]}")
        
        return {
            "analysis_successful": False,
            "error": "Failed to parse AI response",
            "raw_response": response_text[:200]
        }
    
    except FileNotFoundError:
        return {
            "analysis_successful": False,
            "error": f"Image file not found: {image_path}"
        }
    except Exception as e:
        print(f"Analysis Error: {str(e)}")
        return {
            "analysis_successful": False,
            "error": str(e)
        }


def calculate_outfit_score(outfit_items: list, occasion: str) -> float:
    """
    Calculate a relevance score for an outfit based on the occasion and item compatibility.
    
    Args:
        outfit_items: List of clothing item dictionaries
        occasion: The requested occasion
    
    Returns:
        Score between 0-100 (higher is better)
    """
    score = 0.0
    
    if not outfit_items:
        return 0.0
    
    # 1. Occasion Match (40% weight)
    occasion_score = 0.0
    occasion_lower = occasion.lower()
    for item in outfit_items:
        occasion_tags = item.get('occasion_tags', '').lower()
        if occasion_lower in occasion_tags:
            occasion_score += 40.0 / len(outfit_items)
    
    # 2. Style Coherence (30% weight)
    style_score = 0.0
    style_tags_list = [item.get('style_tags', '').lower().split(', ') for item in outfit_items]
    if len(style_tags_list) > 1:
        # Check for common style tags
        common_styles = set(style_tags_list[0])
        for tags in style_tags_list[1:]:
            common_styles &= set(tags)
        if common_styles:
            style_score = 30.0
        else:
            # Partial match
            style_score = 15.0
    else:
        style_score = 30.0  # Single item gets full score
    
    # 3. Quality Score (20% weight)
    quality_score = 0.0
    for item in outfit_items:
        quality = item.get('quality_score', 7.0)
        quality_score += (quality / 10.0) * (20.0 / len(outfit_items))
    
    # 4. Color Coordination (10% weight)
    color_score = 10.0  # Default to full score (assume AI already checked this)
    
    score = occasion_score + style_score + quality_score + color_score
    return round(score, 2)


def generate_outfit_suggestions(clothing_list: list, occasion: str = "casual") -> list:
    """
    Generate outfit suggestions using Gemini 2.0-Flash model.
    
    Args:
        clothing_list: List of available clothing items with their IDs and descriptions
        occasion: The occasion for the outfit (casual, formal, business, party, etc.)
    
    Returns:
        List of outfit suggestions in JSON format with proper structure, sorted by relevance score
    """
    
    try:
        # Format the clothing items for the prompt
        clothing_descriptions = []
        for item in clothing_list:
            default_desc = f"{item.get('category')} - {item.get('color')}"
            desc = f"ID: {item.get('id')}, {item.get('detailed_description', default_desc)}"
            clothing_descriptions.append(desc)
        
        clothing_text = "\n".join(clothing_descriptions)
        
        prompt = f"""You are a professional fashion stylist. Based on the available clothing items below, create 3 different outfit combinations for a {occasion} occasion.

Available clothing items:
{clothing_text}

Create 3 outfit suggestions. For each outfit:
1. Pick 2-3 clothing items that work well together
2. Explain why they work together
3. List the item IDs used

CRITICAL: Return ONLY a JSON array with no other text. The response MUST start with '[' and end with ']'.

Format: [
  {{
    "outfit_name": "descriptive name for the outfit",
    "description": "why this outfit works and when to wear it",
    "item_ids": [id1, id2, id3],
    "styling_tips": "specific styling advice for this outfit"
  }},
  {{...}},
  {{...}}
]

Each outfit MUST have exactly these 4 fields: outfit_name, description, item_ids, styling_tips.
item_ids MUST be an array of numbers.
Return ONLY the JSON array, no markdown, no code blocks, no explanation."""

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        
        response_text = response.text.strip()
        
        # Extract JSON array from response
        if response_text.startswith("["):
            try:
                outfits = json.loads(response_text)
                if isinstance(outfits, list):
                    # Calculate scores and sort
                    scored_outfits = []
                    for outfit in outfits:
                        item_ids = outfit.get('item_ids', [])
                        outfit_items = [item for item in clothing_list if item.get('id') in item_ids]
                        score = calculate_outfit_score(outfit_items, occasion)
                        scored_outfits.append((score, outfit))
                    
                    # Sort by score (descending)
                    scored_outfits.sort(key=lambda x: x[0], reverse=True)
                    
                    # Return outfits without scores
                    return [outfit for score, outfit in scored_outfits]
            except json.JSONDecodeError:
                pass
        
        # Try to find the JSON array in the response
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]") + 1
        
        if start_idx != -1 and end_idx > start_idx:
            try:
                outfits = json.loads(response_text[start_idx:end_idx])
                if isinstance(outfits, list):
                    # Calculate scores and sort
                    scored_outfits = []
                    for outfit in outfits:
                        item_ids = outfit.get('item_ids', [])
                        outfit_items = [item for item in clothing_list if item.get('id') in item_ids]
                        score = calculate_outfit_score(outfit_items, occasion)
                        scored_outfits.append((score, outfit))
                    
                    # Sort by score (descending)
                    scored_outfits.sort(key=lambda x: x[0], reverse=True)
                    
                    # Return outfits without scores
                    return [outfit for score, outfit in scored_outfits]
            except json.JSONDecodeError:
                pass
        
        # Fallback: Try to extract outfit objects using regex
        import re
        outfit_pattern = r'\{[^{}]*"outfit_name"[^{}]*"item_ids"[^{}]*\}'
        matches = re.findall(outfit_pattern, response_text)
        
        if matches:
            outfits = []
            for match in matches[:3]:
                try:
                    outfit = json.loads(match)
                    outfits.append(outfit)
                except:
                    pass
            if outfits:
                # Calculate scores and sort
                scored_outfits = []
                for outfit in outfits:
                    item_ids = outfit.get('item_ids', [])
                    outfit_items = [item for item in clothing_list if item.get('id') in item_ids]
                    score = calculate_outfit_score(outfit_items, occasion)
                    scored_outfits.append((score, outfit))
                
                # Sort by score (descending)
                scored_outfits.sort(key=lambda x: x[0], reverse=True)
                
                # Return outfits without scores
                return [outfit for score, outfit in scored_outfits]
        
        return [{
            "outfit_name": "Unable to generate",
            "description": "Could not parse AI response",
            "item_ids": [],
            "styling_tips": response_text
        }]
    
    except Exception as e:
        return [{
            "outfit_name": "Error",
            "description": f"Error generating outfit: {str(e)}",
            "item_ids": [],
            "styling_tips": ""
        }]
