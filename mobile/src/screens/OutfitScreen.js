import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ApiService } from "../services/ApiService";
import { AuthService } from "../services/AuthService";
import { API_ENDPOINTS, API_BASE_URL } from "../api/config";
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from "../utils/logger";

const logger = createLogger("OutfitScreen");

// Helper function to check if item matches any keyword in name, category, or type
const itemMatches = (item, keywords) => {
  const searchText = `${item.name || ''} ${item.category || ''} ${item.type || ''}`.toLowerCase();
  return keywords.some(keyword => searchText.includes(keyword));
};

// Smart grid ordering: prioritize jackets at top-left
const smartOrderItems = (items) => {
  const jackets = items.filter(item => 
    itemMatches(item, ['jacket', 'blazer', 'coat', 'cardigan', 'hoodie'])
  );
  const shoes = items.filter(item => 
    itemMatches(item, ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'loafer'])
  );
  const tops = items.filter(item => 
    itemMatches(item, ['shirt', 't-shirt', 'blouse', 'top', 'sweater', 'tank'])
  );
  const bottoms = items.filter(item => 
    itemMatches(item, ['pant', 'jean', 'trouser', 'skirt', 'short', 'dress'])
  );
  
  // Grid flows: [0]=top-left, [1]=top-right, [2]=bottom-left, [3]=bottom-right
  let displayItems = [];
  if (jackets.length > 0) {
    // With jacket: jacket (top-left), shirt (top-right), shoe/accessory (bottom-left), pant (bottom-right)
    if (jackets[0]) displayItems.push(jackets[0]);  // Position 0: top-left
    if (tops[0]) displayItems.push(tops[0]);        // Position 1: top-right
    if (shoes[0]) displayItems.push(shoes[0]);      // Position 2: bottom-left
    if (bottoms[0]) displayItems.push(bottoms[0]);  // Position 3: bottom-right
  } else {
    // Without jacket: top, bottom, shoe, and one more item
    if (tops[0]) displayItems.push(tops[0]);
    if (bottoms[0]) displayItems.push(bottoms[0]);
    if (shoes[0]) displayItems.push(shoes[0]);
    // Add one more item if available
    const remainingItems = items.filter(item => 
      !displayItems.includes(item)
    );
    if (remainingItems[0]) displayItems.push(remainingItems[0]);
  }
  
  return displayItems.slice(0, 4);
};

