import google.generativeai as genai
import json
import base64
import os
from pathlib import Path

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

genai.configure(api_key=GEMINI_API_KEY)


def analyze_face_photo(image_path: str) -> dict:
    """
    Analyze face photo for skin tone, undertones, and color recommendations using Gemini Vision API.
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
        
        analysis_prompt = """Analyze this face photo and provide a comprehensive skin tone and color analysis for fashion recommendations.

Return ONLY valid JSON (no markdown, no extra text):

{
  "skin_tone": "fair|light|medium|tan|deep|dark",
  "undertone": "cool|warm|neutral",
  "undertone_confidence": 0.85,
  "best_colors": [
    {"name": "Navy Blue", "hex": "#1e3a8a", "reason": "why it works"},
    {"name": "Olive Green", "hex": "#6b7c3c", "reason": "enhances undertones"},
    {"name": "Burgundy", "hex": "#800020", "reason": "complements skin"},
    {"name": "Cream", "hex": "#fffdd0", "reason": "soft neutral"},
    {"name": "Charcoal", "hex": "#36454f", "reason": "versatile base"}
  ],
  "avoid_colors": [
    {"name": "Pale Pink", "hex": "#fadadd", "reason": "washes out complexion"},
    {"name": "Icy Blue", "hex": "#b0e0e6", "reason": "clashes with undertones"}
  ],
  "complementary_palette": {
    "neutrals": ["White", "Cream", "Charcoal", "Taupe"],
    "accent_colors": ["Specific colors that pop"],
    "metallics": "gold|silver|rose_gold"
  },
  "seasonal_palette": "spring|summer|autumn|winter",
  "analysis_notes": "Brief 1-2 sentence explanation of why these colors work for this person",
  "lighting_quality": "good|acceptable|poor",
  "confidence_score": 0.9
}

Analysis Guidelines:
- Carefully examine skin undertones (look at veins, natural flush, eye whites)
- Consider warmth vs coolness of the complexion
- Suggest 5-8 best colors with specific names and hex codes
- Suggest 2-4 colors to avoid
- Focus on colors that enhance, not wash out
- Consider both clothing and accessories
- Be specific with color names (not just "blue", but "Navy Blue" or "Sky Blue")
- Provide actionable reasons for each recommendation

Return ONLY the JSON object, starting with { and ending with }."""
        
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
        
        # Clean markdown if present
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        # Try to parse as JSON
        try:
            analysis_data = json.loads(response_text)
            
            # Validate required fields
            required_fields = ["skin_tone", "undertone", "best_colors", "avoid_colors"]
            if all(field in analysis_data for field in required_fields):
                return {
                    "analysis_successful": True,
                    "data": analysis_data
                }
            else:
                return {
                    "analysis_successful": False,
                    "error": "Missing required fields in AI response",
                    "raw_response": response_text[:500]
                }
                
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {str(e)}")
            return {
                "analysis_successful": False,
                "error": "Failed to parse AI response as JSON",
                "raw_response": response_text[:500]
            }
    
    except Exception as e:
        print(f"Face Analysis Error: {str(e)}")
        return {
            "analysis_successful": False,
            "error": str(e)
        }


def analyze_body_photo(image_path: str) -> dict:
    """
    Analyze full-body photo to determine body shape and fit recommendations using Gemini Vision API.
    """
    
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            return {
                "analysis_successful": False,
                "error": f"Image file not found: {image_path}"
            }
        
        # Determine MIME type
        mime_type = "image/jpeg"
        if image_path.lower().endswith((".png", ".PNG")):
            mime_type = "image/png"
        elif image_path.lower().endswith((".gif", ".GIF")):
            mime_type = "image/gif"
        elif image_path.lower().endswith((".webp", ".WEBP")):
            mime_type = "image/webp"
        
        # Read image
        with open(image_path, "rb") as img_file:
            image_bytes = img_file.read()
        
        image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
        
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        analysis_prompt = """Analyze this full-body photo to determine body shape and provide personalized fit recommendations.

Return ONLY valid JSON (no markdown):

