import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Modal,
  StatusBar,
  Dimensions,
  Animated,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ApiService } from "../services/ApiService";
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../api/config';
import { Ionicons } from '@expo/vector-icons';
import { createLogger } from "../utils/logger";

const logger = createLogger("ClothingScreen");
const { width, height } = Dimensions.get('window');

export function ClothingScreen() {
  const navigation = useNavigation();
  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("clothing");
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  // Outfit Showcase State
  const [generatedOutfits, setGeneratedOutfits] = useState([]);
  const [isGeneratingOutfits, setIsGeneratingOutfits] = useState(false);
  const [outfitsOpacity] = useState(new Animated.Value(0));
  const [outfitsTranslateY] = useState(new Animated.Value(50));

  const [outfitError, setOutfitError] = useState(null);
  const [favoritedOutfits, setFavoritedOutfits] = useState({});

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [activePickerField, setActivePickerField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    { id: "clothing", label: "Clothing", icon: "shirt-outline" },
    { id: "shoes", label: "Shoes", icon: "footsteps-outline" },
    { id: "accessories", label: "Accessories", icon: "watch-outline" },
  ];

  // Load clothes when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadClothes();
    }, [])
  );

  const loadClothes = async () => {
    try {
      setError("");
      const response = await ApiService.getClothingItems();

      if (response.items && Array.isArray(response.items)) {
        setClothes(response.items);
      } else {
        logger.warn("Response items is not an array:", response);
        setClothes([]);
      }
    } catch (error) {
      if (error.status === 401 && error.message && error.message.toLowerCase().includes("token")) {
        setError("Session expired, please log in again.");
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError(error.message || "Failed to load clothing items.");
      }
      logger.error("Error loading clothing items:", error);
    }
  };

  // Filter items by selected category
  const getFilteredItems = () => {
    return clothes.filter(item => {
      const cat = item.category?.toLowerCase() || "";

      if (selectedCategory === "clothing") {
        // Clothing: shirts, pants, dresses, jackets, tops, bottoms, etc.
        return !["shoes", "footwear", "sneakers", "boots", "sandals", "heels",
          "accessory", "accessories", "bag", "jewelry", "watch", "hat",
          "scarf", "belt", "sunglasses", "glasses"].some(term => cat.includes(term));
      } else if (selectedCategory === "shoes") {
        // Shoes: any footwear
        return ["shoes", "footwear", "sneakers", "boots", "sandals", "heels",
          "loafers", "flats", "pumps", "athletic"].some(term => cat.includes(term));
      } else {
        // Accessories: bags, jewelry, etc.
        return ["accessory", "accessories", "bag", "jewelry", "watch", "hat",
          "scarf", "belt", "sunglasses", "glasses", "purse", "backpack",
          "necklace", "bracelet", "earrings", "ring"].some(term => cat.includes(term));
      }
    });
  };

  const pickImage = async () => {
    try {
      // First, ask user to select single or multiple
      Alert.alert(
        "Add Clothing",
        "Choose upload option:",
        [
          {
            text: "Single Item (with crop)",
            onPress: () => pickSingleImage(),
          },
          {
            text: "Multiple Items",
            onPress: () => pickMultipleImages(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      logger.error("Error picking images:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const pickSingleImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadMultipleImages([result.assets[0]]);
      }
    } catch (error) {
      logger.error("Error picking single image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const pickMultipleImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const images = result.assets;
        Alert.alert(
          "Upload Images",
          `Upload ${images.length} images?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Upload",
              onPress: () => uploadMultipleImages(images),
            },
          ]
        );
      }
    } catch (error) {
      logger.error("Error picking multiple images:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const compressImage = async (imageUri) => {
    try {
      // Compress to max 1024x1024, quality 0.7
      const manipResult = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      return manipResult.uri;
    } catch (error) {
      logger.error("Error compressing image:", error);
      return imageUri; // Return original if compression fails
    }
  };

  const uploadMultipleImages = async (images) => {
    setLoading(true);
    setUploadingCount(images.length);
    setError("");

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      try {
        const compressedUri = await compressImage(images[i].uri);
        await uploadImage({ ...images[i], uri: compressedUri });
        successCount++;
      } catch (error) {
        logger.error(`Error uploading image ${i + 1}:`, error);
        failCount++;
      }
    }

    setLoading(false);
    setUploadingCount(0);

    if (failCount > 0) {
      Alert.alert(
        "Upload Complete",
        `${successCount} image${successCount !== 1 ? 's' : ''} uploaded successfully.\n${failCount} failed.`
      );
    } else {
      Alert.alert("Success", `All ${successCount} images uploaded!`);
    }
  };

  const uploadImage = async (image) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: image.uri,
        type: "image/jpeg",
        name: image.uri.split("/").pop() || "photo.jpg",
      });

      const response = await ApiService.uploadClothing(formData);

      // Reload the clothes list after successful upload
      if (response.success) {
        await loadClothes();
      }
    } catch (error) {
      logger.error("Error uploading image:", error);
      throw error; // Re-throw to be caught by uploadMultipleImages
    }
  };

  const deleteClothing = async (id) => {
    try {
      setError("");
      await ApiService.deleteClothing(id);
      setClothes(clothes.filter((item) => item.id !== id));
    } catch (error) {
      logger.error("Error deleting item:", error);
      setError(error.message || "Failed to delete item");
    }
  };

  const openImageViewer = (item) => {
    setSelectedImage(item);
    setModalVisible(true);
    setGeneratedOutfits([]); // Reset previous outfits
    setOutfitError(null);

    // Start modal animation
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Only generate outfits for clothing items (not shoes/accessories)
    const cat = (item.category || '').toLowerCase();
    const isShoeOrAccessory = ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels',
      'loafers', 'flats', 'oxfords', 'slides', 'trainers', 'mules',
      'accessory', 'accessories', 'bag', 'jewelry', 'watch', 'hat',
      'scarf', 'belt', 'sunglasses', 'glasses', 'necklace', 'bracelet',
      'ring', 'backpack', 'purse', 'earrings', 'chain', 'cap', 'beanie',
      'tie'].some(term => cat.includes(term));

    if (!isShoeOrAccessory) {
      generateOutfitsForItem(item);
    }
  };

  const generateOutfitsForItem = async (item) => {
    setIsGeneratingOutfits(true);
    // Reset animations
    outfitsOpacity.setValue(0);
    outfitsTranslateY.setValue(50);

    try {
      // Smart occasion detection based on item characteristics
      let occasion = "casual"; // default

      const category = (item.category || '').toLowerCase();
      const styleTags = (item.style_tags || '').toLowerCase();
      const occasionTags = (item.occasion_tags || '').toLowerCase();

      // Detect from tags first
      if (occasionTags.includes('formal') || occasionTags.includes('business')) {
        occasion = "business casual";
      } else if (occasionTags.includes('party') || occasionTags.includes('date')) {
        occasion = "date night";
      } else if (occasionTags.includes('work')) {
        occasion = "work";
      } else if (occasionTags.includes('athletic') || occasionTags.includes('sport')) {
        occasion = "active";
      } else if (styleTags.includes('formal') || category.includes('blazer') || category.includes('suit')) {
        occasion = "business casual";
      } else if (styleTags.includes('streetwear') || styleTags.includes('trendy')) {
        occasion = "weekend hangout";
      } else if (category.includes('dress') || category.includes('heel')) {
        occasion = "date night";
      }

      // We'll request outfits that MUST include this item
      const clothingIds = clothes.map(c => c.id);

      const response = await ApiService.generateOutfit(
        occasion,
        clothingIds,
        null,
        null,
        [item.id], // Force include this item
        true // Preview only - don't save to Outfits page
      );

      // The API returns a single outfit object with ai_suggestions string
      // We need to parse it to get the list of outfits
      let suggestions = [];
      try {
        if (typeof response.ai_suggestions === 'string') {
          // Clean up string if needed
          let cleanStr = response.ai_suggestions.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          suggestions = JSON.parse(cleanStr);
        } else {
          suggestions = response.ai_suggestions;
        }

        if (!Array.isArray(suggestions)) {
          suggestions = [suggestions];
        }
      } catch (e) {
        logger.error("Error parsing suggestions:", e);
        suggestions = [];
      }

      // Take top 3
      setGeneratedOutfits(suggestions.slice(0, 3));

      // Animate in
      Animated.parallel([
        Animated.timing(outfitsOpacity, {
          toValue: 1,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.spring(outfitsTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();

    } catch (error) {
      logger.error("Error generating outfits for item:", error);
      setOutfitError("Couldn't load outfit ideas right now");
    } finally {
      setIsGeneratingOutfits(false);
    }
  };

  const closeImageViewer = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedImage(null);
      setGeneratedOutfits([]);
      setOutfitError(null);
      setIsEditing(false);
      setEditedItem(null);
      setActivePickerField(null);
    });
  };

  // Load category options (cached)
  const loadCategoryOptions = async () => {
    if (categoryOptions) return; // already loaded
    try {
      const options = await ApiService.getCategoryOptions();
      setCategoryOptions(options);
    } catch (error) {
      logger.error("Error loading category options:", error);
    }
  };

  const startEditing = () => {
    loadCategoryOptions();
    setEditedItem({ ...selectedImage });
    setIsEditing(true);
    setActivePickerField(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedItem(null);
    setActivePickerField(null);
  };

  const saveEdits = async () => {
    if (!editedItem || !selectedImage) return;

    // Build diff of changed fields
    const updates = {};
    const fieldsToCheck = [
      'category', 'subcategory', 'color', 'fit_type', 'pattern', 'fabric_type',
      'occasion_tags', 'style_tags', 'season_tags', 'brand', 'model',
    ];
    for (const field of fieldsToCheck) {
      if (editedItem[field] !== selectedImage[field]) {
        updates[field] = editedItem[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await ApiService.updateClothing(selectedImage.id, updates);

      // Update local state
      setClothes(prev =>
        prev.map(c => c.id === selectedImage.id ? { ...c, ...updates } : c)
      );
      setSelectedImage(prev => ({ ...prev, ...updates }));
      setIsEditing(false);
      setEditedItem(null);
      setActivePickerField(null);
    } catch (error) {
      logger.error("Error saving edits:", error);
      Alert.alert("Error", "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Determine which category group an item belongs to
  const getItemCategoryGroup = (item) => {
    const cat = (item?.category || '').toLowerCase();
    const sub = (item?.subcategory || '').toLowerCase();
    const combined = `${cat} ${sub}`;

    if (['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels', 'loafers', 'flats', 'oxfords'].some(t => combined.includes(t))) return 'shoes';
    if (['accessory', 'accessories', 'watch', 'bag', 'jewelry', 'belt', 'hat', 'scarf', 'sunglasses', 'necklace', 'bracelet', 'ring'].some(t => combined.includes(t))) return 'accessories';
    if (['jacket', 'blazer', 'coat', 'hoodie', 'sweater', 'cardigan', 'vest', 'bomber', 'windbreaker', 'puffer', 'trench', 'peacoat', 'overshirt', 'shacket', 'sweatshirt', 'fleece', 'pullover', 'poncho'].some(t => combined.includes(t))) return 'layers';
    if (['pants', 'jeans', 'trousers', 'chinos', 'joggers', 'shorts', 'skirt', 'cargo', 'leggings', 'sweatpants'].some(t => combined.includes(t))) return 'bottoms';
    if (['dress', 'jumpsuit', 'romper', 'suit'].some(t => combined.includes(t))) return 'full_body';
    return 'tops'; // default
  };

  // Get relevant subcategory options based on item category group
  const getRelevantSubcategories = () => {
    if (!categoryOptions?.categories || !editedItem) return [];
    const group = getItemCategoryGroup(editedItem);
    const catData = categoryOptions.categories[group];
    return catData?.subcategories || [];
  };

  // Get all category groups for switching
  const getAllCategoryGroups = () => {
    if (!categoryOptions?.categories) return [];
    return Object.entries(categoryOptions.categories).map(([key, val]) => ({
      key,
      label: val.label,
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Wardrobe</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickImage}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.uploadButtonText}>Uploading {uploadingCount}...</Text>
          ) : (
            <Text style={styles.uploadButtonText}>+ Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Apple-style Segmented Control */}
      <View style={styles.segmentedControl}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.segment,
              selectedCategory === cat.id && styles.segmentActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons name={cat.icon} size={15} color={selectedCategory === cat.id ? '#000000' : '#8E8E93'} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.segmentText,
                selectedCategory === cat.id && styles.segmentTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadClothes}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && clothes.length === 0 ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={getFilteredItems()}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={selectedCategory === "clothing" ? "shirt-outline" :
                  selectedCategory === "shoes" ? "footsteps-outline" : "watch-outline"}
                size={48} color="#C7C7CC" 
              />
              <Text style={styles.emptyText}>
                No {categories.find(c => c.id === selectedCategory)?.label.toLowerCase()} yet
              </Text>
              <Text style={styles.emptySubtext}>
                Tap + Add to get started
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openImageViewer(item)}
              >
                <Image
                  source={{ uri: `${API_BASE_URL}${item.image_path}` }}
                  style={styles.itemImage}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteClothing(item.id)}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.itemDetails}>
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {/* Apple's confidence hierarchy */}
                  {item.brand
                    ? item.brand
                    : item.subcategory
                      ? `${item.color || ''} ${item.subcategory}`.trim()
                      : `${item.color || ''} ${item.category}`.trim()
                  }
                </Text>
                <View style={styles.itemTags}>
                  {/* Show model if brand exists and model is confident */}
                  {item.brand && item.model && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.model}</Text>
                    </View>
                  )}
                  {/* Show subcategory if brand exists but no model */}
                  {item.brand && !item.model && item.subcategory && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.subcategory}</Text>
                    </View>
                  )}
                  {/* Show color if brand exists */}
                  {item.brand && item.color && item.color !== 'null' && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.color}</Text>
                    </View>
                  )}
                  {/* If no brand, show pattern/fit */}
                  {!item.brand && item.pattern && item.pattern !== 'solid' && item.pattern !== 'null' && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.pattern}</Text>
                    </View>
                  )}
                  {!item.brand && item.fit_type && item.fit_type !== 'null' && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.fit_type}</Text>
                    </View>
                  )}
                  {/* Show top style tags */}
                  {item.style_tags && item.style_tags !== 'null' && item.style_tags.split(',').slice(0, item.brand ? 1 : 2).map((tag, idx) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{tag.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Image Viewer Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeImageViewer}
      >
        <StatusBar hidden />
        <Animated.View style={[styles.modalContainer, { opacity }]}>
          {/* Top bar */}
          <View style={styles.modalTopBar}>
            <View style={styles.modalTopBarLeft}>
              {isEditing ? (
                <TouchableOpacity onPress={cancelEditing} activeOpacity={0.8}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              ) : (
                selectedImage && (
                  <TouchableOpacity
                    onPress={startEditing}
                    activeOpacity={0.8}
                  >
                    <View style={styles.editButtonPill}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </View>
            <View style={styles.modalTopBarRight}>
              {isEditing ? (
                <TouchableOpacity
                  onPress={saveEdits}
                  activeOpacity={0.8}
                  disabled={isSaving}
                >
                  <View style={[styles.editButtonPill, styles.editButtonPillActive]}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.editButtonText}>Save</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={closeImageViewer}
                  activeOpacity={0.9}
                >
                  <View style={styles.closeButtonCircle}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isEditing && editedItem ? (
            /* ─── EDIT MODE ─── */
            <ScrollView
              style={styles.editScrollView}
              contentContainerStyle={styles.editScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Item image (smaller in edit mode) */}
              <View style={styles.editImageWrapper}>
                <Image
                  source={{ uri: `${API_BASE_URL}${editedItem.image_path}` }}
                  style={styles.editImage}
                  resizeMode="cover"
                />
              </View>

              {/* Category Group Selector */}
              <Text style={styles.editSectionTitle}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editChipScroll}>
                {getAllCategoryGroups().map((group) => {
                  const isActive = getItemCategoryGroup(editedItem) === group.key;
                  return (
                    <TouchableOpacity
                      key={group.key}
                      style={[styles.editChip, isActive && styles.editChipActive]}
                      onPress={() => {
                        // Switch category to first subcategory of this group
                        const catData = categoryOptions?.categories?.[group.key];
                        if (catData) {
                          const newCategory = group.key === 'tops' ? 'shirt'
                            : group.key === 'layers' ? 'jacket'
                            : group.key === 'bottoms' ? 'pants'
                            : group.key === 'full_body' ? 'dress'
                            : group.key === 'shoes' ? 'shoes'
                            : 'accessory';
                          setEditedItem(prev => ({
                            ...prev,
                            category: newCategory,
                            subcategory: catData.subcategories[0] || prev.subcategory,
                          }));
                        }
                      }}
                    >
                      <Text style={[styles.editChipText, isActive && styles.editChipTextActive]}>
                        {group.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Subcategory / Type */}
              <Text style={styles.editSectionTitle}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editChipScroll}>
                {getRelevantSubcategories().map((sub) => {
                  const isActive = (editedItem.subcategory || '').toLowerCase() === sub.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.editChip, isActive && styles.editChipActive]}
                      onPress={() => setEditedItem(prev => ({ ...prev, subcategory: sub }))}
                    >
                      <Text style={[styles.editChipText, isActive && styles.editChipTextActive]}>
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Color */}
              <Text style={styles.editSectionTitle}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editChipScroll}>
                {(categoryOptions?.colors || []).map((color) => {
                  const isActive = (editedItem.color || '').toLowerCase() === color.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[styles.editChip, isActive && styles.editChipActive]}
                      onPress={() => setEditedItem(prev => ({ ...prev, color }))}
                    >
                      <Text style={[styles.editChipText, isActive && styles.editChipTextActive]}>
                        {color}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Fit */}
              <Text style={styles.editSectionTitle}>Fit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editChipScroll}>
                {(categoryOptions?.fit_types || []).map((fit) => {
                  const isActive = (editedItem.fit_type || '').toLowerCase() === fit.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={fit}
                      style={[styles.editChip, isActive && styles.editChipActive]}
                      onPress={() => setEditedItem(prev => ({ ...prev, fit_type: fit }))}
                    >
                      <Text style={[styles.editChipText, isActive && styles.editChipTextActive]}>
                        {fit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Pattern */}
              <Text style={styles.editSectionTitle}>Pattern</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editChipScroll}>
                {(categoryOptions?.patterns || []).map((pat) => {
                  const isActive = (editedItem.pattern || '').toLowerCase() === pat.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={pat}
                      style={[styles.editChip, isActive && styles.editChipActive]}
                      onPress={() => setEditedItem(prev => ({ ...prev, pattern: pat }))}
                    >
                      <Text style={[styles.editChipText, isActive && styles.editChipTextActive]}>
                        {pat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Fabric */}
              <Text style={styles.editSectionTitle}>Fabric</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editChipScroll}>
                {(categoryOptions?.fabrics || []).map((fab) => {
                  const isActive = (editedItem.fabric_type || '').toLowerCase() === fab.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={fab}
                      style={[styles.editChip, isActive && styles.editChipActive]}
                      onPress={() => setEditedItem(prev => ({ ...prev, fabric_type: fab }))}
                    >
                      <Text style={[styles.editChipText, isActive && styles.editChipTextActive]}>
                        {fab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Bottom spacer */}
              <View style={{ height: 60 }} />
            </ScrollView>
          ) : (
            /* ─── VIEW MODE (original) ─── */
            <>
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

              {/* Generated Outfits Section */}
              <Animated.View
                style={[
                  styles.outfitsContainer,
                  {
                    opacity: (() => {
                      // For shoes/accessories (no outfit gen), show immediately
                      const cat = (selectedImage?.category || '').toLowerCase();
                      const isNonClothing = ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels',
                        'loafers', 'flats', 'oxfords', 'slides', 'trainers', 'mules',
                        'accessory', 'accessories', 'bag', 'jewelry', 'watch', 'hat',
                        'scarf', 'belt', 'sunglasses', 'glasses', 'necklace', 'bracelet',
                        'ring', 'backpack', 'cap', 'beanie', 'chain', 'tie'].some(t => cat.includes(t));
                      return isNonClothing ? 1 : outfitsOpacity;
                    })(),
                    transform: [{ translateY: (() => {
                      const cat = (selectedImage?.category || '').toLowerCase();
                      const isNonClothing = ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels',
                        'loafers', 'flats', 'accessory', 'accessories', 'bag', 'jewelry', 'watch',
                        'hat', 'scarf', 'belt', 'sunglasses', 'necklace', 'bracelet',
                        'ring', 'backpack', 'cap', 'beanie', 'chain', 'tie'].some(t => cat.includes(t));
                      return isNonClothing ? 0 : outfitsTranslateY;
                    })() }]
                  }
                ]}
              >
                {(() => {
                  const cat = (selectedImage?.category || '').toLowerCase();
                  const isNonClothing = ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels',
                    'loafers', 'flats', 'accessory', 'accessories', 'bag', 'jewelry', 'watch',
                    'hat', 'scarf', 'belt', 'sunglasses', 'necklace', 'bracelet',
                    'ring', 'backpack', 'cap', 'beanie', 'chain', 'tie'].some(t => cat.includes(t));

                  if (isNonClothing) {
                    // Show item details instead of outfits for shoes/accessories
                    return (
                      <View style={styles.itemDetailSection}>
                        <Text style={styles.outfitsTitle}>Item Details</Text>
                        <View style={styles.itemDetailChips}>
                          {selectedImage?.subcategory && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.subcategory}</Text>
                            </View>
                          )}
                          {selectedImage?.color && selectedImage.color !== 'null' && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.color}</Text>
                            </View>
                          )}
                          {selectedImage?.brand && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.brand}</Text>
                            </View>
                          )}
                          {selectedImage?.model && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.model}</Text>
                            </View>
                          )}
                          {selectedImage?.fit_type && selectedImage.fit_type !== 'null' && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.fit_type}</Text>
                            </View>
                          )}
                          {selectedImage?.fabric_type && selectedImage.fabric_type !== 'null' && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.fabric_type}</Text>
                            </View>
                          )}
                          {selectedImage?.pattern && selectedImage.pattern !== 'solid' && selectedImage.pattern !== 'null' && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.pattern}</Text>
                            </View>
                          )}
                          {selectedImage?.style_tags && selectedImage.style_tags !== 'null' && selectedImage.style_tags.split(',').map((tag, idx) => (
                            <View key={idx} style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{tag.trim()}</Text>
                            </View>
                          ))}
                          {selectedImage?.condition && selectedImage.condition !== 'null' && (
                            <View style={styles.detailChip}>
                              <Text style={styles.detailChipText}>{selectedImage.condition}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }

                  return null;
                })()}

                {(() => {
                  const cat = (selectedImage?.category || '').toLowerCase();
                  const isNonClothing = ['shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels',
                    'loafers', 'flats', 'accessory', 'accessories', 'bag', 'jewelry', 'watch',
                    'hat', 'scarf', 'belt', 'sunglasses', 'necklace', 'bracelet',
                    'ring', 'backpack', 'cap', 'beanie', 'chain', 'tie'].some(t => cat.includes(t));
                  if (isNonClothing) return null;

                  return (
                    <>
                      <Text style={styles.outfitsTitle}>Ways to Wear</Text>
                      {outfitError ? (
                        <View style={styles.generatingContainer}>
                          <Text style={styles.outfitErrorText}>{outfitError}</Text>
                        </View>
                      ) : isGeneratingOutfits ? (
                        <View style={styles.generatingContainer}>
                          <ActivityIndicator color="#FFFFFF" />
                          <Text style={styles.generatingText}>Curating styles...</Text>
                        </View>
                      ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.outfitsScroll}
                  >
                    {generatedOutfits.map((outfit, index) => {
                      // Find images for items in this outfit
                      const outfitImages = outfit.item_ids
                        .map(id => clothes.find(c => c.id === id))
                        .filter(item => item && item.image_path)
                        .slice(0, 4); // Show max 4 items preview

                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.outfitCard}
                          activeOpacity={0.8}
                          onPress={() => {
                            closeImageViewer();
                            navigation.navigate('OutfitDetail', {
                              outfit: outfit,
                              outfitItems: outfit.item_ids.map(id => clothes.find(c => c.id === id)).filter(Boolean),
                              occasion: 'casual',
                              outfitId: null // It's a suggestion, not saved yet
                            });
                          }}
                        >
                          <View style={styles.outfitPreviewGrid}>
                            {outfitImages.map((img, idx) => (
                              <Image
                                key={idx}
                                source={{ uri: `${API_BASE_URL}${img.image_path}` }}
                                style={styles.outfitPreviewImage}
                              />
                            ))}
                          </View>
                          <View style={styles.outfitCardInfo}>
                            <Text style={styles.outfitCardTitle} numberOfLines={1}>{outfit.outfit_name}</Text>
                            <Text style={styles.outfitCardDesc} numberOfLines={1}>{outfit.description}</Text>
                          </View>

                          {/* Favorite heart button */}
                          <TouchableOpacity
                            style={styles.outfitCardFavorite}
                            onPress={async (e) => {
                              e.stopPropagation();
                              const isFav = !!favoritedOutfits[index];
                              try {
                                if (isFav) {
                                  // Unfavorite: find and delete the favorite
                                  const favs = await ApiService.getFavorites();
                                  const itemIds = outfit.item_ids || [];
                                  const match = favs.find(fav => {
                                    try {
                                      const favData = JSON.parse(fav.combination_data);
                                      const favIds = favData.item_ids || [];
                                      return JSON.stringify(favIds.sort()) === JSON.stringify([...itemIds].sort());
                                    } catch { return false; }
                                  });
                                  if (match) await ApiService.deleteFavorite(match.id);
                                  setFavoritedOutfits(prev => { const next = {...prev}; delete next[index]; return next; });
                                } else {
                                  // Favorite: save and favorite
                                  const clothingIds = outfit.item_ids;
                                  await ApiService.saveAndFavoritePreview(
                                    'casual',
                                    JSON.stringify(generatedOutfits),
                                    index,
                                    clothingIds,
                                    null,
                                    null
                                  );
                                  setFavoritedOutfits(prev => ({...prev, [index]: true}));
                                }
                              } catch (error) {
                                console.error('[ClothingScreen] Error toggling favorite:', error);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name={favoritedOutfits[index] ? 'heart' : 'heart-outline'} size={22} color={favoritedOutfits[index] ? '#FF2D55' : 'rgba(255,255,255,0.55)'} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                      )}
                    </>
                  );
                })()}
              </Animated.View>
            </>
          )}
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#C6C6C8",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#E5E5EA",
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
  },
  segmentTextActive: {
    color: "#000000",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: "#C7C7CC",
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: {
    color: "#C62828",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  listContainer: {
    padding: 8,
  },
  loader: {
    marginTop: 100,
  },
  itemContainer: {
    flex: 1,
    margin: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#F2F2F7",
  },
  itemDetails: {
    padding: 12,
  },
  itemCategory: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  itemTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  tag: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTopBar: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  modalTopBarLeft: {
    minWidth: 70,
    alignItems: 'flex-start',
  },
  modalTopBarRight: {
    minWidth: 70,
    alignItems: 'flex-end',
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
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 110,
    paddingBottom: 300, // Space for outfits section
  },
  modalImageWrapper: {
    width: width * 0.75,
    height: width * 0.8, // Square aspect ratio
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalInfo: {
    width: width * 0.75,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    marginTop: 16,
    marginBottom: 30,
  },
  outfitsContainer: {
    width: '100%',
    height: 280, // Fixed height for outfits section
    backgroundColor: 'rgba(28, 28, 30, 0.95)', // Dark background for contrast
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
    position: 'absolute',
    bottom: 0,
  },
  outfitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 20,
    marginBottom: 16,
  },
  outfitsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  outfitCard: {
    width: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
  },
  outfitPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 8,
  },
  outfitPreviewImage: {
    width: '50%',
    height: '50%',
    resizeMode: 'cover',
  },
  outfitCardInfo: {
    paddingHorizontal: 4,
  },
  outfitCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  outfitCardDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  outfitCardFavorite: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitCardHeart: {
    fontSize: 18,
  },
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 180,
  },
  generatingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    fontSize: 14,
  },
  outfitErrorText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  itemDetailSection: {
    flex: 1,
    paddingTop: 0,
  },
  itemDetailChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
  },
  detailChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  detailChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  modalItemName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  modalItemDetail: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },

  // Edit mode styles
  editButtonPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editButtonPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  editScrollView: {
    flex: 1,
    width: '100%',
    marginTop: 110,
  },
  editScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  editImageWrapper: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#000',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  editImage: {
    width: '100%',
    height: '100%',
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 20,
  },
  editChipScroll: {
    marginBottom: 4,
  },
  editChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 8,
    marginBottom: 8,
  },
  editChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  editChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'capitalize',
  },
  editChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
