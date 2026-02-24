"""
Usage Stats Service - Track and compute wardrobe utilization metrics
"""
from typing import List, Dict, Set, Tuple, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.clothing import OutfitHistory, ItemUsageStats, ClothingItem
import json


def get_or_create_usage_stats(db: Session, user_id: int, item_id: int) -> ItemUsageStats:
    """Get or create usage stats for an item"""
    stats = db.query(ItemUsageStats).filter(
        ItemUsageStats.user_id == user_id,
        ItemUsageStats.item_id == item_id
    ).first()
    
    if not stats:
        stats = ItemUsageStats(
            user_id=user_id,
            item_id=item_id,
            total_shown=0,
            total_favorited=0,
            occasion_counts='{}',
            validation_failures=0,
            success_rate=0.0,
            versatility_score=0.0
        )
        db.add(stats)
        db.flush()
    
    return stats


def update_item_usage(db: Session, user_id: int, item_ids: List[int], occasion: str, was_favorited: bool = False):
    """Update usage stats for items in a shown outfit"""
    now = datetime.utcnow()
    
    for item_id in item_ids:
        stats = get_or_create_usage_stats(db, user_id, item_id)
        
        # Update counts
        stats.total_shown += 1
        if was_favorited:
            stats.total_favorited += 1
        
        # Update timestamps
        stats.last_shown_at = now
        if not stats.first_shown_at:
            stats.first_shown_at = now
        
        # Update occasion counts
        occasion_counts = json.loads(stats.occasion_counts or '{}')
        occasion_counts[occasion] = occasion_counts.get(occasion, 0) + 1
        stats.occasion_counts = json.dumps(occasion_counts)
        
        # Update success rate
        stats.success_rate = (stats.total_favorited / stats.total_shown) if stats.total_shown > 0 else 0.0
        
        # Update versatility score (number of distinct occasions)
        stats.versatility_score = float(len(occasion_counts))
        
        stats.updated_at = now


def get_usage_stats_for_items(db: Session, user_id: int, item_ids: List[int]) -> Dict[int, ItemUsageStats]:
    """Get usage stats for a list of items"""
    stats = db.query(ItemUsageStats).filter(
        ItemUsageStats.user_id == user_id,
        ItemUsageStats.item_id.in_(item_ids)
    ).all()
    
    return {stat.item_id: stat for stat in stats}


def compute_underused_items(db: Session, user_id: int, all_item_ids: List[int], percentile: float = 0.25) -> Set[int]:
    """Identify items in the bottom percentile of usage frequency"""
    stats_map = get_usage_stats_for_items(db, user_id, all_item_ids)
    
    # Get usage counts
    usage_counts = []
    for item_id in all_item_ids:
        stat = stats_map.get(item_id)
        count = stat.total_shown if stat else 0
        usage_counts.append((item_id, count))
    
    # Sort by usage count
    usage_counts.sort(key=lambda x: x[1])
    
    # Get bottom percentile
    cutoff_index = int(len(usage_counts) * percentile)
    underused = {item_id for item_id, _ in usage_counts[:cutoff_index]} if cutoff_index > 0 else set()
    
    return underused


