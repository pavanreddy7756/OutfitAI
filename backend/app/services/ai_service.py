import google.generativeai as genai
import json
import base64
import os
from pathlib import Path
from app.services.outfit_builder import (
    build_outfit_candidates,
    validate_outfit_combination,
    categorize_item
)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

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
        
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        
        analysis_prompt = """Analyze this clothing/accessory/footwear item image in EXTREME DETAIL and return ONLY a valid JSON object (no markdown, no extra text).

CRITICAL CONFIDENCE RULES:
1. ONLY include brand/model if you are VERY CONFIDENT (90%+ certain)
2. For shoes: Try to identify specific models (Air Max 90, Samba, Chuck Taylor, etc.)
3. For watches: Try to identify models (Series 9, G-Shock GA-2100, etc.)
4. For bags/accessories: Try to identify models (Neverfull, Classic Flap, etc.)
5. If uncertain about brand/model, set to null - better to show nothing than guess wrong
6. NEVER use placeholder text like "appears to be" or "looks like" - either know it or set null

CONFIDENCE HIERARCHY (Apple's way):
- High confidence: brand + model + subcategory
- Medium confidence: brand + subcategory
- Low confidence: just descriptive subcategory + color
- Set null for any field you're not confident about

{
  "category": "main category (shirt, pants, dress, jacket, shoes, sneakers, boots, watch, bag, sunglasses, hat, jewelry, etc.)",
  "subcategory": "specific type (t-shirt, running-shoes, smartwatch, luxury-watch, backpack, tote, etc.)",
  "brand": "ONLY if 90%+ confident: Nike, Adidas, Apple, Casio, Rolex, Gucci, etc. Otherwise null",
  "model": "ONLY if 90%+ confident about specific model: Air Max 90, Samba, Series 9, G-Shock GA-2100, etc. Otherwise null",
  "color": "primary color (be specific: navy blue, forest green, cream, burgundy, black, white, silver, etc.)",
  "secondary_colors": "other colors present, comma-separated or null",
  "fit_type": "slim, regular, oversized, boxy, athletic, tailored, relaxed, etc. or null if not applicable",
  "silhouette": "fitted, relaxed, loose, tapered, A-line, bodycon, etc. or null if not applicable",
  "sleeve_type": "full, 3/4, short, sleeveless, cap, flutter, raglan, batwing, etc. or null if not applicable",
  "sleeve_fit": "fitted, relaxed, puffed, bell, etc. or null if not applicable",
  "neckline": "crew, v-neck, scoop, polo, henley, turtleneck, mock-neck, halter, etc. or null if not applicable",
  "collar_type": "spread, button-down, club, pointed, mandarin, etc. or null if not applicable",
  "collar_closure": "buttons, zipper, snaps, none, etc. or null if not applicable",
  "texture": "smooth, ribbed, knitted, woven, denim, linen, corduroy, velvet, fleece, leather, metal, rubber, etc.",
  "fabric_type": "cotton, polyester, silk, wool, linen, blend, synthetic, rayon, leather, metal, silicone, etc.",
  "fabric_weight": "light, medium, heavy or null",
  "pattern": "solid, striped, plaid, checkered, floral, graphic, geometric, tie-dye, argyle, etc.",
  "pattern_description": "detailed description of the pattern if not solid, otherwise null",
  "length": "short, cropped, regular, long, knee-length, midi, maxi, full-length, etc. or null if not applicable",
  "waist_type": "high-waist, mid-rise, low-rise, ultra-low, etc. or null if not applicable",
  "pant_type": "jeans, chino, formal, cargo, joggers, leggings, shorts, capris, etc. or null if not applicable",
  "pant_fit": "slim, skinny, straight, tapered, baggy, bootcut, flare, wide-leg, etc. or null if not applicable",
  "pant_rise": "high, mid, low or null if not applicable",
  "condition": "new, excellent, good, fair, worn, distressed",
  "distressing_level": "none, minimal, moderate, heavy",
  "occasion_tags": "casual, formal, business, athletic, party, date-night, weekend, work, lounge, travel, sport",
  "style_tags": "minimalist, bohemian, streetwear, classic, trendy, vintage, preppy, edgy, romantic, athletic, sportswear, luxury, tech, smart, casual",
  "season_tags": "summer, winter, spring, fall, all-season",
  "special_features": "pockets, hood, drawstring, belt, collar, cuffs, zip, buttons, adjustable, waterproof, touchscreen, GPS, heart-rate, etc. or null",
  "detailed_description": "A comprehensive 2-3 sentence description including brand/model only if confident",
  "quality_score": 7.5
}

EXAMPLES OF PROPER CONFIDENCE:
✅ GOOD: "brand": "Adidas", "model": "Samba" (if you clearly see it's Samba)
✅ GOOD: "brand": "Adidas", "model": null (if you see Adidas logo but unsure of model)
✅ GOOD: "brand": null, "model": null (if uncertain about brand)
❌ BAD: "brand": "possibly Nike" (never use qualifiers - null instead)
❌ BAD: "model": "unknown sneaker" (null instead)

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


def calculate_outfit_score(
    outfit_items: list, 
    occasion: str, 
    underused_items: set = None,
    recent_combinations: list = None,
    force_include_item_ids: list = None
) -> float:
    """
    Calculate a relevance score for an outfit based on the occasion and item compatibility.
    Enhanced with novelty tracking, wardrobe coverage optimization, and forced item validation.
    
    Args:
        outfit_items: List of clothing item dictionaries
        occasion: The requested occasion
        underused_items: Set of item IDs that are underused
        recent_combinations: List of recent outfit combinations (sets of item IDs)
        force_include_item_ids: List of item IDs that MUST be included
    
    Returns:
        Score between 0-150 (higher is better, enhanced scoring with novelty/coverage)
    """
    score = 0.0
    
    if not outfit_items:
        return 0.0
    
    item_ids = [item.get('id') for item in outfit_items]
    
    # 0. Forced Item Check (Critical)
    if force_include_item_ids:
        missing_forced = [fid for fid in force_include_item_ids if fid not in item_ids]
        if missing_forced:
            return 0.0  # Immediate fail if forced items are missing
    
    # 1. Occasion Match (30% weight, reduced from 40%)
    occasion_score = 0.0
    occasion_lower = occasion.lower()
    for item in outfit_items:
        occasion_tags = item.get('occasion_tags') or ''
        occasion_tags = occasion_tags.lower() if occasion_tags else ''
        if occasion_lower in occasion_tags:
            occasion_score += 30.0 / len(outfit_items)
    
    # 2. Style Coherence (25% weight, reduced from 30%)
    style_score = 0.0
    style_tags_list = []
    for item in outfit_items:
        style_tags = item.get('style_tags') or ''
        style_tags = style_tags.lower() if style_tags else ''
        style_tags_list.append(style_tags.split(', ') if style_tags else [])
    if len(style_tags_list) > 1:
        # Check for common style tags
        common_styles = set(style_tags_list[0])
        for tags in style_tags_list[1:]:
            common_styles &= set(tags)
        if common_styles:
            style_score = 25.0
        else:
            # Partial match
            style_score = 12.0
    else:
        style_score = 25.0  # Single item gets full score
    
    # 3. Quality Score (15% weight, reduced from 20%)
    quality_score = 0.0
    for item in outfit_items:
        quality = item.get('quality_score', 7.0)
        quality_score += (quality / 10.0) * (15.0 / len(outfit_items))
    
    # 4. Color Coordination (10% weight, same)
    color_score = 10.0  # Default to full score (assume AI already checked this)
    
    # Base score (total: 80 points)
    base_score = occasion_score + style_score + quality_score + color_score
    
    # === NEW ENHANCED SCORING ===
    
    # 5. Variety Score (15 points) - Bonus for including underused items
    variety_score = 0.0
    if underused_items:
        from app.services.usage_stats_service import compute_variety_score
        variety_score = compute_variety_score(item_ids, underused_items)
    
    # 6. Coverage Bonus (15 points) - Boost for using bottom 25% items
    coverage_bonus = 0.0
    if underused_items:
        from app.services.usage_stats_service import compute_coverage_bonus
        coverage_bonus = compute_coverage_bonus(item_ids, underused_items)
    
    # 7. Pair Novelty (10 points) - First-time pairings
    pair_novelty = 0.0
    if recent_combinations:
        from app.services.usage_stats_service import compute_pair_novelty
        pair_novelty = compute_pair_novelty(item_ids, recent_combinations)
    else:
        pair_novelty = 10.0  # No history = full novelty
    
    # 8. Rotation Penalty (-20 points max) - Penalize recent repeats
    rotation_penalty = 0.0
    if recent_combinations:
        from app.services.usage_stats_service import compute_rotation_penalty
        rotation_penalty = compute_rotation_penalty(item_ids, recent_combinations, threshold=0.5)
    
    # Total enhanced score (max: 80 base + 15 variety + 15 coverage + 10 novelty = 120, minus rotation penalty)
    score = base_score + variety_score + coverage_bonus + pair_novelty - rotation_penalty
    
    return round(max(0, score), 2)


def generate_outfit_suggestions(
    clothing_list: list, 
    occasion: str = "casual", 
    style_dna: dict = None, 
    previous_suggestions: str = None,
    underused_items: list = None,
    recent_combinations: list = None,
    force_include_item_ids: list = None
) -> list:
    """
    Generate outfit suggestions using Gemini 2.0-Flash model.
    Enhanced with usage stats to promote wardrobe diversity and novelty.
    
    Args:
        clothing_list: List of available clothing items with their IDs and descriptions
        occasion: The occasion for the outfit (casual, formal, business, party, etc.)
        style_dna: User's style preferences dictionary
        previous_suggestions: Previous outfit combinations to avoid
        underused_items: List of underutilized items to prioritize
        recent_combinations: Recent outfit combinations to avoid repeating
        force_include_item_ids: List of item IDs that MUST be included in every outfit
    
    Returns:
        List of outfit suggestions in JSON format with proper structure, sorted by enhanced relevance score
    """
    
    try:
        # Format the clothing items for the prompt
        clothing_descriptions = []
        for item in clothing_list:
            default_desc = f"{item.get('category')} - {item.get('color')}"
            desc = f"ID: {item.get('id')}, {item.get('detailed_description', default_desc)}"
            clothing_descriptions.append(desc)
        
        clothing_text = "\n".join(clothing_descriptions)
        
        print(f"\n[AI Service] Generating outfits for: {occasion}")
        print(f"[AI Service] Available items count: {len(clothing_list)}")
        print(f"[AI Service] Item IDs available: {[item.get('id') for item in clothing_list]}")
        
        # Build style preferences context
        style_context = ""
        if style_dna:
            style_prefs = []
            if style_dna.get('custom_preferences'):
                style_prefs.append(f"Personal Preferences: {style_dna['custom_preferences']}")
            if style_dna.get('body_type'):
                style_prefs.append(f"Body type: {style_dna['body_type']}")
            if style_dna.get('skin_tone'):
                style_prefs.append(f"Skin tone: {style_dna['skin_tone']}")
            if style_dna.get('favorite_colors'):
                style_prefs.append(f"Favorite colors: {style_dna['favorite_colors']}")
            if style_dna.get('avoid_colors'):
                style_prefs.append(f"Colors to avoid: {style_dna['avoid_colors']}")
            if style_dna.get('style_preferences'):
                style_prefs.append(f"Preferred styles: {style_dna['style_preferences']}")
            if style_dna.get('fit_preference'):
                style_prefs.append(f"Preferred fit: {style_dna['fit_preference']}")
            if style_dna.get('preferred_patterns'):
                style_prefs.append(f"Preferred patterns: {style_dna['preferred_patterns']}")
            if style_dna.get('avoid_patterns'):
                style_prefs.append(f"Patterns to avoid: {style_dna['avoid_patterns']}")
            if style_dna.get('formality_level'):
                style_prefs.append(f"Formality preference: {style_dna['formality_level']}")
            
            if style_prefs:
                style_context = "\n\nUser's Style Preferences:\n" + "\n".join(style_prefs)
        
        # Add previous suggestions context to avoid duplicates
        avoid_context = ""
        if previous_suggestions:
            avoid_context = f"\n\nIMPORTANT: The user has already seen these outfit combinations. Create COMPLETELY DIFFERENT outfits:\n{previous_suggestions}\n\nDo NOT repeat any of these combinations. Use different items, different color schemes, and different styling approaches."
        
        # Add underused items context for wardrobe coverage
        underused_context = ""
        if underused_items and len(underused_items) > 0:
            underused_descriptions = []
            for item in underused_items:
                desc = f"ID {item.get('id')}: {item.get('category')}"
                if item.get('brand'):
                    desc += f" - {item.get('brand')}"
                if item.get('color'):
                    desc += f" ({item.get('color')})"
                underused_descriptions.append(desc)
            
            underused_context = f"\n\n🎯 PRIORITIZE THESE UNDERUSED ITEMS (if stylistically appropriate):\n" + "\n".join(underused_descriptions) + "\n\nThese items haven't been featured recently. Try to include at least ONE in each outfit if it fits the aesthetic and occasion."
        
        if recent_combinations and len(recent_combinations) > 0:
            from app.services.usage_stats_service import format_recent_combinations_for_prompt
            formatted_recent = format_recent_combinations_for_prompt(recent_combinations)
            recent_avoid_context = f"\n\n⚠️ AVOID REPEATING THESE RECENT COMBINATIONS:\nRecent item ID sets: {formatted_recent}\n\nDo NOT use the same 3+ items together that appear in these recent outfits."

        # Add forced items context with detailed styling guidance
        forced_context = ""
        if force_include_item_ids:
            from app.services.outfit_builder import categorize_item
            
            forced_items_desc = []
            forced_item_details = []
            for item in clothing_list:
                if item.get('id') in force_include_item_ids:
                    # Determine slot for the forced item
                    item_slot = categorize_item(item)
                    slot_name_map = {
                        'base_top': 'BASE TOP',
                        'layer': 'LAYER',
                        'bottom': 'BOTTOM',
                        'shoes': 'SHOES',
                        'accessory': 'ACCESSORY'
                    }
                    
                    # Build detailed description for AI context
                    desc = f"ID {item.get('id')}: {item.get('category')}"
                    if item.get('brand'):
                        desc += f" by {item.get('brand')}"
                    if item.get('model'):
                        desc += f" ({item.get('model')})"
                    desc += f" - {item.get('color')}"
                    if item.get('pattern') and item.get('pattern') != 'solid':
                        desc += f", {item.get('pattern')} pattern"
                    if item.get('style_tags'):
                        desc += f" [{item.get('style_tags')}]"
                    desc += f" **SLOT: {slot_name_map.get(item_slot, item_slot)}**"
                    
                    forced_items_desc.append(desc)
                    forced_item_details.append((item, item_slot))
            
            # Build slot warning based on forced item type
            slot_warnings = []
            for item, slot in forced_item_details:
                if slot == 'base_top':
                    slot_warnings.append("🚨🚨🚨 CRITICAL: This is a BASE TOP (shirt/tee/blouse)")
                    slot_warnings.append("❌ DO NOT ADD: another shirt, t-shirt, polo, sweater, or any other BASE TOP")
                    slot_warnings.append("✅ YOU MAY ADD: jacket/blazer (as LAYER), + pants + shoes + accessories")
                elif slot == 'layer':
                    slot_warnings.append("🚨🚨🚨 CRITICAL: This is a LAYER (jacket/blazer/coat)")
                    slot_warnings.append("❌ DO NOT ADD: another jacket, blazer, or coat")
                    slot_warnings.append("✅ YOU MUST ADD: shirt/tee underneath (BASE TOP), + pants + shoes")
                elif slot == 'bottom':
                    slot_warnings.append("🚨🚨🚨 CRITICAL: This is a BOTTOM (pants/jeans/skirt)")
                    slot_warnings.append("❌ DO NOT ADD: another pants, jeans, or shorts")
                    slot_warnings.append("✅ YOU MUST ADD: shirt/tee (BASE TOP), + shoes + optional jacket")
                elif slot == 'shoes':
                    slot_warnings.append("🚨🚨🚨 CRITICAL: These are SHOES")
                    slot_warnings.append("❌ DO NOT ADD: another pair of shoes")
                    slot_warnings.append("✅ YOU MUST ADD: shirt/tee (BASE TOP), + pants (BOTTOM)")
            
            # Create context that encourages thoughtful outfit building
            forced_context = f"""

