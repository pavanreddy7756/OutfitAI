import { API_ENDPOINTS, API_BASE_URL } from "../api/config";
import { AuthService } from "./AuthService";
import { createLogger } from "../utils/logger";

const logger = createLogger("ApiService");

export const ApiService = {
  async makeRequest(endpoint, method = "GET", data = null, isFormData = false) {
    try {
      const token = await AuthService.getToken();

      const headers = {
        Accept: "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const options = {
        method,
        headers,
        redirect: "follow",
      };

      if (data && method !== "GET") {
        if (isFormData) {
          options.body = data;
        } else {
          options.body = JSON.stringify(data);
        }
      }

      logger.debug(`${method} ${endpoint}`);
      const response = await fetch(endpoint, options);

      // Handle network errors
      if (!response) {
        throw new Error("Network request failed - no response from server");
      }

      // Handle 204 No Content (successful deletion)
      if (response.status === 204) {
        return { success: true };
      }

      let responseData;
      const contentType = response.headers.get("content-type");

      try {
        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = { detail: text || "Invalid response format from server" };
          }
        }
      } catch (parseError) {
        logger.error("Response parse error:", parseError);
        responseData = { detail: "Invalid response format from server" };
      }

      if (!response.ok) {
        const errorMessage = responseData?.detail || responseData?.message || responseData?.error || `HTTP ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = responseData;
        throw error;
      }

      return responseData;
    } catch (error) {
      logger.error("API Error:", error.message);
      throw error;
    }
  },

  // Auth endpoints
  async register(email, username, password) {
    return this.makeRequest(API_ENDPOINTS.REGISTER, "POST", {
      email,
      username,
      password,
    });
  },

  async login(email, password) {
    return this.makeRequest(API_ENDPOINTS.LOGIN, "POST", {
      email,
      password,
    });
  },

  // Clothing endpoints
  async uploadClothing(formData) {
    return this.makeRequest(
      API_ENDPOINTS.UPLOAD_CLOTHING,
      "POST",
      formData,
      true
    );
  },

  async getClothingItems() {
    // Request all items with large page_size (max is 500)
    return this.makeRequest(`${API_ENDPOINTS.GET_CLOTHING_ITEMS}?page_size=500`);
  },

  async getClothingItem(id) {
    return this.makeRequest(API_ENDPOINTS.GET_CLOTHING_ITEM(id));
  },

  async deleteClothing(id) {
    return this.makeRequest(API_ENDPOINTS.DELETE_CLOTHING(id), "DELETE");
  },

  async updateClothing(id, updates) {
    return this.makeRequest(API_ENDPOINTS.UPDATE_CLOTHING(id), "PUT", updates);
  },

  async getCategoryOptions() {
    return this.makeRequest(API_ENDPOINTS.CATEGORY_OPTIONS);
  },

  // Outfit endpoints
  async generateOutfit(occasion, clothingItemIds, season = null, weather = null, forceIncludeItemIds = null, previewOnly = false) {
    const url = `${API_ENDPOINTS.GENERATE_OUTFIT}${previewOnly ? '?preview_only=true' : ''}`;
    return this.makeRequest(url, "POST", {
      occasion,
      clothing_item_ids: clothingItemIds,
      season,
      weather,
      force_include_item_ids: forceIncludeItemIds,
    });
  },

  async saveAndFavoritePreview(occasion, aiSuggestions, combinationIndex, clothingItemIds, season = null, weather = null) {
    return this.makeRequest(`${API_BASE_URL}/api/outfits/save-preview`, "POST", {
      occasion,
      ai_suggestions: aiSuggestions,
      combination_index: combinationIndex,
      clothing_item_ids: clothingItemIds,
      season,
      weather,
    });
  },

  async getOutfits() {
    // Request all outfits with large page_size
    return this.makeRequest(`${API_ENDPOINTS.GET_OUTFITS}?page_size=500`);
  },

  async getOutfit(id) {
    return this.makeRequest(API_ENDPOINTS.GET_OUTFIT(id));
  },

  async toggleFavorite(id, combinationIndex) {
    return this.makeRequest(
      `${API_ENDPOINTS.TOGGLE_FAVORITE(id)}?combination_index=${combinationIndex}`,
      "PUT"
    );
  },

  async regenerateOutfit(id, occasion, clothingItemIds, previousSuggestions) {
    return this.makeRequest(API_ENDPOINTS.REGENERATE_OUTFIT(id), "PUT", {
      occasion,
      clothing_item_ids: clothingItemIds,
      previous_suggestions: previousSuggestions,
    });
  },

  async deleteOutfit(id) {
    return this.makeRequest(API_ENDPOINTS.DELETE_OUTFIT(id), "DELETE");
  },

  async getFavorites() {
    // Request all favorites with large page_size
    return this.makeRequest(`${API_ENDPOINTS.GET_FAVORITES}?page_size=500`, "GET");
  },

  async deleteFavorite(id) {
    return this.makeRequest(API_ENDPOINTS.DELETE_FAVORITE(id), "DELETE");
  },

  // Style DNA endpoints
  async analyzeFace(imageUri) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'face.jpg',
    });

    return this.makeRequest(
      API_ENDPOINTS.STYLE_DNA_ANALYZE_FACE,
      "POST",
      formData,
      true
    );
  },

  async analyzeBody(imageUri) {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'body.jpg',
    });

    return this.makeRequest(
      API_ENDPOINTS.STYLE_DNA_ANALYZE_BODY,
      "POST",
      formData,
      true
    );
  },

  async analyzeInspiration(imageUris) {
    const formData = new FormData();

    imageUris.forEach((uri, index) => {
      formData.append('files', {
        uri: uri,
        type: 'image/jpeg',
        name: `inspiration_${index}.jpg`,
      });
    });

    return this.makeRequest(
      API_ENDPOINTS.STYLE_DNA_ANALYZE_INSPIRATION,
      "POST",
      formData,
      true
    );
  },

  async getStyleDNAProfile() {
    return this.makeRequest(API_ENDPOINTS.STYLE_DNA_PROFILE, "GET");
  },

  async getStyleDNA() {
    return this.makeRequest(API_ENDPOINTS.STYLE_DNA_GET, "GET");
  },

  async updateStyleDNA(data) {
    return this.makeRequest(API_ENDPOINTS.STYLE_DNA_UPDATE, "PUT", data);
  },

  async deleteStyleDNA() {
    return this.makeRequest(API_ENDPOINTS.STYLE_DNA_DELETE, "DELETE");
  },
};
