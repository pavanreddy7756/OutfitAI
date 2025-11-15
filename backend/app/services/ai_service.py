import base64
import json
import re
import google.generativeai as genai
from app.config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_clothing_image(image_path: str) -> dict:
    """Analyze clothing item from image using Google Gemini Vision API"""
    try:
        with open(image_path, "rb") as image_file:
            image_data = base64.b64encode(image_file.read()).decode("utf-8")
        
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        response = model.generate_content([
            """Analyze this clothing item and return ONLY a valid JSON object (no markdown, no code blocks) with these exact keys:
{
  "category": "shirt/pants/shoes/jacket/dress/skirt/blazer/sweater/coat/hat/accessory/other",
  "color": "primary color",
  "style": "casual/formal/sporty/vintage/bohemian/minimalist/streetwear/preppy/other",
  "description": "brief description of the item in 1-2 sentences",
  "material": "fabric type if visible",
  "fit": "loose/regular/fitted/oversized"
}
Return ONLY the JSON object, nothing else.""",
            {
                "mime_type": "image/jpeg",
                "data": image_data
            }
        ])
        
        result_text = response.text.strip()
        # Remove markdown code blocks if present
        result_text = re.sub(r'```json\n?', '', result_text)
        result_text = re.sub(r'```\n?', '', result_text)
        result_text = result_text.strip()
        
        # Parse JSON
        return json.loads(result_text)
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return {
            "category": "unknown",
            "color": "unknown",
            "style": "unknown",
            "description": "Unable to analyze image",
            "material": "unknown",
            "fit": "regular"
        }

def generate_outfit_suggestions(clothing_items: list, occasion: str, season: str = None, weather: str = None) -> str:
    """Generate outfit suggestions that return matching clothing items with descriptions"""
    try:
        items_description = "\n".join([
            f"- ID {item['id']}: {item['category']} ({item['color']}, {item['style']}) - {item.get('description', '')}"
            for item in clothing_items
        ])
        
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        prompt = f"""Based on these available clothing items:
{items_description}

For a {occasion} occasion{f' in {season}' if season else ''}{f' during {weather} weather' if weather else ''}, suggest 3 outfit combinations.

IMPORTANT: Return ONLY a valid JSON array. NO markdown code blocks, NO extra text, NO explanations.

The response must be valid JSON starting with [ and ending with ].

Each outfit object MUST have exactly these fields:
{{"outfit_name": "string", "description": "string", "item_ids": [integer, integer], "styling_tips": "string"}}

Return the complete array:
[
{{"outfit_name": "name1", "description": "desc1", "item_ids": [1, 2], "styling_tips": "tips1"}},
{{"outfit_name": "name2", "description": "desc2", "item_ids": [3, 4], "styling_tips": "tips2"}},
{{"outfit_name": "name3", "description": "desc3", "item_ids": [5, 6], "styling_tips": "tips3"}}
]

RESPONSE MUST START WITH [ AND END WITH ]. NO OTHER TEXT."""
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Remove markdown code blocks if present
        result_text = re.sub(r'```json\n?', '', result_text)
        result_text = re.sub(r'```\n?', '', result_text)
        result_text = result_text.strip()
        
        # Try to parse as JSON to validate
        parsed = json.loads(result_text)
        
        # Ensure it's an array
        if isinstance(parsed, list):
            return json.dumps(parsed)
        else:
            return json.dumps([parsed])
    
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating outfits: {e}")
        
        if "quota" in error_msg.lower():
            return json.dumps({"error": "API quota exceeded. Please try again later."})
        elif "401" in error_msg or "unauthorized" in error_msg.lower():
            return json.dumps({"error": "API key is invalid. Please check your configuration."})
        else:
            return json.dumps({"error": f"Unable to generate outfit suggestions: {error_msg[:100]}"})