🚨 FEATURED ITEM - BUILD OUTFITS AROUND THIS:
{chr(10).join(forced_items_desc)}

{chr(10).join(slot_warnings)}

⚠️ OUTFIT STRUCTURE RULE (NEVER VIOLATE THIS):
- EXACTLY ONE item from each required slot
- BASE TOP slot = shirt OR tee OR polo OR sweater OR blouse (pick ONE only)
- LAYER slot = jacket OR blazer OR coat OR cardigan (optional, max ONE)  
- BOTTOM slot = pants OR jeans OR shorts OR skirt (pick ONE only)
- SHOES slot = one pair of footwear (pick ONE only)
- ACCESSORIES = watch, jewelry, belt, etc. (optional, 0-2 items)

CRITICAL STYLING RULES FOR FEATURED ITEM:
1. This item MUST be the star/focal point of EVERY outfit
2. Build complementary pieces around it - don't compete with it
3. If the featured item is bold/patterned: pair with solid neutrals
4. If the featured item is neutral/basic: add interest through layering or accessories
5. Consider the item's formality level and match other pieces accordingly
6. Think about color harmony - use the color wheel (complementary, analogous, or monochromatic)
7. Create DISTINCT outfits - vary the vibe (casual→smart casual→elevated casual)

THINK LIKE A PROFESSIONAL STYLIST:
- Outfit 1: Most wearable, everyday option
- Outfit 2: Slightly elevated, date/dinner appropriate
- Outfit 3: Creative/fashion-forward interpretation

