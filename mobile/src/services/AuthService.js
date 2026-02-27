import AsyncStorage from "@react-native-async-storage/async-storage";
import { createLogger } from "../utils/logger";

const logger = createLogger("AuthService");
const TOKEN_KEY = "auth_token";
const USER_ID_KEY = "user_id";

export const AuthService = {
  async setToken(token) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      logger.error("Error saving token:", error);
    }
  },

  async getToken() {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      logger.error("Error retrieving token:", error);
      return null;
    }
  },

  async setUserId(userId) {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, userId.toString());
    } catch (error) {
      logger.error("Error saving user ID:", error);
    }
  },

  async getUserId() {
    try {
      return await AsyncStorage.getItem(USER_ID_KEY);
    } catch (error) {
      logger.error("Error retrieving user ID:", error);
      return null;
    }
  },

  async clearAuth() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_ID_KEY);
    } catch (error) {
      logger.error("Error clearing auth:", error);
    }
  },

  async isLoggedIn() {
    const token = await this.getToken();
    return token !== null;
  },
};
