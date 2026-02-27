// API Configuration
// Use your machine's IP address for the API endpoint
// This allows both web and mobile devices to connect

const API_BASE_URL = "http://192.168.1.4:8000";

// Alternative URLs for different scenarios:
// - Local development (iOS simulator): "http://localhost:8000"
// - Local development (Android emulator): "http://10.0.2.2:8000"
// - Physical device on same network: "http://192.168.1.9:8000"
// - Deployed backend: "https://your-backend-url.com"

export const API_ENDPOINTS = {
  // Auth
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,

  // Clothing
  UPLOAD_CLOTHING: `${API_BASE_URL}/api/clothing/upload`,
  GET_CLOTHING_ITEMS: `${API_BASE_URL}/api/clothing/items`,
  GET_CLOTHING_ITEM: (id) => `${API_BASE_URL}/api/clothing/${id}`,
  UPDATE_CLOTHING: (id) => `${API_BASE_URL}/api/clothing/${id}`,
  DELETE_CLOTHING: (id) => `${API_BASE_URL}/api/clothing/${id}`,
  CATEGORY_OPTIONS: `${API_BASE_URL}/api/clothing/category-options`,

  // Outfits
  GENERATE_OUTFIT: `${API_BASE_URL}/api/outfits/generate`,
  GET_OUTFITS: `${API_BASE_URL}/api/outfits/`,
  GET_OUTFIT: (id) => `${API_BASE_URL}/api/outfits/${id}`,
  TOGGLE_FAVORITE: (id) => `${API_BASE_URL}/api/outfits/${id}/favorite`,
  REGENERATE_OUTFIT: (id) => `${API_BASE_URL}/api/outfits/${id}/regenerate`,
  DELETE_OUTFIT: (id) => `${API_BASE_URL}/api/outfits/${id}`,

  // Favorites endpoints
  GET_FAVORITES: `${API_BASE_URL}/api/favorites/`,
  DELETE_FAVORITE: (id) => `${API_BASE_URL}/api/favorites/${id}`,

  // Style DNA endpoints
  STYLE_DNA_ANALYZE_FACE: `${API_BASE_URL}/api/style-dna/analyze-face`,
  STYLE_DNA_ANALYZE_BODY: `${API_BASE_URL}/api/style-dna/analyze-body`,
  STYLE_DNA_ANALYZE_INSPIRATION: `${API_BASE_URL}/api/style-dna/analyze-inspiration`,
  STYLE_DNA_PROFILE: `${API_BASE_URL}/api/style-dna/profile`,
  STYLE_DNA_GET: `${API_BASE_URL}/api/style-dna/`,
  STYLE_DNA_UPDATE: `${API_BASE_URL}/api/style-dna/`,
  STYLE_DNA_DELETE: `${API_BASE_URL}/api/style-dna/`,
};

export { API_BASE_URL };
