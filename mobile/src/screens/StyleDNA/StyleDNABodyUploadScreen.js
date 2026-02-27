import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ApiService } from "../../services/ApiService";
import { createLogger } from "../../utils/logger";

const logger = createLogger("StyleDNABodyUpload");

export const StyleDNABodyUploadScreen = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const pickImage = async (useCamera = false) => {
    try {
      let result;

      if (useCamera) {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission required", "Camera access is needed");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert("Permission required", "Gallery access is needed");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const analyzePhoto = async () => {
    if (!selectedImage) {
      Alert.alert("No photo selected", "Please take or upload a photo first");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await ApiService.analyzeBody(selectedImage);

      if (response.success) {
        navigation.navigate("StyleDNABodyResults", {
          analysis: response.analysis,
          imageUri: selectedImage,
        });
      } else {
        Alert.alert("Analysis Failed", response.message || "Please try again");
      }
    } catch (error) {
      logger.error("Body analysis error:", error);
      Alert.alert("Error", "Failed to analyze photo. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Photo</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.stepText}>Step 2 of 3</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: "66%" }]} />
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>👗 Full Body Photo</Text>
        <Text style={styles.description}>
          We'll analyze your body shape to recommend the best fits
        </Text>

        {/* Photo preview or placeholder */}
        <View style={styles.photoContainer}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.silhouetteText}>🧍</Text>
              <Text style={styles.placeholderHint}>Stand naturally</Text>
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 For accurate analysis:</Text>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={styles.tipText}>Wear fitted clothing</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={styles.tipText}>Full body visible (head to toe)</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={styles.tipText}>Stand naturally, facing forward</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
            <Text style={styles.tipText}>Good lighting</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.footer}>
        {selectedImage ? (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={analyzePhoto}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Analyze Photo</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.secondaryButtonText}>Choose Different Photo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="images" size={20} color="#007AFF" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </>
        )}
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  stepText: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  description: {
    fontSize: 17,
    color: "#8E8E93",
    marginBottom: 32,
    lineHeight: 24,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  photoPreview: {
    width: 280,
    height: 360,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
  },
  photoPlaceholder: {
    width: 280,
    height: 360,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
  },
  silhouetteText: {
    fontSize: 80,
    marginBottom: 12,
  },
  placeholderHint: {
    fontSize: 15,
    color: "#8E8E93",
  },
  tipsContainer: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: "#000",
    marginLeft: 10,
  },
  footer: {
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
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "400",
  },
});