Each outfit should showcase a DIFFERENT way to wear this item!"""
        
        prompt = f"""You are an elite personal stylist with 20+ years of experience working with celebrities, fashion weeks, and luxury brands. You have an impeccable eye for style, color theory, proportions, and modern fashion trends. Your expertise spans from timeless classic looks to cutting-edge contemporary fashion.

Your mission: Create 3 EXCEPTIONAL outfit combinations for a {occasion} occasion that will make the wearer look and feel their absolute best.

Available clothing items:
{clothing_text}{style_context}{avoid_context}{underused_context}{recent_avoid_context}{forced_context}

STYLING PHILOSOPHY:
- Every outfit should tell a cohesive story
- Color coordination is paramount - use complementary or monochromatic schemes
- Balance proportions (fitted top + relaxed bottom, or vice versa)
- Layer thoughtfully - textures and fabrics should complement each other
- Accessories are the finishing touch that elevate good to extraordinary
- Consider the occasion's formality, time of day, and social context
- Ensure comfort meets style - confidence comes from both

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 CRITICAL OUTFIT STRUCTURE RULES - FOLLOW EXACTLY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each outfit MUST follow this EXACT slot structure:

1️⃣ BASE TOP (REQUIRED): Exactly ONE from:
   • shirt, t-shirt, polo, blouse, sweater, knit, henley
   
