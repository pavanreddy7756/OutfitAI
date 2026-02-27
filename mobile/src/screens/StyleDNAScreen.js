import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiService } from "../services/ApiService";
import { createLogger } from "../utils/logger";

const logger = createLogger("StyleDNAScreen");

const StyleDNAScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [customPreferences, setCustomPreferences] = useState("");
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getStyleDNAProfile();
      setProfile(response);
      setCustomPreferences(response?.style_dna?.custom_preferences || "");
    } catch (error) {
      logger.error("Error loading Style DNA profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomPreferences = async () => {
    try {
      setIsSavingPreferences(true);
      await ApiService.updateStyleDNA({ custom_preferences: customPreferences });
      Alert.alert("Success", "Your preferences have been saved!");
    } catch (error) {
      logger.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const startStyleDNA = () => {
    navigation.navigate("StyleDNAWelcome");
  };

  const renderColorPalette = (colorsJson) => {
    if (!colorsJson) return null;
    
    try {
      const colors = JSON.parse(colorsJson);
      if (!colors || colors.length === 0) return null;

      return (
        <View style={styles.colorGrid}>
          {colors.slice(0, 6).map((color, index) => (
            <View key={index} style={styles.colorItem}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color.hex || "#ccc" },
                ]}
              />
              <Text style={styles.colorName}>{color.name}</Text>
            </View>
          ))}
        </View>
      );
    } catch (e) {
      return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Style DNA</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (!profile || !profile.profile_complete) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Style DNA</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="sparkles" size={48} color="#FF9500" />
          </View>
          <Text style={styles.emptyTitle}>Create Your Style DNA</Text>
          <Text style={styles.emptyDescription}>
            Upload a few photos to get personalized outfit recommendations tailored just for you
          </Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={startStyleDNA}
          >
            <Text style={styles.createButtonText}>Get Started</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Show profile
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Style DNA</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert(
            "Reset Style DNA",
            "Are you sure you want to delete your Style DNA profile?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await ApiService.deleteStyleDNA();
                    loadProfile();
                  } catch (error) {
                    Alert.alert("Error", "Failed to delete profile");
                  }
                },
              },
            ]
          );
        }}>
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Complete Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.badgeText}>Profile Complete</Text>
          </View>
        </View>

        {/* Personalized Tips */}
        {profile.personalized_tips && profile.personalized_tips.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={18} color="#FF9500" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Your Style Insights</Text>
            </View>
            {profile.personalized_tips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <Ionicons name="bulb" size={20} color="#FF9500" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Custom Preferences */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="create-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Personal Styling Notes</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Tell us about your style preferences, favorite pieces, or anything else we should know
          </Text>
          <TextInput
            style={styles.preferencesInput}
            placeholder="e.g., I love layering, prefer minimalist looks, always need pockets..."
            value={customPreferences}
            onChangeText={setCustomPreferences}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor="#8E8E93"
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveCustomPreferences}
            disabled={isSavingPreferences}
          >
            {isSavingPreferences ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Complexion Profile */}
        {profile.complexion_profile && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="color-palette-outline" size={18} color="#FF2D55" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Complexion Profile</Text>
            </View>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Skin Tone</Text>
                <Text style={styles.profileValue}>
                  {profile.complexion_profile.skin_tone}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Undertone</Text>
                <Text style={styles.profileValue}>
                  {profile.complexion_profile.undertone}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Seasonal Palette</Text>
                <Text style={styles.profileValue}>
                  {profile.complexion_profile.seasonal_palette}
                </Text>
              </View>
            </View>

            {profile.style_dna && profile.style_dna.best_colors_json && (
              <View style={styles.colorsSection}>
                <Text style={styles.subsectionTitle}>Best Colors for You</Text>
                {renderColorPalette(profile.style_dna.best_colors_json)}
              </View>
            )}
          </View>
        )}

        {/* Body Profile */}
        {profile.body_profile && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-outline" size={18} color="#5856D6" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Body Profile</Text>
            </View>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Body Shape</Text>
                <Text style={styles.profileValue}>
                  {profile.body_profile.body_shape}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Recommended Fit</Text>
                <Text style={styles.profileValue}>
                  {profile.body_profile.recommended_fit}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Style Profile */}
        {profile.style_profile && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flag-outline" size={18} color="#34C759" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Style Profile</Text>
            </View>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Style</Text>
                <Text style={styles.profileValue}>
                  {profile.style_profile.dominant_style}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Formality</Text>
                <Text style={styles.profileValue}>
                  {profile.style_profile.formality}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Retake button */}
        <TouchableOpacity
          style={styles.retakeButton}
          onPress={startStyleDNA}
        >
          <Ionicons name="camera-outline" size={20} color="#007AFF" />
          <Text style={styles.retakeButtonText}>Retake Photos</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  badgeContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34C759",
    marginLeft: 6,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 15,
    color: "#8E8E93",
    marginBottom: 12,
    lineHeight: 22,
  },
  preferencesInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#000",
    minHeight: 120,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
    marginTop: 16,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBF0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    marginLeft: 12,
    lineHeight: 22,
  },
  profileCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  profileLabel: {
    fontSize: 15,
    color: "#8E8E93",
  },
  profileValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    textTransform: "capitalize",
  },
  colorsSection: {
    marginTop: 16,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  colorItem: {
    width: "33.33%",
    padding: 6,
    marginBottom: 12,
  },
  colorSwatch: {
    width: "100%",
    height: 70,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  colorName: {
    fontSize: 11,
    color: "#000",
    textAlign: "center",
    fontWeight: "500",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginTop: 16,
  },
  retakeButtonText: {
    fontSize: 17,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default StyleDNAScreen;
