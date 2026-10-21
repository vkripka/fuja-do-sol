import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TripProvider } from '../src/context/TripContext';
import { installNotificationHandler } from '../src/services/deviceServices';
import { useAppTheme } from '../src/theme/colors';

installNotificationHandler();

export default function RootLayout() {
  const { scheme, colors } = useAppTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: colors.tint, background: colors.background, card: colors.surface, text: colors.text, border: colors.separator },
  };
  return (
    <ThemeProvider value={theme}>
      <TripProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </TripProvider>
    </ThemeProvider>
  );
}
