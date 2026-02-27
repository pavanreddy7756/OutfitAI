import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiService } from "../services/ApiService";
import { AuthService } from "../services/AuthService";
import { BiometricService } from "../services/BiometricService";
import { createLogger } from "../utils/logger";

const logger = createLogger("LoginScreen");

export function LoginScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState("Face ID");

  // Check biometric availability on component mount
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const available = await BiometricService.isBiometricAvailable();
      setBiometricAvailable(available);

      if (available) {
        const enabled = await BiometricService.isBiometricEnabled();
        setBiometricEnabled(enabled);

        const types = await BiometricService.getAvailableBiometrics();
        // iPhone 16 Pro Max has Face ID (type 3)
        if (types.includes(3)) {
          setBiometricType("Face ID");
        } else if (types.includes(2)) {
          setBiometricType("Touch ID");
        } else {
          setBiometricType("Biometric");
        }
      }
    } catch (err) {
      logger.error("Error checking biometric support:", err);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Clear any old token before attempting new login
      await AuthService.clearAuth();
      
      const response = await ApiService.login(email, password);
      await AuthService.setToken(response.access_token);
      await AuthService.setUserId(response.user_id || response.id);
      
      // Check if Face ID is available and not yet enabled for this user
      if (biometricAvailable && !biometricEnabled && Platform.OS === "ios") {
        // Ask user if they want to enable Face ID
        Alert.alert(
          "Enable Face ID",
          "Would you like to use Face ID for faster login next time?",
          [
            {
              text: "Not Now",
              style: "cancel",
              onPress: () => {
                setSuccess("Login successful!");
                setTimeout(() => onLoginSuccess(), 500);
              }
            },
            {
              text: "Enable Face ID",
              onPress: async () => {
                const result = await BiometricService.enableBiometric(email, response.access_token);
                if (result.success) {
                  setSuccess("Login successful! Face ID enabled.");
                  setBiometricEnabled(true);
                } else {
                  setSuccess("Login successful!");
                }
                setTimeout(() => onLoginSuccess(), 500);
              }
            }
          ]
        );
      } else {
        setSuccess("Login successful!");
        setTimeout(() => onLoginSuccess(), 500);
      }
    } catch (err) {
      const errorMessage = err?.message || JSON.stringify(err) || "Login failed";
      setError(errorMessage);
      logger.error("Login Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !username || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await ApiService.register(email, username, password);
      setSuccess("Registration successful! Please login with your credentials.");
      setTimeout(() => setIsLogin(true), 1000);
      setEmail("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err?.message || JSON.stringify(err) || "Registration failed";
      setError(errorMessage);
      logger.error("Register Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) {
      setError("Biometric authentication not available");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await BiometricService.biometricLogin();

      if (result.success) {
        await AuthService.setToken(result.token);
        await AuthService.setUserId(result.email);
        setSuccess("Biometric login successful!");
        setTimeout(() => onLoginSuccess(), 500);
      } else {
        setError(result.error || "Biometric authentication failed");
      }
    } catch (err) {
      logger.error("Biometric login error:", err);
      setError(err?.message || "Biometric login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>OutfitAI</Text>
      <Text style={styles.subtitle}>AI-Powered Outfit Suggestions</Text>

      {/* Biometric Login Button - Show only if available and enabled on iOS */}
      {biometricAvailable && biometricEnabled && Platform.OS === "ios" && (
        <TouchableOpacity
          style={[styles.biometricButton, loading && styles.buttonDisabled]}
          onPress={handleBiometricLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={biometricType === "Face ID" ? "scan" : "finger-print"}
                size={24}
                color="#fff"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.biometricButtonText}>
                Login with {biometricType}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Divider */}
      {biometricAvailable && biometricEnabled && Platform.OS === "ios" && (
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, isLogin && styles.tabActive]}
          onPress={() => {
            setIsLogin(true);
            setError("");
            setSuccess("");
          }}
        >
          <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !isLogin && styles.tabActive]}
          onPress={() => {
            setIsLogin(false);
            setError("");
            setSuccess("");
          }}
        >
          <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Register</Text>
        </TouchableOpacity>
      </View>

      {isLogin ? (
        // LOGIN FORM
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            placeholderTextColor="#999"
          />
        </>
      ) : (
        // REGISTER FORM
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
            placeholderTextColor="#999"
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={isLogin ? handleLogin : handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? "Login" : "Register"}</Text>
        )}
      </TouchableOpacity>

      {isLogin && (
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo Credentials:</Text>
          <Text style={styles.demoText}>Email: demo@example.com</Text>
          <Text style={styles.demoText}>Password: password123</Text>
          <Text style={styles.demoNote}>Or register to create your own account</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 20,
    justifyContent: "center",
    minHeight: "100%",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  biometricButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 15,
  },
  biometricButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#999",
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "#d32f2f",
    marginBottom: 10,
    textAlign: "center",
    padding: 10,
    backgroundColor: "#ffebee",
    borderRadius: 6,
    overflow: "hidden",
  },
  success: {
    color: "#388e3c",
    marginBottom: 10,
    textAlign: "center",
    padding: 10,
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
  },
  demoContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontFamily: "Courier",
  },
  demoNote: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },
});