{
  "body_shape": "rectangle|triangle|inverted_triangle|hourglass|pear|apple|athletic",
  "body_shape_confidence": 0.88,
  "proportions": {
    "shoulders": "narrow|average|broad",
    "waist": "defined|straight|undefined",
    "hips": "narrow|average|wide",
    "torso_length": "short|average|long",
    "leg_length": "short|average|long"
  },
  "height_estimate": 170,
  "recommended_fits": {
    "tops": {
      "fit": "slim|regular|relaxed|oversized",
      "reason": "Detailed explanation of why this fit flatters the body shape",
      "necklines": ["V-neck", "Crew neck", "Scoop neck"],
      "sleeve_lengths": ["Short sleeve", "3/4 sleeve", "Long sleeve"],
      "specific_tips": ["Tip 1", "Tip 2"]
    },
    "bottoms": {
      "fit": "slim|straight|tapered|wide|bootcut",
      "reason": "Why this fit creates the best silhouette",
      "rise": "high|mid|low",
      "styles": ["Straight jeans", "Chinos", "Tailored trousers"],
      "specific_tips": ["Tip 1", "Tip 2"]
    }
  },
  "balance_tips": [
    "Create visual balance by...",
    "Emphasize strengths with...",
    "Create proportion harmony through..."
  ],
  "flattering_details": [
    "Specific style elements that work well",
    "Pattern or cut recommendations",
    "Layering suggestions"
  ],
  "photo_quality": "good|acceptable|poor",
  "visibility_issues": "none|partially_obscured|poor_lighting|clothing_too_loose",
  "confidence_score": 0.85
}

Analysis Guidelines:
- Focus on proportion balance and visual harmony, NOT body size
- Recommend fits that enhance the natural shape
- Be specific with neckline, sleeve, and pant recommendations
- Consider how to create visual balance
- Provide actionable, positive style tips
- If photo quality is poor or body is obscured, note it in visibility_issues
- Base height estimate on visible proportions (150-200cm range)

Return ONLY the JSON object."""
        
        # Call Gemini
        response = model.generate_content([
            {
                "mime_type": mime_type,
                "data": image_data,
            },
            analysis_prompt
        ])
        
        response_text = response.text.strip()
        
        # Clean markdown
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        # Parse JSON
        try:
            analysis_data = json.loads(response_text)
            
            required_fields = ["body_shape", "proportions", "recommended_fits"]
            if all(field in analysis_data for field in required_fields):
                return {
                    "analysis_successful": True,
                    "data": analysis_data
                }
            else:
                return {
                    "analysis_successful": False,
                    "error": "Missing required fields in AI response",
                    "raw_response": response_text[:500]
                }
                
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {str(e)}")
            return {
                "analysis_successful": False,
                "error": "Failed to parse AI response",
                "raw_response": response_text[:500]
            }
    
    except Exception as e:
        print(f"Body Analysis Error: {str(e)}")
        return {
            "analysis_successful": False,
            "error": str(e)
        }


def analyze_style_inspiration(image_paths: list) -> dict:
    """
    Analyze multiple outfit photos to extract style preferences using Gemini Vision API.
    """
    
    try:
        if not image_paths or len(image_paths) == 0:
            return {
                "analysis_successful": False,
                "error": "No images provided"
            }
        
        # Prepare images
        images_data = []
        for image_path in image_paths[:5]:  # Limit to 5 photos
            if not os.path.exists(image_path):
                continue
                
            mime_type = "image/jpeg"
            if image_path.lower().endswith((".png", ".PNG")):
                mime_type = "image/png"
            
            with open(image_path, "rb") as img_file:
                image_bytes = img_file.read()
            
            image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
            images_data.append({
                "mime_type": mime_type,
                "data": image_data
            })
        
        if len(images_data) == 0:
            return {
                "analysis_successful": False,
                "error": "No valid images found"
            }
        
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        analysis_prompt = f"""Analyze these {len(images_data)} outfit photos to extract the user's style preferences and patterns.

Return ONLY valid JSON (no markdown):