2️⃣ LAYER (OPTIONAL): At most ONE from:
   • jacket, blazer, coat, cardigan, overshirt, hoodie, bomber, vest
   • Only include if weather/occasion/style calls for it
   • NEVER use two base tops together (e.g., NO polo + t-shirt)
   • Layer must be different category than base top
   
3️⃣ BOTTOM (REQUIRED): Exactly ONE from:
   • pants, jeans, trousers, chinos, joggers, shorts, skirt, dress
   
4️⃣ SHOES (REQUIRED): Exactly ONE pair from:
   • sneakers, boots, loafers, sandals, heels, oxfords
   
5️⃣ ACCESSORIES (OPTIONAL): 0-2 items from:
   • watch, necklace, chain, ring, bracelet, belt, bag, hat, sunglasses
   • Only include if they elevate the outfit
   • Skip if outfit already has enough visual interest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 COLOR HARMONY RULES (Fashion Expert Level):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Choose ONE color strategy per outfit:

✅ MONOCHROME: Same hue, varied tones
   • Example: Navy shirt + light blue jeans + navy shoes

✅ ANALOGOUS: Adjacent hues on color wheel
   • Example: Teal top + olive pants + brown boots

✅ COMPLEMENTARY: Opposite hues for contrast
   • Example: Navy top + orange accent accessory

