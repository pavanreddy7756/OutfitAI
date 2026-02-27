import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const StyleDNACompleteScreen = ({ navigation }) => {
  const goToHome = () => {
    // Navigate back to the main app
    navigation.reset({
      index: 0,
      routes: [{ name: "Root" }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Animation/Icon */}
        <View style={styles.celebrationContainer}>
          <View style={styles.successIconLarge}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          </View>
          <Text style={styles.title}>Your Style DNA is Ready!</Text>
          <Text style={styles.subtitle}>
            Your personalized profile is complete
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Ionicons name="color-palette" size={24} color="#007AFF" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Complexion Profile</Text>
              <Text style={styles.summaryDescription}>
                Perfect color palette identified
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Ionicons name="body" size={24} color="#007AFF" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Body Shape Analysis</Text>
              <Text style={styles.summaryDescription}>
                Personalized fit recommendations
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>What's Next?</Text>
          
          <View style={styles.benefitCard}>
            <Ionicons name="sparkles" size={28} color="#FF9500" />
            <Text style={styles.benefitTitle}>Personalized Outfits</Text>
            <Text style={styles.benefitDescription}>
              All outfit suggestions will now be tailored to your unique style profile
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Ionicons name="color-filter" size={28} color="#FF9500" />
            <Text style={styles.benefitTitle}>Perfect Colors</Text>
            <Text style={styles.benefitDescription}>
              We'll recommend colors that enhance your complexion
            </Text>
          </View>

          <View style={styles.benefitCard}>
            <Ionicons name="shirt" size={28} color="#FF9500" />
            <Text style={styles.benefitTitle}>Ideal Fits</Text>
            <Text style={styles.benefitDescription}>
              Get suggestions for fits that flatter your body shape
            </Text>
          </View>
        </View>

        {/* View Profile Button */}
        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={() => navigation.navigate("StyleDNA")}
        >
          <Text style={styles.viewProfileButtonText}>View Full Profile</Text>
          <Ionicons name="arrow-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={goToHome}
        >
          <Text style={styles.primaryButtonText}>Start Creating Outfits</Text>
          <Ionicons name="sparkles" size={20} color="#fff" style={{ marginLeft: 8 }} />
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 150,
  },
  celebrationContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  successIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  celebrationEmoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  summaryDescription: {
    fontSize: 14,
    color: "#8E8E93",
  },
  benefitsContainer: {
    marginTop: 32,
  },
  benefitsTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000",
    marginBottom: 20,
  },
  benefitCard: {
    backgroundColor: "#FFFBF0",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFE5B4",
  },
  benefitTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    marginTop: 12,
    marginBottom: 6,
  },
  benefitDescription: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 21,
  },
  viewProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 20,
  },
  viewProfileButtonText: {
    fontSize: 17,
    color: "#007AFF",
    fontWeight: "600",
    marginRight: 6,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
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
