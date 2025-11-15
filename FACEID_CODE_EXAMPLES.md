# Face ID Integration - Implementation Examples

## Complete Integration Example

### App.js Integration
Here's how to add the SettingsScreen to your navigation:

```javascript
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ClothingScreen } from './src/screens/ClothingScreen';
import { OutfitScreen } from './src/screens/OutfitScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

import { AuthService } from './src/services/AuthService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainApp({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Clothing') {
            iconName = focused ? 'shirt' : 'shirt-outline';
          } else if (route.name === 'Outfits') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Clothing"
        component={ClothingScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Outfits"
        component={OutfitScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={(props) => (
          <SettingsScreen
            {...props}
            onLogout={onLogout}
          />
        )}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const token = await AuthService.getToken();
      setIsLoggedIn(!!token);
    } catch (err) {
      console.error('Error checking login:', err);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // or show splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          animationEnabled: true,
        }}
      >
        {isLoggedIn ? (
          <Stack.Screen
            name="Main"
            component={MainApp}
            initialParams={{ onLogout: () => setIsLoggedIn(false) }}
            options={{
              headerShown: false,
              animationEnabled: false,
            }}
          />
        ) : (
          <Stack.Screen
            name="Login"
            component={(props) => (
              <LoginScreen
                {...props}
                onLoginSuccess={() => {
                  setIsLoggedIn(true);
                }}
              />
            )}
            options={{
              headerShown: false,
              animationEnabled: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## BiometricService Usage Examples

### Check if Device Supports Face ID
```javascript
import { BiometricService } from './src/services/BiometricService';

