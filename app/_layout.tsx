import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { View, Text } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { useColorScheme } from '@/hooks/useColorScheme';

WebBrowser.maybeCompleteAuthSession();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Add this before the tokenCache definition
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Add this function before InitialLayout
async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    console.warn('Must use a physical device for push notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notifications!');
    return;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);

    const userId = await SecureStore.getItemAsync('userId');
     // Save token to your backend
     await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId, pushToken: token }),
      });
    
    // Store the token in SecureStore
    await SecureStore.setItemAsync('expoPushToken', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  return token;
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    console.log('Auth state:', { isLoaded, isSignedIn });
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === '(tabs)';
    console.log('Navigation state:', { inTabsGroup, segments });

    if (isSignedIn && !inTabsGroup) {
      router.replace('/(tabs)/explore');
    } else if (!isSignedIn) {
      router.replace('/(auth)/sign-in');
    }

    // Register for push notifications when the user signs in
    if (isSignedIn) {
      registerForPushNotificationsAsync();

      // Set up notification listeners
      const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification as unknown as Notification);
      });

      const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        // Handle notification taps here
        const emergency = response.notification.request.content.data;
        if (emergency) {
          router.push('/(tabs)/map');
        }
      });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      };
    }
  }, [isSignedIn]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  console.log('Initializing Clerk with key:', publishableKey ? 'Key exists' : 'No key found');

  if (!publishableKey) {
    console.error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Missing Clerk Publishable Key</Text>
      </View>
    );
  }

  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={publishableKey}
      redirectUrl={Constants.experienceUrl}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <InitialLayout />
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClerkProvider>
  );
}