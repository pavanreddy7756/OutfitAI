import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const StyleDNABodyResultsScreen = ({ route, navigation }) => {
  const { analysis, imageUri } = route.params;

  const renderRecommendations = (recommendations) => {
    if (!recommendations) return null;

    return (
      <View style={styles.recommendationsCard}>
        <Text style={styles.cardTitle}>{recommendations.fit}</Text>
        <Text style={styles.cardReason}>{recommendations.reason}</Text>
        
        {recommendations.specific_tips && recommendations.specific_tips.length > 0 && (
          <View style={styles.tipsSection}>
            {recommendations.specific_tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={16} color="#FF9500" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const handleComplete = () => {
    navigation.navigate("StyleDNAComplete");
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
          <Text style={styles.successTitle}>Body Analysis Complete!</Text>
        </View>

        {/* Photo preview */}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.photoPreview} />
        )}

        {/* Body Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Body Profile</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Body Shape</Text>
              <Text style={styles.infoValue}>
                {analysis.body_shape || "Not detected"}
              </Text>
            </View>
            {analysis.height_estimate && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Estimated Height</Text>
                  <Text style={styles.infoValue}>{analysis.height_estimate} cm</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Recommended Fits - Tops */}
        {analysis.recommended_fits && analysis.recommended_fits.tops && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shirt-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Recommended Tops</Text>
            </View>
            {renderRecommendations(analysis.recommended_fits.tops)}
            
            {analysis.recommended_fits.tops.necklines && (
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Best Necklines:</Text>
                <Text style={styles.detailsText}>
                  {analysis.recommended_fits.tops.necklines.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recommended Fits - Bottoms */}
        {analysis.recommended_fits && analysis.recommended_fits.bottoms && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cut-outline" size={18} color="#5856D6" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Recommended Bottoms</Text>
            </View>
            {renderRecommendations(analysis.recommended_fits.bottoms)}
            
            {analysis.recommended_fits.bottoms.styles && (
              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Best Styles:</Text>
                <Text style={styles.detailsText}>
                  {analysis.recommended_fits.bottoms.styles.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Balance Tips */}
        {analysis.balance_tips && analysis.balance_tips.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="options-outline" size={18} color="#FF9500" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Style Balance Tips</Text>
            </View>
            <View style={styles.tipsCard}>
              {analysis.balance_tips.map((tip, index) => (
                <View key={index} style={styles.balanceTipRow}>
                  <Ionicons name="star" size={16} color="#FF9500" />
                  <Text style={styles.balanceTipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleComplete}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
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
  recommendationsCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    textTransform: "capitalize",
    marginBottom: 8,
  },
  cardReason: {
    fontSize: 15,
    color: "#000",
    lineHeight: 22,
    marginBottom: 12,
  },
  tipsSection: {
    marginTop: 8,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#000",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 15,
    color: "#000",
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
  },
  balanceTipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  balanceTipText: {
    fontSize: 15,
    color: "#000",
    marginLeft: 10,
    flex: 1,
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