def get_recent_outfit_combinations(db: Session, user_id: int, days: int = 7) -> List[Set[int]]:
    """Get recent outfit combinations to avoid repetition"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    recent_history = db.query(OutfitHistory).filter(
        OutfitHistory.user_id == user_id,
        OutfitHistory.shown_at >= cutoff_date
    ).order_by(OutfitHistory.shown_at.desc()).all()
    
    combinations = []
    for history in recent_history:
        item_ids = json.loads(history.item_ids)
        combinations.append(set(item_ids))
    
    return combinations


def compute_pair_novelty(item_ids: List[int], recent_combinations: List[Set[int]]) -> float:
    """
    Compute novelty score based on pair recombination
    Returns 0-10 score (10 = completely novel pairings)
    """
    if not recent_combinations:
        return 10.0
    
    current_set = set(item_ids)
    
    # Count how many recent outfits share 50%+ items
    overlap_count = 0
    for recent_set in recent_combinations:
        intersection = current_set & recent_set
        if len(intersection) / len(current_set) >= 0.5:
            overlap_count += 1
    
    # Penalize high overlap
    novelty = max(0, 10 - (overlap_count * 2))
    return float(novelty)


def compute_coverage_bonus(item_ids: List[int], underused_items: Set[int]) -> float:
    """
    Compute coverage bonus for using underused items
    Returns 0-15 points
    """
    underused_count = sum(1 for item_id in item_ids if item_id in underused_items)
    
    if underused_count == 0:
        return 0.0
    
    # Scale: 1 underused item = 10 pts, 2+ = 15 pts
    return min(15.0, underused_count * 10.0)


def compute_rotation_penalty(item_ids: List[int], recent_combinations: List[Set[int]], threshold: float = 0.5) -> float:
    """
    Penalize if >50% of items appeared together recently
    Returns 0-20 penalty points
    """
    if not recent_combinations:
        return 0.0
    
    current_set = set(item_ids)
    
    # Check last 5 outfits for high overlap
    recent_five = recent_combinations[:5]
    for recent_set in recent_five:
        intersection = current_set & recent_set
        overlap_ratio = len(intersection) / len(current_set)
        
        if overlap_ratio > threshold:
            # Scale penalty by overlap amount
            penalty = (overlap_ratio - threshold) * 40  # Max 20 pts penalty
            return min(20.0, penalty)
    
    return 0.0


def compute_variety_score(item_ids: List[int], underused_items: Set[int]) -> float:
    """
    Compute variety score for outfit diversity
    Returns 0-15 points if outfit includes underused items
    """
    has_underused = any(item_id in underused_items for item_id in item_ids)
    return 15.0 if has_underused else 0.0


def get_wardrobe_analytics(db: Session, user_id: int) -> Dict:
    """
    Compute comprehensive wardrobe analytics
    """
    # Get all user items
    all_items = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    total_items = len(all_items)
    
    if total_items == 0:
        return {
            "total_items": 0,
            "usage_heatmap": {},
            "diversity_index": 0.0,
            "staleness_count": 0,
            "overuse_alerts": []
        }
    
    # Get all usage stats
    all_stats = db.query(ItemUsageStats).filter(ItemUsageStats.user_id == user_id).all()
    stats_map = {stat.item_id: stat for stat in all_stats}
    
    # Usage heatmap (last 7 days)
    cutoff = datetime.utcnow() - timedelta(days=7)
    used_last_week = sum(
        1 for stat in all_stats 
        if stat.last_shown_at and stat.last_shown_at >= cutoff
    )
    usage_heatmap = {
        "used_last_week": used_last_week,
        "percentage": round((used_last_week / total_items) * 100, 1)
    }
    
    # Staleness count (not used in 30 days)
    staleness_cutoff = datetime.utcnow() - timedelta(days=30)
    staleness_count = sum(
        1 for item in all_items
        if item.id not in stats_map or 
        not stats_map[item.id].last_shown_at or
        stats_map[item.id].last_shown_at < staleness_cutoff
    )
    
    # Overuse alerts (usage > 2x average)
    total_usage = sum(stat.total_shown for stat in all_stats)
    avg_usage = total_usage / total_items if total_items > 0 else 0
    overuse_threshold = avg_usage * 2
    
    overuse_alerts = []
    for item in all_items:
        stat = stats_map.get(item.id)
        if stat and stat.total_shown > overuse_threshold and overuse_threshold > 0:
            overuse_alerts.append({
                "item_id": item.id,
                "category": item.category,
                "brand": item.brand,
                "usage_count": stat.total_shown,
                "times_over_average": round(stat.total_shown / avg_usage, 1)
            })
    
    # Diversity index (unique pairings approximation)
    recent_combos = get_recent_outfit_combinations(db, user_id, days=30)
    unique_pairs = set()
    for combo in recent_combos:
        combo_list = sorted(combo)
        for i in range(len(combo_list)):
            for j in range(i + 1, len(combo_list)):
                unique_pairs.add((combo_list[i], combo_list[j]))
    
    max_possible_pairs = (total_items * (total_items - 1)) / 2
    diversity_index = (len(unique_pairs) / max_possible_pairs * 100) if max_possible_pairs > 0 else 0
    
    return {
        "total_items": total_items,
        "usage_heatmap": usage_heatmap,
        "diversity_index": round(diversity_index, 2),
        "staleness_count": staleness_count,
        "overuse_alerts": overuse_alerts[:5]  # Top 5 overused items
    }


def get_underused_items_details(db: Session, user_id: int, limit: int = 10) -> List[Dict]:
    """Get detailed info about underused items for AI prompt"""
    all_items = db.query(ClothingItem).filter(ClothingItem.user_id == user_id).all()
    all_item_ids = [item.id for item in all_items]
    
    underused_set = compute_underused_items(db, user_id, all_item_ids, percentile=0.30)
    
    underused_details = []
    for item in all_items:
        if item.id in underused_set:
            underused_details.append({
                "id": item.id,
                "category": item.category,
                "subcategory": item.subcategory,
                "color": item.color,
                "brand": item.brand,
                "model": item.model,
                "style_tags": item.style_tags
            })
    
    return underused_details[:limit]


def format_recent_combinations_for_prompt(recent_combinations: List[Set[int]]) -> str:
    """Format recent combinations into a readable string for AI prompt"""
    if not recent_combinations:
        return ""
    
    # Take last 5 combinations
    recent_five = recent_combinations[:5]
    formatted = []
    for combo in recent_five:
        formatted.append(f"[{', '.join(map(str, sorted(combo)))}]")
    
    return ", ".join(formatted)
