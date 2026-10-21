import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router/js-tabs';
import { Platform, StyleSheet } from 'react-native';
import { useAppTheme } from '../../src/theme/colors';
import type { IconName } from '../../src/utils/format';

const TABS: Array<{ name: string; title: string; icon: IconName; iconActive: IconName }> = [
  { name: 'index', title: 'Simular', icon: 'sunny-outline', iconActive: 'sunny' },
  { name: 'results', title: 'Raio-X', icon: 'analytics-outline', iconActive: 'analytics' },
  { name: 'seats', title: 'Assentos', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'optimizer', title: 'Horários', icon: 'time-outline', iconActive: 'time' },
  { name: 'saved', title: 'Salvos', icon: 'bookmark-outline', iconActive: 'bookmark' },
];

export default function TabLayout() {
  const { colors, scheme } = useAppTheme();
  const ios = Platform.OS === 'ios';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tintText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: ios
          ? { position: 'absolute', borderTopColor: colors.separator, backgroundColor: 'transparent' }
          : { backgroundColor: colors.surface, borderTopColor: colors.separator },
        tabBarBackground: ios
          ? () => <BlurView tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} intensity={100} style={StyleSheet.absoluteFill} />
          : undefined,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.iconActive : t.icon} size={size} color={typeof color === 'string' ? color : undefined} />,
          }}
        />
      ))}
    </Tabs>
  );
}