✅ NEUTRAL BASE + 1 ACCENT: Black/white/gray/navy/beige + one color
   • Example: White tee + black pants + burgundy jacket

❌ COLOR CLASHES TO AVOID:
   • Red + Pink (too similar, clashing undertones)
   • Orange + Red (both warm & loud)
   • Purple + Brown (muddy combination)
   • Neon + Neon (overwhelming)
   
🎯 COLOR RULE: If forced item is BOLD color → keep ALL other pieces neutral (black/white/gray/navy/beige)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔲 PATTERN & TEXTURE BALANCE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ONE STATEMENT PATTERN MAX per outfit
   • If top has loud pattern (graphic, bold stripe, large check) → bottom MUST be solid
   • If bottom has pattern → top and layer MUST be solid
   
✅ SMALL PATTERNS CAN MIX (advanced only):
   • Pin-stripe shirt + micro-dot tie = OK
   • But NEVER: large check + bold stripe

✅ TEXTURE MIXING:
   • Pair smooth fabrics (cotton tee, dress shirt) with ONE textured piece (knit, leather, suede)
   • Example: Cotton tee + leather jacket + denim jeans = ✅

❌ PATTERN VIOLATIONS:
   • Graphic tee + patterned pants = ❌
   • Loud stripe top + loud check bottom = ❌
   • Multiple graphic pieces = ❌

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👔 FORMALITY & OCCASION MATCHING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Formality Scale (0-5):
• 0-1 (Ultra Casual): Gym wear, athleisure, lounge
• 2 (Casual): T-shirt, jeans, sneakers, casual jacket
• 3 (Smart Casual): Polo/button-down, chinos, loafers, optional blazer
• 4 (Business Casual): Dress shirt, trousers, dress shoes, blazer
• 5 (Formal): Suit, tie, dress shoes

