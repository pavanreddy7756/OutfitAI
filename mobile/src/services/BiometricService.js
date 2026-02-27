import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createLogger } from "../utils/logger";

const logger = createLogger("BiometricService");

export const BiometricService = {
  /**
   * Check if device has biometric sensors available
   */
  async isBiometricAvailable() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch (error) {
      logger.error("Error checking biometric availability:", error);
      return false;
    }
  },

  /**
   * Check what type of biometrics are available
   * Returns array like ['faceRecognition', 'fingerprint']
   */
  async getAvailableBiometrics() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types;
    } catch (error) {
      logger.error("Error getting available biometrics:", error);
      return [];
    }
  },

  /**
   * Authenticate using Face ID / Touch ID
   */
  async authenticate() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        logger.warn("Biometric hardware not available");
        return { success: false, error: "Biometric not available on this device" };
      }

      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false, // Allow using device pin/password as fallback
        reason: "Authenticate to access OutfitAI",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
      });

      return result;
    } catch (error) {
      logger.error("Authentication error:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Store biometric credentials (email and encrypted token)
   */
  async storeBiometricCredentials(email, token) {
    try {
      await AsyncStorage.setItem("@biometric_email", email);
      await AsyncStorage.setItem("@biometric_token", token);
      await AsyncStorage.setItem("@biometric_enabled", "true");
      return true;
    } catch (error) {
      logger.error("Error storing credentials:", error);
      return false;
    }
  },

  /**
   * Get stored biometric credentials
   */
  async getBiometricCredentials() {
    try {
      const email = await AsyncStorage.getItem("@biometric_email");
      const token = await AsyncStorage.getItem("@biometric_token");

      if (!email || !token) {
        return null;
      }

      return { email, token };
    } catch (error) {
      logger.error("Error retrieving credentials:", error);
      return null;
    }
  },

  /**
   * Check if biometric login is enabled
   */
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem("@biometric_enabled");
      return enabled === "true";
    } catch (error) {
      logger.error("Error checking biometric status:", error);
      return false;
    }
  },

  /**
   * Enable biometric authentication
   */
  async enableBiometric(email, token) {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return { success: false, error: "Biometric not available" };
      }

      // Store credentials
      const stored = await this.storeBiometricCredentials(email, token);
      if (!stored) {
        return { success: false, error: "Failed to store credentials" };
      }

      return { success: true };
    } catch (error) {
      logger.error("Error enabling biometric:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Disable biometric authentication
   */
  async disableBiometric() {
    try {
      await AsyncStorage.removeItem("@biometric_email");
      await AsyncStorage.removeItem("@biometric_token");
      await AsyncStorage.removeItem("@biometric_enabled");
      return true;
    } catch (error) {
      logger.error("Error disabling biometric:", error);
      return false;
    }
  },

  /**
   * Validate token by making a test API call
   */
  async validateToken(token) {
    try {
      const response = await fetch("http://192.168.1.9:8000/api/clothing/items", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      
      return response.ok;
    } catch (error) {
      logger.error("Token validation error:", error);
      return false;
    }
  },

  /**
   * Perform biometric login
   */
  async biometricLogin() {
    try {
      // First authenticate
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      // Get stored credentials
      const credentials = await this.getBiometricCredentials();
      if (!credentials) {
        return { success: false, error: "No stored credentials found" };
      }

      // Validate the stored token
      const isValid = await this.validateToken(credentials.token);
      if (!isValid) {
        // Clear invalid credentials
        await this.disableBiometric();
        return { success: false, error: "Session expired. Please log in again." };
      }

      return { success: true, email: credentials.email, token: credentials.token };
    } catch (error) {
      logger.error("Biometric login error:", error);
      return { success: false, error: error.message };
    }
  },
};
