import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { ApiService } from "../services/ApiService";
import { API_BASE_URL } from '../api/config';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from "../utils/logger";
import { COLORS, TYPOGRAPHY, SPACING } from "../constants";

const logger = createLogger("FavoritesScreen");

export const FavoritesScreen = () => {
  const navigation = useNavigation();
  const [outfits, setOutfits] = useState([]);
  const [clothing, setClothing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [favoritesData, clothingData] = await Promise.all([
        ApiService.getFavorites(),
        ApiService.getClothingItems(),
      ]);

      setOutfits(favoritesData);
      setClothing(clothingData.items || []);
    } catch (error) {
      if (error.status === 401) {
        setError("Session expired, please log in again.");
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError(error.message || "Failed to load favorites");
      }
      logger.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const deleteFavorite = useCallback(async (favoriteId) => {
    try {
      await ApiService.deleteFavorite(favoriteId);
      setOutfits(prev => prev.filter((fav) => fav.id !== favoriteId));
    } catch (error) {
      logger.error("Error deleting favorite:", error);
    }
  }, []);

  const favoriteCombinations = useMemo(() => {
    return outfits.map((favorite) => {
      try {
        const combination = JSON.parse(favorite.combination_data);
        return {
          id: favorite.id,
          occasion: favorite.occasion,
          createdAt: favorite.created_at,
          combination: combination,
        };
      } catch (error) {
        logger.error("Error parsing combination:", error);
        return null;
      }
    }).filter(item => item !== null);
  }, [outfits]);

  const renderItem = useCallback(({ item }) => {
    const itemIds = item.combination.item_ids || [];
    const outfitItems = itemIds
      .map(id => clothing.find(c => c.id === id))
      .filter(clothingItem => clothingItem && clothingItem.image_path);

    return (
      <View style={styles.favoriteCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.outfitName}>{item.combination.outfit_name}</Text>
            <Text style={styles.occasion}>{item.occasion}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => deleteFavorite(item.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteIcon}>×</Text>
          </TouchableOpacity>
        </View>

        {/* 2x2 Grid Layout */}
        <View style={styles.outfitGrid}>
          {outfitItems.slice(0, 4).map((clothingItem, idx) => {
            const imageUri = `${API_BASE_URL}${clothingItem.image_path}`;
            return (
              <View key={idx} style={styles.gridItem}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                <View style={styles.gridOverlay}>
                  <Text style={styles.gridLabel} numberOfLines={1}>
                    {clothingItem.brand || clothingItem.category}
                  </Text>
                </View>
              </View>
            );
          })}
          {outfitItems.length < 4 && Array(4 - outfitItems.length).fill(0).map((_, idx) => (
            <View key={`empty-${idx}`} style={[styles.gridItem, styles.gridItemEmpty]} />
          ))}
        </View>

        <View style={styles.outfitDetails}>
          <Text style={styles.description}>{item.combination.description}</Text>
          <View style={styles.tipContainer}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.styleTips}>
              {item.combination.styling_tips}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [clothing, deleteFavorite]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (favoriteCombinations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="heart-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptySubtext}>No Favorites Yet</Text>
        <Text style={styles.emptyHint}>
          Save your favorite outfit combinations to see them here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={favoriteCombinations}
      keyExtractor={(item) => `favorite-${item.id}`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContainer}
      renderItem={renderItem}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#F2F2F7",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: "#F2F2F7",
  },
  favoriteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  outfitName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
    letterSpacing: 0.35,
  },
  occasion: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "400",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    fontSize: 28,
    color: "#8E8E93",
    fontWeight: "300",
    lineHeight: 28,
  },
  outfitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  gridItem: {
    width: "48%",
    aspectRatio: 1,
    margin: "1%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F2F2F7",
  },
  gridItemEmpty: {
    backgroundColor: "#E5E5EA",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  outfitDetails: {
    padding: 20,
    paddingTop: 16,
  },
  description: {
    fontSize: 15,
    fontWeight: "400",
    color: "#3C3C43",
    lineHeight: 21,
    marginBottom: 12,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  tipIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  styleTips: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    color: "#3C3C43",
    lineHeight: 19,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptySubtext: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 17,
    fontWeight: "400",
    color: "#8E8E93",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 17,
    fontWeight: "500",
    color: "#C62828",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
});