🎯 FORMALITY RULE: All items must be within ±1 level of target occasion
   • Target level 2 (casual) → items can be 1-3
   • Target level 3 (smart-casual) → items can be 2-4
   
❌ FORMALITY VIOLATIONS:
   • Blazer (level 4) + joggers (level 1) = 3 levels apart = ❌
   • Dress shoes (level 4) + graphic tee (level 1) = 3 levels apart = ❌
   • Athletic sneakers (level 1) + suit pants (level 5) = 4 levels apart = ❌

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 PROPORTION & FIT RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ BALANCED SILHOUETTE:
   • Fitted top + Relaxed bottom (slim tee + wide-leg pants)
   • OR Relaxed top + Fitted bottom (oversized sweater + skinny jeans)
   
❌ PROPORTION VIOLATIONS:
   • Tight top + Tight bottom (unless athletic/performance wear)
   • Oversized top + Oversized bottom (sloppy, shapeless)

🎯 BODY TYPE CONSIDERATIONS:
   • If tall/lean → use vertical lines, longer layers
   • If short/curvy → high-waisted bottoms, structured jackets
   • If athletic → emphasize shoulders with structured pieces

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💍 ACCESSORY HIERARCHY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Maximum 2 accessories per outfit:

1️⃣ PRIMARY (choose max ONE):
   • Watch (adds sophistication, maturity)
   • Belt (if pants have belt loops AND outfit needs anchoring)
   • Bag (functional + stylish)

