import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BiometricService } from "../services/BiometricService";
import { AuthService } from "../services/AuthService";
import { createLogger } from "../utils/logger";

const logger = createLogger("SettingsScreen");

export function SettingsScreen({ onLogout }) {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState("Face ID");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Check biometric availability
      const available = await BiometricService.isBiometricAvailable();
      setBiometricAvailable(available);

      if (available) {
        const enabled = await BiometricService.isBiometricEnabled();
        setBiometricEnabled(enabled);

        const types = await BiometricService.getAvailableBiometrics();
        if (types.includes(3)) {
          setBiometricType("Face ID");
        } else if (types.includes(2)) {
          setBiometricType("Touch ID");
        }
      }

      // Get user email
      const credentials = await BiometricService.getBiometricCredentials();
      if (credentials) {
        setUserEmail(credentials.email);
      }
    } catch (err) {
      logger.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async (value) => {
    try {
      if (value) {
        // Enable biometric
        setLoading(true);

        // First authenticate to ensure they can use biometric
        const authResult = await BiometricService.authenticate();
        if (!authResult.success) {
          Alert.alert("Error", "Failed to authenticate: " + authResult.error);
          setLoading(false);
          return;
        }

        // Get current token
        const token = await AuthService.getToken();
        const email = userEmail;

        if (!token || !email) {
          Alert.alert("Error", "Could not retrieve authentication credentials");
          setLoading(false);
          return;
        }

        // Store credentials for biometric
        const result = await BiometricService.enableBiometric(email, token);

        if (result.success) {
          setBiometricEnabled(true);
          Alert.alert("Success", `${biometricType} authentication enabled!`);
        } else {
          Alert.alert("Error", result.error || "Failed to enable biometric");
        }
      } else {
        // Disable biometric
        Alert.alert(
          "Disable " + biometricType,
          "Are you sure you want to disable " + biometricType + " authentication?",
          [
            {
              text: "Cancel",
              onPress: () => {},
              style: "cancel",
            },
            {
              text: "Disable",
              onPress: async () => {
                const result = await BiometricService.disableBiometric();
                if (result) {
                  setBiometricEnabled(false);
                  Alert.alert("Success", biometricType + " authentication disabled");
                } else {
                  Alert.alert("Error", "Failed to disable biometric");
                }
              },
              style: "destructive",
            },
          ]
        );
      }
    } catch (err) {
      logger.error("Toggle error:", err);
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await AuthService.clearAuth();
            onLogout();
          } catch (err) {
            Alert.alert("Error", "Failed to logout");
          }
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* User Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoCard}>
          <Ionicons name="person-circle" size={40} color="#007AFF" />
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{userEmail || "No email"}</Text>
            <Text style={styles.userNote}>Logged in account</Text>
          </View>
        </View>
      </View>

      {/* Security Section */}
      {Platform.OS === "ios" && biometricAvailable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingContent}>
              <Ionicons
                name={biometricType === "Face ID" ? "face" : "finger-print"}
                size={24}
                color="#007AFF"
                style={styles.settingIcon}
              />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{biometricType}</Text>
                <Text style={styles.settingDescription}>
                  Use {biometricType} to login faster
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: "#ccc", true: "#81C784" }}
                thumbColor={biometricEnabled ? "#4CAF50" : "#fff"}
              />
            )}
          </View>

          <Text style={styles.securityNote}>
            Your {biometricType.toLowerCase()} data is securely stored on your device.
            OutfitAI never has access to your biometric information.
          </Text>
        </View>
      )}

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoCard}>
          <Text style={styles.appName}>OutfitAI</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            AI-Powered Outfit Suggestions
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#fff" style={{ marginRight: 10 }} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userNote: {
    fontSize: 12,
    color: "#999",
  },
  settingCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: "#999",
  },
  securityNote: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
    textAlign: "center",
  },
  appVersion: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  logoutButton: {
    backgroundColor: "#d32f2f",
    margin: 16,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    height: 20,
  },
});
