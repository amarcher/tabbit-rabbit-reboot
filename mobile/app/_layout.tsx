import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider, Theme } from '@react-navigation/native';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  CoachmarkProvider,
  CoachmarkOverlay,
  asyncStorage,
} from '@edwardloopez/react-native-coachmark';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/components/useColorScheme';
import { colors, fonts } from '@/src/utils/theme';
import { ToastProvider } from '@/src/components/Toast';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

/** Warm parchment light theme for react-navigation */
const ParchmentTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.navBg,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (error) {
      // Font loading failed — log but don't throw so the app still renders
      // with system fonts as a graceful fallback.
      console.warn('Font loading error:', error);
      SplashScreen.hideAsync();
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded && !error) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CoachmarkProvider storage={asyncStorage(AsyncStorage)}>
        <ToastProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : ParchmentTheme}>
            <Stack
              screenOptions={{
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                animationDuration: 300,
                headerStyle: { backgroundColor: colors.navBg },
                headerTintColor: colors.navText,
                headerTitleStyle: { color: colors.navText, fontFamily: fonts.heading },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="tab/[tabId]"
                options={{
                  title: 'Tab',
                  headerBackTitle: 'Back',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="bill/[shareToken]"
                options={{
                  title: 'Shared Bill',
                  headerBackTitle: 'Back',
                  animation: 'fade_from_bottom',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ThemeProvider>
        </ToastProvider>
        <CoachmarkOverlay />
      </CoachmarkProvider>
    </GestureHandlerRootView>
  );
}