export function OutfitScreen() {
  const navigation = useNavigation();
  const [outfits, setOutfits] = useState([]);
  const [clothing, setClothing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [error, setError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isGeneratingFromChip, setIsGeneratingFromChip] = useState(false);

  const OCCASIONS = [
    { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#007AFF', bg: 'rgba(0,122,255,0.10)' },
    { id: 'casual', label: 'Casual', icon: 'shirt-outline', color: '#34C759', bg: 'rgba(52,199,89,0.10)' },
    { id: 'date', label: 'Date', icon: 'wine-outline', color: '#FF2D55', bg: 'rgba(255,45,85,0.10)' },
    { id: 'formal', label: 'Formal', icon: 'diamond-outline', color: '#AF52DE', bg: 'rgba(175,82,222,0.10)' },
    { id: 'active', label: 'Active', icon: 'fitness-outline', color: '#FF9500', bg: 'rgba(255,149,0,0.10)' },
    { id: 'party', label: 'Party', icon: 'sparkles-outline', color: '#FF375F', bg: 'rgba(255,55,95,0.10)' },
  ];

  useFocusEffect(
    React.useCallback(() => {
      loadOutfitsAndClothing();
    }, [])
  );

  const loadOutfitsAndClothing = async () => {
    try {
      const [outfitsData, clothingData, favoritesData] = await Promise.all([
        ApiService.getOutfits(),
        ApiService.getClothingItems(),
        ApiService.getFavorites(),
      ]);
      
      setOutfits(outfitsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setClothing(clothingData.items || []);
      setFavorites(favoritesData || []);
    } catch (error) {
      if (error.status === 401 && error.message && error.message.toLowerCase().includes("token")) {
        setError("Session expired, please log in again.");
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError(error.message || "Failed to load data");
      }
      logger.error("Error loading data:", error);
    }
  };  const generateOutfit = async () => {
    const occasionToUse = occasion;
    
    if (!occasionToUse) {
      alert("Please enter an occasion");
      return;
    }

    setSelectedOccasion(null); // Clear chip selection when using text input
    setLoading(true);
    setError("");
    try {
      if (!clothing || clothing.length === 0) {
        setError("No clothing items available. Please add some items first.");
        setLoading(false);
        return;
      }
      
      const clothingIds = clothing.map(c => c.id);
      const response = await ApiService.generateOutfit(occasionToUse, clothingIds);
      
      setOutfits([response, ...outfits]);
      setOccasion(""); // Clear input after successful generation
    } catch (error) {
      if (error.status === 401 && error.message && error.message.toLowerCase().includes("token")) {
        setError("Session expired, please log in again.");
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError(error?.message || "Error generating outfit");
      }
      logger.error("Error generating outfit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOccasionSelect = (occasionId) => {
    setSelectedOccasion(occasionId);
    setOccasion(""); // Clear text input when chip is selected
    setIsGeneratingFromChip(true); // Mark that we're generating from chip
    // Auto-generate outfit when occasion is selected
    if (occasionId && clothing.length > 0) {
      // Find the occasion label (capitalized) instead of using the id
      const selectedOccasion = OCCASIONS.find(occ => occ.id === occasionId);
      const occasionLabel = selectedOccasion ? selectedOccasion.label : occasionId;
      generateOutfitForOccasion(occasionLabel);
    }
  };

  const generateOutfitForOccasion = async (occasionValue) => {
    setLoading(true);
    setError("");
    try {
      if (!clothing || clothing.length === 0) {
        setError("No clothing items available. Please add some items first.");
        setLoading(false);
        return;
      }
      
      const clothingIds = clothing.map(c => c.id);
      const response = await ApiService.generateOutfit(occasionValue, clothingIds);
      
      setOutfits([response, ...outfits]);
      setSelectedOccasion(null); // Clear chip selection after generating
      setIsGeneratingFromChip(false); // Reset chip generation flag
    } catch (error) {
      if (error.status === 401 && error.message && error.message.toLowerCase().includes("token")) {
        setError("Session expired, please log in again.");
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError(error?.message || "Error generating outfit");
      }
      logger.error("Error generating outfit:", error);
    } finally {
      setLoading(false);
      setIsGeneratingFromChip(false); // Reset chip generation flag
    }
  };

  const toggleFavorite = async (outfitId, combinationIndex) => {
    try {
      await ApiService.toggleFavorite(outfitId, combinationIndex);
      // Reload favorites to get updated list
      const favoritesData = await ApiService.getFavorites();
      setFavorites(favoritesData || []);
    } catch (error) {
      logger.error("Error toggling favorite:", error);
    }
  };

  const regenerateOutfit = async (outfitId, occasion, previousSuggestions) => {
    try {
      setRegeneratingId(outfitId);
      
      if (!clothing || clothing.length === 0) {
        alert("No clothing items available");
        setRegeneratingId(null);
        return;
      }
      
      const clothingIds = clothing.map(c => c.id);
      const response = await ApiService.regenerateOutfit(outfitId, occasion, clothingIds, previousSuggestions);
      
      setOutfits(
        outfits.map((outfit) => (outfit.id === outfitId ? response : outfit))
      );
    } catch (error) {
      logger.error("Error regenerating outfit:", error);
    } finally {
      setRegeneratingId(null);
    }
  };

  const deleteOutfit = async (id) => {
    try {
      await ApiService.deleteOutfit(id);
      setOutfits(outfits.filter((outfit) => outfit.id !== id));
    } catch (error) {
      logger.error("Error deleting outfit:", error);
    }
  };

  const parseAISuggestions = (aiSuggestionsStr) => {
    try {
      if (typeof aiSuggestionsStr !== 'string') {
        return aiSuggestionsStr;
      }

      let cleanStr = aiSuggestionsStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const parsed = JSON.parse(cleanStr);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch (e) {
        // Extract individual JSON objects using a more robust regex
        const objectPattern = /\{[^{}]*?"outfit_name"\s*:\s*"[^"]*"[^{}]*?"styling_tips"\s*:\s*"[^"]*"[^{}]*?\}/gs;
        const matches = cleanStr.match(objectPattern);
        
        if (matches && matches.length > 0) {
          const parsed = matches.map(m => {
            try {
              return JSON.parse(m);
            } catch {
              return null;
            }
          }).filter(x => x !== null);
          
          if (parsed.length > 0) {
            return parsed;
          }
        }

        // Fallback: manually extract fields
        const nameMatches = [...cleanStr.matchAll(/"outfit_name"\s*:\s*"([^"]*)"/g)];
        const descMatches = [...cleanStr.matchAll(/"description"\s*:\s*"([^"]*)"/g)];
        const idsMatches = [...cleanStr.matchAll(/"item_ids"\s*:\s*\[([^\]]*)\]/g)];
        const tipsMatches = [...cleanStr.matchAll(/"styling_tips"\s*:\s*"([^"]*)"/g)];
        
        if (nameMatches.length > 0) {
          return nameMatches.map((_, i) => ({
            outfit_name: nameMatches[i]?.[1] || '',
            description: descMatches[i]?.[1] || '',
            item_ids: idsMatches[i]?.[1]?.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)) || [],
            styling_tips: tipsMatches[i]?.[1] || ''
          }));
        }

        return null;
      }
    } catch (error) {
      logger.error("Error parsing AI suggestions:", error);
      return null;
    }
  };

  const getMatchingClothingItems = (outfit, clothingList) => {
    if (!outfit) return [];
    
    const suggestions = parseAISuggestions(outfit.ai_suggestions);
    const itemIds = new Set();

    if (Array.isArray(suggestions)) {
      suggestions.forEach(s => {
        if (s && s.item_ids && Array.isArray(s.item_ids)) {
          s.item_ids.forEach(id => itemIds.add(id));
        }
      });
    } else if (suggestions && suggestions.item_ids && Array.isArray(suggestions.item_ids)) {
      suggestions.item_ids.forEach(id => itemIds.add(id));
    }

    return Array.from(itemIds)
      .map(id => clothingList.find(c => c.id === id))
      .filter(item => item && item.image_path)
      .map(item => ({
        ...item,
        // Convert relative path to full URL
        image_path: item.image_path.startsWith('http') 
          ? item.image_path 
          : `${API_BASE_URL}${item.image_path}`
      }));
  };

  const formatSuggestionsText = (aiSuggestionsStr) => {
    const suggestions = parseAISuggestions(aiSuggestionsStr);
    
    if (!suggestions) return aiSuggestionsStr;

    if (Array.isArray(suggestions)) {
      return suggestions
        .map((s, idx) => {
          const tips = s.styling_tips || '';
          return `${idx + 1}. ${s.outfit_name || 'Outfit'}\n${s.description || ''}\n\n💡 ${tips}`;
        })
        .join('\n\n---\n\n');
    } else if (suggestions) {
      const tips = suggestions.styling_tips || '';
      return `${suggestions.outfit_name || 'Outfit'}\n${suggestions.description || ''}\n\n💡 ${tips}`;
    }
    
    return aiSuggestionsStr;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={outfits}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.outfitsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Title */}
            <Text style={styles.heroTitle}>Outfits</Text>

            {/* Search-style Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color="#8E8E93" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={'Try "date night" or "job interview"'}
                value={occasion}
                onChangeText={setOccasion}
                editable={!loading}
                placeholderTextColor="#C7C7CC"
                autoCapitalize="sentences"
                returnKeyType="go"
                onSubmitEditing={generateOutfit}
              />
              {occasion ? (
                <TouchableOpacity
                  style={[styles.sendBtn, loading && { opacity: 0.4 }]}
                  onPress={generateOutfit}
                  disabled={!occasion || loading}
                >
                  {loading && !isGeneratingFromChip ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Occasion Chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
              style={styles.chipsScroll}
            >
              {OCCASIONS.map((occ) => {
                const active = selectedOccasion === occ.id;
                return (
                  <TouchableOpacity
                    key={occ.id}
                    style={[
                      styles.occasionChip,
                      { backgroundColor: occ.bg },
                      active && { borderColor: occ.color, borderWidth: 1.5 },
                    ]}
                    onPress={() => handleOccasionSelect(occ.id)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    {active && loading ? (
                      <ActivityIndicator size="small" color={occ.color} />
                    ) : (
                      <>
                        <Ionicons name={occ.icon} size={15} color={occ.color} />
                        <Text style={[styles.chipLabel, { color: occ.color }]}>{occ.label}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {clothing.length === 0 && (
              <View style={styles.warningBanner}>
                <Ionicons name="information-circle" size={16} color="#FF9500" />
                <Text style={styles.warningText}>Add items to your wardrobe to start styling</Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.errorRetry} onPress={loadOutfitsAndClothing}>
                  <Text style={styles.errorRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {loading && outfits.length === 0 && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Styling your look...</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyCircle}>
                <Ionicons name="sparkles" size={28} color="#AEAEB2" />
              </View>
              <Text style={styles.emptyTitle}>Your looks start here</Text>
              <Text style={styles.emptySubtitle}>Choose an occasion or type one in{'\n'}to style your first outfit</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
            const suggestions = parseAISuggestions(item.ai_suggestions);
            
            // Check if any suggestions still have all items present
            const hasValidSuggestions = Array.isArray(suggestions) && suggestions.some(s => {
              const ids = s.item_ids || [];
              const found = ids.filter(id => clothing.find(c => c.id === id));
              return found.length === ids.length && ids.length > 0;
            });
            
            if (!hasValidSuggestions) return null;
            
            return (
              <View style={styles.outfitSection}>
                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Text style={styles.sectionOccasion}>{item.occasion}</Text>
                    <Text style={styles.sectionDate}>
                      {new Date(item.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                      {Array.isArray(suggestions) ? `  ·  ${suggestions.length} look${suggestions.length !== 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                  <View style={styles.sectionActions}>
                    <TouchableOpacity
                      onPress={() => regenerateOutfit(item.id, item.occasion, item.ai_suggestions)}
                      style={styles.actionButton}
                      disabled={regeneratingId === item.id}
                    >
                      {regeneratingId === item.id ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <Ionicons name="refresh" size={18} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteOutfit(item.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={17} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Outfit Cards Carousel — KEEPING EXISTING CARD DESIGN */}
                {Array.isArray(suggestions) && suggestions.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContent}
                    snapToInterval={296}
                    decelerationRate="fast"
                  >
                    {suggestions.map((suggestion, index) => {
                      const itemIds = suggestion.item_ids || [];
                      const allOutfitItems = itemIds
                        .map(id => clothing.find(c => c.id === id))
                        .filter(item => item && item.image_path);
                      
                      // Skip this card if any items are missing (deleted from wardrobe)
                      if (allOutfitItems.length === 0 || allOutfitItems.length < itemIds.length) return null;
                      
                      const outfitItems = smartOrderItems(allOutfitItems);
                      
                      const isFavorite = favorites.some(fav => {
                        try {
                          const favCombination = JSON.parse(fav.combination_data);
                          const favItemIds = favCombination.item_ids || [];
                          return JSON.stringify(favItemIds.sort()) === JSON.stringify(itemIds.sort());
                        } catch (e) {
                          return false;
                        }
                      });

                      return (
                        <TouchableOpacity 
                          key={index} 
                          style={styles.outfitCard}
                          activeOpacity={0.9}
                          onPress={() => navigation.navigate('OutfitDetail', {
                            outfit: suggestion,
                            outfitItems: allOutfitItems,
                            occasion: item.occasion,
                            outfitId: item.id,
                            combinationIndex: index,
                          })}
                        >
                          {/* Outfit Items Grid */}
                          <View style={styles.outfitGrid}>
                            {outfitItems.slice(0, 4).map((clothingItem, idx) => (
                              <View key={idx} style={styles.gridItem}>
                                <Image
                                  source={{ uri: `${API_BASE_URL}${clothingItem.image_path}` }}
                                  style={styles.gridImage}
                                  resizeMode="cover"
                                />
                              </View>
                            ))}
                            {outfitItems.length < 4 && Array(4 - outfitItems.length).fill(0).map((_, idx) => (
                              <View key={`empty-${idx}`} style={[styles.gridItem, styles.gridItemEmpty]} />
                            ))}
                          </View>

                          {/* Outfit Info */}
                          <View style={styles.outfitInfo}>
                            <View style={styles.outfitTitleRow}>
                              <Text style={styles.outfitTitle} numberOfLines={1}>
                                {suggestion.outfit_name}
                              </Text>
                              <TouchableOpacity 
                                style={styles.favoriteButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item.id, index);
                                }}
                              >
                                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#FF2D55' : '#C7C7CC'} />
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.outfitDesc} numberOfLines={2}>
                              {suggestion.description}
                            </Text>
                            {allOutfitItems.length > 4 && (
                              <Text style={styles.moreItemsHint}>
                                +{allOutfitItems.length - 4} more · Tap to see all
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            );
          }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  // ── Title ──
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.37,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  // ── Search Bar (iOS native style) ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    height: 36,
  },
  searchIcon: {
    marginLeft: 8,
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    paddingVertical: 0,
    height: 36,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  // ── Occasion Chips ──
  chipsScroll: {
    marginBottom: 16,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  occasionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  // ── Warning ──
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FF9500',
  },
  // ── Error ──
  errorBanner: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    flex: 1,
  },
  errorRetry: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    marginLeft: 12,
  },
  errorRetryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // ── Loading ──
  loadingState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 44,
  },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(118,118,128,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 21,
  },
  // ── Outfit List ──
  outfitsList: {
    paddingTop: 24,
    paddingBottom: 100,
  },
  // ── Section ──
  outfitSection: {
    marginTop: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionOccasion: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.38,
    textTransform: 'capitalize',
  },
  sectionDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(118,118,128,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Cards (PRESERVED) ──
  carouselContent: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 8,
  },
  outfitCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
  },
  favoriteButton: {
    padding: 4,
    marginLeft: 8,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  outfitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  gridItemEmpty: {
    backgroundColor: '#E5E5EA',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outfitInfo: {
    padding: 20,
  },
  outfitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  outfitTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.4,
  },
  outfitDesc: {
    fontSize: 15,
    fontWeight: '400',
    color: '#3C3C43',
    lineHeight: 20,
  },
  moreItemsHint: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 4,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  tipIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#3C3C43',
    lineHeight: 19,
  },
});
