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

export const StyleDNAWelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="sparkles" size={24} color="#FF9500" style={{ marginRight: 8 }} />
          <Text style={styles.title}>Style DNA</Text>
        </View>
        <Text style={styles.subtitle}>
          Create your personalized style profile
        </Text>

        {/* Feature Cards */}
        <View style={styles.featureCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={28} color="#007AFF" />
          </View>
          <Text style={styles.featureTitle}>Complexion Analysis</Text>
          <Text style={styles.featureDescription}>
            Upload a face photo and we'll identify your skin tone and perfect color palette
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="resize-outline" size={28} color="#5856D6" />
          </View>
          <Text style={styles.featureTitle}>Body Shape Profile</Text>
          <Text style={styles.featureDescription}>
            A full-body photo helps us recommend the most flattering fits for you
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="color-palette-outline" size={28} color="#FF2D55" />
          </View>
          <Text style={styles.featureTitle}>Style Preferences</Text>
          <Text style={styles.featureDescription}>
            Optional: Share your favorite outfits to personalize recommendations
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>You'll get:</Text>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.benefitText}>Colors that enhance your complexion</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.benefitText}>Fits tailored to your body shape</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.benefitText}>Outfit suggestions just for you</Text>
          </View>
        </View>

        {/* Time estimate */}
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={18} color="#8E8E93" />
          <Text style={styles.timeText}>Takes about 2 minutes</Text>
        </View>

        {/* Privacy note */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="lock-closed" size={14} color="#8E8E93" style={{ marginRight: 4 }} />
          <Text style={styles.privacyText}>
            Your photos are analyzed securely and never shared
          </Text>
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("StyleDNAFaceUpload")}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Maybe Later</Text>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 150,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#000",
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: "#8E8E93",
    marginBottom: 32,
  },
  featureCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 21,
  },
  benefitsContainer: {
    marginTop: 24,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 15,
    color: "#000",
    marginLeft: 10,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  timeText: {
    fontSize: 15,
    color: "#8E8E93",
    marginLeft: 6,
  },
  privacyText: {
    fontSize: 13,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 16,
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
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "400",
  },
});
