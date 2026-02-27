import 'react-native-gesture-handler';
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "./src/services/AuthService";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ClothingScreen } from "./src/screens/ClothingScreen";
import { OutfitScreen } from "./src/screens/OutfitScreen";
import { OutfitDetailScreen } from "./src/screens/OutfitDetailScreen";
import { FavoritesScreen } from "./src/screens/FavoritesScreen";
import StyleDNAScreen from "./src/screens/StyleDNAScreen";
import { StyleDNAWelcomeScreen } from "./src/screens/StyleDNA/StyleDNAWelcomeScreen";
import { StyleDNAFaceUploadScreen } from "./src/screens/StyleDNA/StyleDNAFaceUploadScreen";
import { StyleDNAFaceResultsScreen } from "./src/screens/StyleDNA/StyleDNAFaceResultsScreen";
import { StyleDNABodyUploadScreen } from "./src/screens/StyleDNA/StyleDNABodyUploadScreen";
import { StyleDNABodyResultsScreen } from "./src/screens/StyleDNA/StyleDNABodyResultsScreen";
import { StyleDNACompleteScreen } from "./src/screens/StyleDNA/StyleDNACompleteScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function HomeTabNavigator({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="menu" size={28} color="#007AFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="Clothing"
        component={ClothingScreen}
        options={{
          tabBarLabel: "Wardrobe",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Outfits"
        component={OutfitScreen}
        options={{
          tabBarLabel: "Outfits",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: "Favorites",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function DrawerNavigator({ onLogout }) {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: "#007AFF",
        drawerInactiveTintColor: "#666",
        drawerStyle: {
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: "500",
        },
      }}
    >
      <Drawer.Screen 
        name="HomeTabs" 
        component={HomeTabNavigator}
        options={{
          drawerLabel: "Home",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="StyleDNADrawer" 
        component={StyleDNAScreen}
        options={{
          drawerLabel: "Style DNA",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Logout" 
        component={View}
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            e.preventDefault();
            onLogout();
          },
        })}
        options={{
          drawerLabel: "Logout",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case "RESTORE_TOKEN":
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case "SIGN_IN":
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case "SIGN_OUT":
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
        default:
          return prevState;
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AuthService.getToken();
        dispatch({ type: "RESTORE_TOKEN", token });
      } catch (e) {
        console.error("Failed to restore token", e);
      }
    };

    bootstrapAsync();
  }, []);

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.userToken == null ? (
          <Stack.Screen
            name="SignIn"
            options={{
              animationEnabled: false,
            }}
            children={({ navigation }) => (
              <LoginScreen
                onLoginSuccess={async () => {
                  // Token is already saved by LoginScreen, retrieve the actual token
                  const token = await AuthService.getToken();
                  dispatch({ type: "SIGN_IN", token: token || "authenticated" });
                }}
              />
            )}
          />
        ) : (
          <>
            <Stack.Screen
              name="Root"
              options={{
                animationEnabled: false,
              }}
              children={() => (
                <DrawerNavigator
                  onLogout={async () => {
                    await AuthService.clearAuth();
                    dispatch({ type: "SIGN_OUT" });
                  }}
                />
              )}
            />
            <Stack.Screen
              name="OutfitDetail"
              component={OutfitDetailScreen}
              options={{
                headerShown: false,
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="StyleDNA"
              component={StyleDNAScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="StyleDNAWelcome"
              component={StyleDNAWelcomeScreen}
              options={{
                headerShown: false,
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="StyleDNAFaceUpload"
              component={StyleDNAFaceUploadScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="StyleDNAFaceResults"
              component={StyleDNAFaceResultsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="StyleDNABodyUpload"
              component={StyleDNABodyUploadScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="StyleDNABodyResults"
              component={StyleDNABodyResultsScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="StyleDNAComplete"
              component={StyleDNACompleteScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