{{
  "dominant_styles": [
    "minimalist",
    "classic",
    "streetwear"
  ],
  "color_patterns": {{
    "most_worn_colors": ["Black", "White", "Navy", "Olive"],
    "color_combinations": ["Black + White", "Navy + Tan"],
    "color_preference": "monochrome|colorful|neutral_with_pops|earth_tones"
  }},
  "pattern_preferences": {{
    "patterns_used": ["Solid", "Striped", "Graphic"],
    "pattern_frequency": "often|sometimes|rarely"
  }},
  "fit_preferences": {{
    "general_fit": "slim|regular|oversized|mixed",
    "consistency": "very_consistent|somewhat_consistent|varied"
  }},
  "formality_level": {{
    "primary": "casual|business_casual|formal|athleisure",
    "range": "single_style|versatile"
  }},
  "signature_elements": [
    "Specific recurring accessories or style elements",
    "Layering patterns",
    "Unique details"
  ],
  "style_evolution": "consistent|experimental|transitioning",
  "style_personality": "Brief 2-3 sentence description of their overall style",
  "confidence_score": 0.82
}}

Analysis Focus:
- Identify recurring color themes across all photos
- Note consistent fit preferences
- Assess formality spectrum
- Identify unique style markers or signatures
- Determine if style is cohesive or varied
- Provide actionable style personality description

Return ONLY the JSON object."""
        
        # Prepare content with all images
        content = []
        for img_data in images_data:
            content.append(img_data)
        content.append(analysis_prompt)
        
        # Call Gemini
        response = model.generate_content(content)
        response_text = response.text.strip()
        
        # Clean markdown
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        # Parse JSON
        try:
            analysis_data = json.loads(response_text)
            
            return {
                "analysis_successful": True,
                "data": analysis_data,
                "photos_analyzed": len(images_data)
            }
                
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {str(e)}")
            return {
                "analysis_successful": False,
                "error": "Failed to parse AI response",
                "raw_response": response_text[:500]
            }
    
    except Exception as e:
        print(f"Style Inspiration Analysis Error: {str(e)}")
        return {
            "analysis_successful": False,
            "error": str(e)
        }


def generate_personalized_summary(style_dna_data: dict) -> dict:
    """
    Generate a comprehensive personalized style summary combining all analyses.
    """
    
    summary = {
        "profile_complete": False,
        "complexion_profile": None,
        "body_profile": None,
        "style_profile": None,
        "personalized_tips": []
    }
    
    # Check what's available
    has_face = style_dna_data.get("face_photo_analyzed", False)
    has_body = style_dna_data.get("body_photo_analyzed", False)
    has_style = style_dna_data.get("inspiration_analyzed", False)
    
    # Complexion profile
    if has_face:
        summary["complexion_profile"] = {
            "skin_tone": style_dna_data.get("skin_tone"),
            "undertone": style_dna_data.get("skin_undertone"),
            "seasonal_palette": style_dna_data.get("seasonal_palette"),
            "confidence": style_dna_data.get("complexion_confidence")
        }
        summary["personalized_tips"].append(
            f"Your {style_dna_data.get('skin_undertone', 'warm')} undertones are enhanced by {style_dna_data.get('seasonal_palette', 'autumn')} colors"
        )
    
    # Body profile
    if has_body:
        summary["body_profile"] = {
            "body_shape": style_dna_data.get("body_shape"),
            "recommended_fit": style_dna_data.get("fit_preference"),
            "confidence": style_dna_data.get("body_analysis_confidence")
        }
        summary["personalized_tips"].append(
            f"{style_dna_data.get('fit_preference', 'Regular')} fit clothing will flatter your {style_dna_data.get('body_shape', 'body')} shape"
        )
    
    # Style profile
    if has_style:
        summary["style_profile"] = {
            "dominant_style": style_dna_data.get("style_preferences"),
            "formality": style_dna_data.get("formality_level"),
            "confidence": style_dna_data.get("style_confidence")
        }
    
    summary["profile_complete"] = has_face and has_body
    
    return summary