2️⃣ SECONDARY (choose max ONE):
   • Jewelry: necklace, chain, ring, bracelet
   • Statement: hat, sunglasses (smart-casual or fashion-forward only)

🎯 ACCESSORY RULES:
   • Add watch if outfit needs structure/maturity
   • Add chain/necklace if breaking up monotone look
   • Add belt only if pants have belt loops and outfit needs visual anchoring
   • Skip accessories if outfit already has strong visual interest (bold pattern/color)
   • NEVER: hat + sunglasses + watch + necklace = too much

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 STRICT CONFLICT PREVENTION (AUTO-REJECT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ TWO ITEMS FROM SAME SLOT:
   • polo + t-shirt = ❌ (two base tops)
   • two shirts or two tees = ❌ (duplicate base tops)
   • two pants = ❌ (duplicate bottoms)
   • two jackets = ❌ (duplicate layers)
   • two pairs of shoes = ❌

❌ PATTERN OVERLOAD:
   • loud pattern top + loud pattern bottom = ❌

❌ FORMALITY MISMATCH:
   • athletic shoes + formal trousers (>3 levels) = ❌
   • blazer + sweatpants (>3 levels) = ❌

❌ COLOR CLASHES:
   • red + pink = ❌
   • orange + red = ❌
   • purple + brown = ❌

✅ ALWAYS ENSURE:
   • Base top + layer are different categories
   • Formality levels within ±1 of occasion
   • If base top is patterned → layer/bottom solid neutral
   • If forced item is bold → all other pieces neutral

LAYERING RULES:
- If you include a LAYER (jacket/blazer/coat), it must complement the base top
- Layer should be solid if base top has pattern, or vice versa
- Layer adds structure/warmth/style - don't force it if not needed
- Example valid combinations:
  ✅ White tee + black bomber + dark jeans + white sneakers
  ✅ Navy polo + khaki chinos + brown loafers + watch
  ✅ Gray knit + black trousers + chelsea boots
  ✅ Chambray shirt + beige jacket + dark denim + boots + belt

ACCESSORY LOGIC:
- Add watch if outfit needs structure/maturity
- Add chain/necklace if breaking up monotone look
- Add belt only if pants have belt loops and outfit needs anchoring
- Add bag/hat only if practical for occasion
- Maximum 2 accessories unless user style is "expressive/streetwear"

COLOR HARMONY:
- Use 1 dominant color + 1-2 neutrals + optional accent
- Ensure metals (watch, jewelry) match undertone
- Avoid near-duplicate shades that look off (cream + off-white)
- Create visual flow: light top → dark bottom or vice versa

PROPORTION BALANCE:
- Oversized top → tapered/slim bottom
- Fitted top → relaxed/straight bottom
- Wide bottom → structured/fitted top
- Cropped/tucked top → high-rise bottom for elongation

For each outfit:
1. Select 3-6 items (base top + optional layer + bottom + shoes + 0-2 accessories)
2. Verify NO duplicate base tops or conflicting categories
3. Ensure formality, pattern, color harmony
4. Explain why this combination works
5. Provide one professional styling tip

CRITICAL: Return ONLY a JSON array with no other text. The response MUST start with '[' and end with ']'.

Format: [
  {{
    "outfit_name": "Clean, evocative name (2-4 words)",
    "description": "Why this outfit works - mention color harmony, proportion balance, and occasion fit",
    "item_ids": [id1, id2, id3, id4, id5],
    "styling_tips": "One professional tip: tucking, rolling, posture, or how to wear it best"
  }},
  {{...}},
  {{...}}
]

Each outfit MUST have exactly these 4 fields: outfit_name, description, item_ids, styling_tips.
item_ids MUST be an array of numbers.
Return ONLY the JSON array, no markdown, no code blocks, no explanation."""

        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(prompt)
        
        response_text = response.text.strip()
        print(f"\n[AI Service] Generated outfit suggestions for occasion: {occasion}")
        print(f"[AI Service] Number of available items: {len(clothing_list)}")
        if underused_items:
            print(f"[AI Service] Underused items provided: {len(underused_items)}")
        if recent_combinations:
            print(f"[AI Service] Recent combinations to avoid: {len(recent_combinations)}")
        print(f"[AI Service] AI Response: {response_text[:500]}...")  # First 500 chars
        
        # Prepare scoring context
        underused_ids = set(item.get('id') for item in underused_items) if underused_items else set()
        
        # Extract JSON array from response
        if response_text.startswith("["):
            try:
                outfits = json.loads(response_text)
                if isinstance(outfits, list):
                    # Validate and filter outfits
                    valid_outfits = []
                    for outfit in outfits:
                        item_ids = outfit.get('item_ids', [])
                        print(f"[AI Service] Outfit '{outfit.get('outfit_name')}' item_ids: {item_ids}")
                        outfit_items = [item for item in clothing_list if item.get('id') in item_ids]
                        
                        # Validate outfit structure
                        is_valid, error_msg = validate_outfit_combination(outfit_items)
                        if is_valid:
                            score = calculate_outfit_score(outfit_items, occasion, underused_ids, recent_combinations, force_include_item_ids)
                            valid_outfits.append((score, outfit))
                            print(f"[AI Service] ✅ Valid outfit: {outfit.get('outfit_name')} (score: {score})")
                        else:
                            print(f"[AI Service] ❌ Invalid outfit: {outfit.get('outfit_name')} - {error_msg}")
                    
                    # Sort by score (descending)
                    valid_outfits.sort(key=lambda x: x[0], reverse=True)
                    
                    # Return valid outfits without scores
                    return [outfit for score, outfit in valid_outfits] if valid_outfits else [{
                        "outfit_name": "Unable to generate",
                        "description": "No valid outfit combinations found with current wardrobe",
                        "item_ids": [],
                        "styling_tips": ""
                    }]
            except json.JSONDecodeError:
                pass
        
        # Try to find the JSON array in the response
        start_idx = response_text.find("[")
        end_idx = response_text.rfind("]") + 1
        
        if start_idx != -1 and end_idx > start_idx:
            try:
                outfits = json.loads(response_text[start_idx:end_idx])
                if isinstance(outfits, list):
                    # Validate and filter outfits
                    valid_outfits = []
                    for outfit in outfits:
                        item_ids = outfit.get('item_ids', [])
                        outfit_items = [item for item in clothing_list if item.get('id') in item_ids]
                        
                        # Validate outfit structure
                        is_valid, error_msg = validate_outfit_combination(outfit_items)
                        if is_valid:
                            score = calculate_outfit_score(outfit_items, occasion, underused_ids, recent_combinations, force_include_item_ids)
                            valid_outfits.append((score, outfit))
                        else:
                            print(f"[AI Service] ❌ Invalid outfit: {outfit.get('outfit_name')} - {error_msg}")
                    
                    # Sort by score (descending)
                    valid_outfits.sort(key=lambda x: x[0], reverse=True)
                    
                    # Return valid outfits without scores
                    return [outfit for score, outfit in valid_outfits] if valid_outfits else [{
                        "outfit_name": "Unable to generate",
                        "description": "No valid outfit combinations found with current wardrobe",
                        "item_ids": [],
                        "styling_tips": ""
                    }]
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
                    score = calculate_outfit_score(outfit_items, occasion, underused_ids, recent_combinations, force_include_item_ids)
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
