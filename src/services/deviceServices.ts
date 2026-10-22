/**
 * Integrações nativas (haptics, localização, notificações, compartilhamento),
 * todas tolerantes a falhas e no-op na Web quando o recurso não existe.
 */
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { Platform, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { ComponentRef, RefObject } from 'react';
import { formatZonedTime, type TimeZoneId } from '../engine/timezone';
import type { ExposureWindow, TripAnalysisResult } from '../engine/types';
import { STRINGS, type Lang } from '../i18n/strings';

const isWeb = Platform.OS === 'web';

export const haptics = {
  selection(): void {
    if (!isWeb) void Haptics.selectionAsync().catch(() => undefined);
  },
  success(): void {
    if (!isWeb) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  impact(): void {
    if (!isWeb) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
};

export async function getCurrentCoordinates(): Promise<{ lat: number; lon: number } | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

let handlerInstalled = false;
export function installNotificationHandler(): void {
  if (handlerInstalled || isWeb) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type AlertScheduleResult = { status: 'scheduled'; count: number } | { status: 'none' | 'denied' | 'unsupported' };

function alertBody(w: ExposureWindow, mode: TripAnalysisResult['input']['mode'], tz: TimeZoneId, lang: Lang): string {
  const tx = STRINGS[lang];
  const where = w.side === 'front' ? tx.notifications.windshield : tx.notifications.window(tx.sideName(w.side, mode));
  return tx.notifications.body(where, formatZonedTime(w.startTime, tz), formatZonedTime(w.endTime, tz));
}

/** Agenda lembretes locais "Hora de fechar a cortina" antes de cada janela de sol forte. */
export async function scheduleCurtainAlerts(
  analysis: TripAnalysisResult,
  tz: TimeZoneId,
  leadMinutes = 5,
  lang: Lang = 'pt',
): Promise<AlertScheduleResult> {
  if (isWeb) return { status: 'unsupported' };
  const now = Date.now();
  const upcoming = analysis.curtainAlerts.filter((w) => w.startTime.getTime() - leadMinutes * 60000 > now + 30000).slice(0, 12);
  if (upcoming.length === 0) return { status: 'none' };
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
    for (const w of upcoming) {
      await Notifications.scheduleNotificationAsync({
        content: { title: STRINGS[lang].notifications.title, body: alertBody(w, analysis.input.mode, tz, lang) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(w.startTime.getTime() - leadMinutes * 60000) },
      });
    }
    return { status: 'scheduled', count: upcoming.length };
  } catch {
    return { status: 'unsupported' };
  }
}

/** Captura o cartão como imagem e abre o compartilhamento nativo; fallback para texto. */
export type ViewRef = RefObject<ComponentRef<typeof View> | null>;

export async function shareTicket(ref: ViewRef, fallbackText: string, dialogTitle = STRINGS.pt.ticket.dialogTitle): Promise<void> {
  try {
    if (!isWeb && ref.current && (await Sharing.isAvailableAsync())) {
      const uri = await captureRef(ref as unknown as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
      return;
    }
  } catch {
    // cai para o texto
  }
  await Share.share({ message: fallbackText });
}
