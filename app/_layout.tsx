import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { LaunchSplash } from '../src/components/LaunchSplash';
import { TripProvider } from '../src/context/TripContext';
import { installNotificationHandler } from '../src/services/deviceServices';
import { useAppTheme } from '../src/theme/colors';

installNotificationHandler();

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: colors.tint, background: colors.background, card: colors.surface, text: colors.text, border: colors.separator },
  };
  return (
    <ThemeProvider value={theme}>
      <TripProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
          {showSplash ? <LaunchSplash onDone={hideSplash} /> : null}
        </View>
        <StatusBar style="auto" />
      </TripProvider>
    </ThemeProvider>
  );
}
