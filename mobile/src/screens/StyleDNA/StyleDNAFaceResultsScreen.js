import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const StyleDNAFaceResultsScreen = ({ route, navigation }) => {
  const { analysis, imageUri } = route.params;

  const renderColorPalette = (colors) => {
    if (!colors || colors.length === 0) return null;

    return (
      <View style={styles.colorGrid}>
        {colors.map((color, index) => (
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
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Complete</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color="#34C759" />
          </View>
          <Text style={styles.successTitle}>Analysis Complete!</Text>
        </View>

        {/* Photo preview */}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.photoPreview} />
        )}

        {/* Complexion Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Complexion Profile</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Skin Tone</Text>
              <Text style={styles.infoValue}>
                {analysis.skin_tone || "Not detected"}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Undertone</Text>
              <Text style={styles.infoValue}>
                {analysis.undertone || "Not detected"}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Seasonal Palette</Text>
              <Text style={styles.infoValue}>
                {analysis.seasonal_palette || "Not detected"}
              </Text>
            </View>
          </View>
        </View>

        {/* Best Colors */}
        {analysis.best_colors && analysis.best_colors.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={18} color="#FF9500" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Best Colors for You</Text>
            </View>
            {renderColorPalette(analysis.best_colors)}
          </View>
        )}

        {/* Colors to Avoid */}
        {analysis.avoid_colors && analysis.avoid_colors.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alert-circle-outline" size={18} color="#FF3B30" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Colors to Avoid</Text>
            </View>
            {renderColorPalette(analysis.avoid_colors)}
          </View>
        )}

        {/* Analysis Notes */}
        {analysis.analysis_notes && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bulb-outline" size={18} color="#FF9500" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Why These Colors Work</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{analysis.analysis_notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("StyleDNABodyUpload")}
        >
          <Text style={styles.primaryButtonText}>Continue to Step 2</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  photoPreview: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: "#8E8E93",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    textTransform: "capitalize",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 4,
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
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  colorName: {
    fontSize: 12,
    color: "#000",
    textAlign: "center",
    fontWeight: "500",
  },
  notesCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 15,
    color: "#000",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
