import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Dimensions,
  Modal,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ApiService } from "../services/ApiService";
import { createLogger } from "../utils/logger";

const logger = createLogger("OutfitDetailScreen");
import { API_BASE_URL } from '../api/config';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

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

const CATEGORY_ICONS = {
  'shirt': '👕',
  't-shirt': '👕',
  'blouse': '👚',
  'sweater': '🧥',
  'jacket': '🧥',
  'blazer': '🧥',
  'coat': '🧥',
  'pants': '👖',
  'jeans': '👖',
  'trousers': '👖',
  'skirt': '👗',
  'shorts': '🩳',
  'dress': '👗',
  'shoes': '👞',
  'sneakers': '👟',
  'boots': '🥾',
  'heels': '👠',
  'sandals': '👡',
  'watch': '⌚️',
  'ring': '💍',
  'necklace': '📿',
  'chain': '⛓️',
  'bracelet': '📿',
  'bag': '👜',
  'belt': '👔',
  'hat': '🎩',
  'scarf': '🧣',
  'sunglasses': '🕶️',
  'tie': '👔',
  'default': '👔',
};

export function OutfitDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { outfit, outfitItems, occasion, outfitId, combinationIndex } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scale] = useState(new Animated.Value(1));
  const [translateY] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(0));

  // Check if outfit is already favorited on mount
  React.useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const favs = await ApiService.getFavorites();
        const itemIds = outfit.item_ids || outfitItems.map(i => i.id);
        const match = favs.some(fav => {
          try {
            const favData = JSON.parse(fav.combination_data);
            const favIds = favData.item_ids || [];
            return JSON.stringify(favIds.sort()) === JSON.stringify([...itemIds].sort());
          } catch { return false; }
        });
        setIsFavorite(match);
      } catch (e) {}
    };
    checkFavoriteStatus();
  }, []);

  // Apply smart ordering to grid display
  const gridItems = smartOrderItems(outfitItems);

  const openImageViewer = (item) => {
    setSelectedImage(item);
    setModalVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeImageViewer = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedImage(null);
    });
  };

  const getCategoryIcon = (category) => {
    const lowerCategory = category?.toLowerCase() || '';
    return CATEGORY_ICONS[lowerCategory] || CATEGORY_ICONS['default'];
  };

  const handleToggleFavorite = async () => {
    try {
      await ApiService.toggleFavorite(outfitId, combinationIndex);
      setIsFavorite(!isFavorite);
    } catch (error) {
      logger.error('Error toggling favorite:', error);
    }
  };

  const handleShare = async () => {
    try {
      const itemNames = outfitItems.map(item => 
        item.brand ? `${item.brand} ${item.category}` : item.category
      ).join('\n');
      
      await Share.share({
        message: `${outfit.outfit_name}\n\n${outfit.description}\n\nItems:\n${itemNames}\n\nStyling Tips: ${outfit.styling_tips}`,
        title: outfit.outfit_name,
      });
    } catch (error) {
      logger.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleToggleFavorite}
            style={styles.headerButton}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#FF3B30' : '#8E8E93'} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleShare}
            style={styles.headerButton}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image Grid */}
        <View style={styles.heroGrid}>
          {gridItems.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.heroGridItem}
              activeOpacity={0.9}
              onPress={() => openImageViewer(item)}
            >
              <Image
                source={{ uri: `${API_BASE_URL}${item.image_path}` }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
          {gridItems.length < 4 && Array(4 - gridItems.length).fill(0).map((_, idx) => (
            <View key={`empty-${idx}`} style={[styles.heroGridItem, styles.heroGridItemEmpty]} />
          ))}
        </View>

        {/* Outfit Info */}
        <View style={styles.infoSection}>
          <Text style={styles.outfitName}>{outfit.outfit_name}</Text>
          <Text style={styles.occasion}>{occasion}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* What to Wear Section */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>What to Wear</Text>
          {outfitItems.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemIcon}>{getCategoryIcon(item.category)}</Text>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemName}>
                    {item.brand ? `${item.brand} ${item.model || ''}`.trim() : item.category}
                  </Text>
                  {item.color && (
                    <Text style={styles.itemDetail}>
                      {item.color}
                      {item.subcategory && ` · ${item.subcategory}`}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openImageViewer(item)}
              >
                <Image
                  source={{ uri: `${API_BASE_URL}${item.image_path}` }}
                  style={styles.itemThumbnail}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Description */}
        <View style={styles.descSection}>
          <Text style={styles.sectionTitle}>About This Look</Text>
          <Text style={styles.description}>{outfit.description}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Styling Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Styling Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>{outfit.styling_tips}</Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeImageViewer}
      >
        <StatusBar hidden />
        <Animated.View style={[styles.modalContainer, { opacity }]}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={closeImageViewer}
            activeOpacity={0.9}
          >
            <View style={styles.closeButtonCircle}>
              <Text style={styles.modalCloseText}>✕</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.modalImageContainer}>
            {selectedImage && (
              <>
                <View style={styles.modalImageWrapper}>
                  <Image
                    source={{ uri: `${API_BASE_URL}${selectedImage.image_path}` }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalItemName}>
                    {selectedImage.brand 
                      ? `${selectedImage.brand} ${selectedImage.model || ''}`.trim() 
                      : selectedImage.category}
                  </Text>
                  {selectedImage.color && (
                    <Text style={styles.modalItemDetail}>
                      {selectedImage.color}
                      {selectedImage.subcategory && ` · ${selectedImage.subcategory}`}
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
    color: '#007AFF',
    lineHeight: 32,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  shareIcon: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  heroGridItem: {
    width: '48%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  heroGridItemEmpty: {
    backgroundColor: '#E5E5EA',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  outfitName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.35,
    marginBottom: 8,
  },
  occasion: {
    fontSize: 17,
    fontWeight: '400',
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 0,
  },
  itemsSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemIcon: {
    fontSize: 24,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  itemDetail: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
  },
  itemThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginLeft: 12,
  },
  descSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  description: {
    fontSize: 17,
    fontWeight: '400',
    color: '#3C3C43',
    lineHeight: 24,
  },
  tipsSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: '#3C3C43',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalImageContainer: {
    width: width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageWrapper: {
    width: width - 40,
    height: height * 0.65,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
  },
  modalItemName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalItemDetail: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalDismissHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  dismissHintText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
});
