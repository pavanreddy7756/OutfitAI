"""
Outfit Builder Service - Slot-based outfit construction with conflict detection
"""
from typing import List, Dict, Optional, Set


# Category mappings
BASE_TOP_CATEGORIES = {
    'shirt', 't-shirt', 'tshirt', 'tee', 'polo', 'blouse', 
    'knit', 'sweater', 'tank', 'top', 'henley'
}

LAYER_CATEGORIES = {
    'jacket', 'blazer', 'coat', 'cardigan', 'overshirt', 
    'hoodie', 'vest', 'bomber', 'denim jacket', 'leather jacket',
    'windbreaker', 'puffer', 'trench', 'peacoat'
}

BOTTOM_CATEGORIES = {
    'pants', 'jeans', 'trousers', 'chinos', 'joggers', 
    'shorts', 'skirt', 'dress', 'jumpsuit', 'cargo'
}

SHOE_CATEGORIES = {
    'shoes', 'sneakers', 'boots', 'loafers', 'sandals',
    'heels', 'flats', 'oxfords', 'derbies', 'mules',
    'slides', 'trainers', 'running-shoes', 'athletic-shoes'
}

ACCESSORY_CATEGORIES = {
    'watch', 'necklace', 'chain', 'bracelet', 'ring',
    'belt', 'bag', 'backpack', 'tote', 'hat', 'cap',
    'beanie', 'scarf', 'sunglasses', 'glasses', 'tie',
    'bowtie', 'pocket-square'
}

# Formality scores (0=casual, 10=formal)
FORMALITY_SCORES = {
    # Tops
    't-shirt': 2, 'tee': 2, 'tank': 1, 'polo': 4, 'henley': 3,
    'shirt': 5, 'dress-shirt': 7, 'oxford': 6, 'knit': 5, 'sweater': 5,
    
    # Layers
    'hoodie': 2, 'bomber': 3, 'denim-jacket': 3, 'leather-jacket': 4,
    'blazer': 8, 'suit-jacket': 9, 'coat': 6, 'cardigan': 5, 'overshirt': 4,
    
    # Bottoms
    'joggers': 2, 'cargo': 2, 'jeans': 3, 'chinos': 5, 'dress-pants': 7,
    'trousers': 6, 'shorts': 2, 'skirt': 5, 'dress': 6,
    
    # Shoes
    'sneakers': 3, 'trainers': 2, 'boots': 5, 'chelsea-boots': 6,
    'loafers': 7, 'oxfords': 8, 'sandals': 1, 'slides': 1
}

# Pattern intensity (0=solid, 10=loud)
PATTERN_INTENSITY = {
    'solid': 0,
    'minimal': 1,
    'striped': 4,
    'checkered': 5,
    'plaid': 6,
    'floral': 7,
    'graphic': 8,
    'tie-dye': 9,
    'camo': 7,
    'paisley': 8
}


def categorize_item(item: Dict) -> str:
    """Determine which slot an item belongs to"""
    category = (item.get('category') or '').lower()
    subcategory = (item.get('subcategory') or '').lower()
    
    # Check all fields for matching
    full_text = f"{category} {subcategory}".lower()
    
    # Check shoes first (most specific)
    for shoe_cat in SHOE_CATEGORIES:
        if shoe_cat in full_text:
            return 'shoes'
    
    # Check layers (before base tops to catch jackets)
    for layer_cat in LAYER_CATEGORIES:
        if layer_cat in full_text:
            return 'layer'
    
    # Check base tops
    for top_cat in BASE_TOP_CATEGORIES:
        if top_cat in full_text:
            return 'base_top'
    
    # Check bottoms
    for bottom_cat in BOTTOM_CATEGORIES:
        if bottom_cat in full_text:
            return 'bottom'
    
    # Check accessories
    for acc_cat in ACCESSORY_CATEGORIES:
        if acc_cat in full_text:
            return 'accessory'
    
    # Default fallback based on primary category
    if 'shoe' in category or 'boot' in category or 'sneaker' in category:
        return 'shoes'
    elif 'jacket' in category or 'coat' in category or 'blazer' in category:
        return 'layer'
    elif 'pant' in category or 'jean' in category or 'short' in category or 'skirt' in category:
        return 'bottom'
    elif 'shirt' in category or 'tee' in category or 'top' in category:
        return 'base_top'
    else:
        return 'accessory'


def organize_by_slots(items: List[Dict]) -> Dict[str, List[Dict]]:
    """Organize clothing items into outfit slots"""
    slots = {
        'base_top': [],
        'layer': [],
        'bottom': [],
        'shoes': [],
        'accessory': []
    }
    
    for item in items:
        slot = categorize_item(item)
        slots[slot].append(item)
    
    return slots


def get_formality_score(item: Dict) -> int:
    """Get formality score for an item (0-10)"""
    category = (item.get('category') or '').lower()
    subcategory = (item.get('subcategory') or '').lower()
    
    # Try subcategory first, then category
    for key in [subcategory, category]:
        if key in FORMALITY_SCORES:
            return FORMALITY_SCORES[key]
    
    # Default mid-range
    return 5


def get_pattern_intensity(item: Dict) -> int:
    """Get pattern intensity for an item (0-10)"""
    pattern = (item.get('pattern') or 'solid').lower()
    
    for key, value in PATTERN_INTENSITY.items():
        if key in pattern:
            return value
    
    return 0