const checkSupport = async () => {
  const available = await BiometricService.isBiometricAvailable();
  if (available) {
    console.log('Device supports biometric authentication');
  } else {
    console.log('Device does not support biometric authentication');
  }
};
```

### Get Available Biometric Types
```javascript
const getBiometricTypes = async () => {
  const types = await BiometricService.getAvailableBiometrics();
  
  types.forEach(type => {
    if (type === 3) console.log('Face ID available');
    if (type === 2) console.log('Touch ID available');
  });
};
```

### Enable Face ID After Login
```javascript
const handleLogin = async (email, password) => {
  try {
    // Your login logic
    const response = await ApiService.login(email, password);
    const token = response.access_token;
    
    // Enable Face ID
    const result = await BiometricService.enableBiometric(email, token);
    
    if (result.success) {
      console.log('Face ID enabled for next login');
    } else {
      console.log('Failed to enable Face ID:', result.error);
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### Perform Face ID Login
```javascript
const handleFaceIDLogin = async () => {
  try {
    const result = await BiometricService.biometricLogin();
    
    if (result.success) {
      // User authenticated successfully
      console.log('Logged in as:', result.email);
      // Token is already available: result.token
    } else {
      // Authentication failed
      console.log('Failed:', result.error);
    }
  } catch (error) {
    console.error('Biometric login error:', error);
  }
};
```

### Check if Face ID is Currently Enabled
```javascript
const checkFaceIDStatus = async () => {
  const enabled = await BiometricService.isBiometricEnabled();
  
  if (enabled) {
    console.log('User can use Face ID to login');
  } else {
    console.log('User must use email/password');
  }
};
```

### Disable Face ID
```javascript
const handleDisableFaceID = async () => {
  try {
    const result = await BiometricService.disableBiometric();
    
    if (result) {
      console.log('Face ID disabled');
      // User must use password on next login
    } else {
      console.log('Failed to disable Face ID');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Get Stored Credentials
```javascript
const getStoredCredentials = async () => {
  const credentials = await BiometricService.getBiometricCredentials();
  
  if (credentials) {
    console.log('Email:', credentials.email);
    console.log('Token:', credentials.token);
  } else {
    console.log('No stored credentials found');
  }
};
```

## SettingsScreen Integration

### Minimal Integration
```javascript
import { SettingsScreen } from './src/screens/SettingsScreen';

// In your navigation:
<Tab.Screen
  name="Settings"
  component={(props) => (
    <SettingsScreen
      {...props}
      onLogout={() => {
        // Handle logout
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }}
    />
  )}
/>
```

### With Custom Styling
```javascript
// Override default colors in SettingsScreen.js
// Change these style values:
const ACCENT_COLOR = '#007AFF';      // Blue
const DANGER_COLOR = '#d32f2f';      // Red for logout
const SUCCESS_COLOR = '#34C759';     // Green for Face ID
const BACKGROUND_COLOR = '#f5f5f5';  // Light gray
```

## Advanced Usage

### Custom Face ID Configuration
```javascript
// Modify in BiometricService.js authenticate() method
const result = await LocalAuthentication.authenticateAsync({
  disableDeviceFallback: false,  // Allow PIN as fallback
  reason: 'Authenticate to access OutfitAI',
  fallbackLabel: 'Use passcode',
  // Add more options:
  disableDeviceFallback: false,
  // Note: fallbackLabel is for Android
});
```

### Conditional Face ID UI
```javascript
import { Platform } from 'react-native';
import { BiometricService } from './src/services/BiometricService';

function LoginScreen() {
  const [showFaceIDButton, setShowFaceIDButton] = useState(false);

  useEffect(() => {
    const initBiometric = async () => {
      // Only show on iOS
      if (Platform.OS !== 'ios') return;
      
      const available = await BiometricService.isBiometricAvailable();
      const enabled = await BiometricService.isBiometricEnabled();
      
      setShowFaceIDButton(available && enabled);
    };

    initBiometric();
  }, []);

  if (!showFaceIDButton) {
    return <View><!-- Show password login only --></View>;
  }

  return <View><!-- Show Face ID and password options --></View>;
}
```

### Error Handling Pattern
```javascript
const biometricLoginWithErrorHandling = async () => {
  try {
    setLoading(true);
    
    // Check availability first
    const available = await BiometricService.isBiometricAvailable();
    if (!available) {
      showError('Face ID not available on this device');
      return;
    }

    // Check if enabled
    const enabled = await BiometricService.isBiometricEnabled();
    if (!enabled) {
      showError('Face ID not set up. Please login with email first.');
      return;
    }

    // Attempt login
    const result = await BiometricService.biometricLogin();
    
    if (!result.success) {
      if (result.error.includes('not available')) {
        showError('Face ID not available');
      } else if (result.error.includes('user cancelled')) {
        showError('Authentication cancelled');
      } else {
        showError('Authentication failed. Please try again.');
      }
      return;
    }

    // Success
    await AuthService.setToken(result.token);
    navigateToHome();
    
  } catch (err) {
    console.error('[LoginFlow] Error:', err);
    showError('An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};
```

## Testing Utilities

### Mock Face ID for Testing
```javascript
// In test file
import * as LocalAuthentication from 'expo-local-authentication';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => 
    Promise.resolve([3]) // [3] = Face ID
  ),
  authenticateAsync: jest.fn(() =>
    Promise.resolve({ success: true })
  ),
}));
```

### Debugging Face ID Issues
```javascript
// Add to BiometricService for debugging
const debugBiometric = async () => {
  console.log('=== Biometric Debug Info ===');
  
  const available = await BiometricService.isBiometricAvailable();
  console.log('Available:', available);
  
  const types = await BiometricService.getAvailableBiometrics();
  console.log('Types:', types);
  
  const enabled = await BiometricService.isBiometricEnabled();
  console.log('Enabled:', enabled);
  
  const credentials = await BiometricService.getBiometricCredentials();
  console.log('Has Credentials:', !!credentials);
  
  console.log('========================');
};

// Call when debugging
debugBiometric();
```

## Performance Optimization

### Cache Biometric Availability
```javascript
let cachedBiometricAvailable = null;

const isBiometricAvailableCached = async () => {
  if (cachedBiometricAvailable === null) {
    cachedBiometricAvailable = 
      await BiometricService.isBiometricAvailable();
  }
  return cachedBiometricAvailable;
};
```

### Debounce Face ID Attempts
```javascript
let lastBiometricAttempt = 0;

const handleFaceIDLoginDebounced = async () => {
  const now = Date.now();
  
  // Prevent multiple attempts within 1 second
  if (now - lastBiometricAttempt < 1000) {
    return;
  }
  
  lastBiometricAttempt = now;
  await handleFaceIDLogin();
};
```

---

For more information, see `FACEID_INTEGRATION_GUIDE.md`