def check_formality_compatibility(items: List[Dict]) -> bool:
    """Check if items have compatible formality levels"""
    if not items:
        return True
    
    scores = [get_formality_score(item) for item in items]
    max_diff = max(scores) - min(scores)
    
    # Allow max 3 points difference (e.g., t-shirt=2 + chinos=5 = ok, but not t-shirt=2 + dress-pants=7)
    return max_diff <= 3


def check_pattern_compatibility(items: List[Dict]) -> bool:
    """Check if patterns don't clash"""
    patterns = [get_pattern_intensity(item) for item in items]
    loud_patterns = [p for p in patterns if p >= 6]
    
    # Allow max 1 loud pattern
    if len(loud_patterns) > 1:
        return False
    
    # If one loud pattern, others should be minimal
    if loud_patterns:
        other_patterns = [p for p in patterns if p < 6]
        if any(p > 3 for p in other_patterns):
            return False
    
    return True


def check_color_compatibility(items: List[Dict]) -> bool:
    """Basic color clash detection"""
    colors = []
    for item in items:
        color = (item.get('color') or '').lower()
        if color:
            colors.append(color)
    
    # Define clashing color pairs
    clashes = [
        {'red', 'pink'},
        {'orange', 'red'},
        {'purple', 'brown'},
        {'green', 'blue'},  # unless intentional, can clash
    ]
    
    color_set = set(colors)
    for clash_pair in clashes:
        if clash_pair.issubset(color_set):
            return False
    
    return True


def filter_by_occasion(items: List[Dict], occasion: str) -> List[Dict]:
    """Filter items suitable for the occasion"""
    occasion_lower = occasion.lower()
    
    filtered = []
    for item in items:
        occasion_tags = (item.get('occasion_tags') or '').lower()
        
        # If item has no tags, include it (neutral)
        if not occasion_tags:
            filtered.append(item)
            continue
        
        # Check if occasion matches tags
        if occasion_lower in occasion_tags or 'all' in occasion_tags or 'casual' in occasion_tags:
            filtered.append(item)
        # Special cases
        elif occasion_lower in ['work', 'business'] and any(tag in occasion_tags for tag in ['formal', 'business', 'work']):
            filtered.append(item)
        elif occasion_lower in ['party', 'date', 'night'] and any(tag in occasion_tags for tag in ['party', 'date', 'evening']):
            filtered.append(item)
    
    return filtered if filtered else items  # Fallback to all items if nothing matches


def build_outfit_candidates(
    clothing_list: List[Dict],
    occasion: str,
    style_dna: Optional[Dict] = None
) -> Dict[str, List[Dict]]:
    """
    Build candidate pools for each slot with filtering and validation
    
    Returns organized slots with filtered, compatible items
    """
    # Filter by occasion first
    suitable_items = filter_by_occasion(clothing_list, occasion)
    
    # Organize into slots
    slots = organize_by_slots(suitable_items)
    
    # Apply style DNA filters if available
    if style_dna:
        # Filter out avoided colors
        avoid_colors = (style_dna.get('avoid_colors') or '').lower().split(',')
        avoid_colors = [c.strip() for c in avoid_colors if c.strip()]
        
        if avoid_colors:
            for slot_name, slot_items in slots.items():
                slots[slot_name] = [
                    item for item in slot_items
                    if not any(color in (item.get('color') or '').lower() for color in avoid_colors)
                ]
        
        # Filter out avoided patterns
        avoid_patterns = (style_dna.get('avoid_patterns') or '').lower().split(',')
        avoid_patterns = [p.strip() for p in avoid_patterns if p.strip()]
        
        if avoid_patterns:
            for slot_name, slot_items in slots.items():
                slots[slot_name] = [
                    item for item in slot_items
                    if not any(pattern in (item.get('pattern') or '').lower() for pattern in avoid_patterns)
                ]
    
    return slots


def validate_outfit_combination(items: List[Dict]) -> tuple[bool, Optional[str]]:
    """
    Validate an outfit combination
    
    Returns: (is_valid, error_message)
    """
    if not items:
        return False, "No items provided"
    
    # Check slot distribution - prevent duplicate tops/bottoms/shoes
    slots = {}
    for item in items:
        slot = categorize_item(item)
        if slot in slots:
            # Allow duplicate accessories, but nothing else
            if slot != 'accessory':
                # This is a styling error - can't have 2 shirts, 2 pants, etc.
                return False, f"Fashion error: Cannot combine two {slot}s in one outfit (that's not how styling works!)"
        slots[slot] = item
    
    # Check we have minimum required pieces using the slots we built
    # Need at least one top (base_top OR layer), bottom, and shoes
    has_any_top = 'base_top' in slots or 'layer' in slots
    has_bottom = 'bottom' in slots
    has_shoes = 'shoes' in slots
    
    if not (has_any_top and has_bottom and has_shoes):
        missing = []
        if not has_any_top:
            missing.append("top/layer")
        if not has_bottom:
            missing.append("bottom")
        if not has_shoes:
            missing.append("shoes")
        return False, f"Missing required pieces: {', '.join(missing)}"

    
    # Formality, pattern, and color checks are now advisory, not blocking
    # Better to show the outfit than reject it - user can decide
    # if not check_formality_compatibility(items):
    #     return False, "Formality mismatch - items don't match occasion level"
    
    # if not check_pattern_compatibility(items):
    #     return False, "Pattern clash - too many loud patterns"
    
    # if not check_color_compatibility(items):
    #     return False, "Color clash detected"
    
    # All outfits that have the basic structure are valid
    return True, None
